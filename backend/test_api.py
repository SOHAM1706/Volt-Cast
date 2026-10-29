"""
Comprehensive Integration Test Suite for VoltCast Backend API
"""

import os
import sys
from fastapi.testclient import TestClient

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from main import app, STATE


def test_health_check():
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["has_active_dataset"] is True
        assert data["records_count"] >= 720


def test_get_current_dataset():
    with TestClient(app) as client:
        res = client.get("/api/data/current")
        assert res.status_code == 200
        data = res.json()
        assert "total_records" in data
        assert "mean_power_kwh" in data
        assert len(data["preview_records"]) > 0


def test_generate_synthetic_data():
    with TestClient(app) as client:
        payload = {
            "days": 30,
            "weather_scenario": "summer_warm",
            "baseline_kwh": 1.1,
            "noise_level": 0.10
        }
        res = client.post("/api/data/generate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["total_records"] == 30 * 24


def test_train_model_random_forest():
    with TestClient(app) as client:
        payload = {
            "model_type": "random_forest",
            "test_split": 0.20,
            "n_estimators": 50,
            "max_depth": 5,
            "learning_rate": 0.08,
            "forecast_horizon_hours": 24
        }
        res = client.post("/api/model/train", json=payload)
        assert res.status_code == 200
        data = res.json()
        
        # Verify Metrics (RMSE and MAE)
        metrics = data["metrics"]
        assert "rmse" in metrics and metrics["rmse"] > 0
        assert "mae" in metrics and metrics["mae"] > 0
        assert "r2_score" in metrics
        
        # Verify Actual vs Predicted test records
        test_results = data["test_results"]
        assert len(test_results) > 0
        assert "actual" in test_results[0]
        assert "predicted" in test_results[0]
        assert "residual" in test_results[0]
        
        # Verify Feature Importances
        fi = data["feature_importances"]
        assert len(fi) > 0
        assert "feature" in fi[0]
        assert "importance" in fi[0]
        
        # Verify Future Horizon
        future = data["future_forecast"]
        assert len(future) == 24


def test_dynamic_cost_calculation():
    with TestClient(app) as client:
        # Train once first
        client.post("/api/model/train", json={"model_type": "random_forest", "n_estimators": 40})
        
        # Test TOU mode
        payload_tou = {
            "tariff_mode": "tou",
            "flat_rate": 0.165,
            "peak_rate": 0.35,
            "shoulder_rate": 0.19,
            "off_peak_rate": 0.09,
            "peak_start_hour": 17,
            "peak_end_hour": 21,
            "off_peak_start_hour": 23,
            "off_peak_end_hour": 7
        }
        res = client.post("/api/cost/calculate", json=payload_tou)
        assert res.status_code == 200
        data = res.json()
        
        assert "projections" in data
        assert data["projections"]["daily"]["cost_usd"] > 0
        assert data["projections"]["monthly"]["cost_usd"] > 0
        assert "tou_breakdown" in data
        assert "load_shifting_simulation" in data
        assert data["load_shifting_simulation"]["estimated_monthly_savings_usd"] >= 0


def test_peak_insights():
    with TestClient(app) as client:
        res = client.get("/api/insights")
        assert res.status_code == 200
        data = res.json()
        assert "summary" in data
        assert "top_peaks" in data
        assert "hourly_distribution" in data
        assert "alerts" in data
        assert len(data["hourly_distribution"]) == 24


def test_csv_upload():
    with TestClient(app) as client:
        sample_path = os.path.join(CURRENT_DIR, "sample_data", "synthetic_energy_sample.csv")
        with open(sample_path, "rb") as f:
            res = client.post(
                "/api/data/upload",
                files={"file": ("test_meter.csv", f, "text/csv")}
            )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["total_records"] > 100


if __name__ == "__main__":
    print("Running integration tests directly...")
    test_health_check()
    test_get_current_dataset()
    test_generate_synthetic_data()
    test_train_model_random_forest()
    test_dynamic_cost_calculation()
    test_peak_insights()
    test_csv_upload()
    print("ALL 7 INTEGRATION TESTS PASSED SUCCESSFULLY!")
