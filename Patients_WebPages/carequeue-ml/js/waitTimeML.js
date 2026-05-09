// ============================================================
// waitTimeML.js — FIXED ML Integration Layer
// ============================================================

import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ML_API_URL = "http://127.0.0.1:5000/predict";


// ─────────────────────────────────────────────
// SAFE FETCH (WITH TIMEOUT)
// ─────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeout = 4000) {
    return new Promise((resolve, reject) => {

        const timer = setTimeout(() => {
            reject(new Error("ML API timeout"));
        }, timeout);

        fetch(url, options)
            .then(res => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}


// ─────────────────────────────────────────────
// CORE ML CALL
// ─────────────────────────────────────────────
export async function getWaitTime(data) {
    try {
        const res = await fetchWithTimeout(ML_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinicID:      Number(data.clinicID),
                queuePosition: Number(data.queuePosition),
                queueLength:   Number(data.queueLength),
                hour:          new Date().getHours(),
                dayOfWeek:     new Date().getDay(),
            }),
        });

        if (!res.ok) {
            console.error("ML API error:", res.status);
            return null;
        }

        const json = await res.json();
        return json?.estimatedWaitTime ?? null;

    } catch (err) {
        console.error("ML fetch failed:", err.message);
        return null;
    }
}


// ─────────────────────────────────────────────
// SAFE DOM UPDATE
// ─────────────────────────────────────────────
function safeSet(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}


// ─────────────────────────────────────────────
// MAIN REAL-TIME QUEUE + ML INTEGRATION
// ─────────────────────────────────────────────
export function loadQueueStatusML(userId, appointmentId, clinicID, db) {

    const activeStatuses = ["waiting", "scheduled", "active"];

    let clinicUnsubscribe = null;

    const appointmentQ = query(
        collection(db, "Queues"),
        where("appointmentId", "==", appointmentId)
    );

    const unsubscribeMain = onSnapshot(appointmentQ, (snapshot) => {

        if (clinicUnsubscribe) {
            clinicUnsubscribe();
            clinicUnsubscribe = null;
        }

        const activeEntries = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => activeStatuses.includes((d.status || "").toLowerCase()));

        if (activeEntries.length === 0) {
            safeSet("queueCount", "");
            safeSet("queueProgressText", "");
            return;
        }

        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", Number(clinicID))
        );

        clinicUnsubscribe = onSnapshot(clinicQ, async (snap) => {

            const all = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(d => activeStatuses.includes((d.status || "").toLowerCase()))
                .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

            const total = all.length;

            const userIndex = all.findIndex(
                e => String(e.appointmentId) === String(appointmentId)
            );

            if (userIndex === -1) return;

            const position = userIndex + 1;

            const percent = total <= 1
                ? 100
                : Math.round(((total - position) / (total - 1)) * 100);

            safeSet("queueCount", `${position} out of ${total}`);
            safeSet("queuePosition", position);
            safeSet("progressPercent", `${percent}%`);

            const meter = document.getElementById("queueMeter");
            if (meter) meter.value = percent;

            // ── ML PREDICTION ─────────────────────────────
            safeSet("waitTime", "...");

            const predicted = await getWaitTime({
                clinicID,
                queuePosition: position,
                queueLength:   total
            });

            if (predicted !== null) {
                safeSet("waitTime", `${predicted} min`);
            } else {
                // fallback: position-based estimate
                safeSet("waitTime", `~${position * 10} min (est.)`);
            }
        });
    });

    return unsubscribeMain;
}