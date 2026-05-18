from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Load model and feature paths from the same directory as this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "wait_time_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "model_features.pkl")
CLINIC_STATS_PATH = os.path.join(BASE_DIR, "clinic_stats.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

# Load the trained gradient boosting model used for wait time predictions
model = joblib.load(MODEL_PATH)
# Load feature names to ensure API input matches training data column order
feature_names = joblib.load(FEATURES_PATH) if os.path.exists(FEATURES_PATH) else []

# Load pre-computed average wait times per clinic used as a fallback/baseline feature
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
    """
    Predict wait time for a patient in queue.

    Expected JSON input:
    - clinicID (required): numeric clinic identifier
    - queuePosition (required): patient's position in queue (1-indexed)
    - queueLength (required): total number of patients in queue
    - isWalkIn (optional): 1 if walk-in, 0 if appointment (defaults to 0)

    Returns JSON with estimatedWaitTime in minutes and input echoed back.
    """
    data = request.get_json(force=True)

    # Validate required fields are present
    required = ["clinicID", "queuePosition", "queueLength"]
    missing = [f for f in required if f not in data]

    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        # Parse and validate numeric inputs
        clinicID = int(data["clinicID"])
        queuePosition = int(data["queuePosition"])
        queueLength = int(data["queueLength"])
        isWalkIn = int(data.get("isWalkIn", 0))

        # Enforce business logic constraints
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

    # Extract current time features for model input
    now = datetime.now()
    hour = now.hour
    day_of_week = now.weekday()

    # Engineer features that improve model performance
    # These features capture patterns like morning rush behavior, weekend patterns, etc.
    is_weekend = int(day_of_week in [5, 6])
    is_morning_rush = int(hour in [8, 9, 10])
    is_afternoon = int(hour in [14, 15, 16])
    queue_ratio = queuePosition / (queueLength + 1)
    avg_clinic_wait = clinic_stats.get(clinicID, 30.0)  # Default 30 min if clinic unknown

    # Build feature dataframe with all required features for the model
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

    # Reorder columns to match the order seen during model training
    # This is critical for gradient boosting model accuracy
    if feature_names:
        features_df = features_df[feature_names]

    try:
        # Generate prediction from trained gradient boosting model
        prediction = model.predict(features_df)[0]
        # Enforce minimum 1 minute wait time and round to nearest minute
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
