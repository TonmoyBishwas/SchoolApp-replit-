# 🏫 Complete Setup Guide - Cheick Mohamed School Website

## 📊 **Where to See Attendance Data**

### Admin Portal (Main View)
- **Dashboard**: Live attendance feed showing real-time entries
- **Attendance Section**: Complete attendance table with all records
- **Stats Overview**: Today's, weekly, and monthly attendance statistics

### Teacher Portal  
- **Attendance Section**: Class-specific attendance management
- **Dashboard**: Class attendance summary and today's stats

### Student Portal
- **My Attendance**: Personal attendance calendar view
- **Dashboard**: Personal attendance percentage and recent records

## 🔧 **Complete 3-Process Setup**

You need to run **3 separate processes simultaneously**:

### Process 1: Web Server (Main Terminal/CMD)
```bash
# Open Command Prompt or PowerShell
cd H:\CC\Furnished_Website
npm install
npm start
```
**Expected Output:**
```
🏫 Cheick Mohamed School Server running on port 3000
📚 Access the website at: http://localhost:3000
🔧 Admin Portal: http://localhost:3000/portals/admin
```

### Process 2: Face Recognition App (VS Code Terminal 1)
```bash
# Open VS Code
# Open Terminal 1
cd auto_attend_app
python main.py
```
**Expected Output:**
```
Face Recognition Attendance System
Camera opened successfully
Waiting for face detection...
```

### Process 3: Attendance Sync Service (VS Code Terminal 2)
```bash
# In VS Code
# Open Terminal 2 (click + next to existing terminal)
cd backend
python attendance_sync.py
```
**Expected Output:**
```
🏫 Cheick Mohamed School - Attendance Sync Service
============================================================
✅ API server is accessible
Monitoring CSV file: H:\CC\Furnished_Website\auto_attend_app\Pattendance_log.csv
Starting attendance sync service...
```

## 📋 **Step-by-Step Testing Process**

### Step 1: Start Web Server First
```bash
cd H:\CC\Furnished_Website
npm start
```
- ✅ Should show "Server running on port 3000"
- ✅ Visit http://localhost:3000 - should load main page
- ✅ Try logging into Admin portal: admin123 / admin123

### Step 2: Start Face Recognition App
```bash
cd auto_attend_app
python main.py
```
- ✅ Should open camera window
- ✅ Should detect your face (if you're registered)
- ✅ Check if `Pattendance_log.csv` file gets updated

### Step 3: Start Attendance Sync
```bash
cd backend
python attendance_sync.py
```
- ✅ Should show "API server is accessible"
- ✅ Should monitor the CSV file
- ✅ When new attendance is detected, should show "Successfully sent attendance"

### Step 4: Test the Full Flow
1. **Let face recognition detect someone**
2. **Check sync terminal** - should show new records found
3. **Go to Admin Portal** - should see new attendance in live feed
4. **Check Attendance section** - should see new record in table

## 🐛 **Troubleshooting Common Issues**

### Issue: Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Alternative: use different port
set PORT=3001 && npm start
```

### Issue: "Cannot connect to API server"
**Solution:**
1. Make sure web server (npm start) is running first
2. Wait for "Server running on port 3000" message
3. Then start attendance sync

### Issue: "CSV file not found"
**Causes:**
- Face recognition app not running
- CSV file path incorrect
- Permissions issue

**Solution:**
1. Start face recognition app first
2. Let it detect at least one face to create CSV
3. Check if file exists: `auto_attend_app/Pattendance_log.csv`

### Issue: Face recognition not working
**Solutions:**
- Check camera permissions
- Close other apps using camera (Skype, Teams, etc.)
- Restart face recognition app
- Check if camera is working in other apps

### Issue: Attendance not showing in website
**Debug steps:**
1. Check if CSV file has new entries
2. Check sync terminal for "new records found"
3. Check browser console (F12) for errors
4. Try refreshing the Admin portal page

## 📊 **Testing the Data Flow**

### Manual Test
1. **Create test CSV entry:**
   ```csv
   Date,Time,Name,ID,Dept,Role
   2025-08-14,10:30:00,Test User,999,Test,Student
   ```

2. **Check sync logs** - should show "Successfully sent attendance"

3. **Check Admin portal** - should show new entry

### API Test
```bash
# Test if API is working
curl http://localhost:3000/api/attendance
# Should return: {"error":"Access token required"}

# Test sending attendance manually
curl -X POST http://localhost:3000/api/attendance/realtime \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"2025-08-14\",\"time\":\"10:30:00\",\"name\":\"Test User\",\"id\":\"999\",\"dept\":\"Test\",\"role\":\"Student\"}"
```

## 🎯 **Expected Behavior**

### When Everything Works:
1. **Face Recognition** detects face → writes to CSV
2. **Attendance Sync** reads CSV → sends to API  
3. **Website** receives data → shows in portals
4. **Admin sees**: Live feed updates, table updates, stats update
5. **Teachers see**: Class attendance data
6. **Students see**: Personal attendance calendar

### Demo vs Real Data:
- **Without server**: Shows demo/placeholder data
- **With server but no sync**: Shows empty tables
- **With server + sync**: Shows real attendance from your face recognition

## 🔍 **Visual Indicators**

### Web Server Running:
```
🏫 Cheick Mohamed School Server running on port 3000
📚 Access the website at: http://localhost:3000
```

### Attendance Sync Working:
```
Found 1 new attendance records
Successfully sent attendance for Tonmoy Ahmed (ID: 444)
```

### Face Recognition Working:
```
Face predicted: Tonmoy Ahmed (444), Timestamp=2025-08-14 10:07:56
Captured image for Tonmoy Ahmed (444) at known_faces/...
```

## 🆘 **Still Not Working?**

### Check All 3 Processes:
1. **Web Server**: http://localhost:3000 should load
2. **Face Recognition**: Camera window should be open
3. **Attendance Sync**: Should show file monitoring messages

### Check File Paths:
- CSV file: `H:\CC\Furnished_Website\auto_attend_app\Pattendance_log.csv`
- Make sure all paths match your actual folder structure

### Check Windows Firewall:
- Allow Node.js through firewall
- Allow Python through firewall
- Allow localhost connections

---

## 🎉 **Success Checklist**

- [ ] Web server starts without errors (npm start)
- [ ] Main website loads (http://localhost:3000)
- [ ] Can login to Admin portal (admin123/admin123)
- [ ] Face recognition app opens camera
- [ ] CSV file gets created/updated when face detected
- [ ] Attendance sync shows "API server accessible"
- [ ] Sync shows "new records found" when CSV updates
- [ ] Admin portal shows real attendance data in live feed
- [ ] Admin portal attendance section shows data table
- [ ] Student portal shows personal attendance calendar

**Once all items are checked ✅, your system is fully working!**