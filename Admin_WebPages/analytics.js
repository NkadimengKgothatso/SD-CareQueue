import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let appointments = [];
let queues = [];
let clinics = [];
let activeRowIndex = 0;

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
            id: doc.id,
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

    try {
        initAdminPage();

        loadClinics();
        loadAppointments();
        loadQueues();

        const form = document.getElementById("filterForm");

        form?.addEventListener("submit", (e) => {
            e.preventDefault();

            const from = document.getElementById("dateFrom").value;
            const to = document.getElementById("dateTo").value;

            renderDashboard(from, to);
        });

        // ================= KEYBOARD NAV =================
        document.addEventListener("keydown", (e) => {

            const rows = document.querySelectorAll("#waitTableBody tr");
            if (!rows.length) return;

            if (e.key === "ArrowDown") {
                activeRowIndex = Math.min(activeRowIndex + 1, rows.length - 1);
                setActiveRow(rows, activeRowIndex);
                rows[activeRowIndex]?.scrollIntoView({ block: "center" });
            }

            if (e.key === "ArrowUp") {
                activeRowIndex = Math.max(activeRowIndex - 1, 0);
                setActiveRow(rows, activeRowIndex);
                rows[activeRowIndex]?.scrollIntoView({ block: "center" });
            }
        });

        // ================= EXPORT BUTTONS =================
        const csvBtn = document.getElementById("exportCSV");
        const pdfBtn = document.getElementById("exportPDF");

        csvBtn?.addEventListener("click", () => {
            const from = document.getElementById("dateFrom").value;
            const to = document.getElementById("dateTo").value;

            exportCSV(getCurrentExportData(from, to));
        });

        pdfBtn?.addEventListener("click", () => {
    const from = document.getElementById("dateFrom").value;
    const to = document.getElementById("dateTo").value;

    exportPDF(getCurrentExportData(from, to), from, to);
});

        // ================= SEARCH =================
        const search = document.getElementById("clinicSearch");

        search?.addEventListener("input", (e) => {
            const value = e.target.value.toLowerCase();
            const rows = document.querySelectorAll("#waitTableBody tr");

            rows.forEach(row => {
                const name = row.children[0]?.textContent.toLowerCase() || "";
                row.style.display = name.includes(value) ? "" : "none";
            });
        });

    } catch (err) {
        console.error("INIT ERROR:", err);
    }
});
// ================= CHECK + RENDER =================
function checkAndRender() {
    if (dataLoaded.appointments && dataLoaded.queues && dataLoaded.clinics) {
        renderDashboard();
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

// ================= GLOBAL NO-SHOW RATE =================
function getGlobalNoShowRate(list) {
    const total = list.length;
    if (!total) return "0.0%";

    const cancelled = list.filter(a => a.status === "cancelled").length;

    return ((cancelled / total) * 100).toFixed(1) + "%";
}

// ================= KPIs =================
function renderKPIs(data, from, to) {

    document.getElementById("patientsValue").textContent = data.patientsSeen;
    document.getElementById("waitValue").textContent = data.avgWait + " min";

    document.getElementById("noShowValue").textContent =
        getGlobalNoShowRate(data.appointments);

    let trend;

    if (from && to) {
        trend = calculatePatientsTrend(from, to);
    } else {
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 30);

        trend = calculatePatientsTrend(
            start.toISOString(),
            now.toISOString()
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

// ================= NO SHOW RATE PER CLINIC =================
function getNoShowRateByClinic(list) {
    const result = {};

    list.forEach(a => {
        const clinic = a.clinicID;

        if (!result[clinic]) {
            result[clinic] = {
                total: 0,
                cancelled: 0
            };
        }

        result[clinic].total += 1;

        if (a.status === "cancelled") {
            result[clinic].cancelled += 1;
        }
    });

    Object.keys(result).forEach(clinic => {
        const r = result[clinic];
        r.rate = r.total ? ((r.cancelled / r.total) * 100).toFixed(1) : "0.0";
    });

    return result;
}

// ================= COLOR HELPERS =================
function getRateColor(rate) {
    const r = parseFloat(rate);

    if (r < 10) return "green";
    if (r < 20) return "orange";
    return "red";
}


function getCurrentExportData(from, to) {

    const filteredAppointments = (from && to)
        ? appointments.filter(a => inDateRange(a.date, from, to))
        : appointments;

    const queueStats = getQueueAnalytics(
        (from && to)
            ? queues.filter(q => inDateRange(q.date, from, to))
            : queues
    );

    const noShowStats = getNoShowRateByClinic(filteredAppointments);

    return clinics.map(clinic => {

        const q = queueStats[clinic.id] || {
            total: 0,
            totalWait: 0
        };

        const n = noShowStats[clinic.id] || { rate: "0.0" };

        return {
            clinic: clinic.name,
            avgWait: q.total > 0 ? (q.totalWait / q.total).toFixed(1) : "0.0",
            volume: q.total,
            noShowRate: n.rate + "%"
        };
    });
}


function exportCSV(data) {

    const headers = ["Clinic", "Avg Wait", "Volume", "No-Show Rate"];

    const rows = data.map(d => [
        d.clinic,
        d.avgWait,
        d.volume,
        d.noShowRate
    ]);

    const csv = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "clinic-analytics.csv";
    a.click();

    URL.revokeObjectURL(url);
}

function exportPDF(data, from = null, to = null) {

    const win = window.open("", "_blank");

    const formatDate = (d) => {
        if (!d) return null;
        return new Date(d).toLocaleDateString();
    };

    const dateRangeText =
        (from && to)
            ? `${formatDate(from)} → ${formatDate(to)}`
            : "All time";

    win.document.write(`
        <html>
        <head>
            <title>Clinic Analytics Report</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h2 { margin-bottom: 5px; }

                .date-range {
                    margin-bottom: 20px;
                    color: #555;
                    font-size: 14px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                }

                th {
                    background: #f3f4f6;
                }
            </style>
        </head>

        <body>
            <h2>Clinic Analytics Report</h2>

            <div class="date-range">
                <strong>Date Range:</strong> ${dateRangeText}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Clinic</th>
                        <th>Avg Wait</th>
                        <th>Volume</th>
                        <th>No-Show Rate</th>
                    </tr>
                </thead>

                <tbody>
                    ${data.map(d => `
                        <tr>
                            <td>${d.clinic}</td>
                            <td>${d.avgWait}</td>
                            <td>${d.volume}</td>
                            <td>${d.noShowRate}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </body>
        </html>
    `);

    win.document.close();
    win.print();
}

// ================= RENDER DASHBOARD =================
function renderDashboard(from = null, to = null) {

    const data = buildDashboard(from, to);

    renderKPIs(data, from, to);

    const queueStats = getQueueAnalytics(data.queues);
    const noShowStats = getNoShowRateByClinic(data.appointments);

    const tbody = document.getElementById("waitTableBody");
    tbody.innerHTML = "";

    clinics.forEach(clinic => {

        const q = queueStats[clinic.id] || {
            total: 0,
            waiting: 0,
            totalWait: 0,
            maxWait: 0
        };

        const n = noShowStats[clinic.id] || { rate: "0.0" };
        const color = getRateColor(n.rate);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${clinic.name}</td>
            <td>${q.total > 0 ? (q.totalWait / q.total).toFixed(1) : "0.0"} min</td>
            <td>${q.total}</td>
            <td style="color:${color}; font-weight:600;">
                ${n.rate}%
            </td>
        `;

        tbody.appendChild(row);
    });

    const rows = document.querySelectorAll("#waitTableBody tr");

rows.forEach((row, index) => {
    row.addEventListener("mouseenter", () => {
        setActiveRow(rows, index);
    });

    row.addEventListener("click", () => {
        setActiveRow(rows, index);
    });
});

setActiveRow(rows, 0); // default first row
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

function setActiveRow(rows, index) {
    if (!rows.length) return;

    rows.forEach(r => r.classList.remove("active-row"));

    if (rows[index]) {
        rows[index].classList.add("active-row");
        activeRowIndex = index;
    }
}