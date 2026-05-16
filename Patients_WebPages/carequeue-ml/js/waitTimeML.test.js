const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockServerTimestamp = jest.fn();

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    collection: mockCollection,
    query: mockQuery,
    where: mockWhere,
    onSnapshot: mockOnSnapshot,
    doc: mockDoc,
    updateDoc: mockUpdateDoc,
    addDoc: mockAddDoc,
    serverTimestamp: mockServerTimestamp
  }),
  { virtual: true }
);

global.fetch = jest.fn();

function queueDoc(id, data) {
  return {
    id,
    data: jest.fn(() => data)
  };
}

function snapshot(docs) {
  return { docs: docs.map(({ id, ...data }) => queueDoc(id, data)) };
}

function captureSnapshotCallbacks() {
  const callbacks = [];
  const unsubs = [];

  mockOnSnapshot.mockImplementation((_queryRef, callback) => {
    callbacks.push(callback);
    const unsubscribe = jest.fn();
    unsubs.push(unsubscribe);
    return unsubscribe;
  });

  return { callbacks, unsubs };
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  fetch.mockReset();

  mockCollection.mockImplementation((_db, name) => ({ type: "collection", name }));
  mockWhere.mockImplementation((field, op, value) => ({ type: "where", field, op, value }));
  mockQuery.mockImplementation((...parts) => ({ type: "query", parts }));
  mockDoc.mockImplementation((_db, collectionName, id) => ({ collectionName, id }));
  mockUpdateDoc.mockResolvedValue(undefined);
  mockAddDoc.mockResolvedValue(undefined);
  mockServerTimestamp.mockReturnValue("TIMESTAMP");
  mockOnSnapshot.mockReturnValue(jest.fn());

  document.body.innerHTML = `
    <section id="queueCount"></section>
    <section id="queueProgressText"></section>
    <section id="progressPercent"></section>
    <section id="queuePosition"></section>
    <section id="waitTime"></section>
    <progress id="queueMeter" max="100"></progress>
  `;
});

test("getWaitTime posts normalized queue data to the prediction endpoint", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({
    clinicID: "7",
    queuePosition: "2",
    queueLength: "5",
    isWalkIn: true
  });

  const [url, options] = fetch.mock.calls[0];
  const body = JSON.parse(options.body);

  expect(url).toContain("/predict");
  expect(options.method).toBe("POST");
  expect(options.headers).toEqual({ "Content-Type": "application/json" });
  expect(body).toEqual({
    clinicID: 7,
    queuePosition: 2,
    queueLength: 5,
    isWalkIn: true
  });
});

test("getWaitTime returns the estimatedWaitTime on success", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 15 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5,
    isWalkIn: false
  });

  expect(result).toBe(15);
});

test("getWaitTime sends isWalkIn as true when true", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3, isWalkIn: true });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(true);
});

test("getWaitTime sends isWalkIn as false when false", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3, isWalkIn: false });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(false);
});

test("getWaitTime defaults missing isWalkIn to false", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3 });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(false);
});

test("getWaitTime returns null when estimatedWaitTime is absent", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({})
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 1 });

  expect(result).toBeNull();
});

test("getWaitTime returns null when response is not ok", async () => {
  fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: "bad request" })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5
  });

  expect(result).toBeNull();
});

test("getWaitTime returns null on network error", async () => {
  fetch.mockRejectedValue(new Error("network"));

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5
  });

  expect(result).toBeNull();
});

test("getWaitTime returns null on timeout", async () => {
  fetch.mockRejectedValue(new Error("timeout"));

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 1 });

  expect(result).toBeNull();
});

test("queue meter element exists in DOM", () => {
  expect(document.getElementById("queueMeter")).not.toBeNull();
});

test("loadQueueStatusML clears queue display when the appointment has no active queue entry", async () => {
  const { callbacks } = captureSnapshotCallbacks();
  const { loadQueueStatusML } = await import("./waitTimeML.js");

  document.getElementById("queueCount").textContent = "old";
  document.getElementById("queueProgressText").textContent = "old";
  document.getElementById("progressPercent").textContent = "old";
  document.getElementById("queuePosition").textContent = "old";
  document.getElementById("waitTime").textContent = "old";
  document.getElementById("queueMeter").value = 75;

  loadQueueStatusML("user-1", "appt-1", 7, {});
  callbacks[0](snapshot([{ id: "queue-1", appointmentId: "appt-1", status: "completed" }]));

  expect(document.getElementById("queueCount").textContent).toBe("");
  expect(document.getElementById("queueProgressText").textContent).toBe("");
  expect(document.getElementById("progressPercent").textContent).toBe("");
  expect(document.getElementById("queuePosition").textContent).toBe("");
  expect(document.getElementById("waitTime").textContent).toBe("");
  expect(document.getElementById("queueMeter").value).toBe(0);
  expect(callbacks).toHaveLength(1);
});

test("loadQueueStatusML updates queue position, ML wait time, and estimateWait", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 24 })
  });
  const { callbacks, unsubs } = captureSnapshotCallbacks();
  const db = { name: "db" };
  const { loadQueueStatusML } = await import("./waitTimeML.js");

  const cleanup = loadQueueStatusML("user-1", "appt-1", 7, db);
  callbacks[0](snapshot([
    { id: "outer-queue", appointmentId: "appt-1", status: " waiting ", reason: "Checkup" }
  ]));

  await callbacks[1](snapshot([
    { id: "other", appointmentId: "appt-2", clinicID: 7, status: "active", position: 2 },
    { id: "mine", appointmentId: "appt-1", clinicID: 7, status: "scheduled", position: 1, isWalkIn: true }
  ]));

  expect(document.getElementById("queueCount").textContent).toBe("1 out of 2");
  expect(document.getElementById("queuePosition").textContent).toBe("1");
  expect(document.getElementById("progressPercent").textContent).toBe("100%");
  expect(document.getElementById("queueMeter").value).toBe(100);
  expect(document.getElementById("waitTime").textContent).toBe("24 min");

  const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
  expect(requestBody).toEqual({
    clinicID: 7,
    queuePosition: 1,
    queueLength: 2,
    isWalkIn: true
  });
  expect(mockDoc).toHaveBeenCalledWith(db, "Queues", "outer-queue");
  expect(mockUpdateDoc).toHaveBeenCalledWith(
    { collectionName: "Queues", id: "outer-queue" },
    { estimateWait: 24 }
  );

  cleanup();
  expect(unsubs[0]).toHaveBeenCalled();
  expect(unsubs[1]).toHaveBeenCalled();
});

test("loadQueueStatusML uses formula fallback when prediction is missing and reports update failures", async () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({})
  });
  mockUpdateDoc.mockRejectedValueOnce(new Error("write failed"));
  const { callbacks } = captureSnapshotCallbacks();
  const { loadQueueStatusML } = await import("./waitTimeML.js");

  loadQueueStatusML("user-1", "appt-1", 7, {});
  callbacks[0](snapshot([
    { id: "outer-queue", appointmentId: "appt-1", status: "waiting" }
  ]));

  await callbacks[1](snapshot([
    { id: "first", appointmentId: "appt-2", clinicID: 7, status: "waiting", position: 1 },
    { id: "mine", appointmentId: "appt-1", clinicID: 7, status: "waiting", position: 2 }
  ]));

  expect(document.getElementById("queueCount").textContent).toBe("2 out of 2");
  expect(document.getElementById("progressPercent").textContent).toBe("0%");
  expect(document.getElementById("waitTime").textContent).toBe("28 min");
  expect(warnSpy).toHaveBeenCalledWith(
    "Could not update estimateWait:",
    expect.any(Error)
  );

  warnSpy.mockRestore();
});

test("loadQueueStatusML handles a single-person queue", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 8 })
  });
  const { callbacks } = captureSnapshotCallbacks();
  const { loadQueueStatusML } = await import("./waitTimeML.js");

  loadQueueStatusML("user-1", "appt-1", 7, {});
  callbacks[0](snapshot([
    { id: "outer-queue", appointmentId: "appt-1", status: "active" }
  ]));

  await callbacks[1](snapshot([
    { id: "mine", appointmentId: "appt-1", clinicID: 7, status: "active", position: 1 }
  ]));

  expect(document.getElementById("queueCount").textContent).toBe("1 out of 1");
  expect(document.getElementById("progressPercent").textContent).toBe("100%");
  expect(document.getElementById("queueMeter").value).toBe(100);
  expect(document.getElementById("waitTime").textContent).toBe("8 min");
});

test("loadQueueStatusML can use the string clinicID fallback path", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 12 })
  });
  const { callbacks } = captureSnapshotCallbacks();
  const { loadQueueStatusML } = await import("./waitTimeML.js");

  loadQueueStatusML("user-1", "appt-1", 7, {});
  callbacks[0](snapshot([
    { id: "outer-queue", appointmentId: "appt-1", status: "waiting" }
  ]));

  const otherDoc = {
    id: "other",
    data: jest.fn()
      .mockReturnValueOnce({ appointmentId: "appt-2", clinicID: "7", status: "completed", position: 2 })
      .mockReturnValueOnce({ appointmentId: "appt-2", clinicID: "7", status: "waiting", position: 2 })
  };
  const myDoc = {
    id: "mine",
    data: jest.fn()
      .mockReturnValueOnce({ appointmentId: "appt-1", clinicID: "7", status: "completed", position: 1 })
      .mockReturnValueOnce({ appointmentId: "appt-1", clinicID: "7", status: "waiting", position: 1 })
  };

  await callbacks[1]({ docs: [otherDoc, myDoc] });

  expect(document.getElementById("queueCount").textContent).toBe("1 out of 2");
  expect(document.getElementById("progressPercent").textContent).toBe("100%");
  expect(document.getElementById("waitTime").textContent).toBe("12 min");
});

test("loadQueueStatusML clears display when the current appointment is missing from the clinic queue", async () => {
  const { callbacks } = captureSnapshotCallbacks();
  const { loadQueueStatusML } = await import("./waitTimeML.js");

  document.getElementById("queueCount").textContent = "old";
  document.getElementById("waitTime").textContent = "old";
  document.getElementById("queueMeter").value = 60;

  loadQueueStatusML("user-1", "appt-1", 7, {});
  callbacks[0](snapshot([
    { id: "outer-queue", appointmentId: "appt-1", status: "waiting" }
  ]));

  await callbacks[1](snapshot([
    { id: "someone-else", appointmentId: "appt-2", clinicID: 7, status: "waiting", position: 1 }
  ]));

  expect(document.getElementById("queueCount").textContent).toBe("");
  expect(document.getElementById("waitTime").textContent).toBe("");
  expect(document.getElementById("queueMeter").value).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
  expect(mockUpdateDoc).not.toHaveBeenCalled();
});

test("loadQueueStatusML ignores stale ML responses from older queue snapshots", async () => {
  let resolveFirstPrediction;
  fetch
    .mockImplementationOnce(() => new Promise((resolve) => {
      resolveFirstPrediction = resolve;
    }))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ estimatedWaitTime: 5 })
    });
  const { callbacks } = captureSnapshotCallbacks();
  const { loadQueueStatusML } = await import("./waitTimeML.js");

  loadQueueStatusML("user-1", "appt-1", 7, {});
  callbacks[0](snapshot([
    { id: "outer-queue", appointmentId: "appt-1", status: "waiting" }
  ]));

  const stalePromise = callbacks[1](snapshot([
    { id: "mine", appointmentId: "appt-1", clinicID: 7, status: "waiting", position: 1 }
  ]));
  const latestPromise = callbacks[1](snapshot([
    { id: "mine", appointmentId: "appt-1", clinicID: 7, status: "waiting", position: 1 }
  ]));

  await latestPromise;
  expect(document.getElementById("waitTime").textContent).toBe("5 min");

  resolveFirstPrediction({
    ok: true,
    json: async () => ({ estimatedWaitTime: 99 })
  });
  await stalePromise;

  expect(document.getElementById("waitTime").textContent).toBe("5 min");
});
