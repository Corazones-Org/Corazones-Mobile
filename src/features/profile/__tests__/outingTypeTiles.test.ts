import { outingTypeTile } from '../outingTypeTiles';

// Codes seeded in the `outing_types` table (migration 0019).
const SEEDED_CODES = [
  'breakfast', 'brunch', 'lunch', 'coffee', 'dinner', 'drinks', 'club', 'cinema', 'concert',
  'park', 'beach', 'shopping', 'bowling', 'mini_golf', 'spa', 'getaway', 'hotel_encounter',
];

describe('outingTypeTile', () => {
  it('cada tipo de salida del catálogo tiene su propio ícono', () => {
    for (const code of SEEDED_CODES) {
      expect(outingTypeTile(code).icon).not.toBe('heart');
    }
  });

  it('un código desconocido usa el ícono genérico', () => {
    expect(outingTypeTile('nuevo')).toEqual({ icon: 'heart', tone: 'primary' });
  });
});
