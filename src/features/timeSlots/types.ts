// What the app knows about time slots. Times are epoch milliseconds, all taken from the server's
// clock (see useServerClock); `localTime` is the slot's start as the zone shows it ("21:00"), so
// the app never converts time zones itself.

export type TimeSlotRegistration = {
  id: string;
  timeSlotId: string;
  startsAt: number;
  endsAt: number;
  localTime: string;
};

// The slot the person can sign up for next: always decided by the server.
export type NextTimeSlot = {
  timeSlotId: string;
  startsAt: number;
  endsAt: number;
  localTime: string;
  // From this moment the slot is the very next hour and can be signed up. Earlier than this, the
  // hours in between are switched off.
  registrableFrom: number;
  // The person already used the quota of the day this slot belongs to.
  quotaUsed: boolean;
  // When that day's quota renews (00:00 in the zone).
  quotaResetsAt: number;
};

export type TimeSlotStatus = {
  serverNow: number;
  zoneCode: string;
  timezone: string;
  // null when no slot is enabled at all.
  nextSlot: NextTimeSlot | null;
  // The person's registrations that have not ended: the one in progress and the upcoming ones.
  registrations: TimeSlotRegistration[];
};
