"""
Time-Series Feature Engineering Module
Extracts cyclical temporal encodings, lag features, rolling window aggregates,
and environmental interaction variables.
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Optional


FEATURE_DESCRIPTIONS = {
    "lag_1h": "Power demand in the immediately preceding hour (t-1)",
    "lag_2h": "Power demand 2 hours prior (t-2)",
    "lag_3h": "Power demand 3 hours prior (t-3)",
    "lag_24h": "Power demand exactly 24 hours ago (same hour yesterday)",
    "lag_168h": "Power demand 168 hours ago (same hour last week)",
    "rolling_mean_3h": "Rolling 3-hour mean power consumption",
    "rolling_std_3h": "Rolling 3-hour power consumption volatility (std)",
    "rolling_mean_6h": "Rolling 6-hour mean power consumption trend",
    "rolling_mean_24h": "Rolling 24-hour daily average baseline load",
    "rolling_max_24h": "Maximum power spike observed in the past 24 hours",
    "rolling_min_24h": "Minimum baseline power observed in the past 24 hours",
    "hour_sin": "Cyclical sine component of hour of day",
    "hour_cos": "Cyclical cosine component of hour of day",
    "dayofweek_sin": "Cyclical sine component of day of week",
    "dayofweek_cos": "Cyclical cosine component of day of week",
    "is_weekend": "Binary indicator for weekend days (Saturday/Sunday)",
    "is_peak_window": "Indicator for high-tariff peak demand hours (17:00 - 21:00)",
    "temperature_c": "Outdoor ambient temperature (°C)",
    "humidity_pct": "Relative humidity percentage (%)",
    "temp_rolling_mean_3h": "Rolling 3-hour average ambient temperature",
    "cooling_degree_hours": "Cooling demand degree hours (excess above 22°C)",
    "heating_degree_hours": "Heating demand degree hours (deficit below 18°C)",
    "hour": "Hour of the day (0 to 23)",
    "dayofweek": "Day of the week (0=Monday to 6=Sunday)",
}


def prepare_raw_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names and parse datetime index."""
    df = df.copy()
    col_mapping = {}
    
    # Normalize column names to lowercase
    lower_cols = {col.lower().strip(): col for col in df.columns}
    
    # Identify timestamp column
    ts_candidates = ["timestamp", "datetime", "date", "time", "date_time", "dt"]
    found_ts = None
    for cand in ts_candidates:
        if cand in lower_cols:
            found_ts = lower_cols[cand]
            break
            
    if found_ts:
        col_mapping[found_ts] = "timestamp"
    else:
        # Check first column
        col_mapping[df.columns[0]] = "timestamp"
        
    # Identify target energy/power column
    target_candidates = ["power_kwh", "kwh", "power", "energy_kwh", "energy", "consumption", "usage", "load", "value"]
    found_target = None
    for cand in target_candidates:
        if cand in lower_cols and lower_cols[cand] != found_ts:
            found_target = lower_cols[cand]
            break
            
    if found_target:
        col_mapping[found_target] = "power_kwh"
    else:
        # Fallback to second numeric column
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            col_mapping[numeric_cols[0]] = "power_kwh"
        else:
            raise ValueError("No numeric power/energy column could be identified in dataset.")
            
    # Temperature and humidity mappings
    for cand in ["temperature_c", "temperature", "temp", "temp_c"]:
        if cand in lower_cols and lower_cols[cand] not in col_mapping.values():
            col_mapping[lower_cols[cand]] = "temperature_c"
            break
            
    for cand in ["humidity_pct", "humidity", "rel_humidity", "rh"]:
        if cand in lower_cols and lower_cols[cand] not in col_mapping.values():
            col_mapping[lower_cols[cand]] = "humidity_pct"
            break
            
    df = df.rename(columns=col_mapping)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    df["power_kwh"] = pd.to_numeric(df["power_kwh"], errors="coerce")
    
    # Fill any null values linearly
    df["power_kwh"] = df["power_kwh"].interpolate(method="linear").bfill().ffill()
    
    if "temperature_c" in df.columns:
        df["temperature_c"] = pd.to_numeric(df["temperature_c"], errors="coerce").interpolate().bfill().ffill()
    else:
        # Default placeholder temperature based on hour
        df["temperature_c"] = 20.0 + 5.0 * np.sin(2 * np.pi * (df["timestamp"].dt.hour - 9) / 24)
        
    if "humidity_pct" in df.columns:
        df["humidity_pct"] = pd.to_numeric(df["humidity_pct"], errors="coerce").interpolate().bfill().ffill()
    else:
        df["humidity_pct"] = 60.0 - 10.0 * np.sin(2 * np.pi * (df["timestamp"].dt.hour - 9) / 24)
        
    return df


def extract_features(
    df: pd.DataFrame,
    target_col: str = "power_kwh",
    include_168h_lag: Optional[bool] = None
) -> Tuple[pd.DataFrame, List[str], str]:
    """
    Extract time-series features from prepared dataframe.
    Returns:
        (transformed_dataframe, feature_column_names, target_column_name)
    """
    df = prepare_raw_dataframe(df)
    
    # Temporal base features
    df["hour"] = df["timestamp"].dt.hour
    df["dayofweek"] = df["timestamp"].dt.day_of_week
    df["month"] = df["timestamp"].dt.month
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
    df["is_peak_window"] = ((df["hour"] >= 17) & (df["hour"] <= 21)).astype(int)
    
    # Cyclical encodings
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
    df["dayofweek_sin"] = np.sin(2 * np.pi * df["dayofweek"] / 7.0)
    df["dayofweek_cos"] = np.cos(2 * np.pi * df["dayofweek"] / 7.0)
    
    # Lag features
    df["lag_1h"] = df[target_col].shift(1)
    df["lag_2h"] = df[target_col].shift(2)
    df["lag_3h"] = df[target_col].shift(3)
    df["lag_24h"] = df[target_col].shift(24)
    
    has_168 = len(df) >= 336
    if include_168h_lag is True or (include_168h_lag is None and has_168):
        df["lag_168h"] = df[target_col].shift(168)
        
    # Rolling window aggregates (using shift(1) to avoid data leakage from current hour)
    shifted_target = df[target_col].shift(1)
    df["rolling_mean_3h"] = shifted_target.rolling(window=3, min_periods=1).mean()
    df["rolling_std_3h"] = shifted_target.rolling(window=3, min_periods=1).std().fillna(0)
    df["rolling_mean_6h"] = shifted_target.rolling(window=6, min_periods=1).mean()
    df["rolling_mean_24h"] = shifted_target.rolling(window=24, min_periods=1).mean()
    df["rolling_max_24h"] = shifted_target.rolling(window=24, min_periods=1).max()
    df["rolling_min_24h"] = shifted_target.rolling(window=24, min_periods=1).min()
    
    # Weather interaction features
    df["temp_rolling_mean_3h"] = df["temperature_c"].rolling(window=3, min_periods=1).mean()
    df["cooling_degree_hours"] = np.maximum(0.0, df["temperature_c"] - 22.0)
    df["heating_degree_hours"] = np.maximum(0.0, 18.0 - df["temperature_c"])
    
    # Fill remaining NaNs for lags at start of series
    df = df.bfill().ffill()
    
    # List of candidate feature columns
    candidate_features = [
        "hour_sin", "hour_cos", "dayofweek_sin", "dayofweek_cos",
        "is_weekend", "is_peak_window", "hour", "dayofweek",
        "lag_1h", "lag_2h", "lag_3h", "lag_24h",
        "rolling_mean_3h", "rolling_std_3h", "rolling_mean_6h",
        "rolling_mean_24h", "rolling_max_24h", "rolling_min_24h",
        "temperature_c", "humidity_pct", "temp_rolling_mean_3h",
        "cooling_degree_hours", "heating_degree_hours"
    ]
    if "lag_168h" in df.columns:
        candidate_features.append("lag_168h")
        
    feature_cols = [c for c in candidate_features if c in df.columns]
    
    return df, feature_cols, target_col
