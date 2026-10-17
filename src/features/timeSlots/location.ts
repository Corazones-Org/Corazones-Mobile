import * as Location from 'expo-location';

export type CoordinatesResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: 'denied'; canAskAgain: boolean }
  | { ok: false; reason: 'unavailable' };

// Asks for the permission (only while the app is open) and reads the position once. Balanced
// accuracy is plenty: all we check is which city the person is in.
export async function getCurrentCoordinates(): Promise<CoordinatesResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, reason: 'denied', canAskAgain: permission.canAskAgain };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.LocationAccuracy.Balanced,
    });
    return { ok: true, latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (error) {
    console.error('Location error:', error);
    return { ok: false, reason: 'unavailable' };
  }
}
