import { supabase } from '@/lib/supabase';
import type { PartnerPreference, Profile, ProfileUpdate } from '@/types/profile';

type ApiError = { message: string };

type ProfileRow = {
  id: string;
  user_id: string;
  name: string | null;
  age: number | null;
  main_photo: string | null;
  partner_preference_id: number | null;
  instagram: string | null;
  profile_complete: boolean;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    age: row.age,
    mainPhoto: row.main_photo,
    partnerPreferenceId: row.partner_preference_id,
    instagram: row.instagram,
    profileComplete: row.profile_complete,
  };
}

export async function getProfile(
  userId: string
): Promise<{ profile: Profile | null; error: ApiError | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return { profile: null, error };
  }

  return { profile: toProfile(data as ProfileRow), error: null };
}

export async function getPartnerPreferences(): Promise<{
  preferences: PartnerPreference[];
  error: ApiError | null;
}> {
  const { data, error } = await supabase.from('partner_preferences').select('id, code').order('sort_order');

  if (error) {
    return { preferences: [], error };
  }

  return { preferences: (data ?? []) as PartnerPreference[], error: null };
}

export async function updateProfile(
  userId: string,
  update: ProfileUpdate
): Promise<{ error: ApiError | null }> {
  const row: Record<string, unknown> = {};
  if (update.name !== undefined) row.name = update.name;
  if (update.age !== undefined) row.age = update.age;
  if (update.mainPhoto !== undefined) row.main_photo = update.mainPhoto;
  if (update.partnerPreferenceId !== undefined) row.partner_preference_id = update.partnerPreferenceId;
  if (update.instagram !== undefined) row.instagram = update.instagram;

  const { error } = await supabase.from('profiles').update(row).eq('user_id', userId).single();

  return { error };
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

export async function getProfilePhotoUrl(
  path: string
): Promise<{ url: string | null; error: ApiError | null }> {
  const { data, error } = await supabase.storage
    .from('profile-photos')
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    return { url: null, error };
  }

  return { url: data.signedUrl, error: null };
}

export async function uploadProfilePhoto(
  userId: string,
  file: { uri: string; blob: Blob; fileExt: string }
): Promise<{ path: string | null; error: ApiError | null }> {
  const path = `${userId}/main-${Date.now()}.${file.fileExt}`;

  const { error } = await supabase.storage.from('profile-photos').upload(path, file.blob, {
    upsert: true,
    contentType: `image/${file.fileExt}`,
  });

  if (error) {
    return { path: null, error };
  }

  return { path, error: null };
}
