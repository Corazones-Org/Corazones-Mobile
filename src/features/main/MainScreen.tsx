import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

// Placeholder for the screen users land on after signing in. The real content (countdown to the
// next time slot) arrives with COR-5.
export function MainScreen() {
  const { t } = useTranslation();

  return (
    <View testID="main-screen" style={styles.container}>
      <Text style={styles.title}>{t('main.title')}</Text>
      <Text>{t('main.comingSoon')}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
