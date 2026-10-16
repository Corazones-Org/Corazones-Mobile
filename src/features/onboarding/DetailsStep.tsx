import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Stepper } from '@/components/Stepper/Stepper';
import { useToast } from '@/components/Toast/ToastProvider';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/profile/ProfileProvider';
import type { OnboardingStackParamList } from '@/navigation/types';

import { fetchCatalogs, saveOnboardingDetails, type CatalogOption } from './api';
import { GenderSeekingPicker, type Catalogs } from './GenderSeekingPicker';
import { StepLayout } from './StepLayout';

export function DetailsStep({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Details'>) {
  const { t } = useTranslation();
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

  // When onboarding is resumed here (the photos were saved in an earlier session) this screen is the
  // first of the stack, so there is nothing to go back to: open the photos step instead.
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Photos'));

  return (
    <StepLayout
      testID="details-step"
      topBar={
        <TopBar onBack={goBack}>
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
        <GenderSeekingPicker
          catalogs={catalogs}
          gender={gender}
          seeking={seeking}
          onGenderChange={setGender}
          onSeekingChange={setSeeking}
        />
      ) : null}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  retry: {
    alignSelf: 'center',
  },
});
