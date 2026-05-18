import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── Firebase Config ────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── ML API ──────────────────────────────────────────────────────────────────
const ML_API_URL = "https://sd-carequeue.onrender.com/predict";

async function fetchWaitTime({ clinicID, queuePosition, queueLength, isWalkIn = false }) {
    try {
        const res = await fetch(ML_API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinicID:      Number(clinicID),
                queuePosition: Number(queuePosition),
                queueLength:   Number(queueLength),
                isWalkIn:      Boolean(isWalkIn)
            })
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.estimatedWaitTime ?? null;
    } catch {
        return null;
    }
}

// ─── Status Pipeline ────────────────────────────────────────────────────────
const STATUS_PIPELINE = ["waiting", "in consultation", "completed"];

const STATUS_LABELS = {
    "waiting":         "Waiting",
    "in consultation": "In Consultation",
    "completed":       "Completed",
    "cancelled":       "Cancelled"
};

const ACTIVE_STATUSES = new Set(["waiting", "in consultation"]);

// ─── DOM References ─────────────────────────────────────────────────────────
const nameSurnameEl = document.querySelector(".name-Surname");
const queueList     = document.getElementById("upcoming");

// ─── State ──────────────────────────────────────────────────────────────────
let queueData            = [];
let unsubscribeReg       = null;
let unsubscribeWalkIn    = null;
let unsubscribeAvgWait   = null;
let regularAppts         = [];
let walkInAppts          = [];
let staffClinicID        = null;
const sendingPositionTwo = new Set();
let authRunId            = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────
function getTodayString() {
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

// ─── Render: Empty State ─────────────────────────────────────────────────────
function renderEmptyState() {
    queueList.innerHTML = `
        <li class="empty-state">
            <i class="fa-solid fa-user-slash empty-icon"></i>
            <p>No patients in queue for today</p>
        </li>`;
}

// ─── Position-2 Notification ─────────────────────────────────────────────────
async function sendPositionTwoNotification(appointment) {
    try {
        if (!appointment.userID) return;
        if (!appointment.patientEmail) return;

        await updateDoc(doc(db, "Queues", appointment.id), { emailSent: true });

        const clinicName = appointment.clinicName?.trim() || "Clinic";
        await addDoc(collection(db, "Notifications"), {
            userID:     appointment.userID,
            clinicID:   Number(staffClinicID),
            clinicName,
            type:       "Appointment",
            title:      "Appointment In An Hour!",
            message:    `Your ${appointment.reason || "appointment"} at ${clinicName} is in an hour. You are position 2. Please make your way to the clinic.`,
            read:       false,
            createdAt:  serverTimestamp()
        });

        console.log("Position 2 email and notification sent");
    } catch (error) {
        console.error("Failed to send position 2 notification:", error);
        sendingPositionTwo.delete(appointment.id);
    }
}

// ─── Render: Single Queue Card ───────────────────────────────────────────────
function buildCard(appointment, positionLabel) {
    const status     = (appointment.status || "waiting").toLowerCase().trim();
    const label      = STATUS_LABELS[status] || status;
    const pipeIdx    = STATUS_PIPELINE.indexOf(status);
    const nextStatus = (pipeIdx >= 0 && pipeIdx < STATUS_PIPELINE.length - 1)
        ? STATUS_PIPELINE[pipeIdx + 1]
        : null;
    const nextLabel  = nextStatus ? STATUS_LABELS[nextStatus] : null;
    const isDone     = !ACTIVE_STATUSES.has(status);

    const li = document.createElement("li");
    li.classList.add("appointment-card", "queue-card");
    if (status === "in consultation") li.classList.add("active-consult");
    if (isDone) li.classList.add("done-card");
    li.dataset.appointmentId = appointment.id;

    const walkInBadge = appointment.isWalkIn
        ? `<section class="badge badge-walkin" title="Walk-in patient">Walk-in</section>`
        : "";

    li.innerHTML = `
        <section class="queue-position ${isDone ? "pos-done" : ""}">${positionLabel}</section>

        <article class="card-body">
            <header class="card-clinic-group">
                <p class="card-patient-name">
                    <i class="fa-solid fa-user-circle"></i>
                    ${appointment.patientName || "Unknown Patient"}
                    ${walkInBadge}
                </p>
                <section class="badge badge-${status.replace(/ /g, "-")}">
                    ${label}
                </section>
            </header>

            <ul class="card-meta">
                <li class="meta-item">
                    <i class="fa-solid fa-clock meta-icon"></i>
                    ${appointment.time || "—"}
                </li>
                ${appointment.reason ? `
                <li class="meta-item">
                    <i class="fa-solid fa-notes-medical meta-icon"></i>
                    ${appointment.reason}
                </li>` : ""}
            </ul>

            <footer class="card-footer queue-actions">
                ${!isDone && nextLabel ? `
                <button class="action-btn advance-btn"
                    data-id="${appointment.id}"
                    data-next="${nextStatus}">
                    <i class="fa-solid fa-arrow-right"></i>
                    Mark as ${nextLabel}
                </button>` : ""}

                ${!isDone ? `
                <button class="action-btn cancel-btn-queue"
                    data-id="${appointment.id}">
                    <i class="fa-solid fa-xmark"></i>
                    Cancel
                </button>` : `
                <section class="completed-tag">
                    <i class="fa-solid fa-circle-check"></i> ${label}
                </section>`}
            </footer>
        </article>
    `;

    const advBtn = li.querySelector(".advance-btn");
    const canBtn = li.querySelector(".cancel-btn-queue");

    if (advBtn) advBtn.addEventListener("click", () => updateStatus(appointment.id, advBtn.dataset.next));
    if (canBtn) canBtn.addEventListener("click", () => updateStatus(appointment.id, "cancelled"));

    if (positionLabel === 2 && !appointment.emailSent && !sendingPositionTwo.has(appointment.id)) {
        sendingPositionTwo.add(appointment.id);
        console.log("FINAL APPOINTMENT OBJECT:", appointment);
        sendPositionTwoNotification(appointment);
    }

    return li;
}

// ─── Update Stats Cards ──────────────────────────────────────────────────────
// stat-avgwait is owned exclusively by startAvgWaitListener — not touched here.
function updateStats() {
    const total     = queueData.length;
    const inQueue   = queueData.filter(a => ACTIVE_STATUSES.has((a.status || "").toLowerCase())).length;
    const completed = queueData.filter(a => (a.status || "").toLowerCase() === "completed").length;

    const el = (id) => document.getElementById(id);
    if (el("stat-total"))     el("stat-total").textContent     = total;
    if (el("stat-inqueue"))   el("stat-inqueue").textContent   = inQueue;
    if (el("stat-completed")) el("stat-completed").textContent = completed;
}

// ─── Avg Wait Listener ────────────────────────────────────────────────────────
// Watches Queues in real time and averages the ML-written estimateWait
// values across all active entries for today. This is the sole owner of
// the stat-avgwait element.
function startAvgWaitListener() {
    if (unsubscribeAvgWait) { unsubscribeAvgWait(); unsubscribeAvgWait = null; }

    const today = getTodayString();

    const q = query(
        collection(db, "Queues"),
        where("clinicID", "==", Number(staffClinicID)),
        where("date",     "==", today)
    );

    unsubscribeAvgWait = onSnapshot(q, (snapshot) => {
        const el = document.getElementById("stat-avgwait");
        if (!el) return;

        const waits = snapshot.docs
            .map(d => d.data())
            .filter(d => {
                const status = (d.status || "").toLowerCase().trim();
                return ACTIVE_STATUSES.has(status) && d.estimateWait != null;
            })
            .map(d => Number(d.estimateWait))
            .filter(n => !isNaN(n) && n > 0);

        el.textContent = waits.length
            ? `${Math.round(waits.reduce((s, w) => s + w, 0) / waits.length)} min`
            : "—";
    }, () => {
        const el = document.getElementById("stat-avgwait");
        if (el) el.textContent = "—";
    });
}

// ─── Render: Full Queue ──────────────────────────────────────────────────────
function renderQueue() {
    updateStats();
    queueList.innerHTML = "";

    if (!queueData.length) { renderEmptyState(); return; }

    const active = queueData
        .filter(a => ACTIVE_STATUSES.has((a.status || "").toLowerCase()))
        .sort((a, b) =>
            (a.queuePosition || 999) - (b.queuePosition || 999) ||
            (a.time || "").localeCompare(b.time || "")
        );

    const done = queueData.filter(
        a => !ACTIVE_STATUSES.has((a.status || "").toLowerCase())
    );

    active.forEach((appt, idx) => queueList.appendChild(buildCard(appt, idx + 1)));

    if (!active.length) renderEmptyState();

    if (done.length) {
        const divider = document.createElement("li");
        divider.className = "section-divider";
        divider.innerHTML = `<section>Completed &amp; Cancelled</section>`;
        queueList.appendChild(divider);
        done.forEach(appt => queueList.appendChild(buildCard(appt, "—")));
    }
}

// ─── Merge, resolve names, sync to Queues, render ────────────────────────────
async function mergeAndRender() {
    const combined = [...regularAppts, ...walkInAppts];
    const seen     = new Set();
    const all      = combined.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
    }).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    const existingNames = Object.fromEntries(queueData.map(a => [a.id, a.patientName]));

    await Promise.all(all.map(async (appt) => {
        if (appt.patientName) return;
        if (existingNames[appt.id]) {
            appt.patientName = existingNames[appt.id];
        } else if (appt.userID) {
            try {
                const userDoc = await getDoc(doc(db, "Users", appt.userID));
                if (userDoc.exists()) appt.patientName = userDoc.data().displayName || null;
            } catch (err) {
                console.error("Failed to fetch patient name:", err);
            }
        }
    }));

    // Assign positions to active patients only
    let pos = 1;
    all.forEach(appt => {
        appt.queuePosition = ACTIVE_STATUSES.has((appt.status || "").toLowerCase())
            ? pos++
            : null;
    });

    queueData = all;

    await deleteOldQueueEntries();
    await syncAppointmentsToQueues(all);  // writes base fields + calls ML
    renderQueue();
}

// ─── Update Status ────────────────────────────────────────────────────────────
async function updateStatus(appointmentId, newStatus) {
    try {
        await updateDoc(doc(db, "Appointments", appointmentId), {
            status:    newStatus,
            updatedAt: serverTimestamp()
        });

        const queueRef  = doc(db, "Queues", appointmentId);
        const queueSnap = await getDoc(queueRef);
        if (queueSnap.exists()) {
            await updateDoc(queueRef, {
                status:    newStatus,
                position:  null,
                updatedAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.error("Failed to update status:", err);
        alert("Could not update patient status. Please try again.");
    }
}

// ─── Delete Old Queue Entries ─────────────────────────────────────────────────
async function deleteOldQueueEntries() {
    const today = getTodayString();
    try {
        const allQueues = await getDocs(collection(db, "Queues"));
        const deletions = [];
        allQueues.forEach(docSnap => {
            const d = docSnap.data();
            if (d.clinicID === Number(staffClinicID) && d.date !== today) {
                deletions.push(deleteDoc(doc(db, "Queues", docSnap.id)));
            }
        });
        await Promise.all(deletions);
        if (deletions.length) console.log(`🗑️ Deleted ${deletions.length} old queue entries`);
    } catch (err) {
        console.error("Failed to delete old queue entries:", err);
    }
}

// ─── Sync Appointments → Queues + call ML for every active patient ────────────
async function syncAppointmentsToQueues(appointments) {
    const today       = getTodayString();
    const activeAppts = appointments.filter(a =>
        ACTIVE_STATUSES.has((a.status || "").toLowerCase())
    );
    const queueLength = activeAppts.length;

    // Step 1: Write base fields for every appointment (merge so we never
    //         clobber an already-written estimateWait from the patient side)
    const baseWrites = appointments.map(appt => {
        const isActive = ACTIVE_STATUSES.has((appt.status || "").toLowerCase());
        return setDoc(doc(db, "Queues", appt.id), {
            appointmentId: appt.id,
            clinicID:      Number(staffClinicID),
            patientEmail:  appt.patientEmail || "",
            clinicName:    appt.clinicName   || "",
            reason:        appt.reason       || "",
            emailSent:     appt.emailSent    || false,
            date:          today,
            userID:        appt.userID       || null,
            patientName:   appt.patientName  || null,
            status:        appt.status       || "waiting",
            time:          appt.time         || "",
            position:      isActive ? appt.queuePosition : null,
            isWalkIn:      appt.isWalkIn     || false,
            updatedAt:     serverTimestamp()
            // estimateWait is NOT included here — Step 2 writes it via ML
        }, { merge: true });
    });

    try {
        await Promise.all(baseWrites);
        console.log(`✅ Synced ${baseWrites.length} appointments to Queues`);
    } catch (err) {
        console.error("Failed to sync appointments to Queues:", err);
        return;
    }

    // Step 2: Call ML API for every active patient and write the real
    //         estimateWait back to their Queue doc. Runs in parallel.
    if (!queueLength) return;

    await Promise.all(activeAppts.map(async (appt) => {
        const predicted = await fetchWaitTime({
            clinicID:      staffClinicID,
            queuePosition: appt.queuePosition,
            queueLength,
            isWalkIn:      appt.isWalkIn || false
        });

        // Fall back to formula if the API is down / cold-starting
        const estimateWait = predicted !== null
            ? predicted
            : Math.round((appt.queuePosition - 1) * 14);

        try {
            await updateDoc(doc(db, "Queues", appt.id), { estimateWait });
            console.log(`🤖 ML wait for position ${appt.queuePosition}: ${estimateWait} min`);
        } catch (err) {
            console.warn(`Could not write estimateWait for ${appt.id}:`, err);
        }
    }));
}

// ─── Start Real-Time Queue Listeners ─────────────────────────────────────────
function startQueueListeners() {
    if (unsubscribeReg)    { unsubscribeReg();    unsubscribeReg    = null; }
    if (unsubscribeWalkIn) { unsubscribeWalkIn(); unsubscribeWalkIn = null; }

    queueList.innerHTML = `
        <li class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i> Loading today's queue...
        </li>`;

    const today = getTodayString();
    console.log("🔍 Starting listeners | clinicID:", staffClinicID, "| today:", today);

    // Regular appointments (clinicID as number)
    const regQuery = query(
        collection(db, "Appointments"),
        where("date",     "==", today),
        where("clinicID", "==", Number(staffClinicID))
    );

    unsubscribeReg = onSnapshot(regQuery, (snapshot) => {
        console.log("📋 Regular appointments:", snapshot.size);
        regularAppts = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            let status = (d.status || "waiting").toLowerCase().trim();
            if (status === "scheduled") {
                status = "waiting";
                updateDoc(doc(db, "Appointments", docSnap.id), {
                    status: "waiting",
                    updatedAt: serverTimestamp()
                }).catch(err => {
                    console.error("Failed to move scheduled appointment into queue:", err);
                });
            }
            regularAppts.push({
                id:           docSnap.id,
                time:         d.time         || "",
                patientEmail: d.patientEmail || "",
                clinicID:     d.clinicID     || Number(staffClinicID),
                clinicName:   d.clinicName   || "Clinic",
                status,
                reason:       d.reason       || "",
                patientName:  d.patientName  || d.name || null,
                isWalkIn:     false,
                userID:       d.userID       || null
            });
        });
        mergeAndRender();
    }, (err) => console.error("Regular appointments listener error:", err));

    // Walk-in appointments (clinicId as string)
    const walkInQuery = query(
        collection(db, "Appointments"),
        where("date",     "==", today),
        where("clinicId", "==", staffClinicID),
        where("isWalkIn", "==", true)
    );

    unsubscribeWalkIn = onSnapshot(walkInQuery, (snapshot) => {
        console.log("🚶 Walk-in appointments:", snapshot.size);
        walkInAppts = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const status = (d.status || "waiting").toLowerCase().trim();
            walkInAppts.push({
                id:          docSnap.id,
                time:        d.time        || "",
                status,
                reason:      d.reason      || "",
                patientName: d.patientName || null,
                isWalkIn:    true,
                userID:      null
            });
        });
        mergeAndRender();
    }, (err) => console.error("Walk-in appointments listener error:", err));
}

// ─── Auth & Bootstrap ────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    const runId = ++authRunId;

    if (!user) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        if (unsubscribeReg)     { unsubscribeReg();     unsubscribeReg     = null; }
        if (unsubscribeWalkIn)  { unsubscribeWalkIn();  unsubscribeWalkIn  = null; }
        if (unsubscribeAvgWait) { unsubscribeAvgWait(); unsubscribeAvgWait = null; }
        staffClinicID = null;
        renderEmptyState();
        return;
    }

    const staffName = user.displayName || "Staff";
    if (nameSurnameEl) nameSurnameEl.textContent = staffName;

    const staffEmailEl      = document.getElementById("staffEmail");
    const staffAvatarEl     = document.getElementById("staffAvatar");
    const staffNameFooterEl = document.getElementById("staffName");

    if (staffEmailEl)      staffEmailEl.textContent      = user.email;
    if (staffNameFooterEl) staffNameFooterEl.textContent = staffName;
    if (staffAvatarEl) {
        staffAvatarEl.textContent = staffName
            .split(" ").map(n => n[0]).join("").toUpperCase();
    }

    try {
        const staffQuery = query(
            collection(db, "ApprovedStaff"),
            where("email", "==", user.email)
        );
        const snapshot = await getDocs(staffQuery);
        if (runId !== authRunId) return;

        console.log("📄 Snapshot empty?", snapshot.empty);
        if (!snapshot.empty) {
            staffClinicID = snapshot.docs[0].data().clinicId || null;
            console.log("🏥 staffClinicID:", staffClinicID);
        }
    } catch (err) {
        console.error("Failed to fetch staff clinic:", err);
    }

    if (runId !== authRunId) return;

    if (!staffClinicID) {
        queueList.innerHTML = `
            <li class="empty-state error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                Could not determine your clinic. Please contact support.
            </li>`;
        return;
    }

    startQueueListeners();
    startAvgWaitListener();
});

// ─── Test Helpers ────────────────────────────────────────────────────────────
function __setQueueDataForTest(data)   { queueData    = data; }
function __setStaffClinicIDForTest(id) { staffClinicID = id;  }

export {
    getTodayString,
    renderEmptyState,
    buildCard,
    updateStats,
    renderQueue,
    mergeAndRender,
    updateStatus,
    deleteOldQueueEntries,
    syncAppointmentsToQueues,
    startQueueListeners,
    startAvgWaitListener,
    sendPositionTwoNotification,
    __setQueueDataForTest,
    __setStaffClinicIDForTest
};
