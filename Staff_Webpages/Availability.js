
//Availability.js
// ─── Imports ────────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app"
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
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
} from "firebase/firestore";

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

const DAY_NAME_MAP = {
    mon: "monday",
    tue: "tuesday",
    wed: "wednesday",
    thu: "thursday",
    fri: "friday",
    sat: "saturday",
    sun: "sunday"
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

// ─── Convert 12-hour time to 24-hour string ───────────────────────────────────
// Handles "7am", "5pm", "7:30am", "5:30pm"
function convertTo24Hour(timeStr, period) {
    const [hourStr, minuteStr] = timeStr.split(":");
    let hour   = parseInt(hourStr);
    const mins = minuteStr ? parseInt(minuteStr) : 0;

    if (period.toLowerCase() === "am" && hour === 12) hour = 0;
    if (period.toLowerCase() === "pm" && hour !== 12) hour += 12;

    return `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// ─── Parse clinic opening_hours string ───────────────────────────────────────
// Handles all variations found in the database:
//   "Mon-Fri: 7am-7pm"
//   "Mon-Fri : 9am-5pm"   
//   "Mon-Fri: 7:30am-5:30pm"
function parseClinicHours(openingHours) {
    if (!openingHours) return null;

    try {
        // Normalise: collapse any spaces around the colon
        // "Mon-Fri : 9am-5pm" → "Mon-Fri: 9am-5pm"
        const cleaned = openingHours
            .replace(/\s*:\s*/, ":")
            .trim();

        console.log("Parsing opening_hours:", openingHours, "→ cleaned:", cleaned);

        // Match day range and time range
        // Supports: "Mon-Fri:9am-5pm" after cleaning
        const match = cleaned.match(
            /^(\w+)-(\w+):(\d+(?::\d+)?)(am|pm)-(\d+(?::\d+)?)(am|pm)$/i
        );

        if (!match) {
            console.warn("opening_hours format not recognised:", cleaned);
            return null;
        }

        const [, startDay, endDay, openRaw, openPeriod, closeRaw, closePeriod] = match;

        const openTime  = convertTo24Hour(openRaw,  openPeriod);
        const closeTime = convertTo24Hour(closeRaw, closePeriod);

        const startDayFull = DAY_NAME_MAP[startDay.toLowerCase()];
        const endDayFull   = DAY_NAME_MAP[endDay.toLowerCase()];

        if (!startDayFull || !endDayFull) {
            console.warn("Could not map day names:", startDay, endDay);
            return null;
        }

        const startIdx = DAY_ORDER_FULL.indexOf(startDayFull);
        const endIdx   = DAY_ORDER_FULL.indexOf(endDayFull);

        const workDays = DAY_ORDER_FULL.filter((_, i) => i >= startIdx && i <= endIdx);

        console.log("Parsed →", openTime, "to", closeTime, "| workDays:", workDays);

        return { openTime, closeTime, workDays };

    } catch (err) {
        console.error("Failed to parse opening_hours:", openingHours, err);
        return null;
    }
}

// ─── Fetch clinic operating hours from Firestore ──────────────────────────────
async function fetchClinicHours(clinicID) {
    try {
        const q = query(
            collection(db, "clinicsObjects"),
            where("id", "==", clinicID)
        );

        const snapshot = await getDocs(q);

        console.log("fetchClinicHours → clinicID:", clinicID, "| results:", snapshot.size);

        if (snapshot.empty) {
            console.warn("No clinic found for clinicID:", clinicID);
            return null;
        }

        const clinicData = snapshot.docs[0].data();
        console.log("Clinic opening_hours from DB:", clinicData.opening_hours);
        return clinicData.opening_hours || null;

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
        }
    });

    // Show clinic hours info note under the card header
    const headerEl = document.querySelector(".week-card-header");
    if (headerEl && !document.getElementById("clinicHoursNote")) {
        const note = document.createElement("p");
        note.id = "clinicHoursNote";
        note.style.cssText = `
            margin: 0;
            padding: 10px 22px;
            font-size: 13px;
            color: #6c757d;
            border-bottom: 1px solid #f0f2f5;
            background: #f8f9fa;
        `;
        note.innerHTML = `
            <i class="fa-solid fa-circle-info" style="color:#4584c4; margin-right:6px;"></i>
            Clinic operating hours: <strong>${clinicOpenTime} – ${clinicCloseTime}</strong>. 
            Your availability must fall within these times.
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
                showStatus(`${capitalise(day)}  ,clinic opens at ${clinicOpenTime}.`, "error");
                return;
            }
            if (d.end > clinicCloseTime) {
                showStatus(`${capitalise(day)} ,clinic closes at ${clinicCloseTime}.`, "error");
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

    let clinicID  = null;
    let staffName = user.displayName || "Staff";

    // 1. Get staff profile from ApprovedStaff
    try {
        const staffQuery = query(
            collection(db, "ApprovedStaff"),
            where("email", "==", user.email)
        );

        const snapshot = await getDocs(staffQuery);

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            clinicID  = Number(data.clinicId) || null;
            staffName = data.displayName      || staffName;

            document.querySelectorAll(".name-Surname").forEach(el => {
                el.textContent = staffName;
            });
        }

        console.log("Staff clinicID:", clinicID);

    } catch (err) {
        console.error("Failed to fetch staff profile:", err);
    }

    // 2. Fetch clinic hours and apply constraints
    if (clinicID) {
        const openingHours = await fetchClinicHours(clinicID);
        const parsed       = parseClinicHours(openingHours);

        if (parsed) {
            clinicOpenTime  = parsed.openTime;
            clinicCloseTime = parsed.closeTime;
            clinicWorkDays  = parsed.workDays;
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


    // ─── Sidebar footer (STAFF) ─────────────────────────────
    const staffNameEl = document.getElementById("staffName");
    const staffEmailEl = document.getElementById("staffEmail");
    const staffAvatarEl = document.getElementById("staffAvatar");

    if (staffNameEl) staffNameEl.textContent = staffName;
    if (staffEmailEl) staffEmailEl.textContent = user.email;

// create initials for avatar
    if (staffAvatarEl) {
        const initials = (staffName || "S")
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase();

        staffAvatarEl.textContent = initials;
    }  
});

export {
    convertTo24Hour,
    parseClinicHours,
    readScheduleFromPage,
    applyScheduleToPage,
    capitalise,
    showStatus,
    applyClinicConstraints
};