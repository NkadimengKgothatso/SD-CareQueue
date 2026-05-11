import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
from datetime import datetime

# -----------------------------------------
# INIT FIREBASE
# -----------------------------------------
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("Fetching QueueHistory from Firestore...")

docs = db.collection("QueueHistory").stream()

data = []

for doc in docs:
    d = doc.to_dict()

    queue_length     = d.get("queueLength", 0)
    actual_wait_time = d.get("actualWaitTime")

    if actual_wait_time is None or actual_wait_time <= 0:
        continue

    hour        = d.get("hour")
    day_of_week = d.get("dayOfWeek")
    created_at  = d.get("createdAT")

    # The time features (hour and dayOfWeek) are derived from createdAT if
    # not explicitly stored, ensuring consistency with the training assumption
    # that uses the time the patient joined the queue.
    if hour is None or day_of_week is None:
        if isinstance(created_at, datetime):
            hour        = created_at.hour
            day_of_week = created_at.weekday()
        elif hasattr(created_at, "timestamp"):
            created_at  = datetime.utcfromtimestamp(created_at.timestamp())
            hour        = created_at.hour
            day_of_week = created_at.weekday()

    # FIX: isWalkIn exported as int (1/0) to match model training dtype.
    # Handles bool, int, string, or missing values from Firestore.
    raw_walk_in = d.get("isWalkIn", False)
    if isinstance(raw_walk_in, bool):
        is_walk_in = 1 if raw_walk_in else 0
    elif isinstance(raw_walk_in, str):
        is_walk_in = 1 if raw_walk_in.lower() in ("true", "1", "yes") else 0
    else:
        is_walk_in = int(bool(raw_walk_in))

    # Skip rows missing any required feature
    if None in [d.get("clinicID"), d.get("queuePosition"), queue_length, hour, day_of_week]:
        continue

    # Each valid record is appended to the data list as a dictionary,
    # which will later be converted into a DataFrame for cleaning and
    # saving as a CSV file.
    data.append({
        "clinicID":       d.get("clinicID"),
        "appointmentId":  d.get("appointmentId"),
        "userID":         d.get("userID"),
        "queuePosition":  d.get("queuePosition"),
        "queueLength":    queue_length,
        "hour":           hour,
        "dayOfWeek":      day_of_week,
        "isWalkIn":       is_walk_in,        # FIX: now included and typed as int
        "actualWaitTime": actual_wait_time,
    })

# The collected data is converted into a DataFrame,
# and basic statistics about the dataset are printed to the console.
df = pd.DataFrame(data)

print(f"Total valid records: {len(df)}")
print("Cleaning dataset...")

# Convert all columns to numeric and drop rows with missing values.
for col in ["clinicID", "queuePosition", "queueLength", "hour", "dayOfWeek", "isWalkIn", "actualWaitTime"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

before = len(df)
df     = df.dropna(subset=["clinicID", "queuePosition", "queueLength", "hour", "dayOfWeek", "isWalkIn", "actualWaitTime"])
after  = len(df)

if before != after:
    print(f"Dropped {before - after} rows with nulls ({after} remain)")


df["isWalkIn"] = df["isWalkIn"].astype(int)

df.to_csv("queue_data.csv", index=False)

print(f"Saved ML dataset to queue_data.csv")
print(f"Wait time range: {df['actualWaitTime'].min():.0f} - {df['actualWaitTime'].max():.0f} min")
print(f"Mean wait: {df['actualWaitTime'].mean():.1f} min")
print(f"Walk-in ratio: {df['isWalkIn'].mean():.1%}")
print("Ready for training!")