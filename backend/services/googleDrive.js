const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.initialized = false;
    }

    /**
     * Initialize Google Drive API with service account credentials
     */
    async initialize() {
        try {
            // Check if running on Replit or local development
            const isReplit = process.env.REPL_ID || process.env.REPLIT_DB_URL;
            
            let credentials;
            if (isReplit) {
                // On Replit, credentials should be in environment variables
                credentials = {
                    type: process.env.GOOGLE_SERVICE_TYPE || 'service_account',
                    project_id: process.env.GOOGLE_PROJECT_ID,
                    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
                    token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
                    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
                    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
                };
            } else {
                // Local development - try to load from service-account.json
                const credentialsPath = path.join(__dirname, '../config/service-account.json');
                if (fs.existsSync(credentialsPath)) {
                    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
                } else {
                    console.warn('Google Drive credentials not found. Create service-account.json or set environment variables.');
                    return false;
                }
            }

            // Validate required fields
            if (!credentials.client_email || !credentials.private_key) {
                console.error('Missing required Google Drive credentials');
                return false;
            }

            // Create JWT auth client
            const auth = new google.auth.JWT(
                credentials.client_email,
                null,
                credentials.private_key,
                ['https://www.googleapis.com/auth/drive']
            );

            // Initialize Drive API
            this.drive = google.drive({ version: 'v3', auth });
            this.initialized = true;
            
            console.log('Google Drive API initialized successfully');
            return true;

        } catch (error) {
            console.error('Error initializing Google Drive API:', error);
            return false;
        }
    }

    /**
     * Ensure the service is initialized before use
     */
    async ensureInitialized() {
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                throw new Error('Google Drive API not initialized');
            }
        }
    }

    /**
     * Create folder structure for institution: Drive/[Institution]/[Teachers|Students]/[Name]
     */
    async createInstitutionFolders(institutionName, institutionCode) {
        await this.ensureInitialized();

        try {
            // Find or create main Drive folder
            const mainFolderId = await this.findOrCreateFolder('SchoolApp_Photos', null);
            
            // Create institution folder
            const institutionFolderName = `${institutionName} (${institutionCode})`;
            const institutionFolderId = await this.findOrCreateFolder(institutionFolderName, mainFolderId);
            
            // Create Teachers and Students subfolders
            const teachersFolderId = await this.findOrCreateFolder('Teachers', institutionFolderId);
            const studentsFolderId = await this.findOrCreateFolder('Students', institutionFolderId);
            
            return {
                mainFolderId,
                institutionFolderId,
                teachersFolderId,
                studentsFolderId,
                institutionFolderName
            };

        } catch (error) {
            console.error('Error creating institution folders:', error);
            throw error;
        }
    }

    /**
     * Find or create a folder
     */
    async findOrCreateFolder(name, parentId = null) {
        await this.ensureInitialized();

        try {
            // Search for existing folder
            let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            if (parentId) {
                query += ` and '${parentId}' in parents`;
            }

            const response = await this.drive.files.list({ q: query });
            
            if (response.data.files && response.data.files.length > 0) {
                return response.data.files[0].id;
            }

            // Create new folder if not found
            const folderMetadata = {
                name: name,
                mimeType: 'application/vnd.google-apps.folder'
            };

            if (parentId) {
                folderMetadata.parents = [parentId];
            }

            const folder = await this.drive.files.create({
                resource: folderMetadata
            });

            console.log(`Created folder: ${name} with ID: ${folder.data.id}`);
            return folder.data.id;

        } catch (error) {
            console.error(`Error creating folder ${name}:`, error);
            throw error;
        }
    }

    /**
     * Create user-specific folder (Teacher/Student)
     */
    async createUserFolder(userName, userType, institutionFolders) {
        await this.ensureInitialized();

        try {
            const parentFolderId = userType === 'teacher' ? 
                institutionFolders.teachersFolderId : 
                institutionFolders.studentsFolderId;

            const userFolderId = await this.findOrCreateFolder(userName, parentFolderId);
            
            return {
                folderId: userFolderId,
                folderName: userName,
                parentId: parentFolderId
            };

        } catch (error) {
            console.error('Error creating user folder:', error);
            throw error;
        }
    }

    /**
     * Upload file to specific folder
     */
    async uploadFile(filePath, fileName, folderId, mimeType = null) {
        await this.ensureInitialized();

        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const fileMetadata = {
                name: fileName,
                parents: [folderId]
            };

            const media = {
                mimeType: mimeType || 'application/octet-stream',
                body: fs.createReadStream(filePath)
            };

            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media
            });

            console.log(`Uploaded file: ${fileName} with ID: ${response.data.id}`);
            return {
                fileId: response.data.id,
                fileName: fileName,
                folderId: folderId
            };

        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    /**
     * Delete file from Drive
     */
    async deleteFile(fileId) {
        await this.ensureInitialized();

        try {
            await this.drive.files.delete({ fileId: fileId });
            console.log(`Deleted file with ID: ${fileId}`);
            return true;

        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * List files in folder
     */
    async listFiles(folderId, pageSize = 100) {
        await this.ensureInitialized();

        try {
            const response = await this.drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                pageSize: pageSize,
                fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)'
            });

            return response.data.files || [];

        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }

    /**
     * Get folder structure for institution
     */
    async getInstitutionStructure(institutionName, institutionCode) {
        await this.ensureInitialized();

        try {
            const institutionFolderName = `${institutionName} (${institutionCode})`;
            
            // Find main folder
            const mainResponse = await this.drive.files.list({
                q: `name='SchoolApp_Photos' and mimeType='application/vnd.google-apps.folder' and trashed=false`
            });

            if (!mainResponse.data.files || mainResponse.data.files.length === 0) {
                return null;
            }

            const mainFolderId = mainResponse.data.files[0].id;

            // Find institution folder
            const instResponse = await this.drive.files.list({
                q: `name='${institutionFolderName}' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`
            });

            if (!instResponse.data.files || instResponse.data.files.length === 0) {
                return null;
            }

            const institutionFolderId = instResponse.data.files[0].id;

            // Find Teachers and Students folders
            const subFoldersResponse = await this.drive.files.list({
                q: `'${institutionFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
            });

            const subFolders = subFoldersResponse.data.files || [];
            const teachersFolder = subFolders.find(f => f.name === 'Teachers');
            const studentsFolder = subFolders.find(f => f.name === 'Students');

            return {
                mainFolderId,
                institutionFolderId,
                teachersFolderId: teachersFolder?.id,
                studentsFolderId: studentsFolder?.id,
                institutionFolderName
            };

        } catch (error) {
            console.error('Error getting institution structure:', error);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new GoogleDriveService();