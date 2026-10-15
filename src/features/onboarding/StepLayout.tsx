import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { signOut } from '@/features/auth/api';

import { useTheme } from '@/theme/ThemeProvider';

// Shared frame of the onboarding steps: top bar, centered title and subtitle, scrollable content,
// and a footer pinned to the bottom: the Continue button and, below it, a logout link. There is no
// skip, so logging out is the only way out of onboarding (for example after using the wrong account).
export function StepLayout({
  testID,
  topBar,
  title,
  subtitle,
  footer,
  children,
}: {
  testID: string;
  topBar: ReactNode;
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView testID={testID} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: spacing[2] }}>{topBar}</View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: spacing[4], paddingTop: spacing[5], gap: spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heading, { gap: 6 }]}>
          <Text
            accessibilityRole="header"
            style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}
          >
            {title}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
            {subtitle}
          </Text>
        </View>
        {children}
      </ScrollView>

      <View style={{ padding: spacing[4], paddingTop: spacing[4], gap: spacing[1] }}>
        {footer}
        <Button variant="link" style={styles.logout} onPress={signOut}>
          {t('auth.signOut')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  heading: {
    alignItems: 'center',
  },
  logout: {
    alignSelf: 'center',
  },
});
