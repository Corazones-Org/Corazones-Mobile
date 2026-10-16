import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';

const mockFetch = jest.fn();
const mockAdd = jest.fn();
const mockRemove = jest.fn();
const mockReload = jest.fn();
let mockProfile: { outingTypes: { code: string; labels: Record<string, string> }[] };

jest.mock('../api', () => ({
  fetchOutingTypesCatalog: (...args: unknown[]) => mockFetch(...args),
  addMyOutingType: (...args: unknown[]) => mockAdd(...args),
  removeMyOutingType: (...args: unknown[]) => mockRemove(...args),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

jest.mock('../ProfileProvider', () => ({
  useProfile: () => ({ status: 'ready', profile: mockProfile, reload: mockReload }),
}));

import { ToastProvider } from '@/components/Toast/ToastProvider';
import { EditOutingTypesScreen } from '../EditOutingTypesScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

const catalog = [
  ['breakfast', 'Desayuno'], ['brunch', 'Brunch'], ['lunch', 'Almuerzo'], ['coffee', 'Café'],
  ['dinner', 'Cena'], ['drinks', 'Tragos'], ['club', 'Boliche'], ['cinema', 'Cine'],
  ['concert', 'Recital'], ['park', 'Parque'], ['beach', 'Playa'], ['hotel_encounter', 'Encuentro en hotel'],
].map(([code, es], index) => ({ id: index + 1, code, labels: { es } }));

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <EditOutingTypesScreen navigation={navigation as never} route={{} as never} />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const chip = (name: string) => screen.getByRole('checkbox', { name });

describe('EditOutingTypesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProfile = { outingTypes: [{ code: 'dinner', labels: { es: 'Cena' } }] };
    mockFetch.mockResolvedValue(catalog);
    mockAdd.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  it('muestra todos los tipos de salida, con los del perfil marcados, y el contador', async () => {
    await renderScreen();

    await waitFor(() => expect(chip('Cena')).toBeTruthy());
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
    expect(chip('Cena').props.accessibilityState.checked).toBe(true);
    expect(chip('Encuentro en hotel').props.accessibilityState.checked).toBe(false);
    expect(screen.getByText('Tipo de salida')).toBeTruthy();
    expect(screen.getByText('Elegí qué planes te copan · 1 elegidos')).toBeTruthy();
  });

  it('al tocar uno lo guarda al instante y refresca el perfil', async () => {
    await renderScreen();
    await waitFor(() => expect(chip('Encuentro en hotel')).toBeTruthy());

    await fireEvent.press(chip('Encuentro en hotel'));

    expect(chip('Encuentro en hotel').props.accessibilityState.checked).toBe(true);
    expect(mockAdd).toHaveBeenCalledWith('user-1', 12);
    await waitFor(() => expect(mockReload).toHaveBeenCalled());
  });

  it('al tocar uno elegido lo quita', async () => {
    await renderScreen();
    await waitFor(() => expect(chip('Cena')).toBeTruthy());

    await fireEvent.press(chip('Cena'));

    expect(chip('Cena').props.accessibilityState.checked).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith('user-1', 5);
  });

  it('si falla, deshace el cambio y avisa', async () => {
    mockAdd.mockRejectedValueOnce(new Error('boom'));
    await renderScreen();
    await waitFor(() => expect(chip('Cine')).toBeTruthy());

    await fireEvent.press(chip('Cine'));

    await waitFor(() => expect(chip('Cine').props.accessibilityState.checked).toBe(false));
    expect(screen.getByText('No pudimos guardar los cambios')).toBeTruthy();
  });

  it('no tiene tope: con todos elegidos ninguno queda deshabilitado', async () => {
    mockProfile = { outingTypes: catalog.slice(0, 11).map(({ code, labels }) => ({ code, labels })) };
    await renderScreen();
    await waitFor(() => expect(chip('Cena')).toBeTruthy());

    await fireEvent.press(chip('Encuentro en hotel'));

    expect(chip('Encuentro en hotel').props.accessibilityState.disabled).toBe(false);
    expect(mockAdd).toHaveBeenCalledWith('user-1', 12);
  });

  it('si no carga el catálogo avisa y permite reintentar', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    await renderScreen();

    await waitFor(() => expect(screen.getByText('No pudimos cargar los tipos de salida')).toBeTruthy());
    mockFetch.mockResolvedValue(catalog);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(chip('Cena')).toBeTruthy());
  });

  it('el botón de volver vuelve a la pantalla anterior', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
