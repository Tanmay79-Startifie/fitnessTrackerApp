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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Task {
  id: string;
  type: string;
  title: string;
  due_at: string;
  completed: boolean;
  completed_at?: string;
}

interface DailyPlan {
  date: string;
  meals: any[];
  workout: any;
  water_goal_ml: number;
  calories_target: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressAnimation] = useState(new Animated.Value(0));
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (userData) {
        setUser(JSON.parse(userData));
      }

      if (!token) {
        router.replace('/auth/welcome');
        return;
      }

      // Load today's plan and tasks
      await Promise.all([
        loadTodayPlan(token),
        loadTodayTasks(token),
      ]);

    } catch (error) {
      console.error('Dashboard load error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayPlan = async (token: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/plans/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const plan = await response.json();
        setTodayPlan(plan);
      }
    } catch (error) {
      console.error('Plan load error:', error);
    }
  };

  const loadTodayTasks = async (token: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData);
        
        // Animate progress
        const completedCount = tasksData.filter((t: Task) => t.completed).length;
        const progress = tasksData.length > 0 ? completedCount / tasksData.length : 0;
        
        Animated.timing(progressAnimation, {
          toValue: progress,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      console.error('Tasks load error:', error);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, completed, completed_at: completed ? new Date().toISOString() : undefined }
            : task
        ));
        
        // Update progress animation
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? { ...task, completed } : task
        );
        const completedCount = updatedTasks.filter(t => t.completed).length;
        const progress = updatedTasks.length > 0 ? completedCount / updatedTasks.length : 0;
        
        Animated.timing(progressAnimation, {
          toValue: progress,
          duration: 300,
          useNativeDriver: false,
        }).start();
      } else {
        Alert.alert('Error', 'Failed to update task');
      }
    } catch (error) {
      console.error('Task update error:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getNextTask = () => {
    const incompleteTasks = tasks.filter(t => !t.completed);
    if (incompleteTasks.length === 0) return null;
    
    // Sort by due time
    return incompleteTasks.sort((a, b) => 
      new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    )[0];
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'meal': return 'restaurant';
      case 'workout': return 'fitness';
      case 'water': return 'water';
      case 'sleep': return 'moon';
      default: return 'checkmark-circle';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const nextTask = getNextTask();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Ring */}
        <View style={styles.progressSection}>
          <View style={styles.progressRingContainer}>
            <View style={styles.progressRing}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    transform: [{
                      rotate: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    }],
                  },
                ]}
              />
              <View style={styles.progressInner}>
                <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                <Text style={styles.progressLabel}>Complete</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedTasks}</Text>
              <Text style={styles.statLabel}>Tasks Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalTasks - completedTasks}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>
        </View>

        {/* Next Task CTA */}
        {nextTask && (
          <TouchableOpacity 
            style={styles.nextTaskCard}
            onPress={() => toggleTask(nextTask.id, true)}
          >
            <View style={styles.nextTaskHeader}>
              <Ionicons name={getTaskIcon(nextTask.type)} size={24} color="#007AFF" />
              <Text style={styles.nextTaskTitle}>Next Task</Text>
              <Text style={styles.nextTaskTime}>{formatTime(nextTask.due_at)}</Text>
            </View>
            <Text style={styles.nextTaskDescription}>{nextTask.title}</Text>
            <View style={styles.nextTaskAction}>
              <Text style={styles.nextTaskActionText}>Tap to complete</Text>
              <Ionicons name="chevron-forward" size={20} color="#007AFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Today's Summary */}
        {todayPlan && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Today's Targets</Text>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Ionicons name="flame" size={20} color="#FF6B35" />
                <Text style={styles.summaryValue}>
                  {Math.round(todayPlan.calories_target)}
                </Text>
                <Text style={styles.summaryLabel}>Calories</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Ionicons name="water" size={20} color="#4A90E2" />
                <Text style={styles.summaryValue}>
                  {Math.round(todayPlan.water_goal_ml / 1000 * 10) / 10}L
                </Text>
                <Text style={styles.summaryLabel}>Water</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Ionicons name="nutrition" size={20} color="#50C878" />
                <Text style={styles.summaryValue}>
                  {Math.round(todayPlan.macros.protein)}g
                </Text>
                <Text style={styles.summaryLabel}>Protein</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Ionicons name="fitness" size={20} color="#9B59B6" />
                <Text style={styles.summaryValue}>
                  {todayPlan.workout?.duration_minutes || 30}
                </Text>
                <Text style={styles.summaryLabel}>Workout</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                task.completed && styles.taskCardCompleted,
              ]}
              onPress={() => toggleTask(task.id, !task.completed)}
            >
              <View style={styles.taskLeft}>
                <View
                  style={[
                    styles.taskCheckbox,
                    task.completed && styles.taskCheckboxCompleted,
                  ]}
                >
                  {task.completed && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <View style={styles.taskInfo}>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.completed && styles.taskTitleCompleted,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text style={styles.taskTime}>{formatTime(task.due_at)}</Text>
                </View>
              </View>
              <Ionicons 
                name={getTaskIcon(task.type)} 
                size={20} 
                color={task.completed ? '#4CAF50' : '#007AFF'} 
              />
            </TouchableOpacity>
          ))}
          
          {tasks.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar" size={48} color="#E0E0E0" />
              <Text style={styles.emptyStateText}>No tasks for today</Text>
              <Text style={styles.emptyStateSubtext}>
                Complete your onboarding to see personalized tasks
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/plans')}
            >
              <Ionicons name="calendar" size={24} color="#007AFF" />
              <Text style={styles.actionText}>View Plans</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/progress')}
            >
              <Ionicons name="analytics" size={24} color="#007AFF" />
              <Text style={styles.actionText}>Progress</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="settings" size={24} color="#007AFF" />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#666666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  progressSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  progressRingContainer: {
    marginBottom: 24,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#007AFF',
    transform: [{ rotate: '-90deg' }],
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666666',
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  nextTaskCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e8f4ff',
  },
  nextTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
    flex: 1,
  },
  nextTaskTime: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  nextTaskDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  nextTaskAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  nextTaskActionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
  },
  tasksSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 2,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999999',
  },
  taskTime: {
    fontSize: 12,
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  quickActions: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
});