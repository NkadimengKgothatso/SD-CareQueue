// Login/login.test.js

const { handleRedirect } = require("./authLogic");

global.showPlaceholder = jest.fn();

const assignMock = jest.fn();

delete window.location;
window.location = { assign: assignMock };

describe("Login Role Redirect Tests", () => {

  beforeEach(() => {
    assignMock.mockClear();
    jest.clearAllMocks();
  });

  test("Patient role redirects to patient dashboard", () => {
    handleRedirect("patient", { displayName: "John" });
    expect(assignMock).toHaveBeenCalledWith("../Patients_WebPages/PatientDashboard.html");
  });

  test("Staff role redirects to staff queue page", () => {
    handleRedirect("staff", { displayName: "Jane" });
    expect(assignMock).toHaveBeenCalledWith("../Staff_Webpages/Queues.html");
  });

  test("Admin role shows placeholder instead of redirect", () => {
    handleRedirect("admin", { displayName: "AdminUser" });
    expect(global.showPlaceholder).toHaveBeenCalledWith("admin", { displayName: "AdminUser" });
    expect(assignMock).not.toHaveBeenCalled();
  });

});
