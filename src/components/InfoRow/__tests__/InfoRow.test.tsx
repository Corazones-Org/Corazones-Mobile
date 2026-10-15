import { fireEvent, render } from '@testing-library/react-native';

import '@/i18n';

import { InfoRow } from '../InfoRow';

describe('InfoRow', () => {
  it('muestra la etiqueta y el valor', async () => {
    const { getByText } = await render(<InfoRow icon="user" label="Nombre" value="Sofía" />);

    expect(getByText('Nombre')).toBeTruthy();
    expect(getByText('Sofía')).toBeTruthy();
  });

  it('con onPress es un botón con chevron', async () => {
    const onPress = jest.fn();
    const { getByRole, getByTestId } = await render(
      <InfoRow label="Intereses" value="Viajes" onPress={onPress} />
    );

    await fireEvent.press(getByRole('button', { name: /Intereses/ }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getByTestId('icon-chevronRight', { hidden: true })).toBeTruthy();
  });

  describe('editable', () => {
    it('muestra un campo con el valor y la etiqueta como nombre', async () => {
      const { getByLabelText } = await render(
        <InfoRow label="Nombre" value="Sofía" onChangeText={jest.fn()} />
      );

      expect(getByLabelText('Nombre').props.value).toBe('Sofía');
    });

    it('avisa cada cambio de texto y el blur', async () => {
      const onChangeText = jest.fn();
      const onBlur = jest.fn();
      const { getByLabelText } = await render(
        <InfoRow label="Nombre" value="" onChangeText={onChangeText} onBlur={onBlur} />
      );

      await fireEvent.changeText(getByLabelText('Nombre'), 'Ana');
      await fireEvent(getByLabelText('Nombre'), 'blur');

      expect(onChangeText).toHaveBeenCalledWith('Ana');
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('muestra el placeholder y el teclado pedidos', async () => {
      const { getByLabelText } = await render(
        <InfoRow
          label="Edad"
          value=""
          placeholder="Tu edad"
          keyboardType="number-pad"
          onChangeText={jest.fn()}
        />
      );

      expect(getByLabelText('Edad').props.placeholder).toBe('Tu edad');
      expect(getByLabelText('Edad').props.keyboardType).toBe('number-pad');
    });

    it('muestra el prefijo (por ejemplo @ en Instagram)', async () => {
      const { getByText } = await render(
        <InfoRow label="Instagram" value="ana" prefix="@" onChangeText={jest.fn()} />
      );

      expect(getByText('@')).toBeTruthy();
    });

    it('muestra el mensaje de error', async () => {
      const { getByText } = await render(
        <InfoRow label="Edad" value="17" error="Ingresá una edad entre 18 y 99." onChangeText={jest.fn()} />
      );

      expect(getByText('Ingresá una edad entre 18 y 99.')).toBeTruthy();
    });

    it('en modo multilínea con límite muestra el contador', async () => {
      const { getByText, getByLabelText } = await render(
        <InfoRow label="Sobre mí" value="Hola" multiline maxLength={500} onChangeText={jest.fn()} />
      );

      expect(getByText('4/500')).toBeTruthy();
      expect(getByLabelText('Sobre mí').props.maxLength).toBe(500);
      expect(getByLabelText('Sobre mí').props.multiline).toBe(true);
    });
  });
});
