const mockHasPlayServices = jest.fn();
const mockSignIn = jest.fn();
const mockGoogleSignOut = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    signIn: (...args: unknown[]) => mockSignIn(...args),
    signOut: (...args: unknown[]) => mockGoogleSignOut(...args),
  },
  isSuccessResponse: (response: { type: string }) => response.type === 'success',
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import { signInWithGoogle, signOut } from '../api';

describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPlayServices.mockResolvedValue(true);
  });

  it('intercambia el idToken de Google por una sesión de Supabase', async () => {
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'abc' } },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
    });
    expect(result.error).toBeNull();
  });

  it('no llama a Supabase si el usuario cancela el flujo de Google', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled' });

    const result = await signInWithGoogle();

    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
  });

  it('devuelve un error explícito si Google no manda idToken pese a "success"', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: {} });

    const result = await signInWithGoogle();

    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    expect(result.error).not.toBeNull();
  });

  it('propaga el error si Supabase rechaza el idToken', async () => {
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid token' },
    });

    const result = await signInWithGoogle();

    expect(result.error).toEqual({ message: 'invalid token' });
  });
});

describe('signOut', () => {
  it('cierra sesión en Google y en Supabase', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    await signOut();

    expect(mockGoogleSignOut).toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
