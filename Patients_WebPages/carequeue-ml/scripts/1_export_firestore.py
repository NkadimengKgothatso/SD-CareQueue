"""
STEP 1 — Export Firestore QueueHistory to CSV
=============================================
Reads actualWaitTime directly from Firestore — does NOT recalculate it.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# ─────────────────────────────────────────────
# INIT FIREBASE
# ─────────────────────────────────────────────
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("🚀 Fetching QueueHistory from Firestore...")
# ─────────────────────────────────────────────
# FETCH DATA
# ─────────────────────────────────────────────
docs = db.collection("QueueHistory").stream()

data = []

for doc in docs:
    d = doc.to_dict()

    # Queue length — handle both spellings
    queue_length = d.get("queueLength") or d.get("queuelength") or 0

    # ── READ actualWaitTime directly from Firestore ──────────────────
    # Never recalculate — the value was already computed correctly
    # when the record was written by the logger/generator.
    actual_wait_time = d.get("actualWaitTime")

    # Skip records with missing or non-positive wait times
    if actual_wait_time is None or actual_wait_time <= 0:
        continue

    # ── Features ─────────────────────────────────────────────────────
    hour        = d.get("hour")
    day_of_week = d.get("dayOfWeek")

    # Fallback: derive from createdAT if hour/dayOfWeek missing
    if hour is None or day_of_week is None:
        created_at = d.get("createdAT")
        try:
            if hasattr(created_at, "timestamp"):
                from datetime import datetime
                created_at = datetime.utcfromtimestamp(created_at.timestamp())
            if created_at:
                hour        = created_at.hour
                day_of_week = created_at.weekday()
        except Exception:
            pass

    row = {
        "clinicID":       d.get("clinicID"),
        "appointmentId":  d.get("appointmentId"),
        "userID":         d.get("userID"),
        "queuePosition":  d.get("queuePosition"),
        "queueLength":    queue_length,
        "hour":           hour,
        "dayOfWeek":      day_of_week,
        "actualWaitTime": actual_wait_time,   # ← read directly, never recalculated
    }

    data.append(row)

# ─────────────────────────────────────────────
# BUILD AND SAVE CSV
# ─────────────────────────────────────────────
df = pd.DataFrame(data)

print(f"📦 Total records fetched: {len(df)}")

before = len(df)
df = df.dropna(subset=["clinicID", "queuePosition", "queueLength",
                        "hour", "dayOfWeek", "actualWaitTime"])
print(f"🧹 Removed {before - len(df)} invalid rows")

df.to_csv("queue_data.csv", index=False)

print(f"✅ Saved ML dataset to queue_data.csv")
print(f"   Wait time range: {df['actualWaitTime'].min():.0f} – {df['actualWaitTime'].max():.0f} min")
print(f"   Mean wait: {df['actualWaitTime'].mean():.1f} min")
print("🎯 Ready for Random Forest training!")