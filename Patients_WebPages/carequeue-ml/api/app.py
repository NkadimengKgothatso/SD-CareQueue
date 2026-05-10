from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH    = os.path.join(BASE_DIR, "wait_time_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "model_features.pkl")

# ─────────────────────────────────────────────────────────────
# MODEL LOADING — graceful fallback if not trained yet
# ─────────────────────────────────────────────────────────────

model         = None
FEATURE_COLS  = ["clinicID", "queuePosition", "queueLength", "hour", "dayOfWeek", "isWalkIn"]
model_loaded_at = None

if os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH):
    try:
        model        = joblib.load(MODEL_PATH)
        FEATURE_COLS = joblib.load(FEATURES_PATH)   # always use saved feature schema
        model_loaded_at = datetime.now().isoformat()
        print(f"✅ Model loaded: {MODEL_PATH}")
        print(f"   Features: {FEATURE_COLS}")
    except Exception as e:
        print(f"⚠️  Model file found but failed to load: {e}")
        print("   Falling back to formula-based estimates.")
else:
    print("⚠️  No trained model found — using formula fallback.")
    print(f"   Expected: {MODEL_PATH}")
    print("   Run: cd scripts && python 1_export_firestore.py && python 2_train_model.py")


def formula_fallback(queue_position: int, queue_length: int) -> int:
    """Simple linear estimate used before the model is trained."""
    avg_service_minutes = 8
    return max(1, round(queue_position * avg_service_minutes))


# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":      "ok",
        "modelLoaded": model is not None,
        "mode":        "ml" if model is not None else "formula_fallback",
    })


@app.route("/model-info", methods=["GET"])
def model_info():
    """Quick check of which model is running — useful after retraining."""
    if model is None:
        return jsonify({
            "modelLoaded":  False,
            "mode":         "formula_fallback",
            "features":     FEATURE_COLS,
        })
    return jsonify({
        "modelLoaded":     True,
        "mode":            "ml",
        "features":        FEATURE_COLS,
        "loadedAt":        model_loaded_at,
        "nEstimators":     getattr(model, "n_estimators", "unknown"),
    })


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)

    # ── Required fields ──────────────────────────────────────
    required = ["clinicID", "queuePosition", "queueLength"]
    missing  = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    # ── Parse & validate inputs ──────────────────────────────
    try:
        clinic_id      = int(data["clinicID"])
        queue_position = int(data["queuePosition"])
        queue_length   = int(data["queueLength"])
        is_walk_in     = int(bool(data.get("isWalkIn", False)))   # optional, defaults False

        if queue_length <= 0:
            return jsonify({"error": "queueLength must be > 0"}), 400
        if queue_position < 1:
            return jsonify({"error": "queuePosition must be >= 1"}), 400
        if queue_position > queue_length:
            return jsonify({"error": "queuePosition cannot exceed queueLength"}), 400

    except (ValueError, TypeError):
        return jsonify({"error": "Invalid numeric input"}), 400

    # ── Time features (use current real time) ────────────────
    now         = datetime.now()
    hour        = now.hour
    day_of_week = now.weekday()

    # ── Predict ──────────────────────────────────────────────
    mode = "ml"

    if model is not None:
        try:
            # Build input DataFrame using the exact feature schema the model was trained on
            row = {
                "clinicID":      clinic_id,
                "queuePosition": queue_position,
                "queueLength":   queue_length,
                "hour":          hour,
                "dayOfWeek":     day_of_week,
                "isWalkIn":      is_walk_in,
            }
            # Only pass columns the model knows about (handles old models missing isWalkIn)
            input_df = pd.DataFrame([{k: row[k] for k in FEATURE_COLS if k in row}])
            prediction    = model.predict(input_df)[0]
            estimated_wait = max(1, round(float(prediction)))

        except Exception as e:
            print(f"⚠️  Model prediction failed: {e} — falling back to formula")
            estimated_wait = formula_fallback(queue_position, queue_length)
            mode = "formula_fallback"
    else:
        estimated_wait = formula_fallback(queue_position, queue_length)
        mode = "formula_fallback"

    return jsonify({
        "estimatedWaitTime": estimated_wait,
        "unit":              "minutes",
        "mode":              mode,          # tells the frontend which method was used
        "inputs": {
            "clinicID":      clinic_id,
            "queuePosition": queue_position,
            "queueLength":   queue_length,
            "hour":          hour,
            "dayOfWeek":     day_of_week,
            "isWalkIn":      bool(is_walk_in),
        }
    })


# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
    