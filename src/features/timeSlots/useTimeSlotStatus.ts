import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchTimeSlotStatus } from './api';
import type { ServerClock } from './useServerClock';
import type { TimeSlotStatus } from './types';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: TimeSlotStatus };

// Two asks about the same slot closer than this are one: guards against a loop if the device and
// the server disagree by a few hundred ms about the moment a slot starts.
const MIN_REFETCH_GAP_MS = 1500;

// Loads the time slot status from the server and keeps it fresh: again when the app comes back to
// the foreground and when the slot being counted down to starts (a new "next slot" is due).
export function useTimeSlotStatus(clock: Pick<ServerClock, 'now' | 'sync'>) {
  const { now, sync } = clock;
  const [state, setState] = useState<State>({ status: 'loading' });
  const inFlight = useRef(false);
  const lastLoadAt = useRef(0);

  const applyStatus = useCallback(
    (data: TimeSlotStatus, sentAt: number = Date.now()) => {
      sync(data.serverNow, sentAt, Date.now());
      setState({ status: 'ready', data });
    },
    [sync]
  );

  const reload = useCallback(async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    const sentAt = Date.now();
    try {
      applyStatus(await fetchTimeSlotStatus(), sentAt);
    } catch (error) {
      console.error('Time slot status error:', error);
      // What is on screen stays; only a first load turns into an error.
      setState((current) => (current.status === 'ready' ? current : { status: 'error' }));
    } finally {
      inFlight.current = false;
      lastLoadAt.current = Date.now();
    }
  }, [applyStatus]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        reload();
      }
    });
    return () => subscription.remove();
  }, [reload]);

  const nextStartsAt = state.status === 'ready' ? state.data.nextSlot?.startsAt ?? null : null;
  useEffect(() => {
    if (nextStartsAt != null && now >= nextStartsAt && Date.now() - lastLoadAt.current > MIN_REFETCH_GAP_MS) {
      reload();
    }
  }, [now, nextStartsAt, reload]);

  return { state, reload, applyStatus };
}
