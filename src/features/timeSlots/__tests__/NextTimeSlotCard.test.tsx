import { act, fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';

const mockFetchStatus = jest.fn();
const mockRegister = jest.fn();
const mockGetCoordinates = jest.fn();
const mockShowToast = jest.fn();
let mockProfileState: { status: string; profile: Record<string, unknown> | null };

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  fetchTimeSlotStatus: (...args: unknown[]) => mockFetchStatus(...args),
  registerForNextTimeSlot: (...args: unknown[]) => mockRegister(...args),
}));

jest.mock('../location', () => ({
  getCurrentCoordinates: (...args: unknown[]) => mockGetCoordinates(...args),
}));

jest.mock('@/features/profile/ProfileProvider', () => ({
  useProfile: () => mockProfileState,
}));

jest.mock('@/components/Toast/ToastProvider', () => ({
  useToast: () => ({ show: mockShowToast, hide: jest.fn() }),
}));

import { TimeSlotError } from '../api';
import { NextTimeSlotCard } from '../NextTimeSlotCard';
import {
  HOUR,
  NOW,
  SLOT_21_START,
  makeNextSlot,
  makeRegistration,
  makeStatus,
} from '../testFixtures';

const completeProfile = { name: 'Ana', onboardingComplete: true };
const flush = () => act(async () => {});
const button = (name: string) => screen.getByRole('button', { name });

async function renderCard(onOpenProfile = jest.fn()) {
  await render(<NextTimeSlotCard onOpenProfile={onOpenProfile} />);
  await flush();
  return { onOpenProfile };
}

describe('NextTimeSlotCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProfileState = { status: 'ready', profile: completeProfile };
    mockFetchStatus.mockResolvedValue(makeStatus());
    mockGetCoordinates.mockResolvedValue({ ok: true, latitude: -34.6, longitude: -58.4 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('carga', () => {
    it('mientras carga muestra un indicador', async () => {
      mockFetchStatus.mockReturnValue(new Promise(() => {}));
      await render(<NextTimeSlotCard onOpenProfile={jest.fn()} />);

      expect(screen.getByTestId('time-slot-loading')).toBeTruthy();
    });

    it('si falla muestra el error y Reintentar vuelve a pedirlo', async () => {
      mockFetchStatus.mockRejectedValueOnce(new Error('offline'));
      await renderCard();

      expect(screen.getByText('No pudimos cargar el próximo turno.')).toBeTruthy();

      await fireEvent.press(button('Reintentar'));
      await flush();

      expect(mockFetchStatus).toHaveBeenCalledTimes(2);
      expect(screen.getByText('21:00')).toBeTruthy();
    });
  });

  describe('turno libre', () => {
    it('muestra la hora del próximo turno, la cuenta regresiva y Anotarme', async () => {
      await renderCard();

      expect(screen.getByText('Próximo turno')).toBeTruthy();
      expect(screen.getByText('21:00')).toBeTruthy();
      expect(screen.getByText('00:23:00')).toBeTruthy();
      expect(button('Anotarme')).toBeTruthy();
    });

    it('la cuenta regresiva baja de a un segundo', async () => {
      await renderCard();

      await act(async () => jest.advanceTimersByTime(1000));

      expect(screen.getByText('00:22:59')).toBeTruthy();
    });

    it('con el reloj del celular atrasado una hora, igual muestra el tiempo correcto', async () => {
      jest.setSystemTime(NOW - HOUR);
      await renderCard();

      expect(screen.getByText('00:23:00')).toBeTruthy();
    });

    it('al pasar la hora en punto pasa solo al turno siguiente', async () => {
      await renderCard();
      mockFetchStatus.mockResolvedValue(
        makeStatus({
          serverNow: SLOT_21_START,
          nextSlot: makeNextSlot({
            localTime: '22:00',
            startsAt: SLOT_21_START + HOUR,
            endsAt: SLOT_21_START + 3 * HOUR,
            registrableFrom: SLOT_21_START,
          }),
        })
      );

      await act(async () => jest.advanceTimersByTime(23 * 60_000));
      await flush();

      expect(mockFetchStatus).toHaveBeenCalledTimes(2);
      expect(screen.getByText('22:00')).toBeTruthy();
      expect(screen.getByText('01:00:00')).toBeTruthy();
    });

    it('si todavía no se puede anotar (horas apagadas entre medio) el botón está deshabilitado', async () => {
      mockFetchStatus.mockResolvedValue(
        makeStatus({
          nextSlot: makeNextSlot({ startsAt: NOW + 9 * HOUR, registrableFrom: NOW + 8 * HOUR }),
        })
      );
      await renderCard();

      expect(button('Anotarme').props.accessibilityState.disabled).toBe(true);
      expect(screen.getByText('Vas a poder anotarte una hora antes de que empiece.')).toBeTruthy();
    });
  });

  describe('anotarse', () => {
    it('con el perfil incompleto avisa con un toast que lleva al perfil, sin abrir el aviso', async () => {
      mockProfileState = { status: 'ready', profile: { name: 'Ana', onboardingComplete: false } };
      const { onOpenProfile } = await renderCard();

      await fireEvent.press(button('Anotarme'));

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'warning', title: 'Completá tu perfil', action: 'Ir al perfil' })
      );
      expect(screen.queryByText('Antes de anotarte')).toBeNull();

      mockShowToast.mock.calls[0][0].onAction();
      expect(onOpenProfile).toHaveBeenCalledTimes(1);
    });

    it('sin nombre tampoco deja anotarse', async () => {
      mockProfileState = { status: 'ready', profile: { name: '  ', onboardingComplete: true } };
      await renderCard();

      await fireEvent.press(button('Anotarme'));

      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Completá tu perfil' }));
      expect(mockGetCoordinates).not.toHaveBeenCalled();
    });

    it('con el perfil completo abre el aviso; cancelar no pide ubicación ni se anota', async () => {
      await renderCard();

      await fireEvent.press(button('Anotarme'));
      expect(screen.getByText('Más vale estar cambiado y bañado, listo para salir.')).toBeTruthy();

      await fireEvent.press(button('Cancelar'));

      expect(screen.queryByText('Antes de anotarte')).toBeNull();
      expect(mockGetCoordinates).not.toHaveBeenCalled();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('Aceptar pide la ubicación y se anota; el card pasa a "anotado esperando"', async () => {
      mockRegister.mockResolvedValue(
        makeStatus({ nextSlot: makeNextSlot({ quotaUsed: true }), registrations: [makeRegistration()] })
      );
      await renderCard();

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(mockGetCoordinates).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith({
        latitude: -34.6,
        longitude: -58.4,
        disclaimerAccepted: true,
      });
      expect(screen.queryByText('Antes de anotarte')).toBeNull();
      expect(screen.getByText('Anotado')).toBeTruthy();
      expect(screen.getByText('Tu turno de las 21:00 empieza en')).toBeTruthy();
      expect(screen.getByText('00:23:00')).toBeTruthy();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'success', title: '¡Listo, estás anotado!' })
      );
    });

    it('sin permiso de ubicación no se anota y explica por qué la pide', async () => {
      mockGetCoordinates.mockResolvedValue({ ok: false, reason: 'denied', canAskAgain: true });
      await renderCard();

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(mockRegister).not.toHaveBeenCalled();
      expect(screen.queryByText('Antes de anotarte')).toBeNull();
      expect(
        screen.getByText(
          'Necesitamos tu ubicación para saber si estás en una ciudad habilitada. No la guardamos.'
        )
      ).toBeTruthy();
      expect(button('Anotarme')).toBeTruthy();
    });

    it('permiso bloqueado para siempre: manda a los ajustes del teléfono', async () => {
      mockGetCoordinates.mockResolvedValue({ ok: false, reason: 'denied', canAskAgain: false });
      await renderCard();

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(
        screen.getByText(
          'Necesitamos tu ubicación para saber si estás en una ciudad habilitada. Activala en los ajustes del teléfono.'
        )
      ).toBeTruthy();
    });

    it('si no se puede leer la ubicación lo avisa', async () => {
      mockGetCoordinates.mockResolvedValue({ ok: false, reason: 'unavailable' });
      await renderCard();

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(mockRegister).not.toHaveBeenCalled();
      expect(screen.getByText('No pudimos ubicarte. Revisá que el GPS esté prendido y probá de nuevo.')).toBeTruthy();
    });

    it('fuera de una ciudad habilitada: "Todavía no llegamos a tu ciudad"', async () => {
      mockRegister.mockRejectedValue(new TimeSlotError('out_of_zone'));
      await renderCard();

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(screen.getByText('Todavía no llegamos a tu ciudad')).toBeTruthy();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('si el servidor dice que ya usó el turno, refresca y avisa', async () => {
      mockRegister.mockRejectedValue(new TimeSlotError('already_used_today'));
      await renderCard();
      mockFetchStatus.mockResolvedValue(makeStatus({ nextSlot: makeNextSlot({ quotaUsed: true }) }));

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(mockFetchStatus).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Ya usaste tu turno, garpá para más')).toBeTruthy();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'error', message: 'Ya usaste tu turno, garpá para más.' })
      );
    });

    it('si el servidor dice que el perfil está incompleto, lleva al perfil', async () => {
      mockRegister.mockRejectedValue(new TimeSlotError('profile_incomplete'));
      const { onOpenProfile } = await renderCard();

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Completá tu perfil', action: 'Ir al perfil' })
      );
      mockShowToast.mock.calls[0][0].onAction();
      expect(onOpenProfile).toHaveBeenCalled();
    });

    it('cualquier otro error muestra un toast y deja volver a intentar', async () => {
      mockRegister.mockRejectedValue(new TimeSlotError('unknown'));
      await renderCard();

      await fireEvent.press(button('Anotarme'));
      await fireEvent.press(button('Aceptar'));
      await flush();

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'error', title: 'No pudimos anotarte' })
      );
      expect(button('Anotarme')).toBeTruthy();
    });
  });

  describe('otros estados', () => {
    it('anotado esperando', async () => {
      mockFetchStatus.mockResolvedValue(
        makeStatus({ nextSlot: makeNextSlot({ quotaUsed: true }), registrations: [makeRegistration()] })
      );
      await renderCard();

      expect(screen.getByText('Anotado')).toBeTruthy();
      expect(screen.getByText('Tu turno de las 21:00 empieza en')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Anotarme' })).toBeNull();
    });

    it('ya usó el turno del día: mensaje y cuenta regresiva hasta las 00:00', async () => {
      mockFetchStatus.mockResolvedValue(
        makeStatus({
          nextSlot: makeNextSlot({ quotaUsed: true, quotaResetsAt: NOW + 3 * HOUR + 23 * 60_000 }),
        })
      );
      await renderCard();

      expect(screen.getByText('Ya usaste tu turno, garpá para más')).toBeTruthy();
      expect(screen.getByText('Tu cupo se renueva en')).toBeTruthy();
      expect(screen.getByText('03:23:00')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Anotarme' })).toBeNull();
    });

    it('sin turnos habilitados', async () => {
      mockFetchStatus.mockResolvedValue(makeStatus({ nextSlot: null }));
      await renderCard();

      expect(screen.getByText('Por ahora no hay turnos disponibles. Volvé a mirar más tarde.')).toBeTruthy();
    });

    it('turno en curso: aparece aparte, con cuánto falta para que termine', async () => {
      const running = makeRegistration({
        id: 'reg-run',
        startsAt: NOW - HOUR,
        endsAt: NOW + HOUR,
        localTime: '19:00',
      });
      mockFetchStatus.mockResolvedValue(makeStatus({ registrations: [running] }));
      await renderCard();

      expect(screen.getByText('Turno de las 19:00 en curso')).toBeTruthy();
      expect(screen.getByText('Termina en 01:00:00')).toBeTruthy();
      // ...and the next slot can still be signed up.
      expect(button('Anotarme')).toBeTruthy();
    });
  });
});
