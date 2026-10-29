"""
Machine Learning Training, Evaluation, and Forecasting Pipeline
Supports Random Forest, Gradient Boosting, and XGBoost regression for time-series energy prediction.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import timedelta
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

# Graceful XGBoost import handling
XGBOOST_AVAILABLE = False
XGBOOST_IMPORT_ERROR = None
try:
    import xgboost as xgb
    # Test instantiating to verify native library loading
    _test = xgb.XGBRegressor(n_estimators=1)
    XGBOOST_AVAILABLE = True
except Exception as exc:
    XGBOOST_AVAILABLE = False
    XGBOOST_IMPORT_ERROR = str(exc)

from feature_engineering import extract_features, FEATURE_DESCRIPTIONS, prepare_raw_dataframe


class EnergyForecaster:
    def __init__(
        self,
        model_type: str = "random_forest",
        n_estimators: int = 150,
        max_depth: int = 6,
        learning_rate: float = 0.08,
        random_state: int = 42
    ):
        self.requested_model_type = model_type.lower()
        self.model_type = self.requested_model_type
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.random_state = random_state
        self.model = None
        self.feature_cols: List[str] = []
        self.target_col: str = "power_kwh"
        self.notes: str = ""
        
    def _init_model(self):
        if self.requested_model_type == "xgboost":
            if XGBOOST_AVAILABLE:
                self.model_type = "xgboost"
                return xgb.XGBRegressor(
                    n_estimators=self.n_estimators,
                    max_depth=self.max_depth,
                    learning_rate=self.learning_rate,
                    random_state=self.random_state,
                    subsample=0.85,
                    colsample_bytree=0.85,
                    n_jobs=-1
                )
            else:
                # Scikit-Learn Gradient Boosting as high-performance ensemble fallback
                self.model_type = "gradient_boosting (sklearn fallback)"
                self.notes = "Native XGBoost library required OpenMP (libomp.dylib). Automatically utilized Scikit-Learn Gradient Boosting Regressor."
                return GradientBoostingRegressor(
                    n_estimators=self.n_estimators,
                    max_depth=min(self.max_depth, 6),
                    learning_rate=self.learning_rate,
                    random_state=self.random_state
                )
        elif self.requested_model_type == "gradient_boosting":
            self.model_type = "gradient_boosting"
            return GradientBoostingRegressor(
                n_estimators=self.n_estimators,
                max_depth=min(self.max_depth, 6),
                learning_rate=self.learning_rate,
                random_state=self.random_state
            )
        else:  # default random_forest
            self.model_type = "random_forest"
            return RandomForestRegressor(
                n_estimators=self.n_estimators,
                max_depth=self.max_depth,
                random_state=self.random_state,
                n_jobs=-1
            )

    def train_and_evaluate(
        self,
        df: pd.DataFrame,
        test_split_ratio: float = 0.20,
        forecast_horizon_hours: int = 48
    ) -> Dict[str, Any]:
        """
        Train time-series model chronologically, evaluate test performance,
        and generate future horizon forecast.
        """
        # Feature Engineering
        feature_df, self.feature_cols, self.target_col = extract_features(df)
        
        n_samples = len(feature_df)
        if n_samples < 48:
            raise ValueError(f"Dataset too small ({n_samples} rows). Minimum 48 hourly records required.")
            
        # Chronological Split (No data leakage)
        split_idx = int(n_samples * (1.0 - test_split_ratio))
        train_df = feature_df.iloc[:split_idx].copy()
        test_df = feature_df.iloc[split_idx:].copy()
        
        X_train = train_df[self.feature_cols]
        y_train = train_df[self.target_col]
        
        X_test = test_df[self.feature_cols]
        y_test = test_df[self.target_col]
        
        # Train Model
        self.model = self._init_model()
        self.model.fit(X_train, y_train)
        
        # Predictions on Test Set
        y_pred = self.model.predict(X_test)
        # Avoid negative predictions
        y_pred = np.maximum(y_pred, 0.05)
        
        # Compute Metrics
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        mae = float(mean_absolute_error(y_test, y_pred))
        
        # MAPE (avoiding division by zero or near-zero)
        denominator = np.maximum(np.abs(y_test.values), 0.1)
        mape = float(np.mean(np.abs((y_test.values - y_pred) / denominator)) * 100)
        r2 = float(r2_score(y_test, y_pred))
        
        # Feature Importances
        if hasattr(self.model, "feature_importances_"):
            raw_importances = self.model.feature_importances_
            total_imp = np.sum(raw_importances)
            norm_importances = (raw_importances / total_imp * 100) if total_imp > 0 else raw_importances
            
            fi_list = []
            for col, val in zip(self.feature_cols, norm_importances):
                fi_list.append({
                    "feature": col,
                    "importance": round(float(val), 2),
                    "description": FEATURE_DESCRIPTIONS.get(col, col.replace("_", " ").title())
                })
            # Sort descending
            fi_list = sorted(fi_list, key=lambda x: x["importance"], reverse=True)
        else:
            fi_list = []
            
        # Actual vs Predicted Test Curve Records
        test_records = []
        for i, (idx, row) in enumerate(test_df.iterrows()):
            actual_val = float(y_test.iloc[i])
            pred_val = float(y_pred[i])
            diff = pred_val - actual_val
            pct_err = (diff / max(actual_val, 0.1)) * 100
            
            test_records.append({
                "timestamp": row["timestamp"].strftime("%Y-%m-%d %H:%M"),
                "actual": round(actual_val, 3),
                "predicted": round(pred_val, 3),
                "residual": round(diff, 3),
                "error_pct": round(pct_err, 2),
                "temperature_c": round(float(row.get("temperature_c", 20.0)), 1),
                "is_peak": bool(row["hour"] >= 17 and row["hour"] <= 21)
            })
            
        # Out-of-sample Future Forecast (Recursive)
        future_records = self._generate_future_forecast(feature_df, forecast_horizon_hours)
        
        # Dataset Summary Statistics
        dataset_stats = {
            "total_records": n_samples,
            "train_records": len(train_df),
            "test_records": len(test_df),
            "start_time": feature_df["timestamp"].iloc[0].strftime("%Y-%m-%d %H:%M"),
            "end_time": feature_df["timestamp"].iloc[-1].strftime("%Y-%m-%d %H:%M"),
            "mean_power_kwh": round(float(feature_df[self.target_col].mean()), 3),
            "max_power_kwh": round(float(feature_df[self.target_col].max()), 3),
            "min_power_kwh": round(float(feature_df[self.target_col].min()), 3),
            "std_power_kwh": round(float(feature_df[self.target_col].std()), 3),
        }
        
        return {
            "metrics": {
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "mape": round(mape, 2),
                "r2_score": round(r2, 4)
            },
            "model_info": {
                "model_type": self.model_type,
                "requested_model_type": self.requested_model_type,
                "n_estimators": self.n_estimators,
                "max_depth": self.max_depth,
                "learning_rate": self.learning_rate,
                "features_used_count": len(self.feature_cols),
                "notes": self.notes
            },
            "dataset_stats": dataset_stats,
            "feature_importances": fi_list[:12],  # top 12
            "test_results": test_records,
            "future_forecast": future_records
        }

    def _generate_future_forecast(
        self,
        history_df: pd.DataFrame,
        horizon_hours: int = 48
    ) -> List[Dict[str, Any]]:
        """
        Recursively project forward into future hours using trained model.
        """
        future_records = []
        last_dt = history_df["timestamp"].iloc[-1]
        
        recent_powers = list(history_df[self.target_col].values[-200:])
        recent_temps = list(history_df["temperature_c"].values[-200:])
        
        curr_dt = last_dt
        for h in range(1, horizon_hours + 1):
            curr_dt = curr_dt + timedelta(hours=1)
            hour = curr_dt.hour
            dayofweek = curr_dt.day_of_week
            is_weekend = int(dayofweek >= 5)
            is_peak = int(17 <= hour <= 21)
            
            # Estimate diurnal temperature
            prev_temp_mean = np.mean(recent_temps[-24:]) if len(recent_temps) >= 24 else 22.0
            diurnal_temp = 5.5 * np.sin(2 * np.pi * (hour - 9) / 24.0)
            pred_temp = round(prev_temp_mean + diurnal_temp, 1)
            recent_temps.append(pred_temp)
            
            pred_humidity = round(float(np.clip(60.0 - 10.0 * np.sin(2 * np.pi * (hour - 9) / 24.0), 30.0, 90.0)), 1)
            
            # Construct feature row
            row_dict = {
                "hour_sin": np.sin(2 * np.pi * hour / 24.0),
                "hour_cos": np.cos(2 * np.pi * hour / 24.0),
                "dayofweek_sin": np.sin(2 * np.pi * dayofweek / 7.0),
                "dayofweek_cos": np.cos(2 * np.pi * dayofweek / 7.0),
                "is_weekend": is_weekend,
                "is_peak_window": is_peak,
                "hour": hour,
                "dayofweek": dayofweek,
                "lag_1h": recent_powers[-1],
                "lag_2h": recent_powers[-2] if len(recent_powers) >= 2 else recent_powers[-1],
                "lag_3h": recent_powers[-3] if len(recent_powers) >= 3 else recent_powers[-1],
                "lag_24h": recent_powers[-24] if len(recent_powers) >= 24 else recent_powers[-1],
                "rolling_mean_3h": np.mean(recent_powers[-3:]),
                "rolling_std_3h": np.std(recent_powers[-3:]) if len(recent_powers) >= 3 else 0.0,
                "rolling_mean_6h": np.mean(recent_powers[-6:]) if len(recent_powers) >= 6 else np.mean(recent_powers),
                "rolling_mean_24h": np.mean(recent_powers[-24:]) if len(recent_powers) >= 24 else np.mean(recent_powers),
                "rolling_max_24h": np.max(recent_powers[-24:]) if len(recent_powers) >= 24 else np.max(recent_powers),
                "rolling_min_24h": np.min(recent_powers[-24:]) if len(recent_powers) >= 24 else np.min(recent_powers),
                "temperature_c": pred_temp,
                "humidity_pct": pred_humidity,
                "temp_rolling_mean_3h": np.mean(recent_temps[-3:]),
                "cooling_degree_hours": max(0.0, pred_temp - 22.0),
                "heating_degree_hours": max(0.0, 18.0 - pred_temp),
            }
            if "lag_168h" in self.feature_cols:
                row_dict["lag_168h"] = recent_powers[-168] if len(recent_powers) >= 168 else recent_powers[-24]
                
            input_row = pd.DataFrame([{col: row_dict.get(col, 0.0) for col in self.feature_cols}])
            step_pred = float(self.model.predict(input_row)[0])
            step_pred = max(0.1, step_pred)
            
            recent_powers.append(step_pred)
            
            future_records.append({
                "timestamp": curr_dt.strftime("%Y-%m-%d %H:%M"),
                "predicted": round(step_pred, 3),
                "temperature_c": pred_temp,
                "humidity_pct": pred_humidity,
                "is_weekend": bool(is_weekend),
                "is_peak": bool(is_peak),
                "hour": hour
            })
            
        return future_records
