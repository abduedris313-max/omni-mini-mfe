import { useCallback, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Toast } from '@capacitor/toast';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useSuperApp } from '../context/SuperAppContext';
import { createMiniAppSDK } from '../sdk/createMiniAppSDK';
import {
  nativeBridgeService,
  PlatformRuntimeInfo,
  QrScanPayload,
  BiometricAuthResult,
} from '../services/nativeBridgeService';
import { MiniAppBridgeSDK, MiniAppPermission } from '../types/miniapp';

/**
 * Mapped Capacitor Native Plugin Controllers exposed by `useNativeBridge`.
 *
 * Provides direct, strongly-typed access to Capacitor's native plugins
 * (`Haptics`, `StatusBar`, `SplashScreen`, `Toast`, `Camera`, and `Biometrics`)
 * with progressive Web/PWA fallbacks so Mini Apps and the Super App shell
 * execute identically on Android APK/AAB and browser runtimes.
 */
export interface NativeBridgePluginControllers {
  /** Platform & capability metadata from Capacitor runtime */
  platformInfo: PlatformRuntimeInfo;

  /** Mapped `@capacitor/haptics` controller */
  haptics: {
    impact: (pattern?: 'light' | 'medium' | 'heavy') => Promise<void>;
    notification: (type?: 'success' | 'warning' | 'error') => Promise<void>;
    trigger: (
      pattern?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
    ) => Promise<void>;
  };

  /** Mapped `@capacitor/status-bar` controller */
  statusBar: {
    setStyle: (isDark: boolean) => Promise<void>;
    setBackgroundColor: (color: string) => Promise<void>;
    setVisible: (visible: boolean) => Promise<void>;
    syncWithTheme: (options: {
      isDark: boolean;
      backgroundColor: string;
      visible?: boolean;
    }) => Promise<void>;
  };

  /** Mapped `@capacitor/splash-screen` controller */
  splashScreen: {
    show: (autoHideDurationMs?: number) => Promise<void>;
    hide: (fadeOutDurationMs?: number) => Promise<void>;
  };

  /** Mapped `@capacitor/toast` controller synchronized with SuperApp HUD */
  toast: {
    show: (
      message: string,
      type?: 'info' | 'success' | 'warning' | 'error',
      duration?: 'short' | 'long'
    ) => Promise<void>;
  };

  /** Mapped `@capacitor/camera` & QR code scanner controller */
  camera: {
    capturePhoto: () => Promise<{ dataUrl: string; format: string } | null>;
    scanQRCode: () => Promise<QrScanPayload | null>;
  };

  /** Mapped Biometric Enclave & WebAuthn / Secure PIN fallback controller */
  biometrics: {
    authenticate: (reason?: string) => Promise<boolean>;
    verifyHardwareEnclave: () => Promise<BiometricAuthResult>;
  };

  /** Bound `MiniAppBridgeSDK` instance mapped to all Capacitor native plugins */
  sdk: MiniAppBridgeSDK;
}

/**
 * React Hook that maps Capacitor native plugins (`Haptics`, `StatusBar`,
 * `SplashScreen`, `Toast`, `Camera`, and `Biometrics`) to the `MiniAppBridgeSDK`
 * definitions for consistent runtime execution across Android APK/AAB and PWA.
 *
 * @param appId Identifier of the active Mini App (defaults to `'superapp-host'`)
 */
export function useNativeBridge(appId = 'superapp-host'): NativeBridgePluginControllers {
  const superApp = useSuperApp();

  const platformInfo = useMemo<PlatformRuntimeInfo>(
    () => nativeBridgeService.getPlatformInfo(),
    []
  );

  // ---------------------------------------------------------------------------
  // 1. Haptics (@capacitor/haptics -> MiniAppBridgeSDK.ui.hapticFeedback)
  // ---------------------------------------------------------------------------
  const triggerHaptics = useCallback(
    async (
      pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
    ): Promise<void> => {
      if (superApp.settings.hapticsEnabled === false) return;

      try {
        if (Capacitor.isNativePlatform()) {
          if (pattern === 'success') {
            await Haptics.notification({ type: NotificationType.Success });
            return;
          }
          if (pattern === 'warning') {
            await Haptics.notification({ type: NotificationType.Warning });
            return;
          }
          if (pattern === 'error') {
            await Haptics.notification({ type: NotificationType.Error });
            return;
          }
          const impactStyle =
            pattern === 'heavy'
              ? ImpactStyle.Heavy
              : pattern === 'medium'
                ? ImpactStyle.Medium
                : ImpactStyle.Light;
          await Haptics.impact({ style: impactStyle });
          return;
        }
      } catch {
        // Fallback to nativeBridgeService Web Vibration implementation
      }

      await nativeBridgeService.triggerHaptics(pattern);
    },
    [superApp.settings.hapticsEnabled]
  );

  const hapticsController = useMemo(
    () => ({
      impact: (pattern: 'light' | 'medium' | 'heavy' = 'light') => triggerHaptics(pattern),
      notification: (type: 'success' | 'warning' | 'error' = 'success') => triggerHaptics(type),
      trigger: triggerHaptics,
    }),
    [triggerHaptics]
  );

  // ---------------------------------------------------------------------------
  // 2. StatusBar (@capacitor/status-bar)
  // ---------------------------------------------------------------------------
  const statusBarController = useMemo(
    () => ({
      setStyle: async (isDark: boolean): Promise<void> => {
        if (!Capacitor.isNativePlatform()) return;
        try {
          await StatusBar.setStyle({
            style: isDark ? StatusBarStyle.Dark : StatusBarStyle.Light,
          });
        } catch {
          // Ignore on unsupported webviews
        }
      },
      setBackgroundColor: async (color: string): Promise<void> => {
        if (typeof document !== 'undefined') {
          const metaTheme = document.querySelector('meta[name="theme-color"]');
          if (metaTheme) metaTheme.setAttribute('content', color);
        }
        if (!Capacitor.isNativePlatform()) return;
        try {
          await StatusBar.setBackgroundColor({ color });
        } catch {
          // Ignore on web
        }
      },
      setVisible: async (visible: boolean): Promise<void> => {
        if (!Capacitor.isNativePlatform()) return;
        try {
          if (visible) {
            await StatusBar.show();
          } else {
            await StatusBar.hide();
          }
        } catch {
          // Ignore on web
        }
      },
      syncWithTheme: async (options: {
        isDark: boolean;
        backgroundColor: string;
        visible?: boolean;
      }): Promise<void> => {
        await nativeBridgeService.syncStatusBar({
          isDark: options.isDark,
          backgroundColor: options.backgroundColor,
          visible: options.visible ?? superApp.settings.showStatusBar,
        });
      },
    }),
    [superApp.settings.showStatusBar]
  );

  // ---------------------------------------------------------------------------
  // 3. SplashScreen (@capacitor/splash-screen)
  // ---------------------------------------------------------------------------
  const splashScreenController = useMemo(
    () => ({
      show: async (autoHideDurationMs = 1000): Promise<void> => {
        if (!Capacitor.isNativePlatform()) return;
        try {
          await SplashScreen.show({
            showDuration: autoHideDurationMs,
            autoHide: true,
            fadeInDuration: 150,
            fadeOutDuration: 200,
          });
        } catch {
          // Ignore on web
        }
      },
      hide: async (fadeOutDurationMs = 250): Promise<void> => {
        if (!Capacitor.isNativePlatform()) return;
        try {
          await SplashScreen.hide({ fadeOutDuration: fadeOutDurationMs });
        } catch {
          // Ignore on web
        }
      },
    }),
    []
  );

  // ---------------------------------------------------------------------------
  // 4. Toast (@capacitor/toast -> MiniAppBridgeSDK.ui.showToast)
  // ---------------------------------------------------------------------------
  const showMappedToast = useCallback(
    async (
      message: string,
      type: 'info' | 'success' | 'warning' | 'error' = 'info',
      duration: 'short' | 'long' = 'short'
    ): Promise<void> => {
      // Always trigger the SuperApp HUD toast for rich visual feedback
      superApp.showToast(message, type);

      // Additionally invoke native Capacitor Android/iOS OS Toast when running on native hardware
      if (Capacitor.isNativePlatform()) {
        try {
          await Toast.show({
            text: message,
            duration,
            position: 'bottom',
          });
        } catch {
          // Fallback already handled by SuperApp HUD toast
        }
      }
    },
    [superApp]
  );

  const toastController = useMemo(
    () => ({
      show: showMappedToast,
    }),
    [showMappedToast]
  );

  // ---------------------------------------------------------------------------
  // 5. Camera & QR Scanner (@capacitor/camera -> MiniAppBridgeSDK.device.capturePhoto / scanQRCode)
  // ---------------------------------------------------------------------------
  const capturePhotoWithPermission = useCallback(async (): Promise<{
    dataUrl: string;
    format: string;
  } | null> => {
    const allowed = await superApp.requestPermission(appId, 'camera');
    if (!allowed) return null;

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      });

      if (photo.dataUrl) {
        return {
          dataUrl: photo.dataUrl,
          format: photo.format || 'jpeg',
        };
      }
    } catch {
      // Fallback to nativeBridgeService capturePhoto if Camera.getPhoto was cancelled or unsupported
      return nativeBridgeService.capturePhoto();
    }

    return null;
  }, [appId, superApp]);

  const scanQRCodeWithPermission = useCallback(async (): Promise<QrScanPayload | null> => {
    const allowed = await superApp.requestPermission(appId, 'camera');
    if (!allowed) return null;
    return superApp.openQRScanner();
  }, [appId, superApp]);

  const cameraController = useMemo(
    () => ({
      capturePhoto: capturePhotoWithPermission,
      scanQRCode: scanQRCodeWithPermission,
    }),
    [capturePhotoWithPermission, scanQRCodeWithPermission]
  );

  // ---------------------------------------------------------------------------
  // 6. Biometrics (Hardware Biometric Enclave / WebAuthn -> MiniAppBridgeSDK.device.authenticateBiometrics)
  // ---------------------------------------------------------------------------
  const authenticateBiometricsWithPermission = useCallback(
    async (reason = `Authorize action in ${appId}`): Promise<boolean> => {
      const allowed = await superApp.requestPermission(appId, 'biometrics');
      if (!allowed) return false;
      return superApp.requestBiometricAuth(reason);
    },
    [appId, superApp]
  );

  const biometricsController = useMemo(
    () => ({
      authenticate: authenticateBiometricsWithPermission,
      verifyHardwareEnclave: () => nativeBridgeService.verifyHardwareBiometrics(),
    }),
    [authenticateBiometricsWithPermission]
  );

  // ---------------------------------------------------------------------------
  // 7. Build Bound MiniAppBridgeSDK with Mapped Capacitor Plugins
  // ---------------------------------------------------------------------------
  const sdk = useMemo<MiniAppBridgeSDK>(() => {
    const baseSdk = createMiniAppSDK(appId, {
      ...superApp,
      showToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        void showMappedToast(msg, type);
      },
      hapticFeedback: (
        pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
      ) => {
        void triggerHaptics(pattern);
      },
      requestBiometricAuth: authenticateBiometricsWithPermission,
      openQRScanner: scanQRCodeWithPermission,
    });

    return {
      ...baseSdk,
      ui: {
        ...baseSdk.ui,
        showToast: (msg: string, type = 'info') => {
          void showMappedToast(msg, type);
        },
        hapticFeedback: (pattern = 'light') => {
          void triggerHaptics(pattern);
        },
      },
      device: {
        ...baseSdk.device,
        hasPermission: (perm: MiniAppPermission) => {
          const perms = superApp.grantedPermissions[appId] || [];
          return perms.includes(perm);
        },
        requestPermission: (perm: MiniAppPermission) => superApp.requestPermission(appId, perm),
        getPlatformInfo: () => ({
          platform: platformInfo.platform,
          isNative: platformInfo.isNative,
          isStandalonePWA: platformInfo.isStandalonePWA,
        }),
        authenticateBiometrics: authenticateBiometricsWithPermission,
        scanQRCode: scanQRCodeWithPermission,
        capturePhoto: capturePhotoWithPermission,
      },
    };
  }, [
    appId,
    superApp,
    showMappedToast,
    triggerHaptics,
    authenticateBiometricsWithPermission,
    scanQRCodeWithPermission,
    capturePhotoWithPermission,
    platformInfo,
  ]);

  // Synchronize the native Android/iOS StatusBar & SplashScreen whenever the active Mini App or theme changes
  useEffect(() => {
    void statusBarController.syncWithTheme({
      isDark: sdk.theme.isDark,
      backgroundColor: sdk.theme.tokens.bgBase,
      visible: superApp.settings.showStatusBar,
    });
    void splashScreenController.hide(200);
  }, [
    sdk.theme.isDark,
    sdk.theme.tokens.bgBase,
    superApp.settings.showStatusBar,
    statusBarController,
    splashScreenController,
  ]);

  return {
    platformInfo,
    haptics: hapticsController,
    statusBar: statusBarController,
    splashScreen: splashScreenController,
    toast: toastController,
    camera: cameraController,
    biometrics: biometricsController,
    sdk,
  };
}
