import { render } from '@testing-library/react-native';

import '@/i18n';

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

import App from './App';

test('levanta la app y muestra Corazones', async () => {
  const { getByText } = await render(<App />);

  expect(getByText('Corazones')).toBeTruthy();
});
