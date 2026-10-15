import { render } from '@testing-library/react-native';

import '@/i18n';

import { Stepper } from '../Stepper';

describe('Stepper', () => {
  it('es una barra de progreso accesible con el paso actual', async () => {
    const { getByRole } = await render(<Stepper steps={3} current={2} />);

    const bar = getByRole('progressbar');
    expect(bar.props.accessibilityLabel).toBe('Paso 2 de 3');
    expect(bar.props.accessibilityValue).toMatchObject({ min: 1, max: 3, now: 2 });
  });

  it('por defecto tiene 2 pasos y arranca en el primero', async () => {
    const { getByRole } = await render(<Stepper />);

    expect(getByRole('progressbar').props.accessibilityLabel).toBe('Paso 1 de 2');
  });

  it('dibuja un punto por paso', async () => {
    const { getAllByTestId } = await render(<Stepper steps={4} current={1} />);

    expect(getAllByTestId('stepper-dot')).toHaveLength(4);
  });

  it('rellena el tramo hasta el paso actual', async () => {
    const { getByTestId, rerender } = await render(<Stepper steps={3} current={1} />);
    expect(getByTestId('stepper-fill')).toHaveStyle({ width: '0%' });

    await rerender(<Stepper steps={3} current={2} />);
    expect(getByTestId('stepper-fill')).toHaveStyle({ width: '50%' });

    await rerender(<Stepper steps={3} current={3} />);
    expect(getByTestId('stepper-fill')).toHaveStyle({ width: '100%' });
  });
});
