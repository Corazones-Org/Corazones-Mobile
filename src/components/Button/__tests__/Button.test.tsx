import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('shows its label and is an accessible button', async () => {
    const { getByRole } = await render(<Button onPress={jest.fn()}>Continuar</Button>);

    expect(getByRole('button', { name: 'Continuar' })).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button onPress={onPress}>Continuar</Button>);

    await fireEvent.press(getByText('Continuar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    const { getByText, getByRole } = await render(
      <Button disabled onPress={onPress}>
        Continuar
      </Button>
    );

    await fireEvent.press(getByText('Continuar'));

    expect(onPress).not.toHaveBeenCalled();
    expect(getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('shows a spinner instead of the icons and ignores presses while loading', async () => {
    const onPress = jest.fn();
    const { getByText, getByTestId, queryByTestId, getByRole } = await render(
      <Button loading icon="plus" iconRight="arrowRight" onPress={onPress}>
        Guardar
      </Button>
    );

    await fireEvent.press(getByText('Guardar'));

    expect(onPress).not.toHaveBeenCalled();
    expect(getByTestId('button-spinner')).toBeTruthy();
    expect(queryByTestId('icon-plus', { hidden: true })).toBeNull();
    expect(queryByTestId('icon-arrowRight', { hidden: true })).toBeNull();
    expect(getByRole('button').props.accessibilityState).toMatchObject({ busy: true });
  });

  it('renders a named icon on the left and on the right', async () => {
    const { getByTestId } = await render(
      <Button icon="heart" iconRight="arrowRight" onPress={jest.fn()}>
        Continuar
      </Button>
    );

    expect(getByTestId('icon-heart', { hidden: true })).toBeTruthy();
    expect(getByTestId('icon-arrowRight', { hidden: true })).toBeTruthy();
  });

  it('accepts a custom node as the icon (for third-party marks like the Google "G")', async () => {
    const { getByText } = await render(
      <Button variant="google" icon={<Text>G-mark</Text>} onPress={jest.fn()}>
        Continuar con Google
      </Button>
    );

    expect(getByText('G-mark')).toBeTruthy();
  });

  it('supports the primary, google and link variants and the three sizes', async () => {
    for (const variant of ['primary', 'google', 'link'] as const) {
      for (const size of ['sm', 'md', 'lg'] as const) {
        const { getByText, unmount } = await render(
          <Button variant={variant} size={size} onPress={jest.fn()}>
            {`${variant}-${size}`}
          </Button>
        );
        expect(getByText(`${variant}-${size}`)).toBeTruthy();
        await unmount();
      }
    }
  });
});
