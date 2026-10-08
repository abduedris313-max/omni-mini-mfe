import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Layers,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const WalletPage: React.FC = () => {
  const {
    walletBalance,
    transactions,
    topUpWallet,
    grantedPermissions,
    revokePermission,
    availableApps,
    showToast,
    hapticFeedback,
  } = useSuperApp();

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50.00');

  const handleTopUpConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }

    topUpWallet(amt);
    setTopUpModalOpen(false);
    hapticFeedback('success');
  };

  return (
    <div className="p-4 space-y-5 text-slate-100 pb-28">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">Shared Micro Services</span>
        <h1 className="text-2xl font-black text-white tracking-tight">Wallet & Activity</h1>
      </div>

      {/* Main Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-700 p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Unified Super App Balance</span>
            <div className="text-3xl font-extrabold tracking-tight">${walletBalance.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="mt-5 flex gap-2 pt-3 border-t border-white/20">
          <button
            onClick={() => {
              setTopUpModalOpen(true);
              hapticFeedback('light');
            }}
            className="flex-1 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-sm hover:bg-slate-100 transition flex items-center justify-center gap-1.5 ios-active"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Top Up Balance</span>
          </button>
        </div>
      </div>

      {/* Cross-Mini-App Transaction Feed */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cross-App Transactions</span>
          <span className="text-[10px] text-slate-500 font-mono">{transactions.length} records</span>
        </div>

        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-3 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    tx.type === 'credit'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{tx.appName}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{tx.description}</p>
                  <span className="text-[10px] text-slate-500">{tx.timestamp}</span>
                </div>
              </div>

              <div className={`text-xs font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-slate-200'}`}>
                {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Centralized Permission Access Control */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sandbox Permissions</span>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(grantedPermissions).map(([appId, perms]) => {
            const app = availableApps.find((a) => a.id === appId);
            return (
              <div
                key={appId}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{app?.name || appId}</h4>
                  <span className="text-[10px] font-mono text-slate-500">{perms.length} active</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {perms.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 border border-slate-700/60"
                    >
                      <span className="capitalize">{perm}</span>
                      <button
                        onClick={() => revokePermission(appId, perm)}
                        className="text-slate-500 hover:text-rose-400"
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
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative">
            <h3 className="text-base font-bold text-white">Top Up Shared Wallet</h3>
            <p className="text-xs text-slate-400 mt-0.5">Instant credit via Google Pay or Apple Pay</p>

            <form onSubmit={handleTopUpConfirm} className="mt-4 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Amount ($)</label>
                <input
                  type="number"
                  step="5"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                {[20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopUpAmount(preset.toFixed(2))}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                  >
                    +${preset}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTopUpModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-md shadow-blue-600/30"
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
