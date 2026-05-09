"""
Flask API — Wait Time Prediction
=================================
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────────
# SAFE MODEL LOADING
# ─────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "wait_time_model.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

model = joblib.load(MODEL_PATH)
print("✅ Model loaded:", MODEL_PATH)


# ─────────────────────────────────────────────
# FEATURE COLUMNS — must match training order
# ─────────────────────────────────────────────
FEATURE_COLS = ["clinicID", "queuePosition", "queueLength", "hour", "dayOfWeek"]


# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "wait_time_model.pkl"})


# ─────────────────────────────────────────────
# PREDICT ENDPOINT
# ─────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json(force=True)

    # ── Validation ────────────────────────────
    required = ["clinicID", "queuePosition", "queueLength"]
    missing  = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        clinicID      = int(data["clinicID"])
        queuePosition = int(data["queuePosition"])
        queueLength   = int(data["queueLength"])

        if queueLength   <= 0: return jsonify({"error": "queueLength must be > 0"}), 400
        if queuePosition <  1: return jsonify({"error": "queuePosition must be >= 1"}), 400
        if queuePosition > queueLength:
            queuePosition = queueLength

    except ValueError:
        return jsonify({"error": "Invalid numeric input"}), 400

    # ── Time features ─────────────────────────
    now         = datetime.now()
    hour        = int(data.get("hour",      now.hour))
    day_of_week = int(data.get("dayOfWeek", now.weekday()))

    # ── Build DataFrame (matches training columns exactly) ────────────
    features_df = pd.DataFrame([{
        "clinicID":      clinicID,
        "queuePosition": queuePosition,
        "queueLength":   queueLength,
        "hour":          hour,
        "dayOfWeek":     day_of_week,
    }], columns=FEATURE_COLS)

    # ── Predict ───────────────────────────────
    try:
        prediction    = model.predict(features_df)[0]
        estimated_wait = max(1, round(float(prediction)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # ── Response ──────────────────────────────
    return jsonify({
        "estimatedWaitTime": estimated_wait,
        "unit":              "minutes",
        "confidence":        "random_forest_model",
        "inputs": {
            "clinicID":      clinicID,
            "queuePosition": queuePosition,
            "queueLength":   queueLength,
            "hour":          hour,
            "dayOfWeek":     day_of_week,
        }
    })


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)