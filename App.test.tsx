import { render } from '@testing-library/react-native';

import '@/i18n';

jest.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ status: 'loading', session: null }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn().mockResolvedValue(true) },
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

  it('arranca en la pantalla de bienvenida mientras carga la sesión', async () => {
    const { getByTestId } = await render(<App />);

    expect(getByTestId('welcome-screen')).toBeTruthy();
  });
});
