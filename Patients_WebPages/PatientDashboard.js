import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, signOut as firebaseSignOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
    getFirestore, doc, getDoc, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// ================= INIT =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= STATE =================
let emptyStates, filledStates;
const clinicsMap = new Map();

// ================= CLINICS =================
async function loadClinics() {
    try {
        const res = await fetch("./clinics.json");
        const clinics = await res.json();

        clinics.forEach(c => {
            clinicsMap.set(c.id.toString(), c);
        });

    } catch (err) {
        console.error("Failed to load clinics:", err);
    }
}

// ================= RENDER APPOINTMENT =================
function renderAppointment(data) {

    const container = document.getElementById("appointmentsContainer");

    const li = document.createElement("article");
    li.classList.add("appointment-card");

    const clinic = clinicsMap.get(String(data.clinicID));
    const clinicName = clinic ? clinic.name : "Unknown Clinic";

    li.innerHTML = `
        <p class="card-clinic">${clinicName}</p>

        <ul class="card-meta">
            <li>${data.date}</li>
            <li>${data.time}</li>
            <li>${data.reason || "Appointment"}</li>
        </ul>

        <nav class="appointment-actions">
            <button class="view-btn" onclick="goToAppointments()">View</button>
            <button class="reschedule-btn">Reschedule</button>
            <button class="cancel-btn">Cancel</button>
        </nav>
    `;

    container.appendChild(li);
}

// ================= SHOW STATES =================
function showEmpty() {
    emptyStates.style.display = "block";
    filledStates.style.display = "none";
}

function showFilled() {
    emptyStates.style.display = "none";
    filledStates.style.display = "block";
}

// ================= NAVIGATION =================
window.goToAppointments = function () {
    window.location.href = "MyAppointments.html";
};

// ================= LOAD APPOINTMENTS =================
async function loadAppointments(userId) {

    console.log("Loading appointments for:", userId);

    const container = document.getElementById("appointmentsContainer");
    container.innerHTML = "";

    try {
        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", userId)
        );

        const snapshot = await getDocs(q);

        console.log("Appointments found:", snapshot.size);

        if (snapshot.empty) {
            showEmpty();
            return;
        }

        await loadClinics();

        let appointments = [];

        snapshot.forEach(docSnap => {
            appointments.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        // ✅ keep only future appointments
        const today = new Date();

        const upcoming = appointments.filter(a =>
            new Date(a.date) >= today
        );

        if (upcoming.length === 0) {
            showEmpty();
            return;
        }

        // sort by nearest date
        upcoming.sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        // ✅ ONLY ONE APPOINTMENT (NEXT)
        const next = upcoming[0];

        showFilled();

        const clinic = clinicsMap.get(String(next.clinicID));
        const clinicName = clinic ? clinic.name : "Unknown Clinic";

        container.innerHTML = `
            <article class="appointment-card">

                <p class="card-clinic">${clinicName}</p>

                <ul class="card-meta">
                    <li>${next.date}</li>
                    <li>${next.time}</li>
                    <li>${next.reason || "Appointment"}</li>
                    <li>${next.status || "Scheduled"}</li>
                </ul>

                <nav class="appointment-actions">
                    <button class="view-btn" onclick="goToAppointments()">
                        View
                    </button>
                    
                </nav>

            </article>
        `;

    } catch (error) {
        console.error("Firestore error:", error);
        showEmpty();
    }
}
// ================= MAIN =================
window.addEventListener("DOMContentLoaded", () => {

    const nameEl = document.getElementById("userName");
    const roleEl = document.getElementById("userRole");
    const welcomeEl = document.getElementById("welcomeMessage");
    const dateEl = document.getElementById("currentDate");

    emptyStates = document.getElementById("emptyStates");
    filledStates = document.getElementById("filledStates");

    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            window.location.href = "../Login/index.html";
            return;
        }

        try {
            const userRef = doc(db, "Users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();

                nameEl.textContent = data.displayName || "User";
                roleEl.textContent = data.role || "Unknown";
                welcomeEl.textContent = `Welcome back, ${data.displayName || "User"}`;
            }

            dateEl.textContent = new Date().toLocaleDateString("en-ZA", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            await loadAppointments(user.uid);

        } catch (error) {
            console.error("Auth error:", error);
        }
    });
});

// ================= SIGN OUT =================
window.signOut = async function () {
    await firebaseSignOut(auth);
    window.location.href = "../Login/index.html";
};