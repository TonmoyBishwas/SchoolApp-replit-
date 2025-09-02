# 🏫 Cheick Mohamed School Website - Setup Instructions

## 📋 Overview
This is a complete school management system for **Cheick Mohamed School and College** in Guinea. The system includes 4 portals (Admin, Teacher, Student, Parent) with integrated face recognition attendance tracking.

## 🚀 Quick Start Guide

### Step 1: Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for attendance sync)
pip install requests
```

### Step 2: Start the Web Server
```bash
# Start the backend server
npm start

# Or for development with auto-restart
npm run dev
```

The server will start on `http://localhost:3000`

### Step 3: Access the Website
- **Main Website**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/portals/admin
- **Teacher Portal**: http://localhost:3000/portals/teacher  
- **Student Portal**: http://localhost:3000/portals/student
- **Parent Portal**: http://localhost:3000/portals/parent

### Step 4: Face Recognition Integration

#### Option A: Automatic Sync (Recommended)
```bash
# Start the Python sync service
cd backend
python attendance_sync.py
```

This will automatically monitor your `auto_attend_app/Pattendance_log.csv` file and send new attendance records to the website.

#### Option B: Manual API Integration
You can also send attendance data directly to the API:

```bash
# Send attendance via curl
curl -X POST http://localhost:3000/api/attendance/realtime \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-08-14",
    "time": "10:07:56", 
    "name": "Tonmoy Ahmed",
    "id": "444",
    "dept": "CSE",
    "role": "Student"
  }'
```

## 🔐 Demo Login Credentials

### Administrator Portal
- **Username**: `admin123`
- **Password**: `admin123`
- **Role**: Administrator

### Teacher Portal  
- **Username**: `teacher001`
- **Password**: `teacher123`
- **Role**: Teacher

### Student Portal
- **Username**: `student444` 
- **Password**: `student123`
- **Role**: Student

### Parent Portal
- **Username**: `parent001`
- **Password**: `parent123`
- **Role**: Parent

## 📁 Project Structure
```
Furnished_Website/
├── index.html                 # Main landing page
├── package.json              # Node.js dependencies
├── backend/
│   ├── server.js             # Express.js server
│   ├── attendance_sync.py    # Python sync service
│   └── database/             # SQLite database
├── portals/
│   ├── admin.html           # Admin portal
│   ├── teacher.html         # Teacher portal (placeholder)
│   ├── student.html         # Student portal
│   └── parent.html          # Parent portal (placeholder)
├── css/
│   ├── main.css             # Main website styles
│   ├── responsive.css       # Responsive design
│   └── portals/
│       └── portal.css       # Portal-specific styles
├── js/
│   ├── main.js              # Main website JavaScript
│   └── portals/
│       ├── admin.js         # Admin portal functionality
│       └── student.js       # Student portal functionality
└── auto_attend_app/         # Your face recognition system
    └── Pattendance_log.csv  # Attendance data file
```

## 🔧 Configuration

### Face Recognition Integration
1. **CSV File Path**: The system monitors `auto_attend_app/Pattendance_log.csv`
2. **Expected CSV Format**:
   ```csv
   Date,Time,Name,ID,Dept,Role
   2025-08-14,10:07:56,Tonmoy Ahmed,444,CSE,Student
   ```

### Database
- **Type**: SQLite
- **Location**: `backend/database/school.db`
- **Auto-created**: Yes, on first run

### API Endpoints
- `POST /api/attendance/realtime` - Submit real-time attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/stats` - Get attendance statistics
- `POST /api/auth/login` - User authentication

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### 2. Database Errors
```bash
# Delete database to reset
rm backend/database/school.db

# Restart server to recreate
npm start
```

#### 3. Face Recognition Not Working
- Check if `auto_attend_app/Pattendance_log.csv` exists
- Verify CSV format matches expected structure
- Ensure Python sync service is running

#### 4. Cannot Connect to API
- Verify server is running on port 3000
- Check firewall settings
- Ensure no proxy blocking localhost connections

## 📱 Mobile Support
The website is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🔒 Security Features
- JWT token authentication
- Role-based access control
- Password hashing with bcrypt
- SQL injection prevention
- CORS protection

## 🌍 Deployment to Replit

### Step 1: Create Replit Project
1. Go to [Replit.com](https://replit.com)
2. Click "Create Repl"
3. Choose "Node.js" template
4. Name it "cheick-mohamed-school"

### Step 2: Upload Files
1. Upload all files except `auto_attend_app/` and `CLAUDE.md`
2. Make sure `.gitignore` is included

### Step 3: Configure Replit
1. In `replit.nix`, ensure Node.js is installed:
   ```nix
   { pkgs }: {
     deps = [
       pkgs.nodejs-18_x
       pkgs.python3
       pkgs.python3Packages.requests
     ];
   }
   ```

2. Set run command in `.replit`:
   ```
   run = "npm start"
   ```

### Step 4: Install Dependencies
```bash
npm install
pip install requests
```

### Step 5: Start the Application
Click the "Run" button in Replit

### Step 6: Set Up Face Recognition Sync
1. Upload your `Pattendance_log.csv` to the Replit project
2. Modify the Python script path if needed
3. Run the sync service in a separate shell:
   ```bash
   python backend/attendance_sync.py
   ```

## 🆘 Support
If you need help with setup or encounter any issues:
1. Check the browser console for JavaScript errors
2. Check the server logs for backend errors  
3. Verify all file paths are correct
4. Ensure your CSV file format matches exactly

## 🎯 Next Steps
1. Customize school information and branding
2. Add real student and teacher data
3. Configure email notifications
4. Set up automated backups
5. Add more portal features as needed

---

**🏫 Cheick Mohamed School and College - Excellence in Education**  
*Built with ❤️ for educational excellence in Guinea*