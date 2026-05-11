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

        <section class="modal" id="clinicModal">
            <section class="modal-content">
                <span class="close-btn">&times;</span>
                <form class="clinicForm">
                    <input id="clinicName" value="" />
                    <input id="Location"   value="" />
                    <select id="clinicStatus">
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                        <option value="Busy">Busy</option>
                    </select>
                    <select id="province">
                        <option value="" disabled selected>Select Province</option>
                        <option value="Gauteng">Gauteng</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="Western Cape">Western Cape</option>
                    </select>
                    <section class="custom-select" id="clinicServicesDropdown">
                        <section class="select-trigger">Select Services</section>
                        <section class="select-options">
                            <label><input type="checkbox" value="General" /></label>
                            <label><input type="checkbox" value="Emergency" /></label>
                            <label><input type="checkbox" value="Dental" /></label>
                        </section>
                    </section>
                    <button type="submit">Add Clinic</button>
                </form>
            </section>
        </section>

        <section class="ManageModal" id="ManageClinicModal">
            <section class="modal-content">
                <span class="close-btn">&times;</span>
                <form class="clinicForm">
                    <input id="ManageClinicName" value="" />
                    <input id="ManageLocation"   value="" />
                    <select id="ManageClinicStatus">
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                        <option value="Busy">Busy</option>
                    </select>
                    <select id="manageProvince">
                        <option value="" disabled selected>Select Province</option>
                        <option value="Gauteng">Gauteng</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="Western Cape">Western Cape</option>
                    </select>
                    <section class="custom-select" id="manageClinicServicesDropdown">
                        <section class="select-trigger">Select Services</section>
                        <section class="select-options">
                            <label><input type="checkbox" value="General" /></label>
                            <label><input type="checkbox" value="Emergency" /></label>
                            <label><input type="checkbox" value="Dental" /></label>
                        </section>
                    </section>
                    <button type="submit">Update Clinic</button>
                </form>
            </section>
        </section>

        <section class="modal" id="clinicHoursModal">
            <section class="modal-content">
                <span class="close-btn">&times;</span>
                <form class="clinicForm">
                    <select id="startDay">
                        <option value="" disabled selected>Start Day</option>
                        <option value="Mon">Monday</option>
                        <option value="Tue">Tuesday</option>
                        <option value="Wed">Wednesday</option>
                        <option value="Thu">Thursday</option>
                        <option value="Fri">Friday</option>
                        <option value="Sat">Saturday</option>
                        <option value="Sun">Sunday</option>
                    </select>
                    <select id="endDay">
                        <option value="" disabled selected>End Day</option>
                        <option value="Mon">Monday</option>
                        <option value="Tue">Tuesday</option>
                        <option value="Wed">Wednesday</option>
                        <option value="Thu">Thursday</option>
                        <option value="Fri">Friday</option>
                        <option value="Sat">Saturday</option>
                        <option value="Sun">Sunday</option>
                    </select>
                    <select id="startTime">
                        <option value="6am">6:00 AM</option>
                        <option value="7am">7:00 AM</option>
                        <option value="8am">8:00 AM</option>
                        <option value="9am">9:00 AM</option>
                        <option value="10am">10:00 AM</option>
                        <option value="11am">11:00 AM</option>
                        <option value="12pm">12:00 PM</option>
                        <option value="1pm">1:00 PM</option>
                        <option value="2pm">2:00 PM</option>
                        <option value="3pm">3:00 PM</option>
                        <option value="4pm">4:00 PM</option>
                        <option value="5pm">5:00 PM</option>
                        <option value="6pm">6:00 PM</option>
                        <option value="7pm">7:00 PM</option>
                        <option value="8pm">8:00 PM</option>
                    </select>
                    <select id="endTime">
                        <option value="6am">6:00 AM</option>
                        <option value="7am">7:00 AM</option>
                        <option value="8am">8:00 AM</option>
                        <option value="9am">9:00 AM</option>
                        <option value="10am">10:00 AM</option>
                        <option value="11am">11:00 AM</option>
                        <option value="12pm">12:00 PM</option>
                        <option value="1pm">1:00 PM</option>
                        <option value="2pm">2:00 PM</option>
                        <option value="3pm">3:00 PM</option>
                        <option value="4pm">4:00 PM</option>
                        <option value="5pm">5:00 PM</option>
                        <option value="6pm">6:00 PM</option>
                        <option value="7pm">7:00 PM</option>
                        <option value="8pm">8:00 PM</option>
                    </select>
                    <button type="submit">Update Operating Hours</button>
                </form>
            </section>
        </section>

        <input id="clinicSearch" />
        <div class="clinics"></div>
    `;
}

// ── Setup ─────────────────────────────────────────────────────
beforeEach(() => {
    buildDOM();
    global.alert   = jest.fn();
    global.confirm = jest.fn(() => true);
    jest.resetModules();
});

// ── Helpers ───────────────────────────────────────────────────
async function load() {
    return import("./clinicManagement.js");
}

// Finds a checkbox by value — immune to ordering changes
function getCheckbox(dropdownId, value) {
    return document.querySelector(`#${dropdownId} input[value="${value}"]`);
}

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

    const mod = await load();
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
        openEditModal("1", "Care Clinic", "123 Main", "Active", ["General"], "Gauteng");
        expect(document.getElementById("ManageClinicName").value).toBe("Care Clinic");
        expect(document.getElementById("ManageLocation").value).toBe("123 Main");
        expect(document.getElementById("manageProvince").value).toBe("Gauteng");
    });

    test("opens the manage modal", async () => {
        const { openEditModal } = await load();
        openEditModal("2", "Test Clinic", "Road X", "Active", [], "Limpopo");
        expect(document.getElementById("ManageClinicModal").style.display).toBe("flex");
    });

    test("defaults province to empty string when not provided", async () => {
        const { openEditModal } = await load();
        openEditModal("3", "No Province", "Somewhere", "Active", []);
        expect(document.getElementById("manageProvince").value).toBe("");
    });

    test("preselects services in the dropdown", async () => {
        const { openEditModal } = await load();
        openEditModal("4", "Service Clinic", "Road A", "Active", ["Dental"], "Gauteng");
        expect(getCheckbox("manageClinicServicesDropdown", "Dental").checked).toBe(true);
        expect(getCheckbox("manageClinicServicesDropdown", "General").checked).toBe(false);
    });

    test("sets the correct status value", async () => {
        const { openEditModal } = await load();
        openEditModal("5", "Closed Clinic", "Road B", "Closed", [], "Gauteng");
        expect(document.getElementById("ManageClinicStatus").value).toBe("Closed");
    });

    test("stores editingClinicId so manage form updates the right doc", async () => {
        const { openEditModal } = await load();
        const { updateDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );

        openEditModal("clinic-99", "Target Clinic", "Road C", "Active", [], "Gauteng");

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
        addClinicToUI("1", "Care Clinic", "123 Main", "Active", ["General"], "08:00-17:00", "Gauteng");
        expect(document.body.textContent).toContain("Care Clinic");
    });

    test("renders clinic card with province", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("1", "Care Clinic", "123 Main", "Active", ["General"], "08:00-17:00", "Gauteng");
        expect(document.body.textContent).toContain("Gauteng");
    });

    test("renders clinic card with operating hours", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("1", "Care Clinic", "123 Main", "Active", ["General"], "08:00-17:00", "Gauteng");
        expect(document.body.textContent).toContain("08:00-17:00");
    });

    test("renders multiple services as individual chips", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("2", "Multi Service", "Road X", "Active", ["General", "Dental", "Emergency"], "09:00-17:00", "Gauteng");
        const chips = document.querySelectorAll(".services");
        expect(chips).toHaveLength(3);
    });

    test("handles string service", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("3", "String Clinic", "Main Road", "Busy", "Emergency", "Hours not available", "Western Cape");
        expect(document.body.textContent).toContain("Emergency");
        expect(document.body.textContent).toContain("Hours not specified");
    });

    test("falls back to General when service is null", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("5", "Fallback Clinic", "Somewhere", "Active", null, "09:00-13:00", "Gauteng");
        expect(document.body.textContent).toContain("General");
    });

    test("omits province when it is 'unknown' (lowercase)", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("6", "Unknown Prov Clinic", "Road Y", "Active", ["Dental"], "10:00-14:00", "unknown");
        const location = document.querySelector(".Location");
        expect(location.textContent).not.toContain(", unknown");
    });

    test("omits province when it is 'Unknown' (capitalised)", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("6b", "Unknown Prov Clinic 2", "Road Z", "Active", ["Dental"], "10:00-14:00", "Unknown");
        const location = document.querySelector(".Location");
        expect(location.textContent).not.toContain(", Unknown");
    });

    test("shows province when it is valid", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("6c", "Valid Province Clinic", "Road A", "Active", ["Dental"], "10:00-14:00", "Limpopo");
        const location = document.querySelector(".Location");
        expect(location.textContent).toContain("Limpopo");
    });

    test("shows Hours not specified when hours is null", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("7", "No Hours Clinic", "Road H", "Active", ["General"], null, "Gauteng");
        expect(document.body.textContent).toContain("Hours not specified");
    });

    test("applies correct colour for Active status", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("8a", "Active Clinic", "Active Road", "Active", ["General"], "N/A", "Gauteng");
        const statusEl = document.querySelector("#status");
        expect(statusEl.style.color).toBe("rgb(22, 101, 52)");
    });

    test("applies correct colour for Closed status", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("7", "Closed Clinic", "Closed Road", "Closed", ["General"], "N/A", "Gauteng");
        const statusEl = document.querySelector("#status");
        expect(statusEl.style.color).toBe("rgb(153, 27, 27)");
    });

    test("applies correct colour for Busy status", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("8", "Busy Clinic", "Busy Road", "Busy", ["General"], "N/A", "Gauteng");
        const statusEl = document.querySelector("#status");
        expect(statusEl.style.color).toBe("rgb(55, 65, 81)");
    });

    test("defaults to Active colours for unknown status", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("8b", "Pending Clinic", "Road X", "Pending", ["General"], "N/A", "Gauteng");
        const statusEl = document.querySelector("#status");
        expect(statusEl.style.color).toBe("rgb(22, 101, 52)");
    });
});

// =============================================================
// 7. addClinicToUI – hours button
// =============================================================
describe("addClinicToUI - hours button", () => {

    test("opens clinicHoursModal", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("4", "Hours Clinic", "Side Road", "Active", ["General"], "Mon-Fri: 8am-5pm", "Gauteng");
        document.querySelector(".hours-btn").click();
        expect(document.getElementById("clinicHoursModal").style.display).toBe("flex");
    });

    test("populates fields when hours match the expected pattern", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("10", "Pattern Clinic", "Pattern Rd", "Active", ["General"], "Mon-Fri: 8am-5pm", "Gauteng");
        document.querySelector(".hours-btn").click();
        expect(document.getElementById("startDay").value).toBe("Mon");
        expect(document.getElementById("endDay").value).toBe("Fri");
        expect(document.getElementById("startTime").value).toBe("8am");
        expect(document.getElementById("endTime").value).toBe("5pm");
    });

    test("clears fields when hours do not match the pattern", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("11", "No Pattern Clinic", "No Pattern Rd", "Active", ["General"], "Hours not specified", "Gauteng");
        document.querySelector(".hours-btn").click();
        expect(document.getElementById("startDay").value).toBe("");
        expect(document.getElementById("endDay").value).toBe("");
        expect(document.getElementById("startTime").value).toBe("");
        expect(document.getElementById("endTime").value).toBe("");
    });

    test("clears fields when operatingHours is null", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("12", "Null Hours Clinic", "Null Rd", "Active", ["General"], null, "Gauteng");
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
        addClinicToUI("9", "Manage Clinic", "Manage Rd", "Active", ["General"], "08:00-17:00", "Gauteng");
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("ManageClinicModal").style.display).toBe("flex");
    });

    test("fills in ManageClinicName", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("9b", "Edit Me Clinic", "Edit Road", "Active", ["Dental"], "09:00-15:00", "Limpopo");
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("ManageClinicName").value).toBe("Edit Me Clinic");
    });

    test("fills in ManageLocation", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("9c", "Edit Location", "Target Road", "Active", ["Dental"], "09:00-15:00", "Limpopo");
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("ManageLocation").value).toBe("Target Road");
    });

    test("fills in province", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("9d", "Province Clinic", "Province Rd", "Active", ["General"], "08:00-17:00", "Western Cape");
        document.querySelector(".manage-btn").click();
        expect(document.getElementById("manageProvince").value).toBe("Western Cape");
    });

    test("preselects correct services in manage dropdown", async () => {
        const { addClinicToUI } = await load();
        addClinicToUI("9e", "Service Edit Clinic", "Svc Rd", "Active", ["Dental"], "08:00-17:00", "Gauteng");
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
        addClinicToUI("12", "Delete Me", "Delete Rd", "Active", ["General"], "08:00-17:00", "Gauteng");
        expect(document.querySelectorAll(".clinic").length).toBe(1);
        await document.querySelector(".delete-btn").click();
        await Promise.resolve();
        expect(document.querySelectorAll(".clinic").length).toBe(0);
    });

    test("does nothing when confirm returns false", async () => {
        const { addClinicToUI } = await load();
        global.confirm = jest.fn(() => false);
        addClinicToUI("13", "Keep Me", "Keep Rd", "Active", ["General"], "08:00-17:00", "Gauteng");
        document.querySelector(".delete-btn").click();
        expect(document.querySelectorAll(".clinic").length).toBe(1);
    });

    test("calls deleteDoc with the correct id", async () => {
        const { addClinicToUI } = await load();
        const { deleteDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );
        global.confirm = jest.fn(() => true);
        addClinicToUI("target-id", "Target Clinic", "Target Rd", "Active", ["General"], "08:00-17:00", "Gauteng");
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
        addClinicToUI("old", "Old Clinic", "Old Rd", "Active", [], "N/A", "Gauteng");
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
// 11. Modal controls
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
// 12. Search
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

    test("search is case insensitive", async () => {
        await loadWithClinics([
            { id: "1", name: "Alpha Clinic", address: "Addr 1", status: "Active", service: ["General"], operatingHours: "N/A", province: "Gauteng" }
        ]);
        const search = document.getElementById("clinicSearch");
        search.value = "ALPHA";
        search.dispatchEvent(new Event("input"));
        expect(document.querySelector(".clinics").textContent).toContain("Alpha Clinic");
    });

    test("no match shows empty clinics container", async () => {
        await loadWithClinics([
            { id: "1", name: "Alpha Clinic", address: "Addr 1", status: "Active", service: ["General"], operatingHours: "N/A", province: "Gauteng" }
        ]);
        const search = document.getElementById("clinicSearch");
        search.value = "zzznomatch";
        search.dispatchEvent(new Event("input"));
        expect(document.querySelectorAll(".clinic").length).toBe(0);
    });

    test("filters clinics by address", async () => {
        await loadWithClinics([
            { id: "1", name: "Clinic A", address: "Main Street",  status: "Active", service: ["General"], operatingHours: "N/A", province: "Gauteng" },
            { id: "2", name: "Clinic B", address: "Church Avenue", status: "Active", service: ["General"], operatingHours: "N/A", province: "Gauteng" }
        ]);
        const search = document.getElementById("clinicSearch");
        search.value = "main street";
        search.dispatchEvent(new Event("input"));
        expect(document.querySelector(".clinics").textContent).toContain("Clinic A");
        expect(document.querySelector(".clinics").textContent).not.toContain("Clinic B");
    });
});