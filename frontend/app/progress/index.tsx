import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Progress() {
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      
      if (!token) {
        router.replace('/auth/welcome');
        return;
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/progress/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      }
    } catch (error) {
      console.error('Progress load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
    setRefreshing(false);
  };

  const renderStatsCards = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>This Week</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="fitness" size={24} color="#9B59B6" />
          <Text style={styles.statValue}>{progressData?.weekly_workouts || 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="restaurant" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{progressData?.total_meals_completed || 0}</Text>
          <Text style={styles.statLabel}>Meals</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="water" size={24} color="#4A90E2" />
          <Text style={styles.statValue}>
            {Math.round((progressData?.avg_daily_water_ml || 0) / 1000 * 10) / 10}L
          </Text>
          <Text style={styles.statLabel}>Avg Water</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="flame" size={24} color="#FF6B35" />
          <Text style={styles.statValue}>{progressData?.current_streak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>
    </View>
  );

  const renderStreakSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      
      <View style={styles.achievementCard}>
        <View style={styles.achievementIcon}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
        </View>
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementTitle}>Current Streak</Text>
          <Text style={styles.achievementValue}>
            {progressData?.current_streak || 0} days
          </Text>
          <Text style={styles.achievementDesc}>
            Keep it up! Your longest streak is {progressData?.max_streak || 0} days
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.comingSoonCard}>
        <Ionicons name="analytics" size={24} color="#666666" />
        <View style={styles.comingSoonContent}>
          <Text style={styles.comingSoonTitle}>Detailed Analytics</Text>
          <Text style={styles.comingSoonDesc}>
            Charts and detailed progress tracking coming soon
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999999" />
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.placeholder} />
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
            <Text style={styles.loadingText}>Loading progress...</Text>
          </View>
        ) : (
          <>
            {renderStatsCards()}
            {renderStreakSection()}
          </>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  placeholder: {
    width: 40,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff3cd',
  },
  achievementIcon: {
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  achievementValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  comingSoonContent: {
    flex: 1,
    marginLeft: 12,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  comingSoonDesc: {
    fontSize: 14,
    color: '#666666',
  },
});