import { storageBucket } from '@/lib/appEnv';
import { supabase } from '@/lib/supabase';

import type { ProcessedPhoto } from './imagePipeline';
import { imageMimeType, imageProfile } from './imageProfiles';
import { newPhotoId, photoPath, photoThumbPath } from './storagePaths';

export type StoredPhoto = { id: string; path: string; sortOrder: number };
export type CatalogOption = { id: number; code: string };

async function readBytes(uri: string) {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

async function uploadFile(path: string, uri: string) {
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(path, await readBytes(uri), {
      contentType: imageMimeType(imageProfile.format),
      // Photos never change: a new upload gets a new name, so the CDN can cache them for a year.
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) {
    throw error;
  }
}

// Best effort: a leftover file is only wasted space, so cleaning up never hides the real error.
async function removeFiles(paths: string[]) {
  const { error } = await supabase.storage.from(storageBucket).remove(paths);
  if (error) {
    console.error('Storage cleanup error:', error);
  }
}

// Uploads the photo and its thumbnail, then records the photo in the user's profile. If anything
// fails the files already uploaded are removed, so no file stays without a profile row.
export async function uploadProfilePhoto({
  userId,
  photo,
  sortOrder,
}: {
  userId: string;
  photo: ProcessedPhoto;
  sortOrder: number;
}): Promise<StoredPhoto> {
  const path = photoPath(userId, newPhotoId(), imageProfile.format);
  const thumbPath = photoThumbPath(path);
  const uploaded: string[] = [];

  try {
    await uploadFile(path, photo.display.uri);
    uploaded.push(path);
    await uploadFile(thumbPath, photo.thumb.uri);
    uploaded.push(thumbPath);

    const { data, error } = await supabase
      .from('profile_photos')
      .insert({ user_id: userId, storage_path: path, sort_order: sortOrder })
      .select('id')
      .single();
    if (error) {
      throw error;
    }
    return { id: data.id as string, path, sortOrder };
  } catch (error) {
    if (uploaded.length) {
      await removeFiles(uploaded);
    }
    throw error;
  }
}

// The row goes first, so the photo disappears from the profile even if deleting the files fails.
export async function removeProfilePhoto({ id, path }: { id: string; path: string }) {
  const { error } = await supabase.from('profile_photos').delete().eq('id', id);
  if (error) {
    throw error;
  }
  await removeFiles([path, photoThumbPath(path)]);
}

export async function fetchMyPhotos(userId: string): Promise<StoredPhoto[]> {
  const { data, error } = await supabase
    .from('profile_photos')
    .select('id, storage_path, sort_order')
    .eq('user_id', userId)
    .order('sort_order');
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    path: row.storage_path as string,
    sortOrder: row.sort_order as number,
  }));
}

function publicUrl(path: string) {
  return supabase.storage.from(storageBucket).getPublicUrl(path).data.publicUrl;
}

export const photoUrl = publicUrl;
export const thumbUrl = (path: string) => publicUrl(photoThumbPath(path));

export async function fetchCatalogs(): Promise<{
  genders: CatalogOption[];
  partnerPreferences: CatalogOption[];
}> {
  const [genders, partnerPreferences] = await Promise.all([
    supabase.from('genders').select('id, code').eq('active', true).order('sort_order'),
    supabase.from('partner_preferences').select('id, code').eq('active', true).order('sort_order'),
  ]);
  if (genders.error) {
    throw genders.error;
  }
  if (partnerPreferences.error) {
    throw partnerPreferences.error;
  }
  return {
    genders: (genders.data ?? []) as CatalogOption[],
    partnerPreferences: (partnerPreferences.data ?? []) as CatalogOption[],
  };
}

// Saving both choices is what lets the database mark onboarding as done (together with a photo).
export async function saveOnboardingDetails(
  userId: string,
  { genderId, partnerPreferenceId }: { genderId: number; partnerPreferenceId: number }
) {
  const { error } = await supabase
    .from('profiles')
    .update({ gender_id: genderId, partner_preference_id: partnerPreferenceId })
    .eq('user_id', userId);
  if (error) {
    throw error;
  }
}
