// QueuesLogic.js
// Pure business logic — no Firebase, no DOM.
// Import and use these functions in your page script and in tests.

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_PIPELINE = ["waiting", "in consultation", "completed"];

const STATUS_LABELS = {
    "waiting":         "Waiting",
    "in consultation": "In Consultation",
    "completed":       "Completed",
    "cancelled":       "Cancelled",
};

const ACTIVE_STATUSES = new Set(["waiting", "in consultation"]);

// ─── getTodayString ───────────────────────────────────────────────────────────
/**
 * Returns today's date as "YYYY-MM-DD".
 * Accepts an optional Date so tests can inject a fixed date.
 * @param {Date} [now]
 * @returns {string}
 */
function getTodayString(now = new Date()) {
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${mm}-${dd}`;
}

// ─── normaliseStatus ─────────────────────────────────────────────────────────
/**
 * Normalises a raw Firestore status string.
 * "scheduled" is treated as "waiting" for queue purposes.
 * @param {string|undefined} raw
 * @returns {string}
 */
function normaliseStatus(raw) {
    const s = (raw || "waiting").toLowerCase().trim();
    return s === "scheduled" ? "waiting" : s;
}

// ─── isActiveStatus ───────────────────────────────────────────────────────────
/**
 * @param {string} status
 * @returns {boolean}
 */
function isActiveStatus(status) {
    return ACTIVE_STATUSES.has(status);
}

// ─── getNextStatus ────────────────────────────────────────────────────────────
/**
 * Returns the next status in the pipeline, or null if already at the end.
 * @param {string} status
 * @returns {string|null}
 */
function getNextStatus(status) {
    const idx = STATUS_PIPELINE.indexOf(status);
    if (idx >= 0 && idx < STATUS_PIPELINE.length - 1) {
        return STATUS_PIPELINE[idx + 1];
    }
    return null;
}

// ─── getStatusLabel ───────────────────────────────────────────────────────────
/**
 * @param {string} status
 * @returns {string}
 */
function getStatusLabel(status) {
    return STATUS_LABELS[status] || status;
}

// ─── mergeAndDeduplicateAppointments ─────────────────────────────────────────
/**
 * Combines regular and walk-in appointment arrays, removes duplicates by id,
 * and sorts by time ascending.
 * @param {object[]} regularAppts
 * @param {object[]} walkInAppts
 * @returns {object[]}
 */
function mergeAndDeduplicateAppointments(regularAppts, walkInAppts) {
    const combined = [...regularAppts, ...walkInAppts];
    const seen = new Set();
    return combined
        .filter((a) => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
        })
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

// ─── assignQueuePositions ─────────────────────────────────────────────────────
/**
 * Assigns a 1-based queuePosition to every active appointment (in time order).
 * Done / cancelled appointments receive queuePosition = null.
 * Mutates the array in place AND returns it for convenience.
 * @param {object[]} appointments  — already sorted by time
 * @returns {object[]}
 */
function assignQueuePositions(appointments) {
    let pos = 1;
    appointments.forEach((appt) => {
        if (isActiveStatus((appt.status || "").toLowerCase())) {
            appt.queuePosition = pos++;
        } else {
            appt.queuePosition = null;
        }
    });
    return appointments;
}

// ─── computeStats ────────────────────────────────────────────────────────────
/**
 * Returns summary statistics for a queue snapshot.
 * @param {object[]} appointments
 * @returns {{ total: number, inQueue: number, completed: number }}
 */
function computeStats(appointments) {
    const total     = appointments.length;
    const inQueue   = appointments.filter((a) =>
        isActiveStatus((a.status || "").toLowerCase())
    ).length;
    const completed = appointments.filter(
        (a) => (a.status || "").toLowerCase() === "completed"
    ).length;
    return { total, inQueue, completed };
}

// ─── partitionQueue ──────────────────────────────────────────────────────────
/**
 * Splits a queue into active and done buckets.
 * Active entries are sorted by queuePosition then time.
 * @param {object[]} appointments
 * @returns {{ active: object[], done: object[] }}
 */
function partitionQueue(appointments) {
    const active = appointments
        .filter((a) => isActiveStatus((a.status || "").toLowerCase()))
        .sort(
            (a, b) =>
                (a.queuePosition || 999) - (b.queuePosition || 999) ||
                (a.time || "").localeCompare(b.time || "")
        );

    const done = appointments.filter(
        (a) => !isActiveStatus((a.status || "").toLowerCase())
    );

    return { active, done };
}

// ─── buildQueuePayload ────────────────────────────────────────────────────────
/**
 * Builds the plain object that should be written to the Queues collection
 * for a single appointment. Does NOT call serverTimestamp() — pass a
 * timestamp value in from outside so this stays pure / testable.
 *
 * @param {object} appt
 * @param {number|string} clinicID
 * @param {string}        today        — "YYYY-MM-DD"
 * @param {*}             updatedAt    — whatever timestamp value you want stored
 * @returns {object}
 */
function buildQueuePayload(appt, clinicID, today, updatedAt) {
    const status   = (appt.status || "waiting").toLowerCase();
    const isActive = isActiveStatus(status);

    return {
        appointmentId: appt.id,
        clinicID:      Number(clinicID),
        date:          today,
        userID:        appt.userID      || null,
        patientName:   appt.patientName || null,
        status:        appt.status      || "waiting",
        time:          appt.time        || "",
        position:      isActive ? appt.queuePosition : null,
        estimateWait:  isActive ? (appt.queuePosition - 1) * 15 : null,
        isWalkIn:      appt.isWalkIn    || false,
        updatedAt,
    };
}

// ─── shouldDeleteQueueEntry ───────────────────────────────────────────────────
/**
 * Returns true when a Queues document belongs to this clinic but is from a
 * previous day and should therefore be purged.
 * @param {{ clinicID: number, date: string }} queueDocData
 * @param {number|string} clinicID
 * @param {string}        today
 * @returns {boolean}
 */
function shouldDeleteQueueEntry(queueDocData, clinicID, today) {
    return (
        queueDocData.clinicID === Number(clinicID) &&
        queueDocData.date     !== today
    );
}

// ─── resolvePatientNameSync ───────────────────────────────────────────────────
/**
 * Returns the best patient name available for an appointment without making
 * any async calls — used to check whether a network lookup is even needed.
 *
 * Returns null when the name must be fetched from the Users collection.
 * @param {object} appt
 * @param {Record<string,string>} existingNamesCache  — { [apptId]: name }
 * @returns {string|null}
 */
function resolvePatientNameSync(appt, existingNamesCache = {}) {
    if (appt.patientName)            return appt.patientName;
    if (existingNamesCache[appt.id]) return existingNamesCache[appt.id];
    return null;
}

// ─── buildExistingNamesCache ─────────────────────────────────────────────────
/**
 * Builds a { [apptId]: patientName } map from the current queueData snapshot
 * so we don't re-fetch names we already resolved.
 * @param {object[]} queueData
 * @returns {Record<string, string>}
 */
function buildExistingNamesCache(queueData) {
    return Object.fromEntries(
        queueData
            .filter((a) => a.patientName)
            .map((a) => [a.id, a.patientName])
    );
}

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
    STATUS_PIPELINE,
    STATUS_LABELS,
    ACTIVE_STATUSES,
    getTodayString,
    normaliseStatus,
    isActiveStatus,
    getNextStatus,
    getStatusLabel,
    mergeAndDeduplicateAppointments,
    assignQueuePositions,
    computeStats,
    partitionQueue,
    buildQueuePayload,
    shouldDeleteQueueEntry,
    resolvePatientNameSync,
    buildExistingNamesCache,
};
