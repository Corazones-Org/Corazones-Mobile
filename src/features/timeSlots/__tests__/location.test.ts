const mockRequestPermission = jest.fn();
const mockGetPosition = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockRequestPermission(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetPosition(...args),
  LocationAccuracy: { Balanced: 3 },
}));

import { getCurrentCoordinates } from '../location';

describe('getCurrentCoordinates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('con permiso devuelve latitud y longitud', async () => {
    mockRequestPermission.mockResolvedValue({ granted: true, canAskAgain: true });
    mockGetPosition.mockResolvedValue({ coords: { latitude: -34.6, longitude: -58.4 } });

    const result = await getCurrentCoordinates();

    expect(result).toEqual({ ok: true, latitude: -34.6, longitude: -58.4 });
    expect(mockGetPosition).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('con el permiso denegado no pide la posición', async () => {
    mockRequestPermission.mockResolvedValue({ granted: false, canAskAgain: true });

    const result = await getCurrentCoordinates();

    expect(result).toEqual({ ok: false, reason: 'denied', canAskAgain: true });
    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it('denegado para siempre: avisa que ya no se puede volver a pedir', async () => {
    mockRequestPermission.mockResolvedValue({ granted: false, canAskAgain: false });

    expect(await getCurrentCoordinates()).toEqual({ ok: false, reason: 'denied', canAskAgain: false });
  });

  it('si no se puede leer la posición (GPS apagado, sin señal) lo informa', async () => {
    mockRequestPermission.mockResolvedValue({ granted: true, canAskAgain: true });
    mockGetPosition.mockRejectedValue(new Error('Location services are disabled'));

    expect(await getCurrentCoordinates()).toEqual({ ok: false, reason: 'unavailable' });
  });
});
