from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
from datetime import datetime

# =========================================================
# CareQueue ML Wait Time API
# =========================================================

app = Flask(__name__)

# Lock CORS to known origins — add your production domain here
CORS(app, origins=[
    "http://127.0.0.1",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5502",
    "http://localhost",
    "http://localhost:5500",
    "http://localhost:5502",
    "https://sd-carequeue.web.app",
    "https://sd-carequeue.firebaseapp.com",
])

# =========================================================
# Load trained model
# =========================================================

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "wait_time_model.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

model = joblib.load(MODEL_PATH)

# Print BEFORE app.run() so it always shows in terminal
print("Model loaded:", MODEL_PATH)
print("MODEL EXPECTED FEATURES:")
print(model.feature_names_in_)

# =========================================================
# MUST MATCH TRAINING FEATURES EXACTLY
# =========================================================

FEATURE_COLS = [
    "clinicID",
    "queuePosition",
    "queueLength",
    "hour",
    "dayOfWeek",
    "isWalkIn",
]

# =========================================================
# Health Check
# =========================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":           "ok",
        "modelLoaded":      True,
        "expectedFeatures": list(model.feature_names_in_)
    })

# =========================================================
# Prediction Endpoint
# =========================================================

@app.route("/predict", methods=["POST"])
def predict():

    try:
        data = request.get_json(force=True)

        # -------------------------------------------------
        # Validate required fields
        # -------------------------------------------------
        required = ["clinicID", "queuePosition", "queueLength", "isWalkIn"]
        missing  = [f for f in required if f not in data]

        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        # -------------------------------------------------
        # Parse inputs
        # clinicID → float64 to avoid int32 overflow (ID > 2.1B)
        # isWalkIn → int (1/0) to match training dtype
        # -------------------------------------------------
        clinicID      = float(data["clinicID"])
        queuePosition = int(data["queuePosition"])
        queueLength   = int(data["queueLength"])
        isWalkIn      = 1 if data["isWalkIn"] else 0

        # -------------------------------------------------
        # Validate values
        # -------------------------------------------------
        if queueLength <= 0:
            return jsonify({"error": "queueLength must be > 0"}), 400

        if queuePosition < 1:
            return jsonify({"error": "queuePosition must be >= 1"}), 400

        if queuePosition > queueLength:
            return jsonify({"error": "queuePosition cannot exceed queueLength"}), 400

        # -------------------------------------------------
        # Time features — derived server-side to match training
        # -------------------------------------------------
        now         = datetime.now()
        hour        = now.hour
        day_of_week = now.weekday()

        # -------------------------------------------------
        # Build model input — column order must match FEATURE_COLS
        # -------------------------------------------------
        features_df = pd.DataFrame([{
            "clinicID":      float(clinicID),
            "queuePosition": int(queuePosition),
            "queueLength":   int(queueLength),
            "hour":          hour,
            "dayOfWeek":     day_of_week,
            "isWalkIn":      isWalkIn,
        }], columns=FEATURE_COLS)

        print("\n Incoming request:")
        print(features_df.to_string())
        print(features_df.dtypes)

        # -------------------------------------------------
        # Prediction
        # -------------------------------------------------
        prediction     = model.predict(features_df)[0]
        estimated_wait = max(1, round(float(prediction)))

        print(f" Predicted wait time: {estimated_wait} minutes")

        # -------------------------------------------------
        # Response
        # -------------------------------------------------
        return jsonify({
            "estimatedWaitTime": estimated_wait,
            "unit":              "minutes",
            "inputs": {
                "clinicID":      int(clinicID),
                "queuePosition": queuePosition,
                "queueLength":   queueLength,
                "hour":          hour,
                "dayOfWeek":     day_of_week,
                "isWalkIn":      isWalkIn,
            }
        })

    except ValueError as e:
        print(f" ValueError: {e}")
        return jsonify({"error": "Invalid numeric input", "detail": str(e)}), 400

    except Exception as e:
        print(f" Error: {e}")
        return jsonify({"error": str(e)}), 500

# =========================================================
# Run server
# =========================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )