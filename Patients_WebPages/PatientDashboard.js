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
        const upcoming = appointments
            .filter(a => new Date(a.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (upcoming.length === 0) { showEmpty(); return; }

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


// ================= LOAD QUEUE STATUS (REAL-TIME) =================
function loadQueueStatus(userId) {
    // cancel any previous listener
    if (queueUnsubscribe) queueUnsubscribe();

    const setEmpty = () => {
        document.getElementById("queueCount").textContent        = "Not in queue";
        document.getElementById("queueProgressText").textContent = "You have no active queue entries.";
        document.getElementById("progressPercent").textContent   = "0%";
        document.getElementById("queueMeter").value              = 0;
        const posEl  = document.getElementById("queuePosition");
        const waitEl = document.getElementById("waitTime");
        if (posEl)  posEl.textContent  = "-";
        if (waitEl) waitEl.textContent = "-";
    };

    const q = query(collection(db, "Queues"), where("userID", "==", userId));

    // ✅ onSnapshot = live listener, fires on every Firestore change
    queueUnsubscribe = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) { setEmpty(); return; }

        let activeEntries = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // handles the "status " typo in Firestore AND correct "status"
            const status = ((data["status "] || data["status"]) || "").toLowerCase().trim();
            if (status === "waiting" || status === "scheduled" || status === "active") {
                activeEntries.push(data);
            }
        });

        if (activeEntries.length === 0) { setEmpty(); return; }

        activeEntries.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
        const queueData = activeEntries[0];
        const position  = queueData.position ?? 1;

        // ── Get live total count for this clinic ───────────────────
        let totalInQueue = queueData.totalInQueue ?? queueData.total ?? null;
        if (!totalInQueue) {
            try {
                const clinicSnap = await getDocs(query(
                    collection(db, "Queues"),
                    where("clinicID", "==", queueData.clinicID)
                ));
                let count = 0;
                clinicSnap.forEach(d => {
                    const s = ((d.data()["status "] || d.data()["status"]) || "").toLowerCase().trim();
                    if (s === "waiting" || s === "scheduled" || s === "active") count++;
                });
                totalInQueue = count || position;
            } catch {
                totalInQueue = position;
            }
        }

        // ── Queue count ────────────────────────────────────────────
        document.getElementById("queueCount").textContent = `${totalInQueue} in queue`;

        // ── Progress % ────────────────────────────────────────────
        const percent = totalInQueue > 0
            ? Math.round(((totalInQueue - position) / totalInQueue) * 100)
            : 0;
        document.getElementById("progressPercent").textContent = `${percent}%`;
        document.getElementById("queueMeter").value = percent;

        // ── Progress message ──────────────────────────────────────
        let progressText;
        if (position === 1) {
            progressText = "You're next! Please get ready.";
        } else if (percent >= 75) {
            progressText = "Almost there — just a few people ahead of you.";
        } else if (percent >= 40) {
            progressText = "You are moving steadily through the queue.";
        } else {
            progressText = "You're in the queue. We'll keep you updated.";
        }
        document.getElementById("queueProgressText").textContent = progressText;

        // ── Position & wait time ───────────────────────────────────
        let wait = queueData.estimateWait;
        if (!wait || wait === 0) {
            wait = position === 1 ? 5 : (position - 1) * 8;
        }
        const posEl  = document.getElementById("queuePosition");
        const waitEl = document.getElementById("waitTime");
        if (posEl)  posEl.textContent  = position;
        if (waitEl) waitEl.textContent = `${wait} min`;

    }, (error) => {
        console.error("Queue snapshot error:", error);
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
            loadQueueStatus(user.uid);  // ✅ no await — it's a live listener now

        } catch (error) {
            console.error("Auth error:", error);
        }
    });
});


// ================= SIGN OUT =================
window.signOut = async function () {
    if (queueUnsubscribe) queueUnsubscribe(); // ✅ stop listener before leaving
    await firebaseSignOut(auth);
    window.location.href = "/index.html";
};


// ================= ACTIVE NAV LINK =================
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll("aside nav ul li a").forEach(link => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
});