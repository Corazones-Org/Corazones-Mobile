import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { ChoiceTile } from '@/components/ChoiceTile/ChoiceTile';
import type { IconName } from '@/components/Icon/paths';
import { Stepper } from '@/components/Stepper/Stepper';
import { useToast } from '@/components/Toast/ToastProvider';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/profile/ProfileProvider';
import type { OnboardingStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { fetchCatalogs, saveOnboardingDetails, type CatalogOption } from './api';
import { StepLayout } from './StepLayout';

type Tone = 'primary' | 'soft' | 'muted';

// Order and look of the tiles (from the design); the catalogs in the database decide which exist.
const GENDER_TILES: { code: string; icon: IconName }[] = [
  { code: 'female', icon: 'venus' },
  { code: 'male', icon: 'mars' },
  { code: 'other', icon: 'moreCircle' },
];

const SEEKING_TILES: { code: string; icon: IconName; tone: Tone }[] = [
  { code: 'women', icon: 'heart', tone: 'soft' },
  { code: 'men', icon: 'heart', tone: 'primary' },
  { code: 'everyone', icon: 'hearts', tone: 'muted' },
];

type Catalogs = { genders: CatalogOption[]; partnerPreferences: CatalogOption[] };

export function DetailsStep({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Details'>) {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();
  const { show: showToast } = useToast();
  const { session } = useAuth();
  const userId = session?.user.id as string;
  const profileState = useProfile();
  const saved = profileState.status === 'ready' ? profileState.profile : null;

  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [gender, setGender] = useState<string | null>(saved?.genderCode ?? null);
  const [seeking, setSeeking] = useState<string | null>(saved?.partnerPreferenceCode ?? null);
  const [saving, setSaving] = useState(false);

  const loadCatalogs = useCallback(() => {
    setLoadFailed(false);
    fetchCatalogs()
      .then(setCatalogs)
      .catch((error) => {
        console.error('Catalogs fetch error:', error);
        setLoadFailed(true);
        showToast({
          tone: 'error',
          title: t('onboarding.details.loadErrorTitle'),
          message: t('onboarding.details.tryAgain'),
        });
      });
  }, [showToast, t]);

  useEffect(loadCatalogs, [loadCatalogs]);

  const idOf = (options: CatalogOption[] | undefined, code: string | null) =>
    options?.find((option) => option.code === code)?.id;
  const genderId = idOf(catalogs?.genders, gender);
  const partnerPreferenceId = idOf(catalogs?.partnerPreferences, seeking);
  const canContinue = genderId != null && partnerPreferenceId != null;

  const save = async () => {
    if (genderId == null || partnerPreferenceId == null) {
      return;
    }
    setSaving(true);
    try {
      await saveOnboardingDetails(userId, { genderId, partnerPreferenceId });
      // The database marks onboarding as done; reloading the profile lets the gate open the app.
      await profileState.reload();
    } catch (error) {
      console.error('Onboarding save error:', error);
      showToast({
        tone: 'error',
        title: t('onboarding.details.saveErrorTitle'),
        message: t('onboarding.details.tryAgain'),
      });
      setSaving(false);
    }
  };

  const exists = (options: CatalogOption[] | undefined, code: string) =>
    options?.some((option) => option.code === code);

  return (
    <StepLayout
      testID="details-step"
      topBar={
        <TopBar onBack={navigation.goBack}>
          <Stepper steps={2} current={2} />
        </TopBar>
      }
      title={t('onboarding.details.title')}
      subtitle={t('onboarding.details.subtitle')}
      footer={
        <Button
          size="lg"
          block
          iconRight="arrowRight"
          disabled={!canContinue}
          loading={saving}
          onPress={save}
        >
          {t('onboarding.continue')}
        </Button>
      }
    >
      {loadFailed ? (
        <Button variant="link" style={styles.retry} onPress={loadCatalogs}>
          {t('profile.retry')}
        </Button>
      ) : catalogs ? (
        <>
          <View style={{ gap: spacing[3] }}>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>{t('onboarding.details.gender')}</Text>
            <View style={[styles.row, { gap: spacing[3] }]}>
              {GENDER_TILES.filter((tile) => exists(catalogs.genders, tile.code)).map((tile) => (
                <ChoiceTile
                  key={tile.code}
                  icon={tile.icon}
                  label={t(`genders.${tile.code}`)}
                  selected={gender === tile.code}
                  onPress={() => setGender(tile.code)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: spacing[3] }}>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>{t('onboarding.details.seeking')}</Text>
            <View style={[styles.row, { gap: spacing[3] }]}>
              {SEEKING_TILES.filter((tile) => exists(catalogs.partnerPreferences, tile.code)).map((tile) => (
                <ChoiceTile
                  key={tile.code}
                  icon={tile.icon}
                  iconTone={tile.tone}
                  filled
                  label={t(`partnerPreferences.${tile.code}`)}
                  selected={seeking === tile.code}
                  onPress={() => setSeeking(tile.code)}
                />
              ))}
            </View>
          </View>
        </>
      ) : null}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  retry: {
    alignSelf: 'center',
  },
});
