import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/paths';

// Design system LiquidTabBar: a floating glass capsule with a pink "lens" that slides under the
// active tab (2 to 5 tabs). The parent places it (floating `space-6` above the bottom safe area);
// the app does that in navigation/MainTabBar. `onClick` is `onChange`, as in the design system.
//
// Glass: iOS blurs what is behind it (expo-blur). Android shows a more opaque fill instead, the
// fallback the design system allows, so labels stay readable; real Android blur needs every screen
// wrapped in a blur target and is a later improvement.
export type LiquidTabBarItem = { key: string; label: string; icon: IconName; badge?: number };

export type LiquidTabBarProps = {
  items: LiquidTabBarItem[];
  active?: string;
  onChange?: (key: string) => void;
  // false: icon-only capsule, the labels become accessibility labels.
  labels?: boolean;
  // Accessible name of the bar.
  label?: string;
};

const PADDING = 6;
const TAB_WIDTH_WITH_LABELS = 92;
const TAB_WIDTH_ICONS_ONLY = 64;
const HEIGHT_ICONS_ONLY = 60;

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => mounted && setReduce(value))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);
  return reduce;
}

function TabButton({
  item,
  active,
  showLabel,
  reduceMotion,
  onPress,
}: {
  item: LiquidTabBarItem;
  active: boolean;
  showLabel: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const { colors, typography, spacing } = useTheme();
  const pop = useRef(new Animated.Value(1)).current;
  const rise = useRef(new Animated.Value(1)).current;
  const wasActive = useRef(active);

  // The new active icon pops (small -> bigger -> settled) and its label rises in.
  useEffect(() => {
    if (active && !wasActive.current && !reduceMotion) {
      pop.setValue(0.7);
      rise.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pop, { toValue: 1.18, duration: 170, useNativeDriver: true }),
          Animated.timing(pop, { toValue: 1, duration: 140, useNativeDriver: true }),
        ]),
        Animated.timing(rise, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }
    wasActive.current = active;
  }, [active, pop, rise, reduceMotion]);

  const iconColor = active ? colors.primary : colors.textPrimary;
  const isSettings = item.icon === 'settings';

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.tab}
    >
      {({ pressed }) => (
        <>
          <Animated.View
            style={[
              styles.iconWrap,
              { transform: [{ scale: pressed ? 0.88 : pop }] },
            ]}
          >
            <Icon
              name={item.icon}
              size={24}
              color={iconColor}
              filled={active && !isSettings}
              strokeWidth={active && isSettings ? 2.2 : 1.8}
            />
            {item.badge ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.primary, borderColor: colors.card },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.onPrimary, fontFamily: typography.button.fontFamily }]}>
                  {item.badge}
                </Text>
              </View>
            ) : null}
          </Animated.View>

          {showLabel ? (
            <Animated.Text
              style={[
                styles.label,
                {
                  color: active ? colors.primaryText : colors.textPrimary,
                  fontFamily: active ? typography.button.fontFamily : typography.micro.fontFamily,
                  marginTop: spacing[1] / 4,
                  opacity: active ? rise.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) : 1,
                  transform: [
                    {
                      translateY: active
                        ? rise.interpolate({ inputRange: [0, 1], outputRange: [3, 0] })
                        : 0,
                    },
                  ],
                },
              ]}
            >
              {item.label}
            </Animated.Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

export function LiquidTabBar({
  items,
  active,
  onChange,
  labels = true,
  label = 'Navegación principal',
}: LiquidTabBarProps) {
  const theme = useTheme();
  const { colors, radius, shadow } = theme;
  const reduceMotion = useReduceMotion();
  const count = items.length;

  const found = items.findIndex((item) => item.key === active);
  const activeIndex = found === -1 ? 0 : found;

  const [trackWidth, setTrackWidth] = useState(0);
  const segment = trackWidth / count;

  // The lens: it springs to the new tab and squashes/stretches on the way, like a drop of liquid.
  const position = useRef(new Animated.Value(activeIndex)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const previousIndex = useRef(activeIndex);

  useEffect(() => {
    if (previousIndex.current === activeIndex) {
      return;
    }
    previousIndex.current = activeIndex;
    if (reduceMotion) {
      position.setValue(activeIndex);
      return;
    }
    Animated.spring(position, {
      toValue: activeIndex,
      stiffness: 200,
      damping: 14,
      mass: 1,
      useNativeDriver: true,
    }).start();
    Animated.sequence([
      Animated.timing(stretch, { toValue: 1.25, duration: 130, useNativeDriver: true }),
      Animated.spring(stretch, { toValue: 1, stiffness: 240, damping: 12, mass: 1, useNativeDriver: true }),
    ]).start();
  }, [activeIndex, position, stretch, reduceMotion]);

  const width = count * (labels ? TAB_WIDTH_WITH_LABELS : TAB_WIDTH_ICONS_ONLY) + 2 * PADDING;
  const height = labels ? theme.size.tabbar : HEIGHT_ICONS_ONLY;

  return (
    // Outer layer carries the shadow (it would be clipped on the glass layer).
    <View
      style={[
        { width, height, maxWidth: '100%', borderRadius: radius.pill, backgroundColor: 'transparent' },
        shadow.liquid,
      ]}
    >
      <View
        testID="liquid-tab-bar"
        accessibilityRole="tablist"
        accessibilityLabel={label}
        style={[
          styles.glass,
          { borderRadius: radius.pill, borderColor: colors.liquidEdge },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <>
            <BlurView
              intensity={40}
              tint={theme.name === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.liquidFill }]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
        )}

        {/* Top sheen: a soft highlight over the upper half. */}
        <LinearGradient
          pointerEvents="none"
          colors={[colors.liquidShine, 'rgba(255, 255, 255, 0)']}
          style={[styles.sheen, { borderRadius: radius.pill }]}
        />

        <View testID="liquid-track" style={styles.track} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
          {trackWidth > 0 ? (
            <Animated.View
              testID="liquid-lens"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={[
                styles.lens,
                {
                  width: segment,
                  borderRadius: radius.pill,
                  backgroundColor: colors.liquidLens,
                  borderTopColor: colors.liquidShine,
                  transform: [
                    {
                      translateX: position.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, segment],
                      }),
                    },
                    { scaleX: stretch },
                  ],
                },
              ]}
            />
          ) : null}

          {items.map((item) => (
            <TabButton
              key={item.key}
              item={item}
              active={item.key === items[activeIndex]?.key}
              showLabel={labels}
              reduceMotion={reduceMotion}
              onPress={() => {
                if (item.key !== items[activeIndex]?.key) {
                  onChange?.(item.key);
                }
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    padding: PADDING - 1,
  },
  sheen: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '50%',
    opacity: 0.45,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  lens: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -11,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'content-box',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
});
