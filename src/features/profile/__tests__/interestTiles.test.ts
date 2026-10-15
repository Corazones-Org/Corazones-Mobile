import { interestLabel, interestTile } from '../interestTiles';

// Codes seeded in the `interests` table.
const SEEDED_CODES = [
  'music', 'travel', 'cinema', 'sports', 'technology', 'gastronomy', 'gym', 'beach',
  'trekking', 'reading', 'art', 'dancing', 'pets', 'gaming', 'photography', 'nightlife',
];

describe('interestTile', () => {
  it('cada interés del catálogo tiene su propio ícono', () => {
    for (const code of SEEDED_CODES) {
      expect(interestTile(code).icon).not.toBe('heart');
    }
  });

  it('un código desconocido usa el ícono genérico', () => {
    expect(interestTile('nuevo')).toEqual({ icon: 'heart', tone: 'primary' });
  });
});

describe('interestLabel', () => {
  const interest = { code: 'music', labels: { es: 'Música', en: 'Music' } };

  it('usa el idioma pedido, o español, o el código', () => {
    expect(interestLabel(interest, 'en')).toBe('Music');
    expect(interestLabel(interest, 'fr')).toBe('Música');
    expect(interestLabel({ code: 'music', labels: {} }, 'fr')).toBe('music');
  });
});
