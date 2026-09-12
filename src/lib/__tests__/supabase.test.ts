jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('supabase client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('crea un cliente cuando las env vars están configuradas', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { supabase } = require('../supabase');

    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('lanza un error claro si falta EXPO_PUBLIC_SUPABASE_URL', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    expect(() => require('../supabase')).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('lanza un error claro si falta EXPO_PUBLIC_SUPABASE_ANON_KEY', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => require('../supabase')).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
