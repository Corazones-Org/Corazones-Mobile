import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { useFonts } from 'expo-font';

// Family names match `typography.*.fontFamily` in the generated tokens.
const poppins = { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold };

// True once the fonts are ready. A load error also counts as ready: the app then falls back to the
// system font instead of staying on the splash forever.
export function useAppFonts() {
  const [loaded, error] = useFonts(poppins);
  return loaded || error != null;
}
