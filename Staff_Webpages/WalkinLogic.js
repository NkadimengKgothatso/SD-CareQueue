// Admin_WebPages/WalkinLogic.js

// ─── DATE ─────────────────────────────────────────────────────────────
function getToday() {
    return new Date().toISOString().split("T")[0];
}

// ─── TIME CONVERSION ───────────────────────────────────────────────────
function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(m) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${h}:${mm}`;
}

// ─── SLOT CHECK ────────────────────────────────────────────────────────
function isTaken(t, appointments, SLOT) {
    const timeMin = typeof t === "string" ? timeToMinutes(t) : t;

    return appointments.some(a => {
        const start = timeToMinutes(a.time);
        return timeMin >= start && timeMin < start + SLOT;
    });
}

// ─── ROUNDING ──────────────────────────────────────────────────────────
function roundToNextSlot(minutes, slot) {
    return Math.ceil(minutes / slot) * slot;
}

// ─── EXPORTS (NODE / JEST) ────────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        getToday,
        timeToMinutes,
        minutesToTime,
        isTaken,
        roundToNextSlot
    };
}

// ─── BROWSER GLOBAL (optional UI usage) ───────────────────────────────
if (typeof window !== "undefined") {
    window.walkinLogic = {
        getToday,
        timeToMinutes,
        minutesToTime,
        isTaken,
        roundToNextSlot
    };
}