import { fireEvent, render } from '@testing-library/react-native';

import { SectionHeader } from '../SectionHeader';

describe('SectionHeader', () => {
  it('muestra el título como encabezado y el subtítulo', async () => {
    const { getByRole, getByText } = await render(
      <SectionHeader title="Intereses" subtitle="Elegí hasta 10" />
    );

    expect(getByRole('header', { name: 'Intereses' })).toBeTruthy();
    expect(getByText('Elegí hasta 10')).toBeTruthy();
  });

  it('muestra la acción de la derecha y la ejecuta', async () => {
    const onAction = jest.fn();
    const { getByRole } = await render(
      <SectionHeader title="Fotos" action="Editar" onAction={onAction} />
    );

    await fireEvent.press(getByRole('button', { name: 'Editar' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
