import { fireEvent, render } from '@testing-library/react-native';

import '@/i18n';

import { SaveStatus } from '../SaveStatus';

describe('SaveStatus', () => {
  it('en idle no muestra nada', async () => {
    const { queryByText, toJSON } = await render(<SaveStatus status="idle" />);

    expect(queryByText(/Guard|guardar/)).toBeNull();
    expect(toJSON()).toBeNull();
  });

  it('muestra "Guardando…" y "Guardado"', async () => {
    const { getByText, rerender } = await render(<SaveStatus status="saving" />);
    expect(getByText('Guardando…')).toBeTruthy();

    await rerender(<SaveStatus status="saved" />);
    expect(getByText('Guardado')).toBeTruthy();
  });

  it('el estado de error es un botón que reintenta', async () => {
    const onRetry = jest.fn();
    const { getByRole } = await render(<SaveStatus status="error" onRetry={onRetry} />);

    await fireEvent.press(getByRole('button', { name: /No se pudo guardar/ }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
