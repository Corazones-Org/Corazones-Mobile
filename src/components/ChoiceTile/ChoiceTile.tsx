import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Design system ChoiceTile: large square option with an icon and a label, three per row. The
// parent owns the value and lays tiles out; inside a group only one tile is selected.
// `onClick` is `onPress` in React Native.
export type ChoiceTileProps = {
  icon: IconName;
  label: string;
  selected?: boolean;
  filled?: boolean;
  // Unselected icon color.
  iconTone?: 'primary' | 'soft' | 'muted';
  onPress?: () => void;
};

export function ChoiceTile({
  icon,
  label,
  selected,
  filled,
  iconTone = 'primary',
  onPress,
}: ChoiceTileProps) {
  const { colors, radius, spacing, typography, shadow } = useTheme();

  const unselectedIcon = {
    primary: colors.primary,
    soft: colors.gradSoftStart,
    muted: colors.textSecondary,
  }[iconTone];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          borderRadius: radius.lg,
          padding: spacing[3],
          gap: spacing[2],
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
        selected && shadow.button,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <Icon name={icon} size={28} filled={filled} color={selected ? colors.onPrimary : unselectedIcon} />
      <Text
        style={[
          styles.label,
          {
            color: selected ? colors.onPrimary : colors.textSecondary,
            fontFamily: selected ? typography.button.fontFamily : typography.label.fontFamily,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
