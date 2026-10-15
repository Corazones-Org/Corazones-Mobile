import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Design system Badge: small pill with a soft background, an optional icon and a short label.
export type BadgeTone = 'primary' | 'info' | 'accent' | 'success' | 'neutral';

export type BadgeProps = {
  tone?: BadgeTone;
  icon?: IconName;
  children: string;
};

export function Badge({ tone = 'primary', icon, children }: BadgeProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const palette = {
    primary: { background: colors.light, text: colors.primaryText, icon: colors.primary },
    info: { background: colors.infoSoft, text: colors.infoText, icon: colors.info },
    accent: { background: colors.accentSoft, text: colors.accentText, icon: colors.accent },
    success: { background: colors.successSoft, text: colors.successText, icon: colors.successText },
    neutral: { background: colors.card, text: colors.textPrimary, icon: colors.textSecondary },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.background,
          borderColor: tone === 'neutral' ? colors.border : 'transparent',
          borderRadius: radius.pill,
          paddingHorizontal: spacing[3],
          gap: 6,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={palette.icon} /> : null}
      <Text style={{ ...typography.label, fontSize: 13, lineHeight: 16, color: palette.text }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
});
