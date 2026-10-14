const {
  SCENE_DELEGATE_SOURCE,
  addSceneManifest,
  patchAppDelegate,
} = require('../withIosSceneLifecycle');

const SDK_57_APP_DELEGATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options)
  }
}
`;

describe('patchAppDelegate', () => {
  it('makes AppDelegate an ExpoReactNativeFactoryProvider', () => {
    expect(patchAppDelegate(SDK_57_APP_DELEGATE)).toContain(
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
    );
  });

  it('stops creating the window and starting React Native (the scene delegate does it)', () => {
    const patched = patchAppDelegate(SDK_57_APP_DELEGATE);

    expect(patched).not.toContain('UIWindow(frame:');
    expect(patched).not.toContain('startReactNative');
    expect(patched).toContain('reactNativeFactory = factory');
    expect(patched).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
  });

  it('keeps the other AppDelegate overrides', () => {
    expect(patchAppDelegate(SDK_57_APP_DELEGATE)).toContain('// Linking API');
  });

  it('is idempotent', () => {
    const once = patchAppDelegate(SDK_57_APP_DELEGATE);

    expect(patchAppDelegate(once)).toBe(once);
  });

  it('leaves an AppDelegate that already uses the scene lifecycle untouched', () => {
    const sdk58 = SDK_57_APP_DELEGATE.replace(
      'ExpoAppDelegate {',
      'ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
    );

    expect(patchAppDelegate(sdk58)).toBe(sdk58);
  });
});

describe('addSceneManifest', () => {
  it('adds a single-scene manifest pointing at SceneDelegate', () => {
    const plist = addSceneManifest({ CFBundleName: 'Corazones' });

    expect(plist.CFBundleName).toBe('Corazones');
    expect(plist.UIApplicationSceneManifest).toEqual({
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    });
  });

  it('does not override an existing manifest', () => {
    const existing = { UIApplicationSceneManifest: { custom: true } };

    expect(addSceneManifest(existing).UIApplicationSceneManifest).toEqual({ custom: true });
  });
});

describe('SCENE_DELEGATE_SOURCE', () => {
  it('subclasses ExpoAppSceneDelegate and is exposed to ObjC as SceneDelegate', () => {
    expect(SCENE_DELEGATE_SOURCE).toContain('@objc(SceneDelegate)');
    expect(SCENE_DELEGATE_SOURCE).toContain('class SceneDelegate: ExpoAppSceneDelegate');
  });
});
