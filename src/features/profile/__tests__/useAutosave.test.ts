import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useAutosave } from '../useAutosave';

type Patch = { name?: string; bio?: string | null };

function setup(
  save: jest.Mock,
  options: { delay?: number; onSettled?: jest.Mock; timeout?: number; retryDelay?: number } = {}
) {
  return renderHook(() => useAutosave<Patch>({ save, delay: 800, ...options }));
}

// Lets pending promises (the save in flight) resolve while fake timers are on.
const flushPromises = () => act(async () => {});

describe('useAutosave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('arranca en idle y no guarda nada por sí solo', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => jest.advanceTimersByTime(5000));

    expect(result.current.status).toBe('idle');
    expect(save).not.toHaveBeenCalled();
  });

  it('espera el debounce y guarda una sola vez con el último valor', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => result.current.queue({ name: 'A' }));
    await act(async () => jest.advanceTimersByTime(500));
    await act(async () => result.current.queue({ name: 'An' }));
    await act(async () => jest.advanceTimersByTime(500));
    expect(save).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(300));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ name: 'An' });
  });

  it('junta campos distintos en un solo guardado', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => {
      result.current.queue({ name: 'Ana' });
      result.current.queue({ bio: 'Hola' });
    });
    await act(async () => jest.advanceTimersByTime(800));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ name: 'Ana', bio: 'Hola' });
  });

  it('pasa por saving y termina en saved; después vuelve a idle', async () => {
    let resolve!: () => void;
    const save = jest.fn().mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { result } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }));
    await act(async () => jest.advanceTimersByTime(800));
    expect(result.current.status).toBe('saving');

    await act(async () => resolve());
    expect(result.current.status).toBe('saved');

    await act(async () => jest.advanceTimersByTime(2500));
    expect(result.current.status).toBe('idle');
  });

  it('flush guarda al instante, sin esperar el debounce', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }));
    await act(async () => {
      await result.current.flush();
    });

    expect(save).toHaveBeenCalledWith({ name: 'Ana' });
    // El timer del debounce ya no vuelve a guardar.
    await act(async () => jest.advanceTimersByTime(2000));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('queue con immediate guarda sin debounce (por ejemplo, al tocar un género)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }, { immediate: true }));

    expect(save).toHaveBeenCalledWith({ name: 'Ana' });
  });

  it('flush sin cambios pendientes no llama a save', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => {
      await result.current.flush();
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('serializa: no manda un guardado nuevo mientras otro sigue en vuelo', async () => {
    let resolveFirst!: () => void;
    const save = jest
      .fn()
      .mockReturnValueOnce(new Promise<void>((r) => (resolveFirst = r)))
      .mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }, { immediate: true }));
    await act(async () => result.current.queue({ bio: 'Hola' }, { immediate: true }));
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => resolveFirst());
    await flushPromises();

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ bio: 'Hola' });
  });

  it('si falla pasa a error y conserva los cambios para reintentar', async () => {
    const save = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }, { immediate: true }));
    expect(result.current.status).toBe('error');

    await act(async () => {
      await result.current.retry();
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ name: 'Ana' });
    expect(result.current.status).toBe('saved');
  });

  it('un cambio nuevo del mismo campo reemplaza al que había fallado', async () => {
    const save = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }, { immediate: true }));
    await act(async () => result.current.queue({ name: 'Anita' }, { immediate: true }));

    expect(save).toHaveBeenLastCalledWith({ name: 'Anita' });
  });

  it('llama a onSettled cuando la cola queda vacía después de guardar', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const onSettled = jest.fn();
    const { result } = await setup(save, { onSettled });

    await act(async () => result.current.queue({ name: 'Ana' }, { immediate: true }));

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('al desmontar guarda lo que quedaba pendiente', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result, unmount } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }));
    await unmount();

    expect(save).toHaveBeenCalledWith({ name: 'Ana' });
  });

  it('al desmontar no deja timers colgados después de guardar', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const { result, unmount } = await setup(save);

    await act(async () => result.current.queue({ name: 'Ana' }));
    await unmount();
    await flushPromises();

    expect(save).toHaveBeenCalled();
    // The timer that hides "Guardado" is only for a screen that is still open.
    expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it('discard saca un campo pendiente para que no se guarde un valor viejo', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => {
      result.current.queue({ name: 'Ana', bio: 'Hola' });
      result.current.discard('name');
    });
    await act(async () => jest.advanceTimersByTime(800));

    expect(save).toHaveBeenCalledWith({ bio: 'Hola' });
  });

  it('si discard deja la cola vacía no guarda nada', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => {
      result.current.queue({ name: 'Ana' });
      result.current.discard('name');
    });
    await act(async () => jest.advanceTimersByTime(800));

    expect(save).not.toHaveBeenCalled();
  });

  describe('cuando algo sale mal', () => {
    it('un guardado colgado (sin respuesta) corta por timeout y pasa a error, sin trabar los siguientes', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const save = jest
        .fn()
        .mockReturnValueOnce(new Promise<void>(() => {}))
        .mockResolvedValue(undefined);
      const { result } = await setup(save, { timeout: 10000, retryDelay: 60000 });

      await act(async () => result.current.queue({ name: 'Ana' }, { immediate: true }));
      expect(result.current.status).toBe('saving');

      await act(async () => jest.advanceTimersByTime(10000));
      expect(result.current.status).toBe('error');

      await act(async () => {
        await result.current.retry();
      });
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith({ name: 'Ana' });
      expect(result.current.status).toBe('saved');
    });

    it('reintenta solo, sin que el usuario toque nada', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const save = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
      const { result } = await setup(save, { retryDelay: 5000 });

      await act(async () => result.current.queue({ bio: 'Hola' }, { immediate: true }));
      expect(result.current.status).toBe('error');

      await act(async () => jest.advanceTimersByTime(5000));

      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith({ bio: 'Hola' });
      expect(result.current.status).toBe('saved');
    });

    it('deja de reintentar solo después de 3 intentos y queda en error para el reintento manual', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const save = jest.fn().mockRejectedValue(new Error('boom'));
      const { result } = await setup(save, { retryDelay: 5000 });

      await act(async () => result.current.queue({ bio: 'Hola' }, { immediate: true }));
      for (let i = 0; i < 6; i++) {
        await act(async () => jest.advanceTimersByTime(5000));
      }

      expect(save).toHaveBeenCalledTimes(4); // el original + 3 reintentos
      expect(result.current.status).toBe('error');

      // Al cerrar la pantalla se intenta una vez más; que esta vez salga bien.
      save.mockResolvedValue(undefined);
    });

    it('un cambio nuevo cancela el reintento automático y manda todo junto', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const save = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
      const { result } = await setup(save, { retryDelay: 5000 });

      await act(async () => result.current.queue({ name: 'Ana' }, { immediate: true }));
      await act(async () => result.current.queue({ bio: 'Hola' }, { immediate: true }));
      await act(async () => jest.advanceTimersByTime(20000));

      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith({ name: 'Ana', bio: 'Hola' });
    });
  });

  it('al pasar la app a segundo plano guarda lo pendiente, sin esperar la pausa', async () => {
    let listener: (state: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, handler: (s: string) => void) => {
      listener = handler;
      return { remove: jest.fn() };
    }) as never);
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await setup(save);

    await act(async () => result.current.queue({ bio: 'Hola' }));
    await act(async () => listener('background'));

    expect(save).toHaveBeenCalledWith({ bio: 'Hola' });
  });
});
