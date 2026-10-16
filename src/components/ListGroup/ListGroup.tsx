import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Design system ListGroup: a white rounded card that holds InfoRows separated by hairlines.
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors, radius, shadow } = useTheme();

  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
        shadow.card,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
