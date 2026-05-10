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
skipped = 0

for doc in docs:
    d = doc.to_dict()

    actual_wait_time = d.get("actualWaitTime")

    # ── Must have a valid wait time ──
    if actual_wait_time is None or actual_wait_time <= 0:
        skipped += 1
        continue

    # ── Cap outliers (waits over 3 hours are likely data errors) ──
    if actual_wait_time > 180:
        skipped += 1
        continue

    queue_length  = d.get("queueLength", 0)
    hour          = d.get("hour")
    day_of_week   = d.get("dayOfWeek")

    # ── Fallback: derive hour/dayOfWeek from loggedAt or appointmentTime ──
    if hour is None or day_of_week is None:
        ts = d.get("loggedAt") or d.get("appointmentTime") or d.get("createdAT")
        if ts is not None:
            if hasattr(ts, "timestamp"):
                # Firestore DatetimeWithNanoseconds
                dt = datetime.utcfromtimestamp(ts.timestamp())
            elif isinstance(ts, datetime):
                dt = ts
            else:
                dt = None
            if dt:
                hour        = hour        if hour        is not None else dt.hour
                day_of_week = day_of_week if day_of_week is not None else dt.weekday()

    # ── Skip rows still missing key features ──
    if None in [d.get("clinicID"), d.get("queuePosition"), queue_length, hour, day_of_week]:
        skipped += 1
        continue

    data.append({
        "clinicID":       d.get("clinicID"),
        "appointmentId":  d.get("appointmentId"),
        "userID":         d.get("userID"),
        "queuePosition":  d.get("queuePosition"),
        "queueLength":    queue_length,
        "hour":           int(hour),
        "dayOfWeek":      int(day_of_week),
        "isWalkIn":       int(bool(d.get("isWalkIn", False))),  # 0 or 1
        "actualWaitTime": actual_wait_time,
        "source":         d.get("source", "real"),              # track synthetic vs real
    })

df = pd.DataFrame(data)

print(f"📦 Total valid records : {len(df)}")
print(f"🗑️  Skipped records     : {skipped}")

if df.empty:
    print("⚠️  No valid data found. Check your QueueHistory collection.")
else:
    # ── Show synthetic vs real split ──
    if "source" in df.columns:
        counts = df["source"].value_counts()
        print(f"\n📋 Data source breakdown:")
        for src, cnt in counts.items():
            print(f"   {src}: {cnt} rows")

    df.to_csv("queue_data.csv", index=False)
    print("\n✅ Saved ML dataset → queue_data.csv")
    print(f"📊 Wait time range : {df['actualWaitTime'].min():.0f} – {df['actualWaitTime'].max():.0f} min")
    print(f"📊 Mean wait       : {df['actualWaitTime'].mean():.1f} min")
    print(f"📊 Rows exported   : {len(df)}")
    print("🎯 Ready for training!")