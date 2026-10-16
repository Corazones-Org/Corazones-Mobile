import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Design system SectionHeader: section title, optional subtitle, optional pink text action.
export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, subtitle, action, onAction }: SectionHeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing[2] }]}>
      <View style={styles.text}>
        <Text accessibilityRole="header" style={[typography.h4, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={8}>
          <Text style={[typography.label, { color: colors.primaryText, fontFamily: typography.button.fontFamily }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
