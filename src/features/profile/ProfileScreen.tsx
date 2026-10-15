import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { useLiquidTabBarClearance } from '@/components/LiquidTabBar/clearance';
import { SignOutButton } from '@/features/auth/SignOutButton';
import type { MainTabParamList, RootStackParamList } from '@/navigation/types';

import { interestLabel } from './interestTiles';
import { useProfile } from './ProfileProvider';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Structural placeholder for the Profile tab: shows the profile and opens the edit screen.
// The tab header supplies the title; the real UI comes later.
export function ProfileScreen({ navigation }: Props) {
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
        ['instagram', profile.instagram ? `@${profile.instagram}` : empty],
        [
          'interests',
          profile.interests.length
            ? profile.interests
                .map((interest) => interestLabel(interest, i18n.language))
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
      <Button icon="edit" onPress={() => navigation.navigate('EditProfile')}>
        {t('profile.edit.action')}
      </Button>

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
