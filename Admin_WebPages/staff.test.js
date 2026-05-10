// =============================================================
// staff.test.js  –  improved coverage for StaffManagement.js
// =============================================================

// ── Firebase mocks (must be declared before any import) ───────
const mockGetDocs    = jest.fn();
const mockAddDoc     = jest.fn();
const mockDeleteDoc  = jest.fn();
const mockCollection = jest.fn();
const mockDoc        = jest.fn();

jest.mock("/Admin_WebPages/admin.js", () => ({
  initAdminPage: jest.fn(() =>
    Promise.resolve({ email: "admin@test.com" })
  ),
  db: {}
}));

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    collection:      mockCollection,
    getDocs:         mockGetDocs,
    addDoc:          mockAddDoc,
    deleteDoc:       mockDeleteDoc,
    doc:             mockDoc,
    serverTimestamp: jest.fn(() => "TIMESTAMP")
  }),
  { virtual: true }
);

// ── DOM factory ───────────────────────────────────────────────
function buildDOM() {
  document.body.innerHTML = `
    <div id="inviteModal" style="display:none"></div>
    <div id="toast" class="toast"></div>

    <table>
      <tbody id="staffTableBody"></tbody>
    </table>

    <div id="staffCount"></div>

    <input  id="staffName"  value="" />
    <input  id="staffEmail" value="" />

    <select id="staffClinic">
      <option value="">Select</option>
      <option value="1">Clinic A</option>
    </select>
  `;
}

// ── Shared beforeEach ─────────────────────────────────────────
beforeEach(() => {
  buildDOM();
  jest.useFakeTimers();
  jest.resetModules();
  jest.clearAllMocks(); // reset call counts on all mocks between tests

  global.confirm = jest.fn(() => true);
  global.alert   = jest.fn();

  // Default: Firestore calls succeed with empty snapshots
  mockGetDocs.mockResolvedValue(makeSnapshot([]));
  mockAddDoc.mockResolvedValue({ id: "new-doc-id" });
  mockDeleteDoc.mockResolvedValue();
  mockCollection.mockReturnValue("collection-ref");
  mockDoc.mockReturnValue("doc-ref");

  window.staffLogic = {
    buildStaffTableHTML: jest.fn(() => "<tr id='rendered'></tr>"),
    buildClinicOption:   jest.fn((id, name) =>
      name ? { value: id, label: name } : null
    ),
    validateStaffForm:   jest.fn(() => null),        // valid by default
    buildStaffPayload:   jest.fn(() => ({
      displayName: "Test User",
      email:       "test@test.com"
    }))
  };
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Snapshot helper ───────────────────────────────────────────
function makeSnapshot(items) {
  return {
    size: items.length,
    forEach: (cb) =>
      items.forEach((item) =>
        cb({ id: item.id, data: () => item })
      )
  };
}

// ── Load module (reset each time so mocks take effect) ────────
async function load() {
  const mod = await import("./StaffManagement.js");
  // initAdminPage().then() is async — let it settle
  await Promise.resolve();
  await Promise.resolve();
  return mod;
}

// =============================================================
// 1. Modal helpers
// =============================================================
test("openInviteModal shows modal", async () => {
  await load();
  window.openInviteModal();
  expect(document.getElementById("inviteModal").style.display).toBe("flex");
});

test("closeInviteModal hides modal", async () => {
  await load();
  document.getElementById("inviteModal").style.display = "flex";
  window.closeInviteModal();
  expect(document.getElementById("inviteModal").style.display).toBe("none");
});

// =============================================================
// 2. showToast
// =============================================================
test("showToast displays message with type class", async () => {
  const { showToast } = await load();
  showToast("Saved successfully", "success");

  const toast = document.getElementById("toast");
  expect(toast.textContent).toBe("Saved successfully");
  expect(toast.className).toContain("success");
  expect(toast.className).toContain("show");
});

test("showToast resets className after 3 s", async () => {
  const { showToast } = await load();
  showToast("Done", "success");

  jest.advanceTimersByTime(3000);

  expect(document.getElementById("toast").className).toBe("toast");
});

test("showToast does nothing when toast element is absent", async () => {
  const { showToast } = await load();
  document.getElementById("toast").remove();

  // Must not throw
  expect(() => showToast("msg", "error")).not.toThrow();
});

// =============================================================
// 3. loadStaff — called automatically on init
// =============================================================
test("loadStaff populates staffCount and calls buildStaffTableHTML", async () => {
  mockGetDocs.mockResolvedValueOnce(
    makeSnapshot([
      { id: "s1", displayName: "Alice", email: "alice@test.com", clinicName: "Clinic A" },
      { id: "s2", displayName: "Bob",   email: "bob@test.com",   clinicName: "Clinic B" }
    ])
  );

  await load();

  // Wait for the async chain inside initAdminPage().then() to finish
  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("staffCount").textContent).toBe("2");
  expect(window.staffLogic.buildStaffTableHTML).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ id: "s1", displayName: "Alice" }),
      expect.objectContaining({ id: "s2", displayName: "Bob" })
    ])
  );
});

test("loadStaff renders the HTML returned by buildStaffTableHTML", async () => {
  window.staffLogic.buildStaffTableHTML.mockReturnValue(
    "<tr><td>Alice</td></tr>"
  );
  mockGetDocs.mockResolvedValueOnce(
    makeSnapshot([{ id: "s1", displayName: "Alice" }])
  );

  await load();
  await Promise.resolve();
  await Promise.resolve();

  expect(document.getElementById("staffTableBody").innerHTML).toBe(
    "<tr><td>Alice</td></tr>"
  );
});

test("loadStaff shows error toast when getDocs rejects", async () => {
  mockGetDocs.mockRejectedValueOnce(new Error("Firestore down"));

  await load();
  await Promise.resolve();
  await Promise.resolve();

  const toast = document.getElementById("toast");
  expect(toast.textContent).toContain("Failed to load staff");
  expect(toast.className).toContain("error");
});

// =============================================================
// 4. loadClinics — called automatically on init
// =============================================================
test("loadClinics appends options for each valid clinic", async () => {
  // First getDocs call → loadStaff (empty); second → loadClinics
  mockGetDocs
    .mockResolvedValueOnce(makeSnapshot([]))               // loadStaff
    .mockResolvedValueOnce(
      makeSnapshot([
        { id: "c1", name: "Clinic Alpha" },
        { id: "c2", name: "Clinic Beta"  }
      ])
    );                                                     // loadClinics

  await load();
  await Promise.resolve();
  await Promise.resolve();

  const select = document.getElementById("staffClinic");
  // The two clinic options should have been appended (on top of the
  // existing placeholder option already in the DOM)
  expect(select.options.length).toBeGreaterThanOrEqual(2);
  expect(
    Array.from(select.options).map((o) => o.textContent)
  ).toEqual(expect.arrayContaining(["Clinic Alpha", "Clinic Beta"]));
});

test("loadClinics skips clinics where buildClinicOption returns null", async () => {
  window.staffLogic.buildClinicOption.mockReturnValue(null); // all invalid

  mockGetDocs
    .mockResolvedValueOnce(makeSnapshot([]))
    .mockResolvedValueOnce(
      makeSnapshot([{ id: "c1", name: "Bad Clinic" }])
    );

  await load();
  await Promise.resolve();
  await Promise.resolve();

  // No extra options should have been added
  const select = document.getElementById("staffClinic");
  // Only the original placeholder + "Clinic A" from the static DOM
  expect(
    Array.from(select.options).map((o) => o.textContent)
  ).not.toContain("Bad Clinic");
});

// =============================================================
// 5. addStaff — window.addStaff
// =============================================================
test("addStaff saves to Firestore and reloads staff", async () => {
  await load();
  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("staffName").value  = "Jane Doe";
  document.getElementById("staffEmail").value = "jane@test.com";
  document.getElementById("staffClinic").value = "1"; // Clinic A

  mockGetDocs.mockResolvedValue(makeSnapshot([])); // reload after add

  await window.addStaff();

  expect(mockAddDoc).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ addedAt: "TIMESTAMP" })
  );
});

test("addStaff clears form fields after successful save", async () => {
  await load();
  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("staffName").value   = "Jane Doe";
  document.getElementById("staffEmail").value  = "jane@test.com";
  document.getElementById("staffClinic").value = "1";

  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await window.addStaff();

  expect(document.getElementById("staffName").value).toBe("");
  expect(document.getElementById("staffEmail").value).toBe("");
});

test("addStaff closes invite modal after successful save", async () => {
  await load();
  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("inviteModal").style.display = "flex";
  document.getElementById("staffName").value           = "Jane";
  document.getElementById("staffEmail").value          = "j@test.com";
  document.getElementById("staffClinic").value         = "1";

  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await window.addStaff();

  expect(document.getElementById("inviteModal").style.display).toBe("none");
});

test("addStaff shows success toast after saving", async () => {
  await load();
  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("staffName").value   = "Jane";
  document.getElementById("staffEmail").value  = "j@test.com";
  document.getElementById("staffClinic").value = "1";

  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await window.addStaff();

  const toast = document.getElementById("toast");
  expect(toast.textContent).toContain("Staff member added successfully");
  expect(toast.className).toContain("success");
});

test("addStaff shows error toast and returns when validateStaffForm fails", async () => {
  window.staffLogic.validateStaffForm.mockReturnValue("Email is required");

  await load();
  await Promise.resolve();
  await Promise.resolve();

  await window.addStaff();

  expect(mockAddDoc).not.toHaveBeenCalled();

  const toast = document.getElementById("toast");
  expect(toast.textContent).toContain("Email is required");
  expect(toast.className).toContain("error");
});

test("addStaff shows error toast when addDoc rejects", async () => {
  mockAddDoc.mockRejectedValueOnce(new Error("Firestore error"));

  await load();
  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("staffName").value   = "Jane";
  document.getElementById("staffEmail").value  = "j@test.com";
  document.getElementById("staffClinic").value = "1";

  await window.addStaff();

  const toast = document.getElementById("toast");
  expect(toast.textContent).toContain("Failed to add staff member");
  expect(toast.className).toContain("error");
});

test("addStaff passes currentAdmin email to buildStaffPayload", async () => {
  await load();
  await Promise.resolve();
  await Promise.resolve();

  document.getElementById("staffName").value   = "Jane";
  document.getElementById("staffEmail").value  = "j@test.com";
  document.getElementById("staffClinic").value = "1";

  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await window.addStaff();

  expect(window.staffLogic.buildStaffPayload).toHaveBeenCalledWith(
    "Jane", "j@test.com", "Clinic A", 1, "admin@test.com"
  );
});

// =============================================================
// 6. removeStaff — window.removeStaff
// =============================================================
test("removeStaff calls deleteDoc with the correct id", async () => {
  global.confirm = jest.fn(() => true);

  await load();
  await Promise.resolve();
  await Promise.resolve();

  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await window.removeStaff("staff-123");

  expect(mockDeleteDoc).toHaveBeenCalledWith("doc-ref");
  expect(mockDoc).toHaveBeenCalledWith(
    expect.anything(), "ApprovedStaff", "staff-123"
  );
});

test("removeStaff reloads staff after deletion", async () => {
  global.confirm = jest.fn(() => true);

  await load();
  await Promise.resolve();
  await Promise.resolve();

  // Track getDocs calls: first two are from init (loadStaff + loadClinics)
  const callsBefore = mockGetDocs.mock.calls.length;
  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await window.removeStaff("staff-123");

  expect(mockGetDocs.mock.calls.length).toBeGreaterThan(callsBefore);
});

test("removeStaff shows success toast after deletion", async () => {
  global.confirm = jest.fn(() => true);
  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await load();
  await Promise.resolve();
  await Promise.resolve();

  await window.removeStaff("staff-abc");

  const toast = document.getElementById("toast");
  expect(toast.textContent).toContain("Staff member removed");
  expect(toast.className).toContain("success");
});

test("removeStaff does NOT delete when confirm returns false", async () => {
  global.confirm = jest.fn(() => false);

  await load();
  await Promise.resolve();
  await Promise.resolve();

  const callsBefore = mockDeleteDoc.mock.calls.length;

  await window.removeStaff("staff-xyz");

  expect(mockDeleteDoc.mock.calls.length).toBe(callsBefore);
});

test("removeStaff shows error toast when deleteDoc rejects", async () => {
  global.confirm = jest.fn(() => true);
  mockDeleteDoc.mockRejectedValueOnce(new Error("delete failed"));

  await load();
  await Promise.resolve();
  await Promise.resolve();

  await window.removeStaff("staff-bad");

  const toast = document.getElementById("toast");
  expect(toast.textContent).toContain("Failed to remove staff member");
  expect(toast.className).toContain("error");
});