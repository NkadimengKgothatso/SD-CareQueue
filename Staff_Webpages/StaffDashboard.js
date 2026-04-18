import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs,
    doc,
    orderBy,
    getDoc, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


/* ================= FIREBASE ================= */
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.appspot.com",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


/* ================= AUTH LISTENER ================= */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("No user logged in");
        return;
    }

    try {
        const q = query(
            collection(db, "ApprovedStaff"),
            where("email", "==", user.email)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("No staff found");
            return;
        }

        let clinicID = null;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            clinicID = data.clinicID;

            document.querySelectorAll(".name-Surname").forEach(el => {
                el.textContent = data.displayName;
            });

            const today = new Date().toDateString();
            const clinicTimeEl = document.getElementById("clinicAndTime");
            if (clinicTimeEl) {
                clinicTimeEl.textContent = `${data.assignedClinic} · ${today}`;
            }
        });

        if (!clinicID) {
            console.log("No clinicID found");
            return;
        }

        loadAppointments(clinicID);
        loadStats(clinicID);

    } catch (error) {
        console.error("Error loading user:", error);
    }
});


/* ================= LOAD APPOINTMENTS ================= */
async function loadAppointments(clinicID) {
    try {
        const container = document.querySelector(".appointments");

        container.innerHTML = "<h3>UPCOMING APPOINTMENTS</h3>";

        const q = query(
            collection(db, "Appointments"),
            where("clinicID", "==", clinicID),
            orderBy("time")
        );

        const snapshot = await getDocs(q);

        //EMPTY STATE FIX
        if (snapshot.empty) {
            container.innerHTML += `<p class="empty">No upcoming appointments</p>`;
            return;
        }

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            let displayName = "Unknown";

            if (data.userID) {
                try {
                    const userRef = doc(db, "Users", data.userID);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        displayName = userSnap.data().displayName || "Unknown";
                    }
                } catch (err) {
                    console.error("Error fetching user:", err);
                }
            }

            const article = document.createElement("article");
            article.className = "appointment";

            article.innerHTML = `
                <time class="time">${data.time || "N/A"}</time>
                <section class="details">
                    <strong>${displayName}</strong>
                    <p>${data.reason || "No reason"}</p>
                </section>
                <mark class="badge">${data.status || "Booked"}</mark>
            `;

            container.appendChild(article);
        }

    } catch (error) {
        console.error("Error loading appointments:", error);
    }
}
// CALCULATE THE STATS 
async function loadStats(clinicID) {
    try {

        const q = query(
            collection(db, "Appointments"),
            where("clinicID", "==", clinicID)
        );

        const snapshot = await getDocs(q);

        let totalToday = 0;
        let inQueue = 0;
        let completed = 0;

        const today = new Date().toISOString().split("T")[0]; 
        // ✔ matches "2026-04-18"

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            // TODAY FILTER
            if (data.date === today) {
                totalToday++;
            }

            //normalize status
            const status = (data.status || "").toLowerCase();

            if (status === "booked" || status === "waiting") {
                inQueue++;
            }

            if (status === "completed") {
                completed++;
            }
        });

        // UI updates
        document.getElementById("totalToday").textContent = totalToday;
        document.getElementById("inQueue").textContent = inQueue;
        document.getElementById("completed").textContent = completed;

        // simple fallback (no real wait tracking yet)
        const avg = inQueue > 0 ? Math.round(15) : 0;
        document.getElementById("avgWait").textContent = avg + "m";

    } catch (error) {
        console.error("Error loading stats:", error);
    }


}

// ================= SIGN OUT =================
window.signOut = async function () {
    await signOut(auth);
    window.location.href = "/index.html";
};