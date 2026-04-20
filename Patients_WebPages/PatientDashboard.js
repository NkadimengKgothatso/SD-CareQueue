// ================= Firebase Setup=================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore, doc, getDoc, collection, query, where, getDocs,onSnapshot  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// connectng th app to firebase
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};


// Initialize  he ap so that we can talk to backend (firebase services  )
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ================= Global Variables =================
let emptyStates, filledStates;
const clinicsMap = new Map();

// holds the live listener so we can cancel it on sign-out
let queueUnsubscribe = null;


// ================= LOAD CLINICS =================
// We load all clinics at once and store in a map for quick access when displaying appointments
async function loadClinics() {
    
    try {
        
        clinicsMap.clear();
    
        const snapshot = await getDocs(collection(db, "clinicsObjects"));
        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const clinicId = c.id ? String(c.id) : docSnap.id;
            // Store clinic data in the map with clinicId as key for easy lookup later
            clinicsMap.set(clinicId, { ...c, id: clinicId });
        });
        // For debugging: log how many clinics were loaded
        console.log("Clinics loaded:", clinicsMap.size);
    } catch (err) {
        console.error("Failed to load clinics from Firestore:", err);
    }
}


// ================= UI HELPERS =================
// These functions switch between showing the empty state (no appointments) and the filled state (upcoming appointment)
function showEmpty() {
    emptyStates.style.display = "block";
    filledStates.style.display = "none";
}

function showFilled() {
    emptyStates.style.display = "none";
    filledStates.style.display = "block";
}
// ================= NAVIGATION =================   
// Simple function to navigate to the appointments page when the "View" button is clicked on an appointment card
window.goToAppointments = function () {
    window.location.href = "MyAppointments.html";
};


// ================= LOAD APPOINTMENTS =================

async function loadAppointments(userId) {
    // For debugging
    console.log("Loading appointments for:", userId);

    // creating a contaner using the space in the html struture to put the appointments in ab
    const container = document.getElementById("appointmentsContainer");
    container.innerHTML = "";

    try {
        // Query Firestore for appointments belonging to the current user
        const q = query(collection(db, "Appointments"), where("userID", "==", userId));
        const snapshot = await getDocs(q);
    
        if (snapshot.empty) { showEmpty(); return; }
       // Load clinics data so we can display clinic names on the appointment cards
        await loadClinics();
        // Process the appointments into a more usable format (array of objects with id and data)
        let appointments = [];
        snapshot.forEach(docSnap => appointments.push({ id: docSnap.id, ...docSnap.data() }));

        // Filter for upcoming appointments (today or later, and not cancelled/completed), then sort by date and time
        const today = new Date();
            today.setHours(0, 0, 0, 0);
        // We consider an appointment upcoming if it's scheduled for today or a future date, and its status is not "cancelled" or "completed"
       const upcoming = appointments
            .filter(a => {
                const apptDate = new Date(a.date);
                apptDate.setHours(0, 0, 0, 0);
                const notCancelled = !["cancelled", "completed"].includes((a.status || "").toLowerCase().trim());
                return apptDate >= today && notCancelled;
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
                const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
                return dateA - dateB;
            });
            // we take the first upcoming appointment (the soonest one) to display on the dashboard. 
        const next = upcoming[0];
        showFilled();
        await loadVisitsCount(userId, next.clinicID);

        // Look up the clinic name using the clinicID from the appointment. We use the clinicsMap we loaded earlier for this.
        const clinic = clinicsMap.get(String(next.clinicID));
        const clinicName = clinic ? clinic.name : "Unknown Clinic";


        // Now we build the HTML for the appointment card using the data from the next appointment and the clinic name. We also include a "View" button that navigates to the appointments page.
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
                        <span class="status-badge ${next.status?.toLowerCase() || "scheduled"}">
                            ${next.status || "Scheduled"}
                        </span>
                    </footer>
                </article>
            </li>`;

    } catch (error) {
        console.error("Firestore error:", error);
        showEmpty();
    }
}



// ================= LOAD QUEUE STATUS (REAL-TIME FIXED) =================
// This function sets up a real-time listener on the "Queues" collection to get live updates on the user's queue status.
//  It also queries the entire clinic queue to calculate the user's position and estimated wait time.


function loadQueueStatus(userId) {
    
    if (queueUnsubscribe) queueUnsubscribe();
    // updating the empty state when the user is not in queue or if there's an error with the listener
    const setEmpty = () => {
        document.getElementById("queueCount").textContent = "Not in queue";
        document.getElementById("queueProgressText").textContent = "No active queue entry.";
        document.getElementById("progressPercent").textContent = "0%";
        document.getElementById("queueMeter").value = 0;
        document.getElementById("queuePosition").textContent = "-";
        document.getElementById("waitTime").textContent = "-";
    };

    // We listen for any changes to the user's queue entries in real-time. 
    const q = query(collection(db, "Queues"), where("userID", "==", userId));

    queueUnsubscribe = onSnapshot(q, async (snapshot) => {

        if (snapshot.empty) { setEmpty(); return; }
        // We may have multiple queue entries for the user (e.g., if they have multiple appointments),
        //  so we filter for the active ones and sort by position to find the most relevant entry to display on the dashboard.
        let active = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const status = (data.status || "").toLowerCase().trim();
            if (["waiting", "scheduled", "active"].includes(status)) {
                active.push(data);
            }
        });

        if (active.length === 0) { setEmpty(); return; }

        active.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

        // We take the first active queue entry to display on the dashboard.
        const queueData = active[0];
        const position = queueData.position ?? 1;
        const clinicID = queueData.clinicID;






        // ================= TOTAL: query entire clinic queue =================

        // To calculate the user's position and estimated wait time,
        //  we need to know how many people are ahead of them in the queue.
        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", clinicID)
        );
        // We get a snapshot of the entire clinic queue and filter for entries that are in "waiting", "scheduled",
        //  or "active" status to count how many people are currently in the queue.
       const clinicSnapshot = await getDocs(clinicQ);
        const total = clinicSnapshot.docs.filter(d => {
            const s = (d.data().status || "").toLowerCase().trim();
            return ["waiting", "scheduled", "active"].includes(s);
        }).length;






      
         // ================= UI =================
        // We update the dashboard with the user's position in the queue, the total number of people in the queue, 
        // and an estimated wait time based on their position.
        //  We also display a message to encourage the user while they wait.


        document.getElementById("queueCount").textContent = `${position} out of ${total}`;



        // We calculate the percentage of the queue that has been processed based on the user's position and the total queue length.
        const percent = total > 0
            ? Math.round(((total - position) / total) * 100)
            : 0;

        document.getElementById("progressPercent").textContent = `${percent}%`;
        document.getElementById("queueMeter").value = percent;

        let message = "";
        if (position === 1) {
            message = "You're next! Please get ready.";
        } else if (percent >= 70) {
            message = "Almost there — you're very close.";
        } else if (percent >= 40) {
            message = "You are moving steadily through the queue.";
        } else {
            message = "You're in the queue. We'll keep you updated.";
        }

        document.getElementById("queueProgressText").textContent = message;


        // For the estimated wait time, we check if the queue entry has an "estimateWait" field.
        //  If it does, we use that value.
        let wait = queueData.estimateWait;

        // If no stored estimate, calculate using 30 min per appointment
        if (!wait || wait === 0) {
            wait = (position - 1) * 30;
        }
        document.getElementById("queuePosition").textContent = position;
        document.getElementById("waitTime").textContent = `${wait} min`;

        //debugging

    }, (error) => {
        console.error("Queue listener error:", error);
        setEmpty();
    });
}

   


// ================= LOAD VISITS COUNT =================
// This function counts how many non-cancelled appointments the user has had at a specific clinic.

async function loadVisitsCount(userId, clinicID) {
    //  gets appointments for the user at the specified clinic
       try {
        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", userId),
            where("clinicID", "==", Number(clinicID))
        );

        const snapshot = await getDocs(q);
        //if there are no appointments, we set the visits count to 0 and return early
        if (snapshot.empty) { document.getElementById("visitsCount").textContent = 0; return; }

        // We count how many of the user's appointments at this clinic are not cancelled to determine how many visits they've had.
        let count = 0;
        snapshot.forEach(docSnap => {
            if (docSnap.data().status !== "cancelled") count++;
        });
        document.getElementById("visitsCount").textContent = count;

    } catch (error) {
        console.error("Visits count error:", error);
    }
}


// ================= INIT =================
// When the page loads, we set up an authentication state listener to check if the user is logged in. 
// If they are, we load their profile information, upcoming appointments, and queue status. 
// If not, we redirect them to the login page.

window.addEventListener("DOMContentLoaded", () => {
    const nameEl    = document.getElementById("userName");
    const roleEl    = document.getElementById("userRole");
    const welcomeEl = document.getElementById("welcomeMessage");
    const dateEl    = document.getElementById("currentDate");

    emptyStates  = document.getElementById("emptyStates");
    filledStates = document.getElementById("filledStates");
    
    // We listen for changes in the user's authentication state. If the user is not logged in,
    //  we redirect to the login page. If they are logged in, we load their profile info, appointments, and queue status.
    onAuthStateChanged(auth, async (user) => {
        if (!user) { window.location.href = "/index.html"; return; }

        try {
            const userSnap = await getDoc(doc(db, "Users", user.uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                nameEl.textContent    = data.displayName || "User";
                roleEl.textContent    = data.role || "Unknown";
                welcomeEl.textContent = `Welcome, ${data.displayName || "User"}`;
            }

            dateEl.textContent = new Date().toLocaleDateString("en-ZA", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
            });

            await loadAppointments(user.uid);
            loadQueueStatus(user.uid);  // 
        } catch (error) {
            console.error("Auth error:", error);
        }
    });
});


// ================= SIGN OUT =================
window.signOut = async function () {
    if (queueUnsubscribe) queueUnsubscribe(); //
    await firebaseSignOut(auth);
    window.location.href = "/index.html";
};


// ================= ACTIVE NAV LINK =================
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll("aside nav ul li a").forEach(link => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
});