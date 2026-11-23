import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';

import { DisclaimerModal } from '../DisclaimerModal';

describe('DisclaimerModal', () => {
  it('cerrado no muestra nada', async () => {
    await render(<DisclaimerModal visible={false} loading={false} onAccept={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.queryByText('Más vale estar cambiado y bañado, listo para salir.')).toBeNull();
  });

  it('muestra el aviso con Aceptar y Cancelar', async () => {
    await render(<DisclaimerModal visible loading={false} onAccept={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText('Antes de anotarte')).toBeTruthy();
    expect(screen.getByText('Más vale estar cambiado y bañado, listo para salir.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('Aceptar avisa que el usuario aceptó', async () => {
    const onAccept = jest.fn();
    await render(<DisclaimerModal visible loading={false} onAccept={onAccept} onCancel={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Aceptar' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('Cancelar cierra sin aceptar', async () => {
    const onAccept = jest.fn();
    const onCancel = jest.fn();
    await render(<DisclaimerModal visible loading={false} onAccept={onAccept} onCancel={onCancel} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('mientras se anota, Aceptar muestra el spinner y no se puede tocar de nuevo', async () => {
    const onAccept = jest.fn();
    await render(<DisclaimerModal visible loading onAccept={onAccept} onCancel={jest.fn()} />);

    expect(screen.getByTestId('button-spinner')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Aceptar' }));

    expect(onAccept).not.toHaveBeenCalled();
  });
});
