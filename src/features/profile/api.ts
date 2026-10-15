import { supabase } from '@/lib/supabase';

import type { MyProfile } from './types';

// One round trip: the profile row plus its catalog values, photos and interests.
const MY_PROFILE_SELECT = `
  name, age, bio, instagram, profile_complete, onboarding_completed_at,
  gender:genders ( code ),
  partner_preference:partner_preferences ( code ),
  photos:profile_photos ( storage_path, sort_order ),
  interests:profile_interests ( interest:interests ( code, labels ) )
`;

type MyProfileRow = {
  name: string | null;
  age: number | null;
  bio: string | null;
  instagram: string | null;
  profile_complete: boolean;
  onboarding_completed_at: string | null;
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
    instagram: row.instagram,
    complete: row.profile_complete,
    onboardingComplete: row.onboarding_completed_at != null,
    genderCode: row.gender?.code ?? null,
    partnerPreferenceCode: row.partner_preference?.code ?? null,
    photoPaths: [...row.photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => photo.storage_path),
    interests: row.interests.map(({ interest }) => interest),
  };
}

export type InterestOption = { id: number; code: string; labels: Record<string, string> };

// The fields the edit screen can change. Each key is optional so autosave sends only what changed.
export type ProfilePatch = {
  name?: string;
  age?: number;
  bio?: string | null;
  instagram?: string | null;
  genderId?: number;
  partnerPreferenceId?: number;
};

const PATCH_COLUMNS: Record<keyof ProfilePatch, string> = {
  name: 'name',
  age: 'age',
  bio: 'bio',
  instagram: 'instagram',
  genderId: 'gender_id',
  partnerPreferenceId: 'partner_preference_id',
};

// `profile_complete` is never sent: the database derives it from these fields and the photos.
export async function updateMyProfile(userId: string, patch: ProfilePatch) {
  const columns: Record<string, unknown> = {};
  for (const key of Object.keys(PATCH_COLUMNS) as (keyof ProfilePatch)[]) {
    if (patch[key] !== undefined) {
      columns[PATCH_COLUMNS[key]] = patch[key];
    }
  }
  if (Object.keys(columns).length === 0) {
    return;
  }

  const { error } = await supabase.from('profiles').update(columns).eq('user_id', userId);
  if (error) {
    throw error;
  }
}

export async function fetchInterestsCatalog(): Promise<InterestOption[]> {
  const { data, error } = await supabase
    .from('interests')
    .select('id, code, labels')
    .eq('active', true)
    .order('sort_order');
  if (error) {
    throw error;
  }
  return (data ?? []) as InterestOption[];
}

// One row per interest (the table has no UPDATE policy): the database enforces the limit of 10.
export async function addMyInterest(userId: string, interestId: number) {
  const { error } = await supabase
    .from('profile_interests')
    .insert({ user_id: userId, interest_id: interestId });
  if (error) {
    throw error;
  }
}

export async function removeMyInterest(userId: string, interestId: number) {
  const { error } = await supabase
    .from('profile_interests')
    .delete()
    .eq('user_id', userId)
    .eq('interest_id', interestId);
  if (error) {
    throw error;
  }
}
