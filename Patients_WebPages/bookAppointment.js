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


//Count Number Of Staff
async function getStaffAvailableForDay(db, clinicId, dayName) {
    const q = query(
        collection(db, "StaffAvailability"),
        where("clinicID", "==", Number(clinicId))
    );

    const snapshot = await getDocs(q);

    let availableStaff = 0;

    snapshot.forEach((doc) => {
        const data = doc.data();

        if (data.schedule?.[dayName]?.isWorking === true) {
            availableStaff++;
        }
    });

    return availableStaff;
}

async function getBookedSlots(db, selectedDate, selectedClinic) {
    const dateObj = new Date(selectedDate);
    const dayName = dateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

    const availableStaff = await getStaffAvailableForDay(
        db,
        selectedClinic,
        dayName
    );

    const q = query(
        collection(db, "Appointments"),
        where("date", "==", selectedDate),
        where("clinicID", "==", Number(selectedClinic))
    );

    const snapshot = await getDocs(q);

    const slotCounts = {};

    snapshot.forEach((doc) => {
        const data = doc.data();

        if (data.status !== "cancelled") {
            slotCounts[data.time] = (slotCounts[data.time] || 0) + 1;
        }
    });

    const fullyBookedSlots = [];

    Object.keys(slotCounts).forEach((time) => {
        if (slotCounts[time] >= availableStaff) {
            fullyBookedSlots.push(time);
        }
    });

    return fullyBookedSlots;
}


async function renderTimeSlots(selectedDate, selectedClinic) {
    timeSlotsContainer.innerHTML = "";

    const dateObj = new Date(selectedDate);
    const dayName = dateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

    const availableStaff = await getStaffAvailableForDay(
        db,
        selectedClinic,
        dayName
    );

    const q = query(
        collection(db, "Appointments"),
        where("date", "==", selectedDate),
        where("clinicID", "==", Number(selectedClinic))
    );

    const snapshot = await getDocs(q);

    const slotCounts = {};

    snapshot.forEach(doc => {
        const data = doc.data();

        if ((data.status || "").toLowerCase() !== "cancelled") {
            slotCounts[data.time] = (slotCounts[data.time] || 0) + 1;
        }
    });

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    for (let hour = 8; hour <= 17; hour++) {
        for (let minute of [0, 30]) {
            if (hour === 17 && minute === 30) continue;

            const formattedTime = formatTime(hour, minute);

            const slotBtn = document.createElement("button");
            slotBtn.classList.add("time-slot");
            slotBtn.textContent = formattedTime;

            let isPast = false;

            if (selectedDate === today) {
                const slotTime = new Date();
                slotTime.setHours(hour, minute, 0, 0);

                if (slotTime < now) {
                    isPast = true;
                }
            }

            const bookingsForThisSlot = slotCounts[formattedTime] || 0;
            const isFullyBooked = bookingsForThisSlot >= availableStaff;

            if (isFullyBooked || isPast || availableStaff === 0) {
                slotBtn.style.textDecoration = "line-through";
                slotBtn.style.color = "#999";
                slotBtn.style.backgroundColor = "#f2f2f2";
                slotBtn.style.cursor = "not-allowed";
                slotBtn.disabled = true;
            }

            slotBtn.addEventListener("click", () => {
                if (slotBtn.disabled) return;

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
let selectedClinicName;



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

async function loadAppointmentForReschedule() {
    if (!appointmentId) return;

    const ref  = doc(db, "Appointments", appointmentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();

    selectedClinicId = data.clinicID;

    // Find the clinic object so we can populate its services
    const matchingClinic = clinics.find(c => String(c.id) === String(data.clinicID));
    if (matchingClinic) {
        // ✅ Restore services dropdown before setting the selected reason
        populateReasonSelect(matchingClinic.service);
    }

    document.getElementById("appt-date").value        = data.date;
    selectedTimeInput.value                            = data.time;
    document.querySelector(".reason-select").value     = data.reason;

    renderTimeSlots(data.date, data.clinicID);
}

function displayClinics(clinicList) {
    clinicResults.innerHTML = "";

    clinicList.forEach(clinic => {
        const clinicCard = document.createElement("section");
        clinicCard.classList.add("clinic-card");

        clinicCard.innerHTML = `
            <i class="fa-solid fa-house-chimney-medical clinic-icon"></i>
            <section class="clinic-info">
                <p class="clinic-name">${clinic.name}</p>
                <p class="clinic-bookings">
                    <i class="fa-solid fa-location-dot"></i>
                    ${clinic.distance !== undefined 
                        ? `${clinic.distance.toFixed(2)} km away` 
                        : "Click Near Me to see distance"}
                </p>
            </section>
            <button class="open-btn">Select</button>
        `;

        clinicCard.querySelector(".open-btn").addEventListener("click", () => {

            // Reset all other select buttons
            document.querySelectorAll(".open-btn").forEach(btn => {
                btn.textContent         = "Select";
                btn.style.backgroundColor = "#E1F5EE";
                btn.style.color           = "#085041";
            });

            selectedClinicId   = clinic.id;
            selectedClinicName = clinic.name;

            // Mark this clinic as selected
            const btn               = clinicCard.querySelector(".open-btn");
            btn.textContent         = "Selected";
            btn.style.backgroundColor = "#1D9E75";
            btn.style.color           = "#fff";

            // ✅ Populate reason dropdown with this clinic's services from the DB
            populateReasonSelect(clinic.service);

            // Only render time slots if a date is already selected
            if (dateInput.value) {
                renderTimeSlots(dateInput.value, selectedClinicId);
            }
        });

        clinicResults.appendChild(clinicCard);
    });
}

clinicSearchInput.addEventListener("input", () => {
    const searchValue = clinicSearchInput.value.toLowerCase().trim();

    const filtered = clinics.filter(c =>
        (c.name    || "").toLowerCase().includes(searchValue) ||
        (c.address || "").toLowerCase().includes(searchValue) ||
        (c.status  || "").toLowerCase().includes(searchValue) ||
        (c.province || "").toLowerCase().includes(searchValue) ||
        (c.service ? (Array.isArray(c.service) 
            ? c.service.join(" ").toLowerCase() 
            : c.service.toLowerCase()) : "").includes(searchValue)
    );

    displayClinics(filtered);
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
const nameSurnameEl = document.getElementById("userName");
const emailEl =  document.getElementById("userEmail");

onAuthStateChanged(auth, (user) => {
    if (user) {
        nameSurnameEl.textContent = user.displayName;
        emailEl.textContent = user.email;
        setAvatarInitial(user.displayName, user.email);
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
    tomorrowCheck.setDate(now.getDate());

     const clinicIdNum = Number(selectedClinicId);

    
    if (!selectedClinicId || !date || !time || reason === "Select reason") {
        alert("Please fill in all fields");
        return;
    }

    // RESCHEDULE MODE
    if (isRescheduleMode) {
        const ref = doc(db, "Appointments", appointmentId);

        await updateDoc(ref, {
            clinicID: clinicIdNum,
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

  

        const bookingQuery = query(
            collection(db, "Appointments"),
            where("clinicID", "==", clinicIdNum),
            where("date", "==", date),
            where("time", "==", time)
        );

        const bookingSnapshot = await getDocs(bookingQuery);

        const selectedDay = new Date(date)
            .toLocaleDateString("en-US", { weekday: "long" })
            .toLowerCase();

        const availableStaff = await getStaffAvailableForDay(
            db,
            clinicIdNum,
            selectedDay
        );

        let currentBookings = 0;

        bookingSnapshot.forEach(doc => {
            const data = doc.data();

            if ((data.status || "").toLowerCase() !== "cancelled") {
                currentBookings++;
            }
        });

        if (availableStaff === 0 || currentBookings >= availableStaff) {
            alert("This time slot is fully booked.");
            return;
        }

   


    try {
         //Adding Appointment to database
        await addDoc(collection(db, "Appointments"), {
            clinicID: clinicIdNum,
            userID: user.uid,
            date: date,
            clinicName: selectedClinicName,
            patientEmail : user.email,
            time: time,
            reason: reason,
            status: "scheduled",
            createdAT: serverTimestamp()
        });
        //Patient Notifications
         await addDoc(collection(db, "Notifications"), {
            userID: user.uid,
            clinicID: clinicIdNum,
            clinicName: selectedClinicName,
            type: "Appointment",
            title: "Appointment Booked",
            message: `Your ${reason} appointment at ${selectedClinicName} is booked for ${date} at ${time}. Please arrive 10 minutes early.`,
            read: false,
            createdAt: serverTimestamp()
        });

        // Staff notification
        await addDoc(collection(db, "Notifications"), {
            targetRole: "staff",
            clinicID: clinicIdNum,
            clinicName: selectedClinicName,
            type: "Appointment",
            title: "New Appointment Booked",
            message: `A new ${reason} appointment has been booked at ${selectedClinicName} for ${date} at ${time}.`,
            read: false,
            createdAt: serverTimestamp()
        });

/*        emailjs.init("jWEiS_k1FnVa1Zz5S");

        await emailjs.send("service_j8zb3jh", "template_4onbz1h", {
            email: user.email,
            name: user.displayName || "Patient",
            clinic_name: selectedClinicName,
            appointment_reason: reason,
            appointment_date: date,
            appointment_time: time
        });*/


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


function setAvatarInitial(name, email) {
    let initials = "";
    if (name && name.trim().length > 0) {
        const parts = name.trim().split(" ");
        initials += parts[0].charAt(0);
        if (parts.length > 1) initials += parts[parts.length - 1].charAt(0);
    } else if (email && email.length > 0) {
        initials = email.charAt(0);
    }
    document.getElementById("patientAvatar").textContent = initials.toUpperCase();
}

// =========================
// POPULATE REASON SELECT
// =========================

// Populates the reason dropdown with the selected clinic's services from the database
// Falls back to a default list if the clinic has no services stored
function populateReasonSelect(services) {
    const reasonSelect = document.querySelector(".reason-select");

    // Clear existing options
    reasonSelect.innerHTML = "";

    // Default placeholder
    const placeholder = document.createElement("option");
    placeholder.value    = "";
    placeholder.textContent = "Select reason";
    placeholder.disabled = true;
    placeholder.selected = true;
    reasonSelect.appendChild(placeholder);

    // If clinic has no services, show a fallback message
    if (!services || services.length === 0) {
        const fallback = document.createElement("option");
        fallback.disabled    = true;
        fallback.textContent = "No services available for this clinic";
        reasonSelect.appendChild(fallback);
        return;
    }

    // Add each service from the clinic's database record as an option
    services.forEach(service => {
        const option       = document.createElement("option");
        option.value       = service;
        option.textContent = service;
        reasonSelect.appendChild(option);
    });
}

export {
    formatTime,
    calculateDistance,
    getUserLocation,
    isClinicOpenNow,
    applyFilters,
    displayClinics,
    renderTimeSlots
};
