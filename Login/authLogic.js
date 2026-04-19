// Login/authLogic.js

function handleRedirect(role, user, navigate) {
//Jest runs in Node.js>there is no real browser,
// so window.location.href doesn't work.
// The optional navigate argument lets tests swap out window.location.href
//"optional"-if navigate is not provided, use window.location.href instead.
//In production/browser,nothing is passed for navigate, 
// so it falls back to window.location.href and the real redirect happens
  const go = navigate || function(url) { window.location.href = url; };
  
   if (role === "patient") {
    go("/Patients_WebPages/PatientDashboard.html");
  } else if (role === "staff") {
    go("../Staff_Webpages/Queues.html");
  } else if (role === "admin") {
    go("/Admin_WebPages/StaffManagement.html");
  }
}
 // ─── VALIDATION ──────────────────────────────────────────────────────────────
// Checks whether an email exists in a list of approved emails.
// Used for both admin and staff access checks.
// `approvedEmails` is a plain array of lowercase email strings — the caller
// is responsible for fetching them from Firestore and passing them in.
function isEmailApproved(email, approvedEmails) {
  if (!email || !Array.isArray(approvedEmails)) return false;
  return approvedEmails.includes(email.toLowerCase().trim());
}


// ─── ERROR MESSAGE BUILDER ────────────────────────────────────────────────────
// Returns the correct user-facing error message for a failed login attempt.
function getAccessDeniedMessage(role) {
  if (role === "admin") {
    return "Access denied: You are not authorized as an administrator.";
  }
  if (role === "staff") {
    return "Access denied: Your email is not registered as clinic staff. Please contact your administrator.";
  }
  return "Access denied.";
}
 
module.exports = { handleRedirect, isEmailApproved, getAccessDeniedMessage };
