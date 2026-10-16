import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/Toast/ToastProvider';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { EditInterestsScreen } from '@/features/profile/EditInterestsScreen';
import { EditOutingTypesScreen } from '@/features/profile/EditOutingTypesScreen';
import { useProfile } from '@/features/profile/ProfileProvider';
import { WelcomeScreen } from '@/features/welcome/WelcomeScreen';
import { MainTabs } from './MainTabs';
import { OnboardingStack } from './OnboardingStack';
import type { RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

// The gate: which screen exists depends on the session and the profile, so signing in, signing
// out or finishing onboarding switches screens by itself (no manual navigate/redirect calls).
//  - signed out, or signed in while the profile loads: welcome (what the native splash hands off to)
//  - profile could not be loaded: a toast, and the user is signed out (back to welcome). Errors are
//    never a screen of their own.
//  - onboarding not done: onboarding; done: the app (the tabs, plus the interests and outing-type screens on top)
export function Navigation() {
  const { t } = useTranslation();
  const { show } = useToast();
  const { status: authStatus } = useAuth();
  const profile = useProfile();

  const profileFailed = authStatus === 'signedIn' && profile.status === 'error';
  useEffect(() => {
    if (!profileFailed) {
      return;
    }
    show({
      tone: 'error',
      title: t('profile.loadErrorTitle'),
      message: t('profile.loadErrorMessage'),
    });
    signOut().catch((error) => console.error('Sign-out after profile error failed:', error));
  }, [profileFailed, show, t]);

  let screen;
  if (authStatus !== 'signedIn' || profile.status !== 'ready') {
    screen = <RootStack.Screen name="Welcome" component={WelcomeScreen} />;
  } else if (!profile.profile.onboardingComplete) {
    screen = <RootStack.Screen name="Onboarding" component={OnboardingStack} />;
  } else {
    // The picker screens sit on top of the tabs (no tab bar), so it only exists for finished profiles.
    screen = (
      <>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="EditInterests" component={EditInterestsScreen} />
        <RootStack.Screen name="EditOutingTypes" component={EditOutingTypesScreen} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>{screen}</RootStack.Navigator>
    </NavigationContainer>
  );
}
