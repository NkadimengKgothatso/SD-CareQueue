import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    getDoc
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
const confirmButton = document.querySelector(".confirm-Button");

// ─── State ──────────────────────────────────────────────────────────────────
let queueData = [];

// ─── Helpers ────────────────────────────────────────────────────────────────
function getTodayString() {
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

function getCurrentTimeString() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function getNextQueuePosition() {
    if (!queueData.length) return 1;
    return Math.max(...queueData.map(a => a.queuePosition || 0)) + 1;
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
    const status   = (appointment.status || "waiting").toLowerCase().trim();
    const label    = STATUS_LABELS[status] || status;
    const pipeIdx  = STATUS_PIPELINE.indexOf(status);
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

    li.innerHTML = `
        <div class="queue-position ${isDone ? "pos-done" : ""}">${positionLabel}</div>

        <article class="card-body">
            <header class="card-clinic-group">
                <p class="card-patient-name">
                    <i class="fa-solid fa-user-circle"></i>
                    ${appointment.patientName || "Walk-in Patient"}
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
                ${appointment.isWalkIn ? `
                <li class="meta-item walk-in-tag">
                    <i class="fa-solid fa-person-walking meta-icon"></i>
                    Walk-in
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

// ─── Render: Full Queue ──────────────────────────────────────────────────────
function renderQueue() {
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

// ─── Update Status ───────────────────────────────────────────────────────────
async function updateStatus(appointmentId, newStatus) {
    try {
        await updateDoc(doc(db, "Appointments", appointmentId), {
            status:    newStatus,
            updatedAt: serverTimestamp()
        });

        const appt = queueData.find(a => a.id === appointmentId);
        if (appt) appt.status = newStatus;

        renderQueue();
    } catch (err) {
        console.error("Failed to update status:", err);
        alert("Could not update patient status. Please try again.");
    }
}

// ─── Walk-in Modal ───────────────────────────────────────────────────────────
function createWalkInModal() {
    if (document.getElementById("walkInModal")) return;

    const modal = document.createElement("dialog");
    modal.id = "walkInModal";

    modal.innerHTML = `
        <section class="modal-inner">
            <header class="modal-header">
                <i class="fa-solid fa-person-walking"></i>
                <h2>Add Walk-in Patient</h2>
            </header>

            <div class="modal-field">
                <label for="walkInName">Patient Name <span class="required">*</span></label>
                <input type="text" id="walkInName" placeholder="Full name" autocomplete="off"/>
            </div>

            <div class="modal-field">
                <label for="walkInReason">Reason for Visit</label>
                <select id="walkInReason" class="reason-select">
                    <option value="">Select reason</option>
                    <option>General Checkup</option>
                    <option>Vaccination</option>
                    <option>Follow-up</option>
                    <option>Prescription Refill</option>
                    <option>Family Planning</option>
                    <option>Child Health</option>
                    <option>Chronic Medication</option>
                    <option>Other</option>
                </select>
            </div>

            <p id="walkInError" class="modal-error" hidden></p>

            <footer class="modal-footer">
                <button id="walkInConfirm" class="primary-btn">
                    <i class="fa-solid fa-plus"></i> Add to Queue
                </button>
                <button id="walkInClose" class="secondary-btn">
                    <i class="fa-solid fa-arrow-left"></i> Cancel
                </button>
            </footer>
        </section>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#walkInClose").addEventListener("click", () => modal.close());

    modal.querySelector("#walkInConfirm").addEventListener("click", async () => {
        const nameInput   = modal.querySelector("#walkInName");
        const reasonInput = modal.querySelector("#walkInReason");
        const errorEl     = modal.querySelector("#walkInError");

        const name   = nameInput.value.trim();
        const reason = reasonInput.value;

        if (!name) {
            errorEl.textContent = "Please enter the patient's name.";
            errorEl.hidden = false;
            return;
        }

        errorEl.hidden = true;

        const position = getNextQueuePosition();
        const todayStr = getTodayString();
        const timeStr  = getCurrentTimeString();

        const firestorePayload = {
            date:          todayStr,
            time:          timeStr,
            status:        "waiting",
            reason:        reason,
            patientName:   name,
            isWalkIn:      true,
            queuePosition: position,
            createdAt:     serverTimestamp()
        };

        try {
            const docRef = await addDoc(collection(db, "Appointments"), firestorePayload);

            queueData.push({
                id:            docRef.id,
                date:          todayStr,
                time:          timeStr,
                status:        "waiting",
                reason:        reason,
                patientName:   name,
                isWalkIn:      true,
                queuePosition: position
            });

            renderQueue();
            modal.close();
            nameInput.value   = "";
            reasonInput.value = "";

        } catch (err) {
            console.error("Walk-in addDoc failed:", err.code, err.message);
            errorEl.textContent = `Failed to add patient: ${err.message}`;
            errorEl.hidden = false;
        }
    });
}

// ─── Inject Walk-in Trigger Button ──────────────────────────────────────────
function injectWalkInButton() {
    if (document.getElementById("walkInTriggerBtn")) return;

    const btn     = document.createElement("button");
    btn.id        = "walkInTriggerBtn";
    btn.className = "walk-in-trigger-btn";
    btn.innerHTML = `<i class="fa-solid fa-person-walking"></i> Add Walk-in Patient`;
    btn.addEventListener("click", () => document.getElementById("walkInModal")?.showModal());

    const anchor = document.querySelector(".carousel-outer") || queueList;
    anchor.parentElement?.insertBefore(btn, anchor);
}

// ─── Setup Confirm Button ────────────────────────────────────────────────────
function setupConfirmButton() {
    if (!confirmButton) return;

    confirmButton.innerHTML = `<i class="fa-solid fa-circle-check"></i> Complete Active Patient`;

    confirmButton.addEventListener("click", () => {
        const inConsult = queueData.find(
            a => (a.status || "").toLowerCase() === "in consultation"
        );

        if (inConsult) {
            updateStatus(inConsult.id, "completed");
            return;
        }

        const nextWaiting = queueData
            .filter(a => (a.status || "").toLowerCase() === "waiting")
            .sort((a, b) => (a.queuePosition || 999) - (b.queuePosition || 999))[0];

        if (nextWaiting) {
            updateStatus(nextWaiting.id, "in consultation");
        } else {
            alert("No active patients to advance.");
        }
    });
}

// ─── Load Today's Queue ──────────────────────────────────────────────────────
async function loadTodaysQueue() {
    queueList.innerHTML = `
        <li class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i> Loading today's queue…
        </li>`;

    try {
        const q = query(
            collection(db, "Appointments"),
            where("date", "==", getTodayString())
        );

        const snapshot = await getDocs(q);
        queueData = [];
        let autoPosition = 1;

    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        let status = (d.status || "waiting").toLowerCase().trim();

        // Auto-convert scheduled → waiting
        if (status === "scheduled") status = "waiting";

        queueData.push({
            id:            docSnap.id,
            date:          d.date,
            time:          d.time          || "",
            status:        status,
            reason:        d.reason        || "",
            patientName:   d.patientName   || null,
            isWalkIn:      d.isWalkIn      || false,
            queuePosition: d.queuePosition || autoPosition++,
            userID:        d.userID        || null
        });
    });

        // Fetch patient names from Users collection
        for (let appt of queueData) {
            if (appt.userID) {
                try {
                    const userDoc = await getDoc(doc(db, "Users", appt.userID));
                    if (userDoc.exists()) {
                        appt.patientName = userDoc.data().displayName;
                    }
                } catch (err) {
                    console.error("Failed to fetch patient name:", err);
                }
            }
        }

        renderQueue();

    } catch (err) {
        console.error("Failed to load queue:", err);
        queueList.innerHTML = `
            <li class="empty-state error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                Failed to load queue. Please refresh the page.
            </li>`;
    }
}

// ─── Auth & Bootstrap ────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        renderEmptyState();
        return;
    }

    if (nameSurnameEl) nameSurnameEl.textContent = user.displayName || "Staff";

    createWalkInModal();
    injectWalkInButton();
    setupConfirmButton();

    await loadTodaysQueue();
});

console.log("Today string:", getTodayString());