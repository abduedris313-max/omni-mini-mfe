import React, { useState, useEffect, useMemo } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Plus,
  Trash2,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export interface FinTrackEntry {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: 'Housing' | 'Dining' | 'Transit' | 'Subscriptions' | 'Shopping' | 'Income';
  date: string;
  settledViaWallet?: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
}

const DEFAULT_ENTRIES: FinTrackEntry[] = [];

const DEFAULT_GOALS: SavingsGoal[] = [];

const CATEGORY_COLORS: Record<FinTrackEntry['category'], string> = {
  Housing: '#6366f1',
  Dining: '#f59e0b',
  Transit: '#10b981',
  Subscriptions: '#ec4899',
  Shopping: '#06b6d4',
  Income: '#22c55e',
};

export const FinTrackApp: React.FC<{ sdk: MiniAppBridgeSDK }> = ({ sdk }) => {
  const { tokens } = sdk.theme;
  const settings = sdk.settings.getSettings();

  const monthlyBudgetLimit = Number(settings.monthlyBudgetLimit || 2500);
  const currencySymbol = String(settings.currencySymbol || '$');
  const alertThresholdPercent = Number(settings.alertThresholdPercent || 80);

  const [activeTab, setActiveTab] = useState<'ledger' | 'analytics' | 'goals' | 'add'>('ledger');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [hideBalances, setHideBalances] = useState<boolean>(Boolean(settings.privacyMaskDefault));

  const [entries, setEntries] = useState<FinTrackEntry[]>(() => {
    const saved = sdk.storage.getItem('fintrack_entries_v2');
    return Array.isArray(saved) ? saved : DEFAULT_ENTRIES;
  });

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const saved = sdk.storage.getItem('fintrack_goals_v2');
    return Array.isArray(saved) ? saved : DEFAULT_GOALS;
  });

  // New Transaction Form State
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txCategory, setTxCategory] = useState<FinTrackEntry['category']>('Dining');
  const [chargeSuperAppWallet, setChargeSuperAppWallet] = useState(false);

  // New Goal Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  useEffect(() => {
    sdk.storage.setItem('fintrack_entries_v2', entries);
  }, [entries, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_goals_v2', goals);
  }, [goals, sdk.storage]);

  // Register lifecycle hooks to auto-mask balances when mini app pauses if configured
  useEffect(() => {
    const unsubStart = sdk.onStart(() => {
      // Active state restored
    });
    const unsubPause = sdk.onPause(() => {
      if (settings.privacyMaskDefault) {
        setHideBalances(true);
      }
    });
    return () => {
      unsubStart();
      unsubPause();
    };
  }, [sdk, settings.privacyMaskDefault]);

  const summary = useMemo(() => {
    const totalIncome = entries
      .filter((e) => e.type === 'income')
      .reduce((acc, e) => acc + e.amount, 0);
    const totalExpense = entries
      .filter((e) => e.type === 'expense')
      .reduce((acc, e) => acc + e.amount, 0);
    const netCashflow = totalIncome - totalExpense;
    const budgetUsedPercent =
      monthlyBudgetLimit > 0 ? Math.min(100, Math.round((totalExpense / monthlyBudgetLimit) * 100)) : 0;

    const byCategory: Record<string, number> = {};
    entries
      .filter((e) => e.type === 'expense')
      .forEach((e) => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      });

    return {
      totalIncome,
      totalExpense,
      netCashflow,
      budgetUsedPercent,
      byCategory,
    };
  }, [entries, monthlyBudgetLimit]);

  const filteredEntries = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return entries;
    return entries.filter((e) => e.category === selectedCategoryFilter);
  }, [entries, selectedCategoryFilter]);

  const formatMoney = (val: number) => {
    if (hideBalances) return `${currencySymbol}••••`;
    return `${currencySymbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(txAmount);
    if (!txTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      sdk.ui.showToast('Please enter a valid description and positive amount', 'warning');
      return;
    }

    let settledViaWallet = false;
    if (txType === 'expense' && chargeSuperAppWallet) {
      const paymentResult = await sdk.payment.pay(
        numericAmount,
        `FinTrack Expense: ${txTitle.trim()}`
      );
      if (!paymentResult.success) {
        return;
      }
      settledViaWallet = true;
    }

    const newEntry: FinTrackEntry = {
      id: `ft-${Date.now()}`,
      title: txTitle.trim(),
      amount: numericAmount,
      type: txType,
      category: txType === 'income' ? 'Income' : txCategory,
      date: 'Today',
      settledViaWallet,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setTxTitle('');
    setTxAmount('');
    setActiveTab('ledger');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Recorded ${txType === 'income' ? 'income' : 'expense'}: ${currencySymbol}${numericAmount.toFixed(2)}`,
      'success'
    );
  };

  const handleDeleteEntry = (id: string) => {
    sdk.ui.hapticFeedback('medium');
    setEntries((prev) => prev.filter((item) => item.id !== id));
    sdk.ui.showToast('Transaction removed from ledger', 'info');
  };

  const handleContributeToGoal = async (goal: SavingsGoal, amount: number) => {
    sdk.ui.hapticFeedback('medium');
    const confirmed = await sdk.ui.requestConfirm(
      'Transfer to Savings Vault',
      `Transfer ${currencySymbol}${amount.toFixed(2)} from your shared Super App Wallet into "${goal.name}"?`
    );
    if (!confirmed) return;

    const res = await sdk.payment.pay(amount, `FinTrack Goal Deposit: ${goal.name}`);
    if (res.success) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? { ...g, savedAmount: Math.min(g.targetAmount, g.savedAmount + amount) }
            : g
        )
      );
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(`Added ${currencySymbol}${amount} to ${goal.name}!`, 'success');
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget);
    if (!newGoalName.trim() || !Number.isFinite(target) || target <= 0) {
      sdk.ui.showToast('Enter a valid goal name and target amount', 'warning');
      return;
    }
    const nextGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      name: newGoalName.trim(),
      targetAmount: target,
      savedAmount: 0,
      color: '#10b981',
    };
    setGoals((prev) => [...prev, nextGoal]);
    setNewGoalName('');
    setNewGoalTarget('');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`Created savings goal "${nextGoal.name}"`, 'success');
  };

  const isOverAlertThreshold = summary.budgetUsedPercent >= alertThresholdPercent;

  return (
    <div className="p-4 space-y-4 pb-24" style={{ color: tokens.textPrimary }}>
      {/* Net Cashflow & Monthly Budget Hero Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${tokens.accentPrimary}, ${tokens.accentHover})`,
          boxShadow: `0 10px 28px ${tokens.accentGlow}`,
          color: '#ffffff',
        }}
        className="rounded-3xl p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-85">
              Net Monthly Cashflow
            </span>
            <div className="text-2xl font-black tracking-tight mt-0.5">
              {formatMoney(summary.netCashflow)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setHideBalances(!hideBalances);
              sdk.ui.hapticFeedback('light');
            }}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition"
            aria-label="Toggle balance privacy"
          >
            {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Income vs Expenses Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-2xl bg-black/20 backdrop-blur-sm flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-300 shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] opacity-80">Income</div>
              <div className="text-xs font-extrabold truncate">
                {formatMoney(summary.totalIncome)}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/20 backdrop-blur-sm flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-400/20 flex items-center justify-center text-rose-300 shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] opacity-80">Expenses</div>
              <div className="text-xs font-extrabold truncate">
                {formatMoney(summary.totalExpense)}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Budget Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold">
            <span>
              Monthly Budget ({summary.budgetUsedPercent}% of {currencySymbol}
              {monthlyBudgetLimit.toLocaleString()})
            </span>
            <span>
              {formatMoney(Math.max(0, monthlyBudgetLimit - summary.totalExpense))} left
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverAlertThreshold ? 'bg-amber-300' : 'bg-emerald-300'
              }`}
              style={{ width: `${summary.budgetUsedPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Budget Threshold Alert Banner */}
      {isOverAlertThreshold && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            You have reached <strong>{summary.budgetUsedPercent}%</strong> of your{' '}
            {currencySymbol}
            {monthlyBudgetLimit} monthly budget limit.
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-2xl border"
        style={{
          backgroundColor: tokens.bgSurface,
          borderColor: tokens.borderDefault,
        }}
      >
        {[
          { id: 'ledger', label: 'Ledger', icon: TrendingUp },
          { id: 'analytics', label: 'Analytics', icon: PieChart },
          { id: 'goals', label: 'Goals', icon: Target },
          { id: 'add', label: 'Add New', icon: Plus },
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

      {/* TAB 1: TRANSACTIONS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {(['ALL', 'Housing', 'Dining', 'Transit', 'Subscriptions', 'Shopping', 'Income'] as const).map(
              (cat) => {
                const active = selectedCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(cat);
                      sdk.ui.hapticFeedback('light');
                    }}
                    style={{
                      backgroundColor: active ? tokens.accentPrimary : tokens.bgSurface,
                      color: active ? tokens.accentContrast : tokens.textSecondary,
                      borderColor: active ? 'transparent' : tokens.borderDefault,
                    }}
                    className="px-3 py-1.5 rounded-full border text-[11px] font-semibold whitespace-nowrap transition"
                  >
                    {cat === 'ALL' ? 'All Activity' : cat}
                  </button>
                );
              }
            )}
          </div>

          {/* Entries List */}
          <div className="space-y-2">
            {filteredEntries.length === 0 ? (
              <div
                style={{
                  backgroundColor: tokens.bgCard,
                  borderColor: tokens.borderDefault,
                }}
                className="p-6 rounded-2xl border text-center space-y-2"
              >
                <TrendingUp className="w-6 h-6 mx-auto opacity-50" />
                <p className="text-xs font-bold">No Transactions Recorded Yet</p>
                <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                  Tap Add New to record your income or expenses and track monthly cashflow.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  style={{
                    backgroundColor: tokens.accentPrimary,
                    color: tokens.accentContrast,
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold transition ios-active mt-1"
                >
                  + Record First Transaction
                </button>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[entry.category] || '#6366f1' }}
                    >
                      {entry.type === 'income' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{entry.title}</div>
                      <div
                        className="flex items-center gap-1.5 text-[10px] mt-0.5"
                        style={{ color: tokens.textMuted }}
                      >
                        <span>{entry.category}</span>
                        <span>•</span>
                        <span>{entry.date}</span>
                        {entry.settledViaWallet && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">Super App Wallet</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-extrabold ${
                        entry.type === 'income' ? 'text-emerald-400' : ''
                      }`}
                    >
                      {entry.type === 'income' ? '+' : '-'}
                      {formatMoney(entry.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY ANALYTICS & BUDGET BREAKDOWN */}
      {activeTab === 'analytics' && (
        <div
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-4 rounded-2xl border space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Spending by Category
            </h3>
            <span className="text-xs font-mono" style={{ color: tokens.textMuted }}>
              Total: {formatMoney(summary.totalExpense)}
            </span>
          </div>

          <div className="space-y-3">
            {(['Housing', 'Dining', 'Transit', 'Subscriptions', 'Shopping'] as const).map(
              (cat) => {
                const catTotal = summary.byCategory[cat] || 0;
                const pct =
                  summary.totalExpense > 0
                    ? Math.round((catTotal / summary.totalExpense) * 100)
                    : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                        />
                        <span>{cat}</span>
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: tokens.textSecondary }}>
                        {formatMoney(catTotal)} ({pct}%)
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: tokens.bgSurface }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[cat],
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Quick Pluggable Budget Adjuster */}
          <div
            style={{
              backgroundColor: tokens.bgSurface,
              borderColor: tokens.borderDefault,
            }}
            className="p-3 rounded-xl border space-y-2 pt-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
                <span>Monthly Budget Target</span>
              </span>
              <span className="font-mono font-bold">
                {currencySymbol}
                {monthlyBudgetLimit}
              </span>
            </div>
            <input
              type="range"
              min={500}
              max={10000}
              step={100}
              value={monthlyBudgetLimit}
              onChange={(e) =>
                sdk.settings.updateSetting('monthlyBudgetLimit', Number(e.target.value))
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB 3: SAVINGS GOALS VAULT */}
      {activeTab === 'goals' && (
        <div className="space-y-3">
          {goals.length === 0 ? (
            <div
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-6 rounded-2xl border text-center space-y-1.5"
            >
              <Target className="w-6 h-6 mx-auto opacity-50" />
              <p className="text-xs font-bold">No Savings Goals Yet</p>
              <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                Create a savings goal below to track progress and deposit funds from your Super App Wallet.
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
              return (
                <div
                  key={goal.id}
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-4 rounded-2xl border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold">{goal.name}</h4>
                      <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                        {formatMoney(goal.savedAmount)} of {formatMoney(goal.targetAmount)} ({pct}%)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleContributeToGoal(goal, 50)}
                      style={{
                        backgroundColor: tokens.accentPrimary,
                        color: tokens.accentContrast,
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition ios-active"
                    >
                      <Wallet className="w-3 h-3" />
                      <span>+{currencySymbol}50</span>
                    </button>
                  </div>

                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: tokens.bgSurface }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Create New Savings Goal */}
          <form
            onSubmit={handleCreateGoal}
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-4 rounded-2xl border space-y-2.5"
          >
            <span className="text-xs font-bold block">Create New Savings Goal</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="Goal Name (e.g. New Car)"
                style={{
                  backgroundColor: tokens.bgInput,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="px-3 py-2 rounded-xl border text-xs focus:outline-none"
              />
              <input
                type="number"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                placeholder="Target ($)"
                style={{
                  backgroundColor: tokens.bgInput,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="px-3 py-2 rounded-xl border text-xs focus:outline-none"
              />
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: tokens.bgSurface,
                borderColor: tokens.borderDefault,
                color: tokens.textPrimary,
              }}
              className="w-full py-2 rounded-xl border text-xs font-bold transition ios-active"
            >
              + Add Savings Goal
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: ADD TRANSACTION FORM */}
      {activeTab === 'add' && (
        <form
          onSubmit={handleAddTransaction}
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-4 rounded-2xl border space-y-3.5"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Record New Transaction
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTxType(t)}
                style={{
                  backgroundColor: txType === t ? tokens.accentPrimary : tokens.bgSurface,
                  color: txType === t ? tokens.accentContrast : tokens.textSecondary,
                  borderColor: txType === t ? 'transparent' : tokens.borderDefault,
                }}
                className="py-2 rounded-xl border text-xs font-bold capitalize transition"
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
              Description
            </label>
            <input
              type="text"
              value={txTitle}
              onChange={(e) => setTxTitle(e.target.value)}
              placeholder="e.g. Blue Bottle Coffee, Monthly Bonus..."
              style={{
                backgroundColor: tokens.bgInput,
                borderColor: tokens.borderDefault,
                color: tokens.textPrimary,
              }}
              className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  backgroundColor: tokens.bgInput,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
              />
            </div>

            {txType === 'expense' && (
              <div>
                <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                  Category
                </label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value as FinTrackEntry['category'])}
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                >
                  <option value="Dining">Dining</option>
                  <option value="Housing">Housing</option>
                  <option value="Transit">Transit</option>
                  <option value="Subscriptions">Subscriptions</option>
                  <option value="Shopping">Shopping</option>
                </select>
              </div>
            )}
          </div>

          {txType === 'expense' && (
            <label
              style={{
                backgroundColor: tokens.bgSurface,
                borderColor: tokens.borderDefault,
              }}
              className="p-3 rounded-xl border flex items-center justify-between cursor-pointer"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Deduct from Shared Super App Wallet</span>
                </div>
                <div className="text-[10px]" style={{ color: tokens.textSecondary }}>
                  Available Wallet Balance: ${sdk.payment.getBalance().toFixed(2)}
                </div>
              </div>
              <input
                type="checkbox"
                checked={chargeSuperAppWallet}
                onChange={(e) => setChargeSuperAppWallet(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
            </label>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: tokens.accentPrimary,
              color: tokens.accentContrast,
              boxShadow: `0 4px 12px ${tokens.accentGlow}`,
            }}
            className="w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ios-active"
          >
            Save Transaction
          </button>
        </form>
      )}
    </div>
  );
};
