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

// The card has its own tests; here it only has to be on the screen and be able to open the profile.
jest.mock('@/features/timeSlots/NextTimeSlotCard', () => {
  const { Pressable, Text } = require('react-native');
  return {
    NextTimeSlotCard: ({ onOpenProfile }: { onOpenProfile: () => void }) => (
      <Pressable testID="next-time-slot-card" onPress={onOpenProfile}>
        <Text>Próximo turno</Text>
      </Pressable>
    ),
  };
});

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

  it('muestra el próximo turno arriba de "¿Cómo funciona?"', async () => {
    await renderScreen();

    const card = screen.getByTestId('next-time-slot-card');
    const howItWorks = screen.getByText('¿Cómo funciona?');
    const order = screen.toJSON();
    const flat = JSON.stringify(order);

    expect(card).toBeTruthy();
    expect(flat.indexOf('next-time-slot-card')).toBeLessThan(flat.indexOf(howItWorks.props.children as string));
  });

  it('desde el card del turno se puede ir a la pestaña Perfil', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('next-time-slot-card'));

    expect(navigation.navigate).toHaveBeenCalledWith('Profile');
  });

  it('tocar la card del perfil lleva a la pestaña Perfil', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-summary-card'));

    expect(navigation.navigate).toHaveBeenCalledWith('Profile');
  });
});
