import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';

const mockFetchInterests = jest.fn();
const mockAdd = jest.fn();
const mockRemove = jest.fn();
const mockReload = jest.fn();
let mockProfile: { interests: { code: string; labels: Record<string, string> }[] };

jest.mock('../api', () => ({
  fetchInterestsCatalog: (...args: unknown[]) => mockFetchInterests(...args),
  addMyInterest: (...args: unknown[]) => mockAdd(...args),
  removeMyInterest: (...args: unknown[]) => mockRemove(...args),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

jest.mock('../ProfileProvider', () => ({
  useProfile: () => ({ status: 'ready', profile: mockProfile, reload: mockReload }),
}));

import { ToastProvider } from '@/components/Toast/ToastProvider';
import { EditInterestsScreen } from '../EditInterestsScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

const catalog = [
  ['music', 'Música'], ['travel', 'Viajes'], ['cinema', 'Cine'], ['sports', 'Deportes'],
  ['technology', 'Tecnología'], ['gastronomy', 'Gastronomía'], ['gym', 'Gimnasio'],
  ['beach', 'Playa'], ['trekking', 'Trekking'], ['reading', 'Lectura'], ['art', 'Arte'],
  ['dancing', 'Baile'],
].map(([code, es], index) => ({ id: index + 1, code, labels: { es } }));

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <EditInterestsScreen navigation={navigation as never} route={{} as never} />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const chip = (name: string) => screen.getByRole('checkbox', { name });

describe('EditInterestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProfile = { interests: [{ code: 'music', labels: { es: 'Música' } }] };
    mockFetchInterests.mockResolvedValue(catalog);
    mockAdd.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  it('muestra todos los intereses, con los del perfil marcados, y el contador', async () => {
    await renderScreen();

    await waitFor(() => expect(chip('Música')).toBeTruthy());
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
    expect(chip('Música').props.accessibilityState.checked).toBe(true);
    expect(chip('Viajes').props.accessibilityState.checked).toBe(false);
    expect(screen.getByText('Seleccioná tus intereses (máx. 10) · 1 elegidos')).toBeTruthy();
  });

  it('al tocar un interés lo guarda al instante y refresca el perfil', async () => {
    await renderScreen();
    await waitFor(() => expect(chip('Viajes')).toBeTruthy());

    await fireEvent.press(chip('Viajes'));

    expect(chip('Viajes').props.accessibilityState.checked).toBe(true);
    expect(mockAdd).toHaveBeenCalledWith('user-1', 2);
    await waitFor(() => expect(mockReload).toHaveBeenCalled());
    expect(screen.getByText('Seleccioná tus intereses (máx. 10) · 2 elegidos')).toBeTruthy();
  });

  it('al tocar uno elegido lo quita', async () => {
    await renderScreen();
    await waitFor(() => expect(chip('Música')).toBeTruthy());

    await fireEvent.press(chip('Música'));

    expect(chip('Música').props.accessibilityState.checked).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith('user-1', 1);
  });

  it('si falla, deshace el cambio y avisa', async () => {
    mockAdd.mockRejectedValueOnce(new Error('boom'));
    await renderScreen();
    await waitFor(() => expect(chip('Viajes')).toBeTruthy());

    await fireEvent.press(chip('Viajes'));

    await waitFor(() => expect(chip('Viajes').props.accessibilityState.checked).toBe(false));
    expect(screen.getByText('No pudimos guardar los cambios')).toBeTruthy();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('con 10 elegidos deshabilita los demás y no guarda más', async () => {
    mockProfile = {
      interests: catalog.slice(0, 10).map(({ code, labels }) => ({ code, labels })),
    };
    await renderScreen();
    await waitFor(() => expect(chip('Música')).toBeTruthy());

    expect(chip('Arte').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(chip('Arte'));

    expect(mockAdd).not.toHaveBeenCalled();
    // Los elegidos siguen pudiendo quitarse.
    expect(chip('Música').props.accessibilityState.disabled).toBe(false);
  });

  it('si no carga el catálogo avisa y permite reintentar', async () => {
    mockFetchInterests.mockRejectedValueOnce(new Error('boom'));
    await renderScreen();

    await waitFor(() => expect(screen.getByText('No pudimos cargar los intereses')).toBeTruthy());
    mockFetchInterests.mockResolvedValue(catalog);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(chip('Música')).toBeTruthy());
  });

  it('el botón de volver vuelve a la pantalla anterior', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
