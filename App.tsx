import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/features/auth/AuthProvider';
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
    <ThemeProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </ThemeProvider>
  );
}
