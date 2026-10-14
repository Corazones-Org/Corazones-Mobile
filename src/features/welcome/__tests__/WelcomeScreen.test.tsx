import { fireEvent, render, waitFor } from '@testing-library/react-native';

import '@/i18n';

let mockUseAuth: jest.Mock;
const mockSignIn = jest.fn();

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/features/auth/useGoogleSignIn', () => ({
  useGoogleSignIn: () => ({ signIn: mockSignIn }),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hide: jest.fn(),
}));

import * as SplashScreen from 'expo-splash-screen';
import { WelcomeScreen } from '../WelcomeScreen';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth = jest.fn();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it('shows the heart and the wordmark while the session is loading, without a sign-in button', async () => {
    mockUseAuth.mockReturnValue({ status: 'loading', session: null });

    const { getByTestId, getByText, queryByText } = await render(<WelcomeScreen />);

    expect(getByTestId('welcome-heart')).toBeTruthy();
    expect(getByText('Corazones')).toBeTruthy();
    expect(queryByText('Ingresar con Google')).toBeNull();
  });

  it('shows the Google sign-in button once the user is known to be signed out', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });

    const { getByText, getByTestId } = await render(<WelcomeScreen />);

    expect(getByText('Ingresar con Google')).toBeTruthy();
    expect(getByTestId('welcome-heart')).toBeTruthy();
  });

  it('starts the Google sign-in when the button is pressed', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });
    const { getByText } = await render(<WelcomeScreen />);

    await fireEvent.press(getByText('Ingresar con Google'));

    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('shows an error when the sign-in fails', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSignIn.mockResolvedValue({ error: new Error('boom') });
    const { getByText, findByText } = await render(<WelcomeScreen />);

    await fireEvent.press(getByText('Ingresar con Google'));

    expect(await findByText('Ocurrió un error al iniciar sesión. Probá de nuevo.')).toBeTruthy();
  });

  it('shows an error when the sign-in throws', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSignIn.mockRejectedValue(new Error('crash'));
    const { getByText, findByText } = await render(<WelcomeScreen />);

    await fireEvent.press(getByText('Ingresar con Google'));

    expect(await findByText('Ocurrió un error al iniciar sesión. Probá de nuevo.')).toBeTruthy();
  });

  it('hides the native splash only once the screen is laid out, so the handoff has no gap', async () => {
    mockUseAuth.mockReturnValue({ status: 'loading', session: null });
    const { getByTestId } = await render(<WelcomeScreen />);
    expect(SplashScreen.hide).not.toHaveBeenCalled();

    await fireEvent(getByTestId('welcome-screen'), 'layout');

    await waitFor(() => expect(SplashScreen.hide).toHaveBeenCalledTimes(1));
  });
});
