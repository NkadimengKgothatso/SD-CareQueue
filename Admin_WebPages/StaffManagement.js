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
let clinicsList = [];

initAdminPage()
    .then(async (user) => {
        currentAdmin = user;
        await loadClinics();
        await loadStaff();
    })
    .catch(error => {
        console.error("init staff management error:", error);
        showToast("Failed to initialise staff management", "error");
    });

// ================= STAFF TABLE =================

function buildStaffTableHTML(staffList) {
    if (!staffList.length) {
        return `<tr><td colspan="4" style="text-align:center;padding:40px;">No staff members found</td></tr>`;
    }

    return staffList.map(staff => `
        <tr onclick="selectStaffRow(this)">
            <td>${staff.name || "-"}</td>
            <td>${staff.email || "-"}</td>
            <td>${staff.clinicName || "Unassigned"}</td>
            <td>
                <button class="staff-btn staff-btn-danger"
                        onclick="event.stopPropagation(); removeStaff('${staff.id}')">
                    Remove
                </button>
            </td>
        </tr>
    `).join("");
}

// ================= LOAD STAFF =================

async function loadStaff() {
    const tbody = document.getElementById("staffTableBody");
    const count = document.getElementById("staffCount");

    try {
        const snapshot = await getDocs(collection(db, STAFF_COLLECTION));

        let staffList = [];

        snapshot.forEach(docSnap => {
            staffList.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (count) count.textContent = staffList.length;
        if (tbody) tbody.innerHTML = buildStaffTableHTML(staffList);
    } catch (error) {
        console.error("loadStaff error:", error);
        showToast("Failed to load staff", "error");
    }
}

// ================= CLINICS =================

async function loadClinics() {
    const dataList = document.getElementById("clinicList");

    try {
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        if (dataList) dataList.innerHTML = "";
        clinicsList = [];

        snapshot.forEach(docSnap => {
            const clinic = docSnap.data();
            const optionModel = buildClinicOption(clinic.name, docSnap.id);

            if (!optionModel) return;

            if (dataList) {
                const option = document.createElement("option");
                option.value = optionModel.value;
                option.textContent = optionModel.label;
                option.setAttribute("data-id", optionModel.id);
                dataList.appendChild(option);
            }

            clinicsList.push({
                id: optionModel.id,
                name: optionModel.value
            });
        });
    } catch (error) {
        console.error("loadClinics error:", error);
    }
}

function buildClinicOption(name, id = "") {
    const value = (name || "").trim();
    if (!value) return null;

    return {
        value,
        label: value,
        id
    };
}

// ================= CLINIC MATCH =================

document.getElementById("staffClinicInput")?.addEventListener("input", function () {

    const options = document.getElementById("clinicList").options;

    let id = "";

    for (let i = 0; i < options.length; i++) {
        if (options[i].value === this.value) {
            id = options[i].getAttribute("data-id");
        }
    }

    document.getElementById("staffClinicId").value = id;
});

// ================= ADD STAFF =================

window.addStaff = async function () {

    const name = document.getElementById("staffName").value.trim();
    const email = document.getElementById("staffEmail").value.trim().toLowerCase();
    const clinicName = document.getElementById("staffClinicInput").value.trim();
    const clinicId = document.getElementById("staffClinicId").value;
    const validationError = validateStaffForm(name, email, clinicId);

    if (validationError) {
        showToast(validationError, "error");
        return;
    }

    try {
        await addDoc(collection(db, STAFF_COLLECTION), {
            ...buildStaffPayload(name, email, clinicName, clinicId, currentAdmin?.email || ""),
            addedAt: serverTimestamp()
        });

        document.getElementById("staffName").value = "";
        document.getElementById("staffEmail").value = "";
        document.getElementById("staffClinicInput").value = "";
        document.getElementById("staffClinicId").value = "";

        closeInviteModal();
        await loadStaff();
        showToast("Staff member added successfully", "success");
    } catch (error) {
        console.error("addStaff error:", error);
        showToast("Failed to add staff member", "error");
    }
};

// ================= REMOVE =================

window.removeStaff = async function (id) {
    if (!confirm("Remove this staff member? This cannot be undone.")) return;

    try {
        await deleteDoc(doc(db, STAFF_COLLECTION, id));
        await loadStaff();
        showToast("Staff member removed", "success");
    } catch (error) {
        console.error("removeStaff error:", error);
        showToast("Failed to remove staff member", "error");
    }
};

// ================= ROW SELECT =================

window.selectStaffRow = function (row) {

    document.querySelectorAll("#staffTableBody tr")
        .forEach(r => r.classList.remove("selected"));

    row?.classList.add("selected");
};

// ================= MODAL =================

window.openInviteModal = function () {
    const modal = document.getElementById("inviteModal");
    if (modal) modal.style.display = "flex";
};

window.closeInviteModal = function () {
    const modal = document.getElementById("inviteModal");
    if (modal) modal.style.display = "none";
};

// ================= TOAST =================

function showToast(msg, type) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = msg;
    toast.className = `toast show ${type || ""}`;

    setTimeout(() => toast.className = "toast", 3000);
}

function validateStaffForm(name, email, clinicId) {
    if (!name || !email || !clinicId) return "Please fill in all fields";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    return null;
}

function buildStaffPayload(name, email, clinicName, clinicId, adminEmail) {
    return {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        clinicName: clinicName.trim(),
        clinicId,
        addedBy: adminEmail
    };
}

export {
    buildClinicOption,
    buildStaffPayload,
    buildStaffTableHTML,
    loadClinics,
    loadStaff,
    showToast,
    validateStaffForm
};
