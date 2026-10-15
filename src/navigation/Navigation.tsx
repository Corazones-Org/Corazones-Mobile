import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/features/auth/AuthProvider';
import { WelcomeScreen } from '@/features/welcome/WelcomeScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

// Which screens exist depends on the session, so signing in or out switches screens by itself
// (no manual navigate/redirect calls). While the stored session loads the user stays on the
// welcome screen, which is what the native splash hands off to.
export function Navigation() {
  const { status } = useAuth();

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'signedIn' ? (
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
