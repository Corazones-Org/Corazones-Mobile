import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { AuthGate } from '@/features/auth/AuthGate';
import { WelcomeScreen } from '@/features/welcome/WelcomeScreen';

// Keep the native splash until WelcomeScreen (or the signed-in screen) is on screen.
SplashScreen.preventAutoHideAsync();

// Placeholder for the signed-in experience until navigation / Profile land.
function SignedIn() {
  const { t } = useTranslation();

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('company.title')}</Text>
      <AuthGate />
      <StatusBar style="auto" />
    </View>
  );
}

function Root() {
  const { status } = useAuth();

  return status === 'signedIn' ? <SignedIn /> : <WelcomeScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
