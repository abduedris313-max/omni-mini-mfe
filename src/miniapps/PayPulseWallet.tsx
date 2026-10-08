import React, { useState } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  Send,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Sliders,
  DollarSign,
  Sparkles,
} from 'lucide-react';

interface PayPulseProps {
  sdk: MiniAppBridgeSDK;
}

export const PayPulseApp: React.FC<PayPulseProps> = ({ sdk }) => {
  const user = sdk.auth.getUser();
  const settings = sdk.settings.getSettings();
  const balance = sdk.payment.getBalance();

  const [sendAmount, setSendAmount] = useState('25.00');
  const [recipient, setRecipient] = useState('elena.rostova@omnimini.dev');
  const [showQR, setShowQR] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'cards'>('send');

  const currencySymbol = settings.defaultCurrency === 'EUR' ? '€' : settings.defaultCurrency === 'GBP' ? '£' : '$';

  const handleSend = async () => {
    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) {
      sdk.ui.showToast('Please enter a valid amount', 'warning');
      return;
    }

    if (amt > (settings.dailySpendingLimit || 1500)) {
      sdk.ui.showToast(`Amount exceeds daily spending limit of ${currencySymbol}${settings.dailySpendingLimit}`, 'error');
      return;
    }

    if (settings.requireBiometrics) {
      sdk.ui.hapticFeedback('medium');
      const confirmed = await sdk.ui.requestConfirm(
        'Face ID Verification',
        `Authorize transfer of ${currencySymbol}${amt.toFixed(2)} to ${recipient} via Face ID?`
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    sdk.ui.hapticFeedback('light');

    setTimeout(async () => {
      const res = await sdk.payment.pay(amt, `Transfer to ${recipient}`);
      setIsProcessing(false);
      if (res.success) {
        sdk.ui.showToast(`Sent ${currencySymbol}${amt.toFixed(2)} to ${recipient}`, 'success');
        sdk.ui.hapticFeedback('success');
        setSendAmount('');
      } else {
        sdk.ui.showToast(res.error || 'Payment failed', 'error');
      }
    }, 600);
  };

  return (
    <div
      className="p-4 space-y-4 pb-20 transition-colors"
      style={{
        color: sdk.theme.tokens.textPrimary,
      }}
    >
      {/* Theme Indicator Banner */}
      <div
        className="px-3 py-1.5 rounded-2xl flex items-center justify-between text-[11px] border backdrop-blur-md"
        style={{
          backgroundColor: sdk.theme.tokens.bgGlass,
          borderColor: sdk.theme.tokens.borderDefault,
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: sdk.theme.tokens.accentPrimary }}
          />
          <span style={{ color: sdk.theme.tokens.textSecondary }}>Theme:</span>
          <span className="font-bold" style={{ color: sdk.theme.tokens.textPrimary }}>
            {sdk.theme.presetName}
          </span>
        </span>
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: sdk.theme.tokens.accentMuted,
            color: sdk.theme.tokens.accentPrimary,
          }}
        >
          {sdk.theme.isInherited ? 'Inherited from Super App' : 'Custom Palette'}
        </span>
      </div>

      {/* Balance Card with dynamic theme styling */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 shadow-xl text-white transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${sdk.theme.tokens.accentPrimary}, ${sdk.theme.tokens.bgElevated})`,
          boxShadow: `0 12px 28px ${sdk.theme.tokens.accentGlow}`,
        }}
      >
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-white/80 font-medium">Shared Super App Wallet</span>
            <div className="text-3xl font-extrabold tracking-tight">
              {currencySymbol}{balance.toFixed(2)}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/15 text-xs text-white/90">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>{settings.requireBiometrics ? 'Biometrics Active' : 'Standard Security'}</span>
          </div>
          <div className="text-right">
            Limit: {currencySymbol}{settings.dailySpendingLimit || 1500}/day
          </div>
        </div>
      </div>

      {/* Segmented Tab Controls styled with theme */}
      <div
        className="flex p-1 rounded-2xl border transition-colors"
        style={{
          backgroundColor: sdk.theme.tokens.bgSurface,
          borderColor: sdk.theme.tokens.borderDefault,
        }}
      >
        <button
          onClick={() => { setActiveTab('send'); sdk.ui.hapticFeedback('light'); }}
          className="flex-1 py-2 text-xs font-semibold rounded-xl transition"
          style={{
            backgroundColor: activeTab === 'send' ? sdk.theme.tokens.accentPrimary : 'transparent',
            color: activeTab === 'send' ? sdk.theme.tokens.accentContrast : sdk.theme.tokens.textSecondary,
          }}
        >
          Send Money
        </button>
        <button
          onClick={() => { setActiveTab('receive'); sdk.ui.hapticFeedback('light'); }}
          className="flex-1 py-2 text-xs font-semibold rounded-xl transition"
          style={{
            backgroundColor: activeTab === 'receive' ? sdk.theme.tokens.accentPrimary : 'transparent',
            color: activeTab === 'receive' ? sdk.theme.tokens.accentContrast : sdk.theme.tokens.textSecondary,
          }}
        >
          Receive / QR
        </button>
        <button
          onClick={() => { setActiveTab('cards'); sdk.ui.hapticFeedback('light'); }}
          className="flex-1 py-2 text-xs font-semibold rounded-xl transition"
          style={{
            backgroundColor: activeTab === 'cards' ? sdk.theme.tokens.accentPrimary : 'transparent',
            color: activeTab === 'cards' ? sdk.theme.tokens.accentContrast : sdk.theme.tokens.textSecondary,
          }}
        >
          Pluggable Settings
        </button>
      </div>

      {activeTab === 'send' && (
        <div className="space-y-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 backdrop-blur-md">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            Instant Peer Transfer
          </h3>

          <div>
            <label className="text-xs text-slate-400 font-medium">Recipient Omni Tag or Email</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="user@omnimini.dev"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Transfer Amount ({currencySymbol})</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-base font-bold text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {[10, 25, 50, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setSendAmount(preset.toFixed(2)); sdk.ui.hapticFeedback('light'); }}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold text-slate-300 transition"
              >
                +{currencySymbol}{preset}
              </button>
            ))}
          </div>

          <button
            onClick={handleSend}
            disabled={isProcessing}
            className="w-full mt-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm text-white transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 ios-active"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authorizing...
              </span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Confirm Transfer {currencySymbol}{sendAmount}
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === 'receive' && (
        <div className="text-center space-y-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 p-6 backdrop-blur-md">
          <div className="mx-auto w-48 h-48 rounded-2xl bg-white p-4 flex flex-col items-center justify-center shadow-lg">
            <QrCode className="w-36 h-36 text-slate-950" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Scan to Pay {user?.name || 'OmniUser'}</h4>
            <p className="text-xs text-slate-400 font-mono">{user?.email || 'user@omnimini.dev'}</p>
          </div>
          <button
            onClick={() => {
              sdk.ui.showToast('Omni tag copied to clipboard', 'success');
              sdk.ui.hapticFeedback('light');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700"
          >
            Copy Payment Handle
          </button>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="space-y-3 rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Live Pluggable Settings
            </h3>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Syncs with Super App</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Require Biometrics</div>
              <div className="text-[11px] text-slate-400">Face ID confirmation before send</div>
            </div>
            <input
              type="checkbox"
              checked={!!settings.requireBiometrics}
              onChange={(e) => {
                sdk.settings.updateSetting('requireBiometrics', e.target.checked);
                sdk.ui.hapticFeedback('light');
              }}
              className="w-5 h-5 accent-blue-600 rounded"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-white">Daily Limit</span>
              <span className="font-mono text-blue-400">{currencySymbol}{settings.dailySpendingLimit || 1500}</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={settings.dailySpendingLimit || 1500}
              onChange={(e) => {
                sdk.settings.updateSetting('dailySpendingLimit', Number(e.target.value));
              }}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Display Currency</div>
              <div className="text-[11px] text-slate-400">Active base currency</div>
            </div>
            <select
              value={settings.defaultCurrency || 'USD'}
              onChange={(e) => {
                sdk.settings.updateSetting('defaultCurrency', e.target.value);
                sdk.ui.hapticFeedback('light');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-700 border border-slate-600 text-xs text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
