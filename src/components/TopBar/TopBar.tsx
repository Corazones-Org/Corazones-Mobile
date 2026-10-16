import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';

// Design system TopBar: back chevron, centered title, optional pink text action on the right.
// `onClick`/`onBack` are `onPress`-style handlers; the back button only shows when there is
// somewhere to go back to (`onBack`), unless hidden with `back={false}`.
export type TopBarProps = {
  title?: string;
  onBack?: () => void;
  back?: boolean;
  action?: string;
  onAction?: () => void;
  // Replaces the action with any element (for example the autosave status).
  right?: ReactNode;
  // Replaces the title (e.g. the onboarding Stepper).
  children?: ReactNode;
};

export function TopBar({ title, onBack, back = true, action, onAction, right, children }: TopBarProps) {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.bar, { paddingHorizontal: spacing[2] }]}>
      <View style={styles.side}>
        {onBack && back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('components.topBar.back')}
            onPress={onBack}
            hitSlop={4}
            style={styles.backButton}
          >
            <Icon name="chevronLeft" size={24} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        {children ?? (
          <Text
            accessibilityRole="header"
            style={[
              typography.h4,
              { color: colors.textPrimary, textAlign: 'center' },
            ]}
          >
            {title}
          </Text>
        )}
      </View>

      <View style={[styles.side, styles.sideEnd, right ? styles.sideWide : null]}>
        {right ?? null}
        {!right && action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action}
            onPress={onAction}
            style={[styles.action, { paddingHorizontal: spacing[2] }]}
          >
            <Text style={[typography.button, { color: colors.primaryText, fontSize: 15 }]}>
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  side: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideEnd: {
    justifyContent: 'flex-end',
  },
  // An element of its own may need more than the standard width.
  sideWide: {
    width: undefined,
    minWidth: 72,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
