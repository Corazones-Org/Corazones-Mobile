import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { iconPaths, type IconName } from './paths';

export type IconProps = {
  name: IconName;
  size?: number;
  filled?: boolean;
  color?: string;
  strokeWidth?: number;
  // Screen-reader text. Without it the icon is decoration and is hidden from screen readers.
  label?: string;
};

export function Icon({ name, size = 24, filled, color, strokeWidth = 1.8, label }: IconProps) {
  const theme = useTheme();
  const tint = color ?? theme.colors.textPrimary;
  const paths: readonly string[] = iconPaths[name] ?? [];

  return (
    <Svg
      testID={`icon-${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tint}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
    >
      {paths.map((d, index) => (
        <Path key={index} d={d} fill={index === 0 && filled ? tint : 'none'} />
      ))}
    </Svg>
  );
}
