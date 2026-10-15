import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/ThemeProvider';

// Design system Stepper: onboarding progress, dots joined by a line. `current` is 1-based.
export type StepperProps = { steps?: number; current?: number };

const WIDTH = 100;
const DOT = 16;
const HALO = 22;

export function Stepper({ steps = 2, current = 1 }: StepperProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const percent = steps > 1 ? ((current - 1) / (steps - 1)) * 100 : 100;
  const dots = Array.from({ length: steps }, (_, index) => index + 1);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('components.stepper.label', { current, steps })}
      accessibilityValue={{ min: 1, max: steps, now: current }}
      style={styles.root}
    >
      <View style={[styles.track, { backgroundColor: colors.light }]}>
        <View
          testID="stepper-fill"
          style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 999 }}
        />
      </View>

      {dots.map((step) => {
        const done = step <= current;
        const isCurrent = step === current;
        const left = (steps > 1 ? ((step - 1) / (steps - 1)) * 100 : 50) + '%';
        return (
          <View key={step} style={[styles.slot, { left: left as `${number}%` }]}>
            {isCurrent ? <View style={[styles.halo, { backgroundColor: colors.light }]} /> : null}
            <View
              testID="stepper-dot"
              style={[
                styles.dot,
                {
                  backgroundColor: done ? colors.primary : colors.card,
                  borderColor: done ? colors.primary : colors.gradSoftStart,
                  // Past steps vanish into the filled track; only the current one stays visible.
                  opacity: done && !isCurrent ? 0 : 1,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: WIDTH,
    height: DOT,
    alignSelf: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 7,
    height: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  slot: {
    position: 'absolute',
    top: 0,
    width: DOT,
    height: DOT,
    marginLeft: -DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
  },
});
