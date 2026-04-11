// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// ================= STATE ELEMENTS =================
let emptyStates, filledStates;

function showEmpty() {
    emptyStates.style.display = "block";
    filledStates.style.display = "none";
}

function showFilled() {
    emptyStates.style.display = "none";
    filledStates.style.display = "block";
}

// ================= MAIN =================
window.addEventListener("DOMContentLoaded", () => {

    const nameEl = document.getElementById("userName");
    const roleEl = document.getElementById("userRole");
    const welcomeEl = document.getElementById("welcomeMessage");
    const dateEl = document.getElementById("currentDate");

    emptyStates = document.getElementById("emptyStates");
    filledStates = document.getElementById("filledStates");

    // ================= AUTH =================
    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            window.location.href = "../Login/index.html";
            return;
        }

        try {

            // ===== USER DATA =====
            const userRef = doc(db, "Users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();

                nameEl.textContent = data.displayName || "No Name";
                roleEl.textContent = data.role || "No Role";
                welcomeEl.textContent = `Welcome back, ${data.displayName}`;
            }

            // ===== DATE =====
            dateEl.textContent = new Date().toLocaleDateString("en-ZA", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            // ===== LOAD APPOINTMENTS =====
            await loadAppointments(user.uid);

        } catch (error) {
            console.error("Error:", error);
        }
    });
});

// ================= LOAD NEXT APPOINTMENT =================
async function loadAppointments(userId) {

    const container = document.getElementById("appointmentsContainer");
    container.innerHTML = "";

    const q = query(
        collection(db, "Appointments"),
        where("patientId", "==", userId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        showEmpty();
        return;
    }

    // convert to array
    let appointments = [];

    snapshot.forEach(docSnap => {
        appointments.push(docSnap.data());
    });

    // sort by date (nearest first)
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date));

    const next = appointments[0];

    showFilled();

    const card = document.createElement("article");
    card.className = "appointment-card";

    card.innerHTML = `
        <p class="card-clinic">${next.clinic}</p>

        <ul class="card-meta">
            <li class="meta-item">${next.date}</li>
            <li class="meta-item">${next.time}</li>
            <li class="meta-item">${next.type}</li>
        </ul>

        <nav class="appointment-actions">
            <button class="view-btn">Track Queue</button>
            <button class="reschedule-btn">Reschedule</button>
            <button class="cancel-btn">Cancel</button>
        </nav>
    `;

    container.appendChild(card);
}

// ================= SIGN OUT =================
window.signOut = async function () {
    await firebaseSignOut(auth);
    window.location.href = "../Login/index.html";
};