import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { TrendingUp, Clock, Calendar, AlertTriangle, Eye, Flame } from 'lucide-react';

export default function ActualVsPredictedChart({ testResults = [], futureForecast = [] }) {
  const [viewMode, setViewMode] = useState('test_fit'); // 'test_fit' | 'future' | 'residuals'
  const [rangeFilter, setRangeFilter] = useState('7d'); // '48h' | '7d' | 'all'
  const [showTemperature, setShowTemperature] = useState(false);

  // Filter test data based on range
  const filteredTestData = useMemo(() => {
    if (!testResults || testResults.length === 0) return [];
    if (rangeFilter === '48h') {
      return testResults.slice(-48);
    } else if (rangeFilter === '7d') {
      return testResults.slice(-168);
    }
    return testResults;
  }, [testResults, rangeFilter]);

  // Format short timestamp for axis
  const formatXAxis = (ts) => {
    if (!ts) return '';
    const parts = ts.split(' ');
    if (parts.length === 2) {
      const dateParts = parts[0].split('-');
      const md = `${dateParts[1]}/${dateParts[2]}`;
      const time = parts[1];
      return `${md} ${time}`;
    }
    return ts;
  };

  // Custom rich tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const isPeak = data.is_peak;

    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3.5 shadow-xl text-xs backdrop-blur-md min-w-[210px]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <span className="font-mono text-slate-300 font-medium">{data.timestamp}</span>
          {isPeak && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="h-3 w-3" /> Peak Hour
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {data.actual !== undefined && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                Actual Demand:
              </span>
              <span className="font-mono font-semibold text-emerald-400">
                {data.actual.toFixed(2)} kWh
              </span>
            </div>
          )}

          {data.predicted !== undefined && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
                {viewMode === 'future' ? 'Forecasted Load:' : 'Model Prediction:'}
              </span>
              <span className="font-mono font-semibold text-cyan-400">
                {data.predicted.toFixed(2)} kWh
              </span>
            </div>
          )}

          {data.residual !== undefined && viewMode !== 'future' && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Prediction Error:</span>
              <span className={`font-mono font-medium ${Math.abs(data.error_pct) > 15 ? 'text-amber-400' : 'text-slate-300'}`}>
                {data.residual > 0 ? `+${data.residual.toFixed(2)}` : data.residual.toFixed(2)} kWh ({data.error_pct > 0 ? `+${data.error_pct}%` : `${data.error_pct}%`})
              </span>
            </div>
          )}

          {data.temperature_c !== undefined && (
            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span>Ambient Temp:</span>
              <span className="font-mono text-slate-200">{data.temperature_c}°C</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              {viewMode === 'test_fit' && 'Actual vs. Predicted Power Demand'}
              {viewMode === 'future' && 'Multi-Step Out-of-Sample Forward Forecast'}
              {viewMode === 'residuals' && 'Prediction Residuals & Deviation Curve'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'test_fit' && 'Chronological test split evaluation comparing real power meter load to ML prediction'}
            {viewMode === 'future' && `Recursive ${futureForecast.length}-hour horizon forward projection with diurnal temperature guidance`}
            {viewMode === 'residuals' && 'Hour-by-hour forecast residual variance (Predicted - Actual kWh)'}
          </p>
        </div>

        {/* View Switches & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('test_fit')}
              className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === 'test_fit'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Test Fit
            </button>
            <button
              onClick={() => setViewMode('future')}
              className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === 'future'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Future Forecast (+{futureForecast.length}h)
            </button>
            <button
              onClick={() => setViewMode('residuals')}
              className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === 'residuals'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Residuals
            </button>
          </div>

          {/* Time Filter for Test Fit */}
          {viewMode !== 'future' && (
            <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setRangeFilter('48h')}
                className={`px-2.5 py-1 rounded-md transition font-mono ${
                  rangeFilter === '48h' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                48h
              </button>
              <button
                onClick={() => setRangeFilter('7d')}
                className={`px-2.5 py-1 rounded-md transition font-mono ${
                  rangeFilter === '7d' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                7d
              </button>
              <button
                onClick={() => setRangeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition font-mono ${
                  rangeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>
          )}

          {/* Show Temp Toggle */}
          <button
            onClick={() => setShowTemperature(!showTemperature)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer ${
              showTemperature
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle temperature overlay line"
          >
            <Eye className="h-3 w-3" />
            <span className="hidden md:inline">Temp (°C)</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full pt-2">
        {viewMode === 'test_fit' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredTestData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#334155"
                minTickGap={45}
              />
              <YAxis
                yAxisId="power"
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#334155"
                unit=" kWh"
                domain={['auto', 'auto']}
              />
              {showTemperature && (
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fill: '#f97316', fontSize: 11 }}
                  stroke="#7c2d12"
                  unit="°C"
                  domain={['auto', 'auto']}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />

              <Area
                yAxisId="power"
                type="monotone"
                dataKey="actual"
                name="Actual Load"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#actualGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="predicted"
                name="Predicted Model"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 5, fill: '#38bdf8' }}
              />
              {showTemperature && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature_c"
                  name="Temperature (°C)"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'future' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={futureForecast} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
              <defs>
                <linearGradient id="futureGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#334155"
                minTickGap={45}
              />
              <YAxis
                yAxisId="power"
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#334155"
                unit=" kWh"
                domain={['auto', 'auto']}
              />
              {showTemperature && (
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fill: '#f97316', fontSize: 11 }}
                  stroke="#7c2d12"
                  unit="°C"
                  domain={['auto', 'auto']}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />

              <Area
                yAxisId="power"
                type="monotone"
                dataKey="predicted"
                name="Projected Future Load"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fill="url(#futureGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#38bdf8' }}
              />
              {showTemperature && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature_c"
                  name="Forecasted Temp (°C)"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'residuals' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredTestData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#334155"
                minTickGap={45}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#334155"
                unit=" kWh"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
              <Line
                type="monotone"
                dataKey="residual"
                name="Residual (Pred - Actual)"
                stroke="#f59e0b"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Insight bar */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <strong className="text-slate-300">Green:</strong> Actual Smart Meter Readings
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <strong className="text-slate-300">Cyan:</strong> Machine Learning Forecast
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Showing {filteredTestData.length} data points
        </div>
      </div>
    </div>
  );
}
