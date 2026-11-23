import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Image, LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import { useGoogleSignIn } from '@/features/auth/useGoogleSignIn';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { useTheme } from '@/theme/ThemeProvider';
import {
  SPLASH_IMAGE_SIZE,
  WELCOME_GRADIENT_COLORS,
  WELCOME_GRADIENT_LOCATIONS,
} from './constants';
import { WelcomeDivider } from './WelcomeDivider';

// First screen of the app. While the session (or a signed-in profile) loads it is only the heart,
// in the same spot as the native splash, so the handoff is invisible and the person sees one splash
// with the icon alone. Once the person is known to be signed out it turns into the sign-in page:
// heart and wordmark, then a divider and the Google button, centered vertically as one block. A
// signed-in person never sees that page: the navigation moves on to the app instead.
// Replaces the native splash once it is laid out.
export function WelcomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { status } = useAuth();
  const { signIn, error } = useGoogleSignIn();

  const hideNativeSplash = useCallback(() => SplashScreen.hide(), []);
  const signedOut = status === 'signedOut';

  // Lags `signedOut` by one render so the change can be animated: the heart glides up and the
  // sign-in block fades in, instead of jumping.
  const [showSignIn, setShowSignIn] = useState(signedOut);
  useEffect(() => {
    if (signedOut !== showSignIn) {
      LayoutAnimation.configureNext(LayoutAnimation.create(300, 'easeInEaseOut', 'opacity'));
      setShowSignIn(signedOut);
    }
  }, [signedOut, showSignIn]);

  return (
    <View testID="welcome-screen" style={styles.container} onLayout={hideNativeSplash}>
      <LinearGradient
        colors={WELCOME_GRADIENT_COLORS}
        locations={WELCOME_GRADIENT_LOCATIONS}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View testID="welcome-content" style={[styles.content, { paddingHorizontal: theme.spacing[6] }]}>
        <Image
          testID="welcome-heart"
          source={require('../../../assets/splash-icon.png')}
          style={styles.heart}
          resizeMode="contain"
        />
        {showSignIn ? (
          <>
            <Text
              style={[
                styles.wordmark,
                { color: theme.colors.onPhoto, fontFamily: theme.typography.body.fontFamily },
              ]}
            >
              {t('company.title')}
            </Text>
            <View
              style={[
                styles.dividerSlot,
                { marginTop: theme.spacing[8], paddingHorizontal: theme.spacing[8] + theme.spacing[2] },
              ]}
            >
              <WelcomeDivider />
            </View>
            <View style={[styles.buttonSlot, { marginTop: theme.spacing[8] }]}>
              <GoogleSignInButton onPress={signIn} />
              {error ? (
                <Text
                  style={[
                    styles.error,
                    { color: theme.colors.onPhoto, fontFamily: theme.typography.caption.fontFamily },
                  ]}
                >
                  {error}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
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
    fontSize: 28,
    letterSpacing: 10,
    textTransform: 'uppercase',
  },
  dividerSlot: {
    alignSelf: 'stretch',
  },
  buttonSlot: {
    alignSelf: 'stretch',
  },
  error: {
    marginTop: 12,
    textAlign: 'center',
  },
});
