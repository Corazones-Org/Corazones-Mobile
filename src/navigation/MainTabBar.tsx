import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { IconName } from '@/components/Icon/paths';
import { LiquidTabBar } from '@/components/LiquidTabBar/LiquidTabBar';
import { useTheme } from '@/theme/ThemeProvider';

const ROUTE_ICONS: Record<string, IconName> = {
  Main: 'home',
  Profile: 'user',
};

// The app's tab bar: the design system's liquid glass capsule, floating centered `space-6` above the
// bottom safe area, over the screen (which scrolls under it: see useLiquidTabBarClearance). It
// follows React Navigation's contract: a tab press is emitted first, and only navigates if nobody
// prevented it.
export function MainTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  const items = state.routes.map((route) => {
    const options = descriptors[route.key].options;
    return {
      key: route.key,
      label: typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name),
      icon: ROUTE_ICONS[route.name] ?? 'home',
    };
  });

  const onChange = (key: string) => {
    const route = state.routes.find((item) => item.key === key);
    if (!route) {
      return;
    }
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      testID="main-tab-bar-dock"
      pointerEvents="box-none"
      style={[
        styles.dock,
        { bottom: insets.bottom + spacing[6], paddingHorizontal: spacing[4] },
      ]}
    >
      <LiquidTabBar
        items={items}
        active={state.routes[state.index].key}
        onChange={onChange}
        label={t('tabs.navigation')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
