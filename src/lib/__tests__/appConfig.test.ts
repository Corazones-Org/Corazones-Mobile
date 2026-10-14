import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..', '..');
const { expo } = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));

function pngSize(relativePath: string) {
  const buffer = readFileSync(join(root, relativePath));
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// PNG color type lives at byte 25: 2 = RGB (no alpha), 6 = RGBA.
function pngColorType(relativePath: string) {
  return readFileSync(join(root, relativePath)).readUInt8(25);
}

describe('app.json metadata', () => {
  it('define identidad de la app', () => {
    expect(expo.name).toBe('Corazones');
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(expo.scheme).toBe('corazones');
    expect(expo.ios.bundleIdentifier).toBe('com.corazones.mobile');
    expect(expo.android.package).toBe('com.corazones.mobile');
    expect(expo.userInterfaceStyle).toBe('light');
  });
});

describe('app icon assets', () => {
  const referenced = [
    expo.icon,
    expo.android.adaptiveIcon.foregroundImage,
    expo.android.adaptiveIcon.backgroundImage,
    expo.android.adaptiveIcon.monochromeImage,
    expo.web.favicon,
  ];

  it.each(referenced)('%s existe', (path: string) => {
    expect(existsSync(join(root, path))).toBe(true);
  });

  it('el ícono es cuadrado 1024x1024 y sin transparencia (requisito de iOS)', () => {
    expect(pngSize(expo.icon)).toEqual({ width: 1024, height: 1024 });
    expect(pngColorType(expo.icon)).toBe(2);
  });

  it('las capas del ícono adaptive de Android son cuadradas y del mismo tamaño', () => {
    const { foregroundImage, backgroundImage, monochromeImage } = expo.android.adaptiveIcon;
    const foreground = pngSize(foregroundImage);

    expect(foreground.width).toBe(foreground.height);
    expect(foreground.width).toBeGreaterThanOrEqual(512);
    expect(pngSize(backgroundImage)).toEqual(foreground);
    expect(pngSize(monochromeImage)).toEqual(foreground);
  });
});
