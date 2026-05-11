import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Deployed API ───────────────────────────────────────────────
const ML_API_URL = "https://sd-carequeue.onrender.com/predict";
const ML_HEALTH_URL = "https://sd-carequeue.onrender.com/health";

let lastRequestId = 0;

// ─────────────────────────────────────────────────────────────
// warmUpAPI
// ─────────────────────────────────────────────────────────────
// FIX: Render free tier spins down after 15 min of inactivity.
// Pinging /health on page load wakes the server so the first
// real predict call doesn't time out (cold start = ~30-60s).
// Call this once when your page loads:  warmUpAPI();
export function warmUpAPI() {
    fetch(ML_HEALTH_URL).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
// fetchWithTimeout
// ─────────────────────────────────────────────────────────────
// Wraps fetch with a timeout. If the server doesn't respond
// within `timeout` ms the promise rejects with "timeout".
// FIX: Increased from 4000 → 10000 ms to survive Render cold starts.
async function fetchWithTimeout(url, options, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), timeout);
        fetch(url, options)
            .then(r => { clearTimeout(timer); resolve(r); })
            .catch(e => { clearTimeout(timer); reject(e); });
    });
}

// ─────────────────────────────────────────────────────────────
// getWaitTime — calls Flask ML API
// ─────────────────────────────────────────────────────────────
// Sends clinicID, queuePosition, queueLength, isWalkIn to the
// ML API and returns the estimated wait time in minutes.
// Returns null on any failure so callers can use a fallback.
export async function getWaitTime(data) {
    try {
        const res = await fetchWithTimeout(ML_API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinicID:      Number(data.clinicID),
                queuePosition: Number(data.queuePosition),
                queueLength:   Number(data.queueLength),
                isWalkIn:      data.isWalkIn ? 1 : 0,   // FIX: int not boolean
            }),
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            console.warn("[CareQueue ML] API error:", errJson);
            return null;
        }

        const json = await res.json();
        return json?.estimatedWaitTime ?? null;

    } catch (e) {
        console.warn("[CareQueue ML] API unreachable:", e.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// safeSet
// ─────────────────────────────────────────────────────────────
// Safely sets textContent on a DOM element by ID.
// No-ops if the element doesn't exist.
function safeSet(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ─────────────────────────────────────────────────────────────
// loadQueueStatusML
//
// Parameters:
//   userId        – current patient's Firebase UID
//   appointmentId – Firestore doc ID from Queues / Appointments
//   clinicID      – numeric clinic ID
//   db            – Firestore instance
//   clinicName    – display name of the clinic (for email)
//   patientName   – patient's display name (for email)
//   patientEmail  – patient's email address (for email)
//
// Returns a cleanup function: call it to unsubscribe all listeners.
// ─────────────────────────────────────────────────────────────
export function loadQueueStatusML(
    userId,
    appointmentId,
    clinicID,
    db,
    clinicName   = "Your Clinic",
    patientName  = "Patient",
    patientEmail = "",
) {
    const activeStatuses = ["waiting", "scheduled", "active"];
    let innerUnsub = null;

    // FIX: Warm up Render server as soon as the queue listener starts
    warmUpAPI();

    const setEmpty = () => {
        safeSet("queueCount",        "");
        safeSet("queueProgressText", "");
        safeSet("progressPercent",   "");
        safeSet("queuePosition",     "");
        safeSet("waitTime",          "");
        const meter = document.getElementById("queueMeter");
        if (meter) meter.value = 0;
    };

    // ── Outer: watch this patient's queue doc ─────────────────
    const appointmentQ = query(
        collection(db, "Queues"),
        where("appointmentId", "==", appointmentId)
    );

    const outerUnsub = onSnapshot(appointmentQ, (snapshot) => {

        // Tear down stale inner listener
        if (innerUnsub) { innerUnsub(); innerUnsub = null; }

        const activeEntries = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => activeStatuses.includes((d.status || "").toLowerCase().trim()));

        if (activeEntries.length === 0) { setEmpty(); return; }

        const myDoc  = snapshot.docs.find(d =>
            activeStatuses.includes((d.data().status || "").toLowerCase().trim())
        );
        const myData = { id: myDoc.id, ...myDoc.data() };

        // ── Inner: watch all clinic queue docs ────────────────
        // FIX: Query using Number(clinicID) — Firestore requires
        // type-exact matches. Always write clinicID as Number too.
        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", Number(clinicID))
        );

        innerUnsub = onSnapshot(clinicQ, async (clinicSnap) => {

            let all = clinicSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(d => activeStatuses.includes((d.status || "").toLowerCase().trim()))
                .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

            // Fallback: string clinicID match (handles legacy string-stored IDs)
            if (all.length === 0) {
                all = clinicSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(d =>
                        String(d.clinicID ?? "") === String(clinicID) &&
                        activeStatuses.includes((d.status || "").toLowerCase().trim())
                    )
                    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
            }

            const total     = all.length;
            const userIndex = all.findIndex(e => String(e.appointmentId) === String(appointmentId));

            if (userIndex === -1) { setEmpty(); return; }

            const entry    = all[userIndex];

            // FIX: Always use entry.position if set (written by clinic side).
            // Fallback to array index only if missing — make sure clinic code
            // always writes `position: Number` when adding to the queue.
            const position = entry.position ?? (userIndex + 1);
            const isWalkIn = entry.isWalkIn ?? false;

            // ── Progress meter ────────────────────────────────
            safeSet("queueCount",    `${position} out of ${total}`);
            safeSet("queuePosition", String(position));

            let percent = 0;
            if (total === 1)  percent = 100;
            else              percent = Math.round(((total - position) / (total - 1)) * 100);

            safeSet("progressPercent", `${percent}%`);
            const meter = document.getElementById("queueMeter");
            if (meter) meter.value = percent;
            safeSet("queueProgressText", "");

            // ── ML wait time prediction ───────────────────────
            safeSet("waitTime", "...");
            const requestId = ++lastRequestId;

            const predicted = await getWaitTime({
                clinicID,
                queuePosition: position,
                queueLength:   total,
                isWalkIn,                   // converted to 1/0 inside getWaitTime
            });

            if (requestId !== lastRequestId) return;  // stale response, discard

            const displayWait = predicted !== null
                ? predicted
                : Math.round(position * 21);  // fallback: 21 min per position

            safeSet("waitTime", `${displayWait} min`);

            // Write prediction back to Queues.estimateWait
            try {
                await updateDoc(doc(db, "Queues", myData.id), {
                    estimateWait: displayWait,
                });
            } catch (e) {
                console.warn("[CareQueue ML] Could not update estimateWait:", e);
            }
        });
    });

    // Return single cleanup function
    return () => {
        outerUnsub();
        if (innerUnsub) innerUnsub();
    };
}