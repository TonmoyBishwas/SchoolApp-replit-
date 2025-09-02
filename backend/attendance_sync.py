#!/usr/bin/env python3
"""
Attendance Synchronization Script for Cheick Mohamed School
This script monitors the face recognition CSV file and sends new attendance data to the web API
"""

import os
import time
import csv
import requests
import json
from datetime import datetime
import logging

# Configuration
import os
import sys

# Detect environment
IS_REPLIT = os.getenv('REPL_ID') is not None

# Get the script directory and go up one level to find auto_attend_app
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Set paths based on environment
if IS_REPLIT:
    CSV_FILE_PATH = os.path.join(PROJECT_ROOT, 'demo_data', 'Pattendance_log.csv')
    API_BASE_URL = f'https://{os.getenv("REPL_SLUG")}.{os.getenv("REPL_OWNER")}.repl.co/api'
else:
    CSV_FILE_PATH = os.path.join(PROJECT_ROOT, 'auto_attend_app', 'Pattendance_log.csv')
    # Try Replit first, fallback to localhost
    REPLIT_URL = 'https://44021d36-a389-44cb-a902-5606fc6a0bd2-00-38nnftr3rse0.janeway.replit.dev/api'
    LOCALHOST_URL = 'http://localhost:3000/api'
    API_BASE_URL = REPLIT_URL  # Will test both in connection function

ATTENDANCE_ENDPOINT = f'{API_BASE_URL}/attendance/realtime'
CHECK_INTERVAL = 5  # seconds
PROCESSED_RECORDS_FILE = os.path.join(SCRIPT_DIR, 'processed_records.json')

# Setup logging with UTF-8 encoding
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('attendance_sync.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class AttendanceSync:
    def __init__(self):
        self.processed_records = self.load_processed_records()
        self.last_csv_mtime = 0
        logger.info("Attendance sync service initialized")

    def load_processed_records(self):
        """Load previously processed records to avoid duplicates"""
        try:
            if os.path.exists(PROCESSED_RECORDS_FILE):
                with open(PROCESSED_RECORDS_FILE, 'r') as f:
                    return set(json.load(f))
            return set()
        except Exception as e:
            logger.error(f"Error loading processed records: {e}")
            return set()

    def save_processed_records(self):
        """Save processed records to file"""
        try:
            with open(PROCESSED_RECORDS_FILE, 'w') as f:
                json.dump(list(self.processed_records), f)
        except Exception as e:
            logger.error(f"Error saving processed records: {e}")

    def read_csv_file(self):
        """Read the attendance CSV file and return new records"""
        try:
            if not os.path.exists(CSV_FILE_PATH):
                logger.warning(f"CSV file not found: {CSV_FILE_PATH}")
                return []

            # Check if file has been modified
            current_mtime = os.path.getmtime(CSV_FILE_PATH)
            if current_mtime <= self.last_csv_mtime:
                return []  # No changes

            self.last_csv_mtime = current_mtime
            
            new_records = []
            with open(CSV_FILE_PATH, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                
                for row in reader:
                    # Create unique identifier for each record
                    record_id = f"{row['Date']}_{row['Time']}_{row['ID']}"
                    
                    if record_id not in self.processed_records:
                        new_records.append({
                            'id': record_id,
                            'date': row['Date'],
                            'time': row['Time'],
                            'name': row['Name'],
                            'student_id': row['ID'],
                            'department': row['Dept'],
                            'role': row.get('Role', 'Student')
                        })
                        self.processed_records.add(record_id)

            if new_records:
                logger.info(f"Found {len(new_records)} new attendance records")
                
            return new_records

        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            return []

    def send_to_api(self, record):
        """Send attendance record to the web API"""
        try:
            payload = {
                'date': record['date'],
                'time': record['time'],
                'name': record['name'],
                'id': record['student_id'],
                'dept': record['department'],
                'role': record['role']
            }
            
            response = requests.post(
                ATTENDANCE_ENDPOINT,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully sent attendance for {record['name']} (ID: {record['student_id']})")
                return True
            else:
                logger.error(f"API error {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.error("Could not connect to the web server. Make sure the server is running.")
            return False
        except requests.exceptions.Timeout:
            logger.error("Request timeout when sending to API")
            return False
        except Exception as e:
            logger.error(f"Error sending to API: {e}")
            return False

    def sync_attendance(self):
        """Main sync function"""
        try:
            new_records = self.read_csv_file()
            
            successful_syncs = 0
            for record in new_records:
                if self.send_to_api(record):
                    successful_syncs += 1
                else:
                    # Remove from processed records if API call failed
                    self.processed_records.discard(record['id'])
            
            if new_records:
                logger.info(f"Sync completed: {successful_syncs}/{len(new_records)} records sent successfully")
                self.save_processed_records()
                
        except Exception as e:
            logger.error(f"Error during sync: {e}")

    def run(self):
        """Main run loop"""
        logger.info("Starting attendance sync service...")
        logger.info(f"Monitoring CSV file: {CSV_FILE_PATH}")
        logger.info(f"API endpoint: {ATTENDANCE_ENDPOINT}")
        logger.info(f"Check interval: {CHECK_INTERVAL} seconds")
        
        try:
            while True:
                self.sync_attendance()
                time.sleep(CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("Sync service stopped by user")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            self.save_processed_records()
            logger.info("Attendance sync service stopped")

def test_api_connection():
    """Test if the API server is accessible"""
    global API_BASE_URL, ATTENDANCE_ENDPOINT
    
    # If not on Replit, try both Replit and localhost
    if not IS_REPLIT:
        urls_to_try = [
            ('Replit', REPLIT_URL),
            ('Localhost', LOCALHOST_URL)
        ]
        
        for name, url in urls_to_try:
            try:
                logger.info(f"🔍 Testing {name} connection: {url.replace('/api', '')}")
                # Test with public endpoint for connection
                response = requests.get(f'{url}/attendance/public', timeout=10)
                if response.status_code == 200:
                    logger.info(f"✅ {name} API server is accessible")
                    API_BASE_URL = url
                    ATTENDANCE_ENDPOINT = f'{API_BASE_URL}/attendance/realtime'
                    return True
                else:
                    logger.warning(f"⚠️ {name} returned status code: {response.status_code}")
            except requests.exceptions.ConnectionError:
                logger.warning(f"⚠️ Cannot connect to {name}: {url.replace('/api', '')}")
            except Exception as e:
                logger.warning(f"⚠️ Error testing {name} connection: {e}")
        
        logger.error("❌ Cannot connect to any API server (Replit or Localhost)")
        return False
    else:
        # On Replit, just test the current API
        try:
            response = requests.get(f'{API_BASE_URL}/attendance/public', timeout=5)
            if response.status_code == 200:
                logger.info("✅ API server is accessible")
                return True
            else:
                logger.error(f"❌ API server returned status code: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Error testing API connection: {e}")
            return False

def main():
    """Main function"""
    print("🏫 Cheick Mohamed School - Attendance Sync Service")
    print("=" * 60)
    
    # In Replit environment, create demo data automatically
    if IS_REPLIT:
        create_demo_data()
    
    # Test API connection first
    if not test_api_connection():
        print("\n⚠️  Please make sure the web server is running before starting the sync service.")
        if IS_REPLIT:
            print("   In Replit: The web server should start automatically")
        else:
            print("   Run: npm start or node backend/server.js")
        return
    
    # Check if CSV file exists
    if not os.path.exists(CSV_FILE_PATH):
        logger.warning(f"⚠️  CSV file not found: {CSV_FILE_PATH}")
        if IS_REPLIT:
            create_demo_data()
        else:
            logger.info("The sync service will wait for the file to be created...")
    
    # Start sync service
    sync_service = AttendanceSync()
    sync_service.run()

def create_demo_data():
    """Create demo attendance data for Replit"""
    try:
        import os
        from datetime import datetime, timedelta
        
        # Ensure demo_data directory exists
        demo_dir = os.path.dirname(CSV_FILE_PATH)
        os.makedirs(demo_dir, exist_ok=True)
        
        # Create demo CSV with recent data
        current_time = datetime.now()
        demo_records = []
        
        students = [
            ("Tonmoy Ahmed", "444", "CSE"),
            ("Ayon Rahman", "1234", "CSE"), 
            ("Sarah Johnson", "445", "BBA"),
            ("Ahmed Hassan", "446", "EEE"),
            ("Fatima Al-Zahra", "447", "Math")
        ]
        
        # Generate attendance records for the last few minutes
        for i in range(10):
            time_offset = current_time - timedelta(minutes=i*2)
            for name, student_id, dept in students[:3]:  # Only first 3 students
                record_time = time_offset - timedelta(seconds=i*10)
                demo_records.append(
                    f"{record_time.strftime('%Y-%m-%d')},{record_time.strftime('%H:%M:%S')},{name},{student_id},{dept},Student"
                )
        
        # Write demo data
        with open(CSV_FILE_PATH, 'w', encoding='utf-8') as f:
            f.write("Date,Time,Name,ID,Dept,Role\n")
            f.write("\n".join(demo_records))
        
        print(f"✅ Created demo attendance data: {CSV_FILE_PATH}")
        
    except Exception as e:
        print(f"❌ Error creating demo data: {e}")

if __name__ == '__main__':
    main()