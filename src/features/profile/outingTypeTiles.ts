import type { ChipTone } from '@/components/Chip/Chip';
import type { IconName } from '@/components/Icon/paths';

// Look of each outing type ("Tipo de salida"). The database only knows the stable `code` and the
// labels; icons live in the app. Codes without an entry fall back to a neutral tile.
const OUTING_TYPE_TILES: Record<string, { icon: IconName; tone: ChipTone }> = {
  breakfast: { icon: 'utensils', tone: 'accent' },
  brunch: { icon: 'utensils', tone: 'accent' },
  lunch: { icon: 'utensils', tone: 'accent' },
  coffee: { icon: 'bolt', tone: 'accent' },
  dinner: { icon: 'utensils', tone: 'secondary' },
  drinks: { icon: 'wine', tone: 'secondary' },
  club: { icon: 'party', tone: 'primary' },
  cinema: { icon: 'film', tone: 'info' },
  concert: { icon: 'music', tone: 'primary' },
  park: { icon: 'tree', tone: 'success' },
  beach: { icon: 'globe', tone: 'info' },
  shopping: { icon: 'star', tone: 'accent' },
  bowling: { icon: 'gamepad', tone: 'info' },
  mini_golf: { icon: 'tree', tone: 'success' },
  spa: { icon: 'sparkle', tone: 'info' },
  getaway: { icon: 'plane', tone: 'info' },
  hotel_encounter: { icon: 'moon', tone: 'primary' },
};

const FALLBACK = { icon: 'heart' as IconName, tone: 'primary' as ChipTone };

export const outingTypeTile = (code: string) => OUTING_TYPE_TILES[code] ?? FALLBACK;
