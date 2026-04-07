
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const nameSurnameEl = document.querySelector(".name-Surname");
const upcomingList = document.getElementById("upcoming");

let clinicsMap = new Map();

async function loadClinics() {
    try {
        const response = await fetch("./clinics.json");
        const clinics = await response.json();
        clinics.forEach(clinic => {
            clinicsMap.set(clinic.id.toString(), clinic); // store with string keys
        });
    } catch (error) {
        console.error("Failed to load clinics:", error);
    }
}

function renderAppointment(appointment) {
    const li = document.createElement("li");
    li.classList.add("appointment-card");

    const clinic = clinicsMap.get(appointment.clinicID.toString());
    const clinicName = clinic ? clinic.name : "Unknown Clinic";

    li.innerHTML = `
        <span class="card-accent accent-upcoming"></span>
        <article class="card-body">
            <p class="card-clinic">${clinicName}</p>
            <span class="badge badge-upcoming">Scheduled</span>
            <ul class="card-meta">
                <li class="meta-item"><i class="fa-solid fa-calendar-day meta-icon"></i> ${appointment.date}</li>
                <li class="meta-item"><i class="fa-solid fa-clock meta-icon"></i> ${appointment.time}</li>
            </ul>
            <nav class="appointment-actions">
                <button class="view-btn">View</button>
                <button class="reschedule-btn">Reschedule</button>
                <button class="cancel-btn">Cancel</button>
            </nav>
        </article>
    `;
    upcomingList.appendChild(li);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        nameSurnameEl.textContent = user.displayName;

        // Load clinics first
        await loadClinics();

        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", user.uid)
        );

        const snapshot = await getDocs(q);
        upcomingList.innerHTML = ""; // Clear current list

        const today = new Date();
        // Render only upcoming appointments
        snapshot.forEach(doc => {
            const data = doc.data();
            const apptDate = new Date(data.date); // assumes date string "YYYY-MM-DD"

            if (apptDate >= today) {
                renderAppointment({
                    clinicID: data.clinicID,
                    date: data.date,
                    time: data.time
                });
            }
        });
    } else {
        nameSurnameEl.textContent = "Guest";
        upcomingList.innerHTML = "<p>Please log in to view your appointments.</p>";
    }
});