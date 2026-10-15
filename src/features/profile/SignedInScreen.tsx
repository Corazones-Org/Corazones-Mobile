import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SignOutButton } from '@/features/auth/SignOutButton';

import { useMyProfile } from './useMyProfile';

// Structural placeholder for the signed-in experience: just shows the profile that was created
// at registration so the user can see the session works. Navigation and real UI come later.
export function SignedInScreen() {
  const { t, i18n } = useTranslation();
  const { status, profile, reload } = useMyProfile();

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  const empty = t('profile.empty');

  const rows = profile
    ? [
        ['name', profile.name || empty],
        ['age', profile.age?.toString() ?? empty],
        ['gender', profile.genderCode ? t(`genders.${profile.genderCode}`) : empty],
        [
          'interestedIn',
          profile.partnerPreferenceCode
            ? t(`partnerPreferences.${profile.partnerPreferenceCode}`)
            : empty,
        ],
        ['bio', profile.bio || empty],
        [
          'interests',
          profile.interests.length
            ? profile.interests
                .map(({ code, labels }) => labels[i18n.language] ?? labels.es ?? code)
                .join(', ')
            : empty,
        ],
        ['photos', profile.photoPaths.length.toString()],
        ['complete', profile.complete ? t('profile.yes') : t('profile.no')],
      ]
    : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      {status === 'loading' ? <Text>{t('common.loading')}</Text> : null}

      {status === 'error' ? (
        <View>
          <Text>{t('profile.loadError')}</Text>
          <Button title={t('profile.retry')} onPress={reload} />
        </View>
      ) : null}

      {rows.map(([field, value]) => (
        <View key={field} style={styles.row}>
          <Text style={styles.label}>{t(`profile.fields.${field}`)}</Text>
          <Text>{value}</Text>
        </View>
      ))}

      <SignOutButton />
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  row: {
    gap: 2,
  },
  label: {
    fontWeight: '600',
  },
});
