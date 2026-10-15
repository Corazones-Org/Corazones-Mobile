import { render } from '@testing-library/react-native';

import '@/i18n';

import { MainScreen } from '../MainScreen';

describe('MainScreen', () => {
  it('muestra el contenido provisorio de la pantalla principal', async () => {
    const { getByTestId, getByText } = await render(<MainScreen />);

    expect(getByTestId('main-screen')).toBeTruthy();
    expect(getByText('Pantalla principal')).toBeTruthy();
    expect(getByText('Próximamente: tu próximo turno.')).toBeTruthy();
  });
});
