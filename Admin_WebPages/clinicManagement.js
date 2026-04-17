// Import Firebase (MODULAR SDK)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);

// If not signed in, redirect back to login
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "../Login/index.html";
});

// Sign out
window.signOut = async function() {
    await signOut(auth);
    window.location.href = "../Login/index.html";
};



// =========================
// MODAL LOGIC
// =========================
const addBtn = document.querySelector(".addBtn");
const modal = document.getElementById("clinicModal");
const closeBtn = document.querySelector(".close-btn");
const form = document.querySelector(".clinicForm");

// open modal
addBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});

// close modal (X)
closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

// close when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});


// =========================
// FORM SUBMIT (CORRECT WAY)
// =========================
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const clinicName = document.getElementById("clinicName").value;
    const clinicAddress = document.getElementById("Location").value;

    console.log("Clinic Name:", clinicName);
    console.log("Clinic Address:", clinicAddress);

    // OPTIONAL: Add to UI dynamically
    addClinicToUI(clinicName, clinicAddress);

    // reset form
    form.reset();

    // close modal
    modal.style.display = "none";
});

let clinics = []; // 🔥 global dataset

async function loadClinics() {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";

    clinics = []; // 🔥 reset dataset

    try {
        const querySnapshot = await getDocs(collection(db, "clinicsObjects"));

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            const clinicObj = {
                id: docSnap.id,
                name: data.name,
                address: data.address,
                status: data.status,
                service: data.service
            };

            clinics.push(clinicObj); // 🔥 IMPORTANT
        });

        renderClinics(clinics);

    } catch (error) {
        console.error("Error fetching clinics:", error);
    }
}

loadClinics();

function addClinicToUI(id, name, location, status = "Active", service = "General") {
    const container = document.querySelector(".clinics");
    const clinic = document.createElement("section");
    clinic.classList.add("clinic");

    clinic.innerHTML = `
        <section class="clinicHeader">
            <i class="fa-solid fa-house-chimney-medical"></i>
            <section class="clinicNameStatus">
                <p class="clinicName">${name}</p>
                <p class="Location">${location}</p>
            </section>
            <p id="status">${status}</p>
        </section>                      
        <section class="clinicContainer">
            <section class="clinicInfo">
                <section class="services">${service}</section>
            </section>

            <section class="clinic-Btns">
                <button>Manage</button>
                <button>Hours</button>
                <button class="delete-btn" id="deleteBtn">Delete</button>
            </section>
        </section>
    `;

    container.appendChild(clinic);

    const deleteBtn = clinic.querySelector(".delete-btn");

    deleteBtn.addEventListener("click", async () => {
        const confirmDelete = confirm("Delete this clinic?");
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "clinicsObjects", id));

            // 🔥 remove from UI
            clinic.remove();

        } catch (error) {
            console.error("Error deleting clinic:", error);
        }
    });
}


const searchInput = document.getElementById("clinicSearch");

searchInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase().trim();

    const filtered = clinics.filter(c =>
        (c.name || "").toLowerCase().includes(value) ||
        (c.address || "").toLowerCase().includes(value)
    );

    renderClinics(filtered);
});

function renderClinics(list) {
    const container = document.querySelector(".clinics");
    container.innerHTML = "";

    list.forEach(c => {
        addClinicToUI(
            c.id,
            c.name,
            c.address,
            c.status,
            c.service
        );
    });
}