// ===== API CLIENT FOR REAL-TIME ATTENDANCE DATA =====

class AttendanceAPIClient {
    constructor() {
        // Auto-detect environment and set API URL
        this.baseURL = this.getAPIBaseURL();
        this.lastFetchTime = new Date().toISOString();
        console.log(`🌐 API Base URL: ${this.baseURL}`);
    }
    
    getAPIBaseURL() {
        // Check if we're on Replit (handles both .repl.co and .replit.dev domains)
        if (window.location.hostname.includes('.repl.co') || 
            window.location.hostname.includes('.replit.dev')) {
            const apiURL = `${window.location.protocol}//${window.location.host}/api`;
            console.log(`🌐 Detected Replit environment: ${apiURL}`);
            return apiURL;
        }
        // Local development
        console.log('🖥️ Using localhost environment');
        return 'http://localhost:3000/api';
    }

    // Get authentication token from localStorage
    getAuthToken() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.token || null;
    }

    // Fetch real attendance data from API
    async fetchAttendanceData(limit = 50) {
        try {
            console.log(`🔍 Attempting to fetch attendance data from: ${this.baseURL}`);
            
            // Try public endpoint first (more reliable)
            console.log('📡 Trying public endpoint...');
            const publicResponse = await fetch(`${this.baseURL}/attendance/public?limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (publicResponse.ok) {
                const result = await publicResponse.json();
                console.log(`✅ Fetched ${result.data.length} records from public API`);
                if (result.success && result.data && result.data.length > 0) {
                    return result.data;
                }
            } else {
                console.log(`⚠️ Public API returned status: ${publicResponse.status}`);
            }
            
            // Try authenticated endpoint as fallback
            console.log('🔐 Trying authenticated endpoint...');
            const authResponse = await fetch(`${this.baseURL}/attendance?limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (authResponse.ok) {
                const result = await authResponse.json();
                console.log(`✅ Fetched ${result.data.length} records from authenticated API`);
                if (result.success && result.data && result.data.length > 0) {
                    return result.data;
                }
            } else {
                console.log(`⚠️ Auth API returned status: ${authResponse.status}`);
            }
            
            console.log('⚠️ No data from API endpoints, using demo data');
            return this.getDemoData();
            
        } catch (error) {
            console.error('❌ API fetch error:', error);
            console.log('🔄 Falling back to demo data');
            return this.getDemoData();
        }
    }

    // Get new attendance records since last fetch
    async fetchNewAttendanceData() {
        try {
            const response = await fetch(`${this.baseURL}/attendance?since=${this.lastFetchTime}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.lastFetchTime = new Date().toISOString();
                return result.data || [];
            }
        } catch (error) {
            console.log('Error fetching new attendance data:', error);
        }
        return [];
    }

    // Fetch attendance statistics
    async fetchAttendanceStats() {
        try {
            const response = await fetch(`${this.baseURL}/attendance/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                return result.data;
            }
        } catch (error) {
            console.log('Error fetching attendance stats:', error);
        }
        
        // Return demo stats if API fails
        return {
            todayAttendance: 485,
            weekAttendance: 2315,
            monthAttendance: 9876,
            totalStudents: 523,
            todayAttendanceRate: '92.7'
        };
    }

    // Submit manual attendance (for teachers)
    async submitAttendance(attendanceRecords) {
        try {
            const response = await fetch(`${this.baseURL}/attendance/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ records: attendanceRecords })
            });

            return response.ok;
        } catch (error) {
            console.log('Error submitting attendance:', error);
            return false;
        }
    }

    // Demo data for when API is not available
    getDemoData() {
        return [
            {
                date: '2025-08-14',
                time: '10:07:56',
                student_name: 'Tonmoy Ahmed',
                student_id: '444',
                department: 'CSE',
                status: 'present',
                face_recognition: true
            },
            {
                date: '2025-08-14',
                time: '10:08:56',
                student_name: 'Sarah Johnson',
                student_id: '445',
                department: 'BBA',
                status: 'present',
                face_recognition: true
            },
            {
                date: '2025-08-14',
                time: '10:09:56',
                student_name: 'Ahmed Hassan',
                student_id: '446',
                department: 'EEE',
                status: 'present',
                face_recognition: true
            }
        ];
    }

    // Format attendance data for display
    formatAttendanceData(rawData) {
        return rawData.map(record => ({
            date: record.date,
            time: record.time,
            name: record.student_name || record.name,
            id: record.student_id || record.id,
            dept: record.department || record.dept,
            status: record.status || 'present',
            method: record.face_recognition ? 'Face Recognition' : 'Manual Entry'
        }));
    }
}

// Global API client instance
window.attendanceAPI = new AttendanceAPIClient();

// ===== REAL-TIME ATTENDANCE UPDATER =====
class RealTimeAttendanceUpdater {
    constructor() {
        this.updateInterval = 5000; // 5 seconds
        this.isRunning = false;
        this.intervalId = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.checkForUpdates();
        }, this.updateInterval);
        
        console.log('Real-time attendance updater started');
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('Real-time attendance updater stopped');
    }

    async checkForUpdates() {
        try {
            const newRecords = await window.attendanceAPI.fetchNewAttendanceData();
            if (newRecords && newRecords.length > 0) {
                // Notify all portals about new attendance data
                this.notifyPortals(newRecords);
            }
        } catch (error) {
            console.log('Error checking for attendance updates:', error);
        }
    }

    notifyPortals(newRecords) {
        // Update live attendance feed in admin portal
        if (typeof updateLiveAttendanceFeed === 'function') {
            updateLiveAttendanceFeed(newRecords);
        }

        // Update attendance tables in various portals
        if (typeof updateAttendanceTable === 'function') {
            updateAttendanceTable();
        }

        // Update dashboard stats
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats();
        }

        // Show notification for new attendance
        newRecords.forEach(record => {
            if (typeof showNotification === 'function') {
                showNotification(
                    `New attendance: ${record.student_name || record.name} marked present`,
                    'info'
                );
            }
        });
    }
}

// Global real-time updater instance
window.attendanceUpdater = new RealTimeAttendanceUpdater();

// ===== AUTO-START FOR ADMIN PORTAL =====
document.addEventListener('DOMContentLoaded', function() {
    // Auto-start real-time updates for admin portal
    if (window.location.pathname.includes('admin.html')) {
        setTimeout(() => {
            window.attendanceUpdater.start();
        }, 2000); // Start after 2 seconds
    }
});

// ===== UTILITY FUNCTIONS =====

// Test API connectivity
async function testAPIConnection() {
    try {
        const response = await fetch('http://localhost:3000/api/attendance');
        return response.status === 401; // 401 means server is running but needs auth
    } catch (error) {
        return false;
    }
}

// Check if real attendance data is available
async function isRealAttendanceAvailable() {
    const isConnected = await testAPIConnection();
    console.log(isConnected ? 
        '✅ API server connected - using real attendance data' : 
        '⚠️ API server not available - using demo data'
    );
    return isConnected;
}