import { formatCountdown } from '../format';

describe('formatCountdown', () => {
  it('HH:MM:SS', () => {
    expect(formatCountdown(23 * 60_000 + 41_000)).toBe('00:23:41');
    expect(formatCountdown(9 * 3_600_000)).toBe('09:00:00');
    expect(formatCountdown(3_600_000 + 61_000)).toBe('01:01:01');
  });

  it('redondea hacia arriba: mientras falte algo no muestra 00:00:00', () => {
    expect(formatCountdown(100)).toBe('00:00:01');
    expect(formatCountdown(1000)).toBe('00:00:01');
    expect(formatCountdown(1001)).toBe('00:00:02');
  });

  it('nunca es negativa', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(-5000)).toBe('00:00:00');
  });

  it('más de 24 horas sigue contando en horas', () => {
    expect(formatCountdown(30 * 3_600_000)).toBe('30:00:00');
  });
});
