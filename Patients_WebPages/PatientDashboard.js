// ================= Firebase Setup =================
// Import Firebase modules (App, Auth, Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Firebase configuration (connects frontend to backend Firebase project)
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// Initialize Firebase app + services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ================= Global Variables =================
// DOM state containers
let emptyStates, filledStates;

// Store clinics locally for fast lookup
const clinicsMap = new Map();

// Store unsubscribe function for real-time queue listener
let queueUnsubscribe = null;


// ================= LOAD CLINICS =================
// Loads all clinics from Firestore and stores them in a Map for quick access
async function loadClinics() {
    try {
        clinicsMap.clear();

        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const clinicId = c.id ? String(c.id) : docSnap.id;

            clinicsMap.set(clinicId, { ...c, id: clinicId });
        });

        console.log("Clinics loaded:", clinicsMap.size);

    } catch (err) {
        console.error("Failed to load clinics from Firestore:", err);
    }
}


// ================= UI HELPERS =================
// Show empty dashboard state (no data)
function showEmpty() {
    emptyStates.style.display = "block";
    filledStates.style.display = "none";
}

// Show filled dashboard state (data exists)
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
// Gets user's appointments and displays ONLY the next upcoming one
async function loadAppointments(userId) {

    console.log("Loading appointments for:", userId);

    const container = document.getElementById("appointmentsContainer");
    container.innerHTML = "";

    try {
        // Get all appointments for this user
        const q = query(collection(db, "Appointments"), where("userID", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showEmpty();
            return;
        }

        await loadClinics();

        // Convert Firestore data into array
        let appointments = [];
        snapshot.forEach(docSnap =>
            appointments.push({ id: docSnap.id, ...docSnap.data() })
        );

        // Get today's date (reset time to 00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter upcoming appointments (not cancelled/completed + future or today)
        const upcoming = appointments
            .filter(a => {
                const apptDate = new Date(a.date);
                apptDate.setHours(0, 0, 0, 0);

                const notCancelled = !["cancelled", "completed"]
                    .includes((a.status || "").toLowerCase().trim());

                return apptDate >= today && notCancelled;
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
                const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
                return dateA - dateB;
            });

        if (upcoming.length === 0) {
            showEmpty();
            return;
        }

        // Take next appointment
        const next = upcoming[0];

        if (!next) {
            showEmpty();
            return;
        }

        showFilled();

        // Count visits at clinic
        await loadVisitsCount(userId, next.clinicID);

        const clinic = clinicsMap.get(String(next.clinicID));
        const clinicName = clinic ? clinic.name : "Unknown Clinic";

        // Render appointment card
        container.innerHTML = `
            <li class="appointment-card upcoming-card">
                <span class="card-accent accent-upcoming"></span>

                <article class="card-body">

                    <header class="card-header">
                        <h2 class="clinic-name">${clinicName}</h2>
                        <button class="view-btn" onclick="goToAppointments()">View</button>
                    </header>

                    <div class="info-wrap">
                        <div class="info-row">
                            <i class="fa-regular fa-calendar"></i>
                            <span>${next.date}</span>
                        </div>

                        <div class="info-row">
                            <i class="fa-regular fa-clock"></i>
                            <span>${next.time}</span>
                        </div>

                        <div class="info-row">
                            <i class="fa-solid fa-notes-medical"></i>
                            <span>${next.reason || "General Appointment"}</span>
                        </div>
                    </div>

                    <footer class="card-footer">
                        <span class="status-badge ${(next.status || "scheduled").toLowerCase()}">
                            ${next.status || "Scheduled"}
                        </span>
                    </footer>

                </article>
            </li>
        `;

        // Load queue for this appointment
        loadQueueStatus(userId, next.id, Number(next.clinicID));

    } catch (error) {
        console.error("Firestore error:", error);
        showEmpty();
    }
}


// ================= LOAD QUEUE STATUS =================
// Listens in real-time to the user's position in the clinic queue for their upcoming appointment and updates the dashboard accordingly
// ================= LOAD QUEUE STATUS (FIXED) =================
function loadQueueStatus(userId, appointmentId, clinicID) {

    if (queueUnsubscribe) queueUnsubscribe();

    let clinicUnsubscribe = null;

    // Reset UI when user is not in queue
    const setEmpty = () => {
        document.getElementById("queueCount").textContent = "Not in queue";
        document.getElementById("queueProgressText").textContent = "No active queue entry.";
        document.getElementById("progressPercent").textContent = "0%";
        document.getElementById("queueMeter").value = 0;
        document.getElementById("queuePosition").textContent = "-";
        document.getElementById("waitTime").textContent = "-";
    };

    // Listen for user's queue entry
    const q = query(
        collection(db, "Queues"),
        where("userID", "==", userId),
        where("appointmentId", "==", appointmentId)
    );

    queueUnsubscribe = onSnapshot(q, (snapshot) => {

        if (clinicUnsubscribe) {
            clinicUnsubscribe();
            clinicUnsubscribe = null;
        }

        if (snapshot.empty) {
            setEmpty();
            return;
        }

        let active = [];

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

            // STEP 1: build sorted queue
            const sorted = clinicSnapshot.docs
                .map(d => d.data())
                .filter(d =>
                    ["waiting", "scheduled", "active"]
                    .includes((d.status || "").toLowerCase().trim())
                )
                .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

            const total = sorted.length;

            // STEP 2: find real user position
            const userIndex = sorted.findIndex(entry =>
                String(entry.appointmentId) === String(appointmentId)
            );

            const position = userIndex !== -1 ? userIndex + 1 : total;

            // ================= UI: POSITION =================
            document.getElementById("queueCount").textContent =
                `${position} out of ${total}`;

            // ================= PROGRESS (FIXED) =================
            let percent;

            if (total <= 1) {
                percent = 100;
            } else if (position === total) {
                percent = 0;
            } else {
                percent = Math.round(((total - position) / (total - 1)) * 100);
            }

            document.getElementById("progressPercent").textContent = `${percent}%`;
            document.getElementById("queueMeter").value = percent;

            // ================= MESSAGE =================
            let message;

            if (total === 0) {
                message = "No queue data.";
            }
            else if (position === 1) {
                message = "You're next! Please get ready.";
            }
            else if (position === total) {
                message = "You're last in the queue.";
            }
            else if (position <= total / 3) {
                message = "Almost there — you're very close.";
            }
            else if (position <= total / 2) {
                message = "You are moving steadily through the queue.";
            }
            else {
                message = "You're in the queue. We'll keep you updated.";
            }

            document.getElementById("queueProgressText").textContent = message;

            // ================= WAIT TIME (FIXED) =================
            const wait = userIndex * 30;

            document.getElementById("queuePosition").textContent = position;
            document.getElementById("waitTime").textContent = `${wait} min`;

        }, (error) => {
            console.error("Clinic queue listener error:", error);
            setEmpty();
        });

    }, (error) => {
        console.error("Queue listener error:", error);
        setEmpty();
    });

    // cleanup
    const originalUnsub = queueUnsubscribe;
    queueUnsubscribe = () => {
        originalUnsub();
        if (clinicUnsubscribe) clinicUnsubscribe();
    };
}


// ================= LOAD VISITS COUNT =================
// Counts how many times user visited clinic
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

        document.getElementById("visitsCount").textContent = count;

    } catch (error) {
        console.error("Visits count error:", error);
    }
}


// ================= INIT =================
// Runs when page loads and checks authentication
window.addEventListener("DOMContentLoaded", () => {

    const nameEl = document.getElementById("userName");
    const roleEl = document.getElementById("userRole");
    const welcomeEl = document.getElementById("welcomeMessage");
    const dateEl = document.getElementById("currentDate");

    emptyStates = document.getElementById("emptyStates");
    filledStates = document.getElementById("filledStates");

    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            window.location.href = "/index.html";
            return;
        }

        try {
            const userSnap = await getDoc(doc(db, "Users", user.uid));

            if (userSnap.exists()) {
                const data = userSnap.data();

                nameEl.textContent = data.displayName || "User";
                roleEl.textContent = data.role || "Unknown";
                welcomeEl.textContent = `Welcome, ${data.displayName || "User"}`;
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
    if (queueUnsubscribe) queueUnsubscribe();
    await firebaseSignOut(auth);
    window.location.href = "/index.html";
};


// ================= ACTIVE NAV LINK =================
const currentPage = window.location.pathname.split("/").pop();

document.querySelectorAll("aside nav ul li a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
    }
});