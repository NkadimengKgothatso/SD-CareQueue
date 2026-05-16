const mockInitAdminPage = jest.fn();
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockCollection = jest.fn((_db, name) => name);
const mockDoc = jest.fn((_db, collectionName, id) => `${collectionName}/${id}`);
const mockServerTimestamp = jest.fn(() => "TIMESTAMP");

jest.mock(
  "/Admin_WebPages/admin.js",
  () => ({
    initAdminPage: mockInitAdminPage,
    db: {}
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    collection: mockCollection,
    getDocs: mockGetDocs,
    addDoc: mockAddDoc,
    deleteDoc: mockDeleteDoc,
    doc: mockDoc,
    serverTimestamp: mockServerTimestamp
  }),
  { virtual: true }
);

function buildDOM() {
  document.body.innerHTML = `
    <section id="inviteModal" style="display:none"></section>
    <section id="toast" class="toast"></section>

    <table>
      <tbody id="staffTableBody"></tbody>
    </table>

    <section id="staffCount"></section>

    <input id="staffName" value="" />
    <input id="staffEmail" value="" />

    <select id="staffClinic">
      <option value="">Select</option>
      <option value="1">Clinic A</option>
    </select>
  `;
}

function makeSnapshot(items = []) {
  const docs = items.map((item, index) => {
    const { __docId, ...data } = item;

    return {
      id: __docId || item.id || `doc-${index}`,
      data: () => data
    };
  });

  return {
    size: docs.length,
    forEach: (callback) => docs.forEach(callback)
  };
}

async function flushPromises(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

async function load() {
  const mod = await import("./StaffManagement.js");
  await flushPromises();
  return mod;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useFakeTimers();
  buildDOM();

  mockInitAdminPage.mockResolvedValue({ email: "admin@test.com" });
  mockGetDocs.mockResolvedValue(makeSnapshot([]));
  mockAddDoc.mockResolvedValue({ id: "new-staff" });
  mockDeleteDoc.mockResolvedValue();
  global.confirm = jest.fn(() => true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("buildStaffTableHTML renders an empty row when no staff exist", async () => {
  const { buildStaffTableHTML } = await load();

  const html = buildStaffTableHTML([]);

  expect(html).toContain("No staff members found");
  expect(html).toContain('colspan="4"');
});

test("buildStaffTableHTML renders staff rows with fallbacks and remove handlers", async () => {
  const { buildStaffTableHTML } = await load();

  const html = buildStaffTableHTML([
    { id: "s1", name: "Alice", email: "alice@test.com", clinicName: "Clinic A" },
    { id: "s2" }
  ]);

  expect(html).toContain("Alice");
  expect(html).toContain("alice@test.com");
  expect(html).toContain("Clinic A");
  expect(html).toContain("removeStaff('s1')");
  expect(html).toContain("Unassigned");
  expect(html).toContain("<td>-</td>");
});

test("buildClinicOption returns null for blank names and an option model for valid names", async () => {
  const { buildClinicOption } = await load();

  expect(buildClinicOption("")).toBeNull();
  expect(buildClinicOption("Clinic A")).toEqual({
    value: "Clinic A",
    label: "Clinic A"
  });
});

test("validateStaffForm reports missing fields, invalid emails, and accepts valid input", async () => {
  const { validateStaffForm } = await load();

  expect(validateStaffForm("", "staff@test.com", "1")).toBe("Please fill in all fields");
  expect(validateStaffForm("Staff", "not-an-email", "1")).toBe("Please enter a valid email address");
  expect(validateStaffForm("Staff", "staff@test.com", "1")).toBeNull();
});

test("buildStaffPayload normalizes email and includes clinic/admin metadata", async () => {
  const { buildStaffPayload } = await load();

  expect(buildStaffPayload("Jane", "JANE@TEST.COM", "Clinic A", "1", "admin@test.com")).toEqual({
    name: "Jane",
    email: "jane@test.com",
    clinicName: "Clinic A",
    clinicId: "1",
    addedBy: "admin@test.com"
  });
});

test("init loads staff and clinics", async () => {
  mockGetDocs
    .mockResolvedValueOnce(makeSnapshot([
      { __docId: "s1", name: "Alice", email: "alice@test.com", clinicName: "Clinic A" },
      { __docId: "s2", name: "Bob", email: "bob@test.com", clinicName: "Clinic B" }
    ]))
    .mockResolvedValueOnce(makeSnapshot([
      { __docId: "c1", name: "Clinic Alpha" },
      { __docId: "c2", name: "Clinic Beta" }
    ]));

  await load();

  expect(mockInitAdminPage).toHaveBeenCalledTimes(1);
  expect(mockCollection).toHaveBeenCalledWith({}, "ApprovedStaff");
  expect(mockCollection).toHaveBeenCalledWith({}, "clinicsObjects");
  expect(document.getElementById("staffCount").textContent).toBe("2");
  expect(document.getElementById("staffTableBody").textContent).toContain("Alice");
  expect(document.getElementById("staffTableBody").textContent).toContain("Bob");

  const clinicOptions = Array.from(document.getElementById("staffClinic").options).map((option) => ({
    value: option.value,
    text: option.textContent
  }));
  expect(clinicOptions).toEqual(expect.arrayContaining([
    { value: "c1", text: "Clinic Alpha" },
    { value: "c2", text: "Clinic Beta" }
  ]));
});

test("loadStaff renders the empty-state row for an empty snapshot", async () => {
  const { loadStaff } = await load();

  await loadStaff();

  expect(document.getElementById("staffCount").textContent).toBe("0");
  expect(document.getElementById("staffTableBody").textContent).toContain("No staff members found");
});

test("loadStaff logs and shows an error toast when Firestore fails", async () => {
  const error = new Error("Firestore down");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockGetDocs.mockRejectedValueOnce(error);

  await load();

  expect(consoleSpy).toHaveBeenCalledWith("loadStaff error:", error);
  expect(document.getElementById("toast").textContent).toBe("Failed to load staff");
  expect(document.getElementById("toast").className).toContain("error");
});

test("loadClinics skips clinics without a name", async () => {
  mockGetDocs
    .mockResolvedValueOnce(makeSnapshot([]))
    .mockResolvedValueOnce(makeSnapshot([
      { __docId: "c1", name: "" },
      { __docId: "c2", name: "Clinic Beta" }
    ]));

  await load();

  const options = Array.from(document.getElementById("staffClinic").options).map((option) => option.textContent);

  expect(options).not.toContain("");
  expect(options).toContain("Clinic Beta");
});

test("loadClinics logs errors without crashing", async () => {
  const error = new Error("Clinics unavailable");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockGetDocs
    .mockResolvedValueOnce(makeSnapshot([]))
    .mockRejectedValueOnce(error);

  await load();

  expect(consoleSpy).toHaveBeenCalledWith("loadClinics error:", error);
});

test("addStaff validates missing fields and invalid email before saving", async () => {
  await load();

  await window.addStaff();

  expect(mockAddDoc).not.toHaveBeenCalled();
  expect(document.getElementById("toast").textContent).toBe("Please fill in all fields");

  document.getElementById("staffName").value = "Jane";
  document.getElementById("staffEmail").value = "bad-email";
  document.getElementById("staffClinic").value = "1";

  await window.addStaff();

  expect(mockAddDoc).not.toHaveBeenCalled();
  expect(document.getElementById("toast").textContent).toBe("Please enter a valid email address");
});

test("addStaff saves normalized payload, clears the form, closes modal, reloads staff, and shows success", async () => {
  await load();

  document.getElementById("inviteModal").style.display = "flex";
  document.getElementById("staffName").value = " Jane Doe ";
  document.getElementById("staffEmail").value = " JANE@TEST.COM ";
  document.getElementById("staffClinic").value = "1";
  mockGetDocs.mockResolvedValue(makeSnapshot([]));

  await window.addStaff();

  expect(mockAddDoc).toHaveBeenCalledWith(
    "ApprovedStaff",
    {
      name: "Jane Doe",
      email: "jane@test.com",
      clinicName: "Clinic A",
      clinicId: "1",
      addedBy: "admin@test.com",
      addedAt: "TIMESTAMP"
    }
  );
  expect(document.getElementById("staffName").value).toBe("");
  expect(document.getElementById("staffEmail").value).toBe("");
  expect(document.getElementById("staffClinic").value).toBe("");
  expect(document.getElementById("inviteModal").style.display).toBe("none");
  expect(document.getElementById("toast").textContent).toBe("Staff member added successfully");
  expect(document.getElementById("toast").className).toContain("success");
});

test("addStaff falls back to a blank clinic name if the selected option is missing", async () => {
  await load();

  document.getElementById("staffName").value = "Jane";
  document.getElementById("staffEmail").value = "jane@test.com";
  const getElementById = document.getElementById.bind(document);
  const fakeSelect = {
    value: "clinic-without-option",
    options: [],
    selectedIndex: 0
  };
  jest.spyOn(document, "getElementById").mockImplementation((id) => (
    id === "staffClinic" ? fakeSelect : getElementById(id)
  ));

  await window.addStaff();

  expect(mockAddDoc).toHaveBeenCalledWith(
    "ApprovedStaff",
    expect.objectContaining({
      clinicId: "clinic-without-option",
      clinicName: ""
    })
  );
});

test("addStaff logs and shows an error toast when saving fails", async () => {
  const error = new Error("Save failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockAddDoc.mockRejectedValueOnce(error);
  await load();

  document.getElementById("staffName").value = "Jane";
  document.getElementById("staffEmail").value = "jane@test.com";
  document.getElementById("staffClinic").value = "1";

  await window.addStaff();

  expect(consoleSpy).toHaveBeenCalledWith("addStaff error:", error);
  expect(document.getElementById("toast").textContent).toBe("Failed to add staff member");
  expect(document.getElementById("toast").className).toContain("error");
});

test("removeStaff does nothing when confirmation is cancelled", async () => {
  global.confirm = jest.fn(() => false);
  await load();

  await window.removeStaff("s1");

  expect(mockDeleteDoc).not.toHaveBeenCalled();
});

test("removeStaff deletes the selected record, reloads staff, and shows success", async () => {
  await load();
  const callsBefore = mockGetDocs.mock.calls.length;

  await window.removeStaff("s1");

  expect(global.confirm).toHaveBeenCalledWith("Remove this staff member? This cannot be undone.");
  expect(mockDoc).toHaveBeenCalledWith({}, "ApprovedStaff", "s1");
  expect(mockDeleteDoc).toHaveBeenCalledWith("ApprovedStaff/s1");
  expect(mockGetDocs.mock.calls.length).toBeGreaterThan(callsBefore);
  expect(document.getElementById("toast").textContent).toBe("Staff member removed");
  expect(document.getElementById("toast").className).toContain("success");
});

test("removeStaff logs and shows an error toast when deletion fails", async () => {
  const error = new Error("Delete failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockDeleteDoc.mockRejectedValueOnce(error);
  await load();

  await window.removeStaff("s1");

  expect(consoleSpy).toHaveBeenCalledWith("removeStaff error:", error);
  expect(document.getElementById("toast").textContent).toBe("Failed to remove staff member");
  expect(document.getElementById("toast").className).toContain("error");
});

test("openInviteModal and closeInviteModal toggle the modal display", async () => {
  await load();

  window.openInviteModal();
  expect(document.getElementById("inviteModal").style.display).toBe("flex");

  window.closeInviteModal();
  expect(document.getElementById("inviteModal").style.display).toBe("none");
});

test("showToast displays a message, resets after three seconds, and tolerates a missing toast", async () => {
  const { showToast } = await load();

  showToast("Saved", "success");

  expect(document.getElementById("toast").textContent).toBe("Saved");
  expect(document.getElementById("toast").className).toBe("toast show success");

  jest.advanceTimersByTime(3000);
  expect(document.getElementById("toast").className).toBe("toast");

  showToast("Plain");
  expect(document.getElementById("toast").className).toBe("toast show ");

  document.getElementById("toast").remove();
  expect(() => showToast("Ignored", "error")).not.toThrow();
});
