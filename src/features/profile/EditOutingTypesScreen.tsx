import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@/navigation/types';

import { addMyOutingType, fetchOutingTypesCatalog, removeMyOutingType } from './api';
import { CatalogChipsScreen } from './CatalogChipsScreen';
import { outingTypeTile } from './outingTypeTiles';
import { useProfile } from './ProfileProvider';

// "Tipo de salida": what kind of plan the person is up for. No limit on how many.
export function EditOutingTypesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditOutingTypes'>) {
  const { t } = useTranslation();
  const profileState = useProfile();
  const initialCodes = profileState.status === 'ready' ? profileState.profile.outingTypes.map((o) => o.code) : [];

  return (
    <CatalogChipsScreen
      testID="edit-outing-types-screen"
      title={t('profile.edit.outingTypes.title')}
      subtitle={(count) => t('profile.edit.outingTypes.subtitle', { count })}
      loadErrorTitle={t('profile.edit.outingTypes.loadErrorTitle')}
      initialCodes={initialCodes}
      fetchCatalog={fetchOutingTypesCatalog}
      add={addMyOutingType}
      remove={removeMyOutingType}
      tileFor={outingTypeTile}
      onBack={navigation.goBack}
    />
  );
}
