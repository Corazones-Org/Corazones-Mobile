import { render, screen } from '@testing-library/react-native';

import '@/i18n';

import { HowItWorks } from '../HowItWorks';

describe('HowItWorks', () => {
  it('muestra el título y los cinco pasos numerados, en orden', async () => {
    await render(<HowItWorks />);

    expect(screen.getByText('¿Cómo funciona?')).toBeTruthy();
    const steps = [
      'Anotate al turno',
      'Conocé a los participantes',
      'Hacé Match',
      'Hablá durante 30 minutos con tu Match',
      'Si ambos aceptan, se conocen',
    ];
    steps.forEach((text, index) => {
      expect(screen.getByText(String(index + 1))).toBeTruthy();
      expect(screen.getByText(text)).toBeTruthy();
    });
  });
});
