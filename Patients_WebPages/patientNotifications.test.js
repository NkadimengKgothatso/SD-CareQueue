// =============================================================
// patientNotifications.test.js
// =============================================================

// ── Firestore / Auth mock references ─────────────────────────
const mockOnSnapshot  = jest.fn();
const mockUpdateDoc   = jest.fn(() => Promise.resolve());
const mockDeleteDoc   = jest.fn(() => Promise.resolve());
const mockGetDocs     = jest.fn(() => Promise.resolve({ docs: [] }));
const mockCollection  = jest.fn();
const mockQuery       = jest.fn();
const mockWhere       = jest.fn();
const mockOrderBy     = jest.fn();
const mockDoc         = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock(
  "./firebase.js",
  () => ({ db: {}, auth: {} }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    collection:  mockCollection,
    query:       mockQuery,
    where:       mockWhere,
    orderBy:     mockOrderBy,
    onSnapshot:  mockOnSnapshot,
    doc:         mockDoc,
    getDocs:     mockGetDocs,
    updateDoc:   mockUpdateDoc,
    deleteDoc:   mockDeleteDoc,
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({ onAuthStateChanged: mockOnAuthStateChanged }),
  { virtual: true }
);

// ── DOM builder ───────────────────────────────────────────────
// MUST be called before every module import because the module
// runs document.getElementById and addEventListener at the top level.
function buildDOM() {
  document.body.innerHTML = `
    <section id="userName"></section>
    <section id="userEmail"></section>
    <section id="notifList"></section>
    <section id="toast"></section>
    <section id="count-all"></section>
    <section id="count-unread"></section>

    <section id="filters">
      <button class="filter-btn active" data-filter="all"></button>
      <button class="filter-btn" data-filter="unread"></button>
      <button class="filter-btn" data-filter="appointment"></button>
      <button class="filter-btn" data-filter="queue"></button>
    </section>

    <button id="markAllBtn"></button>
    <button id="clearBtn"></button>
  `;
}

// ── beforeEach ────────────────────────────────────────────────
beforeEach(() => {
  // 1. Build DOM first — module top-level code queries it on import
  buildDOM();

  // 2. Reset modules so each test gets a fresh module instance
  jest.resetModules();
  jest.clearAllMocks();

  // 3. Default: onAuthStateChanged never fires (keeps module idle)
  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  // Default: onSnapshot never fires
  mockOnSnapshot.mockImplementation(() => jest.fn());

  global.alert   = jest.fn();
  global.confirm = jest.fn(() => true);
});

// ── Helper: import module and seed test data ──────────────────
async function loadModule(notifications = [], filter = "all") {
  const mod = await import("./patientNotifications.js");
  mod.__setNotificationsForTest(notifications);
  mod.__setCurrentFilterForTest(filter);
  return mod;
}

// ── Sample notifications ──────────────────────────────────────
function makeNotif(overrides = {}) {
  return {
    id:     "n1",
    type:   "appointment",
    icon:   "📅",
    unread: true,
    name:   "Care Clinic",
    title:  "Appointment Booked",
    msg:    "Your appointment is confirmed",
    time:   "Today",
    tags:   ["Clinic: Care Clinic"],
    urgent: false,
    createdAt: null,
    ...overrides
  };
}

// =============================================================
// 1. getIcon
// =============================================================
test("getIcon returns correct icon for appointment", async () => {
  const { getIcon } = await loadModule();
  expect(getIcon("appointment")).toBe("📅");
});

test("getIcon returns correct icon for queue", async () => {
  const { getIcon } = await loadModule();
  expect(getIcon("queue")).toBe("⏱");
});

test("getIcon returns correct icon for reminder", async () => {
  const { getIcon } = await loadModule();
  expect(getIcon("reminder")).toBe("🔔");
});

test("getIcon returns correct icon for alert", async () => {
  const { getIcon } = await loadModule();
  expect(getIcon("alert")).toBe("⚠");
});

test("getIcon returns default bell for unknown type", async () => {
  const { getIcon } = await loadModule();
  expect(getIcon("other")).toBe("🔔");
});

// =============================================================
// 2. formatTime
// =============================================================
test("formatTime returns 'Just now' for null", async () => {
  const { formatTime } = await loadModule();
  expect(formatTime(null)).toBe("Just now");
});

test("formatTime returns 'Just now' for undefined", async () => {
  const { formatTime } = await loadModule();
  expect(formatTime(undefined)).toBe("Just now");
});

test("formatTime returns 'Just now' for object without toDate", async () => {
  const { formatTime } = await loadModule();
  expect(formatTime({})).toBe("Just now");
});

test("formatTime formats a Firebase-like timestamp", async () => {
  const { formatTime } = await loadModule();
  const ts = { toDate: () => new Date("2026-05-09T10:30:00") };
  expect(formatTime(ts)).toContain("2026");
});

// =============================================================
// 3. render — empty state
// =============================================================
test("render shows empty state when notifications list is empty", async () => {
  const { render } = await loadModule([], "all");
  render();
  expect(document.getElementById("notifList").textContent)
    .toContain("caught up");
});

test("render sets count-all to 0 when empty", async () => {
  const { render } = await loadModule([], "all");
  render();
  expect(document.getElementById("count-all").textContent).toBe("0");
});

test("render shows empty state when filter excludes all notifications", async () => {
  const { render } = await loadModule([makeNotif({ unread: false })], "unread");
  render();
  expect(document.getElementById("notifList").textContent)
    .toContain("caught up");
});

// =============================================================
// 4. render — notification cards
// =============================================================
test("render displays a notification card with title and clinic name", async () => {
  const { render } = await loadModule([makeNotif()], "all");
  render();
  const list = document.getElementById("notifList").textContent;
  expect(list).toContain("Appointment Booked");
  expect(list).toContain("Care Clinic");
});

test("render shows unread count correctly", async () => {
  const { render } = await loadModule([
    makeNotif({ unread: true }),
    makeNotif({ id: "n2", unread: false })
  ], "all");
  render();
  expect(document.getElementById("count-unread").textContent).toBe("1");
});

test("render shows total count correctly", async () => {
  const { render } = await loadModule([
    makeNotif(),
    makeNotif({ id: "n2" })
  ], "all");
  render();
  expect(document.getElementById("count-all").textContent).toBe("2");
});

test("render includes mark-as-read button for unread notifications", async () => {
  const { render } = await loadModule([makeNotif({ unread: true })], "all");
  render();
  expect(document.getElementById("notifList").innerHTML)
    .toContain('data-action="read"');
});

test("render does not include mark-as-read button for read notifications", async () => {
  const { render } = await loadModule([makeNotif({ unread: false })], "all");
  render();
  expect(document.getElementById("notifList").innerHTML)
    .not.toContain('data-action="read"');
});

test("render always includes dismiss button", async () => {
  const { render } = await loadModule([makeNotif()], "all");
  render();
  expect(document.getElementById("notifList").innerHTML)
    .toContain('data-action="dismiss"');
});

test("render shows Urgent tag for queue type notifications", async () => {
  const { render } = await loadModule(
    [makeNotif({ type: "queue", urgent: true })], "all"
  );
  render();
  expect(document.getElementById("notifList").textContent).toContain("Urgent");
});

test("render does not show Urgent tag for non-urgent notifications", async () => {
  const { render } = await loadModule([makeNotif({ urgent: false })], "all");
  render();
  expect(document.getElementById("notifList").textContent)
    .not.toContain("Urgent");
});

// =============================================================
// 5. render — filter behaviour
// =============================================================
test("render filters to only unread notifications", async () => {
  const { render } = await loadModule([
    makeNotif({ id: "n1", title: "Unread One", unread: true }),
    makeNotif({ id: "n2", title: "Read One",   unread: false })
  ], "unread");
  render();
  const text = document.getElementById("notifList").textContent;
  expect(text).toContain("Unread One");
  expect(text).not.toContain("Read One");
});

test("render filters by appointment type", async () => {
  const { render } = await loadModule([
    makeNotif({ id: "n1", title: "Appt Notif",  type: "appointment" }),
    makeNotif({ id: "n2", title: "Queue Notif", type: "queue" })
  ], "appointment");
  render();
  const text = document.getElementById("notifList").textContent;
  expect(text).toContain("Appt Notif");
  expect(text).not.toContain("Queue Notif");
});

test("render shows all notifications when filter is 'all'", async () => {
  const { render } = await loadModule([
    makeNotif({ id: "n1", title: "First",  type: "appointment" }),
    makeNotif({ id: "n2", title: "Second", type: "queue" })
  ], "all");
  render();
  const text = document.getElementById("notifList").textContent;
  expect(text).toContain("First");
  expect(text).toContain("Second");
});

// =============================================================
// 6. filter button clicks
// =============================================================
test("clicking a filter button changes the active filter and re-renders", async () => {
  const { render } = await loadModule([
    makeNotif({ id: "n1", title: "Unread",  unread: true }),
    makeNotif({ id: "n2", title: "Read One", unread: false })
  ], "all");
  render();

  // Click the "unread" filter button
  document.querySelector('[data-filter="unread"]').click();

  const text = document.getElementById("notifList").textContent;
  expect(text).toContain("Unread");
  expect(text).not.toContain("Read One");
});

test("clicking a filter button marks it as active", async () => {
  await loadModule();

  const unreadBtn = document.querySelector('[data-filter="unread"]');
  unreadBtn.click();

  expect(unreadBtn.classList.contains("active")).toBe(true);
});

// =============================================================
// 7. markAllBtn
// =============================================================
test("markAllBtn calls updateDoc for each unread notification", async () => {
  await loadModule([
    makeNotif({ id: "n1", unread: true }),
    makeNotif({ id: "n2", unread: true }),
    makeNotif({ id: "n3", unread: false })
  ]);

  document.getElementById("markAllBtn").click();
  await Promise.resolve();
  await Promise.resolve();

  // Only the 2 unread ones should be updated
  expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
  expect(global.alert).toHaveBeenCalledWith("All notifications marked as read");
});

test("markAllBtn does nothing when all notifications are already read", async () => {
  await loadModule([makeNotif({ unread: false })]);

  document.getElementById("markAllBtn").click();
  await Promise.resolve();

  expect(mockUpdateDoc).not.toHaveBeenCalled();
});

// =============================================================
// 8. clearBtn
// =============================================================
test("clearBtn calls deleteDoc for every notification when confirmed", async () => {
  global.confirm = jest.fn(() => true);

  await loadModule([
    makeNotif({ id: "n1" }),
    makeNotif({ id: "n2" })
  ]);

  document.getElementById("clearBtn").click();
  await Promise.resolve();
  await Promise.resolve();

  expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
  expect(global.alert).toHaveBeenCalledWith("All notifications cleared");
});

test("clearBtn does nothing when confirm is cancelled", async () => {
  global.confirm = jest.fn(() => false);

  await loadModule([makeNotif()]);

  document.getElementById("clearBtn").click();
  await Promise.resolve();

  expect(mockDeleteDoc).not.toHaveBeenCalled();
});

// =============================================================
// 9. notifList click — action buttons
// =============================================================
test("clicking mark-as-read button calls updateDoc", async () => {
  const { render } = await loadModule([makeNotif({ id: "abc", unread: true })]);
  render();

  const btn = document.querySelector('[data-action="read"]');
  btn.click();
  await Promise.resolve();

  expect(mockUpdateDoc).toHaveBeenCalled();
  expect(global.alert).toHaveBeenCalledWith("Marked as read");
});

test("clicking dismiss button calls deleteDoc", async () => {
  const { render } = await loadModule([makeNotif({ id: "abc" })]);
  render();

  const btn = document.querySelector('[data-action="dismiss"]');
  btn.click();
  await Promise.resolve();

  expect(mockDeleteDoc).toHaveBeenCalled();
  expect(global.alert).toHaveBeenCalledWith("Notification deleted");
});

test("clicking a notification card body marks unread as read via updateDoc", async () => {
  const { render } = await loadModule([makeNotif({ id: "abc", unread: true })]);
  render();

  // Click the card itself (not a button)
  const card = document.querySelector(".notif");
  card.click();
  await Promise.resolve();

  expect(mockUpdateDoc).toHaveBeenCalled();
});

test("clicking a read notification card does not call updateDoc", async () => {
  const { render } = await loadModule([makeNotif({ id: "abc", unread: false })]);
  render();

  const card = document.querySelector(".notif");
  card.click();
  await Promise.resolve();

  expect(mockUpdateDoc).not.toHaveBeenCalled();
});