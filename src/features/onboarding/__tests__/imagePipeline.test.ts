const mockCalls: { source: unknown; ops: Record<string, unknown>[]; save?: unknown }[] = [];
let mockBase = { width: 3000, height: 4000 };

jest.mock('expo-image-manipulator', () => {
  const makeRef = (uri: string, width: number, height: number, ops: Record<string, unknown>[], call: (typeof mockCalls)[number]) => ({
    uri,
    width,
    height,
    saveAsync: jest.fn(async (options: unknown) => {
      call.save = options;
      return { uri: `${uri}-saved`, width: (ops.find((o) => o.resize) as { resize: { width: number } } | undefined)?.resize.width ?? width, height };
    }),
  });
  return {
    SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
    ImageManipulator: {
      manipulate: (source: unknown) => {
        const ops: Record<string, unknown>[] = [];
        const call = { source, ops } as (typeof mockCalls)[number];
        mockCalls.push(call);
        const context = {
          crop: (rect: unknown) => (ops.push({ crop: rect }), context),
          resize: (size: unknown) => (ops.push({ resize: size }), context),
          renderAsync: async () =>
            makeRef(`rendered-${mockCalls.indexOf(call)}`, mockBase.width, mockBase.height, ops, call),
        };
        return context;
      },
    },
  };
});

import { processPhoto } from '../imagePipeline';
import { IMAGE_PROFILES } from '../imageProfiles';

const develop = IMAGE_PROFILES.develop;

// The calls made on the original image, in order: [0] = read its real size, [1] = display,
// [2] = thumbnail.
const crop = (index: number) => mockCalls[index].ops.find((op) => op.crop)?.crop;
const resize = (index: number) => mockCalls[index].ops.find((op) => op.resize)?.resize;

describe('processPhoto', () => {
  beforeEach(() => {
    mockCalls.length = 0;
    mockBase = { width: 3000, height: 4000 };
  });

  it('devuelve la foto y su miniatura', async () => {
    const result = await processPhoto('file:///photo.jpg', develop);

    expect(result.display.uri).toContain('saved');
    expect(result.thumb.uri).toContain('saved');
    expect(result.display.uri).not.toBe(result.thumb.uri);
  });

  it('una foto ya 3:4 no se recorta en la foto y se achica al ancho configurado', async () => {
    await processPhoto('file:///photo.jpg', develop);

    expect(crop(1)).toEqual({ originX: 0, originY: 0, width: 3000, height: 4000 });
    expect(resize(1)).toEqual({ width: 480 });
  });

  it('una foto apaisada se recorta al centro en 3:4', async () => {
    mockBase = { width: 4000, height: 3000 };

    await processPhoto('file:///photo.jpg', develop);

    expect(crop(1)).toEqual({ originX: 875, originY: 0, width: 2250, height: 3000 });
  });

  it('una foto más alta que 3:4 se recorta arriba y abajo', async () => {
    mockBase = { width: 3000, height: 5000 };

    await processPhoto('file:///photo.jpg', develop);

    expect(crop(1)).toEqual({ originX: 0, originY: 500, width: 3000, height: 4000 });
  });

  it('la miniatura es un cuadrado centrado del tamaño configurado', async () => {
    await processPhoto('file:///photo.jpg', develop);

    expect(crop(2)).toEqual({ originX: 0, originY: 500, width: 3000, height: 3000 });
    expect(resize(2)).toEqual({ width: 160 });
  });

  it('comprime con el formato y la calidad de cada tamaño', async () => {
    await processPhoto('file:///photo.jpg', develop);

    expect(mockCalls[1].save).toMatchObject({ format: 'webp', compress: 0.5 });
    expect(mockCalls[2].save).toMatchObject({ format: 'webp', compress: 0.5 });
  });

  it('usa la calidad del perfil que le pasan (production)', async () => {
    await processPhoto('file:///photo.jpg', IMAGE_PROFILES.production);

    expect(resize(1)).toEqual({ width: 600 });
    expect(mockCalls[1].save).toMatchObject({ compress: 0.7 });
    expect(resize(2)).toEqual({ width: 200 });
    expect(mockCalls[2].save).toMatchObject({ compress: 0.6 });
  });

  it('puede guardar en JPEG si el perfil lo pide', async () => {
    await processPhoto('file:///photo.jpg', { ...develop, format: 'jpeg' });

    expect(mockCalls[1].save).toMatchObject({ format: 'jpeg' });
  });
});
