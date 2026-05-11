"""
backfill_queue_history.py
==========================
Generates 200 realistic synthetic QueueHistory records over the last 3 months
based on your actual clinic IDs and realistic South African clinic patterns.

Run from scripts/ folder:
    python backfill_queue_history.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import random
import os


# ─────────────────────────────────────────────
# INIT FIREBASE
# ─────────────────────────────────────────────
if not firebase_admin._apps:
    KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "serviceAccountKey.json")
    cred = credentials.Certificate(KEY_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
CLINIC_IDS = [
    10002143430,
    9051104017,
    617067000,
]

CLINIC_HOURS = {
    10002143430: (7, 17),
    9051104017:  (8, 16),
    617067000:   (7, 15),
}

QUEUE_SIZES = {
    10002143430: (5, 20),
    9051104017:  (3, 15),
    617067000:   (4, 18),
}

WALK_IN_RATIO = {
    10002143430: 0.35,
    9051104017:  0.25,
    617067000:   0.40,
}

TARGET_RECORDS = 200
DAYS_BACK      = 90
MAX_WAIT       = 120   # FIX: hard cap — no synthetic record exceeds 2 hours
MIN_WAIT       = 5     # FIX: minimum realistic wait


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def realistic_wait(position, queue_length, hour, day_of_week, is_walk_in):
    """
    Generate a realistic wait time in minutes.
    FIX: Capped at MAX_WAIT (120 min) so synthetic data doesn't
    pollute training with impossible 300-500 min wait times.
    """
    # Base: 8-12 min per person ahead (reduced from 8-15)
    base = position * random.uniform(8, 12)

    # Time-of-day multiplier
    if 7 <= hour <= 9:
        tod = random.uniform(1.2, 1.5)   # morning rush
    elif 10 <= hour <= 11:
        tod = random.uniform(1.0, 1.2)
    elif 12 <= hour <= 13:
        tod = random.uniform(0.8, 1.0)   # lunch dip
    elif 14 <= hour <= 15:
        tod = random.uniform(0.9, 1.1)
    else:
        tod = random.uniform(0.7, 0.9)   # late afternoon quieter

    # Day-of-week multiplier (0=Monday)
    dow_mult = {0: 1.2, 1: 1.1, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.8, 6: 0.7}
    dow = dow_mult.get(day_of_week, 1.0)

    # Queue pressure
    pressure = 1.0 + (queue_length / 150)   # FIX: reduced pressure factor

    # Walk-in penalty
    walk_in_penalty = 1.10 if is_walk_in else 1.0

    wait = base * tod * dow * pressure * walk_in_penalty
    wait += random.gauss(0, 2)   # FIX: reduced noise from 3 to 2

    # FIX: hard clamp — never exceed MAX_WAIT or go below MIN_WAIT
    return max(MIN_WAIT, min(MAX_WAIT, round(wait)))


def random_weekday_date(days_back):
    """Pick a random date within the last N days, skipping Sundays."""
    while True:
        offset = random.randint(1, days_back)
        date   = datetime.now() - timedelta(days=offset)
        if date.weekday() != 6:
            return date


# ─────────────────────────────────────────────
# GENERATE RECORDS
# ─────────────────────────────────────────────
print(f"Generating {TARGET_RECORDS} synthetic QueueHistory records...\n")

written     = 0
skipped     = 0
batch_write = db.batch()
batch_count = 0
MAX_BATCH   = 400

while written < TARGET_RECORDS:

    clinic_id             = random.choice(CLINIC_IDS)
    open_hour, close_hour = CLINIC_HOURS[clinic_id]
    min_q, max_q          = QUEUE_SIZES[clinic_id]

    base_date   = random_weekday_date(DAYS_BACK)
    hour        = random.randint(open_hour, close_hour - 1)
    minute      = random.choice([0, 15, 30, 45])
    day_of_week = base_date.weekday()

    queue_length = random.randint(min_q, max_q)
    position     = random.randint(1, queue_length)
    is_walk_in   = 1 if random.random() < WALK_IN_RATIO.get(clinic_id, 0.3) else 0

    appointment_time = base_date.replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )

    actual_wait = realistic_wait(position, queue_length, hour, day_of_week, is_walk_in)

    arrival_offset = actual_wait + random.randint(-2, 2)
    arrival_offset = max(MIN_WAIT, arrival_offset)
    created_at     = appointment_time - timedelta(minutes=arrival_offset)

    appt_id = f"synthetic_{written:04d}_{random.randint(1000, 9999)}"
    user_id = f"synthetic_user_{random.randint(100, 999)}"

    record = {
        "clinicID":        int(clinic_id),
        "appointmentId":   appt_id,
        "userID":          user_id,
        "queuePosition":   int(position),
        "queueLength":     int(queue_length),
        "createdAT":       created_at,
        "appointmentTime": appointment_time,
        "hour":            int(created_at.hour),
        "dayOfWeek":       int(day_of_week),
        "isWalkIn":        is_walk_in,        # int (1/0)
        "actualWaitTime":  int(actual_wait),  # capped at MAX_WAIT
        "loggedAt":        datetime.now(),
        "source":          "synthetic",
    }

    new_ref = db.collection("QueueHistory").document()
    batch_write.set(new_ref, record)
    batch_count += 1
    written     += 1

    print(
        f"   [{written:>3}/{TARGET_RECORDS}] clinic={clinic_id} | "
        f"pos={position}/{queue_length} | "
        f"hour={hour:02d}:{minute:02d} | "
        f"day={day_of_week} | "
        f"walkIn={is_walk_in} | "
        f"wait={actual_wait} min"
    )

    if batch_count >= MAX_BATCH:
        batch_write.commit()
        batch_write  = db.batch()
        batch_count  = 0
        print("   Batch committed")

if batch_count > 0:
    batch_write.commit()
    print(f"   Final batch committed ({batch_count} records)")


# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Done!
   Written : {written} synthetic records
   Skipped : {skipped}
   Period  : last {DAYS_BACK} days
   Clinics : {CLINIC_IDS}
   Max wait: {MAX_WAIT} min (capped)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. python 1_export_firestore.py
  2. python 2_train_model.py
  3. Restart Flask API
""")