# Google Drive Integration Setup

The school management system is now integrated with Google Drive for automatic photo storage. When students or teachers are created with photos, those photos will be automatically uploaded to Google Drive in an organized folder structure.

## Folder Structure

```
SchoolApp_Photos/
├── Institution Name (CODE123)/
│   ├── Students/
│   │   ├── Student Name 1/
│   │   │   ├── photo1.jpg
│   │   │   ├── photo2.jpg
│   │   │   └── ...
│   │   └── Student Name 2/
│   └── Teachers/
│       ├── Teacher Name 1/
│       └── Teacher Name 2/
```

## Setup Instructions

### Option 1: Replit Environment Variables (Recommended for Production)

1. Go to your Replit project
2. Click on "Secrets" (lock icon) in the left sidebar
3. Add the following environment variables from your Google Service Account:

```
GOOGLE_SERVICE_TYPE=service_account
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----
GOOGLE_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email%40project.iam.gserviceaccount.com
```

### Option 2: Local Development with JSON File

1. Create a `backend/config/` directory
2. Place your `service-account.json` file in that directory
3. The system will automatically detect and use it

## Creating Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API
4. Go to "Credentials" → "Create Credentials" → "Service Account"
5. Download the JSON key file
6. Share your Google Drive folder with the service account email

## Testing the Integration

The system will automatically attempt to use Google Drive when:
- Students or teachers are created with photos
- Google Drive credentials are properly configured
- If Google Drive is not configured, photos will still be stored locally

Check the server logs to see if Google Drive integration is working:
- "Google Drive API initialized successfully" - Integration is working
- "Google Drive credentials not found" - Needs setup

## Important Notes

- Photos are uploaded asynchronously after user creation
- Local photo storage is maintained as backup
- The system works with or without Google Drive configured
- Make sure your service account has Drive API permissions
- The service account email needs access to your Google Drive