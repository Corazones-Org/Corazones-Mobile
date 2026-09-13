export type Profile = {
  id: string;
  userId: string;
  name: string | null;
  age: number | null;
  mainPhoto: string | null;
  partnerPreferenceId: number | null;
  instagram: string | null;
  profileComplete: boolean;
};

export type PartnerPreference = {
  id: number;
  code: string;
};

export type ProfileUpdate = Partial<
  Pick<Profile, 'name' | 'age' | 'mainPhoto' | 'partnerPreferenceId' | 'instagram'>
>;
