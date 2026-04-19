// 1. DATE
function getToday() {
    return new Date().toISOString().split("T")[0];
}

// 2. TIME CONVERSION
function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(m) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${h}:${mm}`;
}

// 3. SLOT CHECK
function isTaken(t, appointments, SLOT) {
    return appointments.some(a => {
        const start = timeToMinutes(a.time);
        return t >= start && t < start + SLOT;
    });
}

// 4. ROUNDING
function roundToNextSlot(minutes, slot) {
    return Math.ceil(minutes / slot) * slot;
}

module.exports = {
    getToday,
    timeToMinutes,
    minutesToTime,
    isTaken,
    roundToNextSlot
};

if (typeof window !== "undefined") {
    window.walkinLogic = {
        getToday,
        timeToMinutes,
        minutesToTime,
        isTaken,
        roundToNextSlot
    };
}