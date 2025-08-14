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
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

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
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating users table:', err);
            else console.log('Users table created/verified');
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating students table:', err);
            else console.log('Students table created/verified');
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating teachers table:', err);
            else console.log('Teachers table created/verified');
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating attendance table:', err);
            else console.log('Attendance table created/verified');
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating classes table:', err);
            else console.log('Classes table created/verified');
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
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
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

// ===== AUTHENTICATION ROUTES =====
app.post('/api/auth/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    db.get(
        'SELECT * FROM users WHERE username = ? AND role = ?',
        [username, role],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user || !bcrypt.compareSync(password, user.password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role, name: user.name },
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
                    name: user.name
                }
            });
        }
    );
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
app.post('/api/attendance/upload', authenticateToken, upload.single('csvFile'), (req, res) => {
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

// ===== STUDENT ROUTES =====
app.get('/api/students', authenticateToken, (req, res) => {
    const { department, status = 'active' } = req.query;
    
    let query = 'SELECT * FROM students WHERE status = ?';
    let params = [status];

    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }

    query += ' ORDER BY name';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
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

// ===== STATIC FILE SERVING =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/portals/:portal', (req, res) => {
    const portalFile = path.join(__dirname, '..', 'portals', `${req.params.portal}.html`);
    if (fs.existsSync(portalFile)) {
        res.sendFile(portalFile);
    } else {
        res.status(404).send('Portal not found');
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
    console.log(`🌐 Replit URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
}

module.exports = app;