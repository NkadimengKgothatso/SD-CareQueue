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
    deleteDoc  
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

// // If not signed in, redirect back to login
// onAuthStateChanged(auth, (user) => {
//     if (!user) window.location.href = "../Login/index.html";
// });

// Sign out
window.signOut = async function() {
    await signOut(auth);
    window.location.href = "../Login/index.html";
};



const ADMINS_COLLECTION = "admins"; // lowercase — matches Firestore collection name
let editingClinicId = null;
const statusOptions = ["Active", "Closed", "Busy"]; // 🔥 central source of truth for status values

// ================= ADMIN CHECK =================
async function isUserAdmin(user) {
  if (!user) return false;
  try {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    const match = snapshot.docs.find(doc => {
      const stored = (doc.data().email || "").toLowerCase().trim();
      return stored === user.email.toLowerCase().trim();
    });
    return !!match;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// ================= AUTH GUARD =================
async function checkAdminAuth(user) {
  if (!user) {
    window.location.href = "/index.html";
    return false;
  }

  const isAdmin = await isUserAdmin(user);
  if (!isAdmin) {
    await signOut(auth);
    window.location.href = "/index.html";
    return false;
  }

  // Update admin name in UI if element exists
  const nameSurname = document.getElementById("name-Surname");
//   const adminEmailSpan = document.getElementById("adminEmail");

  if (nameSurname) {
    nameSurname.textContent = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Admin";
  }
  return true;
}


// ================= INIT =================
onAuthStateChanged(auth, async (user) => {
  await checkAdminAuth(user);
  // Staff management functionality will be added in the next sprint
});

// =========================
// MODAL LOGIC
// =========================
const addBtn = document.querySelector(".addBtn");
const modal = document.getElementById("clinicModal");
const closeBtns = document.querySelectorAll(".close-btn");
const addForm = document.querySelector("#clinicModal form");
const manageForm = document.querySelector("#ManageClinicModal form");
const manageModal = document.getElementById("ManageClinicModal");

closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        modal.style.display = "none";
        manageModal.style.display = "none";
    });
});

// open modal
addBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});


// close when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
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
                service: data.service,
                operatingHours: data.opening_hours
            };

            clinics.push(clinicObj); // 🔥 IMPORTANT
        });

        renderClinics(clinics);

    } catch (error) {
        console.error("Error fetching clinics:", error);
    }
}

loadClinics();

function addClinicToUI(id, name, location, status="Active", service = "General", operatingHours) {
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

            <section class="OpenTimes">
                <i class="fa-regular fa-clock"></i>
                <p>${operatingHours}</p>
            </section>
            <section class="clinicInfo">
                <section class="services">${service}</section>
                <section class="services">${service}</section>
                <section class="services">${service}</section>
                <section class="services">${service}</section>
            </section>

            <section class="clinic-Btns">
                <button class="manage-btn">Manage</button>
                <button>Hours</button>
                <button class="delete-btn" id="deleteBtn">Delete</button>
            </section>
        </section>
    `;

    container.appendChild(clinic);

    const statusColors = {
        Active: { background: "#DCFCE7", color: "#166534" },   // green
        Closed: { background: "#FEE2E2", color: "#991B1B" },   // red
        Busy:   { background: "#E5E7EB", color: "#374151" }    // grey
    };

    const statusEl = clinic.querySelector("#status");
    const colors = statusColors[status] || statusColors["Active"];
    statusEl.style.background = colors.background;
    statusEl.style.color = colors.color;

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

    // 🔥 MANAGE (EDIT)
    clinic.querySelector(".manage-btn").addEventListener("click", () => {
        console.log("MANAGE CLICKED"); // 👈 should print
        openEditModal(id, name, location, status);
    });
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("clinicName").value.trim();
  const address = document.getElementById("Location").value.trim();
  const status = document.getElementById("clinicStatus").value;

  await addDoc(collection(db, "clinicsObjects"), {
    name,
    address,
    status,
    service: "General",
    createdAt: serverTimestamp()
  });

  loadClinics();
  addForm.reset();
  modal.style.display = "none";
});

manageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

    // manageModal.style.display = "flex";

  const name = document.getElementById("ManageClinicName").value.trim();
  const address = document.getElementById("ManageLocation").value.trim();
  const status = document.getElementById("ManageClinicStatus").value;

  await updateDoc(doc(db, "clinicsObjects", editingClinicId), {
    name,
    address,
    status
  });

  loadClinics();
  manageForm.reset();
  manageModal.style.display = "none";
});

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
            c.service,
            c.operatingHours
        );
    });
}

function openEditModal(id, name, address, status) {
    editingClinicId = id;

    console.log("Modal element:", manageModal);
    console.log("Current display:", manageModal.style.display);
    editingClinicId = id;
    manageModal.style.display = "flex";
    console.log("After setting display:", manageModal.style.display);

    // fill inputs (⚠️ careful: duplicate IDs)
    document.querySelector("#ManageClinicModal #ManageClinicName").value = name;
    document.querySelector("#ManageClinicModal #ManageLocation").value = address;
    document.querySelector("#ManageClinicModal #ManageClinicStatus").value = status;

    // change button text
    document.querySelector("#ManageClinicModal button").textContent = "Update Clinic";
}