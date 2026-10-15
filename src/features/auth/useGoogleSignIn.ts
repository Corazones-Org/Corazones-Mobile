import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { signInWithGoogle } from './api';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export function useGoogleSignIn() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    GoogleSignin.hasPlayServices().catch(() => {
      // Android without Play Services (e.g. some emulators): the sign-in
      // button will still show an error when actually pressed.
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const { error: code } = await signInWithGoogle();
      if (code) {
        setError(t(`auth.errors.${code}`));
      }
    } catch (unexpectedError) {
      console.error('Unexpected sign-in error:', unexpectedError);
      setError(t('auth.errors.unknown'));
    }
  }, [t]);

  return { signIn, error };
}
