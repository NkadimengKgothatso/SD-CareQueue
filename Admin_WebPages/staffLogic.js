// Admin_WebPages/staffLogic.js
// WHY THIS FILE EXISTS:
// StaffManagement.js talks to Firebase and the DOM, which makes it hard to
// unit test. We moved the PURE logic (no side effects, no network, no DOM)
// into this file so Jest can call these functions directly with plain inputs
// and check the outputs — fast, reliable, no mocking needed.
//it works cause StaffManagement.js depends on the logic(aka this file).


// ─── VALIDATION ──────────────────────────────────────────────────────────────
/**
 * Returns an error message string if any required field is missing,
 or null if all fields are valid.
  
  Used by StaffManagement.js before sending the invite to Firestore.
  Returning null (not true) is a common pattern: "no error means success".
 */
function validateStaffForm(name, email, clinicId) {
  if (!name || !email || !clinicId) {
    return "Please fill all fields";
  }
  return null;
}

// ─── DATA BUILDERS ───────────────────────────────────────────────────────────

/**
 * Builds the Firestore document payload for a new staff member.
 * Lowercases the email before saving.
 */
function buildStaffPayload(name, email, clinicName, clinicId, addedByEmail) {
  return {
    displayName:    name,
    email:          email.toLowerCase(),
    assignedClinic: clinicName,
    clinicId:       clinicId,
    addedBy:        addedByEmail,
  };
}

// ─── RENDERING ───────────────────────────────────────────────────────────────

/*
 Builds the HTML string for the staff table body.
 Returns the empty-state row if the list is empty.
  
  StaffManagement.js takes this string and drops it into <tbody>.innerHTML.
 Keeping HTML generation here (instead of in StaffManagement.js) lets us
  test that the right rows are produced without needing a real browser.
 
 */
function buildStaffTableHTML(staffList) {
   // If there are no staff, show a single "no staff" row.
  if (staffList.length === 0) {
    return `
      <tr>
        <td colspan="4" style="text-align:center; padding:40px; color:var(--color-text-tertiary);">
          No staff members yet
        </td>
      </tr>
    `;
  }
// For each staff object, build a <tr>. Then .join("") glues all the row
  // strings together into one big HTML string ready to be inserted.
  return staffList
    .map(({ id, displayName, email, assignedClinic }) => `
      <tr>
        <td>${displayName || "-"}</td>
        <td>${email       || "-"}</td>
        <td>${assignedClinic || "-"}</td>
        <td>
          <button
            class="btn btn-small"
            style="color:#dc2626; border-color:#fca5a5;"
            onclick="removeStaff('${id}')">
            Remove
          </button>
        </td>
      </tr>
    `)
    .join("");
}

/*
 Builds a clinic <option> element value/label pair.
 Returns null if the clinic has no name (should be skipped).
 StaffManagement.js filters out the nulls before building the dropdown.
 */
function buildClinicOption(id, name) {
  if (!name) return null;
  return { value: id, label: name };
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

/*
 Returns the character to display in the sidebar avatar.
 Uses first letter of display name, falls back to first letter of email.
 */
function getAvatarLetter(displayName, email) {
  const source = (displayName || email || "");
  return source.charAt(0).toUpperCase();
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

// We export the SAME functions in two different ways so this one file
// works in BOTH environments:
//   1. Node.js / Jest   > module.exports (CommonJS)
//   2. Browser <script> tag >window.staffLogic (global object)

//1.So this block says:“If we are in Node > export these functions 
// //so tests can use them”
//Node lets you run JavaScript ,outside the browser,without HTML,without UI
//we use node cause it allows us to test logic quickly without relying on
//  the browser, DOM, or Firebase.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
  validateStaffForm,
  buildStaffPayload,
  buildStaffTableHTML,
  buildClinicOption,
  getAvatarLetter,
};
}

// Browser global (for StaffManagement.js which loads via <script>)
if (typeof window !== "undefined") {
  window.staffLogic = {
    validateStaffForm,
    buildStaffPayload,
    buildStaffTableHTML,
    buildClinicOption,
    getAvatarLetter,
  };
}

