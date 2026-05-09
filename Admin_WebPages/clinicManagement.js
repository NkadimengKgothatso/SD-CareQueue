import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "firebase/firestore";

initAdminPage();

// =========================
// DOM REFERENCES
// =========================
const addBtn           = document.querySelector(".addBtn");
const modal            = document.getElementById("clinicModal");
const manageModal      = document.getElementById("ManageClinicModal");
const clinicHoursModal = document.getElementById("clinicHoursModal");
const closeBtns        = document.querySelectorAll(".close-btn");
const addForm          = document.querySelector("#clinicModal form");
const manageForm       = document.querySelector("#ManageClinicModal form");
const hoursForm        = document.querySelector("#clinicHoursModal form");
const searchInput      = document.getElementById("clinicSearch");

let editingClinicId      = null;
let editingHoursClinicId = null;
let clinics              = [];

// =========================
// MODAL CONTROLS
// =========================
addBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});

closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        modal.style.display            = "none";
        manageModal.style.display      = "none";
        clinicHoursModal.style.display = "none";
    });
});

window.addEventListener("click", (e) => {
    if (e.target === modal)            modal.style.display            = "none";
    if (e.target === manageModal)      manageModal.style.display      = "none";
    if (e.target === clinicHoursModal) clinicHoursModal.style.display = "none";
});

// =========================
// LOAD & RENDER CLINICS
// =========================
async function loadClinics() {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";
    clinics = [];

    try {
        const querySnapshot = await getDocs(collection(db, "clinicsObjects"));

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            clinics.push({
                id:             docSnap.id,
                name:           data.name,
                address:        data.address,
                province:       data.province ?? "",
                status:         data.status ?? "Active",
                service:        data.service ?? ["General"],
                operatingHours: data.opening_hours ?? "Hours not specified"
            });
        });

        renderClinics(clinics);

    } catch (error) {
        console.error("Error fetching clinics:", error);
    }
}

function renderClinics(list) {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";
    list.forEach(c => addClinicToUI(
        c.id,
        c.name,
        c.address,
        c.status,
        c.service,
        c.operatingHours,
        c.province
    ));
}

loadClinics();

// =========================
// BUILD CLINIC CARD
// =========================
function addClinicToUI(id, name, location, status = "Active", service, operatingHours, province) {
    const container = document.querySelector(".clinics");
    const clinic    = document.createElement("section");
    clinic.classList.add("clinic");

    const statusColors = {
        Active: { background: "#DCFCE7", color: "#166534" },
        Closed: { background: "#FEE2E2", color: "#991B1B" },
        Busy:   { background: "#E5E7EB", color: "#374151" }
    };

    const colors = statusColors[status] || statusColors["Active"];

    clinic.innerHTML = `
        <section class="clinicHeader">
            <i class="fa-solid fa-house-chimney-medical"></i>
            <section class="clinicNameStatus">
                <p class="clinicName">${name}</p>
            <p class="Location">
                ${location}${
                    province &&
                    province.trim().toLowerCase() !== "unknown"
                        ? `, ${province}`
                        : ""
                }
            </p>
            </section>
            <p id="status" style="background: ${colors.background}; color: ${colors.color};">${status}</p>
        </section>
        <section class="clinicContainer">
            <section class="OpenTimes">
                <i class="fa-regular fa-clock"></i>
                <p>${operatingHours && operatingHours !== "Hours not available"
                    ? operatingHours
                    : "Hours not specified"}</p>
            </section>
            <section class="clinicServices">
                ${Array.isArray(service)
                    ? service.map(s => `<section class="services">${s}</section>`).join("")
                    : `<section class="services">${service || "General"}</section>`
                }
            </section>
            <section class="clinic-Btns">
                <button class="manage-btn">Manage</button>
                <button class="hours-btn">Hours</button>
                <button class="delete-btn">Delete</button>
            </section>
        </section>
    `;

    container.appendChild(clinic);

    // Delete
    clinic.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!confirm("Delete this clinic?")) return;
        try {
            await deleteDoc(doc(db, "clinicsObjects", id));
            clinic.remove();
        } catch (error) {
            console.error("Error deleting clinic:", error);
        }
    });

    // Manage
    clinic.querySelector(".manage-btn").addEventListener("click", () => {
        openEditModal(id, name, location, status, service, province);
    });

    // Hours
    clinic.querySelector(".hours-btn").addEventListener("click", () => {
        editingHoursClinicId = id;

        const match = (operatingHours || "").match(
            /^(\w+)-(\w+):\s*([\w]+)\s*-\s*([\w]+)$/
        );

        if (match) {
            document.getElementById("startDay").value  = match[1].trim();
            document.getElementById("endDay").value    = match[2].trim();
            document.getElementById("startTime").value = match[3].trim();
            document.getElementById("endTime").value   = match[4].trim();
        } else {
            document.getElementById("startDay").value  = "";
            document.getElementById("endDay").value    = "";
            document.getElementById("startTime").value = "";
            document.getElementById("endTime").value   = "";
        }

        clinicHoursModal.style.display = "flex";
    });
}

// =========================
// ADD CLINIC FORM
// =========================
addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("clinicName").value.trim();
    const address  = document.getElementById("Location").value.trim();
    const status   = document.getElementById("clinicStatus").value;
    const services = getSelectedServices("clinicServicesDropdown");
    const province = document.getElementById("province").value;

    try {
        await addDoc(collection(db, "clinicsObjects"), {
            name,
            address,
            status,
            province,
            opening_hours: "Hours not specified",
            service:       services.length > 0 ? services : ["General"],
            createdAt:     serverTimestamp()
        });

        loadClinics();
        addForm.reset();
        clearServices("clinicServicesDropdown");
        modal.style.display = "none";
    } catch (error) {
        console.error("Error adding clinic:", error);
    }
});

// =========================
// UPDATE CLINIC FORM
// =========================
manageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("ManageClinicName").value.trim();
    const address  = document.getElementById("ManageLocation").value.trim();
    const status   = document.getElementById("ManageClinicStatus").value;
    const services = getSelectedServices("manageClinicServicesDropdown");
    const province = document.getElementById("manageProvince").value;

    try {
        await updateDoc(doc(db, "clinicsObjects", editingClinicId), {
            name,
            address,
            status,
            service: services.length > 0 ? services : ["General"],
            province
        });

        loadClinics();
        manageForm.reset();
        clearServices("manageClinicServicesDropdown");
        manageModal.style.display = "none";
    } catch (error) {
        console.error("Error updating clinic:", error);
    }
});

// =========================
// UPDATE HOURS FORM
// =========================
hoursForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!editingHoursClinicId) {
        alert("No clinic selected.");
        return;
    }

    const startDay  = document.getElementById("startDay").value;
    const endDay    = document.getElementById("endDay").value;
    const startTime = document.getElementById("startTime").value;
    const endTime   = document.getElementById("endTime").value;
    const hoursStr  = `${startDay}-${endDay}: ${startTime}-${endTime}`;

    try {
        await updateDoc(doc(db, "clinicsObjects", editingHoursClinicId), {
            opening_hours: hoursStr
        });

        loadClinics();
        hoursForm.reset();
        clinicHoursModal.style.display = "none";
        editingHoursClinicId = null;
    } catch (error) {
        console.error("Error updating hours:", error);
    }
});

// =========================
// OPEN EDIT MODAL
// =========================
function openEditModal(id, name, address, status, services, province) {
    editingClinicId = id;
    manageModal.style.display = "flex";

    document.getElementById("ManageClinicName").value   = name;
    document.getElementById("ManageLocation").value     = address;
    document.getElementById("ManageClinicStatus").value = status;
    document.getElementById("manageProvince").value = province || "";

    preselectServices("manageClinicServicesDropdown", services);
}

// =========================
// SEARCH
// =========================
searchInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase().trim();

    const filtered = clinics.filter(c =>
        (c.name    || "").toLowerCase().includes(value) ||
        (c.address || "").toLowerCase().includes(value) ||
        (c.status  || "").toLowerCase().includes(value) ||
        (c.province || "").toLowerCase().includes(value) ||
        (Array.isArray(c.service)
            ? c.service.join(" ").toLowerCase()
            : (c.service || "").toLowerCase()
        ).includes(value)
    );

    renderClinics(filtered);
});

// =========================
// CUSTOM CHECKBOX DROPDOWN
// =========================
document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".custom-select .select-trigger").forEach(trigger => {
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const parent = trigger.closest(".custom-select");
            document.querySelectorAll(".custom-select").forEach(s => {
                if (s !== parent) s.classList.remove("open");
            });
            parent.classList.toggle("open");
        });
    });

    document.querySelectorAll(".custom-select .select-options").forEach(options => {
        options.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    });

    document.addEventListener("click", () => {
        document.querySelectorAll(".custom-select").forEach(s => s.classList.remove("open"));
    });

    document.querySelectorAll(".custom-select input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", (e) => {
            e.stopPropagation();
            updateTriggerLabel(cb.closest(".custom-select"));
        });
    });
});

function updateTriggerLabel(dropdown) {
    const checked = Array.from(dropdown.querySelectorAll("input[type='checkbox']:checked"))
        .map(cb => cb.value);
    const trigger = dropdown.querySelector(".select-trigger");
    trigger.innerHTML = checked.length > 0
        ? `${checked.join(", ")} <i class="fa-solid fa-chevron-down"></i>`
        : `Select Services <i class="fa-solid fa-chevron-down"></i>`;
}

function getSelectedServices(dropdownId) {
    return Array.from(
        document.querySelectorAll(`#${dropdownId} input[type='checkbox']:checked`)
    ).map(cb => cb.value);
}

function clearServices(dropdownId) {
    document.querySelectorAll(`#${dropdownId} input[type='checkbox']`).forEach(cb => {
        cb.checked = false;
    });
    updateTriggerLabel(document.getElementById(dropdownId));
}

function preselectServices(dropdownId, services) {
    const existing = Array.isArray(services) ? services : (services ? [services] : []);
    document.querySelectorAll(`#${dropdownId} input[type='checkbox']`).forEach(cb => {
        cb.checked = existing.includes(cb.value);
    });
    updateTriggerLabel(document.getElementById(dropdownId));
}