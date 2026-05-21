// =============================================================
// clinicManagement.test.js
// =============================================================

// ── Mocks ─────────────────────────────────────────────────────
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

// ── DOM ───────────────────────────────────────────────────────
function buildDOM() {
    document.body.innerHTML = `
        <button class="addBtn"></button>

    <section id="clinicModal">
      <form>
        <input id="clinicName"   value="" />
        <input id="Location"     value="" />
        <select id="clinicStatus"><option value="Active">Active</option></select>
        <select id="province">
          <option value="Gauteng">Gauteng</option>
        </select>
        <section id="clinicServicesDropdown" class="custom-select">
          <section class="select-trigger">Select Services</section>
          <section class="select-options">
            <label><input type="checkbox" value="General"   /></label>
            <label><input type="checkbox" value="Dental"    /></label>
            <label><input type="checkbox" value="Emergency" /></label>
          </section>
        </section>
        <button type="submit">Add</button>
      </form>
    </section>

    <!-- ── Manage (edit) clinic modal ────────────── -->
    <section id="ManageClinicModal">
      <form>
        <input id="ManageClinicName"   value="" />
        <input id="ManageLocation"     value="" />
        <input id="ManageClinicStatus" value="" />
        <select id="manageProvince">
          <option value="">Select Province</option>
          <option value="Gauteng">Gauteng</option>
          <option value="Western Cape">Western Cape</option>
          <option value="Limpopo">Limpopo</option>
          <option value="Eastern Cape">Eastern Cape</option>
          <option value="KwaZulu-Natal">KwaZulu-Natal</option>
          <option value="Mpumalanga">Mpumalanga</option>
          <option value="North West">North West</option>
          <option value="Free State">Free State</option>
          <option value="Northern Cape">Northern Cape</option>
        </select>
        <section id="manageClinicServicesDropdown" class="custom-select">
          <section class="select-trigger">Select Services</section>
          <section class="select-options">
            <label><input type="checkbox" value="General"   /></label>
            <label><input type="checkbox" value="Dental"    /></label>
            <label><input type="checkbox" value="Emergency" /></label>
          </section>
        </section>
        <button type="submit">Save</button>
      </form>
    </section>

    <!-- ── Clinic hours modal ─────────────────────── -->
    <section id="clinicHoursModal">
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
    </section>

    <!-- ── Shared controls ───────────────────────── -->
    <button class="close-btn"></button>
    <input  id="clinicSearch" />
    <section class="clinics"></section>
    <section id="hoursError"></section>
    <section id="hoursDayError"></section>
  `;
}

// ── Setup ─────────────────────────────────────────────────────
beforeEach(() => {
    buildDOM();
    global.alert   = jest.fn();
    global.confirm = jest.fn(() => true);
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
});

// ── Helpers ───────────────────────────────────────────────────
async function load() {
  return import("../Admin_WebPages/clinicManagement.js");
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Returns the checkbox with the given value inside a named dropdown container.
 * Used throughout the tests instead of repeating the querySelector pattern.
 */
function getCheckbox(dropdownId, value) {
  return document.querySelector(`#${dropdownId} input[value="${value}"]`);
}

function clinic(overrides = {}) {
  return {
    id: "clinic-1",
    name: "Care Clinic",
    address: "123 Main",
    status: "Active",
    service: ["General"],
    province: "Gauteng",
    startDay: "Mon",
    endDay: "Fri",
    startTime: "08:00",
    endTime: "17:00",
    ...overrides
  };
}

function snapshotFrom(records) {
  return {
    forEach: (callback) => {
      records.forEach(({ id, ...data }) => {
        callback({
          id,
          data: () => data
        });
      });
    }
  };
}

/**
 * Loads the module and pre-populates the clinics list so Search tests
 * have real cards to filter against.
 */
async function loadWithClinics(clinics) {
  const { getDocs } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
  );
  getDocs.mockResolvedValue(snapshotFrom(clinics));
  const mod = await load();
  await Promise.resolve();
  await Promise.resolve();
  return mod;
}

// =============================================================
// 1. getSelectedServices
// =============================================================
describe("getSelectedServices", () => {

    test("returns checked services", async () => {
        const { getSelectedServices } = await load();
        getCheckbox("manageClinicServicesDropdown", "General").checked = true;
        expect(getSelectedServices("manageClinicServicesDropdown")).toContain("General");
    });

    test("returns empty array when nothing checked", async () => {
        const { getSelectedServices } = await load();
        expect(getSelectedServices("manageClinicServicesDropdown")).toEqual([]);
    });

    test("returns multiple checked services", async () => {
        const { getSelectedServices } = await load();
        getCheckbox("manageClinicServicesDropdown", "General").checked = true;
        getCheckbox("manageClinicServicesDropdown", "Dental").checked  = true;
        const result = getSelectedServices("manageClinicServicesDropdown");
        expect(result).toContain("General");
        expect(result).toContain("Dental");
        expect(result).toHaveLength(2);
    });

    test("returns all services when all checked", async () => {
        const { getSelectedServices } = await load();
        document.querySelectorAll("#manageClinicServicesDropdown input")
            .forEach(cb => cb.checked = true);
        expect(getSelectedServices("manageClinicServicesDropdown")).toHaveLength(3);
    });

    test("works for add clinic dropdown too", async () => {
        const { getSelectedServices } = await load();
        getCheckbox("clinicServicesDropdown", "Emergency").checked = true;
        expect(getSelectedServices("clinicServicesDropdown")).toContain("Emergency");
    });
});

// =============================================================
// 2. clearServices
// =============================================================
describe("clearServices", () => {

    test("unchecks all services", async () => {
        const { clearServices } = await load();
        getCheckbox("manageClinicServicesDropdown", "General").checked = true;
        getCheckbox("manageClinicServicesDropdown", "Dental").checked  = true;
        clearServices("manageClinicServicesDropdown");
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(false);
    });

    test("resets trigger label to placeholder after clearing", async () => {
        const { clearServices } = await load();
        getCheckbox("manageClinicServicesDropdown", "General").checked = true;
        clearServices("manageClinicServicesDropdown");
        const trigger = document.querySelector("#manageClinicServicesDropdown .select-trigger");
        expect(trigger.textContent).toContain("Select Services");
    });

    test("works even when nothing was checked", async () => {
        const { clearServices } = await load();
        expect(() => clearServices("manageClinicServicesDropdown")).not.toThrow();
    });

    test("works on add clinic dropdown", async () => {
        const { clearServices } = await load();
        getCheckbox("clinicServicesDropdown", "General").checked = true;
        clearServices("clinicServicesDropdown");
        expect(getCheckbox("clinicServicesDropdown", "General").checked).toBe(false);
    });
});

// =============================================================
// 3. preselectServices
// =============================================================
describe("preselectServices", () => {

    test("checks matching service", async () => {
        const { preselectServices } = await load();
        preselectServices("manageClinicServicesDropdown", ["Dental"]);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(true);
    });

    test("handles a plain string instead of array", async () => {
        const { preselectServices } = await load();
        preselectServices("manageClinicServicesDropdown", "General");
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(true);
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(false);
    });

    test("handles empty array gracefully", async () => {
        const { preselectServices } = await load();
        preselectServices("manageClinicServicesDropdown", []);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(false);
    });

    test("handles null gracefully", async () => {
        const { preselectServices } = await load();
        preselectServices("manageClinicServicesDropdown", null);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(false);
    });

    test("handles undefined gracefully", async () => {
        const { preselectServices } = await load();
        preselectServices("manageClinicServicesDropdown", undefined);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
    });

    test("checks multiple services from array", async () => {
        const { preselectServices } = await load();
        preselectServices("manageClinicServicesDropdown", ["General", "Emergency"]);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(true);
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(false);
        expect(getCheckbox("manageClinicServicesDropdown", "Emergency").checked).toBe(true);
    });

    test("updates trigger label after preselecting", async () => {
        const { preselectServices } = await load();
        preselectServices("manageClinicServicesDropdown", ["General"]);
        const trigger = document.querySelector("#manageClinicServicesDropdown .select-trigger");
        expect(trigger.textContent).toContain("General");
    });
});

// =============================================================
// 4. updateTriggerLabel
// =============================================================
describe("updateTriggerLabel", () => {

    test("shows checked service name", async () => {
        const { updateTriggerLabel } = await load();
        const dropdown = document.getElementById("manageClinicServicesDropdown");
        getCheckbox("manageClinicServicesDropdown", "General").checked = true;
        updateTriggerLabel(dropdown);
        expect(dropdown.querySelector(".select-trigger").textContent).toContain("General");
    });

    test("shows multiple checked service names", async () => {
        const { updateTriggerLabel } = await load();
        const dropdown = document.getElementById("manageClinicServicesDropdown");
        getCheckbox("manageClinicServicesDropdown", "General").checked = true;
        getCheckbox("manageClinicServicesDropdown", "Dental").checked  = true;
        updateTriggerLabel(dropdown);
        const text = dropdown.querySelector(".select-trigger").textContent;
        expect(text).toContain("General");
        expect(text).toContain("Dental");
    });

    test("falls back to placeholder when nothing checked", async () => {
        const { updateTriggerLabel } = await load();
        const dropdown = document.getElementById("manageClinicServicesDropdown");
        updateTriggerLabel(dropdown);
        expect(dropdown.querySelector(".select-trigger").textContent).toContain("Select Services");
    });

    test("updates label correctly after unchecking all", async () => {
        const { updateTriggerLabel } = await load();
        const dropdown = document.getElementById("manageClinicServicesDropdown");
        getCheckbox("manageClinicServicesDropdown", "General").checked = true;
        updateTriggerLabel(dropdown);
        getCheckbox("manageClinicServicesDropdown", "General").checked = false;
        updateTriggerLabel(dropdown);
        expect(dropdown.querySelector(".select-trigger").textContent).toContain("Select Services");
    });
});

// =============================================================
// 5. openEditModal
// =============================================================
describe("openEditModal", () => {

    test("fills all form fields correctly", async () => {
        const { openEditModal } = await load();
        openEditModal(clinic({ id: "1", name: "Care Clinic", address: "123 Main", service: ["General"], province: "Gauteng" }));
        expect(document.getElementById("ManageClinicName").value).toBe("Care Clinic");
        expect(document.getElementById("ManageLocation").value).toBe("123 Main");
        expect(document.getElementById("manageProvince").value).toBe("Gauteng");
    });

    test("opens the manage modal", async () => {
        const { openEditModal } = await load();
        openEditModal(clinic({ id: "2", name: "Test Clinic", address: "Road X", service: [], province: "Limpopo" }));
        expect(document.getElementById("ManageClinicModal").style.display).toBe("flex");
    });

    test("defaults province to empty string when not provided", async () => {
        const { openEditModal } = await load();
        openEditModal(clinic({ id: "3", name: "No Province", address: "Somewhere", service: [], province: undefined }));
        expect(document.getElementById("manageProvince").value).toBe("");
    });

    test("preselects services in the dropdown", async () => {
        const { openEditModal } = await load();
        openEditModal(clinic({ id: "4", name: "Service Clinic", address: "Road A", service: ["Dental"], province: "Gauteng" }));
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(true);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
    });

    test("does not edit stored status because status is derived from hours", async () => {
        const { openEditModal } = await load();
        openEditModal(clinic({ id: "5", name: "Closed Clinic", address: "Road B", status: "Closed", service: [], province: "Gauteng" }));
        expect(document.getElementById("ManageClinicStatus").value).toBe("");
    });

    test("stores editingClinicId so manage form updates the right doc", async () => {
        const { openEditModal } = await load();
        const { updateDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );

        openEditModal(clinic({ id: "clinic-99", name: "Target Clinic", address: "Road C", service: [], province: "Gauteng" }));

        document.getElementById("ManageClinicName").value   = "Updated Name";
        document.getElementById("ManageLocation").value     = "Updated Addr";
        document.getElementById("ManageClinicStatus").value = "Active";

        const form = document.querySelector("#ManageClinicModal form");
        form.dispatchEvent(new Event("submit", { bubbles: true }));
        await Promise.resolve();

        expect(updateDoc).toHaveBeenCalled();
    });
});

// =============================================================
// 6. addClinicToUI – rendering
// =============================================================
describe("addClinicToUI - rendering", () => {

    test("renders clinic card with name", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "1", name: "Care Clinic", address: "123 Main" }));
        expect(document.body.textContent).toContain("Care Clinic");
    });

    test("renders clinic card with province", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "1", name: "Care Clinic", address: "123 Main", province: "Gauteng" }));
        expect(document.body.textContent).toContain("Gauteng");
    });

    test("renders clinic card with operating hours", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "1", name: "Care Clinic", address: "123 Main", startTime: "08:00", endTime: "17:00" }));
        expect(document.body.textContent).toContain("08:00-17:00");
    });

    test("renders multiple services as individual chips", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "2", name: "Multi Service", address: "Road X", service: ["General", "Dental", "Emergency"] }));
        const chips = document.querySelectorAll(".services");
        expect(chips).toHaveLength(3);
    });

    test("handles string service", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({
            id: "3",
            name: "String Clinic",
            address: "Main Road",
            status: "Busy",
            service: "Emergency",
            province: "Western Cape",
            startDay: "",
            endDay: "",
            startTime: "",
            endTime: ""
        }));
        expect(document.body.textContent).toContain("Emergency");
        expect(document.body.textContent).toContain("Hours not specified");
    });

    test("falls back to General when service is null", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "5", name: "Fallback Clinic", address: "Somewhere", service: null }));
        expect(document.body.textContent).toContain("General");
    });

    test("omits province when it is 'unknown' (lowercase)", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "6", name: "Unknown Prov Clinic", address: "Road Y", service: ["Dental"], province: "unknown" }));
        const location = document.querySelector(".Location");
        expect(location.textContent).not.toContain(", unknown");
    });

    test("omits province when it is 'Unknown' (capitalised)", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "6b", name: "Unknown Prov Clinic 2", address: "Road Z", service: ["Dental"], province: "Unknown" }));
        const location = document.querySelector(".Location");
        expect(location.textContent).not.toContain(", Unknown");
    });

    test("shows province when it is valid", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "6c", name: "Valid Province Clinic", address: "Road A", service: ["Dental"], province: "Limpopo" }));
        const location = document.querySelector(".Location");
        expect(location.textContent).toContain("Limpopo");
    });

    test("shows Hours not specified when hours is null", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "7", name: "No Hours Clinic", address: "Road H", startDay: "", endDay: "", startTime: "", endTime: "" }));
        expect(document.body.textContent).toContain("Hours not specified");
    });

    test("applies correct colour when derived status is Open", async () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-05-18T10:00:00"));
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({
            id: "8a",
            name: "Active Clinic",
            address: "Active Road",
            startDay: "Monday",
            endDay: "Friday",
            startTime: "08:00",
            endTime: "17:00"
        }));
        const statusEl = document.querySelector("#status");
        expect(statusEl.textContent).toBe("Open");
        expect(statusEl.style.color).toBe("rgb(22, 101, 52)");
    });

    test("applies correct colour when derived status is Closed", async () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-05-18T18:00:00"));
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({
            id: "7",
            name: "Closed Clinic",
            address: "Closed Road",
            startDay: "Monday",
            endDay: "Friday",
            startTime: "08:00",
            endTime: "17:00"
        }));
        const statusEl = document.querySelector("#status");
        expect(statusEl.textContent).toBe("Closed");
        expect(statusEl.style.color).toBe("rgb(153, 27, 27)");
    });

    test("uses Closed colours for missing hours", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({
            id: "8",
            name: "No Hours Clinic",
            address: "No Hours Road",
            startDay: "",
            endDay: "",
            startTime: "",
            endTime: ""
        }));
        const statusEl = document.querySelector("#status");
        expect(statusEl.textContent).toBe("Closed");
        expect(statusEl.style.color).toBe("rgb(153, 27, 27)");
    });

    test("uses Closed colours for unrecognised day values", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({
            id: "8b",
            name: "Legacy Hours Clinic",
            address: "Road X",
            startDay: "Mon",
            endDay: "Fri",
            startTime: "08:00",
            endTime: "17:00"
        }));
        const statusEl = document.querySelector("#status");
        expect(statusEl.textContent).toBe("Closed");
        expect(statusEl.style.color).toBe("rgb(153, 27, 27)");
    });
});

// =============================================================
// 7. addClinicToUI – hours button
// =============================================================
describe("addClinicToUI - hours button", () => {

    test("opens clinicHoursModal", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "4", name: "Hours Clinic", address: "Side Road" }));
        document.querySelector(".hours-btn").click();
        expect(document.getElementById("clinicHoursModal").style.display).toBe("flex");
    });

    test("populates fields from stored operating hours", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({
            id: "10",
            name: "Pattern Clinic",
            address: "Pattern Rd",
            startDay: "Mon",
            endDay: "Fri",
            startTime: "08:00",
            endTime: "17:00"
        }));
        document.querySelector(".hours-btn").click();
        expect(document.getElementById("startDay").value).toBe("Mon");
        expect(document.getElementById("endDay").value).toBe("Fri");
        expect(document.getElementById("startTime").value).toBe("08:00");
        expect(document.getElementById("endTime").value).toBe("17:00");
    });

    test("clears fields when no stored hours exist", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "11", name: "No Pattern Clinic", address: "No Pattern Rd", startDay: "", endDay: "", startTime: "", endTime: "" }));
        document.querySelector(".hours-btn").click();
        expect(document.getElementById("startDay").value).toBe("");
        expect(document.getElementById("endDay").value).toBe("");
        expect(document.getElementById("startTime").value).toBe("");
        expect(document.getElementById("endTime").value).toBe("");
    });

    test("clears fields when operatingHours is null", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "12", name: "Null Hours Clinic", address: "Null Rd", startDay: null, endDay: null, startTime: null, endTime: null }));
        document.querySelector(".hours-btn").click();
        expect(document.getElementById("startDay").value).toBe("");
    });
});

// =============================================================
// 8. addClinicToUI – manage button
// =============================================================
describe("addClinicToUI - manage button", () => {

    test("opens ManageClinicModal", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "9", name: "Manage Clinic", address: "Manage Rd" }));
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("ManageClinicModal").style.display).toBe("flex");
    });

    test("fills in ManageClinicName", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "9b", name: "Edit Me Clinic", address: "Edit Road", service: ["Dental"], province: "Limpopo" }));
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("ManageClinicName").value).toBe("Edit Me Clinic");
    });

    test("fills in ManageLocation", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "9c", name: "Edit Location", address: "Target Road", service: ["Dental"], province: "Limpopo" }));
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("ManageLocation").value).toBe("Target Road");
    });

    test("fills in province", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "9d", name: "Province Clinic", address: "Province Rd", province: "Western Cape" }));
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("manageProvince").value).toBe("Western Cape");
    });

    test("preselects correct services in manage dropdown", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI(clinic({ id: "9e", name: "Service Edit Clinic", address: "Svc Rd", service: ["Dental"] }));
        document.querySelector(".manage-btn").click();
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(true);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
    });
});

// =============================================================
// 9. addClinicToUI – delete button
// =============================================================
describe("addClinicToUI - delete button", () => {

    test("removes clinic card after confirm", async () => {
        const { addClinicToUI } = await load();
        global.confirm = jest.fn(() => true);
        addClinicToUI(clinic({ id: "12", name: "Delete Me", address: "Delete Rd" }));
        expect(document.querySelectorAll(".clinic").length).toBe(1);
        await document.querySelector(".delete-btn").click();
        await Promise.resolve();
        expect(document.querySelectorAll(".clinic").length).toBe(0);
    });

    test("does nothing when confirm returns false", async () => {
        const { addClinicToUI } = await load();
        global.confirm = jest.fn(() => false);
        addClinicToUI(clinic({ id: "13", name: "Keep Me", address: "Keep Rd" }));
        document.querySelector(".delete-btn").click();
        expect(document.querySelectorAll(".clinic").length).toBe(1);
    });

    test("calls deleteDoc with the correct id", async () => {
        const { addClinicToUI } = await load();
        const { deleteDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );
        global.confirm = jest.fn(() => true);
        addClinicToUI(clinic({ id: "target-id", name: "Target Clinic", address: "Target Rd" }));
        await document.querySelector(".delete-btn").click();
        await Promise.resolve();
        expect(deleteDoc).toHaveBeenCalled();
    });
});

// =============================================================
// 10. renderClinics
// =============================================================
describe("renderClinics", () => {

    test("renders multiple clinics", async () => {
        const { renderClinics } = await load();
        renderClinics([
            { id: "1", name: "Clinic One", address: "Addr One", status: "Active", service: ["General"], operatingHours: "08:00-17:00", province: "Gauteng" },
            { id: "2", name: "Clinic Two", address: "Addr Two", status: "Closed", service: ["Dental"],  operatingHours: "09:00-15:00", province: "Limpopo" }
        ]);
        expect(document.body.textContent).toContain("Clinic One");
        expect(document.body.textContent).toContain("Clinic Two");
    });

    test("clears previous clinics before rendering", async () => {
        const { addClinicToUI, renderClinics } = await load();
        addClinicToUI(clinic({ id: "old", name: "Old Clinic", address: "Old Rd", service: [] }));
        renderClinics([
            { id: "new", name: "New Clinic", address: "New Rd", status: "Active", service: [], operatingHours: "N/A", province: "Gauteng" }
        ]);
        expect(document.body.textContent).not.toContain("Old Clinic");
        expect(document.body.textContent).toContain("New Clinic");
    });

    test("renders empty list without crashing", async () => {
        const { renderClinics } = await load();
        expect(() => renderClinics([])).not.toThrow();
        expect(document.querySelectorAll(".clinic").length).toBe(0);
    });

    test("renders correct number of clinic cards", async () => {
        const { renderClinics } = await load();
        renderClinics([
            { id: "1", name: "One",   address: "A1", status: "Active", service: [], operatingHours: "N/A", province: "Gauteng" },
            { id: "2", name: "Two",   address: "A2", status: "Active", service: [], operatingHours: "N/A", province: "Gauteng" },
            { id: "3", name: "Three", address: "A3", status: "Active", service: [], operatingHours: "N/A", province: "Gauteng" }
        ]);
        expect(document.querySelectorAll(".clinic").length).toBe(3);
    });
});

// =============================================================
// 11. Form submissions
// =============================================================
describe("Form submissions", () => {

    test("add clinic form writes a trimmed clinic payload and resets the modal", async () => {
        const { addDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );
        await load();

        document.getElementById("clinicModal").style.display = "flex";
        document.getElementById("clinicName").value = "  New Clinic  ";
        document.getElementById("Location").value = "  Main Road  ";
        document.getElementById("province").value = "Gauteng";
        getCheckbox("clinicServicesDropdown", "Dental").checked = true;

        document.querySelector("#clinicModal form").dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
        );
        await flushPromises();

        expect(addDoc).toHaveBeenCalledWith(undefined, {
            name: "New Clinic",
            address: "Main Road",
            province: "Gauteng",
            service: ["Dental"],
            startDay: "",
            endDay: "",
            startTime: "",
            endTime: "",
            createdAt: "TIMESTAMP"
        });
        expect(serverTimestamp).toHaveBeenCalled();
        expect(getCheckbox("clinicServicesDropdown", "Dental").checked).toBe(false);
        expect(document.getElementById("clinicModal").style.display).toBe("none");
    });

    test("manage clinic form writes the selected clinic update payload", async () => {
        const { openEditModal } = await load();
        const { doc, updateDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );

        openEditModal(clinic({ id: "clinic-42", name: "Old Name", address: "Old Road", service: ["General"] }));
        document.getElementById("ManageClinicName").value = "  Updated Clinic  ";
        document.getElementById("ManageLocation").value = "  Updated Road  ";
        document.getElementById("ManageClinicStatus").value = "Active";
        document.getElementById("manageProvince").value = "Limpopo";
        getCheckbox("manageClinicServicesDropdown", "General").checked = false;
        getCheckbox("manageClinicServicesDropdown", "Emergency").checked = true;

        document.querySelector("#ManageClinicModal form").dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
        );
        await flushPromises();

        expect(doc).toHaveBeenCalledWith({}, "clinicsObjects", "clinic-42");
        expect(updateDoc).toHaveBeenCalledWith(undefined, {
            name: "Updated Clinic",
            address: "Updated Road",
            province: "Limpopo",
            service: ["Emergency"]
        });
        expect(document.getElementById("ManageClinicModal").style.display).toBe("none");
    });

    test("hours form shows an error and does not update when fields are incomplete", async () => {
        const { addClinicToUI } = await load();
        const { updateDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );

        addClinicToUI(clinic({ id: "hours-1", startDay: "", endDay: "", startTime: "", endTime: "" }));
        document.querySelector(".hours-btn").click();

        document.querySelector("#clinicHoursModal form").dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
        );
        await flushPromises();

        expect(document.getElementById("hoursError").classList.contains("visible")).toBe(true);
        expect(updateDoc).not.toHaveBeenCalled();
    });

    test("hours form validates day range before writing updates", async () => {
        const { addClinicToUI } = await load();
        const { updateDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );

        addClinicToUI(clinic({ id: "hours-2" }));
        document.querySelector(".hours-btn").click();
        document.getElementById("startDay").value = "Mon";
        document.getElementById("endDay").value = "Mon";
        document.getElementById("startTime").value = "08:00";
        document.getElementById("endTime").value = "17:00";

        document.querySelector("#clinicHoursModal form").dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
        );
        await flushPromises();

        expect(document.getElementById("hoursDayError").classList.contains("visible")).toBe(true);
        expect(updateDoc).not.toHaveBeenCalled();
    });

    test("hours form writes valid operating hours and closes the modal", async () => {
        const { addClinicToUI } = await load();
        const { doc, updateDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );

        addClinicToUI(clinic({ id: "hours-3" }));
        document.querySelector(".hours-btn").click();
        document.getElementById("startDay").value = "Mon";
        document.getElementById("endDay").value = "Fri";
        document.getElementById("startTime").value = "09:00";
        document.getElementById("endTime").value = "16:30";

        document.querySelector("#clinicHoursModal form").dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
        );
        await flushPromises();

        expect(doc).toHaveBeenCalledWith({}, "clinicsObjects", "hours-3");
        expect(updateDoc).toHaveBeenCalledWith(undefined, {
            startDay: "Mon",
            endDay: "Fri",
            startTime: "09:00",
            endTime: "16:30"
        });
        expect(document.getElementById("clinicHoursModal").style.display).toBe("none");
        expect(document.getElementById("hoursError").classList.contains("visible")).toBe(false);
        expect(document.getElementById("hoursDayError").classList.contains("visible")).toBe(false);
    });
});

// =============================================================
// 12. Modal controls
// =============================================================
describe("Modal controls", () => {

    test("addBtn opens clinicModal", async () => {
        await load();
        document.querySelector(".addBtn").click();
        expect(document.getElementById("clinicModal").style.display).toBe("flex");
    });

    test("close-btn closes all modals", async () => {
        await load();
        document.getElementById("clinicModal").style.display       = "flex";
        document.getElementById("ManageClinicModal").style.display = "flex";
        document.getElementById("clinicHoursModal").style.display  = "flex";
        document.querySelector(".close-btn").click();
        expect(document.getElementById("clinicModal").style.display).toBe("none");
        expect(document.getElementById("ManageClinicModal").style.display).toBe("none");
        expect(document.getElementById("clinicHoursModal").style.display).toBe("none");
    });

    test("clicking modal backdrop closes clinicModal", async () => {
        await load();
        document.getElementById("clinicModal").style.display = "flex";
        const event = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(event, "target", {
            value: document.getElementById("clinicModal"),
            writable: false
        });
        window.dispatchEvent(event);
        expect(document.getElementById("clinicModal").style.display).toBe("none");
    });

    test("clicking modal backdrop closes ManageClinicModal", async () => {
        await load();
        document.getElementById("ManageClinicModal").style.display = "flex";
        const event = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(event, "target", {
            value: document.getElementById("ManageClinicModal"),
            writable: false
        });
        window.dispatchEvent(event);
        expect(document.getElementById("ManageClinicModal").style.display).toBe("none");
    });

    test("clicking modal backdrop closes clinicHoursModal", async () => {
        await load();
        document.getElementById("clinicHoursModal").style.display = "flex";
        const event = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(event, "target", {
            value: document.getElementById("clinicHoursModal"),
            writable: false
        });
        window.dispatchEvent(event);
        expect(document.getElementById("clinicHoursModal").style.display).toBe("none");
    });
});

// =============================================================
// 13. Search
// =============================================================
describe("Search", () => {

    test("filters clinics by name", async () => {
        await loadWithClinics([
            { id: "1", name: "Alpha Clinic", address: "Alpha Rd", status: "Active", service: ["General"],  operatingHours: "N/A", province: "Gauteng" },
            { id: "2", name: "Beta Clinic",  address: "Beta Rd",  status: "Active", service: ["Dental"],   operatingHours: "N/A", province: "Limpopo" }
        ]);
        const search = document.getElementById("clinicSearch");
        search.value = "alpha";
        search.dispatchEvent(new Event("input"));
        expect(document.querySelector(".clinics").textContent).toContain("Alpha Clinic");
        expect(document.querySelector(".clinics").textContent).not.toContain("Beta Clinic");
    });

    test("filters clinics by province", async () => {
        await loadWithClinics([
            { id: "1", name: "Alpha Clinic", address: "Addr 1", status: "Active", service: ["General"], operatingHours: "N/A", province: "Gauteng" },
            { id: "2", name: "Beta Clinic",  address: "Addr 2", status: "Active", service: ["Dental"],  operatingHours: "N/A", province: "Limpopo" }
        ]);
        const search = document.getElementById("clinicSearch");
        search.value = "limpopo";
        search.dispatchEvent(new Event("input"));
        expect(document.querySelector(".clinics").textContent).not.toContain("Alpha Clinic");
        expect(document.querySelector(".clinics").textContent).toContain("Beta Clinic");
    });

    test("filters clinics by status", async () => {
        await loadWithClinics([
            { id: "1", name: "Open Clinic",   address: "Addr 1", status: "Active", service: ["General"], operatingHours: "N/A", province: "Gauteng" },
            { id: "2", name: "Closed Clinic", address: "Addr 2", status: "Closed", service: ["Dental"],  operatingHours: "N/A", province: "Gauteng" }
        ]);
        const search = document.getElementById("clinicSearch");
        search.value = "closed";
        search.dispatchEvent(new Event("input"));
        expect(document.querySelector(".clinics").textContent).toContain("Closed Clinic");
        expect(document.querySelector(".clinics").textContent).not.toContain("Open Clinic");
    });

    test("filters clinics by service", async () => {
        await loadWithClinics([
            { id: "1", name: "Dental Place",   address: "Addr 1", status: "Active", service: ["Dental"],   operatingHours: "N/A", province: "Gauteng" },
            { id: "2", name: "General Clinic", address: "Addr 2", status: "Active", service: ["General"],  operatingHours: "N/A", province: "Gauteng" }
        ]);
        const search = document.getElementById("clinicSearch");
        search.value = "dental";
        search.dispatchEvent(new Event("input"));
        expect(document.querySelector(".clinics").textContent).toContain("Dental Place");
        expect(document.querySelector(".clinics").textContent).not.toContain("General Clinic");
    });

    test("empty string shows all clinics", async () => {
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
});
// =============================================================
// 14. Window click closes modals when target IS the modal
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
