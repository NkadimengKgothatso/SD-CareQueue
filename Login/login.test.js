// Login/login.test.js

const { handleRedirect } = require("./authLogic");

global.showPlaceholder = jest.fn();

describe("Login Role Redirect Tests", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Patient role redirects to patient dashboard", () => {
    const go = jest.fn();
    handleRedirect("patient", { displayName: "John" }, go);
    expect(go).toHaveBeenCalledWith("../Patients_WebPages/PatientDashboard.html");
  });

  test("Staff role redirects to staff queue page", () => {
    const go = jest.fn();
    handleRedirect("staff", { displayName: "Jane" }, go);
    expect(go).toHaveBeenCalledWith("../Staff_Webpages/Queues.html");
  });

  test("Admin role shows placeholder instead of redirect", () => {
    const go = jest.fn();
    handleRedirect("admin", { displayName: "AdminUser" }, go);
    expect(global.showPlaceholder).toHaveBeenCalledWith("admin", { displayName: "AdminUser" });
    expect(go).not.toHaveBeenCalled();
  });

});
