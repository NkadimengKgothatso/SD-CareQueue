// StaffManagement.js
//
// This file controls the Staff Management page of the admin portal.
// It talks to Firestore to load, add, and remove staff members,
// and updates the page HTML to show the results.
//
// It deliberately contains NO pure logic — validation, payload building,
// and HTML rendering are all handled by staffLogic.js so they can be
// unit tested separately without needing Firebase or a browser.


import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STAFF_COLLECTION = "ApprovedStaff";
// Holds the signed-in admin user object once the page has loaded.
// Used to record which admin added a staff member.
let currentAdmin = null;


// ─── PAGE INITIALISATION ─────────────────────────────────────────────────────
// initAdminPage() is imported from admin.js. It:
//   1. Checks that the current user is signed in
//   2. Checks that their email is in the admins collection
//   3. Populates the sidebar (name, email, avatar)
//   4. Resolves (returns) the verified admin user object
//
// .then() runs our callback once initAdminPage() has finished.
// We store the user in currentAdmin, then load the page data.
initAdminPage().then(async (user) => {
    currentAdmin = user;
    await loadStaff();
    await loadClinics();
});

// ================= LOAD STAFF =================
// Fetches all documents from the ApprovedStaff collection and renders
// them into the staff table on the page.
async function loadStaff() {
    const tbody   = document.getElementById("staffTableBody");
    const countEl = document.getElementById("staffCount");

    try {
       // getDocs fetches all documents in the ApprovedStaff collection.
        // await pauses here until Firestore responds with the data.
        const snapshot = await getDocs(collection(db, STAFF_COLLECTION));
        // snapshot.size is the total number of documents returned.
        // We display this as the staff count in the card header.
        countEl.textContent = snapshot.size;

 // Build a plain array of staff objects from the Firestore snapshot.
 // Each item gets its Firestore document id added alongside its data fields.       

        const staffList = [];
        snapshot.forEach((docSnap) => {
            staffList.push({ id: docSnap.id, ...docSnap.data() });
        });

// buildStaffTableHTML lives in staffLogic.js (loaded as window.staffLogic).
// It takes the plain array and returns an HTML string.
// Setting innerHTML replaces whatever is currently in the table body.        

        tbody.innerHTML = window.staffLogic.buildStaffTableHTML(staffList);
    } catch (err) {
// If anything goes wrong (e.g. no internet, Firestore rules blocked the read)
// we log the error for debugging and show a toast message to the admin.      
        console.error(" loadStaff error:", err);
        showToast("Failed to load staff", "error");
    }
}

// ================= LOAD CLINICS =================
// Fetches all clinic documents and populates the clinic dropdown
// in the Add Staff modal so the admin can assign a clinic to the new staff member.
async function loadClinics() {
    const select = document.getElementById("staffClinic");

    try {
   // Fetch all clinic documents from the clinicsObjects collection.    
        const snapshot = await getDocs(collection(db, "clinicsObjects"));
        snapshot.forEach((docSnap) => {
            const clinic = docSnap.data();
  // buildClinicOption lives in staffLogic.js.
  // It returns { value, label } for valid clinics, or null if the
// clinic document has no name (broken data — skip it).          
            const opt = window.staffLogic.buildClinicOption(docSnap.id, clinic.name);
            if (!opt) return; // skip clinics with no name
 // Create a real <option> element and add it to the <select> dropdown.
            const option       = document.createElement("option");
            option.value       = opt.value; // Firestore document id
            option.textContent = opt.label;  // human-readable clinic name
            select.appendChild(option);
        });
    } catch (err) {
        console.error("loadClinics error:", err);
    }
}

// ================= ADD STAFF =================
// Called when the admin clicks "Add Staff Member" in the modal.
// Validates the form, builds the Firestore payload, saves it, and refreshes the table.
//
// window.addStaff makes this function available to the onclick attribute in the HTML.
window.addStaff = async function () {

// Read and trim the form field values.
// .trim() removes any accidental leading/trailing spaces the admin may have typed.  
    const name       = document.getElementById("staffName").value.trim();
    const email      = document.getElementById("staffEmail").value.trim();
    const select     = document.getElementById("staffClinic");
    const clinicId   = select.value;
    const clinicName = select.options[select.selectedIndex]?.text || "";


// validateStaffForm lives in staffLogic.js.
// It returns null if everything is filled in, or an error message string
// if any field is missing. We show that message as a toast and stop here.
    const error = window.staffLogic.validateStaffForm(name, email, clinicId);
    if (error) {
        showToast(error, "error");
        return;// stop — do not try to save incomplete data
    }

    try {
  // buildStaffPayload lives in staffLogic.js.
  // It returns a plain object with all the fields the Firestore
 // document needs (including lowercasing the email).    
        const payload = window.staffLogic.buildStaffPayload(
            name, email, clinicName, clinicId, currentAdmin.email
        );
// addDoc saves a new document to Firestore.
// We spread the payload fields in and add a server-generated timestamp.
// serverTimestamp() is set by Firestore on the server, not the client,
// so the time is always accurate regardless of the user's device clock.
        await addDoc(collection(db, STAFF_COLLECTION), {
            ...payload,
            addedAt: serverTimestamp(),
        });
// Clear the form fields so the modal is blank for the next entry.
        document.getElementById("staffName").value   = "";
        document.getElementById("staffEmail").value  = "";
        document.getElementById("staffClinic").value = "";

        closeInviteModal();
        await loadStaff();  // refresh the table so the new staff member appears
        showToast("Staff member added successfully", "success");

    } catch (error) {
        console.error(" Firestore error:", error);
        showToast("Failed to add staff member", "error");
    }
};

// ================= REMOVE STAFF =================
// Called when the admin clicks the Remove button on a staff row.
// The button passes the Firestore document id so we know which record to delete.

// window.removeStaff makes this function available to the onclick in the HTML.

window.removeStaff = async function (id) {
// confirm() shows a browser dialog asking the admin to confirm.
// If they click Cancel, we stop immediately without deleting anything.  
    if (!confirm("Remove this staff member? This cannot be undone.")) return;
    try {
   // deleteDoc removes the document with the given id from Firestore.
  // doc(db, STAFF_COLLECTION, id) builds a reference to that specific document.    
        await deleteDoc(doc(db, STAFF_COLLECTION, id));
        await loadStaff(); // refresh the table so the removed member disappears
        showToast("Staff member removed", "success");
    } catch (err) {
        console.error(" removeStaff error:", err);
        showToast("Failed to remove staff member", "error");
    }
};

// ================= MODAL =================
// These two functions open and close the Add Staff modal by toggling
// the CSS display property between "flex" (visible) and "none" (hidden).
// They are attached to window so the HTML onclick attributes can call them.
window.openInviteModal = function () {
    document.getElementById("inviteModal").style.display = "flex";
};

window.closeInviteModal = function () {
    document.getElementById("inviteModal").style.display = "none";
};

// ================= TOAST =================
// Shows a small notification message at the bottom of the screen.
// 'message' is the text to display.
// 'type' is an optional CSS class — "success" (green) or "error" (red).
//
// After 3000 milliseconds (3 seconds) the toast class is reset to just
// "toast" which hides it again via CSS transitions.
function showToast(message, type = "") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className   = `toast show ${type}`;
    setTimeout(() => { toast.className = "toast"; }, 3000);
}
