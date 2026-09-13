import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

let onAuthStateChangeCallback: ((event: string, session: unknown) => void) | undefined;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
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
});
