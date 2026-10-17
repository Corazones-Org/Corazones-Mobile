import type { TimeSlotStatus } from './types';

// What the Main screen card shows, worked out from the server's status and the server's "now".
// Pure on purpose: the card re-runs it every second, so it moves on by itself when a slot starts.
export type MainState =
  // The next slot and the time left to it. `canRegister` is false while the hours in between are
  // switched off.
  | { kind: 'free'; localTime: string; startsAt: number; canRegister: boolean }
  // Signed up, the slot has not started.
  | { kind: 'waiting'; localTime: string; startsAt: number }
  // The day's quota is spent: counts down to when it renews.
  | { kind: 'used'; resetsAt: number }
  // No slot is enabled.
  | { kind: 'noSlots' }
  // The slot we were counting down to has started: the status has to be asked again.
  | { kind: 'refreshing' };

export type CardState = {
  main: MainState;
  // A slot the person signed up for that is running now. It never blocks signing up for the next
  // one: only the day's quota does.
  inProgress: { localTime: string; endsAt: number } | null;
};

export function deriveCardState(status: TimeSlotStatus, now: number): CardState {
  const running = status.registrations.find((r) => r.startsAt <= now && now < r.endsAt);
  const upcoming = status.registrations.find((r) => r.startsAt > now);
  const { nextSlot } = status;

  let main: MainState;
  if (upcoming) {
    main = { kind: 'waiting', localTime: upcoming.localTime, startsAt: upcoming.startsAt };
  } else if (!nextSlot) {
    main = { kind: 'noSlots' };
  } else if (now >= nextSlot.startsAt) {
    main = { kind: 'refreshing' };
  } else if (nextSlot.quotaUsed) {
    main = { kind: 'used', resetsAt: nextSlot.quotaResetsAt };
  } else {
    main = {
      kind: 'free',
      localTime: nextSlot.localTime,
      startsAt: nextSlot.startsAt,
      canRegister: now >= nextSlot.registrableFrom,
    };
  }

  return {
    main,
    inProgress: running ? { localTime: running.localTime, endsAt: running.endsAt } : null,
  };
}
