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
let queueData          = [];
let unsubscribeReg     = null;
let unsubscribeWalkIn  = null;
let regularAppts       = [];
let walkInAppts        = [];
let staffClinicID      = null;

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
        ? `<span class="badge badge-walkin" title="Walk-in patient">Walk-in</span>`
        : "";

    li.innerHTML = `
        <div class="queue-position ${isDone ? "pos-done" : ""}">${positionLabel}</div>

        <article class="card-body">
            <header class="card-clinic-group">
                <p class="card-patient-name">
                    <i class="fa-solid fa-user-circle"></i>
                    ${appointment.patientName || "Unknown Patient"}
                    ${walkInBadge}
                </p>
                <span class="badge badge-${status.replace(/ /g, "-")}">
                    ${label}
                </span>
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
                <span class="completed-tag">
                    <i class="fa-solid fa-circle-check"></i> ${label}
                </span>`}
            </footer>
        </article>
    `;

    const advBtn = li.querySelector(".advance-btn");
    const canBtn = li.querySelector(".cancel-btn-queue");

    if (advBtn) advBtn.addEventListener("click", () => updateStatus(appointment.id, advBtn.dataset.next));
    if (canBtn) canBtn.addEventListener("click", () => updateStatus(appointment.id, "cancelled"));

    return li;
}

// ─── Update Stats Cards ──────────────────────────────────────────────────────
function updateStats() {
    const total     = queueData.length;
    const inQueue   = queueData.filter(a => ACTIVE_STATUSES.has((a.status || "").toLowerCase())).length;
    const completed = queueData.filter(a => (a.status || "").toLowerCase() === "completed").length;

    const el = (id) => document.getElementById(id);
    if (el("stat-total"))     el("stat-total").textContent     = total;
    if (el("stat-inqueue"))   el("stat-inqueue").textContent   = inQueue;
    if (el("stat-completed")) el("stat-completed").textContent = completed;
    if (el("stat-avgwait"))   el("stat-avgwait").textContent   = "—";
}

// ─── Render: Full Queue ──────────────────────────────────────────────────────
function renderQueue() {
    updateStats();
    queueList.innerHTML = "";

    if (!queueData.length) {
        renderEmptyState();
        return;
    }

    const active = queueData
        .filter(a => ACTIVE_STATUSES.has((a.status || "").toLowerCase()))
        .sort((a, b) =>
            (a.queuePosition || 999) - (b.queuePosition || 999) ||
            (a.time || "").localeCompare(b.time || "")
        );

    const done = queueData.filter(
        a => !ACTIVE_STATUSES.has((a.status || "").toLowerCase())
    );

    active.forEach((appt, idx) => {
        queueList.appendChild(buildCard(appt, idx + 1));
    });

    if (!active.length) {
        renderEmptyState();
    }

    if (done.length) {
        const divider = document.createElement("li");
        divider.className = "section-divider";
        divider.innerHTML = `<span>Completed &amp; Cancelled</span>`;
        queueList.appendChild(divider);
        done.forEach(appt => queueList.appendChild(buildCard(appt, "—")));
    }
}

// ─── Merge both lists, resolve names, sync to Queues, render ─────────────────
async function mergeAndRender() {
    // Combine regular + walk-in, deduplicate by id, sort by time
    const combined = [...regularAppts, ...walkInAppts];
    const seen = new Set();
    const all = combined.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
    }).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    // Cache existing resolved names
    const existingNames = Object.fromEntries(
        queueData.map(a => [a.id, a.patientName])
    );

    // Resolve names - walk-ins already have patientName, regular appts may need Users lookup
    await Promise.all(all.map(async (appt) => {
        if (appt.patientName) return;
        if (existingNames[appt.id]) {
            appt.patientName = existingNames[appt.id];
        } else if (appt.userID) {
            try {
                const userDoc = await getDoc(doc(db, "Users", appt.userID));
                if (userDoc.exists()) {
                    appt.patientName = userDoc.data().displayName || null;
                }
            } catch (err) {
                console.error("Failed to fetch patient name:", err);
            }
        }
    }));

    // ── Assign positions ONLY to active patients, sorted by time ──
    // Done/cancelled patients get position null
    let activePosition = 1;
    all.forEach(appt => {
        if (ACTIVE_STATUSES.has((appt.status || "").toLowerCase())) {
            appt.queuePosition = activePosition++;
        } else {
            appt.queuePosition = null;
        }
    });

    queueData = all;

    await deleteOldQueueEntries();
    await syncAppointmentsToQueues(all);

    renderQueue();
}

// ─── Update Status in BOTH Appointments and Queues ───────────────────────────
async function updateStatus(appointmentId, newStatus) {
    try {
        await updateDoc(doc(db, "Appointments", appointmentId), {
            status:    newStatus,
            updatedAt: serverTimestamp()
        });

        // Update matching Queues entry (keyed by appointmentId)
        const queueRef  = doc(db, "Queues", appointmentId);
        const queueSnap = await getDoc(queueRef);
        if (queueSnap.exists()) {
            await updateDoc(queueRef, {
                status:    newStatus,
                position:  null,      // clear position immediately on Queues
                updatedAt: serverTimestamp()
            });
        }
        // mergeAndRender will fire automatically via onSnapshot
        // and will recalculate all remaining active positions
    } catch (err) {
        console.error("Failed to update status:", err);
        alert("Could not update patient status. Please try again.");
    }
}

// ─── Delete old Queues entries (not from today) ───────────────────────────────
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

// ─── Copy Today's Appointments into Queues ────────────────────────────────────
async function syncAppointmentsToQueues(appointments) {
    const today = getTodayString();

    const writes = appointments.map((appt) => {
        const isActive = ACTIVE_STATUSES.has((appt.status || "").toLowerCase());
        return setDoc(doc(db, "Queues", appt.id), {
            appointmentId: appt.id,
            clinicID:      Number(staffClinicID),
            date:          today,
            userID:        appt.userID      || null,
            patientName:   appt.patientName || null,
            status:        appt.status      || "waiting",
            time:          appt.time        || "",
            // Only active patients get a position and estimateWait
            position:      isActive ? appt.queuePosition : null,
            estimateWait:  isActive ? (appt.queuePosition - 1) * 15 : null,
            isWalkIn:      appt.isWalkIn    || false,
            updatedAt:     serverTimestamp()
        });
    });

    try {
        await Promise.all(writes);
        console.log(`✅ Synced ${writes.length} appointments to Queues`);
    } catch (err) {
        console.error("Failed to sync appointments to Queues:", err);
    }
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

    // ── Listener 1: Regular appointments (clinicID as number) ──
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
            if (status === "scheduled") status = "waiting";
            regularAppts.push({
                id:          docSnap.id,
                time:        d.time        || "",
                status,
                reason:      d.reason      || "",
                patientName: d.patientName || d.name || null,
                isWalkIn:    false,
                userID:      d.userID      || null
            });
        });
        mergeAndRender();
    }, (err) => console.error("Regular appointments listener error:", err));

    // ── Listener 2: Walk-in appointments (clinicId as string) ──
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
    if (!user) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        if (unsubscribeReg)    { unsubscribeReg();    unsubscribeReg    = null; }
        if (unsubscribeWalkIn) { unsubscribeWalkIn(); unsubscribeWalkIn = null; }
        staffClinicID = null;
        renderEmptyState();
        return;
    }

    if (nameSurnameEl) nameSurnameEl.textContent = user.displayName || "Staff";

    // Query ApprovedStaff by email
    try {
        const staffQuery = query(
            collection(db, "ApprovedStaff"),
            where("email", "==", user.email)
        );
        console.log("🔎 Searching ApprovedStaff for email:", user.email);
        const snapshot = await getDocs(staffQuery);
        console.log("📄 Snapshot empty?", snapshot.empty);

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            console.log("📄 Staff data:", JSON.stringify(data));
            staffClinicID = data.clinicId || null;
            console.log("🏥 staffClinicID:", staffClinicID);
        }
    } catch (err) {
        console.error("Failed to fetch staff clinic:", err);
    }

    if (!staffClinicID) {
        console.warn("No clinicID found for this staff member.");
        queueList.innerHTML = `
            <li class="empty-state error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                Could not determine your clinic. Please contact support.
            </li>`;
        return;
    }

    startQueueListeners();
});