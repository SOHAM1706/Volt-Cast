# VoltCast | Smart Energy Consumption & Cost Forecaster

VoltCast is a production-grade full-stack web application designed for time-series energy consumption forecasting and dynamic electricity cost estimation. It combines a Python machine learning backend (FastAPI, Scikit-Learn, XGBoost, Pandas) with a modern, high-density React analytics dashboard (Tailwind CSS, Recharts, Lucide Icons).

---

## ⚡ Key Highlights & Core Features

### 1. Synthetic Smart-Meter Generator & CSV Ingestion
- **Robust Synthetic Generator:** Simulates realistic residential/commercial smart-meter sequences (hourly `power_kwh`, `temperature_c`, `humidity_pct`, timestamps) factoring in:
  - Human diurnal cycles (morning wake-up surge, daytime lull, evening peak, overnight baseload).
  - Weekend behavioral shifts (delayed morning ramp-up, higher daytime occupancy).
  - Thermal HVAC demand (cooling degree hours above 22°C, heating degree hours below 18°C).
  - Stochastic appliance spikes (EV charging sessions, dishwashers, laundry cycles).
  - Multi-scenario climate modes (*Seasonal Transition*, *Summer Warm*, *Winter Cold*, *Spring Mild*).
- **Custom CSV Upload:** Ingests external meter files with automated column detection for timestamps, power consumption, and weather variables, plus linear interpolation for missing timestamps.
- **Reference Sample Downloader:** Direct one-click access to download a pre-formatted 60-day (1,440-row) sample CSV file (`voltcast_synthetic_sample.csv`).

### 2. Time-Series Feature Engineering
- **Cyclical Temporal Indicators:** Sine and cosine encodings for hour of the day ($\sin(2\pi \cdot \text{hour}/24)$, $\cos(2\pi \cdot \text{hour}/24)$) and day of the week ($\sin(2\pi \cdot \text{dow}/7)$, $\cos(2\pi \cdot \text{dow}/7)$) to preserve continuous cyclical properties without artificial midnight discontinuities.
- **Autoregressive Lag Features:** $t-1\text{h}$ (immediate preceding hour), $t-2\text{h}$, $t-3\text{h}$, $t-24\text{h}$ (yesterday's same hour), and $t-168\text{h}$ (last week's same hour).
- **Rolling Window Statistics:** 3-hour, 6-hour, and 24-hour moving averages, standard deviation volatility, and 24-hour peak/floor envelopes (computed with $t-1$ shift to prevent future data leakage).
- **Environmental Interactions:** Cooling Degree Hours ($\max(0, T - 22^\circ\text{C})$), Heating Degree Hours ($\max(0, 18^\circ\text{C} - T)$), and 3-hour temperature trend.

### 3. Machine Learning Training & Evaluation Pipeline
- **Ensemble Architectures:** Supports **XGBoost Regressor**, **Random Forest Regressor**, and **Gradient Boosting Regressor** with on-the-fly training and hyperparameter configuration (trees, depth, learning rate, test holdout fraction).
- **Strict Chronological Split:** Zero future-data leakage by splitting chronologically (e.g. initial 80% train, subsequent 20% test).
- **Evaluation Metrics:**
  - **RMSE** (Root Mean Squared Error): $\sqrt{\frac{1}{N}\sum (y_i - \hat{y}_i)^2}$
  - **MAE** (Mean Absolute Error): $\frac{1}{N}\sum |y_i - \hat{y}_i|$
  - **MAPE** (Mean Absolute Percentage Error): $\frac{1}{N}\sum \left|\frac{y_i - \hat{y}_i}{\max(y_i, 0.1)}\right| \times 100\%$
  - **$R^2$ Score** (Coefficient of Determination)
- **Feature Importance Extraction:** Normalized relative weights displaying which temporal or weather variables drive consumption forecasts.
- **Recursive Multi-Step Forward Forecasting:** Generates out-of-sample forward projections for $24\text{h}$, $48\text{h}$, or $72\text{h}$ horizons using recursive autoregression coupled with diurnal climate simulations.

### 4. Interactive Analytics Dashboard
- **Actual vs. Predicted Visualizer:** High-resolution Recharts line chart with toggles between *Test Fit*, *Future Forecast*, and *Residual Errors*, range filters ($48\text{h}$, $7\text{d}$, All), and ambient temperature overlays.
- **Dynamic Electricity Tariff Calculator:**
  - Supports **Time-of-Use (TOU)** and **Flat Rate** tariffs.
  - Interactive inputs for On-Peak, Shoulder, and Off-Peak rates ($/kWh) and peak window configurations.
  - Live projections for **Daily**, **Weekly**, **Monthly (30-day bill)**, and **Annual** expenditures.
  - **Peak-to-Off-Peak Load Shifting Simulator:** Projects exact dollar savings and carbon emissions ($kg\text{ CO}_2$) eliminated if peak load is shifted to off-peak periods.
- **Peak Load & Insights Panel:**
  - Peak-to-Average Ratio (PAR) meter and overnight baseload drain gauge.
  - Top peak demand surge records table.
  - 24-Hour Diurnal Average Load profile.
  - Automated efficiency alerts (phantom drain warning, peak tariff exposure, thermal elasticity).

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.13, FastAPI, Uvicorn, Pandas, NumPy, Scikit-Learn, XGBoost, Pydantic, HTTPX |
| **Frontend** | React 18, Vite 6, Tailwind CSS, Recharts, Lucide Icons |
| **Data Formats** | CSV, JSON REST APIs, Multipart Form Data |

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+ (Python 3.13 tested and verified)
- Node.js 18+ and npm

### 1. Clone or Open Workspace
```bash
cd /Users/sohampatel/.gemini/antigravity/scratch/smart-energy-forecaster
```

### 2. Automatic One-Click Launch
Run the provided unified launcher script:
```bash
./start.sh
```
This automatically initializes the Python virtual environment, boots the FastAPI server on `http://localhost:8000`, and launches the Vite frontend dev server on `http://localhost:5173`.

---

### Manual Step-by-Step Launch

#### A. Backend Setup
```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Install backend dependencies (already installed)
pip install -r backend/requirements.txt

# 3. Launch FastAPI server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be running at `http://127.0.0.1:8000`.  
Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

#### B. Frontend Setup
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (already installed)
npm install

# 3. Start development server
npm run dev
```
Open your browser at `http://localhost:5173` (or `http://localhost:5174`).

---

## 🧪 Integration Testing

The backend includes a comprehensive automated test suite verifying all 7 core functional requirements:

```bash
source venv/bin/activate
python backend/test_api.py
```

### Test Coverage Summary:
- `test_health_check`: Verifies server status and baseline dataset readiness.
- `test_get_current_dataset`: Validates metadata and record structure.
- `test_generate_synthetic_data`: Tests multi-day synthetic time-series generation.
- `test_train_model_random_forest`: Validates ML pipeline, RMSE, MAE, and feature importances.
- `test_dynamic_cost_calculation`: Tests TOU/flat rate arithmetic and load-shift simulation.
- `test_peak_insights`: Tests peak demand detection and efficiency alert rules.
- `test_csv_upload`: Tests multipart CSV file upload and schema parsing.

---

## 📡 API Reference Overview

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health status and dataset record count |
| `/api/data/current` | `GET` | Active dataset summary statistics and preview |
| `/api/data/generate` | `POST` | Generates synthetic smart-meter dataset |
| `/api/data/upload` | `POST` | Uploads and parses custom CSV dataset |
| `/api/data/download-sample` | `GET` | Downloads sample 60-day synthetic CSV |
| `/api/model/train` | `POST` | Trains ML regression model and returns RMSE, MAE, predictions |
| `/api/model/latest` | `GET` | Returns cached model metrics and predictions |
| `/api/cost/calculate` | `POST` | Dynamic tariff calculator for daily/weekly/monthly projections |
| `/api/insights` | `GET` | Peak load metrics, diurnal curves, and efficiency alerts |

---

## 📂 Project Structure

```
smart-energy-forecaster/
├── backend/
│   ├── __init__.py                 # Python package marker
│   ├── main.py                     # FastAPI application & REST routing
│   ├── generator.py                # Synthetic smart-meter data engine
│   ├── feature_engineering.py      # Cyclical, lag, and rolling window extraction
│   ├── model.py                    # ML model training, evaluation & forecasting
│   ├── cost_calculator.py          # Utility tariffs, cost projections & peak insights
│   ├── test_api.py                 # Integration test suite
│   ├── requirements.txt            # Python dependencies manifest
│   └── sample_data/
│       └── synthetic_energy_sample.csv # 60-day baseline reference dataset
├── frontend/
│   ├── package.json                # Frontend dependencies
│   ├── vite.config.js              # Vite server & API proxy config
│   ├── tailwind.config.js          # Tailwind CSS design system theme
│   ├── postcss.config.js           # PostCSS plugins
│   ├── index.html                  # HTML entry point with fonts & favicon
│   └── src/
│       ├── main.jsx                # React root mount
│       ├── App.jsx                 # Main application dashboard layout & state
│       ├── index.css               # Global CSS & Tailwind layers
│       ├── api/
│       │   └── client.js           # Frontend API client
│       └── components/
│           ├── Header.jsx                  # Top navigation, dataset status, actions
│           ├── MetricCard.jsx              # Reusable KPI metric card
│           ├── ActualVsPredictedChart.jsx  # Recharts actual vs predicted curves
│           ├── FeatureImportanceChart.jsx  # ML interpretability horizontal bar chart
│           ├── CostCalculatorPanel.jsx     # Dynamic electricity tariff calculator
│           ├── PeakLoadAlertsPanel.jsx     # Demand peaks, 24h curve & alerts
│           ├── ModelTrainingControl.jsx    # Model selector & hyperparameter tuning
│           └── DataManagementModal.jsx     # Synthetic generator & CSV upload modal
├── start.sh                        # Unified one-command launch script
├── .gitignore                      # Git ignore patterns
└── README.md                       # Documentation
```
