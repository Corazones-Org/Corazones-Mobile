import { LinearGradient } from 'expo-linear-gradient';
import { isValidElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Same API as the design system's Button; `onClick` is `onPress` in React Native, `className` is
// `style`, and only the variants the app uses so far are built (add the rest as screens need them).
export type ButtonProps = {
  variant?: 'primary' | 'google' | 'link';
  size?: 'sm' | 'md' | 'lg';
  // An icon name, or a node for third-party marks (the Google "G").
  icon?: IconName | ReactNode;
  iconFilled?: boolean;
  iconRight?: IconName;
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: string;
};

const FONT_SIZE = { sm: 14, md: 15, lg: 16 } as const;

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconFilled,
  iconRight,
  block,
  loading,
  disabled,
  onPress,
  style,
  children,
}: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const inactive = Boolean(disabled || loading);
  // A loading primary button keeps its look; any other inactive button greys out.
  const greyedOut = Boolean(disabled) && !loading;

  const height = variant === 'link' ? 44 : { sm: theme.size.controlSm, md: theme.size.controlMd, lg: theme.size.controlLg }[size];
  const radius = { sm: theme.radius.sm, md: theme.radius.md, lg: theme.radius.lg }[size];

  const textColor = greyedOut
    ? colors.onDisabled
    : { primary: colors.onPrimary, google: colors.textPrimary, link: colors.primaryText }[variant];

  const renderIcon = (name: IconName, filled?: boolean) => (
    <Icon name={name} size={20} color={textColor} filled={filled} />
  );

  const content = (
    <>
      {loading ? (
        <ActivityIndicator testID="button-spinner" color={textColor} />
      ) : typeof icon === 'string' ? (
        renderIcon(icon as IconName, iconFilled)
      ) : isValidElement(icon) ? (
        icon
      ) : null}
      <Text
        style={[
          styles.label,
          {
            color: textColor,
            fontFamily: theme.typography.button.fontFamily,
            fontSize: FONT_SIZE[size],
            lineHeight: theme.typography.button.lineHeight,
          },
          block && styles.blockLabel,
        ]}
      >
        {children}
      </Text>
      {!loading && iconRight ? (
        <View style={block ? { marginLeft: -theme.spacing[6] } : undefined}>
          {renderIcon(iconRight)}
        </View>
      ) : null}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: radius,
          gap: theme.spacing[2],
          paddingHorizontal:
            variant === 'link' ? theme.spacing[2] : size === 'sm' ? theme.spacing[4] : size === 'lg' ? theme.spacing[6] : theme.spacing[5],
        },
        block && styles.block,
        variant === 'google' && { backgroundColor: colors.card, borderColor: colors.border },
        variant === 'primary' && pressed && !inactive && { backgroundColor: colors.primaryDark },
        variant === 'primary' && !pressed && !greyedOut && theme.shadow.button,
        greyedOut && { backgroundColor: colors.disabled, borderColor: 'transparent' },
        pressed && !inactive && variant === 'link' && { opacity: theme.opacity.pressed },
        pressed && !inactive && variant !== 'link' && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {variant === 'primary' && !greyedOut && !pressed ? (
            <LinearGradient
              colors={[colors.secondary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
            />
          ) : null}
          {content}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignSelf: 'flex-start',
  },
  block: {
    alignSelf: 'stretch',
  },
  label: {
    fontWeight: undefined,
  },
  blockLabel: {
    flex: 1,
    textAlign: 'center',
  },
});
