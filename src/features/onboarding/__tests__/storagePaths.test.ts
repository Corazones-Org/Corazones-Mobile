import { newPhotoId, photoPath, photoThumbPath } from '../storagePaths';

describe('storagePaths', () => {
  it('guarda las fotos en users/<id>/profile/', () => {
    expect(photoPath('user-1', 'abc123', 'webp')).toBe('users/user-1/profile/abc123.webp');
    expect(photoPath('user-1', 'abc123', 'jpeg')).toBe('users/user-1/profile/abc123.jpeg');
  });

  it('la miniatura es la misma foto con el sufijo _thumb', () => {
    expect(photoThumbPath('users/user-1/profile/abc123.webp')).toBe(
      'users/user-1/profile/abc123_thumb.webp'
    );
    expect(photoThumbPath('users/user-1/profile/abc123.jpeg')).toBe(
      'users/user-1/profile/abc123_thumb.jpeg'
    );
  });

  it('genera ids distintos y válidos para un nombre de archivo', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newPhotoId()));

    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('los ids nuevos ordenan por fecha (mismo largo, más nuevo después)', () => {
    const early = newPhotoId(1_000_000_000_000, () => 0.5);
    const late = newPhotoId(1_800_000_000_000, () => 0.5);

    expect(early < late).toBe(true);
  });
});
