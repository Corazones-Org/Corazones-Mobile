import { createContext, useContext, type ReactNode } from 'react';

import { opacity, radius, size, spacing, themes, typography, type ThemeName } from './tokens';

export type Theme = {
  name: ThemeName;
  colors: (typeof themes)[ThemeName]['colors'];
  shadow: (typeof themes)[ThemeName]['shadow'];
  spacing: typeof spacing;
  radius: typeof radius;
  size: typeof size;
  opacity: typeof opacity;
  typography: typeof typography;
};

function buildTheme(name: ThemeName): Theme {
  return { name, ...themes[name], spacing, radius, size, opacity, typography };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');

// Light is the shipped theme; without a provider (tests, isolated components) it is the default.
const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({
  scheme = 'light',
  children,
}: {
  scheme?: ThemeName;
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={scheme === 'dark' ? darkTheme : lightTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
