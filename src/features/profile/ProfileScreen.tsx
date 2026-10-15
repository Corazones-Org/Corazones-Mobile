import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLiquidTabBarClearance } from '@/components/LiquidTabBar/clearance';
import { SignOutButton } from '@/features/auth/SignOutButton';

import { useProfile } from './ProfileProvider';

// Structural placeholder for the Profile tab: shows the profile that was created at registration.
// The tab header supplies the title; real UI and editing come later.
export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { profile } = useProfile();
  // The tab bar floats over the screen: leave room so the last row scrolls clear of it.
  const bottomClearance = useLiquidTabBarClearance();

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
    <ScrollView
      testID="profile-scroll"
      contentContainerStyle={[styles.container, { paddingBottom: bottomClearance }]}
    >
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
    padding: 24,
    gap: 12,
  },
  row: {
    gap: 2,
  },
  label: {
    fontWeight: '600',
  },
});
