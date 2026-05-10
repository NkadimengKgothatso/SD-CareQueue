import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ─────────────────────────────────────────────────────────────
# log_queue_completion()
#
# Call this ONCE per patient, the moment they are served.
# It writes one training row to QueueHistory.
#
# Parameters:
#   clinic_id       – int   – e.g. 10002143430
#   appointment_id  – str   – Firestore doc ID from Queues/Appointments
#   queue_position  – int   – patient's position when they joined
#   queue_length    – int   – total queue size at that moment
#   created_at      – datetime – when patient joined the queue (createdAT)
#   served_at       – datetime – when patient was called/served
#   is_walk_in      – bool  – True if walk-in, False if booked appointment
#   user_id         – str   – userID from Queues doc (can be None for walk-ins)
# ─────────────────────────────────────────────────────────────

def log_queue_completion(
    clinic_id:      int,
    appointment_id: str,
    queue_position: int,
    queue_length:   int,
    created_at:     datetime,
    served_at:      datetime,
    is_walk_in:     bool = False,
    user_id:        str  = None,
):
    # ── Validate wait time ──────────────────────────────────
    actual_wait = round((served_at - created_at).total_seconds() / 60)

    if actual_wait <= 0:
        print(f" Skipping {appointment_id} — invalid wait time ({actual_wait} min)")
        return

    if actual_wait > 180:
        print(f"Skipping {appointment_id} — outlier wait time ({actual_wait} min > 180)")
        return

    # ── Duplicate guard ─────────────────────────────────────
    # Prevent the same appointment being logged twice
    existing = (
        db.collection("QueueHistory")
        .where("appointmentId", "==", str(appointment_id))
        .limit(1)
        .stream()
    )
    if any(True for _ in existing):
        print(f"  Skipping {appointment_id} — already logged in QueueHistory")
        return

    # ── Derive time features ────────────────────────────────
    hour        = created_at.hour
    day_of_week = created_at.weekday()   # 0=Mon … 6=Sun
    is_weekend  = day_of_week in [5, 6]

    # ── Build record ────────────────────────────────────────
    record = {
        # ── Identifiers ──
        "clinicID":      int(clinic_id),
        "appointmentId": str(appointment_id),
        "userID":        str(user_id) if user_id else None,

        # ── ML features ──
        "queuePosition": int(queue_position),
        "queueLength":   int(queue_length),
        "hour":          int(hour),
        "dayOfWeek":     int(day_of_week),
        "isWeekend":     bool(is_weekend),
        "isWalkIn":      bool(is_walk_in),   #  critical for model accuracy

        # ── Target variable ──
        "actualWaitTime": int(actual_wait),

        # ── Audit timestamps ──
        "createdAT":  created_at,
        "servedAT":   served_at,
        "loggedAt":   firestore.SERVER_TIMESTAMP,  #  server time, timezone-safe

        # ── Data provenance ──
        "source": "real",   # distinguishes from synthetic bootstrap data
    }

    db.collection("QueueHistory").add(record)

    print(
        f" Logged  | clinic={clinic_id} | appt={appointment_id} | "
        f"pos={queue_position}/{queue_length} | "
        f"walkIn={is_walk_in} | wait={actual_wait} min"
    )


# ─────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# Call this from your queue management code when a patient
# is marked as served in Firestore.
#
# from scripts.3_log_queue_history import log_queue_completion
#
# log_queue_completion(
#     clinic_id      = 10002143430,
#     appointment_id = "15syhAEcth0HMBrnbIZi",
#     queue_position = 1,
#     queue_length   = 7,
#     created_at     = datetime(2026, 5, 9, 13, 0),   # joined queue
#     served_at      = datetime(2026, 5, 9, 13, 22),  # called by clinic
#     is_walk_in     = False,
#     user_id        = "user_abc123",
# )
# ─────────────────────────────────────────────────────────────