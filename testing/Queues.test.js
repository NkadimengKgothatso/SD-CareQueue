const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot = jest.fn(() => jest.fn());
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockAddDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockCollection = jest.fn((_db, name) => ({ name }));
const mockQuery = jest.fn((collectionRef, ...constraints) => ({ name: collectionRef.name, constraints }));
const mockWhere = jest.fn((field, op, value) => ({ field, op, value }));
const mockDoc = jest.fn((_db, collectionName, id) => `${collectionName}/${id}`);
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
    query: mockQuery,
    where: mockWhere,
    onSnapshot: mockOnSnapshot,
    doc: mockDoc,
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    setDoc: mockSetDoc,
    addDoc: mockAddDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    serverTimestamp: mockServerTimestamp
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
  const mod = await import("../Staff_Webpages/Queues.js");
  await flushPromises();
  return mod;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();

  document.body.innerHTML = `
    <ul id="upcoming"></ul>

    <section id="stat-total"></section>
    <section id="stat-inqueue"></section>
    <section id="stat-completed"></section>
    <section id="stat-avgwait"></section>

    <section class="name-Surname"></section>

    <section id="staffName"></section>
    <section id="staffEmail"></section>
    <section id="staffAvatar"></section>
  `;

  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  mockOnSnapshot.mockImplementation(() => jest.fn());
  mockGetDocs.mockResolvedValue(snapshotFrom([]));
  mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
  global.fetch = jest.fn(() => Promise.resolve({
    ok: false,
    json: () => Promise.resolve({})
  }));
  global.alert = jest.fn();
});

test("getTodayString returns YYYY-MM-DD", async () => {
  const { getTodayString } = await load();

  expect(getTodayString()).toMatch(/\d{4}-\d{2}-\d{2}/);
});

test("buildCard creates waiting and completed cards", async () => {
  const { buildCard } = await load();

  const waiting = buildCard({
    id: "1",
    patientName: "John Doe",
    time: "08:00",
    status: "waiting",
    reason: "Checkup",
    isWalkIn: true
  }, 1);

  expect(waiting.textContent).toContain("John Doe");
  expect(waiting.textContent).toContain("Waiting");
  expect(waiting.textContent).toContain("Walk-in");
  expect(waiting.querySelector(".advance-btn").dataset.next).toBe("in consultation");

  const done = buildCard({
    id: "2",
    patientName: "Jane Doe",
    time: "09:00",
    status: "completed",
    reason: "Follow-up"
  }, "-");

  expect(done.textContent).toContain("Completed");
  expect(done.classList.contains("done-card")).toBe(true);
  expect(done.querySelector(".advance-btn")).toBeNull();
});

test("buildCard triggers position-two notification only once per appointment", async () => {
  const { buildCard, __setStaffClinicIDForTest } = await load();
  __setStaffClinicIDForTest(3);

  buildCard({
    id: "notify-1",
    userID: "user-1",
    patientEmail: "patient@test.com",
    clinicName: "  Central Clinic  ",
    reason: "Checkup",
    status: "waiting"
  }, 2);
  await flushPromises();

  expect(mockUpdateDoc).toHaveBeenCalledWith("Queues/notify-1", { emailSent: true });
  expect(mockAddDoc).toHaveBeenCalledWith(
    { name: "Notifications" },
    expect.objectContaining({
      userID: "user-1",
      clinicID: 3,
      clinicName: "Central Clinic",
      title: "Appointment In An Hour!",
      read: false,
      createdAt: "TIMESTAMP"
    })
  );

  buildCard({ id: "notify-1", userID: "user-1", patientEmail: "patient@test.com" }, 2);
  await flushPromises();
  expect(mockAddDoc).toHaveBeenCalledTimes(1);
});

test("sendPositionTwoNotification skips missing user or email and clears guard on failure", async () => {
  const error = new Error("notify failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const { sendPositionTwoNotification } = await load();

  await sendPositionTwoNotification({ id: "a" });
  await sendPositionTwoNotification({ id: "b", userID: "user-1" });
  expect(mockUpdateDoc).not.toHaveBeenCalled();

  mockUpdateDoc.mockRejectedValueOnce(error);
  await sendPositionTwoNotification({ id: "c", userID: "user-1", patientEmail: "patient@test.com" });
  expect(consoleSpy).toHaveBeenCalledWith("Failed to send position 2 notification:", error);
});

test("updateStats and renderQueue handle active, done, and empty queues", async () => {
  const module = await load();

  module.__setQueueDataForTest([
    { id: "waiting", status: "waiting", time: "09:00", patientName: "Waiting Patient" },
    { id: "consult", status: "in consultation", time: "08:00", patientName: "Consult Patient" },
    { id: "done", status: "completed", time: "10:00", patientName: "Done Patient" }
  ]);

  module.renderQueue();

  expect(document.getElementById("stat-total").textContent).toBe("3");
  expect(document.getElementById("stat-inqueue").textContent).toBe("2");
  expect(document.getElementById("stat-completed").textContent).toBe("1");
  expect(document.getElementById("upcoming").textContent).toContain("Completed & Cancelled");
  expect(document.getElementById("upcoming").textContent).toContain("Consult Patient");

  module.__setQueueDataForTest([]);
  module.renderQueue();
  expect(document.getElementById("upcoming").textContent).toContain("No patients in queue for today");
});

test("renderQueue shows empty active state before completed-only divider", async () => {
  const module = await load();

  module.__setQueueDataForTest([
    { id: "done", status: "completed", patientName: "Done Patient" }
  ]);
  module.renderQueue();

  expect(document.getElementById("upcoming").textContent).toContain("No patients in queue for today");
  expect(document.getElementById("upcoming").textContent).toContain("Completed & Cancelled");
  expect(document.getElementById("upcoming").textContent).toContain("Done Patient");
});

test("updateStatus updates appointment and matching queue record", async () => {
  mockGetDoc.mockResolvedValue({ exists: () => true });
  const { updateStatus } = await load();

  await updateStatus("appt-1", "completed");

  expect(mockUpdateDoc).toHaveBeenCalledWith(
    "Appointments/appt-1",
    { status: "completed", updatedAt: "TIMESTAMP" }
  );
  expect(mockUpdateDoc).toHaveBeenCalledWith(
    "Queues/appt-1",
    { status: "completed", position: null, updatedAt: "TIMESTAMP" }
  );
});

test("updateStatus alerts when update fails", async () => {
  const error = new Error("update failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockUpdateDoc.mockRejectedValueOnce(error);
  const { updateStatus } = await load();

  await updateStatus("appt-1", "completed");

  expect(consoleSpy).toHaveBeenCalledWith("Failed to update status:", error);
  expect(global.alert).toHaveBeenCalledWith("Could not update patient status. Please try again.");
});

test("deleteOldQueueEntries deletes stale queue records for the staff clinic", async () => {
  const { deleteOldQueueEntries, getTodayString, __setStaffClinicIDForTest } = await load();
  __setStaffClinicIDForTest(5);
  mockGetDocs.mockResolvedValue(snapshotFrom([
    { id: "old", clinicID: 5, date: "2020-01-01" },
    { id: "today", clinicID: 5, date: getTodayString() },
    { id: "other", clinicID: 9, date: "2020-01-01" }
  ]));

  await deleteOldQueueEntries();

  expect(mockDeleteDoc).toHaveBeenCalledWith("Queues/old");
  expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
});

test("deleteOldQueueEntries logs failures", async () => {
  const error = new Error("delete lookup failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const { deleteOldQueueEntries } = await load();
  mockGetDocs.mockRejectedValue(error);

  await deleteOldQueueEntries();

  expect(consoleSpy).toHaveBeenCalledWith("Failed to delete old queue entries:", error);
});

test("syncAppointmentsToQueues writes active and completed queue snapshots", async () => {
  const { syncAppointmentsToQueues, __setStaffClinicIDForTest } = await load();
  __setStaffClinicIDForTest(4);

  await syncAppointmentsToQueues([
    { id: "a1", status: "waiting", queuePosition: 2, patientEmail: "p@test.com", clinicName: "Clinic", reason: "Checkup", userID: "u1", patientName: "Patient", time: "09:00" },
    { id: "a2", status: "completed", queuePosition: null, isWalkIn: true }
  ]);

  expect(mockSetDoc).toHaveBeenCalledWith(
    "Queues/a1",
    expect.objectContaining({
      appointmentId: "a1",
      clinicID: 4,
      position: 2,
      updatedAt: "TIMESTAMP"
    }),
    { merge: true }
  );
  expect(mockSetDoc).toHaveBeenCalledWith(
    "Queues/a2",
    expect.objectContaining({
      position: null,
      isWalkIn: true
    }),
    { merge: true }
  );
  expect(mockUpdateDoc).toHaveBeenCalledWith("Queues/a1", { estimateWait: 14 });
});

test("syncAppointmentsToQueues logs write failures", async () => {
  const error = new Error("sync failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockSetDoc.mockRejectedValueOnce(error);
  const { syncAppointmentsToQueues } = await load();

  await syncAppointmentsToQueues([{ id: "a1", status: "waiting", queuePosition: 1 }]);

  expect(consoleSpy).toHaveBeenCalledWith("Failed to sync appointments to Queues:", error);
});

test("mergeAndRender deduplicates appointments, resolves names, assigns positions, and renders", async () => {
  let regularSuccess;
  let walkinSuccess;
  mockOnSnapshot
    .mockImplementationOnce((_q, success) => {
      regularSuccess = success;
      return jest.fn();
    })
    .mockImplementationOnce((_q, success) => {
      walkinSuccess = success;
      return jest.fn();
    });
  mockGetDocs.mockResolvedValue(snapshotFrom([]));
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ displayName: "Fetched Regular" })
  });
  const { startQueueListeners, __setStaffClinicIDForTest } = await load();
  __setStaffClinicIDForTest(2);

  startQueueListeners();
  regularSuccess(snapshotFrom([
    { id: "r1", time: "09:00", status: "scheduled", userID: "u1", reason: "Checkup", patientEmail: "p@test.com" }
  ]));
  walkinSuccess(snapshotFrom([
    { id: "w1", time: "08:30", status: "waiting", patientName: "Walk In", reason: "Walkin" },
    { id: "r1", time: "09:00", status: "waiting", patientName: "Duplicate" }
  ]));
  await flushPromises(20);

  expect(document.getElementById("upcoming").textContent).toContain("Fetched Regular");
  expect(document.getElementById("upcoming").textContent).toContain("Walk In");
  expect(mockSetDoc).toHaveBeenCalledWith(
    "Queues/w1",
    expect.objectContaining({ position: 1 }),
    { merge: true }
  );
  expect(mockSetDoc).toHaveBeenCalledWith(
    "Queues/r1",
    expect.objectContaining({ position: 2 }),
    { merge: true }
  );
  expect(mockUpdateDoc).toHaveBeenCalledWith(
    "Appointments/r1",
    { status: "waiting", updatedAt: "TIMESTAMP" }
  );
  expect(mockUpdateDoc).toHaveBeenCalledWith("Queues/w1", { estimateWait: 0 });
  expect(mockUpdateDoc).toHaveBeenCalledWith("Queues/r1", { estimateWait: 14 });
});

test("mergeAndRender reuses cached names, handles lookup failures, and clears positions for done records", async () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  let regularSuccess;
  let walkinSuccess;
  mockOnSnapshot
    .mockImplementationOnce((_q, success) => {
      regularSuccess = success;
      return jest.fn();
    })
    .mockImplementationOnce((_q, success) => {
      walkinSuccess = success;
      return jest.fn();
    });
  mockGetDocs.mockResolvedValue(snapshotFrom([]));
  mockGetDoc.mockRejectedValue(new Error("name lookup failed"));
  const module = await load();
  module.__setStaffClinicIDForTest(2);
  module.__setQueueDataForTest([{ id: "cached", patientName: "Cached Name" }]);

  module.startQueueListeners();
  regularSuccess(snapshotFrom([
    { id: "cached", time: "08:00", status: "scheduled" },
    { id: "missing-name", time: "08:30", status: "waiting", userID: "user-2" },
    { id: "done-record", time: "09:00", status: "completed", patientName: "Done Person" }
  ]));
  walkinSuccess(snapshotFrom([]));
  await flushPromises(20);

  expect(document.getElementById("upcoming").textContent).toContain("Cached Name");
  expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch patient name:", expect.any(Error));
  expect(mockSetDoc).toHaveBeenCalledWith(
    "Queues/done-record",
    expect.objectContaining({ position: null }),
    { merge: true }
  );
});

test("startQueueListeners unsubscribes previous listeners and logs listener errors", async () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const unsubReg = jest.fn();
  const unsubWalk = jest.fn();
  let regularError;
  let walkinError;
  mockOnSnapshot
    .mockImplementationOnce((_q, _success, failure) => {
      regularError = failure;
      return unsubReg;
    })
    .mockImplementationOnce((_q, _success, failure) => {
      walkinError = failure;
      return unsubWalk;
    })
    .mockImplementation((_q, _success, failure) => {
      if (!regularError) regularError = failure;
      return jest.fn();
    });
  const { startQueueListeners } = await load();

  startQueueListeners();
  expect(document.getElementById("upcoming").textContent).toContain("Loading today's queue");
  regularError(new Error("regular broken"));
  walkinError(new Error("walkin broken"));

  startQueueListeners();
  expect(unsubReg).toHaveBeenCalled();
  expect(unsubWalk).toHaveBeenCalled();
  expect(errorSpy).toHaveBeenCalledWith("Regular appointments listener error:", expect.any(Error));
  expect(errorSpy).toHaveBeenCalledWith("Walk-in appointments listener error:", expect.any(Error));
});

test("auth bootstrap handles signed-out users", async () => {
  const unsubReg = jest.fn();
  const unsubWalk = jest.fn();
  mockOnSnapshot
    .mockImplementationOnce(() => unsubReg)
    .mockImplementationOnce(() => unsubWalk);
  mockGetDocs.mockResolvedValue(snapshotFrom([{ id: "staff", clinicId: 8 }]));
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "Jane Staff" });
    callback(null);
    return jest.fn();
  });

  await load();
  await flushPromises();

  expect(document.querySelector(".name-Surname").textContent).toBe("Staff");
  expect(document.getElementById("upcoming").textContent).toContain("No patients in queue for today");
  expect(mockOnSnapshot).not.toHaveBeenCalled();
});

test("auth bootstrap loads staff clinic and starts queue listeners", async () => {
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "Jane Staff" });
    return jest.fn();
  });
  mockGetDocs.mockResolvedValue(snapshotFrom([{ id: "staff", clinicId: 8 }]));

  await load();
  await flushPromises();

  expect(document.querySelector(".name-Surname").textContent).toBe("Jane Staff");
  expect(document.getElementById("staffEmail").textContent).toBe("staff@test.com");
  expect(document.getElementById("staffAvatar").textContent).toBe("JS");
  expect(mockOnSnapshot).toHaveBeenCalled();
});

test("auth bootstrap shows support message when clinic lookup is missing or fails", async () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ email: "staff@test.com", displayName: "" });
    return jest.fn();
  });
  mockGetDocs.mockRejectedValue(new Error("lookup failed"));

  await load();
  await flushPromises();

  expect(errorSpy).toHaveBeenCalledWith("Failed to fetch staff clinic:", expect.any(Error));
  expect(document.getElementById("upcoming").textContent)
    .toContain("Could not determine your clinic. Please contact support.");
});
