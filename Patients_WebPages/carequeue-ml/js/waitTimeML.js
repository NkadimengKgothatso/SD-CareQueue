// waitTimeML.js – Final, all queue UI elements updated
import {
    collection,
    query,
    where,
    onSnapshot,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ML_API_URL    = "https://sd-carequeue.onrender.com/predict";
const ML_HEALTH_URL = "https://sd-carequeue.onrender.com/health";

export function warmUpAPI() {
    fetch(ML_HEALTH_URL).catch(() => {});
}

async function fetchWithTimeout(url, options, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), timeout);
        fetch(url, options)
            .then(r => { clearTimeout(timer); resolve(r); })
            .catch(e => { clearTimeout(timer); reject(e); });
    });
}

export async function getWaitTime(data) {
    try {
        const res = await fetchWithTimeout(ML_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinicID:      Number(data.clinicID),
                queuePosition: Number(data.queuePosition),
                queueLength:   Number(data.queueLength),
                isWalkIn:      data.isWalkIn ? 1 : 0
            }),
        }, 10000);
        if (!res.ok) return null;
        const json = await res.json();
        return json?.estimatedWaitTime ?? null;
    } catch (e) {
        console.error("[ML] API error:", e.message);
        return null;
    }
}

export function loadQueueStatusML(userId, appointmentId, clinicID, db, clinicName, patientName, patientEmail) {
    console.log("[ML] Queue listener started for appointment", appointmentId);
    const q = query(
        collection(db, "Queues"),
        where("clinicID", "==", clinicID),
        where("appointmentId", "==", appointmentId)
    );

    // Also update visits count (once)
    updateVisitsCount(userId, db);

    return onSnapshot(q, async (snapshot) => {
        // Helper to safely set DOM content
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.innerText = value;
        };
        const setHtml = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };
        const setMeter = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        if (snapshot.empty) {
            console.log("[ML] No queue document – showing placeholders");
            setText("queuePosition", "—");
            setHtml("waitTime", "—");
            setHtml("queueCount", "Queue length: 0");
            setMeter("queueMeter", 0);
            setText("progressPercent", "0%");
            return;
        }

        const queueData = snapshot.docs[0].data();
        let rawPosition = queueData.position ?? 1;
        let rawLength   = queueData.queueLength ?? snapshot.size ?? 1;
        const safeLength = Math.max(Number(rawLength), 1);
        let safePosition = Math.min(Math.max(Number(rawPosition), 1), safeLength);

        // Update static queue info
        setText("queuePosition", safePosition);
        setHtml("queueCount", `Queue length: ${safeLength}`);

        // Progress percentage (position-1)/length * 100
        const progress = ((safePosition - 1) / safeLength) * 100;
        setMeter("queueMeter", progress);
        setText("progressPercent", `${Math.round(progress)}%`);

        // Get wait time from ML
        const waitMins = await getWaitTime({
            clinicID, queuePosition: safePosition,
            queueLength: safeLength,
            isWalkIn: queueData.isWalkIn ?? false
        });
        const waitText = (waitMins !== null && !isNaN(waitMins))
            ? `~${Math.round(waitMins)} min`
            : "—";
        setHtml("waitTime", waitText);
    });
}

async function updateVisitsCount(userId, db) {
    try {
        const currentYear = new Date().getFullYear();
        const start = `${currentYear}-01-01`;
        const end   = `${currentYear}-12-31`;
        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", userId),
            where("date", ">=", start),
            where("date", "<=", end)
        );
        const snap = await getDocs(q);
        const count = snap.size;
        const visitsEl = document.getElementById("visitsCount");
        if (visitsEl) visitsEl.innerText = count;
    } catch (err) {
        console.error("Visits count error:", err);
    }
}