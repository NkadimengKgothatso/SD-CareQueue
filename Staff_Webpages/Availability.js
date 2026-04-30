// ─── Imports ────────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── Firebase Config ─────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain:        "carequeue-284bb.firebaseapp.com",
    projectId:         "carequeue-284bb",
    storageBucket:     "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId:             "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Days ────────────────────────────────────────────────────────────────────
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// ─── Sign Out ────────────────────────────────────────────────────────────────
window.signOut = async function () {
    await signOut(auth);
    window.location.href = "/index.html";
};

// ─── Read current schedule from the page ─────────────────────────────────────
// Loops through each day and reads the toggle + time inputs
function readScheduleFromPage() {
    const schedule = {};

    DAYS.forEach(day => {
        const toggle = document.getElementById(`toggle-${day}`);
        const start  = document.getElementById(`start-${day}`);
        const end    = document.getElementById(`end-${day}`);

        schedule[day] = {
            isWorking: toggle.checked,
            start:     toggle.checked ? (start.value || "08:00") : null,
            end:       toggle.checked ? (end.value   || "17:00") : null
        };
    });

    return schedule;
}

// ─── Apply saved schedule to the page ────────────────────────────────────────
// Takes saved Firestore data and populates the toggles and time inputs
function applyScheduleToPage(schedule) {
    DAYS.forEach(day => {
        const dayData = schedule[day];
        if (!dayData) return;

        const toggle = document.getElementById(`toggle-${day}`);
        const start  = document.getElementById(`start-${day}`);
        const end    = document.getElementById(`end-${day}`);
        const row    = document.getElementById(`row-${day}`);

        // Set toggle state
        toggle.checked = dayData.isWorking;

        // Set time values if working
        if (dayData.isWorking && dayData.start) start.value = dayData.start;
        if (dayData.isWorking && dayData.end)   end.value   = dayData.end;

        // Enable or disable inputs to match saved state
        start.disabled = !dayData.isWorking;
        end.disabled   = !dayData.isWorking;
        row.classList.toggle("day-off", !dayData.isWorking);
    });
}

// ─── Load availability from Firestore ────────────────────────────────────────
async function loadAvailability(uid) {
    try {
        const ref  = doc(db, "StaffAvailability", uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const data = snap.data();
            if (data.schedule) {
                applyScheduleToPage(data.schedule);
            }
            showStatus(
                "Last saved: " + (data.updatedAt?.toDate().toLocaleDateString() || "previously"),
                "muted"
            );
        }
        // If no saved data exists yet, the HTML defaults are kept as-is
    } catch (err) {
        console.error("Failed to load availability:", err);
        showStatus("Could not load your saved availability.", "error");
    }
}

// ─── Save availability to Firestore ──────────────────────────────────────────
async function saveAvailability(uid, staffName, clinicID) {
    const schedule = readScheduleFromPage();

    // Validate: at least one working day must be selected
    const hasWorkingDay = Object.values(schedule).some(d => d.isWorking);
    if (!hasWorkingDay) {
        showStatus("Please set at least one working day.", "error");
        return;
    }

    // Validate time ranges for all working days
    for (const day of DAYS) {
        const d = schedule[day];
        if (d.isWorking) {
            if (!d.start || !d.end) {
                showStatus(`Please set times for ${capitalise(day)}.`, "error");
                return;
            }
            if (d.start >= d.end) {
                showStatus(`End time must be after start time for ${capitalise(day)}.`, "error");
                return;
            }
        }
    }

    try {
        showStatus("Saving...", "muted");

        const ref = doc(db, "StaffAvailability", uid);

        await setDoc(ref, {
            staffName,
            clinicID,   // stored as number — consistent with rest of staff portal
            schedule,
            updatedAt: serverTimestamp()
        });

        showStatus("✓ Availability saved successfully!", "success");

    } catch (err) {
        console.error("Failed to save availability:", err);
        showStatus("Failed to save. Please try again.", "error");
    }
}

// ─── Show save status message ─────────────────────────────────────────────────
function showStatus(message, type) {
    const el = document.getElementById("saveStatus");
    if (!el) return;

    el.textContent = message;

    el.style.color =
        type === "success" ? "#185FA5" :
        type === "error"   ? "#dc3545" :
        "#6c757d";
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Auth & Bootstrap ────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/index.html";
        return;
    }

    // Set name in sidebar immediately using Auth displayName
    document.querySelectorAll(".name-Surname").forEach(el => {
        el.textContent = user.displayName || "Staff";
    });

    // Get full staff profile from ApprovedStaff collection
    let clinicID  = null;
    let staffName = user.displayName || "Staff";

    try {
        const staffQuery = query(
            collection(db, "ApprovedStaff"),
            where("email", "==", user.email)
        );

        const snapshot = await getDocs(staffQuery);

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();

            // Convert to number — consistent with Queues.js and WalkIns.js
            clinicID  = Number(data.clinicId) || null;
            staffName = data.displayName      || staffName;

            // Update sidebar with Firestore display name
            document.querySelectorAll(".name-Surname").forEach(el => {
                el.textContent = staffName;
            });
        }
    } catch (err) {
        console.error("Failed to fetch staff profile:", err);
    }

    // Load their previously saved availability
    await loadAvailability(user.uid);

    // Wire up save button
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            saveAvailability(user.uid, staffName, clinicID);
        });
    }
});