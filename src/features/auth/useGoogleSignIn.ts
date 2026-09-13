import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useCallback, useEffect } from 'react';

import { signInWithGoogle } from './api';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export function useGoogleSignIn() {
  useEffect(() => {
    GoogleSignin.hasPlayServices().catch(() => {
      // Android without Play Services (e.g. some emulators): the sign-in
      // button will still show an error when actually pressed.
    });
  }, []);

  const signIn = useCallback(() => signInWithGoogle(), []);

  return { signIn };
}
