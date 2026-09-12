import i18n, { supportedLanguages } from '../index';

describe('i18n setup', () => {
  it('arranca en español', () => {
    expect(i18n.language).toBe('es');
  });

  it('resuelve el label de una partner preference por su code', () => {
    expect(i18n.t('partnerPreferences.men')).toBe('Hombres');
    expect(i18n.t('partnerPreferences.women')).toBe('Mujeres');
    expect(i18n.t('partnerPreferences.everyone')).toBe('Todos');
  });

  it('declara español como idioma soportado', () => {
    expect(supportedLanguages).toContain('es');
  });
});
