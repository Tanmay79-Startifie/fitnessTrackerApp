import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Meal {
  name: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  suggestions: string[];
}

interface Workout {
  type: string;
  duration_minutes: number;
  sections: any[];
  calories_burned: number;
}

interface DailyPlan {
  date: string;
  meals: Meal[];
  workout: Workout;
  water_goal_ml: number;
  sleep_window: {
    start: string;
    end: string;
  };
  step_target: number;
  calories_target: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function Plans() {
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPlan();
  }, [selectedDate]);

  const loadPlan = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      
      if (!token) {
        router.replace('/auth/welcome');
        return;
      }

      const endpoint = selectedDate === new Date().toISOString().split('T')[0] 
        ? '/api/plans/today'
        : `/api/plans/${selectedDate}`;

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const plan = await response.json();
        setTodayPlan(plan);
      } else if (response.status === 404) {
        setTodayPlan(null);
      }
    } catch (error) {
      console.error('Plan load error:', error);
      Alert.alert('Error', 'Failed to load plan data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    
    if (dateStr === today) {
      return 'Today';
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getMacroPercentage = (current: number, total: number) => {
    return total > 0 ? Math.round((current / total) * 100) : 0;
  };

  const renderMealsSection = () => {
    if (!todayPlan?.meals) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        
        {todayPlan.meals.map((meal, index) => (
          <View key={index} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{formatTime(meal.time)}</Text>
              </View>
              <View style={styles.mealCalories}>
                <Text style={styles.caloriesValue}>{Math.round(meal.calories)}</Text>
                <Text style={styles.caloriesLabel}>kcal</Text>
              </View>
            </View>
            
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(meal.protein_g)}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(meal.carbs_g)}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(meal.fat_g)}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            
            {meal.suggestions && meal.suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                <View style={styles.suggestionsList}>
                  {meal.suggestions.slice(0, 3).map((suggestion, idx) => (
                    <View key={idx} style={styles.suggestionChip}>
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderWorkoutSection = () => {
    if (!todayPlan?.workout) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Workout</Text>
        
        <View style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <Ionicons name="fitness" size={24} color="#9B59B6" />
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>
                {todayPlan.workout.type.charAt(0).toUpperCase() + todayPlan.workout.type.slice(1)} Workout
              </Text>
              <Text style={styles.workoutDuration}>
                {todayPlan.workout.duration_minutes} minutes
              </Text>
            </View>
            <View style={styles.caloriesBurn}>
              <Text style={styles.burnValue}>{Math.round(todayPlan.workout.calories_burned)}</Text>
              <Text style={styles.burnLabel}>kcal burn</Text>
            </View>
          </View>
          
          {todayPlan.workout.sections && todayPlan.workout.sections.length > 0 && (
            <View style={styles.workoutSections}>
              {todayPlan.workout.sections.map((section, index) => (
                <View key={index} style={styles.sectionItem}>
                  <View style={styles.sectionBullet} />
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionName}>{section.name}</Text>
                    {section.exercises && (
                      <Text style={styles.sectionExercises}>
                        {section.exercises.join(', ')}
                      </Text>
                    )}
                    {section.duration && (
                      <Text style={styles.sectionDuration}>{section.duration} minutes</Text>
                    )}
                    {section.sets && section.reps && (
                      <Text style={styles.sectionDuration}>
                        {section.sets} sets × {section.reps} reps
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderNutritionSummary = () => {
    if (!todayPlan) return null;

    const totalCalories = todayPlan.calories_target;
    const proteinCalories = todayPlan.macros.protein * 4;
    const carbsCalories = todayPlan.macros.carbs * 4;
    const fatCalories = todayPlan.macros.fat * 9;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Summary</Text>
        
        <View style={styles.nutritionCard}>
          <View style={styles.caloriesTarget}>
            <Text style={styles.targetValue}>{Math.round(totalCalories)}</Text>
            <Text style={styles.targetLabel}>Daily Calories Target</Text>
          </View>
          
          <View style={styles.macroBreakdown}>
            <View style={styles.macroBar}>
              <View 
                style={[
                  styles.macroSegment, 
                  { backgroundColor: '#4CAF50', flex: proteinCalories }
                ]} 
              />
              <View 
                style={[
                  styles.macroSegment, 
                  { backgroundColor: '#2196F3', flex: carbsCalories }
                ]} 
              />
              <View 
                style={[
                  styles.macroSegment, 
                  { backgroundColor: '#FF9800', flex: fatCalories }
                ]} 
              />
            </View>
            
            <View style={styles.macroLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>
                  Protein {Math.round(todayPlan.macros.protein)}g
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.legendText}>
                  Carbs {Math.round(todayPlan.macros.carbs)}g
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.legendText}>
                  Fat {Math.round(todayPlan.macros.fat)}g
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderOtherGoals = () => {
    if (!todayPlan) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Other Goals</Text>
        
        <View style={styles.goalsGrid}>
          <View style={styles.goalCard}>
            <Ionicons name="water" size={24} color="#4A90E2" />
            <Text style={styles.goalValue}>
              {Math.round(todayPlan.water_goal_ml / 1000 * 10) / 10}L
            </Text>
            <Text style={styles.goalLabel}>Water</Text>
          </View>
          
          <View style={styles.goalCard}>
            <Ionicons name="walk" size={24} color="#50C878" />
            <Text style={styles.goalValue}>{todayPlan.step_target}</Text>
            <Text style={styles.goalLabel}>Steps</Text>
          </View>
          
          <View style={styles.goalCard}>
            <Ionicons name="moon" size={24} color="#6A5ACD" />
            <Text style={styles.goalValue}>
              {formatTime(todayPlan.sleep_window.start)}
            </Text>
            <Text style={styles.goalLabel}>Bedtime</Text>
          </View>
          
          <View style={styles.goalCard}>
            <Ionicons name="sunny" size={24} color="#FFD700" />
            <Text style={styles.goalValue}>
              {formatTime(todayPlan.sleep_window.end)}
            </Text>
            <Text style={styles.goalLabel}>Wake Up</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Daily Plan</Text>
          <Text style={styles.headerDate}>{formatDate(selectedDate)}</Text>
        </View>
        <TouchableOpacity style={styles.calendarButton}>
          <Ionicons name="calendar" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading plan...</Text>
          </View>
        ) : todayPlan ? (
          <>
            {renderNutritionSummary()}
            {renderMealsSection()}
            {renderWorkoutSection()}
            {renderOtherGoals()}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No plan available</Text>
            <Text style={styles.emptySubtitle}>
              Complete your onboarding to get personalized daily plans
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/onboarding')}
            >
              <Text style={styles.emptyButtonText}>Complete Setup</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
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
  headerDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  calendarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  nutritionCard: {
    alignItems: 'center',
  },
  caloriesTarget: {
    alignItems: 'center',
    marginBottom: 24,
  },
  targetValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
  },
  targetLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  macroBreakdown: {
    width: '100%',
  },
  macroBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  macroSegment: {
    height: '100%',
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
  mealCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  mealTime: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  mealCalories: {
    alignItems: 'center',
  },
  caloriesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  caloriesLabel: {
    fontSize: 10,
    color: '#666666',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  macroLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionChip: {
    backgroundColor: '#e8f4ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 10,
    color: '#007AFF',
  },
  workoutCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  workoutDuration: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  caloriesBurn: {
    alignItems: 'center',
  },
  burnValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9B59B6',
  },
  burnLabel: {
    fontSize: 10,
    color: '#666666',
  },
  workoutSections: {
    paddingLeft: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  sectionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginTop: 6,
    marginRight: 10,
  },
  sectionContent: {
    flex: 1,
  },
  sectionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  sectionExercises: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  sectionDuration: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  goalCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  goalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginVertical: 8,
  },
  goalLabel: {
    fontSize: 12,
    color: '#666666',
  },
});