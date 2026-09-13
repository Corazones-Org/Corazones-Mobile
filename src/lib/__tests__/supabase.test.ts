jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Expo inlines EXPO_PUBLIC_* env vars at build time (via babel-preset-expo),
// so they can't be unset/mutated at test runtime to exercise the "missing
// env var" branches in src/lib/supabase.ts — those are covered by reading
// the code (throw with a clear message), not by a unit test here.
describe('supabase client', () => {
  it('crea un cliente cuando las env vars están configuradas', () => {
    const { supabase } = require('../supabase');

    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});
