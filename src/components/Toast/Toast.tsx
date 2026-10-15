import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Design system Toast: short message with an icon and words for every tone. `onClick` is
// `onPress` in React Native. Auto-dismiss is done by ToastProvider, not here.
export type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'match';

export type ToastProps = {
  tone?: ToastTone;
  title?: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
  children?: string;
};

const TONE_ICON: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'checkCircle',
  warning: 'alertCircle',
  error: 'alertCircle',
  match: 'heart',
};

export function Toast({ tone = 'info', title, icon, action, onAction, children }: ToastProps) {
  const { colors, radius, spacing, shadow, typography } = useTheme();

  const badge = {
    info: { background: colors.infoSoft, color: colors.info },
    success: { background: colors.successSoft, color: colors.successText },
    warning: { background: colors.accentSoft, color: colors.warningText },
    error: { background: colors.card, color: colors.error },
    match: { background: colors.primary, color: colors.onPrimary },
  }[tone];

  return (
    <View
      accessible
      role={tone === 'error' ? 'alert' : 'status'}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[
        styles.toast,
        shadow.card,
        {
          gap: spacing[3],
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          borderRadius: radius.lg,
          backgroundColor: tone === 'error' ? colors.errorSoft : colors.card,
          borderColor: tone === 'error' ? colors.errorSoft : colors.border,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: badge.background }]}>
        <Icon name={icon ?? TONE_ICON[tone]} size={20} color={badge.color} filled={tone === 'match'} />
      </View>

      <View style={styles.text}>
        {title ? (
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.button.fontFamily }]}>
            {title}
          </Text>
        ) : null}
        {children ? (
          <Text
            style={[
              styles.message,
              {
                color: tone === 'error' ? colors.textPrimary : colors.textSecondary,
                fontFamily: typography.body.fontFamily,
              },
            ]}
          >
            {children}
          </Text>
        ) : null}
      </View>

      {action ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.primaryText, fontFamily: typography.button.fontFamily }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    maxWidth: 380,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    minHeight: 36,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
  },
});
