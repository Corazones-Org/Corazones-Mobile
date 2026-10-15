import { fireEvent, render } from '@testing-library/react-native';

import { Chip } from '../Chip';

describe('Chip', () => {
  it('muestra la etiqueta y su estado', async () => {
    const { getByRole, rerender } = await render(<Chip>Viajes</Chip>);
    expect(getByRole('checkbox', { name: 'Viajes' }).props.accessibilityState).toMatchObject({
      checked: false,
    });

    await rerender(<Chip selected>Viajes</Chip>);
    expect(getByRole('checkbox', { name: 'Viajes' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('avisa con onPress', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Chip onPress={onPress}>Viajes</Chip>);

    await fireEvent.press(getByRole('checkbox', { name: 'Viajes' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no avisa y se anuncia como deshabilitado', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <Chip disabled onPress={onPress}>
        Viajes
      </Chip>
    );

    await fireEvent.press(getByRole('checkbox', { name: 'Viajes' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(getByRole('checkbox', { name: 'Viajes' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('muestra el ícono pedido', async () => {
    const { getByTestId } = await render(
      <Chip variant="tile" icon="plane">
        Viajes
      </Chip>
    );

    expect(getByTestId('icon-plane', { hidden: true })).toBeTruthy();
  });

  it('la variante pill seleccionada muestra un check cuando no tiene ícono', async () => {
    const { getByTestId } = await render(<Chip selected>Viajes</Chip>);

    expect(getByTestId('icon-check', { hidden: true })).toBeTruthy();
  });
});
