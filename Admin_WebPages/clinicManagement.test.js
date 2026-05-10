// =============================================================
// clinicManagement.test.js  –  improved coverage
// =============================================================

// ── Shared mock for Firebase / admin bootstrap ────────────────
jest.mock("/Admin_WebPages/admin.js", () => ({
  initAdminPage: jest.fn(),
  db: {}
}));

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    collection:      jest.fn(),
    addDoc:          jest.fn(() => Promise.resolve()),
    serverTimestamp: jest.fn(() => "TIMESTAMP"),
    getDocs:         jest.fn(() =>
      Promise.resolve({ forEach: jest.fn() })
    ),
    doc:       jest.fn(),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve())
  }),
  { virtual: true }
);

// ── Full DOM used by every test ───────────────────────────────
// Includes the hours-modal inputs that were missing before,
// plus the add-clinic and manage-clinic form fields.
function buildDOM() {
  document.body.innerHTML = `
    <!-- ── Add clinic modal ───────────────────────── -->
    <button class="addBtn"></button>

    <div id="clinicModal">
      <form>
        <input id="clinicName"   value="" />
        <input id="Location"     value="" />
        <select id="clinicStatus"><option value="Active">Active</option></select>
        <select id="province">
          <option value="Gauteng">Gauteng</option>
        </select>
        <div id="clinicServicesDropdown" class="custom-select">
          <div class="select-trigger">Select Services</div>
          <div class="select-options">
            <label><input type="checkbox" value="General" /></label>
            <label><input type="checkbox" value="Dental"  /></label>
          </div>
        </div>
        <button type="submit">Add</button>
      </form>
    </div>

    <!-- ── Manage (edit) clinic modal ────────────── -->
    <div id="ManageClinicModal">
      <form>
        <input id="ManageClinicName"   value="" />
        <input id="ManageLocation"     value="" />
        <input id="ManageClinicStatus" value="" />
        <input id="manageProvince"     value="" />
        <div id="manageClinicServicesDropdown" class="custom-select">
          <div class="select-trigger">Select Services</div>
          <div class="select-options">
            <label><input type="checkbox" value="General" /></label>
            <label><input type="checkbox" value="Dental"  /></label>
          </div>
        </div>
        <button type="submit">Save</button>
      </form>
    </div>

    <!-- ── Clinic hours modal ─────────────────────── -->
    <div id="clinicHoursModal">
      <form>
        <select id="startDay">
          <option value="">--</option>
          <option value="Mon">Mon</option>
          <option value="Fri">Fri</option>
        </select>
        <select id="endDay">
          <option value="">--</option>
          <option value="Mon">Mon</option>
          <option value="Fri">Fri</option>
        </select>
        <input id="startTime" value="" />
        <input id="endTime"   value="" />
        <button type="submit">Update</button>
      </form>
    </div>

    <!-- ── Shared controls ───────────────────────── -->
    <button class="close-btn"></button>
    <input  id="clinicSearch" />
    <div class="clinics"></div>
  `;
}

beforeEach(() => {
  buildDOM();
  global.alert   = jest.fn();
  global.confirm = jest.fn(() => true);
  jest.resetModules();
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
async function load() {
  return import("./ClinicManagement.js");
}

// =============================================================
// 1. getSelectedServices
// =============================================================
test("getSelectedServices returns checked services", async () => {
  const { getSelectedServices } = await load();

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );
  boxes[0].checked = true;

  expect(getSelectedServices("manageClinicServicesDropdown"))
    .toContain("General");
});

test("getSelectedServices returns empty array when nothing checked", async () => {
  const { getSelectedServices } = await load();

  expect(getSelectedServices("manageClinicServicesDropdown"))
    .toEqual([]);
});

test("getSelectedServices returns multiple checked services", async () => {
  const { getSelectedServices } = await load();

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );
  boxes[0].checked = true;
  boxes[1].checked = true;

  const result = getSelectedServices("manageClinicServicesDropdown");
  expect(result).toContain("General");
  expect(result).toContain("Dental");
});

// =============================================================
// 2. clearServices
// =============================================================
test("clearServices unchecks all services", async () => {
  const { clearServices } = await load();

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );
  boxes[0].checked = true;
  boxes[1].checked = true;

  clearServices("manageClinicServicesDropdown");

  expect(boxes[0].checked).toBe(false);
  expect(boxes[1].checked).toBe(false);
});

// =============================================================
// 3. preselectServices
// =============================================================
test("preselectServices checks matching services", async () => {
  const { preselectServices } = await load();

  preselectServices("manageClinicServicesDropdown", ["Dental"]);

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );
  expect(boxes[0].checked).toBe(false);
  expect(boxes[1].checked).toBe(true);
});

test("preselectServices handles a plain string instead of array", async () => {
  const { preselectServices } = await load();

  preselectServices("manageClinicServicesDropdown", "General");

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );
  expect(boxes[0].checked).toBe(true);
  expect(boxes[1].checked).toBe(false);
});

test("preselectServices handles empty/null gracefully", async () => {
  const { preselectServices } = await load();

  preselectServices("manageClinicServicesDropdown", null);

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );
  expect(boxes[0].checked).toBe(false);
  expect(boxes[1].checked).toBe(false);
});

// =============================================================
// 4. updateTriggerLabel
// =============================================================
test("updateTriggerLabel shows checked service names", async () => {
  const { updateTriggerLabel } = await load();

  const dropdown = document.getElementById(
    "manageClinicServicesDropdown"
  );
  dropdown.querySelectorAll("input")[0].checked = true;

  updateTriggerLabel(dropdown);

  expect(dropdown.querySelector(".select-trigger").textContent)
    .toContain("General");
});

test("updateTriggerLabel falls back to placeholder when nothing checked", async () => {
  const { updateTriggerLabel } = await load();

  const dropdown = document.getElementById(
    "manageClinicServicesDropdown"
  );

  updateTriggerLabel(dropdown);

  expect(dropdown.querySelector(".select-trigger").textContent)
    .toContain("Select Services");
});

// =============================================================
// 5. openEditModal
// =============================================================
test("openEditModal fills form fields", async () => {
  const { openEditModal } = await load();

  openEditModal("1", "Care Clinic", "123 Main", "Active", ["General"], "Gauteng");

  expect(document.getElementById("ManageClinicName").value).toBe("Care Clinic");
  expect(document.getElementById("ManageLocation").value).toBe("123 Main");
  expect(document.getElementById("manageProvince").value).toBe("Gauteng");
});

test("openEditModal opens the manage modal", async () => {
  const { openEditModal } = await load();

  openEditModal("2", "Test Clinic", "Road X", "Active", [], "Limpopo");

  expect(document.getElementById("ManageClinicModal").style.display)
    .toBe("flex");
});

test("openEditModal defaults province to empty string when not provided", async () => {
  const { openEditModal } = await load();

  openEditModal("3", "No Province", "Somewhere", "Active", []);

  expect(document.getElementById("manageProvince").value).toBe("");
});

// =============================================================
// 6. addClinicToUI – rendering
// =============================================================
test("addClinicToUI renders clinic card with name and province", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("1", "Care Clinic", "123 Main", "Active", ["General"], "08:00-17:00", "Gauteng");

  expect(document.body.textContent).toContain("Care Clinic");
  expect(document.body.textContent).toContain("Gauteng");
  expect(document.body.textContent).toContain("08:00-17:00");
});

test("addClinicToUI handles string service", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("3", "String Service Clinic", "Main Road", "Busy", "Emergency", "Hours not available", "Western Cape");

  expect(document.body.textContent).toContain("String Service Clinic");
  expect(document.body.textContent).toContain("Emergency");
  expect(document.body.textContent).toContain("Hours not specified");
});

test("addClinicToUI falls back to 'General' when service is falsy", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("5", "Fallback Clinic", "Somewhere", "Active", null, "09:00-13:00", "Gauteng");

  expect(document.body.textContent).toContain("General");
});

test("addClinicToUI omits province when it is 'unknown'", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("6", "Unknown Prov Clinic", "Road Y", "Active", ["Dental"], "10:00-14:00", "unknown");

  // Province should NOT appear next to location
  const card = document.querySelector(".clinicName");
  expect(card.textContent).not.toContain(", unknown");
});

test("addClinicToUI applies correct colour for Closed status", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("7", "Closed Clinic", "Closed Road", "Closed", ["General"], "N/A", "Gauteng");

  const statusEl = document.querySelector("#status");
  expect(statusEl.style.color).toBe("rgb(153, 27, 27)");
});

test("addClinicToUI applies correct colour for Busy status", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("8", "Busy Clinic", "Busy Road", "Busy", ["General"], "N/A", "Gauteng");

  const statusEl = document.querySelector("#status");
  expect(statusEl.style.color).toBe("rgb(55, 65, 81)");
});

// =============================================================
// 7. addClinicToUI – hours modal button (the previously failing test)
// =============================================================
test("addClinicToUI hours-btn opens clinicHoursModal", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("4", "Hours Clinic", "Side Road", "Active", ["General"], "Mon-Fri: 08:00-17:00", "Gauteng");

  document.querySelector(".hours-btn").click();

  expect(document.getElementById("clinicHoursModal").style.display)
    .toBe("flex");
});

test("hours-btn populates fields when hours match the expected pattern", async () => {
  const { addClinicToUI } = await load();

  // The source regex uses \w+ which matches word chars only (no colons).
  // A valid matching format is "Mon-Fri: 0800-1700" (no colons in times).
  addClinicToUI("10", "Pattern Clinic", "Pattern Rd", "Active", ["General"], "Mon-Fri: 0800-1700", "Gauteng");

  document.querySelector(".hours-btn").click();

  expect(document.getElementById("startDay").value).toBe("Mon");
  expect(document.getElementById("endDay").value).toBe("Fri");
  expect(document.getElementById("startTime").value).toBe("0800");
  expect(document.getElementById("endTime").value).toBe("1700");
});

test("hours-btn clears fields when hours do NOT match the pattern", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("11", "No Pattern Clinic", "No Pattern Rd", "Active", ["General"], "Hours not specified", "Gauteng");

  document.querySelector(".hours-btn").click();

  expect(document.getElementById("startDay").value).toBe("");
  expect(document.getElementById("endDay").value).toBe("");
  expect(document.getElementById("startTime").value).toBe("");
  expect(document.getElementById("endTime").value).toBe("");
});

// =============================================================
// 8. addClinicToUI – manage button
// =============================================================
test("manage-btn opens ManageClinicModal", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("9", "Manage Clinic", "Manage Rd", "Active", ["General"], "08:00-17:00", "Gauteng");

  document.querySelector(".manage-btn").click();

  expect(document.getElementById("ManageClinicModal").style.display)
    .toBe("flex");
});

test("manage-btn fills in ManageClinicName", async () => {
  const { addClinicToUI } = await load();

  addClinicToUI("9b", "Edit Me Clinic", "Edit Road", "Active", ["Dental"], "09:00-15:00", "Limpopo");

  document.querySelector(".manage-btn").click();

  expect(document.getElementById("ManageClinicName").value).toBe("Edit Me Clinic");
});

// =============================================================
// 9. addClinicToUI – delete button
// =============================================================
test("delete-btn removes clinic card from DOM after confirm", async () => {
  const { addClinicToUI } = await load();

  global.confirm = jest.fn(() => true);

  addClinicToUI("12", "Delete Me", "Delete Rd", "Active", ["General"], "08:00-17:00", "Gauteng");

  expect(document.querySelectorAll(".clinic").length).toBe(1);

  await document.querySelector(".delete-btn").click();

  // Card is removed optimistically (deleteDoc resolves asynchronously,
  // but clinic.remove() is called in the then-callback)
  await Promise.resolve();

  expect(document.querySelectorAll(".clinic").length).toBe(0);
});

test("delete-btn does nothing when confirm returns false", async () => {
  const { addClinicToUI } = await load();

  global.confirm = jest.fn(() => false);

  addClinicToUI("13", "Keep Me", "Keep Rd", "Active", ["General"], "08:00-17:00", "Gauteng");

  document.querySelector(".delete-btn").click();

  expect(document.querySelectorAll(".clinic").length).toBe(1);
});

// =============================================================
// 10. renderClinics
// =============================================================
test("renderClinics renders multiple clinics", async () => {
  const { renderClinics } = await load();

  renderClinics([
    { id: "1", name: "Clinic One",  address: "Addr One", status: "Active", service: ["General"], operatingHours: "08:00-17:00", province: "Gauteng" },
    { id: "2", name: "Clinic Two",  address: "Addr Two", status: "Closed", service: ["Dental"],  operatingHours: "09:00-15:00", province: "Limpopo" }
  ]);

  expect(document.body.textContent).toContain("Clinic One");
  expect(document.body.textContent).toContain("Clinic Two");
});

test("renderClinics clears previous clinics before rendering", async () => {
  const { addClinicToUI, renderClinics } = await load();

  addClinicToUI("old", "Old Clinic", "Old Rd", "Active", [], "N/A", "Gauteng");

  renderClinics([
    { id: "new", name: "New Clinic", address: "New Rd", status: "Active", service: [], operatingHours: "N/A", province: "Gauteng" }
  ]);

  expect(document.body.textContent).not.toContain("Old Clinic");
  expect(document.body.textContent).toContain("New Clinic");
});

// =============================================================
// 11. Modal open / close via addBtn and close-btn
// =============================================================
test("addBtn opens clinicModal", async () => {
  await load();

  document.querySelector(".addBtn").click();

  expect(document.getElementById("clinicModal").style.display)
    .toBe("flex");
});

test("close-btn closes all modals", async () => {
  await load();

  // Open all three modals manually
  document.getElementById("clinicModal").style.display       = "flex";
  document.getElementById("ManageClinicModal").style.display = "flex";
  document.getElementById("clinicHoursModal").style.display  = "flex";

  document.querySelector(".close-btn").click();

  expect(document.getElementById("clinicModal").style.display).toBe("none");
  expect(document.getElementById("ManageClinicModal").style.display).toBe("none");
  expect(document.getElementById("clinicHoursModal").style.display).toBe("none");
});

// =============================================================
// 12. Search
// Search reads from the module-level `clinics` array, which is
// only populated by loadClinics() (via getDocs). We mock getDocs
// to return our fixture data so the search handler has something
// to filter against.
// =============================================================

// Helper: configure getDocs mock and trigger loadClinics
async function loadWithClinics(clinicFixtures) {
  const { getDocs } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
  );

  getDocs.mockResolvedValueOnce({
    forEach: (cb) =>
      clinicFixtures.forEach((c) =>
        cb({
          id: c.id,
          data: () => ({
            name:          c.name,
            address:       c.address,
            province:      c.province,
            status:        c.status,
            service:       c.service,
            opening_hours: c.operatingHours
          })
        })
      )
  });

  // loadClinics() is called automatically on module import;
  // wait for it to resolve
  const mod = await load();
  await Promise.resolve(); // flush microtasks
  return mod;
}

test("search filters clinics by name", async () => {
  await loadWithClinics([
    { id: "1", name: "Alpha Clinic", address: "Alpha Rd", status: "Active", service: ["General"], operatingHours: "0800-1700", province: "Gauteng" },
    { id: "2", name: "Beta Clinic",  address: "Beta Rd",  status: "Active", service: ["Dental"],  operatingHours: "0900-1500", province: "Limpopo" }
  ]);

  const search = document.getElementById("clinicSearch");
  search.value = "alpha";
  search.dispatchEvent(new Event("input"));

  expect(document.querySelector(".clinics").textContent).toContain("Alpha Clinic");
  expect(document.querySelector(".clinics").textContent).not.toContain("Beta Clinic");
});

test("search filters clinics by province", async () => {
  await loadWithClinics([
    { id: "1", name: "Alpha Clinic", address: "Addr 1", status: "Active", service: ["General"], operatingHours: "0800-1700", province: "Gauteng" },
    { id: "2", name: "Beta Clinic",  address: "Addr 2", status: "Active", service: ["Dental"],  operatingHours: "0900-1500", province: "Limpopo" }
  ]);

  const search = document.getElementById("clinicSearch");
  search.value = "limpopo";
  search.dispatchEvent(new Event("input"));

  expect(document.querySelector(".clinics").textContent).not.toContain("Alpha Clinic");
  expect(document.querySelector(".clinics").textContent).toContain("Beta Clinic");
});

test("search with empty string shows all clinics", async () => {
  await loadWithClinics([
    { id: "1", name: "Alpha Clinic", address: "Addr 1", status: "Active", service: ["General"], operatingHours: "N/A", province: "Gauteng" },
    { id: "2", name: "Beta Clinic",  address: "Addr 2", status: "Active", service: ["Dental"],  operatingHours: "N/A", province: "Limpopo" }
  ]);

  const search = document.getElementById("clinicSearch");
  search.value = "";
  search.dispatchEvent(new Event("input"));

  expect(document.querySelector(".clinics").textContent).toContain("Alpha Clinic");
  expect(document.querySelector(".clinics").textContent).toContain("Beta Clinic");
});

// =============================================================
// 13. Window click closes modals when target IS the modal
// =============================================================
test("clicking the modal backdrop closes clinicModal", async () => {
  await load();

  document.getElementById("clinicModal").style.display = "flex";

  // Simulate a click whose target is the modal itself
  const event = new MouseEvent("click", { bubbles: true });
  Object.defineProperty(event, "target", {
    value: document.getElementById("clinicModal"),
    writable: false
  });
  window.dispatchEvent(event);

  expect(document.getElementById("clinicModal").style.display).toBe("none");
});