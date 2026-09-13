import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { AuthGate } from '@/features/auth/AuthGate';
import { useAuth } from '@/features/auth/AuthProvider';
import { ProfileScreen } from '@/features/profile/ProfileScreen';

function Root() {
  const { t } = useTranslation();
  const { status } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('company.title')}</Text>
      {status === 'signedIn' ? <ProfileScreen /> : null}
      <AuthGate />
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
