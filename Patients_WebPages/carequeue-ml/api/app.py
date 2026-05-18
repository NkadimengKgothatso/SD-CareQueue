from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "wait_time_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "model_features.pkl")
CLINIC_STATS_PATH = os.path.join(BASE_DIR, "clinic_stats.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

model = joblib.load(MODEL_PATH)
feature_names = joblib.load(FEATURES_PATH) if os.path.exists(FEATURES_PATH) else []

# Load clinic statistics if available (for avgClinicWaitTime)
clinic_stats = {}
if os.path.exists(CLINIC_STATS_PATH):
    clinic_stats = joblib.load(CLINIC_STATS_PATH)

print("Model loaded:", MODEL_PATH)
print(f"Features: {feature_names}")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)

    required = ["clinicID", "queuePosition", "queueLength"]
    missing = [f for f in required if f not in data]

    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        clinicID = int(data["clinicID"])
        queuePosition = int(data["queuePosition"])
        queueLength = int(data["queueLength"])
        isWalkIn = int(data.get("isWalkIn", 0))

        if queueLength <= 0:
            return jsonify({"error": "queueLength must be > 0"}), 400

        if queuePosition < 1:
            return jsonify({"error": "queuePosition must be >= 1"}), 400

        if queuePosition > queueLength:
            return jsonify({
                "error": "queuePosition cannot exceed queueLength"
            }), 400

        if isWalkIn not in [0, 1]:
            return jsonify({"error": "isWalkIn must be 0 or 1"}), 400

    except ValueError:
        return jsonify({"error": "Invalid numeric input"}), 400

    # Time features
    now = datetime.now()
    hour = now.hour
    day_of_week = now.weekday()

    # Compute engineered features
    is_weekend = int(day_of_week in [5, 6])
    is_morning_rush = int(hour in [8, 9, 10])
    is_afternoon = int(hour in [14, 15, 16])
    queue_ratio = queuePosition / (queueLength + 1)
    avg_clinic_wait = clinic_stats.get(clinicID, 30.0)  # Default 30 min if clinic unknown

    features_df = pd.DataFrame([{
        "clinicID": clinicID,
        "queuePosition": queuePosition,
        "queueLength": queueLength,
        "hour": hour,
        "dayOfWeek": day_of_week,
        "isWalkIn": isWalkIn,
        "isWeekend": is_weekend,
        "isMorningRush": is_morning_rush,
        "isAfternoon": is_afternoon,
        "queueRatio": queue_ratio,
        "avgClinicWaitTime": avg_clinic_wait,
    }])

    # Reorder columns to match training
    if feature_names:
        features_df = features_df[feature_names]

    try:
        prediction = model.predict(features_df)[0]
        estimated_wait = max(1, round(float(prediction)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "estimatedWaitTime": estimated_wait,
        "unit": "minutes",
        "inputs": {
            "clinicID": clinicID,
            "queuePosition": queuePosition,
            "queueLength": queueLength,
            "hour": hour,
            "dayOfWeek": day_of_week,
            "isWalkIn": isWalkIn,
        }
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
