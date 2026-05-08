import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    updateDoc,
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

// ─── Constants ───────────────────────────────────────────────────────────────
const SLOT_START    = 8 * 60;   // 08:00
const SLOT_END      = 17 * 60;  // 17:00
const SLOT_DURATION = 30;       // minutes

const STATUS_LABELS = {
    "waiting":         "Waiting",
    "scheduled":       "Scheduled",
    "in consultation": "In Consultation",
    "completed":       "Completed",
    "cancelled":       "Cancelled"
};

// ─── DOM References ──────────────────────────────────────────────────────────
const nameSurnameEl   = document.querySelector(".name-Surname");
const appointmentList = document.getElementById("appointmentList");

// ─── State ───────────────────────────────────────────────────────────────────
let staffClinicID    = null;
let unsubscribe      = null;
let allAppointments  = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTodayString() {
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

function minutesToTime(m) {
    const h  = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${h}:${mm}`;
}

function getAllSlots() {
    const slots = [];
    for (let t = SLOT_START; t < SLOT_END; t += SLOT_DURATION) {
        slots.push(minutesToTime(t));
    }
    return slots;
}

// ─── Render: Empty State ──────────────────────────────────────────────────────
function renderEmptyState() {
    appointmentList.innerHTML = `
        <li class="empty-state">
            <i class="fa-solid fa-calendar-xmark empty-icon"></i>
            <p>No upcoming appointments</p>
        </li>`;
}

// ─── Render: Single Appointment Card ─────────────────────────────────────────
function buildCard(appt) {
    const status      = (appt.status || "scheduled").toLowerCase().trim();
    const label       = STATUS_LABELS[status] || status;
    const isCancelled = status === "cancelled";
    const isCompleted = status === "completed";
    const isDone      = isCancelled || isCompleted;

    const li = document.createElement("li");
    li.classList.add("appointment-card");
    if (isDone) li.classList.add("done-card");
    li.dataset.id = appt.id;

    const walkInBadge = appt.isWalkIn
        ? `<span class="badge badge-walkin">Walk-in</span>`
        : "";

    li.innerHTML = `
        <article class="card-body">
            <header class="card-clinic-group">
                <p class="card-patient-name">
                    <i class="fa-solid fa-user-circle"></i>
                    ${appt.patientName || "Unknown Patient"}
                    ${walkInBadge}
                </p>
                <span class="badge badge-${status.replace(/ /g, "-")}">
                    ${label}
                </span>
            </header>

            <ul class="card-meta">
                <li class="meta-item">
                    <i class="fa-solid fa-calendar meta-icon"></i>
                    ${appt.date || "—"}
                </li>
                <li class="meta-item">
                    <i class="fa-solid fa-clock meta-icon"></i>
                    ${appt.time || "—"}
                </li>
                ${appt.reason ? `
                <li class="meta-item">
                    <i class="fa-solid fa-notes-medical meta-icon"></i>
                    ${appt.reason}
                </li>` : ""}
            </ul>

            ${!isDone ? `
            <footer class="card-footer queue-actions">
                <button class="action-btn reschedule-btn" data-id="${appt.id}" data-date="${appt.date}">
                    <i class="fa-solid fa-calendar-pen"></i>
                    Reschedule
                </button>
                <button class="action-btn cancel-btn-queue" data-id="${appt.id}">
                    <i class="fa-solid fa-xmark"></i>
                    Cancel
                </button>
            </footer>` : ""}
        </article>
    `;

    // Button listeners
    const rescheduleBtn = li.querySelector(".reschedule-btn");
    const cancelBtn     = li.querySelector(".cancel-btn-queue");

    if (rescheduleBtn) rescheduleBtn.addEventListener("click", () => openRescheduleModal(appt));
    if (cancelBtn)     cancelBtn.addEventListener("click",     () => cancelAppointment(appt.id));

    return li;
}

// ─── Render: Full Appointment List ────────────────────────────────────────────
async function renderAppointments() {
    appointmentList.innerHTML = "";

    if (!allAppointments.length) {
        renderEmptyState();
        return;
    }

    // Resolve patient names
    await Promise.all(allAppointments.map(async (appt) => {
        if (!appt.patientName && appt.userID) {
            try {
                const userDoc = await getDoc(doc(db, "Users", appt.userID));
                if (userDoc.exists()) {
                    appt.patientName = userDoc.data().displayName || null;
                }
            } catch (err) {
                console.error("Failed to resolve patient name:", err);
            }
        }
    }));

    // Sort by date then time
    allAppointments.sort((a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        (a.time || "").localeCompare(b.time || "")
    );

    allAppointments.forEach(appt => {
        appointmentList.appendChild(buildCard(appt));
    });
}

// ─── Get Taken Slots for a Given Date ────────────────────────────────────────
async function getTakenSlots(date, excludeAppointmentId = null) {
    const takenSlots = new Set();

    // Query regular appointments
    const regSnap = await getDocs(query(
        collection(db, "Appointments"),
        where("date",     "==", date),
        where("clinicID", "==", Number(staffClinicID))
    ));

    regSnap.forEach(docSnap => {
        if (docSnap.id === excludeAppointmentId) return;
        const d      = docSnap.data();
        const status = (d.status || "").toLowerCase();
        if (status !== "cancelled" && d.time) takenSlots.add(d.time);
    });

    // Query walk-in appointments
    const walkInSnap = await getDocs(query(
        collection(db, "Appointments"),
        where("date",     "==", date),
        where("clinicId", "==", staffClinicID),
        where("isWalkIn", "==", true)
    ));

    walkInSnap.forEach(docSnap => {
        if (docSnap.id === excludeAppointmentId) return;
        const d      = docSnap.data();
        const status = (d.status || "").toLowerCase();
        if (status !== "cancelled" && d.time) takenSlots.add(d.time);
    });

    return takenSlots;
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────
async function openRescheduleModal(appt) {
    // Remove any existing modal
    document.getElementById("rescheduleModal")?.remove();

    const modal = document.createElement("dialog");
    modal.id = "rescheduleModal";
    modal.innerHTML = `
        <article class="modal-card">
            <header class="modal-header">
                <i class="fa-solid fa-calendar-pen"></i>
                <h2>Reschedule Appointment</h2>
            </header>

            <section class="modal-body">
                <p>Rescheduling: <strong>${appt.patientName || "Patient"}</strong></p>

                <div class="form-group">
                    <label for="rescheduleDate">Select Date</label>
                    <input type="date" id="rescheduleDate" min="${getTodayString()}" value="${appt.date || getTodayString()}" />
                </div>

                <div class="form-group">
                    <label for="rescheduleTime">Available Time Slots</label>
                    <select id="rescheduleTime">
                        <option value="">Loading slots...</option>
                    </select>
                </div>

                <p id="rescheduleError" class="error-msg" style="display:none; color:red;"></p>
            </section>

            <footer class="modal-actions">
                <button id="rescheduleCancelBtn" class="btn cancel-btn">Cancel</button>
                <button id="rescheduleConfirmBtn" class="btn confirm-btn">Confirm Reschedule</button>
            </footer>
        </article>
    `;

    document.body.appendChild(modal);
    modal.showModal();

    const dateInput    = modal.querySelector("#rescheduleDate");
    const timeSelect   = modal.querySelector("#rescheduleTime");
    const errorMsg     = modal.querySelector("#rescheduleError");
    const cancelBtn    = modal.querySelector("#rescheduleCancelBtn");
    const confirmBtn   = modal.querySelector("#rescheduleConfirmBtn");

    // ── Load slots for selected date ──
    async function loadSlots(date) {
        timeSelect.innerHTML = `<option value="">Loading...</option>`;
        const takenSlots  = await getTakenSlots(date, appt.id);
        const allSlots    = getAllSlots();
        const freeSlots   = allSlots.filter(s => !takenSlots.has(s));

        if (!freeSlots.length) {
            timeSelect.innerHTML = `<option value="">No slots available</option>`;
            return;
        }

        timeSelect.innerHTML = freeSlots
            .map(s => `<option value="${s}">${s}</option>`)
            .join("");
    }

    // Load slots for initial date
    await loadSlots(dateInput.value);

    // Reload slots when date changes
    dateInput.addEventListener("change", () => loadSlots(dateInput.value));

    // ── Cancel ──
    cancelBtn.addEventListener("click", () => {
        modal.close();
        modal.remove();
    });

    // ── Confirm ──
    confirmBtn.addEventListener("click", async () => {
        const newDate = dateInput.value;
        const newTime = timeSelect.value;

        if (!newDate || !newTime) {
            errorMsg.textContent = "Please select a date and time slot.";
            errorMsg.style.display = "block";
            return;
        }

        confirmBtn.disabled    = true;
        confirmBtn.textContent = "Saving...";

        try {
            await updateDoc(doc(db, "Appointments", appt.id), {
                date:      newDate,
                time:      newTime,
                status:    "scheduled",
                updatedAt: serverTimestamp()
            });

            modal.close();
            modal.remove();
        } catch (err) {
            console.error("Failed to reschedule:", err);
            errorMsg.textContent    = "Failed to reschedule. Please try again.";
            errorMsg.style.display  = "block";
            confirmBtn.disabled     = false;
            confirmBtn.textContent  = "Confirm Reschedule";
        }
    });
}

// ─── Cancel Appointment ───────────────────────────────────────────────────────
async function cancelAppointment(appointmentId) {
    // Confirm dialog
    const confirmed = await showConfirmModal("Are you sure you want to cancel this appointment?");
    if (!confirmed) return;

    try {
        await updateDoc(doc(db, "Appointments", appointmentId), {
            status:    "cancelled",
            updatedAt: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to cancel appointment:", err);
        alert("Could not cancel appointment. Please try again.");
    }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function showConfirmModal(message) {
    return new Promise((resolve) => {
        document.getElementById("confirmModal")?.remove();

        const modal = document.createElement("dialog");
        modal.id = "confirmModal";
        modal.innerHTML = `
            <article class="modal-card">
                <header class="modal-header">
                    <i class="fa-solid fa-triangle-exclamation warning-icon"></i>
                    <h2>Confirm Action</h2>
                </header>
                <section class="modal-body">
                    <p>${message}</p>
                </section>
                <footer class="modal-actions">
                    <button id="confirmCancelBtn" class="btn cancel-btn">No, go back</button>
                    <button id="confirmOkBtn" class="btn confirm-btn">Yes, cancel it</button>
                </footer>
            </article>
        `;

        document.body.appendChild(modal);
        modal.showModal();

        modal.querySelector("#confirmCancelBtn").onclick = () => {
            modal.close();
            modal.remove();
            resolve(false);
        };

        modal.querySelector("#confirmOkBtn").onclick = () => {
            modal.close();
            modal.remove();
            resolve(true);
        };
    });
}

// ─── Start Real-Time Listener ─────────────────────────────────────────────────
function startAppointmentsListener() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }

    appointmentList.innerHTML = `
        <li class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i> Loading appointments...
        </li>`;

    const today = getTodayString();

    console.log("🔍 Querying upcoming appointments for clinicID:", staffClinicID);

    // Regular appointments: today and future, not cancelled
    const q = query(
        collection(db, "Appointments"),
        where("clinicID", "==", Number(staffClinicID)),
        where("date",     ">=", today)
    );

    unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log("📋 Appointments snapshot size:", snapshot.size);

        allAppointments = [];
        snapshot.forEach(docSnap => {
            const d      = docSnap.data();
            const status = (d.status || "scheduled").toLowerCase().trim();

            // Skip cancelled appointments
            if (status === "cancelled") return;

            allAppointments.push({
                id:          docSnap.id,
                date:        d.date        || "",
                time:        d.time        || "",
                status,
                reason:      d.reason      || "",
                patientName: d.patientName || d.name || null,
                isWalkIn:    d.isWalkIn    || false,
                userID:      d.userID      || null
            });
        });

        await renderAppointments();

    }, (err) => {
        console.error("Appointments listener error:", err);
        appointmentList.innerHTML = `
            <li class="empty-state error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                Failed to load appointments. Please refresh the page.
            </li>`;
    });
}

// ─── Auth & Bootstrap ────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        staffClinicID = null;
        renderEmptyState();
        return;
    }

    // ── Populate sidebar UI ──
    const staffName = user.displayName || "Staff";
    if (nameSurnameEl) nameSurnameEl.textContent = staffName;

    const staffEmailEl      = document.getElementById("staffEmail");
    const staffAvatarEl     = document.getElementById("staffAvatar");
    const staffNameFooterEl = document.getElementById("staffName");

    if (staffEmailEl)      staffEmailEl.textContent  = user.email;
    if (staffNameFooterEl) staffNameFooterEl.textContent = staffName;
    if (staffAvatarEl) {
        staffAvatarEl.textContent = staffName
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase();
    }

    // ── Fetch staff clinic ──
    try {
        const staffQuery = query(
            collection(db, "ApprovedStaff"),
            where("email", "==", user.email)
        );
        const snapshot = await getDocs(staffQuery);

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            staffClinicID = data.clinicId || null;
            console.log("🏥 staffClinicID:", staffClinicID);
        }
    } catch (err) {
        console.error("Failed to fetch staff clinic:", err);
    }

    if (!staffClinicID) {
        appointmentList.innerHTML = `
            <li class="empty-state error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                Could not determine your clinic. Please contact support.
            </li>`;
        return;
    }

    startAppointmentsListener();
});