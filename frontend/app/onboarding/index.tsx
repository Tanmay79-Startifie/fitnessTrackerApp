import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

// Import section components
import BasicInfoSection from './sections/BasicInfoSection';
import LifestyleSection from './sections/LifestyleSection';
import NutritionSection from './sections/NutritionSection';
import FitnessGoalSection from './sections/FitnessGoalSection';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface OnboardingData {
  // Section 1: Basic Info
  fullName: string;
  ageGroup: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  
  // Section 2: Lifestyle & Activity
  activityLevel: string;
  stepsPerDay: string;
  exerciseFrequency: string;
  sleepHours: string;
  waterIntake: string;
  
  // Section 3: Nutrition & Habits
  dietType: string;
  fruitsVegetables: string;
  smokingAlcohol: string;
  stressLevel: string;
  allergies: string[];
  cuisinePreference: string;
  
  // Section 4: Fitness Goal
  primaryGoal: string;
  equipmentAccess: string;
  preferredWorkoutTime: string;
  wakeTime: string;
  bedTime: string;
  trainingDays: string[];
}

const initialData: OnboardingData = {
  fullName: '',
  ageGroup: '',
  gender: '',
  heightCm: 0,
  weightKg: 0,
  activityLevel: '',
  stepsPerDay: '',
  exerciseFrequency: '',
  sleepHours: '',
  waterIntake: '',
  dietType: '',
  fruitsVegetables: '',
  smokingAlcohol: '',
  stressLevel: '',
  allergies: [],
  cuisinePreference: 'Mixed',
  primaryGoal: '',
  equipmentAccess: '',
  preferredWorkoutTime: '',
  wakeTime: '',
  bedTime: '',
  trainingDays: [],
};

export default function OnboardingWizard() {
  const [currentSection, setCurrentSection] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sections = [
    { title: 'Basic Info', component: BasicInfoSection },
    { title: 'Lifestyle', component: LifestyleSection },
    { title: 'Nutrition', component: NutritionSection },
    { title: 'Fitness Goals', component: FitnessGoalSection },
  ];

  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const validateCurrentSection = () => {
    switch (currentSection) {
      case 0: // Basic Info
        if (!data.fullName || !data.ageGroup || !data.gender || !data.heightCm || !data.weightKg) {
          Alert.alert('Incomplete', 'Please fill in all basic information fields');
          return false;
        }
        break;
      case 1: // Lifestyle
        if (!data.activityLevel || !data.stepsPerDay || !data.exerciseFrequency || !data.sleepHours || !data.waterIntake) {
          Alert.alert('Incomplete', 'Please answer all lifestyle questions');
          return false;
        }
        break;
      case 2: // Nutrition
        if (!data.dietType || !data.fruitsVegetables || !data.smokingAlcohol || !data.stressLevel) {
          Alert.alert('Incomplete', 'Please answer all nutrition and habit questions');
          return false;
        }
        break;
      case 3: // Fitness Goals
        if (!data.primaryGoal || !data.equipmentAccess || !data.preferredWorkoutTime || !data.wakeTime || !data.bedTime || data.trainingDays.length === 0) {
          Alert.alert('Incomplete', 'Please complete all fitness goal settings');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentSection()) return;
    
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    console.log('=== ONBOARDING SUBMIT STARTED ===');
    console.log('Current data:', data);
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('session_token');
      console.log('Token found:', !!token);
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const onboardingPayload = {
        full_name: data.fullName,
        age_group: data.ageGroup,
        gender: data.gender,
        height_cm: data.heightCm,
        weight_kg: data.weightKg,
        activity_level: data.activityLevel,
        steps_per_day: data.stepsPerDay,
        exercise_frequency: data.exerciseFrequency,
        sleep_hours: data.sleepHours,
        water_intake: data.waterIntake,
        diet_type: data.dietType,
        fruits_vegetables: data.fruitsVegetables,
        smoking_alcohol: data.smokingAlcohol,
        stress_level: data.stressLevel,
        allergies: data.allergies,
        cuisine_preference: data.cuisinePreference,
        primary_goal: data.primaryGoal,
        equipment_access: data.equipmentAccess,
        preferred_workout_time: data.preferredWorkoutTime,
        wake_time: data.wakeTime,
        bed_time: data.bedTime,
        training_days: data.trainingDays,
      };

      console.log('Onboarding payload:', onboardingPayload);
      console.log('API URL:', `${EXPO_PUBLIC_BACKEND_URL}/api/onboarding`);

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(onboardingPayload),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);

      if (response.ok) {
        console.log('Onboarding successful, navigating to dashboard...');
        Alert.alert(
          'Profile Complete!',
          'Your personalized fitness plan is ready.',
          [
            {
              text: 'Get Started',
              onPress: () => {
                console.log('Navigating to dashboard...');
                router.replace('/dashboard');
              },
            },
          ]
        );
      } else {
        throw new Error(result.detail || 'Failed to save onboarding data');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', error.message || 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CurrentSectionComponent = sections[currentSection].component;
  const isLastSection = currentSection === sections.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Setup Profile</Text>
          <Text style={styles.headerSubtitle}>
            Step {currentSection + 1} of {sections.length}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentSection + 1) / sections.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {/* Section Indicators */}
      <View style={styles.sectionIndicators}>
        {sections.map((section, index) => (
          <View key={index} style={styles.sectionIndicator}>
            <View
              style={[
                styles.sectionDot,
                index <= currentSection ? styles.sectionDotActive : styles.sectionDotInactive,
              ]}
            />
            <Text
              style={[
                styles.sectionLabel,
                index <= currentSection ? styles.sectionLabelActive : styles.sectionLabelInactive,
              ]}
            >
              {section.title}
            </Text>
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CurrentSectionComponent data={data} updateData={updateData} />
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {isLastSection ? 'Complete Setup' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  sectionIndicators: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionIndicator: {
    flex: 1,
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  sectionDotActive: {
    backgroundColor: '#007AFF',
  },
  sectionDotInactive: {
    backgroundColor: '#e0e0e0',
  },
  sectionLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  sectionLabelActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  sectionLabelInactive: {
    color: '#999999',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  navigation: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});