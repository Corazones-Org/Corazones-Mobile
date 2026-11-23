import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Options<Patch> = {
  // Sends one merged patch. Must throw if the save failed.
  save: (patch: Patch) => Promise<void>;
  // Quiet time after the last change before saving (typing).
  delay?: number;
  // A save with no answer after this long counts as failed, so one stuck request can't block every
  // later save.
  timeout?: number;
  // After a failure the same changes are sent again by themselves, up to MAX_AUTO_RETRIES times,
  // this long apart.
  retryDelay?: number;
  // Called after a save, once nothing else is waiting to be saved.
  onSettled?: () => void;
};

const SAVED_VISIBLE_MS = 2000;
const MAX_AUTO_RETRIES = 3;

// Autosave for a form: changes are merged into one patch and sent after a pause (or right away),
// one request at a time, so answers can't arrive out of order and the latest value of a field wins.
// A failed or timed-out patch is kept and retried by itself a few times, by `retry`, or together
// with the next change. Pending changes are also sent when the app goes to the background.
export function useAutosave<Patch extends Record<string, unknown>>({
  save,
  delay = 800,
  timeout = 15000,
  retryDelay = 5000,
  onSettled,
}: Options<Patch>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  const pending = useRef<Partial<Patch>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  // The latest callbacks, so the functions below stay stable between renders.
  const saveRef = useRef(save);
  const onSettledRef = useRef(onSettled);
  saveRef.current = save;
  onSettledRef.current = onSettled;

  const show = useCallback((next: AutosaveStatus) => {
    if (mounted.current) {
      setStatus(next);
    }
  }, []);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const clearRetryTimer = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  };

  const sendWithTimeout = (patch: Patch) =>
    new Promise<void>((resolve, reject) => {
      const stuck = setTimeout(() => reject(new Error('Autosave timed out')), timeout);
      saveRef.current(patch).then(
        () => {
          clearTimeout(stuck);
          resolve();
        },
        (error) => {
          clearTimeout(stuck);
          reject(error);
        }
      );
    });

  // Sends what is pending, then whatever arrived while it was in flight.
  const drain = useCallback((): Promise<void> => {
    if (inFlight.current) {
      return inFlight.current;
    }
    // Nothing to send (for example, the tab lost focus with nothing typed): do not start a run.
    if (Object.keys(pending.current).length === 0) {
      return Promise.resolve();
    }
    const run = async () => {
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
        savedTimer.current = null;
      }
      clearRetryTimer();
      try {
        while (Object.keys(pending.current).length > 0) {
          const patch = pending.current;
          pending.current = {};
          show('saving');
          try {
            await sendWithTimeout(patch as Patch);
          } catch (error) {
            console.error('Autosave error:', error);
            // Keep the failed values, unless the user already changed them again.
            pending.current = { ...patch, ...pending.current };
            show('error');
            if (mounted.current && retries.current < MAX_AUTO_RETRIES) {
              retries.current += 1;
              retryTimer.current = setTimeout(() => {
                retryTimer.current = null;
                void drain();
              }, retryDelay);
            }
            return;
          }
        }
        retries.current = 0;
        // After leaving the screen there is nobody to show "saved" to.
        if (mounted.current) {
          show('saved');
          savedTimer.current = setTimeout(() => show('idle'), SAVED_VISIBLE_MS);
        }
        onSettledRef.current?.();
      } finally {
        inFlight.current = null;
      }
    };
    // `run` never gets here with nothing to send, so it always waits for the save before its
    // `finally` clears `inFlight`; this assignment is therefore always the first.
    inFlight.current = run();
    return inFlight.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, retryDelay, timeout]);

  const flush = useCallback(async () => {
    clearTimer();
    await drain();
  }, [drain]);

  const queue = useCallback(
    (patch: Partial<Patch>, { immediate = false }: { immediate?: boolean } = {}) => {
      pending.current = { ...pending.current, ...patch };
      // A new change starts over: it replaces any automatic retry that was waiting.
      clearRetryTimer();
      retries.current = 0;
      clearTimer();
      if (immediate) {
        void drain();
      } else {
        timer.current = setTimeout(() => {
          timer.current = null;
          void drain();
        }, delay);
      }
    },
    [delay, drain]
  );

  // Drops pending values of fields that just became invalid, so an older valid value can't be saved.
  const discard = useCallback((...keys: (keyof Patch)[]) => {
    const next = { ...pending.current };
    for (const key of keys) {
      delete next[key];
    }
    pending.current = next;
  }, []);

  // Manual retry (the "Reintentar" button): counts as a fresh start.
  const retry = useCallback(async () => {
    retries.current = 0;
    await flush();
  }, [flush]);

  // Closing or backgrounding the app within the pause would lose what was just typed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void flush();
      }
    });
    return () => subscription.remove();
  }, [flush]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      // Leaving the screen must not lose what was typed in the last moments.
      mounted.current = false;
      clearTimer();
      clearRetryTimer();
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
      }
      void drain();
    };
  }, [drain]);

  return { status, queue, discard, flush, retry };
}
