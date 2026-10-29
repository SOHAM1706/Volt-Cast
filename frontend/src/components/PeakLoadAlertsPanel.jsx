import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { AlertCircle, Flame, Moon, Compass, ShieldCheck, ThermometerSun, ChevronRight } from 'lucide-react';

export default function PeakLoadAlertsPanel({ peakInsights = {} }) {
  const summary = peakInsights.summary || {
    peak_to_average_ratio: 2.1,
    baseload_avg_kwh: 0.65,
    baseload_percentage: 38.5,
    peak_threshold_kwh: 2.8,
    temperature_correlation: 0.42,
    most_frequent_peak_windows: ['18:00 - 19:00', '19:00 - 20:00']
  };

  const topPeaks = peakInsights.top_peaks || [];
  const hourlyDistribution = peakInsights.hourly_distribution || [];
  const alerts = peakInsights.alerts || [];

  const alertIcons = {
    warning: Flame,
    info: Moon,
    caution: AlertCircle,
    tip: ThermometerSun,
  };

  const alertBorders = {
    warning: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
    info: 'border-blue-500/30 bg-blue-950/20 text-blue-300',
    caution: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
    tip: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Peak Load & Efficiency Insights</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Demand spikes, baseload health analysis, and automated energy efficiency alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Peak Windows:</span>
          <div className="flex items-center gap-1 font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {summary.most_frequent_peak_windows?.join(', ') || '18:00 - 21:00'}
          </div>
        </div>
      </div>

      {/* Grid: 3 Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-slate-950/80 p-3.5 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Peak-to-Average (PAR)</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {summary.peak_to_average_ratio}x
            </div>
            <span className="text-[11px] text-slate-400">Grid demand stress factor</span>
          </div>
          <div className={`p-2 rounded-lg border ${summary.peak_to_average_ratio > 2.0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            <Flame className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-lg bg-slate-950/80 p-3.5 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Night Baseload</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {summary.baseload_avg_kwh} <span className="text-xs font-normal text-slate-400">kWh</span>
            </div>
            <span className="text-[11px] text-slate-400">{summary.baseload_percentage}% of average load</span>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Moon className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-lg bg-slate-950/80 p-3.5 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Thermal Elasticity</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {summary.temperature_correlation > 0 ? `+${summary.temperature_correlation}` : summary.temperature_correlation}
            </div>
            <span className="text-[11px] text-slate-400">Temp correlation (HVAC)</span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ThermometerSun className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* 2-Column: Diurnal Load Profile & Top Peak Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* Diurnal 24h Profile Chart (6 cols) */}
        <div className="lg:col-span-6 rounded-lg bg-slate-950/70 p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">24-Hour Diurnal Load Profile</span>
            <span className="text-[10px] text-slate-500 font-mono">Hourly Average (kWh)</span>
          </div>

          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyDistribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="diurnalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  interval={3}
                  stroke="#334155"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  stroke="#334155"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded border border-slate-700 bg-slate-900 p-2 text-[11px] text-white">
                        <div className="font-mono text-amber-400">{d.label}</div>
                        <div>Avg: <strong className="font-mono">{d.avg_kwh} kWh</strong></div>
                        <div className="text-slate-400">Peak recorded: {d.max_kwh} kWh</div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avg_kwh"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#diurnalGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Peak Events Table (6 cols) */}
        <div className="lg:col-span-6 rounded-lg bg-slate-950/70 p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Highest Recorded Peak Surges</span>
            <span className="text-[10px] text-slate-500 font-mono">Max Demand</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="pb-1.5 font-medium">Timestamp</th>
                  <th className="pb-1.5 font-medium">Demand</th>
                  <th className="pb-1.5 font-medium">Temp</th>
                  <th className="pb-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {topPeaks.slice(0, 4).map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="py-1.5 text-slate-300">{p.timestamp}</td>
                    <td className="py-1.5 text-amber-400 font-semibold">{p.power_kwh} kWh</td>
                    <td className="py-1.5 text-slate-400">{p.temperature_c ?? '--'}°C</td>
                    <td className="py-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans">
                        Critical Peak
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Automated Efficiency Alerts */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Automated Efficiency Recommendations & Alerts
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert) => {
            const Icon = alertIcons[alert.type] || AlertCircle;
            const style = alertBorders[alert.type] || alertBorders.caution;

            return (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 flex flex-col justify-between ${style}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <h4 className="text-xs font-semibold text-white">{alert.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                {alert.action && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/40 text-[11px] flex items-start gap-1.5 text-emerald-400 font-medium">
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{alert.action}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
