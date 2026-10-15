// Shape the app uses for the signed-in user's own profile.
export type MyProfile = {
  name: string | null;
  age: number | null;
  bio: string | null;
  complete: boolean;
  genderCode: string | null;
  partnerPreferenceCode: string | null;
  photoPaths: string[];
  interests: { code: string; labels: Record<string, string> }[];
};
