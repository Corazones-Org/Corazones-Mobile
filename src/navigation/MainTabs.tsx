import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { MainScreen } from '@/features/main/MainScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { MainTabBar } from './MainTabBar';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar shown to signed-in users. Tabs are lazy: a screen (and its data fetch) only mounts the
// first time its tab is opened.
export function MainTabs() {
  const { t } = useTranslation();

  // Signed-in users can land here straight from the native splash, so make sure it is gone.
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <Tab.Navigator tabBar={(props) => <MainTabBar {...props} />}>
      <Tab.Screen
        name="Main"
        component={MainScreen}
        options={{
          title: t('company.title'),
          tabBarLabel: t('tabs.main'),
          // The screen scrolls its own content from the top, without a navigator header.
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('profile.title'),
          tabBarLabel: t('tabs.profile'),
          // The screen draws its own top bar (title and autosave status).
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
