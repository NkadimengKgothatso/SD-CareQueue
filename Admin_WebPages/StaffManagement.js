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

initAdminPage().then(async (user) => {
    currentAdmin = user;
    await loadClinics();
    await loadStaff();
});

// ================= STAFF TABLE =================

function buildStaffTableHTML(staffList) {
    if (!staffList.length) {
        return `<tr><td colspan="4" style="text-align:center;padding:40px;">No staff found</td></tr>`;
    }

    return staffList.map(staff => `
        <tr onclick="selectStaffRow(this)">
            <td>${staff.name}</td>
            <td>${staff.email}</td>
            <td>${staff.clinicName}</td>
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

    const snapshot = await getDocs(collection(db, STAFF_COLLECTION));

    let staffList = [];

    snapshot.forEach(docSnap => {
        staffList.push({ id: docSnap.id, ...docSnap.data() });
    });

    count.textContent = staffList.length;
    tbody.innerHTML = buildStaffTableHTML(staffList);
}

// ================= CLINICS =================

async function loadClinics() {
    const dataList = document.getElementById("clinicList");

    const snapshot = await getDocs(collection(db, "clinicsObjects"));

    snapshot.forEach(docSnap => {
        const clinic = docSnap.data();

        const option = document.createElement("option");
        option.value = clinic.name;
        option.setAttribute("data-id", clinic.id);

        dataList.appendChild(option);

        clinicsList.push({
            id: clinic.id,
            name: clinic.name
        });
    });
}

// ================= CLINIC MATCH =================

document.getElementById("staffClinicInput").addEventListener("input", function () {

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

    const name = document.getElementById("staffName").value;
    const email = document.getElementById("staffEmail").value;
    const clinicName = document.getElementById("staffClinicInput").value;
    const clinicId = parseInt(document.getElementById("staffClinicId").value);

    await addDoc(collection(db, STAFF_COLLECTION), {
        name,
        email,
        clinicName,
        clinicId,
        addedBy: currentAdmin.email,
        addedAt: serverTimestamp()
    });

    closeInviteModal();
    await loadStaff();
    showToast("Staff added", "success");
};

// ================= REMOVE =================

window.removeStaff = async function (id) {
    await deleteDoc(doc(db, STAFF_COLLECTION, id));
    await loadStaff();
    showToast("Staff removed", "success");
};

// ================= ROW SELECT =================

window.selectStaffRow = function (row) {

    document.querySelectorAll("#staffTableBody tr")
        .forEach(r => r.classList.remove("selected"));

    row.classList.add("selected");
};

// ================= MODAL =================

window.openInviteModal = function () {
    document.getElementById("inviteModal").style.display = "flex";
};

window.closeInviteModal = function () {
    document.getElementById("inviteModal").style.display = "none";
};

// ================= TOAST =================

function showToast(msg, type) {
    const toast = document.getElementById("toast");

    toast.textContent = msg;
    toast.className = `toast show ${type}`;

    setTimeout(() => toast.className = "toast", 3000);
}
