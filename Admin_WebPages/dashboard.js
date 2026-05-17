import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import {collection,getDocs} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "/Admin_WebPages/admin.js";
import { signOut as firebaseSignOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


let clinics = [];
let queues = [];
let appointments = [];

const dataLoaded = {
    clinics: false,
    queues: false,
    appointments: false
};

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

    try {

        initAdminPage();

        loadClinics();
        loadQueues();
        loadAppointments();

        setSubtitle();
        initSearch();

    } catch (err) {
        console.error("INIT ERROR:", err);
    }
});

/* =========================
   LOAD CLINICS
========================= */

async function loadClinics() {
    try {
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        clinics = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        dataLoaded.clinics = true;
        checkAndRender();

    } catch (err) {
        console.error("Error loading clinics:", err);
    }
}

/* =========================
   LOAD QUEUES
========================= */

async function loadQueues() {
    try {
        const snapshot = await getDocs(collection(db, "Queues"));

        queues = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        dataLoaded.queues = true;
        checkAndRender();

    } catch (err) {
        console.error("Error loading queues:", err);
    }
}

/* =========================
   LOAD APPOINTMENTS
========================= */

async function loadAppointments() {
    try {
        const snapshot = await getDocs(collection(db, "Appointments"));

        appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        dataLoaded.appointments = true;
        checkAndRender();

    } catch (err) {
        console.error("Error loading appointments:", err);
    }
}

/* =========================
   CHECK READY
========================= */

function checkAndRender() {
    if (
        dataLoaded.clinics &&
        dataLoaded.queues &&
        dataLoaded.appointments
    ) {
        renderStats();
        renderClinics();
    }
}

/* =========================
   SUBTITLE
========================= */

function setSubtitle() {
    const months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];

    const now = new Date();

    document.getElementById("overviewSubtitle").textContent =
        `All clinics overview · ${months[now.getMonth()]} ${now.getFullYear()}`;
}

/* =========================
   STATS
========================= */

function renderStats() {

    // Active clinics = Active or Busy
    const activeClinics = clinics.filter(c =>
        c.status === "Active" || c.status === "Busy"
    ).length;

    document.getElementById("activeClinics").textContent = activeClinics;

    // Patients seen = completed appointments
    const patientsSeen = appointments.filter(a =>
        a.status === "completed"
    ).length;

    document.getElementById("patientsSeen").textContent = patientsSeen;

    // Patients in queue = waiting status
    const patientsQueue = queues.filter(q =>
        q.status === "waiting"
    ).length;

    document.getElementById("patientsQueue").textContent = patientsQueue;
}

/* =========================
   QUEUE MAP
========================= */

function getWaitingByClinic() {
    const map = {};

    queues.forEach(q => {
        if (!q.clinicID) return;

        if (!map[q.clinicID]) {
            map[q.clinicID] = 0;
        }

        if (q.status === "waiting") {
            map[q.clinicID]++;
        }
    });

    return map;
}

/* =========================
   RENDER CLINICS (SORTED)
========================= */

function renderClinics(filteredClinics = clinics) {

    const container = document.getElementById("clinicCards");
    container.innerHTML = "";

    if (!filteredClinics.length) {
        container.innerHTML = `<section class="empty-state">No clinics found</section>`;
        return;
    }

    const waitingMap = getWaitingByClinic();

    // SORT by queue size (descending)
    const sorted = [...filteredClinics].sort((a, b) => {
        return (waitingMap[b.id] || 0) - (waitingMap[a.id] || 0);
    });

    sorted.forEach(clinic => {

        const waitingCount = waitingMap[clinic.id] || 0;

        const statusClass = (clinic.status || "Closed").toLowerCase();

        const card = document.createElement("section");
        card.classList.add("clinic");

        card.innerHTML = `
            <section class="clinicHeader">

                <i class="fa-solid fa-house-chimney-medical"></i>

                <section class="clinicNameStatus">

                    <p class="clinicName">
                        ${clinic.name || "Unnamed Clinic"}
                    </p>

                    <p class="Location">
                        ${clinic.address || "Unknown location"}
                    </p>

                </section>

                <p class="status-pill ${statusClass}">
                    ${clinic.status || "Closed"}
                </p>

            </section>

            <section class="clinicContainer">

                <section class="OpenTimes">
                    <i class="fa-regular fa-clock"></i>
                    <p>${clinic.startDay || "?"} – ${clinic.endDay || "?"} · ${clinic.startTime || "?"} – ${clinic.endTime || "?"}</p>
                </section>

                <section class="queueDisplay">
                    <i class="fa-solid fa-users"></i>
                    <p>
                        ${waitingCount}
                        patient${waitingCount !== 1 ? "s" : ""}
                        in queue
                    </p>
                </section>

            </section>
        `;

        container.appendChild(card);
    });
}

/* =========================
   SEARCH (NAME + ADDRESS + STATUS)
========================= */

function initSearch() {

    const search = document.getElementById("clinicSearch");

    search?.addEventListener("input", (e) => {

        const value = e.target.value.toLowerCase().trim();

        const filtered = clinics.filter(c => {

            const name = (c.name || "").toLowerCase();
            const address = (c.address || "").toLowerCase();
            const status = (c.status || "").toLowerCase();

            return (
                name.includes(value) ||
                address.includes(value) ||
                status.includes(value)
            );
        });

        renderClinics(filtered);
    });
}

// ================= SIGN OUT =================
window.signOut = async function () {
    try {
        await firebaseSignOut(auth);
        window.location.href = "/index.html";
    } catch (err) {
        console.error("Sign out failed:", err);
    }
};
document.getElementById("signOutBtn")?.addEventListener("click", () => {
    window.signOut();
});