import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    meals: true,
    workouts: true,
    water: true,
    sleep: true,
    dailyPlan: true,
  });
  const router = useRouter();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
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

      // Load profile data
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
      }

    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePhotoUpdate = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        const token = await AsyncStorage.getItem('session_token');
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            photo_base64: base64,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setUser(prev => ({ ...prev, photo_url: data.photo_url }));
          
          // Update stored user data
          const updatedUser = { ...user, photo_url: data.photo_url };
          await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
          
          Alert.alert('Success', 'Profile photo updated successfully');
        } else {
          Alert.alert('Error', 'Failed to update profile photo');
        }
      }
    } catch (error) {
      console.error('Photo update error:', error);
      Alert.alert('Error', 'Failed to update profile photo');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('session_token');
              
              // Call logout API
              await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              // Clear local data
              await AsyncStorage.multiRemove(['session_token', 'user_data']);
              
              router.replace('/auth/welcome');
            } catch (error) {
              console.error('Logout error:', error);
              // Clear local data even if API call fails
              await AsyncStorage.multiRemove(['session_token', 'user_data']);
              router.replace('/auth/welcome');
            }
          },
        },
      ]
    );
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.photoContainer}
          onPress={handleProfilePhotoUpdate}
        >
          {user?.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={24} color="#007AFF" />
            </View>
          )}
          <View style={styles.photoEditIcon}>
            <Ionicons name="pencil" size={12} color="#ffffff" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.profileProvider}>
            {user?.auth_provider === 'google' ? 'Google Account' : 'Email Account'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStatsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Stats</Text>
      
      {profile && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={20} color="#4CAF50" />
            <Text style={styles.statValue}>{profile.bmi}</Text>
            <Text style={styles.statLabel}>BMI</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="flame" size={20} color="#FF6B35" />
            <Text style={styles.statValue}>{Math.round(profile.calories_target)}</Text>
            <Text style={styles.statLabel}>Daily Calories</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="barbell" size={20} color="#9B59B6" />
            <Text style={styles.statValue}>{profile.primary_goal}</Text>
            <Text style={styles.statLabel}>Goal</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="walk" size={20} color="#4A90E2" />
            <Text style={styles.statValue}>{profile.step_target}</Text>
            <Text style={styles.statLabel}>Daily Steps</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderNotificationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      
      <View style={styles.settingsList}>
        {Object.entries(notificationSettings).map(([key, value]) => (
          <View key={key} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons 
                name={getNotificationIcon(key)} 
                size={20} 
                color="#007AFF" 
                style={styles.settingIcon}
              />
              <Text style={styles.settingLabel}>
                {getNotificationLabel(key)}
              </Text>
            </View>
            <Switch
              value={value}
              onValueChange={(newValue) =>
                setNotificationSettings(prev => ({ ...prev, [key]: newValue }))
              }
              trackColor={{ false: '#f0f0f0', true: '#007AFF' }}
              thumbColor="#ffffff"
            />
          </View>
        ))}
      </View>
    </View>
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meals': return 'restaurant';
      case 'workouts': return 'fitness';
      case 'water': return 'water';
      case 'sleep': return 'moon';
      case 'dailyPlan': return 'calendar';
      default: return 'notifications';
    }
  };

  const getNotificationLabel = (type: string) => {
    switch (type) {
      case 'meals': return 'Meal Reminders';
      case 'workouts': return 'Workout Reminders';
      case 'water': return 'Water Reminders';
      case 'sleep': return 'Sleep Reminders';
      case 'dailyPlan': return 'Daily Plan Ready';
      default: return 'Notifications';
    }
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
        >
          <Ionicons name="create" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        {renderStatsSection()}
        {renderNotificationSection()}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => router.push('/progress')}
          >
            <Ionicons name="analytics" size={20} color="#007AFF" />
            <Text style={styles.actionText}>View Progress</Text>
            <Ionicons name="chevron-forward" size={16} color="#999999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => Alert.alert('Coming Soon', 'Data export will be available soon')}
          >
            <Ionicons name="download" size={20} color="#007AFF" />
            <Text style={styles.actionText}>Export Data</Text>
            <Ionicons name="chevron-forward" size={16} color="#999999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionItem, styles.dangerAction]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#FF3B30" />
            <Text style={[styles.actionText, styles.dangerText]}>Logout</Text>
            <Ionicons name="chevron-forward" size={16} color="#999999" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FitTracker v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for your health</Text>
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
  editButton: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  photoEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  profileProvider: {
    fontSize: 12,
    color: '#007AFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  settingsList: {
    marginTop: -8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
    marginLeft: 12,
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF3B30',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
});