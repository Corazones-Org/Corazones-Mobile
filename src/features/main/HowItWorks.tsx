import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/Icon/Icon';
import type { IconName } from '@/components/Icon/paths';
import { useTheme } from '@/theme/ThemeProvider';

// The steps of a turn, in order. Texts live in i18n under `main.howItWorks.steps.<n>`.
const STEPS: { key: string; icon: IconName }[] = [
  { key: '1', icon: 'calendar' },
  { key: '2', icon: 'users' },
  { key: '3', icon: 'heart' },
  { key: '4', icon: 'chat' },
  { key: '5', icon: 'pin' },
];

export function HowItWorks() {
  const { t } = useTranslation();
  const { colors, radius, shadow, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing[5], gap: spacing[3] },
        shadow.card,
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[typography.h4, styles.title, { color: colors.textPrimary }]}
      >
        {t('main.howItWorks.title')}
      </Text>
      {STEPS.map(({ key, icon }) => (
        <View key={key} style={[styles.step, { gap: spacing[3] }]}>
          <View style={[styles.number, { backgroundColor: colors.light }]}>
            <Text style={[typography.label, { color: colors.textPrimary }]}>{key}</Text>
          </View>
          <Icon name={icon} size={24} color={colors.textPrimary} />
          <Text style={[typography.body, styles.text, { color: colors.textPrimary }]}>
            {t(`main.howItWorks.steps.${key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  title: {
    textTransform: 'uppercase',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  number: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
});
