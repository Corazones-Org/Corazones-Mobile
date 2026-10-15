import { act, fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';

type MockAuth = { status: 'loading' | 'signedIn' | 'signedOut'; session: object | null };

const signedIn: MockAuth = { status: 'signedIn', session: {} };
const signedOut: MockAuth = { status: 'signedOut', session: null };

let mockInitialAuth: MockAuth;
let mockSetAuth: (auth: MockAuth) => void;
let mockUseMyProfile: jest.Mock;

// Stateful stand-in for the real provider, so sign-in/sign-out can change the session and the
// navigator reacts to it.
jest.mock('@/features/auth/AuthProvider', () => {
  const React = require('react');
  const Context = React.createContext(null);
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => {
      const [auth, setAuth] = React.useState(mockInitialAuth);
      mockSetAuth = setAuth;
      return React.createElement(Context.Provider, { value: auth }, children);
    },
    useAuth: () => React.useContext(Context),
  };
});

jest.mock('@/features/auth/api', () => ({
  signInWithGoogle: jest.fn(async () => {
    mockSetAuth({ status: 'signedIn', session: {} });
    return { error: null };
  }),
  signOut: jest.fn(async () => {
    mockSetAuth({ status: 'signedOut', session: null });
  }),
}));

jest.mock('@/features/profile/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn().mockResolvedValue(true) },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hide: jest.fn(),
}));

import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { Navigation } from '../Navigation';

const profile = {
  name: 'Ana',
  age: null,
  bio: null,
  complete: false,
  genderCode: null,
  partnerPreferenceCode: null,
  photoPaths: [],
  interests: [],
};

function renderNavigation(auth: MockAuth) {
  mockInitialAuth = auth;
  return render(
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile = jest.fn().mockReturnValue({ status: 'ready', reload: jest.fn(), profile });
  });

  it('mantiene la pantalla de bienvenida sin botón mientras carga la sesión', async () => {
    await renderNavigation({ status: 'loading', session: null });

    expect(screen.getByTestId('welcome-screen')).toBeTruthy();
    expect(screen.queryByText('Continuar con Google')).toBeNull();
    expect(screen.queryByTestId('main-screen')).toBeNull();
  });

  it('muestra el ingreso cuando no hay sesión', async () => {
    await renderNavigation(signedOut);

    expect(screen.getByText('Continuar con Google')).toBeTruthy();
    expect(screen.queryByTestId('main-screen')).toBeNull();
  });

  it('con sesión cae en la pantalla principal y muestra la barra de tabs', async () => {
    await renderNavigation(signedIn);

    expect(screen.getByTestId('main-screen')).toBeTruthy();
    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('Perfil')).toBeTruthy();
    expect(screen.queryByTestId('welcome-screen')).toBeNull();
    expect(SplashScreen.hide).toHaveBeenCalled();
  });

  it('al autenticarse desde el ingreso pasa a la pantalla principal', async () => {
    await renderNavigation(signedOut);

    await fireEvent.press(screen.getByText('Continuar con Google'));

    expect(await screen.findByTestId('main-screen')).toBeTruthy();
    expect(screen.queryByTestId('welcome-screen')).toBeNull();
  });

  it('carga el perfil recién al abrir la tab de perfil', async () => {
    await renderNavigation(signedIn);
    expect(mockUseMyProfile).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Perfil'));

    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(mockUseMyProfile).toHaveBeenCalled();
  });

  it('permite volver a la tab principal desde el perfil', async () => {
    await renderNavigation(signedIn);
    await fireEvent.press(screen.getByText('Perfil'));
    await screen.findByText('Ana');

    await fireEvent.press(screen.getByText('Inicio'));

    expect(await screen.findByTestId('main-screen')).toBeTruthy();
  });

  it('al cerrar sesión desde el perfil vuelve al ingreso', async () => {
    await renderNavigation(signedIn);
    await fireEvent.press(screen.getByText('Perfil'));
    await fireEvent.press(await screen.findByText('Cerrar sesión'));

    expect(await screen.findByText('Continuar con Google')).toBeTruthy();
    expect(screen.queryByText('Perfil')).toBeNull();
  });

  it('si la sesión se pierde estando adentro, vuelve al ingreso', async () => {
    await renderNavigation(signedIn);

    await act(async () => mockSetAuth(signedOut));

    expect(await screen.findByText('Continuar con Google')).toBeTruthy();
    expect(screen.queryByTestId('main-screen')).toBeNull();
  });
});
