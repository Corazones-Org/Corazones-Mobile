import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Design system TipCard: small hint card with an orange icon (photo tips, privacy notes).
export type TipCardProps = { icon?: IconName; children?: string };

export function TipCard({ icon = 'lightbulb', children }: TipCardProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          gap: spacing[3],
        },
      ]}
    >
      <Icon name={icon} size={22} filled color={colors.accent} />
      <Text
        style={[
          styles.text,
          { color: colors.textPrimary, fontFamily: typography.body.fontFamily },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
