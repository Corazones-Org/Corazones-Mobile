import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { DIVIDER_HEIGHT } from './constants';

// Thin line, small ring, thin line: separates the logo from the sign-in button.
export function WelcomeDivider() {
  const { colors, spacing } = useTheme();
  const line = [styles.line, { backgroundColor: colors.onPhoto }];

  return (
    <View testID="welcome-divider" style={[styles.row, { gap: spacing[4] }]}>
      <View style={line} />
      <View style={[styles.ring, { borderColor: colors.onPhoto }]} />
      <View style={line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: DIVIDER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.45,
  },
  ring: {
    width: DIVIDER_HEIGHT,
    height: DIVIDER_HEIGHT,
    borderRadius: DIVIDER_HEIGHT / 2,
    borderWidth: 2,
    opacity: 0.7,
  },
});
