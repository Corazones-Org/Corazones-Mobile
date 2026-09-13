import { useEffect, useState } from 'react';
import { Button, Image, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PartnerPreference, ProfileUpdate } from '@/types/profile';

import { getPartnerPreferences, getProfilePhotoUrl } from './api';
import { useProfile } from './useProfile';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, loading, error: loadError, save, pickAndUploadPhoto } = useProfile();

  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(profile?.age != null ? String(profile.age) : '');
  const [instagram, setInstagram] = useState(profile?.instagram ?? '');
  const [partnerPreferenceId, setPartnerPreferenceId] = useState(profile?.partnerPreferenceId ?? null);
  const [preferences, setPreferences] = useState<PartnerPreference[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    getPartnerPreferences().then(({ preferences: loaded }) => setPreferences(loaded));
  }, []);

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

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    const update: ProfileUpdate = {
      name,
      age: age ? Number(age) : null,
      instagram,
      partnerPreferenceId,
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
      <TextInput value={name} onChangeText={setName} />

      <Text>{t('profile.age')}</Text>
      <TextInput value={age} onChangeText={setAge} keyboardType="numeric" />

      <Text>{t('profile.instagram')}</Text>
      <TextInput value={instagram} onChangeText={setInstagram} />

      <Text>{t('profile.partnerPreference')}</Text>
      <View>
        {preferences.map((preference) => (
          <Button
            key={preference.id}
            title={t(`partnerPreferences.${preference.code}`)}
            onPress={() => setPartnerPreferenceId(preference.id)}
            color={partnerPreferenceId === preference.id ? undefined : '#ccc'}
          />
        ))}
      </View>

      <Button title={t('profile.save')} onPress={handleSave} />

      {saveError ? <Text>{saveError}</Text> : null}
      {saveSuccess ? <Text>{t('profile.saveSuccess')}</Text> : null}
    </View>
  );
}
