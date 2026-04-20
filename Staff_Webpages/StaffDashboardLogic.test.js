const {
    sortAppointmentsByTime,
    filterCancelledAppointments,
    getDisplayName,
    calculateStats
} = require("./StaffDashboardLogic");

// ================= SORT TEST =================
test("sortAppointmentsByTime sorts correctly", () => {
    const data = [
        { time: "12:00" },
        { time: "09:00" },
        { time: "10:30" }
    ];

    const result = sortAppointmentsByTime(data);

    expect(result[0].time).toBe("09:00");
    expect(result[1].time).toBe("10:30");
    expect(result[2].time).toBe("12:00");
});

// ================= FILTER TEST =================
test("filterCancelledAppointments removes cancelled", () => {
    const data = [
        { status: "booked" },
        { status: "cancelled" },
        { status: "waiting" }
    ];

    const { filtered, cancelledCount } = filterCancelledAppointments(data);

    expect(filtered.length).toBe(2);
    expect(cancelledCount).toBe(1);
});

// ================= DISPLAY NAME TEST =================
test("getDisplayName returns user displayName if exists", () => {
    const data = {};
    const user = { displayName: "John Doe" };

    expect(getDisplayName(data, user)).toBe("John Doe");
});

test("getDisplayName falls back to patientName", () => {
    const data = { patientName: "Jane" };

    expect(getDisplayName(data, null)).toBe("Jane");
});

test("getDisplayName returns Unknown if no data", () => {
    expect(getDisplayName({}, null)).toBe("Unknown");
});

// ================= STATS TEST =================
test("calculateStats computes correct values", () => {
    const data = [
        { status: "booked" },
        { status: "waiting" },
        { status: "completed" },
        { status: "cancelled" }
    ];

    const result = calculateStats(data);

    expect(result.totalToday).toBe(3);
    expect(result.inQueue).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.avgWait).toBe("30m");
});

test("calculateStats returns 0 wait if no queue", () => {
    const data = [{ status: "completed" }];

    const result = calculateStats(data);

    expect(result.avgWait).toBe("0m");
});
