import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import type { Profile, ProfileUpdate } from '@/types/profile';

import { getProfile, updateProfile as updateProfileApi, uploadProfilePhoto } from './api';

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    getProfile(userId).then(({ profile: loaded, error: loadError }) => {
      setProfile(loaded);
      setError(loadError?.message ?? null);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (update: ProfileUpdate) => {
      if (!userId) return { error: { message: 'No hay usuario autenticado.' } };
      const { error: saveError } = await updateProfileApi(userId, update);
      if (!saveError) {
        load();
      }
      return { error: saveError };
    },
    [userId, load]
  );

  const pickAndUploadPhoto = useCallback(async () => {
    if (!userId) return { error: { message: 'No hay usuario autenticado.' } };

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: { message: 'Se necesita permiso para acceder a tus fotos.' } };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) {
      return { error: null };
    }

    const asset = result.assets[0];
    const fileExt = asset.uri.split('.').pop() ?? 'jpg';
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { path, error: uploadError } = await uploadProfilePhoto(userId, {
      uri: asset.uri,
      blob,
      fileExt,
    });

    if (uploadError || !path) {
      return { error: uploadError ?? { message: 'No se pudo subir la foto.' } };
    }

    return save({ mainPhoto: path });
  }, [userId, save]);

  return { profile, loading, error, save, pickAndUploadPhoto, userId };
}
