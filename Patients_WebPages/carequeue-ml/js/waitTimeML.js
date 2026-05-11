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

// ── deployed API  ──────────────────────
const ML_API_URL = "https://sd-carequeue.onrender.com/predict";

let lastRequestId = 0;

// ─────────────────────────────────────────────────────────────
// fetchWithTimeout
// ─────────────────────────────────────────────────────────────
// This helper function wraps the standard fetch API with a timeout mechanism.
//  It returns a promise that either resolves with the fetch response or rejects with a timeout error if the specified time limit is exceeded. 
// This ensures that the application can handle cases where the ML API might be unresponsive,
//  preventing it from hanging indefinitely while waiting for a response.

async function fetchWithTimeout(url, options, timeout = 4000) {
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
// This function sends a POST request to the ML API with the relevant data 
// (clinicID, queuePosition, queueLength, isWalkIn) and returns the estimated wait time.
// If the API call fails or returns an error, 
// it gracefully handles the failure by returning null,
//  allowing the application to fall back to a default wait time estimation method if necessary.
export async function getWaitTime(data) {
    try {
        const res = await fetchWithTimeout(ML_API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinicID:      Number(data.clinicID),
                queuePosition: Number(data.queuePosition),
                queueLength:   Number(data.queueLength),
                isWalkIn:      Boolean(data.isWalkIn ?? false),
            }),
        });

        if (!res.ok) return null;
        const json = await res.json();
        return json?.estimatedWaitTime ?? null;

    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// safeSet
// ─────────────────────────────────────────────────────────────
// This utility function safely updates the text content of a DOM element by its ID.
// It checks if the element exists before attempting to set its text content, 
// preventing potential errors if the element is not found in the DOM.
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




// This function sets up real-time listeners on the Firestore database 
// to track the patient's position in the clinic queue and update the UI accordingly.
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

    const setEmpty = () => {
        safeSet("queueCount",        "");
        safeSet("queueProgressText", "");
        safeSet("progressPercent",   "");
        safeSet("queuePosition",     "");
        safeSet("waitTime",          "");
        const meter = document.getElementById("queueMeter");
        if (meter) meter.value = 0;
    };

    // ── Outer: watch this patient's queue doc ────────────────
    const appointmentQ = query(
        collection(db, "Queues"),
        where("appointmentId", "==", appointmentId)
    );

    // the outer listener watches for changes to the patient's specific queue document based on their appointment ID.
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

        // ── Inner: watch all clinic queue docs ───────────────
        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", Number(clinicID))
        );

        innerUnsub = onSnapshot(clinicQ, async (clinicSnap) => {

            let all = clinicSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(d => activeStatuses.includes((d.status || "").toLowerCase().trim()))
                .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

            // Fallback: string clinicID match
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
            const position = entry.position ?? (userIndex + 1);
            const isWalkIn = entry.isWalkIn ?? false;

            // ── Progress meter ───────────────────────────────
            safeSet("queueCount",    `${position} out of ${total}`);
            safeSet("queuePosition", String(position));

            let percent = 0;
            if (total === 1)  percent = 100;
            else              percent = Math.round(((total - position) / (total - 1)) * 100);

            safeSet("progressPercent", `${percent}%`);
            const meter = document.getElementById("queueMeter");
            if (meter) meter.value = percent;
            safeSet("queueProgressText", "");

            /* ── "You're next" email notification ────────────
            if (position === 2 && !myData.emailSent && patientEmail) {
                try {
                    emailjs.init("jWEiS_k1FnVa1Zz5S");
                    await emailjs.send("service_j8zb3jh", "template_neu0ubc", {
                        email:              patientEmail,
                        name:               patientName,
                        clinic_name:        clinicName,        // now correctly in scope
                        appointment_reason: myData.reason || "Appointment",
                        appointment_date:   myData.date   || "",
                        appointment_time:   myData.time   || "",
                    });

                    await updateDoc(doc(db, "Queues", myData.id), { emailSent: true });

                    await addDoc(collection(db, "Notifications"), {
                        userID:     userId,
                        clinicID:   Number(clinicID),
                        clinicName: clinicName,
                        type:       "Appointment",
                        title:      "You're Almost Up!",
                        message:    `Your ${myData.reason || "appointment"} at ${clinicName} is coming up — you are position 2 on ${myData.date} at ${myData.time}. Please make your way to the clinic.`,
                        read:       false,
                        createdAt:  serverTimestamp(),
                    });
                } catch (e) {
                    console.warn("Email/notification error:", e);
                }
            }*/

            // ── ML wait time prediction ──────────────────────
            safeSet("waitTime", "...");
            const requestId = ++lastRequestId;

            const predicted = await getWaitTime({
                clinicID,
                queuePosition: position,
                queueLength:   total,
                isWalkIn,
            });

            if (requestId !== lastRequestId) return;  // stale response, ignore

            
            const displayWait = predicted !== null
                ? predicted
                : Math.round(position * 25);  // fallback: 25 min per person ahead   

            safeSet("waitTime", `${displayWait} min`);

            //  Write prediction back to Queues.estimateWait
            try {
                await updateDoc(doc(db, "Queues", myData.id), {
                    estimateWait: displayWait,
                });
            } catch (e) {
                console.warn("Could not update estimateWait:", e);
            }
        });
    });

    // Return single cleanup function
    return () => {
        outerUnsub();
        if (innerUnsub) innerUnsub();
    };
}