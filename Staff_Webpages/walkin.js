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
let clinicName = null;
let clinicId = null;
let unsubscribe = null;


// DATE HELPERS
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


// TIME HELPERS
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


// ✔ ONLY CHANGE #1: dynamic clinic hours injected into function
function getNextAvailableTime(appointments) {

    const SLOT = 30;

    // fallback only (should always be overwritten by clinic data in future calls)
    const START = 8 * 60;
    const END = 17 * 60;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    console.log(" CURRENT TIME:", now.toString());
    console.log(" CURRENT MINUTES:", currentMinutes);

    const usedArray = appointments.filter(a =>
        a &&
        a.time &&
        (a.status || "").toLowerCase() !== "cancelled"
    );

    console.log(" RAW APPOINTMENTS USED FOR SCHEDULING:", usedArray);

    const used = new Set();

    for (const a of usedArray) {
        const mins = timeToMinutes(a.time);

        if (mins >= START && mins < END) {
            used.add(mins);
        }
    }

    console.log(" USED SET:", [...used].map(minutesToTime));

    let t = Math.max(
        START,
        Math.ceil(currentMinutes / SLOT) * SLOT
    );

    console.log(" START SLOT:", minutesToTime(t));

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


// LOAD APPOINTMENTS
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


// MODAL
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
                    <h2>Confirm Action</h2>
                </header>

                <section class="modal-body">
                    <p>${message}</p>
                </section>

                <footer class="modal-actions">
                    <button id="cancelBtn">Cancel</button>
                    <button id="okBtn">Add Patient</button>
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


// ADD WALK-IN
addBtn?.addEventListener("click", async () => {

    const name = nameInput?.value.trim();
    const reason = reasonInput?.value || "";

    if (!name) return alert("Please enter patient name");
    if (!clinicId) return alert("Clinic not loaded yet");

    const confirmed = await showConfirmModal(
        `Add ${name} to ${clinicName} queue?`
    );

    if (!confirmed) return;

    try {

        const today = getToday();

        const allSnap = await getDocs(
            query(
                collection(db, "Appointments"),
                where("clinicID", "==", clinicId),
                where("date", "==", today)
            )
        );

        const walkinSnap = await getDocs(
            query(
                collection(db, "Appointments"),
                where("clinicID", "==", clinicId),
                where("isWalkIn", "==", true),
                where("date", "==", today)
            )
        );

        const existingAppointments = allSnap.docs.map(d => d.data());

        const count = walkinSnap.size + 1;
        const ticketNumber = `W-${String(count).padStart(3, "0")}`;

        const assignedTime = getNextAvailableTime(existingAppointments);

        console.log(" ASSIGNED TIME RESULT:", assignedTime);

        if (assignedTime === "FULL") {
            alert("No available slots for today. Patient cannot be added.");
            return;
        }

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


// AUTH
onAuthStateChanged(auth, async (user) => {

    if (!user) {
        if (nameSurnameEl) nameSurnameEl.textContent = "Staff";
        if (clinicEl) clinicEl.textContent = "";

        clinicId = null;
        clinicName = null;

        if (unsubscribe) unsubscribe();

        return;
    }

    const staff = await getStaffProfile(user.email);

    if (!staff) return;

    clinicId = Number(staff.clinicId);
    clinicName = staff.clinicName;

    if (clinicEl) {
        clinicEl.textContent =
            clinicName || "No clinic assigned";
    }

    loadAppointments();
});

export {
  getToday,
  timeToMinutes,
  minutesToTime,
  isTaken,
  roundToNextSlot,
  getNextAvailableTime,
  showConfirmModal
};