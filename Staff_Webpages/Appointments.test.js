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

beforeEach(() => {
  buildDOM();
  jest.resetModules();
  jest.clearAllMocks();

  // Keep auth and snapshot idle by default
  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  mockOnSnapshot.mockImplementation(() => jest.fn());
  mockGetDocs.mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() });
  mockDoc.mockReturnValue("doc-ref");

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
