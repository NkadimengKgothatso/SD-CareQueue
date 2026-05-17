// =============================================================
// Appointments.test.js
// =============================================================

// ── Firebase mock references ──────────────────────────────────
const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot         = jest.fn(() => jest.fn());
const mockGetDocs            = jest.fn();
const mockUpdateDoc          = jest.fn(() => Promise.resolve());
const mockCollection         = jest.fn();
const mockQuery              = jest.fn();
const mockWhere              = jest.fn();
const mockDoc                = jest.fn();
const mockGetDoc             = jest.fn();
const mockServerTimestamp    = jest.fn(() => "TIMESTAMP");

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  () => ({ initializeApp: jest.fn(() => ({})) }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth:            jest.fn(() => ({})),
    onAuthStateChanged: mockOnAuthStateChanged
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore:    jest.fn(() => ({})),
    collection:      mockCollection,
    query:           mockQuery,
    where:           mockWhere,
    onSnapshot:      mockOnSnapshot,
    doc:             mockDoc,
    getDoc:          mockGetDoc,
    getDocs:         mockGetDocs,
    updateDoc:       mockUpdateDoc,
    serverTimestamp: mockServerTimestamp
  }),
  { virtual: true }
);

// ── DOM builder ───────────────────────────────────────────────
// Must run BEFORE each module import — the source grabs DOM refs
// at the top level (querySelectorAll, getElementById, etc.)
function buildDOM() {
  document.body.innerHTML = `
    <section class="name-Surname"></section>
    <ul id="appointmentList"></ul>

    <button class="filter-btn active" data-filter="all"></button>
    <button class="filter-btn" data-filter="today"></button>
    <button class="filter-btn" data-filter="tomorrow"></button>
    <button class="filter-btn" data-filter="walkin"></button>

    <section id="stat-total"></section>
    <section id="stat-today"></section>
    <section id="stat-tomorrow"></section>
    <section id="stat-walkin"></section>

    <section id="staffEmail"></section>
    <section id="staffAvatar"></section>
    <section id="staffName"></section>
  `;

  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close    = jest.fn();
}

function snapshotFrom(records = []) {
  const docs = records.map(({ id, __docId, ...data }, index) => ({
    id: __docId || id || `doc-${index}`,
    data: () => data
  }));

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (callback) => docs.forEach(callback)
  };
}

async function flushPromises(times = 3) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  buildDOM();
  jest.resetModules();
  jest.clearAllMocks();

  // Keep auth and snapshot idle by default
  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  mockOnSnapshot.mockImplementation(() => jest.fn());
  mockGetDocs.mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() });
  mockCollection.mockImplementation((_db, name) => ({ name }));
  mockQuery.mockImplementation((collectionRef, ...constraints) => ({
    name: collectionRef.name,
    constraints
  }));
  mockWhere.mockImplementation((field, op, value) => ({ field, op, value }));
  mockDoc.mockImplementation((_db, collectionName, id) => `${collectionName}/${id}`);

  global.alert   = jest.fn();
  global.confirm = jest.fn(() => true);
});

// ── Helper ────────────────────────────────────────────────────
async function load() {
  return import("./Appointments.js");
}

// =============================================================
// 1. Date helpers
// =============================================================
test("getTodayString returns YYYY-MM-DD format", async () => {
  const { getTodayString } = await load();
  expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("getTomorrowString returns YYYY-MM-DD format", async () => {
  const { getTomorrowString } = await load();
  expect(getTomorrowString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("getTomorrowString is one day after getTodayString", async () => {
  const { getTodayString, getTomorrowString } = await load();

  const today    = new Date(getTodayString());
  const tomorrow = new Date(getTomorrowString());

  expect(tomorrow - today).toBe(24 * 60 * 60 * 1000);
});

// =============================================================
// 2. minutesToTime
// =============================================================
test("minutesToTime converts 480 to 08:00", async () => {
  const { minutesToTime } = await load();
  expect(minutesToTime(480)).toBe("08:00");
});

test("minutesToTime converts 510 to 08:30", async () => {
  const { minutesToTime } = await load();
  expect(minutesToTime(510)).toBe("08:30");
});

test("minutesToTime converts 1020 to 17:00", async () => {
  const { minutesToTime } = await load();
  expect(minutesToTime(1020)).toBe("17:00");
});

test("minutesToTime pads single-digit hours and minutes", async () => {
  const { minutesToTime } = await load();
  expect(minutesToTime(9 * 60 + 5)).toBe("09:05");
});

// =============================================================
// 3. getAllSlots
// =============================================================
test("getAllSlots starts at 08:00", async () => {
  const { getAllSlots } = await load();
  expect(getAllSlots()[0]).toBe("08:00");
});

test("getAllSlots ends at 16:30 (not 17:00)", async () => {
  const { getAllSlots } = await load();
  const slots = getAllSlots();
  expect(slots[slots.length - 1]).toBe("16:30");
  expect(slots).not.toContain("17:00");
});

test("getAllSlots returns 18 slots (30-min intervals from 08:00 to 17:00)", async () => {
  const { getAllSlots } = await load();
  expect(getAllSlots()).toHaveLength(18);
});

test("getAllSlots contains 08:30 and 12:00", async () => {
  const { getAllSlots } = await load();
  const slots = getAllSlots();
  expect(slots).toContain("08:30");
  expect(slots).toContain("12:00");
});

// =============================================================
// 4. renderEmptyState
// =============================================================
test("renderEmptyState renders the no-appointments message", async () => {
  const { renderEmptyState } = await load();
  renderEmptyState();
  expect(document.getElementById("appointmentList").textContent)
    .toContain("No upcoming appointments");
});

test("renderEmptyState replaces previous list content", async () => {
  const { renderEmptyState } = await load();
  document.getElementById("appointmentList").innerHTML = "<li>old</li>";
  renderEmptyState();
  expect(document.getElementById("appointmentList").textContent)
    .not.toContain("old");
});

// =============================================================
// 5. buildCard
// =============================================================
test("buildCard sets data-id on the card element", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "appt1", status: "scheduled" });
  expect(card.dataset.id).toBe("appt1");
});

test("buildCard shows patient name", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", patientName: "Test Patient", status: "scheduled" });
  expect(card.textContent).toContain("Test Patient");
});

test("buildCard shows Walk-in badge when isWalkIn is true", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", isWalkIn: true, status: "scheduled" });
  expect(card.textContent).toContain("Walk-in");
});

test("buildCard does not show Walk-in badge when isWalkIn is false", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", isWalkIn: false, status: "scheduled" });
  expect(card.textContent).not.toContain("Walk-in");
});

test("buildCard shows Scheduled status label", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "scheduled" });
  expect(card.textContent).toContain("Scheduled");
});

test("buildCard shows Completed label and done-card class", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "completed" });
  expect(card.classList.contains("done-card")).toBe(true);
  expect(card.textContent).toContain("Completed");
});

test("buildCard shows Cancelled label and done-card class", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "cancelled" });
  expect(card.classList.contains("done-card")).toBe(true);
  expect(card.textContent).toContain("Cancelled");
});

test("buildCard shows reason when provided", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "scheduled", reason: "Checkup" });
  expect(card.textContent).toContain("Checkup");
});

test("buildCard shows date and time", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "scheduled", date: "2026-06-01", time: "09:00" });
  expect(card.textContent).toContain("2026-06-01");
  expect(card.textContent).toContain("09:00");
});

test("buildCard shows reschedule and cancel buttons for non-done appointments", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "scheduled" });
  expect(card.querySelector(".reschedule-btn")).not.toBeNull();
  expect(card.querySelector(".cancel-btn-queue")).not.toBeNull();
});

test("buildCard does not show action buttons for completed appointments", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "completed" });
  expect(card.querySelector(".reschedule-btn")).toBeNull();
  expect(card.querySelector(".cancel-btn-queue")).toBeNull();
});

test("buildCard shows 'Unknown Patient' when patientName is missing", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "scheduled" });
  expect(card.textContent).toContain("Unknown Patient");
});

test("buildCard shows Waiting status label", async () => {
  const { buildCard } = await load();
  const card = buildCard({ id: "a1", status: "waiting" });
  expect(card.textContent).toContain("Waiting");
});

// =============================================================
// 6. updateStats
// =============================================================
test("updateStats sets stat-total to the appointment count", async () => {
  const { updateStats } = await load();

  // Inject appointments into the module's allAppointments via renderAppointments
  // updateStats reads allAppointments directly — we test it via the exported fn
  // with an empty list (allAppointments starts as [])
  updateStats();
  expect(document.getElementById("stat-total").textContent).toBe("0");
});

// =============================================================
// 7. showConfirmModal
// =============================================================
test("showConfirmModal resolves true when OK is clicked", async () => {
  const { showConfirmModal } = await load();

  const promise = showConfirmModal("Are you sure?");
  document.getElementById("confirmOkBtn").click();

  await expect(promise).resolves.toBe(true);
});

test("showConfirmModal resolves false when Cancel is clicked", async () => {
  const { showConfirmModal } = await load();

  const promise = showConfirmModal("Are you sure?");
  document.getElementById("confirmCancelBtn").click();

  await expect(promise).resolves.toBe(false);
});

test("showConfirmModal injects the message text into the dialog", async () => {
  const { showConfirmModal } = await load();

  showConfirmModal("Delete this record?");

  expect(document.body.textContent).toContain("Delete this record?");
  // cleanup
  document.getElementById("confirmCancelBtn").click();
});

test("showConfirmModal removes a previous modal before creating a new one", async () => {
  const { showConfirmModal } = await load();

  showConfirmModal("First");
  document.getElementById("confirmCancelBtn").click();

  showConfirmModal("Second");
  // Only one confirmModal should exist
  expect(document.querySelectorAll("#confirmModal").length).toBe(1);
  document.getElementById("confirmCancelBtn").click();
});

// =============================================================
// 8. cancelAppointment
// =============================================================
test("cancelAppointment calls updateDoc with cancelled status when confirmed", async () => {
  const { cancelAppointment } = await load();

  // showConfirmModal appends a dialog — auto-click OK after call
  const origCreate = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag) => {
    const el = origCreate(tag);
    if (tag === "dialog") {
      setTimeout(() => {
        const ok = el.querySelector?.("#confirmOkBtn");
        if (ok) ok.click();
      }, 0);
    }
    return el;
  });

  await cancelAppointment("appt-xyz");
  await Promise.resolve();

  expect(mockUpdateDoc).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ status: "cancelled" })
  );

  jest.restoreAllMocks();
});

test("cancelAppointment does not call updateDoc when cancelled", async () => {
  const { cancelAppointment } = await load();

  // Resolve the confirm modal with false (user clicked No)
  const origCreate = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag) => {
    const el = origCreate(tag);
    if (tag === "dialog") {
      setTimeout(() => {
        const cancel = el.querySelector?.("#confirmCancelBtn");
        if (cancel) cancel.click();
      }, 0);
    }
    return el;
  });

  await cancelAppointment("appt-xyz");
  await Promise.resolve();

  expect(mockUpdateDoc).not.toHaveBeenCalled();

  jest.restoreAllMocks();
});

test("cancelAppointment shows an alert when update fails", async () => {
  const error = new Error("cancel failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockUpdateDoc.mockRejectedValueOnce(error);
  const { cancelAppointment } = await load();

  const origCreate = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag) => {
    const el = origCreate(tag);
    if (tag === "dialog") {
      setTimeout(() => el.querySelector?.("#confirmOkBtn")?.click(), 0);
    }
    return el;
  });

  await cancelAppointment("appt-xyz");
  await flushPromises();

  expect(consoleSpy).toHaveBeenCalledWith("Failed to cancel:", error);
  expect(global.alert).toHaveBeenCalledWith("Could not cancel appointment. Please try again.");
});

test("getFreeSlots removes regular and walk-in booked slots but ignores cancelled and excluded appointments", async () => {
  mockGetDocs
    .mockResolvedValueOnce(snapshotFrom([
      { id: "regular-booked", time: "09:00", status: "scheduled" },
      { id: "regular-cancelled", time: "09:30", status: "cancelled" },
      { id: "exclude-me", time: "10:00", status: "scheduled" }
    ]))
    .mockResolvedValueOnce(snapshotFrom([
      { id: "walkin-booked", time: "11:00", status: "waiting" },
      { id: "walkin-cancelled", time: "11:30", status: "cancelled" }
    ]));
  const { getFreeSlots } = await load();

  const slots = await getFreeSlots("2026-06-01", "exclude-me");

  expect(slots).not.toContain("09:00");
  expect(slots).not.toContain("11:00");
  expect(slots).toContain("09:30");
  expect(slots).toContain("10:00");
  expect(slots).toContain("11:30");
});

test("openRescheduleModal validates selection and updates appointment when a free slot is chosen", async () => {
  mockGetDocs
    .mockResolvedValue(snapshotFrom([
      { id: "other", time: "08:00", status: "scheduled" }
    ]));
  const { openRescheduleModal } = await load();

  await openRescheduleModal({
    id: "appt-1",
    patientName: "Patient One",
    date: "2026-06-01",
    time: "08:00"
  });

  document.getElementById("rescheduleConfirmBtn").click();
  expect(document.getElementById("rescheduleError").textContent)
    .toBe("Please select a date and an available time slot.");

  document.getElementById("rescheduleTime").value = "08:30";
  document.getElementById("rescheduleConfirmBtn").click();
  await flushPromises();

  expect(mockUpdateDoc).toHaveBeenCalledWith(
    "Appointments/appt-1",
    expect.objectContaining({
      date: "2026-06-01",
      time: "08:30",
      status: "scheduled",
      updatedAt: "TIMESTAMP"
    })
  );
});

test("openRescheduleModal disables time selection when no slots are free and supports cancel", async () => {
  mockGetDocs.mockResolvedValue(snapshotFrom(
    Array.from({ length: 18 }, (_, index) => ({
      id: `booked-${index}`,
      time: `${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
      status: "scheduled"
    }))
  ));
  const { openRescheduleModal } = await load();

  await openRescheduleModal({ id: "appt-1", date: "2026-06-01" });

  expect(document.getElementById("rescheduleTime").disabled).toBe(true);
  expect(document.getElementById("rescheduleTime").textContent)
    .toContain("No available slots for this date");

  document.getElementById("rescheduleCancelBtn").click();
  expect(document.getElementById("rescheduleModal")).toBeNull();
});

test("openRescheduleModal reports update errors and restores the confirm button", async () => {
  const error = new Error("reschedule failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockGetDocs.mockResolvedValue(snapshotFrom([]));
  mockUpdateDoc.mockRejectedValueOnce(error);
  const { openRescheduleModal } = await load();

  await openRescheduleModal({ id: "appt-1", date: "2026-06-01" });

  document.getElementById("rescheduleTime").value = "08:00";
  document.getElementById("rescheduleConfirmBtn").click();
  await flushPromises();

  expect(consoleSpy).toHaveBeenCalledWith("Failed to reschedule:", error);
  expect(document.getElementById("rescheduleError").textContent)
    .toBe("Failed to reschedule. Please try again.");
  expect(document.getElementById("rescheduleConfirmBtn").disabled).toBe(false);
});

test("startAppointmentsListener renders non-cancelled appointments and resolves missing patient names", async () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  let snapshotSuccess;
  mockOnSnapshot.mockImplementation((_query, success) => {
    snapshotSuccess = success;
    return jest.fn();
  });
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ displayName: "Fetched Patient" })
  });
  const { startAppointmentsListener } = await load();

  startAppointmentsListener();
  await snapshotSuccess(snapshotFrom([
    { id: "a2", date: "2026-06-02", time: "11:00", status: "cancelled", patientName: "Skip Me" },
    { id: "a1", date: "2026-06-01", time: "10:00", status: "scheduled", userID: "user-1", reason: "Checkup" },
    { id: "a3", date: "2026-06-01", time: "09:00", status: "waiting", name: "Named Patient", isWalkIn: true }
  ]));
  await flushPromises();

  expect(consoleSpy).toHaveBeenCalledWith("📋 Appointments:", 3);
  expect(document.getElementById("appointmentList").textContent).toContain("Fetched Patient");
  expect(document.getElementById("appointmentList").textContent).toContain("Named Patient");
  expect(document.getElementById("appointmentList").textContent).not.toContain("Skip Me");
  expect(document.getElementById("stat-total").textContent).toBe("2");
});

test("startAppointmentsListener renders an error state when the listener fails", async () => {
  const error = new Error("listener failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  let snapshotError;
  mockOnSnapshot.mockImplementation((_query, _success, failure) => {
    snapshotError = failure;
    return jest.fn();
  });
  const { startAppointmentsListener } = await load();

  startAppointmentsListener();
  snapshotError(error);

  expect(consoleSpy).toHaveBeenCalledWith("Appointments listener error:", error);
  expect(document.getElementById("appointmentList").textContent)
    .toContain("Failed to load appointments. Please refresh the page.");
});

test("filter buttons update active filter and rendered appointments", async () => {
  let snapshotSuccess;
  mockOnSnapshot.mockImplementation((_query, success) => {
    snapshotSuccess = success;
    return jest.fn();
  });
  const { startAppointmentsListener, getTodayString, getTomorrowString } = await load();

  startAppointmentsListener();
  await snapshotSuccess(snapshotFrom([
    { id: "today", date: getTodayString(), time: "09:00", status: "scheduled", patientName: "Today Patient" },
    { id: "tomorrow", date: getTomorrowString(), time: "09:00", status: "scheduled", patientName: "Tomorrow Patient" },
    { id: "walkin", date: "2099-01-01", time: "09:00", status: "waiting", patientName: "Walkin Patient", isWalkIn: true }
  ]));
  await flushPromises();

  document.querySelector('[data-filter="today"]').click();
  expect(document.getElementById("appointmentList").textContent).toContain("Today Patient");
  expect(document.getElementById("appointmentList").textContent).not.toContain("Tomorrow Patient");

  document.querySelector('[data-filter="tomorrow"]').click();
  expect(document.getElementById("appointmentList").textContent).toContain("Tomorrow Patient");

  document.querySelector('[data-filter="walkin"]').click();
  expect(document.getElementById("appointmentList").textContent).toContain("Walkin Patient");
  expect(document.querySelector('[data-filter="walkin"]').classList.contains("active")).toBe(true);
});

test("auth bootstrap handles signed-out users", async () => {
  const unsubscribe = jest.fn();
  mockOnSnapshot.mockReturnValue(unsubscribe);
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(null);
    return jest.fn();
  });

  await load();
  await flushPromises();

  expect(document.querySelector(".name-Surname").textContent).toBe("Staff");
  expect(document.getElementById("appointmentList").textContent).toContain("No upcoming appointments");
});

test("auth bootstrap fills staff profile and starts appointment listener", async () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "Jane Staff" });
    return jest.fn();
  });
  mockGetDocs.mockResolvedValue(snapshotFrom([
    { id: "staff-doc", clinicId: 7 }
  ]));

  await load();
  await flushPromises();

  expect(document.querySelector(".name-Surname").textContent).toBe("Jane Staff");
  expect(document.getElementById("staffEmail").textContent).toBe("staff@test.com");
  expect(document.getElementById("staffAvatar").textContent).toBe("JS");
  expect(consoleSpy).toHaveBeenCalledWith("🏥 staffClinicID:", 7);
  expect(mockOnSnapshot).toHaveBeenCalled();
});

test("auth bootstrap shows support message when staff clinic cannot be determined", async () => {
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "" });
    return jest.fn();
  });
  mockGetDocs.mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() });

  await load();
  await flushPromises();

  expect(document.querySelector(".name-Surname").textContent).toBe("Staff");
  expect(document.getElementById("appointmentList").textContent)
    .toContain("Could not determine your clinic. Please contact support.");
});

test("auth bootstrap logs clinic lookup errors", async () => {
  const error = new Error("staff lookup failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "Jane Staff" });
    return jest.fn();
  });
  mockGetDocs.mockRejectedValue(error);

  await load();
  await flushPromises();

  expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch staff clinic:", error);
  expect(document.getElementById("appointmentList").textContent)
    .toContain("Could not determine your clinic. Please contact support.");
});
