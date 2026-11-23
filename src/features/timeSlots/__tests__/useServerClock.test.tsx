import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useCountdown, useServerClock } from '../useServerClock';

const HOUR = 3_600_000;

describe('useServerClock', () => {
  let appStateListener: (state: string) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-16T23:37:00Z'));
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, handler: (s: string) => void) => {
      appStateListener = handler;
      return { remove: jest.fn() };
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('antes de sincronizar usa el reloj del dispositivo', async () => {
    const { result } = await renderHook(() => useServerClock());

    expect(result.current.now).toBe(Date.now());
  });

  it('avanza una vez por segundo', async () => {
    const { result } = await renderHook(() => useServerClock());
    const start = result.current.now;

    await act(async () => jest.advanceTimersByTime(3000));

    expect(result.current.now).toBe(start + 3000);
  });

  it('con el celular desfasado, muestra la hora del servidor', async () => {
    const { result } = await renderHook(() => useServerClock());
    const serverNow = Date.now() + HOUR; // the phone is one hour behind

    await act(async () => result.current.sync(serverNow, Date.now(), Date.now()));

    expect(result.current.now).toBe(serverNow);

    await act(async () => jest.advanceTimersByTime(2000));

    expect(result.current.now).toBe(serverNow + 2000);
  });

  it('descuenta la mitad de la demora del pedido', async () => {
    const { result } = await renderHook(() => useServerClock());
    const sentAt = Date.now();
    jest.setSystemTime(sentAt + 800); // the answer took 800 ms
    const receivedAt = Date.now();

    await act(async () => result.current.sync(sentAt + 1000, sentAt, receivedAt));

    // The server stamped its answer about halfway: 400 ms after sending, so "now" is that + the rest.
    expect(result.current.now).toBe(sentAt + 1000 + 400);
  });

  it('al volver de segundo plano se pone al día enseguida, sin esperar el siguiente segundo', async () => {
    const { result } = await renderHook(() => useServerClock());
    const before = result.current.now;

    jest.setSystemTime(Date.now() + 10 * 60_000); // timers do not run in the background
    await act(async () => appStateListener('active'));

    expect(result.current.now).toBe(before + 10 * 60_000);
  });

  it('limpia el intervalo al desmontar', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = await renderHook(() => useServerClock());

    await unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

describe('useCountdown', () => {
  it('es lo que falta hasta el objetivo, contra la hora del servidor', async () => {
    const { result } = await renderHook(() => useCountdown(1_000_000 + 23 * 60_000, { now: 1_000_000 }));

    expect(result.current).toEqual({ remainingMs: 23 * 60_000, text: '00:23:00', done: false });
  });

  it('al llegar al objetivo queda en cero y avisa que terminó', async () => {
    const { result } = await renderHook(() => useCountdown(1_000_000, { now: 1_000_500 }));

    expect(result.current).toEqual({ remainingMs: 0, text: '00:00:00', done: true });
  });
});
