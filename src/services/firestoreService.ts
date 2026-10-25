import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError, isStaticHostEnvironment } from '../lib/firebase';
import { MiniAppManifest, SuperAppUser } from '../types/miniapp';

// Blueprint validation constants & regex guards synced with firebase-blueprint.json & firestore.rules
export const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const MAX_ID_LENGTH = 128;
export const MAX_NAME_LENGTH = 80;
export const MAX_AVATAR_LENGTH = 500;
export const MAX_EMAIL_LENGTH = 160;
export const MAX_LIST_SIZE = 10;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_APP_SUMMARY_LENGTH = 160;
export const MAX_APP_DESCRIPTION_LENGTH = 1000;
export const MAX_RELEASE_NOTES_LENGTH = 500;

export function sanitizeId(raw: string, fallbackPrefix = 'item'): string {
  const cleaned = (raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, MAX_ID_LENGTH);
  return cleaned.length >= 1 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

export function sanitizeBoundedStringList(items: string[]): string[] {
  return (items || [])
    .map((item) => sanitizeId(item))
    .filter((item) => VALID_ID_PATTERN.test(item))
    .slice(0, MAX_LIST_SIZE);
}

export interface FirestoreWalletTransaction {
  id: string;
  userId: string;
  appId: string;
  appName: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  status: 'completed';
  timestamp: string;
}

export const firestoreService = {
  /**
   * Ensures the authenticated user's profile (`/users/{uid}`) and isolated PII (`/users/{uid}/private/info`)
   * exist in Firestore, returning the hydrated SuperAppUser and state.
   */
  async ensureUserProfile(
    firebaseUser: User,
    defaultInstalledApps: string[]
  ): Promise<{
    user: SuperAppUser;
    walletBalance: number;
    installedAppIds: string[];
    recentAppIds: string[];
  }> {
    const uid = sanitizeId(firebaseUser.uid, 'usr');
    const providerIds = (firebaseUser.providerData || []).map((p) => p.providerId);
    const isPhoneUser = providerIds.includes('phone') || Boolean(firebaseUser.phoneNumber && !firebaseUser.email);
    const isGoogleUser = providerIds.includes('google.com');
    const authProvider: 'google' | 'password' | 'phone' = isPhoneUser
      ? 'phone'
      : isGoogleUser
        ? 'google'
        : 'password';

    const rawName = (
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      firebaseUser.phoneNumber ||
      'Authenticated User'
    ).trim();
    const safeName = rawName.slice(0, MAX_NAME_LENGTH) || 'User';
    const safeAvatar = (firebaseUser.photoURL || '').slice(0, MAX_AVATAR_LENGTH);
    const safeEmail = (
      firebaseUser.email ||
      (firebaseUser.phoneNumber
        ? `${firebaseUser.phoneNumber.replace(/[^0-9]/g, '')}@phone.omnimini.app`
        : 'user@omnimini.app')
    ).slice(0, MAX_EMAIL_LENGTH);
    const safeInstalled = sanitizeBoundedStringList(defaultInstalledApps);

    const fallbackProfile = {
      user: {
        id: uid,
        name: safeName,
        email: safeEmail,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        username: firebaseUser.email ? firebaseUser.email.split('@')[0] : undefined,
        authProvider,
        avatar: safeAvatar,
        isGoogle: isGoogleUser,
        walletBalance: 0,
        role: 'consumer' as const,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      },
      walletBalance: 0,
      installedAppIds: safeInstalled,
      recentAppIds: [] as string[],
    };

    if (isStaticHostEnvironment() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return fallbackProfile;
    }

    const userDocRef = doc(db, 'users', uid);
    const privateDocRef = doc(db, 'users', uid, 'private', 'info');

    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('network')) {
        return fallbackProfile;
      }
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }

    if (!userSnap.exists()) {
      // Only verified email users can write to cloud Firestore according to zero-trust security rules
      if (firebaseUser.emailVerified) {
        const batch = writeBatch(db);
        batch.set(userDocRef, {
          uid,
          name: safeName,
          avatar: safeAvatar,
          role: 'consumer',
          walletBalance: 0,
          installedAppIds: safeInstalled,
          recentAppIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(privateDocRef, {
          uid,
          email: safeEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        try {
          await batch.commit();
        } catch (error) {
          const msg = error instanceof Error ? error.message.toLowerCase() : '';
          if (!msg.includes('offline') && !msg.includes('unavailable')) {
            handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
          }
        }
      }

      return fallbackProfile;
    }

    const data = userSnap.data();
    let email = safeEmail;
    try {
      const privSnap = await getDoc(privateDocRef);
      if (privSnap.exists() && typeof privSnap.data().email === 'string') {
        email = privSnap.data().email;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (!msg.includes('offline') && !msg.includes('unavailable')) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}/private/info`);
      }
    }

    const walletBalance = typeof data.walletBalance === 'number' ? data.walletBalance : 0;
    const role = data.role === 'developer' ? 'developer' : 'consumer';
    const installedAppIds = Array.isArray(data.installedAppIds)
      ? sanitizeBoundedStringList(data.installedAppIds)
      : safeInstalled;
    const recentAppIds = Array.isArray(data.recentAppIds)
      ? sanitizeBoundedStringList(data.recentAppIds)
      : [];

    return {
      user: {
        id: uid,
        name: typeof data.name === 'string' ? data.name : safeName,
        email,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        username: email.split('@')[0],
        authProvider,
        avatar: typeof data.avatar === 'string' ? data.avatar : safeAvatar,
        isGoogle: isGoogleUser,
        walletBalance,
        role,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      },
      walletBalance,
      installedAppIds,
      recentAppIds,
    };
  },

  /**
   * Updates user's wallet balance (Action 2 in firestore.rules)
   */
  async updateWalletBalance(uid: string, newBalance: number): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const safeBalance = Math.max(0, Math.min(1000000, Number(newBalance.toFixed(2))));
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        walletBalance: safeBalance,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Updates user's installed and recent Mini App IDs (Action 3 in firestore.rules)
   */
  async updateUserAppLists(uid: string, installedAppIds: string[], recentAppIds: string[]): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        installedAppIds: sanitizeBoundedStringList(installedAppIds),
        recentAppIds: sanitizeBoundedStringList(recentAppIds),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Updates user profile & setup wizard preferences (Action 4 in firestore.rules)
   */
  async updateFullUserOnboarding(
    uid: string,
    payload: {
      name: string;
      avatar: string;
      role: 'consumer' | 'developer';
      walletBalance: number;
      installedAppIds: string[];
      recentAppIds: string[];
    }
  ): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        name: (payload.name || 'User').trim().slice(0, MAX_NAME_LENGTH),
        avatar: (payload.avatar || '').slice(0, MAX_AVATAR_LENGTH),
        role: payload.role === 'developer' ? 'developer' : 'consumer',
        walletBalance: Math.max(0, Math.min(1000000, Number(payload.walletBalance.toFixed(2)))),
        installedAppIds: sanitizeBoundedStringList(payload.installedAppIds),
        recentAppIds: sanitizeBoundedStringList(payload.recentAppIds),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Records an immutable wallet transaction in `/users/{uid}/transactions/{txId}`
   */
  async recordTransaction(tx: FirestoreWalletTransaction): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const safeTxId = sanitizeId(tx.id, 'tx');
    const safeUserId = sanitizeId(tx.userId, 'usr');
    const path = `users/${safeUserId}/transactions/${safeTxId}`;

    try {
      await setDoc(doc(db, 'users', safeUserId, 'transactions', safeTxId), {
        id: safeTxId,
        userId: safeUserId,
        appId: sanitizeId(tx.appId, 'app'),
        appName: (tx.appName || 'Mini App').trim().slice(0, MAX_NAME_LENGTH),
        amount: Math.max(0.01, Math.min(1000000, Number(tx.amount.toFixed(2)))),
        type: tx.type === 'debit' ? 'debit' : 'credit',
        description: (tx.description || 'Wallet Transaction').trim().slice(0, MAX_DESCRIPTION_LENGTH),
        status: 'completed',
        timestamp: (tx.timestamp || 'Just now').slice(0, 64),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  /**
   * Updates an existing wallet transaction in `/users/{uid}/transactions/{txId}`
   */
  async updateTransaction(
    uid: string,
    txId: string,
    updates: { amount: number; type: 'debit' | 'credit'; description: string; timestamp?: string }
  ): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const safeUserId = sanitizeId(uid, 'usr');
    const safeTxId = sanitizeId(txId, 'tx');
    const path = `users/${safeUserId}/transactions/${safeTxId}`;

    try {
      const ref = doc(db, 'users', safeUserId, 'transactions', safeTxId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      await updateDoc(ref, {
        amount: Math.max(0.01, Math.min(1000000, Number(updates.amount.toFixed(2)))),
        type: updates.type === 'debit' ? 'debit' : 'credit',
        description: (updates.description || 'Wallet Transaction').trim().slice(0, MAX_DESCRIPTION_LENGTH),
        ...(updates.timestamp ? { timestamp: updates.timestamp.slice(0, 64) } : {}),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Deletes a wallet transaction from `/users/{uid}/transactions/{txId}`
   */
  async deleteTransaction(uid: string, txId: string): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const safeUserId = sanitizeId(uid, 'usr');
    const safeTxId = sanitizeId(txId, 'tx');
    const path = `users/${safeUserId}/transactions/${safeTxId}`;

    try {
      await deleteDoc(doc(db, 'users', safeUserId, 'transactions', safeTxId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Subscribes to the authenticated user's wallet transactions in real-time
   */
  subscribeUserTransactions(
    uid: string,
    onData: (txs: FirestoreWalletTransaction[]) => void
  ): Unsubscribe {
    const safeUserId = sanitizeId(uid, 'usr');
    const path = `users/${safeUserId}/transactions`;
    const q = query(
      collection(db, 'users', safeUserId, 'transactions'),
      where('userId', '==', safeUserId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const items: FirestoreWalletTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          items.push({
            id: d.id,
            userId: d.userId,
            appId: d.appId,
            appName: d.appName,
            amount: d.amount,
            type: d.type,
            description: d.description,
            status: 'completed',
            timestamp: d.timestamp,
          });
        });
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  /**
   * Fetches published custom Mini Apps from `/miniapps`
   */
  async getPublishedMiniApps(): Promise<MiniAppManifest[]> {
    const path = 'miniapps';
    try {
      const q = query(collection(db, 'miniapps'), where('status', '==', 'published'));
      const snap = await getDocs(q);
      const list: MiniAppManifest[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: d.id,
          name: d.name,
          shortName: d.shortName,
          version: d.version,
          category: d.category,
          icon: d.icon,
          iconBg: d.iconBg,
          gradient: d.gradient,
          summary: d.summary,
          description: d.description,
          author: {
            name: d.authorName,
            email: '',
            verified: true,
          },
          rating: d.rating,
          reviewCount: d.reviewCount,
          downloadCount: d.downloadCount,
          sizeKb: d.sizeKb,
          permissions: Array.isArray(d.permissions) ? d.permissions : ['storage'],
          status: d.status,
          pluggableSettingsSchema: [],
          entrypoint: d.entrypoint || 'DynamicApp',
          screenshots: [],
          releaseNotes: d.releaseNotes,
          updatedAt: new Date().toISOString().split('T')[0],
        });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  /**
   * Publishes a custom Mini App to `/miniapps/{appId}` when user is authenticated & verified
   */
  async publishMiniAppToFirestore(manifest: MiniAppManifest): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const safeAppId = sanitizeId(manifest.id, 'miniapp');
    const path = `miniapps/${safeAppId}`;

    try {
      await setDoc(doc(db, 'miniapps', safeAppId), {
        id: safeAppId,
        ownerId: sanitizeId(auth.currentUser.uid, 'usr'),
        name: (manifest.name || 'Mini App').trim().slice(0, MAX_NAME_LENGTH),
        shortName: (manifest.shortName || manifest.name || 'App').trim().slice(0, 24),
        version: (manifest.version || '1.0.0').trim().slice(0, 24),
        category: manifest.category || 'utilities',
        icon: (manifest.icon || 'Sparkles').trim().slice(0, 40),
        iconBg: (manifest.iconBg || '#3b82f6').trim().slice(0, 24),
        gradient: (manifest.gradient || 'from-blue-600 to-indigo-600').trim().slice(0, 80),
        summary: (manifest.summary || 'Custom Mini App').trim().slice(0, MAX_APP_SUMMARY_LENGTH),
        description: (manifest.description || manifest.summary || 'Custom Mini App').trim().slice(0, MAX_APP_DESCRIPTION_LENGTH),
        authorName: (manifest.author?.name || auth.currentUser.displayName || 'Developer').trim().slice(0, MAX_NAME_LENGTH),
        rating: 5,
        reviewCount: 0,
        downloadCount: 0,
        sizeKb: Math.max(1, Math.min(102400, Math.round(manifest.sizeKb || 64))),
        permissions: sanitizeBoundedStringList(manifest.permissions || ['storage']),
        status: 'published',
        entrypoint: (manifest.entrypoint || 'DynamicApp').trim().slice(0, 64),
        releaseNotes: (manifest.releaseNotes || 'Initial release').trim().slice(0, MAX_RELEASE_NOTES_LENGTH),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  /**
   * Updates version & release notes of a published Mini App (Action 1 in firestore.rules)
   */
  async updateMiniAppVersionInFirestore(
    appId: string,
    newVersion: string,
    releaseNotes: string
  ): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const safeAppId = sanitizeId(appId, 'miniapp');
    const path = `miniapps/${safeAppId}`;

    try {
      const snap = await getDoc(doc(db, 'miniapps', safeAppId));
      if (!snap.exists()) return;
      await updateDoc(doc(db, 'miniapps', safeAppId), {
        version: (newVersion || '1.0.1').trim().slice(0, 24),
        releaseNotes: (releaseNotes || 'Updated version').trim().slice(0, MAX_RELEASE_NOTES_LENGTH),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};
