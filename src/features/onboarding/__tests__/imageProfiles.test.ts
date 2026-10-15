import { IMAGE_PROFILES, imageProfile, imageMimeType, imageExtension } from '../imageProfiles';

describe('imageProfiles', () => {
  it('develop usa fotos livianas (480x640, miniatura 160)', () => {
    expect(IMAGE_PROFILES.develop.display).toEqual({ width: 480, height: 640, quality: 0.5 });
    expect(IMAGE_PROFILES.develop.thumb).toEqual({ size: 160, quality: 0.5 });
  });

  it('production arranca balanceado (600x800, miniatura 200)', () => {
    expect(IMAGE_PROFILES.production.display).toEqual({ width: 600, height: 800, quality: 0.7 });
    expect(IMAGE_PROFILES.production.thumb).toEqual({ size: 200, quality: 0.6 });
  });

  it('las fotos son 3:4 en todos los ambientes', () => {
    for (const profile of Object.values(IMAGE_PROFILES)) {
      expect(profile.display.width / profile.display.height).toBeCloseTo(3 / 4);
    }
  });

  it('el perfil activo sigue al ambiente de la app (develop en los tests)', () => {
    expect(imageProfile).toBe(IMAGE_PROFILES.develop);
  });

  it('el formato define la extensión y el tipo de contenido', () => {
    expect(imageExtension('webp')).toBe('webp');
    expect(imageMimeType('webp')).toBe('image/webp');
    expect(imageExtension('jpeg')).toBe('jpeg');
    expect(imageMimeType('jpeg')).toBe('image/jpeg');
  });
});
