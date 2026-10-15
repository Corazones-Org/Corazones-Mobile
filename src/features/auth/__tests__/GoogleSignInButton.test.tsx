import { fireEvent, render } from '@testing-library/react-native';

import '@/i18n';

import { GoogleSignInButton } from '../GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('muestra el logo de Google y el texto del botón', async () => {
    const { getByText, getByTestId } = await render(<GoogleSignInButton onPress={jest.fn()} />);

    expect(getByTestId('google-logo')).toBeTruthy();
    expect(getByText('Continuar con Google')).toBeTruthy();
  });

  it('es un botón accesible', async () => {
    const { getByRole } = await render(<GoogleSignInButton onPress={jest.fn()} />);

    expect(getByRole('button', { name: 'Continuar con Google' })).toBeTruthy();
  });

  it('llama a onPress al tocarlo', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<GoogleSignInButton onPress={onPress} />);

    await fireEvent.press(getByText('Continuar con Google'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
