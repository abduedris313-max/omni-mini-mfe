import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

describe('OmniMini Super App Firestore Security Rules — Dirty Dozen Red Team Suite', () => {
  beforeAll(async () => {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'device-streaming-cb1b795c',
      firestore: { rules },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  const getVerifiedContext = (uid: string, email = `${uid}@example.com`) =>
    testEnv.authenticatedContext(uid, { email, email_verified: true });

  const getUnverifiedContext = (uid: string, email = `${uid}@example.com`) =>
    testEnv.authenticatedContext(uid, { email, email_verified: false });

  it('1. Rejects Shadow Field Injection on UserProfile (Ghost Field)', async () => {
    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'consumer',
        walletBalance: 0,
        installedAppIds: ['paypulse-wallet'],
        recentAppIds: [],
        isVerifiedAdmin: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('2. Rejects Self-Assigned Admin Role on UserProfile', async () => {
    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'admin',
        walletBalance: 0,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('3. Rejects Identity Spoofing (uid mismatch with request.auth.uid)', async () => {
    const attackerDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      setDoc(doc(attackerDb, 'users/user_123'), {
        uid: 'victim_999',
        name: 'Attacker',
        avatar: '',
        role: 'consumer',
        walletBalance: 0,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('4. Rejects Unverified Email Write Attempt (email_verified == false)', async () => {
    const unverifiedDb = getUnverifiedContext('user_123').firestore();
    await assertFails(
      setDoc(doc(unverifiedDb, 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'consumer',
        walletBalance: 0,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('5. Rejects Cross-User PII Read on /users/{victim}/private/info', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'users/victim_999'), {
        uid: 'victim_999',
        name: 'Victim',
        avatar: '',
        role: 'consumer',
        walletBalance: 0,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'users/victim_999/private/info'), {
        uid: 'victim_999',
        email: 'victim@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const attackerDb = getVerifiedContext('user_123').firestore();
    await assertFails(getDoc(doc(attackerDb, 'users/victim_999/private/info')));
  });

  it('6. Rejects Unbounded Array Resource Exhaustion on installedAppIds (> 10 items)', async () => {
    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'consumer',
        walletBalance: 0,
        installedAppIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11'],
        recentAppIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('7. Rejects Client Timestamp Forgery (createdAt != request.time)', async () => {
    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'consumer',
        walletBalance: 0,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: new Date('2020-01-01T00:00:00Z'),
        updatedAt: new Date('2020-01-01T00:00:00Z'),
      })
    );
  });

  it('8. Rejects Orphaned Subcollection Write when Parent UserProfile Does Not Exist', async () => {
    const orphanDb = getVerifiedContext('user_no_profile').firestore();
    await assertFails(
      setDoc(doc(orphanDb, 'users/user_no_profile/transactions/tx_1'), {
        id: 'tx_1',
        userId: 'user_no_profile',
        appId: 'paypulse-wallet',
        appName: 'PayPulse Wallet',
        amount: 25,
        type: 'credit',
        description: 'Top-Up',
        status: 'completed',
        timestamp: 'Oct 22, 14:00',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('9. Rejects Immutable Field Mutation (createdAt modified during UserProfile update)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'consumer',
        walletBalance: 0,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });
    });

    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'users/user_123'), {
        name: 'Alice Updated',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('10. Rejects Terminal Ledger Mutation on Completed WalletTransaction', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'consumer',
        walletBalance: 50,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'users/user_123/transactions/tx_1'), {
        id: 'tx_1',
        userId: 'user_123',
        appId: 'paypulse-wallet',
        appName: 'PayPulse Wallet',
        amount: 50,
        type: 'credit',
        description: 'Top-Up',
        status: 'completed',
        timestamp: 'Oct 22',
        createdAt: new Date(),
      });
    });

    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'users/user_123/transactions/tx_1'), {
        amount: 999999,
      })
    );
  });

  it('11. Rejects Value Poisoning on Whitelisted Update Field (negative walletBalance)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/user_123'), {
        uid: 'user_123',
        name: 'Alice',
        avatar: '',
        role: 'consumer',
        walletBalance: 50,
        installedAppIds: [],
        recentAppIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'users/user_123'), {
        walletBalance: -500,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('12. Rejects Terminal State Bypass on Archived MiniAppCatalogItem', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'miniapps/app_1'), {
        id: 'app_1',
        ownerId: 'user_123',
        name: 'Archived App',
        shortName: 'Archived',
        version: '1.0.0',
        category: 'utilities',
        icon: 'Sparkles',
        iconBg: '#3b82f6',
        gradient: 'from-blue-600 to-indigo-600',
        summary: 'Summary',
        description: 'Description',
        authorName: 'Alice',
        rating: 5,
        reviewCount: 0,
        downloadCount: 0,
        sizeKb: 64,
        permissions: ['storage'],
        status: 'archived',
        entrypoint: 'DynamicApp',
        releaseNotes: 'Initial',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const aliceDb = getVerifiedContext('user_123').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'miniapps/app_1'), {
        version: '2.0.0',
        releaseNotes: 'Try reviving archived app',
        updatedAt: serverTimestamp(),
      })
    );
  });
});
