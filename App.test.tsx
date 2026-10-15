import { render } from '@testing-library/react-native';

import '@/i18n';

jest.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ status: 'loading', session: null }),
}));

jest.mock('@/features/profile/ProfileProvider', () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => children,
  useProfile: () => ({ status: 'loading', profile: null, reload: jest.fn() }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn().mockResolvedValue(true) },
}));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

let mockFontsReady = true;

jest.mock('@/theme/fonts', () => ({
  useAppFonts: () => mockFontsReady,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hide: jest.fn(),
}));

import * as SplashScreen from 'expo-splash-screen';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    mockFontsReady = true;
  });

  it('mantiene la splash nativa visible al arrancar', () => {
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
  });

  it('arranca en la pantalla de bienvenida mientras carga la sesión', async () => {
    const { getByTestId } = await render(<App />);

    expect(getByTestId('welcome-screen')).toBeTruthy();
  });

  it('no muestra nada (la splash nativa sigue visible) hasta que las fuentes están listas', async () => {
    mockFontsReady = false;

    const { queryByTestId } = await render(<App />);

    expect(queryByTestId('welcome-screen')).toBeNull();
  });
});
