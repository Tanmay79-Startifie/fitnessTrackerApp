#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Supabase + Gemini AI Migration
Tests the newly migrated backend with Supabase authentication and database integration
"""

import requests
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Configuration - Use local backend for testing since external routing may not be configured
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

# Test user data
TEST_USER = {
    "email": f"testuser_{int(time.time())}@example.com",
    "password": "TestPassword123!",
    "full_name": "John Doe"
}

# Global variables for test session
access_token = None
user_id = None

def print_test_result(test_name, success, details=""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   Details: {details}")
    print()

def make_request(method, endpoint, data=None, headers=None, auth_required=True):
    """Make HTTP request with proper error handling"""
    # Handle root endpoint specially
    if endpoint == "":
        url = BACKEND_URL + "/"
    elif endpoint.startswith("/") and not endpoint.startswith("/api"):
        # For non-API endpoints like /health
        url = BACKEND_URL + endpoint
    else:
        # For API endpoints
        url = f"{API_BASE}{endpoint}"
    
    # Add authorization header if required
    if auth_required and access_token:
        if headers is None:
            headers = {}
        headers["Authorization"] = f"Bearer {access_token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def test_health_check():
    """Test basic health endpoints"""
    print("🔍 Testing Health Check Endpoints...")
    
    # Test root endpoint (no /api prefix)
    print(f"Testing root endpoint: {BACKEND_URL}/")
    response = make_request("GET", "", auth_required=False)
    if response is None:
        # Try direct URL without /api
        try:
            print("Trying direct URL...")
            response = requests.get(f"{BACKEND_URL}/", timeout=30)
            print(f"Direct response status: {response.status_code}")
        except Exception as e:
            print(f"Direct request failed: {e}")
            response = None
    
    if response and response.status_code == 200:
        data = response.json()
        success = "AI Fitness Tracker API" in data.get("message", "")
        print_test_result("Root endpoint", success, f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}")
    else:
        print_test_result("Root endpoint", False, f"Failed to connect or bad status: {response.status_code if response else 'No response'}")
    
    # Test health endpoint (no /api prefix)
    print(f"Testing health endpoint: {BACKEND_URL}/health")
    response = make_request("GET", "/health", auth_required=False)
    if response is None:
        # Try direct URL without /api
        try:
            print("Trying direct health URL...")
            response = requests.get(f"{BACKEND_URL}/health", timeout=30)
            print(f"Direct health response status: {response.status_code}")
        except Exception as e:
            print(f"Direct health request failed: {e}")
            response = None
    
    if response and response.status_code == 200:
        data = response.json()
        success = data.get("status") == "healthy"
        print_test_result("Health endpoint", success, f"Status: {data.get('status', 'N/A')}")
    else:
        print_test_result("Health endpoint", False, f"Failed to connect or bad status: {response.status_code if response else 'No response'}")

def test_user_registration():
    """Test Supabase user registration"""
    global access_token, user_id
    print("🔍 Testing Supabase User Registration...")
    
    print(f"Registering user: {TEST_USER}")
    response = make_request("POST", "/auth/register", TEST_USER, auth_required=False)
    print(f"Registration response: {response}")
    
    if response and response.status_code == 200:
        data = response.json()
        access_token = data.get("access_token")  # May be None for unconfirmed users
        user_info = data.get("user", {})
        user_id = user_info.get("id")
        
        # Registration is successful if we get a user ID, even without access token
        success = bool(user_id and user_info.get("email") == TEST_USER["email"])
        print_test_result("User registration with Supabase", success, 
                         f"User ID: {user_id}, Email: {user_info.get('email')}, Token: {'Yes' if access_token else 'None (email confirmation required)'}")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("User registration with Supabase", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def test_user_login():
    """Test Supabase user login"""
    global access_token, user_id
    print("🔍 Testing Supabase User Login...")
    
    login_data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }
    
    response = make_request("POST", "/auth/login", login_data, auth_required=False)
    
    if response and response.status_code == 200:
        data = response.json()
        access_token = data.get("access_token")
        user_info = data.get("user", {})
        user_id = user_info.get("id")
        
        success = bool(access_token and user_id)
        print_test_result("User login with Supabase", success, 
                         f"Token received: {bool(access_token)}, User ID: {user_id}")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("User login with Supabase", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def test_auth_validation():
    """Test Supabase token validation"""
    print("🔍 Testing Supabase Auth Token Validation...")
    
    # Test with valid token
    response = make_request("GET", "/auth/me")
    
    if response and response.status_code == 200:
        data = response.json()
        success = data.get("id") == user_id and data.get("email") == TEST_USER["email"]
        print_test_result("Auth token validation", success, 
                         f"User ID match: {data.get('id') == user_id}, Email match: {data.get('email') == TEST_USER['email']}")
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("Auth token validation", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
    
    # Test with invalid token
    invalid_headers = {"Authorization": "Bearer invalid_token_123"}
    response = requests.get(f"{API_BASE}/auth/me", headers=invalid_headers, timeout=30)
    
    success = response.status_code == 401
    print_test_result("Invalid token rejection", success, 
                     f"Status: {response.status_code}, Expected: 401")

def test_onboarding_status():
    """Test onboarding status endpoint"""
    print("🔍 Testing Onboarding Status...")
    
    response = make_request("GET", "/onboarding/status")
    
    if response and response.status_code == 200:
        data = response.json()
        success = "completed" in data and "has_profile" in data
        print_test_result("Onboarding status check", success, 
                         f"Completed: {data.get('completed')}, Has profile: {data.get('has_profile')}")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("Onboarding status check", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def test_onboarding_completion():
    """Test complete onboarding with Supabase + Gemini AI"""
    print("🔍 Testing Onboarding with Supabase Database + Gemini AI...")
    
    onboarding_data = {
        "full_name": "John Doe",
        "age_group": "26-35",
        "gender": "Male",
        "height_cm": 175.0,
        "weight_kg": 70.0,
        "activity_level": "Moderate",
        "steps_per_day": "6-10k",
        "exercise_frequency": "3-4",
        "sleep_hours": "7-9h",
        "water_intake": "2-3L",
        "diet_type": "Balanced",
        "fruits_vegetables": "Daily",
        "smoking_alcohol": "No",
        "stress_level": "Low",
        "allergies": [],
        "cuisine_preference": "Mixed",
        "primary_goal": "Maintain",
        "equipment_access": "None",
        "preferred_workout_time": "morning",
        "wake_time": "07:00",
        "bed_time": "22:00",
        "training_days": ["Monday", "Wednesday", "Friday"]
    }
    
    response = make_request("POST", "/onboarding", onboarding_data)
    
    if response and response.status_code == 200:
        data = response.json()
        profile = data.get("profile", {})
        
        # Check if BMI/BMR/TDEE calculations are present
        has_calculations = all(key in profile for key in ["bmi", "bmr", "tdee", "calories_target"])
        has_macros = all(key in profile for key in ["protein_g", "carbs_g", "fat_g"])
        plan_generated = data.get("plan_generated", False)
        
        success = has_calculations and has_macros and plan_generated
        print_test_result("Onboarding completion with Supabase + AI", success, 
                         f"BMI: {profile.get('bmi')}, BMR: {profile.get('bmr')}, TDEE: {profile.get('tdee')}, Plan generated: {plan_generated}")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("Onboarding completion with Supabase + AI", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def test_daily_plan_generation():
    """Test AI-powered daily plan generation"""
    print("🔍 Testing Daily Plan Generation with Gemini AI...")
    
    response = make_request("GET", "/plans/today")
    
    if response and response.status_code == 200:
        data = response.json()
        
        # Check if plan has required components
        has_meals = bool(data.get("meals"))
        has_workout = bool(data.get("workout"))
        has_targets = all(key in data for key in ["water_goal_ml", "step_target", "calories_target"])
        
        # Check meal structure
        meals_valid = False
        if has_meals and isinstance(data["meals"], list) and len(data["meals"]) > 0:
            first_meal = data["meals"][0]
            meals_valid = all(key in first_meal for key in ["name", "time", "calories", "protein_g"])
        
        # Check workout structure
        workout_valid = False
        if has_workout and isinstance(data["workout"], dict):
            workout = data["workout"]
            workout_valid = all(key in workout for key in ["type", "duration_minutes", "sections"])
        
        success = has_meals and has_workout and has_targets and meals_valid and workout_valid
        print_test_result("Daily plan generation with Gemini AI", success, 
                         f"Meals: {len(data.get('meals', []))}, Workout type: {data.get('workout', {}).get('type')}, Duration: {data.get('workout', {}).get('duration_minutes')}min")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("Daily plan generation with Gemini AI", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def test_task_management():
    """Test task management system"""
    print("🔍 Testing Task Management System...")
    
    # Get today's tasks
    response = make_request("GET", "/tasks/today")
    
    if response and response.status_code == 200:
        tasks = response.json()
        
        if not tasks:
            print_test_result("Task retrieval", False, "No tasks found - should be generated after onboarding")
            return False
        
        # Check task structure
        first_task = tasks[0]
        task_valid = all(key in first_task for key in ["id", "type", "title", "completed"])
        
        # Test task update
        task_id = first_task["id"]
        update_data = {"completed": True}
        update_response = make_request("PUT", f"/tasks/{task_id}", update_data)
        
        update_success = update_response and update_response.status_code == 200
        
        success = task_valid and update_success
        print_test_result("Task management system", success, 
                         f"Tasks found: {len(tasks)}, Task types: {list(set(t.get('type') for t in tasks))}, Update success: {update_success}")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("Task management system", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def test_profile_management():
    """Test profile management with Supabase"""
    print("🔍 Testing Profile Management with Supabase...")
    
    # Get profile
    response = make_request("GET", "/profile")
    
    if response and response.status_code == 200:
        profile = response.json()
        
        # Check if profile has expected fields
        has_basic_info = all(key in profile for key in ["id", "height_cm", "weight_kg", "bmi"])
        has_fitness_data = all(key in profile for key in ["bmr", "tdee", "calories_target"])
        
        # Test photo upload
        photo_data = {"photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"}
        photo_response = make_request("POST", "/profile/photo", photo_data)
        
        photo_success = photo_response and photo_response.status_code == 200
        
        success = has_basic_info and has_fitness_data and photo_success
        print_test_result("Profile management with Supabase", success, 
                         f"BMI: {profile.get('bmi')}, TDEE: {profile.get('tdee')}, Photo upload: {photo_success}")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("Profile management with Supabase", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def test_progress_tracking():
    """Test progress tracking system"""
    print("🔍 Testing Progress Tracking System...")
    
    response = make_request("GET", "/progress/summary")
    
    if response and response.status_code == 200:
        data = response.json()
        
        # Check if progress data has expected structure
        has_stats = all(key in data for key in ["weekly_workouts", "total_meals_completed", "current_streak"])
        
        success = has_stats
        print_test_result("Progress tracking system", success, 
                         f"Weekly workouts: {data.get('weekly_workouts')}, Meals completed: {data.get('total_meals_completed')}, Current streak: {data.get('current_streak')}")
        return success
    else:
        error_detail = response.json().get("detail", "Unknown error") if response else "No response"
        print_test_result("Progress tracking system", False, 
                         f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        return False

def run_comprehensive_tests():
    """Run all backend tests"""
    print("🚀 Starting Comprehensive Backend Testing for Supabase + Gemini AI Migration")
    print("=" * 80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print("=" * 80)
    
    test_results = {}
    
    # 1. Health Check
    test_health_check()
    
    # 2. Authentication Tests (Critical for Supabase migration)
    test_results["registration"] = test_user_registration()
    if not test_results["registration"]:
        print("❌ Registration failed - cannot continue with other tests")
        return test_results
    
    test_results["login"] = test_user_login()
    test_results["auth_validation"] = test_auth_validation()
    
    # 3. Core Functionality Tests
    test_results["onboarding_status"] = test_onboarding_status()
    test_results["onboarding_completion"] = test_onboarding_completion()
    test_results["daily_plan_generation"] = test_daily_plan_generation()
    test_results["task_management"] = test_task_management()
    test_results["profile_management"] = test_profile_management()
    test_results["progress_tracking"] = test_progress_tracking()
    
    # Summary
    print("=" * 80)
    print("🎯 TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\nOverall Result: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED - Backend migration successful!")
    else:
        print("⚠️  Some tests failed - Backend needs attention")
    
    return test_results

if __name__ == "__main__":
    run_comprehensive_tests()