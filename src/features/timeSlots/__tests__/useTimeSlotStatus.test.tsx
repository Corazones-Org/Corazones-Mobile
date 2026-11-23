import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

const mockFetch = jest.fn();

jest.mock('../api', () => ({
  fetchTimeSlotStatus: (...args: unknown[]) => mockFetch(...args),
}));

import { NOW, SLOT_21_START, makeNextSlot, makeStatus } from '../testFixtures';
import { useTimeSlotStatus } from '../useTimeSlotStatus';

const flush = () => act(async () => {});

async function setup(now = NOW) {
  const sync = jest.fn();
  const hook = await renderHook(({ clockNow }: { clockNow: number }) => useTimeSlotStatus({ now: clockNow, sync }), {
    initialProps: { clockNow: now },
  });
  return { sync, ...hook };
}

describe('useTimeSlotStatus', () => {
  let appStateListener: (state: string) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, handler: (s: string) => void) => {
      appStateListener = handler;
      return { remove: jest.fn() };
    }) as never);
    mockFetch.mockResolvedValue(makeStatus());
  });

  afterEach(() => jest.restoreAllMocks());

  it('carga al montar y sincroniza el reloj con la hora del servidor', async () => {
    let resolveFetch: (status: ReturnType<typeof makeStatus>) => void = () => {};
    mockFetch.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    const { result, sync } = await setup();

    expect(result.current.state.status).toBe('loading');
    await act(async () => resolveFetch(makeStatus()));

    expect(result.current.state).toEqual({ status: 'ready', data: makeStatus() });
    expect(sync).toHaveBeenCalledWith(NOW, expect.any(Number), expect.any(Number));
  });

  it('si falla muestra error, y reload lo vuelve a intentar', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    const { result } = await setup();
    await flush();
    expect(result.current.state.status).toBe('error');

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.state.status).toBe('ready');
  });

  it('un error al refrescar no tira abajo lo que ya se mostraba', async () => {
    const { result } = await setup();
    await flush();
    mockFetch.mockRejectedValueOnce(new Error('offline'));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.state.status).toBe('ready');
  });

  it('al volver de segundo plano pide el estado de nuevo', async () => {
    await setup();
    await flush();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => appStateListener('active'));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('al pasar la hora de inicio del turno lo vuelve a pedir, sin reiniciar la app', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { rerender } = await setup();
    await flush();
    await act(async () => jest.advanceTimersByTime(5000));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockResolvedValue(
      makeStatus({
        serverNow: SLOT_21_START,
        nextSlot: makeNextSlot({ startsAt: SLOT_21_START + 3_600_000, localTime: '22:00' }),
      })
    );

    await rerender({ clockNow: SLOT_21_START + 1000 });
    await flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('si el servidor todavía devuelve el mismo turno no entra en un bucle de pedidos', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { rerender } = await setup();
    await flush();
    await act(async () => jest.advanceTimersByTime(5000));

    await rerender({ clockNow: SLOT_21_START + 1000 });
    await flush();
    await rerender({ clockNow: SLOT_21_START + 2000 });
    await flush();
    await rerender({ clockNow: SLOT_21_START + 3000 });
    await flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('applyStatus reemplaza el estado (por ejemplo, con la respuesta de anotarse)', async () => {
    const { result, sync } = await setup();
    await flush();
    const registered = makeStatus({ nextSlot: makeNextSlot({ quotaUsed: true }) });

    await act(async () => result.current.applyStatus(registered, NOW - 200));

    expect(result.current.state).toEqual({ status: 'ready', data: registered });
    expect(sync).toHaveBeenLastCalledWith(NOW, NOW - 200, expect.any(Number));
  });
});
