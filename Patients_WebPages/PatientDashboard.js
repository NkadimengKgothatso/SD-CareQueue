// ================= Firebase Setup =================
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signOut as firebaseSignOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadQueueStatusML } from "./carequeue-ml/js/waitTimeML.js";

// ================= Firebase Config =================
// Firebase project credentials for CareQueue application
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// ================= Initialize Firebase =================
// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ================= Global Variables =================
// DOM elements for empty and filled states
let emptyStates, filledStates;

// Cache clinic information retrieved from Firestore
const clinicsMap = new Map();
// Cleanup function for queue status real-time listener
let queueUnsubscribe = null;

// Store logged-in patient information
let patientName  = "";
let patientEmail = "";


// ================= LOAD CLINICS =================
// Fetch all clinic data from Firestore and cache for quick lookups
async function loadClinics() {
    try {
        clinicsMap.clear();
        const snapshot = await getDocs(collection(db, "clinicsObjects"));
        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const clinicId = c.id ? String(c.id) : docSnap.id;
            clinicsMap.set(clinicId, { ...c, id: clinicId });
        });
    } catch (err) {
        console.error("Failed to load clinics:", err);
    }
}


// ================= UI HELPERS =================
// Display the empty state message when no appointments exist
function showEmpty() {
    emptyStates.style.display = "block";
    filledStates.style.display = "none";
}

// Display the filled state showing next appointment details
function showFilled() {
    emptyStates.style.display = "none";
    filledStates.style.display = "block";
}


// ================= NAVIGATION =================
// Navigate to appointments list page
window.goToAppointments = function () {
    window.location.href = "MyAppointments.html";
};


// ================= AVATAR INITIALS =================
// Generate and display user avatar initials from name or email
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


// ================= LOAD APPOINTMENTS =================
// Fetch patient's appointments and display the next upcoming one
async function loadAppointments(userId) {

    const container = document.getElementById("appointmentsContainer");
    container.innerHTML = "";

    try {
        // Query Firestore for all appointments of this patient
        const q = query(collection(db, "Appointments"), where("userID", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) { showEmpty(); return; }

        await loadClinics();

        // Build array of appointments from query results
        let appointments = [];
        snapshot.forEach(docSnap => appointments.push({ id: docSnap.id, ...docSnap.data() }));

        // Filter to get only future, active appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = appointments
            .filter(a => {
                const apptDate = new Date(a.date);
                apptDate.setHours(0, 0, 0, 0);
                // Exclude cancelled and completed appointments
                const notCancelled = !["cancelled", "completed"].includes((a.status || "").toLowerCase().trim());
                return apptDate >= today && notCancelled;
            })
            .sort((a, b) => {
                // Sort by date and time (earliest first)
                const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
                const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
                return dateA - dateB;
            });

        if (upcoming.length === 0) { showEmpty(); return; }

        const next = upcoming[0];

        showFilled();

        // Load visit history count for this clinic
        await loadVisitsCount(userId, next.clinicID);

        // Get clinic name from cache
        const clinicIDStr = String(next.clinicID);
        const clinic      = clinicsMap.get(clinicIDStr);
        const clinicName  = clinic ? clinic.name : "Unknown Clinic";

        // Render appointment card with details
        container.innerHTML = `
            <li class="appointment-card upcoming-card">
                <section class="card-accent accent-upcoming"></section>
                <article class="card-body">
                    <header class="card-header">
                        <h2 class="clinic-name">${clinicName}</h2>
                        <button class="view-btn" onclick="goToAppointments()">View</button>
                    </header>
                    <section class="info-wrap">
                        <section class="info-row">
                            <i class="fa-regular fa-calendar"></i>
                            <section>${next.date}</section>
                        </section>
                        <section class="info-row">
                            <i class="fa-regular fa-clock"></i>
                            <section>${next.time}</section>
                        </section>
                        <section class="info-row">
                            <i class="fa-solid fa-notes-medical"></i>
                            <section>${next.reason || "General Appointment"}</section>
                        </section>
                    </section>
                    <footer class="card-footer">
                        <section class="status-badge ${(next.status || "scheduled").toLowerCase()}">
                            ${next.status || "Scheduled"}
                        </section>
                    </footer>
                </article>
            </li>
        `;

        // Set up real-time queue monitoring and ML-based wait time predictions
        if (queueUnsubscribe) { queueUnsubscribe(); }
        queueUnsubscribe = loadQueueStatusML(
            userId,
            next.id,
            next.clinicID,
            db,
            clinicName,
            patientName,
            patientEmail
        );

    } catch (error) {
        console.error("Firestore error:", error);
        showEmpty();
    }
}


// ================= LOAD VISITS COUNT =================
// Count patient's previous visits to a specific clinic
async function loadVisitsCount(userId, clinicID) {
    try {
        // Query appointments for this patient at this clinic, excluding cancelled ones
        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", userId),
            where("clinicID", "==", Number(clinicID))
        );
        const snapshot = await getDocs(q);

        let count = 0;
        snapshot.forEach(docSnap => {
            if ((docSnap.data().status || "").toLowerCase() !== "cancelled") count++;
        });

        // Display visit count in UI
        document.getElementById("visitsCount").textContent = count;

    } catch (error) {
        console.error("Visits count error:", error);
    }
}


// ================= INIT =================
// Initialize dashboard on page load
window.addEventListener("DOMContentLoaded", () => {

    const nameEl    = document.getElementById("userName");
    const roleEl    = document.getElementById("userRole");
    const welcomeEl = document.getElementById("welcomeMessage");
    const dateEl    = document.getElementById("currentDate");

    emptyStates  = document.getElementById("emptyStates");
    filledStates = document.getElementById("filledStates");

    // Check authentication state and load user data
    onAuthStateChanged(auth, async (user) => {

        if (!user) { window.location.href = "/index.html"; return; }

        try {
            // Fetch user profile from Firestore
            const userSnap = await getDoc(doc(db, "Users", user.uid));

            if (userSnap.exists()) {
                const data  = userSnap.data();
                const name  = data.displayName || "";
                const email = user.email || "";

                // Store patient information for use in queue listeners
                patientName  = name;
                patientEmail = email;

            // Populate dashboard header with user info
            if (nameEl) {
                nameEl.textContent = name || "User";
            }
            
            if (roleEl) {
                roleEl.textContent = data.role || "Unknown";
            }
            
            if (welcomeEl) {
                welcomeEl.textContent = `Welcome, ${name || "User"}`;
            }
            
            const userEmailEl = document.getElementById("userEmail");
            
            if (userEmailEl) {
                userEmailEl.textContent = email || "";
            }

                setAvatarInitial(name, email);
            }

            // Display current date in local South African format
                      
            if (dateEl) {
                dateEl.textContent = new Date().toLocaleDateString("en-ZA", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
            }

            // Load and display patient's appointments
            await loadAppointments(user.uid);

        } catch (error) {
            console.error("Auth error:", error);
        }
    });
});


// ================= SIGN OUT =================
// Clean up listeners and sign out user
window.signOut = async function () {
    if (queueUnsubscribe) {
        queueUnsubscribe();
        queueUnsubscribe = null;
    }
    await firebaseSignOut(auth);
    window.location.href = "/index.html";
};


// ================= ACTIVE NAV LINK =================
// Highlight the active navigation link based on current page
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll("aside nav ul li a").forEach(link => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
});


export {
    showEmpty,
    showFilled,
    setAvatarInitial,
    loadVisitsCount,
};
