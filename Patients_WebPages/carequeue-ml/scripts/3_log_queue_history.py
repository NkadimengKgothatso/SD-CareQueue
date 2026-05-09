"""
STEP 3 — Log Queue History (FIXED FOR CAREQUEUE ML PIPELINE)
============================================================
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# ─────────────────────────────────────────────
# INIT FIREBASE
# ─────────────────────────────────────────────
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()


# ─────────────────────────────────────────────
# MAIN LOGGER
# ─────────────────────────────────────────────
def log_queue_completion(
    clinic_id: int,
    appointment_id: str,
    queue_position: int,
    queue_length: int,
    created_at: datetime,
    appointment_time: datetime,
):
    """
    Logs ML training data into Firestore QueueHistory.

    actual wait = appointmentTime - createdAT
    i.e. how many minutes from when the patient joined the queue
    until their scheduled appointment time.
    """

    # ─────────────────────────────────────────
    # TARGET VARIABLE
    # appointmentTime - createdAT gives a positive wait
    # because appointment is always AFTER the patient joins the queue
    # ─────────────────────────────────────────
    actual_wait = round(
        (appointment_time - created_at).total_seconds() / 60
    )

    # Guard against bad data — skip negative or zero wait times
    if actual_wait <= 0:
        print(
            f"⚠️  Skipping record: non-positive wait time ({actual_wait} min). "
            f"Check that appointmentTime > createdAT."
        )
        return

    # ─────────────────────────────────────────
    # FEATURE ENGINEERING
    # ─────────────────────────────────────────
    hour = created_at.hour
    day_of_week = created_at.weekday()
    is_weekend = day_of_week in [5, 6]

    # ─────────────────────────────────────────
    # BUILD DOCUMENT
    # ─────────────────────────────────────────
    record = {

        # IDs
        "clinicID": int(clinic_id),
        "appointmentId": str(appointment_id),

        # Queue state
        "queuePosition": int(queue_position),
        "queueLength": int(queue_length),

        # Timing (kept as timestamp for reference)
        "createdAT": created_at,
        "appointmentTime": appointment_time,

        # Features
        "hour": hour,
        "dayOfWeek": day_of_week,
        "isWeekend": is_weekend,

        # TARGET — always positive now
        "actualWaitTime": actual_wait,

        # Metadata
        "loggedAt": datetime.utcnow()
    }

    # ─────────────────────────────────────────
    # SAVE TO FIRESTORE
    # ─────────────────────────────────────────
    db.collection("QueueHistory").add(record)

    print(
        f"✅ Logged QueueHistory | clinic={clinic_id} | "
        f"pos={queue_position}/{queue_length} | wait={actual_wait} min"
    )


# ─────────────────────────────────────────────
# TEST EXAMPLE
# Patient joins queue at 07:45, appointment is at 08:00 → 15 min wait
# ─────────────────────────────────────────────
if __name__ == "__main__":

    log_queue_completion(

        clinic_id=10002143430,

        appointment_id="test-abc-123",

        queue_position=3,

        queue_length=10,

        created_at=datetime(2026, 5, 9, 7, 45, 0),      # joined queue at 07:45

        appointment_time=datetime(2026, 5, 9, 8, 0, 0),  # appointment at 08:00
    )