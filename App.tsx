import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast/ToastProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ProfileProvider } from '@/features/profile/ProfileProvider';
import { Navigation } from '@/navigation/Navigation';
import { useAppFonts } from '@/theme/fonts';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Keep the native splash until WelcomeScreen (or the tabs) is on screen.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const fontsReady = useAppFonts();

  // Nothing is drawn before the fonts are ready, so text never flashes in the system font; the
  // native splash is still up meanwhile.
  if (!fontsReady) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ProfileProvider>
              <Navigation />
            </ProfileProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
