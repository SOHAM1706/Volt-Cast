import React from 'react';
import { Zap, Database, Download, Sliders, Activity, RefreshCw, FolderArchive } from 'lucide-react';
import { getSampleDownloadUrl, getProjectZipDownloadUrl } from '../api/client';

export default function Header({
  datasetInfo,
  onOpenDataModal,
  onQuickRetrain,
  isTraining,
  connected
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                Volt<span className="text-emerald-400">Cast</span>
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI Forecaster
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Time-Series Smart Energy Consumption & Cost Prediction Engine
            </p>
          </div>
        </div>

        {/* Dataset Pill & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Active dataset badge */}
          {datasetInfo && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium text-slate-200 truncate max-w-[200px]" title={datasetInfo.dataset_name}>
                {datasetInfo.dataset_name || 'Active Dataset'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{datasetInfo.total_records?.toLocaleString()} hrs</span>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-xs">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 text-[11px] font-mono">
              {connected ? 'ML Service Live' : 'Connecting...'}
            </span>
          </div>

          {/* Download Full Project ZIP */}
          <a
            href={getProjectZipDownloadUrl()}
            download="smart-energy-forecaster.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 transition"
            title="Download complete project codebase (.zip)"
          >
            <FolderArchive className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold">Project ZIP</span>
          </a>

          {/* Download Sample CSV */}
          <a
            href={getSampleDownloadUrl()}
            download="voltcast_synthetic_sample.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Download reference synthetic CSV format"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sample CSV</span>
          </a>

          {/* Manage Data Trigger */}
          <button
            onClick={onOpenDataModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950 transition cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Data / Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
}
