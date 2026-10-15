import { StyleSheet, View } from 'react-native';

import { DIVIDER_HEIGHT } from './constants';

// Thin line, small ring, thin line: separates the logo from the sign-in button.
export function WelcomeDivider() {
  return (
    <View testID="welcome-divider" style={styles.row}>
      <View style={styles.line} />
      <View style={styles.ring} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: DIVIDER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 16,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  ring: {
    width: DIVIDER_HEIGHT,
    height: DIVIDER_HEIGHT,
    borderRadius: DIVIDER_HEIGHT / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
});
