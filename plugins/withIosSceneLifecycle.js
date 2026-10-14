// iOS 27 asserts at launch unless the app adopts the UIScene life cycle.
// Expo SDK 57 ships ExpoAppSceneDelegate but its prebuild template does not use it yet
// (SDK 58 does). This plugin applies Expo's migration guide (https://expo.fyi/ios-scene-lifecycle)
// on every prebuild: SceneDelegate.swift, UIApplicationSceneManifest, and the AppDelegate edit.
// Each step is a no-op once the template already does it, so it can be removed on SDK 58.
const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const PROVIDER = 'ExpoReactNativeFactoryProvider';

function addSceneManifest(plist) {
  if (plist.UIApplicationSceneManifest) return plist;

  return {
    ...plist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    },
  };
}

function patchAppDelegate(source) {
  if (source.includes(PROVIDER)) return source;

  return source
    .replace('class AppDelegate: ExpoAppDelegate {', `class AppDelegate: ExpoAppDelegate, ${PROVIDER} {`)
    .replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/,
      '    // The window is created and React Native is started by `SceneDelegate` under the\n' +
        '    // scene-based life cycle (required by the iOS 27 SDK).\n'
    );
}

function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults = addSceneManifest(mod.modResults);
    return mod;
  });

  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const appDir = path.join(mod.modRequest.platformProjectRoot, mod.modRequest.projectName);
      const appDelegatePath = path.join(appDir, 'AppDelegate.swift');

      fs.writeFileSync(path.join(appDir, 'SceneDelegate.swift'), SCENE_DELEGATE_SOURCE);
      fs.writeFileSync(appDelegatePath, patchAppDelegate(fs.readFileSync(appDelegatePath, 'utf8')));
      return mod;
    },
  ]);

  return withXcodeProject(config, (mod) => {
    const projectName = mod.modRequest.projectName;
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${projectName}/SceneDelegate.swift`,
      groupName: projectName,
      project: mod.modResults,
    });
    return mod;
  });
}

module.exports = withIosSceneLifecycle;
module.exports.SCENE_DELEGATE_SOURCE = SCENE_DELEGATE_SOURCE;
module.exports.addSceneManifest = addSceneManifest;
module.exports.patchAppDelegate = patchAppDelegate;
