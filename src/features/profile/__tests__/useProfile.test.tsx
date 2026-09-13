import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}));

jest.mock('../api', () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  uploadProfilePhoto: jest.fn(),
  getProfilePhotoUrl: jest.fn(),
}));

import { getProfile } from '../api';
import { useProfile } from '../useProfile';

const mockGetProfile = getProfile as jest.Mock;

describe('useProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('carga el perfil del usuario actual', async () => {
    mockGetProfile.mockResolvedValue({
      profile: { id: 'p1', userId: 'u1', name: 'Tomas', age: null, mainPhoto: null, partnerPreferenceId: null, instagram: null, profileComplete: false },
      error: null,
    });

    const { result } = await renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetProfile).toHaveBeenCalledWith('u1');
    expect(result.current.profile?.name).toBe('Tomas');
  });
});
