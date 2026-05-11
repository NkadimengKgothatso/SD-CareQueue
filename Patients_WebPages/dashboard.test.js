const mockInitializeApp = jest.fn(() => ({}));
const mockAuth = {};
const mockDb = {};
const mockGetAuth = jest.fn(() => mockAuth);
const mockFirebaseSignOut = jest.fn(() => Promise.resolve());
const mockOnAuthStateChanged = jest.fn();

const mockGetFirestore = jest.fn(() => mockDb);
const mockDoc = jest.fn((_db, collectionName, id) => ({ collectionName, id }));
const mockCollection = jest.fn((_db, collectionName) => ({ collectionName }));
const mockWhere = jest.fn((field, op, value) => ({ field, op, value }));
const mockQuery = jest.fn((collectionRef, ...constraints) => ({
  collectionName: collectionRef.collectionName,
  constraints
}));
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockOnSnapshot = jest.fn(() => jest.fn());
const mockAddDoc = jest.fn(() => Promise.resolve());
const mockServerTimestamp = jest.fn(() => new Date("2026-05-11T12:00:00.000Z"));

const mockLoadQueueStatusML = jest.fn();
let mockQueueCleanup;

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  () => ({ initializeApp: mockInitializeApp }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth: mockGetAuth,
    signOut: mockFirebaseSignOut,
    onAuthStateChanged: mockOnAuthStateChanged
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore: mockGetFirestore,
    doc: mockDoc,
    getDoc: mockGetDoc,
    collection: mockCollection,
    query: mockQuery,
    where: mockWhere,
    getDocs: mockGetDocs,
    onSnapshot: mockOnSnapshot,
    addDoc: mockAddDoc,
    serverTimestamp: mockServerTimestamp
  }),
  { virtual: true }
);

jest.mock("./carequeue-ml/js/waitTimeML.js", () => ({
  loadQueueStatusML: mockLoadQueueStatusML
}));

function buildDOM() {
  document.body.innerHTML = `
    <div id="userName"></div>
    <div id="userRole"></div>
    <div id="welcomeMessage"></div>
    <div id="currentDate"></div>
    <div id="userEmail"></div>
    <div id="patientAvatar"></div>

    <div id="emptyStates"></div>
    <div id="filledStates"></div>
    <ul id="appointmentsContainer"></ul>

    <div id="queueCount"></div>
    <div id="queueProgressText"></div>
    <div id="progressPercent"></div>
    <progress id="queueMeter"></progress>
    <div id="queuePosition"></div>
    <div id="waitTime"></div>
    <div id="visitsCount"></div>

    <aside>
      <nav>
        <ul>
          <li><a id="dashboardLink" href="PatientDashboard.html"></a></li>
          <li><a id="appointmentsLink" href="MyAppointments.html"></a></li>
        </ul>
      </nav>
    </aside>
  `;
}

function snapshotFrom(records = []) {
  const docs = records.map((record, index) => {
    const { __docId, ...data } = record;

    return {
      id: __docId || record.id || `doc-${index}`,
      data: () => data
    };
  });

  return {
    empty: docs.length === 0,
    docs,
    forEach: (callback) => docs.forEach(callback)
  };
}

function userSnapshot(data, exists = true) {
  return {
    exists: () => exists,
    data: () => data
  };
}

function hasConstraint(ref, field) {
  return ref.constraints?.some((constraint) => constraint.field === field);
}

function arrangeFirestore({
  appointments = [],
  clinics = [],
  visits = appointments,
  rejectAppointments,
  rejectClinics,
  rejectVisits
} = {}) {
  mockGetDocs.mockImplementation((ref) => {
    if (ref.collectionName === "clinicsObjects") {
      return rejectClinics
        ? Promise.reject(rejectClinics)
        : Promise.resolve(snapshotFrom(clinics));
    }

    if (ref.collectionName === "Appointments") {
      if (hasConstraint(ref, "clinicID")) {
        return rejectVisits
          ? Promise.reject(rejectVisits)
          : Promise.resolve(snapshotFrom(visits));
      }

      return rejectAppointments
        ? Promise.reject(rejectAppointments)
        : Promise.resolve(snapshotFrom(appointments));
    }

    return Promise.resolve(snapshotFrom([]));
  });
}

function arrangeSignedInUser(user = { uid: "patient-1", email: "jane@example.com" }) {
  let authCallback;

  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    authCallback = callback;
    callback(user);
    return jest.fn();
  });

  return () => authCallback;
}

async function flushPromises(times = 12) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

let domContentLoadedHandler;
let originalAddEventListener;

async function loadModule({ runDomReady = true } = {}) {
  const mod = await import("./PatientDashboard.js");

  if (runDomReady) {
    domContentLoadedHandler();
    await flushPromises();
  }

  return mod;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-05-11T12:00:00.000Z"));

  buildDOM();
  window.history.pushState({}, "", "/Patients_WebPages/PatientDashboard.html");
  delete window.signOut;
  delete window.goToAppointments;

  domContentLoadedHandler = undefined;
  originalAddEventListener = window.addEventListener;
  jest.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (type === "DOMContentLoaded") {
      domContentLoadedHandler = listener;
      return undefined;
    }

    return originalAddEventListener.call(window, type, listener, options);
  });
  jest.spyOn(console, "log").mockImplementation(() => {});

  mockQueueCleanup = jest.fn();
  mockLoadQueueStatusML.mockReturnValue(mockQueueCleanup);
  mockGetDoc.mockResolvedValue(userSnapshot({ displayName: "Jane Doe", role: "Patient" }));
  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  arrangeFirestore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("marks the current dashboard nav link active on import", async () => {
  await loadModule({ runDomReady: false });

  expect(document.getElementById("dashboardLink").classList.contains("active")).toBe(true);
  expect(document.getElementById("appointmentsLink").classList.contains("active")).toBe(false);
});

test("showEmpty displays empty state and hides filled state", async () => {
  const { showEmpty } = await loadModule();

  document.getElementById("emptyStates").style.display = "none";
  document.getElementById("filledStates").style.display = "block";

  showEmpty();

  expect(document.getElementById("emptyStates").style.display).toBe("block");
  expect(document.getElementById("filledStates").style.display).toBe("none");
});

test("showFilled displays filled state and hides empty state", async () => {
  const { showFilled } = await loadModule();

  document.getElementById("emptyStates").style.display = "block";
  document.getElementById("filledStates").style.display = "none";

  showFilled();

  expect(document.getElementById("emptyStates").style.display).toBe("none");
  expect(document.getElementById("filledStates").style.display).toBe("block");
});

test("setAvatarInitial uses initials from a full name", async () => {
  const { setAvatarInitial } = await loadModule({ runDomReady: false });

  setAvatarInitial("John Doe", "john@test.com");

  expect(document.getElementById("patientAvatar").textContent).toBe("JD");
});

test("setAvatarInitial handles single-word names, email fallback, and empty values", async () => {
  const { setAvatarInitial } = await loadModule({ runDomReady: false });

  setAvatarInitial("Alice", "alice@test.com");
  expect(document.getElementById("patientAvatar").textContent).toBe("A");

  setAvatarInitial("", "john@test.com");
  expect(document.getElementById("patientAvatar").textContent).toBe("J");

  setAvatarInitial("", "");
  expect(document.getElementById("patientAvatar").textContent).toBe("");
});

test("initializes a signed-in patient and renders the next upcoming appointment", async () => {
  arrangeSignedInUser();
  arrangeFirestore({
    appointments: [
      { id: "cancelled", clinicID: 7, status: "cancelled", date: "2026-05-12", time: "08:00" },
      { id: "later", clinicID: 7, status: "scheduled", date: "2026-05-13", time: "10:00" },
      { id: "next", clinicID: 7, status: "scheduled", date: "2026-05-12", time: "09:00", reason: "Checkup" },
      { id: "past", clinicID: 7, status: "scheduled", date: "2026-05-01", time: "09:00" }
    ],
    clinics: [{ id: 7, name: "Downtown Clinic" }],
    visits: [
      { id: "v1", status: "completed" },
      { id: "v2", status: "cancelled" },
      { id: "v3", status: "scheduled" }
    ]
  });

  await loadModule();

  expect(document.getElementById("userName").textContent).toBe("Jane Doe");
  expect(document.getElementById("userRole").textContent).toBe("Patient");
  expect(document.getElementById("welcomeMessage").textContent).toBe("Welcome, Jane Doe");
  expect(document.getElementById("userEmail").textContent).toBe("jane@example.com");
  expect(document.getElementById("patientAvatar").textContent).toBe("JD");
  expect(document.getElementById("currentDate").textContent).toContain("2026");
  expect(document.getElementById("filledStates").style.display).toBe("block");
  expect(document.getElementById("emptyStates").style.display).toBe("none");
  expect(document.querySelector(".clinic-name").textContent).toBe("Downtown Clinic");
  expect(document.getElementById("appointmentsContainer").textContent).toContain("2026-05-12");
  expect(document.getElementById("appointmentsContainer").textContent).toContain("09:00");
  expect(document.getElementById("appointmentsContainer").textContent).toContain("Checkup");
  expect(document.getElementById("visitsCount").textContent).toBe("2");
  expect(mockLoadQueueStatusML).toHaveBeenCalledWith(
    "patient-1",
    "next",
    7,
    mockDb,
    "Downtown Clinic",
    "Jane Doe",
    "jane@example.com"
  );
});

test("uses fallback patient labels when the user document omits profile fields", async () => {
  arrangeSignedInUser({ uid: "patient-2", email: "fallback@example.com" });
  mockGetDoc.mockResolvedValue(userSnapshot({}));
  arrangeFirestore({ appointments: [] });

  await loadModule();

  expect(document.getElementById("userName").textContent).toBe("User");
  expect(document.getElementById("userRole").textContent).toBe("Unknown");
  expect(document.getElementById("welcomeMessage").textContent).toBe("Welcome, User");
  expect(document.getElementById("patientAvatar").textContent).toBe("F");
  expect(document.getElementById("emptyStates").style.display).toBe("block");
});

test("still loads appointments when the user document does not exist", async () => {
  arrangeSignedInUser({ uid: "patient-3", email: "missing@example.com" });
  mockGetDoc.mockResolvedValue(userSnapshot({}, false));
  arrangeFirestore({ appointments: [] });

  await loadModule();

  expect(mockGetDocs).toHaveBeenCalled();
  expect(document.getElementById("emptyStates").style.display).toBe("block");
});

test("redirects unauthenticated users before loading profile data", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});

  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(null);
    return jest.fn();
  });

  await loadModule();

  expect(mockGetDoc).not.toHaveBeenCalled();
  expect(mockGetDocs).not.toHaveBeenCalled();
});

test("shows empty state when all appointments are past, cancelled, or completed", async () => {
  arrangeSignedInUser();
  arrangeFirestore({
    appointments: [
      { id: "past", clinicID: "doc-clinic", status: "scheduled", date: "2026-05-01" },
      { id: "done", clinicID: "doc-clinic", status: " completed ", date: "2026-05-12" },
      { id: "cancelled", clinicID: "doc-clinic", status: "CANCELLED", date: "2026-05-13" }
    ],
    clinics: [{ __docId: "doc-clinic", name: "Doc Id Clinic" }]
  });

  await loadModule();

  expect(document.getElementById("emptyStates").style.display).toBe("block");
  expect(document.getElementById("filledStates").style.display).toBe("none");
  expect(mockLoadQueueStatusML).not.toHaveBeenCalled();
});

test("renders appointment fallbacks for unknown clinics and missing appointment fields", async () => {
  arrangeSignedInUser({ uid: "patient-4" });
  mockGetDoc.mockResolvedValue(userSnapshot({ displayName: "", role: "" }));
  arrangeFirestore({
    appointments: [
      { id: "fallback", clinicID: 404, date: "2026-05-15" },
      { id: "later", clinicID: 404, date: "2026-05-16" }
    ],
    clinics: [],
    visits: [{ id: "v1", status: "" }]
  });

  await loadModule();

  const cardText = document.getElementById("appointmentsContainer").textContent;

  expect(document.querySelector(".clinic-name").textContent).toBe("Unknown Clinic");
  expect(cardText).toContain("General Appointment");
  expect(cardText).toContain("Scheduled");
  expect(document.querySelector(".status-badge").classList.contains("scheduled")).toBe(true);
  expect(mockLoadQueueStatusML).toHaveBeenCalledWith(
    "patient-4",
    "fallback",
    404,
    mockDb,
    "Unknown Clinic",
    "",
    ""
  );
});

test("replaces an existing queue listener when appointments reload", async () => {
  const getAuthCallback = arrangeSignedInUser();
  arrangeFirestore({
    appointments: [{ id: "next", clinicID: 7, status: "scheduled", date: "2026-05-12" }],
    clinics: [{ id: 7, name: "Downtown Clinic" }]
  });

  await loadModule();
  await getAuthCallback()({ uid: "patient-1", email: "jane@example.com" });
  await flushPromises();

  expect(mockQueueCleanup).toHaveBeenCalledTimes(1);
  expect(mockLoadQueueStatusML).toHaveBeenCalledTimes(2);
});

test("shows empty state and logs when loading appointments fails", async () => {
  const error = new Error("appointments unavailable");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeSignedInUser();
  arrangeFirestore({ rejectAppointments: error });

  await loadModule();

  expect(consoleSpy).toHaveBeenCalledWith("Firestore error:", error);
  expect(document.getElementById("emptyStates").style.display).toBe("block");
});

test("continues with an unknown clinic when clinic loading fails", async () => {
  const error = new Error("clinics unavailable");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeSignedInUser();
  arrangeFirestore({
    appointments: [{ id: "next", clinicID: 7, status: "scheduled", date: "2026-05-12" }],
    rejectClinics: error
  });

  await loadModule();

  expect(consoleSpy).toHaveBeenCalledWith("Failed to load clinics:", error);
  expect(document.querySelector(".clinic-name").textContent).toBe("Unknown Clinic");
  expect(document.getElementById("filledStates").style.display).toBe("block");
});

test("logs auth initialization errors", async () => {
  const error = new Error("profile unavailable");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeSignedInUser();
  mockGetDoc.mockRejectedValue(error);

  await loadModule();

  expect(consoleSpy).toHaveBeenCalledWith("Auth error:", error);
});

test("loadVisitsCount counts non-cancelled visits and converts clinic id to number", async () => {
  arrangeFirestore({
    visits: [
      { id: "v1", status: "completed" },
      { id: "v2", status: "cancelled" },
      { id: "v3", status: "" }
    ]
  });

  const { loadVisitsCount } = await loadModule({ runDomReady: false });

  await loadVisitsCount("patient-1", "7");

  expect(mockWhere).toHaveBeenCalledWith("clinicID", "==", 7);
  expect(document.getElementById("visitsCount").textContent).toBe("2");
});

test("loadVisitsCount logs Firestore errors", async () => {
  const error = new Error("visits unavailable");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeFirestore({ rejectVisits: error });

  const { loadVisitsCount } = await loadModule({ runDomReady: false });

  await loadVisitsCount("patient-1", "7");

  expect(consoleSpy).toHaveBeenCalledWith("Visits count error:", error);
});

test("signOut clears an active queue subscription and signs out through Firebase", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeSignedInUser();
  arrangeFirestore({
    appointments: [{ id: "next", clinicID: 7, status: "scheduled", date: "2026-05-12" }],
    clinics: [{ id: 7, name: "Downtown Clinic" }]
  });

  await loadModule();
  await window.signOut();

  expect(mockQueueCleanup).toHaveBeenCalledTimes(1);
  expect(mockFirebaseSignOut).toHaveBeenCalledWith(mockAuth);
});

test("signOut works when no queue subscription exists", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  await loadModule({ runDomReady: false });

  await window.signOut();

  expect(mockQueueCleanup).not.toHaveBeenCalled();
  expect(mockFirebaseSignOut).toHaveBeenCalledWith(mockAuth);
});

test("goToAppointments is exposed as a global navigation helper", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  await loadModule({ runDomReady: false });

  expect(() => window.goToAppointments()).not.toThrow();
});
