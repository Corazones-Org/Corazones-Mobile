import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import { useGoogleSignIn } from '@/features/auth/useGoogleSignIn';
import { GOOGLE_BUTTON_HEIGHT, GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import {
  DIVIDER_HEIGHT,
  SIGN_IN_BLOCK_GAP,
  SPLASH_IMAGE_SIZE,
  WELCOME_GRADIENT_COLORS,
  WELCOME_GRADIENT_LOCATIONS,
} from './constants';
import { WelcomeDivider } from './WelcomeDivider';

// First screen of the app: heart and wordmark, then a divider and the Google button, stacked and
// centered vertically as one block. The block's height is reserved while the session loads, so
// nothing moves when the sign-in button appears. Replaces the native splash once it is laid out.
export function WelcomeScreen() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { signIn, error } = useGoogleSignIn();

  const hideNativeSplash = useCallback(() => SplashScreen.hide(), []);
  const signedOut = status === 'signedOut';

  return (
    <View testID="welcome-screen" style={styles.container} onLayout={hideNativeSplash}>
      <LinearGradient
        colors={WELCOME_GRADIENT_COLORS}
        locations={WELCOME_GRADIENT_LOCATIONS}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View testID="welcome-content" style={styles.content}>
        <Image
          testID="welcome-heart"
          source={require('../../../assets/splash-icon.png')}
          style={styles.heart}
          resizeMode="contain"
        />
        <Text style={styles.wordmark}>{t('company.title')}</Text>

        {signedOut ? (
          <>
            <View style={styles.dividerSlot}>
              <WelcomeDivider />
            </View>
            <View style={styles.buttonSlot}>
              <GoogleSignInButton onPress={signIn} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </>
        ) : (
          <View style={styles.reservedSpace} />
        )}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // The heart image has transparent margins; pull them in so the logo block looks balanced.
  heart: {
    width: SPLASH_IMAGE_SIZE,
    height: SPLASH_IMAGE_SIZE,
    marginTop: -60,
    marginBottom: -60,
  },
  wordmark: {
    paddingLeft: 10, // balances the trailing letterSpacing so the word looks centered
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 10,
    textTransform: 'uppercase',
  },
  dividerSlot: {
    alignSelf: 'stretch',
    marginTop: SIGN_IN_BLOCK_GAP,
    paddingHorizontal: 40,
  },
  buttonSlot: {
    alignSelf: 'stretch',
    marginTop: SIGN_IN_BLOCK_GAP,
  },
  reservedSpace: {
    height: SIGN_IN_BLOCK_GAP * 2 + DIVIDER_HEIGHT + GOOGLE_BUTTON_HEIGHT,
  },
  error: {
    marginTop: 12,
    color: '#fff',
    textAlign: 'center',
  },
});
