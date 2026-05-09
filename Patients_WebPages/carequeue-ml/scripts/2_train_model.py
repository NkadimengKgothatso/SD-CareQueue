"""
STEP 2 — Train Random Forest Model (FIXED)
===========================================
"""

import pandas as pd
import joblib
import numpy as np

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error


# ─────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────
print("Loading queue_data.csv...")

df = pd.read_csv("queue_data.csv")

print(f"→ {len(df)} rows loaded")


# ─────────────────────────────────────────────
# NORMALISE COLUMN NAMES (VERY IMPORTANT)
# ─────────────────────────────────────────────

if "queueLength" not in df.columns and "queuelength" in df.columns:
    df["queueLength"] = df["queuelength"]


# ─────────────────────────────────────────────
# FEATURES
# ─────────────────────────────────────────────

FEATURES = [
    "clinicID",
    "queuePosition",
    "queueLength",
    "hour",
    "dayOfWeek",
]

TARGET = "actualWaitTime"


# ─────────────────────────────────────────────
# VALIDATE COLUMNS
# ─────────────────────────────────────────────

missing = [c for c in FEATURES + [TARGET] if c not in df.columns]

if missing:
    raise ValueError(f"Missing columns: {missing}")


# ─────────────────────────────────────────────
# CLEAN DATA
# ─────────────────────────────────────────────

df = df[FEATURES + [TARGET]].dropna()


# ─────────────────────────────────────────────
# TYPE FIXING (IMPORTANT FOR RF)
# ─────────────────────────────────────────────

for col in FEATURES:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")

df = df.dropna()


print(f"→ {len(df)} rows after cleaning")


# ─────────────────────────────────────────────
# CHECK DATA SIZE
# ─────────────────────────────────────────────

if len(df) < 100:
    print("⚠ WARNING: Less than 100 rows — model will be weak")
elif len(df) < 500:
    print("⚠ OK dataset — better results expected with more data")
else:
    print("✅ Good dataset size")


# ─────────────────────────────────────────────
# SPLIT DATA
# ─────────────────────────────────────────────

X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)


# ─────────────────────────────────────────────
# TRAIN MODEL
# ─────────────────────────────────────────────

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("✅ Model trained")


# ─────────────────────────────────────────────
# EVALUATION
# ─────────────────────────────────────────────

pred = model.predict(X_test)

mae = mean_absolute_error(y_test, pred)
rmse = np.sqrt(mean_squared_error(y_test, pred))

print("\n📊 MODEL PERFORMANCE")
print(f"MAE  : {mae:.2f} minutes")
print(f"RMSE : {rmse:.2f} minutes")


# ─────────────────────────────────────────────
# FEATURE IMPORTANCE
# ─────────────────────────────────────────────

print("\n🔍 Feature importance:")

importance = pd.Series(model.feature_importances_, index=FEATURES)
importance = importance.sort_values(ascending=False)

for k, v in importance.items():
    print(f"{k:<15} {v:.3f}")


# ─────────────────────────────────────────────
# SAVE MODEL
# ─────────────────────────────────────────────

joblib.dump(model, "wait_time_model.pkl")

print("\n💾 Model saved as wait_time_model.pkl")
print("🎯 Ready for deployment!")