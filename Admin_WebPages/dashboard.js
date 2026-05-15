import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let clinics = [];
let queues = [];
let appointments = [];

const dataLoaded = {
    clinics: false,
    queues: false,
    appointments: false
};

// ================= LOADERS =================
async function loadClinics() {
    try {
        const snap = await getDocs(collection(db, "clinicsObjects"));
        clinics = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        dataLoaded.clinics = true;
        checkAndRender();
    } catch (e) {
        console.error("Error loading clinics:", e);
    }
}

async function loadQueues() {
    try {
        const snap = await getDocs(collection(db, "Queues"));
        queues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        dataLoaded.queues = true;
        checkAndRender();
    } catch (e) {
        console.error("Error loading queues:", e);
    }
}

async function loadAppointments() {
    try {
        const snap = await getDocs(collection(db, "Appointments"));
        appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        dataLoaded.appointments = true;
        checkAndRender();
    } catch (e) {
        console.error("Error loading appointments:", e);
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    try {
        initAdminPage();
        loadClinics();
        loadQueues();
        loadAppointments();
        setSubtitle();
    } catch (err) {
        console.error("INIT ERROR:", err);
    }
});

function setSubtitle() {
    const months = ["January","February","March","April","May","June",
        "July","August","September","October","November","December"];
    const now = new Date();
    const label = `${months[now.getMonth()]} ${now.getFullYear()}`;
    const el = document.getElementById("overviewSubtitle");
    if (el) el.textContent = `All clinics overview · ${label}`;
}

// ================= RENDER =================
function checkAndRender() {
    if (dataLoaded.clinics && dataLoaded.queues && dataLoaded.appointments) {
        renderStats();
        renderClinicStatus();
    }
}

function renderStats() {
    // Active clinics — total number of clinic docs
    document.getElementById("activeClinics").textContent = clinics.length;

    // Patients this month — completed appointments in current month
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const patientsThisMonth = appointments.filter(a => {
        if (a.status !== "completed" || !a.date) return false;
        const d = new Date(a.date);
        return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    document.getElementById("patientsMonth").textContent =
        patientsThisMonth.toLocaleString();
}

// Aggregate currently waiting per clinic
function getWaitingByClinic() {
    const result = {};
    queues.forEach(q => {
        const id = q.clinicID;
        if (!id) return;
        if (!result[id]) result[id] = 0;
        if (q.status === "waiting") result[id] += 1;
    });
    return result;
}

function getStatusFor(queueCount) {
    if (queueCount === 0) return { label: "Closed", cls: "closed" };
    if (queueCount >= 30) return { label: "Busy",   cls: "busy"   };
    return { label: "Open", cls: "open" };
}

function renderClinicStatus() {
    const tbody = document.getElementById("clinicStatusBody");
    tbody.innerHTML = "";

    if (!clinics.length) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="3">No clinics found</td></tr>`;
        return;
    }

    const waitingMap = getWaitingByClinic();

    clinics.forEach(clinic => {
        const count = waitingMap[clinic.id] || 0;
        const status = getStatusFor(count);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${clinic.name || "Unnamed clinic"}</td>
            <td><span class="queue-count">${count}</span></td>
            <td><span class="status-pill ${status.cls}">${status.label}</span></td>
        `;
        tbody.appendChild(row);
    });
}