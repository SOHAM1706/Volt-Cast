import React, { useState } from 'react';
import { X, UploadCloud, Cpu, Download, Database, Check, AlertCircle, FileText } from 'lucide-react';
import { getSampleDownloadUrl } from '../api/client';

export default function DataManagementModal({
  isOpen,
  onClose,
  onGenerateData,
  onUploadCsv,
  isProcessing
}) {
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'upload' | 'sample'

  // Synthetic Generator State
  const [days, setDays] = useState(60);
  const [scenario, setScenario] = useState('seasonal');
  const [baselineKwh, setBaselineKwh] = useState(0.9);
  const [noiseLevel, setNoiseLevel] = useState(0.12);

  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  if (!isOpen) return null;

  const handleGenerateSubmit = (e) => {
    e.preventDefault();
    onGenerateData({
      days: parseInt(days),
      weather_scenario: scenario,
      baseline_kwh: parseFloat(baselineKwh),
      noise_level: parseFloat(noiseLevel)
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setUploadError('Only .csv files are supported.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError('');
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a CSV file to upload.');
      return;
    }
    onUploadCsv(selectedFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Data Management & Ingestion</h3>
              <p className="text-xs text-slate-400">Generate synthetic smart-meter sequences or upload custom CSV datasets.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('generate')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'generate'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Synthetic Data Generator
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload Custom CSV
          </button>
          <button
            onClick={() => setActiveTab('sample')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'sample'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sample Dataset Info
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: Synthetic Generator */}
          {activeTab === 'generate' && (
            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300">
                The generator simulates hourly energy consumption with realistic human diurnal cycles, morning/evening peaks, weekend shifts, stochastic appliance spikes, and thermal HVAC loads.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Simulation Horizon
                  </label>
                  <select
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="30">30 Days (720 hourly records)</option>
                    <option value="60">60 Days (1,440 hourly records) - Recommended</option>
                    <option value="90">90 Days (2,160 hourly records)</option>
                    <option value="180">180 Days (4,320 hourly records)</option>
                  </select>
                </div>

                {/* Weather Scenario */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Climate / Weather Scenario
                  </label>
                  <select
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="seasonal">Seasonal Transition (Multi-wave front)</option>
                    <option value="summer_warm">Summer Warm (Heavy AC cooling draw)</option>
                    <option value="winter_cold">Winter Cold (Electric heating spikes)</option>
                    <option value="spring_mild">Spring Mild (Low HVAC demand)</option>
                  </select>
                </div>

                {/* Base load */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Baseload Scale Multiplier: <span className="text-emerald-400 font-mono">{baselineKwh}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.1"
                    value={baselineKwh}
                    onChange={(e) => setBaselineKwh(e.target.value)}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Small Apartment (0.5x)</span>
                    <span>Large Home (2.5x)</span>
                  </div>
                </div>

                {/* Noise */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Sensor Volatility / Noise: <span className="text-emerald-400 font-mono">{(noiseLevel * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.30"
                    step="0.02"
                    value={noiseLevel}
                    onChange={(e) => setNoiseLevel(e.target.value)}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Smooth (5%)</span>
                    <span>High Variance (30%)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Generating Data...' : 'Generate & Activate'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Upload Custom CSV */}
          {activeTab === 'upload' && (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-8 text-center transition bg-slate-950/40">
                <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <div className="text-xs font-medium text-white mb-1">
                  Upload your meter CSV file
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mb-4">
                  File must contain a timestamp column and an energy/power column (e.g. <code className="text-emerald-400">power_kwh</code>, <code className="text-emerald-400">kwh</code>, or <code className="text-emerald-400">consumption</code>).
                </p>

                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="inline-block px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer border border-slate-700 transition"
                >
                  Browse Computer
                </label>

                {selectedFile && (
                  <div className="mt-3 text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isProcessing}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Validating & Uploading...' : 'Upload & Process Dataset'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Sample Info & Download */}
          {activeTab === 'sample' && (
            <div className="space-y-4 text-xs text-slate-300">
              <p>
                VoltCast accepts standard comma-separated smart-meter time series with the following recommended schema:
              </p>

              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 font-mono text-[11px] overflow-x-auto text-slate-300">
                <div className="text-emerald-400">timestamp,power_kwh,temperature_c,humidity_pct</div>
                <div>2026-08-01 00:00:00,0.482,23.5,68.2</div>
                <div>2026-08-01 01:00:00,0.421,22.8,70.5</div>
                <div>2026-08-01 02:00:00,0.395,22.1,72.1</div>
                <div>2026-08-01 03:00:00,0.410,21.6,74.0</div>
                <div>2026-08-01 04:00:00,0.445,21.2,75.4</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-800 space-y-2">
                <div className="font-semibold text-white">Automated Schema Ingestion Rules:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Column names are case-insensitive and whitespace-stripped.</li>
                  <li>Timestamp formats like <code className="text-slate-300">YYYY-MM-DD HH:MM:SS</code> or ISO 8601 are automatically parsed.</li>
                  <li>Missing entries are filled via linear interpolation to prevent sequence breakage.</li>
                  <li>If temperature or humidity columns are omitted, estimated diurnal weather is synthesized.</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <a
                  href={getSampleDownloadUrl()}
                  download="voltcast_synthetic_sample.csv"
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Sample CSV (1,440 Rows)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
