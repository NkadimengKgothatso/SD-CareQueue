
// ================= SORT APPOINTMENTS =================
function sortAppointmentsByTime(docs) {
    return [...docs].sort((a, b) =>
        (a.time || "").localeCompare(b.time || "")
    );
}

// ================= FILTER CANCELLED =================
function filterCancelledAppointments(docs) {
    let cancelledCount = 0;

    const filtered = docs.filter(doc => {
        const status = String(doc.status || "").toLowerCase().trim();
        if (status === "cancelled") {
            cancelledCount++;
            return false;
        }
        return true;
    });

    return { filtered, cancelledCount };
}

// ================= GET DISPLAY NAME =================
function getDisplayName(data, userData) {
    if (userData && userData.displayName) {
        return userData.displayName;
    }

    if (data.patientName) {
        return data.patientName;
    }

    return "Unknown";
}

// ================= CALCULATE STATS =================
function calculateStats(appointments) {
    let totalToday = 0;
    let inQueue = 0;
    let completed = 0;

    appointments.forEach(data => {
        const status = String(data.status || "").toLowerCase().trim();

        if (
            status === "booked" ||
            status === "waiting" ||
            status === "scheduled"
        ) {
            inQueue++;
            totalToday++;
        }

        if (status === "completed") {
            completed++;
            totalToday++;
        }
    });

    return {
        totalToday,
        inQueue,
        completed,
        avgWait: inQueue > 0 ? "15m" : "0m"
    };
}

// ================= EXPORT =================
module.exports = {
    sortAppointmentsByTime,
    filterCancelledAppointments,
    getDisplayName,
    calculateStats
};