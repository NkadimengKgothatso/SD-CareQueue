// Login/authLogic.js

function handleRedirect(role, user) {
  if (role === "patient") {
    window.location.href = "../Patients_WebPages/PatientDashboard.html";
  } else if (role === "staff") {
    window.location.href = "../Staff_Webpages/Queues.html";
  } else if (role === "admin") {
    showPlaceholder(role, user);
  }
}

module.exports = { handleRedirect };