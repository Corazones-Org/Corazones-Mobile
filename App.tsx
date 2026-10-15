import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { SignedInScreen } from '@/features/profile/SignedInScreen';
import { WelcomeScreen } from '@/features/welcome/WelcomeScreen';

// Keep the native splash until WelcomeScreen (or the signed-in screen) is on screen.
SplashScreen.preventAutoHideAsync();

function Root() {
  const { status } = useAuth();

  return status === 'signedIn' ? <SignedInScreen /> : <WelcomeScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
