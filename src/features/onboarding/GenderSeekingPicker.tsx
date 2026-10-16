import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChoiceTile } from '@/components/ChoiceTile/ChoiceTile';
import type { IconName } from '@/components/Icon/paths';
import { useTheme } from '@/theme/ThemeProvider';

import type { CatalogOption } from './api';

type Tone = 'primary' | 'soft' | 'muted';

// Order and look of the tiles (from the design); the catalogs in the database decide which exist.
const GENDER_TILES: { code: string; icon: IconName }[] = [
  { code: 'female', icon: 'venus' },
  { code: 'male', icon: 'mars' },
  { code: 'other', icon: 'moreCircle' },
];

const SEEKING_TILES: { code: string; icon: IconName; tone: Tone }[] = [
  { code: 'women', icon: 'heart', tone: 'soft' },
  { code: 'men', icon: 'heart', tone: 'primary' },
  { code: 'everyone', icon: 'hearts', tone: 'muted' },
];

export type Catalogs = { genders: CatalogOption[]; partnerPreferences: CatalogOption[] };

// "Tu género" and "Busco": two rows of choice tiles, shared by onboarding and profile editing.
// The parent owns the selected codes.
export function GenderSeekingPicker({
  catalogs,
  gender,
  seeking,
  onGenderChange,
  onSeekingChange,
}: {
  catalogs: Catalogs;
  gender: string | null;
  seeking: string | null;
  onGenderChange: (code: string) => void;
  onSeekingChange: (code: string) => void;
}) {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();

  const exists = (options: CatalogOption[], code: string) =>
    options.some((option) => option.code === code);

  return (
    <>
      <View style={{ gap: spacing[3] }}>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>{t('onboarding.details.gender')}</Text>
        <View style={[styles.row, { gap: spacing[3] }]}>
          {GENDER_TILES.filter((tile) => exists(catalogs.genders, tile.code)).map((tile) => (
            <ChoiceTile
              key={tile.code}
              icon={tile.icon}
              label={t(`genders.${tile.code}`)}
              selected={gender === tile.code}
              onPress={() => onGenderChange(tile.code)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing[3] }}>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>{t('onboarding.details.seeking')}</Text>
        <View style={[styles.row, { gap: spacing[3] }]}>
          {SEEKING_TILES.filter((tile) => exists(catalogs.partnerPreferences, tile.code)).map((tile) => (
            <ChoiceTile
              key={tile.code}
              icon={tile.icon}
              iconTone={tile.tone}
              filled
              label={t(`partnerPreferences.${tile.code}`)}
              selected={seeking === tile.code}
              onPress={() => onSeekingChange(tile.code)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
