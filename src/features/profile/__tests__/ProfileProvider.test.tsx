import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

let mockUseAuth: jest.Mock;

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../api', () => ({
  fetchMyProfile: jest.fn(),
}));

import { fetchMyProfile } from '../api';
import { ProfileProvider, useProfile } from '../ProfileProvider';

const profile = {
  name: 'Ana',
  age: 30,
  bio: null,
  complete: false,
  onboardingComplete: false,
  genderCode: null,
  partnerPreferenceCode: null,
  photoPaths: [],
  interests: [],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProfileProvider>{children}</ProfileProvider>
);

describe('ProfileProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth = jest.fn().mockReturnValue({ session: { user: { id: 'user-1' } } });
  });

  it('queda en loading mientras el fetch no termina', async () => {
    (fetchMyProfile as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useProfile(), { wrapper });

    expect(result.current.status).toBe('loading');
    expect(result.current.profile).toBeNull();
  });

  it('pasa a ready con el perfil', async () => {
    (fetchMyProfile as jest.Mock).mockResolvedValue(profile);

    const { result } = await renderHook(() => useProfile(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profile).toEqual(profile);
    expect(fetchMyProfile).toHaveBeenCalledWith('user-1');
  });

  it('pasa a error si el fetch falla y permite reintentar', async () => {
    (fetchMyProfile as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(profile);

    const { result } = await renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('recarga el perfil (por ejemplo al terminar el onboarding) sin pasar por la pantalla de carga', async () => {
    (fetchMyProfile as jest.Mock)
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce({ ...profile, onboardingComplete: true });

    const { result } = await renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => expect(result.current.profile?.onboardingComplete).toBe(true));
    expect(result.current.status).toBe('ready');
  });

  it('no pide nada sin sesión', async () => {
    mockUseAuth.mockReturnValue({ session: null });

    const { result } = await renderHook(() => useProfile(), { wrapper });

    expect(fetchMyProfile).not.toHaveBeenCalled();
    expect(result.current.status).toBe('loading');
  });

  it('descarta el perfil del usuario anterior al cerrar sesión', async () => {
    (fetchMyProfile as jest.Mock).mockResolvedValue(profile);
    const { result, rerender } = await renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    mockUseAuth.mockReturnValue({ session: null });
    await rerender({});

    await waitFor(() => expect(result.current.status).toBe('loading'));
    expect(result.current.profile).toBeNull();
  });

  it('useProfile falla fuera del provider', async () => {
    function Probe() {
      useProfile();
      return <Text>ok</Text>;
    }

    await expect(render(<Probe />)).rejects.toThrow('useProfile must be used inside a ProfileProvider');
  });
});
