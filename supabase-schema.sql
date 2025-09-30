-- Supabase database schema for AI Fitness Tracker

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (connected to auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    gender TEXT,
    age_group TEXT,
    height_cm REAL,
    weight_kg REAL,
    bmi REAL,
    activity_level TEXT,
    diet_type TEXT,
    allergies TEXT[],
    smoking_alcohol TEXT,
    stress_level TEXT,
    primary_goal TEXT,
    equipment_access TEXT,
    wake_time TEXT,
    bed_time TEXT,
    training_days TEXT[],
    preferred_workout_time TEXT,
    cuisine_preference TEXT,
    bmr REAL,
    tdee REAL,
    calories_target REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    hydration_target_ml REAL,
    sleep_target_hrs REAL,
    step_target INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_plans table
CREATE TABLE daily_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    meals JSONB,
    workout JSONB,
    water_goal_ml REAL,
    sleep_window JSONB,
    step_target INTEGER,
    calories_target REAL,
    macros JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    due_at TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress table
CREATE TABLE progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    weight_kg REAL,
    steps INTEGER,
    water_ml REAL,
    workouts_minutes INTEGER,
    meals_completed INTEGER,
    fitness_score REAL,
    streak_current INTEGER DEFAULT 0,
    streak_max INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view and update their own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- RLS Policies for daily_plans
CREATE POLICY "Users can view and update their own plans" ON daily_plans
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Users can view and update their own tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for progress
CREATE POLICY "Users can view and update their own progress" ON progress
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, date);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, date);
CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed);
CREATE INDEX idx_progress_user_date ON progress(user_id, date);

-- Insert seed data (optional - remove in production)
-- This creates some sample meal and workout templates