beforeEach(() => {
  document.body.innerHTML = `
    <button class="addBtn"></button>

    <div id="clinicModal">
      <form></form>
    </div>

    <div id="ManageClinicModal">
      <form></form>
    </div>

    <div id="clinicHoursModal">
      <form></form>
    </div>

    <button class="close-btn"></button>

    <input id="clinicSearch" />

    <div class="clinics"></div>

    <input id="ManageClinicName" />
    <input id="ManageLocation" />
    <input id="ManageClinicStatus" />
    <input id="manageProvince" />

    <div id="manageClinicServicesDropdown" class="custom-select">
      <div class="select-trigger"></div>

      <div class="select-options">
        <label>
          <input type="checkbox" value="General" />
        </label>

        <label>
          <input type="checkbox" value="Dental" />
        </label>
      </div>
    </div>
  `;

  global.alert = jest.fn();
  global.confirm = jest.fn(() => true);
});

test("getSelectedServices returns checked services", async () => {
  const { getSelectedServices } =
    await import("./ClinicManagement.js");

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );

  boxes[0].checked = true;

  const result =
    getSelectedServices("manageClinicServicesDropdown");

  expect(result).toContain("General");
});

test("clearServices unchecks all services", async () => {
  const { clearServices } =
    await import("./ClinicManagement.js");

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );

  boxes[0].checked = true;
  boxes[1].checked = true;

  clearServices("manageClinicServicesDropdown");

  expect(boxes[0].checked).toBe(false);
  expect(boxes[1].checked).toBe(false);
});

test("preselectServices checks matching services", async () => {
  const { preselectServices } =
    await import("./ClinicManagement.js");

  preselectServices(
    "manageClinicServicesDropdown",
    ["Dental"]
  );

  const boxes = document.querySelectorAll(
    "#manageClinicServicesDropdown input"
  );

  expect(boxes[0].checked).toBe(false);
  expect(boxes[1].checked).toBe(true);
});

test("updateTriggerLabel updates dropdown text", async () => {
  const { updateTriggerLabel } =
    await import("./ClinicManagement.js");

  const dropdown = document.getElementById(
    "manageClinicServicesDropdown"
  );

  const boxes = dropdown.querySelectorAll("input");

  boxes[0].checked = true;

  updateTriggerLabel(dropdown);

  expect(dropdown.querySelector(".select-trigger").textContent)
    .toContain("General");
});

test("openEditModal fills form fields", async () => {
  const { openEditModal } =
    await import("./ClinicManagement.js");

  openEditModal(
    "1",
    "Care Clinic",
    "123 Main",
    "Active",
    ["General"],
    "Gauteng"
  );

  expect(document.getElementById("ManageClinicName").value)
    .toBe("Care Clinic");

  expect(document.getElementById("ManageLocation").value)
    .toBe("123 Main");

  expect(document.getElementById("manageProvince").value)
    .toBe("Gauteng");
});

test("addClinicToUI renders clinic card", async () => {
  const { addClinicToUI } =
    await import("./ClinicManagement.js");

  addClinicToUI(
    "1",
    "Care Clinic",
    "123 Main",
    "Active",
    ["General"],
    "08:00-17:00",
    "Gauteng"
  );

  expect(document.body.textContent)
    .toContain("Care Clinic");

  expect(document.body.textContent)
    .toContain("Gauteng");

  expect(document.body.textContent)
    .toContain("08:00-17:00");
});