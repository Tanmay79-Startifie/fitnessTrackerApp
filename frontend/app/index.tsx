import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Index() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for existing session token
      const token = await AsyncStorage.getItem('session_token');
      
      if (token) {
        // Verify token with backend
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          
          // Check onboarding status
          const onboardingResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/onboarding/status`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (onboardingResponse.ok) {
            const onboardingStatus = await onboardingResponse.json();
            
            if (onboardingStatus.completed) {
              router.replace('/dashboard');
            } else {
              router.replace('/onboarding');
            }
          } else {
            router.replace('/onboarding');
          }
        } else {
          // Invalid token, clear it
          await AsyncStorage.removeItem('session_token');
          router.replace('/auth/welcome');
        }
      } else {
        // Check for Google OAuth session in URL
        if (typeof window !== 'undefined') {
          const urlFragment = window.location.hash;
          if (urlFragment.includes('session_id=')) {
            const sessionId = urlFragment.split('session_id=')[1].split('&')[0];
            await processGoogleSession(sessionId);
            return;
          }
        }
        
        // No session, go to welcome
        router.replace('/auth/welcome');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      Alert.alert('Error', 'Failed to check authentication status');
      router.replace('/auth/welcome');
    } finally {
      setLoading(false);
    }
  };

  const processGoogleSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/google/session`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store user data and token
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        // The session token is set as httpOnly cookie by backend
        // For mobile, we'll use a different approach
        await AsyncStorage.setItem('session_token', sessionId);
        
        // Clean URL
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Check onboarding status
        const onboardingResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/onboarding/status`, {
          headers: {
            'X-Session-ID': sessionId
          }
        });
        
        if (onboardingResponse.ok) {
          const onboardingStatus = await onboardingResponse.json();
          
          if (onboardingStatus.completed) {
            router.replace('/dashboard');
          } else {
            router.replace('/onboarding');
          }
        } else {
          router.replace('/onboarding');
        }
      } else {
        throw new Error('Failed to process Google session');
      }
    } catch (error) {
      console.error('Google session error:', error);
      Alert.alert('Error', 'Failed to sign in with Google');
      router.replace('/auth/welcome');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // This should not be reached as router.replace is called in checkAuthStatus
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  text: {
    fontSize: 16,
    color: '#666666',
  },
});