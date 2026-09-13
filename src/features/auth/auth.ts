import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import type { AuthError } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';

export async function signInWithGoogle(): Promise<{
  error: AuthError | { message: string } | null;
}> {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return { error: null };
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    return { error: { message: 'Google no devolvió un idToken.' } };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  return { error };
}

export async function signOut() {
  await GoogleSignin.signOut();
  return supabase.auth.signOut();
}
