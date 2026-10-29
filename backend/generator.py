"""
Synthetic Smart Meter Data Generator
Generates realistic hourly power consumption (kWh), temperature (°C),
and relative humidity (%) for residential/commercial energy forecasting.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os


def generate_synthetic_smart_meter_data(
    days: int = 60,
    start_date: str = "2026-08-01 00:00:00",
    baseline_kwh: float = 0.9,
    weather_scenario: str = "summer_warm",
    noise_level: float = 0.12,
    seed: int = 42
) -> pd.DataFrame:
    """
    Generate realistic hourly time series data.
    
    Includes:
    - Diurnal (morning peak, evening peak, overnight minimum)
    - Weekly pattern (weekday vs weekend differences)
    - Temperature-driven heating and cooling (HVAC loads)
    - Appliance spikes (EV charging, laundry, cooking)
    - Realistic sensor noise
    """
    np.random.seed(seed)
    total_hours = days * 24
    start_dt = pd.to_datetime(start_date)
    timestamps = [start_dt + timedelta(hours=i) for i in range(total_hours)]
    
    df = pd.DataFrame({"timestamp": timestamps})
    df["hour"] = df["timestamp"].dt.hour
    df["dayofweek"] = df["timestamp"].dt.day_of_week
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
    
    # 1. Weather simulation
    # Multi-day weather trend (fronts passing every 4-7 days)
    t = np.arange(total_hours)
    weather_wave = 4.5 * np.sin(2 * np.pi * t / (24 * 5.5)) + 2.0 * np.cos(2 * np.pi * t / (24 * 12.0))
    
    # Daily temperature swing (coldest ~5am, warmest ~3pm/15:00)
    # Peak at 15:00 corresponds to shift: (hour - 9) * pi / 12 so sin is 1 at hour 15
    diurnal_temp = 6.0 * np.sin(2 * np.pi * (df["hour"] - 9) / 24)
    
    if weather_scenario == "summer_warm":
        base_temp = 25.0
    elif weather_scenario == "winter_cold":
        base_temp = 4.0
    elif weather_scenario == "spring_mild":
        base_temp = 16.0
    else:  # seasonal transition
        base_temp = 20.0 + 8.0 * np.sin(2 * np.pi * t / (total_hours))
        
    temp_noise = np.random.normal(0, 0.8, total_hours)
    temperature = base_temp + weather_wave + diurnal_temp + temp_noise
    df["temperature_c"] = np.round(temperature, 1)
    
    # Relative humidity (inversely correlated with temperature + diurnal effect)
    base_humidity = 65.0 - 1.2 * (temperature - base_temp)
    humidity_diurnal = -12.0 * np.sin(2 * np.pi * (df["hour"] - 9) / 24)
    humidity_noise = np.random.normal(0, 3.0, total_hours)
    humidity = np.clip(base_humidity + humidity_diurnal + humidity_noise, 25.0, 95.0)
    df["humidity_pct"] = np.round(humidity, 1)
    
    # 2. Base Load Profile (kWh)
    # Hourly human activity shape
    # Morning ramp (6-9 AM), afternoon lull, evening surge (17-22 PM), night minimum (1-5 AM)
    hourly_shape = np.array([
        0.45, 0.40, 0.38, 0.38, 0.42, 0.55,  # 00:00 - 05:00
        0.85, 1.35, 1.45, 1.15, 0.90, 0.85,  # 06:00 - 11:00
        0.80, 0.82, 0.85, 0.95, 1.20, 1.65,  # 12:00 - 17:00
        1.95, 2.10, 1.80, 1.40, 0.95, 0.60   # 18:00 - 23:00
    ])
    
    # Weekend modifies shape: wake up later (shifted morning peak), higher daytime presence
    weekend_hourly_shape = np.array([
        0.50, 0.45, 0.40, 0.40, 0.42, 0.45,  # 00:00 - 05:00
        0.60, 0.80, 1.15, 1.35, 1.30, 1.25,  # 06:00 - 11:00
        1.20, 1.15, 1.20, 1.25, 1.40, 1.70,  # 12:00 - 17:00
        1.85, 1.95, 1.80, 1.50, 1.10, 0.70   # 18:00 - 23:00
    ])
    
    base_activity = np.where(
        df["is_weekend"] == 1,
        weekend_hourly_shape[df["hour"]],
        hourly_shape[df["hour"]]
    ) * baseline_kwh
    
    # 3. HVAC (Cooling and Heating) load
    # Cooling kicks in above 23°C
    cooling_load = np.maximum(0, df["temperature_c"] - 23.0) * 0.16
    # Heating kicks in below 16°C
    heating_load = np.maximum(0, 16.0 - df["temperature_c"]) * 0.19
    
    # 4. Stochastic appliance spikes (EV charging, dishwasher, oven, clothes dryer)
    # EV charging occurs on ~30% of weekday nights around 23:00 - 03:00
    ev_spikes = np.zeros(total_hours)
    for d in range(days):
        if np.random.rand() < 0.45:  # charging night
            charge_start = d * 24 + np.random.choice([22, 23, 0, 1])
            charge_duration = np.random.choice([3, 4, 5])
            if charge_start + charge_duration < total_hours:
                ev_spikes[charge_start : charge_start + charge_duration] += np.random.uniform(2.5, 4.0)
                
    # Random short appliance spikes
    appliance_spikes = (np.random.rand(total_hours) > 0.94).astype(float) * np.random.uniform(0.8, 2.2, total_hours)
    
    # Random gaussian noise
    gaussian_noise = np.random.normal(0, noise_level, total_hours)
    
    # Total consumption
    total_power = base_activity + cooling_load + heating_load + ev_spikes + appliance_spikes + gaussian_noise
    # Never allow negative consumption (baseload floor)
    min_floor = 0.25 * baseline_kwh
    df["power_kwh"] = np.round(np.clip(total_power, min_floor, 15.0), 3)
    
    # Keep only the essential columns for export / data ingestion
    result_df = df[["timestamp", "power_kwh", "temperature_c", "humidity_pct"]].copy()
    result_df["timestamp"] = result_df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
    return result_df


def save_sample_dataset(filepath: str = None) -> str:
    """Save a realistic 60-day sample dataset to disk."""
    if filepath is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        sample_dir = os.path.join(base_dir, "sample_data")
        os.makedirs(sample_dir, exist_ok=True)
        filepath = os.path.join(sample_dir, "synthetic_energy_sample.csv")
        
    df = generate_synthetic_smart_meter_data(days=60, weather_scenario="seasonal", seed=101)
    df.to_csv(filepath, index=False)
    return filepath


if __name__ == "__main__":
    path = save_sample_dataset()
    print(f"Sample dataset generated at: {path}")
