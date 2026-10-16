import { supabase } from '@/lib/supabase';

import type { CatalogItem, CatalogOption } from './catalog';
import type { MyProfile } from './types';

// One round trip: the profile row plus its catalog values, photos, interests and outing types.
const MY_PROFILE_SELECT = `
  name, age, bio, profile_complete, onboarding_completed_at,
  gender:genders ( code ),
  partner_preference:partner_preferences ( code ),
  photos:profile_photos ( storage_path, sort_order ),
  interests:profile_interests ( interest:interests ( code, labels ) ),
  outing_types:profile_outing_types ( outing_type:outing_types ( code, labels ) )
`;

type MyProfileRow = {
  name: string | null;
  age: number | null;
  bio: string | null;
  profile_complete: boolean;
  onboarding_completed_at: string | null;
  gender: { code: string } | null;
  partner_preference: { code: string } | null;
  photos: { storage_path: string; sort_order: number }[];
  interests: { interest: CatalogItem }[];
  outing_types: { outing_type: CatalogItem }[];
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
    onboardingComplete: row.onboarding_completed_at != null,
    genderCode: row.gender?.code ?? null,
    partnerPreferenceCode: row.partner_preference?.code ?? null,
    photoPaths: [...row.photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => photo.storage_path),
    interests: row.interests.map(({ interest }) => interest),
    outingTypes: row.outing_types.map(({ outing_type }) => outing_type),
  };
}

// The fields the edit screen can change. Each key is optional so autosave sends only what changed.
export type ProfilePatch = {
  name?: string;
  age?: number;
  bio?: string | null;
  genderId?: number;
  partnerPreferenceId?: number;
};

const PATCH_COLUMNS: Record<keyof ProfilePatch, string> = {
  name: 'name',
  age: 'age',
  bio: 'bio',
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

// Interests and outing types are catalogs of the same shape: a `code` and labels in the database,
// and one row per choice in a profile table (which has no UPDATE policy, so a choice is added or
// removed on its own). The database enforces the rules (only active items; max 10 interests).
async function fetchCatalog(table: 'interests' | 'outing_types'): Promise<CatalogOption[]> {
  const { data, error } = await supabase
    .from(table)
    .select('id, code, labels')
    .eq('active', true)
    .order('sort_order');
  if (error) {
    throw error;
  }
  return (data ?? []) as CatalogOption[];
}

async function addChoice(table: string, column: string, userId: string, id: number) {
  const { error } = await supabase.from(table).insert({ user_id: userId, [column]: id });
  if (error) {
    throw error;
  }
}

async function removeChoice(table: string, column: string, userId: string, id: number) {
  const { error } = await supabase.from(table).delete().eq('user_id', userId).eq(column, id);
  if (error) {
    throw error;
  }
}

export const fetchInterestsCatalog = () => fetchCatalog('interests');
export const addMyInterest = (userId: string, interestId: number) =>
  addChoice('profile_interests', 'interest_id', userId, interestId);
export const removeMyInterest = (userId: string, interestId: number) =>
  removeChoice('profile_interests', 'interest_id', userId, interestId);

export const fetchOutingTypesCatalog = () => fetchCatalog('outing_types');
export const addMyOutingType = (userId: string, outingTypeId: number) =>
  addChoice('profile_outing_types', 'outing_type_id', userId, outingTypeId);
export const removeMyOutingType = (userId: string, outingTypeId: number) =>
  removeChoice('profile_outing_types', 'outing_type_id', userId, outingTypeId);
