import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { Sparkles, HelpCircle } from 'lucide-react';

export default function FeatureImportanceChart({ featureImportances = [] }) {
  const data = featureImportances.slice(0, 8); // Top 8 features

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-lg text-xs backdrop-blur-md max-w-xs">
        <div className="font-mono text-emerald-400 font-semibold mb-1">
          {item.feature}
        </div>
        <div className="text-slate-200 mb-1.5 font-medium">
          Relative Weight: <span className="text-white font-mono">{item.importance}%</span>
        </div>
        <div className="text-slate-400 text-[11px] leading-relaxed">
          {item.description}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Top Engineered Feature Drivers</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Relative Importance %</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Predictive weights assigned to temporal lags, moving averages, and weather variables.
        </p>

        <div className="h-[210px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 25, left: 35, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 'dataMax + 5']}
                  unit="%"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  stroke="#334155"
                />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#334155"
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#10b981' : index === 1 ? '#14b8a6' : index < 4 ? '#0ea5e9' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Train model to extract feature importances
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
        <HelpCircle className="h-3 w-3 text-slate-500 flex-shrink-0" />
        <span>Lag features (t-1h, t-24h) capture daily habit autocorrelation.</span>
      </div>
    </div>
  );
}
