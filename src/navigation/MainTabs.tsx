import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MainScreen } from '@/features/main/MainScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder glyphs until the final tab bar design defines the icon set.
function TabIcon({ glyph }: { glyph: string }) {
  return <Text style={{ fontSize: 20 }}>{glyph}</Text>;
}

// Tab bar shown to signed-in users. Tabs are lazy: a screen (and its data fetch) only mounts the
// first time its tab is opened.
export function MainTabs() {
  const { t } = useTranslation();

  // Signed-in users can land here straight from the native splash, so make sure it is gone.
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Main"
        component={MainScreen}
        options={{
          title: t('company.title'),
          tabBarLabel: t('tabs.main'),
          tabBarIcon: () => <TabIcon glyph="🏠" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('profile.title'),
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: () => <TabIcon glyph="👤" />,
        }}
      />
    </Tab.Navigator>
  );
}
