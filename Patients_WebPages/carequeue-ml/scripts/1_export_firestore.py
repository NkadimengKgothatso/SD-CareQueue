"""
STEP 1 — Export Firestore QueueHistory to CSV (FIXED VERSION)
============================================================
Exports QueueHistory from Firestore into CSV for ML training.

Matches your actual database structure:
- createdAT (timestamp)
- appointmentTime (timestamp)
- queuePosition
- queuelength
- clinicID

Requirements:
    pip install firebase-admin pandas
"""

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# ─────────────────────────────────────────────────────────────
# INIT FIREBASE
# ─────────────────────────────────────────────────────────────
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

print("🚀 Fetching QueueHistory from Firestore...")

# ─────────────────────────────────────────────────────────────
# FETCH DATA
# ─────────────────────────────────────────────────────────────
docs = db.collection("QueueHistory").stream()

data = []

for doc in docs:
    d = doc.to_dict()

    # ─────────────────────────────────────────────────────────
    # FIX: queue length field (typo-safe)
    # ─────────────────────────────────────────────────────────
    queue_length = (
        d.get("queuelength")
        or d.get("queueLength")
        or 0
    )

    # ─────────────────────────────────────────────────────────
    # TIMESTAMPS (Firestore Timestamp → Python datetime)
    # ─────────────────────────────────────────────────────────
    created_at = d.get("createdAT")
    appointment_time = d.get("appointmentTime")

    actual_wait_time = None

    try:
        if created_at and appointment_time:

            # Convert Firestore Timestamp → datetime
            if hasattr(created_at, "to_datetime"):
                created_at = created_at.to_datetime()

            if hasattr(appointment_time, "to_datetime"):
                appointment_time = appointment_time.to_datetime()

            # ───────────────────────────────────────────────
            # TARGET VARIABLE: actual wait time (MINUTES)
            # actual = createdAT - appointmentTime
            # ───────────────────────────────────────────────
            actual_wait_time = round(
                (created_at - appointment_time).total_seconds() / 60
            )

    except Exception as e:
        print(f"⚠ Error computing wait time for {doc.id}: {e}")

    # ─────────────────────────────────────────────────────────
    # FEATURE ENGINEERING
    # ─────────────────────────────────────────────────────────
    hour = None
    day_of_week = None

    try:
        if created_at and hasattr(created_at, "hour"):
            hour = created_at.hour
            day_of_week = created_at.weekday()

    except Exception:
        pass

    # ─────────────────────────────────────────────────────────
    # BUILD CLEAN ROW
    # ─────────────────────────────────────────────────────────
    row = {

        # IDs
        "clinicID": d.get("clinicID"),
        "appointmentId": d.get("appointmentId"),
        "userID": d.get("userID"),

        # Queue info
        "queuePosition": d.get("queuePosition"),
        "queueLength": queue_length,

        # Timing
        "createdAT": created_at,
        "appointmentTime": appointment_time,

        # Features
        "hour": hour,
        "dayOfWeek": day_of_week,
        "isWalkIn": d.get("isWalkIn", False),

        # TARGET (ML LABEL)
        "actualWaitTime": actual_wait_time
    }

    data.append(row)

# ─────────────────────────────────────────────────────────────
# CREATE DATAFRAME
# ─────────────────────────────────────────────────────────────
df = pd.DataFrame(data)

print(f"📦 Total records fetched: {len(df)}")

# ─────────────────────────────────────────────────────────────
# CLEAN DATA
# ─────────────────────────────────────────────────────────────
before = len(df)

df = df.dropna(subset=["actualWaitTime"])

print(f"🧹 Removed {before - len(df)} invalid rows")

# ─────────────────────────────────────────────────────────────
# SAVE CSV
# ─────────────────────────────────────────────────────────────
output_file = "queue_data.csv"
df.to_csv(output_file, index=False)

print(f"✅ Saved ML dataset to {output_file}")
print("🎯 Ready for Random Forest training!")