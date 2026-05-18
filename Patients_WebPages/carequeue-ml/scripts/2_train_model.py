import pandas as pd
import joblib
import numpy as np
import os

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error

print("Loading queue_data.csv...")

df = pd.read_csv("queue_data.csv")

print(f"-> {len(df)} rows loaded")

# -----------------------------------------
# MINIMUM DATA GUARD
# -----------------------------------------

MIN_ROWS = 200

if len(df) < MIN_ROWS:
    raise ValueError(
        f"Only {len(df)} rows found. Need at least {MIN_ROWS} to train a useful model.\n"
        f"Keep logging queue completions via 3_log_queue_history.py and re-export."
    )

# -----------------------------------------
# FEATURES + ENGINEERING
# -----------------------------------------

BASE_FEATURES = [
    "clinicID",
    "queuePosition",
    "queueLength",
    "hour",
    "dayOfWeek",
    "isWalkIn",
]

# Ensure all base features exist
for col in BASE_FEATURES:
    if col not in df.columns:
        if col == "isWalkIn":
            print(f"Warning: '{col}' missing - defaulting to 0")
            df["isWalkIn"] = 0
        else:
            raise ValueError(f"Missing required column: '{col}'. Re-run 1_export_firestore.py.")

TARGET = "actualWaitTime"

# -----------------------------------------
# CLEAN DATA
# -----------------------------------------

df = df[BASE_FEATURES + [TARGET]].copy()

for col in BASE_FEATURES + [TARGET]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

before = len(df)
df = df.dropna()
after = len(df)

if before != after:
    print(f"Dropped {before - after} rows with nulls ({after} remain)")

print(f"-> {len(df)} rows after cleaning")

# -----------------------------------------
# FEATURE ENGINEERING
# -----------------------------------------

df["isWeekend"] = df["dayOfWeek"].isin([5, 6]).astype(int)
df["isMorningRush"] = df["hour"].isin([8, 9, 10]).astype(int)
df["isAfternoon"] = df["hour"].isin([14, 15, 16]).astype(int)
df["queueRatio"] = df["queuePosition"] / (df["queueLength"] + 1)
df["avgClinicWaitTime"] = df.groupby("clinicID")["actualWaitTime"].transform("mean")

ENGINEERED_FEATURES = BASE_FEATURES + [
    "isWeekend",
    "isMorningRush",
    "isAfternoon",
    "queueRatio",
    "avgClinicWaitTime",
]

print(f"-> Using {len(ENGINEERED_FEATURES)} features (including {len(ENGINEERED_FEATURES) - len(BASE_FEATURES)} engineered)")

# -----------------------------------------
# TRAIN / TEST SPLIT
# -----------------------------------------

X = df[ENGINEERED_FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

print(f"-> Training on {len(X_train)} rows, testing on {len(X_test)} rows")

# -----------------------------------------
# MODEL - Gradient Boosting (better for regression than RF)
# -----------------------------------------

model = GradientBoostingRegressor(
    n_estimators=150,
    learning_rate=0.1,
    max_depth=5,
    min_samples_leaf=4,
    subsample=0.8,
    random_state=42
)

# Cross-validation for robustness
cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="neg_mean_absolute_error")
print(f"Cross-validation MAE: {-cv_scores.mean():.2f} ± {cv_scores.std():.2f} min")

model.fit(X_train, y_train)

print("Model trained")

# -----------------------------------------
# EVALUATION
# -----------------------------------------

test_pred  = model.predict(X_test)
train_pred = model.predict(X_train)

mae_test  = mean_absolute_error(y_test,  test_pred)
mae_train = mean_absolute_error(y_train, train_pred)
rmse_test = np.sqrt(mean_squared_error(y_test, test_pred))

print("\nMODEL PERFORMANCE")
print(f"   MAE  (test)  : {mae_test:.2f} min")
print(f"   MAE  (train) : {mae_train:.2f} min")
print(f"   RMSE (test)  : {rmse_test:.2f} min")

if mae_train < mae_test * 0.5:
    print("\nWARNING: Large gap between train/test MAE - model may be overfitting.")
    print("   Try collecting more data or reducing model complexity.")

print("\nQuality rating:")
if mae_test <= 5:
    print("   Excellent (<= 5 min MAE)")
elif mae_test <= 10:
    print("   Acceptable (5-10 min MAE) - collect more real data to improve")
else:
    print("   Needs more data (> 10 min MAE)")

# -----------------------------------------
# FEATURE IMPORTANCE
# -----------------------------------------

print("\nFeature importance:")
importance = pd.Series(model.feature_importances_, index=ENGINEERED_FEATURES).sort_values(ascending=False)
for feat, score in importance.items():
    bar = "|" * int(score * 40)
    print(f"   {feat:<20} {score:.3f}  {bar}")

# -----------------------------------------
# SAVE MODEL + FEATURES (keep base features for API compatibility)
# -----------------------------------------

out_dir = os.path.join(os.path.dirname(__file__), "..", "api")
os.makedirs(out_dir, exist_ok=True)

model_path       = os.path.join(out_dir, "wait_time_model.pkl")
features_path    = os.path.join(out_dir, "model_features.pkl")
clinic_stats_path = os.path.join(out_dir, "clinic_stats.pkl")

# Calculate clinic statistics for API
clinic_avg_wait = df.groupby("clinicID")["actualWaitTime"].mean().to_dict()

joblib.dump(model,    model_path)
joblib.dump(ENGINEERED_FEATURES, features_path)
joblib.dump(clinic_avg_wait, clinic_stats_path)

print(f"\nModel saved    -> {os.path.abspath(model_path)}")
print(f"Features saved -> {os.path.abspath(features_path)}")
print(f"Clinic stats   -> {os.path.abspath(clinic_stats_path)}")
print("Ready for deployment!")
