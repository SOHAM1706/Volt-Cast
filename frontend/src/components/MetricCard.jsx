import React from 'react';

export default function MetricCard({
  title,
  value,
  unit = '',
  subtitle,
  badge,
  badgeColor = 'emerald',
  icon: Icon,
  iconColor = 'text-emerald-400',
  trend,
  trendType = 'neutral'
}) {
  const badgeColorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }[badgeColor] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm hover:border-slate-700 transition">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-medium tracking-wide uppercase text-[11px] text-slate-400">{title}</span>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColorClasses}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-white font-mono">
          {value !== undefined && value !== null ? value : '--'}
        </div>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
        <span className="text-slate-400 text-[11px] truncate">{subtitle}</span>
        {Icon && (
          <div className="p-1 rounded-md bg-slate-800/60">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}
