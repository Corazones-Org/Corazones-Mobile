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
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { signInWithGoogle, signOut } from '../api';

describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
    expect(result.error).toBe('noIdToken');
  });

  it('devuelve "rejected" si Supabase rechaza el idToken', async () => {
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('invalid token', 400, 'validation_failed'),
    });

    const result = await signInWithGoogle();

    expect(result.error).toBe('rejected');
  });

  it('devuelve "network" si Supabase no se pudo alcanzar', async () => {
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Network request failed', 0),
    });

    const result = await signInWithGoogle();

    expect(result.error).toBe('network');
  });

  it('devuelve "noPlayServices" si Google Play Services no está disponible', async () => {
    mockHasPlayServices.mockRejectedValue({ code: 'PLAY_SERVICES_NOT_AVAILABLE' });

    const result = await signInWithGoogle();

    expect(result.error).toBe('noPlayServices');
  });

  it('no devuelve error si Google lanza una cancelación', async () => {
    mockSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });

    const result = await signInWithGoogle();

    expect(result.error).toBeNull();
  });

  it('no devuelve error si ya hay un login en curso', async () => {
    mockSignIn.mockRejectedValue({ code: 'IN_PROGRESS' });

    const result = await signInWithGoogle();

    expect(result.error).toBeNull();
  });

  it('devuelve "network" si falla la red antes de llegar a Supabase', async () => {
    mockSignIn.mockRejectedValue(new Error('Network request failed'));

    const result = await signInWithGoogle();

    expect(result.error).toBe('network');
  });

  it('devuelve "unknown" ante cualquier otro error', async () => {
    mockSignIn.mockRejectedValue(new Error('boom'));

    const result = await signInWithGoogle();

    expect(result.error).toBe('unknown');
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
