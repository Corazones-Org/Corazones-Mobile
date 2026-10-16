import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockPick = jest.fn();
const mockProcess = jest.fn();
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockFetchPhotos = jest.fn();

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

import { MAX_PHOTOS, usePhotoSlots } from '../usePhotoSlots';

const saved = { id: 'row-1', path: 'users/user-1/profile/a.webp', sortOrder: 0 };

describe('usePhotoSlots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchPhotos.mockResolvedValue([saved]);
    mockProcess.mockResolvedValue({
      display: { uri: 'file:///display.webp', width: 480, height: 640 },
      thumb: { uri: 'file:///thumb.webp', width: 160, height: 160 },
    });
    mockUpload.mockResolvedValue({ id: 'row-2', path: 'users/user-1/profile/b.webp', sortOrder: 1 });
    mockRemove.mockResolvedValue(undefined);
  });

  it('carga las fotos guardadas, ordenadas, y queda listo', async () => {
    const { result } = await renderHook(() => usePhotoSlots('user-1'));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.slots).toHaveLength(1);
    expect(result.current.slots[0].uri).toBe('https://cdn.test/users/user-1/profile/a.webp');
    expect(result.current.hasPhoto).toBe(true);
    expect(result.current.savedCount).toBe(1);
  });

  it('avisa con onChange cuando se sube una foto', async () => {
    const onChange = jest.fn();
    mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///picked.jpg' }] });
    const { result } = await renderHook(() => usePhotoSlots('user-1', { onChange }));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.pickPhotos();
    });

    expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', sortOrder: 1 }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(result.current.slots).toHaveLength(2);
  });

  it('avisa con onChange cuando se borra una foto, y no si falla', async () => {
    const onChange = jest.fn();
    const { result } = await renderHook(() => usePhotoSlots('user-1', { onChange }));
    await waitFor(() => expect(result.current.ready).toBe(true));

    mockRemove.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.removePhoto(result.current.slots[0]);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.slots).toHaveLength(1);

    await act(async () => {
      await result.current.removePhoto(result.current.slots[0]);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(result.current.slots).toHaveLength(0);
  });

  it('no avisa con onChange cuando la subida falla', async () => {
    const onChange = jest.fn();
    mockUpload.mockRejectedValue(new Error('boom'));
    mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///picked.jpg' }] });
    const { result } = await renderHook(() => usePhotoSlots('user-1', { onChange }));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.pickPhotos();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.slots[1].status).toBe('error');
  });

  it('no pasa del máximo de fotos', async () => {
    mockFetchPhotos.mockResolvedValue(
      Array.from({ length: MAX_PHOTOS }, (_, i) => ({ id: `r${i}`, path: `p${i}.webp`, sortOrder: i }))
    );
    const { result } = await renderHook(() => usePhotoSlots('user-1'));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.pickPhotos();
    });

    expect(mockPick).not.toHaveBeenCalled();
  });
});
