import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

// The liquid tab bar floats over the screen, so content scrolls under it. Screens add this much
// bottom padding to their scroll view so the last item can be scrolled clear of the bar:
// the gap above the safe area, the bar itself, and some air (design system: `tabbar` + `space-8`).
export function useLiquidTabBarClearance() {
  const insets = useContext(SafeAreaInsetsContext);
  const { spacing, size } = useTheme();

  return (insets?.bottom ?? 0) + spacing[6] + size.tabbar + spacing[8];
}
