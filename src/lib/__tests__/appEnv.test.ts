import { appEnv, parseAppEnv, storageBucket } from '../appEnv';

describe('parseAppEnv', () => {
  it('acepta develop y production', () => {
    expect(parseAppEnv('develop')).toBe('develop');
    expect(parseAppEnv('production')).toBe('production');
  });

  it('falla con un mensaje claro si falta la variable', () => {
    expect(() => parseAppEnv(undefined)).toThrow('EXPO_PUBLIC_APP_ENV');
    expect(() => parseAppEnv('')).toThrow('EXPO_PUBLIC_APP_ENV');
  });

  it('falla si el valor no es develop ni production', () => {
    expect(() => parseAppEnv('staging')).toThrow('"staging"');
    expect(() => parseAppEnv('Develop')).toThrow('develop');
  });
});

describe('appEnv', () => {
  it('toma el ambiente de EXPO_PUBLIC_APP_ENV (develop en los tests)', () => {
    expect(appEnv).toBe('develop');
  });

  it('usa el ambiente como nombre del bucket de Storage', () => {
    expect(storageBucket).toBe(appEnv);
  });
});
