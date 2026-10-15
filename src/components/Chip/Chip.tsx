import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Design system Chip: a toggle. `pill` is a compact rounded chip; `tile` fills its grid cell and
// leads with an icon (interests). The parent owns `selected`; `onPress` is the design's `on-change`.
export type ChipTone = 'primary' | 'info' | 'success' | 'accent' | 'secondary';

export type ChipProps = {
  variant?: 'pill' | 'tile';
  icon?: IconName;
  // Icon color while the chip is not selected.
  iconTone?: ChipTone;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: string;
};

export function Chip({
  variant = 'pill',
  icon,
  iconTone = 'primary',
  selected,
  disabled,
  onPress,
  children,
}: ChipProps) {
  const { colors, radius, size, spacing, typography, shadow } = useTheme();
  const tile = variant === 'tile';

  const toneColor = {
    primary: colors.primary,
    info: colors.info,
    success: colors.success,
    accent: colors.accent,
    secondary: colors.secondary,
  }[iconTone];

  const foreground = selected ? colors.onPrimary : colors.textPrimary;
  const leading = icon ? (
    <Icon name={icon} size={tile ? 20 : 16} color={selected ? colors.onPrimary : toneColor} />
  ) : selected && !tile ? (
    <Icon name="check" size={16} strokeWidth={2.4} color={colors.onPrimary} />
  ) : null;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={children}
      accessibilityState={{ checked: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        {
          height: tile ? size.controlMd : size.controlSm,
          paddingHorizontal: spacing[4],
          borderRadius: tile ? radius.md : radius.pill,
          gap: tile ? spacing[3] : 6,
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled && !selected ? 0.5 : 1,
        },
        tile && styles.tile,
        selected && shadow.button,
      ]}
    >
      {leading}
      <Text style={[typography.label, { color: foreground, flexShrink: 1 }]} numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  tile: {
    alignSelf: 'stretch',
  },
});
