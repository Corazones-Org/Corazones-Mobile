// Xcode 27 (Swift 6.4) prints C++ type extensions in a .swiftinterface as
// "extension __ObjC::expo.__ObjC::CppError", with "::" instead of ".". The expo-modules-jsi build
// script (which builds ExpoModulesJSI.xcframework locally on every machine) strips those blocks with
// a sed that only knows the "." form, so the interface it ships is invalid and the iOS build fails with
// "cannot find type '__ObjC::expo' in scope" / "failed to build module 'ExpoModulesJSI'".
// This plugin teaches that sed both forms. It edits the installed package, so it runs on every
// prebuild (`npm run clean`) and does nothing once the package already handles it.
// Remove it when expo-modules-jsi does (the script's own NOTE warns about this).
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const OLD_PATTERN = "'/^extension __ObjC\\./,/^}/d;";
const NEW_PATTERN = "'/^extension __ObjC[.:]/,/^}/d;";

function patchBuildScript(source) {
  return source.replace(OLD_PATTERN, NEW_PATTERN);
}

function buildScriptPath() {
  try {
    const packageJson = require.resolve('expo-modules-jsi/package.json');
    return path.join(path.dirname(packageJson), 'apple', 'scripts', 'build-xcframework.sh');
  } catch {
    return null;
  }
}

function withExpoModulesJsiInterfaceFix(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const file = buildScriptPath();
      if (file && fs.existsSync(file)) {
        const source = fs.readFileSync(file, 'utf8');
        const patched = patchBuildScript(source);
        if (patched !== source) {
          fs.writeFileSync(file, patched);
        }
      }
      return mod;
    },
  ]);
}

module.exports = withExpoModulesJsiInterfaceFix;
module.exports.patchBuildScript = patchBuildScript;
module.exports.buildScriptPath = buildScriptPath;
