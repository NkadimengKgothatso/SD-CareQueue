"""
generate_synthetic_data.py
==========================
Generates 200 realistic synthetic QueueHistory records over the last 3 months
based on your actual clinic IDs and realistic South African clinic patterns.

Run from scripts/ folder:
    python generate_synthetic_data.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import random


# ─────────────────────────────────────────────
# INIT FIREBASE
# ─────────────────────────────────────────────
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()


# ─────────────────────────────────────────────
# CONFIG — matches your actual Firestore data
# ─────────────────────────────────────────────
CLINIC_IDS = [
    10002143430,
    9051104017,
    617067000,      # seen in your export
]

# Clinic opening hours (start_hour, end_hour)
CLINIC_HOURS = {
    10002143430: (7, 17),
    9051104017:  (8, 16),
    617067000:   (7, 15),
}

# Realistic queue sizes per clinic (min, max)
QUEUE_SIZES = {
    10002143430: (5, 25),
    9051104017:  (3, 18),
    617067000:   (4, 20),
}

# Realistic wait times vary by:
# - time of day (mornings busier → longer waits)
# - day of week (Mondays busiest)
# - queue position (later = longer wait)

TARGET_RECORDS = 200
DAYS_BACK      = 90   # 3 months


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def realistic_wait(position, queue_length, hour, day_of_week):
    """
    Generate a realistic wait time in minutes based on context.
    Models real clinic behaviour:
    - Morning rush (8-10am): longer waits
    - Lunch dip (12-13): shorter
    - Monday spike: +20%
    - Position matters most
    """
    # Base: ~12 min per person ahead
    base = position * random.uniform(8, 15)

    # Time-of-day multiplier
    if 7 <= hour <= 9:
        tod = random.uniform(1.3, 1.6)   # morning rush
    elif 10 <= hour <= 11:
        tod = random.uniform(1.1, 1.3)
    elif 12 <= hour <= 13:
        tod = random.uniform(0.8, 1.0)   # lunch dip
    elif 14 <= hour <= 15:
        tod = random.uniform(1.0, 1.2)
    else:
        tod = random.uniform(0.7, 0.9)   # late afternoon quieter

    # Day-of-week multiplier (0=Monday)
    dow_mult = {0: 1.3, 1: 1.1, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.8, 6: 0.7}
    dow = dow_mult.get(day_of_week, 1.0)

    # Queue pressure: longer queues = slightly longer per-person time
    pressure = 1.0 + (queue_length / 100)

    wait = base * tod * dow * pressure

    # Add some natural noise
    wait += random.gauss(0, 3)

    return max(5, round(wait))   # minimum 5 min wait


def random_weekday_date(days_back):
    """Pick a random date within the last N days, skipping Sundays."""
    while True:
        offset = random.randint(1, days_back)
        date = datetime.now() - timedelta(days=offset)
        if date.weekday() != 6:   # skip Sundays (clinics closed)
            return date


# ─────────────────────────────────────────────
# GENERATE RECORDS
# ─────────────────────────────────────────────
print(f"⚙️  Generating {TARGET_RECORDS} synthetic QueueHistory records...\n")

written = 0
skipped = 0

batch_write = db.batch()
batch_count = 0
MAX_BATCH   = 400

while written < TARGET_RECORDS:

    clinic_id = random.choice(CLINIC_IDS)
    open_hour, close_hour = CLINIC_HOURS[clinic_id]
    min_q, max_q = QUEUE_SIZES[clinic_id]

    # Pick a random date and hour within clinic hours
    base_date  = random_weekday_date(DAYS_BACK)
    hour       = random.randint(open_hour, close_hour - 1)
    minute     = random.choice([0, 15, 30, 45])
    day_of_week = base_date.weekday()

    # Queue state
    queue_length  = random.randint(min_q, max_q)
    position      = random.randint(1, queue_length)

    # appointmentTime: the scheduled slot
    appointment_time = base_date.replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )

    # actualWaitTime: realistic based on context
    actual_wait = realistic_wait(position, queue_length, hour, day_of_week)

    # createdAT: patient joined the queue `actual_wait` minutes before appointment
    # Add small noise so it's not perfectly clean
    arrival_offset = actual_wait + random.randint(-2, 2)
    arrival_offset = max(5, arrival_offset)
    created_at = appointment_time - timedelta(minutes=arrival_offset)

    # Synthetic appointment and user IDs
    appt_id = f"synthetic_{written:04d}_{random.randint(1000,9999)}"
    user_id = f"synthetic_user_{random.randint(100, 999)}"

    record = {
        "clinicID":        int(clinic_id),
        "appointmentId":   appt_id,
        "userID":          user_id,

        "queuePosition":   position,
        "queueLength":     queue_length,

        "createdAT":       created_at,
        "appointmentTime": appointment_time,

        "hour":            created_at.hour,
        "dayOfWeek":       day_of_week,

        "actualWaitTime":  actual_wait,

        "loggedAt":        datetime.now(),
        "source":          "synthetic",
    }

    new_ref = db.collection("QueueHistory").document()
    batch_write.set(new_ref, record)
    batch_count += 1
    written += 1

    print(
        f"   [{written:>3}/{TARGET_RECORDS}] clinic={clinic_id} | "
        f"pos={position}/{queue_length} | "
        f"hour={hour:02d}:{minute:02d} | "
        f"day={day_of_week} | wait={actual_wait} min"
    )

    if batch_count >= MAX_BATCH:
        batch_write.commit()
        batch_write = db.batch()
        batch_count = 0
        print("    Batch committed")

# Final commit
if batch_count > 0:
    batch_write.commit()
    print(f"    Final batch committed ({batch_count} records)")


# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Done!
   Written  : {written} synthetic records
   Skipped  : {skipped}
   Period   : last {DAYS_BACK} days
   Clinics  : {CLINIC_IDS}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. python 1_export_firestore.py
  2. python 2_train_model.py
  3. Copy-Item wait_time_model.pkl ..\\api\\wait_time_model.pkl
  4. Restart Flask API
""")