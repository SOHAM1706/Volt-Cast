import React, { useState } from 'react';
import { DollarSign, Zap, ArrowRight, Percent, Calendar, ShieldAlert, Sparkles, Leaf } from 'lucide-react';

export default function CostCalculatorPanel({
  costAnalysis,
  onRecalculateCosts,
  isCalculating
}) {
  const settings = costAnalysis?.tariff_settings || {
    mode: 'tou',
    flat_rate: 0.165,
    peak_rate: 0.32,
    shoulder_rate: 0.18,
    off_peak_rate: 0.10,
    peak_window: '17:00 - 21:00',
    off_peak_window: '23:00 - 07:00'
  };

  const projections = costAnalysis?.projections || {
    daily: { cost_usd: 0, energy_kwh: 0 },
    weekly: { cost_usd: 0, energy_kwh: 0 },
    monthly: { cost_usd: 0, energy_kwh: 0, carbon_kg: 0 },
    annual_projected_usd: 0
  };

  const tou = costAnalysis?.tou_breakdown || {
    peak: { cost_usd: 0, kwh: 0, pct_of_total: 0 },
    shoulder: { cost_usd: 0, kwh: 0, pct_of_total: 0 },
    off_peak: { cost_usd: 0, kwh: 0, pct_of_total: 0 }
  };

  const simulation = costAnalysis?.load_shifting_simulation || {
    assumed_shift_pct: 20,
    shifted_kwh_monthly: 0,
    estimated_monthly_savings_usd: 0,
    estimated_annual_savings_usd: 0
  };

  // Local form state for live editing
  const [tariffMode, setTariffMode] = useState(settings.mode || 'tou');
  const [flatRate, setFlatRate] = useState(settings.flat_rate ?? 0.165);
  const [peakRate, setPeakRate] = useState(settings.peak_rate ?? 0.32);
  const [shoulderRate, setShoulderRate] = useState(settings.shoulder_rate ?? 0.18);
  const [offPeakRate, setOffPeakRate] = useState(settings.off_peak_rate ?? 0.10);

  const handleApplyRates = (e) => {
    e?.preventDefault();
    onRecalculateCosts({
      tariff_mode: tariffMode,
      flat_rate: parseFloat(flatRate) || 0.165,
      peak_rate: parseFloat(peakRate) || 0.32,
      shoulder_rate: parseFloat(shoulderRate) || 0.18,
      off_peak_rate: parseFloat(offPeakRate) || 0.10,
      peak_start_hour: 17,
      peak_end_hour: 21,
      off_peak_start_hour: 23,
      off_peak_end_hour: 7
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Dynamic Electricity Cost Calculator</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure utility tariff structures to project expenses and simulate off-peak savings.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs self-start sm:self-auto">
          <button
            onClick={() => {
              setTariffMode('tou');
              onRecalculateCosts({
                tariff_mode: 'tou',
                flat_rate: parseFloat(flatRate),
                peak_rate: parseFloat(peakRate),
                shoulder_rate: parseFloat(shoulderRate),
                off_peak_rate: parseFloat(offPeakRate),
                peak_start_hour: 17,
                peak_end_hour: 21,
                off_peak_start_hour: 23,
                off_peak_end_hour: 7
              });
            }}
            className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
              tariffMode === 'tou' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Time-of-Use (TOU)
          </button>
          <button
            onClick={() => {
              setTariffMode('flat');
              onRecalculateCosts({
                tariff_mode: 'flat',
                flat_rate: parseFloat(flatRate),
                peak_rate: parseFloat(peakRate),
                shoulder_rate: parseFloat(shoulderRate),
                off_peak_rate: parseFloat(offPeakRate),
                peak_start_hour: 17,
                peak_end_hour: 21,
                off_peak_start_hour: 23,
                off_peak_end_hour: 7
              });
            }}
            className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
              tariffMode === 'flat' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flat Rate
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs vs Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tariff Rate Inputs (5 cols) */}
        <form onSubmit={handleApplyRates} className="lg:col-span-5 rounded-lg bg-slate-950/70 p-4 border border-slate-800/80 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
              {tariffMode === 'tou' ? 'TOU Rate Schedule ($/kWh)' : 'Flat Rate Setting ($/kWh)'}
            </div>

            {tariffMode === 'flat' ? (
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Standard Energy Rate ($/kWh)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">$</span>
                  <input
                    type="number"
                    step="0.005"
                    min="0.01"
                    max="1.50"
                    value={flatRate}
                    onChange={(e) => setFlatRate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Average US residential rate is ~$0.165/kWh</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Peak Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-amber-400 font-medium">On-Peak (17:00 - 21:00)</span>
                    <span className="text-slate-500 text-[11px]">Weekdays</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1.50"
                      value={peakRate}
                      onChange={(e) => setPeakRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Shoulder Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-cyan-400 font-medium">Shoulder / Mid-Peak</span>
                    <span className="text-slate-500 text-[11px]">Daytime & Weekends</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1.50"
                      value={shoulderRate}
                      onChange={(e) => setShoulderRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Off-Peak Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-medium">Off-Peak (23:00 - 07:00)</span>
                    <span className="text-slate-500 text-[11px]">Overnight hours</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1.50"
                      value={offPeakRate}
                      onChange={(e) => setOffPeakRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isCalculating}
            className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
          >
            {isCalculating ? 'Updating Calculations...' : 'Recalculate Projections'}
          </button>
        </form>

        {/* Projected Cost Summaries (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
          {/* 3 Period Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Daily */}
            <div className="rounded-lg bg-slate-950/80 p-3.5 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Daily Projected</span>
              <div className="mt-1 text-xl font-bold font-mono text-white">
                ${projections.daily?.cost_usd?.toFixed(2)}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                {projections.daily?.energy_kwh?.toFixed(1)} kWh/day
              </span>
            </div>

            {/* Weekly */}
            <div className="rounded-lg bg-slate-950/80 p-3.5 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Weekly Projected</span>
              <div className="mt-1 text-xl font-bold font-mono text-white">
                ${projections.weekly?.cost_usd?.toFixed(2)}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                {projections.weekly?.energy_kwh?.toFixed(1)} kWh/wk
              </span>
            </div>

            {/* Monthly */}
            <div className="rounded-lg bg-emerald-950/20 p-3.5 border border-emerald-500/30">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium">Monthly Bill (30d)</span>
              <div className="mt-1 text-xl font-bold font-mono text-emerald-300">
                ${projections.monthly?.cost_usd?.toFixed(2)}
              </div>
              <span className="text-xs text-emerald-400/80 font-mono mt-0.5 block">
                {projections.monthly?.energy_kwh?.toFixed(0)} kWh/mo
              </span>
            </div>
          </div>

          {/* TOU Tier Breakdown Bar */}
          {tariffMode === 'tou' && (
            <div className="rounded-lg bg-slate-950/60 p-3.5 border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-slate-300">Expenditure by Tariff Window</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Annual est: ${(projections.annual_projected_usd || 0).toLocaleString()}
                </span>
              </div>

              {/* Progress stack */}
              <div className="h-3 w-full bg-slate-800 rounded-full flex overflow-hidden mb-2">
                <div
                  style={{ width: `${tou.peak?.pct_of_total || 0}%` }}
                  className="bg-amber-500"
                  title={`Peak: ${tou.peak?.pct_of_total}%`}
                />
                <div
                  style={{ width: `${tou.shoulder?.pct_of_total || 0}%` }}
                  className="bg-cyan-500"
                  title={`Shoulder: ${tou.shoulder?.pct_of_total}%`}
                />
                <div
                  style={{ width: `${tou.off_peak?.pct_of_total || 0}%` }}
                  className="bg-emerald-500"
                  title={`Off-Peak: ${tou.off_peak?.pct_of_total}%`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-slate-400">Peak:</span>
                  <span className="font-mono text-slate-200 font-medium">${tou.peak?.cost_usd?.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span className="text-slate-400">Shoulder:</span>
                  <span className="font-mono text-slate-200 font-medium">${tou.shoulder?.cost_usd?.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-400">Off-Peak:</span>
                  <span className="font-mono text-slate-200 font-medium">${tou.off_peak?.cost_usd?.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Load Shifting Optimization Banner */}
          <div className="rounded-lg bg-gradient-to-r from-emerald-950/40 to-teal-950/30 p-3.5 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Peak-to-Off-Peak Load Shifting Potential
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Shifting <strong className="text-emerald-400">{simulation.assumed_shift_pct}%</strong> of peak draw saves{' '}
                  <strong className="text-emerald-300 font-mono">${simulation.estimated_monthly_savings_usd?.toFixed(2)}/mo</strong>{' '}
                  (${(simulation.estimated_annual_savings_usd || 0).toFixed(0)}/yr).
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400/90 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 whitespace-nowrap">
              <Leaf className="h-3.5 w-3.5" />
              <span>{projections.monthly?.carbon_kg?.toFixed(0)} kg CO₂/mo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
