// Login/login.test.js

const { handleRedirect } = require("./authLogic");

global.showPlaceholder = jest.fn();

describe("Login Role Redirect Tests", () => {

  beforeEach(() => {
    window.location.assign = jest.fn();
    jest.clearAllMocks();
  });

  test("Patient role redirects to patient dashboard", () => {
    handleRedirect("patient", { displayName: "John" });
    expect(window.location.assign).toHaveBeenCalledWith("../Patients_WebPages/PatientDashboard.html");
  });

  test("Staff role redirects to staff queue page", () => {
    handleRedirect("staff", { displayName: "Jane" });
    expect(window.location.assign).toHaveBeenCalledWith("../Staff_Webpages/Queues.html");
  });

  test("Admin role shows placeholder instead of redirect", () => {
    handleRedirect("admin", { displayName: "AdminUser" });
    expect(global.showPlaceholder).toHaveBeenCalledWith("admin", { displayName: "AdminUser" });
    expect(window.location.assign).not.toHaveBeenCalled();
  });

});
