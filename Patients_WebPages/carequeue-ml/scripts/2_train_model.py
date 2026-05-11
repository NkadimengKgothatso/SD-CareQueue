import pandas as pd
import joblib
import numpy as np
import os

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
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
# FEATURES — must exactly match app.py FEATURE_COLS
# -----------------------------------------

FEATURES = [
    "clinicID",
    "queuePosition",
    "queueLength",
    "hour",
    "dayOfWeek",
    "isWalkIn",
]

TARGET = "actualWaitTime"

# -----------------------------------------
# VALIDATE COLUMNS
# -----------------------------------------
missing = [c for c in FEATURES + [TARGET] if c not in df.columns]

if missing:
    for col in missing:
        if col == "isWalkIn":
            print(f"WARNING: '{col}' column missing — defaulting to 0.")
            print("         Re-run 1_export_firestore.py for better accuracy.")
            df["isWalkIn"] = 0
        else:
            raise ValueError(
                f"Missing required column: '{col}'. Re-run 1_export_firestore.py."
            )

# -----------------------------------------
# CLEAN DATA
# -----------------------------------------
df = df[FEATURES + [TARGET]].copy()

for col in FEATURES + [TARGET]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df["isWalkIn"] = df["isWalkIn"].fillna(0).astype(int)

before = len(df)
df     = df.dropna()
after  = len(df)

if before != after:
    print(f"Dropped {before - after} rows with nulls ({after} remain)")

# -----------------------------------------
# OUTLIER REMOVAL
# FIX: Synthetic data had wait times up to 517 min which is
# unrealistic for a clinic. Cap at 120 min (2 hours) which is
# the real-world maximum for a walk-in clinic visit.
# Also remove wait times under 3 min (likely data errors).
# -----------------------------------------
MAX_WAIT = 120   # minutes — realistic clinic maximum
MIN_WAIT = 3     # minutes — minimum realistic wait

before = len(df)
df = df[(df[TARGET] >= MIN_WAIT) & (df[TARGET] <= MAX_WAIT)]
after = len(df)

if before != after:
    print(f"Removed {before - after} outlier rows (wait < {MIN_WAIT} or > {MAX_WAIT} min) — {after} remain")

print(f"-> {len(df)} rows after cleaning")
print(f"   Walk-in ratio : {df['isWalkIn'].mean():.1%}")
print(f"   Wait time range: {df[TARGET].min():.0f} - {df[TARGET].max():.0f} min")
print(f"   Mean wait time : {df[TARGET].mean():.1f} min")
print(f"   Clinics        : {sorted(df['clinicID'].unique().astype(int).tolist())}")

# -----------------------------------------
# TRAIN / TEST SPLIT
# -----------------------------------------
X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

print(f"-> Training on {len(X_train)} rows, testing on {len(X_test)} rows")

# -----------------------------------------
# MODEL
# -----------------------------------------
model = RandomForestRegressor(
    n_estimators=300,
    max_depth=12,          # FIX: reduced from 15 to reduce overfitting
    min_samples_leaf=4,    # FIX: increased from 2 to reduce overfitting
    random_state=42,
    n_jobs=-1
)

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
    print("\nWARNING: Large gap between train/test MAE — model may be overfitting.")
    print("   Try reducing max_depth further or increasing min_samples_leaf.")

print("\nQuality rating:")
if mae_test <= 5:
    print("   Excellent (<= 5 min MAE)")
elif mae_test <= 10:
    print("   Acceptable (5-10 min MAE) — collect more real data to improve")
else:
    print("   Needs more data (> 10 min MAE)")

# -----------------------------------------
# FEATURE IMPORTANCE
# -----------------------------------------
print("\nFeature importance:")
importance = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
for feat, score in importance.items():
    bar = "|" * int(score * 40)
    print(f"   {feat:<16} {score:.3f}  {bar}")

# -----------------------------------------
# SAVE MODEL + FEATURES
# -----------------------------------------
out_dir = os.path.join(os.path.dirname(__file__), "..", "api")
os.makedirs(out_dir, exist_ok=True)

model_path    = os.path.join(out_dir, "wait_time_model.pkl")
features_path = os.path.join(out_dir, "model_features.pkl")

joblib.dump(model,    model_path)
joblib.dump(FEATURES, features_path)

print(f"\nModel saved    -> {os.path.abspath(model_path)}")
print(f"Features saved -> {os.path.abspath(features_path)}")

loaded = joblib.load(model_path)
print(f"\nVerification — model.feature_names_in_:")
print(f"   {list(loaded.feature_names_in_)}")
print("Ready for deployment!")