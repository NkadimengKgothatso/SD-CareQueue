import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Tracks which clinic is being edited in the manage and hours modals
let editingClinicId      = null;
let editingHoursClinicId = null;

// Holds all fetched clinics so search can filter without re-fetching
let clinics = [];

// =========================
// MODAL CONTROLS
// =========================

// Open the add clinic modal
addBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});

// Close all modals and clear any visible validation errors
closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        modal.style.display            = "none";
        manageModal.style.display      = "none";
        clinicHoursModal.style.display = "none";
        clearHoursErrors();
    });
});

// Close modals when clicking the backdrop (outside the modal content)
window.addEventListener("click", (e) => {
    if (e.target === modal)            modal.style.display            = "none";
    if (e.target === manageModal)      manageModal.style.display      = "none";
    if (e.target === clinicHoursModal) {
        clinicHoursModal.style.display = "none";
        clearHoursErrors();
    }
});

// =========================
// HELPERS
// =========================

// Clears both hours validation error messages
function clearHoursErrors() {
    document.getElementById("hoursError").classList.remove("visible");
    document.getElementById("hoursDayError").classList.remove("visible");
}

// Builds a human-readable hours string from the 4 separate day/time fields
// e.g. "Monday-Friday: 08:00-17:00"
function formatHours(startDay, endDay, startTime, endTime) {
    if (startDay && endDay && startTime && endTime) {
        return `${startDay}-${endDay}: ${startTime}-${endTime}`;
    }
    return "Hours not specified";
}

// Derives clinic status dynamically from today's day and the current time.
// Returns "Active" if the clinic is currently open, "Closed" otherwise.
// This removes the need to store status in the database manually.
function deriveStatus(startDay, endDay, startTime, endTime) {

    // If any hours field is missing we cannot determine status — default to Closed
    if (!startDay || !endDay || !startTime || !endTime) return "Closed";

    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const now        = new Date();
    const todayIndex = now.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

    // Convert JS getDay() (0=Sun) to our dayOrder index (0=Mon)
    // JS:  Sun=0  Mon=1  Tue=2  Wed=3  Thu=4  Fri=5  Sat=6
    // Ours: Mon=0 Tue=1  Wed=2  Thu=3  Fri=4  Sat=5  Sun=6
    const todayMapped = todayIndex === 0 ? 6 : todayIndex - 1;

    const startIndex = dayOrder.indexOf(startDay);
    const endIndex   = dayOrder.indexOf(endDay);

    // If either day isn't recognised, fall back to Closed
    if (startIndex === -1 || endIndex === -1) return "Closed";

    // Check if today falls within the operating day range
    const isDayOpen = startIndex <= endIndex
        ? todayMapped >= startIndex && todayMapped <= endIndex   // e.g. Mon-Fri
        : todayMapped >= startIndex || todayMapped <= endIndex;  // e.g. Fri-Mon (wraps weekend)

    if (!isDayOpen) return "Closed";

    // Check if the current time falls within the operating time range
    // startTime and endTime are stored as "HH:MM" (24hr format)
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour,   endMin  ] = endTime.split(":").map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes    = startHour * 60 + startMin;
    const closeMinutes   = endHour   * 60 + endMin;

    const isTimeOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    return isTimeOpen ? "Open" : "Closed";
}

// =========================
// LOAD & RENDER CLINICS
// =========================

// Fetches all clinics from Firestore and stores them in the clinics array
async function loadClinics() {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";
    clinics = [];

    try {
        const querySnapshot = await getDocs(collection(db, "clinicsObjects"));

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            clinics.push({
                id:        docSnap.id,
                name:      data.name,
                address:   data.address,
                province:  data.province  ?? "",
                service:   data.service   ?? ["General"],
                latitude:  data.latitude  ?? null,
                longitude: data.longitude ?? null,
                startDay:  data.startDay  ?? "",
                endDay:    data.endDay    ?? "",
                startTime: data.startTime ?? "",
                endTime:   data.endTime   ?? ""
                // Note: status is NOT stored — it is calculated live from hours
            });
        });

        renderClinics(clinics);

    } catch (error) {
        console.error("Error fetching clinics:", error);
    }
}

// Clears the clinic container and re-renders a given list of clinic objects
function renderClinics(list) {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";
    list.forEach(c => addClinicToUI(c));
}

loadClinics();

// =========================
// BUILD CLINIC CARD
// =========================

// Creates and appends a clinic card to the UI for a given clinic object
function addClinicToUI(clinic) {
    const {
        id, name, address, service,
        province, startDay, endDay, startTime, endTime
    } = clinic;

    const container = document.querySelector(".clinics");
    const card      = document.createElement("section");
    card.classList.add("clinic");

    // Derive status live from the clinic's operating hours
    const status = deriveStatus(startDay, endDay, startTime, endTime);

    // Status badge colours — Busy removed as it is no longer a valid status
    const statusColors = {
        Open: { background: "#DCFCE7", color: "#166534" },
        Closed: { background: "#FEE2E2", color: "#991B1B" }
    };

    const colors          = statusColors[status] || statusColors["Closed"];
    const hoursDisplay    = formatHours(startDay, endDay, startTime, endTime);

    // Only show province if it is a real value (not empty or "Unknown")
    const provinceDisplay = province && province.trim().toLowerCase() !== "unknown"
        ? `, ${province}`
        : "";

    card.innerHTML = `
        <section class="clinicHeader">
            <i class="fa-solid fa-house-chimney-medical"></i>
            <section class="clinicNameStatus">
                <p class="clinicName">${name}</p>
                <p class="Location">${address}${provinceDisplay}</p>
            </section>
            <p id="status" style="background: ${colors.background}; color: ${colors.color};">${status}</p>
        </section>
        <section class="clinicContainer">
            <section class="OpenTimes">
                <i class="fa-regular fa-clock"></i>
                <p>${hoursDisplay}</p>
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

    container.appendChild(card);

    // Delete — confirms before removing from Firestore and the DOM
    card.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!confirm("Delete this clinic?")) return;
        try {
            await deleteDoc(doc(db, "clinicsObjects", id));
            card.remove();
        } catch (error) {
            console.error("Error deleting clinic:", error);
        }
    });

    // Manage — opens the edit modal pre-filled with the clinic's current data
    card.querySelector(".manage-btn").addEventListener("click", () => {
        openEditModal(clinic);
    });

    // Hours — opens the hours modal pre-filled with existing hours if set
    card.querySelector(".hours-btn").addEventListener("click", () => {
        editingHoursClinicId = id;

        document.getElementById("startDay").value  = startDay  || "";
        document.getElementById("endDay").value    = endDay    || "";
        document.getElementById("startTime").value = startTime || "";
        document.getElementById("endTime").value   = endTime   || "";

        clearHoursErrors();
        clinicHoursModal.style.display = "flex";
    });
}

// =========================
// ADD CLINIC FORM
// =========================

// Handles adding a new clinic to Firestore
// Hours are intentionally left empty — the admin sets them separately via the Hours button
addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("clinicName").value.trim();
    const address  = document.getElementById("Location").value.trim();
    const province = document.getElementById("province").value;
    const services = getSelectedServices("clinicServicesDropdown");

    try {
        await addDoc(collection(db, "clinicsObjects"), {
            name,
            address,
            province,
            service:   services.length > 0 ? services : ["General"],
            // Hours default to empty — admin sets them via the Hours button
            startDay:  "",
            endDay:    "",
            startTime: "",
            endTime:   "",
            createdAt: serverTimestamp()
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

// Handles updating an existing clinic's name, address, province and services
// Hours are managed separately via the Hours modal
manageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("ManageClinicName").value.trim();
    const address  = document.getElementById("ManageLocation").value.trim();
    const province = document.getElementById("manageProvince").value;
    const services = getSelectedServices("manageClinicServicesDropdown");

    try {
        await updateDoc(doc(db, "clinicsObjects", editingClinicId), {
            name,
            address,
            province,
            service: services.length > 0 ? services : ["General"]
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

// Handles updating a clinic's operating hours in Firestore
// Validates that all fields are filled and start/end days differ before saving
hoursForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const hoursError    = document.getElementById("hoursError");
    const hoursDayError = document.getElementById("hoursDayError");

    // Always clear previous errors before re-validating
    clearHoursErrors();

    if (!editingHoursClinicId) {
        alert("No clinic selected.");
        return;
    }

    const startDay  = document.getElementById("startDay").value;
    const endDay    = document.getElementById("endDay").value;
    const startTime = document.getElementById("startTime").value;
    const endTime   = document.getElementById("endTime").value;

    // Rule 1 — all four fields must be filled
    if (!startDay || !endDay || !startTime || !endTime) {
        hoursError.classList.add("visible");
        return;
    }

    // Rule 2 — start and end day must be different
    if (startDay === endDay) {
        hoursDayError.classList.add("visible");
        return;
    }

    try {
        await updateDoc(doc(db, "clinicsObjects", editingHoursClinicId), {
            startDay,
            endDay,
            startTime,
            endTime
        });

        loadClinics();
        hoursForm.reset();
        clearHoursErrors();
        clinicHoursModal.style.display = "none";
        editingHoursClinicId = null;
    } catch (error) {
        console.error("Error updating hours:", error);
    }
});

// =========================
// OPEN EDIT MODAL
// =========================

// Pre-fills the manage modal with the selected clinic's current data
function openEditModal(clinic) {
    const { id, name, address, service, province } = clinic;

    editingClinicId           = id;
    manageModal.style.display = "flex";

    document.getElementById("ManageClinicName").value   = name;
    document.getElementById("ManageLocation").value     = address;

    // Only set province if it matches a valid option in the dropdown
    // Otherwise leave it on the placeholder to avoid stale/invalid selections
    const provinceSelect = document.getElementById("manageProvince");
    const validProvinces = Array.from(provinceSelect.options).map(opt => opt.value);
    provinceSelect.value = province && validProvinces.includes(province) ? province : "";

    preselectServices("manageClinicServicesDropdown", service);
}

// =========================
// SEARCH
// =========================

// Filters the displayed clinics in real time as the admin types
// Searches across name, address, province and services
searchInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase().trim();

    const filtered = clinics.filter(c =>
        (c.name     || "").toLowerCase().includes(value) ||
        (c.address  || "").toLowerCase().includes(value) ||
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

// Initialises the custom multi-select checkbox dropdowns for services
// Runs after the DOM is ready to ensure all elements are available
document.addEventListener("DOMContentLoaded", () => {

    // Toggle the dropdown open/closed when clicking the trigger
    document.querySelectorAll(".custom-select .select-trigger").forEach(trigger => {
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const parent = trigger.closest(".custom-select");
            // Close all other open dropdowns first
            document.querySelectorAll(".custom-select").forEach(s => {
                if (s !== parent) s.classList.remove("open");
            });
            parent.classList.toggle("open");
        });
    });

    // Prevent clicks inside the options list from closing the dropdown
    document.querySelectorAll(".custom-select .select-options").forEach(options => {
        options.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    });

    // Close all dropdowns when clicking anywhere outside them
    document.addEventListener("click", () => {
        document.querySelectorAll(".custom-select").forEach(s => s.classList.remove("open"));
    });

    // Update the trigger label whenever a checkbox is checked or unchecked
    document.querySelectorAll(".custom-select input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", (e) => {
            e.stopPropagation();
            updateTriggerLabel(cb.closest(".custom-select"));
        });
    });
});

// Updates the dropdown trigger text to show the currently selected services
// Falls back to the default placeholder if nothing is selected
function updateTriggerLabel(dropdown) {
    const checked = Array.from(dropdown.querySelectorAll("input[type='checkbox']:checked"))
        .map(cb => cb.value);
    const trigger = dropdown.querySelector(".select-trigger");
    trigger.innerHTML = checked.length > 0
        ? `${checked.join(", ")} <i class="fa-solid fa-chevron-down"></i>`
        : `Select Services <i class="fa-solid fa-chevron-down"></i>`;
}

// Returns an array of the currently checked service values from a given dropdown
function getSelectedServices(dropdownId) {
    return Array.from(
        document.querySelectorAll(`#${dropdownId} input[type='checkbox']:checked`)
    ).map(cb => cb.value);
}

// Unchecks all checkboxes in a dropdown and resets the trigger label
function clearServices(dropdownId) {
    document.querySelectorAll(`#${dropdownId} input[type='checkbox']`).forEach(cb => {
        cb.checked = false;
    });
    updateTriggerLabel(document.getElementById(dropdownId));
}

// Pre-ticks the checkboxes that match the given services array
// Used when opening the manage modal to reflect the clinic's existing services
function preselectServices(dropdownId, services) {
    const existing = Array.isArray(services) ? services : (services ? [services] : []);
    document.querySelectorAll(`#${dropdownId} input[type='checkbox']`).forEach(cb => {
        cb.checked = existing.includes(cb.value);
    });
    updateTriggerLabel(document.getElementById(dropdownId));
}

export {
    renderClinics,
    addClinicToUI,
    openEditModal,
    formatHours,
    deriveStatus,
    updateTriggerLabel,
    getSelectedServices,
    clearServices,
    preselectServices
};