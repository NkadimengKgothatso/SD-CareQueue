import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.appspot.com",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const nameSurnameEl = document.querySelector(".name-surname"); // FIXED (case mismatch)
const upcomingList = document.getElementById("upcoming");
const pastList = document.getElementById("past");

// State
let clinicsMap = new Map();
let selectedAppointment = null;
let selectedElement = null;

// Modal
const modal = document.createElement("dialog");
modal.innerHTML = `
    <section>
        <header>
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h2>Cancel Appointment</h2>
        </header>

        <p>Are you sure you want to cancel this appointment?</p>

        <footer>
            <button id="confirmCancelBtn" class="danger-btn">Yes, Cancel</button>
            <button id="closeModalBtn" class="secondary-btn">Keep It</button>
        </footer>
    </section>
`;
document.body.appendChild(modal);

const confirmBtn = modal.querySelector("#confirmCancelBtn");
const closeBtn = modal.querySelector("#closeModalBtn");

closeBtn.addEventListener("click", () => modal.close());

confirmBtn.addEventListener("click", async () => {
    if (!selectedAppointment) return;

    try {
        await updateDoc(doc(db, "Appointments", selectedAppointment.id), {
            status: "cancelled"
        });

        selectedElement?.remove();
    } catch (err) {
        console.error("Cancel failed:", err);
    }

    modal.close();
});

// Load clinics
async function loadClinics() {
    try {
        const res = await fetch("./clinics.json");
        const clinics = await res.json();

        clinics.forEach(c => {
            clinicsMap.set(c.id.toString(), c);
        });
    } catch (err) {
        console.error("Clinic load failed:", err);
    }
}

// Empty state helper
function emptyState(el, msg) {
    el.innerHTML = `<li class="empty-state">${msg}</li>`;
}

// Render appointment
function renderAppointment(appt) {
    const status = (appt.status || "scheduled").toLowerCase();

    const isPast =
        status === "cancelled" ||
        status === "canceled" ||
        status === "completed";

    const li = document.createElement("li");
    li.classList.add("appointment-card");

    const clinic = clinicsMap.get(appt.clinicID?.toString());
    const clinicName = clinic ? clinic.name : "Unknown Clinic";

    li.innerHTML = `
        <span class="card-accent ${isPast ? "accent-past" : "accent-upcoming"}"></span>

        <article class="card-body">
            <header class="card-clinic-group">
                <p class="card-clinic">${clinicName}</p>

                ${!isPast ? `
                <nav class="appointment-actions">
                    <button class="track-btn">Track</button>
                    <button class="reschedule-btn">Reschedule</button>
                    <button class="cancel-btn">Cancel</button>
                </nav>` : ""}
            </header>

            <ul class="card-meta">
                <li class="meta-item">
                    <i class="fa-solid fa-calendar-day"></i>
                    ${appt.date}
                </li>

                <li class="meta-item">
                    <i class="fa-solid fa-clock"></i>
                    ${appt.time}
                </li>

                ${appt.reason ? `
                <li class="meta-item">
                    <i class="fa-solid fa-notes-medical"></i>
                    ${appt.reason}
                </li>` : ""}
            </ul>

            <footer class="card-footer">
                <span class="badge badge-${status}">
                    ${status}
                </span>
            </footer>
        </article>
    `;

    if (!isPast) {
        const cancelBtn = li.querySelector(".cancel-btn");
        const trackBtn = li.querySelector(".track-btn");
        const rescheduleBtn = li.querySelector(".reschedule-btn");

        cancelBtn?.addEventListener("click", () => {
            selectedAppointment = appt;
            selectedElement = li;
            modal.showModal();
        });

        trackBtn?.addEventListener("click", () => {
            window.location.href = "Queues.html";
        });

        rescheduleBtn?.addEventListener("click", () => {
            window.location.href = `BookAppointments.html?mode=reschedule&id=${appt.id}`;
        });

        upcomingList.appendChild(li);
    } else {
        pastList.appendChild(li);
    }
}

// AUTH
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        nameSurnameEl.textContent = "Guest";

        upcomingList.innerHTML = `
            <li class="empty-state">Please log in to view appointments</li>
        `;
        pastList.innerHTML = "";

        return;
    }

    nameSurnameEl.textContent = user.displayName || "User";

    // loading state
    upcomingList.innerHTML = `<li class="empty-state">Loading appointments...</li>`;
    pastList.innerHTML = "";

    await loadClinics();

    const q = query(
        collection(db, "Appointments"),
        where("userID", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    // clear after loading
    upcomingList.innerHTML = "";
    pastList.innerHTML = "";

    let hasUpcoming = false;
    let hasPast = false;

    const today = new Date();

    snapshot.forEach(docSnap => {
        const data = docSnap.data();

        const apptDate = new Date(data.date);

        const appt = {
            id: docSnap.id,
            clinicID: data.clinicID,
            date: data.date,
            time: data.time,
            status: data.status,
            reason: data.reason
        };

        if (apptDate >= today) {
            hasUpcoming = true;
        } else {
            hasPast = true;
        }

        renderAppointment(appt);
    });

   
    if (!hasUpcoming) {
        upcomingList.innerHTML = `
            <li class="empty-state">No upcoming appointments</li>
        `;
    }

    if (!hasPast) {
        pastList.innerHTML = `
            <li class="empty-state">No past appointments</li>
        `;
    }
});
// Active sidebar highlight
const currentPage = window.location.pathname.split("/").pop();

document.querySelectorAll("aside nav ul li a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
    }
});