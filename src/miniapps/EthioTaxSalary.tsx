import React, { useState, useEffect, useMemo } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  Calculator,
  FileText,
  Bookmark,
  Scale,
  ArrowLeftRight,
  Plus,
  Trash2,
  Copy,
  Building2,
  Briefcase,
  CheckCircle2,
  Info,
} from 'lucide-react';

export interface EFDRETaxBracket {
  id: number;
  label: string;
  min: number;
  max: number | null;
  ratePercent: number;
  deduction: number;
}

/**
 * Ethiopian Federal Income Tax Proclamation No. 979/2016 (Schedule 'A')
 * Monthly Employment Income Tax Brackets (in ETB)
 */
export const EFDRE_TAX_BRACKETS: EFDRETaxBracket[] = [
  { id: 1, label: '0 – 600 ETB', min: 0, max: 600, ratePercent: 0, deduction: 0 },
  { id: 2, label: '601 – 1,650 ETB', min: 600.01, max: 1650, ratePercent: 10, deduction: 60 },
  { id: 3, label: '1,651 – 3,200 ETB', min: 1650.01, max: 3200, ratePercent: 15, deduction: 142.5 },
  { id: 4, label: '3,201 – 5,250 ETB', min: 3200.01, max: 5250, ratePercent: 20, deduction: 302.5 },
  { id: 5, label: '5,251 – 7,800 ETB', min: 5250.01, max: 7800, ratePercent: 25, deduction: 565 },
  { id: 6, label: '7,801 – 10,900 ETB', min: 7800.01, max: 10900, ratePercent: 30, deduction: 955 },
  { id: 7, label: 'Over 10,900 ETB', min: 10900.01, max: null, ratePercent: 35, deduction: 1500 },
];

export interface SavedPayslipRecord {
  id: string;
  title: string;
  basicSalary: number;
  taxableAllowance: number;
  nonTaxableAllowance: number;
  incomeTax: number;
  employeePension: number;
  employerPension: number;
  costSharing: number;
  netPay: number;
  bracketLabel: string;
  date: string;
}

export function getEFDREBracket(taxableIncome: number): EFDRETaxBracket {
  if (taxableIncome <= 600) return EFDRE_TAX_BRACKETS[0];
  if (taxableIncome <= 1650) return EFDRE_TAX_BRACKETS[1];
  if (taxableIncome <= 3200) return EFDRE_TAX_BRACKETS[2];
  if (taxableIncome <= 5250) return EFDRE_TAX_BRACKETS[3];
  if (taxableIncome <= 7800) return EFDRE_TAX_BRACKETS[4];
  if (taxableIncome <= 10900) return EFDRE_TAX_BRACKETS[5];
  return EFDRE_TAX_BRACKETS[6];
}

export function calculateEFDREIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 600) return 0;
  const bracket = getEFDREBracket(taxableIncome);
  const tax = taxableIncome * (bracket.ratePercent / 100) - bracket.deduction;
  return Math.max(0, Number(tax.toFixed(2)));
}

/**
 * Solves for required Basic Gross Salary given a desired Net Pay (when allowances = 0)
 * using binary search across EFDRE tax brackets and pension deductions.
 */
function solveGrossFromTargetNet(
  targetNet: number,
  empPensionRate: number,
  costSharingRate: number
): number {
  if (targetNet <= 0) return 0;
  let low = 0;
  let high = Math.max(targetNet * 2.2, 50000);
  for (let i = 0; i < 45; i++) {
    const mid = (low + high) / 2;
    const tax = calculateEFDREIncomeTax(mid);
    const pension = mid * (empPensionRate / 100);
    const costShare = mid * (costSharingRate / 100);
    const net = mid - tax - pension - costShare;
    if (net < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Number(((low + high) / 2).toFixed(2));
}

export const EthioTaxApp: React.FC<{ sdk: MiniAppBridgeSDK }> = ({ sdk }) => {
  const { tokens } = sdk.theme;
  const settings = sdk.settings.getSettings();

  const defaultPensionScheme = (settings.pensionScheme as 'standard' | 'military' | 'exempt') || 'standard';
  const defaultCostSharingEnabled = Boolean(settings.enableCostSharingDefault);
  const usdExchangeRate = Number(settings.etbPerUsdRate || 122);

  const [activeTab, setActiveTab] = useState<'calculator' | 'brackets' | 'saved'>('calculator');
  const [calcMode, setCalcMode] = useState<'gross_to_net' | 'net_to_gross'>('gross_to_net');

  // Calculator Inputs (ETB)
  const [basicSalaryInput, setBasicSalaryInput] = useState<string>('25000');
  const [targetNetInput, setTargetNetInput] = useState<string>('18000');
  const [transportAllowanceInput, setTransportAllowanceInput] = useState<string>('2200');
  const [transportExemptCap, setTransportExemptCap] = useState<number>(2200);
  const [housingAllowanceInput, setHousingAllowanceInput] = useState<string>('0');
  const [overtimeAndBonusInput, setOvertimeAndBonusInput] = useState<string>('0');
  const [nonTaxableAllowanceInput, setNonTaxableAllowanceInput] = useState<string>('0');
  const [otherDeductionsInput, setOtherDeductionsInput] = useState<string>('0');

  const [pensionType, setPensionType] = useState<'standard' | 'military' | 'exempt'>(defaultPensionScheme);
  const [costSharingEnabled, setCostSharingEnabled] = useState<boolean>(defaultCostSharingEnabled);
  const [costSharingPercent, setCostSharingPercent] = useState<number>(10);
  const [recordLabel, setRecordLabel] = useState<string>('');

  const [savedPayslips, setSavedPayslips] = useState<SavedPayslipRecord[]>(() => {
    const saved = sdk.storage.getItem('ethiotax_saved_payslips_v1');
    return Array.isArray(saved) ? saved : [];
  });

  useEffect(() => {
    sdk.storage.setItem('ethiotax_saved_payslips_v1', savedPayslips);
  }, [savedPayslips, sdk.storage]);

  const pensionRates = useMemo(() => {
    if (pensionType === 'standard') return { employee: 7, employer: 11 };
    if (pensionType === 'military') return { employee: 7, employer: 33 };
    return { employee: 0, employer: 0 };
  }, [pensionType]);

  const result = useMemo(() => {
    const activeCostShareRate = costSharingEnabled ? costSharingPercent : 0;

    const rawBasic =
      calcMode === 'gross_to_net'
        ? Math.max(0, parseFloat(basicSalaryInput) || 0)
        : solveGrossFromTargetNet(
            Math.max(0, parseFloat(targetNetInput) || 0),
            pensionRates.employee,
            activeCostShareRate
          );

    const transportTotal = Math.max(0, parseFloat(transportAllowanceInput) || 0);
    // Under EFDRE directive, transport allowance up to statutory cap (e.g. 2,200 ETB or 25% of basic) is exempt
    const maxAllowedExemptTransport = Math.min(transportExemptCap, rawBasic * 0.25);
    const exemptTransport =
      calcMode === 'gross_to_net' ? Math.min(transportTotal, maxAllowedExemptTransport) : 0;
    const taxableTransport =
      calcMode === 'gross_to_net' ? Math.max(0, transportTotal - exemptTransport) : 0;

    const housingTaxable =
      calcMode === 'gross_to_net' ? Math.max(0, parseFloat(housingAllowanceInput) || 0) : 0;
    const overtimeTaxable =
      calcMode === 'gross_to_net' ? Math.max(0, parseFloat(overtimeAndBonusInput) || 0) : 0;
    const extraNonTaxable =
      calcMode === 'gross_to_net' ? Math.max(0, parseFloat(nonTaxableAllowanceInput) || 0) : 0;
    const otherDeductions =
      calcMode === 'gross_to_net' ? Math.max(0, parseFloat(otherDeductionsInput) || 0) : 0;

    const totalTaxableAllowances = taxableTransport + housingTaxable + overtimeTaxable;
    const totalNonTaxableAllowances = exemptTransport + extraNonTaxable;

    const grossTaxableIncome = rawBasic + totalTaxableAllowances;
    const totalGrossEarnings = grossTaxableIncome + totalNonTaxableAllowances;

    const bracket = getEFDREBracket(grossTaxableIncome);
    const incomeTax = calculateEFDREIncomeTax(grossTaxableIncome);

    // Pension is calculated on Basic Salary under Ethiopian Pension Proclamation
    const employeePension = Number((rawBasic * (pensionRates.employee / 100)).toFixed(2));
    const employerPension = Number((rawBasic * (pensionRates.employer / 100)).toFixed(2));

    // Graduate Cost-Sharing is calculated on Basic Salary (typically 10%)
    const costSharing = Number((rawBasic * (activeCostShareRate / 100)).toFixed(2));

    const totalDeductions = Number(
      (incomeTax + employeePension + costSharing + otherDeductions).toFixed(2)
    );
    const netPay = Number((totalGrossEarnings - totalDeductions).toFixed(2));
    const totalEmployerCost = Number((totalGrossEarnings + employerPension).toFixed(2));
    const effectiveTaxRate =
      totalGrossEarnings > 0 ? Number(((incomeTax / totalGrossEarnings) * 100).toFixed(1)) : 0;

    return {
      basicSalary: rawBasic,
      totalTaxableAllowances,
      totalNonTaxableAllowances,
      grossTaxableIncome,
      totalGrossEarnings,
      bracket,
      incomeTax,
      employeePension,
      employerPension,
      costSharing,
      otherDeductions,
      totalDeductions,
      netPay,
      totalEmployerCost,
      effectiveTaxRate,
    };
  }, [
    calcMode,
    basicSalaryInput,
    targetNetInput,
    transportAllowanceInput,
    transportExemptCap,
    housingAllowanceInput,
    overtimeAndBonusInput,
    nonTaxableAllowanceInput,
    otherDeductionsInput,
    pensionRates,
    costSharingEnabled,
    costSharingPercent,
  ]);

  const formatETB = (val: number) =>
    `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

  const handleSavePayslip = () => {
    const newRecord: SavedPayslipRecord = {
      id: `ps-${Date.now()}`,
      title: recordLabel.trim() || `Salary Calculation (${formatETB(result.basicSalary)})`,
      basicSalary: result.basicSalary,
      taxableAllowance: result.totalTaxableAllowances,
      nonTaxableAllowance: result.totalNonTaxableAllowances,
      incomeTax: result.incomeTax,
      employeePension: result.employeePension,
      employerPension: result.employerPension,
      costSharing: result.costSharing,
      netPay: result.netPay,
      bracketLabel: `${result.bracket.ratePercent}% (${result.bracket.label})`,
      date: new Date().toLocaleDateString(),
    };
    setSavedPayslips((prev) => [newRecord, ...prev]);
    setRecordLabel('');
    sdk.ui.hapticFeedback('success');
    sdk.ui.showToast('Payslip saved to EthioTax history', 'success');
  };

  const handleCopyPayslip = () => {
    const summaryText = [
      `=== EFDRE Salary & Tax Breakdown ===`,
      `Basic Salary: ${formatETB(result.basicSalary)}`,
      `Taxable Allowances: ${formatETB(result.totalTaxableAllowances)}`,
      `Non-Taxable Allowances: ${formatETB(result.totalNonTaxableAllowances)}`,
      `Gross Taxable Income: ${formatETB(result.grossTaxableIncome)}`,
      `EFDRE Tax Bracket: ${result.bracket.ratePercent}% (Deduction: ${result.bracket.deduction} ETB)`,
      `Employment Income Tax: -${formatETB(result.incomeTax)}`,
      `Employee Pension (${pensionRates.employee}%): -${formatETB(result.employeePension)}`,
      result.costSharing > 0 ? `Cost-Sharing: -${formatETB(result.costSharing)}` : null,
      `Net Take-Home Pay: ${formatETB(result.netPay)}`,
      `Employer Pension (${pensionRates.employer}%): ${formatETB(result.employerPension)}`,
      `Total Employer Cost: ${formatETB(result.totalEmployerCost)}`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(summaryText);
    sdk.ui.hapticFeedback('light');
    sdk.ui.showToast('Payslip breakdown copied to clipboard', 'info');
  };

  return (
    <div className="p-4 space-y-4 pb-24" style={{ color: tokens.textPrimary }}>
      {/* Hero Net Take-Home Pay Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, #059669, #0f766e)`,
          boxShadow: `0 10px 28px rgba(16, 185, 129, 0.25)`,
          color: '#ffffff',
        }}
        className="rounded-3xl p-5 space-y-3 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
            EFDRE Proc. No. 979/2016
          </span>
          <span className="text-[11px] font-mono bg-black/25 px-2.5 py-0.5 rounded-full">
            Bracket: {result.bracket.ratePercent}%
          </span>
        </div>

        <div>
          <div className="text-[11px] uppercase font-semibold opacity-85">
            {calcMode === 'gross_to_net' ? 'Monthly Net Take-Home Pay' : 'Required Monthly Basic Gross'}
          </div>
          <div className="text-2xl font-black tracking-tight mt-0.5">
            {calcMode === 'gross_to_net'
              ? formatETB(result.netPay)
              : formatETB(result.basicSalary)}
          </div>
          <div className="text-[11px] opacity-85 mt-0.5 font-mono">
            ≈ ${(result.netPay / usdExchangeRate).toFixed(2)} USD (@ {usdExchangeRate} ETB/USD)
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="text-[9px] uppercase opacity-75">Income Tax</div>
            <div className="text-xs font-extrabold text-rose-200 truncate">
              {result.incomeTax.toLocaleString()} ETB
            </div>
          </div>
          <div className="p-2 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="text-[9px] uppercase opacity-75">
              Pension ({pensionRates.employee}%)
            </div>
            <div className="text-xs font-extrabold text-amber-200 truncate">
              {result.employeePension.toLocaleString()} ETB
            </div>
          </div>
          <div className="p-2 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="text-[9px] uppercase opacity-75">Employer (11%)</div>
            <div className="text-xs font-extrabold text-emerald-200 truncate">
              {result.employerPension.toLocaleString()} ETB
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        className="grid grid-cols-3 gap-1 p-1 rounded-2xl border"
        style={{
          backgroundColor: tokens.bgSurface,
          borderColor: tokens.borderDefault,
        }}
      >
        {[
          { id: 'calculator', label: 'Calculator', icon: Calculator },
          { id: 'brackets', label: 'Tax Table', icon: Scale },
          { id: 'saved', label: `Saved (${savedPayslips.length})`, icon: Bookmark },
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
              className="py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EFDRE SALARY CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="space-y-4">
          {/* Mode Toggle: Gross -> Net vs Reverse Net -> Gross */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-3.5 rounded-2xl border space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
                <span>Calculation Direction</span>
              </span>
              <div className="flex gap-1">
                {[
                  { id: 'gross_to_net', label: 'Gross → Net' },
                  { id: 'net_to_gross', label: 'Net → Gross' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setCalcMode(m.id as any);
                      sdk.ui.hapticFeedback('light');
                    }}
                    style={{
                      backgroundColor:
                        calcMode === m.id ? tokens.accentPrimary : tokens.bgSurface,
                      color:
                        calcMode === m.id ? tokens.accentContrast : tokens.textSecondary,
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {calcMode === 'gross_to_net' ? (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold block" style={{ color: tokens.textSecondary }}>
                  Monthly Basic Gross Salary (ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={basicSalaryInput}
                  onChange={(e) => setBasicSalaryInput(e.target.value)}
                  placeholder="e.g. 25000"
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none"
                />
                {/* Quick Salary Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[5000, 10000, 15000, 25000, 45000, 75000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBasicSalaryInput(String(preset));
                        sdk.ui.hapticFeedback('light');
                      }}
                      style={{
                        backgroundColor:
                          Number(basicSalaryInput) === preset
                            ? tokens.accentMuted
                            : tokens.bgSurface,
                        borderColor:
                          Number(basicSalaryInput) === preset
                            ? tokens.accentPrimary
                            : tokens.borderDefault,
                        color:
                          Number(basicSalaryInput) === preset
                            ? tokens.accentPrimary
                            : tokens.textSecondary,
                      }}
                      className="px-2.5 py-1 rounded-lg border text-[10px] font-mono font-semibold transition"
                    >
                      {preset.toLocaleString()} ETB
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold block" style={{ color: tokens.textSecondary }}>
                  Desired Monthly Net Take-Home Pay (ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={targetNetInput}
                  onChange={(e) => setTargetNetInput(e.target.value)}
                  placeholder="e.g. 18000"
                  style={{
                    backgroundColor: tokens.bgInput,
                    borderColor: tokens.borderDefault,
                    color: tokens.textPrimary,
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none"
                />
                <p className="text-[10px]" style={{ color: tokens.textMuted }}>
                  Automatically computes the exact Gross Basic Salary required after EFDRE Schedule A tax and pension deductions.
                </p>
              </div>
            )}
          </div>

          {/* Allowances & Pension Configuration */}
          {calcMode === 'gross_to_net' && (
            <div
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-4 rounded-2xl border space-y-3"
            >
              <span className="text-xs font-bold uppercase tracking-wider block">
                Allowances & Overtime (ETB)
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Transport Allowance
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={transportAllowanceInput}
                    onChange={(e) => setTransportAllowanceInput(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Tax-Exempt Transport Cap
                  </label>
                  <select
                    value={transportExemptCap}
                    onChange={(e) => setTransportExemptCap(Number(e.target.value))}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                  >
                    <option value={2200}>Up to 2,200 ETB (Standard)</option>
                    <option value={600}>Up to 600 ETB (Commute)</option>
                    <option value={0}>Fully Taxable (0 Exempt)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Taxable Housing / Position
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={housingAllowanceInput}
                    onChange={(e) => setHousingAllowanceInput(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Overtime / Bonus (Taxable)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overtimeAndBonusInput}
                    onChange={(e) => setOvertimeAndBonusInput(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Other Non-Taxable (Medical)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={nonTaxableAllowanceInput}
                    onChange={(e) => setNonTaxableAllowanceInput(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: tokens.textSecondary }}>
                    Other Deductions (Loan/Equb)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherDeductionsInput}
                    onChange={(e) => setOtherDeductionsInput(e.target.value)}
                    style={{
                      backgroundColor: tokens.bgInput,
                      borderColor: tokens.borderDefault,
                      color: tokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pension Scheme & Graduate Cost-Sharing Options */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-4 rounded-2xl border space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider block">
              Pension & Statutory Deductions
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'standard', label: 'Private/Civil (7% / 11%)' },
                { id: 'military', label: 'Defense (7% / 33%)' },
                { id: 'exempt', label: 'No Pension (0%)' },
              ].map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => {
                    setPensionType(scheme.id as any);
                    sdk.ui.hapticFeedback('light');
                  }}
                  style={{
                    backgroundColor:
                      pensionType === scheme.id ? tokens.accentPrimary : tokens.bgSurface,
                    color:
                      pensionType === scheme.id ? tokens.accentContrast : tokens.textSecondary,
                    borderColor:
                      pensionType === scheme.id ? 'transparent' : tokens.borderDefault,
                  }}
                  className="py-2 px-2 rounded-xl border text-[10px] font-bold transition text-center"
                >
                  {scheme.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs font-semibold">
                  Higher Education Cost-Sharing ({costSharingPercent}%)
                </div>
                <div className="text-[10px]" style={{ color: tokens.textSecondary }}>
                  Graduate cost-sharing deduction applied on basic salary
                </div>
              </div>
              <input
                type="checkbox"
                checked={costSharingEnabled}
                onChange={(e) => setCostSharingEnabled(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
            </div>

            {costSharingEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={costSharingPercent}
                  onChange={(e) => setCostSharingPercent(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-xs font-mono font-bold w-10 text-right">
                  {costSharingPercent}%
                </span>
              </div>
            )}
          </div>

          {/* Detailed Payslip Statement */}
          <div
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.borderDefault,
            }}
            className="p-4 rounded-2xl border space-y-3"
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: tokens.borderDefault }}>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Official EFDRE Payslip Breakdown
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPayslip}
                style={{
                  backgroundColor: tokens.bgSurface,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span style={{ color: tokens.textSecondary }}>Basic Gross Salary</span>
                <span className="font-mono font-semibold">{formatETB(result.basicSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: tokens.textSecondary }}>Taxable Allowances</span>
                <span className="font-mono">{formatETB(result.totalTaxableAllowances)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: tokens.textSecondary }}>Non-Taxable Allowances (Exempt)</span>
                <span className="font-mono text-emerald-400">
                  +{formatETB(result.totalNonTaxableAllowances)}
                </span>
              </div>
              <div
                className="flex justify-between pt-1.5 border-t font-semibold"
                style={{ borderColor: tokens.borderDefault }}
              >
                <span>Gross Taxable Income</span>
                <span className="font-mono">{formatETB(result.grossTaxableIncome)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>
                  EFDRE Income Tax ({result.bracket.ratePercent}% - {result.bracket.deduction} ETB)
                </span>
                <span className="font-mono font-bold">-{formatETB(result.incomeTax)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Employee Pension ({pensionRates.employee}%)</span>
                <span className="font-mono font-bold">-{formatETB(result.employeePension)}</span>
              </div>
              {result.costSharing > 0 && (
                <div className="flex justify-between text-orange-400">
                  <span>Graduate Cost-Sharing ({costSharingPercent}%)</span>
                  <span className="font-mono font-bold">-{formatETB(result.costSharing)}</span>
                </div>
              )}
              {result.otherDeductions > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>Other Deductions</span>
                  <span className="font-mono">-{formatETB(result.otherDeductions)}</span>
                </div>
              )}
              <div
                className="flex justify-between pt-2 border-t text-sm font-black"
                style={{ borderColor: tokens.borderDefault }}
              >
                <span>Net Take-Home Salary</span>
                <span className="font-mono text-emerald-400">{formatETB(result.netPay)}</span>
              </div>
            </div>

            {/* Employer Total Cost Box */}
            <div
              style={{
                backgroundColor: tokens.bgSurface,
                borderColor: tokens.borderDefault,
              }}
              className="p-3 rounded-xl border space-y-1 text-[11px]"
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
                  <span>Total Employer Cost (Gross + {pensionRates.employer}% Pension)</span>
                </span>
                <span className="font-mono">{formatETB(result.totalEmployerCost)}</span>
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: tokens.textMuted }}>
                <span>Employer Pension Contribution ({pensionRates.employer}%):</span>
                <span className="font-mono">{formatETB(result.employerPension)}</span>
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: tokens.textMuted }}>
                <span>Effective Income Tax Burden:</span>
                <span className="font-mono">{result.effectiveTaxRate}% of total gross</span>
              </div>
            </div>

            {/* Save Payslip Row */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={recordLabel}
                onChange={(e) => setRecordLabel(e.target.value)}
                placeholder="Label (e.g. Senior Engineer Offer)"
                style={{
                  backgroundColor: tokens.bgInput,
                  borderColor: tokens.borderDefault,
                  color: tokens.textPrimary,
                }}
                className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSavePayslip}
                style={{
                  backgroundColor: tokens.accentPrimary,
                  color: tokens.accentContrast,
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ios-active shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EFDRE SCHEDULE 'A' TAX BRACKETS TABLE */}
      {activeTab === 'brackets' && (
        <div
          style={{
            backgroundColor: tokens.bgCard,
            borderColor: tokens.borderDefault,
          }}
          className="p-4 rounded-2xl border space-y-3"
        >
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4" style={{ color: tokens.accentPrimary }} />
              <span>EFDRE Schedule 'A' Employment Tax Table</span>
            </h3>
            <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
              Federal Income Tax Proclamation No. 979/2016. Your active bracket is highlighted below.
            </p>
          </div>

          <div className="rounded-2xl border overflow-hidden divide-y text-xs" style={{ borderColor: tokens.borderDefault }}>
            <div
              style={{ backgroundColor: tokens.bgSurface, color: tokens.textMuted }}
              className="grid grid-cols-12 p-2.5 font-bold text-[10px] uppercase"
            >
              <span className="col-span-6">Monthly Taxable Income</span>
              <span className="col-span-3 text-right">Tax Rate</span>
              <span className="col-span-3 text-right">Deduction</span>
            </div>

            {EFDRE_TAX_BRACKETS.map((b) => {
              const isCurrent = result.bracket.id === b.id;
              return (
                <div
                  key={b.id}
                  style={{
                    backgroundColor: isCurrent ? tokens.accentMuted : 'transparent',
                    borderColor: tokens.borderDefault,
                  }}
                  className="grid grid-cols-12 p-2.5 items-center font-mono text-[11px]"
                >
                  <span className="col-span-6 font-sans font-semibold flex items-center gap-1.5">
                    {isCurrent && (
                      <CheckCircle2
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: tokens.accentPrimary }}
                      />
                    )}
                    <span>{b.label}</span>
                  </span>
                  <span className="col-span-3 text-right font-bold">{b.ratePercent}%</span>
                  <span className="col-span-3 text-right">{b.deduction.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              backgroundColor: tokens.bgSurface,
              borderColor: tokens.borderDefault,
            }}
            className="p-3 rounded-xl border flex items-start gap-2 text-[11px]"
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tokens.accentPrimary }} />
            <div style={{ color: tokens.textSecondary }}>
              <strong>Formula:</strong>{' '}
              <code>Tax = (Gross Taxable Income × Tax Rate) - Bracket Deduction</code>. Pension contributions (7% employee, 11% employer) are calculated on Basic Salary.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SAVED PAYSLIPS HISTORY */}
      {activeTab === 'saved' && (
        <div className="space-y-2.5">
          {savedPayslips.length === 0 ? (
            <div
              style={{
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderDefault,
              }}
              className="p-6 rounded-2xl border text-center space-y-2"
            >
              <Briefcase className="w-6 h-6 mx-auto opacity-50" />
              <p className="text-xs font-bold">No Saved Payslips Yet</p>
              <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
                Calculate a salary in the Calculator tab and tap Save to compare job offers or monthly payroll records.
              </p>
            </div>
          ) : (
            savedPayslips.map((rec) => (
              <div
                key={rec.id}
                style={{
                  backgroundColor: tokens.bgCard,
                  borderColor: tokens.borderDefault,
                }}
                className="p-3.5 rounded-2xl border space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold">{rec.title}</h4>
                    <span className="text-[10px] font-mono" style={{ color: tokens.textMuted }}>
                      {rec.date} • Bracket: {rec.bracketLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedPayslips((prev) => prev.filter((p) => p.id !== rec.id));
                      sdk.ui.hapticFeedback('light');
                    }}
                    className="p-1 text-rose-400 hover:opacity-80"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: tokens.bgSurface }}
                  >
                    <div className="text-[9px] font-sans" style={{ color: tokens.textMuted }}>
                      Basic Gross
                    </div>
                    <div className="font-bold">{rec.basicSalary.toLocaleString()}</div>
                  </div>
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: tokens.bgSurface }}
                  >
                    <div className="text-[9px] font-sans" style={{ color: tokens.textMuted }}>
                      Income Tax
                    </div>
                    <div className="font-bold text-rose-400">-{rec.incomeTax.toLocaleString()}</div>
                  </div>
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: tokens.bgSurface }}
                  >
                    <div className="text-[9px] font-sans" style={{ color: tokens.textMuted }}>
                      Net Pay
                    </div>
                    <div className="font-bold text-emerald-400">{rec.netPay.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
