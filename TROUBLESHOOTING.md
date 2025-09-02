# 🛠️ Troubleshooting Guide - Cheick Mohamed School Website

## 🚨 Common Issues & Solutions

### Issue 1: "Your file couldn't be accessed" for Teacher/Parent Portals
**✅ FIXED** - All portal files now exist:
- `portals/admin.html` ✅
- `portals/teacher.html` ✅  
- `portals/student.html` ✅
- `portals/parent.html` ✅

### Issue 2: Cannot see attendance data
**📍 Location**: Attendance shows in 3 places:
1. **Admin Portal** → Dashboard (Live Feed) + Attendance Section
2. **Teacher Portal** → Attendance Section  
3. **Student Portal** → My Attendance Section + Calendar

### Issue 3: Face recognition not syncing
**🔧 Solution**: Run all 3 processes simultaneously

## 📋 Complete Setup Checklist

### Step 1: Install Dependencies
```bash
# In main project folder
cd H:\CC\Furnished_Website
npm install

# Install Python packages
pip install requests
```

### Step 2: Start Web Server (CMD/PowerShell)
```bash
cd H:\CC\Furnished_Website
npm start
```
**Expected Output:**
```
🏫 Cheick Mohamed School Server running on port 3000
📚 Access the website at: http://localhost:3000
🔧 Admin Portal: http://localhost:3000/portals/admin
```

### Step 3: Start Face Recognition App (VS Code Terminal 1)
```bash
cd H:\CC\Furnished_Website\auto_attend_app
python main.py
```

### Step 4: Start Attendance Sync (VS Code Terminal 2)
```bash
cd H:\CC\Furnished_Website\backend
python attendance_sync.py
```
**Expected Output:**
```
🏫 Cheick Mohamed School - Attendance Sync Service
============================================================
✅ API server is accessible
Monitoring CSV file: ../auto_attend_app/Pattendance_log.csv
Starting attendance sync service...
```

## 🔍 How to Test Attendance Flow

### Test 1: Check if CSV is Being Created
1. Run your face recognition app
2. Let it detect a face
3. Check if `auto_attend_app/Pattendance_log.csv` has new entries

### Test 2: Check if Sync is Working
1. Look at the attendance sync terminal
2. Should show: "Found X new attendance records"
3. Should show: "Successfully sent attendance for [Name]"

### Test 3: Check if Data Appears in Website
1. Go to Admin Portal: http://localhost:3000/portals/admin
2. Login with: admin123 / admin123
3. Check "Live Attendance Feed" on dashboard
4. Click "Attendance" in sidebar for full table

## 🐛 Common Error Messages & Fixes

### Error: "EADDRINUSE: address already in use :::3000"
**Solution:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000
# Kill the process (replace PID with actual number)
taskkill /PID [PID_NUMBER] /F
```

### Error: "Cannot connect to API server"
**Solution:**
1. Make sure web server is running first (npm start)
2. Then start the attendance sync
3. Check firewall isn't blocking localhost:3000

### Error: "CSV file not found"
**Solution:**
1. Make sure your face recognition app is running
2. Check the path in attendance_sync.py matches your CSV location
3. Current path: `../auto_attend_app/Pattendance_log.csv`

### Error: "Module not found: requests"
**Solution:**
```bash
pip install requests
```

### Error: Face recognition not detecting
**Solution:**
1. Check camera permissions
2. Make sure only one app is using the camera
3. Restart the face recognition app

## 📊 Attendance Data Flow

```
Face Recognition App
        ↓
Saves to CSV: Pattendance_log.csv
        ↓
Attendance Sync (Python) monitors CSV
        ↓
Sends new records to API: localhost:3000/api/attendance/realtime
        ↓
Database stores the data
        ↓
Website displays in:
- Admin Portal (Live Feed + Table)
- Teacher Portal (Class Attendance)  
- Student Portal (Personal Calendar)
```

## 🎯 Testing Checklist

- [ ] Web server starts without errors
- [ ] Can access main website at localhost:3000
- [ ] Can login to all 4 portals
- [ ] Face recognition app detects faces
- [ ] CSV file gets updated with new entries
- [ ] Attendance sync shows "new records found"
- [ ] API receives the data (check sync logs)
- [ ] Admin portal shows live attendance feed
- [ ] Student portal shows attendance calendar

## 🆘 Still Having Issues?

### Debug Mode - Enable Detailed Logs

1. **Check Web Server Logs:**
   - Look at the terminal where npm start is running
   - Should show API requests when sync sends data

2. **Check Attendance Sync Logs:**
   - Look at attendance_sync.py terminal
   - Should show detailed file monitoring info

3. **Check Face Recognition Logs:**
   - Look at main.py terminal output
   - Should show face detection messages

### Network Issues
```bash
# Test if API is accessible
curl http://localhost:3000/api/attendance
# Should return: {"error": "Access token required"}
```

### File Permission Issues
```bash
# Make sure Python can read the CSV
python -c "import csv; print(list(csv.reader(open('../auto_attend_app/Pattendance_log.csv'))))"
```

## 📞 Quick Test Commands

```bash
# Test web server
curl http://localhost:3000

# Test API endpoint  
curl -X POST http://localhost:3000/api/attendance/realtime \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-08-14","time":"10:07:56","name":"Test User","id":"999","dept":"Test","role":"Student"}'

# Check if CSV exists
dir "auto_attend_app\Pattendance_log.csv"
```

## 💡 Pro Tips

1. **Always start web server first** before attendance sync
2. **Keep all 3 terminals open** while testing
3. **Check Windows Firewall** if localhost doesn't work
4. **Use VS Code integrated terminal** for better monitoring
5. **Test with manual CSV entry** if face recognition isn't working

---

**Need more help?** Check the specific error messages in your terminal and match them with the solutions above.