import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import '@/i18n';

let mockUseMyProfile: jest.Mock;

jest.mock('../ProfileProvider', () => ({
  useProfile: () => mockUseMyProfile(),
}));

jest.mock('@/features/auth/SignOutButton', () => {
  const { Text } = require('react-native');
  return { SignOutButton: () => <Text>SignOutButton</Text> };
});

import { ProfileScreen } from '../ProfileScreen';

const profile = {
  name: 'Ana',
  age: 30,
  bio: 'Hola, soy Ana',
  complete: true,
  genderCode: 'female',
  partnerPreferenceCode: 'men',
  photoPaths: ['u/a.jpg', 'u/b.jpg'],
  interests: [{ code: 'music', labels: { es: 'Música', en: 'Music' } }],
};

describe('ProfileScreen', () => {
  it('muestra los datos del perfil y el botón de cerrar sesión', async () => {
    mockUseMyProfile = jest.fn().mockReturnValue({ status: 'ready', profile });

    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('Ana')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
    expect(getByText('Mujer')).toBeTruthy();
    expect(getByText('Hombres')).toBeTruthy();
    expect(getByText('Hola, soy Ana')).toBeTruthy();
    expect(getByText('Música')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('SignOutButton')).toBeTruthy();
  });

  it('muestra un guión en los campos que todavía están vacíos', async () => {
    mockUseMyProfile = jest.fn().mockReturnValue({
      status: 'ready',
      profile: {
        ...profile,
        age: null,
        bio: null,
        genderCode: null,
        partnerPreferenceCode: null,
        photoPaths: [],
        interests: [],
        complete: false,
      },
    });

    const { getAllByText } = await render(<ProfileScreen />);

    expect(getAllByText('—').length).toBeGreaterThanOrEqual(5);
  });

  it('deja lugar abajo para que el contenido se pueda desplazar por encima de la barra flotante', async () => {
    mockUseMyProfile = jest.fn().mockReturnValue({ status: 'ready', profile });

    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 47, left: 0, right: 0, bottom: 34 }}>
        <ProfileScreen />
      </SafeAreaInsetsContext.Provider>
    );

    const style = StyleSheet.flatten(screen.getByTestId('profile-scroll').props.contentContainerStyle);
    // 34 (safe area) + 24 (gap) + 64 (bar) + 32 (air)
    expect(style.paddingBottom).toBe(154);
  });
});
