import { fireEvent, render, waitFor, within } from '@testing-library/react-native';

import '@/i18n';

let mockUseAuth: jest.Mock;
const mockSignIn = jest.fn();
let mockError: string | null = null;

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/features/auth/useGoogleSignIn', () => ({
  useGoogleSignIn: () => ({ signIn: mockSignIn, error: mockError }),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hide: jest.fn(),
}));

import * as SplashScreen from 'expo-splash-screen';
import { themes } from '@/theme/tokens';
import { WelcomeScreen } from '../WelcomeScreen';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth = jest.fn();
    mockSignIn.mockResolvedValue(undefined);
    mockError = null;
  });

  it('shows the heart and the wordmark while the session is loading, without a sign-in button', async () => {
    mockUseAuth.mockReturnValue({ status: 'loading', session: null });

    const { getByTestId, getByText, queryByText, queryByTestId } = await render(<WelcomeScreen />);

    expect(getByTestId('welcome-heart')).toBeTruthy();
    expect(getByText('Corazones')).toBeTruthy();
    expect(queryByText('Continuar con Google')).toBeNull();
    expect(queryByTestId('welcome-divider')).toBeNull();
  });

  it('shows the Google sign-in button once the user is known to be signed out', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });

    const { getByText, getByTestId } = await render(<WelcomeScreen />);

    expect(getByText('Continuar con Google')).toBeTruthy();
    expect(getByTestId('welcome-heart')).toBeTruthy();
  });

  it('shows heart, divider and Google button together in one centered column', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });

    const { getByTestId } = await render(<WelcomeScreen />);

    const content = getByTestId('welcome-content');
    expect(within(content).getByTestId('welcome-heart')).toBeTruthy();
    expect(within(content).getByTestId('welcome-divider')).toBeTruthy();
    expect(within(content).getByTestId('google-logo')).toBeTruthy();
  });

  it('starts the Google sign-in when the button is pressed', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });
    const { getByText } = await render(<WelcomeScreen />);

    await fireEvent.press(getByText('Continuar con Google'));

    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('shows the sign-in error message', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });
    mockError = 'Ocurrió un error al iniciar sesión. Probá de nuevo.';

    const { getByText } = await render(<WelcomeScreen />);

    expect(getByText('Ocurrió un error al iniciar sesión. Probá de nuevo.')).toBeTruthy();
  });

  it('hides the native splash only once the screen is laid out, so the handoff has no gap', async () => {
    mockUseAuth.mockReturnValue({ status: 'loading', session: null });
    const { getByTestId } = await render(<WelcomeScreen />);
    expect(SplashScreen.hide).not.toHaveBeenCalled();

    await fireEvent(getByTestId('welcome-screen'), 'layout');

    await waitFor(() => expect(SplashScreen.hide).toHaveBeenCalledTimes(1));
  });

  it('draws its text with design tokens: Poppins and the on-photo color', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut', session: null });
    mockError = 'Ocurrió un error al iniciar sesión. Probá de nuevo.';

    const { getByText } = await render(<WelcomeScreen />);

    expect(getByText('Corazones')).toHaveStyle({
      fontFamily: 'Poppins_400Regular',
      color: themes.light.colors.onPhoto,
    });
    expect(getByText('Ocurrió un error al iniciar sesión. Probá de nuevo.')).toHaveStyle({
      color: themes.light.colors.onPhoto,
    });
  });
});
