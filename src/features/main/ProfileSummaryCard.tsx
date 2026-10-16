import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge/Badge';
import { Icon } from '@/components/Icon/Icon';
import { photoUrl } from '@/features/onboarding/api';
import { catalogLabel } from '@/features/profile/catalog';
import { outingTypeTile } from '@/features/profile/outingTypeTiles';
import { useProfile } from '@/features/profile/ProfileProvider';
import { useTheme } from '@/theme/ThemeProvider';

const PHOTO_SIZE = 88;
// More than this would stretch the card; the rest are visible in the Profile tab.
const MAX_OUTING_TYPES = 4;

// "Completá tu perfil": a soft card summarizing the user's own profile (photo, name and age, and
// the kinds of outing they are up for). The whole card is tappable and opens the Profile tab.
export function ProfileSummaryCard({ onPress }: { onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const { colors, radius, shadow, spacing, typography } = useTheme();
  const { profile } = useProfile();

  if (!profile) {
    return null;
  }

  const heading = [profile.name, profile.age].filter((part) => part != null && part !== '').join(', ');
  const photo = profile.photoPaths[0];

  return (
    <Pressable
      testID="profile-summary-card"
      accessibilityRole="button"
      accessibilityLabel={t('main.profileCard.open')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderRadius: radius.xl, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        shadow.card,
      ]}
    >
      <LinearGradient
        colors={[colors.gradSoftEnd, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
      />
      <View style={{ padding: spacing[5], gap: spacing[4] }}>
        <View style={{ gap: spacing[1] }}>
          <Text accessibilityRole="header" style={[typography.h4, styles.title, { color: colors.textPrimary }]}>
            {t('main.profileCard.title')}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {t('main.profileCard.subtitle')}
          </Text>
        </View>

        <View style={[styles.row, { gap: spacing[4] }]}>
          {photo ? (
            <Image
              testID="profile-summary-photo"
              source={{ uri: photoUrl(photo) }}
              style={[styles.photo, { borderColor: colors.card }]}
            />
          ) : (
            <View
              testID="profile-summary-photo-empty"
              style={[styles.photo, styles.photoEmpty, { borderColor: colors.card, backgroundColor: colors.light }]}
            >
              <Icon name="user" size={40} color={colors.primary} />
            </View>
          )}
          <View style={[styles.details, { gap: spacing[2] }]}>
            {heading ? <Text style={[typography.h3, { color: colors.textPrimary }]}>{heading}</Text> : null}
            {profile.outingTypes.length ? (
              <View testID="profile-summary-outing-types" style={styles.badges}>
                {profile.outingTypes.slice(0, MAX_OUTING_TYPES).map((item) => (
                  <Badge key={item.code} tone="primary" icon={outingTypeTile(item.code).icon}>
                    {catalogLabel(item, i18n.language)}
                  </Badge>
                ))}
              </View>
            ) : null}
          </View>
          <Icon name="chevronRight" size={24} color={colors.primaryText} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  title: {
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    borderWidth: 3,
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
