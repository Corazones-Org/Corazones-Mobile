// A chainable query: every method returns the same object, and awaiting it gives `result`.
function chain(result: unknown) {
  const query: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return query;
}

let mockTables: Record<string, ReturnType<typeof chain>>;
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockGetPublicUrl = jest.fn((path: string) => ({
  data: { publicUrl: `https://cdn.test/${path}` },
}));
const mockStorageFrom = jest.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  getPublicUrl: mockGetPublicUrl,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockTables[table],
    storage: { from: (...args: unknown[]) => mockStorageFrom(...(args as [])) },
  },
}));

import {
  fetchCatalogs,
  fetchMyPhotos,
  photoUrl,
  removeProfilePhoto,
  saveOnboardingDetails,
  thumbUrl,
  uploadProfilePhoto,
} from '../api';

const processed = {
  display: { uri: 'file:///display.webp', width: 480, height: 640 },
  thumb: { uri: 'file:///thumb.webp', width: 160, height: 160 },
};

describe('onboarding api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockTables = {};
    mockUpload.mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: null });
    global.fetch = jest.fn(async (uri: string) => ({
      arrayBuffer: async () => new TextEncoder().encode(uri).buffer,
    })) as unknown as typeof fetch;
  });

  describe('uploadProfilePhoto', () => {
    it('sube la foto y la miniatura al bucket del ambiente y guarda la fila', async () => {
      mockTables.profile_photos = chain({ data: { id: 'row-1' }, error: null });

      const stored = await uploadProfilePhoto({ userId: 'user-1', photo: processed, sortOrder: 2 });

      expect(mockStorageFrom).toHaveBeenCalledWith('develop');
      const paths = mockUpload.mock.calls.map((call) => call[0] as string);
      expect(paths[0]).toMatch(/^users\/user-1\/profile\/[a-z0-9]+\.webp$/);
      expect(paths[1]).toBe(paths[0].replace('.webp', '_thumb.webp'));
      expect(mockUpload.mock.calls[0][2]).toMatchObject({ contentType: 'image/webp', upsert: false });
      expect(mockTables.profile_photos.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        storage_path: paths[0],
        sort_order: 2,
      });
      expect(stored).toEqual({ id: 'row-1', path: paths[0], sortOrder: 2 });
    });

    it('lee los archivos locales para subirlos', async () => {
      mockTables.profile_photos = chain({ data: { id: 'row-1' }, error: null });

      await uploadProfilePhoto({ userId: 'user-1', photo: processed, sortOrder: 0 });

      expect(global.fetch).toHaveBeenCalledWith('file:///display.webp');
      expect(global.fetch).toHaveBeenCalledWith('file:///thumb.webp');
    });

    it('si falla la subida de la miniatura borra la foto ya subida y avisa', async () => {
      mockUpload
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'boom' } });

      await expect(
        uploadProfilePhoto({ userId: 'user-1', photo: processed, sortOrder: 0 })
      ).rejects.toBeTruthy();

      const uploaded = mockUpload.mock.calls[0][0] as string;
      expect(mockRemove).toHaveBeenCalledWith(expect.arrayContaining([uploaded]));
    });

    it('si falla guardar la fila borra los dos archivos (no quedan huérfanos)', async () => {
      mockTables.profile_photos = chain({ data: null, error: { message: 'rls' } });

      await expect(
        uploadProfilePhoto({ userId: 'user-1', photo: processed, sortOrder: 0 })
      ).rejects.toBeTruthy();

      const [photo, thumb] = mockUpload.mock.calls.map((call) => call[0] as string);
      expect(mockRemove).toHaveBeenCalledWith(expect.arrayContaining([photo, thumb]));
    });
  });

  describe('removeProfilePhoto', () => {
    it('borra la fila y después la foto y su miniatura', async () => {
      mockTables.profile_photos = chain({ error: null });

      await removeProfilePhoto({ id: 'row-1', path: 'users/user-1/profile/abc.webp' });

      expect(mockTables.profile_photos.delete).toHaveBeenCalled();
      expect(mockTables.profile_photos.eq).toHaveBeenCalledWith('id', 'row-1');
      expect(mockRemove).toHaveBeenCalledWith([
        'users/user-1/profile/abc.webp',
        'users/user-1/profile/abc_thumb.webp',
      ]);
    });

    it('si falla borrar la fila no toca los archivos y avisa', async () => {
      mockTables.profile_photos = chain({ error: { message: 'boom' } });

      await expect(
        removeProfilePhoto({ id: 'row-1', path: 'users/user-1/profile/abc.webp' })
      ).rejects.toBeTruthy();

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('si los archivos no se pueden borrar igual termina: la foto ya no está en el perfil', async () => {
      mockTables.profile_photos = chain({ error: null });
      mockRemove.mockResolvedValue({ error: { message: 'boom' } });

      await expect(
        removeProfilePhoto({ id: 'row-1', path: 'users/user-1/profile/abc.webp' })
      ).resolves.toBeUndefined();
    });
  });

  describe('fetchMyPhotos', () => {
    it('devuelve las fotos del usuario en orden', async () => {
      mockTables.profile_photos = chain({
        data: [
          { id: 'a', storage_path: 'users/u/profile/a.webp', sort_order: 0 },
          { id: 'b', storage_path: 'users/u/profile/b.webp', sort_order: 1 },
        ],
        error: null,
      });

      const photos = await fetchMyPhotos('user-1');

      expect(mockTables.profile_photos.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockTables.profile_photos.order).toHaveBeenCalledWith('sort_order');
      expect(photos).toEqual([
        { id: 'a', path: 'users/u/profile/a.webp', sortOrder: 0 },
        { id: 'b', path: 'users/u/profile/b.webp', sortOrder: 1 },
      ]);
    });

    it('lanza si Supabase devuelve error', async () => {
      mockTables.profile_photos = chain({ data: null, error: { message: 'boom' } });

      await expect(fetchMyPhotos('user-1')).rejects.toBeTruthy();
    });
  });

  describe('urls', () => {
    it('arma la URL pública de la foto y de su miniatura', () => {
      expect(photoUrl('users/u/profile/a.webp')).toBe('https://cdn.test/users/u/profile/a.webp');
      expect(thumbUrl('users/u/profile/a.webp')).toBe(
        'https://cdn.test/users/u/profile/a_thumb.webp'
      );
      expect(mockStorageFrom).toHaveBeenCalledWith('develop');
    });
  });

  describe('fetchCatalogs', () => {
    it('trae géneros y preferencias activos, en orden', async () => {
      mockTables.genders = chain({ data: [{ id: 1, code: 'male' }], error: null });
      mockTables.partner_preferences = chain({ data: [{ id: 2, code: 'women' }], error: null });

      const catalogs = await fetchCatalogs();

      expect(mockTables.genders.eq).toHaveBeenCalledWith('active', true);
      expect(mockTables.genders.order).toHaveBeenCalledWith('sort_order');
      expect(catalogs).toEqual({
        genders: [{ id: 1, code: 'male' }],
        partnerPreferences: [{ id: 2, code: 'women' }],
      });
    });

    it('lanza si alguno falla', async () => {
      mockTables.genders = chain({ data: null, error: { message: 'boom' } });
      mockTables.partner_preferences = chain({ data: [], error: null });

      await expect(fetchCatalogs()).rejects.toBeTruthy();
    });
  });

  describe('saveOnboardingDetails', () => {
    it('actualiza género y preferencia del propio perfil', async () => {
      mockTables.profiles = chain({ error: null });

      await saveOnboardingDetails('user-1', { genderId: 1, partnerPreferenceId: 3 });

      expect(mockTables.profiles.update).toHaveBeenCalledWith({
        gender_id: 1,
        partner_preference_id: 3,
      });
      expect(mockTables.profiles.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('lanza si Supabase devuelve error', async () => {
      mockTables.profiles = chain({ error: { message: 'boom' } });

      await expect(
        saveOnboardingDetails('user-1', { genderId: 1, partnerPreferenceId: 3 })
      ).rejects.toBeTruthy();
    });
  });
});
