import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { SPLASH_BACKGROUND, SPLASH_IMAGE_SIZE } from '@/features/welcome/constants';

const root = join(__dirname, '..', '..', '..');
const { expo } = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

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

// Native splash = background color + heart only. Android 12+ masks the splash icon with a circle,
// so the wordmark can't live there; WelcomeScreen draws the same heart in the same spot and adds
// the wordmark and the sign-in button on top (see src/features/welcome).
describe('native splash config', () => {
  const plugin = expo.plugins.find(
    (entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-splash-screen'
  );

  it('configura el plugin expo-splash-screen con imagen y color de fondo', () => {
    expect(plugin).toBeDefined();
    const [, options] = plugin;

    expect(options.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(options.resizeMode).toBe('contain');
    expect(existsSync(join(root, options.image))).toBe(true);
  });

  it('la imagen es un PNG cuadrado 1024x1024 con transparencia', () => {
    const [, options] = plugin;

    expect(pngSize(options.image)).toEqual({ width: 1024, height: 1024 });
    expect(pngColorType(options.image)).toBe(6);
  });

  it('el tamaño nativo coincide con el del corazón de WelcomeScreen (handoff sin salto)', () => {
    const [, options] = plugin;

    expect(options.imageWidth).toBe(SPLASH_IMAGE_SIZE);
  });
});

// Without an explicit color the Android window background follows the system theme (black in dark
// mode), which shows as a black flash between the native splash and the first React frame.
// expo-system-ui is what makes this setting and userInterfaceStyle apply on Android.
describe('android window background', () => {
  it('usa el color del splash como fondo de la ventana (nunca negro)', () => {
    expect(expo.android.backgroundColor).toBe(SPLASH_BACKGROUND);
  });

  it('tiene expo-system-ui instalado', () => {
    expect(packageJson.dependencies['expo-system-ui']).toBeDefined();
  });
});
