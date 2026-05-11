// =============================================================
// dashboard.test.js
// =============================================================

// ── Mock waitTimeML (imported by PatientDashboard.js) ─────────
jest.mock(
  "./js/waitTimeML.js",
  () => ({
    loadQueueStatusML: jest.fn(() => jest.fn()),  // returns a cleanup fn
    warmUpAPI:         jest.fn()
  }),
  { virtual: true }
);

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
    onAuthStateChanged: jest.fn()
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore:    jest.fn(() => ({})),
    collection:      jest.fn(),
    doc:             jest.fn(),
    getDoc:          jest.fn(() => Promise.resolve({ exists: () => false })),
    getDocs:         jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
    addDoc:          jest.fn(() => Promise.resolve()),
    query:           jest.fn(),
    where:           jest.fn(),
    orderBy:         jest.fn(),
    onSnapshot:      jest.fn(() => jest.fn()),
    serverTimestamp: jest.fn()
  }),
  { virtual: true }
);

// ── DOM ───────────────────────────────────────────────────────
// Build DOM first, then import — so module-level code that queries
// the DOM (nav active-link logic) doesn't throw on null elements.
beforeEach(() => {
  jest.resetModules();

  document.body.innerHTML = `
    <div id="emptyStates"></div>
    <div id="filledStates"></div>
    <div id="patientAvatar"></div>

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
          <li><a href="PatientDashboard.html"></a></li>
        </ul>
      </nav>
    </aside>
  `;
});

// Helper: import the module and wire up the dashboard elements.
// DOMContentLoaded never fires in Jest, so __setDashboardElementsForTest
// does the same job — pointing emptyStates/filledStates at the current DOM.
async function loadModule() {
  const mod = await import("./PatientDashboard.js");
  mod.__setDashboardElementsForTest();
  return mod;
}

// =============================================================
// setAvatarInitial
// =============================================================
test("setAvatarInitial uses initials from full name", async () => {
  const { setAvatarInitial } = await loadModule();

  setAvatarInitial("John Doe", "john@test.com");

  expect(document.getElementById("patientAvatar").textContent).toBe("JD");
});

test("setAvatarInitial falls back to first letter of email when name is empty", async () => {
  const { setAvatarInitial } = await loadModule();

  setAvatarInitial("", "john@test.com");

  expect(document.getElementById("patientAvatar").textContent).toBe("J");
});

test("setAvatarInitial handles single-word name", async () => {
  const { setAvatarInitial } = await loadModule();

  setAvatarInitial("Alice", "alice@test.com");

  expect(document.getElementById("patientAvatar").textContent).toBe("A");
});

// =============================================================
// showEmpty / showFilled
// =============================================================
test("showEmpty displays empty state and hides filled state", async () => {
  const { showEmpty } = await loadModule();

  document.getElementById("emptyStates").style.display  = "none";
  document.getElementById("filledStates").style.display = "block";

  showEmpty();

  expect(document.getElementById("emptyStates").style.display).toBe("block");
  expect(document.getElementById("filledStates").style.display).toBe("none");
});

test("showFilled displays filled state and hides empty state", async () => {
  const { showFilled } = await loadModule();

  document.getElementById("emptyStates").style.display  = "block";
  document.getElementById("filledStates").style.display = "none";

  showFilled();

  expect(document.getElementById("emptyStates").style.display).toBe("none");
  expect(document.getElementById("filledStates").style.display).toBe("block");
});

// =============================================================
// DOM sanity
// =============================================================
test("queue meter element exists", () => {
  expect(document.getElementById("queueMeter")).not.toBeNull();
});