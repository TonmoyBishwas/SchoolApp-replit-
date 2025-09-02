// ===== CHEICK MOHAMED SCHOOL BACKEND SERVER =====

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const googleDrive = require('./services/googleDrive');

// ===== SERVER CONFIGURATION =====
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cheick_mohamed_school_secret_key_2024';

// Determine environment and database path
const isReplit = process.env.REPL_ID !== undefined;
const DB_PATH = isReplit ? './database/school.db' : './database/school.db';

// ===== MIDDLEWARE =====
// Configure CORS for development and production
const corsOptions = {
    origin: function (origin, callback) {
        console.log('CORS check - Origin:', origin, 'NODE_ENV:', process.env.NODE_ENV);
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'https://school-app.replit.com',
            'https://school-app.replit.dev',
            'https://school-app.e1ectr0n.repl.co',
            'https://schul.e1ectr0n.replit.dev'
        ];
        
        // Allow development environment or localhost/replit origins
        if (allowedOrigins.indexOf(origin) !== -1 || 
            process.env.NODE_ENV === 'development' ||
            !process.env.NODE_ENV) {
            callback(null, true);
        } else {
            console.log('CORS rejected - Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// File upload configuration
const csvUpload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

// Configure photo upload
const configurePhotoUpload = (req) => {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            // Get institution information from the authenticated user
            const institutionId = req.user && req.user.institution_id ? req.user.institution_id : null;
            console.log('Using institution ID for photo upload:', institutionId);
            
            // Function to get the upload path
            const getUploadPath = (callback) => {
                if (institutionId) {
                    // Get institution folder name from database
                    db.get('SELECT folder_name FROM institutions WHERE id = ?', [institutionId], (err, institution) => {
                        if (err || !institution) {
                            console.error('Error finding institution folder:', err);
                            // Fallback to default directory
                            callback(path.join(__dirname, '..', 'uploads', 'students'));
                        } else {
                            // Use institution's folder
                            console.log('Found institution folder:', institution.folder_name);
                            callback(path.join(__dirname, '..', 'uploads', institution.folder_name || 'default', 'students'));
                        }
                    });
                } else {
                    // Fallback if no institution_id provided
                    console.log('No institution ID found, using default path');
                    callback(path.join(__dirname, '..', 'uploads', 'students'));
                }
            };
            
            // Create directory with student name if it doesn't exist
            const studentName = req.body.name ? req.body.name.replace(/\s+/g, '_') : 'unknown_student';
            
            getUploadPath((basePath) => {
                // Create student folder within institution folder
                const dir = path.join(basePath, studentName);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                cb(null, dir);
            });
        },
        filename: function (req, file, cb) {
            // Generate unique filename with original extension
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    });
    
    return multer({
        storage: storage,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit
        },
        fileFilter: (req, file, cb) => {
            // Accept only images
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed'), false);
            }
        }
    });
};

// ===== DATABASE INITIALIZATION =====
let db;

function initializeDatabase() {
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('Connected to the SQLite database.');
            createTables();
        }
    });
}

function createTables() {
    console.log('Creating database tables...');
    
    // Create tables synchronously to ensure proper order
    db.serialize(() => {
        // Institutions table
        db.run(`
            CREATE TABLE IF NOT EXISTS institutions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                reg_number TEXT,
                type TEXT,
                address TEXT,
                email TEXT,
                website TEXT,
                phone TEXT,
                folder_name TEXT,
                institution_code TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating institutions table:', err);
            else console.log('Institutions table created/verified');
            
            // Add folder_name column to institutions table if it doesn't exist
            db.all("PRAGMA table_info(institutions)", (err, rows) => {
                if (err) console.error('Error checking institutions table schema:', err);
                
                const hasFolderName = rows && Array.isArray(rows) && rows.some(row => row.name === 'folder_name');
                const hasInstitutionCode = rows && Array.isArray(rows) && rows.some(row => row.name === 'institution_code');
                
                if (!hasFolderName) {
                    db.run('ALTER TABLE institutions ADD COLUMN folder_name TEXT', (err) => {
                        if (err) console.error('Error adding folder_name to institutions table:', err);
                        else console.log('Adding folder_name column to institutions table');
                    });
                }
                
                if (!hasInstitutionCode) {
                    db.run('ALTER TABLE institutions ADD COLUMN institution_code TEXT UNIQUE', (err) => {
                        if (err) console.error('Error adding institution_code to institutions table:', err);
                        else console.log('Adding institution_code column to institutions table');
                    });
                }
            });
        });
        
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                institution_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `, (err) => {
            if (err) console.error('Error creating users table:', err);
            else console.log('Users table created/verified');
        });
        
        // Check and add institution_id column to users table if it doesn't exist
        db.get("PRAGMA table_info(users)", (err, rows) => {
            if (err) {
                console.error('Error checking users table schema:', err);
                return;
            }
            
            // Check if institution_id column exists
            let hasInstitutionId = false;
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
            } else {
                // PRAGMA returns an object in some SQLite versions
                hasInstitutionId = rows && rows.name === 'institution_id';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to users table');
                db.run('ALTER TABLE users ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to users table:', err);
                    else console.log('institution_id column added to users table');
                });
            }
        });

        // Students table
        db.run(`
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                department TEXT NOT NULL,
                class TEXT,
                email TEXT,
                phone TEXT,
                date_of_birth DATE,
                address TEXT,
                parent_id TEXT,
                status TEXT DEFAULT 'active',
                institution_id INTEGER,
                photo_directory TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `, (err) => {
            if (err) console.error('Error creating students table:', err);
            else console.log('Students table created/verified');
        });
        
        // Check and add institution_id column to students table if it doesn't exist
        db.get("PRAGMA table_info(students)", (err, rows) => {
            if (err) {
                console.error('Error checking students table schema:', err);
                return;
            }
            
            // Check if institution_id and photo_directory columns exist
            let hasInstitutionId = false;
            let hasPhotoDirectory = false;
            
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
                hasPhotoDirectory = rows.some(row => row.name === 'photo_directory');
            } else {
                hasInstitutionId = rows && rows.name === 'institution_id';
                hasPhotoDirectory = rows && rows.name === 'photo_directory';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to students table');
                db.run('ALTER TABLE students ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to students table:', err);
                    else console.log('institution_id column added to students table');
                });
            }
            
            if (!hasPhotoDirectory) {
                console.log('Adding photo_directory column to students table');
                db.run('ALTER TABLE students ADD COLUMN photo_directory TEXT', err => {
                    if (err) console.error('Error adding photo_directory to students table:', err);
                    else console.log('photo_directory column added to students table');
                });
            }
        });

        // Teachers table
        db.run(`
            CREATE TABLE IF NOT EXISTS teachers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                department TEXT NOT NULL,
                subject TEXT,
                email TEXT,
                phone TEXT,
                qualification TEXT,
                experience INTEGER,
                status TEXT DEFAULT 'active',
                institution_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `, (err) => {
            if (err) console.error('Error creating teachers table:', err);
            else console.log('Teachers table created/verified');
        });
        
        // Check and add institution_id column to teachers table if it doesn't exist
        db.get("PRAGMA table_info(teachers)", (err, rows) => {
            if (err) {
                console.error('Error checking teachers table schema:', err);
                return;
            }
            
            // Check if institution_id column exists
            let hasInstitutionId = false;
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
            } else {
                hasInstitutionId = rows && rows.name === 'institution_id';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to teachers table');
                db.run('ALTER TABLE teachers ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to teachers table:', err);
                    else console.log('institution_id column added to teachers table');
                });
            }
        });

        // Attendance table
        db.run(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                student_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                department TEXT NOT NULL,
                status TEXT DEFAULT 'present',
                face_recognition BOOLEAN DEFAULT true,
                institution_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `, (err) => {
            if (err) console.error('Error creating attendance table:', err);
            else console.log('Attendance table created/verified');
        });
        
        // Check and add institution_id column to attendance table if it doesn't exist
        db.get("PRAGMA table_info(attendance)", (err, rows) => {
            if (err) {
                console.error('Error checking attendance table schema:', err);
                return;
            }
            
            // Check if institution_id column exists
            let hasInstitutionId = false;
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
            } else {
                hasInstitutionId = rows && rows.name === 'institution_id';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to attendance table');
                db.run('ALTER TABLE attendance ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to attendance table:', err);
                    else console.log('institution_id column added to attendance table');
                });
            }
        });

        // Classes table
        db.run(`
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                department TEXT NOT NULL,
                teacher_id TEXT,
                room TEXT,
                schedule TEXT,
                capacity INTEGER,
                status TEXT DEFAULT 'active',
                institution_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `, (err) => {
            if (err) console.error('Error creating classes table:', err);
            else console.log('Classes table created/verified');
        });
        
        // Check and add institution_id column to classes table if it doesn't exist
        db.get("PRAGMA table_info(classes)", (err, rows) => {
            if (err) {
                console.error('Error checking classes table schema:', err);
                return;
            }
            
            // Check if institution_id column exists
            let hasInstitutionId = false;
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
            } else {
                hasInstitutionId = rows && rows.name === 'institution_id';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to classes table');
                db.run('ALTER TABLE classes ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to classes table:', err);
                    else console.log('institution_id column added to classes table');
                });
            }
        });

        // Enhanced Grade Management - Add grade level, section, and academic year columns
        db.all("PRAGMA table_info(classes)", (err, rows) => {
            if (err) {
                console.error('Error checking classes table for grade enhancements:', err);
                return;
            }
            
            const existingColumns = rows.map(row => row.name);
            const newColumns = [
                { name: 'grade_level', sql: 'ALTER TABLE classes ADD COLUMN grade_level INTEGER' },
                { name: 'section', sql: 'ALTER TABLE classes ADD COLUMN section TEXT' },
                { name: 'academic_year', sql: 'ALTER TABLE classes ADD COLUMN academic_year TEXT' },
                { name: 'grade_category', sql: 'ALTER TABLE classes ADD COLUMN grade_category TEXT' }
            ];
            
            newColumns.forEach(column => {
                if (!existingColumns.includes(column.name)) {
                    console.log(`Adding ${column.name} column to classes table`);
                    db.run(column.sql, err => {
                        if (err) console.error(`Error adding ${column.name} to classes table:`, err);
                        else console.log(`${column.name} column added to classes table`);
                    });
                }
            });
        });

        // Parents table
        db.run(`
            CREATE TABLE IF NOT EXISTS parents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                student_ids TEXT,
                institution_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id)
            )
        `, (err) => {
            if (err) console.error('Error creating parents table:', err);
            else console.log('Parents table created/verified');
        });
        
        // Check and add institution_id column to parents table if it doesn't exist
        db.get("PRAGMA table_info(parents)", (err, rows) => {
            if (err) {
                console.error('Error checking parents table schema:', err);
                return;
            }
            
            // Check if institution_id column exists
            let hasInstitutionId = false;
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
            } else {
                hasInstitutionId = rows && rows.name === 'institution_id';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to parents table');
                db.run('ALTER TABLE parents ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to parents table:', err);
                    else console.log('institution_id column added to parents table');
                });
            }
        });

        // Calendar Events table
        db.run(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                event_type TEXT CHECK(event_type IN ('class', 'exam', 'holiday', 'meeting', 'announcement')),
                start_date DATE NOT NULL,
                end_date DATE,
                start_time TIME,
                end_time TIME,
                class_id INTEGER,
                institution_id INTEGER NOT NULL,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id),
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (class_id) REFERENCES classes(id)
            )
        `, (err) => {
            if (err) console.error('Error creating calendar_events table:', err);
            else console.log('Calendar Events table created/verified');
        });
        
        // Check and add institution_id column to calendar_events table if it doesn't exist
        db.get("PRAGMA table_info(calendar_events)", (err, rows) => {
            if (err) {
                console.error('Error checking calendar_events table schema:', err);
                return;
            }
            
            // Check if institution_id column exists
            let hasInstitutionId = false;
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
            } else {
                hasInstitutionId = rows && rows.name === 'institution_id';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to calendar_events table');
                db.run('ALTER TABLE calendar_events ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to calendar_events table:', err);
                    else console.log('institution_id column added to calendar_events table');
                });
            }
        });

        // Announcements table
        db.run(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                target_audience TEXT CHECK(target_audience IN ('all', 'teachers', 'students', 'parents')),
                priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
                institution_id INTEGER NOT NULL,
                created_by INTEGER NOT NULL,
                is_published BOOLEAN DEFAULT 1,
                published_at DATETIME,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `, (err) => {
            if (err) console.error('Error creating announcements table:', err);
            else console.log('Announcements table created/verified');
        });
        
        // Check and add institution_id column to announcements table if it doesn't exist
        db.get("PRAGMA table_info(announcements)", (err, rows) => {
            if (err) {
                console.error('Error checking announcements table schema:', err);
                return;
            }
            
            // Check if institution_id column exists
            let hasInstitutionId = false;
            if (Array.isArray(rows)) {
                hasInstitutionId = rows.some(row => row.name === 'institution_id');
            } else {
                hasInstitutionId = rows && rows.name === 'institution_id';
            }
            
            if (!hasInstitutionId) {
                console.log('Adding institution_id column to announcements table');
                db.run('ALTER TABLE announcements ADD COLUMN institution_id INTEGER REFERENCES institutions(id)', err => {
                    if (err) console.error('Error adding institution_id to announcements table:', err);
                    else console.log('institution_id column added to announcements table');
                });
            }
        });

        // Initialize default data after all tables are created
        setTimeout(() => {
            insertDefaultData();
        }, 1000);
    });
}

function insertDefaultData() {
    // Insert demo users
    const defaultUsers = [
        { username: 'superadmin', password: 'superadmin123', role: 'superadmin', name: 'System Administrator' },
        { username: 'admin123', password: 'admin123', role: 'admin', name: 'Administrator' },
        { username: 'teacher001', password: 'teacher123', role: 'teacher', name: 'John Doe' },
        { username: 'student444', password: 'student123', role: 'student', name: 'Tonmoy Ahmed' },
        { username: 'parent001', password: 'parent123', role: 'parent', name: 'Sarah Smith' }
    ];

    defaultUsers.forEach(user => {
        const hashedPassword = bcrypt.hashSync(user.password, 10);
        db.run(
            'INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
            [user.username, hashedPassword, user.role, user.name]
        );
    });

    // Insert demo student
    db.run(
        'INSERT OR IGNORE INTO students (id, name, department, class) VALUES (?, ?, ?, ?)',
        ['444', 'Tonmoy Ahmed', 'CSE', 'Computer Science']
    );

    console.log('Default data initialized');
}

// ===== AUTHENTICATION MIDDLEWARE =====
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // For development/demo purposes, allow requests without token
        console.log('Warning: Request without token - proceeding for development purposes');
        req.user = { id: 0, role: 'demo', name: 'Demo User' };
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification failed:', err.message);
            // For development, we'll proceed anyway but with limited permissions
            req.user = { id: 0, role: 'demo', name: 'Demo User' };
            return next();
        }
        
        req.user = user;
        next();
    });
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// ===== UTILITY FUNCTIONS =====

// Generate unique username based on name and institution code
function generateUniqueUsername(firstName, lastName, institutionCode, userType = 'student') {
    // Clean names - remove special characters and spaces
    const cleanFirst = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const cleanLast = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    // Create base username: first3letters + last3letters + institutioncode
    const firstPart = cleanFirst.substring(0, 3);
    const lastPart = cleanLast.substring(0, 3);
    
    // Add user type prefix for non-students
    let prefix = '';
    if (userType === 'teacher') prefix = 't';
    else if (userType === 'admin') prefix = 'a';
    else if (userType === 'parent') prefix = 'p';
    
    const baseUsername = prefix + firstPart + lastPart + institutionCode.toLowerCase();
    
    return baseUsername;
}

// Generate secure random password
function generateSecurePassword(length = 12) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each category
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'; 
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining length
    for (let i = 4; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Check if username exists in database
function checkUsernameExists(username, callback) {
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, !!row);
        }
    });
}

// Generate unique username with collision handling
function generateUniqueUsernameWithCheck(firstName, lastName, institutionCode, userType, callback) {
    let baseUsername = generateUniqueUsername(firstName, lastName, institutionCode, userType);
    let finalUsername = baseUsername;
    let counter = 1;
    
    function checkAndIncrement() {
        checkUsernameExists(finalUsername, (err, exists) => {
            if (err) {
                callback(err, null);
                return;
            }
            
            if (!exists) {
                callback(null, finalUsername);
                return;
            }
            
            // Username exists, try with number suffix
            finalUsername = baseUsername + counter;
            counter++;
            
            // Prevent infinite loop
            if (counter > 999) {
                callback(new Error('Unable to generate unique username'), null);
                return;
            }
            
            checkAndIncrement();
        });
    }
    
    checkAndIncrement();
}

// ===== INSTITUTION ROUTES =====
app.post('/api/institutions', (req, res) => {
    const { name, regNumber, type, address, email, website, phone, adminUsername, adminPassword, adminName, adminEmail } = req.body;

    if (!name || !adminUsername || !adminPassword || !adminName) {
        return res.status(400).json({ error: 'Institution name, admin username, password, and name are required' });
    }

    // Hash the admin password
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    // Generate a safe folder name from the institution name
    const safeFolderName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Generate unique institution code (first 3 letters + random number)
    const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const institutionCode = namePrefix + randomSuffix;
    
    // Create directory structure for the institution
    const institutionDir = path.join(__dirname, '..', 'uploads', safeFolderName);
    const studentsDir = path.join(institutionDir, 'students');
    const teachersDir = path.join(institutionDir, 'teachers');
    
    try {
        // Create directories if they don't exist
        if (!fs.existsSync(institutionDir)) {
            fs.mkdirSync(institutionDir, { recursive: true });
        }
        if (!fs.existsSync(studentsDir)) {
            fs.mkdirSync(studentsDir, { recursive: true });
        }
        if (!fs.existsSync(teachersDir)) {
            fs.mkdirSync(teachersDir, { recursive: true });
        }
    } catch (dirError) {
        console.error('Error creating directory structure:', dirError);
        return res.status(500).json({ error: 'Failed to create institution directories' });
    }

    // Insert new institution
    db.run(
        `INSERT INTO institutions (name, reg_number, type, address, email, website, phone, folder_name, institution_code) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, regNumber || null, type || null, 
         address ? JSON.stringify(address) : null, 
         email || null, website || null, phone || null, safeFolderName, institutionCode],
        function(err) {
            if (err) {
                console.error('Error creating institution:', err);
                return res.status(500).json({ error: 'Failed to create institution' });
            }

            const institutionId = this.lastID;

            // Check if admin username already exists
            db.get('SELECT id FROM users WHERE username = ?', [adminUsername], (err, existingUser) => {
                if (err) {
                    console.error('Error checking for existing user:', err);
                    return res.status(500).json({ error: 'Database error when checking username' });
                }
                
                if (existingUser) {
                    return res.status(400).json({ error: 'Admin username already exists. Please choose a different username.' });
                }
                
                // Create admin user for this institution
                db.run(
                    `INSERT INTO users (username, password, role, name, email, institution_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [adminUsername, hashedPassword, 'admin', adminName, adminEmail || null, institutionId],
                    function(err) {
                        if (err) {
                            console.error('Error creating admin user:', err);
                            return res.status(500).json({ error: 'Failed to create admin user' });
                        }

                        res.status(201).json({
                            success: true,
                            message: 'Institution and admin created successfully',
                            institution: {
                                id: institutionId,
                                name: name,
                                adminCredentials: {
                                    username: adminUsername,
                                    name: adminName
                                }
                            }
                        });
                    }
                );
            });
        }
    );
});

// Get all institutions
app.get('/api/institutions', (req, res) => {
    db.all('SELECT * FROM institutions', [], (err, institutions) => {
        if (err) {
            console.error('Error fetching institutions:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Parse address field for each institution
        const processedInstitutions = institutions.map(institution => {
            if (institution.address && typeof institution.address === 'string') {
                try {
                    institution.address = JSON.parse(institution.address);
                } catch (e) {
                    console.warn(`Failed to parse address for institution ${institution.id}:`, e);
                    // Keep it as a string if parsing fails
                }
            }
            return institution;
        });

        res.json({
            success: true,
            data: processedInstitutions
        });
    });
});

// Get a single institution with its admin
app.get('/api/institutions/:id', (req, res) => {
    const { id } = req.params;

    db.get(
        `SELECT i.*, u.username as admin_username, u.name as admin_name, u.email as admin_email
         FROM institutions i
         LEFT JOIN users u ON i.id = u.institution_id AND u.role = 'admin'
         WHERE i.id = ?`,
        [id],
        (err, institution) => {
            if (err) {
                console.error('Error fetching institution:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!institution) {
                return res.status(404).json({ error: 'Institution not found' });
            }

            // Parse address JSON if it exists
            if (institution.address && typeof institution.address === 'string') {
                try {
                    institution.address = JSON.parse(institution.address);
                } catch (e) {
                    console.warn(`Failed to parse address for institution ${institution.id}:`, e);
                    // Keep it as a string if parsing fails
                }
            }

            res.json({
                success: true,
                data: institution
            });
        }
    );
});

// Update institution by ID
app.put('/api/institutions/:id', (req, res) => {
    const { id } = req.params;
    const { name, regNumber, type, address, email, website, phone, adminEmail } = req.body;

    // Validate required fields
    if (!name || !regNumber || !type || !email || !adminEmail) {
        return res.status(400).json({ 
            error: 'Missing required fields: name, regNumber, type, email, adminEmail' 
        });
    }

    // Serialize address object to JSON string
    const addressJson = typeof address === 'object' ? JSON.stringify(address) : address;

    db.run(
        `UPDATE institutions 
         SET name = ?, regNumber = ?, type = ?, address = ?, email = ?, website = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, regNumber, type, addressJson, email, website, phone, id],
        function(err) {
            if (err) {
                console.error('Error updating institution:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Institution not found' });
            }

            // Update admin email if provided
            if (adminEmail) {
                db.run(
                    `UPDATE users SET email = ? WHERE institution_id = ? AND role = 'admin'`,
                    [adminEmail, id],
                    (updateErr) => {
                        if (updateErr) {
                            console.warn('Failed to update admin email:', updateErr);
                        }
                    }
                );
            }

            res.json({
                success: true,
                message: 'Institution updated successfully',
                data: { id, name, regNumber, type, address, email, website, phone }
            });
        }
    );
});

// Delete institution by ID
app.delete('/api/institutions/:id', (req, res) => {
    const { id } = req.params;
    
    // Start a transaction to ensure data integrity
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete the institution
        db.run('DELETE FROM institutions WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Error deleting institution:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (this.changes === 0) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'Institution not found' });
            }
            
            // Commit the transaction
            db.run('COMMIT');
            res.json({ success: true, message: 'Institution deleted successfully' });
        });
    });
});

// ===== AUTHENTICATION ROUTES =====
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // SQL query to get user with institution data if applicable
    const query = `
        SELECT u.*, i.name as institution_name, i.id as institution_id 
        FROM users u
        LEFT JOIN institutions i ON u.institution_id = i.id
        WHERE u.username = ?
    `;

    db.get(query, [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                name: user.name,
                institution_id: user.institution_id
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                institution_id: user.institution_id,
                institution_name: user.institution_name
            }
        });
    });
});

// ===== ATTENDANCE ROUTES =====

// Get attendance records
app.get('/api/attendance', authenticateToken, (req, res) => {
    const { date, student_id, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM attendance';
    let params = [];
    let conditions = [];

    if (date) {
        conditions.push('date = ?');
        params.push(date);
    }

    if (student_id) {
        conditions.push('student_id = ?');
        params.push(student_id);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC, time DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error in attendance fetch:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`Fetched ${rows.length} attendance records`);
        res.json({ success: true, data: rows });
    });
});

// Get attendance records without authentication (for testing)
app.get('/api/attendance/public', (req, res) => {
    const { limit = 10 } = req.query;
    
    const query = 'SELECT * FROM attendance ORDER BY date DESC, time DESC LIMIT ?';
    
    db.all(query, [parseInt(limit)], (err, rows) => {
        if (err) {
            console.error('Database error in public attendance fetch:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`Public fetch: ${rows.length} attendance records`);
        res.json({ success: true, data: rows });
    });
});

// Submit attendance via CSV upload
app.post('/api/attendance/upload', authenticateToken, csvUpload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
    }

    const results = [];
    
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            // Validate CSV data format
            if (data.Date && data.Time && data.Name && data.ID && data.Dept) {
                results.push({
                    date: data.Date,
                    time: data.Time,
                    student_name: data.Name,
                    student_id: data.ID,
                    department: data.Dept,
                    role: data.Role || 'Student'
                });
            }
        })
        .on('end', () => {
            // Insert attendance records
            insertAttendanceRecords(results)
                .then(() => {
                    // Delete uploaded file
                    fs.unlinkSync(req.file.path);
                    res.json({ 
                        success: true, 
                        message: `${results.length} attendance records processed`,
                        data: results 
                    });
                })
                .catch(err => {
                    console.error('Error inserting attendance records:', err);
                    res.status(500).json({ error: 'Failed to process attendance data' });
                });
        });
});

// Real-time attendance endpoint (for face recognition system)
app.post('/api/attendance/realtime', async (req, res) => {
    const { date, time, name, id, dept, role, institution_code } = req.body;

    if (!date || !time || !name || !id || !dept) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Resolve institution_id from institution_code
    let institution_id = null;
    if (institution_code) {
        try {
            const institution = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM institutions WHERE institution_code = ?', [institution_code], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            institution_id = institution?.id;
        } catch (error) {
            console.error('Error resolving institution:', error);
        }
    }

    const attendanceRecord = {
        date,
        time,
        student_name: name,
        student_id: id,
        department: dept,
        role: role || 'Student',
        institution_id: institution_id
    };

    insertAttendanceRecords([attendanceRecord])
        .then(() => {
            res.json({ 
                success: true, 
                message: 'Attendance recorded successfully',
                data: attendanceRecord 
            });
        })
        .catch(err => {
            console.error('Error recording attendance:', err);
            res.status(500).json({ error: 'Failed to record attendance' });
        });
});

// Get attendance statistics
app.get('/api/attendance/stats', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    const queries = {
        today: 'SELECT COUNT(*) as count FROM attendance WHERE date = ?',
        thisWeek: `SELECT COUNT(*) as count FROM attendance WHERE date >= date('now', '-7 days')`,
        thisMonth: `SELECT COUNT(*) as count FROM attendance WHERE date >= date('now', 'start of month')`,
        totalStudents: 'SELECT COUNT(*) as count FROM students WHERE status = "active"'
    };

    const stats = {};
    const promises = [];

    // Today's attendance
    promises.push(new Promise((resolve, reject) => {
        db.get(queries.today, [today], (err, row) => {
            if (err) reject(err);
            else {
                stats.todayAttendance = row.count;
                resolve();
            }
        });
    }));

    // This week's attendance
    promises.push(new Promise((resolve, reject) => {
        db.get(queries.thisWeek, (err, row) => {
            if (err) reject(err);
            else {
                stats.weekAttendance = row.count;
                resolve();
            }
        });
    }));

    // This month's attendance
    promises.push(new Promise((resolve, reject) => {
        db.get(queries.thisMonth, (err, row) => {
            if (err) reject(err);
            else {
                stats.monthAttendance = row.count;
                resolve();
            }
        });
    }));

    // Total students
    promises.push(new Promise((resolve, reject) => {
        db.get(queries.totalStudents, (err, row) => {
            if (err) reject(err);
            else {
                stats.totalStudents = row.count;
                resolve();
            }
        });
    }));

    Promise.all(promises)
        .then(() => {
            // Calculate percentages
            stats.todayAttendanceRate = stats.totalStudents > 0 ? 
                ((stats.todayAttendance / stats.totalStudents) * 100).toFixed(1) : 0;
            
            res.json({ success: true, data: stats });
        })
        .catch(err => {
            console.error('Error getting attendance stats:', err);
            res.status(500).json({ error: 'Failed to get attendance statistics' });
        });
});

// ===== SUPERADMIN STATS ROUTES =====
app.get('/api/superadmin/stats', (req, res) => {
    // Get system-wide statistics for superadmin dashboard
    const stats = {};
    const promises = [];

    // Get total institutions
    promises.push(new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total FROM institutions', (err, row) => {
            if (err) reject(err);
            else {
                stats.totalInstitutions = row.total;
                resolve();
            }
        });
    }));

    // Get total students across all institutions
    promises.push(new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total FROM students WHERE status = "active"', (err, row) => {
            if (err) reject(err);
            else {
                stats.totalStudents = row.total;
                resolve();
            }
        });
    }));

    // Get total teachers across all institutions
    promises.push(new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total FROM users WHERE role = "teacher"', (err, row) => {
            if (err) reject(err);
            else {
                stats.totalTeachers = row.total;
                resolve();
            }
        });
    }));

    // Get total system admins (including superadmin)
    promises.push(new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total FROM users WHERE role IN ("admin", "superadmin")', (err, row) => {
            if (err) reject(err);
            else {
                stats.systemAdmins = row.total;
                resolve();
            }
        });
    }));

    // Get institution breakdown by type
    promises.push(new Promise((resolve, reject) => {
        db.all('SELECT type, COUNT(*) as count FROM institutions GROUP BY type', (err, rows) => {
            if (err) reject(err);
            else {
                stats.institutionsByType = rows || [];
                resolve();
            }
        });
    }));

    Promise.all(promises)
        .then(() => {
            res.json({ success: true, data: stats });
        })
        .catch(err => {
            console.error('Error getting superadmin stats:', err);
            res.status(500).json({ error: 'Failed to get system statistics' });
        });
});

// ===== INSTITUTION STATS ROUTES =====
app.get('/api/institution/stats', authenticateToken, async (req, res) => {
    // If the user is not an admin or doesn't have an institution_id, return empty or demo stats
    if (!req.user || req.user.role !== 'admin' || !req.user.institution_id) {
        return res.json({
            success: true,
            data: {
                totalStudents: 0,
                totalTeachers: 0,
                totalClasses: 0,
                attendanceRate: 0,
                newStudentsThisMonth: 0,
                newTeachersThisMonth: 0,
                attendanceRateChange: 0
            }
        });
    }
    
    const institutionId = req.user.institution_id;
    
    try {
        let studentsResult = { total: 0 };
        let teachersResult = { total: 0 };
        let classesResult = { total: 0 };
        let newStudentsResult = { total: 0 };
        let newTeachersResult = { total: 0 };
        
        try {
            // Get students count - handle errors for individual queries
            studentsResult = await new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(students)", (err, rows) => {
                    if (err) {
                        console.error('Error checking students table schema:', err);
                        resolve({ total: 0 });
                        return;
                    }
                    
                    // Check if institution_id column exists
                    const hasInstitutionId = rows.some(row => row.name === 'institution_id');
                    
                    if (hasInstitutionId) {
                        db.get(
                            'SELECT COUNT(*) as total FROM students WHERE institution_id = ?',
                            [institutionId],
                            (err, row) => {
                                if (err) {
                                    console.error('Error counting students:', err);
                                    resolve({ total: 0 });
                                } else {
                                    resolve(row || { total: 0 });
                                }
                            }
                        );
                    } else {
                        // If institution_id column doesn't exist, return 0
                        console.log('institution_id column not found in students table');
                        resolve({ total: 0 });
                    }
                });
            });
        } catch (err) {
            console.error('Error fetching student stats:', err);
        }
        
        try {
            // Get teachers count
            teachersResult = await new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(users)", (err, rows) => {
                    if (err) {
                        console.error('Error checking users table schema:', err);
                        resolve({ total: 0 });
                        return;
                    }
                    
                    // Check if institution_id column exists
                    const hasInstitutionId = rows.some(row => row.name === 'institution_id');
                    
                    if (hasInstitutionId) {
                        db.get(
                            'SELECT COUNT(*) as total FROM users WHERE role = "teacher" AND institution_id = ?',
                            [institutionId],
                            (err, row) => {
                                if (err) {
                                    console.error('Error counting teachers:', err);
                                    resolve({ total: 0 });
                                } else {
                                    resolve(row || { total: 0 });
                                }
                            }
                        );
                    } else {
                        console.log('institution_id column not found in users table');
                        resolve({ total: 0 });
                    }
                });
            });
        } catch (err) {
            console.error('Error fetching teacher stats:', err);
        }
        
        try {
            // Get classes count
            classesResult = await new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(classes)", (err, rows) => {
                    if (err) {
                        console.error('Error checking classes table schema:', err);
                        resolve({ total: 0 });
                        return;
                    }
                    
                    // Check if institution_id column exists
                    const hasInstitutionId = rows.some(row => row.name === 'institution_id');
                    
                    if (hasInstitutionId) {
                        db.get(
                            'SELECT COUNT(*) as total FROM classes WHERE institution_id = ?',
                            [institutionId],
                            (err, row) => {
                                if (err) {
                                    console.error('Error counting classes:', err);
                                    resolve({ total: 0 });
                                } else {
                                    resolve(row || { total: 0 });
                                }
                            }
                        );
                    } else {
                        console.log('institution_id column not found in classes table');
                        resolve({ total: 0 });
                    }
                });
            });
        } catch (err) {
            console.error('Error fetching class stats:', err);
        }
        
        // Get new students this month
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
        
        try {
            newStudentsResult = await new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(students)", (err, rows) => {
                    if (err) {
                        console.error('Error checking students table schema:', err);
                        resolve({ total: 0 });
                        return;
                    }
                    
                    const hasInstitutionId = rows.some(row => row.name === 'institution_id');
                    
                    if (hasInstitutionId) {
                        db.get(
                            'SELECT COUNT(*) as total FROM students WHERE institution_id = ? AND created_at >= ?',
                            [institutionId, firstDayOfMonthStr],
                            (err, row) => {
                                if (err) {
                                    console.error('Error counting new students:', err);
                                    resolve({ total: 0 });
                                } else {
                                    resolve(row || { total: 0 });
                                }
                            }
                        );
                    } else {
                        resolve({ total: 0 });
                    }
                });
            });
        } catch (err) {
            console.error('Error fetching new students stats:', err);
        }
        
        // Get new teachers this month
        try {
            newTeachersResult = await new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(users)", (err, rows) => {
                    if (err) {
                        console.error('Error checking users table schema:', err);
                        resolve({ total: 0 });
                        return;
                    }
                    
                    const hasInstitutionId = rows.some(row => row.name === 'institution_id');
                    
                    if (hasInstitutionId) {
                        db.get(
                            'SELECT COUNT(*) as total FROM users WHERE role = "teacher" AND institution_id = ? AND created_at >= ?',
                            [institutionId, firstDayOfMonthStr],
                            (err, row) => {
                                if (err) {
                                    console.error('Error counting new teachers:', err);
                                    resolve({ total: 0 });
                                } else {
                                    resolve(row || { total: 0 });
                                }
                            }
                        );
                    } else {
                        resolve({ total: 0 });
                    }
                });
            });
        } catch (err) {
            console.error('Error fetching new teachers stats:', err);
        }
        
        // Get attendance rate
        // This is a simplified calculation - in a real app you'd need more complex logic
        const attendanceRate = Math.floor(Math.random() * 15) + 85; // Random number between 85-100
        const attendanceRateChange = Math.floor(Math.random() * 5) + 1; // Random change between 1-5
        
        res.json({
            success: true,
            data: {
                totalStudents: studentsResult.total || 0,
                totalTeachers: teachersResult.total || 0,
                totalClasses: classesResult.total || 0,
                attendanceRate: attendanceRate,
                newStudentsThisMonth: newStudentsResult.total || 0,
                newTeachersThisMonth: newTeachersResult.total || 0,
                attendanceRateChange: attendanceRateChange
            }
        });
    } catch (error) {
        console.error('Error fetching institution stats:', error);
        res.status(500).json({ error: 'Failed to get institution statistics' });
    }
});

// ===== STUDENT ROUTES =====
app.get('/api/students', authenticateToken, (req, res) => {
    const { department, status = 'active' } = req.query;
    
    let query = 'SELECT * FROM students WHERE status = ?';
    let params = [status];

    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        console.log(`Filtering students for institution ID: ${req.user.institution_id}`);
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    query += ' ORDER BY name';
    console.log('Student query:', query, params);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`Found ${rows.length} students`);
        res.json({ success: true, data: rows });
    });
});

// Get student photos
app.get('/api/students/:id/photos', authenticateToken, (req, res) => {
    const studentId = req.params.id;
    
    // Get student info first to find photo directory
    db.get('SELECT * FROM students WHERE id = ?', [studentId], (err, student) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // Check if photo directory exists
        if (!student.photo_directory) {
            return res.json({ success: true, data: [] });
        }
        
        // Full path to student photos directory
        const photosDir = path.join(__dirname, '..', student.photo_directory);
        
        // Check if directory exists
        if (!fs.existsSync(photosDir)) {
            return res.json({ success: true, data: [] });
        }
        
        try {
            // Get list of photos
            const photos = fs.readdirSync(photosDir)
                .filter(file => {
                    // Only include image files
                    const ext = path.extname(file).toLowerCase();
                    return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
                })
                .map(file => {
                    return {
                        filename: file,
                        path: path.join(student.photo_directory, file).replace(/\\/g, '/')
                    };
                });
                
            res.json({ success: true, data: photos });
        } catch (error) {
            console.error('Error reading student photos directory:', error);
            return res.status(500).json({ error: 'Error reading photos directory' });
        }
    });
});

// Create a new student
app.post('/api/students', authenticateToken, (req, res) => {
    // Only admin users can add students
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Insufficient permissions to add students' });
    }
    
    // Configure photo upload with authenticated user context
    const photoUpload = configurePhotoUpload(req);
    
    // Handle the file upload
    photoUpload.array('photos', 5)(req, res, (err) => {
        if (err) {
            console.error('Error uploading photos:', err);
            return res.status(400).json({ error: 'Photo upload error: ' + err.message });
        }
        
        // Continue with student creation
        const { id, name, department, class: className, status, email, phone, username, password } = req.body;
        
        // Validate required fields
        if (!id || !name || !department || !username || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Handle photo upload info
        let photoDirectory = null;
        if (req.files && req.files.length > 0) {
            // Get relative path from the absolute path of the uploaded file
            if (req.files[0].destination) {
                // This ensures the database record matches the actual file location
                const relativePath = path.relative(
                    path.join(__dirname, '..'), 
                    req.files[0].destination
                ).replace(/\\/g, '/');
                
                photoDirectory = relativePath;
                console.log('Photo directory saved as:', photoDirectory);
            } else {
                // Create relative path for storage in database as fallback
                const studentFolder = name.replace(/\s+/g, '_');
                
                // Check if institution_id is available from user
                if (req.user && req.user.institution_id) {
                    // Get institution folder name from database
                    db.get('SELECT folder_name FROM institutions WHERE id = ?', [req.user.institution_id], (err, institution) => {
                        if (!err && institution) {
                            photoDirectory = path.join('uploads', institution.folder_name || 'default', 'students', studentFolder).replace(/\\/g, '/');
                        } else {
                            photoDirectory = path.join('uploads', 'students', studentFolder).replace(/\\/g, '/');
                        }
                    });
                } else {
                    photoDirectory = path.join('uploads', 'students', studentFolder).replace(/\\/g, '/');
                }
            }
        }
    
    // Check if student ID already exists
    db.get('SELECT id FROM students WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error checking student ID:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (row) {
            return res.status(400).json({ error: 'Student ID already exists' });
        }
        
        // Check if username already exists
        db.get('SELECT username FROM users WHERE username = ?', [username], (err, userRow) => {
            if (err) {
                console.error('Error checking username:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (userRow) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            
            // Start a transaction to ensure both student and user are created or neither
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // Hash the password
                const salt = bcrypt.genSaltSync(10);
                const hashedPassword = bcrypt.hashSync(password, salt);
                
                // Create student record
                db.run(
                    'INSERT INTO students (id, name, department, class, status, email, phone, institution_id, photo_directory, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
                    [id, name, department, className, status || 'active', email || null, phone || null, req.user.institution_id, photoDirectory],
                    function(err) {
                        if (err) {
                            console.error('Error creating student:', err);
                            console.error('Student data:', { id, name, department, className, status, email, phone, institution_id: req.user.institution_id, photoDirectory });
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Error creating student: ' + err.message });
                        }
                        
                        // Create user account for the student
                        db.run(
                            'INSERT INTO users (username, password, role, name, email, institution_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
                            [username, hashedPassword, 'student', name, email || null, req.user.institution_id],
                            function(err) {
                                if (err) {
                                    console.error('Error creating user account:', err);
                                    console.error('User data:', { username, role: 'student', name, email, institution_id: req.user.institution_id });
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Error creating user account: ' + err.message });
                                }
                                
                                db.run('COMMIT', async (err) => {
                                    if (err) {
                                        console.error('Error committing transaction:', err);
                                        return res.status(500).json({ error: 'Transaction error' });
                                    }
                                    
                                    console.log(`Student ${name} created with ID ${id} and username ${username}`);
                                    
                                    // Try to upload photos to Google Drive
                                    let driveUploadResults = [];
                                    if (req.files && req.files.length > 0) {
                                        try {
                                            // Get institution info for Drive folder structure
                                            db.get('SELECT name, institution_code FROM institutions WHERE id = ?', [req.user.institution_id], async (err, institution) => {
                                                if (!err && institution) {
                                                    try {
                                                        console.log('Attempting Google Drive upload for student photos...');
                                                        
                                                        // Create or get institution folders
                                                        const institutionFolders = await googleDrive.createInstitutionFolders(
                                                            institution.name, 
                                                            institution.institution_code
                                                        );
                                                        
                                                        // Create user folder
                                                        const userFolder = await googleDrive.createUserFolder(
                                                            name, 
                                                            'student', 
                                                            institutionFolders
                                                        );
                                                        
                                                        // Upload each photo
                                                        for (const file of req.files) {
                                                            const uploadResult = await googleDrive.uploadFile(
                                                                file.path,
                                                                file.originalname || file.filename,
                                                                userFolder.folderId,
                                                                file.mimetype
                                                            );
                                                            driveUploadResults.push({
                                                                originalName: file.originalname || file.filename,
                                                                driveFileId: uploadResult.fileId,
                                                                driveFolderId: userFolder.folderId
                                                            });
                                                        }
                                                        
                                                        console.log(`Successfully uploaded ${driveUploadResults.length} photos to Google Drive for student ${name}`);
                                                        
                                                        // Update student record with Drive folder info
                                                        db.run('UPDATE students SET drive_folder_id = ?, drive_photo_urls = ? WHERE id = ?', [
                                                            userFolder.folderId,
                                                            JSON.stringify(driveUploadResults),
                                                            id
                                                        ], (updateErr) => {
                                                            if (updateErr) console.error('Error updating student with Drive info:', updateErr);
                                                        });
                                                        
                                                    } catch (driveError) {
                                                        console.error('Error uploading to Google Drive:', driveError);
                                                    }
                                                }
                                            });
                                        } catch (driveError) {
                                            console.error('Error with Google Drive operation:', driveError);
                                        }
                                    }
                                    
                                    // Send response immediately (don't wait for Drive upload)
                                    res.status(201).json({ 
                                        success: true, 
                                        data: { 
                                            id, 
                                            name, 
                                            department, 
                                            class: className, 
                                            status, 
                                            username,
                                            institution_id: req.user.institution_id,
                                            photo_directory: photoDirectory,
                                            photos: req.files ? req.files.map(file => ({
                                                filename: file.filename,
                                                path: file.path.replace(/\\/g, '/').replace(path.join(__dirname, '..').replace(/\\/g, '/'), '')
                                            })) : [],
                                            driveUpload: driveUploadResults.length > 0 ? 'success' : 'pending'
                                        } 
                                    });
                                });
                            }
                        );
                    }
                );
            });
        });
    });
    });
});

// Delete a student
app.delete('/api/students/:id', authenticateToken, (req, res) => {
    // Only admin users can delete students
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Insufficient permissions to delete students' });
    }
    
    const studentId = req.params.id;
    
    // Get student information first (for photo directory)
    db.get('SELECT * FROM students WHERE id = ?', [studentId], (err, student) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // Check if the student belongs to the admin's institution
        if (req.user.role === 'admin' && student.institution_id !== req.user.institution_id) {
            return res.status(403).json({ error: 'You can only delete students from your institution' });
        }
        
        // Start a transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Delete student record
            db.run('DELETE FROM students WHERE id = ?', [studentId], function(err) {
                if (err) {
                    console.error('Error deleting student:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error deleting student' });
                }
                
                // Delete associated user account
                db.run('DELETE FROM users WHERE username = ? AND role = "student"', [student.id], function(err) {
                    if (err) {
                        console.error('Error deleting user account:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error deleting user account' });
                    }
                    
                    // Delete any attendance records for this student
                    db.run('DELETE FROM attendance WHERE student_id = ?', [studentId], function(err) {
                        if (err) {
                            console.error('Error deleting attendance records:', err);
                            // Continue anyway as attendance records are less critical
                        }
                        
                        db.run('COMMIT', err => {
                            if (err) {
                                console.error('Error committing transaction:', err);
                                return res.status(500).json({ error: 'Transaction error' });
                            }
                            
                            // If there are photos, attempt to delete the directory
                            if (student.photo_directory) {
                                const photoDir = path.join(__dirname, '..', student.photo_directory);
                                try {
                                    if (fs.existsSync(photoDir)) {
                                        // Read all files in directory
                                        const files = fs.readdirSync(photoDir);
                                        
                                        // Delete each file
                                        for (const file of files) {
                                            fs.unlinkSync(path.join(photoDir, file));
                                        }
                                        
                                        // Delete directory
                                        fs.rmdirSync(photoDir);
                                        console.log(`Deleted photo directory for student ${studentId}`);
                                    }
                                } catch (err) {
                                    console.error(`Error deleting photo directory for student ${studentId}:`, err);
                                    // Continue anyway - the student was deleted successfully
                                }
                            }
                            
                            console.log(`Student ${studentId} deleted successfully`);
                            res.json({ success: true, message: 'Student deleted successfully' });
                        });
                    });
                });
            });
        });
    });
});

// Get all teachers, optionally filtered by institution
app.get('/api/teachers', authenticateToken, (req, res) => {
    const { department, status = 'active' } = req.query;
    
    // First try the teachers table
    let teachersQuery = 'SELECT * FROM teachers WHERE status = ?';
    let teachersParams = [status];

    if (department) {
        teachersQuery += ' AND department = ?';
        teachersParams.push(department);
    }

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        teachersQuery += ' AND institution_id = ?';
        teachersParams.push(req.user.institution_id);
    }

    teachersQuery += ' ORDER BY name';
    
    db.all(teachersQuery, teachersParams, (err, teacherRows) => {
        if (err) {
            console.error('Error fetching from teachers table:', err);
            
            // If teachers table fails, try users table as fallback
            const usersQuery = 'SELECT * FROM users WHERE role = "teacher"';
            const usersParams = [];
            
            // Filter by institution if applicable
            if (req.user && req.user.role === 'admin' && req.user.institution_id) {
                usersQuery += ' AND institution_id = ?';
                usersParams.push(req.user.institution_id);
            }
            
            db.all(usersQuery, usersParams, (usersErr, userRows) => {
                if (usersErr) {
                    console.error('Error fetching teachers from users table:', usersErr);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                console.log(`Found ${userRows.length} teachers (from users table)`);
                res.json({ success: true, data: userRows });
            });
            
            return;
        }
        
        console.log(`Found ${teacherRows.length} teachers (from teachers table)`);
        res.json({ success: true, data: teacherRows });
    });
});

// Create a new teacher
app.post('/api/teachers', authenticateToken, (req, res) => {
    // Only admin users can add teachers
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Insufficient permissions to add teachers' });
    }
    
    // Configure photo upload with authenticated user context
    const photoUpload = configurePhotoUpload(req);
    
    // Handle the file upload
    photoUpload.array('photos', 5)(req, res, (err) => {
        if (err) {
            console.error('Error uploading photos:', err);
            return res.status(400).json({ error: 'Photo upload error: ' + err.message });
        }
        
        // Continue with teacher creation
        const { id, name, department, subject, status, email, phone, username, password } = req.body;
        
        // Validate required fields
        if (!id || !name || !department || !username || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Handle photo upload info
        let photoDirectory = null;
        if (req.files && req.files.length > 0) {
            if (req.files[0].destination) {
                const relativePath = path.relative(
                    path.join(__dirname, '..'), 
                    req.files[0].destination
                ).replace(/\\/g, '/');
                
                photoDirectory = relativePath;
                console.log('Photo directory saved as:', photoDirectory);
            }
        }
    
        // Check if teacher ID already exists
        db.get('SELECT id FROM teachers WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Error checking teacher ID:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (row) {
                return res.status(400).json({ error: 'Teacher ID already exists' });
            }
            
            // Check if username already exists
            db.get('SELECT username FROM users WHERE username = ?', [username], (err, userRow) => {
                if (err) {
                    console.error('Error checking username:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (userRow) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                
                // Start a transaction
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    
                    // Hash the password
                    const salt = bcrypt.genSaltSync(10);
                    const hashedPassword = bcrypt.hashSync(password, salt);
                    
                    // Create teacher record
                    db.run(
                        'INSERT INTO teachers (id, name, department, subject, status, email, phone, institution_id, photo_directory, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
                        [id, name, department, subject || null, status || 'active', email || null, phone || null, req.user.institution_id, photoDirectory],
                        function(err) {
                            if (err) {
                                console.error('Error creating teacher:', err);
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Error creating teacher: ' + err.message });
                            }
                            
                            // Create user account for the teacher
                            db.run(
                                'INSERT INTO users (username, password, role, name, email, institution_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
                                [username, hashedPassword, 'teacher', name, email || null, req.user.institution_id],
                                function(err) {
                                    if (err) {
                                        console.error('Error creating user account:', err);
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Error creating user account: ' + err.message });
                                    }
                                    
                                    db.run('COMMIT', async (err) => {
                                        if (err) {
                                            console.error('Error committing transaction:', err);
                                            return res.status(500).json({ error: 'Transaction error' });
                                        }
                                        
                                        console.log(`Teacher ${name} created with ID ${id} and username ${username}`);
                                        
                                        // Try to upload photos to Google Drive
                                        let driveUploadResults = [];
                                        if (req.files && req.files.length > 0) {
                                            try {
                                                // Get institution info for Drive folder structure
                                                db.get('SELECT name, institution_code FROM institutions WHERE id = ?', [req.user.institution_id], async (err, institution) => {
                                                    if (!err && institution) {
                                                        try {
                                                            console.log('Attempting Google Drive upload for teacher photos...');
                                                            
                                                            // Create or get institution folders
                                                            const institutionFolders = await googleDrive.createInstitutionFolders(
                                                                institution.name, 
                                                                institution.institution_code
                                                            );
                                                            
                                                            // Create user folder
                                                            const userFolder = await googleDrive.createUserFolder(
                                                                name, 
                                                                'teacher', 
                                                                institutionFolders
                                                            );
                                                            
                                                            // Upload each photo
                                                            for (const file of req.files) {
                                                                const uploadResult = await googleDrive.uploadFile(
                                                                    file.path,
                                                                    file.originalname || file.filename,
                                                                    userFolder.folderId,
                                                                    file.mimetype
                                                                );
                                                                driveUploadResults.push({
                                                                    originalName: file.originalname || file.filename,
                                                                    driveFileId: uploadResult.fileId,
                                                                    driveFolderId: userFolder.folderId
                                                                });
                                                            }
                                                            
                                                            console.log(`Successfully uploaded ${driveUploadResults.length} photos to Google Drive for teacher ${name}`);
                                                            
                                                            // Update teacher record with Drive folder info
                                                            db.run('UPDATE teachers SET drive_folder_id = ?, drive_photo_urls = ? WHERE id = ?', [
                                                                userFolder.folderId,
                                                                JSON.stringify(driveUploadResults),
                                                                id
                                                            ], (updateErr) => {
                                                                if (updateErr) console.error('Error updating teacher with Drive info:', updateErr);
                                                            });
                                                            
                                                        } catch (driveError) {
                                                            console.error('Error uploading to Google Drive:', driveError);
                                                        }
                                                    }
                                                });
                                            } catch (driveError) {
                                                console.error('Error with Google Drive operation:', driveError);
                                            }
                                        }
                                        
                                        // Send response immediately (don't wait for Drive upload)
                                        res.status(201).json({ 
                                            success: true, 
                                            data: { 
                                                id, 
                                                name, 
                                                department, 
                                                subject, 
                                                status, 
                                                username,
                                                institution_id: req.user.institution_id,
                                                photo_directory: photoDirectory,
                                                photos: req.files ? req.files.map(file => ({
                                                    filename: file.filename,
                                                    path: file.path.replace(/\\/g, '/').replace(path.join(__dirname, '..').replace(/\\/g, '/'), '')
                                                })) : [],
                                                driveUpload: driveUploadResults.length > 0 ? 'success' : 'pending'
                                            } 
                                        });
                                    });
                                }
                            );
                        }
                    );
                });
            });
        });
    });
});

// Delete a teacher
app.delete('/api/teachers/:id', authenticateToken, (req, res) => {
    // Only admin users can delete teachers
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Insufficient permissions to delete teachers' });
    }
    
    const teacherId = req.params.id;
    
    // Get teacher information first
    db.get('SELECT * FROM teachers WHERE id = ?', [teacherId], (err, teacher) => {
        if (err) {
            console.error('Error fetching teacher:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        
        // Check if the teacher belongs to the admin's institution
        if (req.user.role === 'admin' && teacher.institution_id !== req.user.institution_id) {
            return res.status(403).json({ error: 'You can only delete teachers from your institution' });
        }
        
        // Start a transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Delete teacher record
            db.run('DELETE FROM teachers WHERE id = ?', [teacherId], function(err) {
                if (err) {
                    console.error('Error deleting teacher:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error deleting teacher' });
                }
                
                // Delete associated user account
                db.run('DELETE FROM users WHERE username = ? AND role = "teacher"', [teacher.id], function(err) {
                    if (err) {
                        console.error('Error deleting user account:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error deleting user account' });
                    }
                    
                    db.run('COMMIT', err => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return res.status(500).json({ error: 'Transaction error' });
                        }
                        
                        console.log(`Teacher ${teacherId} deleted successfully`);
                        res.json({ success: true, message: 'Teacher deleted successfully' });
                    });
                });
            });
        });
    });
});

// Get all classes, optionally filtered by institution
app.get('/api/classes', authenticateToken, (req, res) => {
    const { department, status = 'active' } = req.query;
    
    let query = 'SELECT * FROM classes WHERE status = ?';
    let params = [status];

    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    query += ' ORDER BY name';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching classes:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`Found ${rows.length} classes`);
        res.json({ success: true, data: rows });
    });
});

// Create new class with grade management
app.post('/api/classes', authenticateToken, (req, res) => {
    const { 
        name, 
        department, 
        teacher_id, 
        room, 
        schedule, 
        capacity, 
        grade_level, 
        section, 
        academic_year,
        grade_category 
    } = req.body;

    if (!name || !department) {
        return res.status(400).json({ error: 'Class name and department are required' });
    }

    // Get institution_id from authenticated user
    let institution_id = null;
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        institution_id = req.user.institution_id;
    }

    db.run(`
        INSERT INTO classes (
            name, department, teacher_id, room, schedule, capacity, 
            grade_level, section, academic_year, grade_category, institution_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        name, department, teacher_id, room, schedule, capacity,
        grade_level, section, academic_year, grade_category, institution_id
    ], function(err) {
        if (err) {
            console.error('Error creating class:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            success: true,
            message: 'Class created successfully',
            data: { id: this.lastID, name, department, grade_level, section }
        });
    });
});

// Update class
app.put('/api/classes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { 
        name, 
        department, 
        teacher_id, 
        room, 
        schedule, 
        capacity, 
        grade_level, 
        section, 
        academic_year,
        grade_category,
        status
    } = req.body;

    let query = `
        UPDATE classes 
        SET name = ?, department = ?, teacher_id = ?, room = ?, schedule = ?, 
            capacity = ?, grade_level = ?, section = ?, academic_year = ?, 
            grade_category = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    let params = [
        name, department, teacher_id, room, schedule, capacity,
        grade_level, section, academic_year, grade_category, status, id
    ];

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating class:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Class not found or no permission' });
        }

        res.json({
            success: true,
            message: 'Class updated successfully'
        });
    });
});

// Get classes by grade level
app.get('/api/classes/grade/:level', authenticateToken, (req, res) => {
    const { level } = req.params;
    const { academic_year, section } = req.query;
    
    let query = 'SELECT * FROM classes WHERE grade_level = ? AND status = ?';
    let params = [level, 'active'];

    if (academic_year) {
        query += ' AND academic_year = ?';
        params.push(academic_year);
    }

    if (section) {
        query += ' AND section = ?';
        params.push(section);
    }

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    query += ' ORDER BY section, name';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching classes by grade:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ success: true, data: rows });
    });
});

// Delete class
app.delete('/api/classes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    let query = 'UPDATE classes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    let params = ['deleted', id];

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error deleting class:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Class not found or no permission' });
        }

        res.json({
            success: true,
            message: 'Class deleted successfully'
        });
    });
});

// ===== CALENDAR AND SCHEDULING ROUTES =====

// Get all calendar events
app.get('/api/calendar/events', authenticateToken, (req, res) => {
    const { start_date, end_date, event_type, class_id } = req.query;
    
    let query = 'SELECT * FROM calendar_events WHERE 1=1';
    let params = [];

    // Date range filtering
    if (start_date) {
        query += ' AND start_date >= ?';
        params.push(start_date);
    }
    
    if (end_date) {
        query += ' AND start_date <= ?';
        params.push(end_date);
    }

    // Event type filtering
    if (event_type) {
        query += ' AND event_type = ?';
        params.push(event_type);
    }

    // Class filtering
    if (class_id) {
        query += ' AND class_id = ?';
        params.push(class_id);
    }

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    query += ' ORDER BY start_date, start_time';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching calendar events:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ success: true, data: rows });
    });
});

// Create new calendar event
app.post('/api/calendar/events', authenticateToken, (req, res) => {
    const { 
        title, 
        description, 
        event_type, 
        start_date, 
        end_date, 
        start_time, 
        end_time, 
        class_id 
    } = req.body;

    if (!title || !event_type || !start_date) {
        return res.status(400).json({ error: 'Title, event type, and start date are required' });
    }

    // Validate event type
    const validEventTypes = ['class', 'exam', 'holiday', 'meeting', 'announcement'];
    if (!validEventTypes.includes(event_type)) {
        return res.status(400).json({ error: 'Invalid event type' });
    }

    // Get institution_id from authenticated user
    let institution_id = null;
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        institution_id = req.user.institution_id;
    }

    db.run(`
        INSERT INTO calendar_events (
            title, description, event_type, start_date, end_date, 
            start_time, end_time, class_id, institution_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        title, description, event_type, start_date, end_date,
        start_time, end_time, class_id, institution_id, req.user?.id
    ], function(err) {
        if (err) {
            console.error('Error creating calendar event:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            success: true,
            message: 'Calendar event created successfully',
            data: { id: this.lastID, title, start_date, event_type }
        });
    });
});

// Update calendar event
app.put('/api/calendar/events/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { 
        title, 
        description, 
        event_type, 
        start_date, 
        end_date, 
        start_time, 
        end_time, 
        class_id 
    } = req.body;

    let query = `
        UPDATE calendar_events 
        SET title = ?, description = ?, event_type = ?, start_date = ?, end_date = ?, 
            start_time = ?, end_time = ?, class_id = ?
        WHERE id = ?
    `;
    
    let params = [
        title, description, event_type, start_date, end_date,
        start_time, end_time, class_id, id
    ];

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating calendar event:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Event not found or no permission' });
        }

        res.json({
            success: true,
            message: 'Calendar event updated successfully'
        });
    });
});

// Delete calendar event
app.delete('/api/calendar/events/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    let query = 'DELETE FROM calendar_events WHERE id = ?';
    let params = [id];

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error deleting calendar event:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Event not found or no permission' });
        }

        res.json({
            success: true,
            message: 'Calendar event deleted successfully'
        });
    });
});

// Get events for a specific month/year
app.get('/api/calendar/events/:year/:month', authenticateToken, (req, res) => {
    const { year, month } = req.params;
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    
    let query = 'SELECT * FROM calendar_events WHERE start_date >= ? AND start_date <= ?';
    let params = [startDate, endDate];

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    query += ' ORDER BY start_date, start_time';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching monthly calendar events:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ success: true, data: rows });
    });
});

// Get today's events
app.get('/api/calendar/today', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    let query = 'SELECT * FROM calendar_events WHERE start_date = ?';
    let params = [today];

    // Filter by institution if the user is an admin with an institution_id
    if (req.user && req.user.role === 'admin' && req.user.institution_id) {
        query += ' AND institution_id = ?';
        params.push(req.user.institution_id);
    }

    query += ' ORDER BY start_time';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching today\'s events:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ success: true, data: rows });
    });
});

// ===== GOOGLE DRIVE API ROUTES =====

// Initialize Google Drive for institution
app.post('/api/drive/initialize/:institutionId', authenticateToken, async (req, res) => {
    try {
        const { institutionId } = req.params;
        
        // Get institution details
        const institution = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM institutions WHERE id = ?', [institutionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!institution) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        // Create folder structure
        const folderStructure = await googleDrive.createInstitutionFolders(
            institution.name, 
            institution.institution_code
        );
        
        res.json({
            success: true,
            message: 'Google Drive folders created successfully',
            data: folderStructure
        });
        
    } catch (error) {
        console.error('Error initializing Google Drive:', error);
        res.status(500).json({ error: 'Failed to initialize Google Drive folders' });
    }
});

// Create user folder (for teachers/students)
app.post('/api/drive/user-folder', authenticateToken, async (req, res) => {
    try {
        const { userName, userType, institutionId } = req.body;
        
        if (!userName || !userType || !institutionId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Get institution details
        const institution = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM institutions WHERE id = ?', [institutionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!institution) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        // Get or create institution folders
        let folderStructure = await googleDrive.getInstitutionStructure(
            institution.name, 
            institution.institution_code
        );
        
        if (!folderStructure) {
            folderStructure = await googleDrive.createInstitutionFolders(
                institution.name, 
                institution.institution_code
            );
        }
        
        // Create user folder
        const userFolder = await googleDrive.createUserFolder(userName, userType, folderStructure);
        
        res.json({
            success: true,
            message: 'User folder created successfully',
            data: {
                userFolder,
                institutionStructure: folderStructure
            }
        });
        
    } catch (error) {
        console.error('Error creating user folder:', error);
        res.status(500).json({ error: 'Failed to create user folder' });
    }
});

// Upload photo to user folder
app.post('/api/drive/upload-photo', authenticateToken, multer().single('photo'), async (req, res) => {
    try {
        const { userName, userType, institutionId } = req.body;
        const photo = req.file;
        
        if (!photo || !userName || !userType || !institutionId) {
            return res.status(400).json({ error: 'Missing required fields or photo' });
        }
        
        // Get institution details
        const institution = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM institutions WHERE id = ?', [institutionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!institution) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        // Get institution folder structure
        let folderStructure = await googleDrive.getInstitutionStructure(
            institution.name, 
            institution.institution_code
        );
        
        if (!folderStructure) {
            folderStructure = await googleDrive.createInstitutionFolders(
                institution.name, 
                institution.institution_code
            );
        }
        
        // Create user folder if it doesn't exist
        const userFolder = await googleDrive.createUserFolder(userName, userType, folderStructure);
        
        // Save photo temporarily
        const tempPath = path.join(__dirname, '../temp', photo.originalname);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(tempPath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(tempPath, photo.buffer);
        
        try {
            // Upload to Google Drive
            const uploadResult = await googleDrive.uploadFile(
                tempPath,
                `${userName}_${Date.now()}.${photo.originalname.split('.').pop()}`,
                userFolder.folderId,
                photo.mimetype
            );
            
            // Clean up temp file
            fs.unlinkSync(tempPath);
            
            res.json({
                success: true,
                message: 'Photo uploaded successfully',
                data: uploadResult
            });
            
        } catch (uploadError) {
            // Clean up temp file on error
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw uploadError;
        }
        
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Get user's photos from Drive
app.get('/api/drive/user-photos/:userName/:userType/:institutionId', authenticateToken, async (req, res) => {
    try {
        const { userName, userType, institutionId } = req.params;
        
        // Get institution details
        const institution = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM institutions WHERE id = ?', [institutionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!institution) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        // Get institution folder structure
        const folderStructure = await googleDrive.getInstitutionStructure(
            institution.name, 
            institution.institution_code
        );
        
        if (!folderStructure) {
            return res.json({ success: true, data: [] });
        }
        
        // Get user folder
        const parentFolderId = userType === 'teacher' ? 
            folderStructure.teachersFolderId : 
            folderStructure.studentsFolderId;
            
        if (!parentFolderId) {
            return res.json({ success: true, data: [] });
        }
        
        // Find user folder
        const userFolderId = await googleDrive.findOrCreateFolder(userName, parentFolderId);
        
        // List files in user folder
        const files = await googleDrive.listFiles(userFolderId);
        
        res.json({
            success: true,
            data: files
        });
        
    } catch (error) {
        console.error('Error getting user photos:', error);
        res.status(500).json({ error: 'Failed to get user photos' });
    }
});

// Delete photo from Drive
app.delete('/api/drive/photo/:fileId', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        await googleDrive.deleteFile(fileId);
        
        res.json({
            success: true,
            message: 'Photo deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// Get Drive folder structure for institution
app.get('/api/drive/structure/:institutionId', authenticateToken, async (req, res) => {
    try {
        const { institutionId } = req.params;
        
        // Get institution details
        const institution = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM institutions WHERE id = ?', [institutionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!institution) {
            return res.status(404).json({ error: 'Institution not found' });
        }
        
        // Get folder structure
        const folderStructure = await googleDrive.getInstitutionStructure(
            institution.name, 
            institution.institution_code
        );
        
        res.json({
            success: true,
            data: folderStructure
        });
        
    } catch (error) {
        console.error('Error getting Drive structure:', error);
        res.status(500).json({ error: 'Failed to get Drive structure' });
    }
});

// ===== UTILITY FUNCTIONS =====
function insertAttendanceRecords(records) {
    return new Promise((resolve, reject) => {
        if (!records || records.length === 0) {
            resolve();
            return;
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    console.error('Error starting transaction:', err);
                    reject(err);
                    return;
                }

                let completed = 0;
                let hasError = false;

                records.forEach((record, index) => {
                    db.run(`
                        INSERT OR REPLACE INTO attendance 
                        (date, time, student_id, student_name, department, face_recognition) 
                        VALUES (?, ?, ?, ?, ?, 1)
                    `, [
                        record.date,
                        record.time,
                        record.student_id,
                        record.student_name,
                        record.department
                    ], function(err) {
                        completed++;
                        
                        if (err && !hasError) {
                            hasError = true;
                            console.error('Error inserting attendance record:', err);
                            db.run('ROLLBACK', () => {
                                reject(err);
                            });
                            return;
                        }

                        // If all records processed and no errors
                        if (completed === records.length && !hasError) {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    console.error('Error committing transaction:', err);
                                    reject(err);
                                } else {
                                    console.log(`Successfully inserted ${records.length} attendance records`);
                                    resolve();
                                }
                            });
                        }
                    });
                });
            });
        });
    });
}

// ===== API TEST ROUTE =====
app.get('/api', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Cheick Mohamed School API is running',
        environment: isReplit ? 'Replit' : 'Local',
        timestamp: new Date().toISOString()
    });
});

// ===== STATIC FILE SERVING =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Special redirect for /admin to superadmin portal
app.get('/admin', (req, res) => {
    res.redirect('/portals/superadmin.html');
});

app.get('/portals/:portal', (req, res) => {
    const portalFile = path.join(__dirname, '..', 'portals', `${req.params.portal}.html`);
    if (fs.existsSync(portalFile)) {
        res.sendFile(portalFile);
    } else {
        res.status(404).send('Portal not found');
    }
});

// Catch all route - Redirects to specific portals based on URL path
app.get('/:routePath', (req, res) => {
    const routePath = req.params.routePath.toLowerCase();
    
    // Special redirects
    if (routePath === 'admin') {
        res.redirect('/portals/superadmin');
    } else if (['teacher', 'student', 'parent'].includes(routePath)) {
        res.redirect(`/portals/${routePath}`);
    } else {
        // For any other path, serve the index.html
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    }
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// ===== SERVER STARTUP =====
function startServer() {
    initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🏫 Cheick Mohamed School Server running on port ${PORT}`);
        const baseUrl = isReplit ? 'https://school-app.replit.com' : `http://localhost:${PORT}`;
        console.log(`📚 Access the website at: ${baseUrl}`);
        console.log(`🔧 Admin Portal: ${baseUrl}/portals/admin`);
        console.log(`👨‍🏫 Teacher Portal: ${baseUrl}/portals/teacher`);
        console.log(`🎓 Student Portal: ${baseUrl}/portals/student`);
        console.log(`👪 Parent Portal: ${baseUrl}/portals/parent`);
        console.log(`🏛️ Super Admin Portal: ${baseUrl}/portals/superadmin`);
        console.log('');
        console.log('📊 API Endpoints:');
        console.log('  POST /api/auth/login - User authentication');
        console.log('  GET  /api/attendance - Get attendance records');
        console.log('  POST /api/attendance/realtime - Submit real-time attendance');
        console.log('  POST /api/attendance/upload - Upload CSV attendance');
        console.log('  GET  /api/attendance/stats - Get attendance statistics');
        console.log('  GET  /api/students - Get student records');
        console.log('  POST /api/students - Create a new student (requires admin role)');
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Gracefully shutting down server...');
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('✅ Database connection closed.');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Start the server
startServer();

// Log environment info
console.log(`🌍 Environment: ${isReplit ? 'Replit' : 'Local'}`);
console.log(`📁 Database Path: ${DB_PATH}`);
if (isReplit) {
    // Try to get the actual Replit URL from various environment variables
    const replitUrl = process.env.REPL_URL || 
                     process.env.REPLIT_URL || 
                     `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` ||
                     'https://replit-url-not-detected';
    console.log(`🌐 Replit URL: ${replitUrl}`);
    console.log(`🔍 Environment variables:`);
    console.log(`   REPL_URL: ${process.env.REPL_URL || 'not set'}`);
    console.log(`   REPLIT_URL: ${process.env.REPLIT_URL || 'not set'}`);
    console.log(`   REPL_SLUG: ${process.env.REPL_SLUG || 'not set'}`);
    console.log(`   REPL_OWNER: ${process.env.REPL_OWNER || 'not set'}`);
}

module.exports = app;