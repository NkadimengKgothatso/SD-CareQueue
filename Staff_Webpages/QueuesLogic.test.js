// QueuesLogic.test.js
const {
    STATUS_PIPELINE,
    STATUS_LABELS,
    ACTIVE_STATUSES,
    getTodayString,
    normaliseStatus,
    isActiveStatus,
    getNextStatus,
    getStatusLabel,
    mergeAndDeduplicateAppointments,
    assignQueuePositions,
    computeStats,
    partitionQueue,
    buildQueuePayload,
    shouldDeleteQueueEntry,
    resolvePatientNameSync,
    buildExistingNamesCache,
} = require("./QueuesLogic");

// ─── Fixtures ────────────────────────────────────────────────────────────────
const makeAppt = (overrides = {}) => ({
    id:          "appt-1",
    time:        "09:00",
    status:      "waiting",
    reason:      "Check-up",
    patientName: "Alice Smith",
    isWalkIn:    false,
    userID:      "user-1",
    ...overrides,
});

// ─── Constants ───────────────────────────────────────────────────────────────
describe("Constants", () => {
    test("STATUS_PIPELINE has correct order", () => {
        expect(STATUS_PIPELINE).toEqual(["waiting", "in consultation", "completed"]);
    });

    test("STATUS_LABELS covers all pipeline statuses plus cancelled", () => {
        [...STATUS_PIPELINE, "cancelled"].forEach((s) => {
            expect(STATUS_LABELS[s]).toBeDefined();
        });
    });

    test("ACTIVE_STATUSES contains waiting and in consultation only", () => {
        expect(ACTIVE_STATUSES.has("waiting")).toBe(true);
        expect(ACTIVE_STATUSES.has("in consultation")).toBe(true);
        expect(ACTIVE_STATUSES.has("completed")).toBe(false);
        expect(ACTIVE_STATUSES.has("cancelled")).toBe(false);
    });
});

// ─── getTodayString ───────────────────────────────────────────────────────────
describe("getTodayString", () => {
    test("formats a date correctly", () => {
        expect(getTodayString(new Date("2024-03-05"))).toBe("2024-03-05");
    });

    test("zero-pads single digit month and day", () => {
        expect(getTodayString(new Date("2024-01-07"))).toBe("2024-01-07");
    });

    test("handles December (month 12)", () => {
        expect(getTodayString(new Date("2024-12-31"))).toBe("2024-12-31");
    });

    test("returns a string matching YYYY-MM-DD when called without arguments", () => {
        expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

// ─── normaliseStatus ─────────────────────────────────────────────────────────
describe("normaliseStatus", () => {
    test("converts 'scheduled' to 'waiting'", () => {
        expect(normaliseStatus("scheduled")).toBe("waiting");
        expect(normaliseStatus("Scheduled")).toBe("waiting");
        expect(normaliseStatus("SCHEDULED")).toBe("waiting");
    });

    test("lowercases and trims input", () => {
        expect(normaliseStatus("  Waiting  ")).toBe("waiting");
        expect(normaliseStatus("IN CONSULTATION")).toBe("in consultation");
    });

    test("returns 'waiting' for undefined / null / empty", () => {
        expect(normaliseStatus(undefined)).toBe("waiting");
        expect(normaliseStatus(null)).toBe("waiting");
        expect(normaliseStatus("")).toBe("waiting");
    });

    test("passes through completed and cancelled unchanged", () => {
        expect(normaliseStatus("completed")).toBe("completed");
        expect(normaliseStatus("cancelled")).toBe("cancelled");
    });
});

// ─── isActiveStatus ───────────────────────────────────────────────────────────
describe("isActiveStatus", () => {
    test.each(["waiting", "in consultation"])("returns true for '%s'", (s) => {
        expect(isActiveStatus(s)).toBe(true);
    });

    test.each(["completed", "cancelled", "unknown", ""])("returns false for '%s'", (s) => {
        expect(isActiveStatus(s)).toBe(false);
    });
});

// ─── getNextStatus ────────────────────────────────────────────────────────────
describe("getNextStatus", () => {
    test("waiting -> in consultation", () => {
        expect(getNextStatus("waiting")).toBe("in consultation");
    });

    test("in consultation -> completed", () => {
        expect(getNextStatus("in consultation")).toBe("completed");
    });

    test("completed -> null (end of pipeline)", () => {
        expect(getNextStatus("completed")).toBeNull();
    });

    test("unknown status -> null", () => {
        expect(getNextStatus("cancelled")).toBeNull();
        expect(getNextStatus("")).toBeNull();
    });
});

// ─── getStatusLabel ───────────────────────────────────────────────────────────
describe("getStatusLabel", () => {
    test("returns human-readable labels for known statuses", () => {
        expect(getStatusLabel("waiting")).toBe("Waiting");
        expect(getStatusLabel("in consultation")).toBe("In Consultation");
        expect(getStatusLabel("completed")).toBe("Completed");
        expect(getStatusLabel("cancelled")).toBe("Cancelled");
    });

    test("falls back to the raw value for unknown statuses", () => {
        expect(getStatusLabel("mystery-status")).toBe("mystery-status");
    });
});

// ─── mergeAndDeduplicateAppointments ─────────────────────────────────────────
describe("mergeAndDeduplicateAppointments", () => {
    test("merges two disjoint arrays", () => {
        const reg    = [makeAppt({ id: "a", time: "10:00" })];
        const walkin = [makeAppt({ id: "b", time: "09:00", isWalkIn: true })];
        const result = mergeAndDeduplicateAppointments(reg, walkin);
        expect(result).toHaveLength(2);
    });

    test("removes duplicates — first occurrence wins", () => {
        const appt   = makeAppt({ id: "dup", patientName: "Original" });
        const dup    = makeAppt({ id: "dup", patientName: "Duplicate" });
        const result = mergeAndDeduplicateAppointments([appt], [dup]);
        expect(result).toHaveLength(1);
        expect(result[0].patientName).toBe("Original");
    });

    test("sorts by time ascending", () => {
        const reg    = [makeAppt({ id: "c", time: "11:00" }), makeAppt({ id: "a", time: "09:00" })];
        const walkin = [makeAppt({ id: "b", time: "10:00", isWalkIn: true })];
        const result = mergeAndDeduplicateAppointments(reg, walkin);
        expect(result.map((r) => r.time)).toEqual(["09:00", "10:00", "11:00"]);
    });

    test("handles empty arrays", () => {
        expect(mergeAndDeduplicateAppointments([], [])).toEqual([]);
        expect(mergeAndDeduplicateAppointments([makeAppt()], [])).toHaveLength(1);
        expect(mergeAndDeduplicateAppointments([], [makeAppt()])).toHaveLength(1);
    });

    test("appointments with no time sort before those with time", () => {
        const a = makeAppt({ id: "a", time: "" });
        const b = makeAppt({ id: "b", time: "08:00" });
        const result = mergeAndDeduplicateAppointments([b], [a]);
        expect(result[0].id).toBe("a");
    });
});

// ─── assignQueuePositions ─────────────────────────────────────────────────────
describe("assignQueuePositions", () => {
    test("assigns 1-based positions to active appointments only", () => {
        const appts = [
            makeAppt({ id: "1", status: "waiting" }),
            makeAppt({ id: "2", status: "in consultation" }),
            makeAppt({ id: "3", status: "completed" }),
            makeAppt({ id: "4", status: "cancelled" }),
        ];
        assignQueuePositions(appts);
        expect(appts[0].queuePosition).toBe(1);
        expect(appts[1].queuePosition).toBe(2);
        expect(appts[2].queuePosition).toBeNull();
        expect(appts[3].queuePosition).toBeNull();
    });

    test("returns the same array reference", () => {
        const appts = [makeAppt()];
        const returned = assignQueuePositions(appts);
        expect(returned).toBe(appts);
    });

    test("positions are sequential with no gaps", () => {
        const appts = [
            makeAppt({ id: "1", status: "waiting" }),
            makeAppt({ id: "2", status: "waiting" }),
            makeAppt({ id: "3", status: "waiting" }),
        ];
        assignQueuePositions(appts);
        expect(appts.map((a) => a.queuePosition)).toEqual([1, 2, 3]);
    });

    test("all-done queue sets every position to null", () => {
        const appts = [
            makeAppt({ id: "1", status: "completed" }),
            makeAppt({ id: "2", status: "cancelled" }),
        ];
        assignQueuePositions(appts);
        appts.forEach((a) => expect(a.queuePosition).toBeNull());
    });

    test("empty array does not throw", () => {
        expect(() => assignQueuePositions([])).not.toThrow();
    });
});

// ─── computeStats ────────────────────────────────────────────────────────────
describe("computeStats", () => {
    test("counts totals, active, and completed correctly", () => {
        const appts = [
            makeAppt({ status: "waiting" }),
            makeAppt({ id: "2", status: "in consultation" }),
            makeAppt({ id: "3", status: "completed" }),
            makeAppt({ id: "4", status: "cancelled" }),
        ];
        expect(computeStats(appts)).toEqual({ total: 4, inQueue: 2, completed: 1 });
    });

    test("returns zeros for empty array", () => {
        expect(computeStats([])).toEqual({ total: 0, inQueue: 0, completed: 0 });
    });

    test("all waiting", () => {
        const appts = [makeAppt(), makeAppt({ id: "2" })];
        const stats = computeStats(appts);
        expect(stats.total).toBe(2);
        expect(stats.inQueue).toBe(2);
        expect(stats.completed).toBe(0);
    });

    test("all completed", () => {
        const appts = [
            makeAppt({ status: "completed" }),
            makeAppt({ id: "2", status: "completed" }),
        ];
        const stats = computeStats(appts);
        expect(stats.inQueue).toBe(0);
        expect(stats.completed).toBe(2);
    });

    test("ignores cancelled in both inQueue and completed counts", () => {
        const appts = [makeAppt({ status: "cancelled" })];
        expect(computeStats(appts)).toEqual({ total: 1, inQueue: 0, completed: 0 });
    });
});

// ─── partitionQueue ──────────────────────────────────────────────────────────
describe("partitionQueue", () => {
    test("separates active from done", () => {
        const appts = [
            makeAppt({ id: "1", status: "waiting",        queuePosition: 1 }),
            makeAppt({ id: "2", status: "in consultation",queuePosition: 2 }),
            makeAppt({ id: "3", status: "completed",      queuePosition: null }),
            makeAppt({ id: "4", status: "cancelled",      queuePosition: null }),
        ];
        const { active, done } = partitionQueue(appts);
        expect(active).toHaveLength(2);
        expect(done).toHaveLength(2);
    });

    test("active appointments are sorted by queuePosition", () => {
        const appts = [
            makeAppt({ id: "b", status: "waiting", queuePosition: 2, time: "10:00" }),
            makeAppt({ id: "a", status: "waiting", queuePosition: 1, time: "09:00" }),
        ];
        const { active } = partitionQueue(appts);
        expect(active[0].id).toBe("a");
        expect(active[1].id).toBe("b");
    });

    test("ties in queuePosition broken by time", () => {
        const appts = [
            makeAppt({ id: "b", status: "waiting", queuePosition: 1, time: "10:00" }),
            makeAppt({ id: "a", status: "waiting", queuePosition: 1, time: "09:00" }),
        ];
        const { active } = partitionQueue(appts);
        expect(active[0].id).toBe("a");
    });

    test("returns empty arrays when input is empty", () => {
        const { active, done } = partitionQueue([]);
        expect(active).toEqual([]);
        expect(done).toEqual([]);
    });

    test("all active — done is empty", () => {
        const appts = [makeAppt({ queuePosition: 1 })];
        const { done } = partitionQueue(appts);
        expect(done).toHaveLength(0);
    });
});

// ─── buildQueuePayload ────────────────────────────────────────────────────────
describe("buildQueuePayload", () => {
    const TS = "SERVER_TS";

    test("active appointment payload has position and estimateWait", () => {
        const appt = makeAppt({ status: "waiting", queuePosition: 3 });
        const payload = buildQueuePayload(appt, "clinic-1", "2024-06-01", TS);

        expect(payload.position).toBe(3);
        expect(payload.estimateWait).toBe(30); // (3-1)*15
        expect(payload.clinicID).toBe(NaN);    // "clinic-1" coerced — confirms Number() call
    });

    test("numeric clinicID is preserved", () => {
        const appt = makeAppt({ status: "waiting", queuePosition: 1 });
        const payload = buildQueuePayload(appt, 42, "2024-06-01", TS);
        expect(payload.clinicID).toBe(42);
    });

    test("done appointment has null position and estimateWait", () => {
        const appt = makeAppt({ status: "completed", queuePosition: null });
        const payload = buildQueuePayload(appt, 1, "2024-06-01", TS);
        expect(payload.position).toBeNull();
        expect(payload.estimateWait).toBeNull();
    });

    test("cancelled appointment has null position and estimateWait", () => {
        const appt = makeAppt({ status: "cancelled", queuePosition: null });
        const payload = buildQueuePayload(appt, 1, "2024-06-01", TS);
        expect(payload.position).toBeNull();
        expect(payload.estimateWait).toBeNull();
    });

    test("missing optional fields default to null / false", () => {
        const appt = { id: "x", status: "waiting", queuePosition: 1 };
        const payload = buildQueuePayload(appt, 1, "2024-06-01", TS);
        expect(payload.userID).toBeNull();
        expect(payload.patientName).toBeNull();
        expect(payload.isWalkIn).toBe(false);
        expect(payload.time).toBe("");
    });

    test("estimateWait for position 1 is 0 minutes", () => {
        const appt = makeAppt({ status: "waiting", queuePosition: 1 });
        const payload = buildQueuePayload(appt, 1, "2024-06-01", TS);
        expect(payload.estimateWait).toBe(0);
    });

    test("payload contains all required keys", () => {
        const appt    = makeAppt({ status: "waiting", queuePosition: 1 });
        const payload = buildQueuePayload(appt, 1, "2024-06-01", TS);
        const requiredKeys = [
            "appointmentId","clinicID","date","userID","patientName",
            "status","time","position","estimateWait","isWalkIn","updatedAt",
        ];
        requiredKeys.forEach((k) => expect(payload).toHaveProperty(k));
    });

    test("updatedAt is whatever value is passed in", () => {
        const appt = makeAppt({ status: "waiting", queuePosition: 1 });
        expect(buildQueuePayload(appt, 1, "2024-06-01", "MY_TS").updatedAt).toBe("MY_TS");
    });
});

// ─── shouldDeleteQueueEntry ───────────────────────────────────────────────────
describe("shouldDeleteQueueEntry", () => {
    test("returns true for same clinic but different (old) date", () => {
        expect(shouldDeleteQueueEntry({ clinicID: 5, date: "2024-01-01" }, 5, "2024-06-01")).toBe(true);
    });

    test("returns false for same clinic, same date (today)", () => {
        expect(shouldDeleteQueueEntry({ clinicID: 5, date: "2024-06-01" }, 5, "2024-06-01")).toBe(false);
    });

    test("returns false for different clinic even if date is old", () => {
        expect(shouldDeleteQueueEntry({ clinicID: 9, date: "2024-01-01" }, 5, "2024-06-01")).toBe(false);
    });

    test("coerces string clinicID to number for comparison", () => {
        // doc has numeric 5, passed clinicID is string "5"
        expect(shouldDeleteQueueEntry({ clinicID: 5, date: "2024-01-01" }, "5", "2024-06-01")).toBe(true);
    });

    test("returns false when clinicID is null", () => {
        expect(shouldDeleteQueueEntry({ clinicID: null, date: "2024-01-01" }, 5, "2024-06-01")).toBe(false);
    });
});

// ─── resolvePatientNameSync ───────────────────────────────────────────────────
describe("resolvePatientNameSync", () => {
    test("returns appt.patientName when available", () => {
        expect(resolvePatientNameSync(makeAppt({ patientName: "Bob" }))).toBe("Bob");
    });

    test("falls back to cache when patientName is missing", () => {
        const appt = makeAppt({ id: "x", patientName: null });
        expect(resolvePatientNameSync(appt, { x: "Cached Name" })).toBe("Cached Name");
    });

    test("returns null when neither source has the name", () => {
        const appt = makeAppt({ id: "x", patientName: null });
        expect(resolvePatientNameSync(appt, {})).toBeNull();
    });

    test("appt.patientName takes precedence over cache", () => {
        const appt = makeAppt({ id: "x", patientName: "Direct Name" });
        expect(resolvePatientNameSync(appt, { x: "Cache Name" })).toBe("Direct Name");
    });

    test("works with no cache argument", () => {
        const appt = makeAppt({ patientName: null });
        expect(resolvePatientNameSync(appt)).toBeNull();
    });
});

// ─── buildExistingNamesCache ─────────────────────────────────────────────────
describe("buildExistingNamesCache", () => {
    test("builds a map of id -> patientName", () => {
        const data = [
            makeAppt({ id: "1", patientName: "Alice" }),
            makeAppt({ id: "2", patientName: "Bob" }),
        ];
        expect(buildExistingNamesCache(data)).toEqual({ "1": "Alice", "2": "Bob" });
    });

    test("excludes entries with no patientName", () => {
        const data = [
            makeAppt({ id: "1", patientName: "Alice" }),
            makeAppt({ id: "2", patientName: null }),
        ];
        const cache = buildExistingNamesCache(data);
        expect(cache).not.toHaveProperty("2");
    });

    test("returns empty object for empty array", () => {
        expect(buildExistingNamesCache([])).toEqual({});
    });

    test("last-write wins for duplicate ids", () => {
        const data = [
            makeAppt({ id: "1", patientName: "First" }),
            makeAppt({ id: "1", patientName: "Second" }),
        ];
        // Object.fromEntries keeps last occurrence
        const cache = buildExistingNamesCache(data);
        expect(cache["1"]).toBe("Second");
    });
});

// ─── Integration: full merge → assign → partition flow ───────────────────────
describe("Integration: merge → assign → partition", () => {
    test("full pipeline produces correct positions and buckets", () => {
        const regular = [
            makeAppt({ id: "r1", time: "09:00", status: "waiting" }),
            makeAppt({ id: "r2", time: "10:00", status: "completed" }),
        ];
        const walkIns = [
            makeAppt({ id: "w1", time: "09:30", status: "in consultation", isWalkIn: true }),
        ];

        const merged    = mergeAndDeduplicateAppointments(regular, walkIns);
        const withPos   = assignQueuePositions(merged);
        const { active, done } = partitionQueue(withPos);

        // r1 (09:00) → pos 1, w1 (09:30) → pos 2, r2 completed → null
        expect(active).toHaveLength(2);
        expect(done).toHaveLength(1);
        expect(active[0].id).toBe("r1");
        expect(active[0].queuePosition).toBe(1);
        expect(active[1].id).toBe("w1");
        expect(active[1].queuePosition).toBe(2);
    });

    test("stats are accurate after full merge", () => {
        const merged = mergeAndDeduplicateAppointments(
            [makeAppt({ id: "1", status: "waiting" }),
             makeAppt({ id: "2", status: "completed" })],
            [makeAppt({ id: "3", status: "cancelled", isWalkIn: true })]
        );
        const stats = computeStats(merged);
        expect(stats).toEqual({ total: 3, inQueue: 1, completed: 1 });
    });
});
