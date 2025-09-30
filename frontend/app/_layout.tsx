import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/welcome" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="dashboard/index" />
        <Stack.Screen name="profile/index" />
        <Stack.Screen name="plans/index" />
        <Stack.Screen name="progress/index" />
      </Stack>
    </AuthProvider>
  );
}