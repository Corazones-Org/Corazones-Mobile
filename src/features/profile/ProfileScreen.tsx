import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Image, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PartnerPreference, ProfileUpdate } from '@/types/profile';

import { getPartnerPreferences, getProfilePhotoUrl } from './api';
import { profileFormDefaults, profileFormSchema, type ProfileFormValues } from './schema';
import { useProfile } from './useProfile';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, loading, error: loadError, save, pickAndUploadPhoto } = useProfile();

  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileFormDefaults,
  });

  const [preferences, setPreferences] = useState<PartnerPreference[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    getPartnerPreferences().then(({ preferences: loaded }) => setPreferences(loaded));
  }, []);

  useEffect(() => {
    if (!profile) return;
    reset({
      name: profile.name ?? '',
      age: profile.age != null ? String(profile.age) : '',
      instagram: profile.instagram ?? '',
      partnerPreferenceId: profile.partnerPreferenceId,
    });
  }, [profile, reset]);

  useEffect(() => {
    if (!profile?.mainPhoto) {
      setPhotoUrl(null);
      return;
    }
    getProfilePhotoUrl(profile.mainPhoto).then(({ url }) => setPhotoUrl(url));
  }, [profile?.mainPhoto]);

  if (loading) {
    return <Text>{t('common.loading')}</Text>;
  }

  if (loadError || !profile) {
    return <Text>{t('profile.loadError')}</Text>;
  }

  const onSubmit = async (values: ProfileFormValues) => {
    setSaveError(null);
    setSaveSuccess(false);

    const update: ProfileUpdate = {
      name: values.name,
      age: values.age === '' ? null : Number(values.age),
      instagram: values.instagram,
      partnerPreferenceId: values.partnerPreferenceId,
    };

    const { error } = await save(update);
    if (error) {
      setSaveError(t('profile.saveError'));
    } else {
      setSaveSuccess(true);
    }
  };

  const handlePickPhoto = async () => {
    setSaveError(null);
    const { error } = await pickAndUploadPhoto();
    if (error) {
      setSaveError(t('profile.saveError'));
    }
  };

  return (
    <View>
      <Text>{t('profile.title')}</Text>

      {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: 100, height: 100 }} /> : null}
      <Button title={t('profile.choosePhoto')} onPress={handlePickPhoto} />

      <Text>{t('profile.name')}</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => (
          <TextInput value={value} onChangeText={onChange} />
        )}
      />

      <Text>{t('profile.age')}</Text>
      <Controller
        control={control}
        name="age"
        render={({ field: { value, onChange } }) => (
          <TextInput value={value} onChangeText={onChange} keyboardType="numeric" />
        )}
      />

      <Text>{t('profile.instagram')}</Text>
      <Controller
        control={control}
        name="instagram"
        render={({ field: { value, onChange } }) => (
          <TextInput value={value} onChangeText={onChange} />
        )}
      />

      <Text>{t('profile.partnerPreference')}</Text>
      <Controller
        control={control}
        name="partnerPreferenceId"
        render={({ field: { value, onChange } }) => (
          <View>
            {preferences.map((preference) => (
              <Button
                key={preference.id}
                title={t(`partnerPreferences.${preference.code}`)}
                onPress={() => onChange(preference.id)}
                color={value === preference.id ? undefined : '#ccc'}
              />
            ))}
          </View>
        )}
      />

      <Button title={t('profile.save')} onPress={handleSubmit(onSubmit)} />

      {saveError ? <Text>{saveError}</Text> : null}
      {saveSuccess ? <Text>{t('profile.saveSuccess')}</Text> : null}
    </View>
  );
}
