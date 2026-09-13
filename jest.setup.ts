// Fallback env vars so files importing src/lib/supabase.ts don't need a
// real .env when the test itself doesn't care about the actual values
// (e.g. App.test.tsx). Tests that specifically exercise this validation
// (src/lib/__tests__/supabase.test.ts) still override/delete them per-case.
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
}
if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}
