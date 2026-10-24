import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Mobile Application Configuration for OmniMini Super App.
 *
 * Configures the application ID (`com.omnimini.superapp`), sets `webDir` to `'dist'`,
 * and enables the Android platform with production build deployment options
 * (APK & Google Play AAB bundles) and native hardware plugin defaults.
 */
const config: CapacitorConfig = {
  appId: 'com.omnimini.superapp',
  appName: 'OmniMini',
  webDir: 'dist',
  backgroundColor: '#020617',
  loggingBehavior: 'debug',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'localhost',
    allowNavigation: [
      '*.firebaseapp.com',
      '*.googleapis.com',
      '*.google.com',
      'abduedris313-max.github.io',
    ],
  },
  android: {
    path: 'android',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#020617',
    minWebViewVersion: 60,
    resolveServiceWorkerRequests: true,
    buildOptions: {
      releaseType: 'AAB',
      signingType: 'apksigner',
    },
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
      hidden: false,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#020617',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3b82f6',
      sound: 'beep.wav',
    },
  },
};

export default config;

