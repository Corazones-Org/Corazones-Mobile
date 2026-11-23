import type { NextTimeSlot, TimeSlotRegistration, TimeSlotStatus } from './types';

// Shared by the time slot tests. 2026-10-16 20:37 in Argentina (UTC-3).
export const NOW = Date.parse('2026-10-16T23:37:00Z');
export const HOUR = 3_600_000;
export const SLOT_21_START = Date.parse('2026-10-17T00:00:00Z');

export function makeNextSlot(overrides: Partial<NextTimeSlot> = {}): NextTimeSlot {
  return {
    timeSlotId: 'slot-21',
    startsAt: SLOT_21_START,
    endsAt: SLOT_21_START + 2 * HOUR,
    localTime: '21:00',
    registrableFrom: SLOT_21_START - HOUR,
    quotaUsed: false,
    quotaResetsAt: Date.parse('2026-10-17T03:00:00Z'),
    ...overrides,
  };
}

export function makeRegistration(overrides: Partial<TimeSlotRegistration> = {}): TimeSlotRegistration {
  return {
    id: 'reg-1',
    timeSlotId: 'slot-21',
    startsAt: SLOT_21_START,
    endsAt: SLOT_21_START + 2 * HOUR,
    localTime: '21:00',
    ...overrides,
  };
}

export function makeStatus(overrides: Partial<TimeSlotStatus> = {}): TimeSlotStatus {
  return {
    serverNow: NOW,
    zoneCode: 'buenos_aires',
    timezone: 'America/Argentina/Buenos_Aires',
    nextSlot: makeNextSlot(),
    registrations: [],
    ...overrides,
  };
}
