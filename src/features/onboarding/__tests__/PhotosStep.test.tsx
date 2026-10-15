import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';

const mockPick = jest.fn();
const mockProcess = jest.fn();
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockFetchPhotos = jest.fn();
const mockSignOut = jest.fn();

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockPick(...args),
}));

jest.mock('../imagePipeline', () => ({
  processPhoto: (...args: unknown[]) => mockProcess(...args),
}));

jest.mock('../api', () => ({
  uploadProfilePhoto: (...args: unknown[]) => mockUpload(...args),
  removeProfilePhoto: (...args: unknown[]) => mockRemove(...args),
  fetchMyPhotos: (...args: unknown[]) => mockFetchPhotos(...args),
  photoUrl: (path: string) => `https://cdn.test/${path}`,
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

jest.mock('@/features/auth/api', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

import { PhotosStep } from '../PhotosStep';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

function renderStep() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PhotosStep navigation={navigation as never} route={{} as never} />
    </SafeAreaProvider>
  );
}

const asset = (n: number) => ({ uri: `file:///picked-${n}.jpg`, width: 3000, height: 4000 });
const processed = (n: number) => ({
  display: { uri: `file:///display-${n}.webp`, width: 480, height: 640 },
  thumb: { uri: `file:///thumb-${n}.webp`, width: 160, height: 160 },
});

const continueButton = () => screen.getByRole('button', { name: 'Continuar' });

describe('PhotosStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchPhotos.mockResolvedValue([]);
    mockProcess.mockImplementation(async (uri: string) => processed(Number(uri.match(/\d+/)?.[0])));
    let id = 0;
    mockUpload.mockImplementation(async ({ sortOrder }: { sortOrder: number }) => ({
      id: `row-${++id}`,
      path: `users/user-1/profile/p${sortOrder}.webp`,
      sortOrder,
    }));
    mockRemove.mockResolvedValue(undefined);
  });

  it('muestra el título, 6 casillas para agregar fotos y el consejo', async () => {
    await renderStep();

    expect(screen.getByText('Agregá tus fotos')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Agregar foto' })).toHaveLength(6);
    expect(screen.getByText(/Usá fotos reales/)).toBeTruthy();
  });

  it('Continuar está deshabilitado sin fotos y no muestra ningún texto debajo del botón', async () => {
    await renderStep();

    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.queryByText(/al menos 1 foto/)).toBeNull();
  });

  it('con una sola foto subida Continuar se habilita', async () => {
    mockPick.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    await renderStep();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);

    await waitFor(() =>
      expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false })
    );
    expect(mockUpload).toHaveBeenCalledWith({
      userId: 'user-1',
      photo: processed(1),
      sortOrder: 0,
    });
    expect(screen.getAllByRole('button', { name: 'Agregar foto' })).toHaveLength(5);
    expect(screen.getByText('Principal')).toBeTruthy();
  });

  it('deja elegir varias fotos a la vez, hasta las casillas libres, con órdenes consecutivos', async () => {
    mockPick.mockResolvedValue({ canceled: false, assets: [asset(1), asset(2), asset(3)] });
    await renderStep();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(3));
    expect(mockPick).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 6, quality: 1 })
    );
    expect(mockUpload.mock.calls.map((call) => call[0].sortOrder).sort()).toEqual([0, 1, 2]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Agregar foto' })).toHaveLength(3));
  });

  it('no hace nada si se cancela la selección', async () => {
    mockPick.mockResolvedValue({ canceled: true, assets: null });
    await renderStep();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);

    expect(mockUpload).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: 'Agregar foto' })).toHaveLength(6);
  });

  it('mientras sube muestra un spinner y no habilita Continuar', async () => {
    mockUpload.mockReturnValue(new Promise(() => {}));
    mockPick.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    await renderStep();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);

    expect(await screen.findByTestId('photo-tile-spinner')).toBeTruthy();
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('si falla la subida muestra el error, no habilita Continuar y permite reintentar sin reprocesar', async () => {
    mockUpload.mockRejectedValueOnce(new Error('boom'));
    mockPick.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    await renderStep();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);
    expect(await screen.findByText('No se pudo subir')).toBeTruthy();
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false })
    );
    expect(mockProcess).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('permite eliminar una foto subida y vuelve a mostrar la casilla', async () => {
    mockPick.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    await renderStep();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);
    await waitFor(() =>
      expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false })
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar foto' }));

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Agregar foto' })).toHaveLength(6));
    expect(mockRemove).toHaveBeenCalledWith({ id: 'row-1', path: 'users/user-1/profile/p0.webp' });
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('si no se puede eliminar, la foto sigue ahí', async () => {
    mockRemove.mockRejectedValue(new Error('boom'));
    mockPick.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    await renderStep();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);
    await waitFor(() =>
      expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false })
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar foto' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Eliminar foto' })).toBeTruthy());
    expect(screen.getAllByRole('button', { name: 'Agregar foto' })).toHaveLength(5);
  });

  it('con 6 fotos ya no quedan casillas para agregar', async () => {
    mockFetchPhotos.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, path: `users/user-1/profile/${i}.webp`, sortOrder: i }))
    );
    await renderStep();

    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Agregar foto' })).toHaveLength(0));
    expect(screen.getAllByRole('button', { name: 'Eliminar foto' })).toHaveLength(6);
  });

  it('retoma las fotos ya subidas (si el usuario vuelve a este paso)', async () => {
    mockFetchPhotos.mockResolvedValue([
      { id: 'r0', path: 'users/user-1/profile/a.webp', sortOrder: 0 },
      { id: 'r1', path: 'users/user-1/profile/b.webp', sortOrder: 1 },
    ]);
    await renderStep();

    await waitFor(() => expect(screen.getAllByTestId('photo-tile-image')).toHaveLength(2));
    expect(screen.getAllByTestId('photo-tile-image')[0].props.source).toEqual({
      uri: 'https://cdn.test/users/user-1/profile/a.webp',
    });
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false });
    // The next free order is used for new photos.
    mockPick.mockResolvedValue({ canceled: false, assets: [asset(3)] });
    await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar foto' })[0]);
    await waitFor(() =>
      expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 2 }))
    );
  });

  it('Continuar lleva al siguiente paso', async () => {
    mockFetchPhotos.mockResolvedValue([{ id: 'r0', path: 'users/user-1/profile/a.webp', sortOrder: 0 }]);
    await renderStep();
    await waitFor(() =>
      expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false })
    );

    await fireEvent.press(continueButton());

    expect(navigation.navigate).toHaveBeenCalledWith('Details');
  });

  it('no hay "Saltar"; "Cerrar sesión" va debajo de Continuar y no en la barra de arriba', async () => {
    await renderStep();

    expect(screen.queryByText('Saltar')).toBeNull();
    const logout = screen.getByRole('button', { name: 'Cerrar sesión' });
    expect(screen.getAllByRole('button', { name: 'Cerrar sesión' })).toHaveLength(1);
    const order = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel);
    expect(order.indexOf('Cerrar sesión')).toBeGreaterThan(order.indexOf('Continuar'));

    await fireEvent.press(logout);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('muestra el progreso: paso 1 de 2', async () => {
    await renderStep();

    expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe('Paso 1 de 2');
  });
});
