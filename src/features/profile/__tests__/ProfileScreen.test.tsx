import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import '@/i18n';

const mockSave = jest.fn();
let mockUseProfile: jest.Mock;

jest.mock('../useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

jest.mock('../api', () => ({
  getPartnerPreferences: jest.fn(),
  getProfilePhotoUrl: jest.fn(),
}));

import { getPartnerPreferences, getProfilePhotoUrl } from '../api';
import { ProfileScreen } from '../ProfileScreen';

const mockGetPartnerPreferences = getPartnerPreferences as jest.Mock;
const mockGetProfilePhotoUrl = getProfilePhotoUrl as jest.Mock;
const mockPickAndUploadPhoto = jest.fn();

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue({ error: null });
    mockGetPartnerPreferences.mockResolvedValue({
      preferences: [
        { id: 1, code: 'men' },
        { id: 2, code: 'women' },
        { id: 3, code: 'everyone' },
      ],
      error: null,
    });
    mockGetProfilePhotoUrl.mockResolvedValue({ url: null, error: null });
    mockPickAndUploadPhoto.mockResolvedValue({ error: null });
    mockUseProfile = jest.fn().mockReturnValue({
      profile: {
        id: 'p1',
        userId: 'u1',
        name: 'Tomas',
        age: 30,
        mainPhoto: null,
        partnerPreferenceId: null,
        instagram: 'tomas',
        profileComplete: false,
      },
      loading: false,
      error: null,
      save: mockSave,
      pickAndUploadPhoto: mockPickAndUploadPhoto,
    });
  });

  it('muestra un loading mientras carga el perfil', async () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      save: mockSave,
    });

    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('Cargando...')).toBeTruthy();
  });

  it('muestra un error en vez de quedar cargando para siempre si falla la carga del perfil', async () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: 'infinite recursion detected in policy for relation "time_slot_registrations"',
      save: mockSave,
      pickAndUploadPhoto: mockPickAndUploadPhoto,
    });

    const { getByText, queryByText } = await render(<ProfileScreen />);

    expect(getByText('No se pudo cargar tu perfil. Probá de nuevo.')).toBeTruthy();
    expect(queryByText('Cargando...')).toBeNull();
  });

  it('precarga los campos con los datos del perfil existente', async () => {
    const { getByDisplayValue } = await render(<ProfileScreen />);

    expect(getByDisplayValue('Tomas')).toBeTruthy();
    expect(getByDisplayValue('30')).toBeTruthy();
    expect(getByDisplayValue('tomas')).toBeTruthy();
  });

  it('guarda los cambios al tocar Guardar', async () => {
    const { getByText, getByDisplayValue } = await render(<ProfileScreen />);

    fireEvent.changeText(getByDisplayValue('Tomas'), 'Tomas Nuevo');

    await waitFor(() => {
      expect(getByDisplayValue('Tomas Nuevo')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Guardar'));
    });

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Tomas Nuevo' })
    );
  });

  it('muestra un error si falla el guardado', async () => {
    mockSave.mockResolvedValue({ error: { message: 'fail' } });

    const { getByText } = await render(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(getByText('Guardar'));
    });

    expect(getByText('No se pudo guardar el perfil. Probá de nuevo.')).toBeTruthy();
  });

  it('permite elegir una preferencia de pareja y la incluye al guardar', async () => {
    const { getByText } = await render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Mujeres')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Mujeres'));
    });

    await act(async () => {
      fireEvent.press(getByText('Guardar'));
    });

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ partnerPreferenceId: 2 })
    );
  });

  it('llama a pickAndUploadPhoto al tocar Elegir foto', async () => {
    const { getByText } = await render(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(getByText('Elegir foto'));
    });

    expect(mockPickAndUploadPhoto).toHaveBeenCalled();
  });
});
