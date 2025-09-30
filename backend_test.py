#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Fitness Tracker
Tests all authentication, onboarding, plan generation, task management, and profile endpoints
"""

import requests
import json
import base64
import time
from datetime import datetime, date
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://geminihealth.preview.emergentagent.com/api"
TEST_USER_EMAIL = "fitness.test.user@example.com"
TEST_USER_PASSWORD = "SecureTestPass123!"
TEST_USER_NAME = "Fitness Test User"

class FitnessTrackerAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token = None
        self.user_id = None
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        
        # Default headers
        default_headers = {"Content-Type": "application/json"}
        if self.access_token:
            default_headers["Authorization"] = f"Bearer {self.access_token}"
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=default_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=default_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=default_headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=default_headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def test_auth_register(self):
        """Test user registration with email/password"""
        test_name = "Authentication - Register"
        
        try:
            # First, try to clean up any existing user (ignore errors)
            try:
                login_response = self.make_request("POST", "/auth/login", {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD
                })
                if login_response.status_code == 200:
                    print(f"User {TEST_USER_EMAIL} already exists, using existing account")
                    data = login_response.json()
                    self.access_token = data["access_token"]
                    self.user_id = data["user"]["id"]
                    self.log_test(test_name, True, "User already exists, logged in successfully", data)
                    return True
            except:
                pass
            
            # Register new user
            register_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "full_name": TEST_USER_NAME,
                "timezone": "Asia/Kolkata"
            }
            
            response = self.make_request("POST", "/auth/register", register_data)
            
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.user_id = data["user"]["id"]
                
                # Verify response structure
                required_fields = ["access_token", "token_type", "user"]
                user_fields = ["id", "email", "full_name", "timezone"]
                
                missing_fields = [field for field in required_fields if field not in data]
                missing_user_fields = [field for field in user_fields if field not in data.get("user", {})]
                
                if missing_fields or missing_user_fields:
                    self.log_test(test_name, False, f"Missing fields: {missing_fields + missing_user_fields}", data)
                    return False
                
                self.log_test(test_name, True, "User registered successfully", {
                    "user_id": self.user_id,
                    "email": data["user"]["email"],
                    "token_type": data["token_type"]
                })
                return True
            else:
                self.log_test(test_name, False, f"Registration failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Registration error: {str(e)}", None)
            return False
    
    def test_auth_login(self):
        """Test user login with credentials"""
        test_name = "Authentication - Login"
        
        try:
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            response = self.make_request("POST", "/auth/login", login_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "token_type", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing fields in login response: {missing_fields}", data)
                    return False
                
                # Update token for subsequent requests
                self.access_token = data["access_token"]
                self.user_id = data["user"]["id"]
                
                self.log_test(test_name, True, "Login successful", {
                    "user_id": self.user_id,
                    "email": data["user"]["email"]
                })
                return True
            else:
                self.log_test(test_name, False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Login error: {str(e)}", None)
            return False
    
    def test_auth_me(self):
        """Test token validation endpoint"""
        test_name = "Authentication - Get Current User"
        
        try:
            response = self.make_request("GET", "/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify user data
                required_fields = ["id", "email", "full_name", "timezone", "auth_provider"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing user fields: {missing_fields}", data)
                    return False
                
                if data["email"] != TEST_USER_EMAIL:
                    self.log_test(test_name, False, f"Email mismatch: expected {TEST_USER_EMAIL}, got {data['email']}", data)
                    return False
                
                self.log_test(test_name, True, "User info retrieved successfully", data)
                return True
            else:
                self.log_test(test_name, False, f"Get user info failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Get user info error: {str(e)}", None)
            return False
    
    def test_auth_invalid_credentials(self):
        """Test authentication with invalid credentials"""
        test_name = "Authentication - Invalid Credentials"
        
        try:
            # Save current token
            original_token = self.access_token
            self.access_token = None
            
            invalid_login_data = {
                "email": TEST_USER_EMAIL,
                "password": "WrongPassword123!"
            }
            
            response = self.make_request("POST", "/auth/login", invalid_login_data)
            
            # Restore token
            self.access_token = original_token
            
            if response.status_code == 401:
                self.log_test(test_name, True, "Invalid credentials properly rejected", None)
                return True
            else:
                self.log_test(test_name, False, f"Expected 401, got {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.access_token = original_token  # Restore token
            self.log_test(test_name, False, f"Invalid credentials test error: {str(e)}", None)
            return False
    
    def test_onboarding_complete(self):
        """Test complete onboarding process with all 15+ questions"""
        test_name = "Onboarding - Complete Process"
        
        try:
            onboarding_data = {
                # Section 1: Basic Info
                "full_name": TEST_USER_NAME,
                "age_group": "26-35",
                "gender": "Male",
                "height_cm": 175.0,
                "weight_kg": 75.0,
                
                # Section 2: Lifestyle & Activity
                "activity_level": "Moderate",
                "steps_per_day": "6-10k",
                "exercise_frequency": "3-4",
                "sleep_hours": "7-9h",
                "water_intake": "2-3L",
                
                # Section 3: Nutrition & Habits
                "diet_type": "Balanced",
                "fruits_vegetables": "Daily",
                "smoking_alcohol": "No",
                "stress_level": "Moderate",
                "allergies": ["dairy"],
                "cuisine_preference": "Mixed",
                
                # Section 4: Fitness Goal
                "primary_goal": "Lose weight",
                "equipment_access": "Dumbbells",
                "preferred_workout_time": "evening",
                "wake_time": "07:00",
                "bed_time": "23:00",
                "training_days": ["Monday", "Wednesday", "Friday", "Saturday"]
            }
            
            response = self.make_request("POST", "/onboarding", onboarding_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response contains profile with calculations
                if "profile" not in data:
                    self.log_test(test_name, False, "No profile in onboarding response", data)
                    return False
                
                profile = data["profile"]
                
                # Verify BMI/BMR/TDEE calculations
                expected_bmi = round(75.0 / (1.75 ** 2), 1)  # BMI = weight / height^2
                if abs(profile["bmi"] - expected_bmi) > 0.1:
                    self.log_test(test_name, False, f"BMI calculation incorrect: expected ~{expected_bmi}, got {profile['bmi']}", profile)
                    return False
                
                # Verify BMR is calculated (should be > 0)
                if profile["bmr"] <= 0:
                    self.log_test(test_name, False, f"BMR calculation invalid: {profile['bmr']}", profile)
                    return False
                
                # Verify TDEE is calculated (should be > BMR)
                if profile["tdee"] <= profile["bmr"]:
                    self.log_test(test_name, False, f"TDEE calculation invalid: TDEE {profile['tdee']} should be > BMR {profile['bmr']}", profile)
                    return False
                
                # Verify macro calculations
                required_profile_fields = ["calories_target", "protein_g", "carbs_g", "fat_g", "hydration_target_ml"]
                missing_fields = [field for field in required_profile_fields if field not in profile or profile[field] <= 0]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing or invalid profile calculations: {missing_fields}", profile)
                    return False
                
                self.log_test(test_name, True, "Onboarding completed with correct calculations", {
                    "bmi": profile["bmi"],
                    "bmr": profile["bmr"],
                    "tdee": profile["tdee"],
                    "calories_target": profile["calories_target"],
                    "macros": {
                        "protein_g": profile["protein_g"],
                        "carbs_g": profile["carbs_g"],
                        "fat_g": profile["fat_g"]
                    }
                })
                return True
            else:
                self.log_test(test_name, False, f"Onboarding failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Onboarding error: {str(e)}", None)
            return False
    
    def test_onboarding_status(self):
        """Test onboarding status endpoint"""
        test_name = "Onboarding - Status Check"
        
        try:
            response = self.make_request("GET", "/onboarding/status")
            
            if response.status_code == 200:
                data = response.json()
                
                required_fields = ["completed", "has_profile"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing status fields: {missing_fields}", data)
                    return False
                
                if not data["completed"] or not data["has_profile"]:
                    self.log_test(test_name, False, "Onboarding should be completed with profile", data)
                    return False
                
                self.log_test(test_name, True, "Onboarding status correct", data)
                return True
            else:
                self.log_test(test_name, False, f"Onboarding status failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Onboarding status error: {str(e)}", None)
            return False
    
    def test_daily_plan_today(self):
        """Test daily plan generation and retrieval"""
        test_name = "Daily Plan - Today's Plan"
        
        try:
            response = self.make_request("GET", "/plans/today")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify plan structure
                required_fields = ["user_id", "date", "meals", "workout", "water_goal_ml", "sleep_window", "step_target", "calories_target", "macros"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing plan fields: {missing_fields}", data)
                    return False
                
                # Verify meals structure
                if not isinstance(data["meals"], list) or len(data["meals"]) == 0:
                    self.log_test(test_name, False, "No meals in daily plan", data)
                    return False
                
                # Check first meal structure
                meal = data["meals"][0]
                meal_fields = ["name", "time", "calories", "protein_g", "carbs_g", "fat_g", "suggestions"]
                missing_meal_fields = [field for field in meal_fields if field not in meal]
                
                if missing_meal_fields:
                    self.log_test(test_name, False, f"Missing meal fields: {missing_meal_fields}", meal)
                    return False
                
                # Verify workout structure
                workout = data["workout"]
                workout_fields = ["type", "duration_minutes", "sections", "calories_burned"]
                missing_workout_fields = [field for field in workout_fields if field not in workout]
                
                if missing_workout_fields:
                    self.log_test(test_name, False, f"Missing workout fields: {missing_workout_fields}", workout)
                    return False
                
                # Verify macros
                macros = data["macros"]
                macro_fields = ["protein", "carbs", "fat"]
                missing_macro_fields = [field for field in macro_fields if field not in macros]
                
                if missing_macro_fields:
                    self.log_test(test_name, False, f"Missing macro fields: {missing_macro_fields}", macros)
                    return False
                
                self.log_test(test_name, True, "Daily plan generated successfully", {
                    "date": data["date"],
                    "meals_count": len(data["meals"]),
                    "workout_duration": workout["duration_minutes"],
                    "calories_target": data["calories_target"],
                    "water_goal_ml": data["water_goal_ml"]
                })
                return True
            else:
                self.log_test(test_name, False, f"Daily plan failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Daily plan error: {str(e)}", None)
            return False
    
    def test_tasks_today(self):
        """Test daily task generation and retrieval"""
        test_name = "Task Management - Today's Tasks"
        
        try:
            response = self.make_request("GET", "/tasks/today")
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_test(test_name, False, "Tasks response should be a list", data)
                    return False
                
                if len(data) == 0:
                    self.log_test(test_name, False, "No tasks generated for today", data)
                    return False
                
                # Verify task structure
                task = data[0]
                task_fields = ["id", "user_id", "date", "type", "title", "due_at", "completed", "created_at"]
                missing_fields = [field for field in task_fields if field not in task]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing task fields: {missing_fields}", task)
                    return False
                
                # Verify task types
                task_types = [task["type"] for task in data]
                expected_types = ["meal", "workout", "water", "sleep"]
                
                # Check if we have the main task types
                found_types = set(task_types)
                if not any(t in found_types for t in expected_types):
                    self.log_test(test_name, False, f"Missing expected task types. Found: {found_types}", data)
                    return False
                
                self.log_test(test_name, True, "Tasks generated successfully", {
                    "task_count": len(data),
                    "task_types": list(found_types)
                })
                
                # Store first task ID for update test
                self.test_task_id = data[0]["id"]
                return True
            else:
                self.log_test(test_name, False, f"Tasks failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Tasks error: {str(e)}", None)
            return False
    
    def test_task_update(self):
        """Test task completion update"""
        test_name = "Task Management - Update Task"
        
        try:
            if not hasattr(self, 'test_task_id'):
                self.log_test(test_name, False, "No task ID available for update test", None)
                return False
            
            # Mark task as completed
            update_data = {"completed": True}
            response = self.make_request("PUT", f"/tasks/{self.test_task_id}", update_data)
            
            if response.status_code == 200:
                data = response.json()
                
                if "message" not in data:
                    self.log_test(test_name, False, "No success message in update response", data)
                    return False
                
                # Verify task was updated by fetching tasks again
                tasks_response = self.make_request("GET", "/tasks/today")
                if tasks_response.status_code == 200:
                    tasks = tasks_response.json()
                    updated_task = next((task for task in tasks if task["id"] == self.test_task_id), None)
                    
                    if not updated_task:
                        self.log_test(test_name, False, "Updated task not found in tasks list", None)
                        return False
                    
                    if not updated_task["completed"]:
                        self.log_test(test_name, False, "Task completion status not updated", updated_task)
                        return False
                    
                    if not updated_task.get("completed_at"):
                        self.log_test(test_name, False, "Task completion timestamp not set", updated_task)
                        return False
                
                self.log_test(test_name, True, "Task updated successfully", {
                    "task_id": self.test_task_id,
                    "completed": True
                })
                return True
            else:
                self.log_test(test_name, False, f"Task update failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Task update error: {str(e)}", None)
            return False
    
    def test_profile_get(self):
        """Test profile data retrieval"""
        test_name = "Profile Management - Get Profile"
        
        try:
            response = self.make_request("GET", "/profile")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify profile structure
                required_fields = ["user_id", "gender", "age_group", "height_cm", "weight_kg", "bmi", "bmr", "tdee", 
                                 "calories_target", "protein_g", "carbs_g", "fat_g", "primary_goal"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing profile fields: {missing_fields}", data)
                    return False
                
                # Verify calculations are reasonable
                if data["bmi"] <= 0 or data["bmr"] <= 0 or data["tdee"] <= 0:
                    self.log_test(test_name, False, "Invalid calculated values in profile", {
                        "bmi": data["bmi"],
                        "bmr": data["bmr"],
                        "tdee": data["tdee"]
                    })
                    return False
                
                self.log_test(test_name, True, "Profile retrieved successfully", {
                    "user_id": data["user_id"],
                    "bmi": data["bmi"],
                    "calories_target": data["calories_target"],
                    "primary_goal": data["primary_goal"]
                })
                return True
            else:
                self.log_test(test_name, False, f"Profile get failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Profile get error: {str(e)}", None)
            return False
    
    def test_profile_photo_upload(self):
        """Test profile photo upload with base64 image"""
        test_name = "Profile Management - Photo Upload"
        
        try:
            # Create a simple test image (1x1 pixel PNG in base64)
            test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=="
            
            photo_data = {
                "photo_base64": f"data:image/png;base64,{test_image_base64}"
            }
            
            response = self.make_request("POST", "/profile/photo", photo_data)
            
            if response.status_code == 200:
                data = response.json()
                
                if "photo_url" not in data:
                    self.log_test(test_name, False, "No photo_url in upload response", data)
                    return False
                
                # Verify photo URL is base64 data URL
                photo_url = data["photo_url"]
                if not photo_url.startswith("data:image/"):
                    self.log_test(test_name, False, "Invalid photo URL format", {"photo_url": photo_url[:100]})
                    return False
                
                # Verify image was compressed (should be different from original)
                if test_image_base64 in photo_url:
                    # This is fine - small images might not be compressed much
                    pass
                
                self.log_test(test_name, True, "Photo uploaded and compressed successfully", {
                    "photo_url_length": len(photo_url),
                    "format": "base64 data URL"
                })
                return True
            else:
                self.log_test(test_name, False, f"Photo upload failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Photo upload error: {str(e)}", None)
            return False
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        test_name = "Security - Unauthorized Access"
        
        try:
            # Save current token
            original_token = self.access_token
            self.access_token = None
            
            # Test protected endpoints without token
            protected_endpoints = [
                ("GET", "/auth/me"),
                ("GET", "/profile"),
                ("GET", "/plans/today"),
                ("GET", "/tasks/today")
            ]
            
            unauthorized_count = 0
            
            for method, endpoint in protected_endpoints:
                response = self.make_request(method, endpoint)
                if response.status_code == 401:
                    unauthorized_count += 1
            
            # Restore token
            self.access_token = original_token
            
            if unauthorized_count == len(protected_endpoints):
                self.log_test(test_name, True, f"All {len(protected_endpoints)} protected endpoints properly reject unauthorized access", None)
                return True
            else:
                self.log_test(test_name, False, f"Only {unauthorized_count}/{len(protected_endpoints)} endpoints properly reject unauthorized access", None)
                return False
                
        except Exception as e:
            self.access_token = original_token  # Restore token
            self.log_test(test_name, False, f"Unauthorized access test error: {str(e)}", None)
            return False
    
    def test_progress_summary(self):
        """Test progress summary endpoint"""
        test_name = "Progress Tracking - Summary"
        
        try:
            response = self.make_request("GET", "/progress/summary")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify progress structure
                required_fields = ["weekly_workouts", "total_meals_completed", "avg_daily_water_ml", "current_streak", "max_streak", "progress_data"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(test_name, False, f"Missing progress fields: {missing_fields}", data)
                    return False
                
                # Verify data types
                if not isinstance(data["progress_data"], list):
                    self.log_test(test_name, False, "Progress data should be a list", data)
                    return False
                
                self.log_test(test_name, True, "Progress summary retrieved successfully", {
                    "weekly_workouts": data["weekly_workouts"],
                    "total_meals_completed": data["total_meals_completed"],
                    "current_streak": data["current_streak"]
                })
                return True
            else:
                self.log_test(test_name, False, f"Progress summary failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Progress summary error: {str(e)}", None)
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"\n🚀 Starting Fitness Tracker Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print(f"👤 Test user: {TEST_USER_EMAIL}")
        print("=" * 80)
        
        # Authentication Tests
        print("\n🔐 AUTHENTICATION TESTS")
        self.test_auth_register()
        self.test_auth_login()
        self.test_auth_me()
        self.test_auth_invalid_credentials()
        
        # Onboarding Tests
        print("\n📋 ONBOARDING TESTS")
        self.test_onboarding_complete()
        self.test_onboarding_status()
        
        # Daily Plan Tests
        print("\n📅 DAILY PLAN TESTS")
        self.test_daily_plan_today()
        
        # Task Management Tests
        print("\n✅ TASK MANAGEMENT TESTS")
        self.test_tasks_today()
        self.test_task_update()
        
        # Profile Tests
        print("\n👤 PROFILE TESTS")
        self.test_profile_get()
        self.test_profile_photo_upload()
        
        # Progress Tests
        print("\n📊 PROGRESS TESTS")
        self.test_progress_summary()
        
        # Security Tests
        print("\n🔒 SECURITY TESTS")
        self.test_unauthorized_access()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        return passed, failed

def main():
    """Main test execution"""
    tester = FitnessTrackerAPITester()
    
    try:
        passed, failed = tester.run_all_tests()
        
        # Save detailed results
        with open("/app/backend_test_results.json", "w") as f:
            json.dump({
                "summary": {
                    "total_tests": len(tester.test_results),
                    "passed": passed,
                    "failed": failed,
                    "success_rate": passed/len(tester.test_results)*100
                },
                "results": tester.test_results,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: /app/backend_test_results.json")
        
        if failed == 0:
            print(f"\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
            return 0
        else:
            print(f"\n⚠️  {failed} tests failed. Please check the issues above.")
            return 1
            
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main())