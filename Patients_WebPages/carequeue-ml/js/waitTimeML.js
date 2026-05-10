import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ML_API_URL = "http://127.0.0.1:5000/predict";

let lastRequestId = 0;


async function fetchWithTimeout(url, options, timeout = 4000) {
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
                clinicID: Number(data.clinicID),
                queuePosition: Number(data.queuePosition),
                queueLength: Number(data.queueLength)
            }),
        });

        if (!res.ok) return null;

        const json = await res.json();
        return json?.estimatedWaitTime ?? null;

    } catch {
        return null;
    }
}


function safeSet(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}


export function loadQueueStatusML(userId, appointmentId, clinicID, db) {

    const appointmentQ = query(
        collection(db, "Queues"),
        where("appointmentId", "==", appointmentId)
    );

    onSnapshot(appointmentQ, (snapshot) => {

        const active = snapshot.docs.map(d => d.data());

        if (active.length === 0) return;

        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", Number(clinicID))
        );

        onSnapshot(clinicQ, async (snap) => {

            const all = snap.docs.map(d => d.data());

            const userIndex = all.findIndex(
                e => String(e.appointmentId) === String(appointmentId)
            );

            if (userIndex === -1) return;

            const position = (all[userIndex]?.position) ?? (userIndex + 1);
            const total = all.length;

            safeSet("queueCount", `${position} out of ${total}`);

            const requestId = ++lastRequestId;

            safeSet("waitTime", "...");

            const predicted = await getWaitTime({
                clinicID,
                queuePosition: position,
                queueLength: total
            });

            if (requestId !== lastRequestId) return;

            if (predicted !== null) {
                safeSet("waitTime", `${predicted} min`);
            } else {
                safeSet("waitTime", `~${Math.round(position * 8)} min`);
            }
        });
    });
}