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
  Pencil,
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
  transferToAccountId?: string;
  loanId?: string;
  loanEntryKind?: 'principal' | 'repayment';
  goalId?: string;
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

export interface LoanLedgerEntry {
  id: string;
  loanId: string;
  loanTitle: string;
  providerName: string;
  providerType: 'B2C' | 'P2P';
  direction: 'borrowed' | 'lent';
  entryKind: 'principal' | 'repayment';
  title: string;
  /** Amount impacting the loan balance (+totalPayable for principal, -repayment for repayment) */
  amount: number;
  /** Principal amount disbursed/issued to or from the linked account when entryKind === 'principal' */
  principalAmount?: number;
  currency: CurrencyCode;
  accountId?: string;
  accountName?: string;
  date: string;
  settledViaWallet?: boolean;
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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showTransferForm, setShowTransferForm] = useState(false);

  // New / Edit Account Form
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

  // 4. Ledger 1: Main Balance Ledger State (Bank & Wallet Cashflow Only)
  const [activeLedgerView, setActiveLedgerView] = useState<'main' | 'loan'>('main');
  const [entries, setEntries] = useState<FinTrackEntry[]>(() => {
    const saved = sdk.storage.getItem('fintrack_entries_v2');
    if (Array.isArray(saved)) {
      return saved
        .filter((e: any) => !e.loanId && e.category !== 'Loan')
        .map((e: any) => ({
          ...e,
          currency: normalizeCurrencyCode(e.currency || 'ETB'),
        }));
    }
    return [];
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [showAddTxForm, setShowAddTxForm] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // New / Edit Main Balance Transaction Form
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>('ETB');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txCategory, setTxCategory] = useState<FinTrackCategory>('Dining');
  const [txAccountId, setTxAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [chargeSuperAppWallet, setChargeSuperAppWallet] = useState(false);

  // 5. Ledger 2: Loan Balance Ledger State & Loan Providers (P2P & B2C)
  const [loanLedgerEntries, setLoanLedgerEntries] = useState<LoanLedgerEntry[]>(() => {
    const saved = sdk.storage.getItem('fintrack_loan_ledger_v3');
    if (Array.isArray(saved)) {
      return saved.map((e: any) => ({
        ...e,
        currency: normalizeCurrencyCode(e.currency || 'ETB'),
      }));
    }
    return [];
  });
  const [loanLedgerFilter, setLoanLedgerFilter] = useState<
    'ALL' | 'borrowed' | 'lent' | 'principal' | 'repayment'
  >('ALL');
  const [showAddLoanLedgerForm, setShowAddLoanLedgerForm] = useState(false);
  const [editingLoanLedgerId, setEditingLoanLedgerId] = useState<string | null>(null);
  const [llTargetLoanId, setLlTargetLoanId] = useState<string>('');
  const [llTitle, setLlTitle] = useState<string>('');
  const [llAmount, setLlAmount] = useState<string>('');
  const [llAccountId, setLlAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [llDate, setLlDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

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
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [repayLoanTarget, setRepayLoanTarget] = useState<FinTrackLoan | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState(() => accounts[0]?.id || '');

  // New Provider Form
  const [provName, setProvName] = useState('');
  const [provType, setProvType] = useState<'B2C' | 'P2P'>('B2C');
  const [provInterest, setProvInterest] = useState('10');
  const [provMaxLimit, setProvMaxLimit] = useState('50000');
  const [provCurrency, setProvCurrency] = useState<CurrencyCode>('ETB');
  const [provContact, setProvContact] = useState('');

  // New / Edit Loan Form
  const [loanTitle, setLoanTitle] = useState('');
  const [loanProviderId, setLoanProviderId] = useState('');
  const [loanDirection, setLoanDirection] = useState<'borrowed' | 'lent'>('borrowed');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanInterest, setLoanInterest] = useState('10');
  const [loanCurrency, setLoanCurrency] = useState<CurrencyCode>('ETB');
  const [loanAccountId, setLoanAccountId] = useState(() => accounts[0]?.id || '');
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
  const [schedAccountId, setSchedAccountId] = useState(() => accounts[0]?.id || '');
  const [schedAutoExecute, setSchedAutoExecute] = useState(true);
  const [schedSyncSuperApp, setSchedSyncSuperApp] = useState(false);

  // Automatically default txAccountId, loanAccountId, and schedAccountId to the primary account when accounts exist
  useEffect(() => {
    if (accounts.length > 0) {
      const primaryId = accounts[0].id;
      if (!editingTxId && !txAccountId) {
        setTxAccountId(primaryId);
      }
      if (!editingLoanId && !loanAccountId) {
        setLoanAccountId(primaryId);
      }
      if (!schedAccountId) {
        setSchedAccountId(primaryId);
      }
      if (!repayAccountId) {
        setRepayAccountId(primaryId);
      }
    }
  }, [accounts, editingTxId, editingLoanId, txAccountId, loanAccountId, schedAccountId, repayAccountId]);

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

  // Ensure Main Balance Ledger (`entries`) only holds main balance transactions
  // and every loan (including previously created loans) is synced to the dedicated Loan Balance Ledger (`loanLedgerEntries`)
  useEffect(() => {
    setEntries((prev) => {
      const cleaned = prev.filter((e) => !e.loanId && e.category !== 'Loan');
      return cleaned.length !== prev.length ? cleaned : prev;
    });

    if (loans.length === 0) return;

    setLoanLedgerEntries((prevLoanEntries) => {
      let updated = [...prevLoanEntries];
      let mutated = false;

      for (const loan of loans) {
        const linkedAcc = loan.accountId
          ? accounts.find((a) => a.id === loan.accountId)
          : undefined;

        // 1. Check for principal disbursement / issuance entry in Loan Balance Ledger
        const existingPrincipalIndex = updated.findIndex(
          (e) => e.loanId === loan.id && e.entryKind === 'principal'
        );

        if (existingPrincipalIndex === -1) {
          const principalEntry: LoanLedgerEntry = {
            id: `ll-init-${loan.id}`,
            loanId: loan.id,
            loanTitle: loan.title,
            providerName: loan.providerName,
            providerType: loan.providerType,
            direction: loan.direction,
            entryKind: 'principal',
            title:
              loan.direction === 'borrowed'
                ? `Loan Disbursed: ${loan.title} (${loan.providerName})`
                : `P2P Loan Issued: ${loan.title} (${loan.providerName})`,
            amount: loan.totalPayable,
            principalAmount: loan.principalAmount,
            currency: loan.currency,
            accountId: linkedAcc?.id || loan.accountId,
            accountName: linkedAcc?.name,
            date: loan.startDate || new Date().toISOString().slice(0, 10),
          };
          updated = [principalEntry, ...updated];
          mutated = true;
        }

        // 2. Check for repayment / collection entries if paidAmount > 0
        if (loan.paidAmount > 0) {
          const repaymentEntries = updated.filter(
            (e) => e.loanId === loan.id && e.entryKind === 'repayment'
          );
          const recordedPaid = repaymentEntries.reduce((sum, e) => sum + e.amount, 0);
          const unrecordedPaid = Number((loan.paidAmount - recordedPaid).toFixed(2));
          if (unrecordedPaid >= 0.01) {
            const repayEntry: LoanLedgerEntry = {
              id: `ll-repay-sync-${loan.id}-${Date.now()}`,
              loanId: loan.id,
              loanTitle: loan.title,
              providerName: loan.providerName,
              providerType: loan.providerType,
              direction: loan.direction,
              entryKind: 'repayment',
              title:
                loan.direction === 'borrowed'
                  ? `Loan Repayment: ${loan.title} (${loan.providerName})`
                  : `Loan Collection: ${loan.title} (${loan.providerName})`,
              amount: unrecordedPaid,
              currency: loan.currency,
              accountId: linkedAcc?.id || loan.accountId,
              accountName: linkedAcc?.name,
              date: new Date().toISOString().slice(0, 10),
            };
            updated = [repayEntry, ...updated];
            mutated = true;
          }
        }
      }

      return mutated ? updated : prevLoanEntries;
    });
  }, [loans, accounts]);

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
    sdk.storage.setItem('fintrack_loan_ledger_v3', loanLedgerEntries);
  }, [loanLedgerEntries, sdk.storage]);

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

    const totalPrincipalIssuedBase = loanLedgerEntries
      .filter((e) => e.entryKind === 'principal')
      .reduce((sum, e) => sum + convertAmount(e.amount, e.currency, baseCurrency), 0);

    const totalLoanRepaymentsBase = loanLedgerEntries
      .filter((e) => e.entryKind === 'repayment')
      .reduce((sum, e) => sum + convertAmount(e.amount, e.currency, baseCurrency), 0);

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
      totalPrincipalIssuedBase,
      totalLoanRepaymentsBase,
      netWorthBase,
      budgetUsedPercent,
      byCategory,
    };
  }, [accounts, entries, loans, loanLedgerEntries, baseCurrency, convertAmount, monthlyBudgetLimit]);

  // Synchronize Shared Accounts Balance to SuperApp Shared Wallet
  const pushSharedBalanceToSuperApp = useCallback(
    async (customAccounts?: FinTrackAccount[], silent = false, customDescription?: string) => {
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
        customDescription ||
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

  // Atomically apply one or more currency-aware balance deltas to accounts and auto-sync to SuperApp Wallet
  const applyAccountBalanceAdjustments = useCallback(
    (
      adjustments: Array<{
        accountId?: string;
        deltaAmount: number;
        deltaCurrency: CurrencyCode;
      }>,
      reasonDescription?: string
    ) => {
      const valid = adjustments.filter(
        (adj) =>
          adj.accountId &&
          adj.accountId !== 'NONE' &&
          Number.isFinite(adj.deltaAmount) &&
          Math.abs(adj.deltaAmount) > 0
      );
      if (valid.length === 0) return;

      setAccounts((prev) => {
        const next = prev.map((acc) => {
          const matching = valid.filter((adj) => adj.accountId === acc.id);
          if (matching.length === 0) return acc;
          const totalDeltaInAccCurr = matching.reduce(
            (sum, adj) => sum + convertAmount(adj.deltaAmount, adj.deltaCurrency, acc.currency),
            0
          );
          return {
            ...acc,
            balance: Number((acc.balance + totalDeltaInAccCurr).toFixed(2)),
            updatedAt: new Date().toISOString().slice(0, 10),
          };
        });
        if (autoSyncSuperApp && next.some((a) => a.shareWithSuperApp)) {
          setTimeout(() => {
            pushSharedBalanceToSuperApp(next, true, reasonDescription);
          }, 0);
        }
        return next;
      });
    },
    [autoSyncSuperApp, convertAmount, pushSharedBalanceToSuperApp]
  );

  // Adjust a specific Bank or Wallet account's balance and auto-sync to SuperApp Wallet if enabled
  const adjustAccountBalance = useCallback(
    (accountId: string, deltaInAccountCurrency: number, reasonDescription?: string) => {
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
            pushSharedBalanceToSuperApp(next, true, reasonDescription);
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
      const entryTitle = `[Scheduled] ${sched.title}`;

      if (targetAcc) {
        const deltaInAccCurr = convertAmount(
          signedDeltaInSchedCurr,
          sched.currency,
          targetAcc.currency
        );
        adjustAccountBalance(targetAcc.id, deltaInAccCurr, entryTitle);
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
        title: entryTitle,
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
          `Posted scheduled ${sched.type} to ledger: ${formatMoney(sched.amount, sched.currency)}`,
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
        } to ledger`,
        'info'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers: Multi-Account Management (Create & Update)
  const startEditAccount = (acc: FinTrackAccount) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccInstitution(acc.institution);
    setAccType(acc.type);
    setAccNumber(acc.accountNumber);
    setAccCurrency(acc.currency);
    setAccBalance(String(acc.balance));
    setAccShareSuperApp(acc.shareWithSuperApp);
    setShowTransferForm(false);
    setShowAddAccountForm(true);
    sdk.ui.hapticFeedback('light');
  };

  const resetAccountForm = () => {
    setEditingAccountId(null);
    setAccName('');
    setAccBalance('');
    setAccNumber('');
    setShowAddAccountForm(false);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const initialBal = parseFloat(accBalance || '0');
    if (!accName.trim() || !Number.isFinite(initialBal)) {
      sdk.ui.showToast('Enter an account name and valid balance', 'warning');
      return;
    }

    const preset = INSTITUTION_PRESETS.find((p) => p.name === accInstitution);

    if (editingAccountId) {
      const prevAcc = accounts.find((a) => a.id === editingAccountId);
      const nextAccounts = accounts.map((acc) => {
        if (acc.id !== editingAccountId) return acc;
        return {
          ...acc,
          name: accName.trim(),
          institution: accInstitution,
          type: accType,
          accountNumber:
            accNumber.trim() || (accType === 'bank' ? '1000••••9402' : '+251 911 ••••'),
          currency: accCurrency,
          balance: Number(initialBal.toFixed(2)),
          shareWithSuperApp: accShareSuperApp,
          color: preset?.color || acc.color || (accType === 'bank' ? '#2563eb' : '#059669'),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      });

      setAccounts(nextAccounts);

      // Update accountName on linked ledger entries and record manual balance adjustment if balance changed
      const prevBalInNewCurr = prevAcc
        ? convertAmount(prevAcc.balance, prevAcc.currency, accCurrency)
        : initialBal;
      const balanceDiff = Number((initialBal - prevBalInNewCurr).toFixed(2));

      setEntries((prev) => {
        const renamed = prev.map((entry) =>
          entry.accountId === editingAccountId
            ? { ...entry, accountName: accName.trim() }
            : entry
        );
        if (Math.abs(balanceDiff) >= 0.01) {
          const adjEntry: FinTrackEntry = {
            id: `ft-acc-adj-${Date.now()}`,
            title: `Balance Adjustment: ${accName.trim()}`,
            amount: Math.abs(balanceDiff),
            currency: accCurrency,
            type: balanceDiff > 0 ? 'income' : 'expense',
            category: balanceDiff > 0 ? 'Income' : 'Transfer',
            accountId: editingAccountId,
            accountName: accName.trim(),
            date: new Date().toISOString().slice(0, 10),
          };
          return [adjEntry, ...renamed];
        }
        return renamed;
      });

      if (autoSyncSuperApp && nextAccounts.some((a) => a.shareWithSuperApp)) {
        pushSharedBalanceToSuperApp(
          nextAccounts,
          false,
          `Account Updated: ${accName.trim()} (${accCurrency})`
        );
      } else {
        sdk.ui.hapticFeedback('success');
        sdk.ui.showToast(
          `Updated ${accType}: ${accName.trim()} (${formatMoney(initialBal, accCurrency)})`,
          'success'
        );
      }

      resetAccountForm();
      return;
    }

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
    if (!txAccountId || txAccountId === 'NONE') setTxAccountId(newAcc.id);
    if (!schedAccountId) setSchedAccountId(newAcc.id);
    if (!loanAccountId) setLoanAccountId(newAcc.id);

    // Sync opening balance to the Transactions Ledger if initialBal > 0
    if (initialBal > 0) {
      const openingEntry: FinTrackEntry = {
        id: `ft-acc-open-${newAcc.id}`,
        title: `Opening Balance: ${newAcc.name}`,
        amount: Number(initialBal.toFixed(2)),
        currency: accCurrency,
        type: 'income',
        category: 'Income',
        accountId: newAcc.id,
        accountName: newAcc.name,
        date: new Date().toISOString().slice(0, 10),
      };
      setEntries((prev) => [openingEntry, ...prev]);
    }

    if (accShareSuperApp && autoSyncSuperApp) {
      pushSharedBalanceToSuperApp(
        nextAccounts,
        false,
        `Opening Balance: ${newAcc.name} (${newAcc.currency})`
      );
    } else {
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(`Added ${newAcc.type}: ${newAcc.name} (${newAcc.currency})`, 'success');
    }

    resetAccountForm();
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
    if (editingAccountId === accountId) {
      resetAccountForm();
    }
    if (txAccountId === accountId) {
      setTxAccountId(nextAccounts[0]?.id || 'NONE');
    }
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

    const transferDesc = `Transfer: ${fromAcc.name} → ${toAcc.name}`;
    setAccounts(nextAccounts);
    if (autoSyncSuperApp) {
      pushSharedBalanceToSuperApp(nextAccounts, true, transferDesc);
    }

    const transferEntry: FinTrackEntry = {
      id: `ft-xfer-${Date.now()}`,
      title: transferDesc,
      amount: amt,
      currency: fromAcc.currency,
      type: 'expense',
      category: 'Transfer',
      accountId: fromAcc.id,
      accountName: `${fromAcc.name} → ${toAcc.name}`,
      transferToAccountId: toAcc.id,
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

  // Handlers: Ledger Transactions (Create, Update, Delete with Auto-Sync Balance & Loan Sync)
  const startEditTransaction = (entry: FinTrackEntry) => {
    setEditingTxId(entry.id);
    setTxTitle(entry.title);
    setTxAmount(String(entry.amount));
    setTxCurrency(entry.currency);
    setTxType(entry.type);
    setTxCategory(entry.category);
    setTxAccountId(entry.accountId || 'NONE');
    setTxDate(entry.date || new Date().toISOString().slice(0, 10));
    setChargeSuperAppWallet(Boolean(entry.settledViaWallet));
    setShowAddTxForm(true);
    sdk.ui.hapticFeedback('light');
  };

  const resetTransactionForm = () => {
    setEditingTxId(null);
    setTxTitle('');
    setTxAmount('');
    setTxDate(new Date().toISOString().slice(0, 10));
    setShowAddTxForm(false);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(txAmount);
    if (!txTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      sdk.ui.showToast('Enter a valid description and positive amount', 'warning');
      return;
    }

    const linkedAcc =
      txAccountId && txAccountId !== 'NONE'
        ? accounts.find((a) => a.id === txAccountId)
        : undefined;

    // UPDATE EXISTING TRANSACTION (Auto-syncing balance delta across old & new account + linked loan/goal)
    if (editingTxId) {
      const oldEntry = entries.find((item) => item.id === editingTxId);
      if (!oldEntry) {
        resetTransactionForm();
        return;
      }

      const adjustments: Array<{
        accountId?: string;
        deltaAmount: number;
        deltaCurrency: CurrencyCode;
      }> = [];

      // 1. Reverse oldEntry's effect on its previously linked account(s)
      if (oldEntry.accountId) {
        const reverseOldSigned =
          oldEntry.type === 'income' ? -oldEntry.amount : oldEntry.amount;
        adjustments.push({
          accountId: oldEntry.accountId,
          deltaAmount: reverseOldSigned,
          deltaCurrency: oldEntry.currency,
        });
      }
      if (oldEntry.transferToAccountId) {
        adjustments.push({
          accountId: oldEntry.transferToAccountId,
          deltaAmount: -oldEntry.amount,
          deltaCurrency: oldEntry.currency,
        });
      }

      // 2. Apply updated transaction's effect on the newly selected account
      if (linkedAcc) {
        const applyNewSigned = txType === 'income' ? numericAmount : -numericAmount;
        adjustments.push({
          accountId: linkedAcc.id,
          deltaAmount: applyNewSigned,
          deltaCurrency: txCurrency,
        });
      }

      applyAccountBalanceAdjustments(adjustments, `Updated: ${txTitle.trim()}`);

      // 3. If this ledger entry is linked to a Loan, keep the Loan record in sync!
      if (oldEntry.loanId) {
        setLoans((prevLoans) =>
          prevLoans.map((loan) => {
            if (loan.id !== oldEntry.loanId) return loan;
            if (oldEntry.loanEntryKind === 'repayment') {
              const oldInLoanCurr = convertAmount(oldEntry.amount, oldEntry.currency, loan.currency);
              const newInLoanCurr = convertAmount(numericAmount, txCurrency, loan.currency);
              const nextPaid = Math.max(
                0,
                Math.min(
                  loan.totalPayable,
                  Number((loan.paidAmount - oldInLoanCurr + newInLoanCurr).toFixed(2))
                )
              );
              return {
                ...loan,
                paidAmount: nextPaid,
                status: nextPaid >= loan.totalPayable - 0.01 ? 'paid' : 'active',
              };
            }
            if (oldEntry.loanEntryKind === 'principal') {
              const newTotalPayable = Number(
                (numericAmount * (1 + Math.max(0, loan.interestRate) / 100)).toFixed(2)
              );
              return {
                ...loan,
                principalAmount: numericAmount,
                totalPayable: newTotalPayable,
                currency: txCurrency,
                accountId: linkedAcc?.id,
                status: loan.paidAmount >= newTotalPayable - 0.01 ? 'paid' : 'active',
              };
            }
            return loan;
          })
        );
      }

      // 4. If this ledger entry is linked to a Savings Goal, keep the Goal savedAmount in sync!
      if (oldEntry.goalId) {
        setGoals((prevGoals) =>
          prevGoals.map((g) => {
            if (g.id !== oldEntry.goalId) return g;
            const oldInGoalCurr = convertAmount(oldEntry.amount, oldEntry.currency, g.currency);
            const newInGoalCurr = convertAmount(numericAmount, txCurrency, g.currency);
            return {
              ...g,
              savedAmount: Math.max(
                0,
                Math.min(g.targetAmount, Number((g.savedAmount - oldInGoalCurr + newInGoalCurr).toFixed(2)))
              ),
            };
          })
        );
      }

      // If settled directly via SuperApp Wallet without shared account auto-sync, sync the net difference
      const isHandledBySharedAutoSync =
        autoSyncSuperApp &&
        ((oldEntry.accountId &&
          accounts.find((a) => a.id === oldEntry.accountId)?.shareWithSuperApp) ||
          (linkedAcc && linkedAcc.shareWithSuperApp));

      if ((oldEntry.settledViaWallet || chargeSuperAppWallet) && !isHandledBySharedAutoSync) {
        const oldWalletSigned = oldEntry.settledViaWallet
          ? convertAmount(
              oldEntry.type === 'income' ? oldEntry.amount : -oldEntry.amount,
              oldEntry.currency,
              baseCurrency
            )
          : 0;
        const newWalletSigned = chargeSuperAppWallet
          ? convertAmount(
              txType === 'income' ? numericAmount : -numericAmount,
              txCurrency,
              baseCurrency
            )
          : 0;
        const netWalletDelta = Number((newWalletSigned - oldWalletSigned).toFixed(2));
        if (netWalletDelta > 0.01) {
          await sdk.payment.credit(netWalletDelta, `FinTrack Adjustment: ${txTitle.trim()}`);
        } else if (netWalletDelta < -0.01) {
          await sdk.payment.pay(Math.abs(netWalletDelta), `FinTrack Adjustment: ${txTitle.trim()}`);
        }
      }

      const updatedEntry: FinTrackEntry = {
        ...oldEntry,
        title: txTitle.trim(),
        amount: numericAmount,
        currency: txCurrency,
        type: txType,
        category: txCategory,
        accountId: linkedAcc?.id,
        accountName: linkedAcc?.name,
        transferToAccountId: undefined,
        date: txDate || oldEntry.date,
        settledViaWallet: chargeSuperAppWallet,
      };

      setEntries((prev) => prev.map((item) => (item.id === editingTxId ? updatedEntry : item)));
      resetTransactionForm();
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(
        `Updated transaction & synced ${linkedAcc ? linkedAcc.name : 'ledger'} balance`,
        'success'
      );
      return;
    }

    // CREATE NEW TRANSACTION
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

    if (linkedAcc) {
      const signedInTxCurr = txType === 'income' ? numericAmount : -numericAmount;
      applyAccountBalanceAdjustments(
        [
          {
            accountId: linkedAcc.id,
            deltaAmount: signedInTxCurr,
            deltaCurrency: txCurrency,
          },
        ],
        `FinTrack ${txType === 'income' ? 'Income' : 'Expense'}: ${txTitle.trim()}`
      );
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
      date: txDate || new Date().toISOString().slice(0, 10),
      settledViaWallet,
    };

    setEntries((prev) => [newEntry, ...prev]);
    resetTransactionForm();
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Recorded ${txType}: ${formatMoney(numericAmount, txCurrency)}${
        linkedAcc ? ` (${linkedAcc.name} synced)` : ''
      }`,
      'success'
    );
  };

  const handleDeleteEntry = async (id: string) => {
    const targetEntry = entries.find((item) => item.id === id);
    if (!targetEntry) return;

    sdk.ui.hapticFeedback('medium');

    const adjustments: Array<{
      accountId?: string;
      deltaAmount: number;
      deltaCurrency: CurrencyCode;
    }> = [];

    if (targetEntry.accountId) {
      // Reverse transaction effect: deleting an income subtracts it; deleting an expense refunds it
      const reverseDelta =
        targetEntry.type === 'income' ? -targetEntry.amount : targetEntry.amount;
      adjustments.push({
        accountId: targetEntry.accountId,
        deltaAmount: reverseDelta,
        deltaCurrency: targetEntry.currency,
      });
    }

    if (targetEntry.transferToAccountId) {
      adjustments.push({
        accountId: targetEntry.transferToAccountId,
        deltaAmount: -targetEntry.amount,
        deltaCurrency: targetEntry.currency,
      });
    }

    if (adjustments.length > 0) {
      applyAccountBalanceAdjustments(adjustments, `Deleted: ${targetEntry.title}`);
    }

    // If the deleted entry was linked to a Loan, keep the Loan state synchronized
    if (targetEntry.loanId) {
      if (targetEntry.loanEntryKind === 'repayment') {
        setLoans((prevLoans) =>
          prevLoans.map((loan) => {
            if (loan.id !== targetEntry.loanId) return loan;
            const repayInLoanCurr = convertAmount(
              targetEntry.amount,
              targetEntry.currency,
              loan.currency
            );
            const nextPaid = Math.max(0, Number((loan.paidAmount - repayInLoanCurr).toFixed(2)));
            return {
              ...loan,
              paidAmount: nextPaid,
              status: nextPaid >= loan.totalPayable - 0.01 ? 'paid' : 'active',
            };
          })
        );
      } else if (targetEntry.loanEntryKind === 'principal') {
        setLoans((prevLoans) => prevLoans.filter((loan) => loan.id !== targetEntry.loanId));
      }
    }

    // If the deleted entry was linked to a Savings Goal, reverse the deposit on the Goal
    if (targetEntry.goalId) {
      setGoals((prevGoals) =>
        prevGoals.map((g) => {
          if (g.id !== targetEntry.goalId) return g;
          const amtInGoalCurr = convertAmount(targetEntry.amount, targetEntry.currency, g.currency);
          return {
            ...g,
            savedAmount: Math.max(0, Number((g.savedAmount - amtInGoalCurr).toFixed(2))),
          };
        })
      );
    }

    const linkedAcc = targetEntry.accountId
      ? accounts.find((a) => a.id === targetEntry.accountId)
      : undefined;
    const isHandledBySharedAutoSync =
      autoSyncSuperApp && Boolean(linkedAcc?.shareWithSuperApp);

    if (targetEntry.settledViaWallet && !isHandledBySharedAutoSync) {
      const amtInBase = convertAmount(targetEntry.amount, targetEntry.currency, baseCurrency);
      if (targetEntry.type === 'expense') {
        await sdk.payment.credit(amtInBase, `Reversed Expense: ${targetEntry.title}`);
      } else {
        await sdk.payment.pay(amtInBase, `Reversed Income: ${targetEntry.title}`);
      }
    }

    if (editingTxId === id) {
      resetTransactionForm();
    }

    setEntries((prev) => prev.filter((item) => item.id !== id));
    sdk.ui.showToast(
      linkedAcc
        ? `Transaction deleted & ${linkedAcc.name} balance restored`
        : 'Transaction removed from ledger',
      'info'
    );
  };

  // Handlers: Loan Providers (P2P & B2C) & Loan Tracking (Synced with Ledger & Accounts)
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

  const startEditLoan = (loan: FinTrackLoan) => {
    setEditingLoanId(loan.id);
    setLoanTitle(loan.title);
    setLoanProviderId(loan.providerId);
    setLoanDirection(loan.direction);
    setLoanPrincipal(String(loan.principalAmount));
    setLoanInterest(String(loan.interestRate));
    setLoanCurrency(loan.currency);
    setLoanAccountId(loan.accountId || '');
    setLoanDueDate(loan.dueDate);
    setDisburseToAccount(Boolean(loan.accountId));
    setShowAddLoanForm(true);
    sdk.ui.hapticFeedback('light');
  };

  const resetLoanForm = () => {
    setEditingLoanId(null);
    setLoanTitle('');
    setLoanPrincipal('');
    setShowAddLoanForm(false);
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
    const targetAcc =
      disburseToAccount && loanAccountId
        ? accounts.find((a) => a.id === loanAccountId)
        : undefined;

    const entryTitle =
      loanDirection === 'borrowed'
        ? `Loan Disbursed: ${loanTitle.trim()} (${provider.name})`
        : `P2P Loan Issued: ${loanTitle.trim()} (${provider.name})`;

    // UPDATE EXISTING LOAN (Auto-syncing with Loan Balance Ledger & Account Balance)
    if (editingLoanId) {
      const oldLoan = loans.find((l) => l.id === editingLoanId);
      if (!oldLoan) {
        resetLoanForm();
        return;
      }

      const existingPrincipalEntry = loanLedgerEntries.find(
        (item) => item.loanId === editingLoanId && item.entryKind === 'principal'
      );

      const adjustments: Array<{
        accountId?: string;
        deltaAmount: number;
        deltaCurrency: CurrencyCode;
      }> = [];

      // Reverse old principal effect if it was disbursed to an account
      const oldAccId = existingPrincipalEntry?.accountId || oldLoan.accountId;
      if (oldAccId) {
        const reverseOld =
          oldLoan.direction === 'borrowed' ? -oldLoan.principalAmount : oldLoan.principalAmount;
        adjustments.push({
          accountId: oldAccId,
          deltaAmount: reverseOld,
          deltaCurrency: oldLoan.currency,
        });
      }

      // Apply new principal effect if targetAcc is selected
      if (targetAcc) {
        const applyNew = loanDirection === 'borrowed' ? principal : -principal;
        adjustments.push({
          accountId: targetAcc.id,
          deltaAmount: applyNew,
          deltaCurrency: loanCurrency,
        });
      }

      if (adjustments.length > 0) {
        applyAccountBalanceAdjustments(adjustments, entryTitle);
      }

      const updatedLoan: FinTrackLoan = {
        ...oldLoan,
        title: loanTitle.trim(),
        providerId: provider.id,
        providerName: provider.name,
        providerType: provider.providerType,
        direction: loanDirection,
        principalAmount: principal,
        interestRate: Math.max(0, interest),
        totalPayable,
        currency: loanCurrency,
        accountId: targetAcc?.id,
        dueDate: loanDueDate,
        status: oldLoan.paidAmount >= totalPayable - 0.01 ? 'paid' : 'active',
      };

      setLoans((prev) => prev.map((l) => (l.id === editingLoanId ? updatedLoan : l)));

      // Update or insert the principal entry in the Loan Balance Ledger (and update loan metadata on its repayment entries)
      setLoanLedgerEntries((prev) => {
        const updatedList = prev.map((item) => {
          if (item.loanId !== editingLoanId) return item;
          if (item.entryKind === 'principal') {
            return {
              ...item,
              loanTitle: updatedLoan.title,
              providerName: provider.name,
              providerType: provider.providerType,
              direction: loanDirection,
              title: entryTitle,
              amount: totalPayable,
              principalAmount: principal,
              currency: loanCurrency,
              accountId: targetAcc?.id,
              accountName: targetAcc?.name,
            };
          }
          return {
            ...item,
            loanTitle: updatedLoan.title,
            providerName: provider.name,
            providerType: provider.providerType,
            direction: loanDirection,
            currency: loanCurrency,
          };
        });

        if (!existingPrincipalEntry) {
          const newPrincipalEntry: LoanLedgerEntry = {
            id: `ll-init-${editingLoanId}`,
            loanId: editingLoanId,
            loanTitle: updatedLoan.title,
            providerName: provider.name,
            providerType: provider.providerType,
            direction: loanDirection,
            entryKind: 'principal',
            title: entryTitle,
            amount: totalPayable,
            principalAmount: principal,
            currency: loanCurrency,
            accountId: targetAcc?.id,
            accountName: targetAcc?.name,
            date: oldLoan.startDate || new Date().toISOString().slice(0, 10),
          };
          return [newPrincipalEntry, ...updatedList];
        }
        return updatedList;
      });

      resetLoanForm();
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(`Updated loan & synced Loan Balance Ledger: ${updatedLoan.title}`, 'success');
      return;
    }

    // CREATE NEW LOAN (Always records in Loan Balance Ledger & syncs linked Account Balance)
    const newLoanId = `loan-${Date.now()}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const newLoan: FinTrackLoan = {
      id: newLoanId,
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
      accountId: targetAcc?.id,
      startDate: todayStr,
      dueDate: loanDueDate,
      status: 'active',
    };

    setLoans((prev) => [newLoan, ...prev]);

    if (targetAcc) {
      const signedInLoanCurr = loanDirection === 'borrowed' ? principal : -principal;
      applyAccountBalanceAdjustments(
        [
          {
            accountId: targetAcc.id,
            deltaAmount: signedInLoanCurr,
            deltaCurrency: loanCurrency,
          },
        ],
        entryTitle
      );
    }

    // Always sync the loan obligation to the dedicated Loan Balance Ledger
    const principalLoanLedgerEntry: LoanLedgerEntry = {
      id: `ll-init-${newLoanId}`,
      loanId: newLoanId,
      loanTitle: newLoan.title,
      providerName: provider.name,
      providerType: provider.providerType,
      direction: loanDirection,
      entryKind: 'principal',
      title: entryTitle,
      amount: totalPayable,
      principalAmount: principal,
      currency: loanCurrency,
      accountId: targetAcc?.id,
      accountName: targetAcc?.name,
      date: todayStr,
    };
    setLoanLedgerEntries((prev) => [principalLoanLedgerEntry, ...prev]);

    resetLoanForm();
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Synced ${provider.providerType} loan to Loan Balance Ledger: ${formatMoney(
        totalPayable,
        loanCurrency
      )}`,
      'success'
    );
  };

  const handleDeleteLoan = (loanId: string) => {
    const linkedLoanEntries = loanLedgerEntries.filter((e) => e.loanId === loanId);
    const adjustments: Array<{
      accountId?: string;
      deltaAmount: number;
      deltaCurrency: CurrencyCode;
    }> = [];

    for (const entry of linkedLoanEntries) {
      if (entry.accountId) {
        if (entry.entryKind === 'principal') {
          const cashAmt = entry.principalAmount ?? entry.amount;
          const reverseDelta = entry.direction === 'borrowed' ? -cashAmt : cashAmt;
          adjustments.push({
            accountId: entry.accountId,
            deltaAmount: reverseDelta,
            deltaCurrency: entry.currency,
          });
        } else {
          // Repayment: borrowed repayment deducted from account (so reverse is +amount); lent collection credited account (reverse is -amount)
          const reverseDelta = entry.direction === 'borrowed' ? entry.amount : -entry.amount;
          adjustments.push({
            accountId: entry.accountId,
            deltaAmount: reverseDelta,
            deltaCurrency: entry.currency,
          });
        }
      }
    }

    if (adjustments.length > 0) {
      applyAccountBalanceAdjustments(adjustments, 'Loan Removed & Account Balance Restored');
    }

    setLoanLedgerEntries((prev) => prev.filter((e) => e.loanId !== loanId));
    setLoans((prev) => prev.filter((item) => item.id !== loanId));
    if (editingLoanId === loanId) {
      resetLoanForm();
    }
    sdk.ui.hapticFeedback('medium');
    sdk.ui.showToast('Loan removed & Loan Balance Ledger / Account balances updated', 'info');
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
    const repayTitle =
      repayLoanTarget.direction === 'borrowed'
        ? `Loan Repayment: ${repayLoanTarget.title} (${repayLoanTarget.providerName})`
        : `Loan Collection: ${repayLoanTarget.title} (${repayLoanTarget.providerName})`;

    if (targetAcc) {
      // If borrowed, repayment deducts from account; if lent, collection credits account
      const signedInLoanCurr =
        repayLoanTarget.direction === 'borrowed' ? -actualPay : actualPay;
      const deltaInAccCurr = convertAmount(
        signedInLoanCurr,
        repayLoanTarget.currency,
        targetAcc.currency
      );
      adjustAccountBalance(targetAcc.id, deltaInAccCurr, repayTitle);
    } else if (repayAccountId === 'SUPERAPP_WALLET') {
      const amtInBase = convertAmount(actualPay, repayLoanTarget.currency, baseCurrency);
      if (repayLoanTarget.direction === 'borrowed') {
        const res = await sdk.payment.pay(amtInBase, repayTitle);
        if (!res.success) return;
      } else {
        await sdk.payment.credit(amtInBase, repayTitle);
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

    const loanLedgerRepayEntry: LoanLedgerEntry = {
      id: `ll-repay-${Date.now()}`,
      loanId: repayLoanTarget.id,
      loanTitle: repayLoanTarget.title,
      providerName: repayLoanTarget.providerName,
      providerType: repayLoanTarget.providerType,
      direction: repayLoanTarget.direction,
      entryKind: 'repayment',
      title: repayTitle,
      amount: actualPay,
      currency: repayLoanTarget.currency,
      accountId: targetAcc?.id,
      accountName:
        targetAcc?.name || (repayAccountId === 'SUPERAPP_WALLET' ? 'SuperApp Wallet' : undefined),
      date: new Date().toISOString().slice(0, 10),
      settledViaWallet: repayAccountId === 'SUPERAPP_WALLET',
    };
    setLoanLedgerEntries((prev) => [loanLedgerRepayEntry, ...prev]);

    setRepayLoanTarget(null);
    setRepayAmount('');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Synced ${formatMoney(actualPay, repayLoanTarget.currency)} settlement to Loan Balance Ledger`,
      'success'
    );
  };

  // Handlers: Dedicated Loan Balance Ledger CRUD (Record Repayment, Edit Entry, Delete Entry)
  const startEditLoanLedgerEntry = (entry: LoanLedgerEntry) => {
    setEditingLoanLedgerId(entry.id);
    setLlTargetLoanId(entry.loanId);
    setLlTitle(entry.title);
    setLlAmount(String(entry.entryKind === 'principal' ? entry.principalAmount ?? entry.amount : entry.amount));
    setLlAccountId(entry.accountId || 'NONE');
    setLlDate(entry.date || new Date().toISOString().slice(0, 10));
    setShowAddLoanLedgerForm(true);
    sdk.ui.hapticFeedback('light');
  };

  const resetLoanLedgerForm = () => {
    setEditingLoanLedgerId(null);
    setLlTitle('');
    setLlAmount('');
    setLlDate(new Date().toISOString().slice(0, 10));
    setShowAddLoanLedgerForm(false);
  };

  const handleSaveLoanLedgerEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmt = parseFloat(llAmount);
    if (!Number.isFinite(numericAmt) || numericAmt <= 0) {
      sdk.ui.showToast('Enter a valid positive amount for the loan ledger entry', 'warning');
      return;
    }

    const targetAcc =
      llAccountId && llAccountId !== 'NONE'
        ? accounts.find((a) => a.id === llAccountId)
        : undefined;

    // 1. UPDATE EXISTING LOAN BALANCE LEDGER ENTRY
    if (editingLoanLedgerId) {
      const oldEntry = loanLedgerEntries.find((item) => item.id === editingLoanLedgerId);
      if (!oldEntry) {
        resetLoanLedgerForm();
        return;
      }

      const targetLoan = loans.find((l) => l.id === oldEntry.loanId);
      const adjustments: Array<{
        accountId?: string;
        deltaAmount: number;
        deltaCurrency: CurrencyCode;
      }> = [];

      if (oldEntry.entryKind === 'principal') {
        const oldCashAmt = oldEntry.principalAmount ?? oldEntry.amount;
        if (oldEntry.accountId) {
          adjustments.push({
            accountId: oldEntry.accountId,
            deltaAmount: oldEntry.direction === 'borrowed' ? -oldCashAmt : oldCashAmt,
            deltaCurrency: oldEntry.currency,
          });
        }
        if (targetAcc) {
          adjustments.push({
            accountId: targetAcc.id,
            deltaAmount: oldEntry.direction === 'borrowed' ? numericAmt : -numericAmt,
            deltaCurrency: oldEntry.currency,
          });
        }
      } else {
        // Repayment entry
        if (oldEntry.accountId) {
          adjustments.push({
            accountId: oldEntry.accountId,
            deltaAmount: oldEntry.direction === 'borrowed' ? oldEntry.amount : -oldEntry.amount,
            deltaCurrency: oldEntry.currency,
          });
        }
        if (targetAcc) {
          adjustments.push({
            accountId: targetAcc.id,
            deltaAmount: oldEntry.direction === 'borrowed' ? -numericAmt : numericAmt,
            deltaCurrency: oldEntry.currency,
          });
        }
      }

      if (adjustments.length > 0) {
        applyAccountBalanceAdjustments(
          adjustments,
          `Loan Balance Ledger Updated: ${llTitle.trim() || oldEntry.title}`
        );
      }

      const newTotalPayable =
        oldEntry.entryKind === 'principal' && targetLoan
          ? Number((numericAmt * (1 + Math.max(0, targetLoan.interestRate) / 100)).toFixed(2))
          : numericAmt;

      // Sync the underlying Loan record
      setLoans((prevLoans) =>
        prevLoans.map((loan) => {
          if (loan.id !== oldEntry.loanId) return loan;
          if (oldEntry.entryKind === 'principal') {
            return {
              ...loan,
              principalAmount: numericAmt,
              totalPayable: newTotalPayable,
              accountId: targetAcc?.id,
              status: loan.paidAmount >= newTotalPayable - 0.01 ? 'paid' : 'active',
            };
          }
          const nextPaid = Math.max(
            0,
            Math.min(
              loan.totalPayable,
              Number((loan.paidAmount - oldEntry.amount + numericAmt).toFixed(2))
            )
          );
          return {
            ...loan,
            paidAmount: nextPaid,
            status: nextPaid >= loan.totalPayable - 0.01 ? 'paid' : 'active',
          };
        })
      );

      setLoanLedgerEntries((prev) =>
        prev.map((item) =>
          item.id === editingLoanLedgerId
            ? {
                ...item,
                title: llTitle.trim() || item.title,
                amount: oldEntry.entryKind === 'principal' ? newTotalPayable : numericAmt,
                principalAmount:
                  oldEntry.entryKind === 'principal' ? numericAmt : item.principalAmount,
                accountId: targetAcc?.id,
                accountName: targetAcc?.name,
                date: llDate || item.date,
              }
            : item
        )
      );

      resetLoanLedgerForm();
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast('Updated Loan Balance Ledger entry & synced loan/account balance', 'success');
      return;
    }

    // 2. RECORD NEW LOAN REPAYMENT / SETTLEMENT DIRECTLY IN LOAN BALANCE LEDGER
    const selectedLoan = loans.find((l) => l.id === llTargetLoanId) || loans[0];
    if (!selectedLoan) {
      sdk.ui.showToast('Create a loan first in the Loans tab', 'warning');
      return;
    }

    const remaining = Math.max(0, selectedLoan.totalPayable - selectedLoan.paidAmount);
    const actualPay = remaining > 0 ? Math.min(remaining, numericAmt) : numericAmt;
    const defaultTitle =
      selectedLoan.direction === 'borrowed'
        ? `Loan Repayment: ${selectedLoan.title} (${selectedLoan.providerName})`
        : `Loan Collection: ${selectedLoan.title} (${selectedLoan.providerName})`;
    const finalTitle = llTitle.trim() || defaultTitle;

    if (targetAcc) {
      const signedInLoanCurr = selectedLoan.direction === 'borrowed' ? -actualPay : actualPay;
      applyAccountBalanceAdjustments(
        [
          {
            accountId: targetAcc.id,
            deltaAmount: signedInLoanCurr,
            deltaCurrency: selectedLoan.currency,
          },
        ],
        finalTitle
      );
    }

    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLoan.id) return l;
        const nextPaid = Math.min(l.totalPayable, Number((l.paidAmount + actualPay).toFixed(2)));
        return {
          ...l,
          paidAmount: nextPaid,
          status: nextPaid >= l.totalPayable - 0.01 ? 'paid' : 'active',
        };
      })
    );

    const newEntry: LoanLedgerEntry = {
      id: `ll-repay-${Date.now()}`,
      loanId: selectedLoan.id,
      loanTitle: selectedLoan.title,
      providerName: selectedLoan.providerName,
      providerType: selectedLoan.providerType,
      direction: selectedLoan.direction,
      entryKind: 'repayment',
      title: finalTitle,
      amount: actualPay,
      currency: selectedLoan.currency,
      accountId: targetAcc?.id,
      accountName: targetAcc?.name,
      date: llDate || new Date().toISOString().slice(0, 10),
    };

    setLoanLedgerEntries((prev) => [newEntry, ...prev]);
    resetLoanLedgerForm();
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Recorded ${formatMoney(actualPay, selectedLoan.currency)} in Loan Balance Ledger`,
      'success'
    );
  };

  const handleDeleteLoanLedgerEntry = (id: string) => {
    const targetEntry = loanLedgerEntries.find((item) => item.id === id);
    if (!targetEntry) return;

    // If deleting a principal entry, delete the entire loan and reverse all its linked entries
    if (targetEntry.entryKind === 'principal') {
      handleDeleteLoan(targetEntry.loanId);
      return;
    }

    sdk.ui.hapticFeedback('medium');
    if (targetEntry.accountId) {
      const reverseDelta =
        targetEntry.direction === 'borrowed' ? targetEntry.amount : -targetEntry.amount;
      applyAccountBalanceAdjustments(
        [
          {
            accountId: targetEntry.accountId,
            deltaAmount: reverseDelta,
            deltaCurrency: targetEntry.currency,
          },
        ],
        `Reversed Loan Settlement: ${targetEntry.title}`
      );
    }

    setLoans((prevLoans) =>
      prevLoans.map((loan) => {
        if (loan.id !== targetEntry.loanId) return loan;
        const nextPaid = Math.max(0, Number((loan.paidAmount - targetEntry.amount).toFixed(2)));
        return {
          ...loan,
          paidAmount: nextPaid,
          status: nextPaid >= loan.totalPayable - 0.01 ? 'paid' : 'active',
        };
      })
    );

    if (editingLoanLedgerId === id) {
      resetLoanLedgerForm();
    }

    setLoanLedgerEntries((prev) => prev.filter((item) => item.id !== id));
    sdk.ui.showToast('Loan settlement removed & loan/account balances restored', 'info');
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

  // Handlers: Savings Goals (Synced with Ledger & SuperApp Wallet)
  const handleContributeToGoal = async (goal: SavingsGoal, amountInGoalCurr: number) => {
    sdk.ui.hapticFeedback('medium');
    const amountInBase = convertAmount(amountInGoalCurr, goal.currency, baseCurrency);
    const confirmed = await sdk.ui.requestConfirm(
      'Transfer to Savings Vault',
      `Transfer ${formatMoney(amountInGoalCurr, goal.currency)} from your shared Super App Wallet into "${goal.name}"?`
    );
    if (!confirmed) return;

    const depositTitle = `Savings Goal Deposit: ${goal.name}`;
    const res = await sdk.payment.pay(amountInBase, depositTitle);
    if (res.success) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? { ...g, savedAmount: Math.min(g.targetAmount, g.savedAmount + amountInGoalCurr) }
            : g
        )
      );

      // Sync savings goal deposit to the FinTrack Transactions Ledger
      const goalLedgerEntry: FinTrackEntry = {
        id: `ft-goal-${Date.now()}`,
        title: depositTitle,
        amount: amountInGoalCurr,
        currency: goal.currency,
        type: 'expense',
        category: 'Transfer',
        goalId: goal.id,
        accountName: 'SuperApp Wallet',
        date: new Date().toISOString().slice(0, 10),
        settledViaWallet: true,
      };
      setEntries((prev) => [goalLedgerEntry, ...prev]);

      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(
        `Added ${formatMoney(amountInGoalCurr, goal.currency)} to ${goal.name} & synced to ledger!`,
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

  const filteredLoanLedgerEntries = useMemo(() => {
    if (loanLedgerFilter === 'ALL') return loanLedgerEntries;
    if (loanLedgerFilter === 'borrowed' || loanLedgerFilter === 'lent') {
      return loanLedgerEntries.filter((e) => e.direction === loanLedgerFilter);
    }
    return loanLedgerEntries.filter((e) => e.entryKind === loanLedgerFilter);
  }, [loanLedgerEntries, loanLedgerFilter]);

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
    <div className="min-h-full flex flex-col justify-between" style={{ color: tokens.textPrimary }}>
      <div className="p-4 space-y-4 pb-8 flex-1">
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
          { id: 'ledger', label: 'Transactions', icon: TrendingUp },
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
                  if (showAddAccountForm && !editingAccountId) {
                    resetAccountForm();
                  } else {
                    setEditingAccountId(null);
                    setAccName('');
                    setAccBalance('');
                    setAccNumber('');
                    setShowAddAccountForm(true);
                    setShowTransferForm(false);
                  }
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

          {/* Add or Update Bank / Wallet Account Form */}
          {showAddAccountForm && (
            <form
              onSubmit={handleCreateAccount}
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: editingAccountId ? tokens.borderAccent : tokens.borderDefault,
              }}
              className="p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold">
                  {editingAccountId
                    ? 'Update Bank or Digital Wallet Account'
                    : 'New Bank or Digital Wallet Account'}
                </h4>
                <button
                  type="button"
                  onClick={resetAccountForm}
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
                    {editingAccountId ? 'Current Balance' : 'Opening Balance'}
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
                {editingAccountId ? 'Update Account' : 'Save Account'}
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
                        className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>
                          {acc.shareWithSuperApp
                            ? 'Shared with SuperApp'
                            : 'Share with SuperApp'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTxId(null);
                            setTxAccountId(acc.id);
                            setTxCurrency(acc.currency);
                            setShowAddTxForm(true);
                            setActiveLedgerView('main');
                            setActiveTab('ledger');
                            sdk.ui.hapticFeedback('light');
                          }}
                          style={{
                            backgroundColor: tokens.bgSurface,
                            borderColor: tokens.borderDefault,
                            color: tokens.textSecondary,
                          }}
                          className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition hover:opacity-90"
                          title="Record transaction for this account"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tx</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditAccount(acc)}
                          style={{
                            backgroundColor: tokens.bgSurface,
                            borderColor: tokens.borderDefault,
                            color: tokens.textPrimary,
                          }}
                          className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition hover:opacity-90"
                          aria-label={`Edit account ${acc.name}`}
                          title="Edit account"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                          aria-label={`Delete account ${acc.name}`}
                          title="Delete account"
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
          TAB 2: TWO SEPARATE LEDGERS
          - LEDGER 1: MAIN BALANCE LEDGER (Bank & Wallet Cashflow Tracking)
          - LEDGER 2: LOAN BALANCE LEDGER (Borrowed Debt & P2P Lent Balance Tracking)
         ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          {/* 2-Ledger Segmented Switcher */}
          <div
            style={{
              backgroundColor: tokens.bgSurface,
              borderColor: tokens.borderDefault,
            }}
            className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl border"
          >
            <button
              type="button"
              onClick={() => {
                setActiveLedgerView('main');
                sdk.ui.hapticFeedback('light');
              }}
              style={{
                backgroundColor: activeLedgerView === 'main' ? tokens.accentPrimary : 'transparent',
                color: activeLedgerView === 'main' ? tokens.accentContrast : tokens.textSecondary,
              }}
              className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Landmark className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Main Balance Ledger ({entries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLedgerView('loan');
                sdk.ui.hapticFeedback('light');
              }}
              style={{
                backgroundColor: activeLedgerView === 'loan' ? tokens.accentPrimary : 'transparent',
                color: activeLedgerView === 'loan' ? tokens.accentContrast : tokens.textSecondary,
              }}
              className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Loan Balance Ledger ({loanLedgerEntries.length})</span>
            </button>
          </div>

          {/* =================================================================
              LEDGER 1 VIEW: MAIN BALANCE LEDGER (ACCOUNTS & CASHFLOW)
             ================================================================= */}
          {activeLedgerView === 'main' && (
            <div className="space-y-3">
              {/* Main Balance Ledger KPI Summary Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-3 rounded-2xl border"
                >
                  <div className="text-[10px] font-semibold" style={{ color: tokens.textSecondary }}>
                    Main Account Balance
                  </div>
                  <div className="text-xs font-black tabular-nums mt-0.5 truncate">
                    {formatMoney(portfolioSummary.totalAccountsBase, baseCurrency)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-3 rounded-2xl border"
                >
                  <div className="text-[10px] font-semibold" style={{ color: tokens.textSecondary }}>
                    Total Inflow
                  </div>
                  <div className="text-xs font-black text-emerald-400 tabular-nums mt-0.5 truncate">
                    +{formatMoney(portfolioSummary.totalIncomeBase, baseCurrency)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-3 rounded-2xl border"
                >
                  <div className="text-[10px] font-semibold" style={{ color: tokens.textSecondary }}>
                    Total Outflow
                  </div>
                  <div className="text-xs font-black text-rose-400 tabular-nums mt-0.5 truncate">
                    -{formatMoney(portfolioSummary.totalExpenseBase, baseCurrency)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Category Filter Buttons (Excludes Loan since Loans have their own Ledger) */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {(
                    [
                      'ALL',
                      'Transfer',
                      'Salary',
                      'Business',
                      'Income',
                      'Housing',
                      'Dining',
                      'Transit',
                      'Utilities',
                      'Subscriptions',
                      'Shopping',
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
                        {cat === 'ALL' ? 'All Main Activity' : cat}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (showAddTxForm && !editingTxId) {
                      resetTransactionForm();
                    } else {
                      setEditingTxId(null);
                      setTxTitle('');
                      setTxAmount('');
                      setTxDate(new Date().toISOString().slice(0, 10));
                      if ((!txAccountId || txAccountId === 'NONE') && accounts[0]) {
                        setTxAccountId(accounts[0].id);
                      }
                      setShowAddTxForm(true);
                    }
                  }}
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
                    borderColor: editingTxId ? tokens.borderAccent : tokens.borderDefault,
                  }}
                  className="p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold">
                      {editingTxId
                        ? 'Update Main Ledger Entry (Auto-Syncs Account Balance)'
                        : 'Record Main Balance Income or Expense'}
                    </h3>
                    <button
                      type="button"
                      onClick={resetTransactionForm}
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
                          if (txCategory !== 'Transfer') {
                            setTxCategory(t === 'income' ? 'Salary' : 'Dining');
                          }
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
                    <label
                      className="text-[11px] font-semibold block mb-1"
                      style={{ color: tokens.textSecondary }}
                    >
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
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
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
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
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
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
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
                            <option value="Transfer">Transfer</option>
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
                            <option value="Transfer">Transfer</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
                        Linked Bank or Wallet Account
                      </label>
                      <select
                        value={txAccountId || 'NONE'}
                        onChange={(e) => setTxAccountId(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                      >
                        <option value="NONE">— No linked account —</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.currency} {a.balance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
                        Date
                      </label>
                      <input
                        type="date"
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                      />
                    </div>
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
                    {editingTxId ? 'Update Main Ledger & Sync Account' : 'Save to Main Balance Ledger'}
                  </button>
                </form>
              )}

              {/* Main Balance Ledger Entries List */}
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
                    <p className="text-xs font-bold">No Main Balance Transactions Yet</p>
                    <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                      Record income, expenses, or transfers linked to your Bank & Wallet accounts. Loan activity is tracked separately in the Loan Balance Ledger.
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
                      + Record Main Transaction
                    </button>
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        backgroundColor: tokens.bgCard,
                        borderColor:
                          editingTxId === entry.id ? tokens.borderAccent : tokens.borderDefault,
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

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right mr-1">
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
                              ≈{' '}
                              {formatMoney(
                                convertAmount(entry.amount, entry.currency, baseCurrency),
                                baseCurrency
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => startEditTransaction(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                          aria-label={`Edit transaction ${entry.title}`}
                          title="Edit transaction"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                          aria-label={`Delete transaction ${entry.title}`}
                          title="Delete transaction"
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

          {/* =================================================================
              LEDGER 2 VIEW: LOAN BALANCE LEDGER (BORROWED & LENT OBLIGATIONS)
             ================================================================= */}
          {activeLedgerView === 'loan' && (
            <div className="space-y-3">
              {/* Loan Balance Ledger KPI Summary Strip */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-3 rounded-2xl border"
                >
                  <div className="text-[10px] font-semibold" style={{ color: tokens.textSecondary }}>
                    Borrowed Debt Balance (Payable)
                  </div>
                  <div className="text-sm font-black text-rose-400 tabular-nums mt-0.5 truncate">
                    {formatMoney(portfolioSummary.activeBorrowedBase, baseCurrency)}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: tokens.textMuted }}>
                    B2C & P2P Liabilities
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: tokens.borderDefault,
                  }}
                  className="p-3 rounded-2xl border"
                >
                  <div className="text-[10px] font-semibold" style={{ color: tokens.textSecondary }}>
                    Lent Loan Balance (Receivable)
                  </div>
                  <div className="text-sm font-black text-emerald-400 tabular-nums mt-0.5 truncate">
                    {formatMoney(portfolioSummary.activeLentBase, baseCurrency)}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: tokens.textMuted }}>
                    P2P & Equb Receivables
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Loan Balance Ledger Filter Buttons */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {(
                    [
                      { id: 'ALL', label: 'All Loan Entries' },
                      { id: 'borrowed', label: 'Borrowed' },
                      { id: 'lent', label: 'Lent (P2P)' },
                      { id: 'principal', label: 'Disbursements (+)' },
                      { id: 'repayment', label: 'Repayments (-)' },
                    ] as const
                  ).map((f) => {
                    const active = loanLedgerFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setLoanLedgerFilter(f.id);
                          sdk.ui.hapticFeedback('light');
                        }}
                        style={{
                          backgroundColor: active ? tokens.accentPrimary : tokens.bgSurface,
                          color: active ? tokens.accentContrast : tokens.textSecondary,
                          borderColor: active ? 'transparent' : tokens.borderDefault,
                        }}
                        className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold whitespace-nowrap shrink-0 transition"
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (showAddLoanLedgerForm && !editingLoanLedgerId) {
                      resetLoanLedgerForm();
                    } else if (loans.length === 0) {
                      setActiveTab('loans');
                      setShowAddLoanForm(true);
                      sdk.ui.showToast('Create a loan to start tracking in the Loan Balance Ledger', 'info');
                    } else {
                      setEditingLoanLedgerId(null);
                      setLlTargetLoanId(loans[0].id);
                      setLlTitle('');
                      setLlAmount('');
                      setLlDate(new Date().toISOString().slice(0, 10));
                      if ((!llAccountId || llAccountId === 'NONE') && accounts[0]) {
                        setLlAccountId(accounts[0].id);
                      }
                      setShowAddLoanLedgerForm(true);
                    }
                  }}
                  style={{
                    backgroundColor: tokens.accentPrimary,
                    color: tokens.accentContrast,
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{loans.length === 0 ? 'New Loan' : 'Log Repayment'}</span>
                </button>
              </div>

              {showAddLoanLedgerForm && (
                <form
                  onSubmit={handleSaveLoanLedgerEntry}
                  style={{
                    backgroundColor: tokens.bgCard,
                    borderColor: editingLoanLedgerId ? tokens.borderAccent : tokens.borderDefault,
                  }}
                  className="p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold">
                      {editingLoanLedgerId
                        ? 'Update Loan Balance Ledger Entry (Auto-Syncs Loan & Account)'
                        : 'Record Loan Repayment / Collection in Loan Ledger'}
                    </h3>
                    <button
                      type="button"
                      onClick={resetLoanLedgerForm}
                      className="text-[11px]"
                      style={{ color: tokens.textSecondary }}
                    >
                      Cancel
                    </button>
                  </div>

                  {!editingLoanLedgerId && (
                    <div>
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
                        Select Active Loan
                      </label>
                      <select
                        value={llTargetLoanId || loans[0]?.id || ''}
                        onChange={(e) => setLlTargetLoanId(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none"
                      >
                        {loans.map((l) => {
                          const rem = Math.max(0, l.totalPayable - l.paidAmount);
                          return (
                            <option key={l.id} value={l.id}>
                              {l.title} ({l.providerName}) — Balance: {l.currency} {rem.toFixed(2)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div>
                    <label
                      className="text-[11px] font-semibold block mb-1"
                      style={{ color: tokens.textSecondary }}
                    >
                      Entry Description
                    </label>
                    <input
                      type="text"
                      value={llTitle}
                      onChange={(e) => setLlTitle(e.target.value)}
                      placeholder="Optional custom note (auto-generated if left blank)"
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
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={llAmount}
                        onChange={(e) => setLlAmount(e.target.value)}
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
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
                        Settlement Account
                      </label>
                      <select
                        value={llAccountId || 'NONE'}
                        onChange={(e) => setLlAccountId(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                      >
                        <option value="NONE">— No account impact —</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.currency} {a.balance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        className="text-[11px] font-semibold block mb-1"
                        style={{ color: tokens.textSecondary }}
                      >
                        Date
                      </label>
                      <input
                        type="date"
                        value={llDate}
                        onChange={(e) => setLlDate(e.target.value)}
                        style={{
                          backgroundColor: tokens.bgInput,
                          borderColor: tokens.borderDefault,
                          color: tokens.textPrimary,
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                      />
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
                    {editingLoanLedgerId
                      ? 'Update Loan Ledger Entry & Sync Balances'
                      : 'Save to Loan Balance Ledger'}
                  </button>
                </form>
              )}

              {/* Loan Balance Ledger Entries List */}
              <div className="space-y-2">
                {filteredLoanLedgerEntries.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: tokens.bgCard,
                      borderColor: tokens.borderDefault,
                    }}
                    className="p-6 rounded-2xl border text-center space-y-2"
                  >
                    <Briefcase className="w-6 h-6 mx-auto opacity-50" />
                    <p className="text-xs font-bold">No Loan Balance Ledger Entries Yet</p>
                    <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                      Every B2C or P2P loan disbursement (+obligation) and repayment (-settlement) is automatically tracked here.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('loans');
                        setShowAddLoanForm(true);
                      }}
                      style={{
                        backgroundColor: tokens.accentPrimary,
                        color: tokens.accentContrast,
                      }}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold transition ios-active mt-1"
                    >
                      + Create or Manage Loans
                    </button>
                  </div>
                ) : (
                  filteredLoanLedgerEntries.map((entry) => {
                    const parentLoan = loans.find((l) => l.id === entry.loanId);
                    const remainingLoanBal = parentLoan
                      ? Math.max(0, parentLoan.totalPayable - parentLoan.paidAmount)
                      : 0;
                    const isPrincipal = entry.entryKind === 'principal';

                    return (
                      <div
                        key={entry.id}
                        style={{
                          backgroundColor: tokens.bgCard,
                          borderColor:
                            editingLoanLedgerId === entry.id
                              ? tokens.borderAccent
                              : tokens.borderDefault,
                        }}
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{
                              backgroundColor: isPrincipal ? '#f43f5e' : '#10b981',
                            }}
                          >
                            {isPrincipal ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{entry.title}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                  entry.direction === 'borrowed'
                                    ? 'bg-rose-500/15 text-rose-400'
                                    : 'bg-emerald-500/15 text-emerald-400'
                                }`}
                              >
                                {entry.providerType} · {entry.direction}
                              </span>
                            </div>
                            <div
                              className="text-[10px] mt-0.5 truncate"
                              style={{ color: tokens.textMuted }}
                            >
                              {isPrincipal ? 'Loan Balance Added' : 'Loan Balance Reduced'} ·{' '}
                              {entry.date}
                              {entry.accountName ? ` · Account: ${entry.accountName}` : ''}
                              {parentLoan
                                ? ` · Remaining Loan Bal: ${formatMoney(
                                    remainingLoanBal,
                                    parentLoan.currency
                                  )}`
                                : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right mr-1">
                            <div
                              className={`text-xs font-extrabold tabular-nums ${
                                isPrincipal ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {isPrincipal ? '+' : '-'}
                              {formatMoney(entry.amount, entry.currency)}
                            </div>
                            <div
                              className="text-[9px] font-semibold"
                              style={{ color: tokens.textMuted }}
                            >
                              {isPrincipal ? 'Loan Obligation' : 'Paid / Settled'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditLoanLedgerEntry(entry)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                            aria-label={`Edit loan ledger entry ${entry.title}`}
                            title="Edit loan ledger entry"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLoanLedgerEntry(entry.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                            aria-label={`Delete loan ledger entry ${entry.title}`}
                            title="Delete loan ledger entry"
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

          {/* Sub-Navigation: Loans vs Providers + Loan Balance Ledger Jump + B2C/P2P Filter */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
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
              <button
                type="button"
                onClick={() => {
                  setActiveLedgerView('loan');
                  setActiveTab('ledger');
                  sdk.ui.hapticFeedback('light');
                }}
                style={{
                  color: tokens.accentPrimary,
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Loan Ledger ({loanLedgerEntries.length})</span>
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
                  onClick={() => {
                    if (showAddLoanForm && !editingLoanId) {
                      resetLoanForm();
                    } else {
                      setEditingLoanId(null);
                      setLoanTitle('');
                      setLoanPrincipal('');
                      if (!loanAccountId && accounts[0]) {
                        setLoanAccountId(accounts[0].id);
                      }
                      setShowAddLoanForm(true);
                    }
                  }}
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
                    borderColor: editingLoanId ? tokens.borderAccent : tokens.borderDefault,
                  }}
                  className="p-4 rounded-2xl border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold">
                      {editingLoanId
                        ? 'Update Loan & Sync Ledger'
                        : 'Track New B2C or P2P Loan (Syncs to Ledger)'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetLoanForm}
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
                        <option value="">None (Ledger Only)</option>
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
                    {editingLoanId
                      ? 'Update Loan & Sync Ledger'
                      : 'Save Loan & Sync to Ledger'}
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
                        <option value="">Manual (Ledger Only)</option>
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
                    Confirm Settlement & Sync Ledger
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
                          borderColor:
                            editingLoanId === loan.id ? tokens.borderAccent : tokens.borderDefault,
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
                                  setRepayAccountId(loan.accountId || accounts[0]?.id || '');
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
                              onClick={() => startEditLoan(loan)}
                              className="p-1 text-slate-400 hover:text-blue-400 transition"
                              aria-label={`Edit loan ${loan.title}`}
                              title="Edit loan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLoan(loan.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition"
                              aria-label={`Delete loan ${loan.title}`}
                              title="Delete loan"
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

      {/* Fixed/Sticky iOS-HIG Bottom Navigation Bar for FinTrack */}
      <nav
        aria-label="FinTrack Bottom Navigation"
        style={{
          backgroundColor: tokens.bgGlass,
          borderColor: tokens.borderDefault,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
        className="sticky bottom-0 left-0 right-0 z-30 h-16 border-t px-1.5 flex items-center justify-around select-none shrink-0 transition-colors duration-200"
      >
        {[
          { id: 'accounts', label: 'Accounts', icon: Landmark, count: accounts.length },
          { id: 'ledger', label: 'Transactions', icon: TrendingUp, count: entries.length },
          { id: 'loans', label: 'Loans', icon: Briefcase, count: loans.length },
          { id: 'scheduled', label: 'Schedule', icon: CalendarClock, count: scheduledTxs.length },
          { id: 'analytics', label: 'Insights', icon: PieChart },
          { id: 'goals', label: 'Goals', icon: Target, count: goals.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                sdk.ui.hapticFeedback('light');
              }}
              style={{
                color: isActive ? tokens.accentPrimary : tokens.textMuted,
              }}
              className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all duration-150 ios-active relative"
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 transition-transform duration-150 ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                {isActive && (
                  <span
                    className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor: tokens.accentPrimary,
                      boxShadow: `0 0 8px ${tokens.accentGlow}`,
                    }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight truncate max-w-full ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
