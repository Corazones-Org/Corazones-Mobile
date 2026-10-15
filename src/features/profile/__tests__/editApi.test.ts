const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockOrder = jest.fn();
const mockSelectEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...(args as [])) },
}));

import {
  addMyInterest,
  fetchInterestsCatalog,
  removeMyInterest,
  updateMyProfile,
} from '../api';

describe('edit profile api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      update: mockUpdate,
      insert: mockInsert,
      delete: mockDelete,
      select: mockSelect,
    }));
  });

  describe('updateMyProfile', () => {
    beforeEach(() => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });
    });

    it('actualiza solo los campos recibidos, con los nombres de columna de la DB', async () => {
      await updateMyProfile('user-1', {
        name: 'Ana',
        age: 30,
        bio: null,
        instagram: 'ana',
        genderId: 2,
        partnerPreferenceId: 1,
      });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Ana',
        age: 30,
        bio: null,
        instagram: 'ana',
        gender_id: 2,
        partner_preference_id: 1,
      });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('no manda los campos que no cambiaron', async () => {
      await updateMyProfile('user-1', { bio: 'Hola' });

      expect(mockUpdate).toHaveBeenCalledWith({ bio: 'Hola' });
    });

    it('no llama a la DB si no hay nada para guardar', async () => {
      await updateMyProfile('user-1', {});

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('lanza si Supabase devuelve error', async () => {
      mockEq.mockResolvedValue({ error: { message: 'boom' } });

      await expect(updateMyProfile('user-1', { name: 'Ana' })).rejects.toBeTruthy();
    });
  });

  describe('fetchInterestsCatalog', () => {
    beforeEach(() => {
      mockSelect.mockReturnValue({ eq: mockSelectEq });
      mockSelectEq.mockReturnValue({ order: mockOrder });
    });

    it('pide los intereses activos en orden', async () => {
      mockOrder.mockResolvedValue({
        data: [{ id: 1, code: 'music', labels: { es: 'Música' } }],
        error: null,
      });

      const interests = await fetchInterestsCatalog();

      expect(mockFrom).toHaveBeenCalledWith('interests');
      expect(mockSelect).toHaveBeenCalledWith('id, code, labels');
      expect(mockSelectEq).toHaveBeenCalledWith('active', true);
      expect(mockOrder).toHaveBeenCalledWith('sort_order');
      expect(interests).toEqual([{ id: 1, code: 'music', labels: { es: 'Música' } }]);
    });

    it('lanza si Supabase devuelve error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'boom' } });

      await expect(fetchInterestsCatalog()).rejects.toBeTruthy();
    });
  });

  describe('addMyInterest', () => {
    it('inserta una fila del usuario', async () => {
      mockInsert.mockResolvedValue({ error: null });

      await addMyInterest('user-1', 7);

      expect(mockFrom).toHaveBeenCalledWith('profile_interests');
      expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-1', interest_id: 7 });
    });

    it('lanza si la DB lo rechaza (por ejemplo, más de 10 intereses)', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'a profile can have at most 10 interests' } });

      await expect(addMyInterest('user-1', 7)).rejects.toBeTruthy();
    });
  });

  describe('removeMyInterest', () => {
    it('borra solo esa fila del usuario', async () => {
      const secondEq = jest.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: secondEq });

      await removeMyInterest('user-1', 7);

      expect(mockFrom).toHaveBeenCalledWith('profile_interests');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(secondEq).toHaveBeenCalledWith('interest_id', 7);
    });

    it('lanza si Supabase devuelve error', async () => {
      const secondEq = jest.fn().mockResolvedValue({ error: { message: 'boom' } });
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: secondEq });

      await expect(removeMyInterest('user-1', 7)).rejects.toBeTruthy();
    });
  });
});
