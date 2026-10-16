import type { ChipTone } from '@/components/Chip/Chip';
import type { IconName } from '@/components/Icon/paths';

// Look of each interest (from the design). The database only knows the stable `code` and the
// labels; icons live in the app. Codes without an entry fall back to a neutral tile.
const INTEREST_TILES: Record<string, { icon: IconName; tone: ChipTone }> = {
  music: { icon: 'music', tone: 'primary' },
  travel: { icon: 'plane', tone: 'info' },
  cinema: { icon: 'film', tone: 'info' },
  sports: { icon: 'bolt', tone: 'accent' },
  technology: { icon: 'sparkle', tone: 'info' },
  gastronomy: { icon: 'utensils', tone: 'accent' },
  gym: { icon: 'dumbbell', tone: 'secondary' },
  beach: { icon: 'globe', tone: 'info' },
  trekking: { icon: 'tree', tone: 'success' },
  reading: { icon: 'book', tone: 'success' },
  art: { icon: 'palette', tone: 'accent' },
  dancing: { icon: 'party', tone: 'accent' },
  pets: { icon: 'paw', tone: 'info' },
  gaming: { icon: 'gamepad', tone: 'info' },
  photography: { icon: 'camera', tone: 'primary' },
  nightlife: { icon: 'moon', tone: 'secondary' },
};

const FALLBACK = { icon: 'heart' as IconName, tone: 'primary' as ChipTone };

export const interestTile = (code: string) => INTEREST_TILES[code] ?? FALLBACK;
