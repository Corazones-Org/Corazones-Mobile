import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// Each code maps to a message under `auth.errors` in i18n.
export type SignInErrorCode = 'network' | 'noPlayServices' | 'noIdToken' | 'rejected' | 'unknown';

// `error: null` also covers the user cancelling the Google dialog (not an error to show).
export type SignInResult = { error: SignInErrorCode | null };

function isNetworkFailure(error: unknown) {
  return error instanceof Error && error.message.includes('Network request failed');
}

// Maps whatever Google / Supabase threw to a code, or null when it is not a failure to report.
function toSignInError(error: unknown): SignInErrorCode | null {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'noPlayServices';
    }
  }
  if (isAuthRetryableFetchError(error) || isNetworkFailure(error)) {
    return 'network';
  }
  return 'unknown';
}

export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return { error: null };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      console.error('Google sign-in error: no idToken in a successful response');
      return { error: 'noIdToken' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('Supabase sign-in error:', error);
      return { error: toSignInError(error) === 'network' ? 'network' : 'rejected' };
    }
    return { error: null };
  } catch (error) {
    const code = toSignInError(error);
    if (code) {
      console.error('Google sign-in error:', error);
    }
    return { error: code };
  }
}

export async function signOut() {
  await GoogleSignin.signOut();
  return supabase.auth.signOut();
}
