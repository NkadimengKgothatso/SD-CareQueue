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
    const cancelled = list.filter(a => a.status === "cancelled").length;
    const completed = list.filter(a => a.status === "completed").length;
    const resolved = completed + cancelled;

    if (!resolved) return "0.0%";

    return ((cancelled / resolved) * 100).toFixed(1) + "%";
}

// ================= KPIs =================
function renderKPIs(data, from, to) {

    document.getElementById("patientsValue").textContent = data.patientsSeen;
    document.getElementById("waitValue").textContent = data.avgWait + " min";

    document.getElementById("noShowValue").textContent =
        getGlobalNoShowRate(data.appointments);

    document.getElementById("trendValue").textContent =
        getActiveClinicsCount(data.appointments);
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
                completed: 0,
                cancelled: 0
            };
        }

        if (a.status === "completed") {
            result[clinic].total += 1;
            result[clinic].completed += 1;
        }

        if (a.status === "cancelled") {
            result[clinic].total += 1;
            result[clinic].cancelled += 1;
        }
    });

    Object.keys(result).forEach(clinic => {
        const r = result[clinic];
        const resolved = r.completed + r.cancelled;
        r.rate = resolved > 0 ? ((r.cancelled / resolved) * 100).toFixed(1) : "0.0";
    });

    return result;
}

// ================= RESOLVED APPOINTMENTS PER CLINIC =================
// Counts completed and cancelled appointments for the clinic volume figure.
function getVolumeByClinic(list) {
    const result = {};

    list.forEach(a => {
        const clinic = a.clinicID;

        if (!result[clinic]) {
            result[clinic] = { total: 0 };
        }

        if (a.status === "completed" || a.status === "cancelled") {
            result[clinic].total += 1;
        }
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
    const volumeStats = getVolumeByClinic(filteredAppointments);

    return clinics.map(clinic => {

        const q = queueStats[clinic.id] || { total: 0, totalWait: 0 };
        const n = noShowStats[clinic.id] || { rate: "0.0" };
        const v = volumeStats[clinic.id] || { total: 0 };

        return {
            clinic: clinic.name,
            avgWait: q.total > 0 ? (q.totalWait / q.total).toFixed(1) : "0.0",
            volume: v.total,
            noShowRate: n.rate + "%"
        };
    });
}


function exportCSV(data) {

    const headers = ["Clinic", "Avg Wait (min)", "Volume", "No-Show Rate", "Status"];

    const rows = data.map(d => {
        const isInactive = parseFloat(d.avgWait) === 0 && d.volume === 0 && parseFloat(d.noShowRate) === 0;
        return [
            `"${d.clinic}"`,
            d.avgWait,
            d.volume,
            d.noShowRate,
            isInactive ? "No Activity" : "Active"
        ];
    });

    // semicolon separator for South African Excel locale
    const csv = [
        "sep=;",
        headers.join(";"),
        ...rows.map(r => r.join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "clinic-analytics.csv";
    a.click();

    URL.revokeObjectURL(url);
}

function exportPDF(data, from = null, to = null) {

    const formatDate = (d) => {
        if (!d) return null;
        return new Date(d).toLocaleDateString();
    };

    const dateRangeText =
        (from && to)
            ? `${formatDate(from)} → ${formatDate(to)}`
            : "All time";

    // show all clinics regardless of activity
    const activeData = data;

    const rows = activeData.map(d => {
        const isInactive = parseFloat(d.avgWait) === 0 && d.volume === 0 && parseFloat(d.noShowRate) === 0;
        const rowStyle = isInactive ? "style='color:#9ca3af;'" : "";
        return `
            <tr ${rowStyle}>
                <td>${d.clinic}</td>
                <td>${d.avgWait} min</td>
                <td>${d.volume}</td>
                <td>${d.noShowRate}</td>
            </tr>
        `;
    }).join("");

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Clinic Analytics Report</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }

                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    color: #1a1a2e;
                }

                .report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 30px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid #1D9E75;
                }

                .report-header h1 {
                    font-size: 22px;
                    font-weight: 700;
                    color: #1a1a2e;
                }

                .report-header .meta {
                    font-size: 13px;
                    color: #6b7280;
                    text-align: right;
                    margin-top: 4px;
                }

                .summary {
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 20px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }

                thead tr {
                    background: #1D9E75;
                    color: white;
                }

                th {
                    padding: 10px 14px;
                    text-align: left;
                    font-weight: 600;
                }

                td {
                    padding: 10px 14px;
                    border-bottom: 1px solid #e5e7eb;
                }

                tbody tr:nth-child(even) {
                    background: #f9fafb;
                }

                tbody tr:last-child td {
                    border-bottom: none;
                }

                .footer {
                    margin-top: 30px;
                    font-size: 11px;
                    color: #9ca3af;
                    text-align: center;
                }

                .note {
                    margin-top: 0;
                    margin-bottom: 20px;
                    padding: 12px 16px;
                    background: #f9fafb;
                    border-left: 3px solid #1D9E75;
                    border-radius: 0 6px 6px 0;
                    font-size: 12px;
                    color: #6b7280;
                    line-height: 1.6;
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <div>
                    <h1>Clinic Analytics Report</h1>
                    <p class="meta">Date range: ${dateRangeText}</p>
                </div>
                <div class="meta">
                    Generated: ${new Date().toLocaleDateString()}<br>
                    Total Clinics: ${activeData.length}
                </div>
            </div>

            <div class="note">
                <strong>Note:</strong> Clinics displayed in grey have not yet recorded any patient activity through CareQueue.
                Data will populate as clinics begin using the system.
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
                    ${rows}
                </tbody>
            </table>

            <div class="note">
                <strong>Note:</strong> Clinics displayed in grey have not yet recorded any patient activity through CareQueue.
                Data will populate as clinics begin using the system.
            </div>

            <div class="footer">CareQueue — Confidential</div>
        </body>
        </html>
    `;

    // use Blob URL to avoid about:blank in the footer
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");

    if (!win) {
        URL.revokeObjectURL(url);
        return;
    }

    const printAndCleanup = () => {
        win.print();
        URL.revokeObjectURL(url);
    };

    if (typeof win.addEventListener === "function") {
        win.addEventListener("load", printAndCleanup);
    } else {
        printAndCleanup();
    }
}

// ================= RENDER DASHBOARD =================
function renderDashboard(from = null, to = null) {

    const data = buildDashboard(from, to);

    renderKPIs(data, from, to);

    const queueStats = getQueueAnalytics(data.queues);
    const noShowStats = getNoShowRateByClinic(data.appointments);
    const volumeStats = getVolumeByClinic(data.appointments);

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
        const v = volumeStats[clinic.id] || { total: 0 };
        const color = getRateColor(n.rate);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${clinic.name}</td>
            <td>${q.total > 0 ? (q.totalWait / q.total).toFixed(1) : "0.0"} min</td>
            <td>${v.total}</td>
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


// ================= ACTIVE CLINICS COUNT =================
// counts clinics that have at least one completed or cancelled appointment
// within the selected date range, reflecting real platform adoption
function getActiveClinicsCount(list) {
    const active = new Set(
        list
            .filter(a => a.status === "completed" || a.status === "cancelled")
            .map(a => a.clinicID)
    );

    return active.size;
}

function getPreviousPeriod(from, to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const duration = toDate.getTime() - fromDate.getTime();
    const previousTo = new Date(fromDate.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration);

    return {
        from: previousFrom.toISOString(),
        to: previousTo.toISOString()
    };
}

function countPatients(list, from, to) {
    return list.filter(a =>
        a.status === "completed" && inDateRange(a.date, from, to)
    ).length;
}

function calculatePatientsTrend(from, to) {
    const current = countPatients(appointments, from, to);
    const previousPeriod = getPreviousPeriod(from, to);
    const previous = countPatients(appointments, previousPeriod.from, previousPeriod.to);

    if (current === 0 && previous === 0) return "0%";
    if (previous === 0) return "+100%";

    return (((current - previous) / previous) * 100).toFixed(1) + "%";
}

function setActiveRow(rows, index) {
    if (!rows.length) return;

    rows.forEach(r => r.classList.remove("active-row"));

    if (rows[index]) {
        rows[index].classList.add("active-row");
        activeRowIndex = index;
    }
}

export {
    buildDashboard,
    calculatePatientsTrend,
    countPatients,
    getActiveClinicsCount,
    getGlobalNoShowRate,
    getNoShowRateByClinic,
    getPreviousPeriod,
    getQueueAnalytics,
    getRateColor,
    inDateRange,
    setActiveRow
};
