import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
//J: status map for appointments statuses
const statusMap = {
  Waiting: "waiting",
  Scheduled: "scheduled",
  Cancelled: "cancelled",
  Completed: "completed"
};

let selectedAppointment = null;
let selectedElement = null;

// Select DOM elements from the HTML document:
// nameSurnameEl: element displaying the user's name and surname (selected by class)
// upcomingList: container for upcoming items (selected by ID "upcoming")
// pastList: container for past items (selected by ID "past")
const nameSurnameEl = document.querySelector(".user-name");
const emailEl = document.querySelector(".user-email");
const upcomingList = document.getElementById("upcoming");
const pastList = document.getElementById("past");

let clinicsMap = new Map();

const modal = document.createElement("dialog");
modal.setAttribute("id", "cancelModal");


// Displays a confirmation popup for cancelling an appointment
modal.innerHTML = `
    <section>
        <header>
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h2>Cancel Appointment</h2>
        </header>

        <p>Are you sure you want to cancel this appointment? This action cannot be undone.</p>

        <footer>
            <button id="confirmCancelBtn" class="danger-btn">
                <i class="fa-solid fa-xmark"></i>
                Yes, Cancel
            </button>

            <button id="closeModalBtn" class="secondary-btn">
                <i class="fa-solid fa-arrow-left"></i>
                Keep It
            </button>
        </footer>
    </section>
`;

//Add the modal element to the webpage so it becomes visible and usable
document.body.appendChild(modal);


//selects these buttons by class from html
const confirmBtn = modal.querySelector("#confirmCancelBtn");
const closeBtn = modal.querySelector("#closeModalBtn");


//modal closes after close button clicked
closeBtn.addEventListener("click", () => {
    modal.close();
});

confirmBtn.addEventListener("click", async () => {
    if (!selectedAppointment) return;

    try {
        await updateDoc(doc(db, "Appointments", selectedAppointment.id), {
            status: "cancelled"
        });

        selectedElement.remove();

    } catch (error) {
        console.error("Cancel failed:", error);
    }

    modal.close();
});


// Asynchronously fetch clinic data from a JSON file and store each clinic
// in a map using its ID as the key for easy access later
async function loadClinics() {
    try {
        const snapshot = await getDocs(collection(db, "clinicsObjects"));

        clinicsMap.clear();

        snapshot.forEach(docSnap => {
            const clinic = docSnap.data();

            clinic.id = docSnap.id;

            if (!clinic.id) {
                console.warn("Skipping clinic with missing id:", clinic);
                return;
            }

            clinicsMap.set(clinic.id.toString(), clinic);
        });

    } catch (error) {
        console.error("Failed to load clinics:", error);
    }
}



// empy state case
function setEmptyState(container, message) {
    if (!container.children.length) {
        container.innerHTML = `<li class="empty-state">${message}</li>`;
    }
}


// Generate a list item for an appointment, determine its status,
// classify it as past or upcoming, and apply the appropriate styling.
// Fetches the associated clinic name from the clinicsMap.
function renderAppointment(appointment) {
 
    const status = (appointment.status || "scheduled")
        .toLowerCase()
        .trim();
 
    const isPast =
        status === "cancelled" ||
        status === "canceled" ||
        status === "completed";
 
    const li = document.createElement("li");
    li.classList.add("appointment-card");
    li.classList.add(isPast ? "past-card" : "upcoming-card");
 
    const metaParts = [appointment.date, appointment.time, appointment.reason].filter(Boolean);
    const metaLine = metaParts.join(" · ");
 
    if (isPast) {
        li.innerHTML = `
            <div class="card-top">
                <p class="card-clinic">${appointment.clinicName}</p>
                <span class="badge badge-${status}">${status}</span>
            </div>
            <p class="card-meta-line">${metaLine}</p>
        `;
        pastList.appendChild(li);
    } else {
        li.innerHTML = `
            <div class="card-top">
                <p class="card-clinic">${appointment.clinicName}</p>
                <span class="badge badge-${status}">${status}</span>
            </div>
            <p class="card-meta-line">${metaLine}</p>
            <nav class="appointment-actions">
                <button class="track-btn">Track</button>
                <button class="reschedule-btn">Reschedule</button>
                <button class="cancel-btn">Cancel</button>
            </nav>
        `;
 
        li.querySelector(".reschedule-btn").addEventListener("click", () => {
            window.location.href = `BookAppointments.html?mode=reschedule&id=${appointment.id}`;
        });
 
        li.querySelector(".cancel-btn").addEventListener("click", () => {
            selectedAppointment = appointment;
            selectedElement = li;
            modal.showModal();
        });
 
        li.querySelector(".track-btn").addEventListener("click", () => {
            window.location.href = "PatientDashboard.html";
        });
 
        upcomingList.appendChild(li);
    }
}

//shows this everytime page refreshes
upcomingList.innerHTML = "<p>Loading appointments...</p>";

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


// Monitor authentication state and update the UI accordingly.
// When a user is authenticated, retrieve their appointments from the database,
// categorize them into upcoming and past based on the current date,
// and render them on the page. Also handles empty states.
// If no user is authenticated, display a guest message and prompt login.
onAuthStateChanged(auth, async (user) => {
    if (user) {

        nameSurnameEl.textContent = user.displayName;
        emailEl.textContent = user.email;



        setAvatarInitial(user.displayName, user.email);

        await loadClinics();

        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", user.uid),
            orderBy("date", "asc"),
            orderBy("time", "asc")
        );

        const snapshot = await getDocs(q);

        upcomingList.innerHTML = "";
        pastList.innerHTML = "";

        const today = new Date();

        let hasUpcoming = false;
        let hasPast = false;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            

            const appointment = {
                id: docSnap.id,
                clinicID: data.clinicID,
                clinicName: data.clinicName || data.clinicID || "Unknown Clinic",
                date: data.date,
                time: data.time,
                status: data.status,
                reason: data.reason
            };

            const todayStr = new Date().toISOString().split("T")[0];

            if (data.date >= todayStr) {
                hasUpcoming = true;
                renderAppointment(appointment);
            } else {
                hasPast = true;
                renderAppointment(appointment);
            }
        });

        // code for handling no appointments cases
        setEmptyState(upcomingList, "No upcoming appointments");
        setEmptyState(pastList, "No past appointments");

        updateScrollState();

    } else {
        nameSurnameEl.textContent = "Guest";
        upcomingList.innerHTML = "<p>Please log in to view your appointments.</p>";
    }
});

// ================= highlight active page =================
  const currentPage = window.location.pathname.split("/").pop();

const links = document.querySelectorAll("aside nav ul li a");

links.forEach(link => {
    const linkPage = link.getAttribute("href");

    if (linkPage === currentPage) {
        link.classList.add("active");
    }
});


function updateScrollState() {
    const upcomingCards = upcomingList.querySelectorAll(".appointment-card");
    const pastCards = pastList.querySelectorAll(".appointment-card");
 
    upcomingList.classList.toggle("scrollable", upcomingCards.length > 2);
    pastList.classList.toggle("scrollable", pastCards.length > 2);
}