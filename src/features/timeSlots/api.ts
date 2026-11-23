import { supabase } from '@/lib/supabase';

import type { NextTimeSlot, TimeSlotRegistration, TimeSlotStatus } from './types';

// The RPCs return jsonb with snake_case keys and ISO timestamps.
type RawRegistration = {
  id: string;
  time_slot_id: string;
  starts_at: string;
  ends_at: string;
  local_time: string;
};

type RawNextSlot = {
  time_slot_id: string;
  starts_at: string;
  ends_at: string;
  local_time: string;
  registrable_from: string;
  quota_used: boolean;
  quota_resets_at: string;
};

type RawStatus = {
  server_now: string;
  zone: { code: string; timezone: string };
  next_slot: RawNextSlot | null;
  registrations: RawRegistration[];
};

const toMs = (iso: string) => Date.parse(iso);

function toRegistration(raw: RawRegistration): TimeSlotRegistration {
  return {
    id: raw.id,
    timeSlotId: raw.time_slot_id,
    startsAt: toMs(raw.starts_at),
    endsAt: toMs(raw.ends_at),
    localTime: raw.local_time,
  };
}

function toNextSlot(raw: RawNextSlot): NextTimeSlot {
  return {
    timeSlotId: raw.time_slot_id,
    startsAt: toMs(raw.starts_at),
    endsAt: toMs(raw.ends_at),
    localTime: raw.local_time,
    registrableFrom: toMs(raw.registrable_from),
    quotaUsed: raw.quota_used,
    quotaResetsAt: toMs(raw.quota_resets_at),
  };
}

function toStatus(raw: RawStatus): TimeSlotStatus {
  return {
    serverNow: toMs(raw.server_now),
    zoneCode: raw.zone.code,
    timezone: raw.zone.timezone,
    nextSlot: raw.next_slot ? toNextSlot(raw.next_slot) : null,
    registrations: raw.registrations.map(toRegistration),
  };
}

// The server's view of "now" and of the slot the person can sign up for next.
export async function fetchTimeSlotStatus(): Promise<TimeSlotStatus> {
  const { data, error } = await supabase.rpc('get_time_slot_status');
  if (error) {
    throw error;
  }
  return toStatus(data as RawStatus);
}

// The codes register_for_next_time_slot() raises (as the error message).
export type RegisterErrorCode =
  | 'profile_incomplete'
  | 'disclaimer_required'
  | 'out_of_zone'
  | 'slot_inactive'
  | 'already_used_today'
  | 'invalid_location'
  | 'unknown';

const KNOWN_CODES: RegisterErrorCode[] = [
  'profile_incomplete',
  'disclaimer_required',
  'out_of_zone',
  'slot_inactive',
  'already_used_today',
  'invalid_location',
];

export class TimeSlotError extends Error {
  readonly code: RegisterErrorCode;

  constructor(code: RegisterErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'TimeSlotError';
    this.code = code;
  }
}

// Signs up for the next slot. The app never says which one: the server picks it. The position is
// only used to check the city; the server does not store it.
export async function registerForNextTimeSlot({
  latitude,
  longitude,
  disclaimerAccepted,
}: {
  latitude: number;
  longitude: number;
  disclaimerAccepted: boolean;
}): Promise<TimeSlotStatus> {
  const { data, error } = await supabase.rpc('register_for_next_time_slot', {
    p_lat: latitude,
    p_lng: longitude,
    p_disclaimer: disclaimerAccepted,
  });
  if (error) {
    const code = KNOWN_CODES.find((known) => known === error.message) ?? 'unknown';
    throw new TimeSlotError(code, error.message);
  }
  return toStatus(data as RawStatus);
}

const ERROR_KEYS: Record<RegisterErrorCode, string> = {
  profile_incomplete: 'timeSlots.errors.profileIncomplete',
  disclaimer_required: 'timeSlots.errors.disclaimerRequired',
  out_of_zone: 'timeSlots.errors.outOfZone',
  slot_inactive: 'timeSlots.errors.slotInactive',
  already_used_today: 'timeSlots.errors.alreadyUsedToday',
  invalid_location: 'timeSlots.errors.unknown',
  unknown: 'timeSlots.errors.unknown',
};

export function registerErrorMessageKey(code: RegisterErrorCode): string {
  return ERROR_KEYS[code];
}
