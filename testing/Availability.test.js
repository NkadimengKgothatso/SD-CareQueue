// =============================================================
// Availability.test.js
// =============================================================

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  () => ({ initializeApp: jest.fn(() => ({})) }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth: jest.fn(() => ({})),
    signOut: jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore: jest.fn(() => ({})),
    doc: jest.fn((_db, collectionName, id) => `${collectionName}/${id}`),
    getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
    setDoc: jest.fn(() => Promise.resolve()),
    collection: jest.fn((_db, name) => name),
    query: jest.fn((...parts) => parts),
    where: jest.fn((field, op, value) => ({ field, op, value })),
    getDocs: jest.fn(() => Promise.resolve({
      empty: true,
      size: 0,
      docs: [],
      forEach: jest.fn()
    })),
    serverTimestamp: jest.fn(() => "TIMESTAMP")
  }),
  { virtual: true }
);

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function makeSnapshot(records = []) {
  const docs = records.map(({ id, ...data }, index) => ({
    id: id || `doc-${index}`,
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

async function load() {
  const mod = await import("../Staff_Webpages/Availability.js");
  await flushPromises();
  return mod;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});

  document.body.innerHTML = `
    <section id="saveStatus"></section>
    <section class="week-card-header"></section>

    ${DAYS.map(day => `
      <section id="row-${day}"></section>
      <input type="checkbox" id="toggle-${day}" />
      <input type="time" id="start-${day}" value="08:00" />
      <input type="time" id="end-${day}" value="17:00" />
    `).join("")}

    <button id="saveBtn"></button>
    <section id="staffName"></section>
    <section id="staffEmail"></section>
    <section id="staffAvatar"></section>
    <section class="name-Surname"></section>
  `;
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("buildWorkDays returns the inclusive clinic workday range", async () => {
  const { buildWorkDays } = await load();

  expect(buildWorkDays("Monday", "Friday")).toEqual([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday"
  ]);
});

test("buildWorkDays returns an empty list for incomplete or invalid ranges", async () => {
  const { buildWorkDays } = await load();

  expect(buildWorkDays("", "Friday")).toEqual([]);
  expect(buildWorkDays("Monday", "")).toEqual([]);
  expect(buildWorkDays("Funday", "Friday")).toEqual([]);
});

test("capitalise capitalises first letter", async () => {
  const { capitalise } = await load();

  expect(capitalise("monday")).toBe("Monday");
  expect(capitalise("friday")).toBe("Friday");
});

test("showStatus updates text and colours", async () => {
  const { showStatus } = await load();

  showStatus("Saved successfully", "success");
  expect(document.getElementById("saveStatus").textContent).toBe("Saved successfully");
  expect(document.getElementById("saveStatus").style.color).toBe("rgb(24, 95, 165)");

  showStatus("Something went wrong", "error");
  expect(document.getElementById("saveStatus").style.color).toBe("rgb(220, 53, 69)");
});

test("showStatus does not throw when element is absent", async () => {
  const { showStatus } = await load();

  document.getElementById("saveStatus").remove();

  expect(() => showStatus("msg", "success")).not.toThrow();
});

test("fetchClinicHours matches clinic names case-insensitively", async () => {
  const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  getDocs.mockResolvedValue(makeSnapshot([
    { id: "c1", name: "Central Clinic", startTime: "07:30", endTime: "16:00", startDay: "Monday", endDay: "Friday" }
  ]));
  const { fetchClinicHours } = await load();

  await expect(fetchClinicHours(" central clinic ")).resolves.toEqual({
    openTime: "07:30",
    closeTime: "16:00",
    startDay: "Monday",
    endDay: "Friday"
  });
});

test("fetchClinicHours returns null when no clinic matches", async () => {
  const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  jest.spyOn(console, "warn").mockImplementation(() => {});
  getDocs.mockResolvedValue(makeSnapshot([{ id: "c1", name: "Central Clinic" }]));
  const { fetchClinicHours } = await load();

  await expect(fetchClinicHours("Other Clinic")).resolves.toBeNull();
});

test("fetchClinicHours returns null and logs when Firestore fails", async () => {
  const error = new Error("Firestore unavailable");
  const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  getDocs.mockRejectedValue(error);
  const { fetchClinicHours } = await load();

  await expect(fetchClinicHours("Central Clinic")).resolves.toBeNull();
  expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch clinic hours:", error);
});

test("readScheduleFromPage reads checked and unchecked days", async () => {
  const { readScheduleFromPage } = await load();

  document.getElementById("toggle-monday").checked = true;
  document.getElementById("toggle-tuesday").checked = false;

  const result = readScheduleFromPage();

  expect(result.monday).toEqual({ isWorking: true, start: "08:00", end: "17:00" });
  expect(result.tuesday).toEqual({ isWorking: false, start: null, end: null });
});

test("readScheduleFromPage falls back to clinic hours when working-day inputs are empty", async () => {
  const { readScheduleFromPage, setClinicHoursState } = await load();

  setClinicHoursState("07:30", "16:00", ["monday"]);
  document.getElementById("toggle-monday").checked = true;
  document.getElementById("start-monday").value = "";
  document.getElementById("end-monday").value = "";

  expect(readScheduleFromPage().monday).toEqual({
    isWorking: true,
    start: "07:30",
    end: "16:00"
  });
});

test("applyScheduleToPage sets values and disables non-working days", async () => {
  const { applyScheduleToPage } = await load();

  applyScheduleToPage({
    monday: { isWorking: true, start: "09:00", end: "15:00" },
    wednesday: { isWorking: false, start: null, end: null }
  });

  expect(document.getElementById("start-monday").value).toBe("09:00");
  expect(document.getElementById("end-monday").value).toBe("15:00");
  expect(document.getElementById("start-wednesday").disabled).toBe(true);
  expect(document.getElementById("end-wednesday").disabled).toBe(true);
  expect(document.getElementById("row-wednesday").classList.contains("day-off")).toBe(true);
});

test("applyScheduleToPage skips disabled clinic-closed days", async () => {
  const { applyScheduleToPage } = await load();

  document.getElementById("toggle-friday").disabled = true;
  document.getElementById("start-friday").value = "08:00";

  applyScheduleToPage({
    friday: { isWorking: true, start: "10:00", end: "16:00" }
  });

  expect(document.getElementById("start-friday").value).toBe("08:00");
});

test("applyClinicConstraints locks closed clinic days and constrains open days", async () => {
  const { applyClinicConstraints, setClinicHoursState } = await load();

  document.getElementById("start-monday").value = "06:00";
  document.getElementById("end-monday").value = "18:00";
  setClinicHoursState("07:30", "16:00", ["monday", "tuesday"]);

  applyClinicConstraints();

  expect(document.getElementById("toggle-monday").checked).toBe(true);
  expect(document.getElementById("start-monday").min).toBe("07:30");
  expect(document.getElementById("start-monday").value).toBe("07:30");
  expect(document.getElementById("end-monday").value).toBe("16:00");
  expect(document.getElementById("toggle-sunday").disabled).toBe(true);
  expect(document.getElementById("row-sunday").classList.contains("day-off")).toBe(true);
  expect(document.getElementById("clinicHoursNote").textContent).toContain("Operating hours:");
});

test("applyClinicConstraints toggle listener enables and disables time inputs", async () => {
  const { applyClinicConstraints, setClinicHoursState } = await load();

  setClinicHoursState("08:00", "17:00", ["monday"]);
  applyClinicConstraints();

  const toggle = document.getElementById("toggle-monday");
  toggle.checked = false;
  toggle.dispatchEvent(new Event("change"));

  expect(document.getElementById("start-monday").disabled).toBe(true);
  expect(document.getElementById("row-monday").classList.contains("day-off")).toBe(true);
});

test("loadAvailability applies a saved schedule and displays the last saved date", async () => {
  const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      schedule: {
        monday: { isWorking: true, start: "10:00", end: "14:00" }
      },
      updatedAt: { toDate: () => new Date("2026-05-17T00:00:00.000Z") }
    })
  });
  const { loadAvailability } = await load();

  await loadAvailability("staff-1");

  expect(document.getElementById("start-monday").value).toBe("10:00");
  expect(document.getElementById("saveStatus").textContent).toContain("Last saved:");
});

test("loadAvailability logs and shows an error when Firestore fails", async () => {
  const error = new Error("load failed");
  const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  getDoc.mockRejectedValue(error);
  const { loadAvailability } = await load();

  await loadAvailability("staff-1");

  expect(consoleSpy).toHaveBeenCalledWith("Failed to load availability:", error);
  expect(document.getElementById("saveStatus").textContent).toBe("Could not load your saved availability.");
});

test("saveAvailability rejects schedules with no working days", async () => {
  const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const { saveAvailability } = await load();

  DAYS.forEach(day => {
    document.getElementById(`toggle-${day}`).checked = false;
  });

  await saveAvailability("staff-1", "Jane Staff", 12);

  expect(setDoc).not.toHaveBeenCalled();
  expect(document.getElementById("saveStatus").textContent).toBe("Please set at least one working day.");
});

test("saveAvailability rejects end times before start times", async () => {
  const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const { saveAvailability } = await load();

  document.getElementById("toggle-monday").checked = true;
  document.getElementById("start-monday").value = "15:00";
  document.getElementById("end-monday").value = "09:00";

  await saveAvailability("staff-1", "Jane Staff", 12);

  expect(setDoc).not.toHaveBeenCalled();
  expect(document.getElementById("saveStatus").textContent).toBe("End time must be after start time for Monday.");
});

test("saveAvailability rejects times outside clinic hours", async () => {
  const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const { saveAvailability, setClinicHoursState } = await load();

  setClinicHoursState("08:00", "16:00", ["monday"]);
  document.getElementById("toggle-monday").checked = true;
  document.getElementById("start-monday").value = "07:30";
  document.getElementById("end-monday").value = "15:00";

  await saveAvailability("staff-1", "Jane Staff", 12);

  expect(setDoc).not.toHaveBeenCalled();
  expect(document.getElementById("saveStatus").textContent)
    .toBe("Monday start time cannot be before clinic opens at 08:00.");
});

test("saveAvailability writes a valid schedule and shows success", async () => {
  const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const { saveAvailability, setClinicHoursState } = await load();

  setClinicHoursState("08:00", "17:00", ["monday"]);
  DAYS.forEach(day => {
    document.getElementById(`toggle-${day}`).checked = false;
  });
  document.getElementById("toggle-monday").checked = true;
  document.getElementById("start-monday").value = "09:00";
  document.getElementById("end-monday").value = "16:00";

  await saveAvailability("staff-1", "Jane Staff", 12);

  expect(doc).toHaveBeenCalledWith({}, "StaffAvailability", "staff-1");
  expect(serverTimestamp).toHaveBeenCalled();
  expect(setDoc).toHaveBeenCalledWith("StaffAvailability/staff-1", expect.objectContaining({
    staffName: "Jane Staff",
    clinicID: 12,
    updatedAt: "TIMESTAMP",
    schedule: expect.objectContaining({
      monday: { isWorking: true, start: "09:00", end: "16:00" }
    })
  }));
  expect(document.getElementById("saveStatus").textContent).toContain("Availability saved successfully!");
});

test("saveAvailability logs and shows an error when saving fails", async () => {
  const error = new Error("save failed");
  const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  setDoc.mockRejectedValue(error);
  const { saveAvailability } = await load();

  document.getElementById("toggle-monday").checked = true;

  await saveAvailability("staff-1", "Jane Staff", 12);

  expect(consoleSpy).toHaveBeenCalledWith("Failed to save availability:", error);
  expect(document.getElementById("saveStatus").textContent).toBe("Failed to save. Please try again.");
});
