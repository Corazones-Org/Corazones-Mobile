const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import {
  TimeSlotError,
  fetchTimeSlotStatus,
  registerErrorMessageKey,
  registerForNextTimeSlot,
} from '../api';

const rawStatus = {
  server_now: '2026-10-16T23:37:00+00:00',
  zone: { code: 'buenos_aires', timezone: 'America/Argentina/Buenos_Aires' },
  next_slot: {
    time_slot_id: 'slot-21',
    starts_at: '2026-10-17T00:00:00+00:00',
    ends_at: '2026-10-17T02:00:00+00:00',
    local_time: '21:00',
    registrable_from: '2026-10-16T23:00:00+00:00',
    quota_used: false,
    quota_resets_at: '2026-10-17T03:00:00+00:00',
  },
  registrations: [
    {
      id: 'reg-1',
      time_slot_id: 'slot-21',
      starts_at: '2026-10-17T00:00:00+00:00',
      ends_at: '2026-10-17T02:00:00+00:00',
      local_time: '21:00',
    },
  ],
};

describe('fetchTimeSlotStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('llama al RPC y devuelve el estado con los tiempos en milisegundos', async () => {
    mockRpc.mockResolvedValue({ data: rawStatus, error: null });

    const status = await fetchTimeSlotStatus();

    expect(mockRpc).toHaveBeenCalledWith('get_time_slot_status');
    expect(status).toEqual({
      serverNow: Date.parse('2026-10-16T23:37:00Z'),
      zoneCode: 'buenos_aires',
      timezone: 'America/Argentina/Buenos_Aires',
      nextSlot: {
        timeSlotId: 'slot-21',
        startsAt: Date.parse('2026-10-17T00:00:00Z'),
        endsAt: Date.parse('2026-10-17T02:00:00Z'),
        localTime: '21:00',
        registrableFrom: Date.parse('2026-10-16T23:00:00Z'),
        quotaUsed: false,
        quotaResetsAt: Date.parse('2026-10-17T03:00:00Z'),
      },
      registrations: [
        {
          id: 'reg-1',
          timeSlotId: 'slot-21',
          startsAt: Date.parse('2026-10-17T00:00:00Z'),
          endsAt: Date.parse('2026-10-17T02:00:00Z'),
          localTime: '21:00',
        },
      ],
    });
  });

  it('sin turnos habilitados el próximo turno es null', async () => {
    mockRpc.mockResolvedValue({ data: { ...rawStatus, next_slot: null, registrations: [] }, error: null });

    const status = await fetchTimeSlotStatus();

    expect(status.nextSlot).toBeNull();
    expect(status.registrations).toEqual([]);
  });

  it('si el RPC falla lanza el error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(fetchTimeSlotStatus()).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('registerForNextTimeSlot', () => {
  beforeEach(() => jest.clearAllMocks());

  it('manda posición y disclaimer al RPC (sin elegir turno) y devuelve el estado nuevo', async () => {
    mockRpc.mockResolvedValue({ data: rawStatus, error: null });

    const status = await registerForNextTimeSlot({ latitude: -34.6, longitude: -58.4, disclaimerAccepted: true });

    expect(mockRpc).toHaveBeenCalledWith('register_for_next_time_slot', {
      p_lat: -34.6,
      p_lng: -58.4,
      p_disclaimer: true,
    });
    expect(status.registrations).toHaveLength(1);
  });

  it.each([
    'profile_incomplete',
    'disclaimer_required',
    'out_of_zone',
    'slot_inactive',
    'already_used_today',
    'invalid_location',
  ])('traduce el error "%s" del servidor a un código conocido', async (code) => {
    mockRpc.mockResolvedValue({ data: null, error: { message: code } });

    const error = await registerForNextTimeSlot({
      latitude: 0,
      longitude: 0,
      disclaimerAccepted: true,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(TimeSlotError);
    expect(error.code).toBe(code);
  });

  it('un error que no conocemos queda como "unknown"', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection reset' } });

    const error = await registerForNextTimeSlot({
      latitude: 0,
      longitude: 0,
      disclaimerAccepted: true,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(TimeSlotError);
    expect(error.code).toBe('unknown');
  });
});

describe('registerErrorMessageKey', () => {
  it('cada código tiene su texto en i18n', () => {
    expect(registerErrorMessageKey('profile_incomplete')).toBe('timeSlots.errors.profileIncomplete');
    expect(registerErrorMessageKey('disclaimer_required')).toBe('timeSlots.errors.disclaimerRequired');
    expect(registerErrorMessageKey('out_of_zone')).toBe('timeSlots.errors.outOfZone');
    expect(registerErrorMessageKey('slot_inactive')).toBe('timeSlots.errors.slotInactive');
    expect(registerErrorMessageKey('already_used_today')).toBe('timeSlots.errors.alreadyUsedToday');
    expect(registerErrorMessageKey('invalid_location')).toBe('timeSlots.errors.unknown');
    expect(registerErrorMessageKey('unknown')).toBe('timeSlots.errors.unknown');
  });
});
