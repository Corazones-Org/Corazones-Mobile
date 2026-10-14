import { render } from '@testing-library/react-native';

import '@/i18n';

let mockUseAuth: jest.Mock;

jest.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockUseAuth(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  isSuccessResponse: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hide: jest.fn(),
}));

import * as SplashScreen from 'expo-splash-screen';
import App from './App';

describe('App', () => {
  it('mantiene la splash nativa visible al arrancar', () => {
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
  });

  it('muestra la pantalla de bienvenida con Corazones mientras carga la sesión', async () => {
    mockUseAuth = jest.fn().mockReturnValue({ status: 'loading', session: null });

    const { getByText, getByTestId, queryByText } = await render(<App />);

    expect(getByTestId('welcome-screen')).toBeTruthy();
    expect(getByText('Corazones')).toBeTruthy();
    expect(queryByText('Ingresar con Google')).toBeNull();
  });

  it('muestra el botón de ingreso cuando no hay sesión', async () => {
    mockUseAuth = jest.fn().mockReturnValue({ status: 'signedOut', session: null });

    const { getByText } = await render(<App />);

    expect(getByText('Ingresar con Google')).toBeTruthy();
  });

  it('sale de la bienvenida cuando hay sesión y oculta la splash nativa', async () => {
    jest.clearAllMocks();
    mockUseAuth = jest.fn().mockReturnValue({ status: 'signedIn', session: {} });

    const { queryByTestId, getByText } = await render(<App />);

    expect(queryByTestId('welcome-screen')).toBeNull();
    expect(getByText('Cerrar sesión')).toBeTruthy();
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});
