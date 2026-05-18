const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot = jest.fn(() => jest.fn());
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn(() => Promise.resolve());
const mockCollection = jest.fn((_db, name) => ({ name }));
const mockQuery = jest.fn((collectionRef, ...constraints) => ({ name: collectionRef.name, constraints }));
const mockWhere = jest.fn((field, op, value) => ({ field, op, value }));
const mockOrderBy = jest.fn((field, direction) => ({ field, direction }));
const mockServerTimestamp = jest.fn(() => "TIMESTAMP");

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  () => ({ initializeApp: jest.fn(() => ({})) }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth: jest.fn(() => ({})),
    onAuthStateChanged: mockOnAuthStateChanged
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore: jest.fn(() => ({})),
    collection: mockCollection,
    onSnapshot: mockOnSnapshot,
    query: mockQuery,
    where: mockWhere,
    orderBy: mockOrderBy,
    addDoc: mockAddDoc,
    serverTimestamp: mockServerTimestamp,
    getDocs: mockGetDocs
  }),
  { virtual: true }
);

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

async function flushPromises(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

async function load() {
  const mod = await import("./walkin.js");
  await flushPromises();
  return mod;
}

function arrangeFirestore({
  staff = [],
  clinicData = [],
  appointments = [],
  walkins = []
} = {}) {
  mockGetDocs.mockImplementation((ref) => {
    if (ref.name === "ApprovedStaff") return Promise.resolve(snapshotFrom(staff));
    if (ref.name === "clinicsObjects") return Promise.resolve(snapshotFrom(clinicData));
    if (ref.name === "Appointments") {
      const isWalkinQuery = ref.constraints?.some((constraint) =>
        constraint.field === "isWalkIn"
      );
      return Promise.resolve(snapshotFrom(isWalkinQuery ? walkins : appointments));
    }
    return Promise.resolve(snapshotFrom([]));
  });
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-05-09T08:00:00"));

  document.body.innerHTML = `
    <table>
      <tbody id="walkinTable"></tbody>
    </table>

    <button class="add-btn"></button>
    <input id="nameInput" />
    <select id="reasonInput">
      <option value="">Select reason</option>
      <option value="Checkup">Checkup</option>
    </select>

    <section class="name-Surname"></section>
    <section class="clinic-name"></section>
    <section id="staffEmail"></section>
    <section id="staffAvatar"></section>
    <section id="staffName"></section>
  `;

  global.alert = jest.fn();
  jest.spyOn(console, "log").mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();

  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  arrangeFirestore();
  mockOnSnapshot.mockImplementation(() => jest.fn());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("date and time helpers work", async () => {
  const { getToday, timeToMinutes, minutesToTime, roundToNextSlot } = await load();

  expect(getToday()).toBe("2026-05-09");
  expect(timeToMinutes("08:30")).toBe(510);
  expect(minutesToTime(1020)).toBe("17:00");
  expect(roundToNextSlot(481, 30)).toBe(510);
  expect(roundToNextSlot(510, 30)).toBe(510);
});

test("isTaken detects overlapping and free slots", async () => {
  const { isTaken } = await load();
  const appointments = [{ time: "08:00" }];

  expect(isTaken(480, appointments, 30)).toBe(true);
  expect(isTaken(500, appointments, 30)).toBe(true);
  expect(isTaken(510, appointments, 30)).toBe(false);
});

test("getNextAvailableTime skips booked slots, ignores cancelled and invalid times, and returns FULL when needed", async () => {
  const { getNextAvailableTime } = await load();

  expect(getNextAvailableTime([
    { time: "08:00", status: "waiting" },
    { time: "08:30", status: "cancelled" },
    { time: "07:30", status: "waiting" }
  ], "08:00", "17:00")).toBe("08:30");

  jest.setSystemTime(new Date("2026-05-09T16:45:00"));
  expect(getNextAvailableTime([{ time: "16:30", status: "waiting" }], "08:00", "17:00")).toBe("FULL");
});

test("getStaffProfile matches email case-insensitively and returns null when absent", async () => {
  mockGetDocs.mockResolvedValue(snapshotFrom([
    { id: "s1", email: "STAFF@Test.COM", clinicId: 3, clinicName: "Central Clinic" }
  ]));
  const { getStaffProfile } = await load();

  await expect(getStaffProfile(" staff@test.com ")).resolves.toMatchObject({
    id: "s1",
    clinicId: 3,
    clinicName: "Central Clinic"
  });

  arrangeFirestore();
  await expect(getStaffProfile("missing@test.com")).resolves.toBeNull();
});

test("showConfirmModal resolves true and false and replaces previous modals", async () => {
  const { showConfirmModal } = await load();

  const first = showConfirmModal("First?");
  const second = showConfirmModal("Second?");
  document.getElementById("cancelBtn").click();
  await expect(second).resolves.toBe(false);
  expect(document.querySelectorAll("#confirmModal")).toHaveLength(0);

  const third = showConfirmModal("Third?");
  document.getElementById("okBtn").click();
  await expect(third).resolves.toBe(true);

  await expect(Promise.race([first, Promise.resolve("unresolved")])).resolves.toBe("unresolved");
});

test("loadAppointments renders live walk-in table rows", async () => {
  let snapshotSuccess;
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "Jane Staff" });
    return jest.fn();
  });
  mockGetDocs.mockResolvedValue(snapshotFrom([
    { id: "staff", email: "staff@test.com", clinicId: 7, clinicName: "Central Clinic" }
  ]));
  mockOnSnapshot.mockImplementation((_query, success) => {
    snapshotSuccess = success;
    return jest.fn();
  });

  await load();
  await flushPromises();

  snapshotSuccess(snapshotFrom([
    { id: "w1", ticketNumber: "W-001", patientName: "Walk In One", reason: "Checkup", time: "08:00", status: "waiting" },
    { id: "w2" }
  ]));

  expect(document.getElementById("walkinTable").textContent).toContain("W-001");
  expect(document.getElementById("walkinTable").textContent).toContain("Walk In One");
  expect(document.getElementById("walkinTable").textContent).toContain("Unknown");
});

test("add button validates missing name and unloaded clinic", async () => {
  await load();

  document.querySelector(".add-btn").click();
  await flushPromises();
  expect(global.alert).toHaveBeenCalledWith("Please enter patient name");

  document.getElementById("nameInput").value = "Walk In";
  document.querySelector(".add-btn").click();
  await flushPromises();
  expect(global.alert).toHaveBeenCalledWith("Clinic not loaded yet");
});

async function loadWithStaffProfile() {
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "Jane Staff" });
    return jest.fn();
  });
  arrangeFirestore({
    staff: [{ id: "staff", email: "staff@test.com", clinicId: 7, clinicName: "Central Clinic" }],
    clinicData: [{ id: "clinic", startTime: "08:00", endTime: "17:00", service: ["Checkup"] }]
  });
  await load();
  await flushPromises();
}

test("add button cancels when confirmation is declined", async () => {
  await loadWithStaffProfile();

  document.getElementById("nameInput").value = "Walk In";
  document.querySelector(".add-btn").click();
  await flushPromises();
  document.getElementById("cancelBtn").click();
  await flushPromises();

  expect(mockAddDoc).not.toHaveBeenCalled();
});

test("add button creates a walk-in appointment with next ticket and slot", async () => {
  await loadWithStaffProfile();

  arrangeFirestore({
    appointments: [{ id: "existing", time: "08:00", status: "waiting", clinicID: 7 }],
    walkins: [{ id: "walkin-1", isWalkIn: true }],
    clinicData: [{ id: "clinic", startTime: "08:00", endTime: "17:00", service: ["Checkup"] }]
  });

  document.getElementById("nameInput").value = " New Patient ";
  document.getElementById("reasonInput").value = "Checkup";
  document.querySelector(".add-btn").click();
  await flushPromises();
  document.getElementById("okBtn").click();
  await flushPromises(8);

  expect(mockAddDoc).toHaveBeenCalledWith(
    { name: "Appointments" },
    expect.objectContaining({
      clinicID: 7,
      patientName: "New Patient",
      reason: "Checkup",
      status: "waiting",
      isWalkIn: true,
      date: "2026-05-09",
      ticketNumber: "W-002",
      time: "08:30",
      createdAT: "TIMESTAMP"
    })
  );
  expect(document.getElementById("nameInput").value).toBe("");
  expect(document.getElementById("reasonInput").value).toBe("");
});

test("add button blocks when the day is full", async () => {
  await loadWithStaffProfile();
  jest.setSystemTime(new Date("2026-05-09T16:45:00"));
  arrangeFirestore({
    appointments: [{ id: "existing", time: "16:30", status: "waiting" }],
    clinicData: [{ id: "clinic", startTime: "08:00", endTime: "17:00", service: ["Checkup"] }]
  });

  document.getElementById("nameInput").value = "Late Patient";
  document.querySelector(".add-btn").click();
  await flushPromises();
  document.getElementById("okBtn").click();
  await flushPromises(8);

  expect(global.alert).toHaveBeenCalledWith("No available slots for today. The clinic is fully booked.");
  expect(mockAddDoc).not.toHaveBeenCalled();
});

test("add button reports Firestore write failures", async () => {
  const error = new Error("add failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  await loadWithStaffProfile();
  arrangeFirestore({
    clinicData: [{ id: "clinic", startTime: "08:00", endTime: "17:00", service: ["Checkup"] }]
  });
  mockAddDoc.mockRejectedValueOnce(error);

  document.getElementById("nameInput").value = "Error Patient";
  document.querySelector(".add-btn").click();
  await flushPromises();
  document.getElementById("okBtn").click();
  await flushPromises(8);

  expect(consoleSpy).toHaveBeenCalledWith(error);
  expect(global.alert).toHaveBeenCalledWith("Failed to add patient");
});

test("auth bootstrap handles signed-out and missing staff profile", async () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  const unsubscribe = jest.fn();
  mockOnSnapshot.mockReturnValue(unsubscribe);
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(null);
    return jest.fn();
  });

  await load();
  expect(document.querySelector(".name-Surname").textContent).toBe("Staff");
  expect(document.querySelector(".clinic-name").textContent).toBe("");

  jest.resetModules();
  document.body.innerHTML = `
    <tbody id="walkinTable"></tbody>
    <button class="add-btn"></button>
    <input id="nameInput" />
    <select id="reasonInput"><option value=""></option></select>
    <section class="name-Surname"></section>
    <section class="clinic-name"></section>
    <section id="staffEmail"></section>
    <section id="staffAvatar"></section>
    <section id="staffName"></section>
  `;
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "missing@test.com", displayName: "" });
    return jest.fn();
  });
  mockGetDocs.mockResolvedValue(snapshotFrom([]));

  await load();
  await flushPromises();

  expect(warnSpy).toHaveBeenCalledWith("No staff profile found");
});

test("auth bootstrap fills staff sidebar and clinic label", async () => {
  await loadWithStaffProfile();

  expect(document.querySelector(".name-Surname").textContent).toBe("Jane Staff");
  expect(document.getElementById("staffEmail").textContent).toBe("staff@test.com");
  expect(document.getElementById("staffAvatar").textContent).toBe("JS");
  expect(document.querySelector(".clinic-name").textContent).toBe("Central Clinic");
  expect(document.getElementById("reasonInput").value).toBe("Checkup");
});
