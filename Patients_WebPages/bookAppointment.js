// Import Firebase (MODULAR SDK)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey:            "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain:        "carequeue-284bb.firebaseapp.com",
    projectId:         "carequeue-284bb",
    storageBucket:     "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId:             "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================
// RESCHEDULE MODE (ADDED)
// =========================
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");
const appointmentId = urlParams.get("id");
const isRescheduleMode = mode === "reschedule";

const pageTitle = document.getElementById("pageTitle");

if (isRescheduleMode && pageTitle) {
    pageTitle.textContent = "Reschedule Appointment";
}

// =========================
// TIME SLOT FUNCTIONALITY
// =========================
const timeSlotsContainer = document.getElementById("timeSlots");
const selectedTimeInput = document.getElementById("selectedTime");

const nearMeBtn = document.getElementById("nearMeBtn");
const openNowBtn = document.getElementById("openNowBtn");

let nearMeActive = false;   // Tracks if "Near Me" filter is active
let openNowActive = false;  // Tracks if "Open Now" filter is active
let userLocation = null;    // Stores user's coordinates

async function renderTimeSlots(selectedDate, selectedClinic) {
    
    timeSlotsContainer.innerHTML = "";
  
    const bookedSlots = [];

    const q = query(
        collection(db, "Appointments"),
        where("date", "==", selectedDate),
        where("clinicID", "==", selectedClinic)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
        const data = doc.data();
        bookedSlots.push(data.time);
    });

    //  Get current date & time
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // format: YYYY-MM-DD

    for (let hour = 8; hour <= 17; hour++) {
        for (let minute of [0, 30]) {
            if (hour === 17 && minute === 30) continue;

            const formattedTime = formatTime(hour, minute);

            const slotBtn = document.createElement("button");
            slotBtn.classList.add("time-slot");
            slotBtn.textContent = formattedTime;

            let isPast = false;

            //Check if selected date is today
            if (selectedDate === today) {
                const slotTime = new Date();
                slotTime.setHours(hour, minute, 0, 0);

                if (slotTime < now) {
                    isPast = true;
                }
            }

            //If booked OR past → disable
            if (bookedSlots.includes(formattedTime) || isPast) {
                slotBtn.style.textDecoration = "line-through";
                slotBtn.style.color = "#999";
                slotBtn.style.backgroundColor = "#f2f2f2";
                slotBtn.style.cursor = "not-allowed";
                slotBtn.disabled = true; // important
            }

            slotBtn.addEventListener("click", () => {
                if (slotBtn.disabled) return; // extra safety

                document.querySelectorAll(".time-slot")
                    .forEach(btn => btn.classList.remove("selected"));

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

//on change of selected clinic render the times accordingly




// =========================
// CLINIC SEARCH FUNCTIONALITY
// =========================
const clinicSearchInput = document.getElementById("clinicSearch");
const clinicResults = document.getElementById("clinicResults"); 

let clinics = [];
let selectedClinicId;



// Fetch clinics from firestore
async function loadClinics() {
    try {
        // 🔥 Get clinics from Firestore
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        // Convert Firebase docs → usable array
        clinics = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        displayClinics(clinics);

        if (isRescheduleMode) {
            loadAppointmentForReschedule();
        }

    } catch (error) {
        console.error("Error loading clinics:", error);
        clinicResults.innerHTML = "<p>Failed to load clinics.</p>";
    }
}

// Load appointment data for reschedule
async function loadAppointmentForReschedule() {
    if (!appointmentId) return;

    const ref = doc(db, "Appointments", appointmentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();

    selectedClinicId = data.clinicID;


    document.getElementById("appt-date").value = data.date;
    selectedTimeInput.value = data.time;
    document.querySelector(".reason-select").value = data.reason;

    //load times
    renderTimeSlots(data.date, data.clinicID);
}

// Display clinics
function displayClinics(clinicList) {
    clinicResults.innerHTML = "";

    clinicList.forEach(clinic => {
        const clinicCard = document.createElement("section");
        clinicCard.classList.add("clinic-card");

        clinicCard.innerHTML = `
            <i class="fa-solid fa-house-chimney-medical clinic-icon"></i>

            <section class="clinic-info">
                <p class="clinic-name">${clinic.name}</p>

                <!-- Distance info -->
                <p class="clinic-bookings">
                    <i class="fa-solid fa-location-dot"></i>
                    ${clinic.distance !== undefined ? `${clinic.distance.toFixed(2)} km away` : "Click Near Me to see distance"}
                </p>
            </section>

            <button class="open-btn">Select</button>
        `;

        clinicCard.querySelector(".open-btn").addEventListener("click", () => {

        document.querySelectorAll(".open-btn").forEach(btn => {
            btn.textContent = "Select";
            btn.style.backgroundColor = "#E1F5EE";
            btn.style.color = "#085041";
        });

        selectedClinicId = clinic.id;

        const btn = clinicCard.querySelector(".open-btn");
        btn.textContent = "Selected";
        btn.style.backgroundColor = "#1D9E75";
        btn.style.color = "#fff";

        // ✅ ONLY render if date exists
        if (dateInput.value) {
            renderTimeSlots(dateInput.value, selectedClinicId);
        }
    });

        clinicResults.appendChild(clinicCard);
    });
}

clinicSearchInput.addEventListener("input", () => {
    const searchValue = clinicSearchInput.value.toLowerCase().trim();

    const filteredClinics = clinics.filter(clinic =>
        clinic.name && clinic.name.toLowerCase().includes(searchValue) && clinic.address.toLowerCase().includes(searchValue)
    );

    displayClinics(filteredClinics);
});


// =========================
// HAVERSINE FORMULA
// =========================
function calculateDistance(lat1, lon1, lat2, lon2) {

    // Radius of Earth in kilometers
    const R = 6371;

    // Convert differences to radians
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    // Haversine formula
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in km
    return R * c;
}

// =========================
// GET USER LOCATION
// =========================
function getUserLocation() {
    return new Promise((resolve, reject) => {

        // Check if browser supports geolocation
        if (!navigator.geolocation) {
            reject("Geolocation is not supported by this browser.");
            return;
        }

        // Get current position
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

    // If no opening hours provided → assume closed
    if (!openingHours) return false;

    const now = new Date();

    // Current day (0 = Sunday, 6 = Saturday)
    const currentDay = now.getDay();

    // Current time in minutes
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Map short day names to numbers
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
        // Split into day range and time range
        const [daysPart, timePart] = openingHours.split(" ");
        if (!daysPart || !timePart) return false;

        // Extract start and end day
        const [startDay, endDay] = daysPart.split("-");

        // Extract opening and closing times
        const [openTime, closeTime] = timePart.split("-");

        const startDayNum = dayMap[startDay];
        const endDayNum = dayMap[endDay];

        // Validate day values
        if (startDayNum === undefined || endDayNum === undefined) return false;

        // Check if today falls within range
        if (currentDay < startDayNum || currentDay > endDayNum) return false;

        // Convert times to minutes
        const [openHour, openMinute] = openTime.split(":").map(Number);
        const [closeHour, closeMinute] = closeTime.split(":").map(Number);

        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        // Check if current time is within range
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

    // Start with all clinics
    let filteredClinics = [...clinics];

    // Get search input value
    const searchValue = clinicSearchInput.value.toLowerCase().trim();

    // ================= SEARCH FILTER =================
    if (searchValue !== "") {
        filteredClinics = filteredClinics.filter(clinic =>
            clinic.name?.toLowerCase().includes(searchValue) ||
            clinic.address?.toLowerCase().includes(searchValue)
        );
    }

    // ================= OPEN NOW FILTER =================
    if (openNowActive) {
        filteredClinics = filteredClinics.filter(clinic =>
            isClinicOpenNow(clinic.opening_hours)
        );
    }

    // ================= NEAR ME SORT =================
    if (nearMeActive && userLocation) {

        // Calculate distance for each clinic
        filteredClinics.forEach(clinic => {
            clinic.distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                clinic.latitude,
                clinic.longitude
            );
        });

        // Sort clinics by nearest distance
        filteredClinics.sort((a, b) => a.distance - b.distance);
    }

    // Display final filtered list
    displayClinics(filteredClinics);
}

// =========================
// SEARCH EVENT
// =========================

// Trigger filtering when user types
clinicSearchInput.addEventListener("input", applyFilters);

// =========================
// NEAR ME BUTTON
// =========================
nearMeBtn.addEventListener("click", async () => {
    try {
        if (!nearMeActive) {

            // Get user's location when activated
            userLocation = await getUserLocation();

            nearMeActive = true;
            nearMeBtn.classList.add("active");

        } else {

            // Disable filter
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

    // Toggle state
    openNowActive = !openNowActive;

    // Toggle button style
    openNowBtn.classList.toggle("active");

    applyFilters();
});

loadClinics();

// display patient name on side bar
const nameSurnameEl = document.getElementById("name-Surname");

onAuthStateChanged(auth, (user) => {
    if (user) {
        nameSurnameEl.textContent = user.displayName;
    } else {
        nameSurnameEl.textContent = "Guest";
    }
});

// SET MIN DATE TO TOMORROW
const dateInput = document.getElementById("appt-date");

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate());

const minDate = tomorrow.toISOString().split("T")[0];
dateInput.setAttribute("min", minDate);


// CONFIRM APPOINTMENT BUTTON
const confirmBtn = document.querySelector(".confirm-Button");

confirmBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in");
        return;
    }

    const date = document.getElementById("appt-date").value;
    const time = selectedTimeInput.value;
    const reason = document.querySelector(".reason-select").value;

    // VALIDATE DATE (TOMORROW ONWARDS ONLY)
    const selectedDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tomorrowCheck = new Date(now);
    tomorrowCheck.setDate(now.getDate() + 1);

    if (selectedDate < tomorrowCheck) {
        alert("Please select a date from tomorrow onwards.");
        return;
    }

    if (!selectedClinicId || !date || !time || reason === "Select reason") {
        alert("Please fill in all fields");
        return;
    }

    // RESCHEDULE MODE
    if (isRescheduleMode) {
        const ref = doc(db, "Appointments", appointmentId);

        await updateDoc(ref, {
            clinicID: selectedClinicId,
            date: date,
            time: time,
            reason: reason,
            status: "rescheduled",
            updatedAt: serverTimestamp()
        });

        alert("Appointment rescheduled successfully!");
        window.location.href = "MyAppointments.html";
        return;
    }

    const q = query(
        collection(db, "Appointments"),
        where("clinicID", "==", selectedClinicId),
        where("date", "==", date),
        where("time", "==", time)
    );

    const existing = await getDocs(q);

    if (!existing.empty) {
        alert("This time slot is already booked. Please choose another.");
        return;
    }

    try {
        await addDoc(collection(db, "Appointments"), {
            clinicID: selectedClinicId,
            userID: user.uid,
            date: date,
            time: time,
            reason: reason,
            status: "scheduled",
            createdAT: serverTimestamp()
        });

        alert("Appointment booked successfully!");

        document.getElementById("appt-date").value = "";
        selectedTimeInput.value = "";
        document.querySelector(".reason-select").selectedIndex = 0;

        document.querySelectorAll(".time-slot").forEach(btn => {
            btn.classList.remove("selected");
        });

        document.querySelectorAll(".open-btn").forEach(btn => {
            btn.textContent = "Select";
            btn.style.backgroundColor = "#E1F5EE";
            btn.style.color = "#085041";
        });

        selectedClinicId = null;

        window.location.href = "MyAppointments.html";

    } catch (error) {
        console.error("Error booking appointment:", error);
        alert("Failed to book appointment");
    }
});
// Reschedule button
const rescheduleBtn = document.querySelector(".reschedule-Button");

if (rescheduleBtn) {
    rescheduleBtn.addEventListener("click", () => {
        console.log("Reschedule clicked - step 2 ready");
    });
}
// ================= highlight active page =================
  const currentPage = window.location.pathname.split("/").pop();

const links = document.querySelectorAll("aside nav ul li a");

links.forEach(link => {
    const linkPage = link.getAttribute("href");

    if (linkPage === currentPage) {
        link.classList.add("active");
    }
});

//on change of selected date render the times accordingly
dateInput.addEventListener("change", () => {
    if (dateInput.value && selectedClinicId) {
        renderTimeSlots(dateInput.value, selectedClinicId);
    }
});
