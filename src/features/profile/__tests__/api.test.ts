const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...(args as [])) },
}));

import { fetchMyProfile } from '../api';

describe('fetchMyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pide el perfil del usuario con sus relaciones', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'x' } });

    await fetchMyProfile('user-1').catch(() => {});

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('devuelve el perfil aplanado, con fotos ordenadas e intereses', async () => {
    mockSingle.mockResolvedValue({
      data: {
        name: 'Ana',
        age: 30,
        bio: 'Hola',
        profile_complete: true,
        onboarding_completed_at: '2026-10-15T12:00:00Z',
        gender: { code: 'female' },
        partner_preference: { code: 'men' },
        photos: [
          { storage_path: 'u/b.jpg', sort_order: 1 },
          { storage_path: 'u/a.jpg', sort_order: 0 },
        ],
        interests: [{ interest: { code: 'music', labels: { es: 'Música', en: 'Music' } } }],
      },
      error: null,
    });

    const profile = await fetchMyProfile('user-1');

    expect(profile).toEqual({
      name: 'Ana',
      age: 30,
      bio: 'Hola',
      complete: true,
      onboardingComplete: true,
      genderCode: 'female',
      partnerPreferenceCode: 'men',
      photoPaths: ['u/a.jpg', 'u/b.jpg'],
      interests: [{ code: 'music', labels: { es: 'Música', en: 'Music' } }],
    });
  });

  it('acepta un perfil recién creado, con todo vacío', async () => {
    mockSingle.mockResolvedValue({
      data: {
        name: 'Ana',
        age: null,
        bio: null,
        profile_complete: false,
        onboarding_completed_at: null,
        gender: null,
        partner_preference: null,
        photos: [],
        interests: [],
      },
      error: null,
    });

    const profile = await fetchMyProfile('user-1');

    expect(profile).toMatchObject({
      name: 'Ana',
      age: null,
      genderCode: null,
      partnerPreferenceCode: null,
      photoPaths: [],
      interests: [],
      complete: false,
      onboardingComplete: false,
    });
  });

  it('lanza si Supabase devuelve error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(fetchMyProfile('user-1')).rejects.toBeTruthy();
  });
});
