import { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { signOut } from './auth';
import { useAuth } from './AuthProvider';
import { useGoogleSignIn } from './useGoogleSignIn';

export function AuthGate() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { signIn } = useGoogleSignIn();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    try {
      const { error: signInError } = await signIn();
      if (signInError) {
        console.error('Google sign-in error:', signInError);
        setError(t('auth.genericError'));
      }
    } catch (unexpectedError) {
      console.error('Unexpected sign-in error:', unexpectedError);
      setError(t('auth.genericError'));
    }
  };

  if (status === 'loading') {
    return <Text>{t('common.loading')}</Text>;
  }

  if (status === 'signedOut') {
    return (
      <View>
        <Button title={t('auth.signInWithGoogle')} onPress={handleSignIn} />
        {error ? <Text>{error}</Text> : null}
      </View>
    );
  }

  return <Button title={t('auth.signOut')} onPress={signOut} />;
}
