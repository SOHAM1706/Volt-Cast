/**
 * VoltCast API Client
 * Connects to the FastAPI backend using VITE_API_URL or falls back to localhost.
 */

const getApiBase = () => {
  // If Vite environment variable is set (e.g. Render backend URL in production), use it
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  
  // Local development fallback
  if (typeof window !== 'undefined' && window.location) {
    const port = window.location.port;
    if (port === '5173' || port === '5174' || port === '3000') {
      return 'http://127.0.0.1:8000/api';
    }
  }
  
  return '/api';
};

const API_BASE = getApiBase();

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchCurrentDataset() {
  const res = await fetch(`${API_BASE}/data/current`);
  if (!res.ok) throw new Error('Failed to fetch dataset info');
  return res.json();
}

export async function fetchLatestModel() {
  const res = await fetch(`${API_BASE}/model/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest model');
  return res.json();
}

export async function trainModel(params) {
  const res = await fetch(`${API_BASE}/model/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Training failed');
  }
  return res.json();
}

export async function calculateCosts(params) {
  const res = await fetch(`${API_BASE}/cost/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Cost calculation failed');
  }
  return res.json();
}

export async function generateSyntheticData(params) {
  const res = await fetch(`${API_BASE}/data/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Data generation failed');
  }
  return res.json();
}

export async function uploadCsvFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/data/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'CSV upload failed');
  }
  return res.json();
}

export async function fetchInsights() {
  const res = await fetch(`${API_BASE}/insights`);
  if (!res.ok) throw new Error('Failed to fetch peak insights');
  return res.json();
}

export function getSampleDownloadUrl() {
  return `${API_BASE}/data/download-sample`;
}

export function getProjectZipDownloadUrl() {
  return `${API_BASE}/download-project-zip`;
}