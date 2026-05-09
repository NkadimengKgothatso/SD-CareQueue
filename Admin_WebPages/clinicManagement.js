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

// initAdminPage handles auth guard, admin check, and sidebar population.
initAdminPage();

// =========================
// MODAL LOGIC
// =========================
const addBtn      = document.querySelector(".addBtn");
const modal       = document.getElementById("clinicModal");
const manageModal = document.getElementById("ManageClinicModal");
const closeBtns   = document.querySelectorAll(".close-btn");
const addForm     = document.querySelector("#clinicModal form");
const manageForm  = document.querySelector("#ManageClinicModal form");
const hoursForm   = document.querySelector("#clinicHoursModal form");
const clinicHoursModal = document.querySelector("#clinicHoursModal");

let editingClinicId = null;

closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        modal.style.display       = "none";
        manageModal.style.display = "none";
        clinicHoursModal.style.display = "none"; 
    });
});

addBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});

let editingHoursClinicId = null;

window.addEventListener("click", (e) => {
    if (e.target === modal)       modal.style.display       = "none";
    if (e.target === manageModal) manageModal.style.display = "none";
    if (e.target === clinicHoursModal) clinicHoursModal.style.display = "none";
});

let clinics = [];

async function loadClinics() {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";

    clinics = [];

    try {
        const querySnapshot = await getDocs(collection(db, "clinicsObjects"));

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            const clinicObj = {
                id:             docSnap.id,
                name:           data.name,
                address:        data.address,
                status:         data.status,
                service:        data.service,
                operatingHours: data.opening_hours
            };

            clinics.push(clinicObj);
        });

        renderClinics(clinics);

    } catch (error) {
        console.error("Error fetching clinics:", error);
    }
}

loadClinics();

function addClinicToUI(id, name, location, status = "Active", service, operatingHours) {
    const container = document.querySelector(".clinics");
    const clinic    = document.createElement("section");
    clinic.classList.add("clinic");

    clinic.innerHTML = `
        <section class="clinicHeader">
            <i class="fa-solid fa-house-chimney-medical"></i>
            <section class="clinicNameStatus">
                <p class="clinicName">${name}</p>
                <p class="Location">${location}</p>
            </section>
            <p id="status">${status}</p>
        </section>                      
        <section class="clinicContainer">
            <section class="OpenTimes">
                <i class="fa-regular fa-clock"></i>
                <p>${operatingHours}</p>
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
                <button class="delete-btn" id="deleteBtn">Delete</button>
            </section>
        </section>
    `;

    container.appendChild(clinic);

    const statusColors = {
        Active: { background: "#DCFCE7", color: "#166534" },
        Closed: { background: "#FEE2E2", color: "#991B1B" },
        Busy:   { background: "#E5E7EB", color: "#374151" }
    };

    const statusEl = clinic.querySelector("#status");
    const colors   = statusColors[status] || statusColors["Active"];
    statusEl.style.background = colors.background;
    statusEl.style.color      = colors.color;

    const deleteBtn = clinic.querySelector(".delete-btn");

    deleteBtn.addEventListener("click", async () => {
        const confirmDelete = confirm("Delete this clinic?");
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "clinicsObjects", id));
            clinic.remove();
        } catch (error) {
            console.error("Error deleting clinic:", error);
        }
    });

    clinic.querySelector(".manage-btn").addEventListener("click", () => {
        openEditModal(id, name, location, status, service);
    });

    clinic.querySelector(".hours-btn").addEventListener("click", () => {
        editingHoursClinicId = id;

        // Parses "Mon-Fri: 7am-7pm"
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

addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("clinicName").value.trim();
    const address  = document.getElementById("Location").value.trim();
    const status   = document.getElementById("clinicStatus").value;
    const hours    = document.getElementById("clinicHours").value.trim();
    const services = document.getElementById("clinicServices").value
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

    await addDoc(collection(db, "clinicsObjects"), {
        name,
        address,
        status,
        opening_hours: hours || "Mon-Fri: 8am - 5pm",
        service:       services.length > 0 ? services : ["General"],
        createdAt:     serverTimestamp()
    });

    loadClinics();
    addForm.reset();
    modal.style.display = "none";
});

hoursForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const startDay  = document.getElementById("startDay").value;
    const endDay    = document.getElementById("endDay").value;
    const startTime = document.getElementById("startTime").value;
    const endTime   = document.getElementById("endTime").value;

    // Saves as "Mon-Fri: 7am-7pm" — matches DB format exactly
    const hoursStr = `${startDay}-${endDay}: ${startTime}-${endTime}`;

    if (!editingHoursClinicId) {
        alert("No clinic selected.");
        return;
    }

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

manageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("ManageClinicName").value.trim();
    const address  = document.getElementById("ManageLocation").value.trim();
    const status   = document.getElementById("ManageClinicStatus").value;
    // const hours    = document.getElementById("ManageClinicHours").value.trim();
    const services = document.getElementById("ManageClinicServices").value
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

    await updateDoc(doc(db, "clinicsObjects", editingClinicId), {
        name,
        address,
        status,
        service: services.length > 0 ? services : ["General"]
    });

    loadClinics();
    manageForm.reset();
    manageModal.style.display = "none";
});

const searchInput = document.getElementById("clinicSearch");

searchInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase().trim();

    const filtered = clinics.filter(c =>
        (c.name    || "").toLowerCase().includes(value) ||
        (c.address || "").toLowerCase().includes(value) ||
        (c.status  || "").toLowerCase().includes(value) ||
        (c.service ? (Array.isArray(c.service) 
            ? c.service.join(" ").toLowerCase() 
            : c.service.toLowerCase()) : "").includes(value)
    );

    renderClinics(filtered);
});

function renderClinics(list) {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";

    list.forEach(c => {
        addClinicToUI(
            c.id,
            c.name,
            c.address,
            c.status,
            c.service,
            c.operatingHours
        );
    });
}

function openEditModal(id, name, address, status, services) {
    editingClinicId = id;
    manageModal.style.display = "flex";

    document.querySelector("#ManageClinicModal #ManageClinicName").value = name;
    document.querySelector("#ManageClinicModal #ManageLocation").value = address;
    document.querySelector("#ManageClinicModal #ManageClinicStatus").value = status;
    // document.querySelector("#ManageClinicModal #ManageClinicHours").value = hours || "";
    document.querySelector("#ManageClinicModal #ManageClinicServices").value = 
        Array.isArray(services) ? services.join(", ") : (services || "");

    document.querySelector("#ManageClinicModal button[type='submit']").textContent = "Update Clinic";
}