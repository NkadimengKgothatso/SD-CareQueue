beforeEach(() => {
  document.body.innerHTML = `
    <div id="inviteModal" style="display:none"></div>

    <div id="toast" class="toast"></div>

    <table>
      <tbody id="staffTableBody"></tbody>
    </table>

    <div id="staffCount"></div>

    <input id="staffName" />
    <input id="staffEmail" />

    <select id="staffClinic">
      <option value="">Select</option>
      <option value="1">Clinic A</option>
    </select>
  `;

  jest.useFakeTimers();

  global.confirm = jest.fn(() => true);

  window.staffLogic = {
    buildStaffTableHTML: jest.fn(() => "<tr></tr>"),
    buildClinicOption: jest.fn((id, name) => ({
      value: id,
      label: name
    })),
    validateStaffForm: jest.fn(() => null),
    buildStaffPayload: jest.fn(() => ({
      displayName: "Test User"
    }))
  };
});

afterEach(() => {
  jest.useRealTimers();
});

test("openInviteModal shows modal", async () => {
  await import("./StaffManagement.js");

  window.openInviteModal();

  expect(
    document.getElementById("inviteModal").style.display
  ).toBe("flex");
});

test("closeInviteModal hides modal", async () => {
  await import("./StaffManagement.js");

  window.closeInviteModal();

  expect(
    document.getElementById("inviteModal").style.display
  ).toBe("none");
});

test("showToast displays message", async () => {
  const { showToast } =
    await import("./StaffManagement.js");

  showToast("Saved successfully", "success");

  const toast = document.getElementById("toast");

  expect(toast.textContent)
    .toContain("Saved successfully");

  expect(toast.className)
    .toContain("success");
});

test("showToast resets after timeout", async () => {
  const { showToast } =
    await import("./StaffManagement.js");

  showToast("Saved", "success");

  jest.advanceTimersByTime(3000);

  expect(document.getElementById("toast").className)
    .toBe("toast");
});

test("staffClinic select exists", () => {
  expect(document.getElementById("staffClinic"))
    .not.toBeNull();
});

test("staff table body exists", () => {
  expect(document.getElementById("staffTableBody"))
    .not.toBeNull();
});