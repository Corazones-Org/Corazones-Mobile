import {
  BIO_MAX_LENGTH,
  validateAge,
  validateBio,
  validateInstagram,
  validateName,
} from '../profileValidation';

describe('validateName', () => {
  it('acepta un nombre y le saca los espacios de los costados', () => {
    expect(validateName('  Ana ')).toEqual({ ok: true, value: 'Ana' });
  });

  it('rechaza un nombre vacío o solo con espacios', () => {
    expect(validateName('')).toEqual({ ok: false, error: 'nameRequired' });
    expect(validateName('   ')).toEqual({ ok: false, error: 'nameRequired' });
  });
});

describe('validateAge', () => {
  it('acepta un entero entre 18 y 99', () => {
    expect(validateAge('18')).toEqual({ ok: true, value: 18 });
    expect(validateAge(' 26 ')).toEqual({ ok: true, value: 26 });
    expect(validateAge('99')).toEqual({ ok: true, value: 99 });
  });

  it('rechaza menores de 18 y mayores de 99', () => {
    expect(validateAge('17')).toEqual({ ok: false, error: 'ageInvalid' });
    expect(validateAge('100')).toEqual({ ok: false, error: 'ageInvalid' });
  });

  it('rechaza vacío, decimales y texto', () => {
    expect(validateAge('')).toEqual({ ok: false, error: 'ageInvalid' });
    expect(validateAge('25.5')).toEqual({ ok: false, error: 'ageInvalid' });
    expect(validateAge('veinte')).toEqual({ ok: false, error: 'ageInvalid' });
    expect(validateAge('2e1')).toEqual({ ok: false, error: 'ageInvalid' });
  });
});

describe('validateBio', () => {
  it('acepta una bio y la guarda sin espacios de los costados', () => {
    expect(validateBio(' Hola ')).toEqual({ ok: true, value: 'Hola' });
  });

  it('una bio vacía es válida y se guarda como null', () => {
    expect(validateBio('')).toEqual({ ok: true, value: null });
    expect(validateBio('   ')).toEqual({ ok: true, value: null });
  });

  it('acepta exactamente el máximo y rechaza uno más', () => {
    expect(validateBio('a'.repeat(BIO_MAX_LENGTH)).ok).toBe(true);
    expect(validateBio('a'.repeat(BIO_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: 'bioTooLong',
    });
  });
});

describe('validateInstagram', () => {
  it('es opcional: vacío se guarda como null', () => {
    expect(validateInstagram('')).toEqual({ ok: true, value: null });
    expect(validateInstagram('  ')).toEqual({ ok: true, value: null });
    expect(validateInstagram('@')).toEqual({ ok: true, value: null });
  });

  it('acepta un usuario con o sin arroba', () => {
    expect(validateInstagram('ana.perez_1')).toEqual({ ok: true, value: 'ana.perez_1' });
    expect(validateInstagram('@ana.perez_1')).toEqual({ ok: true, value: 'ana.perez_1' });
  });

  it('extrae el usuario de un link de Instagram', () => {
    expect(validateInstagram('https://www.instagram.com/ana.perez/')).toEqual({
      ok: true,
      value: 'ana.perez',
    });
    expect(validateInstagram('instagram.com/ana.perez?igsh=abc')).toEqual({
      ok: true,
      value: 'ana.perez',
    });
  });

  it('rechaza caracteres inválidos y más de 30 caracteres', () => {
    expect(validateInstagram('ana perez')).toEqual({ ok: false, error: 'instagramInvalid' });
    expect(validateInstagram('ana$')).toEqual({ ok: false, error: 'instagramInvalid' });
    expect(validateInstagram('a'.repeat(31))).toEqual({ ok: false, error: 'instagramInvalid' });
  });
});
