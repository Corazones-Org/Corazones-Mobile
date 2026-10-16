import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';

const mockUpdate = jest.fn();
const mockReload = jest.fn();
const mockFetchCatalogs = jest.fn();
const mockFetchPhotos = jest.fn();
const mockRemovePhoto = jest.fn();
let mockProfile: ReturnType<typeof makeProfile>;

jest.mock('../api', () => ({
  updateMyProfile: (...args: unknown[]) => mockUpdate(...args),
}));

jest.mock('@/features/onboarding/api', () => ({
  fetchCatalogs: (...args: unknown[]) => mockFetchCatalogs(...args),
  fetchMyPhotos: (...args: unknown[]) => mockFetchPhotos(...args),
  removeProfilePhoto: (...args: unknown[]) => mockRemovePhoto(...args),
  uploadProfilePhoto: jest.fn(),
  photoUrl: (path: string) => `https://cdn.test/${path}`,
}));

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

jest.mock('@/features/auth/SignOutButton', () => {
  const { Text } = require('react-native');
  return { SignOutButton: () => <Text>SignOutButton</Text> };
});

jest.mock('../ProfileProvider', () => ({
  useProfile: () => ({ status: 'ready', profile: mockProfile, reload: mockReload }),
}));

import { ToastProvider } from '@/components/Toast/ToastProvider';
import { ProfileScreen } from '../ProfileScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

let mockOnBlur: () => void = () => {};
const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn((event: string, handler: () => void) => {
    if (event === 'blur') {
      mockOnBlur = handler;
    }
    return jest.fn();
  }),
};

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Ana',
    age: 30,
    bio: 'Hola, soy Ana',
    complete: true,
    onboardingComplete: true,
    genderCode: 'female',
    partnerPreferenceCode: 'men',
    photoPaths: ['u/a.webp'],
    interests: [
      { code: 'music', labels: { es: 'Música' } },
      { code: 'travel', labels: { es: 'Viajes' } },
    ],
    outingTypes: [{ code: 'dinner', labels: { es: 'Cena' } }],
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <ProfileScreen navigation={navigation as never} route={{} as never} />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const field = (label: string) => screen.getByLabelText(label);
const type = (label: string, text: string) => fireEvent.changeText(field(label), text);
const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProfile = makeProfile();
    mockUpdate.mockResolvedValue(undefined);
    mockRemovePhoto.mockResolvedValue(undefined);
    mockFetchPhotos.mockResolvedValue([{ id: 'row-1', path: 'u/a.webp', sortOrder: 0 }]);
    mockFetchCatalogs.mockResolvedValue({
      genders: [
        { id: 1, code: 'male' },
        { id: 2, code: 'female' },
        { id: 3, code: 'other' },
      ],
      partnerPreferences: [
        { id: 1, code: 'men' },
        { id: 2, code: 'women' },
        { id: 3, code: 'everyone' },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('muestra los datos guardados en los campos', async () => {
    await renderScreen();

    expect(field('Nombre').props.value).toBe('Ana');
    expect(field('Edad').props.value).toBe('30');
    expect(field('Sobre mí').props.value).toBe('Hola, soy Ana');
    expect(screen.getByText('Mi perfil')).toBeTruthy();
  });

  it('no tiene botón de guardar', async () => {
    await renderScreen();

    expect(screen.queryByRole('button', { name: /^Guardar/ })).toBeNull();
  });

  it('muestra las fotos guardadas y las opciones elegidas', async () => {
    await renderScreen();

    expect(screen.getByRole('radio', { name: 'Mujer' }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole('radio', { name: 'Hombres' }).props.accessibilityState.checked).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Eliminar foto' })).toHaveLength(1);
  });

  describe('autosave de texto', () => {
    it('guarda el campo cambiado después de una pausa, sin tocar nada más', async () => {
      await renderScreen();

      await type('Nombre', 'Anita');
      await advance(700);
      expect(mockUpdate).not.toHaveBeenCalled();

      await advance(200);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith('user-1', { name: 'Anita' });
    });

    it('guarda al salir del campo, sin esperar la pausa', async () => {
      await renderScreen();

      await type('Nombre', 'Anita');
      await fireEvent(field('Nombre'), 'blur');

      expect(mockUpdate).toHaveBeenCalledWith('user-1', { name: 'Anita' });
    });

    it('una bio escrita de a poco se guarda completa, en un solo guardado', async () => {
      await renderScreen();

      for (const text of ['H', 'Ho', 'Hol', 'Hola, soy Ana. Me gusta viajar.']) {
        await type('Sobre mí', text);
        await advance(200);
      }
      expect(mockUpdate).not.toHaveBeenCalled();
      await advance(800);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith('user-1', { bio: 'Hola, soy Ana. Me gusta viajar.' });
    });

    it('al cambiar de tab (la pantalla pierde el foco) guarda lo pendiente sin esperar', async () => {
      await renderScreen();

      await type('Sobre mí', 'Hola, soy Ana');
      await act(async () => mockOnBlur());

      expect(mockUpdate).toHaveBeenCalledWith('user-1', { bio: 'Hola, soy Ana' });
    });

    it('guarda la edad como número', async () => {
      await renderScreen();

      await type('Edad', '31');
      await advance(800);

      expect(mockUpdate).toHaveBeenCalledWith('user-1', { age: 31 });
    });

    it('una bio vacía se guarda como null', async () => {
      await renderScreen();

      await type('Sobre mí', '   ');
      await advance(800);

      expect(mockUpdate).toHaveBeenCalledWith('user-1', { bio: null });
    });

    it('junta varios campos tipeados seguidos en un solo guardado', async () => {
      await renderScreen();

      await type('Nombre', 'Anita');
      await type('Edad', '31');
      await advance(800);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith('user-1', { name: 'Anita', age: 31 });
    });
  });

  describe('validación', () => {
    it('una edad menor a 18 muestra el error y no se guarda', async () => {
      await renderScreen();

      await type('Edad', '17');
      await advance(2000);

      expect(screen.getByText('Ingresá una edad entre 18 y 99.')).toBeTruthy();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('al corregir el valor se guarda y el error desaparece', async () => {
      await renderScreen();

      await type('Edad', '17');
      await type('Edad', '18');
      await advance(800);

      expect(screen.queryByText('Ingresá una edad entre 18 y 99.')).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith('user-1', { age: 18 });
    });

    it('un nombre vacío muestra el error y no pisa el guardado, ni con un valor válido pendiente', async () => {
      await renderScreen();

      await type('Nombre', 'A');
      await type('Nombre', '');
      await advance(2000);

      expect(screen.getByText('Ingresá tu nombre.')).toBeTruthy();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('una bio de más de 500 caracteres muestra el error y no se guarda', async () => {
      await renderScreen();

      await type('Sobre mí', 'a'.repeat(501));
      await advance(2000);

      expect(screen.getByText('Tu descripción puede tener hasta 500 caracteres.')).toBeTruthy();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

  });

  describe('género y preferencia', () => {
    it('guarda al instante al tocar una opción', async () => {
      await renderScreen();

      await fireEvent.press(screen.getByRole('radio', { name: 'Otro' }));
      expect(mockUpdate).toHaveBeenCalledWith('user-1', { genderId: 3 });

      await fireEvent.press(screen.getByRole('radio', { name: 'Todos' }));
      expect(mockUpdate).toHaveBeenCalledWith('user-1', { partnerPreferenceId: 3 });
      expect(screen.getByRole('radio', { name: 'Todos' }).props.accessibilityState.checked).toBe(true);
    });
  });

  describe('estado del guardado', () => {
    it('muestra "Guardado" y refresca el perfil cuando termina', async () => {
      await renderScreen();

      await type('Nombre', 'Anita');
      await advance(800);

      expect(screen.getByText('Guardado')).toBeTruthy();
      expect(mockReload).toHaveBeenCalled();

      await advance(2500);
      expect(screen.queryByText('Guardado')).toBeNull();
    });

    it('si falla, avisa y permite reintentar', async () => {
      mockUpdate.mockRejectedValueOnce(new Error('boom'));
      await renderScreen();

      await type('Nombre', 'Anita');
      await advance(800);

      expect(screen.getByText('No pudimos guardar los cambios')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: /No se pudo guardar/ }));

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenLastCalledWith('user-1', { name: 'Anita' });
      expect(screen.getByText('Guardado')).toBeTruthy();
    });

    it('al salir de la pantalla guarda lo que quedaba pendiente', async () => {
      const { unmount } = await renderScreen();

      await type('Nombre', 'Anita');
      await unmount();

      expect(mockUpdate).toHaveBeenCalledWith('user-1', { name: 'Anita' });
    });
  });

  describe('fotos', () => {
    it('no deja borrar la última foto', async () => {
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Eliminar foto' }));

      expect(mockRemovePhoto).not.toHaveBeenCalled();
      expect(screen.getByText('Necesitás al menos una foto.')).toBeTruthy();
    });

    it('deja borrar una foto si queda otra, y refresca el perfil', async () => {
      mockFetchPhotos.mockResolvedValue([
        { id: 'row-1', path: 'u/a.webp', sortOrder: 0 },
        { id: 'row-2', path: 'u/b.webp', sortOrder: 1 },
      ]);
      await renderScreen();

      await fireEvent.press(screen.getAllByRole('button', { name: 'Eliminar foto' })[1]);

      expect(mockRemovePhoto).toHaveBeenCalledWith({ id: 'row-2', path: 'u/b.webp' });
    });
  });

  describe('tipo de salida', () => {
    it('muestra los tipos elegidos y abre la pantalla para editarlos', async () => {
      await renderScreen();

      expect(screen.getByText('Tipo de salida')).toBeTruthy();
      expect(screen.getByText('Cena')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Editar tipo de salida' }));

      expect(navigation.navigate).toHaveBeenCalledWith('EditOutingTypes');
    });

    it('sin tipos elegidos invita a elegirlos', async () => {
      mockProfile = makeProfile({ outingTypes: [] });
      await renderScreen();

      expect(screen.getByText('Elegí tu tipo de salida')).toBeTruthy();
    });
  });

  describe('intereses', () => {
    it('muestra los intereses elegidos y abre la pantalla para editarlos', async () => {
      await renderScreen();

      expect(screen.getByText('Música')).toBeTruthy();
      expect(screen.getByText('Viajes')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Editar intereses' }));

      expect(navigation.navigate).toHaveBeenCalledWith('EditInterests');
    });

    it('sin intereses invita a elegirlos', async () => {
      mockProfile = makeProfile({ interests: [] });
      await renderScreen();

      expect(screen.getByText('Elegí tus intereses')).toBeTruthy();
    });
  });

  describe('es la pantalla de la tab Perfil', () => {
    it('no tiene botón de volver ni de editar: ya es la edición', async () => {
      await renderScreen();

      expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull();
    });

    it('no tiene el aviso de fotos, el título de preferencias ni el campo de Instagram', async () => {
      await renderScreen();

      expect(screen.queryByText('Las fotos se guardan al momento.')).toBeNull();
      expect(screen.queryByText('Preferencias')).toBeNull();
      expect(screen.queryByLabelText('Instagram')).toBeNull();
    });

    it('ordena: fotos, género y "Busco", información básica, intereses', async () => {
      await renderScreen();

      const tree = JSON.stringify(screen.toJSON());
      const at = (text: string) => tree.indexOf(text);
      expect(at('Eliminar foto')).toBeGreaterThan(-1);
      expect(at('Eliminar foto')).toBeLessThan(at('Tu género'));
      expect(at('Tu género')).toBeLessThan(at('Busco'));
      expect(at('Busco')).toBeLessThan(at('Información básica'));
      expect(at('Información básica')).toBeLessThan(at('Intereses'));
      expect(at('Intereses')).toBeLessThan(at('Tipo de salida'));
    });

    it('tiene el botón de cerrar sesión', async () => {
      await renderScreen();

      expect(screen.getByText('SignOutButton')).toBeTruthy();
    });

    it('deja lugar abajo para que el contenido se pueda desplazar por encima de la barra flotante', async () => {
      await renderScreen();

      const style = StyleSheet.flatten(screen.getByTestId('profile-scroll').props.contentContainerStyle);
      // 34 (safe area) + 24 (gap) + 64 (bar) + 32 (air)
      expect(style.paddingBottom).toBe(154);
    });
  });
});
