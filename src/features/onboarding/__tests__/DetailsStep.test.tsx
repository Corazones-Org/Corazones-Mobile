import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';

const mockFetchCatalogs = jest.fn();
const mockSave = jest.fn();
const mockReload = jest.fn();
const mockSignOut = jest.fn();
let mockProfile: Record<string, unknown>;

jest.mock('../api', () => ({
  fetchCatalogs: (...args: unknown[]) => mockFetchCatalogs(...args),
  saveOnboardingDetails: (...args: unknown[]) => mockSave(...args),
}));

jest.mock('@/features/auth/api', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

jest.mock('@/features/profile/ProfileProvider', () => ({
  useProfile: () => ({ status: 'ready', profile: mockProfile, reload: mockReload }),
}));

import { ToastProvider } from '@/components/Toast/ToastProvider';
import { DetailsStep } from '../DetailsStep';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn() };

function renderStep() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <DetailsStep navigation={navigation as never} route={{} as never} />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const catalogs = {
  genders: [
    { id: 1, code: 'male' },
    { id: 2, code: 'female' },
    { id: 3, code: 'other' },
  ],
  partnerPreferences: [
    { id: 10, code: 'men' },
    { id: 11, code: 'women' },
    { id: 12, code: 'everyone' },
  ],
};

const continueButton = () => screen.getByRole('button', { name: 'Continuar' });
const tile = (name: string) => screen.getByRole('radio', { name });
const isChecked = (name: string) => tile(name).props.accessibilityState.checked;

describe('DetailsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchCatalogs.mockResolvedValue(catalogs);
    mockSave.mockResolvedValue(undefined);
    mockReload.mockResolvedValue(undefined);
    mockProfile = { genderCode: null, partnerPreferenceCode: null, photoPaths: ['a'] };
  });

  it('muestra las opciones de género y de lo que busca, en el orden del diseño', async () => {
    await renderStep();

    expect(await screen.findByText('Contanos sobre vos')).toBeTruthy();
    expect(screen.getByText('Tu género')).toBeTruthy();
    expect(screen.getByText('Busco')).toBeTruthy();
    const labels = screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel);
    expect(labels).toEqual(['Mujer', 'Hombre', 'Otro', 'Mujeres', 'Hombres', 'Todos']);
  });

  it('no pide edad ni fecha de nacimiento', async () => {
    await renderStep();
    await screen.findByText('Tu género');

    expect(screen.queryByText(/nacimiento/i)).toBeNull();
    expect(screen.queryByText(/edad/i)).toBeNull();
  });

  it('Continuar arranca deshabilitado y se habilita solo cuando están las dos elecciones', async () => {
    await renderStep();
    await screen.findByText('Tu género');
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(tile('Mujer'));
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(tile('Hombres'));
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('las opciones de cada grupo son excluyentes y los grupos no se pisan', async () => {
    await renderStep();
    await screen.findByText('Tu género');

    await fireEvent.press(tile('Mujer'));
    await fireEvent.press(tile('Mujeres'));
    expect(isChecked('Mujer')).toBe(true);
    expect(isChecked('Mujeres')).toBe(true);

    await fireEvent.press(tile('Hombre'));
    expect(isChecked('Hombre')).toBe(true);
    expect(isChecked('Mujer')).toBe(false);
    expect(isChecked('Mujeres')).toBe(true);

    await fireEvent.press(tile('Todos'));
    expect(isChecked('Todos')).toBe(true);
    expect(isChecked('Mujeres')).toBe(false);
    expect(isChecked('Hombre')).toBe(true);
  });

  it('retoma las elecciones guardadas', async () => {
    mockProfile = { genderCode: 'other', partnerPreferenceCode: 'women', photoPaths: ['a'] };

    await renderStep();
    await screen.findByText('Tu género');

    expect(isChecked('Otro')).toBe(true);
    expect(isChecked('Mujeres')).toBe(true);
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('al continuar guarda las dos elecciones y recarga el perfil (eso abre la app)', async () => {
    await renderStep();
    await screen.findByText('Tu género');
    await fireEvent.press(tile('Hombre'));
    await fireEvent.press(tile('Todos'));

    await fireEvent.press(continueButton());

    await waitFor(() => expect(mockReload).toHaveBeenCalledTimes(1));
    expect(mockSave).toHaveBeenCalledWith('user-1', { genderId: 1, partnerPreferenceId: 12 });
    expect(mockSave.mock.invocationCallOrder[0]).toBeLessThan(mockReload.mock.invocationCallOrder[0]);
  });

  it('si no se pudo guardar avisa con un toast, no recarga y deja intentar de nuevo', async () => {
    mockSave.mockRejectedValueOnce(new Error('boom'));
    await renderStep();
    await screen.findByText('Tu género');
    await fireEvent.press(tile('Mujer'));
    await fireEvent.press(tile('Hombres'));

    await fireEvent.press(continueButton());

    expect(await screen.findByText('No pudimos guardar tus datos')).toBeTruthy();
    expect(screen.getByText('Probá de nuevo.')).toBeTruthy();
    expect(mockReload).not.toHaveBeenCalled();

    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockReload).toHaveBeenCalledTimes(1));
  });

  it('si no cargan las opciones avisa con un toast y permite reintentar', async () => {
    mockFetchCatalogs.mockRejectedValueOnce(new Error('boom'));
    await renderStep();

    expect(await screen.findByText('No pudimos cargar las opciones')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Tu género')).toBeTruthy();
    expect(mockFetchCatalogs).toHaveBeenCalledTimes(2);
  });

  it('tiene botón de volver y no tiene "Saltar"', async () => {
    navigation.canGoBack.mockReturnValue(true);
    await renderStep();
    await screen.findByText('Tu género');

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Saltar')).toBeNull();
  });

  it('si se retomó el onboarding acá (no hay pantalla anterior), volver lleva a las fotos sin romper', async () => {
    navigation.canGoBack.mockReturnValue(false);
    await renderStep();
    await screen.findByText('Tu género');

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('Photos');
  });

  it('no muestra textos de ayuda debajo del botón; solo "Cerrar sesión"', async () => {
    await renderStep();
    await screen.findByText('Tu género');

    expect(screen.queryByText(/Elegí una opción/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('muestra el progreso: paso 2 de 2', async () => {
    await renderStep();
    await screen.findByText('Tu género');

    expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe('Paso 2 de 2');
  });
});
