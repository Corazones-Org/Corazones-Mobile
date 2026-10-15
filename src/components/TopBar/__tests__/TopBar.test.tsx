import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import '@/i18n';

import { TopBar } from '../TopBar';

describe('TopBar', () => {
  it('muestra el título', async () => {
    const { getByText } = await render(<TopBar title="Editar perfil" />);

    expect(getByText('Editar perfil')).toBeTruthy();
  });

  it('muestra el botón de volver solo si hay a dónde volver, y lo ejecuta', async () => {
    const onBack = jest.fn();
    const { getByRole, rerender, queryByRole } = await render(<TopBar title="x" onBack={onBack} />);

    await fireEvent.press(getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<TopBar title="x" />);
    expect(queryByRole('button', { name: 'Volver' })).toBeNull();
  });

  it('permite ocultar el botón de volver con back={false}', async () => {
    const { queryByRole } = await render(<TopBar title="x" onBack={jest.fn()} back={false} />);

    expect(queryByRole('button', { name: 'Volver' })).toBeNull();
  });

  it('muestra la acción de texto de la derecha y la ejecuta', async () => {
    const onAction = jest.fn();
    const { getByRole } = await render(
      <TopBar title="x" action="Cerrar sesión" onAction={onAction} />
    );

    await fireEvent.press(getByRole('button', { name: 'Cerrar sesión' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('los children reemplazan al título (por ejemplo el Stepper del onboarding)', async () => {
    const { getByText, queryByText } = await render(
      <TopBar title="Título">
        <Text>stepper</Text>
      </TopBar>
    );

    expect(getByText('stepper')).toBeTruthy();
    expect(queryByText('Título')).toBeNull();
  });
});
