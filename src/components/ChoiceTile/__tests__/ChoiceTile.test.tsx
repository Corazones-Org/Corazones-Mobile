import { fireEvent, render } from '@testing-library/react-native';

import { themes } from '@/theme/tokens';
import { ChoiceTile } from '../ChoiceTile';

describe('ChoiceTile', () => {
  it('muestra el ícono y la etiqueta', async () => {
    const { getByText, getByTestId } = await render(
      <ChoiceTile icon="venus" label="Mujer" onPress={jest.fn()} />
    );

    expect(getByText('Mujer')).toBeTruthy();
    expect(getByTestId('icon-venus', { hidden: true })).toBeTruthy();
  });

  it('es una opción exclusiva y anuncia si está elegida', async () => {
    const { getByRole, rerender } = await render(
      <ChoiceTile icon="venus" label="Mujer" selected onPress={jest.fn()} />
    );
    expect(getByRole('radio', { name: 'Mujer', checked: true })).toBeTruthy();

    await rerender(<ChoiceTile icon="venus" label="Mujer" onPress={jest.fn()} />);
    expect(getByRole('radio', { name: 'Mujer', checked: false })).toBeTruthy();
  });

  it('llama a onPress al tocarla', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<ChoiceTile icon="mars" label="Hombre" onPress={onPress} />);

    await fireEvent.press(getByText('Hombre'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('elegida se rellena con el color primario; sin elegir es una tarjeta con borde', async () => {
    const { getByRole, rerender } = await render(
      <ChoiceTile icon="mars" label="Hombre" selected onPress={jest.fn()} />
    );
    expect(getByRole('radio')).toHaveStyle({ backgroundColor: themes.light.colors.primary });

    await rerender(<ChoiceTile icon="mars" label="Hombre" onPress={jest.fn()} />);
    expect(getByRole('radio')).toHaveStyle({
      backgroundColor: themes.light.colors.card,
      borderColor: themes.light.colors.border,
    });
  });

  it('el ícono sin elegir toma el tono pedido', async () => {
    const { getByTestId } = await render(
      <ChoiceTile icon="heart" label="Mujeres" iconTone="soft" onPress={jest.fn()} />
    );

    expect(getByTestId('icon-heart', { hidden: true }).props.stroke).toBe(
      themes.light.colors.gradSoftStart
    );
  });
});
