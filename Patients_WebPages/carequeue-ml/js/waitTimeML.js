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

// Update this URL when deploying the Flask API to a new host
const ML_API_URL = "https://sd-carequeue.onrender.com/predict";

// Track request IDs to prevent displaying stale predictions
let lastRequestId = 0;

// Wrapper to add timeout support for fetch requests
// If the API doesn't respond within timeout milliseconds, the request is aborted
async function fetchWithTimeout(url, options, timeout = 4000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), timeout);
        fetch(url, options)
            .then(r => { clearTimeout(timer); resolve(r); })
            .catch(e => { clearTimeout(timer); reject(e); });
    });
}

// Call the Flask ML API to get predicted wait time in minutes
// Returns null if the API is unavailable or request fails
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

// Safely set text content of a DOM element by ID
// Prevents errors if the element doesn't exist
function safeSet(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Monitor real-time queue status and update UI with predicted wait times
//
// This function sets up Firestore listeners to track the patient's position in queue
// and displays progress meter, queue count, and ML-predicted wait time.
//
// Parameters:
//   userId        - Patient's Firebase authentication UID
//   appointmentId - Firestore document ID from Queues/Appointments collection
//   clinicID      - Numeric clinic identifier (used for clinic-specific predictions)
//   db            - Firestore database instance
//   clinicName    - Clinic display name (optional, for email notifications)
//   patientName   - Patient display name (optional, for email notifications)
//   patientEmail  - Patient email address (optional, for "you're next" notifications)
//
// Returns a cleanup function that unsubscribes all Firestore listeners when called.
export function loadQueueStatusML(
    userId,
    appointmentId,
    clinicID,
    db,
    clinicName   = "Your Clinic",
    patientName  = "Patient",
    patientEmail = "",
) {
    // Valid queue statuses that we monitor and display
    const activeStatuses = ["waiting", "scheduled", "active"];
    let innerUnsub = null;

    // Clear all queue-related UI elements
    const setEmpty = () => {
        safeSet("queueCount",        "");
        safeSet("queueProgressText", "");
        safeSet("progressPercent",   "");
        safeSet("queuePosition",     "");
        safeSet("waitTime",          "");
        const meter = document.getElementById("queueMeter");
        if (meter) meter.value = 0;
    };

    // Listen for changes to this patient's queue record
    const appointmentQ = query(
        collection(db, "Queues"),
        where("appointmentId", "==", appointmentId)
    );

    const outerUnsub = onSnapshot(appointmentQ, (snapshot) => {

        // Tear down the previous inner listener before setting up a new one
        if (innerUnsub) { innerUnsub(); innerUnsub = null; }

        // Get all active queue entries for this appointment
        const activeEntries = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => activeStatuses.includes((d.status || "").toLowerCase().trim()));

        // If appointment no longer in active queue, clear UI and stop listening
        if (activeEntries.length === 0) { setEmpty(); return; }

        // Get this patient's queue record
        const myDoc  = snapshot.docs.find(d =>
            activeStatuses.includes((d.data().status || "").toLowerCase().trim())
        );
        const myData = { id: myDoc.id, ...myDoc.data() };

        // Now listen for changes to all queue entries at this clinic
        // This gives us the total queue size and patient's relative position
        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", Number(clinicID))
        );

        innerUnsub = onSnapshot(clinicQ, async (clinicSnap) => {

            // Get all active patients at clinic, sorted by position
            let all = clinicSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(d => activeStatuses.includes((d.status || "").toLowerCase().trim()))
                .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

            // Fallback: try matching clinic ID as string in case numeric comparison fails
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

            // If patient is no longer in clinic queue, clear display
            if (userIndex === -1) { setEmpty(); return; }

            const entry    = all[userIndex];
            const position = entry.position ?? (userIndex + 1);
            const isWalkIn = entry.isWalkIn ?? false;

            // Update queue position display (e.g., "3 out of 12")
            safeSet("queueCount",    `${position} out of ${total}`);
            safeSet("queuePosition", String(position));

            // Calculate progress percentage: how many people are behind this patient
            let percent = 0;
            if (total === 1)  percent = 100;
            else              percent = Math.round(((total - position) / (total - 1)) * 100);

            safeSet("progressPercent", `${percent}%`);
            const meter = document.getElementById("queueMeter");
            if (meter) meter.value = percent;
            safeSet("queueProgressText", "");

            /* Disabled feature: send email notification when patient is next in queue
            if (position === 2 && !myData.emailSent && patientEmail) {
                try {
                    emailjs.init("jWEiS_k1FnVa1Zz5S");
                    await emailjs.send("service_j8zb3jh", "template_neu0ubc", {
                        email:              patientEmail,
                        name:               patientName,
                        clinic_name:        clinicName,
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

            // Get ML-predicted wait time from the Flask API
            safeSet("waitTime", "...");
            const requestId = ++lastRequestId;

            const predicted = await getWaitTime({
                clinicID,
                queuePosition: position,
                queueLength:   total,
                isWalkIn,
            });

            // Ignore response if a newer request has been made
            if (requestId !== lastRequestId) return;

            // Use model prediction if available, otherwise fall back to simple formula
            const displayWait = predicted !== null
                ? predicted
                : Math.round(position * 14);

            safeSet("waitTime", `${displayWait} min`);

            // Save predicted wait time to Firestore for analytics/debugging
            try {
                await updateDoc(doc(db, "Queues", myData.id), {
                    estimateWait: displayWait,
                });
            } catch (e) {
                console.warn("Could not update estimateWait:", e);
            }
        });
    });

    // Return single cleanup function to unsubscribe all listeners
    return () => {
        outerUnsub();
        if (innerUnsub) innerUnsub();
    };
}