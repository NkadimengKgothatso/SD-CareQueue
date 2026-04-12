// =========================
// CLINIC SEARCH FUNCTIONALITY
// =========================
const clinicSearchInput = document.getElementById("clinicSearch");
const clinicResults = document.getElementById("clinicResults");
const nearMeBtn = document.getElementById("nearMeBtn");
const openNowBtn = document.getElementById("openNowBtn");

let clinics = [];
let nearMeActive = false;
let openNowActive = false;
let userLocation = null;

// =========================
// LOAD CLINICS
// =========================
async function loadClinics() {
    try {
        const response = await fetch("./clinics.json");
        clinics = await response.json();

        applyFilters(); // show all clinics initially
    } catch (error) {
        console.error("Error loading clinics:", error);
        clinicResults.innerHTML = "<p class='no-results'>Failed to load clinics.</p>";
    }
}

// =========================
// DISPLAY CLINICS
// =========================
function displayClinics(clinicList) {
    clinicResults.innerHTML = "";

    if (clinicList.length === 0) {
        clinicResults.innerHTML = `<p class="no-results">No clinics found.</p>`;
        return;
    }

    clinicList.forEach(clinic => {
        const clinicCard = document.createElement("section");
        clinicCard.classList.add("clinic-card");

        const isOpen = isClinicOpenNow(clinic.opening_hours);

        clinicCard.innerHTML = `
            <i class="fa-solid fa-house-chimney-medical clinic-icon"></i>

            <section class="clinic-info">
                <p class="clinic-name">${clinic.name}</p>
                <p class="clinic-services">${clinic.address || "Primary healthcare services"}</p>
                <p class="clinic-bookings">${clinic.operator || "Public clinic"}</p>

                <p class="clinic-bookings">
                    <i class="fa-solid fa-location-dot"></i>
                    ${clinic.distance !== undefined ? `${clinic.distance.toFixed(2)} km away` : "Click Near Me to see distance"}
                </p>

                <p class="clinic-bookings">
                    <i class="fa-solid fa-clock"></i>
                    ${isOpen ? "Open Now" : "Closed"}
                </p>
            </section>
        `;

        clinicResults.appendChild(clinicCard);
    });
}

// =========================
// HAVERSINE FORMULA
// =========================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// =========================
// GET USER LOCATION
// =========================
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject("Geolocation is not supported by this browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                reject("Unable to retrieve your location.");
            }
        );
    });
}

// =========================
// CHECK IF CLINIC IS OPEN NOW
// Supports format: "Mo-Fr 08:00-17:00"
// =========================
function isClinicOpenNow(openingHours) {
    if (!openingHours) return false;

    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dayMap = {
        "Su": 0,
        "Mo": 1,
        "Tu": 2,
        "We": 3,
        "Th": 4,
        "Fr": 5,
        "Sa": 6
    };

    try {
        // Example: "Mo-Fr 08:00-17:00"
        const [daysPart, timePart] = openingHours.split(" ");
        if (!daysPart || !timePart) return false;

        const [startDay, endDay] = daysPart.split("-");
        const [openTime, closeTime] = timePart.split("-");

        const startDayNum = dayMap[startDay];
        const endDayNum = dayMap[endDay];

        if (startDayNum === undefined || endDayNum === undefined) return false;

        // Check if today is within the clinic's operating days
        if (currentDay < startDayNum || currentDay > endDayNum) return false;

        // Convert HH:MM to total minutes
        const [openHour, openMinute] = openTime.split(":").map(Number);
        const [closeHour, closeMinute] = closeTime.split(":").map(Number);

        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    } catch (error) {
        console.error("Invalid opening_hours format:", openingHours);
        return false;
    }
}

// =========================
// APPLY FILTERS
// =========================
function applyFilters() {
    let filteredClinics = [...clinics];
    const searchValue = clinicSearchInput.value.toLowerCase().trim();

    // SEARCH FILTER
    if (searchValue !== "") {
        filteredClinics = filteredClinics.filter(clinic =>
            clinic.name?.toLowerCase().includes(searchValue) ||
            clinic.address?.toLowerCase().includes(searchValue)
        );
    }

    // OPEN NOW FILTER
    if (openNowActive) {
        filteredClinics = filteredClinics.filter(clinic =>
            isClinicOpenNow(clinic.opening_hours)
        );
    }

    // NEAR ME SORT
    if (nearMeActive && userLocation) {
        filteredClinics.forEach(clinic => {
            clinic.distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                clinic.latitude,
                clinic.longitude
            );
        });

        filteredClinics.sort((a, b) => a.distance - b.distance);
    }

    displayClinics(filteredClinics);
}

// =========================
// SEARCH EVENT
// =========================
clinicSearchInput.addEventListener("input", applyFilters);

// =========================
// NEAR ME BUTTON
// =========================
nearMeBtn.addEventListener("click", async () => {
    try {
        if (!nearMeActive) {
            userLocation = await getUserLocation();
            nearMeActive = true;
            nearMeBtn.classList.add("active");
        } else {
            nearMeActive = false;
            nearMeBtn.classList.remove("active");
        }

        applyFilters();
    } catch (error) {
        console.error(error);
        alert("Could not get your location. Please allow location access.");
    }
});

// =========================
// OPEN NOW BUTTON
// =========================
openNowBtn.addEventListener("click", () => {
    openNowActive = !openNowActive;
    openNowBtn.classList.toggle("active");
    applyFilters();
});

// =========================
// START APP
// =========================
loadClinics();

