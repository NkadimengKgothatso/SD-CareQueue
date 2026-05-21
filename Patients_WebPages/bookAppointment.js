// APPOINTMENT BOOKING MODULE
// Handles patient appointment booking and rescheduling with clinic search, time slot management, and geolocation features

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

// RESCHEDULE MODE DETECTION
// Check if user is accessing this page to reschedule an existing appointment
// URL params: mode=reschedule&id=<appointmentId>
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");
const appointmentId = urlParams.get("id");
const isRescheduleMode = mode === "reschedule";

const pageTitle = document.getElementById("pageTitle");

if (isRescheduleMode && pageTitle) {
    pageTitle.textContent = "Reschedule Appointment";
}

// TIME SLOT MANAGEMENT
// Tracks user selections and filter states for displaying available appointment times
const timeSlotsContainer = document.getElementById("timeSlots");
const selectedTimeInput = document.getElementById("selectedTime");

const nearMeBtn = document.getElementById("nearMeBtn");
const openNowBtn = document.getElementById("openNowBtn");

let nearMeActive = false;   // User activated "Near Me" location-based sorting
let openNowActive = false;  // User activated "Open Now" filter for currently operating clinics
let userLocation = null;    // Cached user coordinates from geolocation API


//Counts total staff members available to work on a specific day at a clinic
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

// Retrieves all time slots that are fully booked for a given date and clinic
// A slot is fully booked when appointments equal available staff count
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


// Get clinic working hours based on staff availability
async function getClinicWorkingHours(selectedClinic, dayName) {

    const q = query(
        collection(db, "StaffAvailability"),
        where("clinicID", "==", Number(selectedClinic))
    );

    const snapshot = await getDocs(q);

  
    let earliestStart = null;
    let latestEnd = null;
    let hasWorkingStaff = false;

    // Loop through all staff records
    snapshot.forEach((doc) => {

    const data = doc.data();

    // Get the selected day's schedule from the schedule object
    const dayData = data.schedule?.[dayName];

  

    if (!dayData) {
        return;
    }

    if (dayData.isWorking === true) {
        hasWorkingStaff = true;

        if (!earliestStart || dayData.start < earliestStart) {
            earliestStart = dayData.start;
        }

        if (!latestEnd || dayData.end > latestEnd) {
            latestEnd = dayData.end;
        }
    }
    });

    // If no staff are working return null values
    if (!hasWorkingStaff) {
        return {
            startTime: null,
            endTime: null
        };
    }

    // Return clinic operating hours for that day
    return {
        startTime: earliestStart,
        endTime: latestEnd
    };
}






//Display Time Slots
// Generates 30-minute interval time slots between clinic operating hours
// Disables slots that are past, fully booked, or already booked by current user
async function renderTimeSlots(selectedDate, selectedClinic) {
    timeSlotsContainer.innerHTML = "";

    // Get selected day name from the selected date
    const dateObj = new Date(selectedDate);
    const dayName = dateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

    // Get clinic working hours for the selected day
    const { startTime, endTime } = await getClinicWorkingHours(
        selectedClinic,
        dayName
    );
  


    // If no staff are working on this day, show a message
    if (!startTime || !endTime) {
        timeSlotsContainer.innerHTML =
            "<p>No staff available for this day.</p>";
        return;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Count how many staff members are available on this day
    const availableStaff = await getStaffAvailableForDay(
        db,
        selectedClinic,
        dayName
    );

    // Get all appointments for the selected clinic and date
    const q = query(
        collection(db, "Appointments"),
        where("date", "==", selectedDate),
        where("clinicID", "==", Number(selectedClinic))
    );

    const snapshot = await getDocs(q);

    const slotCounts = {};

    // Count bookings per time slot
    snapshot.forEach(doc => {
        const data = doc.data();

        if ((data.status || "").toLowerCase() !== "cancelled") {
            slotCounts[data.time] = (slotCounts[data.time] || 0) + 1;
        }
    });

    const current = new Date();
    current.setHours(startHour, startMinute, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);

    const now = new Date();
    const today = now.toLocaleDateString("en-CA");

    while (current <= end) {
        const hour = current.getHours();
        const minute = current.getMinutes();

        const formattedTime = formatTime(hour, minute);

        const slotBtn = document.createElement("button");
        slotBtn.classList.add("time-slot");
        slotBtn.textContent = formattedTime;

        let isPast = false;

        // Disable past times only if the selected date is today
        if (selectedDate === today) {
            const slotTime = new Date();
            slotTime.setHours(hour, minute, 0, 0);

            if (slotTime <= now) {
                isPast = true;
            }
        }

    

        const bookingsForThisSlot = slotCounts[formattedTime] || 0;
        const isFullyBooked = bookingsForThisSlot >= availableStaff;

        // Check if the current logged-in patient already booked this same time slot
        const userAlreadyBooked = snapshot.docs.some(doc => {
            const data = doc.data();
            const status = (data.status || "").toLowerCase();

            return (data.userID === auth.currentUser?.uid && data.time === formattedTime && status !== "cancelled" && status !== "completed");
        });

        // Disable slot if it is past, fully booked, no staff are available,
        // or this patient already booked it
        if (isFullyBooked || isPast || availableStaff === 0 || userAlreadyBooked) {
            slotBtn.classList.add("disabled-slot");
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

        current.setMinutes(current.getMinutes() + 30);
    }
}

function formatTime(hour, minute) {
    const h = String(hour).padStart(2, "0");
    const m = String(minute).padStart(2, "0");
    return `${h}:${m}`;
}

//on change of selected clinic render the times accordingly




// CLINIC SEARCH FUNCTIONALITY
// Allows users to search and filter clinics by name, address, status, province, or services
const clinicSearchInput = document.getElementById("clinicSearch");
const clinicResults = document.getElementById("clinicResults");

let clinics = [];           // Master list of all clinics from database
let selectedClinicId;       // Currently selected clinic ID
let selectedClinicName;     // Currently selected clinic name



// Fetch clinics from firestore
// Loads clinic data and triggers rescheduling flow if in reschedule mode
async function loadClinics() {
    try {
        //Get clinics from Firestore
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

// Loads existing appointment data when rescheduling
// Pre-populates form fields with current appointment details
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
        populateReasonSelect(matchingClinic.service);
    }

    document.getElementById("appt-date").value        = data.date;
    selectedTimeInput.value                            = data.time;
    document.querySelector(".reason-select").value     = data.reason;

    renderTimeSlots(data.date, data.clinicID);

    const cards = document.querySelectorAll(".clinic-card");
    cards.forEach(card => {
        const name = card.querySelector(".clinic-name").textContent;
        if (name === matchingClinic?.name) {
            const btn = card.querySelector(".open-btn");
            btn.textContent = "Selected";
            btn.style.backgroundColor = "#1D9E75";
            btn.style.color = "#fff";
        } else {
            card.style.display = "none";
        }
    });

    clinicSearchInput.style.display = "none";
    nearMeBtn.style.display = "none";
    openNowBtn.style.display = "none";
}

// Renders clinic cards with select functionality
// Each card displays clinic info (name, distance if available) and selection button
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

            // Populate reason dropdown with this clinic's services from the DB
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


// HAVERSINE FORMULA
// Calculates great-circle distance between two geographic points in kilometers
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

// GET USER LOCATION
// Requests browser geolocation permission and returns user coordinates
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

// CHECK IF CLINIC IS OPEN NOW
// Parses opening hours format (e.g., "Mo-Fr 08:00-17:00") and checks if clinic is currently open
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

// APPLY FILTERS
// Combines search, "Open Now", and "Near Me" filters to display matching clinics
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

// SEARCH EVENT
// Trigger filtering when user types in clinic search box
clinicSearchInput.addEventListener("input", applyFilters);

// NEAR ME BUTTON
// Toggles location-based clinic sorting when clicked
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

// OPEN NOW BUTTON
// Toggles filter to show only currently operating clinics
openNowBtn.addEventListener("click", () => {

    // Toggle state
    openNowActive = !openNowActive;

    // Toggle button style
    openNowBtn.classList.toggle("active");

    applyFilters();
});

loadClinics();

// Display patient name and email on sidebar
// Updates when authentication state changes
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
// Prevents users from booking appointments in the past
const dateInput = document.getElementById("appt-date");

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate());

const minDate = tomorrow.toISOString().split("T")[0];
dateInput.setAttribute("min", minDate);


// CONFIRM APPOINTMENT BUTTON
// Validates form inputs and saves new appointment or updates existing one for reschedule
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

    // Check if this patient already has an active appointment on this date
   

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
            bookingDate: date,
            bookingTime: time,
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

// Trigger time slot refresh when user selects a different appointment date
dateInput.addEventListener("change", () => {
    if (dateInput.value && selectedClinicId) {
        renderTimeSlots(dateInput.value, selectedClinicId);
    }
});


// Generates user avatar with initials from name or email
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

// POPULATE REASON SELECT
// Fills appointment reason dropdown with services from selected clinic
// Falls back to default message if clinic has no services available
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
