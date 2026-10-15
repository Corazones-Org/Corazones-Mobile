import { Button } from 'react-native';
import { useTranslation } from 'react-i18next';

import { signOut } from './api';

export function SignOutButton() {
  const { t } = useTranslation();

  return <Button title={t('auth.signOut')} onPress={signOut} />;
}
