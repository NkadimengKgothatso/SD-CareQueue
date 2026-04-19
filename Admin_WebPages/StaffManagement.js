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

// initAdminPage handles auth guard, admin check, and sidebar population.
// It resolves with the verified admin user so we can continue page setup.
initAdminPage().then(async (user) => {
    currentAdmin = user;
    await loadStaff();
    await loadClinics();
});

// ================= LOAD STAFF =================
async function loadStaff() {
    const tbody   = document.getElementById("staffTableBody");
    const countEl = document.getElementById("staffCount");

    try {
        const snapshot = await getDocs(collection(db, STAFF_COLLECTION));

        countEl.textContent = snapshot.size;

        let html = "";
        snapshot.forEach((docSnap) => {
            const s = docSnap.data();
            html += `
                <tr>
                    <td>${s.displayName || "—"}</td>
                    <td>${s.email || "—"}</td>
                    <td>${s.assignedClinic || "—"}</td>
                    <td>
                        <button
                            class="btn btn-small"
                            style="color:#dc2626; border-color:#fca5a5;"
                            onclick="removeStaff('${docSnap.id}')">
                            Remove
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || `
            <tr>
                <td colspan="4" style="text-align:center; padding:40px; color:var(--color-text-tertiary);">
                    No staff members yet
                </td>
            </tr>
        `;
    } catch (err) {
        console.error("❌ loadStaff error:", err);
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
            if (!clinic.name) return;
            const option       = document.createElement("option");
            option.value       = docSnap.id;
            option.textContent = clinic.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("❌ loadClinics error:", err);
    }
}

// ================= ADD STAFF =================
window.addStaff = async function () {
    const name       = document.getElementById("staffName").value.trim();
    const email      = document.getElementById("staffEmail").value.trim();
    const select     = document.getElementById("staffClinic");
    const clinicId   = select.value;
    const clinicName = select.options[select.selectedIndex]?.text || "";

    if (!name || !email || !clinicId) {
        showToast("Please fill all fields", "error");
        return;
    }

    try {
        await addDoc(collection(db, STAFF_COLLECTION), {
            displayName:    name,
            email:          email.toLowerCase(),
            assignedClinic: clinicName,
            clinicId,
            addedBy:        currentAdmin.email,
            addedAt:        serverTimestamp(),
        });

        document.getElementById("staffName").value   = "";
        document.getElementById("staffEmail").value  = "";
        document.getElementById("staffClinic").value = "";

        closeInviteModal();
        await loadStaff();
        showToast("Staff member added successfully", "success");

    } catch (error) {
        console.error("❌ Firestore error:", error);
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
        console.error("❌ removeStaff error:", err);
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
    toast.className   = `toast show ${type}`;
    setTimeout(() => { toast.className = "toast"; }, 3000);
}