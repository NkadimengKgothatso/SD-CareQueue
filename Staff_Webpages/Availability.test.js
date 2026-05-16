// =============================================================
// Availability.test.js
// =============================================================

// ── Firebase mocks ────────────────────────────────────────────
jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  () => ({ initializeApp: jest.fn(() => ({})) }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth:            jest.fn(() => ({})),
    signOut:            jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn()          // never fires — keeps module idle
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore:    jest.fn(() => ({})),
    doc:             jest.fn(),
    getDoc:          jest.fn(() => Promise.resolve({ exists: () => false })),
    setDoc:          jest.fn(() => Promise.resolve()),
    collection:      jest.fn(),
    query:           jest.fn(),
    where:           jest.fn(),
    getDocs:         jest.fn(() => Promise.resolve({ size: 0, forEach: jest.fn() })),
    serverTimestamp: jest.fn()
  }),
  { virtual: true }
);

// ── DOM ───────────────────────────────────────────────────────
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

beforeEach(() => {
  jest.resetModules();

  document.body.innerHTML = `
    <section id="saveStatus"></section>
    <section class="week-card-header"></section>

    ${DAYS.map(day => `
      <section id="row-${day}"></section>
      <input type="checkbox" id="toggle-${day}" />
      <input id="start-${day}" value="08:00" />
      <input id="end-${day}"   value="17:00" />
    `).join("")}

    <button id="saveBtn"></button>
    <section id="staffName"></section>
    <section id="staffEmail"></section>
    <section id="staffAvatar"></section>
    <section class="name-Surname"></section>
  `;
});

// =============================================================
// convertTo24Hour
// =============================================================
test("convertTo24Hour converts AM correctly", async () => {
  const { convertTo24Hour } = await import("./Availability.js");

  expect(convertTo24Hour("7",  "am")).toBe("07:00");
  expect(convertTo24Hour("12", "am")).toBe("00:00");
});

test("convertTo24Hour converts PM correctly", async () => {
  const { convertTo24Hour } = await import("./Availability.js");

  expect(convertTo24Hour("5",  "pm")).toBe("17:00");
  expect(convertTo24Hour("12", "pm")).toBe("12:00");
});

// =============================================================
// parseClinicHours
// =============================================================
test("parseClinicHours parses valid clinic hours", async () => {
  const { parseClinicHours } = await import("./Availability.js");

  const result = parseClinicHours("Mon-Fri: 7am-5pm");

  expect(result.openTime).toBe("07:00");
  expect(result.closeTime).toBe("17:00");
  expect(result.workDays).toContain("monday");
  expect(result.workDays).toContain("friday");
});

test("parseClinicHours returns null for invalid format", async () => {
  const { parseClinicHours } = await import("./Availability.js");

  expect(parseClinicHours("INVALID")).toBeNull();
});

test("parseClinicHours returns null for null input", async () => {
  const { parseClinicHours } = await import("./Availability.js");

  expect(parseClinicHours(null)).toBeNull();
});

// =============================================================
// capitalise
// =============================================================
test("capitalise capitalises first letter", async () => {
  const { capitalise } = await import("./Availability.js");

  expect(capitalise("monday")).toBe("Monday");
  expect(capitalise("friday")).toBe("Friday");
});

// =============================================================
// showStatus
// =============================================================
test("showStatus updates status element text", async () => {
  const { showStatus } = await import("./Availability.js");

  showStatus("Saved successfully", "success");

  expect(document.getElementById("saveStatus").textContent)
    .toContain("Saved successfully");
});

test("showStatus sets error colour for error type", async () => {
  const { showStatus } = await import("./Availability.js");

  showStatus("Something went wrong", "error");

  expect(document.getElementById("saveStatus").style.color)
    .toBe("rgb(220, 53, 69)");
});

test("showStatus does not throw when element is absent", async () => {
  const { showStatus } = await import("./Availability.js");

  document.getElementById("saveStatus").remove();

  expect(() => showStatus("msg", "success")).not.toThrow();
});

// =============================================================
// readScheduleFromPage
// =============================================================
test("readScheduleFromPage reads checked toggle as working", async () => {
  const { readScheduleFromPage } = await import("./Availability.js");

  document.getElementById("toggle-monday").checked = true;

  const result = readScheduleFromPage();

  expect(result.monday.isWorking).toBe(true);
  expect(result.monday.start).toBe("08:00");
  expect(result.monday.end).toBe("17:00");
});

test("readScheduleFromPage marks unchecked day as not working", async () => {
  const { readScheduleFromPage } = await import("./Availability.js");

  document.getElementById("toggle-tuesday").checked = false;

  const result = readScheduleFromPage();

  expect(result.tuesday.isWorking).toBe(false);
  expect(result.tuesday.start).toBeNull();
  expect(result.tuesday.end).toBeNull();
});

// =============================================================
// applyScheduleToPage
// =============================================================
test("applyScheduleToPage sets start and end inputs", async () => {
  const { applyScheduleToPage } = await import("./Availability.js");

  applyScheduleToPage({
    monday: { isWorking: true, start: "09:00", end: "15:00" }
  });

  expect(document.getElementById("start-monday").value).toBe("09:00");
  expect(document.getElementById("end-monday").value).toBe("15:00");
});

test("applyScheduleToPage disables inputs for non-working day", async () => {
  const { applyScheduleToPage } = await import("./Availability.js");

  applyScheduleToPage({
    wednesday: { isWorking: false, start: null, end: null }
  });

  expect(document.getElementById("start-wednesday").disabled).toBe(true);
  expect(document.getElementById("end-wednesday").disabled).toBe(true);
});

test("applyScheduleToPage skips days not in the schedule object", async () => {
  const { applyScheduleToPage } = await import("./Availability.js");

  // Only pass monday — other days should remain unchanged
  applyScheduleToPage({
    monday: { isWorking: true, start: "10:00", end: "16:00" }
  });

  // friday was not in the schedule, its value should be unchanged
  expect(document.getElementById("start-friday").value).toBe("08:00");
});