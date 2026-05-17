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
const DAY_ORDER_FULL = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Maps full day names to index for range comparison
const DAY_INDEX = {
    monday: 0, tuesday: 1, wednesday: 2,
    thursday: 3, friday: 4, saturday: 5, sunday: 6
};

// ─── Clinic hours state ───────────────────────────────────────────────────────
let clinicOpenTime  = null;
let clinicCloseTime = null;
let clinicWorkDays  = [];

// ─── Sign Out ────────────────────────────────────────────────────────────────
window.signOut = async function () {
    await signOut(auth);
    window.location.href = "/index.html";
};

// ─── Build working days array from startDay and endDay ───────────────────────
// e.g. startDay="Monday", endDay="Friday"
// returns ["monday","tuesday","wednesday","thursday","friday"]
function buildWorkDays(startDay, endDay) {
    if (!startDay || !endDay) return [];

    const start = DAY_INDEX[startDay.toLowerCase()];
    const end   = DAY_INDEX[endDay.toLowerCase()];

    if (start === undefined || end === undefined) return [];

    return DAY_ORDER_FULL.filter((_, i) => i >= start && i <= end);
}

// ─── Fetch clinic data by clinic name ────────────────────────────────────────
// Matches using assignedClinic name from ApprovedStaff
// Returns { openTime, closeTime, startDay, endDay } or null
async function fetchClinicHours(clinicName) {
    try {
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        console.log("Searching", snapshot.size, "clinics for name:", clinicName);

        let result = null;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            if (
                (data.name || "").toLowerCase().trim() ===
                (clinicName || "").toLowerCase().trim()
            ) {
                console.log("Matched clinic:", data.name, 
                    "| startTime:", data.startTime, 
                    "| endTime:", data.endTime,
                    "| startDay:", data.startDay,
                    "| endDay:", data.endDay
                );

                result = {
                    openTime:  data.startTime || null,
                    closeTime: data.endTime   || null,
                    startDay:  data.startDay  || null,
                    endDay:    data.endDay    || null
                };
            }
        });

        if (!result) {
            console.warn("No clinic matched for name:", clinicName);
        }

        return result;

    } catch (err) {
        console.error("Failed to fetch clinic hours:", err);
        return null;
    }
}

// ─── Apply clinic hours constraints to all time inputs ───────────────────────
function applyClinicConstraints() {
    if (!clinicOpenTime || !clinicCloseTime) return;

    DAYS.forEach(day => {
        const toggle = document.getElementById(`toggle-${day}`);
        const start  = document.getElementById(`start-${day}`);
        const end    = document.getElementById(`end-${day}`);
        const row    = document.getElementById(`row-${day}`);

        const isClinicOpen = clinicWorkDays.includes(day);

        if (!isClinicOpen) {
            // Clinic closed this day — lock the entire row
            toggle.checked  = false;
            toggle.disabled = true;
            start.disabled  = true;
            end.disabled    = true;
            row.classList.add("day-off");
            row.title = "Your clinic is closed on this day";

        } else {
            // Clinic open this day — enable everything on load
            toggle.checked  = true;
            start.disabled  = false;
            end.disabled    = false;
            row.classList.remove("day-off");

            // Restrict time inputs to clinic hours
            start.min = clinicOpenTime;
            start.max = clinicCloseTime;
            end.min   = clinicOpenTime;
            end.max   = clinicCloseTime;

            // Clamp default values that fall outside clinic hours
            if (start.value < clinicOpenTime)  start.value = clinicOpenTime;
            if (start.value > clinicCloseTime) start.value = clinicOpenTime;
            if (end.value   > clinicCloseTime) end.value   = clinicCloseTime;
            if (end.value   < clinicOpenTime)  end.value   = clinicCloseTime;

            // Wire up toggle so time inputs enable/disable when staff clicks it
            toggle.addEventListener("change", () => {
                const isOn     = toggle.checked;
                start.disabled = !isOn;
                end.disabled   = !isOn;
                row.classList.toggle("day-off", !isOn);
            });
        }
    });

    // Build working days display string
    const workDayLabels = clinicWorkDays.map(capitalise).join(", ");

    // Show info note under the card header using CSS class
    const headerEl = document.querySelector(".week-card-header");
    if (headerEl && !document.getElementById("clinicHoursNote")) {
        const note     = document.createElement("p");
        note.id        = "clinicHoursNote";
        note.className = "clinic-hours-note";
        note.innerHTML = `
            <i class="fa-solid fa-clock"></i>
            <strong>Operating hours:</strong> ${clinicOpenTime} – ${clinicCloseTime}
            &nbsp;&nbsp;
            <i class="fa-solid fa-calendar-days"></i>
            <strong>Open days:</strong> ${workDayLabels}
        `;
        headerEl.insertAdjacentElement("afterend", note);
    }
}

// ─── Read current schedule from the page ─────────────────────────────────────
function readScheduleFromPage() {
    const schedule = {};

    DAYS.forEach(day => {
        const toggle = document.getElementById(`toggle-${day}`);
        const start  = document.getElementById(`start-${day}`);
        const end    = document.getElementById(`end-${day}`);

        schedule[day] = {
            isWorking: toggle.checked,
            start:     toggle.checked ? (start.value || clinicOpenTime  || "08:00") : null,
            end:       toggle.checked ? (end.value   || clinicCloseTime || "17:00") : null
        };
    });

    return schedule;
}

// ─── Apply saved schedule to the page ────────────────────────────────────────
function applyScheduleToPage(schedule) {
    DAYS.forEach(day => {
        const dayData = schedule[day];
        if (!dayData) return;

        const toggle = document.getElementById(`toggle-${day}`);
        const start  = document.getElementById(`start-${day}`);
        const end    = document.getElementById(`end-${day}`);
        const row    = document.getElementById(`row-${day}`);

        // Don't override days the clinic is closed on
        if (toggle.disabled) return;

        toggle.checked = dayData.isWorking;

        if (dayData.isWorking && dayData.start) start.value = dayData.start;
        if (dayData.isWorking && dayData.end)   end.value   = dayData.end;

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
    } catch (err) {
        console.error("Failed to load availability:", err);
        showStatus("Could not load your saved availability.", "error");
    }
}

// ─── Save availability to Firestore ──────────────────────────────────────────
async function saveAvailability(uid, staffName, clinicID) {
    const schedule = readScheduleFromPage();

    // Validate: at least one working day
    const hasWorkingDay = Object.values(schedule).some(d => d.isWorking);
    if (!hasWorkingDay) {
        showStatus("Please set at least one working day.", "error");
        return;
    }

    // Validate each working day
    for (const day of DAYS) {
        const d = schedule[day];
        if (!d.isWorking) continue;

        if (!d.start || !d.end) {
            showStatus(`Please set times for ${capitalise(day)}.`, "error");
            return;
        }

        if (d.start >= d.end) {
            showStatus(`End time must be after start time for ${capitalise(day)}.`, "error");
            return;
        }

        // Must stay within clinic hours
        if (clinicOpenTime && clinicCloseTime) {
            if (d.start < clinicOpenTime) {
                showStatus(`${capitalise(day)} start time cannot be before clinic opens at ${clinicOpenTime}.`, "error");
                return;
            }
            if (d.end > clinicCloseTime) {
                showStatus(`${capitalise(day)} end time cannot be after clinic closes at ${clinicCloseTime}.`, "error");
                return;
            }
        }
    }

    try {
        showStatus("Saving...", "muted");

        await setDoc(doc(db, "StaffAvailability", uid), {
            staffName,
            clinicID,
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

    // Set name immediately from Auth
    document.querySelectorAll(".name-Surname").forEach(el => {
        el.textContent = user.displayName || "Staff";
    });

    let clinicID       = null;
    let staffName      = user.displayName || "Staff";
    let assignedClinic = null;

    // 1. Get staff profile from ApprovedStaff
    try {
        const staffQuery = query(
            collection(db, "ApprovedStaff"),
            where("email", "==", user.email)
        );

        const snapshot = await getDocs(staffQuery);

        if (!snapshot.empty) {
            const data     = snapshot.docs[0].data();
            clinicID       = Number(data.clinicId) || null;
            staffName      = data.displayName      || staffName;
            assignedClinic = data.assignedClinic   || null;

            document.querySelectorAll(".name-Surname").forEach(el => {
                el.textContent = staffName;
            });
        }

        console.log("Staff clinicID:", clinicID, "| assignedClinic:", assignedClinic);

    } catch (err) {
        console.error("Failed to fetch staff profile:", err);
    }

    // 2. Fetch clinic hours by name and apply constraints
    if (assignedClinic) {
        const clinicData = await fetchClinicHours(assignedClinic);

        if (clinicData && clinicData.openTime && clinicData.closeTime) {
            clinicOpenTime  = clinicData.openTime;
            clinicCloseTime = clinicData.closeTime;
            clinicWorkDays  = buildWorkDays(clinicData.startDay, clinicData.endDay);
            applyClinicConstraints();
        } else {
            showStatus("Warning: Your clinic has no valid operating hours set. Please contact your admin.", "error");
        }
    }

    // 3. Load previously saved availability
    await loadAvailability(user.uid);

    // 4. Wire up save button
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            saveAvailability(user.uid, staffName, clinicID);
        });
    }

    // 5. Populate sidebar footer
    const staffNameEl   = document.getElementById("staffName");
    const staffEmailEl  = document.getElementById("staffEmail");
    const staffAvatarEl = document.getElementById("staffAvatar");

    if (staffNameEl)  staffNameEl.textContent  = staffName;
    if (staffEmailEl) staffEmailEl.textContent = user.email;

    if (staffAvatarEl) {
        const initials = (staffName || "S")
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

        staffAvatarEl.textContent = initials;
    }
});

// ─── Exports for unit testing ─────────────────────────────────────────────────
export {
    buildWorkDays,
    capitalise,
    showStatus,
    readScheduleFromPage,
    applyScheduleToPage,
    applyClinicConstraints,
    convertTo24Hour,
    parseClinicHours 
};