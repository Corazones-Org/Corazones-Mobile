const { patchBuildScript } = require('../withExpoModulesJsiInterfaceFix');

// The line of build-xcframework.sh (expo-modules-jsi 57.1.2) that strips C++ type extensions.
const ORIGINAL_SED =
  "sed '/^extension __ObjC\\./,/^}/d;/^@usableFromInline$/{N;/_ConstraintThatIsNotPartOfTheAPIOfThisLibrary/d;};/_ConstraintThatIsNotPartOfTheAPIOfThisLibrary/d' \"$swiftinterface\"";

describe('patchBuildScript', () => {
  it('hace que sed también saque las extensiones con la sintaxis "__ObjC::" de Swift 6.4', () => {
    const patched = patchBuildScript(`before\n${ORIGINAL_SED}\nafter`);

    expect(patched).toContain("sed '/^extension __ObjC[.:]/,/^}/d;");
    expect(patched).not.toContain('/^extension __ObjC\\./');
    expect(patched.startsWith('before\n')).toBe(true);
    expect(patched.endsWith('\nafter')).toBe(true);
  });

  it('el patrón nuevo matchea las dos sintaxis y no otras extensiones', () => {
    const pattern = /^extension __ObjC[.:]/;

    expect(pattern.test('extension __ObjC.expo.CppError : Swift.Error {')).toBe(true);
    expect(pattern.test('extension __ObjC::expo.__ObjC::CppError : Swift::Error {')).toBe(true);
    expect(pattern.test('extension Swift.Optional : Foo {')).toBe(false);
  });

  it('es idempotente: aplicarlo dos veces da lo mismo que una', () => {
    const once = patchBuildScript(ORIGINAL_SED);

    expect(patchBuildScript(once)).toBe(once);
  });

  it('deja intacto un script que ya no tiene esa línea (otra versión del paquete)', () => {
    expect(patchBuildScript('echo hola')).toBe('echo hola');
  });
});
