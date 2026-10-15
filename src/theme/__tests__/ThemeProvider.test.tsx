import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemeProvider, useTheme } from '../ThemeProvider';
import { themes } from '../tokens';

function Probe() {
  const theme = useTheme();
  return (
    <Text testID="probe">
      {theme.name}|{theme.colors.background}|{theme.spacing[4]}|{theme.radius.lg}
    </Text>
  );
}

describe('ThemeProvider', () => {
  it('uses the light theme when there is no provider', async () => {
    const { getByTestId } = await render(<Probe />);

    expect(getByTestId('probe').props.children.join('')).toBe(
      `light|${themes.light.colors.background}|16|16`
    );
  });

  it('serves the theme it is asked for', async () => {
    const { getByTestId } = await render(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>
    );

    expect(getByTestId('probe').props.children.join('')).toBe(
      `dark|${themes.dark.colors.background}|16|16`
    );
  });
});
