import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';

let mockProfileState: { status: string; profile: ReturnType<typeof makeProfile> | null };

jest.mock('@/features/profile/ProfileProvider', () => ({
  useProfile: () => mockProfileState,
}));

jest.mock('@/features/onboarding/api', () => ({
  photoUrl: (path: string) => `https://cdn.test/${path}`,
}));

import { ProfileSummaryCard } from '../ProfileSummaryCard';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Ana',
    age: 30,
    bio: null,
    complete: false,
    onboardingComplete: true,
    genderCode: null,
    partnerPreferenceCode: null,
    photoPaths: ['u/a.webp'],
    interests: [{ code: 'music', labels: { es: 'Música' } }],
    outingTypes: [
      { code: 'dinner', labels: { es: 'Cena' } },
      { code: 'cinema', labels: { es: 'Cine' } },
    ],
    ...overrides,
  };
}

describe('ProfileSummaryCard', () => {
  beforeEach(() => {
    mockProfileState = { status: 'ready', profile: makeProfile() };
  });

  it('muestra el título, la bajada, nombre y edad, y los tipos de salida', async () => {
    await render(<ProfileSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('Completá tu perfil')).toBeTruthy();
    expect(
      screen.getByText('Un perfil completo aumenta tus posibilidades de tener más matches.')
    ).toBeTruthy();
    expect(screen.getByText('Ana, 30')).toBeTruthy();
    expect(screen.getByText('Cena')).toBeTruthy();
    expect(screen.getByText('Cine')).toBeTruthy();
    // Interests are not part of this card.
    expect(screen.queryByText('Música')).toBeNull();
  });

  it('usa la primera foto del perfil', async () => {
    await render(<ProfileSummaryCard onPress={jest.fn()} />);

    expect(screen.getByTestId('profile-summary-photo').props.source).toEqual({
      uri: 'https://cdn.test/u/a.webp',
    });
  });

  it('sin fotos muestra un lugar vacío en vez de la imagen', async () => {
    mockProfileState = { status: 'ready', profile: makeProfile({ photoPaths: [] }) };
    await render(<ProfileSummaryCard onPress={jest.fn()} />);

    expect(screen.queryByTestId('profile-summary-photo')).toBeNull();
    expect(screen.getByTestId('profile-summary-photo-empty')).toBeTruthy();
  });

  it('sin edad muestra solo el nombre, y sin tipos de salida no muestra esa línea', async () => {
    mockProfileState = { status: 'ready', profile: makeProfile({ age: null, outingTypes: [] }) };
    await render(<ProfileSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.queryByTestId('profile-summary-outing-types')).toBeNull();
  });

  it('muestra como máximo 4 tipos de salida, sin indicador de los que faltan', async () => {
    const codes = ['dinner', 'cinema', 'drinks', 'coffee', 'park', 'spa'];
    mockProfileState = {
      status: 'ready',
      profile: makeProfile({
        outingTypes: codes.map((code) => ({ code, labels: { es: `Tipo ${code}` } })),
      }),
    };
    await render(<ProfileSummaryCard onPress={jest.fn()} />);

    codes.slice(0, 4).forEach((code) => expect(screen.getByText(`Tipo ${code}`)).toBeTruthy());
    codes.slice(4).forEach((code) => expect(screen.queryByText(`Tipo ${code}`)).toBeNull());
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('tocar la card abre el perfil, y no hay botón "Editar perfil"', async () => {
    const onPress = jest.fn();
    await render(<ProfileSummaryCard onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('profile-summary-card'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Editar perfil')).toBeNull();
  });

  it('mientras el perfil no está listo no muestra nada', async () => {
    mockProfileState = { status: 'loading', profile: null };
    await render(<ProfileSummaryCard onPress={jest.fn()} />);

    expect(screen.queryByText('Completá tu perfil')).toBeNull();
  });
});
