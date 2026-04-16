import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    query,
    where,
    orderBy,
    addDoc,
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ─────────────────────────────
// Firebase Config
// ─────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ─────────────────────────────
// DOM
// ─────────────────────────────
const tableBody = document.getElementById("walkinTable");
const addBtn = document.querySelector(".add-btn");
const nameInput = document.getElementById("nameInput");
const reasonInput = document.getElementById("reasonInput");

const nameSurnameEl = document.querySelector(".name-Surname");
const clinicEl = document.querySelector(".clinic-name");


// ─────────────────────────────
// STATE
// ─────────────────────────────
let assignedClinic = null;
let unsubscribe = null;


// ─────────────────────────────
// STAFF FETCH (FIXED + SAFER)
// ─────────────────────────────
async function getStaffProfile(email) {

    const cleanEmail = (email || "").trim().toLowerCase();

    const snapshot = await getDocs(collection(db, "ApprovedStaff"));

    const match = snapshot.docs.find(doc => {
        const data = doc.data();
        return (data.email || "").trim().toLowerCase() === cleanEmail;
    });

    if (!match) {
        console.warn("No staff match for:", cleanEmail);
        return null;
    }

    return {
        id: match.id,
        ...match.data()
    };
}


// ─────────────────────────────
// TIME HELPERS
// ─────────────────────────────
function minutesToTime(m) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${h}:${mm}`;
}


// ─────────────────────────────
// SCHEDULING
// ─────────────────────────────
function getNextAvailableTime(appointments) {

    const START = 8 * 60;   // 08:00
    const END   = 17 * 60;  // 17:00
    const SLOT  = 30;

    // 1. Normalize used slots safely
    const used = new Set();

    for (const a of appointments) {
        if (!a || !a.time) continue;

        const status = (a.status || "").toLowerCase().trim();

        // ignore cancelled appointments
        if (status === "cancelled") continue;

        used.add(a.time.trim());
    }

    // 2. Build full slot list (more predictable than looping blindly)
    const slots = [];

    for (let t = START; t < END; t += SLOT) {
        slots.push(minutesToTime(t));
    }

    // 3. Find first free slot
    for (const slot of slots) {
        if (!used.has(slot)) {
            return slot;
        }
    }

    return "FULL";
}


// ─────────────────────────────
// LOAD APPOINTMENTS
// ─────────────────────────────
function loadAppointments() {

    if (!assignedClinic) return;

    if (unsubscribe) unsubscribe();

    const q = query(
        collection(db, "Appointments"),
        where("assignedClinic", "==", assignedClinic),
        orderBy("createdAt", "asc")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {

        let rows = "";
        let index = 1;

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const isWalkIn = d.isWalkIn === true;

            rows += `
                <tr>
                    <td>${index++}</td>
                    <td>
                        ${d.patientName || "Unknown"}
                        ${isWalkIn ? `<span class="badge">Walk-in</span>` : ""}
                    </td>
                    <td>${d.reason || ""}</td>
                    <td>${d.time || "—"}</td>
                    <td>${d.status || "waiting"}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = rows;
    });
}


function showConfirmModal(message) {
    return new Promise((resolve) => {
        if (document.getElementById("confirmModal")) {
            document.getElementById("confirmModal").remove();
        }

        const modal = document.createElement("dialog");
        modal.id = "confirmModal";

        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-card">

                    <div class="modal-header">
                        <i class="fa-solid fa-triangle-exclamation warning-icon"></i>
                        <h3>Confirm Action</h3>
                    </div>

                    <p class="modal-message">${message}</p>

                    <div class="modal-actions">
                        <button id="cancelBtn" class="btn cancel-btn">
                            <i class="fa-solid fa-xmark"></i>
                            Cancel
                        </button>

                        <button id="okBtn" class="btn confirm-btn">
                            <i class="fa-solid fa-user-plus"></i>
                            Add Patient
                        </button>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.showModal();

        modal.querySelector("#cancelBtn").onclick = () => {
            modal.close();
            modal.remove();
            resolve(false);
        };

        modal.querySelector("#okBtn").onclick = () => {
            modal.close();
            modal.remove();
            resolve(true);
        };
    });
}

// ─────────────────────────────
// ADD WALK-IN
// ─────────────────────────────
addBtn?.addEventListener("click", async () => {

    const name = nameInput?.value.trim();
    const reason = reasonInput?.value || "";

    if (!name) return alert("Please enter patient name");
    if (!assignedClinic) return alert("Clinic not loaded yet");


    const confirmed = await showConfirmModal(
        `Add ${name} to ${assignedClinic} queue?`
    );

    if (!confirmed) return;

    try {

        const snap = await getDocs(
            query(
                collection(db, "Appointments"),
                where("assignedClinic", "==", assignedClinic)
            )
        );

        const appointments = snap.docs.map(d => d.data());
        const assignedTime = getNextAvailableTime(appointments);

        if (assignedTime === "FULL") {
            return alert("Clinic fully booked");
        }

        const dup = await getDocs(
            query(
                collection(db, "Appointments"),
                where("assignedClinic", "==", assignedClinic),
                where("patientName", "==", name),
                where("reason", "==", reason),
                where("status", "==", "waiting")
            )
        );

        if (!dup.empty) {
            return alert("Already in queue");
        }

        await addDoc(collection(db, "Appointments"), {
            assignedClinic,
            patientName: name,
            reason,
            status: "waiting",
            isWalkIn: true,
            time: assignedTime,
            createdAt: serverTimestamp()
        });

        nameInput.value = "";
        reasonInput.value = "";

    } catch (err) {
        console.error(err);
        alert("Failed to add patient");
    }
});


// ─────────────────────────────
// AUTH BOOTSTRAP
// ─────────────────────────────
onAuthStateChanged(auth, async (user) => {

    if (!user) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        if (clinicEl) clinicEl.textContent = "";
        return;
    }

    const staff = await getStaffProfile(user.email);

    console.log("AUTH:", user.email);
    console.log("STAFF:", staff);

    if (!staff) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        if (clinicEl) clinicEl.textContent = "";
        return;
    }

    assignedClinic = staff.assignedClinic;

    // NAME DISPLAY
    if (nameSurnameEl) {
        nameSurnameEl.textContent = staff.displayName || "Staff";
    }

    // CLINIC DISPLAY
    if (clinicEl) {
        clinicEl.textContent = staff.assignedClinic || "No clinic assigned";
    }

    loadAppointments();
});