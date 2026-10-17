import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { formatCountdown } from './format';

export type ServerClock = {
  // The server's "now" in epoch ms. Changes every second, so whoever reads it re-renders.
  now: number;
  // Tells the clock what the server said "now" was. `sentAt` and `receivedAt` are the device times
  // around the request: the server stamped its answer about halfway between them.
  sync: (serverNow: number, sentAt: number, receivedAt: number) => void;
};

// The app never trusts the device clock for turns (the user can change it, or it can be off). It
// asks the server once and keeps the difference. The device clock is only used to measure time
// passing since then.
export function useServerClock(): ServerClock {
  const offset = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  const tick = useCallback(() => setNow(Date.now() + offset.current), []);

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    // Timers do not run in the background: catch up as soon as the app is back.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tick();
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [tick]);

  const sync = useCallback(
    (serverNow: number, sentAt: number, receivedAt: number) => {
      offset.current = serverNow - (sentAt + receivedAt) / 2;
      tick();
    },
    [tick]
  );

  return useMemo(() => ({ now, sync }), [now, sync]);
}

// Time left until an absolute moment (never a counter that is decremented, so it cannot drift).
export function useCountdown(targetMs: number, clock: Pick<ServerClock, 'now'>) {
  const remainingMs = Math.max(0, targetMs - clock.now);
  return { remainingMs, text: formatCountdown(remainingMs), done: remainingMs === 0 };
}
