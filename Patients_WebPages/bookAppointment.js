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

// =========================
// TIME SLOT FUNCTIONALITY
// =========================
const timeSlotsContainer = document.getElementById("timeSlots");
const selectedTimeInput = document.getElementById("selectedTime");

function renderTimeSlots() {
    timeSlotsContainer.innerHTML = "";

    for (let hour = 8; hour <= 17; hour++) {
        for (let minute of [0, 30]) {
            if (hour === 17 && minute === 30) continue;

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
let selectedClinicId;

// Fetch clinics from JSON file
async function loadClinics() {
    try {
        const response = await fetch("./clinics.json");
        clinics = await response.json();
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
                <p class="clinic-services">Primary healthcare services</p>
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
        });

        clinicResults.appendChild(clinicCard);
    });
}

clinicSearchInput.addEventListener("input", () => {
    const searchValue = clinicSearchInput.value.toLowerCase().trim();

    const filteredClinics = clinics.filter(clinic =>
        clinic.name && clinic.name.toLowerCase().includes(searchValue)
    );

    displayClinics(filteredClinics);
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