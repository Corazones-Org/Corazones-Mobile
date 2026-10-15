import { render } from '@testing-library/react-native';

import { TipCard } from '../TipCard';

describe('TipCard', () => {
  it('muestra el texto con el ícono de la lamparita por defecto', async () => {
    const { getByText, getByTestId } = await render(<TipCard>Usá fotos reales.</TipCard>);

    expect(getByText('Usá fotos reales.')).toBeTruthy();
    expect(getByTestId('icon-lightbulb', { hidden: true })).toBeTruthy();
  });

  it('permite otro ícono', async () => {
    const { getByTestId } = await render(<TipCard icon="lock">Privado</TipCard>);

    expect(getByTestId('icon-lock', { hidden: true })).toBeTruthy();
  });
});
