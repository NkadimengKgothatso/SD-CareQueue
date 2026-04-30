import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let appointments = [];
let queues = [];
let clinics = []; // FULL clinic objects

// ================= LOAD APPOINTMENTS =================
async function loadAppointments() {
    try {
        const snapshot = await getDocs(collection(db, "Appointments"));

        appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("Appointments loaded:", appointments);

        updateNoShowKPI();

    } catch (error) {
        console.error("Error loading appointments:", error);
    }
}

// ================= LOAD QUEUES =================
async function loadQueues() {
    try {
        const snapshot = await getDocs(collection(db, "Queues"));

        queues = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("Queues loaded:", queues);

        renderDashboard();

    } catch (error) {
        console.error("Error loading queues:", error);
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

    initAdminPage();

    loadClinics();
    loadAppointments();
    loadQueues();

    const form = document.getElementById("filterForm");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const from = document.getElementById("dateFrom").value;
        const to = document.getElementById("dateTo").value;

        updateNoShowKPI(from, to);
        renderDashboard(from, to);
    });

});


// ================= LOAD CLINICS =================
async function loadClinics() {
    try {
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        clinics = snapshot.docs.map(doc => ({
            id: doc.data().id,
            name: doc.data().name
        }));

        console.log("Clinics loaded:", clinics);

    } catch (error) {
        console.error("Error loading clinics:", error);
    }
}


// ================= QUEUE ANALYTICS =================
function getQueueAnalytics(queues) {
    const result = {};

    queues.forEach(q => {
        const clinic = q.clinicID;

        if (!result[clinic]) {
            result[clinic] = {
                total: 0,
                waiting: 0,
                totalWait: 0,
                maxWait: 0
            };
        }

        result[clinic].total += 1;

        if (q.status === "waiting") {
            result[clinic].waiting += 1;
        }

        const wait = q.estimateWait || 0;

        result[clinic].totalWait += wait;
        result[clinic].maxWait = Math.max(result[clinic].maxWait, wait);
    });

    return result;
}


// ================= NO SHOW =================
function getNoShowByClinic(appointments) {
    const result = {};

    appointments.forEach(a => {
        const clinic = a.clinicID;

        if (!result[clinic]) {
            result[clinic] = { noShow: 0 };
        }

        if (a.status === "cancelled") {
            result[clinic].noShow += 1;
        }
    });

    return result;
}


// ================= MAIN REPORT =================
function buildReport(from = null, to = null) {

    const queueStats = getQueueAnalytics(queues);
    const noShowStats = getNoShowByClinic(appointments);

    return clinics.map(clinic => {

        const q = queueStats[clinic.id] || {
            total: 0,
            waiting: 0,
            totalWait: 0,
            maxWait: 0
        };

        const n = noShowStats[clinic.id] || { noShow: 0 };

        const hasActivity = q.total > 0 || n.noShow > 0;

        return {
            clinicName: clinic.name,

            totalPatients: q.total,
            waitingNow: q.waiting,

            averageWait: q.total > 0
                ? (q.totalWait / q.total).toFixed(1)
                : "0.0",

            maxWait: q.maxWait,

            noShows: n.noShow
        };
    });
}


// ================= RENDER TABLE =================
function renderDashboard(from = null, to = null) {

    const report = buildReport(from, to);

    const tbody = document.getElementById("waitTableBody");
    tbody.innerHTML = "";

    report.forEach(item => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.clinicName}</td>
            <td>${item.averageWait} min</td>
            <td>${item.totalPatients}</td>
            <td>${item.noShows}</td>
        `;

        tbody.appendChild(row);
    });
}


// ================= KPI =================
function updateNoShowKPI(from = null, to = null) {

    let filtered = appointments;

    if (from && to) {
        filtered = appointments.filter(a =>
            inDateRange(a.date, from, to)
        );
    }

    const noShows = filtered.filter(a =>
        a.status === "cancelled"
    ).length;

    document.getElementById("noShowValue").textContent = noShows;
}


// ================= DATE HELPER =================
function inDateRange(date, from, to) {
    if (!from || !to) return true;
    return date >= from && date <= to;
}