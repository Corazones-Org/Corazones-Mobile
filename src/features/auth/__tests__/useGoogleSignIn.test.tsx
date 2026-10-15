import { act, renderHook } from '@testing-library/react-native';

import '@/i18n';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../api', () => ({
  signInWithGoogle: jest.fn(),
}));

import { signInWithGoogle } from '../api';
import { useGoogleSignIn } from '../useGoogleSignIn';

const UNKNOWN_ERROR = 'Ocurrió un error al iniciar sesión. Probá de nuevo.';
const NETWORK_ERROR = 'No hay conexión. Revisá tu internet y probá de nuevo.';

describe('useGoogleSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('no expone error si el login sale bien', async () => {
    (signInWithGoogle as jest.Mock).mockResolvedValue({ error: null });
    const { result } = await renderHook(() => useGoogleSignIn());

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error).toBeNull();
  });

  it('expone el mensaje que corresponde al código de error', async () => {
    (signInWithGoogle as jest.Mock).mockResolvedValue({ error: 'network' });
    const { result } = await renderHook(() => useGoogleSignIn());

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error).toBe(NETWORK_ERROR);
  });

  it('expone un error desconocido si el login lanza una excepción', async () => {
    (signInWithGoogle as jest.Mock).mockRejectedValue(new Error('crash'));
    const { result } = await renderHook(() => useGoogleSignIn());

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error).toBe(UNKNOWN_ERROR);
  });

  it('limpia el error al reintentar', async () => {
    (signInWithGoogle as jest.Mock)
      .mockResolvedValueOnce({ error: 'unknown' })
      .mockResolvedValueOnce({ error: null });
    const { result } = await renderHook(() => useGoogleSignIn());

    await act(async () => {
      await result.current.signIn();
    });
    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error).toBeNull();
  });
});
