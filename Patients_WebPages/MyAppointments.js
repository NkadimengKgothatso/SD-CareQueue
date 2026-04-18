import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
const nameSurnameEl = document.querySelector(".name-Surname");
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

    const clinic = clinicsMap.get(appointment.clinicID.toString());
    const clinicName = clinic ? clinic.name : "Unknown Clinic";

    if (isPast) {
        li.classList.add("past-card");
    } else {
        li.classList.add("upcoming-card");
    }

 //past appointments section
    if (isPast) {
        li.innerHTML = `
            <span class="card-accent accent-past"></span>

            <article class="card-body">

                <header class="card-clinic-group">
                    <p class="card-clinic">${clinicName}</p>
                </header>

                <ul class="card-meta">
                    <li class="meta-item">
                        <i class="fa-solid fa-calendar-day meta-icon"></i>
                        ${appointment.date}
                    </li>
                    <li class="meta-item">
                        <i class="fa-solid fa-clock meta-icon"></i>
                        ${appointment.time}
                    </li>
                    ${appointment.reason ? `
                    <li class="meta-item">
                        <i class="fa-solid fa-notes-medical meta-icon"></i>
                        ${appointment.reason}
                    </li>` : ""}
                </ul>

                <footer class="card-footer">
                    <span class="badge badge-${status}">
                        ${status}
                    </span>
                </footer>

            </article>
        `;

        pastList.appendChild(li);
        return;
    }

   //upcoming appointments section
    li.innerHTML = `
        <span class="card-accent accent-upcoming"></span>

        <article class="card-body">

            <header class="card-clinic-group">
                <p class="card-clinic">${clinicName}</p>

                <nav class="appointment-actions">
                    <button class="track-btn">Track</button>
                    <button class="reschedule-btn">Reschedule</button>
                    <button class="cancel-btn">Cancel</button>
                </nav>
            </header>

            <ul class="card-meta">
                <li class="meta-item">
                    <i class="fa-solid fa-calendar-day meta-icon"></i>
                    ${appointment.date}
                </li>
                <li class="meta-item">
                    <i class="fa-solid fa-clock meta-icon"></i>
                    ${appointment.time}
                </li>
                ${appointment.reason ? `
                <li class="meta-item">
                    <i class="fa-solid fa-notes-medical meta-icon"></i>
                    ${appointment.reason}
                </li>` : ""}
            </ul>

            <footer class="card-footer">
                <span class="badge badge-${status}">
                    ${status}
                </span>
            </footer>

        </article>
    `;

    const cancelBtn = li.querySelector(".cancel-btn");
    const trackBtn = li.querySelector(".track-btn");
    const rescheduleBtn = li.querySelector(".reschedule-btn");


    //reschedule button redirects user to bookappointments page
    rescheduleBtn.addEventListener("click", () => {
        window.location.href = `BookAppointments.html?mode=reschedule&id=${appointment.id}`;
    });

    cancelBtn.addEventListener("click", () => {
        selectedAppointment = appointment;
        selectedElement = li;
        modal.showModal();
    });

    //track buttons redirects user to Queues page
    trackBtn.addEventListener("click", () => {
        window.location.href = "Queues.html";
    });

    upcomingList.appendChild(li);
}

//shows this everytime page refreshes
upcomingList.innerHTML = "<p>Loading appointments...</p>";


// Monitor authentication state and update the UI accordingly.
// When a user is authenticated, retrieve their appointments from the database,
// categorize them into upcoming and past based on the current date,
// and render them on the page. Also handles empty states.
// If no user is authenticated, display a guest message and prompt login.
onAuthStateChanged(auth, async (user) => {
    if (user) {

        nameSurnameEl.textContent = user.displayName;

        await loadClinics();

        const q = query(
            collection(db, "Appointments"),
            where("userID", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        upcomingList.innerHTML = "";
        pastList.innerHTML = "";

        const today = new Date();

        let hasUpcoming = false;
        let hasPast = false;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            const apptDate = new Date(data.date);

            const appointment = {
                id: docSnap.id,
                clinicID: data.clinicID,
                date: data.date,
                time: data.time,
                status: data.status,
                reason: data.reason
            };

            if (apptDate >= today) {
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