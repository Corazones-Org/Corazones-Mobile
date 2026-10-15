import { act, renderHook, waitFor } from '@testing-library/react-native';

let mockUseAuth: jest.Mock;

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../api', () => ({
  fetchMyProfile: jest.fn(),
}));

import { fetchMyProfile } from '../api';
import { useMyProfile } from '../useMyProfile';

const profile = {
  name: 'Ana',
  age: 30,
  bio: null,
  complete: false,
  genderCode: null,
  partnerPreferenceCode: null,
  photoPaths: [],
  interests: [],
};

describe('useMyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth = jest.fn().mockReturnValue({ session: { user: { id: 'user-1' } } });
  });

  it('queda en loading mientras el fetch no termina', async () => {
    (fetchMyProfile as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useMyProfile());

    expect(result.current.status).toBe('loading');
  });

  it('pasa a ready con el perfil', async () => {
    (fetchMyProfile as jest.Mock).mockResolvedValue(profile);

    const { result } = await renderHook(() => useMyProfile());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profile).toEqual(profile);
    expect(fetchMyProfile).toHaveBeenCalledWith('user-1');
  });

  it('pasa a error si el fetch falla y permite reintentar', async () => {
    (fetchMyProfile as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(profile);

    const { result } = await renderHook(() => useMyProfile());
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
