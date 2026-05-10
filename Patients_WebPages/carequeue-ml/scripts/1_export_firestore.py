import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
from datetime import datetime

# ─────────────────────────────
# INIT FIREBASE
# ─────────────────────────────
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("🚀 Fetching QueueHistory from Firestore...")

docs = db.collection("QueueHistory").stream()

data = []

for doc in docs:
    d = doc.to_dict()

    queue_length = d.get("queueLength", 0)
    actual_wait_time = d.get("actualWaitTime")

    if actual_wait_time is None or actual_wait_time <= 0:
        continue

    hour = d.get("hour")
    day_of_week = d.get("dayOfWeek")

    created_at = d.get("createdAT")

    if hour is None or day_of_week is None:
        if isinstance(created_at, datetime):
            hour = created_at.hour
            day_of_week = created_at.weekday()
        elif hasattr(created_at, "timestamp"):
            created_at = datetime.utcfromtimestamp(created_at.timestamp())
            hour = created_at.hour
            day_of_week = created_at.weekday()

    # skip broken rows (IMPORTANT for ML quality)
    if None in [d.get("clinicID"), d.get("queuePosition"), queue_length, hour, day_of_week]:
        continue

    data.append({
        "clinicID": d.get("clinicID"),
        "appointmentId": d.get("appointmentId"),
        "userID": d.get("userID"),
        "queuePosition": d.get("queuePosition"),
        "queueLength": queue_length,
        "hour": hour,
        "dayOfWeek": day_of_week,
        "actualWaitTime": actual_wait_time,
    })

df = pd.DataFrame(data)

print(f"📦 Total valid records: {len(df)}")

print(f"🧹 Cleaning dataset...")

df.to_csv("queue_data.csv", index=False)

print("✅ Saved ML dataset to queue_data.csv")
print(f"📊 Wait time range: {df['actualWaitTime'].min():.0f} – {df['actualWaitTime'].max():.0f} min")
print(f"📊 Mean wait: {df['actualWaitTime'].mean():.1f} min")
print("🎯 Ready for training!")