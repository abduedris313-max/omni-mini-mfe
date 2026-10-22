import React, { useState, useEffect } from 'react';
import { MiniAppBridgeSDK } from '../../types/miniapp';
import {
  Boxes,
  UserCheck,
  Wallet,
  Database,
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Palette,
  Bell,
  Fingerprint,
  Lock,
  Unlock,
  KeyRound,
  Activity,
  Play,
  Pause,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface StarterMiniAppProps {
  /** Injected Super App Bridge SDK instance */
  sdk: MiniAppBridgeSDK;
}

interface StarterTodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface LifecycleLogEntry {
  id: string;
  event: 'onStart' | 'onPause';
  timestamp: string;
  note: string;
}

/**
 * StarterMiniApp — Official Reference Mini App Component
 *
 * Demonstrates:
 * 1. `sdk.auth`      — Reading shared Super App user session
 * 2. `sdk.theme`     — Consuming dynamic host/custom theme tokens
 * 3. `sdk.storage`   — Isolated per-app persistent key-value storage
 * 4. `sdk.settings`  — Reading & updating pluggable Super App settings
 * 5. `sdk.payment`   — Processing instant checkouts via Super App Wallet
 * 6. `sdk.device`    — Biometric ('biometrics') Secure Login & sandbox permissions
 * 7. `sdk.onStart` / `sdk.onPause` — Lifecycle management & auto-locking sensitive state
 */
export const StarterMiniApp: React.FC<StarterMiniAppProps> = ({ sdk }) => {
  const { tokens } = sdk.theme;
  const user = sdk.auth.getUser();
  const pluggableSettings = sdk.settings.getSettings();

  const greetingTitle =
    pluggableSettings.welcomeBannerText || 'Build Fast with OmniMini SDK';
  const showTelemetryFooter = pluggableSettings.enableDebugBanner !== false;
  const demoPrice = Number(pluggableSettings.sampleCheckoutAmount || 5);

  const [activeTab, setActiveTab] = useState<'overview' | 'storage' | 'wallet' | 'settings'>('overview');

  // Lifecycle state (onStart / onPause)
  const [lifecycleState, setLifecycleState] = useState<'active' | 'paused'>('active');
  const [lifecycleLogs, setLifecycleLogs] = useState<LifecycleLogEntry[]>([]);

  // Secure Login (Biometrics) state
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [isSecureVaultUnlocked, setIsSecureVaultUnlocked] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Scoped Storage Demo State
  const [items, setItems] = useState<StarterTodoItem[]>(() => {
    const saved = sdk.storage.getItem('starter_items');
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [
      {
        id: 'item-1',
        text: 'Fork src/templates/miniAppStarter',
        completed: true,
        createdAt: 'Just now',
      },
      {
        id: 'item-2',
        text: 'Test Biometrics Secure Login vault',
        completed: false,
        createdAt: 'Just now',
      },
      {
        id: 'item-3',
        text: 'Inspect onStart & onPause lifecycle hooks',
        completed: false,
        createdAt: 'Just now',
      },
    ];
  });
  const [newItemText, setNewItemText] = useState('');
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  // Register onStart and onPause lifecycle listeners
  useEffect(() => {
    const unsubscribeStart = sdk.onStart(() => {
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLifecycleState('active');
      setLifecycleLogs((prev) =>
        [
          {
            id: `lc-start-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            event: 'onStart' as const,
            timestamp: now,
            note: 'Mini App entered foreground / active state',
          },
          ...prev,
        ].slice(0, 8)
      );
    });

    const unsubscribePause = sdk.onPause(() => {
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLifecycleState('paused');
      // Automatically lock the biometric sensitive area when mini app pauses
      setIsSecureVaultUnlocked(false);
      setShowSecretKey(false);
      setLifecycleLogs((prev) =>
        [
          {
            id: `lc-pause-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            event: 'onPause' as const,
            timestamp: now,
            note: 'Mini App paused (auto-locked sensitive vault)',
          },
          ...prev,
        ].slice(0, 8)
      );
    });

    return () => {
      unsubscribeStart();
      unsubscribePause();
    };
  }, [sdk]);

  useEffect(() => {
    sdk.storage.setItem('starter_items', items);
  }, [items, sdk.storage]);

  const handleBiometricUnlock = async () => {
    sdk.ui.hapticFeedback('medium');
    let hasPerm = sdk.device.hasPermission('biometrics');
    if (!hasPerm) {
      hasPerm = await sdk.device.requestPermission('biometrics');
    }

    if (!hasPerm) {
      sdk.ui.showToast('Biometrics permission is required for Secure Login', 'error');
      return;
    }

    setIsBiometricScanning(true);
    setTimeout(() => {
      setIsBiometricScanning(false);
      setIsSecureVaultUnlocked(true);
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast('Biometric Face ID / Touch ID verified!', 'success');
    }, 650);
  };

  const handleLockVault = () => {
    setIsSecureVaultUnlocked(false);
    setShowSecretKey(false);
    sdk.ui.hapticFeedback('light');
    sdk.ui.showToast('Sensitive area locked', 'info');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const next: StarterTodoItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setItems((prev) => [next, ...prev]);
    setNewItemText('');
    sdk.ui.hapticFeedback('light');
    sdk.ui.showToast('Saved to isolated mini app storage', 'success');
  };

  const handleToggleItem = (id: string) => {
    sdk.ui.hapticFeedback('light');
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    sdk.ui.hapticFeedback('medium');
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSampleCheckout = async () => {
    sdk.ui.hapticFeedback('medium');
    const confirmed = await sdk.ui.requestConfirm(
      'Authorize Mini App Payment',
      `Charge $${demoPrice.toFixed(2)} from your shared Super App Wallet for Starter Pro Unlock?`
    );
    if (!confirmed) return;

    const result = await sdk.payment.pay(
      demoPrice,
      'Starter Mini App — Pro Feature Unlock'
    );
    if (result.success) {
      setLastReceipt(result.txId || `tx-${Date.now()}`);
      sdk.ui.hapticFeedback('success');
    }
  };

  const handleRequestNotificationPerm = async () => {
    const granted = await sdk.device.requestPermission('notifications');
    if (granted) {
      sdk.ui.showToast('Notification permission granted to StarterKit!', 'success');
    } else {
      sdk.ui.showToast('Notification permission denied', 'warning');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-20" style={{ color: tokens.textPrimary }}>
      {/* Hero Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${tokens.accentPrimary}, ${tokens.accentHover})`,
          boxShadow: `0 8px 24px ${tokens.accentGlow}`,
          color: '#ffffff',
        }}
        className="rounded-3xl p-5 space-y-2 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
            Mini App Starter v1.0
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                lifecycleState === 'active'
                  ? 'bg-emerald-400/25 text-emerald-100'
                  : 'bg-amber-400/25 text-amber-100'
              }`}
            >
              {lifecycleState === 'active' ? '● onStart Active' : '❚❚ onPause'}
            </span>
            <Boxes className="w-5 h-5 opacity-90" />
          </div>
        </div>
        <h2 className="text-lg font-black tracking-tight">{greetingTitle}</h2>
        <p className="text-xs opacity-90 leading-relaxed">
          Reference micro-frontend template located at{' '}
          <code className="font-mono bg-black/25 px-1.5 py-0.5 rounded">
            src/templates/miniAppStarter
          </code>
          .
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-2xl border"
        style={{
          backgroundColor: tokens.bgSurface,
          borderColor: tokens.borderDefault,
        }}
      >
        {[
          { id: 'overview', label: 'Bridge', icon: Sparkles },
          { id: 'storage', label: 'Storage', icon: Database },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'settings', label: 'Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                sdk.ui.hapticFeedback('light');
              }}
              style={{
                backgroundColor: active ? tokens.accentPrimary : 'transparent',
                color: active ? tokens.accentContrast : tokens.textSecondary,
              }}
              className="py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BRIDGE OVERVIEW (Auth, Secure Login Biometrics, Lifecycle Hooks) */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* SECURE LOGIN SECTION ('biometrics' permission) */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: isSecureVaultUnlocked ? '#10b981' : tokens.borderDefault,
            }}
            className="p-4 rounded-2xl border space-y-3 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Fingerprint
                  className="w-4 h-4"
                  style={{ color: isSecureVaultUnlocked ? '#10b981' : tokens.accentPrimary }}
                />
                <span>Secure Login Vault (`biometrics`)</span>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isSecureVaultUnlocked
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {isSecureVaultUnlocked ? (
                  <>
                    <Unlock className="w-2.5 h-2.5" />
                    <span>Unlocked</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-2.5 h-2.5" />
                    <span>Locked</span>
                  </>
                )}
              </span>
            </div>

            {!isSecureVaultUnlocked ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: tokens.textSecondary }}>
                  This sensitive area requires the sandboxed <code>biometrics</code> permission to unlock encrypted credentials. Automatically locks on <code>onPause</code>.
                </p>

                <button
                  type="button"
                  disabled={isBiometricScanning}
                  onClick={handleBiometricUnlock}
                  style={{
                    backgroundColor: tokens.accentPrimary,
                    color: tokens.accentContrast,
                    boxShadow: `0 4px 12px ${tokens.accentGlow}`,
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ios-active"
                >
                  <Fingerprint className={`w-4 h-4 ${isBiometricScanning ? 'animate-pulse' : ''}`} />
                  <span>
                    {isBiometricScanning
                      ? 'Verifying Biometrics...'
                      : 'Unlock with Biometrics'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                <div
                  style={{
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-3 rounded-xl border space-y-2 font-mono text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-sans font-bold text-emerald-400">
                      <KeyRound className="w-3 h-3" />
                      <span>Decrypted Sandbox Credentials</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="text-[10px] flex items-center gap-1 opacity-80 hover:opacity-100"
                      style={{ color: tokens.accentPrimary }}
                    >
                      {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSecretKey ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </div>
                  <div className="text-[10px] space-y-1" style={{ color: tokens.textSecondary }}>
                    <div>
                      <strong>Signing Key:</strong>{' '}
                      {showSecretKey
                        ? 'omk_live_98f72a4c11e90b3d7f61'
                        : '••••••••••••••••••••••••'}
                    </div>
                    <div>
                      <strong>Vault Enclave:</strong> Verified via Host Biometrics Bridge
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLockVault}
                  style={{
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ios-active"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Lock Sensitive Area</span>
                </button>
              </div>
            )}
          </div>

          {/* LIFECYCLE MANAGEMENT SECTION (sdk.onStart & sdk.onPause) */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-4 rounded-2xl border space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Activity className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
                <span>Lifecycle Listeners (`onStart` / `onPause`)</span>
              </span>
              <span className="text-[10px] font-mono" style={{ color: tokens.textMuted }}>
                {lifecycleLogs.length} events
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sdk.lifecycle.triggerStart();
                  sdk.ui.hapticFeedback('light');
                }}
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ios-active"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Emit onStart()</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sdk.lifecycle.triggerPause();
                  sdk.ui.hapticFeedback('light');
                }}
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ios-active"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Emit onPause()</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
              {lifecycleLogs.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-2 rounded-xl border flex items-center justify-between text-[10px] font-mono"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        entry.event === 'onStart'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {entry.event}
                    </span>
                    <span className="truncate font-sans" style={{ color: tokens.textSecondary }}>
                      {entry.note}
                    </span>
                  </div>
                  <span className="shrink-0 ml-2" style={{ color: tokens.textMuted }}>
                    {entry.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Auth Session Card */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-4 rounded-2xl border space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
                <span>Shared Super App Auth (`sdk.auth`)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                SSO Active
              </span>
            </div>
            <div className="text-xs space-y-1" style={{ color: tokens.textSecondary }}>
              <div>
                <strong>User:</strong> {user?.name || 'Guest Explorer'}
              </div>
              <div>
                <strong>Email:</strong> {user?.email || 'Not signed in'}
              </div>
              <div>
                <strong>Role:</strong>{' '}
                <span className="uppercase font-mono text-[10px]">{user?.role || 'consumer'}</span>
              </div>
            </div>
          </div>

          {/* Native UI & Permissions Bridge */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-4 rounded-2xl border space-y-3"
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
              <span>Native Bridge & Permissions (`sdk.ui` / `sdk.device`)</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sdk.ui.hapticFeedback('success');
                  sdk.ui.showToast('Hello from StarterMiniApp!', 'success');
                }}
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ios-active"
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
                <span>Toast + Haptic</span>
              </button>

              <button
                type="button"
                onClick={handleRequestNotificationPerm}
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ios-active"
              >
                <Bell className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
                <span>Request Perm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCOPED STORAGE CRUD */}
      {activeTab === 'storage' && (
        <div
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-4 rounded-2xl border space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Database className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
              <span>Sandboxed Storage (`sdk.storage`)</span>
            </span>
            <span className="text-[10px] font-mono" style={{ color: tokens.textMuted }}>
              {items.length} records
            </span>
          </div>

          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add checklist item to sandboxed storage..."
              style={{
                backgroundColor: tokens.bgInput,
                borderColor: tokens.borderDefault,
                color: tokens.textPrimary,
              }}
              className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none"
            />
            <button
              type="submit"
              style={{
                backgroundColor: tokens.accentPrimary,
                color: tokens.accentContrast,
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ios-active"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                }}
                className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => handleToggleItem(item.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      item.completed ? 'text-emerald-400' : 'opacity-40'
                    }`}
                  />
                  <span
                    className={`text-xs truncate ${
                      item.completed ? 'line-through opacity-60' : 'font-medium'
                    }`}
                  >
                    {item.text}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 text-rose-400 hover:opacity-80"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SHARED WALLET CHECKOUT */}
      {activeTab === 'wallet' && (
        <div
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-4 rounded-2xl border space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Wallet className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
              <span>Super App Wallet (`sdk.payment`)</span>
            </span>
            <span className="text-xs font-extrabold text-emerald-400">
              Balance: ${sdk.payment.getBalance().toFixed(2)}
            </span>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: tokens.textSecondary }}>
            Mini apps can charge the user’s shared wallet with a single async call without handling raw card credentials.
          </p>

          <button
            type="button"
            onClick={handleSampleCheckout}
            style={{
              backgroundColor: tokens.accentPrimary,
              color: tokens.accentContrast,
              boxShadow: `0 4px 12px ${tokens.accentGlow}`,
            }}
            className="w-full py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ios-active"
          >
            Test Checkout (${demoPrice.toFixed(2)})
          </button>

          {lastReceipt && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono">
              ✓ Receipt ID: {lastReceipt}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PLUGGABLE SETTINGS LIVE SYNC */}
      {activeTab === 'settings' && (
        <div
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-4 rounded-2xl border space-y-3"
        >
          <span className="text-xs font-bold flex items-center gap-1.5">
            <Sliders className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
            <span>Pluggable Settings (`sdk.settings`)</span>
          </span>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold block" style={{ color: tokens.textSecondary }}>
              Custom Greeting Title
            </label>
            <input
              type="text"
              value={greetingTitle}
              onChange={(e) => sdk.settings.updateSetting('welcomeBannerText', e.target.value)}
              style={{
                backgroundColor: tokens.bgInput,
                borderColor: tokens.borderDefault,
                color: tokens.textPrimary,
              }}
              className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium">Show Telemetry Footer</span>
            <input
              type="checkbox"
              checked={showTelemetryFooter}
              onChange={(e) => sdk.settings.updateSetting('enableDebugBanner', e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Optional Bridge Telemetry Footer */}
      {showTelemetryFooter && (
        <div
          style={{
            backgroundColor: tokens.bgSurface,
            borderColor: tokens.borderDefault,
            color: tokens.textMuted,
          }}
          className="p-3 rounded-2xl border flex items-center justify-between text-[10px] font-mono"
        >
          <span className="flex items-center gap-1">
            <Palette className="w-3 h-3" style={{ color: tokens.accentPrimary }} />
            <span>Theme: {sdk.theme.presetName}</span>
          </span>
          <span>Lifecycle: {lifecycleState.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
};
