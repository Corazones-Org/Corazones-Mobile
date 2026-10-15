import { fireEvent, render } from '@testing-library/react-native';

import { Toast } from '../Toast';

describe('Toast', () => {
  it('muestra el título y el mensaje', async () => {
    const { getByText } = await render(
      <Toast tone="error" title="No pudimos cargar tu perfil">
        Volvé a iniciar sesión.
      </Toast>
    );

    expect(getByText('No pudimos cargar tu perfil')).toBeTruthy();
    expect(getByText('Volvé a iniciar sesión.')).toBeTruthy();
  });

  it('cada tono tiene su ícono', async () => {
    const icons = {
      info: 'icon-info',
      success: 'icon-checkCircle',
      warning: 'icon-alertCircle',
      error: 'icon-alertCircle',
      match: 'icon-heart',
    } as const;

    for (const [tone, testID] of Object.entries(icons)) {
      const { getByTestId, unmount } = await render(
        <Toast tone={tone as keyof typeof icons} title="x" />
      );
      expect(getByTestId(testID, { hidden: true })).toBeTruthy();
      await unmount();
    }
  });

  it('permite otro ícono', async () => {
    const { getByTestId } = await render(<Toast title="x" icon="lock" />);

    expect(getByTestId('icon-lock', { hidden: true })).toBeTruthy();
  });

  it('un error se anuncia como alerta y el resto como estado', async () => {
    const { getByRole, rerender } = await render(<Toast tone="error" title="x" />);
    expect(getByRole('alert')).toBeTruthy();

    await rerender(<Toast tone="info" title="x" />);
    expect(getByRole('status')).toBeTruthy();
  });

  it('muestra una acción y la ejecuta', async () => {
    const onAction = jest.fn();
    const { getByRole } = await render(<Toast title="x" action="Reintentar" onAction={onAction} />);

    await fireEvent.press(getByRole('button', { name: 'Reintentar' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
