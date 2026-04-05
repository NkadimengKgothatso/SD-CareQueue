// =========================
// TIME SLOT FUNCTIONALITY
// =========================
const timeSlotsContainer = document.getElementById("timeSlots");
const selectedTimeInput = document.getElementById("selectedTime");

function renderTimeSlots() {
    timeSlotsContainer.innerHTML = "";

    for (let hour = 8; hour <= 17; hour++) {
        for (let minute of [0, 30]) {
            if (hour === 17 && minute === 30) continue; // stop at 17:00

            const slotBtn = document.createElement("button");
            slotBtn.classList.add("time-slot");

            const formattedTime = formatTime(hour, minute);
            slotBtn.textContent = formattedTime;

            slotBtn.addEventListener("click", () => {
                document.querySelectorAll(".time-slot").forEach(btn => btn.classList.remove("selected"));
                slotBtn.classList.add("selected");
                selectedTimeInput.value = formattedTime;
            });

            timeSlotsContainer.appendChild(slotBtn);
        }
    }
}

function formatTime(hour, minute) {
    const h = String(hour).padStart(2, "0");
    const m = String(minute).padStart(2, "0");
    return `${h}:${m}`;
}

renderTimeSlots();

// =========================
// CLINIC SEARCH FUNCTIONALITY
// =========================
const clinicSearchInput = document.getElementById("clinicSearch");
const clinicResults = document.getElementById("clinicResults"); 

let clinics = [];

// Fetch clinics from JSON file
async function loadClinics() {
    try {
        const response = await fetch("./clinics.json");
        clinics = await response.json();
        displayClinics(clinics); // show all clinics initially
    } catch (error) {
        console.error("Error loading clinics:", error);
        clinicResults.innerHTML = "<p>Failed to load clinics.</p>";
    }
}

// Display clinics on page
function displayClinics(clinicList) {
    clinicResults.innerHTML = "";

    if (clinicList.length === 0) {
        clinicResults.innerHTML = `<p class="no-results">No clinics found.</p>`;
        return;
    }

    clinicList.forEach(clinic => {
        const clinicCard = document.createElement("section");
        clinicCard.classList.add("clinic-card");

        clinicCard.innerHTML = `
            <i class="fa-solid fa-house-chimney-medical clinic-icon"></i>

            <section class="clinic-info">
                <p class="clinic-name">${clinic.name}</p>
                <p class="clinic-services">Primary healthcare services</p>
                <p class="clinic-bookings">12 bookings today</p>
            </section>

            <button class="open-btn">Open</button>
        `;

        clinicResults.appendChild(clinicCard);
    });
}

// Search as user types
clinicSearchInput.addEventListener("input", () => {
    const searchValue = clinicSearchInput.value.toLowerCase().trim();

    const filteredClinics = clinics.filter(clinic =>
        clinic.name && clinic.name.toLowerCase().includes(searchValue)
    );

    displayClinics(filteredClinics);
});

// Load clinics when page starts
loadClinics();