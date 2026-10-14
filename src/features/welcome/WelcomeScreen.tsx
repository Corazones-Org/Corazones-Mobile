import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import { useGoogleSignIn } from '@/features/auth/useGoogleSignIn';
import {
  SPLASH_IMAGE_SIZE,
  WELCOME_GRADIENT_COLORS,
  WELCOME_GRADIENT_LOCATIONS,
} from './constants';

// First screen of the app. It shows the same heart as the native splash in the same spot, so the
// splash "turns into" this screen: the wordmark is already here and the sign-in button fades in
// once we know the user is signed out. Replaces the native splash once it is laid out.
export function WelcomeScreen() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { signIn } = useGoogleSignIn();
  const [error, setError] = useState<string | null>(null);

  const hideNativeSplash = useCallback(() => SplashScreen.hide(), []);

  const handleSignIn = async () => {
    setError(null);
    try {
      const { error: signInError } = await signIn();
      if (signInError) {
        console.error('Google sign-in error:', signInError);
        setError(t('auth.genericError'));
      }
    } catch (unexpectedError) {
      console.error('Unexpected sign-in error:', unexpectedError);
      setError(t('auth.genericError'));
    }
  };

  return (
    <View testID="welcome-screen" style={styles.container} onLayout={hideNativeSplash}>
      <LinearGradient
        colors={WELCOME_GRADIENT_COLORS}
        locations={WELCOME_GRADIENT_LOCATIONS}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        testID="welcome-heart"
        source={require('../../../assets/splash-icon.png')}
        style={styles.heart}
        resizeMode="contain"
      />
      <Text style={styles.wordmark}>{t('company.title')}</Text>

      {status === 'signedOut' ? (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={handleSignIn}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>{t('auth.signInWithGoogle')}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    width: SPLASH_IMAGE_SIZE,
    height: SPLASH_IMAGE_SIZE,
  },
  wordmark: {
    position: 'absolute',
    top: '50%',
    marginTop: 84,
    paddingLeft: 10, // balances the trailing letterSpacing so the word looks centered
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 10,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 56,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#CF3B57',
    fontSize: 17,
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    color: '#fff',
    textAlign: 'center',
  },
});
