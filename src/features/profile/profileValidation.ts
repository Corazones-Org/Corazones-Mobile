// Rules for the profile fields the user types. They mirror the database constraints (age >= 18,
// bio <= 500) and decide what autosave is allowed to send: an invalid value is never saved.
export const BIO_MAX_LENGTH = 500;
export const INSTAGRAM_MAX_LENGTH = 30;
export const AGE_MIN = 18;
export const AGE_MAX = 99;

export type ValidationError = 'nameRequired' | 'ageInvalid' | 'bioTooLong' | 'instagramInvalid';
export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: ValidationError };

export function validateName(raw: string): FieldResult<string> {
  const name = raw.trim();
  return name ? { ok: true, value: name } : { ok: false, error: 'nameRequired' };
}

export function validateAge(raw: string): FieldResult<number> {
  const text = raw.trim();
  const age = /^\d+$/.test(text) ? Number(text) : NaN;
  return age >= AGE_MIN && age <= AGE_MAX
    ? { ok: true, value: age }
    : { ok: false, error: 'ageInvalid' };
}

// An empty bio is valid and is stored as null.
export function validateBio(raw: string): FieldResult<string | null> {
  const bio = raw.trim();
  if (bio.length > BIO_MAX_LENGTH) {
    return { ok: false, error: 'bioTooLong' };
  }
  return { ok: true, value: bio || null };
}

const INSTAGRAM_URL = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i;
const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]+$/;

// Optional. Accepts "ana", "@ana" or a profile link, and keeps only the handle.
export function validateInstagram(raw: string): FieldResult<string | null> {
  const handle = raw
    .trim()
    .replace(INSTAGRAM_URL, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '');
  if (!handle) {
    return { ok: true, value: null };
  }
  return handle.length <= INSTAGRAM_MAX_LENGTH && INSTAGRAM_HANDLE.test(handle)
    ? { ok: true, value: handle }
    : { ok: false, error: 'instagramInvalid' };
}
