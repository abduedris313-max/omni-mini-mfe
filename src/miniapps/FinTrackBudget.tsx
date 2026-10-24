import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Plus,
  Trash2,
  Target,
  Wallet,
  Building2,
  Landmark,
  CalendarClock,
  RefreshCw,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Share2,
  Coins,
  Users,
  Briefcase,
  Play,
  Pause,
  Check,
} from 'lucide-react';

export type CurrencyCode = 'ETB' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'KES';

export type FinTrackCategory =
  | 'Housing'
  | 'Dining'
  | 'Transit'
  | 'Subscriptions'
  | 'Shopping'
  | 'Utilities'
  | 'Loan'
  | 'Transfer'
  | 'Salary'
  | 'Business'
  | 'Income';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  defaultEtbRate: number; // How many ETB per 1 unit of this currency
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  ETB: { code: 'ETB', symbol: 'ETB', name: 'Ethiopian Birr', defaultEtbRate: 1 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', defaultEtbRate: 125 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', defaultEtbRate: 135 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', defaultEtbRate: 158 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', defaultEtbRate: 34 },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', defaultEtbRate: 0.97 },
};

export interface FinTrackAccount {
  id: string;
  name: string;
  institution: string;
  type: 'bank' | 'wallet';
  accountNumber: string;
  currency: CurrencyCode;
  balance: number;
  shareWithSuperApp: boolean;
  color: string;
  updatedAt: string;
}

export interface FinTrackEntry {
  id: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  type: 'expense' | 'income';
  category: FinTrackCategory;
  accountId?: string;
  accountName?: string;
  date: string;
  settledViaWallet?: boolean;
}

export interface LoanProvider {
  id: string;
  name: string;
  providerType: 'B2C' | 'P2P';
  defaultInterestRate: number;
  maxLimit: number;
  currency: CurrencyCode;
  contactOrRef: string;
}

export interface FinTrackLoan {
  id: string;
  title: string;
  providerId: string;
  providerName: string;
  providerType: 'B2C' | 'P2P';
  direction: 'borrowed' | 'lent';
  principalAmount: number;
  interestRate: number;
  totalPayable: number;
  paidAmount: number;
  currency: CurrencyCode;
  accountId?: string;
  startDate: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue';
}

export type ScheduleFrequency =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface ScheduledTransaction {
  id: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  type: 'income' | 'expense';
  category: FinTrackCategory;
  frequency: ScheduleFrequency;
  nextRunDate: string; // YYYY-MM-DD
  accountId: string;
  autoExecute: boolean;
  syncToSuperAppWallet: boolean;
  active: boolean;
  lastExecutedDate?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  currency: CurrencyCode;
  color: string;
}

const CATEGORY_COLORS: Record<FinTrackCategory, string> = {
  Housing: '#6366f1',
  Dining: '#f59e0b',
  Transit: '#10b981',
  Subscriptions: '#ec4899',
  Shopping: '#06b6d4',
  Utilities: '#0ea5e9',
  Loan: '#f43f5e',
  Transfer: '#8b5cf6',
  Salary: '#22c55e',
  Business: '#14b8a6',
  Income: '#22c55e',
};

const INSTITUTION_PRESETS: {
  name: string;
  type: 'bank' | 'wallet';
  color: string;
  defaultCurrency: CurrencyCode;
}[] = [
  { name: 'Commercial Bank of Ethiopia (CBE)', type: 'bank', color: '#7c3aed', defaultCurrency: 'ETB' },
  { name: 'Awash Bank', type: 'bank', color: '#2563eb', defaultCurrency: 'ETB' },
  { name: 'Dashen Bank', type: 'bank', color: '#1d4ed8', defaultCurrency: 'ETB' },
  { name: 'Bank of Abyssinia', type: 'bank', color: '#d97706', defaultCurrency: 'ETB' },
  { name: 'Zemen Bank', type: 'bank', color: '#dc2626', defaultCurrency: 'ETB' },
  { name: 'Telebirr SuperWallet', type: 'wallet', color: '#059669', defaultCurrency: 'ETB' },
  { name: 'CBE Birr Wallet', type: 'wallet', color: '#9333ea', defaultCurrency: 'ETB' },
  { name: 'M-Pesa Safaricom', type: 'wallet', color: '#16a34a', defaultCurrency: 'ETB' },
  { name: 'Kacha Digital Wallet', type: 'wallet', color: '#ea580c', defaultCurrency: 'ETB' },
  { name: 'Amole / Moneta Wallet', type: 'wallet', color: '#0284c7', defaultCurrency: 'ETB' },
  { name: 'International USD Bank', type: 'bank', color: '#0f766e', defaultCurrency: 'USD' },
];

const PROVIDER_PRESETS: Omit<LoanProvider, 'id'>[] = [
  {
    name: 'Telebirr Mela / SandPay',
    providerType: 'B2C',
    defaultInterestRate: 9.5,
    maxLimit: 25000,
    currency: 'ETB',
    contactOrRef: '*127# Telebirr Micro-Credit',
  },
  {
    name: 'CBE Michu Digital Lending',
    providerType: 'B2C',
    defaultInterestRate: 11.0,
    maxLimit: 100000,
    currency: 'ETB',
    contactOrRef: '*847# CBE Michu',
  },
  {
    name: 'Dashen DubeAle BNPL',
    providerType: 'B2C',
    defaultInterestRate: 10.0,
    maxLimit: 50000,
    currency: 'ETB',
    contactOrRef: 'Amole / DubeAle Portal',
  },
  {
    name: 'Awash Tatari Credit',
    providerType: 'B2C',
    defaultInterestRate: 12.5,
    maxLimit: 150000,
    currency: 'ETB',
    contactOrRef: 'AwashBirr Pro',
  },
  {
    name: 'Equb Rotating Circle',
    providerType: 'P2P',
    defaultInterestRate: 0,
    maxLimit: 120000,
    currency: 'ETB',
    contactOrRef: 'Community Equb Group',
  },
  {
    name: 'Direct Peer / Family Loan',
    providerType: 'P2P',
    defaultInterestRate: 0,
    maxLimit: 50000,
    currency: 'ETB',
    contactOrRef: 'Peer-to-Peer Agreement',
  },
];

function normalizeCurrencyCode(raw: unknown): CurrencyCode {
  if (typeof raw === 'string') {
    const upper = raw.toUpperCase().trim();
    if (upper in CURRENCIES) return upper as CurrencyCode;
    if (raw === '$') return 'USD';
    if (raw === '€') return 'EUR';
    if (raw === '£') return 'GBP';
  }
  return 'ETB';
}

function advanceDateByFrequency(dateStr: string, freq: ScheduleFrequency): string {
  const base = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  switch (freq) {
    case 'daily':
      base.setDate(base.getDate() + 1);
      break;
    case 'weekly':
      base.setDate(base.getDate() + 7);
      break;
    case 'biweekly':
      base.setDate(base.getDate() + 14);
      break;
    case 'monthly':
      base.setMonth(base.getMonth() + 1);
      break;
    case 'quarterly':
      base.setMonth(base.getMonth() + 3);
      break;
    case 'yearly':
      base.setFullYear(base.getFullYear() + 1);
      break;
    case 'once':
    default:
      break;
  }
  return base.toISOString().slice(0, 10);
}

export const FinTrackApp: React.FC<{ sdk: MiniAppBridgeSDK }> = ({ sdk }) => {
  const { tokens } = sdk.theme;
  const settings = sdk.settings.getSettings();

  const monthlyBudgetLimit = Number(settings.monthlyBudgetLimit || 45000);
  const alertThresholdPercent = Number(settings.alertThresholdPercent || 80);

  // 1. Multi-Currency State (ETB by default)
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>(() => {
    const saved = sdk.storage.getItem('fintrack_base_currency_v3');
    if (saved && typeof saved === 'string' && saved in CURRENCIES) {
      return saved as CurrencyCode;
    }
    return normalizeCurrencyCode(settings.currencySymbol || 'ETB');
  });

  const [fxRatesToEtb, setFxRatesToEtb] = useState<Record<CurrencyCode, number>>(() => {
    const saved = sdk.storage.getItem('fintrack_fx_rates_v3');
    const defaults: Record<CurrencyCode, number> = {
      ETB: CURRENCIES.ETB.defaultEtbRate,
      USD: CURRENCIES.USD.defaultEtbRate,
      EUR: CURRENCIES.EUR.defaultEtbRate,
      GBP: CURRENCIES.GBP.defaultEtbRate,
      AED: CURRENCIES.AED.defaultEtbRate,
      KES: CURRENCIES.KES.defaultEtbRate,
    };
    return saved && typeof saved === 'object' ? { ...defaults, ...saved } : defaults;
  });

  const [showFxModal, setShowFxModal] = useState(false);

  // Convert any amount from `fromCurr` to `toCurr` via ETB pivot
  const convertAmount = useCallback(
    (amount: number, fromCurr: CurrencyCode = 'ETB', toCurr: CurrencyCode = baseCurrency): number => {
      if (!Number.isFinite(amount)) return 0;
      if (fromCurr === toCurr) return amount;
      const fromRate = fxRatesToEtb[fromCurr] || CURRENCIES[fromCurr]?.defaultEtbRate || 1;
      const toRate = fxRatesToEtb[toCurr] || CURRENCIES[toCurr]?.defaultEtbRate || 1;
      const amountInEtb = amount * fromRate;
      return amountInEtb / toRate;
    },
    [fxRatesToEtb, baseCurrency]
  );

  // 2. Navigation & Privacy State
  const [activeTab, setActiveTab] = useState<
    'accounts' | 'ledger' | 'loans' | 'scheduled' | 'analytics' | 'goals'
  >('accounts');
  const [hideBalances, setHideBalances] = useState<boolean>(Boolean(settings.privacyMaskDefault));

  // 3. Multi-Account Management State (Bank & Wallet)
  const [accounts, setAccounts] = useState<FinTrackAccount[]>(() => {
    const saved = sdk.storage.getItem('fintrack_accounts_v3');
    return Array.isArray(saved) ? saved : [];
  });
  const [accountFilter, setAccountFilter] = useState<'all' | 'bank' | 'wallet'>('all');
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  // New Account Form
  const [accName, setAccName] = useState('');
  const [accInstitution, setAccInstitution] = useState('Commercial Bank of Ethiopia (CBE)');
  const [accType, setAccType] = useState<'bank' | 'wallet'>('bank');
  const [accNumber, setAccNumber] = useState('');
  const [accCurrency, setAccCurrency] = useState<CurrencyCode>('ETB');
  const [accBalance, setAccBalance] = useState('');
  const [accShareSuperApp, setAccShareSuperApp] = useState(true);

  // Inter-Account Transfer Form
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // SuperApp Shared Wallet Sync State
  const [autoSyncSuperApp, setAutoSyncSuperApp] = useState<boolean>(() => {
    const saved = sdk.storage.getItem('fintrack_autosync_superapp_v3');
    return saved !== null ? Boolean(saved) : true;
  });

  // 4. Ledger Entries State
  const [entries, setEntries] = useState<FinTrackEntry[]>(() => {
    const saved = sdk.storage.getItem('fintrack_entries_v2');
    if (Array.isArray(saved)) {
      return saved.map((e: any) => ({
        ...e,
        currency: normalizeCurrencyCode(e.currency || 'ETB'),
      }));
    }
    return [];
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [showAddTxForm, setShowAddTxForm] = useState(false);

  // New Transaction Form
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>('ETB');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txCategory, setTxCategory] = useState<FinTrackCategory>('Dining');
  const [txAccountId, setTxAccountId] = useState<string>('');
  const [chargeSuperAppWallet, setChargeSuperAppWallet] = useState(false);

  // 5. Loan Providers (P2P & B2C) and Loan Tracking State
  const [loanProviders, setLoanProviders] = useState<LoanProvider[]>(() => {
    const saved = sdk.storage.getItem('fintrack_loan_providers_v3');
    return Array.isArray(saved) ? saved : [];
  });

  const [loans, setLoans] = useState<FinTrackLoan[]>(() => {
    const saved = sdk.storage.getItem('fintrack_loans_v3');
    return Array.isArray(saved) ? saved : [];
  });

  const [loanSubTab, setLoanSubTab] = useState<'loans' | 'providers'>('loans');
  const [providerTypeFilter, setProviderTypeFilter] = useState<'ALL' | 'B2C' | 'P2P'>('ALL');
  const [showAddProviderForm, setShowAddProviderForm] = useState(false);
  const [showAddLoanForm, setShowAddLoanForm] = useState(false);
  const [repayLoanTarget, setRepayLoanTarget] = useState<FinTrackLoan | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState('');

  // New Provider Form
  const [provName, setProvName] = useState('');
  const [provType, setProvType] = useState<'B2C' | 'P2P'>('B2C');
  const [provInterest, setProvInterest] = useState('10');
  const [provMaxLimit, setProvMaxLimit] = useState('50000');
  const [provCurrency, setProvCurrency] = useState<CurrencyCode>('ETB');
  const [provContact, setProvContact] = useState('');

  // New Loan Form
  const [loanTitle, setLoanTitle] = useState('');
  const [loanProviderId, setLoanProviderId] = useState('');
  const [loanDirection, setLoanDirection] = useState<'borrowed' | 'lent'>('borrowed');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanInterest, setLoanInterest] = useState('10');
  const [loanCurrency, setLoanCurrency] = useState<CurrencyCode>('ETB');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanDueDate, setLoanDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [disburseToAccount, setDisburseToAccount] = useState(true);

  // 6. Scheduled Transactions State (Income & Expense)
  const [scheduledTxs, setScheduledTxs] = useState<ScheduledTransaction[]>(() => {
    const saved = sdk.storage.getItem('fintrack_scheduled_v3');
    return Array.isArray(saved) ? saved : [];
  });
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'income' | 'expense'>('ALL');
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);

  // New Scheduled Transaction Form
  const [schedTitle, setSchedTitle] = useState('');
  const [schedAmount, setSchedAmount] = useState('');
  const [schedCurrency, setSchedCurrency] = useState<CurrencyCode>('ETB');
  const [schedType, setSchedType] = useState<'income' | 'expense'>('expense');
  const [schedCategory, setSchedCategory] = useState<FinTrackCategory>('Housing');
  const [schedFreq, setSchedFreq] = useState<ScheduleFrequency>('monthly');
  const [schedNextDate, setSchedNextDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [schedAccountId, setSchedAccountId] = useState('');
  const [schedAutoExecute, setSchedAutoExecute] = useState(true);
  const [schedSyncSuperApp, setSchedSyncSuperApp] = useState(false);

  // 7. Savings Goals State
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const saved = sdk.storage.getItem('fintrack_goals_v2');
    if (Array.isArray(saved)) {
      return saved.map((g: any) => ({
        ...g,
        currency: normalizeCurrencyCode(g.currency || 'ETB'),
      }));
    }
    return [];
  });
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrency, setNewGoalCurrency] = useState<CurrencyCode>('ETB');

  // Persist states to Sandboxed Storage
  useEffect(() => {
    sdk.storage.setItem('fintrack_base_currency_v3', baseCurrency);
  }, [baseCurrency, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_fx_rates_v3', fxRatesToEtb);
  }, [fxRatesToEtb, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_accounts_v3', accounts);
  }, [accounts, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_autosync_superapp_v3', autoSyncSuperApp);
  }, [autoSyncSuperApp, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_entries_v2', entries);
  }, [entries, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_loan_providers_v3', loanProviders);
  }, [loanProviders, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_loans_v3', loans);
  }, [loans, sdk.storage]);

  useEffect(() => {
    sdk.storage.setItem('fintrack_scheduled_v3', scheduledTxs);
  }, [scheduledTxs, sdk.storage]);

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

  // Compute Portfolio, Multi-Account, Shared Balance, Loan & Cashflow Metrics in Base Currency
  const portfolioSummary = useMemo(() => {
    const bankAccounts = accounts.filter((a) => a.type === 'bank');
    const walletAccounts = accounts.filter((a) => a.type === 'wallet');
    const sharedAccounts = accounts.filter((a) => a.shareWithSuperApp);

    const totalBankBase = bankAccounts.reduce(
      (sum, a) => sum + convertAmount(a.balance, a.currency, baseCurrency),
      0
    );
    const totalWalletBase = walletAccounts.reduce(
      (sum, a) => sum + convertAmount(a.balance, a.currency, baseCurrency),
      0
    );
    const totalAccountsBase = totalBankBase + totalWalletBase;

    const sharedBalanceBase = sharedAccounts.reduce(
      (sum, a) => sum + convertAmount(a.balance, a.currency, baseCurrency),
      0
    );
    const sharedBalanceEtb = sharedAccounts.reduce(
      (sum, a) => sum + convertAmount(a.balance, a.currency, 'ETB'),
      0
    );

    const totalIncomeBase = entries
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + convertAmount(e.amount, e.currency, baseCurrency), 0);

    const totalExpenseBase = entries
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + convertAmount(e.amount, e.currency, baseCurrency), 0);

    const netCashflowBase = totalIncomeBase - totalExpenseBase;

    const activeBorrowedBase = loans
      .filter((l) => l.status !== 'paid' && l.direction === 'borrowed')
      .reduce(
        (sum, l) =>
          sum + convertAmount(Math.max(0, l.totalPayable - l.paidAmount), l.currency, baseCurrency),
        0
      );

    const activeLentBase = loans
      .filter((l) => l.status !== 'paid' && l.direction === 'lent')
      .reduce(
        (sum, l) =>
          sum + convertAmount(Math.max(0, l.totalPayable - l.paidAmount), l.currency, baseCurrency),
        0
      );

    const netWorthBase = totalAccountsBase + activeLentBase - activeBorrowedBase;

    const budgetUsedPercent =
      monthlyBudgetLimit > 0
        ? Math.min(100, Math.round((totalExpenseBase / monthlyBudgetLimit) * 100))
        : 0;

    const byCategory: Record<string, number> = {};
    entries
      .filter((e) => e.type === 'expense')
      .forEach((e) => {
        const amtBase = convertAmount(e.amount, e.currency, baseCurrency);
        byCategory[e.category] = (byCategory[e.category] || 0) + amtBase;
      });

    return {
      totalBankBase,
      totalWalletBase,
      totalAccountsBase,
      sharedAccountsCount: sharedAccounts.length,
      sharedBalanceBase,
      sharedBalanceEtb,
      totalIncomeBase,
      totalExpenseBase,
      netCashflowBase,
      activeBorrowedBase,
      activeLentBase,
      netWorthBase,
      budgetUsedPercent,
      byCategory,
    };
  }, [accounts, entries, loans, baseCurrency, convertAmount, monthlyBudgetLimit]);

  // Synchronize Shared Accounts Balance to SuperApp Shared Wallet
  const pushSharedBalanceToSuperApp = useCallback(
    async (customAccounts?: FinTrackAccount[], silent = false) => {
      const list = customAccounts || accounts;
      const sharedList = list.filter((a) => a.shareWithSuperApp);
      const totalInBase = sharedList.reduce(
        (sum, a) => sum + convertAmount(a.balance, a.currency, baseCurrency),
        0
      );
      const totalInEtb = sharedList.reduce(
        (sum, a) => sum + convertAmount(a.balance, a.currency, 'ETB'),
        0
      );

      // Save summary metadata so SuperApp Home & Wallet pages can inspect FinTrack shared accounts
      sdk.storage.setItem('fintrack_shared_wallet_summary', {
        sharedAccountsCount: sharedList.length,
        baseCurrency,
        totalInBase: Number(totalInBase.toFixed(2)),
        totalInEtb: Number(totalInEtb.toFixed(2)),
        accountNames: sharedList.map((a) => `${a.name} (${a.currency})`),
        syncedAt: new Date().toISOString(),
      });

      const res = await sdk.payment.syncSharedBalance(
        totalInBase,
        `FinTrack Shared Balance (${sharedList.length} ${
          sharedList.length === 1 ? 'account' : 'accounts'
        } in ${baseCurrency})`
      );

      if (!silent && res.success) {
        sdk.ui.hapticFeedback('success');
        sdk.ui.showToast(
          `Synced ${CURRENCIES[baseCurrency].symbol} ${totalInBase.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} to SuperApp Shared Wallet`,
          'success'
        );
      }
    },
    [accounts, baseCurrency, convertAmount, sdk]
  );

  // Format currency helper
  const formatMoney = useCallback(
    (val: number, curr: CurrencyCode = baseCurrency) => {
      const sym = CURRENCIES[curr]?.symbol || curr;
      if (hideBalances) return `${sym} ••••`;
      return `${sym} ${val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [baseCurrency, hideBalances]
  );

  // Adjust a specific Bank or Wallet account's balance and auto-sync to SuperApp Wallet if enabled
  const adjustAccountBalance = useCallback(
    (accountId: string, deltaInAccountCurrency: number) => {
      setAccounts((prev) => {
        const next = prev.map((acc) => {
          if (acc.id !== accountId) return acc;
          return {
            ...acc,
            balance: Number((acc.balance + deltaInAccountCurrency).toFixed(2)),
            updatedAt: new Date().toISOString().slice(0, 10),
          };
        });
        if (autoSyncSuperApp && next.some((a) => a.shareWithSuperApp)) {
          setTimeout(() => {
            pushSharedBalanceToSuperApp(next, true);
          }, 0);
        }
        return next;
      });
    },
    [autoSyncSuperApp, pushSharedBalanceToSuperApp]
  );

  // Execute a Scheduled Transaction (Manual or Auto-Due)
  const executeScheduledTransaction = useCallback(
    async (sched: ScheduledTransaction, isAuto = false) => {
      const targetAcc = accounts.find((a) => a.id === sched.accountId);
      const signedDeltaInSchedCurr = sched.type === 'income' ? sched.amount : -sched.amount;

      if (targetAcc) {
        const deltaInAccCurr = convertAmount(
          signedDeltaInSchedCurr,
          sched.currency,
          targetAcc.currency
        );
        adjustAccountBalance(targetAcc.id, deltaInAccCurr);
      }

      if (sched.syncToSuperAppWallet) {
        const amtInBase = convertAmount(sched.amount, sched.currency, baseCurrency);
        if (sched.type === 'expense') {
          await sdk.payment.pay(amtInBase, `Scheduled Expense: ${sched.title}`);
        } else {
          await sdk.payment.credit(amtInBase, `Scheduled Income: ${sched.title}`);
        }
      }

      const newEntry: FinTrackEntry = {
        id: `ft-sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `[Scheduled] ${sched.title}`,
        amount: sched.amount,
        currency: sched.currency,
        type: sched.type,
        category: sched.category,
        accountId: targetAcc?.id,
        accountName: targetAcc?.name,
        date: new Date().toISOString().slice(0, 10),
        settledViaWallet: sched.syncToSuperAppWallet,
      };

      setEntries((prev) => [newEntry, ...prev]);

      const todayStr = new Date().toISOString().slice(0, 10);
      setScheduledTxs((prev) =>
        prev.map((item) => {
          if (item.id !== sched.id) return item;
          if (item.frequency === 'once') {
            return { ...item, active: false, lastExecutedDate: todayStr };
          }
          return {
            ...item,
            nextRunDate: advanceDateByFrequency(item.nextRunDate, item.frequency),
            lastExecutedDate: todayStr,
          };
        })
      );

      if (!isAuto) {
        sdk.ui.hapticFeedback('success');
        sdk.ui.showToast(
          `Posted scheduled ${sched.type}: ${formatMoney(sched.amount, sched.currency)}`,
          'success'
        );
      }
    },
    [accounts, adjustAccountBalance, baseCurrency, convertAmount, formatMoney, sdk]
  );

  // Auto-run due scheduled transactions marked with autoExecute on mount
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dueAutoItems = scheduledTxs.filter(
      (s) => s.active && s.autoExecute && s.nextRunDate <= todayStr && s.lastExecutedDate !== todayStr
    );
    if (dueAutoItems.length > 0) {
      dueAutoItems.forEach((item) => {
        executeScheduledTransaction(item, true);
      });
      sdk.ui.showToast(
        `Auto-posted ${dueAutoItems.length} due scheduled ${
          dueAutoItems.length === 1 ? 'transaction' : 'transactions'
        }`,
        'info'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers: Multi-Account Management
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const initialBal = parseFloat(accBalance || '0');
    if (!accName.trim() || !Number.isFinite(initialBal)) {
      sdk.ui.showToast('Enter an account name and valid opening balance', 'warning');
      return;
    }

    const preset = INSTITUTION_PRESETS.find((p) => p.name === accInstitution);
    const newAcc: FinTrackAccount = {
      id: `acc-${Date.now()}`,
      name: accName.trim(),
      institution: accInstitution,
      type: accType,
      accountNumber:
        accNumber.trim() || (accType === 'bank' ? '1000••••9402' : '+251 911 ••••'),
      currency: accCurrency,
      balance: Number(initialBal.toFixed(2)),
      shareWithSuperApp: accShareSuperApp,
      color: preset?.color || (accType === 'bank' ? '#2563eb' : '#059669'),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    const nextAccounts = [newAcc, ...accounts];
    setAccounts(nextAccounts);
    if (!txAccountId) setTxAccountId(newAcc.id);
    if (!schedAccountId) setSchedAccountId(newAcc.id);
    if (!loanAccountId) setLoanAccountId(newAcc.id);

    if (accShareSuperApp && autoSyncSuperApp) {
      pushSharedBalanceToSuperApp(nextAccounts, false);
    } else {
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(`Added ${newAcc.type}: ${newAcc.name} (${newAcc.currency})`, 'success');
    }

    setAccName('');
    setAccBalance('');
    setAccNumber('');
    setShowAddAccountForm(false);
  };

  const handleToggleAccountShare = (accountId: string) => {
    const nextAccounts = accounts.map((acc) =>
      acc.id === accountId ? { ...acc, shareWithSuperApp: !acc.shareWithSuperApp } : acc
    );
    setAccounts(nextAccounts);
    sdk.ui.hapticFeedback('light');
    if (autoSyncSuperApp) {
      pushSharedBalanceToSuperApp(nextAccounts, false);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    const nextAccounts = accounts.filter((a) => a.id !== accountId);
    setAccounts(nextAccounts);
    sdk.ui.hapticFeedback('medium');
    if (autoSyncSuperApp) {
      pushSharedBalanceToSuperApp(nextAccounts, true);
    }
    sdk.ui.showToast('Account removed', 'info');
  };

  const handleTransferBetweenAccounts = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!transferFromId || !transferToId || transferFromId === transferToId) {
      sdk.ui.showToast('Select two different source and destination accounts', 'warning');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      sdk.ui.showToast('Enter a valid positive transfer amount', 'warning');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === transferFromId);
    const toAcc = accounts.find((a) => a.id === transferToId);
    if (!fromAcc || !toAcc) return;

    if (fromAcc.balance < amt) {
      sdk.ui.showToast(`Insufficient balance in ${fromAcc.name}`, 'error');
      return;
    }

    const creditedInToCurrency = convertAmount(amt, fromAcc.currency, toAcc.currency);
    const nextAccounts = accounts.map((acc) => {
      if (acc.id === fromAcc.id) {
        return { ...acc, balance: Number((acc.balance - amt).toFixed(2)) };
      }
      if (acc.id === toAcc.id) {
        return { ...acc, balance: Number((acc.balance + creditedInToCurrency).toFixed(2)) };
      }
      return acc;
    });

    setAccounts(nextAccounts);
    if (autoSyncSuperApp) {
      pushSharedBalanceToSuperApp(nextAccounts, true);
    }

    const transferEntry: FinTrackEntry = {
      id: `ft-xfer-${Date.now()}`,
      title: `Transfer: ${fromAcc.name} → ${toAcc.name}`,
      amount: amt,
      currency: fromAcc.currency,
      type: 'expense',
      category: 'Transfer',
      accountId: fromAcc.id,
      accountName: `${fromAcc.name} → ${toAcc.name}`,
      date: new Date().toISOString().slice(0, 10),
    };
    setEntries((prev) => [transferEntry, ...prev]);

    setTransferAmount('');
    setShowTransferForm(false);
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Transferred ${formatMoney(amt, fromAcc.currency)} to ${toAcc.name} (${formatMoney(
        creditedInToCurrency,
        toAcc.currency
      )})`,
      'success'
    );
  };

  // Handlers: Ledger Transactions
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(txAmount);
    if (!txTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      sdk.ui.showToast('Enter a valid description and positive amount', 'warning');
      return;
    }

    let settledViaWallet = false;
    if (chargeSuperAppWallet) {
      const amountInBase = convertAmount(numericAmount, txCurrency, baseCurrency);
      if (txType === 'expense') {
        const paymentResult = await sdk.payment.pay(
          amountInBase,
          `FinTrack Expense: ${txTitle.trim()}`
        );
        if (!paymentResult.success) return;
      } else {
        const creditResult = await sdk.payment.credit(
          amountInBase,
          `FinTrack Income: ${txTitle.trim()}`
        );
        if (!creditResult.success) return;
      }
      settledViaWallet = true;
    }

    const linkedAcc = accounts.find((a) => a.id === txAccountId);
    if (linkedAcc) {
      const signedInTxCurr = txType === 'income' ? numericAmount : -numericAmount;
      const deltaInAccCurr = convertAmount(signedInTxCurr, txCurrency, linkedAcc.currency);
      adjustAccountBalance(linkedAcc.id, deltaInAccCurr);
    }

    const newEntry: FinTrackEntry = {
      id: `ft-${Date.now()}`,
      title: txTitle.trim(),
      amount: numericAmount,
      currency: txCurrency,
      type: txType,
      category: txType === 'income' && txCategory === 'Dining' ? 'Salary' : txCategory,
      accountId: linkedAcc?.id,
      accountName: linkedAcc?.name,
      date: new Date().toISOString().slice(0, 10),
      settledViaWallet,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setTxTitle('');
    setTxAmount('');
    setShowAddTxForm(false);
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Recorded ${txType}: ${formatMoney(numericAmount, txCurrency)}`,
      'success'
    );
  };

  const handleDeleteEntry = (id: string) => {
    sdk.ui.hapticFeedback('medium');
    setEntries((prev) => prev.filter((item) => item.id !== id));
    sdk.ui.showToast('Transaction removed from ledger', 'info');
  };

  // Handlers: Loan Providers (P2P & B2C) & Loan Tracking
  const handleAddLoanProvider = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(provInterest || '0');
    const limit = parseFloat(provMaxLimit || '0');
    if (!provName.trim() || !Number.isFinite(rate) || !Number.isFinite(limit) || limit <= 0) {
      sdk.ui.showToast('Enter provider name, valid interest rate, and credit limit', 'warning');
      return;
    }

    const newProv: LoanProvider = {
      id: `prov-${Date.now()}`,
      name: provName.trim(),
      providerType: provType,
      defaultInterestRate: rate,
      maxLimit: limit,
      currency: provCurrency,
      contactOrRef: provContact.trim() || (provType === 'B2C' ? 'Digital Credit Line' : 'Peer Contact'),
    };

    setLoanProviders((prev) => [newProv, ...prev]);
    setLoanProviderId(newProv.id);
    setProvName('');
    setProvContact('');
    setShowAddProviderForm(false);
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`Added ${newProv.providerType} loan provider: ${newProv.name}`, 'success');
  };

  const handleLoadPresetProvider = (preset: Omit<LoanProvider, 'id'>) => {
    const exists = loanProviders.find(
      (p) => p.name.toLowerCase() === preset.name.toLowerCase()
    );
    if (exists) {
      setLoanProviderId(exists.id);
      sdk.ui.showToast(`Selected ${exists.name}`, 'info');
      return;
    }
    const created: LoanProvider = {
      ...preset,
      id: `prov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    setLoanProviders((prev) => [created, ...prev]);
    setLoanProviderId(created.id);
    setLoanInterest(String(created.defaultInterestRate));
    setLoanCurrency(created.currency);
    sdk.ui.hapticFeedback('light');
    sdk.ui.showToast(`Added ${created.providerType} provider: ${created.name}`, 'success');
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(loanPrincipal);
    const interest = parseFloat(loanInterest || '0');
    const provider = loanProviders.find((p) => p.id === loanProviderId);

    if (!loanTitle.trim() || !Number.isFinite(principal) || principal <= 0) {
      sdk.ui.showToast('Enter a loan title and valid principal amount', 'warning');
      return;
    }
    if (!provider) {
      sdk.ui.showToast('Please select or add a B2C or P2P loan provider first', 'warning');
      return;
    }

    const totalPayable = Number((principal * (1 + Math.max(0, interest) / 100)).toFixed(2));
    const newLoan: FinTrackLoan = {
      id: `loan-${Date.now()}`,
      title: loanTitle.trim(),
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.providerType,
      direction: loanDirection,
      principalAmount: principal,
      interestRate: Math.max(0, interest),
      totalPayable,
      paidAmount: 0,
      currency: loanCurrency,
      accountId: loanAccountId || undefined,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: loanDueDate,
      status: 'active',
    };

    setLoans((prev) => [newLoan, ...prev]);

    // If disburseToAccount is checked and an account is selected, update account balance & ledger
    const targetAcc = accounts.find((a) => a.id === loanAccountId);
    if (disburseToAccount && targetAcc) {
      const signedInLoanCurr = loanDirection === 'borrowed' ? principal : -principal;
      const deltaInAccCurr = convertAmount(signedInLoanCurr, loanCurrency, targetAcc.currency);
      adjustAccountBalance(targetAcc.id, deltaInAccCurr);

      const entry: FinTrackEntry = {
        id: `ft-loan-init-${Date.now()}`,
        title:
          loanDirection === 'borrowed'
            ? `Loan Disbursed: ${newLoan.title} (${provider.name})`
            : `P2P Loan Issued: ${newLoan.title} (${provider.name})`,
        amount: principal,
        currency: loanCurrency,
        type: loanDirection === 'borrowed' ? 'income' : 'expense',
        category: 'Loan',
        accountId: targetAcc.id,
        accountName: targetAcc.name,
        date: new Date().toISOString().slice(0, 10),
      };
      setEntries((prev) => [entry, ...prev]);
    }

    setLoanTitle('');
    setLoanPrincipal('');
    setShowAddLoanForm(false);
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Tracked ${provider.providerType} loan with ${provider.name}: ${formatMoney(
        totalPayable,
        loanCurrency
      )}`,
      'success'
    );
  };

  const handleRecordLoanRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoanTarget) return;
    const amt = parseFloat(repayAmount);
    const remaining = Math.max(0, repayLoanTarget.totalPayable - repayLoanTarget.paidAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      sdk.ui.showToast('Enter a valid repayment amount', 'warning');
      return;
    }

    const actualPay = Math.min(remaining, amt);
    const targetAcc = accounts.find((a) => a.id === repayAccountId);

    if (targetAcc) {
      // If borrowed, repayment deducts from account; if lent, collection credits account
      const signedInLoanCurr =
        repayLoanTarget.direction === 'borrowed' ? -actualPay : actualPay;
      const deltaInAccCurr = convertAmount(
        signedInLoanCurr,
        repayLoanTarget.currency,
        targetAcc.currency
      );
      adjustAccountBalance(targetAcc.id, deltaInAccCurr);
    } else if (repayAccountId === 'SUPERAPP_WALLET') {
      const amtInBase = convertAmount(actualPay, repayLoanTarget.currency, baseCurrency);
      if (repayLoanTarget.direction === 'borrowed') {
        const res = await sdk.payment.pay(
          amtInBase,
          `Loan Repayment: ${repayLoanTarget.title} (${repayLoanTarget.providerName})`
        );
        if (!res.success) return;
      } else {
        await sdk.payment.credit(
          amtInBase,
          `P2P Loan Collected: ${repayLoanTarget.title} (${repayLoanTarget.providerName})`
        );
      }
    }

    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== repayLoanTarget.id) return l;
        const nextPaid = Number((l.paidAmount + actualPay).toFixed(2));
        const isSettled = nextPaid >= l.totalPayable - 0.01;
        return {
          ...l,
          paidAmount: Math.min(l.totalPayable, nextPaid),
          status: isSettled ? 'paid' : l.status,
        };
      })
    );

    const ledgerEntry: FinTrackEntry = {
      id: `ft-loan-repay-${Date.now()}`,
      title:
        repayLoanTarget.direction === 'borrowed'
          ? `Loan Repayment: ${repayLoanTarget.title} (${repayLoanTarget.providerName})`
          : `Loan Collection: ${repayLoanTarget.title} (${repayLoanTarget.providerName})`,
      amount: actualPay,
      currency: repayLoanTarget.currency,
      type: repayLoanTarget.direction === 'borrowed' ? 'expense' : 'income',
      category: 'Loan',
      accountId: targetAcc?.id,
      accountName:
        targetAcc?.name || (repayAccountId === 'SUPERAPP_WALLET' ? 'SuperApp Wallet' : undefined),
      date: new Date().toISOString().slice(0, 10),
      settledViaWallet: repayAccountId === 'SUPERAPP_WALLET',
    };
    setEntries((prev) => [ledgerEntry, ...prev]);

    setRepayLoanTarget(null);
    setRepayAmount('');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Recorded ${formatMoney(actualPay, repayLoanTarget.currency)} for ${repayLoanTarget.title}`,
      'success'
    );
  };

  // Handlers: Scheduled Transactions
  const handleCreateScheduledTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(schedAmount);
    if (!schedTitle.trim() || !Number.isFinite(amt) || amt <= 0) {
      sdk.ui.showToast('Enter a title and valid amount for the scheduled transaction', 'warning');
      return;
    }

    const newSched: ScheduledTransaction = {
      id: `sched-${Date.now()}`,
      title: schedTitle.trim(),
      amount: amt,
      currency: schedCurrency,
      type: schedType,
      category: schedType === 'income' && schedCategory === 'Housing' ? 'Salary' : schedCategory,
      frequency: schedFreq,
      nextRunDate: schedNextDate || new Date().toISOString().slice(0, 10),
      accountId: schedAccountId,
      autoExecute: schedAutoExecute,
      syncToSuperAppWallet: schedSyncSuperApp,
      active: true,
    };

    setScheduledTxs((prev) => [newSched, ...prev]);
    setSchedTitle('');
    setSchedAmount('');
    setShowAddScheduleForm(false);
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Scheduled ${newSched.frequency} ${newSched.type}: ${formatMoney(
        newSched.amount,
        newSched.currency
      )}`,
      'success'
    );
  };

  // Handlers: Savings Goals
  const handleContributeToGoal = async (goal: SavingsGoal, amountInGoalCurr: number) => {
    sdk.ui.hapticFeedback('medium');
    const amountInBase = convertAmount(amountInGoalCurr, goal.currency, baseCurrency);
    const confirmed = await sdk.ui.requestConfirm(
      'Transfer to Savings Vault',
      `Transfer ${formatMoney(amountInGoalCurr, goal.currency)} from your shared Super App Wallet into "${goal.name}"?`
    );
    if (!confirmed) return;

    const res = await sdk.payment.pay(amountInBase, `FinTrack Goal Deposit: ${goal.name}`);
    if (res.success) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? { ...g, savedAmount: Math.min(g.targetAmount, g.savedAmount + amountInGoalCurr) }
            : g
        )
      );
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(
        `Added ${formatMoney(amountInGoalCurr, goal.currency)} to ${goal.name}!`,
        'success'
      );
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
      currency: newGoalCurrency,
      color: '#10b981',
    };
    setGoals((prev) => [...prev, nextGoal]);
    setNewGoalName('');
    setNewGoalTarget('');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`Created savings goal "${nextGoal.name}"`, 'success');
  };

  const filteredAccounts = useMemo(() => {
    if (accountFilter === 'all') return accounts;
    return accounts.filter((a) => a.type === accountFilter);
  }, [accounts, accountFilter]);

  const filteredEntries = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return entries;
    return entries.filter((e) => e.category === selectedCategoryFilter);
  }, [entries, selectedCategoryFilter]);

  const filteredProviders = useMemo(() => {
    if (providerTypeFilter === 'ALL') return loanProviders;
    return loanProviders.filter((p) => p.providerType === providerTypeFilter);
  }, [loanProviders, providerTypeFilter]);

  const filteredLoans = useMemo(() => {
    if (providerTypeFilter === 'ALL') return loans;
    return loans.filter((l) => l.providerType === providerTypeFilter);
  }, [loans, providerTypeFilter]);

  const filteredSchedules = useMemo(() => {
    if (scheduleFilter === 'ALL') return scheduledTxs;
    return scheduledTxs.filter((s) => s.type === scheduleFilter);
  }, [scheduledTxs, scheduleFilter]);

  const isOverAlertThreshold = portfolioSummary.budgetUsedPercent >= alertThresholdPercent;

  return (
    <div className="p-4 space-y-4 pb-28" style={{ color: tokens.textPrimary }}>
      {/* Multi-Currency Selector & FX Rate Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
            const active = baseCurrency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setBaseCurrency(code);
                  sdk.settings.updateSetting('currencySymbol', code);
                  sdk.ui.hapticFeedback('light');
                }}
                style={{
                  backgroundColor: active ? tokens.accentPrimary : tokens.bgSurface,
                  color: active ? tokens.accentContrast : tokens.textSecondary,
                  borderColor: active ? 'transparent' : tokens.borderDefault,
                }}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap shrink-0 transition"
              >
                {code}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowFxModal(!showFxModal);
            sdk.ui.hapticFeedback('light');
          }}
          style={{
            backgroundColor: tokens.bgSurface,
            borderColor: tokens.borderDefault,
            color: tokens.textSecondary,
          }}
          className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition"
        >
          <Coins className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
          <span>FX Rates</span>
        </button>
      </div>

      {/* FX Rates Customization Drawer */}
      {showFxModal && (
        <div
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-3.5 rounded-2xl border space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">
              Exchange Rates (ETB per 1 Unit)
            </span>
            <button
              type="button"
              onClick={() => setShowFxModal(false)}
              className="text-[11px] font-semibold"
              style={{ color: tokens.accentPrimary }}
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['USD', 'EUR', 'GBP', 'AED', 'KES'] as CurrencyCode[]).map((code) => (
              <div
                key={code}
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                }}
                className="p-2 rounded-xl border flex items-center justify-between gap-2"
              >
                <span className="text-[11px] font-bold">{code}/ETB</span>
                <input
                  type="number"
                  step="0.01"
                  value={fxRatesToEtb[code]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (Number.isFinite(val) && val > 0) {
                      setFxRatesToEtb((prev) => ({ ...prev, [code]: val }));
                    }
                  }}
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-20 px-2 py-1 rounded-lg border text-right text-xs font-mono tabular-nums focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Wealth & Multi-Account Overview Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${tokens.accentPrimary}, ${tokens.accentHover})`,
          boxShadow: `0 10px 28px ${tokens.accentGlow}`,
          color: '#ffffff',
        }}
        className="rounded-3xl p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold opacity-85">
              Total Net Worth ({baseCurrency})
            </span>
            <div className="text-2xl font-black tracking-tight tabular-nums mt-0.5">
              {formatMoney(portfolioSummary.netWorthBase, baseCurrency)}
            </div>
            <div className="text-[11px] opacity-85 mt-0.5 tabular-nums">
              Liquid Accounts: {formatMoney(portfolioSummary.totalAccountsBase, baseCurrency)} · Cashflow:{' '}
              {formatMoney(portfolioSummary.netCashflowBase, baseCurrency)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setHideBalances(!hideBalances);
              sdk.ui.hapticFeedback('light');
            }}
            className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Toggle balance privacy"
          >
            {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* 3-Column Breakdown: Bank vs Wallet vs Loans */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="text-[10px] opacity-80 flex items-center gap-1">
              <Landmark className="w-3 h-3 shrink-0" />
              <span className="truncate">Banks</span>
            </div>
            <div className="text-xs font-extrabold truncate tabular-nums mt-1">
              {formatMoney(portfolioSummary.totalBankBase, baseCurrency)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="text-[10px] opacity-80 flex items-center gap-1">
              <Wallet className="w-3 h-3 shrink-0" />
              <span className="truncate">Wallets</span>
            </div>
            <div className="text-xs font-extrabold truncate tabular-nums mt-1">
              {formatMoney(portfolioSummary.totalWalletBase, baseCurrency)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="text-[10px] opacity-80 flex items-center gap-1">
              <Briefcase className="w-3 h-3 shrink-0" />
              <span className="truncate">Loan Debt</span>
            </div>
            <div className="text-xs font-extrabold truncate tabular-nums mt-1">
              {formatMoney(portfolioSummary.activeBorrowedBase, baseCurrency)}
            </div>
          </div>
        </div>

        {/* SuperApp Shared Wallet Bridge Strip */}
        <div className="pt-3 border-t border-white/20 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold opacity-90 flex items-center gap-1">
              <Share2 className="w-3 h-3 shrink-0" />
              <span className="truncate">
                Shared with SuperApp Wallet ({portfolioSummary.sharedAccountsCount} linked)
              </span>
            </div>
            <div className="text-xs font-extrabold tabular-nums truncate mt-0.5">
              FinTrack Shared: {formatMoney(portfolioSummary.sharedBalanceBase, baseCurrency)} · Host Wallet: $
              {sdk.payment.getBalance().toFixed(2)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => pushSharedBalanceToSuperApp(accounts, false)}
            className="px-3 py-2 rounded-xl bg-white text-slate-950 font-bold text-[11px] flex items-center gap-1.5 shrink-0 shadow-sm hover:bg-slate-100 transition ios-active"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Wallet</span>
          </button>
        </div>
      </div>

      {/* Budget Threshold Alert Banner */}
      {isOverAlertThreshold && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Monthly expenses reached <strong>{portfolioSummary.budgetUsedPercent}%</strong> of your{' '}
            {formatMoney(monthlyBudgetLimit, baseCurrency)} budget limit.
          </span>
        </div>
      )}

      {/* Primary Section Navigation Bar */}
      <div
        className="grid grid-cols-6 gap-1 p-1 rounded-2xl border"
        style={{
          backgroundColor: tokens.bgSurface,
          borderColor: tokens.borderDefault,
        }}
      >
        {[
          { id: 'accounts', label: 'Accounts', icon: Landmark },
          { id: 'ledger', label: 'Ledger', icon: TrendingUp },
          { id: 'loans', label: 'Loans', icon: Briefcase },
          { id: 'scheduled', label: 'Schedule', icon: CalendarClock },
          { id: 'analytics', label: 'Insights', icon: PieChart },
          { id: 'goals', label: 'Goals', icon: Target },
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
              className="py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition whitespace-nowrap"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: MULTI-ACCOUNT MANAGEMENT (BANK & DIGITAL WALLET + SUPERAPP SYNC)
         ===================================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-3">
          {/* Filter + Action Controls */}
          <div className="flex items-center justify-between gap-2">
            <div
              className="flex items-center gap-1 p-1 rounded-xl border"
              style={{
                backgroundColor: tokens.bgSurface,
                borderColor: tokens.borderDefault,
              }}
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'bank', label: 'Banks' },
                  { id: 'wallet', label: 'Wallets' },
                ] as const
              ).map((f) => {
                const active = accountFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setAccountFilter(f.id);
                      sdk.ui.hapticFeedback('light');
                    }}
                    style={{
                      backgroundColor: active ? tokens.accentPrimary : 'transparent',
                      color: active ? tokens.accentContrast : tokens.textSecondary,
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition"
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              {accounts.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferForm(!showTransferForm);
                    setShowAddAccountForm(false);
                    if (!transferFromId && accounts[0]) setTransferFromId(accounts[0].id);
                    if (!transferToId && accounts[1]) setTransferToId(accounts[1].id);
                  }}
                  style={{
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowAddAccountForm(!showAddAccountForm);
                  setShowTransferForm(false);
                }}
                style={{
                  backgroundColor: tokens.accentPrimary,
                  color: tokens.accentContrast,
                }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </div>
          </div>

          {/* SuperApp Shared Balance Auto-Sync Card */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
                <span>Auto-Share Balance to SuperApp Wallet</span>
              </div>
              <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                Accounts toggled as Shared sync their total balance directly to the host SuperApp Wallet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !autoSyncSuperApp;
                setAutoSyncSuperApp(next);
                if (next) pushSharedBalanceToSuperApp(accounts, false);
              }}
              style={{
                backgroundColor: autoSyncSuperApp ? tokens.accentPrimary : tokens.bgSurface,
                color: autoSyncSuperApp ? tokens.accentContrast : tokens.textSecondary,
                borderColor: autoSyncSuperApp ? 'transparent' : tokens.borderDefault,
              }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-bold shrink-0 transition"
            >
              {autoSyncSuperApp ? 'Auto-Sync On' : 'Manual Only'}
            </button>
          </div>

          {/* Add Bank or Wallet Account Form */}
          {showAddAccountForm && (
            <form
              onSubmit={handleCreateAccount}
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold">New Bank or Digital Wallet Account</h4>
                <button
                  type="button"
                  onClick={() => setShowAddAccountForm(false)}
                  className="text-[11px]"
                  style={{ color: tokens.textSecondary }}
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['bank', 'wallet'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setAccType(t);
                      const firstMatch = INSTITUTION_PRESETS.find((p) => p.type === t);
                      if (firstMatch) {
                        setAccInstitution(firstMatch.name);
                        setAccCurrency(firstMatch.defaultCurrency);
                      }
                    }}
                    style={{
                      backgroundColor: accType === t ? tokens.accentPrimary : tokens.bgSurface,
                      color: accType === t ? tokens.accentContrast : tokens.textSecondary,
                      borderColor: accType === t ? 'transparent' : tokens.borderDefault,
                    }}
                    className="py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    {t === 'bank' ? (
                      <>
                        <Landmark className="w-3.5 h-3.5" />
                        <span>Bank Account</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Digital Wallet</span>
                      </>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Institution / Provider
                  </label>
                  <select
                    value={accInstitution}
                    onChange={(e) => {
                      setAccInstitution(e.target.value);
                      if (!accName) setAccName(e.target.value.split(' (')[0]);
                    }}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                  >
                    {INSTITUTION_PRESETS.filter((p) => p.type === accType).map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    <option value="Custom Institution">Custom Institution</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Account Nickname
                  </label>
                  <input
                    type="text"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder={accType === 'bank' ? 'e.g. CBE Main Saving' : 'e.g. Telebirr Personal'}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Currency
                  </label>
                  <select
                    value={accCurrency}
                    onChange={(e) => setAccCurrency(e.target.value as CurrencyCode)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none"
                  >
                    {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    placeholder="0.00"
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Acc # / Phone
                  </label>
                  <input
                    type="text"
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    placeholder={accType === 'bank' ? '1000...' : '+2519...'}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>
              </div>

              <label
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                }}
                className="p-2.5 rounded-xl border flex items-center justify-between cursor-pointer"
              >
                <span className="text-xs font-semibold">
                  Share this account&apos;s balance with SuperApp Shared Wallet
                </span>
                <input
                  type="checkbox"
                  checked={accShareSuperApp}
                  onChange={(e) => setAccShareSuperApp(e.target.checked)}
                  className="h-4 w-4 accent-teal-500"
                />
              </label>

              <button
                type="submit"
                style={{
                  backgroundColor: tokens.accentPrimary,
                  color: tokens.accentContrast,
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition ios-active"
              >
                Save Account
              </button>
            </form>
          )}

          {/* Inter-Account Multi-Currency Transfer Form */}
          {showTransferForm && (
            <form
              onSubmit={handleTransferBetweenAccounts}
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold">Inter-Account Transfer (Multi-Currency FX)</h4>
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="text-[11px]"
                  style={{ color: tokens.textSecondary }}
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    From Account
                  </label>
                  <select
                    value={transferFromId}
                    onChange={(e) => setTransferFromId(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency} {a.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    To Account
                  </label>
                  <select
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                  Transfer Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                />
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: tokens.accentPrimary,
                  color: tokens.accentContrast,
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition ios-active"
              >
                Complete Transfer
              </button>
            </form>
          )}

          {/* Accounts List */}
          <div className="space-y-2.5">
            {filteredAccounts.length === 0 ? (
              <div
                style={{
                  backgroundColor: tokens.bgCard,
                  borderColor: tokens.borderDefault,
                }}
                className="p-6 rounded-2xl border text-center space-y-2"
              >
                <Landmark className="w-6 h-6 mx-auto opacity-50" />
                <p className="text-xs font-bold">No Bank or Wallet Accounts Added Yet</p>
                <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                  Add your Ethiopian or international bank accounts (CBE, Awash, Dashen) and digital wallets (Telebirr, M-Pesa, CBE Birr) in ETB or foreign currencies.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddAccountForm(true)}
                  style={{
                    backgroundColor: tokens.accentPrimary,
                    color: tokens.accentContrast,
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition ios-active mt-1"
                >
                  + Add First Bank or Wallet
                </button>
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const convertedToBase = convertAmount(acc.balance, acc.currency, baseCurrency);
                return (
                  <div
                    key={acc.id}
                    style={{
                      backgroundColor: tokens.bgCard,
                      borderColor: tokens.borderDefault,
                    }}
                    className="p-4 rounded-2xl border space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: acc.color }}
                        >
                          {acc.type === 'bank' ? (
                            <Building2 className="w-5 h-5" />
                          ) : (
                            <Wallet className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{acc.name}</div>
                          <div
                            className="text-[11px] truncate"
                            style={{ color: tokens.textSecondary }}
                          >
                            {acc.institution} · {acc.type === 'bank' ? 'Bank' : 'Wallet'} · {acc.accountNumber}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black tabular-nums">
                          {formatMoney(acc.balance, acc.currency)}
                        </div>
                        {acc.currency !== baseCurrency && (
                          <div
                            className="text-[10px] font-mono tabular-nums"
                            style={{ color: tokens.textMuted }}
                          >
                            ≈ {formatMoney(convertedToBase, baseCurrency)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="pt-2.5 border-t flex items-center justify-between gap-2"
                      style={{ borderColor: tokens.borderDefault }}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleAccountShare(acc.id)}
                        style={{
                          backgroundColor: acc.shareWithSuperApp
                            ? tokens.accentMuted
                            : tokens.bgSurface,
                          color: acc.shareWithSuperApp
                            ? tokens.accentPrimary
                            : tokens.textSecondary,
                          borderColor: acc.shareWithSuperApp
                            ? tokens.borderAccent
                            : tokens.borderDefault,
                        }}
                        className="px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>
                          {acc.shareWithSuperApp
                            ? 'Shared with SuperApp Wallet'
                            : 'Share with SuperApp'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                        aria-label="Delete account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: TRANSACTIONS LEDGER (MULTI-CURRENCY + ACCOUNT LINKED)
         ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            {/* Category Filter Buttons */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  'ALL',
                  'Housing',
                  'Dining',
                  'Transit',
                  'Utilities',
                  'Subscriptions',
                  'Shopping',
                  'Loan',
                  'Salary',
                  'Business',
                ] as const
              ).map((cat) => {
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
                    className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold whitespace-nowrap shrink-0 transition"
                  >
                    {cat === 'ALL' ? 'All Activity' : cat}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowAddTxForm(!showAddTxForm)}
              style={{
                backgroundColor: tokens.accentPrimary,
                color: tokens.accentContrast,
              }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
          </div>

          {showAddTxForm && (
            <form
              onSubmit={handleAddTransaction}
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold">Record Income or Expense</h3>
                <button
                  type="button"
                  onClick={() => setShowAddTxForm(false)}
                  className="text-[11px]"
                  style={{ color: tokens.textSecondary }}
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTxType(t);
                      setTxCategory(t === 'income' ? 'Salary' : 'Dining');
                    }}
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
                  placeholder="e.g. Monthly Salary, Supermarket, EthioTelecom Fiber..."
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Amount
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
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Currency
                  </label>
                  <select
                    value={txCurrency}
                    onChange={(e) => setTxCurrency(e.target.value as CurrencyCode)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none"
                  >
                    {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Category
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as FinTrackCategory)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                  >
                    {txType === 'income' ? (
                      <>
                        <option value="Salary">Salary</option>
                        <option value="Business">Business</option>
                        <option value="Income">Other Income</option>
                      </>
                    ) : (
                      <>
                        <option value="Dining">Dining</option>
                        <option value="Housing">Housing</option>
                        <option value="Transit">Transit</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Subscriptions">Subscriptions</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Loan">Loan</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                  Bank or Wallet Account (Optional)
                </label>
                <select
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                >
                  <option value="">— Do not link to specific account —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency} {a.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

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
                    <span>
                      {txType === 'expense'
                        ? 'Deduct from Shared SuperApp Wallet'
                        : 'Credit to Shared SuperApp Wallet'}
                    </span>
                  </div>
                  <div className="text-[10px]" style={{ color: tokens.textSecondary }}>
                    Host SuperApp Wallet Balance: ${sdk.payment.getBalance().toFixed(2)}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={chargeSuperAppWallet}
                  onChange={(e) => setChargeSuperAppWallet(e.target.checked)}
                  className="h-4 w-4 accent-teal-500"
                />
              </label>

              <button
                type="submit"
                style={{
                  backgroundColor: tokens.accentPrimary,
                  color: tokens.accentContrast,
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition ios-active"
              >
                Save Transaction
              </button>
            </form>
          )}

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
                  Tap Record to log multi-currency income or expenses linked to your bank or wallet accounts.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddTxForm(true)}
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
                        className="text-[10px] mt-0.5 truncate"
                        style={{ color: tokens.textMuted }}
                      >
                        {entry.category} · {entry.date}
                        {entry.accountName ? ` · ${entry.accountName}` : ''}
                        {entry.settledViaWallet ? ' · SuperApp Wallet' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-xs font-extrabold tabular-nums ${
                          entry.type === 'income' ? 'text-emerald-400' : ''
                        }`}
                      >
                        {entry.type === 'income' ? '+' : '-'}
                        {formatMoney(entry.amount, entry.currency)}
                      </div>
                      {entry.currency !== baseCurrency && (
                        <div
                          className="text-[10px] font-mono tabular-nums"
                          style={{ color: tokens.textMuted }}
                        >
                          ≈ {formatMoney(convertAmount(entry.amount, entry.currency, baseCurrency), baseCurrency)}
                        </div>
                      )}
                    </div>
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

      {/* =====================================================================
          TAB 3: LOAN TRACKING & LOAN PROVIDER MANAGEMENT (B2C & P2P)
         ===================================================================== */}
      {activeTab === 'loans' && (
        <div className="space-y-3">
          {/* Loan KPI Strip */}
          <div className="grid grid-cols-2 gap-2.5">
            <div
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-3.5 rounded-2xl border"
            >
              <div className="text-[10px] font-semibold" style={{ color: tokens.textSecondary }}>
                Outstanding Borrowed (B2C & P2P)
              </div>
              <div className="text-sm font-black text-rose-400 tabular-nums mt-1">
                {formatMoney(portfolioSummary.activeBorrowedBase, baseCurrency)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-3.5 rounded-2xl border"
            >
              <div className="text-[10px] font-semibold" style={{ color: tokens.textSecondary }}>
                Receivable Lent (P2P)
              </div>
              <div className="text-sm font-black text-emerald-400 tabular-nums mt-1">
                {formatMoney(portfolioSummary.activeLentBase, baseCurrency)}
              </div>
            </div>
          </div>

          {/* Sub-Navigation: Loans vs Providers + B2C/P2P Filter */}
          <div className="flex items-center justify-between gap-2">
            <div
              className="flex items-center gap-1 p-1 rounded-xl border"
              style={{
                backgroundColor: tokens.bgSurface,
                borderColor: tokens.borderDefault,
              }}
            >
              <button
                type="button"
                onClick={() => setLoanSubTab('loans')}
                style={{
                  backgroundColor: loanSubTab === 'loans' ? tokens.accentPrimary : 'transparent',
                  color: loanSubTab === 'loans' ? tokens.accentContrast : tokens.textSecondary,
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition"
              >
                Loans ({loans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanSubTab('providers')}
                style={{
                  backgroundColor:
                    loanSubTab === 'providers' ? tokens.accentPrimary : 'transparent',
                  color: loanSubTab === 'providers' ? tokens.accentContrast : tokens.textSecondary,
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition"
              >
                Providers ({loanProviders.length})
              </button>
            </div>

            <div className="flex items-center gap-1">
              {(['ALL', 'B2C', 'P2P'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProviderTypeFilter(type)}
                  style={{
                    backgroundColor:
                      providerTypeFilter === type ? tokens.accentMuted : tokens.bgSurface,
                    color:
                      providerTypeFilter === type ? tokens.accentPrimary : tokens.textSecondary,
                    borderColor:
                      providerTypeFilter === type ? tokens.borderAccent : tokens.borderDefault,
                  }}
                  className="px-2.5 py-1 rounded-lg border text-[10px] font-bold whitespace-nowrap transition"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset B2C & P2P Providers Bar */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-3 rounded-2xl border space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold">
                Quick-Add B2C & P2P Loan Providers
              </span>
              <button
                type="button"
                onClick={() => {
                  setLoanSubTab('providers');
                  setShowAddProviderForm(true);
                }}
                className="text-[11px] font-bold"
                style={{ color: tokens.accentPrimary }}
              >
                + Custom Provider
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleLoadPresetProvider(preset)}
                  style={{
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="px-2.5 py-1.5 rounded-xl border text-[10px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 hover:opacity-90 transition"
                >
                  {preset.providerType === 'B2C' ? (
                    <Building2 className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <Users className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>
                    {preset.name} · {preset.providerType}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SUB-TAB A: LOAN PROVIDERS MANAGEMENT (B2C & P2P) */}
          {loanSubTab === 'providers' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddProviderForm(!showAddProviderForm)}
                  style={{
                    backgroundColor: tokens.accentPrimary,
                    color: tokens.accentContrast,
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Loan Provider</span>
                </button>
              </div>

              {showAddProviderForm && (
                <form
                  onSubmit={handleAddLoanProvider}
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-4 rounded-2xl border space-y-3"
                >
                  <h4 className="text-xs font-bold">Register B2C or P2P Loan Provider</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['B2C', 'P2P'] as const).map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setProvType(pt)}
                        style={{
                          backgroundColor:
                            provType === pt ? tokens.accentPrimary : tokens.bgSurface,
                          color: provType === pt ? tokens.accentContrast : tokens.textSecondary,
                          borderColor: provType === pt ? 'transparent' : tokens.borderDefault,
                        }}
                        className="py-2 rounded-xl border text-xs font-bold transition"
                      >
                        {pt === 'B2C' ? 'B2C (Bank / FinTech)' : 'P2P (Peer / Equb)'}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Provider Name
                      </label>
                      <input
                        type="text"
                        value={provName}
                        onChange={(e) => setProvName(e.target.value)}
                        placeholder={provType === 'B2C' ? 'e.g. CBE Michu' : 'e.g. Abebe Kebede'}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Reference / Contact
                      </label>
                      <input
                        type="text"
                        value={provContact}
                        onChange={(e) => setProvContact(e.target.value)}
                        placeholder={provType === 'B2C' ? '*847# / App' : '+251 911...'}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Default Interest (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={provInterest}
                        onChange={(e) => setProvInterest(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Credit Limit
                      </label>
                      <input
                        type="number"
                        step="100"
                        value={provMaxLimit}
                        onChange={(e) => setProvMaxLimit(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Currency
                      </label>
                      <select
                        value={provCurrency}
                        onChange={(e) => setProvCurrency(e.target.value as CurrencyCode)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none"
                      >
                        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      backgroundColor: tokens.accentPrimary,
                      color: tokens.accentContrast,
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition ios-active"
                  >
                    Save Loan Provider
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {filteredProviders.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: tokens.bgCard,
                      borderColor: tokens.borderDefault,
                    }}
                    className="p-6 rounded-2xl border text-center space-y-2"
                  >
                    <Users className="w-6 h-6 mx-auto opacity-50" />
                    <p className="text-xs font-bold">No Loan Providers Added Yet</p>
                    <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                      Tap any B2C or P2P preset above or click New Loan Provider to register institutional or peer lenders.
                    </p>
                  </div>
                ) : (
                  filteredProviders.map((prov) => (
                    <div
                      key={prov.id}
                      style={{
                        backgroundColor: tokens.bgCard,
                        borderColor: tokens.borderDefault,
                      }}
                      className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{prov.name}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: tokens.textSecondary }}>
                          {prov.providerType} · {prov.defaultInterestRate}% interest · Limit{' '}
                          {formatMoney(prov.maxLimit, prov.currency)} · {prov.contactOrRef}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setLoanProviderId(prov.id);
                            setLoanInterest(String(prov.defaultInterestRate));
                            setLoanCurrency(prov.currency);
                            setLoanSubTab('loans');
                            setShowAddLoanForm(true);
                          }}
                          style={{
                            backgroundColor: tokens.accentPrimary,
                            color: tokens.accentContrast,
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition"
                        >
                          + Track Loan
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLoanProviders((prev) => prev.filter((p) => p.id !== prov.id))
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                          aria-label="Remove provider"
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

          {/* SUB-TAB B: ACTIVE LOANS & REPAYMENT TRACKING */}
          {loanSubTab === 'loans' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddLoanForm(!showAddLoanForm)}
                  style={{
                    backgroundColor: tokens.accentPrimary,
                    color: tokens.accentContrast,
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Loan Record</span>
                </button>
              </div>

              {showAddLoanForm && (
                <form
                  onSubmit={handleCreateLoan}
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-4 rounded-2xl border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold">Track New B2C or P2P Loan</h4>
                    <button
                      type="button"
                      onClick={() => setShowAddLoanForm(false)}
                      className="text-[11px]"
                      style={{ color: tokens.textSecondary }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(['borrowed', 'lent'] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setLoanDirection(dir)}
                        style={{
                          backgroundColor:
                            loanDirection === dir ? tokens.accentPrimary : tokens.bgSurface,
                          color:
                            loanDirection === dir ? tokens.accentContrast : tokens.textSecondary,
                          borderColor: loanDirection === dir ? 'transparent' : tokens.borderDefault,
                        }}
                        className="py-2 rounded-xl border text-xs font-bold transition"
                      >
                        {dir === 'borrowed' ? 'Borrowed (I Owe)' : 'Lent (Owed to Me)'}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Loan Purpose / Title
                      </label>
                      <input
                        type="text"
                        value={loanTitle}
                        onChange={(e) => setLoanTitle(e.target.value)}
                        placeholder="e.g. Working Capital, Emergency Credit..."
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Loan Provider (B2C / P2P)
                      </label>
                      <select
                        value={loanProviderId}
                        onChange={(e) => {
                          setLoanProviderId(e.target.value);
                          const found = loanProviders.find((p) => p.id === e.target.value);
                          if (found) {
                            setLoanInterest(String(found.defaultInterestRate));
                            setLoanCurrency(found.currency);
                          }
                        }}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                      >
                        <option value="">Select Provider...</option>
                        {loanProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.providerType}] {p.name} ({p.defaultInterestRate}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Principal
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={loanPrincipal}
                        onChange={(e) => setLoanPrincipal(e.target.value)}
                        placeholder="0.00"
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Interest (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={loanInterest}
                        onChange={(e) => setLoanInterest(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Currency
                      </label>
                      <select
                        value={loanCurrency}
                        onChange={(e) => setLoanCurrency(e.target.value as CurrencyCode)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none"
                      >
                        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={loanDueDate}
                        onChange={(e) => setLoanDueDate(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Target Bank / Wallet
                      </label>
                      <select
                        value={loanAccountId}
                        onChange={(e) => setLoanAccountId(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                      >
                        <option value="">None</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loanAccountId && (
                    <label
                      style={{
                        backgroundColor: tokens.bgSurface,
                        borderColor: tokens.borderDefault,
                      }}
                      className="p-2.5 rounded-xl border flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-xs font-semibold">
                        {loanDirection === 'borrowed'
                          ? 'Deposit disbursed loan principal into selected account'
                          : 'Deduct lent principal from selected account'}
                      </span>
                      <input
                        type="checkbox"
                        checked={disburseToAccount}
                        onChange={(e) => setDisburseToAccount(e.target.checked)}
                        className="h-4 w-4 accent-teal-500"
                      />
                    </label>
                  )}

                  <button
                    type="submit"
                    style={{
                      backgroundColor: tokens.accentPrimary,
                      color: tokens.accentContrast,
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition ios-active"
                  >
                    Save Loan Record
                  </button>
                </form>
              )}

              {/* Repayment Form Modal/Drawer */}
              {repayLoanTarget && (
                <form
                  onSubmit={handleRecordLoanRepayment}
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderAccent,
                  }}
                  className="p-4 rounded-2xl border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold">
                      {repayLoanTarget.direction === 'borrowed'
                        ? `Repay Loan: ${repayLoanTarget.title}`
                        : `Record Collection: ${repayLoanTarget.title}`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setRepayLoanTarget(null)}
                      className="text-[11px]"
                      style={{ color: tokens.textSecondary }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Amount ({repayLoanTarget.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                        Settle Via Account
                      </label>
                      <select
                        value={repayAccountId}
                        onChange={(e) => setRepayAccountId(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                      >
                        <option value="">Manual (No Account Change)</option>
                        <option value="SUPERAPP_WALLET">SuperApp Shared Wallet</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.currency} {a.balance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      backgroundColor: tokens.accentPrimary,
                      color: tokens.accentContrast,
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition ios-active"
                  >
                    Confirm Settlement
                  </button>
                </form>
              )}

              {/* Loans List */}
              <div className="space-y-2.5">
                {filteredLoans.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: tokens.bgCard,
                      borderColor: tokens.borderDefault,
                    }}
                    className="p-6 rounded-2xl border text-center space-y-2"
                  >
                    <Briefcase className="w-6 h-6 mx-auto opacity-50" />
                    <p className="text-xs font-bold">No Active B2C or P2P Loans</p>
                    <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                      Add a B2C provider (Telebirr Mela, CBE Michu, Dashen DubeAle) or P2P peer lender above, then record a loan to track installments.
                    </p>
                  </div>
                ) : (
                  filteredLoans.map((loan) => {
                    const remaining = Math.max(0, loan.totalPayable - loan.paidAmount);
                    const pct =
                      loan.totalPayable > 0
                        ? Math.min(100, Math.round((loan.paidAmount / loan.totalPayable) * 100))
                        : 100;
                    return (
                      <div
                        key={loan.id}
                        style={{
                          backgroundColor: tokens.bgCard,
                          borderColor: tokens.borderDefault,
                        }}
                        className="p-4 rounded-2xl border space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{loan.title}</div>
                            <div
                              className="text-[11px] mt-0.5"
                              style={{ color: tokens.textSecondary }}
                            >
                              {loan.providerName} · {loan.providerType} ·{' '}
                              {loan.direction === 'borrowed' ? 'Borrowed' : 'Lent'} ·{' '}
                              {loan.interestRate}% · Due {loan.dueDate}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`text-xs font-extrabold tabular-nums ${
                                loan.status === 'paid'
                                  ? 'text-emerald-400'
                                  : loan.direction === 'borrowed'
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {loan.status === 'paid'
                                ? 'Settled'
                                : `${formatMoney(remaining, loan.currency)} left`}
                            </div>
                            <div
                              className="text-[10px] font-mono tabular-nums"
                              style={{ color: tokens.textMuted }}
                            >
                              of {formatMoney(loan.totalPayable, loan.currency)} ({pct}%)
                            </div>
                          </div>
                        </div>

                        <div
                          className="w-full h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: tokens.bgSurface }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300 bg-teal-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px]" style={{ color: tokens.textMuted }}>
                            Principal: {formatMoney(loan.principalAmount, loan.currency)} · Paid:{' '}
                            {formatMoney(loan.paidAmount, loan.currency)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {loan.status !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRepayLoanTarget(loan);
                                  setRepayAmount(String(remaining.toFixed(2)));
                                  setRepayAccountId(loan.accountId || '');
                                }}
                                style={{
                                  backgroundColor: tokens.accentPrimary,
                                  color: tokens.accentContrast,
                                }}
                                className="px-3 py-1 rounded-xl text-[10px] font-bold transition ios-active"
                              >
                                {loan.direction === 'borrowed' ? 'Repay' : 'Collect'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setLoans((prev) => prev.filter((item) => item.id !== loan.id))
                              }
                              className="p-1 text-slate-400 hover:text-rose-400 transition"
                              aria-label="Delete loan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: SCHEDULED TRANSACTIONS (BOTH INCOME & EXPENSE)
         ===================================================================== */}
      {activeTab === 'scheduled' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div
              className="flex items-center gap-1 p-1 rounded-xl border"
              style={{
                backgroundColor: tokens.bgSurface,
                borderColor: tokens.borderDefault,
              }}
            >
              {(
                [
                  { id: 'ALL', label: 'All Scheduled' },
                  { id: 'income', label: 'Income' },
                  { id: 'expense', label: 'Expense' },
                ] as const
              ).map((f) => {
                const active = scheduleFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setScheduleFilter(f.id)}
                    style={{
                      backgroundColor: active ? tokens.accentPrimary : 'transparent',
                      color: active ? tokens.accentContrast : tokens.textSecondary,
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition"
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowAddScheduleForm(!showAddScheduleForm)}
              style={{
                backgroundColor: tokens.accentPrimary,
                color: tokens.accentContrast,
              }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Schedule</span>
            </button>
          </div>

          {showAddScheduleForm && (
            <form
              onSubmit={handleCreateScheduledTx}
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold">New Scheduled Income or Expense</h4>
                <button
                  type="button"
                  onClick={() => setShowAddScheduleForm(false)}
                  className="text-[11px]"
                  style={{ color: tokens.textSecondary }}
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSchedType(t);
                      setSchedCategory(t === 'income' ? 'Salary' : 'Housing');
                    }}
                    style={{
                      backgroundColor: schedType === t ? tokens.accentPrimary : tokens.bgSurface,
                      color: schedType === t ? tokens.accentContrast : tokens.textSecondary,
                      borderColor: schedType === t ? 'transparent' : tokens.borderDefault,
                    }}
                    className="py-2 rounded-xl border text-xs font-bold capitalize transition"
                  >
                    Scheduled {t}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                  Title / Description
                </label>
                <input
                  type="text"
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  placeholder={
                    schedType === 'income'
                      ? 'e.g. Monthly Salary, Consulting Retainer'
                      : 'e.g. Apartment Rent, EthioTelecom Broadband'
                  }
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={schedAmount}
                    onChange={(e) => setSchedAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Currency
                  </label>
                  <select
                    value={schedCurrency}
                    onChange={(e) => setSchedCurrency(e.target.value as CurrencyCode)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none"
                  >
                    {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Frequency
                  </label>
                  <select
                    value={schedFreq}
                    onChange={(e) => setSchedFreq(e.target.value as ScheduleFrequency)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="once">One-Time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Next Run Date
                  </label>
                  <input
                    type="date"
                    value={schedNextDate}
                    onChange={(e) => setSchedNextDate(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Linked Account
                  </label>
                  <select
                    value={schedAccountId}
                    onChange={(e) => setSchedAccountId(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                  >
                    <option value="">No specific account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  style={{
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-2.5 rounded-xl border flex items-center justify-between cursor-pointer"
                >
                  <span className="text-xs font-semibold">
                    Auto-post to Ledger & Account on due date
                  </span>
                  <input
                    type="checkbox"
                    checked={schedAutoExecute}
                    onChange={(e) => setSchedAutoExecute(e.target.checked)}
                    className="h-4 w-4 accent-teal-500"
                  />
                </label>

                <label
                  style={{
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-2.5 rounded-xl border flex items-center justify-between cursor-pointer"
                >
                  <span className="text-xs font-semibold">
                    Also settle against SuperApp Shared Wallet
                  </span>
                  <input
                    type="checkbox"
                    checked={schedSyncSuperApp}
                    onChange={(e) => setSchedSyncSuperApp(e.target.checked)}
                    className="h-4 w-4 accent-teal-500"
                  />
                </label>
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: tokens.accentPrimary,
                  color: tokens.accentContrast,
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition ios-active"
              >
                Save Scheduled Transaction
              </button>
            </form>
          )}

          {/* Scheduled List */}
          <div className="space-y-2.5">
            {filteredSchedules.length === 0 ? (
              <div
                style={{
                  backgroundColor: tokens.bgCard,
                  borderColor: tokens.borderDefault,
                }}
                className="p-6 rounded-2xl border text-center space-y-2"
              >
                <CalendarClock className="w-6 h-6 mx-auto opacity-50" />
                <p className="text-xs font-bold">No Scheduled Income or Expenses</p>
                <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                  Automate recurring salaries, rent, subscriptions, or loan installments and post them to your accounts with one tap.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddScheduleForm(true)}
                  style={{
                    backgroundColor: tokens.accentPrimary,
                    color: tokens.accentContrast,
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold transition ios-active mt-1"
                >
                  + Schedule Income or Expense
                </button>
              </div>
            ) : (
              filteredSchedules.map((sched) => {
                const linkedAcc = accounts.find((a) => a.id === sched.accountId);
                return (
                  <div
                    key={sched.id}
                    style={{
                      backgroundColor: tokens.bgCard,
                      borderColor: tokens.borderDefault,
                    }}
                    className="p-4 rounded-2xl border space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{sched.title}</div>
                        <div
                          className="text-[11px] mt-0.5"
                          style={{ color: tokens.textSecondary }}
                        >
                          {sched.type === 'income' ? 'Scheduled Income' : 'Scheduled Expense'} ·{' '}
                          <span className="capitalize">{sched.frequency}</span> · Next:{' '}
                          {sched.nextRunDate}
                          {linkedAcc ? ` · ${linkedAcc.name}` : ''}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-extrabold tabular-nums ${
                            sched.type === 'income' ? 'text-emerald-400' : ''
                          }`}
                        >
                          {sched.type === 'income' ? '+' : '-'}
                          {formatMoney(sched.amount, sched.currency)}
                        </div>
                        <div className="text-[10px]" style={{ color: tokens.textMuted }}>
                          {sched.active ? (sched.autoExecute ? 'Auto-Post' : 'Manual') : 'Paused'}
                        </div>
                      </div>
                    </div>

                    <div
                      className="pt-2 border-t flex items-center justify-between gap-2"
                      style={{ borderColor: tokens.borderDefault }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setScheduledTxs((prev) =>
                            prev.map((s) =>
                              s.id === sched.id ? { ...s, active: !s.active } : s
                            )
                          )
                        }
                        style={{
                          backgroundColor: tokens.bgSurface,
                          borderColor: tokens.borderDefault,
                          color: tokens.textSecondary,
                        }}
                        className="px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        {sched.active ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => executeScheduledTransaction(sched, false)}
                          style={{
                            backgroundColor: tokens.accentPrimary,
                            color: tokens.accentContrast,
                          }}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ios-active"
                        >
                          <Check className="w-3 h-3" />
                          <span>Post Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setScheduledTxs((prev) => prev.filter((s) => s.id !== sched.id))
                          }
                          className="p-1 text-slate-400 hover:text-rose-400 transition"
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: CATEGORY ANALYTICS & BUDGET BREAKDOWN
         ===================================================================== */}
      {activeTab === 'analytics' && (
        <div
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-4 rounded-2xl border space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold">
              Spending by Category ({baseCurrency})
            </h3>
            <span className="text-xs font-mono tabular-nums" style={{ color: tokens.textMuted }}>
              Total: {formatMoney(portfolioSummary.totalExpenseBase, baseCurrency)}
            </span>
          </div>

          <div className="space-y-3">
            {(
              [
                'Housing',
                'Dining',
                'Transit',
                'Utilities',
                'Subscriptions',
                'Shopping',
                'Loan',
              ] as const
            ).map((cat) => {
              const catTotal = portfolioSummary.byCategory[cat] || 0;
              const pct =
                portfolioSummary.totalExpenseBase > 0
                  ? Math.round((catTotal / portfolioSummary.totalExpenseBase) * 100)
                  : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{cat}</span>
                    <span
                      className="font-mono text-[11px] tabular-nums"
                      style={{ color: tokens.textSecondary }}
                    >
                      {formatMoney(catTotal, baseCurrency)} ({pct}%)
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
            })}
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
                <span>Monthly Budget Target ({baseCurrency})</span>
              </span>
              <span className="font-mono font-bold tabular-nums">
                {formatMoney(monthlyBudgetLimit, baseCurrency)}
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={250000}
              step={1000}
              value={monthlyBudgetLimit}
              onChange={(e) =>
                sdk.settings.updateSetting('monthlyBudgetLimit', Number(e.target.value))
              }
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: SAVINGS GOALS VAULT (MULTI-CURRENCY)
         ===================================================================== */}
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
                Create a multi-currency savings goal below and fund it from your Super App Wallet.
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
              const stepAmt = goal.currency === 'ETB' ? 500 : 50;
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
                      <p
                        className="text-[11px] tabular-nums"
                        style={{ color: tokens.textSecondary }}
                      >
                        {formatMoney(goal.savedAmount, goal.currency)} of{' '}
                        {formatMoney(goal.targetAmount, goal.currency)} ({pct}%)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleContributeToGoal(goal, stepAmt)}
                      style={{
                        backgroundColor: tokens.accentPrimary,
                        color: tokens.accentContrast,
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition ios-active"
                    >
                      <Wallet className="w-3 h-3" />
                      <span>+{formatMoney(stepAmt, goal.currency)}</span>
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
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="Goal Name"
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
                placeholder="Target"
                style={{
                  backgroundColor: tokens.bgInput,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="px-3 py-2 rounded-xl border text-xs font-mono tabular-nums focus:outline-none"
              />
              <select
                value={newGoalCurrency}
                onChange={(e) => setNewGoalCurrency(e.target.value as CurrencyCode)}
                style={{
                  backgroundColor: tokens.bgInput,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="px-2.5 py-2 rounded-xl border text-xs font-bold focus:outline-none"
              >
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
    </div>
  );
};
