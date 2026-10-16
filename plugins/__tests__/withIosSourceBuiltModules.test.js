const { setPodfileProperties } = require('../withIosSourceBuiltModules');

describe('setPodfileProperties', () => {
  it('apaga los módulos precompilados de Expo, conservando el resto de las propiedades', () => {
    const properties = { 'expo.jsEngine': 'hermes' };

    expect(setPodfileProperties(properties)).toEqual({
      'expo.jsEngine': 'hermes',
      EXPO_USE_PRECOMPILED_MODULES: 'false',
    });
  });

  it('no modifica el objeto original', () => {
    const properties = {};

    setPodfileProperties(properties);

    expect(properties).toEqual({});
  });
});
