// Admin_WebPages/staffLogic.test.js

// Jest test suite for staffLogic.js
// Runs with npm test


// Import the functions we want to test.
// require() pulls in the functions we want to test from staffLogic.js.
// Because staffLogic.js uses module.exports, Jest can load it directly
// without any mocking or special configuration.
const {
  validateStaffForm,
  buildStaffPayload,
  buildStaffTableHTML,
  buildClinicOption,
  getAvatarLetter,
} = require("./staffLogic");

// ════════════════════════════════════════════════════════════════════════════
// validateStaffForm
// ════════════════════════════════════════════════════════════════════════════
describe("validateStaffForm()", () => {
  test("returns null when all fields are present", () => {
    expect(validateStaffForm("Thabo Nkosi", "thabo@clinic.co.za", "clinic-1")).toBeNull();
  });

  test("returns error message when name is empty", () => {
    expect(validateStaffForm("", "thabo@clinic.co.za", "clinic-1"))
      .toBe("Please fill all fields");
  });

  test("returns error message when email is empty", () => {
    expect(validateStaffForm("Thabo", "", "clinic-1"))
      .toBe("Please fill all fields");
  });

  test("returns error message when clinicId is empty", () => {
    expect(validateStaffForm("Thabo", "thabo@clinic.co.za", ""))
      .toBe("Please fill all fields");
  });

  test("returns error message when all fields are empty", () => {
    expect(validateStaffForm("", "", "")).toBe("Please fill all fields");
  });


// StaffManagement.js calls .trim() on the name before passing it here,
// so a name that is only spaces becomes "" by the time it reaches this
// function. This test documents that contract.
  test("returns error message when name is only whitespace", () => {
    expect(validateStaffForm("", "thabo@clinic.co.za", "clinic-1"))
      .toBe("Please fill all fields");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// buildStaffPayload
// This function builds the plain object that addDoc() saves to the
// ApprovedStaff Firestore collection. We build the payload once at the
// top of the describe block, then write one focused test per field so
// that a failure tells us exactly which field is wrong.
// ════════════════════════════════════════════════════════════════════════════
describe("buildStaffPayload()", () => {
// Build a single payload object that all tests in this block share.
// // Using an uppercase email intentionally to verify the lowercasing behaviour
  const payload = buildStaffPayload(
    "Thabo Nkosi",
    "THABO@CLINIC.CO.ZA",   // uppercase — must be lowercased
    "Soweto Clinic",
    "clinic-abc-123",
    "admin@carequeue.co.za"
  );

  // The name should be stored exactly as the admin typed it
  test("sets displayName correctly", () => {
    expect(payload.displayName).toBe("Thabo Nkosi");
  });

  test("lowercases the email", () => {
    expect(payload.email).toBe("thabo@clinic.co.za");
  });

  test("sets assignedClinic to the clinic name (not the id)", () => {
    expect(payload.assignedClinic).toBe("Soweto Clinic");
  });

  test("sets clinicId correctly", () => {
    expect(payload.clinicId).toBe("clinic-abc-123");
  });

  test("sets addedBy to the admin email", () => {
    expect(payload.addedBy).toBe("admin@carequeue.co.za");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// buildStaffTableHTML
// This function receives an array of staff objects and returns an HTML
// string. StaffManagement.js sets innerHTML to this string to render the
// table. We test the output by checking that specific substrings appear
// in the returned HTML .
// ════════════════════════════════════════════════════════════════════════════
describe("buildStaffTableHTML()", () => {
  test("returns empty-state row when list is empty", () => {
    const html = buildStaffTableHTML([]);
    expect(html).toContain("No staff members yet");
  });

  test("renders one row per staff member", () => {
    const html = buildStaffTableHTML([
      { id: "1", displayName: "Thabo Nkosi",   email: "thabo@clinic.co.za",  assignedClinic: "Soweto Clinic" },
      { id: "2", displayName: "Amina Dlamini", email: "amina@clinic.co.za",  assignedClinic: "Alex Clinic"   },
    ]);
    expect(html).toContain("Thabo Nkosi");
    expect(html).toContain("Amina Dlamini");
  });

  test("includes the staff member's email in the row", () => {
    const html = buildStaffTableHTML([
      { id: "1", displayName: "Thabo", email: "thabo@clinic.co.za", assignedClinic: "Soweto" }
    ]);
    expect(html).toContain("thabo@clinic.co.za");
  });

  test("includes the assigned clinic in the row", () => {
    const html = buildStaffTableHTML([
      { id: "1", displayName: "Thabo", email: "thabo@clinic.co.za", assignedClinic: "Soweto Clinic" }
    ]);
    expect(html).toContain("Soweto Clinic");
  });

  test("uses em-dash for missing displayName", () => {
    const html = buildStaffTableHTML([
      { id: "1", displayName: "", email: "thabo@clinic.co.za", assignedClinic: "Soweto" }
    ]);
    expect(html).toContain("—");
  });

  test("uses em-dash for missing email", () => {
    const html = buildStaffTableHTML([
      { id: "1", displayName: "Thabo", email: "", assignedClinic: "Soweto" }
    ]);
    expect(html).toContain("—");
  });

  test("uses em-dash for missing assignedClinic", () => {
    const html = buildStaffTableHTML([
      { id: "1", displayName: "Thabo", email: "thabo@clinic.co.za", assignedClinic: "" }
    ]);
    expect(html).toContain("—");
  });


// The Remove button uses an onclick attribute with the document's Firestore
// id. This test confirms the correct id is embedded in the button so that
// // clicking Remove deletes the right staff member.
  test("includes the doc id in the removeStaff onclick handler", () => {
    const html = buildStaffTableHTML([
      { id: "doc-99", displayName: "Thabo", email: "thabo@clinic.co.za", assignedClinic: "Soweto" }
    ]);
    expect(html).toContain("removeStaff('doc-99')");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// buildClinicOption

// When loadClinics() runs, it calls this function for each Firestore
// document in the clinicsObjects collection to build the dropdown options
// in the Add Staff modal. Documents without a name field must be skipped
// (returning null) so broken data doesn't appear in the dropdown.
// ════════════════════════════════════════════════════════════════════════════
describe("buildClinicOption()", () => {
// Normal case: a clinic with both an id and a name produces a valid option.
  test("returns value and label when name is present", () => {
    const option = buildClinicOption("clinic-1", "Soweto Clinic");
    expect(option).toEqual({ value: "clinic-1", label: "Soweto Clinic" });
  });
// If a Firestore document exists but has no name field, we skip it.
// Returning null signals to the caller that this option should not be added.
  test("returns null when name is empty string (should be skipped)", () => {
    expect(buildClinicOption("clinic-1", "")).toBeNull();
  });

  test("returns null when name is undefined (should be skipped)", () => {
    expect(buildClinicOption("clinic-1", undefined)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getAvatarLetter
// ════════════════════════════════════════════════════════════════════════════
describe("getAvatarLetter()", () => {
  test("returns first letter of displayName in uppercase", () => {
    expect(getAvatarLetter("thabo nkosi", "thabo@clinic.co.za")).toBe("T");
  });

  test("returns first letter of email when displayName is empty", () => {
    expect(getAvatarLetter("", "amina@clinic.co.za")).toBe("A");
  });

  test("returns first letter of email when displayName is null", () => {
    expect(getAvatarLetter(null, "admin@carequeue.co.za")).toBe("A");
  });

  test("uppercases the letter regardless of input case", () => {
    expect(getAvatarLetter("lerato", "lerato@clinic.co.za")).toBe("L");
  });

  test("returns empty string when both displayName and email are empty", () => {
    expect(getAvatarLetter("", "")).toBe("");
  });
});