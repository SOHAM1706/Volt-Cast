import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, Sliders, Info, AlertTriangle } from 'lucide-react';

export default function ModelTrainingControl({
  onTrainModel,
  isTraining,
  modelInfo = {},
  metrics = {}
}) {
  const [modelType, setModelType] = useState(modelInfo?.requested_model_type || 'xgboost');
  const [testSplit, setTestSplit] = useState(0.20);
  const [nEstimators, setNEstimators] = useState(modelInfo?.n_estimators || 120);
  const [maxDepth, setMaxDepth] = useState(modelInfo?.max_depth || 5);
  const [learningRate, setLearningRate] = useState(modelInfo?.learning_rate || 0.08);
  const [horizonHours, setHorizonHours] = useState(48);

  const handleSubmit = (e) => {
    e.preventDefault();
    onTrainModel({
      model_type: modelType,
      test_split: parseFloat(testSplit),
      n_estimators: parseInt(nEstimators),
      max_depth: parseInt(maxDepth),
      learning_rate: parseFloat(learningRate),
      forecast_horizon_hours: parseInt(horizonHours)
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">ML Training & Tuning Studio</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="font-mono text-emerald-400 font-semibold uppercase text-[11px]">
            {modelInfo?.model_type || 'Active Model'}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Train time-series regression models on chronological meter sequences to forecast future demand and compute RMSE/MAE metrics.
      </p>

      {modelInfo?.notes && (
        <div className="mb-4 p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{modelInfo.notes}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Architecture Selection */}
        <div>
          <label className="text-xs text-slate-300 font-medium block mb-1.5">
            Model Architecture
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModelType('xgboost')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                modelType === 'xgboost'
                  ? 'bg-emerald-950/30 border-emerald-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-semibold">XGBoost / Gradient Boosting</div>
              <div className="text-[10px] text-slate-400 mt-0.5">High gradient efficiency & speed</div>
            </button>

            <button
              type="button"
              onClick={() => setModelType('random_forest')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                modelType === 'random_forest'
                  ? 'bg-emerald-950/30 border-emerald-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-semibold">Random Forest</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Robust bagging tree ensemble</div>
            </button>
          </div>
        </div>

        {/* Hyperparameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Test Split */}
          <div>
            <label className="text-slate-400 block mb-1">Test Split</label>
            <select
              value={testSplit}
              onChange={(e) => setTestSplit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="0.15">15% Holdout</option>
              <option value="0.20">20% Holdout</option>
              <option value="0.25">25% Holdout</option>
              <option value="0.30">30% Holdout</option>
            </select>
          </div>

          {/* Estimators */}
          <div>
            <label className="text-slate-400 block mb-1">Estimators (Trees)</label>
            <select
              value={nEstimators}
              onChange={(e) => setNEstimators(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="60">60 Trees</option>
              <option value="100">100 Trees</option>
              <option value="150">150 Trees</option>
              <option value="200">200 Trees</option>
            </select>
          </div>

          {/* Max Depth */}
          <div>
            <label className="text-slate-400 block mb-1">Max Tree Depth</label>
            <select
              value={maxDepth}
              onChange={(e) => setMaxDepth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="4">Depth: 4</option>
              <option value="5">Depth: 5</option>
              <option value="6">Depth: 6</option>
              <option value="8">Depth: 8</option>
            </select>
          </div>

          {/* Forecast Horizon */}
          <div>
            <label className="text-slate-400 block mb-1">Future Horizon</label>
            <select
              value={horizonHours}
              onChange={(e) => setHorizonHours(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="24">Next 24 Hours</option>
              <option value="48">Next 48 Hours</option>
              <option value="72">Next 72 Hours</option>
              <option value="168">Next 7 Days</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isTraining}
          className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
        >
          {isTraining ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Training Model & Generating Predictions...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Train Model & Re-evaluate Metrics</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
