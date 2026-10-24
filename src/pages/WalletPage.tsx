import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { nativeBridgeService } from '../services/nativeBridgeService';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  PieChart,
  Landmark,
  QrCode,
  Camera,
  Share2,
} from 'lucide-react';

export const WalletPage: React.FC = () => {
  const {
    user,
    settings,
    walletBalance,
    transactions,
    topUpWallet,
    openMiniApp,
    grantedPermissions,
    revokePermission,
    availableApps,
    showToast,
    hapticFeedback,
    themeTokens,
    requestBiometricAuth,
    openQRScanner,
    sendLocalNotification,
  } = useSuperApp();

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  // Read FinTrack shared balance metadata if synced
  const finTrackSharedSummary = (() => {
    try {
      const raw = localStorage.getItem('miniapp_store_fintrack-budget_fintrack_shared_wallet_summary');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const handleTopUpConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }

    setTopUpModalOpen(false);

    if (settings.biometricAuth) {
      const verified = await requestBiometricAuth(
        `Authorize $${amt.toFixed(2)} deposit to your OmniMini Shared Wallet`
      );
      if (!verified) return;
    }

    topUpWallet(amt);
    hapticFeedback('success');
    await sendLocalNotification(
      'Wallet Top-Up Confirmed',
      `+$${amt.toFixed(2)} credited to your OmniMini Shared Wallet.`,
      1
    );
  };

  return (
    <div
      className="p-4 space-y-5 pb-28 transition-colors duration-200"
      style={{ color: themeTokens.textPrimary }}
    >
      {/* Header */}
      <div className="space-y-1">
        <span
          className="text-[11px] font-bold uppercase tracking-widest transition-colors"
          style={{ color: themeTokens.accentPrimary }}
        >
          Shared Micro Services
        </span>
        <h1
          className="text-2xl font-black tracking-tight"
          style={{ color: themeTokens.textPrimary }}
        >
          Wallet & Activity
        </h1>
      </div>

      {/* Main Balance Card with Brand Accent Gradient */}
      <div
        style={{
          background: `linear-gradient(135deg, ${themeTokens.accentPrimary}, ${themeTokens.accentHover})`,
          boxShadow: `0 8px 24px ${themeTokens.accentGlow}`,
          color: '#ffffff',
        }}
        className="rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-200"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
              Unified Super App Balance
            </span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums">
              {finTrackSharedSummary?.baseCurrency === 'ETB'
                ? `ETB ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `$${walletBalance.toFixed(2)}`}
            </div>
            {finTrackSharedSummary && (
              <div className="text-[11px] opacity-90 tabular-nums">
                Synced from FinTrack ({finTrackSharedSummary.sharedAccountsCount} shared{' '}
                {finTrackSharedSummary.sharedAccountsCount === 1 ? 'account' : 'accounts'} · ETB{' '}
                {Number(finTrackSharedSummary.totalInEtb || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                )
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 pt-3 border-t border-white/20">
          <button
            onClick={() => {
              setTopUpModalOpen(true);
              hapticFeedback('light');
            }}
            className="py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-sm hover:bg-slate-100 transition flex items-center justify-center gap-1.5 ios-active"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Top Up Balance</span>
          </button>
          <button
            onClick={() => {
              openQRScanner('scan');
            }}
            className="py-2.5 rounded-xl bg-black/25 text-white font-bold text-xs hover:bg-black/35 transition flex items-center justify-center gap-1.5 ios-active"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan & Pay QR</span>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            onClick={() => openQRScanner('receive')}
            className="py-2 rounded-xl bg-black/20 text-white font-semibold text-[11px] hover:bg-black/30 transition flex items-center justify-center gap-1 ios-active"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Receive QR</span>
          </button>
          <button
            onClick={async () => {
              hapticFeedback('light');
              await nativeBridgeService.shareContent({
                title: 'OmniMini Wallet Payment Link',
                text: `Send payment to ${user?.name || 'my OmniMini Wallet'}`,
                url: `omnimini://pay?to=${encodeURIComponent(user?.name || 'OmniMini User')}&amount=25.00&currency=USD`,
              });
              showToast('Payment link shared', 'success');
            }}
            className="py-2 rounded-xl bg-black/20 text-white font-semibold text-[11px] hover:bg-black/30 transition flex items-center justify-center gap-1 ios-active"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Link</span>
          </button>
          <button
            onClick={() => {
              openMiniApp('fintrack-budget');
              hapticFeedback('light');
            }}
            className="py-2 rounded-xl bg-black/20 text-white font-semibold text-[11px] hover:bg-black/30 transition flex items-center justify-center gap-1 ios-active"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>FinTrack</span>
          </button>
        </div>
      </div>

      {/* FinTrack Shared Multi-Account Summary Card */}
      {finTrackSharedSummary && (
        <div
          style={{
            backgroundColor: themeTokens.bgCard,
            borderColor: themeTokens.borderDefault,
          }}
          className="p-4 rounded-2xl border flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate" style={{ color: themeTokens.textPrimary }}>
                FinTrack Shared Bank & Wallet Bridge
              </h4>
              <p className="text-[11px] truncate" style={{ color: themeTokens.textSecondary }}>
                {Array.isArray(finTrackSharedSummary.accountNames) &&
                finTrackSharedSummary.accountNames.length > 0
                  ? finTrackSharedSummary.accountNames.join(' · ')
                  : 'No shared accounts selected'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-extrabold tabular-nums text-teal-400">
              ETB{' '}
              {Number(finTrackSharedSummary.totalInEtb || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[10px]" style={{ color: themeTokens.textMuted }}>
              {finTrackSharedSummary.sharedAccountsCount} linked
            </div>
          </div>
        </div>
      )}

      {/* Cross-Mini-App Transaction Feed */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: themeTokens.textMuted }}
          >
            Cross-App Transactions
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: themeTokens.textMuted }}
          >
            {transactions.length} records
          </span>
        </div>

        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div
              style={{
                backgroundColor: themeTokens.bgCard,
                borderColor: themeTokens.borderDefault,
              }}
              className="p-6 rounded-2xl border text-center space-y-1.5 backdrop-blur-md"
            >
              <Wallet
                className="w-6 h-6 mx-auto opacity-50"
                style={{ color: themeTokens.textMuted }}
              />
              <p className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                No Transactions Recorded Yet
              </p>
              <p className="text-[11px]" style={{ color: themeTokens.textSecondary }}>
                Top up your unified balance or complete a checkout inside any mini app to view activity here.
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  backgroundColor: themeTokens.bgCard,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 backdrop-blur-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      tx.type === 'credit'
                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                    }`}
                  >
                    {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>

                  <div>
                    <h4
                      className="text-xs font-bold"
                      style={{ color: themeTokens.textPrimary }}
                    >
                      {tx.appName}
                    </h4>
                    <p
                      className="text-[11px] line-clamp-1"
                      style={{ color: themeTokens.textSecondary }}
                    >
                      {tx.description}
                    </p>
                    <span
                      className="text-[10px]"
                      style={{ color: themeTokens.textMuted }}
                    >
                      {tx.timestamp}
                    </span>
                  </div>
                </div>

                <div
                  className={`text-xs font-mono font-bold ${
                    tx.type === 'credit' ? 'text-emerald-500' : ''
                  }`}
                  style={tx.type !== 'credit' ? { color: themeTokens.textPrimary } : undefined}
                >
                  {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Centralized Permission Access Control */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck
              className="w-3.5 h-3.5"
              style={{ color: themeTokens.accentPrimary }}
            />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: themeTokens.textMuted }}
            >
              Sandbox Permissions
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(grantedPermissions).map(([appId, perms]) => {
            const app = availableApps.find((a) => a.id === appId);
            return (
              <div
                key={appId}
                style={{
                  backgroundColor: themeTokens.bgCard,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-3.5 rounded-2xl border space-y-2 backdrop-blur-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4
                    className="text-xs font-bold"
                    style={{ color: themeTokens.textPrimary }}
                  >
                    {app?.name || appId}
                  </h4>
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: themeTokens.textMuted }}
                  >
                    {perms.length} active
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {perms.map((perm) => (
                    <span
                      key={perm}
                      style={{
                        backgroundColor: themeTokens.bgSurface,
                        borderColor: themeTokens.borderDefault,
                        color: themeTokens.textSecondary,
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1.5 border"
                    >
                      <span className="capitalize">{perm}</span>
                      <button
                        onClick={() => revokePermission(appId, perm)}
                        className="hover:text-rose-500 transition"
                        title="Revoke permission"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Up Modal Sheet */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div
            style={{
              backgroundColor: themeTokens.bgCard,
              borderColor: themeTokens.borderDefault,
              color: themeTokens.textPrimary,
            }}
            className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl relative"
          >
            <h3
              className="text-base font-bold"
              style={{ color: themeTokens.textPrimary }}
            >
              Top Up Shared Wallet
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{ color: themeTokens.textSecondary }}
            >
              Instant credit via Google Pay or Apple Pay
            </p>

            <form onSubmit={handleTopUpConfirm} className="mt-4 space-y-4">
              <div>
                <label
                  className="text-[11px] font-semibold"
                  style={{ color: themeTokens.textSecondary }}
                >
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="5"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                {[20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopUpAmount(preset.toFixed(2))}
                    style={{
                      backgroundColor: themeTokens.bgSurface,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border hover:opacity-80 transition"
                  >
                    +${preset}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTopUpModalOpen(false)}
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textSecondary,
                  }}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: themeTokens.accentPrimary,
                    color: themeTokens.accentContrast,
                    boxShadow: `0 4px 12px ${themeTokens.accentGlow}`,
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition shadow-md"
                >
                  Confirm Top Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
