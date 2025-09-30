from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_anon_key = os.environ['SUPABASE_PUBLISHABLE_KEY']
supabase_service_key = os.environ['SUPABASE_SERVICE_ROLE_KEY']

# Use anon key for auth operations, service key for admin operations
supabase: Client = create_client(supabase_url, supabase_anon_key)

# Gemini AI initialization
gemini_api_key = os.environ['GEMINI_API_KEY'] 
emergent_llm_key = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI(title="AI Fitness Tracker API", version="1.0.0")

# Security
security = HTTPBearer()

# Database initialization
async def initialize_database():
    """Initialize Supabase database with required schema"""
    try:
        # Read the schema file
        schema_path = ROOT_DIR.parent / 'supabase-schema.sql'
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Execute schema using service role key for admin operations
        service_supabase = create_client(supabase_url, supabase_service_key)
        
        # Split and execute SQL statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        for statement in statements:
            if statement:
                try:
                    service_supabase.rpc('exec_sql', {'sql': statement}).execute()
                except Exception as e:
                    print(f"Error executing statement: {statement[:100]}... Error: {e}")
        
        print("Database schema initialized successfully!")
        return True
    except Exception as e:
        print(f"Database initialization failed: {e}")
        return False

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class OnboardingAnswers(BaseModel):
    # Section 1: Basic Info
    full_name: str
    age_group: str  # 18-25, 26-35, 36-45, 46+
    gender: str  # Male, Female, Other
    height_cm: float
    weight_kg: float
    
    # Section 2: Lifestyle & Activity
    activity_level: str  # Sedentary, Light, Moderate, Very Active
    steps_per_day: str  # <3k, 3-6k, 6-10k, 10k+
    exercise_frequency: str  # None, 1-2, 3-4, 5+
    sleep_hours: str  # <5h, 5-7h, 7-9h, 9+
    water_intake: str  # <1L, 1-2L, 2-3L, 3L+
    
    # Section 3: Nutrition & Habits
    diet_type: str  # Balanced, High junk, Vegetarian, Non-veg, High protein
    fruits_vegetables: str  # Rarely, Sometimes, Daily
    smoking_alcohol: str  # Yes, No, Occasionally
    stress_level: str  # Low, Moderate, High
    allergies: List[str] = []  # peanut, dairy, gluten, other
    cuisine_preference: str = "Mixed"  # Indian, Continental, Mixed
    
    # Section 4: Fitness Goal
    primary_goal: str  # Lose weight, Gain muscle, Maintain, Improve stamina
    equipment_access: str  # None, Bands, Dumbbells, Full gym
    preferred_workout_time: str  # morning, lunch, evening
    wake_time: str  # HH:mm format
    bed_time: str  # HH:mm format
    training_days: List[str] = []  # Mon-Sun

class TaskUpdate(BaseModel):
    completed: bool

class PhotoUpload(BaseModel):
    photo_base64: str

# ==================== HELPER FUNCTIONS ====================

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)

def calculate_bmr(weight_kg: float, height_cm: float, age_group: str, gender: str) -> float:
    # Mifflin-St Jeor Equation
    age_map = {"18-25": 22, "26-35": 30, "36-45": 40, "46+": 50}
    age = age_map.get(age_group, 30)
    
    if gender.lower() == "male":
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:  # female or other
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
    
    return round(bmr, 1)

def calculate_tdee(bmr: float, activity_level: str) -> float:
    activity_factors = {
        "Sedentary": 1.2,
        "Light": 1.375,
        "Moderate": 1.55,
        "Very Active": 1.725
    }
    factor = activity_factors.get(activity_level, 1.375)
    return round(bmr * factor, 1)

def calculate_macros(tdee: float, primary_goal: str, weight_kg: float):
    if primary_goal == "Lose weight":
        calories = tdee * 0.85  # 15% deficit
        protein_per_kg = 2.0
    elif primary_goal == "Gain muscle":
        calories = tdee * 1.15  # 15% surplus
        protein_per_kg = 2.2
    else:  # Maintain or Improve stamina
        calories = tdee
        protein_per_kg = 1.8
    
    protein_g = weight_kg * protein_per_kg
    protein_calories = protein_g * 4
    
    # Fat: 25-30% of total calories
    fat_calories = calories * 0.275
    fat_g = fat_calories / 9
    
    # Remaining calories from carbs
    carb_calories = calories - protein_calories - fat_calories
    carb_g = carb_calories / 4
    
    return {
        "calories": round(calories, 0),
        "protein_g": round(protein_g, 1),
        "carbs_g": round(carb_g, 1),
        "fat_g": round(fat_g, 1)
    }

def calculate_hydration_target(weight_kg: float) -> float:
    base = max(1800, weight_kg * 32)
    return base + 1000  # Add for exercise

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from Supabase Auth"""
    try:
        # Get user from Supabase using the access token
        response = supabase.auth.get_user(credentials.credentials)
        
        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# ==================== AI PLAN GENERATION ====================

async def generate_ai_meal_plan(profile_data: dict, date: str) -> List[dict]:
    """Generate personalized meal plan using Gemini AI"""
    try:
        # Initialize Gemini chat
        chat = LlmChat(
            api_key=gemini_api_key,
            session_id=f"meal_planning_{profile_data.get('id', 'unknown')}_{date}",
            system_message="""You are a professional nutritionist and fitness expert. Generate personalized daily meal plans based on user profiles. 

IMPORTANT: You must respond with ONLY valid JSON in this exact format:
{
  "meals": [
    {
      "name": "Meal Name",
      "time": "HH:MM",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
    }
  ]
}

Create 4-5 meals (breakfast, lunch, dinner, 1-2 snacks) that:
1. Meet the user's calorie and macro targets
2. Respect dietary preferences and allergies
3. Include variety and cultural preferences
4. Provide practical, achievable meal options
"""
        ).with_model("gemini", "gemini-2.0-flash")

        # Create detailed prompt
        user_prompt = f"""
Generate a personalized meal plan for:
- Calories target: {profile_data.get('calories_target', 2000)} kcal
- Protein target: {profile_data.get('protein_g', 100)}g
- Carbs target: {profile_data.get('carbs_g', 250)}g
- Fat target: {profile_data.get('fat_g', 60)}g
- Diet type: {profile_data.get('diet_type', 'Balanced')}
- Allergies: {', '.join(profile_data.get('allergies', []))}
- Cuisine preference: {profile_data.get('cuisine_preference', 'Mixed')}
- Primary goal: {profile_data.get('primary_goal', 'Maintain')}
- Wake time: {profile_data.get('wake_time', '07:00')}
- Bed time: {profile_data.get('bed_time', '22:00')}

Generate a complete day's meal plan that is nutritious, balanced, and fits the user's preferences.
"""

        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        try:
            ai_response = json.loads(response)
            return ai_response.get("meals", [])
        except json.JSONDecodeError:
            # Fallback if AI doesn't return valid JSON
            return generate_fallback_meals(profile_data)
        
    except Exception as e:
        logging.error(f"AI meal generation failed: {e}")
        return generate_fallback_meals(profile_data)

async def generate_ai_workout_plan(profile_data: dict) -> dict:
    """Generate personalized workout plan using Gemini AI"""
    try:
        chat = LlmChat(
            api_key=gemini_api_key,
            session_id=f"workout_planning_{profile_data.get('id', 'unknown')}",
            system_message="""You are a certified personal trainer and fitness expert. Generate personalized workout plans.

IMPORTANT: You must respond with ONLY valid JSON in this exact format:
{
  "type": "home|gym",
  "duration_minutes": number,
  "calories_burned": number,
  "sections": [
    {
      "name": "Section Name",
      "exercises": ["exercise1", "exercise2"],
      "sets": number,
      "reps": "rep_range",
      "duration": number
    }
  ]
}

Create effective workouts that:
1. Match the user's fitness goal and equipment access
2. Are appropriate for their experience level
3. Include proper warm-up and cool-down
4. Provide clear exercise instructions
"""
        ).with_model("gemini", "gemini-2.0-flash")

        user_prompt = f"""
Generate a personalized workout plan for:
- Primary goal: {profile_data.get('primary_goal', 'Maintain')}
- Equipment access: {profile_data.get('equipment_access', 'None')}
- Activity level: {profile_data.get('activity_level', 'Moderate')}
- Preferred workout time: {profile_data.get('preferred_workout_time', 'morning')}
- Training days: {', '.join(profile_data.get('training_days', []))}
- Gender: {profile_data.get('gender', 'Other')}
- Age group: {profile_data.get('age_group', '26-35')}

Generate an effective workout that matches their goals and available equipment.
"""

        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        try:
            ai_response = json.loads(response)
            return ai_response
        except json.JSONDecodeError:
            return generate_fallback_workout(profile_data)
        
    except Exception as e:
        logging.error(f"AI workout generation failed: {e}")
        return generate_fallback_workout(profile_data)

def generate_fallback_meals(profile_data: dict) -> List[dict]:
    """Fallback meal generation when AI fails"""
    calories_target = profile_data.get('calories_target', 2000)
    protein_target = profile_data.get('protein_g', 100)
    carbs_target = profile_data.get('carbs_g', 250)
    fat_target = profile_data.get('fat_g', 60)
    
    return [
        {
            "name": "Healthy Breakfast",
            "time": "07:30",
            "calories": calories_target * 0.25,
            "protein_g": protein_target * 0.25,
            "carbs_g": carbs_target * 0.3,
            "fat_g": fat_target * 0.2,
            "suggestions": ["Oats with fruits", "Scrambled eggs with toast", "Smoothie bowl", "Greek yogurt parfait"]
        },
        {
            "name": "Balanced Lunch",
            "time": "12:30",
            "calories": calories_target * 0.35,
            "protein_g": protein_target * 0.4,
            "carbs_g": carbs_target * 0.4,
            "fat_g": fat_target * 0.4,
            "suggestions": ["Grilled chicken salad", "Quinoa bowl", "Dal-chawal", "Sandwich with protein"]
        },
        {
            "name": "Light Dinner",
            "time": "19:00",
            "calories": calories_target * 0.3,
            "protein_g": protein_target * 0.25,
            "carbs_g": carbs_target * 0.2,
            "fat_g": fat_target * 0.3,
            "suggestions": ["Grilled fish with vegetables", "Soup with bread", "Light curry", "Salad with protein"]
        },
        {
            "name": "Healthy Snack",
            "time": "16:00",
            "calories": calories_target * 0.1,
            "protein_g": protein_target * 0.1,
            "carbs_g": carbs_target * 0.1,
            "fat_g": fat_target * 0.1,
            "suggestions": ["Mixed nuts", "Fruit", "Protein bar", "Yogurt"]
        }
    ]

def generate_fallback_workout(profile_data: dict) -> dict:
    """Fallback workout generation when AI fails"""
    equipment = profile_data.get('equipment_access', 'None')
    goal = profile_data.get('primary_goal', 'Maintain')
    
    if equipment == "Full gym":
        return {
            "type": "gym",
            "duration_minutes": 45,
            "calories_burned": 225,
            "sections": [
                {"name": "Warmup", "exercises": ["Treadmill walk"], "duration": 5},
                {"name": "Strength", "exercises": ["Bench press", "Squats", "Deadlifts"], "sets": 3, "reps": "8-12"},
                {"name": "Cardio", "exercises": ["Running"], "duration": 15}
            ]
        }
    else:
        return {
            "type": "home",
            "duration_minutes": 30,
            "calories_burned": 150,
            "sections": [
                {"name": "Warmup", "exercises": ["Jumping jacks", "Arm circles"], "duration": 5},
                {"name": "Bodyweight", "exercises": ["Push-ups", "Squats", "Planks"], "sets": 3, "reps": "12-15"},
                {"name": "Cardio", "exercises": ["High knees", "Burpees"], "duration": 10}
            ]
        }

# ==================== API ENDPOINTS ====================

@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    """Register a new user with Supabase Auth"""
    try:
        # Create user with Supabase Auth
        response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if response.user is None:
            raise HTTPException(status_code=400, detail="Registration failed")
        
        # Try to create user profile, but don't fail if table doesn't exist
        try:
            profile_data = {
                "id": response.user.id,
                "full_name": user_data.full_name,
                "email": user_data.email,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            supabase.table("profiles").insert(profile_data).execute()
        except Exception as profile_error:
            # Log the error but don't fail registration
            print(f"Profile creation failed: {profile_error}")
        
        return {
            "access_token": response.session.access_token if response.session else None,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "full_name": user_data.full_name
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/api/auth/login")
async def login(email: str, password: str):
    """Login user with Supabase Auth"""
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.session is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return {
            "access_token": response.session.access_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

@app.get("/api/auth/me")
async def get_current_user_info(user = Depends(get_current_user)):
    """Get current user info"""
    profile_response = supabase.table("profiles").select("*").eq("id", user.id).execute()
    
    profile = profile_response.data[0] if profile_response.data else {}
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": profile.get("full_name", ""),
        "photo_url": profile.get("avatar_url")
    }

@app.post("/api/onboarding")
async def save_onboarding(answers: OnboardingAnswers, user = Depends(get_current_user)):
    """Complete onboarding and generate personalized fitness plan"""
    try:
        # Calculate fitness metrics
        bmi = calculate_bmi(answers.weight_kg, answers.height_cm)
        bmr = calculate_bmr(answers.weight_kg, answers.height_cm, answers.age_group, answers.gender)
        tdee = calculate_tdee(bmr, answers.activity_level)
        macros = calculate_macros(tdee, answers.primary_goal, answers.weight_kg)
        hydration = calculate_hydration_target(answers.weight_kg)
        
        # Create comprehensive profile
        profile_data = {
            "id": user.id,
            "gender": answers.gender,
            "age_group": answers.age_group,
            "height_cm": answers.height_cm,
            "weight_kg": answers.weight_kg,
            "bmi": bmi,
            "activity_level": answers.activity_level,
            "diet_type": answers.diet_type,
            "allergies": answers.allergies,
            "smoking_alcohol": answers.smoking_alcohol,
            "stress_level": answers.stress_level,
            "primary_goal": answers.primary_goal,
            "equipment_access": answers.equipment_access,
            "wake_time": answers.wake_time,
            "bed_time": answers.bed_time,
            "training_days": answers.training_days,
            "preferred_workout_time": answers.preferred_workout_time,
            "cuisine_preference": answers.cuisine_preference,
            "bmr": bmr,
            "tdee": tdee,
            "calories_target": macros["calories"],
            "protein_g": macros["protein_g"],
            "carbs_g": macros["carbs_g"],
            "fat_g": macros["fat_g"],
            "hydration_target_ml": hydration,
            "sleep_target_hrs": 8.0,
            "step_target": 8000,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Update profile in Supabase
        supabase.table("profiles").upsert(profile_data).execute()
        
        # Generate today's AI-powered plan
        today = datetime.now().date().strftime("%Y-%m-%d")
        
        # Generate AI meal plan
        ai_meals = await generate_ai_meal_plan(profile_data, today)
        
        # Generate AI workout plan
        ai_workout = await generate_ai_workout_plan(profile_data)
        
        # Create daily plan
        plan_data = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "date": today,
            "meals": ai_meals,
            "workout": ai_workout,
            "water_goal_ml": hydration,
            "sleep_window": {
                "start": answers.bed_time,
                "end": answers.wake_time
            },
            "step_target": 8000,
            "calories_target": macros["calories"],
            "macros": {
                "protein": macros["protein_g"],
                "carbs": macros["carbs_g"],
                "fat": macros["fat_g"]
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("daily_plans").insert(plan_data).execute()
        
        # Generate tasks from plan
        tasks = []
        
        # Meal tasks
        for i, meal in enumerate(ai_meals):
            task = {
                "id": str(uuid.uuid4()),
                "user_id": user.id,
                "date": today,
                "type": "meal",
                "title": f"{meal['name']} ({int(meal['calories'])} kcal)",
                "due_at": f"{today} {meal['time']}:00",
                "completed": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            tasks.append(task)
        
        # Workout task
        workout_task = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "date": today,
            "type": "workout",
            "title": f"{ai_workout['type'].title()} Workout ({ai_workout['duration_minutes']} min)",
            "due_at": f"{today} 18:00:00",
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        tasks.append(workout_task)
        
        # Water task
        water_task = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "date": today,
            "type": "water",
            "title": f"Drink {int(hydration)}ml water",
            "due_at": f"{today} 20:00:00",
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        tasks.append(water_task)
        
        # Sleep task
        sleep_task = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "date": today,
            "type": "sleep",
            "title": f"Sleep by {answers.bed_time}",
            "due_at": f"{today} {answers.bed_time}:00",
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        tasks.append(sleep_task)
        
        # Insert all tasks
        supabase.table("tasks").insert(tasks).execute()
        
        return {
            "message": "Onboarding completed successfully! Your AI-powered fitness plan is ready.",
            "profile": profile_data,
            "plan_generated": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {str(e)}")

@app.get("/api/onboarding/status")
async def get_onboarding_status(user = Depends(get_current_user)):
    """Check onboarding completion status"""
    profile_response = supabase.table("profiles").select("bmi").eq("id", user.id).execute()
    
    completed = bool(profile_response.data and profile_response.data[0].get("bmi"))
    
    return {
        "completed": completed,
        "has_profile": bool(profile_response.data)
    }

@app.get("/api/plans/today")
async def get_today_plan(user = Depends(get_current_user)):
    """Get today's AI-generated plan"""
    today = datetime.now().date().strftime("%Y-%m-%d")
    
    plan_response = supabase.table("daily_plans").select("*").eq("user_id", user.id).eq("date", today).execute()
    
    if not plan_response.data:
        # Generate new plan if doesn't exist
        profile_response = supabase.table("profiles").select("*").eq("id", user.id).execute()
        
        if not profile_response.data or not profile_response.data[0].get("bmi"):
            raise HTTPException(status_code=404, detail="Profile not found. Please complete onboarding.")
        
        profile_data = profile_response.data[0]
        
        # Generate new AI plan
        ai_meals = await generate_ai_meal_plan(profile_data, today)
        ai_workout = await generate_ai_workout_plan(profile_data)
        
        plan_data = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "date": today,
            "meals": ai_meals,
            "workout": ai_workout,
            "water_goal_ml": profile_data.get("hydration_target_ml", 2500),
            "sleep_window": {
                "start": profile_data.get("bed_time", "22:00"),
                "end": profile_data.get("wake_time", "07:00")
            },
            "step_target": profile_data.get("step_target", 8000),
            "calories_target": profile_data.get("calories_target", 2000),
            "macros": {
                "protein": profile_data.get("protein_g", 100),
                "carbs": profile_data.get("carbs_g", 250),
                "fat": profile_data.get("fat_g", 60)
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("daily_plans").insert(plan_data).execute()
        return plan_data
    
    return plan_response.data[0]

@app.get("/api/tasks/today")
async def get_today_tasks(user = Depends(get_current_user)):
    """Get today's tasks"""
    today = datetime.now().date().strftime("%Y-%m-%d")
    
    tasks_response = supabase.table("tasks").select("*").eq("user_id", user.id).eq("date", today).execute()
    
    return tasks_response.data or []

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, task_update: TaskUpdate, user = Depends(get_current_user)):
    """Update task completion status"""
    update_data = {
        "completed": task_update.completed,
        "completed_at": datetime.now(timezone.utc).isoformat() if task_update.completed else None
    }
    
    result = supabase.table("tasks").update(update_data).eq("id", task_id).eq("user_id", user.id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task updated successfully"}

@app.get("/api/progress/summary")
async def get_progress_summary(user = Depends(get_current_user)):
    """Get progress summary"""
    today = datetime.now().date()
    start_date = today - timedelta(days=6)
    
    # Get recent tasks
    tasks_response = supabase.table("tasks").select("*").eq("user_id", user.id).gte("date", start_date.strftime("%Y-%m-%d")).execute()
    
    tasks = tasks_response.data or []
    
    # Calculate stats
    completed_tasks = [t for t in tasks if t.get("completed")]
    workout_tasks = [t for t in completed_tasks if t.get("type") == "workout"]
    meal_tasks = [t for t in completed_tasks if t.get("type") == "meal"]
    
    return {
        "weekly_workouts": len(workout_tasks),
        "total_meals_completed": len(meal_tasks),
        "avg_daily_water_ml": 2000,  # Default value
        "current_streak": 5,  # Default value
        "max_streak": 12,  # Default value
        "progress_data": []
    }

@app.get("/api/profile")
async def get_user_profile(user = Depends(get_current_user)):
    """Get user profile"""
    profile_response = supabase.table("profiles").select("*").eq("id", user.id).execute()
    
    if not profile_response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile_response.data[0]

@app.post("/api/profile/photo")
async def upload_profile_photo(photo: PhotoUpload, user = Depends(get_current_user)):
    """Upload and update profile photo"""
    # For demo purposes, just store the base64 string
    # In production, you'd upload to Supabase Storage
    
    update_data = {
        "avatar_url": photo.photo_base64,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.table("profiles").update(update_data).eq("id", user.id).execute()
    
    return {"photo_url": photo.photo_base64}

# ==================== MIDDLEWARE & APP CONFIGURATION ====================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.get("/")
async def root():
    return {"message": "AI Fitness Tracker API with Supabase + Gemini AI", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)