import { deriveCardState } from '../cardState';
import { HOUR, NOW, SLOT_21_START, makeNextSlot, makeRegistration, makeStatus } from '../testFixtures';

describe('deriveCardState', () => {
  it('libre: el próximo turno con su cuenta regresiva y se puede anotar', () => {
    const state = deriveCardState(makeStatus(), NOW);

    expect(state).toEqual({
      main: { kind: 'free', localTime: '21:00', startsAt: SLOT_21_START, canRegister: true, registeredCount: 0 },
      inProgress: null,
    });
  });

  it('libre: pasa cuántas personas hay anotadas al próximo turno', () => {
    const status = makeStatus({ nextSlot: makeNextSlot({ registeredCount: 7 }) });

    expect(deriveCardState(status, NOW).main).toMatchObject({ kind: 'free', registeredCount: 7 });
  });

  it('libre pero todavía no anotable: faltan horas habilitadas entre medio', () => {
    const status = makeStatus({
      nextSlot: makeNextSlot({ startsAt: NOW + 9 * HOUR, registrableFrom: NOW + 8 * HOUR }),
    });

    expect(deriveCardState(status, NOW).main).toMatchObject({ kind: 'free', canRegister: false });
    expect(deriveCardState(status, NOW + 8 * HOUR).main).toMatchObject({ kind: 'free', canRegister: true });
  });

  it('anotado esperando: hay un registro que todavía no empezó, con cuántos hay anotados (la persona incluida)', () => {
    const status = makeStatus({
      nextSlot: makeNextSlot({ quotaUsed: true, registeredCount: 4 }),
      registrations: [makeRegistration()],
    });

    expect(deriveCardState(status, NOW).main).toEqual({
      kind: 'waiting',
      localTime: '21:00',
      startsAt: SLOT_21_START,
      registeredCount: 4,
    });
  });

  it('anotado esperando a un turno que no es el próximo del servidor: no inventa la cantidad', () => {
    const status = makeStatus({
      nextSlot: makeNextSlot({ quotaUsed: true, startsAt: SLOT_21_START + HOUR, registeredCount: 4 }),
      registrations: [makeRegistration()],
    });

    expect(deriveCardState(status, NOW).main).toMatchObject({ kind: 'waiting', registeredCount: null });
  });

  it('anotado esperando: nunca menos de 1 (la persona está anotada aunque el número llegue viejo)', () => {
    const status = makeStatus({
      nextSlot: makeNextSlot({ quotaUsed: true, registeredCount: 0 }),
      registrations: [makeRegistration()],
    });

    expect(deriveCardState(status, NOW).main).toMatchObject({ kind: 'waiting', registeredCount: 1 });
  });

  it('ya usado: el cupo del día está gastado, cuenta hasta que se renueva y muestra los anotados al próximo', () => {
    const resetsAt = Date.parse('2026-10-17T03:00:00Z');
    const status = makeStatus({
      nextSlot: makeNextSlot({ quotaUsed: true, quotaResetsAt: resetsAt, registeredCount: 2 }),
    });

    expect(deriveCardState(status, NOW).main).toEqual({
      kind: 'used',
      resetsAt,
      nextLocalTime: '21:00',
      registeredCount: 2,
    });
  });

  it('sin turnos habilitados', () => {
    expect(deriveCardState(makeStatus({ nextSlot: null }), NOW).main).toEqual({ kind: 'noSlots' });
  });

  it('el próximo turno ya empezó y falta refrescar: "refreshing"', () => {
    expect(deriveCardState(makeStatus(), SLOT_21_START).main).toEqual({ kind: 'refreshing' });
    expect(deriveCardState(makeStatus(), SLOT_21_START + 1000).main).toEqual({ kind: 'refreshing' });
  });

  it('turno en curso: se muestra aparte y no bloquea anotarse al siguiente (cupo libre)', () => {
    const running = makeRegistration({ id: 'reg-run', startsAt: NOW - HOUR, endsAt: NOW + HOUR, localTime: '19:00' });
    const status = makeStatus({ registrations: [running] });

    expect(deriveCardState(status, NOW)).toEqual({
      main: { kind: 'free', localTime: '21:00', startsAt: SLOT_21_START, canRegister: true, registeredCount: 0 },
      inProgress: { localTime: '19:00', endsAt: NOW + HOUR },
    });
  });

  it('turno en curso con el cupo del día usado: "ya usado" más el turno en curso', () => {
    const running = makeRegistration({ startsAt: NOW - HOUR, endsAt: NOW + HOUR, localTime: '19:00' });
    const resetsAt = Date.parse('2026-10-17T03:00:00Z');
    const status = makeStatus({
      nextSlot: makeNextSlot({ quotaUsed: true, quotaResetsAt: resetsAt }),
      registrations: [running],
    });

    expect(deriveCardState(status, NOW)).toEqual({
      main: { kind: 'used', resetsAt, nextLocalTime: '21:00', registeredCount: 0 },
      inProgress: { localTime: '19:00', endsAt: NOW + HOUR },
    });
  });

  it('un registro que ya terminó no cuenta', () => {
    const ended = makeRegistration({ startsAt: NOW - 3 * HOUR, endsAt: NOW - HOUR });

    expect(deriveCardState(makeStatus({ registrations: [ended] }), NOW)).toEqual({
      main: { kind: 'free', localTime: '21:00', startsAt: SLOT_21_START, canRegister: true, registeredCount: 0 },
      inProgress: null,
    });
  });
});
