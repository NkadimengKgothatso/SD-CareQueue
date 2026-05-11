from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
from datetime import datetime




# this is a simple Flask API for predicting wait times based on a pre-trained model. 
# It includes input validation and error handling to ensure robust predictions.
app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "wait_time_model.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

model = joblib.load(MODEL_PATH)
print(" Model loaded:", MODEL_PATH)

FEATURE_COLS = [
    "clinicID",
    "queuePosition",
    "queueLength",
    "isWalkIn",
    "hour",
    "dayOfWeek"
]




# Health check endpoint to verify the API is running
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})




# Prediction endpoint that accepts JSON input and returns estimated wait time
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

        if queueLength <= 0:
            return jsonify({"error": "queueLength must be > 0"}), 400

        if queuePosition < 1:
            return jsonify({"error": "queuePosition must be >= 1"}), 400

        #  FIX: do NOT silently clamp
        if queuePosition > queueLength:
            return jsonify({
                "error": "queuePosition cannot exceed queueLength"
            }), 400

    except ValueError:
        return jsonify({"error": "Invalid numeric input"}), 400
    



    
# the time features (hour and day of week) are fixed to the current time to ensure consistency with the training data,
#  which also used the current time for these features.
#  This allows the model to make predictions based on the same temporal context it was trained on.
    # ── FIXED TIME FEATURES (consistent with training) ──
    now = datetime.now()
    hour = now.hour
    day_of_week = now.weekday()


# the input features are organized into a DataFrame in the same order as the model expects,
#  ensuring that the prediction is based on the correct feature mapping.
    features_df = pd.DataFrame([{
        "clinicID": clinicID,
        "queuePosition": queuePosition,
        "queueLength": queueLength,
        "hour": hour,
        "dayOfWeek": day_of_week,
    }], columns=FEATURE_COLS)



# the model's prediction is obtained and rounded to the nearest minute,
#  with a minimum of 1 minute to avoid zero or negative wait times.

    try:
        prediction = model.predict(features_df)[0]
        estimated_wait = max(1, round(float(prediction)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    



# the API returns a JSON response containing the estimated wait time, the unit of measurement,
#  and the input features used for the prediction.
    return jsonify({
        "estimatedWaitTime": estimated_wait,
        "unit": "minutes",
        "inputs": {
            "clinicID": clinicID,
            "queuePosition": queuePosition,
            "queueLength": queueLength,
            "hour": hour,
            "dayOfWeek": day_of_week,
        }
    })

# the API is run on host
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)