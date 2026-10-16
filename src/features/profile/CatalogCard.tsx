import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge/Badge';
import type { IconName } from '@/components/Icon/paths';
import { Icon } from '@/components/Icon/Icon';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { useTheme } from '@/theme/ThemeProvider';

import { catalogLabel, type CatalogItem } from './catalog';

// A section of the profile that summarizes a catalog choice (interests, outing types): a title and
// a tappable card with the chosen items as badges, which opens the screen to change them.
export function CatalogCard({
  title,
  emptyText,
  openLabel,
  items,
  iconFor,
  onPress,
}: {
  title: string;
  emptyText: string;
  // Accessible name of the card, which acts as a button.
  openLabel: string;
  items: CatalogItem[];
  iconFor: (code: string) => IconName;
  onPress: () => void;
}) {
  const { i18n } = useTranslation();
  const { colors, radius, shadow, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={title} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={openLabel}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingVertical: spacing[3],
            paddingLeft: spacing[4],
            paddingRight: spacing[3],
            gap: spacing[2],
          },
          shadow.card,
        ]}
      >
        <View style={[styles.badges, { gap: 6 }]}>
          {items.length ? (
            items.map((item) => (
              <Badge key={item.code} tone="primary" icon={iconFor(item.code)}>
                {catalogLabel(item, i18n.language)}
              </Badge>
            ))
          ) : (
            <Text style={[typography.body, { color: colors.textSecondary }]}>{emptyText}</Text>
          )}
        </View>
        <Icon name="chevronRight" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  badges: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
