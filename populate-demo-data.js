// Populate demo attendance data directly in the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = './database/school.db';

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 Created database directory');
}

// Connect to database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err);
        return;
    }
    console.log('✅ Connected to SQLite database');
    populateDemoData();
});

function populateDemoData() {
    console.log('📊 Populating demo attendance data...');
    
    const now = new Date();
    const demoRecords = [];
    
    const students = [
        { name: 'Tonmoy Ahmed', id: '444', dept: 'CSE' },
        { name: 'Ayon Rahman', id: '1234', dept: 'CSE' },
        { name: 'Sarah Johnson', id: '445', dept: 'BBA' },
        { name: 'Ahmed Hassan', id: '446', dept: 'EEE' },
        { name: 'Fatima Al-Zahra', id: '447', dept: 'Math' }
    ];
    
    // Generate 20 recent attendance records
    for (let i = 0; i < 20; i++) {
        const student = students[i % students.length];
        const recordTime = new Date(now.getTime() - (i * 2 * 60 * 1000)); // Every 2 minutes
        
        demoRecords.push({
            date: recordTime.toISOString().split('T')[0],
            time: recordTime.toTimeString().split(' ')[0],
            student_name: student.name,
            student_id: student.id,
            department: student.dept
        });
    }
    
    // Insert records
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO attendance 
        (date, time, student_id, student_name, department, face_recognition) 
        VALUES (?, ?, ?, ?, ?, 1)
    `);
    
    let inserted = 0;
    demoRecords.forEach(record => {
        stmt.run([
            record.date,
            record.time,
            record.student_id,
            record.student_name,
            record.department
        ], function(err) {
            if (err) {
                console.error('❌ Error inserting record:', err);
            } else {
                inserted++;
                if (inserted === demoRecords.length) {
                    console.log(`✅ Successfully inserted ${inserted} demo attendance records`);
                    stmt.finalize();
                    db.close();
                }
            }
        });
    });
}