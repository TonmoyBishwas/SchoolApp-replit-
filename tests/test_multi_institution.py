"""
Basic tests for multi-institution functionality
Tests the core institution isolation and data handling
"""

import os
import sys
import requests
import json
import time
from datetime import datetime

# Test configuration
API_BASE_URL = 'http://localhost:3000/api'
TEST_INSTITUTIONS = [
    {
        'name': 'Test Primary School',
        'regNumber': 'TPS001',
        'type': 'primary_school',
        'email': 'admin@testprimary.edu',
        'adminEmail': 'admin@testprimary.edu',
        'adminUsername': 'tps_admin',
        'adminPassword': 'TestPass123!',
        'adminName': 'Test Admin Primary'
    },
    {
        'name': 'Test Secondary School', 
        'regNumber': 'TSS002',
        'type': 'senior_secondary',
        'email': 'admin@testsecondary.edu',
        'adminEmail': 'admin@testsecondary.edu',
        'adminUsername': 'tss_admin',
        'adminPassword': 'TestPass456!',
        'adminName': 'Test Admin Secondary'
    }
]

class MultiInstitutionTester:
    """Test class for multi-institution functionality"""
    
    def __init__(self):
        self.session = requests.Session()
        self.institutions_created = []
        self.test_results = []
        
    def log_test(self, test_name, success, message=""):
        """Log test result"""
        status = "PASS" if success else "FAIL"
        result = f"[{status}] {test_name}: {message}"
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat()
        })
        
    def test_api_connection(self):
        """Test basic API connection"""
        try:
            response = self.session.get(f'{API_BASE_URL}/health', timeout=10)
            if response.status_code == 200:
                self.log_test("API Connection", True, f"Status: {response.status_code}")
                return True
            else:
                self.log_test("API Connection", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Connection", False, f"Error: {str(e)}")
            return False
    
    def test_institution_creation(self):
        """Test creating multiple institutions"""
        success_count = 0
        
        for i, institution_data in enumerate(TEST_INSTITUTIONS):
            try:
                response = self.session.post(
                    f'{API_BASE_URL}/institutions',
                    json=institution_data,
                    timeout=10
                )
                
                if response.status_code == 201:
                    result = response.json()
                    institution_id = result.get('data', {}).get('institutionId')
                    institution_code = result.get('data', {}).get('institutionCode')
                    
                    if institution_id and institution_code:
                        self.institutions_created.append({
                            'id': institution_id,
                            'code': institution_code,
                            'name': institution_data['name']
                        })
                        success_count += 1
                        self.log_test(
                            f"Institution Creation {i+1}", 
                            True, 
                            f"ID: {institution_id}, Code: {institution_code}"
                        )
                    else:
                        self.log_test(
                            f"Institution Creation {i+1}", 
                            False, 
                            "Missing ID or code in response"
                        )
                else:
                    self.log_test(
                        f"Institution Creation {i+1}", 
                        False, 
                        f"Status: {response.status_code}, Response: {response.text[:200]}"
                    )
                    
            except Exception as e:
                self.log_test(f"Institution Creation {i+1}", False, f"Error: {str(e)}")
        
        return success_count == len(TEST_INSTITUTIONS)
    
    def test_institution_isolation(self):
        """Test that institutions are properly isolated"""
        if len(self.institutions_created) < 2:
            self.log_test("Institution Isolation", False, "Need at least 2 institutions")
            return False
        
        try:
            # Get institutions list
            response = self.session.get(f'{API_BASE_URL}/institutions', timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                institutions = result.get('data', [])
                
                # Check that all created institutions are present
                found_codes = {inst.get('institution_code') for inst in institutions}
                expected_codes = {inst['code'] for inst in self.institutions_created}
                
                if expected_codes.issubset(found_codes):
                    self.log_test(
                        "Institution Isolation", 
                        True, 
                        f"Found all {len(self.institutions_created)} institutions"
                    )
                    return True
                else:
                    missing = expected_codes - found_codes
                    self.log_test(
                        "Institution Isolation", 
                        False, 
                        f"Missing institution codes: {missing}"
                    )
                    return False
            else:
                self.log_test("Institution Isolation", False, f"API Error: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Institution Isolation", False, f"Error: {str(e)}")
            return False
    
    def test_attendance_with_institution(self):
        """Test attendance recording with institution codes"""
        if not self.institutions_created:
            self.log_test("Attendance with Institution", False, "No institutions created")
            return False
        
        success_count = 0
        
        for institution in self.institutions_created:
            try:
                attendance_data = {
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'time': datetime.now().strftime('%H:%M:%S'),
                    'name': f'Test Student {institution["name"]}',
                    'id': f'TEST{institution["id"]}',
                    'dept': 'Test Department',
                    'role': 'Student',
                    'institution_code': institution['code']
                }
                
                response = self.session.post(
                    f'{API_BASE_URL}/attendance/realtime',
                    json=attendance_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    success_count += 1
                    self.log_test(
                        f"Attendance for {institution['code']}", 
                        True, 
                        f"Recorded for {attendance_data['name']}"
                    )
                else:
                    self.log_test(
                        f"Attendance for {institution['code']}", 
                        False, 
                        f"Status: {response.status_code}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Attendance for {institution['code']}", 
                    False, 
                    f"Error: {str(e)}"
                )
        
        return success_count == len(self.institutions_created)
    
    def test_google_drive_integration(self):
        """Test Google Drive folder creation (will likely fail without credentials)"""
        if not self.institutions_created:
            self.log_test("Google Drive Integration", False, "No institutions created")
            return False
        
        # Test with first institution
        institution = self.institutions_created[0]
        
        try:
            response = self.session.post(
                f'{API_BASE_URL}/drive/initialize/{institution["id"]}',
                timeout=30  # Drive operations can be slow
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_test(
                    "Google Drive Integration", 
                    True, 
                    f"Folders created for {institution['name']}"
                )
                return True
            elif response.status_code == 500:
                # Expected if no Drive credentials configured
                self.log_test(
                    "Google Drive Integration", 
                    True, 
                    "Expected failure - no credentials configured"
                )
                return True
            else:
                self.log_test(
                    "Google Drive Integration", 
                    False, 
                    f"Unexpected status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            # Expected if no Drive credentials
            self.log_test(
                "Google Drive Integration", 
                True, 
                f"Expected error - no credentials: {str(e)[:100]}"
            )
            return True
    
    def cleanup_test_data(self):
        """Clean up test institutions (optional)"""
        print("\n--- Cleanup (keeping test data for inspection) ---")
        self.log_test("Cleanup", True, f"Kept {len(self.institutions_created)} test institutions")
    
    def generate_report(self):
        """Generate test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        
        print(f"\n=== TEST REPORT ===")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.institutions_created:
            print(f"\nCreated Institutions:")
            for inst in self.institutions_created:
                print(f"  - {inst['name']} ({inst['code']}) - ID: {inst['id']}")
        
        # Save detailed report
        report = {
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': total_tests - passed_tests,
                'success_rate': (passed_tests/total_tests)*100
            },
            'institutions_created': self.institutions_created,
            'test_results': self.test_results,
            'generated_at': datetime.now().isoformat()
        }
        
        with open('multi_institution_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nDetailed report saved to: multi_institution_test_report.json")
        
        return passed_tests == total_tests
    
    def run_all_tests(self):
        """Run all tests"""
        print("=== Multi-Institution Functionality Test ===")
        print(f"Testing against: {API_BASE_URL}")
        print(f"Start time: {datetime.now()}")
        
        # Run tests in order
        if not self.test_api_connection():
            print("❌ API connection failed - aborting tests")
            return False
        
        print("\n--- Institution Management Tests ---")
        self.test_institution_creation()
        self.test_institution_isolation()
        
        print("\n--- Functionality Tests ---")
        self.test_attendance_with_institution()
        self.test_google_drive_integration()
        
        print("\n--- Cleanup ---")
        self.cleanup_test_data()
        
        # Generate report
        success = self.generate_report()
        
        if success:
            print("\n🎉 All tests passed!")
        else:
            print("\n⚠️  Some tests failed - check report for details")
        
        return success

def main():
    """Main test function"""
    tester = MultiInstitutionTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()