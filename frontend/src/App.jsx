import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  TrendingUp,
  Cpu,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Flame,
  Gauge,
  BarChart2
} from 'lucide-react';

import Header from './components/Header';
import MetricCard from './components/MetricCard';
import ActualVsPredictedChart from './components/ActualVsPredictedChart';
import FeatureImportanceChart from './components/FeatureImportanceChart';
import CostCalculatorPanel from './components/CostCalculatorPanel';
import PeakLoadAlertsPanel from './components/PeakLoadAlertsPanel';
import ModelTrainingControl from './components/ModelTrainingControl';
import DataManagementModal from './components/DataManagementModal';

import {
  fetchHealth,
  fetchCurrentDataset,
  fetchLatestModel,
  trainModel,
  calculateCosts,
  generateSyntheticData,
  uploadCsvFile
} from './api/client';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const [datasetInfo, setDatasetInfo] = useState(null);
  const [modelResult, setModelResult] = useState(null);
  const [notification, setNotification] = useState(null);

  // Show auto-dismissing notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Initial Data Fetch
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const health = await fetchHealth();
        setConnected(true);

        const currentData = await fetchCurrentDataset();
        setDatasetInfo(currentData);

        const latestModel = await fetchLatestModel();
        setModelResult(latestModel);
      } catch (err) {
        console.error('Initialization error:', err);
        showNotification('Connecting to VoltCast backend...', 'info');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Train or Retrain Model
  const handleTrainModel = async (params) => {
    try {
      setIsTraining(true);
      const res = await trainModel(params);
      setModelResult(res);
      showNotification(`Model trained successfully! RMSE: ${res.metrics.rmse} kWh, MAE: ${res.metrics.mae} kWh`, 'success');
    } catch (err) {
      console.error('Training error:', err);
      showNotification(`Training failed: ${err.message}`, 'error');
    } finally {
      setIsTraining(false);
    }
  };

  // Recalculate Costs dynamically
  const handleRecalculateCosts = async (params) => {
    try {
      setIsCalculating(true);
      const updatedCost = await calculateCosts(params);
      setModelResult((prev) => ({
        ...prev,
        cost_analysis: updatedCost
      }));
      showNotification('Cost estimates updated with new tariff structure', 'success');
    } catch (err) {
      console.error('Cost calc error:', err);
      showNotification(`Cost update failed: ${err.message}`, 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  // Generate Synthetic Data
  const handleGenerateData = async (params) => {
    try {
      setIsTraining(true);
      await generateSyntheticData(params);
      const updatedInfo = await fetchCurrentDataset();
      setDatasetInfo(updatedInfo);

      // Auto-retrain baseline model on new data
      const res = await trainModel({
        model_type: 'xgboost',
        test_split: 0.20,
        n_estimators: 100,
        max_depth: 5,
        learning_rate: 0.08,
        forecast_horizon_hours: 48
      });
      setModelResult(res);
      setIsDataModalOpen(false);
      showNotification(`Generated ${params.days} days of synthetic smart-meter data and retrained model!`, 'success');
    } catch (err) {
      console.error('Generation error:', err);
      showNotification(`Data generation failed: ${err.message}`, 'error');
    } finally {
      setIsTraining(false);
    }
  };

  // Upload Custom CSV
  const handleUploadCsv = async (file) => {
    try {
      setIsTraining(true);
      await uploadCsvFile(file);
      const updatedInfo = await fetchCurrentDataset();
      setDatasetInfo(updatedInfo);

      // Auto-retrain baseline model on uploaded data
      const res = await trainModel({
        model_type: 'xgboost',
        test_split: 0.20,
        n_estimators: 100,
        max_depth: 5,
        learning_rate: 0.08,
        forecast_horizon_hours: 48
      });
      setModelResult(res);
      setIsDataModalOpen(false);
      showNotification(`Uploaded ${file.name} successfully and retrained model!`, 'success');
    } catch (err) {
      console.error('Upload error:', err);
      showNotification(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsTraining(false);
    }
  };

  const metrics = modelResult?.metrics || {};
  const datasetStats = modelResult?.dataset_stats || {};
  const costAnalysis = modelResult?.cost_analysis || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        datasetInfo={datasetInfo}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onQuickRetrain={() =>
          handleTrainModel({
            model_type: modelResult?.model_info?.requested_model_type || 'xgboost',
            test_split: 0.20,
            n_estimators: 120,
            max_depth: 5,
            learning_rate: 0.08,
            forecast_horizon_hours: 48
          })
        }
        isTraining={isTraining}
        connected={connected}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium shadow-xl backdrop-blur-md ${
              notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
                : notification.type === 'info'
                ? 'bg-blue-950/90 border-blue-500/30 text-blue-200'
                : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Metric Summary Bar (5 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* RMSE */}
          <MetricCard
            title="RMSE"
            value={metrics.rmse !== undefined ? metrics.rmse.toFixed(3) : '--'}
            unit="kWh"
            subtitle="Root Mean Squared Error"
            badge="Precision"
            badgeColor="emerald"
            icon={Gauge}
            iconColor="text-emerald-400"
          />

          {/* MAE */}
          <MetricCard
            title="MAE"
            value={metrics.mae !== undefined ? metrics.mae.toFixed(3) : '--'}
            unit="kWh"
            subtitle="Mean Absolute Error"
            badge="Deviation"
            badgeColor="blue"
            icon={Activity}
            iconColor="text-cyan-400"
          />

          {/* R² Score */}
          <MetricCard
            title="R² Score"
            value={metrics.r2_score !== undefined ? (metrics.r2_score * 100).toFixed(1) : '--'}
            unit="%"
            subtitle="Variance Explained"
            badge={metrics.r2_score > 0.4 ? 'Good Fit' : 'Base Fit'}
            badgeColor="purple"
            icon={BarChart2}
            iconColor="text-purple-400"
          />

          {/* Mean Demand */}
          <MetricCard
            title="Avg Demand"
            value={datasetStats.mean_power_kwh !== undefined ? datasetStats.mean_power_kwh.toFixed(2) : '--'}
            unit="kWh"
            subtitle={`Peak: ${datasetStats.max_power_kwh ?? '--'} kWh`}
            badge="Meter Load"
            badgeColor="amber"
            icon={Zap}
            iconColor="text-amber-400"
          />

          {/* Projected Monthly Cost */}
          <MetricCard
            title="Monthly Bill"
            value={
              costAnalysis.projections?.monthly?.cost_usd !== undefined
                ? `$${costAnalysis.projections.monthly.cost_usd.toFixed(0)}`
                : '--'
            }
            subtitle={`${costAnalysis.projections?.monthly?.energy_kwh?.toFixed(0) || '--'} kWh / 30 days`}
            badge={costAnalysis.tariff_settings?.mode === 'tou' ? 'TOU Tariff' : 'Flat Tariff'}
            badgeColor="emerald"
            icon={DollarSign}
            iconColor="text-emerald-400"
          />
        </div>

        {/* Section 1: Actual vs Predicted Curves + Feature Importance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ActualVsPredictedChart
              testResults={modelResult?.test_results || []}
              futureForecast={modelResult?.future_forecast || []}
            />
          </div>

          <div className="lg:col-span-4">
            <FeatureImportanceChart
              featureImportances={modelResult?.feature_importances || []}
            />
          </div>
        </div>

        {/* Section 2: Dynamic Cost Estimation Calculator */}
        <CostCalculatorPanel
          costAnalysis={modelResult?.cost_analysis}
          onRecalculateCosts={handleRecalculateCosts}
          isCalculating={isCalculating}
        />

        {/* Section 3: Peak Load & Efficiency Insights + Model Tuning Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <PeakLoadAlertsPanel
              peakInsights={modelResult?.peak_insights}
            />
          </div>

          <div className="lg:col-span-5">
            <ModelTrainingControl
              onTrainModel={handleTrainModel}
              isTraining={isTraining}
              modelInfo={modelResult?.model_info}
              metrics={metrics}
            />
          </div>
        </div>
      </main>

      {/* Data Management Modal */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onGenerateData={handleGenerateData}
        onUploadCsv={handleUploadCsv}
        isProcessing={isTraining}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-400">VoltCast</span>
            <span>— Smart Energy Consumption & Cost Forecaster</span>
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            FastAPI • Scikit-Learn • XGBoost • React • Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
}
