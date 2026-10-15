import { renderHook } from '@testing-library/react-native';

let mockUseFonts: jest.Mock;

jest.mock('expo-font', () => ({ useFonts: (...args: unknown[]) => mockUseFonts(...args) }));

import { useAppFonts } from '../fonts';

describe('useAppFonts', () => {
  it('is not ready while the fonts are loading', async () => {
    mockUseFonts = jest.fn().mockReturnValue([false, null]);

    const { result } = await renderHook(() => useAppFonts());

    expect(result.current).toBe(false);
  });

  it('is ready once the fonts are loaded', async () => {
    mockUseFonts = jest.fn().mockReturnValue([true, null]);

    const { result } = await renderHook(() => useAppFonts());

    expect(result.current).toBe(true);
  });

  it('is ready when loading failed, so the app falls back to the system font instead of hanging', async () => {
    mockUseFonts = jest.fn().mockReturnValue([false, new Error('boom')]);

    const { result } = await renderHook(() => useAppFonts());

    expect(result.current).toBe(true);
  });

  it('registers the four Poppins weights the design system uses', async () => {
    mockUseFonts = jest.fn().mockReturnValue([true, null]);

    await renderHook(() => useAppFonts());

    expect(Object.keys(mockUseFonts.mock.calls[0][0]).sort()).toEqual([
      'Poppins_400Regular',
      'Poppins_500Medium',
      'Poppins_600SemiBold',
      'Poppins_700Bold',
    ]);
  });
});
