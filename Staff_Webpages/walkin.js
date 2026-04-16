import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    serverTimestamp,
    getDocs,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



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



// DOM references

const tableBody = document.getElementById("walkinTable");
const addBtn = document.querySelector(".add-btn");
const nameInput = document.getElementById("nameInput");
const reasonInput = document.getElementById("reasonInput");



// Clinic context (TEMP fallback until staff fix)

let assignedClinic = "TEMP_CLINIC";



// Get clinic from approvedStaff

async function getStaffClinic(email) {

    const q = query(
        collection(db, "approvedStaff"),
        where("addedBy", "==", email)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].data().assignedClinic;
    }

    throw new Error("Clinic not found for staff");
}



// Load appointments (filtered by clinic)

function loadAppointments() {

    const q = query(
        collection(db, "Appointments"),
        where("assignedClinic", "==", assignedClinic),
        orderBy("createdAt", "asc")
    );

    onSnapshot(q, (snapshot) => {

        let rows = "";
        let index = 1;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            const isWalkIn = data.isWalkIn === true;

            rows += `
                <tr>
                    <td>${index++}</td>

                    <td>
                        ${data.patientName || "Unknown"}
                        ${isWalkIn ? `<span class="badge">Walk-in</span>` : ""}
                    </td>

                    <td>${data.reason || ""}</td>

                    <td>${data.status || "waiting"}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = rows;
    });
}



// Add walk-in patient

addBtn.addEventListener("click", async () => {

    const name = nameInput.value.trim();
    const reason = reasonInput.value;

    if (!name) {
        alert("Please enter patient name");
        return;
    }

    try {

        // ── Duplicate check (same clinic only)
        const duplicateQuery = query(
            collection(db, "Appointments"),
            where("assignedClinic", "==", assignedClinic),
            where("patientName", "==", name),
            where("reason", "==", reason),
            where("status", "==", "waiting")
        );

        const existing = await getDocs(duplicateQuery);

        if (!existing.empty) {
            alert("This patient is already in the queue.");
            return;
        }

        // ── Add walk-in to Appointments
        await addDoc(collection(db, "Appointments"), {
            assignedClinic,
            patientName: name,
            reason,
            status: "waiting",
            isWalkIn: true,
            createdAt: serverTimestamp()
        });

        // clear form
        nameInput.value = "";
        reasonInput.value = "";

    } catch (error) {
        console.error("Error adding walk-in:", error);
        alert("Failed to add patient");
    }
});


// ─────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    try {
        assignedClinic = await getStaffClinic(user.email);

        console.log("Clinic loaded:", assignedClinic);

        loadAppointments();

    } catch (err) {
        console.error("Clinic load failed:", err);
    }
});