jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

import { supabase } from '@/lib/supabase';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getProfilePhotoUrl,
  getPartnerPreferences,
} from '../api';

const mockFrom = supabase.from as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;

const mockSingle = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq, order: mockOrder }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));

const mockUpload = jest.fn();
const mockCreateSignedUrl = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
  mockStorageFrom.mockReturnValue({ upload: mockUpload, createSignedUrl: mockCreateSignedUrl });
});

describe('getProfile', () => {
  it('mapea la fila de Supabase a un Profile', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'p1',
        user_id: 'u1',
        name: 'Tomas',
        age: 30,
        main_photo: 'u1/photo.jpg',
        partner_preference_id: 1,
        instagram: 'tomas',
        profile_complete: true,
      },
      error: null,
    });

    const result = await getProfile('u1');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(result.profile).toEqual({
      id: 'p1',
      userId: 'u1',
      name: 'Tomas',
      age: 30,
      mainPhoto: 'u1/photo.jpg',
      partnerPreferenceId: 1,
      instagram: 'tomas',
      profileComplete: true,
    });
    expect(result.error).toBeNull();
  });

  it('propaga el error si Supabase falla', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const result = await getProfile('u1');

    expect(result.profile).toBeNull();
    expect(result.error).toEqual({ message: 'not found' });
  });
});

describe('updateProfile', () => {
  it('mapea el update a snake_case y filtra por user_id', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    await updateProfile('u1', { name: 'Nuevo', age: 25, mainPhoto: 'u1/x.jpg' });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'Nuevo',
      age: 25,
      main_photo: 'u1/x.jpg',
    });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
  });
});

describe('uploadProfilePhoto', () => {
  it('sube el archivo con un path prefijado por user_id', async () => {
    mockUpload.mockResolvedValue({ error: null });

    const result = await uploadProfilePhoto('u1', {
      uri: 'file:///photo.jpg',
      blob: new Blob(),
      fileExt: 'jpg',
    });

    expect(mockStorageFrom).toHaveBeenCalledWith('profile-photos');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^u1\//),
      expect.anything(),
      expect.objectContaining({ upsert: true })
    );
    expect(result.path).toMatch(/^u1\//);
    expect(result.error).toBeNull();
  });

  it('propaga el error si la subida falla', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'upload failed' } });

    const result = await uploadProfilePhoto('u1', {
      uri: 'file:///photo.jpg',
      blob: new Blob(),
      fileExt: 'jpg',
    });

    expect(result.path).toBeNull();
    expect(result.error).toEqual({ message: 'upload failed' });
  });
});

describe('getProfilePhotoUrl', () => {
  it('genera una signed URL para el path dado', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/x.jpg' },
      error: null,
    });

    const result = await getProfilePhotoUrl('u1/main.jpg');

    expect(mockStorageFrom).toHaveBeenCalledWith('profile-photos');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('u1/main.jpg', expect.any(Number));
    expect(result.url).toBe('https://signed.example.com/x.jpg');
    expect(result.error).toBeNull();
  });

  it('devuelve null si falla la firma', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const result = await getProfilePhotoUrl('u1/main.jpg');

    expect(result.url).toBeNull();
    expect(result.error).toEqual({ message: 'not found' });
  });
});

describe('getPartnerPreferences', () => {
  it('devuelve el catálogo ordenado', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 1, code: 'men' },
        { id: 2, code: 'women' },
      ],
      error: null,
    });

    const result = await getPartnerPreferences();

    expect(mockFrom).toHaveBeenCalledWith('partner_preferences');
    expect(mockOrder).toHaveBeenCalledWith('sort_order');
    expect(result.preferences).toEqual([
      { id: 1, code: 'men' },
      { id: 2, code: 'women' },
    ]);
    expect(result.error).toBeNull();
  });
});
