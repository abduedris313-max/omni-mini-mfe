import React, { useState, useMemo } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  ShieldCheck,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Home,
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  Filter,
  Sparkles,
  FileSpreadsheet,
  Users,
  Receipt,
  CheckCircle2,
  SlidersHorizontal,
  TrendingUp,
  CreditCard,
  Wallet,
  Scale,
  FolderKanban,
  Split,
  ArrowRightLeft,
} from 'lucide-react';

/**
 * ============================================================================
 * SECURO FINANCE MINI APP (Cloned & Adapted from github.com/securo-finance/securo)
 * ============================================================================
 * Faithful OmniMini port of Securo's domain architecture:
 * - Multi-Workspace (`personal` | `business`) & 13 Modular Capabilities (`MODULE_IDS`)
 * - Exact cent-based Mortgage Principal/Interest Split (`parseCents`, `amountToCents`)
 * - Collateralized Property Equity (`getPropertyEquity` via `secured_asset_id`)
 * - Recursive AND/OR Rule Condition Tree (`RuleConditionNode`, `flattenConditions`)
 * - Open Banking (SimpleFIN / Enable Banking / Pluggy) & CSV Statement Importer
 * - Split Groups (`split_groups`) & Business Invoices (`invoices`)
 */

export const SECURO_MODULE_IDS = [
  'transactions',
  'invoices',
  'accounts',
  'import',
  'reports',
  'assets',
  'budgets',
  'goals',
  'recurring',
  'categories',
  'payees',
  'split_groups',
  'rules',
] as const;

export type SecuroModuleId = (typeof SECURO_MODULE_IDS)[number];
export type WorkspaceKind = 'personal' | 'business';

export interface SecuroWorkspace {
  id: string;
  name: string;
  kind: WorkspaceKind;
  defaultCurrency: string;
  taxJurisdiction: string;
  enabledModules: SecuroModuleId[];
}

export type SecuroAccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'investment'
  | 'cash'
  | 'loan';

export interface SecuroAccount {
  id: string;
  workspaceId: string;
  name: string;
  type: SecuroAccountType;
  institution: string;
  balance: number; // Positive for assets, negative for loan/credit debt
  currency: string;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
  /** Links a loan/mortgage account to a collateralized Asset (`property-equity.ts`) */
  secured_asset_id?: string | null;
}

export type SecuroAssetType =
  | 'real_estate'
  | 'vehicle'
  | 'stock'
  | 'etf'
  | 'crypto'
  | 'bond';

export interface SecuroAsset {
  id: string;
  workspaceId: string;
  name: string;
  asset_type: SecuroAssetType;
  symbol?: string;
  quantity: number;
  current_price: number;
  cost_basis: number;
  currency: string;
}

export interface SecuroTransaction {
  id: string;
  workspaceId: string;
  accountId: string;
  date: string;
  payee: string;
  category: string;
  description: string;
  amount: number; // Positive = inflow, Negative = outflow
  isTransfer?: boolean;
  mortgageSplit?: {
    principalAmount: number;
    interestAmount: number;
    loanAccountId: string;
  };
  ruleAppliedId?: string;
}

export interface SecuroBudget {
  id: string;
  workspaceId: string;
  category: string;
  monthlyLimit: number;
  rolloverEnabled: boolean;
}

/**
 * Ported directly from `securo/frontend/src/lib/rule-conditions.ts`
 */
export interface RuleConditionLeaf {
  field: 'payee' | 'description' | 'amount';
  operator: 'contains' | 'equals' | 'starts_with' | 'gt' | 'lt';
  value: string | number;
}

export interface RuleConditionGroup {
  operator: 'AND' | 'OR';
  conditions: RuleConditionNode[];
}

export type RuleConditionNode = RuleConditionLeaf | RuleConditionGroup;

export interface SecuroAutoRule {
  id: string;
  workspaceId: string;
  name: string;
  conditionTree: RuleConditionGroup;
  setCategory: string;
  renamePayeeTo?: string;
  isActive: boolean;
  appliedCount: number;
}

export interface SecuroSplitExpense {
  id: string;
  workspaceId: string;
  groupName: string;
  title: string;
  totalAmount: number;
  paidBy: string;
  participantNames: string[];
  yourShare: number; // Positive = others owe you, Negative = you owe others
  settled: boolean;
  date: string;
}

export interface SecuroInvoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  clientName: string;
  clientTaxId: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

/**
 * Ported from `securo/frontend/src/lib/mortgage-split.ts`
 * Converts user decimal strings into integer cents to prevent floating-point drift
 * when splitting a mortgage payment into Principal (loan payoff) and Interest (expense).
 */
export function parseCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export function amountToCents(amount: string): number | null {
  const parsed = parseCents(amount);
  if (parsed === null || parsed === 0) return null;
  return parsed;
}

/**
 * Ported from `securo/frontend/src/lib/property-equity.ts`
 * Computes real-time collateralized property/vehicle equity by summing all loan accounts
 * whose `secured_asset_id` references the asset.
 */
export function getPropertyEquity(
  asset: SecuroAsset,
  accounts: SecuroAccount[]
): { value: number; debt: number; equity: number; ltvPercent: number } {
  const value = asset.quantity * asset.current_price;
  const linkedLoans = accounts.filter(
    (a) => a.type === 'loan' && a.secured_asset_id === asset.id
  );
  const debt = linkedLoans.reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);
  const equity = value - debt;
  const ltvPercent = value > 0 ? Math.min(100, (debt / value) * 100) : 0;
  return { value, debt, equity, ltvPercent };
}

/**
 * Ported from `securo/frontend/src/lib/rule-conditions.ts`
 */
export function isConditionGroup(node: RuleConditionNode): node is RuleConditionGroup {
  return (
    typeof node === 'object' &&
    node !== null &&
    'operator' in node &&
    (node.operator === 'AND' || node.operator === 'OR') &&
    Array.isArray((node as RuleConditionGroup).conditions)
  );
}

export function flattenConditions(node: RuleConditionNode): RuleConditionLeaf[] {
  if (!isConditionGroup(node)) return [node];
  return node.conditions.flatMap((c) => flattenConditions(c));
}

export function evaluateRuleNode(
  node: RuleConditionNode,
  tx: { payee: string; description: string; amount: number }
): boolean {
  if (isConditionGroup(node)) {
    if (node.conditions.length === 0) return false;
    return node.operator === 'AND'
      ? node.conditions.every((child) => evaluateRuleNode(child, tx))
      : node.conditions.some((child) => evaluateRuleNode(child, tx));
  }

  const targetStr =
    node.field === 'payee'
      ? tx.payee.toLowerCase()
      : node.field === 'description'
      ? tx.description.toLowerCase()
      : String(Math.abs(tx.amount));
  const needle = String(node.value).toLowerCase();

  switch (node.operator) {
    case 'contains':
      return targetStr.includes(needle);
    case 'equals':
      return targetStr === needle;
    case 'starts_with':
      return targetStr.startsWith(needle);
    case 'gt':
      return Math.abs(tx.amount) > Number(node.value);
    case 'lt':
      return Math.abs(tx.amount) < Number(node.value);
    default:
      return false;
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  ETB: 'Br ',
  BRL: 'R$',
  GBP: '£',
};

const INITIAL_WORKSPACES: SecuroWorkspace[] = [
  {
    id: 'ws-personal',
    name: 'Personal Wealth',
    kind: 'personal',
    defaultCurrency: 'USD',
    taxJurisdiction: 'US-General',
    enabledModules: [
      'transactions',
      'accounts',
      'import',
      'reports',
      'assets',
      'budgets',
      'goals',
      'recurring',
      'categories',
      'payees',
      'split_groups',
      'rules',
    ],
  },
  {
    id: 'ws-business',
    name: 'Securo Studio LLC',
    kind: 'business',
    defaultCurrency: 'USD',
    taxJurisdiction: 'US-Delaware',
    enabledModules: [
      'transactions',
      'invoices',
      'accounts',
      'import',
      'reports',
      'assets',
      'budgets',
      'categories',
      'payees',
      'rules',
    ],
  },
];

const INITIAL_ASSETS: SecuroAsset[] = [
  {
    id: 'asset-home-1',
    workspaceId: 'ws-personal',
    name: 'Austin Townhouse Residence',
    asset_type: 'real_estate',
    quantity: 1,
    current_price: 485000,
    cost_basis: 410000,
    currency: 'USD',
  },
  {
    id: 'asset-etf-1',
    workspaceId: 'ws-personal',
    name: 'Vanguard Total World ETF',
    asset_type: 'etf',
    symbol: 'VT',
    quantity: 320,
    current_price: 118.5,
    cost_basis: 98.0,
    currency: 'USD',
  },
  {
    id: 'asset-car-1',
    workspaceId: 'ws-personal',
    name: 'Rivian R1T Dual-Motor',
    asset_type: 'vehicle',
    quantity: 1,
    current_price: 64000,
    cost_basis: 73000,
    currency: 'USD',
  },
  {
    id: 'asset-biz-eq',
    workspaceId: 'ws-business',
    name: 'Server Cluster & Mac Studio Fleet',
    asset_type: 'vehicle',
    quantity: 1,
    current_price: 28500,
    cost_basis: 32000,
    currency: 'USD',
  },
];

const INITIAL_ACCOUNTS: SecuroAccount[] = [
  {
    id: 'acc-checking',
    workspaceId: 'ws-personal',
    name: 'Mercury Primary Checking',
    type: 'checking',
    institution: 'Mercury Bank',
    balance: 18420.5,
    currency: 'USD',
  },
  {
    id: 'acc-savings',
    workspaceId: 'ws-personal',
    name: 'High-Yield Treasury Vault',
    type: 'savings',
    institution: 'Wealthfront',
    balance: 42500.0,
    currency: 'USD',
  },
  {
    id: 'acc-cc',
    workspaceId: 'ws-personal',
    name: 'Sapphire Reserve Card',
    type: 'credit_card',
    institution: 'Chase',
    balance: -2140.8,
    currency: 'USD',
    closingDay: 18,
    dueDay: 15,
    creditLimit: 25000,
  },
  {
    id: 'acc-mortgage',
    workspaceId: 'ws-personal',
    name: 'Austin Townhouse 30Y Fixed Mortgage',
    type: 'loan',
    institution: 'Rocket Mortgage',
    balance: -294500.0,
    currency: 'USD',
    secured_asset_id: 'asset-home-1',
  },
  {
    id: 'acc-auto-loan',
    workspaceId: 'ws-personal',
    name: 'Rivian EV Financing Note',
    type: 'loan',
    institution: 'Chase Auto',
    balance: -31200.0,
    currency: 'USD',
    secured_asset_id: 'asset-car-1',
  },
  {
    id: 'acc-biz-op',
    workspaceId: 'ws-business',
    name: 'Business Operating Account',
    type: 'checking',
    institution: 'Relay Financial',
    balance: 64800.0,
    currency: 'USD',
  },
];

const INITIAL_TRANSACTIONS: SecuroTransaction[] = [
  {
    id: 'tx-101',
    workspaceId: 'ws-personal',
    accountId: 'acc-checking',
    date: '2026-10-28',
    payee: 'Acme Cloud Corp Payroll',
    category: 'Salary & Payroll',
    description: 'Bi-weekly Senior Staff Engineer Direct Deposit',
    amount: 6850.0,
  },
  {
    id: 'tx-102',
    workspaceId: 'ws-personal',
    accountId: 'acc-checking',
    date: '2026-10-25',
    payee: 'Rocket Mortgage Servicing',
    category: 'Housing & Mortgage',
    description: 'Monthly Mortgage Split (Principal $1,150 + Interest $980)',
    amount: -2130.0,
    mortgageSplit: {
      principalAmount: 1150,
      interestAmount: 980,
      loanAccountId: 'acc-mortgage',
    },
  },
  {
    id: 'tx-103',
    workspaceId: 'ws-personal',
    accountId: 'acc-cc',
    date: '2026-10-24',
    payee: 'Whole Foods Market',
    category: 'Groceries',
    description: 'Weekly organic groceries & household',
    amount: -248.4,
  },
  {
    id: 'tx-104',
    workspaceId: 'ws-personal',
    accountId: 'acc-cc',
    date: '2026-10-22',
    payee: 'AWS Cloud Services',
    category: 'Software & Cloud',
    description: 'Self-hosted Securo & homelab cluster',
    amount: -64.2,
  },
  {
    id: 'tx-201',
    workspaceId: 'ws-business',
    accountId: 'acc-biz-op',
    date: '2026-10-27',
    payee: 'Stripe Payout — Enterprise SaaS',
    category: 'Client Revenue',
    description: 'Q4 Retainer Settlement INV-2026-014',
    amount: 14500.0,
  },
  {
    id: 'tx-202',
    workspaceId: 'ws-business',
    accountId: 'acc-biz-op',
    date: '2026-10-21',
    payee: 'Hetzner Online GmbH',
    category: 'Infrastructure',
    description: 'Dedicated PostgreSQL & Redis nodes',
    amount: -420.0,
  },
];

const INITIAL_BUDGETS: SecuroBudget[] = [
  {
    id: 'b-housing',
    workspaceId: 'ws-personal',
    category: 'Housing & Mortgage',
    monthlyLimit: 2500,
    rolloverEnabled: false,
  },
  {
    id: 'b-groceries',
    workspaceId: 'ws-personal',
    category: 'Groceries',
    monthlyLimit: 800,
    rolloverEnabled: true,
  },
  {
    id: 'b-cloud',
    workspaceId: 'ws-personal',
    category: 'Software & Cloud',
    monthlyLimit: 250,
    rolloverEnabled: false,
  },
  {
    id: 'b-infra',
    workspaceId: 'ws-business',
    category: 'Infrastructure',
    monthlyLimit: 1500,
    rolloverEnabled: true,
  },
];

const INITIAL_RULES: SecuroAutoRule[] = [
  {
    id: 'rule-1',
    workspaceId: 'ws-personal',
    name: 'Groceries Normalization',
    conditionTree: {
      operator: 'OR',
      conditions: [
        { field: 'payee', operator: 'contains', value: 'whole foods' },
        { field: 'payee', operator: 'contains', value: 'trader joe' },
      ],
    },
    setCategory: 'Groceries',
    renamePayeeTo: 'Whole Foods / Grocer',
    isActive: true,
    appliedCount: 14,
  },
  {
    id: 'rule-2',
    workspaceId: 'ws-personal',
    name: 'Cloud & SaaS Subscriptions',
    conditionTree: {
      operator: 'OR',
      conditions: [
        { field: 'payee', operator: 'contains', value: 'aws' },
        { field: 'payee', operator: 'contains', value: 'github' },
        { field: 'description', operator: 'contains', value: 'cloud' },
      ],
    },
    setCategory: 'Software & Cloud',
    renamePayeeTo: 'Cloud Infrastructure',
    isActive: true,
    appliedCount: 9,
  },
  {
    id: 'rule-3',
    workspaceId: 'ws-business',
    name: 'Server & Hosting Detection',
    conditionTree: {
      operator: 'OR',
      conditions: [
        { field: 'payee', operator: 'contains', value: 'hetzner' },
        { field: 'payee', operator: 'contains', value: 'cloudflare' },
      ],
    },
    setCategory: 'Infrastructure',
    isActive: true,
    appliedCount: 6,
  },
];

const INITIAL_SPLITS: SecuroSplitExpense[] = [
  {
    id: 'split-1',
    workspaceId: 'ws-personal',
    groupName: 'Austin Housemates',
    title: 'Google Fiber 2Gbps & Electric Utility',
    totalAmount: 240,
    paidBy: 'You',
    participantNames: ['You', 'Mateo', 'Elena'],
    yourShare: 160, // Mateo & Elena owe you $160
    settled: false,
    date: '2026-10-26',
  },
  {
    id: 'split-2',
    workspaceId: 'ws-personal',
    groupName: 'Lisbon Offsite Trip',
    title: 'Airbnb Alfama Villa Deposit',
    totalAmount: 960,
    paidBy: 'Elena',
    participantNames: ['You', 'Elena', 'Lucas', 'Sofia'],
    yourShare: -240, // You owe Elena $240
    settled: false,
    date: '2026-10-19',
  },
];

const INITIAL_INVOICES: SecuroInvoice[] = [
  {
    id: 'inv-1',
    workspaceId: 'ws-business',
    invoiceNumber: 'INV-2026-015',
    clientName: 'Nordic FinTech AB',
    clientTaxId: 'SE556703748501',
    amount: 8400,
    issueDate: '2026-10-20',
    dueDate: '2026-11-19',
    status: 'sent',
  },
  {
    id: 'inv-2',
    workspaceId: 'ws-business',
    invoiceNumber: 'INV-2026-014',
    clientName: 'Apex Global Partners',
    clientTaxId: 'EIN-84-2910482',
    amount: 14500,
    issueDate: '2026-10-01',
    dueDate: '2026-10-27',
    status: 'paid',
  },
];

type SecuroNavTab = 'dashboard' | 'ledger' | 'assets' | 'rules' | 'splits';

export const SecuroFinanceApp: React.FC<{ sdk: MiniAppBridgeSDK }> = ({ sdk }) => {
  // Pluggable Settings from Super App Host
  const hostSettings = sdk.settings.getSettings();
  const configuredCurrency: string = hostSettings.baseCurrency ?? 'USD';
  const defaultWorkspaceKind: WorkspaceKind =
    hostSettings.defaultWorkspace ?? 'personal';
  const autoSyncSuperWallet: boolean = hostSettings.autoSyncSuperWallet ?? true;

  const readStorage = <T,>(key: string, fallback: T): T => {
    const val = sdk.storage.getItem(key);
    return val !== null && val !== undefined ? (val as T) : fallback;
  };

  const [workspaces] = useState<SecuroWorkspace[]>(INITIAL_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    const saved = readStorage<string>('active_workspace_id', '');
    if (saved) return saved;
    return defaultWorkspaceKind === 'business' ? 'ws-business' : 'ws-personal';
  });

  const [activeTab, setActiveTab] = useState<SecuroNavTab>('dashboard');

  const [accounts, setAccounts] = useState<SecuroAccount[]>(() =>
    readStorage<SecuroAccount[]>('securo_accounts_v1', INITIAL_ACCOUNTS)
  );
  const [assets, setAssets] = useState<SecuroAsset[]>(() =>
    readStorage<SecuroAsset[]>('securo_assets_v1', INITIAL_ASSETS)
  );
  const [transactions, setTransactions] = useState<SecuroTransaction[]>(() =>
    readStorage<SecuroTransaction[]>('securo_transactions_v1', INITIAL_TRANSACTIONS)
  );
  const [budgets] = useState<SecuroBudget[]>(() =>
    readStorage<SecuroBudget[]>('securo_budgets_v1', INITIAL_BUDGETS)
  );
  const [rules, setRules] = useState<SecuroAutoRule[]>(() =>
    readStorage<SecuroAutoRule[]>('securo_rules_v1', INITIAL_RULES)
  );
  const [splits, setSplits] = useState<SecuroSplitExpense[]>(() =>
    readStorage<SecuroSplitExpense[]>('securo_splits_v1', INITIAL_SPLITS)
  );
  const [invoices, setInvoices] = useState<SecuroInvoice[]>(() =>
    readStorage<SecuroInvoice[]>('securo_invoices_v1', INITIAL_INVOICES)
  );

  // Ledger Form State (supports standard transaction OR Securo Mortgage Principal/Interest Split)
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [txType, setTxType] = useState<'expense' | 'income' | 'mortgage_split'>('expense');
  const [txAccountId, setTxAccountId] = useState<string>('');
  const [txPayee, setTxPayee] = useState('');
  const [txCategory, setTxCategory] = useState('Groceries');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txPrincipalStr, setTxPrincipalStr] = useState('1150.00');
  const [txInterestStr, setTxInterestStr] = useState('980.00');
  const [txLoanAccountId, setTxLoanAccountId] = useState('acc-mortgage');

  // New Account Modal
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccInstitution, setNewAccInstitution] = useState('');
  const [newAccType, setNewAccType] = useState<SecuroAccountType>('checking');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccSecuredAssetId, setNewAccSecuredAssetId] = useState<string>('');

  // New Asset Modal
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<SecuroAssetType>('real_estate');
  const [newAssetQty, setNewAssetQty] = useState('1');
  const [newAssetPrice, setNewAssetPrice] = useState('');
  const [newAssetCostBasis, setNewAssetCostBasis] = useState('');

  // Rule Engine & Bank Import State
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('Software & Cloud');
  const [importProvider, setImportProvider] = useState<'simplefin' | 'enable_banking' | 'pluggy' | 'csv'>('simplefin');

  // New Invoice / Split State
  const [newClientName, setNewClientName] = useState('');
  const [newClientTaxId, setNewClientTaxId] = useState('');
  const [newInvoiceAmount, setNewInvoiceAmount] = useState('');

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0],
    [workspaces, activeWorkspaceId]
  );

  const currencyCode = configuredCurrency || activeWorkspace.defaultCurrency || 'USD';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '$';

  const formatMoney = (val: number, showSign = false) => {
    const absFormatted = Math.abs(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (val < 0) return `-${currencySymbol}${absFormatted}`;
    if (showSign && val > 0) return `+${currencySymbol}${absFormatted}`;
    return `${currencySymbol}${absFormatted}`;
  };

  // Persist helper functions
  const saveAccounts = (next: SecuroAccount[]) => {
    setAccounts(next);
    sdk.storage.setItem('securo_accounts_v1', next);
  };
  const saveAssets = (next: SecuroAsset[]) => {
    setAssets(next);
    sdk.storage.setItem('securo_assets_v1', next);
  };
  const saveTransactions = (next: SecuroTransaction[]) => {
    setTransactions(next);
    sdk.storage.setItem('securo_transactions_v1', next);
  };
  const saveRules = (next: SecuroAutoRule[]) => {
    setRules(next);
    sdk.storage.setItem('securo_rules_v1', next);
  };
  const saveSplits = (next: SecuroSplitExpense[]) => {
    setSplits(next);
    sdk.storage.setItem('securo_splits_v1', next);
  };
  const saveInvoices = (next: SecuroInvoice[]) => {
    setInvoices(next);
    sdk.storage.setItem('securo_invoices_v1', next);
  };

  // Filtered workspace entities
  const wsAccounts = useMemo(
    () => accounts.filter((a) => a.workspaceId === activeWorkspace.id),
    [accounts, activeWorkspace.id]
  );
  const wsAssets = useMemo(
    () => assets.filter((a) => a.workspaceId === activeWorkspace.id),
    [assets, activeWorkspace.id]
  );
  const wsTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.workspaceId === activeWorkspace.id &&
          (selectedAccountFilter === 'all' || t.accountId === selectedAccountFilter)
      ),
    [transactions, activeWorkspace.id, selectedAccountFilter]
  );
  const wsBudgets = useMemo(
    () => budgets.filter((b) => b.workspaceId === activeWorkspace.id),
    [budgets, activeWorkspace.id]
  );
  const wsRules = useMemo(
    () => rules.filter((r) => r.workspaceId === activeWorkspace.id),
    [rules, activeWorkspace.id]
  );
  const wsSplits = useMemo(
    () => splits.filter((s) => s.workspaceId === activeWorkspace.id),
    [splits, activeWorkspace.id]
  );
  const wsInvoices = useMemo(
    () => invoices.filter((inv) => inv.workspaceId === activeWorkspace.id),
    [invoices, activeWorkspace.id]
  );

  // Financial Aggregations (Securo Net Worth & Cashflow Engine)
  const metrics = useMemo(() => {
    const liquidAssets = wsAccounts
      .filter((a) => a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);

    const totalLiabilities = wsAccounts
      .filter((a) => a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const portfolioAndPhysicalAssets = wsAssets.reduce(
      (sum, a) => sum + a.quantity * a.current_price,
      0
    );

    const netWorth = liquidAssets + portfolioAndPhysicalAssets - totalLiabilities;

    const allWsTx = transactions.filter((t) => t.workspaceId === activeWorkspace.id);
    const monthlyIncome = allWsTx
      .filter((t) => t.amount > 0 && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = allWsTx
      .filter((t) => t.amount < 0 && !t.isTransfer)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      liquidAssets,
      totalLiabilities,
      portfolioAndPhysicalAssets,
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      savingsRate:
        monthlyIncome > 0
          ? Math.max(0, Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100))
          : 0,
    };
  }, [wsAccounts, wsAssets, transactions, activeWorkspace.id]);

  // Switch Workspace
  const handleSwitchWorkspace = (wsId: string) => {
    setActiveWorkspaceId(wsId);
    setSelectedAccountFilter('all');
    sdk.storage.setItem('active_workspace_id', wsId);
    sdk.ui.hapticFeedback('light');
  };

  // Sync Liquid Checking/Savings Balance with Super App Shared Wallet
  const handleSyncToSuperAppWallet = async () => {
    sdk.ui.hapticFeedback('medium');
    const result = await sdk.payment.syncSharedBalance(
      Math.max(0, Number(metrics.liquidAssets.toFixed(2))),
      `Securo (${activeWorkspace.name}) Liquid Balance Sync`
    );
    if (result.success) {
      sdk.ui.showToast(
        `Super App Wallet synced to ${formatMoney(result.syncedBalance)}`,
        'success'
      );
    }
  };

  // Create Transaction (Standard OR Securo Mortgage Principal/Interest Split)
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const sourceAccId = txAccountId || wsAccounts[0]?.id;
    if (!sourceAccId) {
      sdk.ui.showToast('Please create an account first', 'warning');
      return;
    }

    if (txType === 'mortgage_split') {
      const principalCents = amountToCents(txPrincipalStr);
      const interestCents = parseCents(txInterestStr);
      if (principalCents === null || interestCents === null) {
        sdk.ui.showToast('Enter valid Principal and Interest amounts', 'error');
        return;
      }
      const totalPayment = (principalCents + interestCents) / 100;
      const principalDollars = principalCents / 100;
      const interestDollars = interestCents / 100;

      const newTx: SecuroTransaction = {
        id: `tx-${Date.now()}`,
        workspaceId: activeWorkspace.id,
        accountId: sourceAccId,
        date: new Date().toISOString().slice(0, 10),
        payee: txPayee.trim() || 'Mortgage Servicing Split',
        category: 'Housing & Mortgage',
        description:
          txDescription.trim() ||
          `Principal ${formatMoney(principalDollars)} + Interest ${formatMoney(interestDollars)}`,
        amount: -totalPayment,
        mortgageSplit: {
          principalAmount: principalDollars,
          interestAmount: interestDollars,
          loanAccountId: txLoanAccountId,
        },
      };

      // Deduct total payment from source account AND reduce loan debt by Principal amount
      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === sourceAccId) {
          return { ...acc, balance: Number((acc.balance - totalPayment).toFixed(2)) };
        }
        if (acc.id === txLoanAccountId) {
          // Loan balance is negative (e.g. -294500); paying principal moves it closer to 0
          return { ...acc, balance: Number((acc.balance + principalDollars).toFixed(2)) };
        }
        return acc;
      });

      saveAccounts(updatedAccounts);
      saveTransactions([newTx, ...transactions]);
      if (autoSyncSuperWallet) {
        await sdk.payment.pay(totalPayment, `Securo Mortgage: ${newTx.payee}`);
      }
      sdk.ui.hapticFeedback('success');
      sdk.ui.showToast(
        `Mortgage split posted: ${formatMoney(principalDollars)} principal reduced on loan`,
        'success'
      );
      setShowAddTxModal(false);
      return;
    }

    // Standard Income/Expense with Auto-Rule Evaluation
    const parsedCents = amountToCents(txAmount);
    if (!parsedCents || !txPayee.trim()) {
      sdk.ui.showToast('Enter a valid payee and amount', 'warning');
      return;
    }
    const rawDollars = parsedCents / 100;
    const signedAmount = txType === 'income' ? rawDollars : -rawDollars;

    let finalPayee = txPayee.trim();
    let finalCategory = txCategory;
    let matchedRuleId: string | undefined;

    for (const rule of wsRules) {
      if (
        rule.isActive &&
        evaluateRuleNode(rule.conditionTree, {
          payee: finalPayee,
          description: txDescription,
          amount: signedAmount,
        })
      ) {
        finalCategory = rule.setCategory;
        if (rule.renamePayeeTo) finalPayee = rule.renamePayeeTo;
        matchedRuleId = rule.id;
        break;
      }
    }

    const newTx: SecuroTransaction = {
      id: `tx-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      accountId: sourceAccId,
      date: new Date().toISOString().slice(0, 10),
      payee: finalPayee,
      category: finalCategory,
      description: txDescription.trim() || `${finalCategory} entry`,
      amount: signedAmount,
      ruleAppliedId: matchedRuleId,
    };

    const updatedAccounts = accounts.map((acc) =>
      acc.id === sourceAccId
        ? { ...acc, balance: Number((acc.balance + signedAmount).toFixed(2)) }
        : acc
    );

    if (matchedRuleId) {
      saveRules(
        rules.map((r) =>
          r.id === matchedRuleId ? { ...r, appliedCount: r.appliedCount + 1 } : r
        )
      );
    }

    saveAccounts(updatedAccounts);
    saveTransactions([newTx, ...transactions]);

    if (autoSyncSuperWallet) {
      if (signedAmount > 0) {
        await sdk.payment.credit(signedAmount, `Securo: ${finalPayee}`);
      } else {
        await sdk.payment.pay(Math.abs(signedAmount), `Securo: ${finalPayee}`);
      }
    }

    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      matchedRuleId
        ? `Posted & auto-categorized under "${finalCategory}" via Rule Engine`
        : `Transaction recorded (${formatMoney(signedAmount, true)})`,
      'success'
    );
    setTxPayee('');
    setTxDescription('');
    setTxAmount('');
    setShowAddTxModal(false);
  };

  // Delete Transaction & Revert Account Balance
  const handleDeleteTransaction = (tx: SecuroTransaction) => {
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === tx.accountId) {
        return { ...acc, balance: Number((acc.balance - tx.amount).toFixed(2)) };
      }
      if (tx.mortgageSplit && acc.id === tx.mortgageSplit.loanAccountId) {
        return {
          ...acc,
          balance: Number((acc.balance - tx.mortgageSplit.principalAmount).toFixed(2)),
        };
      }
      return acc;
    });
    saveAccounts(updatedAccounts);
    saveTransactions(transactions.filter((t) => t.id !== tx.id));
    sdk.ui.hapticFeedback('light');
    sdk.ui.showToast('Transaction removed and account balance restored', 'info');
  };

  // Add Account
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const rawBal = Number(newAccBalance) || 0;
    const finalBalance =
      newAccType === 'loan' || newAccType === 'credit_card' ? -Math.abs(rawBal) : rawBal;

    const created: SecuroAccount = {
      id: `acc-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      name: newAccName.trim(),
      institution: newAccInstitution.trim() || 'Self-Hosted Ledger',
      type: newAccType,
      balance: finalBalance,
      currency: currencyCode,
      secured_asset_id:
        newAccType === 'loan' && newAccSecuredAssetId ? newAccSecuredAssetId : null,
    };

    saveAccounts([...accounts, created]);
    setNewAccName('');
    setNewAccInstitution('');
    setNewAccBalance('');
    setNewAccSecuredAssetId('');
    setShowAddAccountModal(false);
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`Added ${created.name} to ${activeWorkspace.name}`, 'success');
  };

  // Add Asset
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;
    const qty = Math.max(0.0001, Number(newAssetQty) || 1);
    const price = Math.max(0, Number(newAssetPrice) || 0);
    const basis = Math.max(0, Number(newAssetCostBasis) || price);

    const created: SecuroAsset = {
      id: `asset-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      name: newAssetName.trim(),
      asset_type: newAssetType,
      quantity: qty,
      current_price: price,
      cost_basis: basis,
      currency: currencyCode,
    };

    saveAssets([...assets, created]);
    setNewAssetName('');
    setNewAssetPrice('');
    setNewAssetCostBasis('');
    setShowAddAssetModal(false);
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`Added ${created.name} to portfolio`, 'success');
  };

  // Create Auto-Categorization Rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleKeyword.trim()) return;
    const created: SecuroAutoRule = {
      id: `rule-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      name: newRuleName.trim(),
      conditionTree: {
        operator: 'OR',
        conditions: [
          { field: 'payee', operator: 'contains', value: newRuleKeyword.trim().toLowerCase() },
          {
            field: 'description',
            operator: 'contains',
            value: newRuleKeyword.trim().toLowerCase(),
          },
        ],
      },
      setCategory: newRuleCategory,
      isActive: true,
      appliedCount: 0,
    };
    saveRules([created, ...rules]);
    setNewRuleName('');
    setNewRuleKeyword('');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`Created Securo Rule "${created.name}"`, 'success');
  };

  // Run Open Banking / Statement Batch Import through Securo Rule Engine
  const handleRunOpenBankingImport = () => {
    const targetAcc = wsAccounts[0];
    if (!targetAcc) {
      sdk.ui.showToast('Create a workspace account before importing statements', 'warning');
      return;
    }

    const batchSamples: Record<
      typeof importProvider,
      Array<{ payee: string; description: string; amount: number; defaultCat: string }>
    > = {
      simplefin: [
        {
          payee: 'WHOLE FOODS MKT #1042 AUSTIN',
          description: 'POS Debit Card Purchase',
          amount: -142.85,
          defaultCat: 'Uncategorized',
        },
        {
          payee: 'AWS EMEA SARL CLOUD',
          description: 'Monthly S3 & EC2 compute',
          amount: -49.9,
          defaultCat: 'Uncategorized',
        },
      ],
      enable_banking: [
        {
          payee: 'HETZNER ONLINE GMBH',
          description: 'SEPA Direct Debit Cloud Server',
          amount: -89.0,
          defaultCat: 'Uncategorized',
        },
        {
          payee: 'REWE MARKT BERLIN',
          description: 'Contactless Girocard',
          amount: -64.15,
          defaultCat: 'Groceries',
        },
      ],
      pluggy: [
        {
          payee: 'PIX TRANSF NUBANK',
          description: 'Open Finance Brasil Instant Sync',
          amount: 1850.0,
          defaultCat: 'Client Revenue',
        },
        {
          payee: 'GITHUB INC CLOUD',
          description: 'Copilot & Actions runners',
          amount: -39.0,
          defaultCat: 'Uncategorized',
        },
      ],
      csv: [
        {
          payee: 'TRADER JOES #412',
          description: 'OFX / CAMT.053 Statement Import',
          amount: -94.5,
          defaultCat: 'Uncategorized',
        },
      ],
    };

    const rawRows = batchSamples[importProvider];
    let netDelta = 0;
    let rulesTriggered = 0;
    const updatedRules = [...rules];

    const importedTxs: SecuroTransaction[] = rawRows.map((row, idx) => {
      let payee = row.payee;
      let category = row.defaultCat;
      let matchedId: string | undefined;

      for (const r of updatedRules) {
        if (
          r.workspaceId === activeWorkspace.id &&
          r.isActive &&
          evaluateRuleNode(r.conditionTree, {
            payee,
            description: row.description,
            amount: row.amount,
          })
        ) {
          category = r.setCategory;
          if (r.renamePayeeTo) payee = r.renamePayeeTo;
          matchedId = r.id;
          r.appliedCount += 1;
          rulesTriggered += 1;
          break;
        }
      }

      netDelta += row.amount;
      return {
        id: `tx-imp-${Date.now()}-${idx}`,
        workspaceId: activeWorkspace.id,
        accountId: targetAcc.id,
        date: new Date().toISOString().slice(0, 10),
        payee,
        category,
        description: `[${importProvider.toUpperCase()}] ${row.description}`,
        amount: row.amount,
        ruleAppliedId: matchedId,
      };
    });

    saveRules(updatedRules);
    saveTransactions([...importedTxs, ...transactions]);
    saveAccounts(
      accounts.map((a) =>
        a.id === targetAcc.id
          ? { ...a, balance: Number((a.balance + netDelta).toFixed(2)) }
          : a
      )
    );

    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(
      `Imported ${importedTxs.length} rows (${rulesTriggered} auto-categorized by Rule Engine)`,
      'success'
    );
  };

  // Settle Split Group Expense via Super App Wallet
  const handleSettleSplit = async (split: SecuroSplitExpense) => {
    if (split.settled) return;
    if (split.yourShare < 0) {
      const res = await sdk.payment.pay(
        Math.abs(split.yourShare),
        `Securo Split Settlement: ${split.title}`
      );
      if (!res.success) return;
    } else if (split.yourShare > 0) {
      await sdk.payment.credit(split.yourShare, `Securo Split Collected: ${split.title}`);
    }
    saveSplits(splits.map((s) => (s.id === split.id ? { ...s, settled: true } : s)));
    sdk.ui.hapticFeedback('success');
  };

  // Create & Pay Business Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(newInvoiceAmount);
    if (!newClientName.trim() || !amt || amt <= 0) return;

    const inv: SecuroInvoice = {
      id: `inv-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      invoiceNumber: `INV-2026-0${invoices.length + 16}`,
      clientName: newClientName.trim(),
      clientTaxId: newClientTaxId.trim() || 'VAT-EXEMPT',
      amount: amt,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'sent',
    };
    saveInvoices([inv, ...invoices]);
    setNewClientName('');
    setNewClientTaxId('');
    setNewInvoiceAmount('');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`Issued ${inv.invoiceNumber} to ${inv.clientName}`, 'success');
  };

  const handleMarkInvoicePaid = async (inv: SecuroInvoice) => {
    if (inv.status === 'paid') return;
    const targetAcc = wsAccounts[0];
    if (targetAcc) {
      saveAccounts(
        accounts.map((a) =>
          a.id === targetAcc.id
            ? { ...a, balance: Number((a.balance + inv.amount).toFixed(2)) }
            : a
        )
      );
      const newTx: SecuroTransaction = {
        id: `tx-inv-${Date.now()}`,
        workspaceId: activeWorkspace.id,
        accountId: targetAcc.id,
        date: new Date().toISOString().slice(0, 10),
        payee: inv.clientName,
        category: 'Client Revenue',
        description: `Invoice Paid: ${inv.invoiceNumber} (${inv.clientTaxId})`,
        amount: inv.amount,
      };
      saveTransactions([newTx, ...transactions]);
    }
    if (autoSyncSuperWallet) {
      await sdk.payment.credit(inv.amount, `Securo Invoice ${inv.invoiceNumber}`);
    }
    saveInvoices(
      invoices.map((item) => (item.id === inv.id ? { ...item, status: 'paid' } : item))
    );
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast(`${inv.invoiceNumber} settled and credited to ledger`, 'success');
  };

  return (
    <div className="min-h-full pb-24 text-slate-100 select-none">
      {/* Top Workspace & Multi-Tenant Header */}
      <div className="px-4 pt-3 pb-3 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-tight text-white">Securo Finance</h1>
                <span className="text-[10px] font-mono text-emerald-400">
                  {activeWorkspace.kind.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {activeWorkspace.name} · {activeWorkspace.enabledModules.length} Modules ·{' '}
                {currencyCode}
              </p>
            </div>
          </div>

          {/* Workspace Switcher (Personal vs Business) */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            {workspaces.map((ws) => {
              const active = ws.id === activeWorkspace.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => handleSwitchWorkspace(ws.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                    active
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ws.kind === 'personal' ? (
                    <Home className="w-3 h-3" />
                  ) : (
                    <Building2 className="w-3 h-3" />
                  )}
                  <span>{ws.kind === 'personal' ? 'Personal' : 'Business'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="grid grid-cols-5 gap-1 mt-3 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80">
          {[
            { id: 'dashboard', label: 'Overview', icon: TrendingUp },
            { id: 'ledger', label: 'Ledger', icon: Landmark },
            { id: 'assets', label: 'Equity', icon: Scale },
            { id: 'rules', label: 'Rules/Sync', icon: Sparkles },
            { id: 'splits', label: 'Splits/B2B', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as SecuroNavTab);
                  sdk.ui.hapticFeedback('light');
                }}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-semibold flex flex-col items-center gap-0.5 transition ${
                  isCurrent
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isCurrent ? 'text-indigo-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TAB 1: OVERVIEW (Net Worth, Cashflow, Budgets & Super App Sync)
         ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="p-4 space-y-4">
          {/* Net Worth Hero Card */}
          <div className="rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/25 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                  Total Workspace Net Worth
                </p>
                <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums mt-1">
                  {formatMoney(metrics.netWorth)}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Liquid {formatMoney(metrics.liquidAssets)} · Assets{' '}
                  {formatMoney(metrics.portfolioAndPhysicalAssets)} · Debt{' '}
                  {formatMoney(metrics.totalLiabilities)}
                </p>
              </div>
              <button
                onClick={handleSyncToSuperAppWallet}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition ios-active shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Wallet</span>
              </button>
            </div>

            {/* Cashflow Bar */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
              <div className="p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Inflows</span>
                <span className="text-xs font-bold text-emerald-400 font-mono tabular-nums">
                  {formatMoney(metrics.monthlyIncome, true)}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Outflows</span>
                <span className="text-xs font-bold text-rose-400 font-mono tabular-nums">
                  -{formatMoney(metrics.monthlyExpenses)}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Savings Rate</span>
                <span className="text-xs font-bold text-indigo-400 font-mono tabular-nums">
                  {metrics.savingsRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                setTxType('expense');
                setShowAddTxModal(true);
              }}
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 flex items-center gap-3 text-left transition"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Record Entry</div>
                <div className="text-[10px] text-slate-400">Income, Expense or Split</div>
              </div>
            </button>

            <button
              onClick={() => {
                setTxType('mortgage_split');
                setShowAddTxModal(true);
              }}
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 flex items-center gap-3 text-left transition"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Split className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Mortgage Split</div>
                <div className="text-[10px] text-slate-400">Principal vs. Interest</div>
              </div>
            </button>
          </div>

          {/* Collateralized Property Equity Snapshot (`property-equity.ts`) */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white">
                  Collateralized Property & Asset Equity
                </h2>
                <p className="text-[10px] text-slate-400">
                  Securo real-time valuation minus linked loan balances
                </p>
              </div>
              <button
                onClick={() => setActiveTab('assets')}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Inspect All
              </button>
            </div>

            <div className="space-y-2.5">
              {wsAssets.slice(0, 3).map((asset) => {
                const eq = getPropertyEquity(asset, wsAccounts);
                return (
                  <div
                    key={asset.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{asset.name}</span>
                      <span className="font-mono font-bold text-emerald-400 tabular-nums">
                        {formatMoney(eq.equity)} Equity
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>
                        Market {formatMoney(eq.value)} · Debt {formatMoney(eq.debt)}
                      </span>
                      <span>LTV {eq.ltvPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Category Budgets */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white">Monthly Category Budgets</h2>
              <span className="text-[10px] text-slate-400 font-mono">Rollover Active</span>
            </div>

            <div className="space-y-3">
              {wsBudgets.map((b) => {
                const spent = transactions
                  .filter(
                    (t) =>
                      t.workspaceId === activeWorkspace.id &&
                      t.category === b.category &&
                      t.amount < 0
                  )
                  .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                const pct = Math.min(100, Math.round((spent / b.monthlyLimit) * 100));
                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200 font-medium">{b.category}</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {formatMoney(spent)} / {formatMoney(b.monthlyLimit)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 90
                            ? 'bg-rose-500'
                            : pct >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: LEDGER & MULTI-ACCOUNT BOOKKEEPING
         ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="p-4 space-y-4">
          {/* Accounts Horizontal Strip */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-white">Workspace Accounts</h2>
              <p className="text-[10px] text-slate-400">
                Checking, Credit Cards (Closing/Due) & Collateralized Loans
              </p>
            </div>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {wsAccounts.map((acc) => {
              const isSelected = selectedAccountFilter === acc.id;
              const linkedAsset = acc.secured_asset_id
                ? assets.find((a) => a.id === acc.secured_asset_id)
                : null;
              return (
                <div
                  key={acc.id}
                  onClick={() =>
                    setSelectedAccountFilter(isSelected ? 'all' : acc.id)
                  }
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        acc.balance < 0
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {acc.type === 'credit_card' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : acc.type === 'loan' ? (
                        <Home className="w-4 h-4" />
                      ) : (
                        <Wallet className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{acc.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {acc.institution} · {acc.type.replace('_', ' ')}
                        {acc.closingDay
                          ? ` · Closes day ${acc.closingDay} / Due ${acc.dueDay}`
                          : ''}
                        {linkedAsset ? ` · Secured by ${linkedAsset.name}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div
                      className={`text-xs font-bold ${
                        acc.balance < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatMoney(acc.balance)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isSelected ? 'Filtered' : 'Tap to filter'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transaction Ledger Header */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white">Transactions</h3>
              {selectedAccountFilter !== 'all' && (
                <button
                  onClick={() => setSelectedAccountFilter('all')}
                  className="text-[10px] text-indigo-400 underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAddTxModal(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>

          {/* Ledger List */}
          <div className="space-y-2">
            {wsTransactions.map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        tx.amount >= 0
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tx.amount >= 0 ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {tx.payee}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {tx.category} · {acc?.name || 'Account'} · {tx.date}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {tx.description}
                        {tx.ruleAppliedId ? ' · Auto-Rule Matched' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold font-mono tabular-nums ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {formatMoney(tx.amount, true)}
                    </span>
                    <button
                      onClick={() => handleDeleteTransaction(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: ASSETS & COLLATERALIZED PROPERTY EQUITY (`property-equity.ts`)
         ===================================================================== */}
      {activeTab === 'assets' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-white">
                Assets & Collateral Equity Engine
              </h2>
              <p className="text-[10px] text-slate-400">
                Links physical/investment assets to loan accounts via secured_asset_id
              </p>
            </div>
            <button
              onClick={() => setShowAddAssetModal(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Asset</span>
            </button>
          </div>

          <div className="space-y-3">
            {wsAssets.map((asset) => {
              const eq = getPropertyEquity(asset, wsAccounts);
              const totalGain = eq.value - asset.quantity * asset.cost_basis;
              return (
                <div
                  key={asset.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-mono text-indigo-400">
                        {asset.asset_type.replace('_', ' ')}
                        {asset.symbol ? ` · ${asset.symbol}` : ''}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">
                        {asset.name}
                      </h3>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-bold text-emerald-400">
                        {formatMoney(eq.equity)}
                      </div>
                      <div className="text-[10px] text-slate-400">Net Equity</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono tabular-nums">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">
                        Market Value
                      </span>
                      <span className="text-white font-semibold">
                        {formatMoney(eq.value)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">
                        Secured Debt
                      </span>
                      <span className="text-rose-400 font-semibold">
                        {formatMoney(eq.debt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">
                        Unrealized P&L
                      </span>
                      <span
                        className={`font-semibold ${
                          totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatMoney(totalGain, true)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Valuation Adjuster */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400">
                      Update Market Valuation:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          saveAssets(
                            assets.map((a) =>
                              a.id === asset.id
                                ? {
                                    ...a,
                                    current_price: Number(
                                      (a.current_price * 1.02).toFixed(2)
                                    ),
                                  }
                                : a
                            )
                          );
                          sdk.ui.hapticFeedback('light');
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-emerald-400"
                      >
                        +2% Mark
                      </button>
                      <button
                        onClick={() => {
                          saveAssets(
                            assets.map((a) =>
                              a.id === asset.id
                                ? {
                                    ...a,
                                    current_price: Number(
                                      (a.current_price * 0.98).toFixed(2)
                                    ),
                                  }
                                : a
                            )
                          );
                          sdk.ui.hapticFeedback('light');
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-rose-400"
                      >
                        -2% Mark
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: RULE ENGINE (`rule-conditions.ts`) & OPEN BANKING SYNC
         ===================================================================== */}
      {activeTab === 'rules' && (
        <div className="p-4 space-y-4">
          {/* Open Banking & OFX/CSV Batch Importer */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white">
                  Open Banking & Statement Importer
                </h2>
                <p className="text-[10px] text-slate-400">
                  SimpleFIN (US) · Enable Banking (EU) · Pluggy (BR) · OFX/CSV
                </p>
              </div>
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'simplefin', label: 'SimpleFIN' },
                  { id: 'enable_banking', label: 'EnableEU' },
                  { id: 'pluggy', label: 'Pluggy BR' },
                  { id: 'csv', label: 'OFX / CSV' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setImportProvider(p.id)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition ${
                    importProvider === p.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRunOpenBankingImport}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Fetch & Run Through Securo Rule Engine</span>
            </button>
          </div>

          {/* Create New Auto-Categorization Rule */}
          <form
            onSubmit={handleAddRule}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">
                New AND/OR Auto-Categorization Rule
              </h3>
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                placeholder="Rule Name (e.g., Coffee Shops)"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Match keyword (e.g., starbucks)"
                  value={newRuleKeyword}
                  onChange={(e) => setNewRuleKeyword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Housing & Mortgage">Housing & Mortgage</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Dining & Coffee">Dining & Coffee</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
            >
              Save Condition Tree Rule
            </button>
          </form>

          {/* Active Rules List */}
          <div className="space-y-2">
            {wsRules.map((rule) => {
              const leaves = flattenConditions(rule.conditionTree);
              return (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{rule.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {rule.conditionTree.operator} ({leaves.length} conditions) →{' '}
                      <span className="text-indigo-400">{rule.setCategory}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-emerald-400 block">
                      {rule.appliedCount} matches
                    </span>
                    <button
                      onClick={() =>
                        saveRules(
                          rules.map((r) =>
                            r.id === rule.id ? { ...r, isActive: !r.isActive } : r
                          )
                        )
                      }
                      className="text-[10px] text-slate-400 underline"
                    >
                      {rule.isActive ? 'Enabled' : 'Paused'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: SPLIT GROUPS (`split_groups`) & B2B INVOICES (`invoices`)
         ===================================================================== */}
      {activeTab === 'splits' && (
        <div className="p-4 space-y-4">
          {/* Group Expense Splitting */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white">
                  Group Expense Splits (Splitwise Engine)
                </h2>
                <p className="text-[10px] text-slate-400">
                  Settle shared household or travel bills via Super App Wallet
                </p>
              </div>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="space-y-2.5">
              {wsSplits.map((sp) => (
                <div
                  key={sp.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{sp.title}</div>
                    <div className="text-[10px] text-slate-400">
                      {sp.groupName} · Total {formatMoney(sp.totalAmount)} · Paid by{' '}
                      {sp.paidBy}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-mono font-bold tabular-nums ${
                        sp.yourShare >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {sp.yourShare >= 0
                        ? `Owed ${formatMoney(sp.yourShare)}`
                        : `You owe ${formatMoney(Math.abs(sp.yourShare))}`}
                    </div>
                    {sp.settled ? (
                      <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Settled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSettleSplit(sp)}
                        className="mt-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold"
                      >
                        Settle in Wallet
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Invoices (`invoices`) */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white">
                  Client Invoices & Receivables
                </h2>
                <p className="text-[10px] text-slate-400">
                  Issue B2B invoices with Tax ID validation & one-tap ledger credit
                </p>
              </div>
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>

            <form onSubmit={handleCreateInvoice} className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Client Name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Tax ID / VAT"
                value={newClientTaxId}
                onChange={(e) => setNewClientTaxId(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Amount"
                  value={newInvoiceAmount}
                  onChange={(e) => setNewInvoiceAmount(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
                <button
                  type="submit"
                  className="px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
                >
                  Issue
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {wsInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      {inv.invoiceNumber} · {inv.clientName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Tax ID: {inv.clientTaxId} · Due {inv.dueDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-white tabular-nums">
                      {formatMoney(inv.amount)}
                    </div>
                    {inv.status === 'paid' ? (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        PAID
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkInvoicePaid(inv)}
                        className="mt-1 px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD TRANSACTION OR MORTGAGE PRINCIPAL/INTEREST SPLIT
         ===================================================================== */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleCreateTransaction}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">New Securo Ledger Entry</h3>
              <button
                type="button"
                onClick={() => setShowAddTxModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'expense', label: 'Expense' },
                  { id: 'income', label: 'Income' },
                  { id: 'mortgage_split', label: 'Mortgage Split' },
                ] as const
              ).map((mode) => (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => setTxType(mode.id)}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold ${
                    txType === mode.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-slate-400">
                Payment Account
              </label>
              <select
                value={txAccountId || wsAccounts[0]?.id || ''}
                onChange={(e) => setTxAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {wsAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatMoney(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Payee (e.g. Whole Foods, Rocket Mortgage)"
              value={txPayee}
              onChange={(e) => setTxPayee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />

            {txType === 'mortgage_split' ? (
              <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-indigo-500/30">
                <div className="text-[10px] font-semibold text-indigo-300">
                  Securo Mortgage Split (parseCents Engine)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Principal ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={txPrincipalStr}
                      onChange={(e) => setTxPrincipalStr(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Interest ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={txInterestStr}
                      onChange={(e) => setTxInterestStr(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Target Loan Account</label>
                  <select
                    value={txLoanAccountId}
                    onChange={(e) => setTxLoanAccountId(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    {accounts
                      .filter((a) => a.type === 'loan')
                      .map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.name} ({formatMoney(loan.balance)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount (0.00)"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Salary & Payroll">Salary & Payroll</option>
                  <option value="Housing & Mortgage">Housing & Mortgage</option>
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Client Revenue">Client Revenue</option>
                  <option value="Infrastructure">Infrastructure</option>
                </select>
              </div>
            )}

            <input
              type="text"
              placeholder="Memo / Notes"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
            >
              Commit to Securo Ledger
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE WORKSPACE ACCOUNT
         ===================================================================== */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleCreateAccount}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Securo Account</h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              placeholder="Account Name (e.g. Wise Multi-Currency)"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Institution (e.g. Wise, Chase, Local Bank)"
              value={newAccInstitution}
              onChange={(e) => setNewAccInstitution(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as SecuroAccountType)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit_card">Credit Card</option>
                <option value="investment">Investment</option>
                <option value="loan">Loan / Mortgage</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Opening Balance"
                value={newAccBalance}
                onChange={(e) => setNewAccBalance(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>

            {newAccType === 'loan' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Link Collateral Asset (secured_asset_id)
                </label>
                <select
                  value={newAccSecuredAssetId}
                  onChange={(e) => setNewAccSecuredAssetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="">Unsecured Loan</option>
                  {wsAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              Create Account
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD ASSET (`real_estate`, `vehicle`, `etf`, `crypto`)
         ===================================================================== */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleCreateAsset}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Portfolio / Property Asset</h3>
              <button
                type="button"
                onClick={() => setShowAddAssetModal(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              placeholder="Asset Name (e.g. Rental Condo, S&P 500 ETF)"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newAssetType}
                onChange={(e) => setNewAssetType(e.target.value as SecuroAssetType)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="real_estate">Real Estate</option>
                <option value="vehicle">Vehicle</option>
                <option value="etf">ETF</option>
                <option value="stock">Stock</option>
                <option value="crypto">Crypto</option>
                <option value="bond">Bond</option>
              </select>
              <input
                type="number"
                step="any"
                placeholder="Quantity (e.g. 1)"
                value={newAssetQty}
                onChange={(e) => setNewAssetQty(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Current Unit Value"
                value={newAssetPrice}
                onChange={(e) => setNewAssetPrice(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Cost Basis"
                value={newAssetCostBasis}
                onChange={(e) => setNewAssetCostBasis(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              Save Asset
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
