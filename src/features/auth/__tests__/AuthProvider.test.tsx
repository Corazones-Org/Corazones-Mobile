import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';

let onAuthStateChangeCallback: ((event: string, session: unknown) => void) | undefined;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
      onAuthStateChange: jest.fn((callback) => {
        onAuthStateChangeCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '../AuthProvider';

function StatusProbe() {
  const { status, session } = useAuth();
  return <Text>{status}:{session ? 'has-session' : 'no-session'}</Text>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    onAuthStateChangeCallback = undefined;
    jest.clearAllMocks();
  });

  it('arranca en loading y pasa a signedOut si no hay sesión', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    const { getByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('signedOut:no-session')).toBeTruthy();
    });
  });

  it('pasa a signedIn si getSession devuelve una sesión', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'abc' } },
    });

    const { getByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('signedIn:has-session')).toBeTruthy();
    });
  });

  it('reacciona a cambios posteriores vía onAuthStateChange', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    const { getByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('signedOut:no-session')).toBeTruthy();
    });

    await act(async () => {
      onAuthStateChangeCallback?.('SIGNED_IN', { access_token: 'xyz' });
    });

    await waitFor(() => {
      expect(getByText('signedIn:has-session')).toBeTruthy();
    });
  });

  describe('refresco automático del token', () => {
    let appStateListener: ((state: string) => void) | undefined;
    let removeListener: jest.Mock;

    beforeEach(() => {
      appStateListener = undefined;
      removeListener = jest.fn();
      jest.spyOn(AppState, 'addEventListener').mockImplementation(((
        _type: string,
        listener: (state: string) => void
      ) => {
        appStateListener = listener;
        return { remove: removeListener };
      }) as never);
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('pausa el refresco al pasar a background y lo retoma al volver a primer plano', async () => {
      await render(
        <AuthProvider>
          <StatusProbe />
        </AuthProvider>
      );
      (supabase.auth.startAutoRefresh as jest.Mock).mockClear();
      (supabase.auth.stopAutoRefresh as jest.Mock).mockClear();

      await act(async () => appStateListener?.('background'));
      expect(supabase.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
      expect(supabase.auth.startAutoRefresh).not.toHaveBeenCalled();

      await act(async () => appStateListener?.('active'));
      expect(supabase.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    });

    it('arranca el refresco al montar solo si la app está en primer plano', async () => {
      const appState = AppState as { currentState: string };
      const originalState = appState.currentState;

      try {
        appState.currentState = 'background';
        const first = await render(
          <AuthProvider>
            <StatusProbe />
          </AuthProvider>
        );
        expect(supabase.auth.startAutoRefresh).not.toHaveBeenCalled();
        await first.unmount();

        appState.currentState = 'active';
        await render(
          <AuthProvider>
            <StatusProbe />
          </AuthProvider>
        );
        expect(supabase.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
      } finally {
        appState.currentState = originalState;
      }
    });

    it('al desmontar quita el listener y detiene el refresco', async () => {
      const { unmount } = await render(
        <AuthProvider>
          <StatusProbe />
        </AuthProvider>
      );
      (supabase.auth.stopAutoRefresh as jest.Mock).mockClear();

      await unmount();

      expect(removeListener).toHaveBeenCalledTimes(1);
      expect(supabase.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
