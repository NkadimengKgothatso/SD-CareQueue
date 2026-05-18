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

# Enforce minimum dataset size for statistical significance
# Too few samples lead to overfitting and unreliable predictions
MIN_ROWS = 200

if len(df) < MIN_ROWS:
    raise ValueError(
        f"Only {len(df)} rows found. Need at least {MIN_ROWS} to train a useful model.\n"
        f"Keep logging queue completions via 3_log_queue_history.py and re-export."
    )

# Core features directly observable from queue state
BASE_FEATURES = [
    "clinicID",
    "queuePosition",
    "queueLength",
    "hour",
    "dayOfWeek",
    "isWalkIn",
]

# Ensure all required features exist in the dataset
for col in BASE_FEATURES:
    if col not in df.columns:
        if col == "isWalkIn":
            print(f"Warning: '{col}' missing - defaulting to 0")
            df["isWalkIn"] = 0
        else:
            raise ValueError(f"Missing required column: '{col}'. Re-run 1_export_firestore.py.")

# Target variable: actual wait time observed at clinic
TARGET = "actualWaitTime"

# Select only the columns we need and convert to numeric
df = df[BASE_FEATURES + [TARGET]].copy()

for col in BASE_FEATURES + [TARGET]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# Remove rows with missing values (NaN)
before = len(df)
df = df.dropna()
after = len(df)

if before != after:
    print(f"Dropped {before - after} rows with nulls ({after} remain)")

print(f"-> {len(df)} rows after cleaning")

# Engineer additional features that improve prediction accuracy
# These capture temporal patterns and queue dynamics observed in real clinics
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

# Split data into training set (80%) and test set (20%) with fixed random seed
# This ensures reproducible results across model retraining
X = df[ENGINEERED_FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

print(f"-> Training on {len(X_train)} rows, testing on {len(X_test)} rows")

# Gradient Boosting Regressor: superior to Random Forest for this regression task
# because it better captures nonlinear relationships between queue metrics and wait time
model = GradientBoostingRegressor(
    n_estimators=150,
    learning_rate=0.1,
    max_depth=5,
    min_samples_leaf=4,
    subsample=0.8,
    random_state=42
)

# Cross-validation: evaluate model performance on 5 different data splits
# Helps detect overfitting and provides more reliable performance estimates
cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="neg_mean_absolute_error")
print(f"Cross-validation MAE: {-cv_scores.mean():.2f} ± {cv_scores.std():.2f} min")

model.fit(X_train, y_train)

print("Model trained")

# Evaluate model on both training and test data
test_pred  = model.predict(X_test)
train_pred = model.predict(X_train)

mae_test  = mean_absolute_error(y_test,  test_pred)
mae_train = mean_absolute_error(y_train, train_pred)
rmse_test = np.sqrt(mean_squared_error(y_test, test_pred))

print("\nMODEL PERFORMANCE")
print(f"   MAE  (test)  : {mae_test:.2f} min")
print(f"   MAE  (train) : {mae_train:.2f} min")
print(f"   RMSE (test)  : {rmse_test:.2f} min")

# Warn if training error is much lower than test error (sign of overfitting)
if mae_train < mae_test * 0.5:
    print("\nWARNING: Large gap between train/test MAE - model may be overfitting.")
    print("   Try collecting more data or reducing model complexity.")

# Provide quality assessment based on test error
print("\nQuality rating:")
if mae_test <= 5:
    print("   Excellent (<= 5 min MAE)")
elif mae_test <= 10:
    print("   Acceptable (5-10 min MAE) - collect more real data to improve")
else:
    print("   Needs more data (> 10 min MAE)")

# Display which features are most important for predictions
print("\nFeature importance:")
importance = pd.Series(model.feature_importances_, index=ENGINEERED_FEATURES).sort_values(ascending=False)
for feat, score in importance.items():
    bar = "|" * int(score * 40)
    print(f"   {feat:<20} {score:.3f}  {bar}")

# Save the trained model and feature metadata to disk for deployment
# The API will load these files to make real-time predictions
out_dir = os.path.join(os.path.dirname(__file__), "..", "api")
os.makedirs(out_dir, exist_ok=True)

model_path       = os.path.join(out_dir, "wait_time_model.pkl")
features_path    = os.path.join(out_dir, "model_features.pkl")
clinic_stats_path = os.path.join(out_dir, "clinic_stats.pkl")

# Pre-compute clinic-level statistics to use as features and fallback values
clinic_avg_wait = df.groupby("clinicID")["actualWaitTime"].mean().to_dict()

joblib.dump(model,    model_path)
joblib.dump(ENGINEERED_FEATURES, features_path)
joblib.dump(clinic_avg_wait, clinic_stats_path)

print(f"\nModel saved    -> {os.path.abspath(model_path)}")
print(f"Features saved -> {os.path.abspath(features_path)}")
print(f"Clinic stats   -> {os.path.abspath(clinic_stats_path)}")
print("Ready for deployment!")
