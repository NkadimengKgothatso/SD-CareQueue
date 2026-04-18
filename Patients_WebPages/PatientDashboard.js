import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore, doc, getDoc, collection, query, where, getDocs,
    onSnapshot   // ✅ added
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let emptyStates, filledStates;
const clinicsMap = new Map();

// ✅ holds the live listener so we can cancel it on sign-out
let queueUnsubscribe = null;


// ================= LOAD CLINICS =================
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
function showEmpty() {
    emptyStates.style.display = "block";
    filledStates.style.display = "none";
}

function showFilled() {
    emptyStates.style.display = "none";
    filledStates.style.display = "block";
}

window.goToAppointments = function () {
    window.location.href = "MyAppointments.html";
};


// ================= LOAD APPOINTMENTS =================
async function loadAppointments(userId) {
    console.log("Loading appointments for:", userId);
    const container = document.getElementById("appointmentsContainer");
    container.innerHTML = "";

    try {
        const q = query(collection(db, "Appointments"), where("userID", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) { showEmpty(); return; }

        await loadClinics();

        let appointments = [];
        snapshot.forEach(docSnap => appointments.push({ id: docSnap.id, ...docSnap.data() }));

        const today = new Date();
            today.setHours(0, 0, 0, 0);

       const upcoming = appointments
            .filter(a => {
                const apptDate = new Date(a.date);
                apptDate.setHours(0, 0, 0, 0);
                const notCancelled = (a.status || "").toLowerCase().trim() !== "cancelled";
                return apptDate >= today && notCancelled;
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
                const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
                return dateA - dateB;
            });
        const next = upcoming[0];
        showFilled();
        await loadVisitsCount(userId, next.clinicID);

        const clinic = clinicsMap.get(String(next.clinicID));
        const clinicName = clinic ? clinic.name : "Unknown Clinic";

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
function loadQueueStatus(userId) {

    if (queueUnsubscribe) queueUnsubscribe();

    const setEmpty = () => {
        document.getElementById("queueCount").textContent = "Not in queue";
        document.getElementById("queueProgressText").textContent = "No active queue entry.";
        document.getElementById("progressPercent").textContent = "0%";
        document.getElementById("queueMeter").value = 0;
        document.getElementById("queuePosition").textContent = "-";
        document.getElementById("waitTime").textContent = "-";
    };

    const q = query(collection(db, "Queues"), where("userID", "==", userId));

    queueUnsubscribe = onSnapshot(q, async (snapshot) => {

        if (snapshot.empty) { setEmpty(); return; }

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

        const queueData = active[0];
        const position = queueData.position ?? 1;
        const clinicID = queueData.clinicID;

        // ================= TOTAL: query entire clinic queue =================
        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", clinicID)
        );
        const clinicSnapshot = await getDocs(clinicQ);
        const total = clinicSnapshot.docs.filter(d => {
            const s = (d.data().status || "").toLowerCase().trim();
            return ["waiting", "scheduled", "active"].includes(s);
        }).length;

        // ================= UI =================
        document.getElementById("queueCount").textContent = `${position} out of ${total}`;

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

        let wait = queueData.estimateWait;
        if (!wait || wait === 0) wait = (position - 1) * 8;

        document.getElementById("queuePosition").textContent = position;
        document.getElementById("waitTime").textContent = `${wait} min`;

    }, (error) => {
        console.error("Queue listener error:", error);
        setEmpty();
    });
}


// ================= LOAD VISITS COUNT =================
async function loadVisitsCount(userId, clinicID) {
    try {
        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", userId),
            where("clinicID", "==", Number(clinicID))
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) { document.getElementById("visitsCount").textContent = 0; return; }

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
window.addEventListener("DOMContentLoaded", () => {
    const nameEl    = document.getElementById("userName");
    const roleEl    = document.getElementById("userRole");
    const welcomeEl = document.getElementById("welcomeMessage");
    const dateEl    = document.getElementById("currentDate");

    emptyStates  = document.getElementById("emptyStates");
    filledStates = document.getElementById("filledStates");

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