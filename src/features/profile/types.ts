import type { CatalogItem } from './catalog';

// Shape the app uses for the signed-in user's own profile.
export type MyProfile = {
  name: string | null;
  age: number | null;
  bio: string | null;
  // Profile filled in enough for the future completeness features (emails, badge, progress bar).
  complete: boolean;
  // The user finished onboarding (photos, gender, partner preference): decides onboarding vs app.
  onboardingComplete: boolean;
  genderCode: string | null;
  partnerPreferenceCode: string | null;
  photoPaths: string[];
  interests: CatalogItem[];
  // "Tipo de salida": the kinds of plan the person is up for.
  outingTypes: CatalogItem[];
};
