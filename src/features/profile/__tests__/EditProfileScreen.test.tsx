import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

jest.mock('../ProfileProvider', () => ({
  useProfile: () => ({ status: 'ready', profile: mockProfile, reload: mockReload }),
}));

import { ToastProvider } from '@/components/Toast/ToastProvider';
import { EditProfileScreen } from '../EditProfileScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Ana',
    age: 30,
    bio: 'Hola, soy Ana',
    instagram: 'ana.p',
    complete: true,
    onboardingComplete: true,
    genderCode: 'female',
    partnerPreferenceCode: 'men',
    photoPaths: ['u/a.webp'],
    interests: [
      { code: 'music', labels: { es: 'Música' } },
      { code: 'travel', labels: { es: 'Viajes' } },
    ],
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <EditProfileScreen navigation={navigation as never} route={{} as never} />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const field = (label: string) => screen.getByLabelText(label);
const type = (label: string, text: string) => fireEvent.changeText(field(label), text);
const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

describe('EditProfileScreen', () => {
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
    expect(field('Instagram').props.value).toBe('ana.p');
    expect(screen.getByText('Editar perfil')).toBeTruthy();
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

    it('limpia el usuario de Instagram antes de guardarlo', async () => {
      await renderScreen();

      await type('Instagram', '@ana.perez');
      await advance(800);

      expect(mockUpdate).toHaveBeenCalledWith('user-1', { instagram: 'ana.perez' });
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

    it('un Instagram con caracteres inválidos muestra el error y no se guarda', async () => {
      await renderScreen();

      await type('Instagram', 'ana perez!');
      await advance(2000);

      expect(screen.getByText('Usá solo letras, números, puntos y guiones bajos.')).toBeTruthy();
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

  it('el botón de volver vuelve a la pantalla anterior', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
