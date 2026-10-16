import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';

jest.mock('@/features/profile/ProfileProvider', () => ({
  useProfile: () => ({
    status: 'ready',
    profile: {
      name: 'Ana',
      age: 30,
      photoPaths: [],
      outingTypes: [{ code: 'dinner', labels: { es: 'Cena' } }],
    },
  }),
}));

jest.mock('@/features/onboarding/api', () => ({
  photoUrl: (path: string) => path,
}));

import { MainScreen } from '../MainScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { navigate: jest.fn() };

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MainScreen navigation={navigation as never} route={{} as never} />
    </SafeAreaProvider>
  );

describe('MainScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('muestra "¿Cómo funciona?" y la card del perfil', async () => {
    await renderScreen();

    expect(screen.getByTestId('main-screen')).toBeTruthy();
    expect(screen.getByText('¿Cómo funciona?')).toBeTruthy();
    expect(screen.getByText('Completá tu perfil')).toBeTruthy();
    expect(screen.getByText('Ana, 30')).toBeTruthy();
  });

  it('tocar la card del perfil lleva a la pestaña Perfil', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-summary-card'));

    expect(navigation.navigate).toHaveBeenCalledWith('Profile');
  });
});
