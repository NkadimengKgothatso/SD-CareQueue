"""
generate_synthetic_data.py (v2 — capped realistic wait times)
=============================================================
Generates 500 realistic synthetic QueueHistory records.
Wait times capped at 120 min max — SA clinic realistic range is 5–90 min.

Run from scripts/ folder:
    python generate_synthetic_data.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
from collections import defaultdict
import random


# ─────────────────────────────────────────────
# INIT FIREBASE
# ─────────────────────────────────────────────
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
CLINIC_IDS = [10002143430, 9051104017, 617067000]

CLINIC_HOURS  = {10002143430: (7, 17), 9051104017: (8, 16), 617067000: (7, 15)}
QUEUE_SIZES   = {10002143430: (5, 20), 9051104017: (3, 15), 617067000: (4, 18)}

TARGET_RECORDS = 500
DAYS_BACK      = 90

# Realistic per-person service time in minutes (tight range)
MIN_PER_PERSON = 4    # fastest clinics
MAX_PER_PERSON = 8    # slower clinics
ABSOLUTE_MAX   = 120  # no patient waits more than 2 hrs in our model


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def realistic_wait(position, queue_length, hour, day_of_week):
    """
    Wait = (position - 1) * avg_service_time, adjusted for context.
    Capped at ABSOLUTE_MAX to avoid outliers poisoning the model.
    """
    # People ahead of you
    people_ahead = position - 1

    # Base service time per person
    service_time = random.uniform(MIN_PER_PERSON, MAX_PER_PERSON)

    # Time-of-day multiplier (mornings busier)
    if 7 <= hour <= 9:
        tod = random.uniform(1.1, 1.3)
    elif 10 <= hour <= 11:
        tod = random.uniform(1.0, 1.15)
    elif 12 <= hour <= 13:
        tod = random.uniform(0.85, 1.0)   # lunch dip
    else:
        tod = random.uniform(0.8, 0.95)   # afternoon quieter

    # Day-of-week multiplier
    dow_mult = {0: 1.25, 1: 1.1, 2: 1.0, 3: 1.0, 4: 0.95, 5: 0.85, 6: 0.7}
    dow = dow_mult.get(day_of_week, 1.0)

    wait = people_ahead * service_time * tod * dow

    # Small noise (±3 min)
    wait += random.gauss(0, 3)

    # Hard cap — no outliers
    wait = max(3, min(round(wait), ABSOLUTE_MAX))

    return wait


def random_weekday_date(days_back):
    while True:
        offset = random.randint(1, days_back)
        date = datetime.now() - timedelta(days=offset)
        if date.weekday() != 6:   # skip Sundays
            return date


# ─────────────────────────────────────────────
# GENERATE
# ─────────────────────────────────────────────
print(f"⚙️  Generating {TARGET_RECORDS} synthetic records (capped at {ABSOLUTE_MAX} min)...\n")

written = 0
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

    appointment_time = base_date.replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )

    actual_wait = realistic_wait(position, queue_length, hour, day_of_week)
    created_at  = appointment_time - timedelta(minutes=actual_wait + random.randint(-1, 2))

    record = {
        "clinicID":        int(clinic_id),
        "appointmentId":   f"syn_{written:04d}_{random.randint(1000,9999)}",
        "userID":          f"syn_user_{random.randint(100,999)}",
        "queuePosition":   position,
        "queueLength":     queue_length,
        "createdAT":       created_at,
        "appointmentTime": appointment_time,
        "hour":            created_at.hour,
        "dayOfWeek":       day_of_week,
        "actualWaitTime":  actual_wait,
        "loggedAt":        datetime.now(),
        "source":          "synthetic_v2",
    }

    new_ref = db.collection("QueueHistory").document()
    batch_write.set(new_ref, record)
    batch_count += 1
    written += 1

    print(
        f"   [{written:>3}/{TARGET_RECORDS}] clinic={clinic_id} | "
        f"pos={position}/{queue_length} | hour={hour:02d}:{minute:02d} | "
        f"day={day_of_week} | wait={actual_wait} min"
    )

    if batch_count >= MAX_BATCH:
        batch_write.commit()
        batch_write = db.batch()
        batch_count = 0
        print("   💾 Batch committed (400 records)")

if batch_count > 0:
    batch_write.commit()
    print(f"   💾 Final batch committed ({batch_count} records)")


print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Done! {written} records written
   Wait time range: 3–{ABSOLUTE_MAX} min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. python 1_export_firestore.py
  2. python 2_train_model.py
  3. Copy-Item wait_time_model.pkl ..\\api\\wait_time_model.pkl
  4. Restart Flask API
""")
