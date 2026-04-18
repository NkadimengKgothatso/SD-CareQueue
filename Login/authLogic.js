// Login/authLogic.js

function handleRedirect(role, user, navigate) {
  const go = navigate || function(url) { window.location.href = url; };
  
  if (role === "patient") {
    go("../Patients_WebPages/PatientDashboard.html");
  } else if (role === "staff") {
    go("../Staff_Webpages/Queues.html");
  } else if (role === "admin") {
    showPlaceholder(role, user);
  }
}

module.exports = { handleRedirect };
