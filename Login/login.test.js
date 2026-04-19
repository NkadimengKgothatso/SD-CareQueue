// Login/login.test.js
//
// Tests the pure logic in authLogic.js.
// No Firebase, no browser, no mocking needed — just plain function calls.

const { handleRedirect, isEmailApproved, getAccessDeniedMessage } = require("./authLogic");

// ════════════════════════════════════════════════════════════════════════════
// handleRedirect()
//
// After a successful login, the app redirects the user to the correct page
// based on their role. Each role has a fixed destination URL.
// ════════════════════════════════════════════════════════════════════════════
describe("handleRedirect()", () => {

  // We pass a jest.fn() as the `navigate` argument so we can check which
  // URL the function tried to navigate to, without a real browser.

  test("redirects a patient to the patient dashboard", () => {
  //jest.fn() is a spy. We use it to check "did the function try to
  //navigate to the right URL?" without actually opening a browser page.  
    const go = jest.fn();// fake function, does nothing but remembers calls
    handleRedirect("patient", go);  // pass it in as the navigate argument
    expect(go).toHaveBeenCalledWith("/Patients_WebPages/PatientDashboard.html");
    //was the fake function called with this URL? yes/no
  });

  test("redirects a staff member to the staff queue page", () => {
    const go = jest.fn();
    handleRedirect("staff", go);
    expect(go).toHaveBeenCalledWith("../Staff_Webpages/Queues.html");
  });

  // Admin now redirects to the Staff Management page
  // This reflects the real login.js behaviour where authorized admins go
  // straight into the admin portal.
  test("redirects an admin to the admin staff management page", () => {
    const go = jest.fn();
    handleRedirect("admin", go);
    expect(go).toHaveBeenCalledWith("/Admin_WebPages/StaffManagement.html");
  });

  // An unrecognised role should not navigate anywhere.
  test("does not navigate for an unrecognised role", () => {
    const go = jest.fn();
    handleRedirect("unknown", go);
    expect(go).not.toHaveBeenCalled();
  });

});

// ════════════════════════════════════════════════════════════════════════════
// isEmailApproved()
//
// In login.js, before a staff or admin user can proceed, their email is
// checked against a list fetched from Firestore (admins collection or
// ApprovedStaff collection). This function performs that check.
// The list is passed in as a plain array so we don't need Firestore in tests.
// ════════════════════════════════════════════════════════════════════════════
describe("isEmailApproved()", () => {

  const approvedList = [
    "admin@carequeue.co.za",
    "thabo@clinic.co.za",
    "amina@clinic.co.za",
  ];

  test("returns true when the email is in the approved list", () => {
    expect(isEmailApproved("thabo@clinic.co.za", approvedList)).toBe(true);
  });

  // Email comparison must be case-insensitive — someone could type
  // "THABO@clinic.co.za" and it should still match.
  test("returns true for an email that differs only in case", () => {
    expect(isEmailApproved("THABO@CLINIC.CO.ZA", approvedList)).toBe(true);
  });

  // An email not in the list must be rejected — this is the access-denied path.
  test("returns false when the email is not in the approved list", () => {
    expect(isEmailApproved("stranger@other.com", approvedList)).toBe(false);
  });

  // Edge cases that should never crash the app.
  test("returns false when the email is an empty string", () => {
    expect(isEmailApproved("", approvedList)).toBe(false);
  });

  test("returns false when the approved list is empty", () => {
    expect(isEmailApproved("thabo@clinic.co.za", [])).toBe(false);
  });

  test("returns false when the approved list is null", () => {
    expect(isEmailApproved("thabo@clinic.co.za", null)).toBe(false);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// getAccessDeniedMessage()
//
// When a login is rejected, the app shows a specific error message depending
// on which role was attempted. This keeps the messaging consistent and
// testable without rendering any UI.
// ════════════════════════════════════════════════════════════════════════════
describe("getAccessDeniedMessage()", () => {

  test("returns the admin denial message for the admin role", () => {
    expect(getAccessDeniedMessage("admin")).toBe(
      "Access denied: You are not authorized as an administrator."
    );
  });

  test("returns the staff denial message for the staff role", () => {
    expect(getAccessDeniedMessage("staff")).toBe(
      "Access denied: Your email is not registered as clinic staff. Please contact your administrator."
    );
  });

  // Any other value should fall through to the generic message.
  test("returns a generic denial message for any other role", () => {
    expect(getAccessDeniedMessage("unknown")).toBe("Access denied.");
  });

});
