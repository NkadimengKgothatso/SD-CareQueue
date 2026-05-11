// =============================================================
// admin.test.js  –  full coverage for admin.js
// =============================================================

// ── Firebase mock references (declared before any import) ─────
const mockOnAuthStateChanged = jest.fn();
const mockSignOut            = jest.fn(() => Promise.resolve());
const mockGetDocs            = jest.fn();
const mockCollection         = jest.fn(() => "collection-ref");
const mockInitializeApp      = jest.fn(() => ({}));
const mockGetAuth            = jest.fn(() => ({}));
const mockGetFirestore       = jest.fn(() => ({}));

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  () => ({ initializeApp: mockInitializeApp }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth:            mockGetAuth,
    signOut:            mockSignOut,
    onAuthStateChanged: mockOnAuthStateChanged
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore: mockGetFirestore,
    collection:   mockCollection,
    getDocs:      mockGetDocs
  }),
  { virtual: true }
);

// ── DOM factory ───────────────────────────────────────────────
function buildDOM() {
  document.body.innerHTML = `
    <span id="adminName"></span>
    <span id="adminEmail"></span>
    <span id="adminAvatar"></span>
  `;
}

// ── Helpers ───────────────────────────────────────────────────

// Builds the snapshot object that getDocs resolves with.
// 'emails' is an array of email strings stored in each admin doc.
function makeAdminSnapshot(emails) {
  return {
    docs: emails.map((email) => ({ data: () => ({ email }) }))
  };
}

// Simulates onAuthStateChanged calling its callback with a user (or null).
// Returns the promise from initAdminPage() so tests can await it.
function triggerAuth(user) {
  mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(user);
    return jest.fn(); // unsubscribe function
  });
  return import("./admin.js").then((mod) => mod.initAdminPage());
}

// ── Setup / teardown ──────────────────────────────────────────
beforeEach(() => {
  buildDOM();
  jest.resetModules();
  jest.clearAllMocks();

  // Re-apply default mock implementations after clearAllMocks
  mockInitializeApp.mockReturnValue({});
  mockGetAuth.mockReturnValue({});
  mockGetFirestore.mockReturnValue({});
  mockCollection.mockReturnValue("collection-ref");
  mockSignOut.mockResolvedValue();

  // Default: the signed-in user IS an admin
  mockGetDocs.mockResolvedValue(
    makeAdminSnapshot(["admin@test.com"])
  );
});

// =============================================================
// 1. Module initialisation
// =============================================================
test("initialises Firebase app with the project config", async () => {
  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  await import("./admin.js");

  expect(mockInitializeApp).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: "carequeue-284bb"
    })
  );
});

test("exports auth and db", async () => {
  mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  const mod = await import("./admin.js");

  expect(mod.auth).toBeDefined();
  expect(mod.db).toBeDefined();
});

// =============================================================
// 2. initAdminPage — unauthenticated user
// =============================================================
// We can't assert on window.location.href directly in jsdom, but we
// can verify the correct logical outcome: initAdminPage() never
// resolves (it returns early without calling resolve()), and signOut
// is not called (no need to sign out a user who was never signed in).
test("does not resolve and does not call signOut when no user is signed in", async () => {
  mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(null);
    return jest.fn();
  });

  const mod = await import("./admin.js");

  let resolved = false;
  mod.initAdminPage().then(() => { resolved = true; });

  // Flush all pending microtasks
  await Promise.resolve();
  await Promise.resolve();

  expect(resolved).toBe(false);
  expect(mockSignOut).not.toHaveBeenCalled();
});

// =============================================================
// 3. initAdminPage — authenticated but NOT an admin
// =============================================================
test("calls signOut when signed-in user is not an admin", async () => {
  const nonAdminUser = { email: "impostor@test.com", displayName: "Impostor" };

  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));
  mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(nonAdminUser);
    return jest.fn();
  });

  const mod = await import("./admin.js");
  let resolved = false;
  mod.initAdminPage().then(() => { resolved = true; });

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve(); // flush getDocs + signOut chain

  expect(mockSignOut).toHaveBeenCalled();
  expect(resolved).toBe(false); // never resolves for non-admins
});

// =============================================================
// 4. initAdminPage — valid admin
// =============================================================
test("resolves with the user object when the user is a valid admin", async () => {
  const adminUser = { email: "admin@test.com", displayName: "Admin" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));

  const user = await triggerAuth(adminUser);

  expect(user).toBe(adminUser);
});

test("admin check is case-insensitive for email comparison", async () => {
  const adminUser = { email: "Admin@Test.COM", displayName: "Admin" };
  // Stored in Firestore with different casing
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));

  const user = await triggerAuth(adminUser);

  expect(user).toBe(adminUser);
});

test("admin check trims whitespace around stored email", async () => {
  const adminUser = { email: "admin@test.com", displayName: "Admin" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["  admin@test.com  "]));

  const user = await triggerAuth(adminUser);

  expect(user).toBe(adminUser);
});

// =============================================================
// 5. isUserAdmin — getDocs error path
// =============================================================
test("calls signOut when getDocs throws (treats user as non-admin)", async () => {
  mockGetDocs.mockRejectedValue(new Error("Firestore unavailable"));

  const user = { email: "admin@test.com", displayName: "Admin" };
  mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(user);
    return jest.fn();
  });

  const mod = await import("./admin.js");
  let resolved = false;
  mod.initAdminPage().then(() => { resolved = true; });

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve(); // flush rejection + signOut chain

  // getDocs failure → isUserAdmin returns false → signOut called, never resolves
  expect(mockSignOut).toHaveBeenCalled();
  expect(resolved).toBe(false);
});

// =============================================================
// 6. populateSidebar — called for valid admin
// =============================================================
test("populateSidebar sets adminName to displayName", async () => {
  const adminUser = { email: "admin@test.com", displayName: "Dr House" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));

  await triggerAuth(adminUser);

  expect(document.getElementById("adminName").textContent).toBe("Dr House");
});

test("populateSidebar falls back to email prefix when displayName is empty", async () => {
  const adminUser = { email: "admin@test.com", displayName: "" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));

  await triggerAuth(adminUser);

  expect(document.getElementById("adminName").textContent).toBe("admin");
});

test("populateSidebar sets adminEmail", async () => {
  const adminUser = { email: "admin@test.com", displayName: "Admin" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));

  await triggerAuth(adminUser);

  expect(document.getElementById("adminEmail").textContent).toBe("admin@test.com");
});

test("populateSidebar sets avatar to uppercase first letter of displayName", async () => {
  const adminUser = { email: "admin@test.com", displayName: "Grace" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));

  await triggerAuth(adminUser);

  expect(document.getElementById("adminAvatar").textContent).toBe("G");
});

test("populateSidebar falls back to first letter of email for avatar when displayName is empty", async () => {
  const adminUser = { email: "zara@test.com", displayName: "" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["zara@test.com"]));

  await triggerAuth(adminUser);

  expect(document.getElementById("adminAvatar").textContent).toBe("Z");
});

test("populateSidebar does not throw when sidebar elements are absent", async () => {
  // Remove all sidebar elements from the DOM
  document.body.innerHTML = "";

  const adminUser = { email: "admin@test.com", displayName: "Admin" };
  mockGetDocs.mockResolvedValue(makeAdminSnapshot(["admin@test.com"]));

  await expect(triggerAuth(adminUser)).resolves.toBe(adminUser);
});