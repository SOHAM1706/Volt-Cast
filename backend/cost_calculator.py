"""
Electricity Tariff Cost Calculator & Peak Load Insights Engine
Computes costs under Flat and Time-of-Use (TOU) tariffs, runs savings simulations,
and generates peak demand & energy efficiency analytics.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional


def calculate_energy_costs(
    records: List[Dict[str, Any]],
    flat_rate: float = 0.165,
    tariff_mode: str = "tou",  # "flat" or "tou"
    peak_rate: float = 0.32,
    shoulder_rate: float = 0.18,
    off_peak_rate: float = 0.10,
    peak_start_hour: int = 17,
    peak_end_hour: int = 21,
    off_peak_start_hour: int = 23,
    off_peak_end_hour: int = 7,
    carbon_intensity_kg_per_kwh: float = 0.42
) -> Dict[str, Any]:
    """
    Calculate energy costs across records for both actual and predicted values.
    Provides daily, weekly, and monthly projections plus load-shifting savings.
    """
    if not records:
        return {}
        
    total_actual_kwh = 0.0
    total_pred_kwh = 0.0
    total_actual_cost = 0.0
    total_pred_cost = 0.0
    
    peak_pred_kwh = 0.0
    shoulder_pred_kwh = 0.0
    off_peak_pred_kwh = 0.0
    
    peak_pred_cost = 0.0
    shoulder_pred_cost = 0.0
    off_peak_pred_cost = 0.0
    
    hourly_breakdown = []
    
    for r in records:
        # Determine hour from record or timestamp
        if "hour" in r:
            hr = int(r["hour"])
        elif "timestamp" in r:
            try:
                hr = pd.to_datetime(r["timestamp"]).hour
            except Exception:
                hr = 12
        else:
            hr = 12
            
        is_weekend = r.get("is_weekend", False)
        
        # Determine effective rate
        if tariff_mode == "flat":
            rate = flat_rate
            tier = "flat"
        else:
            # TOU Logic:
            # Peak: Weekdays peak_start to peak_end (inclusive)
            # Off-peak: Night time (>= off_peak_start or < off_peak_end)
            # Shoulder: All other hours
            if not is_weekend and (peak_start_hour <= hr <= peak_end_hour):
                rate = peak_rate
                tier = "peak"
            elif (hr >= off_peak_start_hour or hr < off_peak_end_hour):
                rate = off_peak_rate
                tier = "off_peak"
            else:
                rate = shoulder_rate
                tier = "shoulder"
                
        pred_kwh = float(r.get("predicted", r.get("power_kwh", 0.0)))
        pred_cost = pred_kwh * rate
        total_pred_kwh += pred_kwh
        total_pred_cost += pred_cost
        
        if tier == "peak":
            peak_pred_kwh += pred_kwh
            peak_pred_cost += pred_cost
        elif tier == "off_peak":
            off_peak_pred_kwh += pred_kwh
            off_peak_pred_cost += pred_cost
        else:
            shoulder_pred_kwh += pred_kwh
            shoulder_pred_cost += pred_cost
            
        actual_val = r.get("actual")
        if actual_val is not None:
            act_kwh = float(actual_val)
            act_cost = act_kwh * rate
            total_actual_kwh += act_kwh
            total_actual_cost += act_cost
        else:
            act_kwh = None
            act_cost = None
            
        hourly_breakdown.append({
            "timestamp": r.get("timestamp"),
            "tier": tier,
            "rate_usd": rate,
            "pred_kwh": round(pred_kwh, 3),
            "pred_cost_usd": round(pred_cost, 4),
            "actual_kwh": round(act_kwh, 3) if act_kwh is not None else None,
            "actual_cost_usd": round(act_cost, 4) if act_cost is not None else None,
        })
        
    num_hours = max(len(records), 1)
    avg_hourly_kwh = total_pred_kwh / num_hours
    avg_hourly_cost = total_pred_cost / num_hours
    
    # Projections
    daily_pred_kwh = avg_hourly_kwh * 24.0
    daily_pred_cost = avg_hourly_cost * 24.0
    
    weekly_pred_kwh = daily_pred_kwh * 7.0
    weekly_pred_cost = daily_pred_cost * 7.0
    
    monthly_pred_kwh = daily_pred_kwh * 30.0
    monthly_pred_cost = daily_pred_cost * 30.0
    
    annual_pred_cost = monthly_pred_cost * 12.0
    
    # Carbon emissions estimate
    monthly_carbon_kg = monthly_pred_kwh * carbon_intensity_kg_per_kwh
    
    # Savings simulation: Shift 20% of peak demand to off-peak
    # Savings = (shifted_kwh * peak_rate) - (shifted_kwh * off_peak_rate)
    peak_shift_ratio = 0.20
    shifted_kwh_monthly = (peak_pred_kwh / num_hours * 24 * 30) * peak_shift_ratio
    monthly_savings_usd = shifted_kwh_monthly * max(0.0, (peak_rate - off_peak_rate)) if tariff_mode == "tou" else 0.0
    
    return {
        "tariff_settings": {
            "mode": tariff_mode,
            "flat_rate": flat_rate,
            "peak_rate": peak_rate,
            "shoulder_rate": shoulder_rate,
            "off_peak_rate": off_peak_rate,
            "peak_window": f"{peak_start_hour:02d}:00 - {peak_end_hour:02d}:00",
            "off_peak_window": f"{off_peak_start_hour:02d}:00 - {off_peak_end_hour:02d}:00"
        },
        "projections": {
            "daily": {
                "energy_kwh": round(daily_pred_kwh, 2),
                "cost_usd": round(daily_pred_cost, 2)
            },
            "weekly": {
                "energy_kwh": round(weekly_pred_kwh, 2),
                "cost_usd": round(weekly_pred_cost, 2)
            },
            "monthly": {
                "energy_kwh": round(monthly_pred_kwh, 2),
                "cost_usd": round(monthly_pred_cost, 2),
                "carbon_kg": round(monthly_carbon_kg, 1)
            },
            "annual_projected_usd": round(annual_pred_cost, 2)
        },
        "tou_breakdown": {
            "peak": {
                "kwh": round(peak_pred_kwh, 2),
                "cost_usd": round(peak_pred_cost, 2),
                "pct_of_total": round((peak_pred_cost / total_pred_cost * 100), 1) if total_pred_cost > 0 else 0
            },
            "shoulder": {
                "kwh": round(shoulder_pred_kwh, 2),
                "cost_usd": round(shoulder_pred_cost, 2),
                "pct_of_total": round((shoulder_pred_cost / total_pred_cost * 100), 1) if total_pred_cost > 0 else 0
            },
            "off_peak": {
                "kwh": round(off_peak_pred_kwh, 2),
                "cost_usd": round(off_peak_pred_cost, 2),
                "pct_of_total": round((off_peak_pred_cost / total_pred_cost * 100), 1) if total_pred_cost > 0 else 0
            }
        },
        "cost_comparison": {
            "test_total_actual_kwh": round(total_actual_kwh, 2) if total_actual_kwh > 0 else None,
            "test_total_pred_kwh": round(total_pred_kwh, 2),
            "test_total_actual_cost": round(total_actual_cost, 2) if total_actual_cost > 0 else None,
            "test_total_pred_cost": round(total_pred_cost, 2),
            "cost_variance_usd": round(total_pred_cost - total_actual_cost, 2) if total_actual_cost > 0 else 0.0,
        },
        "load_shifting_simulation": {
            "assumed_shift_pct": int(peak_shift_ratio * 100),
            "shifted_kwh_monthly": round(shifted_kwh_monthly, 1),
            "estimated_monthly_savings_usd": round(monthly_savings_usd, 2),
            "estimated_annual_savings_usd": round(monthly_savings_usd * 12.0, 2),
        }
    }


def generate_peak_load_and_efficiency_insights(
    df: pd.DataFrame,
    peak_threshold_percentile: float = 90.0
) -> Dict[str, Any]:
    """
    Analyze dataset to extract peak windows, load shapes, baseload health,
    and efficiency recommendations.
    """
    df = df.copy()
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["hour"] = df["timestamp"].dt.hour
        df["dayofweek"] = df["timestamp"].dt.day_of_week
    else:
        df["hour"] = np.arange(len(df)) % 24
        df["dayofweek"] = (np.arange(len(df)) // 24) % 7
        
    power = df["power_kwh"]
    threshold_val = float(np.percentile(power, peak_threshold_percentile))
    mean_val = float(power.mean())
    max_val = float(power.max())
    min_val = float(power.min())
    
    # Peak-to-Average Ratio (PAR)
    par = round(max_val / max(mean_val, 0.05), 2)
    
    # Top Peak consumption events
    top_peaks_df = df.sort_values(by="power_kwh", ascending=False).head(6)
    top_peaks = []
    for _, row in top_peaks_df.iterrows():
        top_peaks.append({
            "timestamp": row["timestamp"].strftime("%Y-%m-%d %H:%M") if hasattr(row["timestamp"], "strftime") else str(row["timestamp"]),
            "power_kwh": round(float(row["power_kwh"]), 2),
            "hour": int(row["hour"]),
            "temperature_c": round(float(row.get("temperature_c", 0)), 1) if "temperature_c" in row else None
        })
        
    # Hourly consumption distribution profile (24-hour curve)
    hourly_agg = df.groupby("hour")["power_kwh"].agg(["mean", "max", "min"]).reset_index()
    hourly_distribution = [
        {
            "hour": int(r["hour"]),
            "label": f"{int(r['hour']):02d}:00",
            "avg_kwh": round(float(r["mean"]), 2),
            "max_kwh": round(float(r["max"]), 2),
            "min_kwh": round(float(r["min"]), 2)
        }
        for _, r in hourly_agg.iterrows()
    ]
    
    # Peak load window detection
    peak_hours_group = df[df["power_kwh"] >= threshold_val]["hour"].value_counts().head(3)
    peak_time_windows = [f"{hr:02d}:00 - {(hr+1)%24:02d}:00" for hr in peak_hours_group.index]
    
    # Baseload calculation (average power between 01:00 and 05:00)
    night_mask = (df["hour"] >= 1) & (df["hour"] <= 5)
    baseload_avg = float(df[night_mask]["power_kwh"].mean()) if night_mask.any() else min_val
    baseload_ratio = round((baseload_avg / mean_val) * 100, 1)
    
    # Weather sensitivity (correlation between power and temp)
    if "temperature_c" in df.columns and df["temperature_c"].nunique() > 1:
        corr = float(df["power_kwh"].corr(df["temperature_c"]))
        temp_sensitivity = round(corr, 3)
    else:
        temp_sensitivity = 0.0
        
    # Generate Smart Alerts & Efficiency Recommendations
    alerts = []
    
    # Alert 1: High Peak Demand Alert
    if par >= 2.0:
        alerts.append({
            "id": "par_spike",
            "type": "warning",
            "title": "High Peak Demand Spike Detected",
            "description": f"Maximum demand reached {max_val:.2f} kWh, which is {par}x higher than your average load ({mean_val:.2f} kWh). Extreme peaks drive elevated demand charges.",
            "action": "Consider staggering heavy appliance usage (e.g., HVAC pre-cooling, delayed EV charging)."
        })
        
    # Alert 2: Baseload / Phantom Drain Alert
    if baseload_ratio > 45.0:
        alerts.append({
            "id": "phantom_drain",
            "type": "info",
            "title": "High Overnight Baseload (Phantom Drain)",
            "description": f"Overnight standby consumption averages {baseload_avg:.2f} kWh ({baseload_ratio}% of your daily average). Idle electronics and continuous circuits are drawing significant power.",
            "action": "Deploy smart power strips or inspect continuous pump/standby device loads to trim up to 15%."
        })
        
    # Alert 3: Evening Peak Tariff Exposure
    evening_peak_avg = float(df[(df["hour"] >= 17) & (df["hour"] <= 21)]["power_kwh"].mean())
    if evening_peak_avg > mean_val * 1.25:
        alerts.append({
            "id": "tariff_exposure",
            "type": "caution",
            "title": "Heavy Evening Peak Exposure",
            "description": f"Average power between 17:00 and 21:00 is {evening_peak_avg:.2f} kWh, coinciding with prime on-peak utility tariff pricing.",
            "action": "Schedule laundry, dishwashing, and water heating cycles before 16:00 or after 21:00."
        })
        
    # Alert 4: Thermal/Weather Elasticity Alert
    if abs(temp_sensitivity) > 0.45:
        alerts.append({
            "id": "hvac_sensitivity",
            "type": "tip",
            "title": "High Thermal Elasticity (HVAC Dependent)",
            "description": f"Strong correlation ({temp_sensitivity:+.2f}) between outdoor temperature and power load. HVAC is the primary driver of consumption variance.",
            "action": "Adjust thermostat setpoint by 1-2°C or inspect building insulation to decrease HVAC draw by ~8-12%."
        })
        
    return {
        "summary": {
            "peak_to_average_ratio": par,
            "baseload_avg_kwh": round(baseload_avg, 2),
            "baseload_percentage": baseload_ratio,
            "peak_threshold_kwh": round(threshold_val, 2),
            "temperature_correlation": temp_sensitivity,
            "most_frequent_peak_windows": peak_time_windows
        },
        "top_peaks": top_peaks,
        "hourly_distribution": hourly_distribution,
        "alerts": alerts
    }
