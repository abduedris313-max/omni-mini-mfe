# Firestore Zero-Trust Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Global Default-Deny Safety Net**: Every path not explicitly matched under `/databases/{database}/documents` is unconditionally denied (`allow read, write: if false;`).
2. **PII Split-Collection Isolation (Pillar 6)**:
   - Public-safe user state (`UserProfile`) is stored at `/users/{userId}` without any email or phone fields.
   - Sensitive user PII (`email`) is strictly isolated in `/users/{userId}/private/{docId}` (`docId == 'info'`), readable and writable **only** by the verified document owner (`request.auth.uid == userId`) or a verified admin (`isAdmin()`).
3. **Master Gate Relational Sync (Pillar 1 & Pillar 11)**:
   - Subcollections `/users/{userId}/private/{docId}` and `/users/{userId}/transactions/{transactionId}` require the parent `/users/{userId}` document to exist (`exists(/databases/$(database)/documents/users/$(userId))`) and its `uid` field to match `request.auth.uid` via `get()`.
   - Creating a `UserProfile` or `WalletTransaction` requires atomic or pre-existing parent validation.
4. **Anti-Update-Gap & Strict Schema Blueprints (Pillar 2)**:
   - Every `create` and `update` operation calls `isValidUserProfile`, `isValidUserPrivateInfo`, `isValidWalletTransaction`, or `isValidMiniAppCatalogItem` at the very start of the rule expression.
   - Exact key allowlists are enforced via `data.keys().hasAll([...]) && data.keys().hasOnly([...])`.
5. **Path Variable Hardening & Size Bounds (Pillar 3 & Pillar 5)**:
   - Every single-document operation (`get`, `create`, `update`, `delete`) validates path IDs via `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
   - All string fields enforce explicit `.size()` bounds matching `firebase-blueprint.json`.
   - All list fields (`installedAppIds`, `recentAppIds`, `permissions`) enforce `list.size() <= 10` and element type checks (`list.size() == 0 || list[0] is string`).
6. **Temporal Integrity & Immortal Fields (Pillar 12 & Pillar 13)**:
   - `createdAt == request.time` and `updatedAt == request.time` on `create`.
   - On `update`, `incoming().createdAt == existing().createdAt`, `incoming().uid == existing().uid` (or `ownerId`), and `incoming().updatedAt == request.time`.
7. **Terminal State Locking (Pillar 6 / Phase 4.6)**:
   - `WalletTransaction` entries are created with `status == 'completed'` and are strictly immutable (`allow update, delete: if false;`).
   - `MiniAppCatalogItem` entries with `existing().status == 'archived'` cannot be updated by non-admins.
8. **Secure List Queries (Pillar 8)**:
   - `allow list` on `/users/{userId}/transactions` strictly checks `resource.data.userId == request.auth.uid`.
   - `allow list` on `/miniapps` strictly checks `resource.data.status == 'published'`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

### Payload 1: Shadow Field Injection on `UserProfile` (`Ghost Field`)
```json
{
  "uid": "user_123",
  "name": "Alice",
  "avatar": "",
  "role": "consumer",
  "walletBalance": 0,
  "installedAppIds": ["paypulse-wallet"],
  "recentAppIds": [],
  "isVerifiedAdmin": true,
  "createdAt": "SERVER_TIMESTAMP",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Expected Result*: `PERMISSION_DENIED` (blocked by `data.keys().hasOnly(...)`).

### Payload 2: Privilege Escalation / Self-Assigned Admin Role on `UserProfile`
```json
{
  "uid": "user_123",
  "name": "Alice",
  "avatar": "",
  "role": "admin",
  "walletBalance": 0,
  "installedAppIds": [],
  "recentAppIds": [],
  "createdAt": "SERVER_TIMESTAMP",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Expected Result*: `PERMISSION_DENIED` (`role` enum only allows `'consumer'` or `'developer'`).

### Payload 3: Identity Spoofing (`uid` mismatch with `request.auth.uid`)
```json
{
  "uid": "victim_999",
  "name": "Attacker",
  "avatar": "",
  "role": "consumer",
  "walletBalance": 0,
  "installedAppIds": [],
  "recentAppIds": [],
  "createdAt": "SERVER_TIMESTAMP",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Expected Result*: `PERMISSION_DENIED` (`data.uid == request.auth.uid` fails).

### Payload 4: Unverified Email Write Attempt (`email_verified == false`)
Authenticated as `user_123` with `email_verified: false` attempting to create `/users/user_123`.
*Expected Result*: `PERMISSION_DENIED` (`isVerifiedUser()` requires `request.auth.token.email_verified == true`).

### Payload 5: Cross-User PII Read on `/users/victim_999/private/info`
Authenticated as `user_123` attempting `get` on `/users/victim_999/private/info`.
*Expected Result*: `PERMISSION_DENIED` (`isOwner(userId)` fails).

### Payload 6: Unbounded Array Resource Exhaustion on `installedAppIds` (11 items > max 10)
```json
{
  "uid": "user_123",
  "name": "Alice",
  "avatar": "",
  "role": "consumer",
  "walletBalance": 0,
  "installedAppIds": ["a1","a2","a3","a4","a5","a6","a7","a8","a9","a10","a11"],
  "recentAppIds": [],
  "createdAt": "SERVER_TIMESTAMP",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Expected Result*: `PERMISSION_DENIED` (`data.installedAppIds.size() <= 10` fails).

### Payload 7: Client Timestamp Forgery (`createdAt` != `request.time`)
```json
{
  "uid": "user_123",
  "name": "Alice",
  "avatar": "",
  "role": "consumer",
  "walletBalance": 0,
  "installedAppIds": [],
  "recentAppIds": [],
  "createdAt": "2020-01-01T00:00:00Z",
  "updatedAt": "2020-01-01T00:00:00Z"
}
```
*Expected Result*: `PERMISSION_DENIED` (`data.createdAt == request.time` fails).

### Payload 8: Orphaned Subcollection Write on `/users/user_no_profile/transactions/tx_1`
Authenticated as `user_no_profile` attempting to create a transaction before `/users/user_no_profile` exists.
*Expected Result*: `PERMISSION_DENIED` (Master Gate parent `exists()` check fails).

### Payload 9: Immutable Field Mutation (`createdAt` modified during `UserProfile` update)
Updating `/users/user_123` with a modified `createdAt` timestamp.
*Expected Result*: `PERMISSION_DENIED` (`incoming().createdAt == existing().createdAt` fails).

### Payload 10: Terminal Ledger Mutation (Attempting `update` on `/users/user_123/transactions/tx_1`)
```json
{
  "amount": 999999
}
```
*Expected Result*: `PERMISSION_DENIED` (transactions are strictly immutable once `completed`).

### Payload 11: Value Poisoning on Whitelisted Update Field (`walletBalance` set to string or negative number)
```json
{
  "walletBalance": -500,
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Expected Result*: `PERMISSION_DENIED` (`isValidUserProfile(incoming())` enforces `walletBalance >= 0 && walletBalance <= 1000000`).

### Payload 12: Terminal State Bypass on Archived `MiniAppCatalogItem`
Attempting to update `/miniapps/app_1` when `existing().status == 'archived'`.
*Expected Result*: `PERMISSION_DENIED` (terminal state lock blocks updates when `existing().status == 'archived'`).
