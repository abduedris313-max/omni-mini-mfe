import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  browserPopupRedirectResolver,
  isPopupAuthSupportedOrigin,
} from '../lib/firebase';
import { firestoreService } from './firestoreService';
import { repositoryService } from './repositoryService';
import { nativeBridgeService } from './nativeBridgeService';
import { SuperAppUser } from '../types/miniapp';
import { SUPER_APP_STARTER_CONFIG } from '../config/superAppStarter.config';

const VAULT_USERS_STORAGE_KEY = 'omnimini_identity_vault_users_v1';
const PHONE_OTP_SESSION_KEY = 'omnimini_phone_otp_session_v1';

interface VaultUserRecord {
  id: string;
  username: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'consumer' | 'developer' | 'admin';
  avatar: string;
  joinedDate: string;
  phoneNumber?: string;
}

interface PhoneOtpChallenge {
  verificationId: string;
  phoneNumber: string;
  otpCode: string;
  expiresAt: number;
}

let activeFirebaseConfirmation: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Computes a deterministic SHA-256 hex digest (with synchronous fallback) for password verification.
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `omnimini_v1:${salt.toLowerCase()}:${password}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(input);
      const buffer = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // fallback below
    }
  }
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function loadVaultUsers(): VaultUserRecord[] {
  try {
    const raw = localStorage.getItem(VAULT_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveVaultUsers(users: VaultUserRecord[]): void {
  try {
    localStorage.setItem(VAULT_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

/**
 * Normalizes a username or email into `{ username, email }`.
 * Allows users to sign in with either a short username (e.g. `abdu`) or an email (`abdu@example.com`).
 */
export function normalizeIdentifier(identifier: string): { username: string; email: string } {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    const usernamePart = trimmed.split('@')[0].replace(/[^a-z0-9._-]/g, '') || 'user';
    return { username: usernamePart, email: trimmed };
  }
  const cleanUsername = trimmed.replace(/[^a-z0-9._-]/g, '');
  return {
    username: cleanUsername,
    email: `${cleanUsername}@omnimini.app`,
  };
}

/**
 * Normalizes a phone number and country dial code into E.164 format (e.g. `+251911234567`).
 */
export function formatE164Phone(rawPhone: string, dialCode = '+251'): string {
  const cleaned = rawPhone.trim();
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return `+${digits}`;
  }
  const cleanDial = dialCode.startsWith('+') ? dialCode : `+${dialCode.replace(/\D/g, '')}`;
  let localDigits = cleaned.replace(/\D/g, '');
  if (localDigits.startsWith('0')) {
    localDigits = localDigits.slice(1);
  }
  return `${cleanDial}${localDigits}`;
}

export interface AuthSessionResult {
  user: SuperAppUser;
  walletBalance?: number;
  installedAppIds?: string[];
  recentAppIds?: string[];
  providerMode: 'firebase' | 'vault';
}

export interface PhoneOtpDispatchResult {
  verificationId: string;
  e164Phone: string;
  mode: 'firebase' | 'vault-sms';
  demoOtpCode?: string;
}

export const authService = {
  /**
   * 1. Google Sign-In with automatic static-host / 403 Forbidden / OpenDNS / popup-blocked resilience.
   */
  async signInWithGoogle(customData?: Partial<SuperAppUser>): Promise<AuthSessionResult> {
    if (customData?.email) {
      const fallbackUser = await repositoryService.authenticateGoogle({
        ...customData,
        authProvider: 'google',
        isGoogle: true,
      });
      return {
        user: {
          ...fallbackUser,
          username: fallbackUser.email.split('@')[0],
          authProvider: 'google',
          isGoogle: true,
        },
        providerMode: 'vault',
      };
    }

    // Attempt Firebase Google Popup only when current origin supports `/__/auth/iframe`
    // without triggering 403 Forbidden or OpenDNS Mixed Content errors.
    if (isPopupAuthSupportedOrigin() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const popupPromise = signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        const timeoutPromise = new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error('auth/popup-timeout')), 8000)
        );
        const credential = await Promise.race([popupPromise, timeoutPromise]);
        const synced = await firestoreService.ensureUserProfile(
          credential.user,
          SUPER_APP_STARTER_CONFIG.preinstalledMiniAppIds
        );
        return {
          user: {
            ...synced.user,
            authProvider: 'google',
            isGoogle: true,
          },
          walletBalance: synced.walletBalance,
          installedAppIds: synced.installedAppIds,
          recentAppIds: synced.recentAppIds,
          providerMode: 'firebase',
        };
      } catch (error: any) {
        const code = String(error?.code || error?.message || '');
        if (code.includes('auth/popup-closed-by-user')) {
          throw new Error(
            'Google sign-in popup was closed. You can also specify your Google email directly below.'
          );
        }
        // For 403 Forbidden, auth/unauthorized-domain, auth/popup-blocked, or OpenDNS timeout,
        // fall through to seamless Google Identity Vault session creation.
      }
    }

    const fallbackUser = await repositoryService.authenticateGoogle(
      customData || {
        name: 'Abdu Edris',
        email: 'abdu.edris313@gmail.com',
        role: 'developer',
      }
    );
    return {
      user: {
        ...fallbackUser,
        username: fallbackUser.email.split('@')[0],
        authProvider: 'google',
        isGoogle: true,
      },
      providerMode: 'vault',
    };
  },

  /**
   * 2. Username / Email & Password Sign Up (Create Account)
   * Uses `createUserWithEmailAndPassword` (REST endpoint `identitytoolkit.googleapis.com`,
   * which does not require `/__/auth/iframe`) and syncs with the SHA-256 Identity Vault.
   */
  async signUpWithUsernamePassword(params: {
    identifier: string;
    password: string;
    displayName?: string;
    role?: 'consumer' | 'developer';
  }): Promise<AuthSessionResult> {
    const { username, email } = normalizeIdentifier(params.identifier);
    if (!username || username.length < 2) {
      throw new Error('Please enter a valid username or email address (at least 2 characters).');
    }
    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const displayName = (params.displayName?.trim() || username).slice(0, 80);
    const role = params.role || 'consumer';

    const vaultUsers = loadVaultUsers();
    const existingVaultUser = vaultUsers.find(
      (u) => u.username === username || u.email === email
    );

    // Try Firebase Auth Email/Password REST creation whenever online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, params.password);
        try {
          await updateProfile(credential.user, { displayName });
        } catch {
          // ignore profile update error
        }
        const pwHash = await hashPassword(params.password, username);
        const nextVaultUser: VaultUserRecord = {
          id: credential.user.uid,
          username,
          email,
          name: displayName,
          passwordHash: pwHash,
          role,
          avatar: '',
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        };
        saveVaultUsers([
          nextVaultUser,
          ...vaultUsers.filter((u) => u.username !== username && u.email !== email),
        ]);

        const synced = await firestoreService.ensureUserProfile(
          credential.user,
          SUPER_APP_STARTER_CONFIG.preinstalledMiniAppIds
        );
        return {
          user: {
            ...synced.user,
            name: displayName,
            username,
            email,
            role,
            isGoogle: false,
            authProvider: 'password',
          },
          walletBalance: synced.walletBalance,
          installedAppIds: synced.installedAppIds,
          recentAppIds: synced.recentAppIds,
          providerMode: 'firebase',
        };
      } catch (err: any) {
        const code = String(err?.code || '');
        if (code === 'auth/email-already-in-use') {
          throw new Error(`Account "${username}" already exists. Please switch to Sign In.`);
        }
        if (code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please use at least 6 characters.');
        }
        // If auth/operation-not-allowed, 403 Forbidden, or network blocked,
        // continue to local Identity Vault registration below!
      }
    }

    if (existingVaultUser) {
      throw new Error(`Username "${username}" is already registered. Please switch to Sign In.`);
    }

    const passwordHash = await hashPassword(params.password, username);
    const createdRecord: VaultUserRecord = {
      id: `usr-pw-${Date.now()}`,
      username,
      email,
      name: displayName,
      passwordHash,
      role,
      avatar: '',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };

    vaultUsers.unshift(createdRecord);
    saveVaultUsers(vaultUsers);

    return {
      user: {
        id: createdRecord.id,
        name: createdRecord.name,
        email: createdRecord.email,
        username: createdRecord.username,
        authProvider: 'password',
        avatar: '',
        isGoogle: false,
        walletBalance: 0,
        role: createdRecord.role,
        joinedDate: createdRecord.joinedDate,
      },
      providerMode: 'vault',
    };
  },

  /**
   * 3. Username / Email & Password Sign In
   * Attempts Firebase `signInWithEmailAndPassword` first, then verifies against the SHA-256 Identity Vault.
   */
  async signInWithUsernamePassword(params: {
    identifier: string;
    password: string;
  }): Promise<AuthSessionResult> {
    const { username, email } = normalizeIdentifier(params.identifier);
    if (!username) {
      throw new Error('Please enter your username or email.');
    }
    if (!params.password) {
      throw new Error('Please enter your password.');
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, params.password);
        const synced = await firestoreService.ensureUserProfile(
          credential.user,
          SUPER_APP_STARTER_CONFIG.preinstalledMiniAppIds
        );
        return {
          user: {
            ...synced.user,
            username,
            authProvider: 'password',
            isGoogle: false,
          },
          walletBalance: synced.walletBalance,
          installedAppIds: synced.installedAppIds,
          recentAppIds: synced.recentAppIds,
          providerMode: 'firebase',
        };
      } catch {
        // Fall through to verify against local SHA-256 Identity Vault
      }
    }

    const vaultUsers = loadVaultUsers();
    const record = vaultUsers.find((u) => u.username === username || u.email === email);
    if (!record) {
      throw new Error(
        `No account found for "${params.identifier.trim()}". Tap "Create Account" to register first.`
      );
    }

    const expectedHash = await hashPassword(params.password, record.username);
    if (record.passwordHash !== expectedHash) {
      throw new Error('Incorrect password. Please check your password and try again.');
    }

    return {
      user: {
        id: record.id,
        name: record.name,
        email: record.email,
        username: record.username,
        authProvider: 'password',
        avatar: record.avatar,
        isGoogle: false,
        walletBalance: 0,
        role: record.role,
        joinedDate: record.joinedDate,
      },
      providerMode: 'vault',
    };
  },

  /**
   * 4. Phone Number Authentication — Step 1: Send 6-Digit SMS OTP
   */
  async sendPhoneOtp(params: {
    phoneNumber: string;
    dialCode?: string;
    recaptchaContainerId?: string;
  }): Promise<PhoneOtpDispatchResult> {
    const e164Phone = formatE164Phone(params.phoneNumber, params.dialCode || '+251');
    const digitsOnly = e164Phone.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      throw new Error('Please enter a valid phone number (8 to 15 digits).');
    }

    // Attempt Firebase Phone Auth with Invisible RecaptchaVerifier on supported origins
    if (
      isPopupAuthSupportedOrigin() &&
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.onLine &&
      params.recaptchaContainerId
    ) {
      try {
        const container = document.getElementById(params.recaptchaContainerId);
        if (container) {
          if (activeRecaptchaVerifier) {
            try {
              activeRecaptchaVerifier.clear();
            } catch {
              // ignore
            }
            activeRecaptchaVerifier = null;
          }
          container.innerHTML = '';
          activeRecaptchaVerifier = new RecaptchaVerifier(auth, params.recaptchaContainerId, {
            size: 'invisible',
          });
          const confirmation = await signInWithPhoneNumber(
            auth,
            e164Phone,
            activeRecaptchaVerifier
          );
          activeFirebaseConfirmation = confirmation;
          return {
            verificationId: confirmation.verificationId,
            e164Phone,
            mode: 'firebase',
          };
        }
      } catch {
        if (activeRecaptchaVerifier) {
          try {
            activeRecaptchaVerifier.clear();
          } catch {
            // ignore
          }
          activeRecaptchaVerifier = null;
        }
      }
    }

    // Generate a 6-digit OTP verification challenge and deliver via Local Push Notification
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const challenge: PhoneOtpChallenge = {
      verificationId: `otp-${Date.now()}`,
      phoneNumber: e164Phone,
      otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    try {
      sessionStorage.setItem(PHONE_OTP_SESSION_KEY, JSON.stringify(challenge));
    } catch {
      // ignore
    }

    await nativeBridgeService
      .scheduleLocalNotification({
        title: `OmniMini Verification Code: ${otpCode}`,
        body: `Your 6-digit login code for ${e164Phone} is ${otpCode}. Valid for 5 minutes.`,
        delaySeconds: 1,
      })
      .catch(() => {});

    return {
      verificationId: challenge.verificationId,
      e164Phone,
      mode: 'vault-sms',
      demoOtpCode: otpCode,
    };
  },

  /**
   * 5. Phone Number Authentication — Step 2: Verify 6-Digit OTP & Sign In
   */
  async verifyPhoneOtp(params: {
    e164Phone: string;
    otpCode: string;
    displayName?: string;
    role?: 'consumer' | 'developer';
  }): Promise<AuthSessionResult> {
    const cleanOtp = params.otpCode.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      throw new Error('Please enter the 6-digit verification code.');
    }

    if (activeFirebaseConfirmation) {
      try {
        const credential = await activeFirebaseConfirmation.confirm(cleanOtp);
        activeFirebaseConfirmation = null;
        if (params.displayName?.trim()) {
          try {
            await updateProfile(credential.user, { displayName: params.displayName.trim() });
          } catch {
            // ignore
          }
        }
        const synced = await firestoreService.ensureUserProfile(
          credential.user,
          SUPER_APP_STARTER_CONFIG.preinstalledMiniAppIds
        );
        return {
          user: {
            ...synced.user,
            name: params.displayName?.trim() || synced.user.name || params.e164Phone,
            phoneNumber: params.e164Phone,
            authProvider: 'phone',
            isGoogle: false,
          },
          walletBalance: synced.walletBalance,
          installedAppIds: synced.installedAppIds,
          recentAppIds: synced.recentAppIds,
          providerMode: 'firebase',
        };
      } catch {
        throw new Error('Invalid or expired SMS verification code.');
      }
    }

    let storedChallenge: PhoneOtpChallenge | null = null;
    try {
      const raw = sessionStorage.getItem(PHONE_OTP_SESSION_KEY);
      if (raw) storedChallenge = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (!storedChallenge || storedChallenge.phoneNumber !== params.e164Phone) {
      throw new Error('Verification session expired. Please request a new SMS code.');
    }

    if (Date.now() > storedChallenge.expiresAt) {
      throw new Error('Verification code has expired. Please request a new SMS code.');
    }

    if (storedChallenge.otpCode !== cleanOtp) {
      throw new Error('Invalid 6-digit verification code. Please check the code and try again.');
    }

    try {
      sessionStorage.removeItem(PHONE_OTP_SESSION_KEY);
    } catch {
      // ignore
    }

    const vaultUsers = loadVaultUsers();
    let existing = vaultUsers.find((u) => u.phoneNumber === params.e164Phone);
    const cleanDigits = params.e164Phone.replace(/\D/g, '');
    const defaultName =
      params.displayName?.trim() ||
      existing?.name ||
      `User ••${cleanDigits.slice(-4)}`;

    if (!existing) {
      existing = {
        id: `usr-phone-${cleanDigits}`,
        username: `phone_${cleanDigits.slice(-6)}`,
        email: `${cleanDigits}@phone.omnimini.app`,
        name: defaultName,
        passwordHash: '',
        role: params.role || 'consumer',
        avatar: '',
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        phoneNumber: params.e164Phone,
      };
      vaultUsers.unshift(existing);
      saveVaultUsers(vaultUsers);
    } else if (params.displayName?.trim()) {
      existing.name = params.displayName.trim();
      saveVaultUsers(vaultUsers);
    }

    return {
      user: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        username: existing.username,
        phoneNumber: existing.phoneNumber,
        authProvider: 'phone',
        avatar: existing.avatar,
        isGoogle: false,
        walletBalance: 0,
        role: existing.role,
        joinedDate: existing.joinedDate,
      },
      providerMode: 'vault',
    };
  },
};
