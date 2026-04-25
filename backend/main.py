from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import os

app = FastAPI()

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 🔹 LOAD MODEL (SAFE)
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")

model = None

try:
    model = joblib.load(MODEL_PATH)
    print("✅ Model loaded successfully")
except Exception as e:
    print("❌ Model loading failed:", str(e))
    model = None


@app.get("/")
def home():
    return {"status": "VoltGuard AI System Running"}


# =========================
# 🔥 MAIN PREDICTION API
# =========================
@app.post("/predict")
def predict(data: dict):

    try:
        # =========================
        # 🔹 INPUT PARSING
        # =========================
        cycles = float(data.get("cycles", 0))
        voltage = float(data.get("voltage", 3.7))
        current = float(data.get("current", 2))
        temp = float(data.get("temp", 30))

        # =========================
        # 🚨 VALIDATION
        # =========================
        if cycles > 2000:
            return {"error": "Cycle count exceeds realistic limit (max 2000)"}

        # =========================
        # 🔒 SAFE LIMITS
        # =========================
        cycles = max(0, cycles)
        voltage = max(2.5, min(voltage, 4.2))
        current = max(0, min(current, 8))
        temp = max(0, min(temp, 60))

        # =========================
        # 🔄 NORMALIZATION
        # =========================
        cycles_n = cycles / 2000
        voltage_n = (voltage - 2.5) / (4.2 - 2.5)
        current_n = current / 8
        temp_n = temp / 60

        X = np.array([[cycles_n, voltage_n, current_n, temp_n]])

        # =========================
        # 🤖 AI MODEL
        # =========================
        if model is not None:
            try:
                soh_ai = float(model.predict(X)[0])
            except Exception as e:
                print("⚠ Model prediction failed:", str(e))
                soh_ai = 85
        else:
            soh_ai = 85

        # =========================
        # 🔥 PHYSICS MODEL
        # =========================
        cycle_deg = (cycles / 2000) * 60
        temp_deg = max(0, temp - 30) * 1.5
        current_deg = max(0, current - 2) * 4
        voltage_deg = max(0, 3.6 - voltage) * 12

        soh_physics = 100 - (cycle_deg + temp_deg + current_deg + voltage_deg)

        # =========================
        # ⚖️ ADAPTIVE HYBRID MODEL
        # =========================
        stress_score = temp_deg + current_deg + voltage_deg

        if stress_score > 25:
            weight_ai = 0.5
        else:
            weight_ai = 0.75

        soh = (weight_ai * soh_ai) + ((1 - weight_ai) * soh_physics)
        soh = max(min(soh, 100), 0)

        # =========================
        # 🔋 SMOOTH RUL MODEL
        # =========================
        remaining_life_ratio = soh / 100
        rul = int((2000 - cycles) * remaining_life_ratio)

        if rul < 20 and soh > 40:
            rul = 20

        # =========================
        # 📊 CONFIDENCE
        # =========================
        if model is None:
            confidence = 65
        else:
            confidence = 85 - (stress_score * 0.4)

        confidence = max(min(round(confidence, 1), 95), 60)

        # =========================
        # 🟢 STATUS LOGIC
        # =========================
        if soh >= 80 and stress_score < 10:
            status = "healthy"
        elif soh >= 60 and stress_score < 25:
            status = "degrading"
        else:
            status = "critical"

        # =========================
        # 💡 RECOMMENDATIONS
        # =========================
        if status == "healthy":
            recommendation = "Battery is in good condition. Maintain conditions."
        elif status == "degrading":
            recommendation = "Battery is aging. Reduce temperature and load."
        else:
            recommendation = "Battery is critical. Replacement recommended."

        # =========================
        # 🚨 ALERTS
        # =========================
        alerts = []

        if temp > 45:
            alerts.append("High temperature risk")

        if current > 4:
            alerts.append("High current load")

        if voltage < 3.2:
            alerts.append("Low voltage stress")

        if cycles > 1500:
            alerts.append("End-of-life cycle region")

        if status == "critical":
            alerts.append("Battery failure risk")

        # =========================
        # ⚠️ WARNINGS (NEW)
        # =========================
        warnings = []

        if voltage < 3.0 or voltage > 4.2:
            warnings.append("Voltage outside normal operating range")

        if temp > 50:
            warnings.append("Extreme temperature condition")

        if cycles > 1800:
            warnings.append("Battery near end-of-life")

        # =========================
        # 📦 FINAL RESPONSE
        # =========================
        return {
            "soh": round(soh, 2),
            "rul": rul,
            "confidence": confidence,
            "status": status,
            "recommendation": recommendation,
            "alerts": alerts,
            "warnings": warnings
        }

    except Exception as e:
        return {"error": str(e)}
