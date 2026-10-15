import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Stepper } from '@/components/Stepper/Stepper';
import { TipCard } from '@/components/TipCard/TipCard';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import type { OnboardingStackParamList } from '@/navigation/types';

import { PhotoGrid } from './PhotoGrid';
import { StepLayout } from './StepLayout';
import { usePhotoSlots } from './usePhotoSlots';

export function PhotosStep({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Photos'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user.id as string;

  const { slots: ordered, hasPhoto, busy, pickPhotos, retryUpload, removePhoto } = usePhotoSlots(userId);

  return (
    <StepLayout
      testID="photos-step"
      topBar={
        <TopBar>
          <Stepper steps={2} current={1} />
        </TopBar>
      }
      title={t('onboarding.photos.title')}
      subtitle={t('onboarding.photos.subtitle')}
      footer={
        <Button
          size="lg"
          block
          iconRight="arrowRight"
          disabled={!hasPhoto || busy}
          onPress={() => navigation.navigate('Details')}
        >
          {t('onboarding.continue')}
        </Button>
      }
    >
      <PhotoGrid
        slots={ordered}
        onAdd={() => void pickPhotos()}
        onRemove={(slot) => void removePhoto(slot)}
        onRetry={retryUpload}
      />

      <TipCard>{t('onboarding.photos.tip')}</TipCard>
    </StepLayout>
  );
}
