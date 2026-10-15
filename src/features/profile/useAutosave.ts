import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Options<Patch> = {
  // Sends one merged patch. Must throw if the save failed.
  save: (patch: Patch) => Promise<void>;
  // Quiet time after the last change before saving (typing).
  delay?: number;
  // Called after a save, once nothing else is waiting to be saved.
  onSettled?: () => void;
};

const SAVED_VISIBLE_MS = 2000;

// Autosave for a form: changes are merged into one patch and sent after a pause (or right away),
// one request at a time, so answers can't arrive out of order and the latest value of a field wins.
// A failed patch is kept: it is retried by `retry` or sent again together with the next change.
export function useAutosave<Patch extends Record<string, unknown>>({
  save,
  delay = 800,
  onSettled,
}: Options<Patch>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  const pending = useRef<Partial<Patch>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Sends what is pending, then whatever arrived while it was in flight.
  const drain = useCallback((): Promise<void> => {
    if (inFlight.current) {
      return inFlight.current;
    }
    const run = async () => {
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
        savedTimer.current = null;
      }
      try {
        while (Object.keys(pending.current).length > 0) {
          const patch = pending.current;
          pending.current = {};
          show('saving');
          try {
            await saveRef.current(patch as Patch);
          } catch (error) {
            console.error('Autosave error:', error);
            // Keep the failed values, unless the user already changed them again.
            pending.current = { ...patch, ...pending.current };
            show('error');
            return;
          }
        }
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
    inFlight.current = run();
    return inFlight.current;
  }, [show]);

  const flush = useCallback(async () => {
    clearTimer();
    await drain();
  }, [drain]);

  const queue = useCallback(
    (patch: Partial<Patch>, { immediate = false }: { immediate?: boolean } = {}) => {
      pending.current = { ...pending.current, ...patch };
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

  const retry = flush;

  useEffect(() => {
    mounted.current = true;
    return () => {
      // Leaving the screen must not lose what was typed in the last moments.
      mounted.current = false;
      clearTimer();
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
      }
      void drain();
    };
  }, [drain]);

  return { status, queue, discard, flush, retry };
}
