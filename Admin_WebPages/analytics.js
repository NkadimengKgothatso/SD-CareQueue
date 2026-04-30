import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let appointments = [];
let queues = [];
let clinics = [];

let dataLoaded = {
    appointments: false,
    queues: false,
    clinics: false
};

// ================= LOAD APPOINTMENTS =================
async function loadAppointments() {
    try {
        const snapshot = await getDocs(collection(db, "Appointments"));

        appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        dataLoaded.appointments = true;
        checkAndRender();

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

        dataLoaded.queues = true;
        checkAndRender();

    } catch (error) {
        console.error("Error loading queues:", error);
    }
}

// ================= LOAD CLINICS =================
async function loadClinics() {
    try {
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        clinics = snapshot.docs.map(doc => ({
            id: doc.data().id,
            name: doc.data().name
        }));

        dataLoaded.clinics = true;
        checkAndRender();

    } catch (error) {
        console.error("Error loading clinics:", error);
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

        renderDashboard(from, to);
    });
});

// ================= CHECK + RENDER =================
function checkAndRender() {
    if (dataLoaded.appointments && dataLoaded.queues && dataLoaded.clinics) {
        renderDashboard(); // default load
    }
}

// ================= DATE HELPER =================
function inDateRange(date, from, to) {
    if (!from || !to) return true;

    const d = new Date(date);
    const f = new Date(from);
    const t = new Date(to);

    return d >= f && d <= t;
}

// ================= DASHBOARD ENGINE =================
function buildDashboard(from = null, to = null) {

    const filteredAppointments = (from && to)
        ? appointments.filter(a => inDateRange(a.date, from, to))
        : appointments;

    const filteredQueues = (from && to)
        ? queues.filter(q => inDateRange(q.date, from, to))
        : queues;

    const patientsSeen = filteredAppointments.filter(a =>
        a.status === "completed"
    ).length;

    const noShows = filteredAppointments.filter(a =>
        a.status === "cancelled"
    ).length;

    const avgWait = filteredQueues.length > 0
        ? (filteredQueues.reduce((sum, q) => sum + (q.estimateWait || 0), 0)
            / filteredQueues.length).toFixed(1)
        : 0;

    return {
        patientsSeen,
        noShows,
        avgWait,
        appointments: filteredAppointments,
        queues: filteredQueues
    };
}

// ================= KPIs =================
function renderKPIs(data, from, to) {

    document.getElementById("patientsValue").textContent = data.patientsSeen;
    document.getElementById("waitValue").textContent = data.avgWait + " min";
    document.getElementById("noShowValue").textContent = data.noShows;

    let trend;

    if (from && to) {
        trend = calculatePatientsTrend(from, to);
    } else {
        // DEFAULT: last 30 days comparison
        const now = new Date();
        const end = now;
        const start = new Date();
        start.setDate(now.getDate() - 30);

        trend = calculatePatientsTrend(
            start.toISOString(),
            end.toISOString()
        );
    }

    document.getElementById("trendValue").textContent = trend;
}

// ================= QUEUE ANALYTICS =================
function getQueueAnalytics(list) {
    const result = {};

    list.forEach(q => {
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

// ================= NO SHOW PER CLINIC =================
function getNoShowByClinic(list) {
    const result = {};

    list.forEach(a => {
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

// ================= RENDER DASHBOARD =================
function renderDashboard(from = null, to = null) {

    const data = buildDashboard(from, to);

    renderKPIs(data, from, to);

    const queueStats = getQueueAnalytics(data.queues);
    const noShowStats = getNoShowByClinic(data.appointments);

    const report = clinics.map(clinic => {

        const q = queueStats[clinic.id] || {
            total: 0,
            waiting: 0,
            totalWait: 0,
            maxWait: 0
        };

        const n = noShowStats[clinic.id] || { noShow: 0 };

        return {
            clinicName: clinic.name,
            totalPatients: q.total,
            waitingNow: q.waiting,
            averageWait: q.total > 0 ? (q.totalWait / q.total).toFixed(1) : "0.0",
            maxWait: q.maxWait,
            noShows: n.noShow
        };
    });

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

// ================= TREND =================
function getPreviousPeriod(from, to) {

    const start = new Date(from);
    const end = new Date(to);

    const diff = end.getTime() - start.getTime();

    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diff);

    return {
        from: prevStart.toISOString(),
        to: prevEnd.toISOString()
    };
}

function countPatients(list, from, to) {
    return list.filter(a =>
        a.status === "completed" &&
        inDateRange(a.date, from, to)
    ).length;
}

function calculatePatientsTrend(from, to) {

    const prev = getPreviousPeriod(from, to);

    const current = countPatients(appointments, from, to);
    const previous = countPatients(appointments, prev.from, prev.to);

    if (previous === 0) return current > 0 ? "+100%" : "0%";

    const change = ((current - previous) / previous) * 100;

    return `${change.toFixed(1)}%`;
}