import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import '@/i18n';

type MockAuth = { status: 'loading' | 'signedIn' | 'signedOut'; session: object | null };

const signedIn: MockAuth = { status: 'signedIn', session: { user: { id: 'user-1' } } };
const signedOut: MockAuth = { status: 'signedOut', session: null };

type MockProfileState =
  | { status: 'loading'; profile: null }
  | { status: 'error'; profile: null }
  | { status: 'ready'; profile: ReturnType<typeof makeProfile> };

let mockInitialAuth: MockAuth;
let mockSetAuth: (auth: MockAuth) => void;
let mockInitialProfile: MockProfileState;
let mockSetProfile: (state: MockProfileState) => void;
let mockReload: jest.Mock;

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
    mockSetAuth({ status: 'signedIn', session: { user: { id: 'user-1' } } });
    return { error: null };
  }),
  signOut: jest.fn(async () => {
    mockSetAuth({ status: 'signedOut', session: null });
  }),
}));

// Stateful stand-in for the profile provider, so the gate can react to the profile changing
// (for example when onboarding finishes and the profile is reloaded).
jest.mock('@/features/profile/ProfileProvider', () => {
  const React = require('react');
  const Context = React.createContext(null);
  return {
    ProfileProvider: ({ children }: { children: React.ReactNode }) => {
      const [state, setState] = React.useState(mockInitialProfile);
      mockSetProfile = setState;
      return React.createElement(Context.Provider, { value: state }, children);
    },
    useProfile: () => ({ ...React.useContext(Context), reload: mockReload }),
  };
});

jest.mock('@/features/onboarding/api', () => ({
  fetchMyPhotos: jest.fn().mockResolvedValue([]),
  fetchCatalogs: jest.fn().mockResolvedValue({ genders: [], partnerPreferences: [] }),
  photoUrl: (path: string) => path,
  uploadProfilePhoto: jest.fn(),
  removeProfilePhoto: jest.fn(),
  saveOnboardingDetails: jest.fn(),
}));

jest.mock('@/features/profile/api', () => ({
  updateMyProfile: jest.fn(),
  fetchInterestsCatalog: jest.fn().mockResolvedValue([]),
  addMyInterest: jest.fn(),
  removeMyInterest: jest.fn(),
  fetchOutingTypesCatalog: jest.fn().mockResolvedValue([]),
  addMyOutingType: jest.fn(),
  removeMyOutingType: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

// The card is tested on its own; here the navigator only needs the Main screen to render.
jest.mock('@/features/timeSlots/NextTimeSlotCard', () => ({ NextTimeSlotCard: () => null }));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn().mockResolvedValue(true) },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hide: jest.fn(),
}));

import * as SplashScreen from 'expo-splash-screen';

import { ToastProvider } from '@/components/Toast/ToastProvider';
import { signOut } from '@/features/auth/api';
import { fetchMyPhotos } from '@/features/onboarding/api';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ProfileProvider } from '@/features/profile/ProfileProvider';
import { Navigation } from '../Navigation';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Ana',
    age: null,
    bio: null,
    complete: false,
    onboardingComplete: true,
    genderCode: null,
    partnerPreferenceCode: null,
    photoPaths: [] as string[],
    interests: [] as { code: string; labels: Record<string, string> }[],
    outingTypes: [] as { code: string; labels: Record<string, string> }[],
    ...overrides,
  };
}

const readyProfile = (overrides: Record<string, unknown> = {}): MockProfileState => ({
  status: 'ready',
  profile: makeProfile(overrides),
});

function renderNavigation(auth: MockAuth, profileState: MockProfileState = readyProfile()) {
  mockInitialAuth = auth;
  mockInitialProfile = profileState;
  return render(
    <ToastProvider>
      <AuthProvider>
        <ProfileProvider>
          <Navigation />
        </ProfileProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReload = jest.fn();
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

  it('las tabs son la barra líquida flotante, con las mismas dos pantallas de siempre', async () => {
    await renderNavigation(signedIn);

    expect(screen.getByTestId('liquid-tab-bar')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Inicio', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Perfil', selected: false })).toBeTruthy();
    // Floats above the content instead of taking a row of the layout.
    expect(screen.getByTestId('main-tab-bar-dock')).toHaveStyle({ position: 'absolute' });
  });

  it('tocar una tab de la barra líquida cambia de pantalla y marca la tab', async () => {
    await renderNavigation(signedIn);

    await fireEvent.press(screen.getByRole('tab', { name: 'Perfil' }));

    expect(await screen.findByTestId('profile-screen')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Perfil', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Inicio', selected: false })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Inicio' }));

    expect(await screen.findByTestId('main-screen')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Inicio', selected: true })).toBeTruthy();
  });

  describe('perfil', () => {
    const openProfile = async () => {
      await renderNavigation(signedIn);
      await fireEvent.press(screen.getByRole('tab', { name: 'Perfil' }));
      return screen.findByTestId('profile-screen');
    };

    it('la tab Perfil muestra directamente la edición del perfil', async () => {
      await openProfile();

      expect(screen.getByLabelText('Nombre').props.value).toBe('Ana');
      expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull();
    });

    it('desde el perfil se llega a los intereses y se vuelve', async () => {
      await openProfile();
      await fireEvent.press(screen.getByRole('button', { name: 'Editar intereses' }));

      expect(await screen.findByTestId('edit-interests-screen')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(await screen.findByTestId('profile-screen')).toBeTruthy();
    });

    it('desde el perfil se llega al tipo de salida y se vuelve', async () => {
      await openProfile();
      await fireEvent.press(screen.getByRole('button', { name: 'Editar tipo de salida' }));

      expect(await screen.findByTestId('edit-outing-types-screen')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(await screen.findByTestId('profile-screen')).toBeTruthy();
    });

    it('durante el onboarding no se puede llegar al perfil', async () => {
      await renderNavigation(signedIn, readyProfile({ onboardingComplete: false }));

      expect(screen.queryByTestId('profile-screen')).toBeNull();
    });
  });

  it('al autenticarse desde el ingreso pasa a la pantalla principal', async () => {
    await renderNavigation(signedOut);

    await fireEvent.press(screen.getByText('Continuar con Google'));

    expect(await screen.findByTestId('main-screen')).toBeTruthy();
    expect(screen.queryByTestId('welcome-screen')).toBeNull();
  });

  it('la tab de perfil muestra el perfil que ya cargó el gate', async () => {
    await renderNavigation(signedIn);

    await fireEvent.press(screen.getByText('Perfil'));

    expect(await screen.findByTestId('profile-screen')).toBeTruthy();
  });

  it('permite volver a la tab principal desde el perfil', async () => {
    await renderNavigation(signedIn);
    await fireEvent.press(screen.getByText('Perfil'));
    await screen.findByTestId('profile-screen');

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

  describe('gate: onboarding o app', () => {
    it('mantiene la bienvenida (sin botón) mientras carga el perfil de un usuario con sesión', async () => {
      await renderNavigation(signedIn, { status: 'loading', profile: null });

      expect(screen.getByTestId('welcome-screen')).toBeTruthy();
      expect(screen.queryByText('Continuar con Google')).toBeNull();
      expect(screen.queryByTestId('main-screen')).toBeNull();
      expect(screen.queryByTestId('photos-step')).toBeNull();
    });

    it('si no se pudo cargar el perfil avisa con un toast y vuelve al login, sin pantalla de error', async () => {
      await renderNavigation(signedIn, { status: 'error', profile: null });

      expect(await screen.findByText('No pudimos cargar tu perfil')).toBeTruthy();
      expect(screen.getByText('Volvé a iniciar sesión.')).toBeTruthy();
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('Continuar con Google')).toBeTruthy();
      expect(screen.queryByText('Reintentar')).toBeNull();
      expect(screen.queryByTestId('main-screen')).toBeNull();
      expect(screen.queryByTestId('photos-step')).toBeNull();
    });

    it('el aviso de error no aparece cuando el perfil carga bien', async () => {
      await renderNavigation(signedIn, readyProfile());

      expect(screen.queryByText('No pudimos cargar tu perfil')).toBeNull();
      expect(signOut).not.toHaveBeenCalled();
    });

    it('con el onboarding incompleto manda al onboarding (paso de fotos) y no a la app', async () => {
      await renderNavigation(signedIn, readyProfile({ onboardingComplete: false }));

      expect(screen.getByTestId('photos-step')).toBeTruthy();
      expect(screen.queryByTestId('main-screen')).toBeNull();
      expect(screen.queryByText('Perfil')).toBeNull();
    });

    it('retoma el onboarding en el segundo paso si ya hay una foto guardada', async () => {
      await renderNavigation(
        signedIn,
        readyProfile({ onboardingComplete: false, photoPaths: ['users/u/profile/a.webp'] })
      );

      expect(screen.getByTestId('details-step')).toBeTruthy();
      expect(screen.queryByTestId('photos-step')).toBeNull();
    });

    it('al retomar en el segundo paso, volver lleva a las fotos en vez de romper', async () => {
      await renderNavigation(
        signedIn,
        readyProfile({ onboardingComplete: false, photoPaths: ['users/u/profile/a.webp'] })
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(await screen.findByTestId('photos-step')).toBeTruthy();
    });

    it('si se empezó por las fotos, volver desde el segundo paso también vuelve a las fotos', async () => {
      (fetchMyPhotos as jest.Mock).mockResolvedValueOnce([
        { id: 'row-1', path: 'users/u/profile/a.webp', sortOrder: 0 },
      ]);
      await renderNavigation(signedIn, readyProfile({ onboardingComplete: false }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled());
      await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
      await screen.findByTestId('details-step');

      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(await screen.findByTestId('photos-step')).toBeTruthy();
    });

    it('con el onboarding completo manda a la app', async () => {
      await renderNavigation(signedIn, readyProfile({ onboardingComplete: true }));

      expect(screen.getByTestId('main-screen')).toBeTruthy();
      expect(screen.queryByTestId('photos-step')).toBeNull();
    });

    it('al terminar el onboarding (el perfil se recarga) pasa solo a la app', async () => {
      await renderNavigation(signedIn, readyProfile({ onboardingComplete: false }));
      expect(screen.getByTestId('photos-step')).toBeTruthy();

      await act(async () => mockSetProfile(readyProfile({ onboardingComplete: true })));

      expect(await screen.findByTestId('main-screen')).toBeTruthy();
      expect(screen.queryByTestId('photos-step')).toBeNull();
    });

    it('sin sesión nunca muestra el onboarding, aunque haya un perfil cargado', async () => {
      await renderNavigation(signedOut, readyProfile({ onboardingComplete: false }));

      expect(screen.getByText('Continuar con Google')).toBeTruthy();
      expect(screen.queryByTestId('photos-step')).toBeNull();
    });
  });
});
