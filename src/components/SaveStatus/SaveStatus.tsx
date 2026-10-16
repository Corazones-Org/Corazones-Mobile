import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';

// Autosave state shown in the top bar, where a "Save" button would be: nothing while idle, then
// "Guardando…", "Guardado" and, when a save failed, a tappable "Reintentar".
export type SaveStatusProps = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  onRetry?: () => void;
};

export function SaveStatus({ status, onRetry }: SaveStatusProps) {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();

  if (status === 'idle') {
    return null;
  }

  if (status === 'error') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('components.saveStatus.error')}. ${t('components.saveStatus.retryHint')}`}
        onPress={onRetry}
        hitSlop={8}
        style={[styles.row, { gap: 4, paddingHorizontal: spacing[2] }]}
      >
        <Icon name="alertCircle" size={16} color={colors.errorText} />
        <Text style={[typography.small, { color: colors.errorText }]}>
          {t('components.saveStatus.retry')}
        </Text>
      </Pressable>
    );
  }

  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[
        typography.small,
        { color: status === 'saved' ? colors.successText : colors.textSecondary, paddingHorizontal: spacing[2] },
      ]}
    >
      {t(`components.saveStatus.${status}`)}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
});
