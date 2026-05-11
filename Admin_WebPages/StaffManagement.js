// StaffManagement.js
//
// Staff Management page controller (ADMIN)
// Fully self-contained version (NO staffLogic.js dependency)

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

let currentAdmin = null;

initAdminPage().then(async (user) => {
    currentAdmin = user;
    await loadStaff();
    await loadClinics();
});


// ================= STAFF TABLE RENDER =================
function buildStaffTableHTML(staffList) {
    if (!staffList.length) {
        return `
            <tr>
                <td colspan="4" style="text-align:center; padding:40px;">
                    No staff members found
                </td>
            </tr>
        `;
    }

    return staffList.map(staff => `
        <tr>
            <td>${staff.name || "-"}</td>
            <td>${staff.email || "-"}</td>
            <td>${staff.clinicName || "Unassigned"}</td>
            <td>
                <button onclick="removeStaff('${staff.id}')">Remove</button>
            </td>
        </tr>
    `).join("");
}


// ================= CLINIC OPTION BUILDER =================
function buildClinicOption(clinicName) {
    if (!clinicName) return null;
    return {
        value: clinicName,
        label: clinicName
    };
}


// ================= FORM VALIDATION =================
function validateStaffForm(name, email, clinicId) {
    if (!name || !email || !clinicId) {
        return "Please fill in all fields";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return "Please enter a valid email address";
    }

    return null;
}


// ================= PAYLOAD BUILDER =================
function buildStaffPayload(name, email, clinicName, clinicId, adminEmail) {
    return {
        name,
        email: email.toLowerCase(),
        clinicName,
        clinicId,
        addedBy: adminEmail
    };
}


// ================= LOAD STAFF =================
async function loadStaff() {
    const tbody = document.getElementById("staffTableBody");
    const countEl = document.getElementById("staffCount");

    try {
        const snapshot = await getDocs(collection(db, STAFF_COLLECTION));

        countEl.textContent = snapshot.size;

        const staffList = [];
        snapshot.forEach((docSnap) => {
            staffList.push({ id: docSnap.id, ...docSnap.data() });
        });

        tbody.innerHTML = buildStaffTableHTML(staffList);

    } catch (err) {
        console.error("loadStaff error:", err);
        showToast("Failed to load staff", "error");
    }
}


// ================= LOAD CLINICS =================
async function loadClinics() {
    const select = document.getElementById("staffClinic");

    try {
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        snapshot.forEach((docSnap) => {
            const clinic = docSnap.data();

            const opt = buildClinicOption(clinic.name);
            if (!opt) return;

            const option = document.createElement("option");
            option.value = docSnap.id; // keep ID for reference
            option.textContent = opt.label;

            select.appendChild(option);
        });

    } catch (err) {
        console.error("loadClinics error:", err);
    }
}


// ================= ADD STAFF =================
window.addStaff = async function () {

    const name = document.getElementById("staffName").value.trim();
    const email = document.getElementById("staffEmail").value.trim();

    const select = document.getElementById("staffClinic");
    const clinicId = select.value;
    const clinicName = select.options[select.selectedIndex]?.text || "";

    const error = validateStaffForm(name, email, clinicId);

    if (error) {
        showToast(error, "error");
        return;
    }

    try {
        const payload = buildStaffPayload(
            name,
            email,
            clinicName,
            clinicId,
            currentAdmin.email
        );

        await addDoc(collection(db, STAFF_COLLECTION), {
            ...payload,
            addedAt: serverTimestamp(),
        });

        document.getElementById("staffName").value = "";
        document.getElementById("staffEmail").value = "";
        document.getElementById("staffClinic").value = "";

        closeInviteModal();
        await loadStaff();

        showToast("Staff member added successfully", "success");

    } catch (err) {
        console.error("addStaff error:", err);
        showToast("Failed to add staff member", "error");
    }
};


// ================= REMOVE STAFF =================
window.removeStaff = async function (id) {
    if (!confirm("Remove this staff member? This cannot be undone.")) return;

    try {
        await deleteDoc(doc(db, STAFF_COLLECTION, id));
        await loadStaff();
        showToast("Staff member removed", "success");
    } catch (err) {
        console.error("removeStaff error:", err);
        showToast("Failed to remove staff member", "error");
    }
};


// ================= MODAL =================
window.openInviteModal = function () {
    document.getElementById("inviteModal").style.display = "flex";
};

window.closeInviteModal = function () {
    document.getElementById("inviteModal").style.display = "none";
};


// ================= TOAST =================
function showToast(message, type = "") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}