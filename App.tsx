import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { Navigation } from '@/navigation/Navigation';

// Keep the native splash until WelcomeScreen (or the tabs) is on screen.
SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
