import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function Welcome() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      console.log('Google sign-in initiated:', data);
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    router.push('/auth/login');
  };

  const handleEmailSignUp = () => {
    router.push('/auth/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="fitness" size={48} color="#007AFF" />
          <Text style={styles.logoText}>FitTracker</Text>
        </View>
        <Text style={styles.subtitle}>
          Your personal fitness companion for a healthier lifestyle
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="analytics" size={24} color="#007AFF" />
          <Text style={styles.featureText}>Track your daily progress</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="restaurant" size={24} color="#007AFF" />
          <Text style={styles.featureText}>Personalized meal plans</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="barbell" size={24} color="#007AFF" />
          <Text style={styles.featureText}>Custom workout routines</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="notifications" size={24} color="#007AFF" />
          <Text style={styles.featureText}>Smart reminders</Text>
        </View>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.googleButton]} 
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#ffffff" />
              <Text style={[styles.buttonText, styles.googleButtonText]}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.emailButton]} 
          onPress={handleEmailSignIn}
        >
          <Ionicons name="mail" size={20} color="#007AFF" />
          <Text style={[styles.buttonText, styles.emailButtonText]}>
            Sign In with Email
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton} 
          onPress={handleEmailSignUp}
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  authButtons: {
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 8,
  },
  googleButton: {
    backgroundColor: '#4285f4',
  },
  emailButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  googleButtonText: {
    color: '#ffffff',
  },
  emailButtonText: {
    color: '#007AFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 16,
  },
  linkButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666666',
  },
  linkTextBold: {
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
  },
});