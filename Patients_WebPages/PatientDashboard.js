// ================= Firebase Setup =================
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signOut as firebaseSignOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,doc,getDoc,updateDoc,collection,query,where,getDocs,onSnapshot} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================= Firebase Config =================
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// ================= Initialize Firebase =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ================= Global Variables =================
let emptyStates, filledStates;

// Store clinics locally for fast lookup
const clinicsMap = new Map();
let queueUnsubscribe = null;

// Name and email of patient
let patientName = "";
let patientEmail = "";


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
        console.error("Failed to load clinics:", err);
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


// ================= NAVIGATION =================
window.goToAppointments = function () {
    window.location.href = "MyAppointments.html";
};


// ================= AVATAR INITIALS =================
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
                const notCancelled = !["cancelled", "completed"].includes((a.status || "").toLowerCase().trim());
                return apptDate >= today && notCancelled;
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
                const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
                return dateA - dateB;
            });

        if (upcoming.length === 0) { showEmpty(); return; }

        const next = upcoming[0];
        if (!next) { showEmpty(); return; }

        showFilled();

        await loadVisitsCount(userId, next.clinicID);

        const clinic = clinicsMap.get(String(next.clinicID));
        const clinicName = clinic ? clinic.name : "Unknown Clinic";

        console.log("next.clinicID:", next.clinicID, "| type:", typeof next.clinicID);

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
        loadQueueStatus(userId, next.id, next.clinicID);

    } catch (error) {
        console.error("Firestore error:", error);
        showEmpty();
    }
}


// ================= LOAD QUEUE STATUS =================
// Listens in real-time to the user's position in the clinic queue for their
// upcoming appointment and updates the dashboard accordingly.
function loadQueueStatus(userId, appointmentId, clinicID) {

    // Clean up any existing listeners before starting fresh
    if (queueUnsubscribe) {
        queueUnsubscribe();
        queueUnsubscribe = null;
    }

    // Normalise clinicID to both types — Firestore may store it as number or string
    const clinicIDNum = Number(clinicID);
    const clinicIDStr = String(clinicID);

    const activeStatuses = ["waiting", "scheduled", "active"];

    const setEmpty = () => {
        document.getElementById("queueCount").textContent        = "";
        document.getElementById("queueProgressText").textContent = "";
        document.getElementById("progressPercent").textContent   = "";
        document.getElementById("queueMeter").value              = 0;
        document.getElementById("queuePosition").textContent     = "";
        document.getElementById("waitTime").textContent          = "";
    };

    // Inner clinic listener — kept in closure so we can clean it up reliably
    let clinicUnsubscribe = null;

    // Step 1: watch only this appointment's queue document
    const appointmentQ = query(
        collection(db, "Queues"),
        where("appointmentId", "==", appointmentId)
    );

    queueUnsubscribe = onSnapshot(appointmentQ, (snapshot) => {

        // Always tear down the previous clinic listener before deciding what to do next
        if (clinicUnsubscribe) {
            clinicUnsubscribe();
            clinicUnsubscribe = null;
        }

        // Find the user's active queue entry for this appointment
        const activeEntries = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => activeStatuses.includes((d.status || "").toLowerCase().trim()));

        if (activeEntries.length === 0) {
            setEmpty();
            return;
        }

        const queueData = activeEntries[0]; // The user's own queue document

        // Step 2: watch ALL active entries for this clinic to determine position
        const clinicQ = query(
            collection(db, "Queues"),
            where("clinicID", "==", clinicIDNum)
        );

        clinicUnsubscribe = onSnapshot(clinicQ, (clinicSnapshot) => {

            let allClinicEntries = clinicSnapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(d => activeStatuses.includes((d.status || "").toLowerCase().trim()))
                .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

            // Fallback: if clinicID is stored as a string in some documents,
            // the numeric query will miss them. Do a client-side string match.
            if (allClinicEntries.length === 0) {
                console.warn(
                    "loadQueueStatus: no results for clinicID as number (" + clinicIDNum + "). " +
                    "Check that Queues documents store clinicID consistently."
                );
                allClinicEntries = clinicSnapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(d => {
                        const stored = String(d.clinicID ?? "");
                        return (
                            stored === clinicIDStr &&
                            activeStatuses.includes((d.status || "").toLowerCase().trim())
                        );
                    })
                    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
            }

            const total = allClinicEntries.length;

            // Find where the user sits in the sorted list
            const userIndex = allClinicEntries.findIndex(
                entry => String(entry.appointmentId) === String(appointmentId)
            );

            // If the user's entry isn't in the clinic queue at all, show empty state
            if (userIndex === -1) {
                console.warn(
                    "loadQueueStatus: user's appointmentId not found in clinic queue. " +
                    "Possible clinicID mismatch or entry was removed."
                );
                setEmpty();
                return;
            }

            const position = userIndex + 1; // Convert to 1-based display position

            // --- Update UI ---

            document.getElementById("queueCount").textContent    = `${position} out of ${total}`;
            document.getElementById("queuePosition").textContent = String(position);

            // Progress percentage: 0 % when last, 100 % when first/only
            let percent = 0;
            if (total === 1) {
                percent = 100;
            } else {
                percent = Math.round(((total - position) / (total - 1)) * 100);
            }
            document.getElementById("progressPercent").textContent = `${percent}%`;
            document.getElementById("queueMeter").value            = percent;

            document.getElementById("queueProgressText").textContent = "";

            // Wait time: prefer a real value set by clinic staff in Firestore.
            // Only fall back to a position-based estimate when none is available.
            // We do NOT write back calculated values — that would overwrite staff data.
            const staffWait = queueData.estimateWait;
            if (typeof staffWait === "number") {
                const estimatedWait = userIndex * 30;
                document.getElementById("waitTime").textContent = `${estimatedWait} min`;
            } else {
                // Rough estimate: assume ~30 min per person ahead
                const estimatedWait = userIndex * 30;
                document.getElementById("waitTime").textContent = `~${estimatedWait} min (est.)`;
            }
        });
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

        let count = 0;
        snapshot.forEach(docSnap => {
            if ((docSnap.data().status || "").toLowerCase() !== "cancelled") count++;
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
                const data  = userSnap.data();
                const name  = data.displayName || "";
                const email = user.email || "";

                patientName  = name;
                patientEmail = email;

                nameEl.textContent    = name || "User";
                roleEl.textContent    = data.role || "Unknown";
                welcomeEl.textContent = `Welcome, ${name || "User"}`;
                document.getElementById("userEmail").textContent = email;

                setAvatarInitial(name, email);
            }

            dateEl.textContent = new Date().toLocaleDateString("en-ZA", {
                weekday: "long",
                year:    "numeric",
                month:   "long",
                day:     "numeric"
            });

            await loadAppointments(user.uid);

        } catch (error) {
            console.error("Auth error:", error);
        }
    });
});


// ================= SIGN OUT =================
window.signOut = async function () {
    if (queueUnsubscribe) {
        queueUnsubscribe();
        queueUnsubscribe = null;
    }
    await firebaseSignOut(auth);
    window.location.href = "/index.html";
};


// ================= ACTIVE NAV LINK =================
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll("aside nav ul li a").forEach(link => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
});