import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { InfoRow } from '@/components/InfoRow/InfoRow';
import { ListGroup } from '@/components/ListGroup/ListGroup';
import { SaveStatus } from '@/components/SaveStatus/SaveStatus';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { useLiquidTabBarClearance } from '@/components/LiquidTabBar/clearance';
import { useToast } from '@/components/Toast/ToastProvider';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { fetchCatalogs } from '@/features/onboarding/api';
import { GenderSeekingPicker, type Catalogs } from '@/features/onboarding/GenderSeekingPicker';
import { PhotoGrid } from '@/features/onboarding/PhotoGrid';
import { usePhotoSlots, type PhotoSlot } from '@/features/onboarding/usePhotoSlots';
import type { MainTabParamList, RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { updateMyProfile, type ProfilePatch } from './api';
import { CatalogCard } from './CatalogCard';
import { interestTile } from './interestTiles';
import { outingTypeTile } from './outingTypeTiles';
import { useProfile } from './ProfileProvider';
import {
  BIO_MAX_LENGTH,
  validateAge,
  validateBio,
  validateName,
  type FieldResult,
  type ValidationError,
} from './profileValidation';
import { useAutosave } from './useAutosave';

type TextField = 'name' | 'age' | 'bio';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

// The Profile tab: the user's own profile, always editable, with autosave (there is no Save button). Text is saved after a short pause (and when
// leaving a field or the screen), tapping a choice saves right away, and photos upload on the spot.
// A value that doesn't pass validation shows its error and is not saved.
export function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
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

  // The tab stays mounted when the user switches to another one, so also save when it loses focus.
  const { flush } = autosave;
  useEffect(() => navigation.addListener('blur', () => void flush()), [navigation, flush]);

  const photos = usePhotoSlots(userId, { onChange: refreshProfile });
  // The tab bar floats over the screen: leave room so the last row scrolls clear of it.
  const bottomClearance = useLiquidTabBarClearance();

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

  return (
    <SafeAreaView
      testID="profile-screen"
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <View style={{ paddingTop: spacing[2] }}>
        <TopBar
          title={t('profile.title')}
          right={<SaveStatus status={autosave.status} onRetry={() => void autosave.retry()} />}
        />
      </View>

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          testID="profile-scroll"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing[4], paddingTop: spacing[3], paddingBottom: bottomClearance, gap: spacing[6] }}
        >
          <PhotoGrid
            slots={photos.slots}
            onAdd={() => void photos.pickPhotos()}
            onRemove={removePhoto}
            onRetry={photos.retryUpload}
          />

          {catalogs ? (
            <GenderSeekingPicker
              catalogs={catalogs}
              gender={gender}
              seeking={seeking}
              onGenderChange={chooseGender}
              onSeekingChange={chooseSeeking}
            />
          ) : null}

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
            </ListGroup>
          </View>

          <CatalogCard
            title={t('profile.edit.interests.title')}
            emptyText={t('profile.edit.interests.empty')}
            openLabel={t('profile.edit.interests.open')}
            items={saved?.interests ?? []}
            iconFor={(code) => interestTile(code).icon}
            onPress={() => navigation.navigate('EditInterests')}
          />

          <CatalogCard
            title={t('profile.edit.outingTypes.title')}
            emptyText={t('profile.edit.outingTypes.empty')}
            openLabel={t('profile.edit.outingTypes.open')}
            items={saved?.outingTypes ?? []}
            iconFor={(code) => outingTypeTile(code).icon}
            onPress={() => navigation.navigate('EditOutingTypes')}
          />

          <SignOutButton />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
