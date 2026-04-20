// ================= Firebase Setup =================

// Import Firebase modules (App, Authentication, Firestore database)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Firebase configuration object used to connect to your Firebase project
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// Initialize Firebase app and services (Auth + Firestore)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ================= Global Variables =================

// References to UI sections (empty vs filled dashboard)
let emptyStates, filledStates;

// Map used to store clinic data for quick lookup
const clinicsMap = new Map();

// Stores unsubscribe function for real-time queue listener
let queueUnsubscribe = null;


// ================= LOAD CLINICS =================

// Fetch all clinics from Firestore and store them locally
async function loadClinics() {
    try {
        // Clear old data before reloading
        clinicsMap.clear();

        // Get all clinic documents
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        // Loop through each document and store it in the map
        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const clinicId = c.id ? String(c.id) : docSnap.id;

            clinicsMap.set(clinicId, { ...c, id: clinicId });
        });

        console.log("Clinics loaded:", clinicsMap.size);

    } catch (err) {
        console.error("Failed to load clinics:", err);
    }
}


// ================= UI HELPERS =================

// Show empty dashboard (no appointments)
function showEmpty() {
    emptyStates.style.display = "block";
    filledStates.style.display = "none";
}

// Show filled dashboard (appointments exist)
function showFilled() {
    emptyStates.style.display = "none";
    filledStates.style.display = "block";
}


// ================= NAVIGATION =================

// Redirect user to appointments page
window.goToAppointments = function () {
    window.location.href = "MyAppointments.html";
};


// ================= LOAD APPOINTMENTS =================

// Load user appointments and display the next upcoming one
async function loadAppointments(userId) {

    console.log("Loading appointments for:", userId);

    // Get container where appointments will be displayed
    const container = document.getElementById("appointmentsContainer");
    container.innerHTML = "";

    try {
        // Query Firestore for this user's appointments
        const q = query(collection(db, "Appointments"), where("userID", "==", userId));
        const snapshot = await getDocs(q);

        // If no appointments found → show empty UI
        if (snapshot.empty) {
            showEmpty();
            return;
        }

        // Load clinic data for mapping clinic names
        await loadClinics();

        // Convert Firestore documents into array
        let appointments = [];
        snapshot.forEach(docSnap =>
            appointments.push({ id: docSnap.id, ...docSnap.data() })
        );

        // Get today's date (time reset to midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter upcoming appointments (not cancelled/completed)
        const upcoming = appointments
            .filter(a => {
                const apptDate = new Date(a.date);
                apptDate.setHours(0, 0, 0, 0);

                const notCancelled = !["cancelled", "completed"]
                    .includes((a.status || "").toLowerCase().trim());

                return apptDate >= today && notCancelled;
            })
            // Sort by date and time
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
                const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
                return dateA - dateB;
            });

        // If no upcoming appointments → show empty UI
        if (upcoming.length === 0) {
            showEmpty();
            return;
        }

        // Get the next upcoming appointment
        const next = upcoming[0];

        showFilled();

        // Load visit count for this clinic
        await loadVisitsCount(userId, next.clinicID);

        // Get clinic name from map
        const clinic = clinicsMap.get(String(next.clinicID));
        const clinicName = clinic ? clinic.name : "Unknown Clinic";

        // Render appointment card in UI
        container.innerHTML = `...`;

        // Start real-time queue tracking
        loadQueueStatus(userId, next.id, Number(next.clinicID));

    } catch (error) {
        console.error("Firestore error:", error);
        showEmpty();
    }
}


// ================= LOAD QUEUE STATUS =================

// Tracks user's position in queue in real-time using Firestore listeners
function loadQueueStatus(userId, appointmentId, clinicID) {

    // Unsubscribe previous listener if exists
    if (queueUnsubscribe) queueUnsubscribe();

    let clinicUnsubscribe = null;

    // Reset UI when no queue data exists
    const setEmpty = () => {
        document.getElementById("queueCount").textContent = "Not in queue";
        document.getElementById("queueProgressText").textContent = "No active queue entry.";
        document.getElementById("progressPercent").textContent = "0%";
        document.getElementById("queueMeter").value = 0;
        document.getElementById("queuePosition").textContent = "-";
        document.getElementById("waitTime").textContent = "-";
    };

    // Listen to user's queue entry
    const q = query(
        collection(db, "Queues"),
        where("userID", "==", userId),
        where("appointmentId", "==", appointmentId)
    );

    queueUnsubscribe = onSnapshot(q, (snapshot) => {

        // Stop previous clinic listener if exists
        if (clinicUnsubscribe) {
            clinicUnsubscribe();
            clinicUnsubscribe = null;
        }

        // If no queue entry → reset UI
        if (snapshot.empty) {
            setEmpty();
            return;
        }

        let active = [];

        // Filter active queue entries
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const status = (data.status || "").toLowerCase().trim();

            if (["waiting", "scheduled", "active"].includes(status)) {
                active.push(data);
            }
        });

        if (active.length === 0) {
            setEmpty();
            return;
        }

        const queueData = active[0];

        // Listen to full clinic queue
        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", clinicID)
        );

        clinicUnsubscribe = onSnapshot(clinicQ, (clinicSnapshot) => {

            // Build sorted queue list
            const sorted = clinicSnapshot.docs
                .map(d => d.data())
                .filter(d =>
                    ["waiting", "scheduled", "active"]
                    .includes((d.status || "").toLowerCase().trim())
                )
                .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

            const total = sorted.length;

            // Find user's position
            const userIndex = sorted.findIndex(entry =>
                String(entry.appointmentId) === String(appointmentId)
            );

            const position = userIndex !== -1 ? userIndex + 1 : total;

            // Update UI: position
            document.getElementById("queueCount").textContent =
                `${position} out of ${total}`;

            // Calculate progress percentage
            let percent;

            if (total <= 1) percent = 100;
            else if (position === total) percent = 0;
            else percent = Math.round(((total - position) / (total - 1)) * 100);

            document.getElementById("progressPercent").textContent = `${percent}%`;
            document.getElementById("queueMeter").value = percent;

            // Generate queue message
            let message;

            if (position === 1) message = "You're next!";
            else if (position <= total / 3) message = "Almost there.";
            else if (position <= total / 2) message = "Moving steadily.";
            else message = "Still waiting.";

            document.getElementById("queueProgressText").textContent = message;

            // Calculate estimated wait time (30 mins per person)
            const wait = userIndex * 30;

            document.getElementById("queuePosition").textContent = position;
            document.getElementById("waitTime").textContent = `${wait} min`;

        });
    });
}


// ================= LOAD VISITS COUNT =================

// Count number of visits (excluding cancelled appointments)
async function loadVisitsCount(userId, clinicID) {
    try {
        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", userId),
            where("clinicID", "==", Number(clinicID))
        );

        const snapshot = await getDocs(q);

        let count = 0;

        snapshot.forEach(docSnap => {
            if ((docSnap.data().status || "").toLowerCase() !== "cancelled") {
                count++;
            }
        });

        // Update UI with visit count
        document.getElementById("visitsCount").textContent = count;

    } catch (error) {
        console.error("Visits count error:", error);
    }
}


// ================= INIT =================

// Runs when page loads
window.addEventListener("DOMContentLoaded", () => {

    // Get UI elements
    const nameEl = document.getElementById("userName");
    const roleEl = document.getElementById("userRole");
    const welcomeEl = document.getElementById("welcomeMessage");
    const dateEl = document.getElementById("currentDate");

    emptyStates = document.getElementById("emptyStates");
    filledStates = document.getElementById("filledStates");

    // Check authentication state
    onAuthStateChanged(auth, async (user) => {

        // If not logged in → redirect
        if (!user) {
            window.location.href = "/index.html";
            return;
        }

        try {
            // Get user data from Firestore
            const userSnap = await getDoc(doc(db, "Users", user.uid));

            if (userSnap.exists()) {
                const data = userSnap.data();

                // Update UI with user info
                nameEl.textContent = data.displayName || "User";
                roleEl.textContent = data.role || "Unknown";
                welcomeEl.textContent = `Welcome, ${data.displayName || "User"}`;
            }

            // Show current date
            dateEl.textContent = new Date().toLocaleDateString("en-ZA", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            // Load appointments
            await loadAppointments(user.uid);

        } catch (error) {
            console.error("Auth error:", error);
        }
    });
});


// ================= SIGN OUT =================

// Logs user out and redirects to login page
window.signOut = async function () {
    if (queueUnsubscribe) queueUnsubscribe();
    await firebaseSignOut(auth);
    window.location.href = "/index.html";
};


// ================= ACTIVE NAV LINK =================

// Highlight current page in sidebar navigation
const currentPage = window.location.pathname.split("/").pop();

document.querySelectorAll("aside nav ul li a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
    }
});