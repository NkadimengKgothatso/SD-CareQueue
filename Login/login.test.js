// Login/login.test.js

const { handleRedirect } = require("./authLogic");

global.showPlaceholder = jest.fn();

let assignMock;

beforeEach(() => {
  assignMock = jest.fn();
  jest.spyOn(window.location, "assign").mockImplementation(assignMock);
  jest.clearAllMocks();
});

describe("Login Role Redirect Tests", () => {

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
