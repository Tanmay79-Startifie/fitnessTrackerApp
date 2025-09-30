from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt
import httpx
import pytz
from dotenv import load_dotenv
import base64
import io
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'fitness-tracker-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

# Create the main app without a prefix
app = FastAPI(title="Fitness Tracker API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    timezone: str = "Asia/Kolkata"

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    photo_url: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    auth_provider: str = "email"  # email or google
    google_id: Optional[str] = None

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

class OnboardingSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    answers: OnboardingAnswers
    completed: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfile(BaseModel):
    user_id: str
    # Personal Info
    gender: str
    age_group: str
    height_cm: float
    weight_kg: float
    bmi: float
    
    # Lifestyle
    activity_level: str
    diet_type: str
    allergies: List[str]
    smoking_alcohol: str
    stress_level: str
    
    # Goals & Preferences
    primary_goal: str
    equipment_access: str
    wake_time: str
    bed_time: str
    training_days: List[str]
    preferred_workout_time: str
    
    # Calculated Targets
    bmr: float
    tdee: float
    calories_target: float
    protein_g: float
    carbs_g: float
    fat_g: float
    hydration_target_ml: float
    sleep_target_hrs: float
    step_target: int
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Meal(BaseModel):
    name: str
    time: str  # HH:mm format
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    suggestions: List[str] = []
    recipe_id: Optional[str] = None

class Workout(BaseModel):
    type: str  # home or gym
    duration_minutes: int
    sections: List[Dict[str, Any]]  # warmup, compound, accessories, finisher
    calories_burned: float = 0

class DailyPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    meals: List[Meal]
    workout: Workout
    water_goal_ml: float
    sleep_window: Dict[str, str]  # start, end times
    step_target: int
    calories_target: float
    macros: Dict[str, float]  # protein, carbs, fat
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD
    type: str  # meal, workout, water, sleep, generic
    title: str
    due_at: datetime
    completed: bool = False
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskUpdate(BaseModel):
    completed: bool

class Progress(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD
    weight_kg: Optional[float] = None
    steps: Optional[int] = None
    water_ml: Optional[float] = None
    workouts_minutes: Optional[int] = None
    meals_completed: Optional[int] = None
    fitness_score: Optional[float] = None
    streak_current: int = 0
    streak_max: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PhotoUpload(BaseModel):
    photo_base64: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request) -> Dict[str, Any]:
    """Get current user from session token (cookie) or authorization header"""
    
    # Try session token from cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Check if it's a JWT token
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except JWTError:
        # Check if it's a session token from Emergent Auth
        session = await db.sessions.find_one({
            "session_token": session_token,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Get user from database
        user = await db.users.find_one({"id": session["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)

def calculate_bmr(weight_kg: float, height_cm: float, age_group: str, gender: str) -> float:
    # Mifflin-St Jeor Equation
    # Age group mapping
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
    # Base: max(1800ml, weight * 32ml) + 500ml per 30min exercise
    base = max(1800, weight_kg * 32)
    # Assume 1 hour average exercise
    return base + 1000

def compress_image_to_base64(base64_string: str, max_size_kb: int = 100) -> str:
    """Compress image to target size while maintaining reasonable quality"""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith('data:'):
            base64_string = base64_string.split(',')[1]
        
        # Decode base64 to bytes
        image_data = base64.b64decode(base64_string)
        
        # Open image with PIL
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (for JPEG compression)
        if image.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        # Resize if image is too large
        max_dimension = 400
        if max(image.size) > max_dimension:
            ratio = max_dimension / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Compress with JPEG
        output = io.BytesIO()
        quality = 85
        
        while quality > 20:
            output.seek(0)
            output.truncate(0)
            image.save(output, format='JPEG', quality=quality, optimize=True)
            
            if len(output.getvalue()) <= max_size_kb * 1024:
                break
            quality -= 10
        
        # Encode back to base64
        output.seek(0)
        compressed_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
        return f"data:image/jpeg;base64,{compressed_base64}"
        
    except Exception as e:
        # Return original if compression fails
        return base64_string if base64_string.startswith('data:') else f"data:image/jpeg;base64,{base64_string}"

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        timezone=user_data.timezone,
        auth_provider="email"
    )
    
    # Store user and password separately
    user_dict = user.dict()
    await db.users.insert_one(user_dict)
    await db.user_passwords.insert_one({
        "user_id": user.id,
        "password_hash": hashed_password,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "timezone": user.timezone
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Find user
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password
    password_doc = await db.user_passwords.find_one({"user_id": user["id"]})
    if not password_doc or not verify_password(user_data.password, password_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "timezone": user["timezone"]
        }
    }

@api_router.get("/auth/me")
async def get_current_user_info(request: Request):
    user = await get_current_user(request)
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "photo_url": user.get("photo_url"),
        "timezone": user["timezone"],
        "auth_provider": user.get("auth_provider", "email")
    }

@api_router.post("/auth/google/session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session from Emergent Auth"""
    session_id = request.headers.get("X-Session-ID")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent Auth API to get session data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            auth_response.raise_for_status()
            session_data = auth_response.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to verify session: {str(e)}")
    
    # Check if user exists
    user = await db.users.find_one({"email": session_data["email"]})
    
    if not user:
        # Create new user from Google data
        user = User(
            email=session_data["email"],
            full_name=session_data["name"],
            photo_url=session_data.get("picture"),
            auth_provider="google",
            google_id=session_data["id"]
        )
        user_dict = user.dict()
        await db.users.insert_one(user_dict)
    else:
        # Update existing user if needed
        update_data = {}
        if not user.get("photo_url") and session_data.get("picture"):
            update_data["photo_url"] = session_data["picture"]
        if not user.get("google_id"):
            update_data["google_id"] = session_data["id"]
        
        if update_data:
            await db.users.update_one(
                {"id": user["id"]}, 
                {"$set": update_data}
            )
            user.update(update_data)
    
    # Store session token in database
    session_expires = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = Session(
        user_id=user["id"] if isinstance(user, dict) else user.id,
        session_token=session_data["session_token"],
        expires_at=session_expires
    )
    await db.sessions.insert_one(session_doc.dict())
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_data["session_token"],
        expires=session_expires,
        path="/",
        secure=True,
        samesite="none",
        httponly=True
    )
    
    return {
        "user": {
            "id": user["id"] if isinstance(user, dict) else user.id,
            "email": user["email"] if isinstance(user, dict) else user.email,
            "full_name": user["full_name"] if isinstance(user, dict) else user.full_name,
            "photo_url": user.get("photo_url"),
            "timezone": user.get("timezone", "Asia/Kolkata"),
            "auth_provider": user.get("auth_provider", "google")
        }
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        # Delete session from database
        await db.sessions.delete_one({"session_token": session_token})
    
    # Clear cookie
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}

# ==================== PROFILE ENDPOINTS ====================

@api_router.post("/profile/photo")
async def upload_profile_photo(request: Request, photo: PhotoUpload):
    user = await get_current_user(request)
    
    # Compress image
    compressed_photo = compress_image_to_base64(photo.photo_base64, max_size_kb=100)
    
    # Update user's photo
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"photo_url": compressed_photo}}
    )
    
    return {"photo_url": compressed_photo}

# ==================== ONBOARDING ENDPOINTS ====================

@api_router.post("/onboarding")
async def save_onboarding_answers(request: Request, answers: OnboardingAnswers):
    user = await get_current_user(request)
    
    # Save onboarding session
    onboarding = OnboardingSession(
        user_id=user["id"],
        answers=answers,
        completed=True
    )
    
    await db.onboarding_sessions.insert_one(onboarding.dict())
    
    # Calculate profile metrics
    bmi = calculate_bmi(answers.weight_kg, answers.height_cm)
    bmr = calculate_bmr(answers.weight_kg, answers.height_cm, answers.age_group, answers.gender)
    tdee = calculate_tdee(bmr, answers.activity_level)
    macros = calculate_macros(tdee, answers.primary_goal, answers.weight_kg)
    hydration = calculate_hydration_target(answers.weight_kg)
    
    # Create user profile
    profile = UserProfile(
        user_id=user["id"],
        gender=answers.gender,
        age_group=answers.age_group,
        height_cm=answers.height_cm,
        weight_kg=answers.weight_kg,
        bmi=bmi,
        activity_level=answers.activity_level,
        diet_type=answers.diet_type,
        allergies=answers.allergies,
        smoking_alcohol=answers.smoking_alcohol,
        stress_level=answers.stress_level,
        primary_goal=answers.primary_goal,
        equipment_access=answers.equipment_access,
        wake_time=answers.wake_time,
        bed_time=answers.bed_time,
        training_days=answers.training_days,
        preferred_workout_time=answers.preferred_workout_time,
        bmr=bmr,
        tdee=tdee,
        calories_target=macros["calories"],
        protein_g=macros["protein_g"],
        carbs_g=macros["carbs_g"],
        fat_g=macros["fat_g"],
        hydration_target_ml=hydration,
        sleep_target_hrs=8.0,  # Default 8 hours
        step_target=8000  # Default step target
    )
    
    await db.profiles.insert_one(profile.dict())
    
    # Generate today's plan
    from datetime import date
    today = date.today().strftime("%Y-%m-%d")
    
    plan = await generate_daily_plan(user["id"], today, profile)
    await db.daily_plans.insert_one(plan.dict())
    
    return {"message": "Onboarding completed successfully", "profile": profile.dict()}

@api_router.get("/onboarding/status")
async def get_onboarding_status(request: Request):
    user = await get_current_user(request)
    
    # Check if onboarding is completed
    onboarding = await db.onboarding_sessions.find_one(
        {"user_id": user["id"], "completed": True}
    )
    
    profile = await db.profiles.find_one({"user_id": user["id"]})
    
    return {
        "completed": onboarding is not None,
        "has_profile": profile is not None
    }

# ==================== PLAN GENERATION ====================

async def generate_daily_plan(user_id: str, date: str, profile: UserProfile) -> DailyPlan:
    """Generate a daily meal and workout plan"""
    
    # Generate meals (simplified template-based approach)
    meals = []
    
    # Breakfast
    breakfast_calories = profile.calories_target * 0.25
    meals.append(Meal(
        name="Healthy Breakfast",
        time="07:30",
        calories=breakfast_calories,
        protein_g=profile.protein_g * 0.25,
        carbs_g=profile.carbs_g * 0.3,
        fat_g=profile.fat_g * 0.2,
        suggestions=get_meal_suggestions("breakfast", profile.diet_type, profile.allergies)
    ))
    
    # Lunch
    lunch_calories = profile.calories_target * 0.35
    meals.append(Meal(
        name="Balanced Lunch",
        time="12:30",
        calories=lunch_calories,
        protein_g=profile.protein_g * 0.4,
        carbs_g=profile.carbs_g * 0.4,
        fat_g=profile.fat_g * 0.4,
        suggestions=get_meal_suggestions("lunch", profile.diet_type, profile.allergies)
    ))
    
    # Dinner
    dinner_calories = profile.calories_target * 0.3
    meals.append(Meal(
        name="Light Dinner",
        time="19:00",
        calories=dinner_calories,
        protein_g=profile.protein_g * 0.25,
        carbs_g=profile.carbs_g * 0.2,
        fat_g=profile.fat_g * 0.3,
        suggestions=get_meal_suggestions("dinner", profile.diet_type, profile.allergies)
    ))
    
    # Snack
    snack_calories = profile.calories_target * 0.1
    meals.append(Meal(
        name="Healthy Snack",
        time="16:00",
        calories=snack_calories,
        protein_g=profile.protein_g * 0.1,
        carbs_g=profile.carbs_g * 0.1,
        fat_g=profile.fat_g * 0.1,
        suggestions=get_meal_suggestions("snack", profile.diet_type, profile.allergies)
    ))
    
    # Generate workout
    workout = generate_workout_plan(profile)
    
    # Sleep window
    sleep_window = {
        "start": profile.bed_time,
        "end": profile.wake_time
    }
    
    return DailyPlan(
        user_id=user_id,
        date=date,
        meals=meals,
        workout=workout,
        water_goal_ml=profile.hydration_target_ml,
        sleep_window=sleep_window,
        step_target=profile.step_target,
        calories_target=profile.calories_target,
        macros={
            "protein": profile.protein_g,
            "carbs": profile.carbs_g,
            "fat": profile.fat_g
        }
    )

def get_meal_suggestions(meal_type: str, diet_type: str, allergies: List[str]) -> List[str]:
    """Get meal suggestions based on diet type and allergies"""
    
    veg_meals = {
        "breakfast": ["Oats with fruits", "Poha with vegetables", "Upma with nuts", "Smoothie bowl"],
        "lunch": ["Dal-Chawal with vegetables", "Quinoa salad", "Vegetable curry with roti", "Paneer bhurji"],
        "dinner": ["Light dal with roti", "Vegetable soup", "Grilled paneer salad", "Curd rice"],
        "snack": ["Mixed nuts", "Fruit salad", "Yogurt with berries", "Sprouts chaat"]
    }
    
    non_veg_meals = {
        "breakfast": ["Egg omelette with toast", "Scrambled eggs", "Egg sandwich", "Protein smoothie"],
        "lunch": ["Grilled chicken with rice", "Fish curry with roti", "Chicken salad", "Egg curry"],
        "dinner": ["Grilled fish with vegetables", "Chicken soup", "Lean meat with salad", "Egg bhurji"],
        "snack": ["Boiled eggs", "Chicken strips", "Protein bar", "Greek yogurt"]
    }
    
    if diet_type in ["Vegetarian"]:
        suggestions = veg_meals.get(meal_type, [])
    elif diet_type in ["Non-veg"]:
        suggestions = non_veg_meals.get(meal_type, [])
    else:  # Balanced or others
        suggestions = veg_meals.get(meal_type, []) + non_veg_meals.get(meal_type, [])
    
    # Filter out allergens (simplified)
    if "dairy" in allergies:
        suggestions = [s for s in suggestions if not any(word in s.lower() for word in ["paneer", "curd", "yogurt"])]
    
    return suggestions[:4]  # Return top 4 suggestions

def generate_workout_plan(profile: UserProfile) -> Workout:
    """Generate workout plan based on profile"""
    
    equipment = profile.equipment_access
    goal = profile.primary_goal
    
    if equipment == "None":
        workout_type = "home"
        sections = [
            {"name": "Warmup", "exercises": ["Jumping jacks", "Arm circles"], "duration": 5},
            {"name": "Bodyweight", "exercises": ["Push-ups", "Squats", "Planks"], "sets": 3, "reps": "12-15"},
            {"name": "Cardio", "exercises": ["High knees", "Burpees"], "duration": 10}
        ]
        duration = 30
    elif equipment == "Full gym":
        workout_type = "gym"
        if goal == "Gain muscle":
            sections = [
                {"name": "Warmup", "exercises": ["Treadmill walk"], "duration": 5},
                {"name": "Compound", "exercises": ["Bench press", "Squats", "Deadlifts"], "sets": 4, "reps": "6-8"},
                {"name": "Accessories", "exercises": ["Bicep curls", "Tricep extensions"], "sets": 3, "reps": "10-12"}
            ]
        else:
            sections = [
                {"name": "Warmup", "exercises": ["Treadmill"], "duration": 5},
                {"name": "Cardio", "exercises": ["Running", "Cycling"], "duration": 20},
                {"name": "Strength", "exercises": ["Light weights"], "sets": 3, "reps": "12-15"}
            ]
        duration = 45
    else:  # Bands or Dumbbells
        workout_type = "home"
        sections = [
            {"name": "Warmup", "exercises": ["Dynamic stretching"], "duration": 5},
            {"name": "Resistance", "exercises": ["Band pulls", "Dumbbell rows"], "sets": 3, "reps": "10-12"},
            {"name": "Cardio", "exercises": ["Jump rope", "Mountain climbers"], "duration": 10}
        ]
        duration = 35
    
    return Workout(
        type=workout_type,
        duration_minutes=duration,
        sections=sections,
        calories_burned=duration * 5  # Rough estimate: 5 calories per minute
    )

# ==================== DAILY PLAN ENDPOINTS ====================

@api_router.get("/plans/today")
async def get_today_plan(request: Request):
    user = await get_current_user(request)
    
    from datetime import date
    today = date.today().strftime("%Y-%m-%d")
    
    plan = await db.daily_plans.find_one({"user_id": user["id"], "date": today})
    
    if not plan:
        # Generate plan if not exists
        profile = await db.profiles.find_one({"user_id": user["id"]})
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found. Please complete onboarding.")
        
        profile_obj = UserProfile(**profile)
        plan = await generate_daily_plan(user["id"], today, profile_obj)
        await db.daily_plans.insert_one(plan.dict())
        return plan.dict()
    
    return plan

@api_router.get("/plans/{date}")
async def get_plan_by_date(request: Request, date: str):
    user = await get_current_user(request)
    
    plan = await db.daily_plans.find_one({"user_id": user["id"], "date": date})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found for this date")
    
    return plan

# ==================== TASK ENDPOINTS ====================

@api_router.get("/tasks/today")
async def get_today_tasks(request: Request):
    user = await get_current_user(request)
    
    from datetime import date
    today = date.today().strftime("%Y-%m-%d")
    
    tasks = await db.tasks.find({"user_id": user["id"], "date": today}).to_list(100)
    
    if not tasks:
        # Generate tasks from today's plan
        plan = await db.daily_plans.find_one({"user_id": user["id"], "date": today})
        if plan:
            tasks = await generate_tasks_from_plan(plan, user["id"])
            if tasks:
                await db.tasks.insert_many([task.dict() for task in tasks])
                return [task.dict() for task in tasks]
    
    return tasks

@api_router.put("/tasks/{task_id}")
async def update_task(request: Request, task_id: str, task_update: TaskUpdate):
    user = await get_current_user(request)
    
    update_data = {"completed": task_update.completed}
    if task_update.completed:
        update_data["completed_at"] = datetime.now(timezone.utc)
    else:
        update_data["completed_at"] = None
    
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update progress if task completed
    if task_update.completed:
        await update_user_progress(user["id"], task_id)
    
    return {"message": "Task updated successfully"}

async def generate_tasks_from_plan(plan: dict, user_id: str) -> List[Task]:
    """Generate tasks from daily plan"""
    tasks = []
    date_str = plan["date"]
    
    # Meal tasks
    for i, meal in enumerate(plan["meals"]):
        task = Task(
            user_id=user_id,
            date=date_str,
            type="meal",
            title=f"{meal['name']} ({int(meal['calories'])} kcal)",
            due_at=datetime.strptime(f"{date_str} {meal['time']}", "%Y-%m-%d %H:%M")
        )
        tasks.append(task)
    
    # Workout task
    workout = plan["workout"]
    task = Task(
        user_id=user_id,
        date=date_str,
        type="workout",
        title=f"{workout['type'].title()} Workout ({workout['duration_minutes']} min)",
        due_at=datetime.strptime(f"{date_str} 18:00", "%Y-%m-%d %H:%M")  # Default evening workout
    )
    tasks.append(task)
    
    # Water task
    task = Task(
        user_id=user_id,
        date=date_str,
        type="water",
        title=f"Drink {int(plan['water_goal_ml'])}ml water",
        due_at=datetime.strptime(f"{date_str} 20:00", "%Y-%m-%d %H:%M")
    )
    tasks.append(task)
    
    # Sleep task
    task = Task(
        user_id=user_id,
        date=date_str,
        type="sleep",
        title=f"Sleep by {plan['sleep_window']['start']}",
        due_at=datetime.strptime(f"{date_str} {plan['sleep_window']['start']}", "%Y-%m-%d %H:%M")
    )
    tasks.append(task)
    
    return tasks

async def update_user_progress(user_id: str, task_id: str):
    """Update user progress based on completed task"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        return
    
    from datetime import date
    today = date.today().strftime("%Y-%m-%d")
    
    # Get or create progress document
    progress = await db.progress.find_one({"user_id": user_id, "date": today})
    if not progress:
        progress = Progress(user_id=user_id, date=today).dict()
        await db.progress.insert_one(progress)
    
    # Update based on task type
    update_data = {}
    
    if task["type"] == "meal":
        current_meals = progress.get("meals_completed", 0)
        update_data["meals_completed"] = current_meals + 1
    elif task["type"] == "workout":
        update_data["workouts_minutes"] = 30  # Default workout duration
    
    if update_data:
        await db.progress.update_one(
            {"user_id": user_id, "date": today},
            {"$set": update_data}
        )

# ==================== PROGRESS ENDPOINTS ====================

@api_router.get("/progress/summary")
async def get_progress_summary(request: Request):
    user = await get_current_user(request)
    
    from datetime import date, timedelta
    today = date.today()
    
    # Get last 7 days progress
    start_date = today - timedelta(days=6)
    
    progress_data = await db.progress.find({
        "user_id": user["id"],
        "date": {"$gte": start_date.strftime("%Y-%m-%d")}
    }).to_list(10)
    
    # Calculate streaks and stats
    total_workouts = sum(1 for p in progress_data if (p.get("workouts_minutes") or 0) > 0)
    total_meals = sum((p.get("meals_completed") or 0) for p in progress_data)
    avg_water = sum((p.get("water_ml") or 0) for p in progress_data) / max(len(progress_data), 1)
    
    return {
        "weekly_workouts": total_workouts,
        "total_meals_completed": total_meals,
        "avg_daily_water_ml": avg_water,
        "current_streak": 5,  # TODO: Calculate actual streak
        "max_streak": 12,  # TODO: Calculate from historical data
        "progress_data": progress_data
    }

@api_router.get("/profile")
async def get_user_profile(request: Request):
    user = await get_current_user(request)
    
    profile = await db.profiles.find_one({"user_id": user["id"]})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

# Include the router in the main app
app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)