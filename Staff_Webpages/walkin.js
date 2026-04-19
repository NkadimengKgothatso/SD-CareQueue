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


// Firebase Config
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


// DOM
const tableBody = document.getElementById("walkinTable");
const addBtn = document.querySelector(".add-btn");
const nameInput = document.getElementById("nameInput");
const reasonInput = document.getElementById("reasonInput");

const nameSurnameEl = document.querySelector(".name-Surname");
const clinicEl = document.querySelector(".clinic-name");


// STATE
let assignedClinic = null;
let clinicId = null;
let unsubscribe = null;



// DATE HELPERS (NEW), HELPS WITH RESETTING TICKET NUMBERS DAILY

function getToday() {
    return new Date().toISOString().split("T")[0];
}


// STAFF FETCH
async function getStaffProfile(email) {

    const cleanEmail = (email || "").trim().toLowerCase();

    const snapshot = await getDocs(collection(db, "ApprovedStaff"));

    const match = snapshot.docs.find(doc => {
        const data = doc.data();
        return (data.email || "").trim().toLowerCase() === cleanEmail;
    });

    if (!match) return null;

    return {
        id: match.id,
        ...match.data()
    };
}


function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(m) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${h}:${mm}`;
}

function isTaken(t, appointments, SLOT) {
    return appointments.some(a => {
        const start = timeToMinutes(a.time);
        return t >= start && t < start + SLOT;
    });
}

function roundToNextSlot(minutes, slot) {
    return Math.ceil(minutes / slot) * slot;
}

function getNextAvailableTime(appointments) {

    const START = 8 * 60;
    const END = 17 * 60;
    const SLOT = 30;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    console.log(" CURRENT TIME:", now.toString());
    console.log(" CURRENT MINUTES:", currentMinutes);

    // extract valid booked times
    const usedArray = appointments.filter(a =>
        a &&
        a.time &&
        (a.status || "").toLowerCase() !== "cancelled"
    );

    console.log(" RAW APPOINTMENTS USED FOR SCHEDULING:", usedArray);

    const used = new Set();

    for (const a of usedArray) {
        const mins = timeToMinutes(a.time);

        // only consider valid clinic slots
        if (mins >= START && mins < END) {
            used.add(mins);
        }
    }

    console.log(" USED SET:", [...used].map(minutesToTime));

    // start from next valid slot AFTER current time
    let t = Math.max(
        START,
        Math.ceil(currentMinutes / SLOT) * SLOT
    );

    console.log("🚀 START SLOT:", minutesToTime(t));

    while (t + SLOT <= END) {

        console.log(" CHECKING SLOT:", minutesToTime(t), "=>", t);

        if (!isTaken(t, usedArray, SLOT)) {
            console.log(" SELECTED SLOT:", minutesToTime(t));
            return minutesToTime(t);
        }

        console.log(" BLOCKED SLOT:", minutesToTime(t));

        t += SLOT;
    }

    console.log(" NO SLOT FOUND");
    return "FULL";
}


// LOAD APPOINTMENTS (ONLY WALK-INS TODAY)
function loadAppointments() {

    if (!clinicId) return;

    if (unsubscribe) unsubscribe();

    const today = getToday();

    const q = query(
        collection(db, "Appointments"),
        where("clinicID", "==", clinicId),
        where("isWalkIn", "==", true),
        where("date", "==", today),
        orderBy("createdAT", "asc")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {

        let rows = "";
        let index = 1;

        snapshot.forEach(docSnap => {
            const d = docSnap.data();

            rows += `
                <tr>
                    <td>${index++}</td>
                    <td>${d.ticketNumber || "-"}</td>
                    <td>${d.patientName || "Unknown"}</td>
                    <td>${d.reason || ""}</td>
                    <td>${d.time || "—"}</td>
                    <td>${d.status || "waiting"}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = rows;
    });
}


// MODAL FOR CONFIRMING PATIENT
function showConfirmModal(message) {
    return new Promise((resolve) => {

        if (document.getElementById("confirmModal")) {
            document.getElementById("confirmModal").remove();
        }

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
                    <button id="cancelBtn" class="btn cancel-btn">Cancel</button>
                    <button id="okBtn" class="btn confirm-btn">Add Patient</button>
                </footer>

            </article>
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


// ADD WALK-IN (WITH TICKET SYSTEM)
addBtn?.addEventListener("click", async () => {

    const name = nameInput?.value.trim();
    const reason = reasonInput?.value || "";

    if (!name) return alert("Please enter patient name");
    if (!clinicId) return alert("Clinic not loaded yet");

    console.log(" clinicId (before query):", clinicId, typeof clinicId);

    const confirmed = await showConfirmModal(
        `Add ${name} to ${assignedClinic} queue?`
    );

    if (!confirmed) return;

    try {

        const today = getToday();

        console.log(" TODAY:", today);
        console.log(" TYPE clinicId:", typeof clinicId);
        console.log(" VALUE clinicId:", clinicId);

        // 1. GET ALL APPOINTMENTS (FOR SCHEDULING)
        const allSnap = await getDocs(
            query(
                collection(db, "Appointments"),
                where("clinicID", "==", clinicId),
                where("date", "==", today)
            )
        );

        console.log(" allSnap size:", allSnap.size);

        allSnap.forEach(doc => {
            const data = doc.data();
            console.log(" DOC:", data);
            console.log(" clinicID type:", typeof data.clinicID);
            console.log(" clinicID value:", data.clinicID);
        });

        // 2. GET ONLY WALK-INS (FOR TICKET NUMBER)
        const walkinSnap = await getDocs(
            query(
                collection(db, "Appointments"),
                where("clinicID", "==", clinicId),
                where("isWalkIn", "==", true),
                where("date", "==", today)
            )
        );

        console.log(" walkinSnap size:", walkinSnap.size);

        // DEBUG: scheduling input
        const existingAppointments = allSnap.docs.map(d => d.data());

        console.log("existingAppointments:", existingAppointments);

        existingAppointments.forEach(a => {
            console.log(" appointment clinicID:", a.clinicID, typeof a.clinicID);
        });

        // 3. TICKET NUMBER ONLY FOR WALK-INS
        const count = walkinSnap.size + 1;
        const ticketNumber = `W-${String(count).padStart(3, "0")}`;

        // 4. CORRECT SLOT CALCULATION (USES ALL APPOINTMENTS)
        const assignedTime = getNextAvailableTime(existingAppointments);

        console.log("⏰ ASSIGNED TIME RESULT:", assignedTime);

        await addDoc(collection(db, "Appointments"), {
            clinicID: clinicId,
            patientName: name,
            reason,
            status: "waiting",
            isWalkIn: true,
            date: today,
            ticketNumber,
            time: assignedTime,
            createdAT: serverTimestamp()
        });

        nameInput.value = "";
        reasonInput.value = "";

    } catch (err) {
        console.error(err);
        alert("Failed to add patient");
    }
});


// AUTH BOOTSTRAP (UNCHANGED)
onAuthStateChanged(auth, async (user) => {

    if (!user) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        if (clinicEl) clinicEl.textContent = "";
        return;
    }

    const staff = await getStaffProfile(user.email);

    if (!staff) return;

   clinicId = Number(staff.clinicId);
    assignedClinic = staff.assignedClinic;

    if (nameSurnameEl) {
        nameSurnameEl.textContent = staff.displayName || "Staff";
    }

    if (clinicEl) {
        clinicEl.textContent = staff.assignedClinic || "No clinic assigned";
    }

    loadAppointments();
});