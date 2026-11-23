import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  visible: boolean;
  // Signing up is in progress (reading the location and asking the server).
  loading: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

// The notice shown before signing up. Accepting it is required, and the server records when.
export function DisclaimerModal({ visible, loading, onAccept, onCancel }: Props) {
  const { t } = useTranslation();
  const { colors, radius, shadow, spacing, typography } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.scrim, { backgroundColor: colors.scrim, padding: spacing[6] }]}>
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            shadow.card,
            {
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              padding: spacing[6],
              gap: spacing[4],
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.light }]}>
            <Icon name="heart" size={28} filled color={colors.primary} />
          </View>
          <View style={{ gap: spacing[2] }}>
            <Text accessibilityRole="header" style={[typography.h3, styles.centered, { color: colors.textPrimary }]}>
              {t('timeSlots.disclaimer.title')}
            </Text>
            <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
              {t('timeSlots.disclaimer.message')}
            </Text>
          </View>
          <View style={{ gap: spacing[2] }}>
            <Button size="lg" block loading={loading} onPress={onAccept}>
              {t('timeSlots.disclaimer.accept')}
            </Button>
            <Button variant="link" block disabled={loading} onPress={onCancel}>
              {t('timeSlots.disclaimer.cancel')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
  },
  sheet: {
    alignSelf: 'stretch',
  },
  icon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
