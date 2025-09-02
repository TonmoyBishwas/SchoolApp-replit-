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
    
    // Get current institution ID from the logged-in user
    getCurrentInstitutionId() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.institution_id || null;
    }

    // Fetch attendance data from API
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
            
            console.log('⚠️ No data from API endpoints');
            return [];
            
        } catch (error) {
            console.error('❌ API fetch error:', error);
            console.log('⚠️ Unable to fetch attendance data');
            return [];
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
        
        // Return empty stats if API fails
        return {
            todayAttendance: 0,
            weekAttendance: 0,
            monthAttendance: 0,
            totalStudents: 0,
            todayAttendanceRate: '0.0'
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

    // Empty placeholder for when API is not available
    getDemoData() {
        console.log('⚠️ Demo data has been disabled');
        return [];
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
            // First check if API is available before attempting to fetch updates
            const isAPIAvailable = await isRealAttendanceAvailable();
            
            if (!isAPIAvailable) {
                // Skip update if API isn't available
                return;
            }
            
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
        // Skip processing if records don't have proper data
        if (!newRecords || !newRecords.length || !newRecords[0].student_name && !newRecords[0].name) {
            return;
        }
        
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

        // Only show notifications for records with valid data - disable notifications for now
        // Commenting out notifications to prevent false alerts
        /*
        newRecords.forEach(record => {
            if (typeof showNotification === 'function' && 
                (record.student_name || record.name) && 
                (record.student_id || record.id)) {
                
                showNotification(
                    `New attendance: ${record.student_name || record.name} marked present`,
                    'info'
                );
            }
        });
        */
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

// Get student photos
async function fetchStudentPhotos(studentId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No authentication token found');
            return [];
        }

        const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/photos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                return result.data;
            }
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching student photos:', error);
        return [];
    }
}

// Check if real attendance data is available
async function isRealAttendanceAvailable() {
    const isConnected = await testAPIConnection();
    console.log(isConnected ? 
        '✅ API server connected - using real attendance data' : 
        '⚠️ API server not available'
    );
    return isConnected;
}

// Export student photo functions to window object
window.fetchStudentPhotos = fetchStudentPhotos;