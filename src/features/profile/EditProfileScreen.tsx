import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge/Badge';
import { Icon } from '@/components/Icon/Icon';
import { InfoRow } from '@/components/InfoRow/InfoRow';
import { ListGroup } from '@/components/ListGroup/ListGroup';
import { SaveStatus } from '@/components/SaveStatus/SaveStatus';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { useToast } from '@/components/Toast/ToastProvider';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchCatalogs } from '@/features/onboarding/api';
import { GenderSeekingPicker, type Catalogs } from '@/features/onboarding/GenderSeekingPicker';
import { PhotoGrid } from '@/features/onboarding/PhotoGrid';
import { usePhotoSlots, type PhotoSlot } from '@/features/onboarding/usePhotoSlots';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { updateMyProfile, type ProfilePatch } from './api';
import { interestLabel, interestTile } from './interestTiles';
import { useProfile } from './ProfileProvider';
import {
  BIO_MAX_LENGTH,
  validateAge,
  validateBio,
  validateInstagram,
  validateName,
  type FieldResult,
  type ValidationError,
} from './profileValidation';
import { useAutosave } from './useAutosave';

type TextField = 'name' | 'age' | 'bio' | 'instagram';

// Edit profile with autosave: there is no Save button. Text is saved after a short pause (and when
// leaving a field or the screen), tapping a choice saves right away, and photos upload on the spot.
// A value that doesn't pass validation shows its error and is not saved.
export function EditProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditProfile'>) {
  const { t, i18n } = useTranslation();
  const { colors, radius, shadow, spacing, typography } = useTheme();
  const { show: showToast } = useToast();
  const { session } = useAuth();
  const userId = session?.user.id as string;
  const profileState = useProfile();
  const saved = profileState.status === 'ready' ? profileState.profile : null;
  const reload = profileState.reload;

  // The form starts from the saved profile and then belongs to the user: reloading the profile
  // after each save must not overwrite what is being typed.
  const [name, setName] = useState(saved?.name ?? '');
  const [age, setAge] = useState(saved?.age?.toString() ?? '');
  const [bio, setBio] = useState(saved?.bio ?? '');
  const [instagram, setInstagram] = useState(saved?.instagram ?? '');
  const [errors, setErrors] = useState<Partial<Record<TextField, ValidationError>>>({});
  const [gender, setGender] = useState<string | null>(saved?.genderCode ?? null);
  const [seeking, setSeeking] = useState<string | null>(saved?.partnerPreferenceCode ?? null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);

  const refreshProfile = useCallback(() => void reload(), [reload]);
  const autosave = useAutosave<ProfilePatch>({
    save: (patch) => updateMyProfile(userId, patch),
    onSettled: refreshProfile,
  });

  // One toast per failure; the top bar keeps offering "Reintentar".
  const previousStatus = useRef(autosave.status);
  useEffect(() => {
    if (autosave.status === 'error' && previousStatus.current !== 'error') {
      showToast({
        tone: 'error',
        title: t('profile.edit.saveErrorTitle'),
        message: t('profile.edit.tryAgain'),
      });
    }
    previousStatus.current = autosave.status;
  }, [autosave.status, showToast, t]);

  useEffect(() => {
    fetchCatalogs()
      .then(setCatalogs)
      .catch((error) => {
        console.error('Catalogs fetch error:', error);
        showToast({
          tone: 'error',
          title: t('profile.edit.loadErrorTitle'),
          message: t('profile.edit.tryAgain'),
        });
      });
    // Loaded once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photos = usePhotoSlots(userId, { onChange: refreshProfile });

  const removePhoto = (slot: PhotoSlot) => {
    if (slot.stored && photos.savedCount <= 1) {
      showToast({ tone: 'info', title: t('profile.edit.lastPhoto') });
      return;
    }
    void photos.removePhoto(slot);
  };

  // Validates a typed value: a valid one is queued for saving, an invalid one shows its error and
  // drops any older value still waiting, so it can't be saved by mistake. Field names are the
  // same as the keys of the patch.
  const edit = (field: TextField, result: FieldResult<ProfilePatch[TextField]>) => {
    if (result.ok) {
      setErrors((current) => ({ ...current, [field]: undefined }));
      autosave.queue({ [field]: result.value });
    } else {
      setErrors((current) => ({ ...current, [field]: result.error }));
      autosave.discard(field);
    }
  };

  const changeName = (text: string) => {
    setName(text);
    edit('name', validateName(text));
  };
  const changeAge = (text: string) => {
    setAge(text);
    edit('age', validateAge(text));
  };
  const changeBio = (text: string) => {
    setBio(text);
    edit('bio', validateBio(text));
  };
  const changeInstagram = (text: string) => {
    setInstagram(text);
    edit('instagram', validateInstagram(text));
  };

  const chooseGender = (code: string) => {
    const id = catalogs?.genders.find((option) => option.code === code)?.id;
    if (id == null) {
      return;
    }
    setGender(code);
    autosave.queue({ genderId: id }, { immediate: true });
  };
  const chooseSeeking = (code: string) => {
    const id = catalogs?.partnerPreferences.find((option) => option.code === code)?.id;
    if (id == null) {
      return;
    }
    setSeeking(code);
    autosave.queue({ partnerPreferenceId: id }, { immediate: true });
  };

  const error = (field: TextField) => (errors[field] ? t(`profile.edit.errors.${errors[field]}`) : undefined);
  const interests = saved?.interests ?? [];

  return (
    <SafeAreaView testID="edit-profile-screen" style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: spacing[2] }}>
        <TopBar
          title={t('profile.edit.title')}
          onBack={navigation.goBack}
          right={<SaveStatus status={autosave.status} onRetry={() => void autosave.retry()} />}
        />
      </View>

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8], gap: spacing[6] }}
        >
          <View style={{ gap: spacing[2] }}>
            <PhotoGrid
              slots={photos.slots}
              onAdd={() => void photos.pickPhotos()}
              onRemove={removePhoto}
              onRetry={photos.retryUpload}
            />
            <Text style={[typography.small, { color: colors.textSecondary }]}>{t('profile.edit.photosHint')}</Text>
          </View>

          <View style={{ gap: spacing[3] }}>
            <SectionHeader title={t('profile.edit.basicInfo')} />
            <ListGroup>
              <InfoRow
                icon="user"
                label={t('profile.edit.fields.name')}
                value={name}
                placeholder={t('profile.edit.placeholders.name')}
                autoCapitalize="words"
                error={error('name')}
                onChangeText={changeName}
                onBlur={() => void autosave.flush()}
              />
              <InfoRow
                icon="calendar"
                label={t('profile.edit.fields.age')}
                value={age}
                placeholder={t('profile.edit.placeholders.age')}
                keyboardType="number-pad"
                maxLength={2}
                error={error('age')}
                onChangeText={changeAge}
                onBlur={() => void autosave.flush()}
              />
              <InfoRow
                icon="fileText"
                label={t('profile.edit.fields.bio')}
                value={bio}
                placeholder={t('profile.edit.placeholders.bio')}
                multiline
                maxLength={BIO_MAX_LENGTH}
                error={error('bio')}
                onChangeText={changeBio}
                onBlur={() => void autosave.flush()}
              />
              <InfoRow
                icon="hash"
                label={t('profile.edit.fields.instagram')}
                value={instagram}
                prefix="@"
                placeholder={t('profile.edit.placeholders.instagram')}
                autoCapitalize="none"
                error={error('instagram')}
                onChangeText={changeInstagram}
                onBlur={() => void autosave.flush()}
              />
            </ListGroup>
          </View>

          {catalogs ? (
            <View style={{ gap: spacing[6] }}>
              <SectionHeader title={t('profile.edit.preferences')} />
              <GenderSeekingPicker
                catalogs={catalogs}
                gender={gender}
                seeking={seeking}
                onGenderChange={chooseGender}
                onSeekingChange={chooseSeeking}
              />
            </View>
          ) : null}

          <View style={{ gap: spacing[3] }}>
            <SectionHeader title={t('profile.edit.interests.title')} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.edit.interests.open')}
              onPress={() => navigation.navigate('EditInterests')}
              style={[
                styles.interests,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  paddingVertical: spacing[3],
                  paddingLeft: spacing[4],
                  paddingRight: spacing[3],
                  gap: spacing[2],
                },
                shadow.card,
              ]}
            >
              <View style={[styles.badges, { gap: 6 }]}>
                {interests.length ? (
                  interests.map((interest) => (
                    <Badge key={interest.code} tone="primary" icon={interestTile(interest.code).icon}>
                      {interestLabel(interest, i18n.language)}
                    </Badge>
                  ))
                ) : (
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    {t('profile.edit.interests.empty')}
                  </Text>
                )}
              </View>
              <Icon name="chevronRight" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  interests: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  badges: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
