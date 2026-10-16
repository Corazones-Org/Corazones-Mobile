import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@/navigation/types';

import { addMyInterest, fetchInterestsCatalog, removeMyInterest } from './api';
import { CatalogChipsScreen } from './CatalogChipsScreen';
import { interestTile } from './interestTiles';
import { useProfile } from './ProfileProvider';

// The database allows at most 10 interests per profile (trigger `profile_interests_check`).
const MAX_INTERESTS = 10;

export function EditInterestsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditInterests'>) {
  const { t } = useTranslation();
  const profileState = useProfile();
  const initialCodes = profileState.status === 'ready' ? profileState.profile.interests.map((i) => i.code) : [];

  return (
    <CatalogChipsScreen
      testID="edit-interests-screen"
      title={t('profile.edit.interests.title')}
      subtitle={(count) => t('profile.edit.interests.subtitle', { max: MAX_INTERESTS, count })}
      loadErrorTitle={t('profile.edit.interests.loadErrorTitle')}
      initialCodes={initialCodes}
      fetchCatalog={fetchInterestsCatalog}
      add={addMyInterest}
      remove={removeMyInterest}
      tileFor={interestTile}
      max={MAX_INTERESTS}
      onBack={navigation.goBack}
    />
  );
}
