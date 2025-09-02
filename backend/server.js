// ===== CHEICK MOHAMED SCHOOL BACKEND SERVER =====

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

// ===== SERVER CONFIGURATION =====
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cheick_mohamed_school_secret_key_2024';

// Determine environment and database path
const isReplit = process.env.REPL_ID !== undefined;
const DB_PATH = isReplit ? './database/school.db' : './database/school.db';

// ===== MIDDLEWARE =====
app.use(cors());
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating institutions table:', err);
            else console.log('Institutions table created/verified');
            
            // Add folder_name column to institutions table if it doesn't exist
            db.all("PRAGMA table_info(institutions)", (err, rows) => {
                if (err) console.error('Error checking institutions table schema:', err);
                
                const hasColumn = rows && Array.isArray(rows) && rows.some(row => row.name === 'folder_name');
                if (!hasColumn) {
                    db.run('ALTER TABLE institutions ADD COLUMN folder_name TEXT', (err) => {
                        if (err) console.error('Error adding folder_name to institutions table:', err);
                        else console.log('Adding folder_name column to institutions table');
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

        // Initialize default data after all tables are created
        setTimeout(() => {
            insertDefaultData();
        }, 1000);
    });
}

function insertDefaultData() {
    // Insert demo users
    const defaultUsers = [
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
        `INSERT INTO institutions (name, reg_number, type, address, email, website, phone, folder_name) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, regNumber || null, type || null, 
         address ? JSON.stringify(address) : null, 
         email || null, website || null, phone || null, safeFolderName],
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
app.post('/api/attendance/realtime', (req, res) => {
    const { date, time, name, id, dept, role } = req.body;

    if (!date || !time || !name || !id || !dept) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const attendanceRecord = {
        date,
        time,
        student_name: name,
        student_id: id,
        department: dept,
        role: role || 'Student'
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
                                
                                db.run('COMMIT', err => {
                                    if (err) {
                                        console.error('Error committing transaction:', err);
                                        return res.status(500).json({ error: 'Transaction error' });
                                    }
                                    
                                    console.log(`Student ${name} created with ID ${id} and username ${username}`);
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
                                            })) : []
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
        console.log(`📚 Access the website at: http://localhost:${PORT}`);
        console.log(`🔧 Admin Portal: http://localhost:${PORT}/portals/admin`);
        console.log(`👨‍🏫 Teacher Portal: http://localhost:${PORT}/portals/teacher`);
        console.log(`🎓 Student Portal: http://localhost:${PORT}/portals/student`);
        console.log(`👪 Parent Portal: http://localhost:${PORT}/portals/parent`);
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