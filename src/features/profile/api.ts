import { supabase } from '@/lib/supabase';

import type { MyProfile } from './types';

// One round trip: the profile row plus its catalog values, photos and interests.
const MY_PROFILE_SELECT = `
  name, age, bio, profile_complete,
  gender:genders ( code ),
  partner_preference:partner_preferences ( code ),
  photos:profile_photos ( storage_path, sort_order ),
  interests:profile_interests ( interest:interests ( code, labels ) )
`;

type MyProfileRow = {
  name: string | null;
  age: number | null;
  bio: string | null;
  profile_complete: boolean;
  gender: { code: string } | null;
  partner_preference: { code: string } | null;
  photos: { storage_path: string; sort_order: number }[];
  interests: { interest: { code: string; labels: Record<string, string> } }[];
};

export async function fetchMyProfile(userId: string): Promise<MyProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(MY_PROFILE_SELECT)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  const row = data as unknown as MyProfileRow;
  return {
    name: row.name,
    age: row.age,
    bio: row.bio,
    complete: row.profile_complete,
    genderCode: row.gender?.code ?? null,
    partnerPreferenceCode: row.partner_preference?.code ?? null,
    photoPaths: [...row.photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => photo.storage_path),
    interests: row.interests.map(({ interest }) => interest),
  };
}
