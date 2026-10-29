"""
FastAPI Application Backend for Smart Energy Consumption & Cost Forecaster
"""

import io
import os
import sys

# Ensure local backend package modules can be imported directly
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import pandas as pd

from generator import generate_synthetic_smart_meter_data, save_sample_dataset
from model import EnergyForecaster
from cost_calculator import calculate_energy_costs, generate_peak_load_and_efficiency_insights
from feature_engineering import prepare_raw_dataframe


app = FastAPI(
    title="VoltCast - Smart Energy Forecaster API",
    description="Time-series machine learning backend for energy consumption forecasting and dynamic cost modeling",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory application state
STATE = {
    "df": None,  # Active dataset pd.DataFrame
    "dataset_source": "synthetic",
    "dataset_name": "Synthetic 60-Day Smart Meter (Seasonal)",
    "latest_model_result": None,
    "last_tariff_settings": {
        "tariff_mode": "tou",
        "flat_rate": 0.165,
        "peak_rate": 0.32,
        "shoulder_rate": 0.18,
        "off_peak_rate": 0.10,
        "peak_start_hour": 17,
        "peak_end_hour": 21,
        "off_peak_start_hour": 23,
        "off_peak_end_hour": 7
    }
}


# ----------------- Request Models -----------------
class GenerateDataRequest(BaseModel):
    days: int = Field(default=60, ge=7, le=365, description="Number of days to simulate")
    start_date: str = Field(default="2026-08-01 00:00:00", description="Start timestamp")
    weather_scenario: str = Field(default="seasonal", description="summer_warm, winter_cold, spring_mild, or seasonal")
    baseline_kwh: float = Field(default=0.9, ge=0.1, le=10.0, description="Base load multiplier")
    noise_level: float = Field(default=0.12, ge=0.01, le=1.0, description="Noise magnitude")


class TrainModelRequest(BaseModel):
    model_type: str = Field(default="xgboost", description="'xgboost' or 'random_forest'")
    test_split: float = Field(default=0.20, ge=0.10, le=0.40, description="Test split fraction")
    n_estimators: int = Field(default=150, ge=20, le=500, description="Number of estimators / trees")
    max_depth: int = Field(default=5, ge=2, le=12, description="Max tree depth")
    learning_rate: float = Field(default=0.08, ge=0.01, le=0.5, description="Learning rate for XGBoost")
    forecast_horizon_hours: int = Field(default=48, ge=12, le=168, description="Out-of-sample forecast horizon")


class CostCalculationRequest(BaseModel):
    tariff_mode: str = Field(default="tou", description="'tou' or 'flat'")
    flat_rate: float = Field(default=0.165, ge=0.01, le=2.0)
    peak_rate: float = Field(default=0.32, ge=0.01, le=2.0)
    shoulder_rate: float = Field(default=0.18, ge=0.01, le=2.0)
    off_peak_rate: float = Field(default=0.10, ge=0.01, le=2.0)
    peak_start_hour: int = Field(default=17, ge=0, le=23)
    peak_end_hour: int = Field(default=21, ge=0, le=23)
    off_peak_start_hour: int = Field(default=23, ge=0, le=23)
    off_peak_end_hour: int = Field(default=7, ge=0, le=23)


# ----------------- Startup Event -----------------
@app.on_event("startup")
def startup_event():
    """Initialize with high quality synthetic dataset on boot."""
    sample_path = save_sample_dataset()
    df = pd.read_csv(sample_path)
    STATE["df"] = df
    STATE["dataset_source"] = "synthetic"
    STATE["dataset_name"] = "Default 60-Day Smart Meter (Seasonal)"
    print(f"[VoltCast Backend] Initialized with {len(df)} records from {sample_path}")
    
    # Train baseline model so data is ready right away
    try:
        forecaster = EnergyForecaster(model_type="xgboost", n_estimators=100, max_depth=5)
        res = forecaster.train_and_evaluate(df, test_split_ratio=0.20, forecast_horizon_hours=48)
        
        # Calculate initial costs
        costs = calculate_energy_costs(
            res["test_results"],
            flat_rate=STATE["last_tariff_settings"]["flat_rate"],
            tariff_mode=STATE["last_tariff_settings"]["tariff_mode"],
            peak_rate=STATE["last_tariff_settings"]["peak_rate"],
            shoulder_rate=STATE["last_tariff_settings"]["shoulder_rate"],
            off_peak_rate=STATE["last_tariff_settings"]["off_peak_rate"]
        )
        insights = generate_peak_load_and_efficiency_insights(df)
        res["cost_analysis"] = costs
        res["peak_insights"] = insights
        STATE["latest_model_result"] = res
        print(f"[VoltCast Backend] Baseline model pre-trained (RMSE: {res['metrics']['rmse']})")
    except Exception as e:
        print(f"[VoltCast Backend] Startup training warning: {e}")


# ----------------- Endpoints -----------------
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VoltCast Energy Prediction Engine",
        "has_active_dataset": STATE["df"] is not None,
        "records_count": len(STATE["df"]) if STATE["df"] is not None else 0
    }


@app.get("/api/data/current")
def get_current_dataset_info():
    if STATE["df"] is None:
        raise HTTPException(status_code=404, detail="No active dataset loaded.")
    df = STATE["df"]
    
    ts_min = str(df["timestamp"].iloc[0])
    ts_max = str(df["timestamp"].iloc[-1])
    
    # Create sample preview records (first 10 and last 10)
    preview = df.head(10).to_dict(orient="records")
    
    return {
        "dataset_name": STATE["dataset_name"],
        "dataset_source": STATE["dataset_source"],
        "total_records": len(df),
        "columns": list(df.columns),
        "start_time": ts_min,
        "end_time": ts_max,
        "mean_power_kwh": round(float(df["power_kwh"].mean()), 3),
        "max_power_kwh": round(float(df["power_kwh"].max()), 3),
        "min_power_kwh": round(float(df["power_kwh"].min()), 3),
        "has_temperature": "temperature_c" in df.columns,
        "has_humidity": "humidity_pct" in df.columns,
        "preview_records": preview
    }


@app.post("/api/data/generate")
def generate_data(req: GenerateDataRequest):
    """Generate fresh synthetic smart-meter dataset."""
    try:
        new_df = generate_synthetic_smart_meter_data(
            days=req.days,
            start_date=req.start_date,
            baseline_kwh=req.baseline_kwh,
            weather_scenario=req.weather_scenario,
            noise_level=req.noise_level
        )
        STATE["df"] = new_df
        STATE["dataset_source"] = "synthetic"
        STATE["dataset_name"] = f"Synthetic {req.days}-Day Meter ({req.weather_scenario.capitalize()})"
        STATE["latest_model_result"] = None  # Reset model result until retrained
        
        return {
            "success": True,
            "message": f"Successfully generated {len(new_df)} hourly records.",
            "dataset_name": STATE["dataset_name"],
            "total_records": len(new_df),
            "preview_records": new_df.head(10).to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.post("/api/data/upload")
async def upload_csv_data(file: UploadFile = File(...)):
    """Upload custom CSV time-series data."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        contents = await file.read()
        raw_df = pd.read_csv(io.BytesIO(contents))
        
        if len(raw_df) < 48:
            raise HTTPException(
                status_code=400,
                detail=f"Uploaded dataset has only {len(raw_df)} rows. Minimum 48 hourly rows required."
            )
            
        prepared_df = prepare_raw_dataframe(raw_df)
        
        STATE["df"] = prepared_df
        STATE["dataset_source"] = "uploaded"
        STATE["dataset_name"] = file.filename
        STATE["latest_model_result"] = None
        
        return {
            "success": True,
            "filename": file.filename,
            "total_records": len(prepared_df),
            "start_time": str(prepared_df["timestamp"].iloc[0]),
            "end_time": str(prepared_df["timestamp"].iloc[-1]),
            "mean_power_kwh": round(float(prepared_df["power_kwh"].mean()), 3),
            "max_power_kwh": round(float(prepared_df["power_kwh"].max()), 3),
            "preview_records": prepared_df.head(10).to_dict(orient="records")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")


@app.get("/api/data/download-sample")
def download_sample_csv():
    """Provide downloadable sample CSV file."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sample_path = os.path.join(base_dir, "sample_data", "synthetic_energy_sample.csv")
    if not os.path.exists(sample_path):
        save_sample_dataset(sample_path)
    return FileResponse(
        sample_path,
        media_type="text/csv",
        filename="voltcast_synthetic_sample.csv"
    )


@app.get("/api/download-project-zip")
def download_project_zip():
    """Provide downloadable full project ZIP file."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Check parent dir, project root, and brain dir
    candidate_paths = [
        os.path.join(os.path.dirname(base_dir), "smart-energy-forecaster.zip"),
        os.path.join(base_dir, "smart-energy-forecaster.zip"),
        "/Users/sohampatel/.gemini/antigravity/scratch/smart-energy-forecaster.zip",
    ]
    zip_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            zip_path = p
            break
            
    if not zip_path:
        raise HTTPException(status_code=404, detail="ZIP archive not found.")
        
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename="smart-energy-forecaster.zip"
    )


@app.post("/api/model/train")
def train_model(req: TrainModelRequest):
    """
    Train ML regression model (XGBoost or Random Forest),
    evaluate RMSE and MAE, project future forecast, and run initial cost and peak analysis.
    """
    if STATE["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Generate or upload data first.")
        
    df = STATE["df"]
    try:
        forecaster = EnergyForecaster(
            model_type=req.model_type,
            n_estimators=req.n_estimators,
            max_depth=req.max_depth,
            learning_rate=req.learning_rate
        )
        
        result = forecaster.train_and_evaluate(
            df=df,
            test_split_ratio=req.test_split,
            forecast_horizon_hours=req.forecast_horizon_hours
        )
        
        # Calculate cost projections using current tariff settings
        tariffs = STATE["last_tariff_settings"]
        cost_analysis = calculate_energy_costs(
            result["test_results"],
            flat_rate=tariffs["flat_rate"],
            tariff_mode=tariffs["tariff_mode"],
            peak_rate=tariffs["peak_rate"],
            shoulder_rate=tariffs["shoulder_rate"],
            off_peak_rate=tariffs["off_peak_rate"],
            peak_start_hour=tariffs["peak_start_hour"],
            peak_end_hour=tariffs["peak_end_hour"],
            off_peak_start_hour=tariffs["off_peak_start_hour"],
            off_peak_end_hour=tariffs["off_peak_end_hour"]
        )
        result["cost_analysis"] = cost_analysis
        
        # Calculate peak load and efficiency insights
        insights = generate_peak_load_and_efficiency_insights(df)
        result["peak_insights"] = insights
        
        STATE["latest_model_result"] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")


@app.get("/api/model/latest")
def get_latest_model_result():
    if STATE["latest_model_result"] is None:
        raise HTTPException(status_code=404, detail="No model has been trained yet.")
    return STATE["latest_model_result"]


@app.post("/api/cost/calculate")
def calculate_costs(req: CostCalculationRequest):
    """
    Dynamic cost calculator endpoint: recomputes costs when user adjusts tariff rates
    without needing to retrain the ML model.
    """
    if STATE["latest_model_result"] is None:
        raise HTTPException(status_code=400, detail="Please train or load a model first.")
        
    # Update stored tariff settings
    STATE["last_tariff_settings"] = req.dict()
    
    test_results = STATE["latest_model_result"].get("test_results", [])
    if not test_results:
        raise HTTPException(status_code=400, detail="No test predictions available.")
        
    cost_analysis = calculate_energy_costs(
        test_results,
        flat_rate=req.flat_rate,
        tariff_mode=req.tariff_mode,
        peak_rate=req.peak_rate,
        shoulder_rate=req.shoulder_rate,
        off_peak_rate=req.off_peak_rate,
        peak_start_hour=req.peak_start_hour,
        peak_end_hour=req.peak_end_hour,
        off_peak_start_hour=req.off_peak_start_hour,
        off_peak_end_hour=req.off_peak_end_hour
    )
    
    # Also update cached result
    STATE["latest_model_result"]["cost_analysis"] = cost_analysis
    return cost_analysis


@app.get("/api/insights")
def get_dataset_insights():
    """Return peak load, baseload metrics, and efficiency recommendations."""
    if STATE["df"] is None:
        raise HTTPException(status_code=400, detail="No active dataset.")
    return generate_peak_load_and_efficiency_insights(STATE["df"])
