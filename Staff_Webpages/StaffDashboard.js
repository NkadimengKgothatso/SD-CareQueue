import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs,
    doc,
    getDoc, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { 
    getAuth,
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


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


/* ================= PREVENT DOUBLE LOAD ================= */
let hasLoaded = false;


/* ================= AUTH LISTENER ================= */
onAuthStateChanged(auth, async (user) => {
    if (!user || hasLoaded) return;
    hasLoaded = true;

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

            
            clinicID = Number(data.clinicId);

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

let cancelledAppointments=0; 
/* ================= LOAD APPOINTMENTS ================= */
async function loadAppointments(clinicID) {
    try {
        const container = document.querySelector(".appointments");

       
        const q = query(
            collection(db, "Appointments"),
            where("clinicID", "==", clinicID)
        );

        const snapshot = await getDocs(q);
        console.log("Total docs:", snapshot.size);

        if (snapshot.empty) {
            container.innerHTML += `<p class="empty">No upcoming appointments</p>`;
            return;
        }

        const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort locally (no index needed)
        docs.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

       for (const data of docs) {

        const status = String(data.status || "").toLowerCase().trim();

        // SKIP CANCELLED APPOINTMENTS
        if (status === "cancelled") {
            cancelledAppointments++;
            continue;
            
        }

        let displayName = "Unknown";

        if (data.userID) {
            try {
                const userRef = doc(db, "Users", data.userID);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    displayName = userSnap.data().displayName;
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

    if (snapshot.size === cancelledAppointments) {
            container.innerHTML += `<p class="empty">No upcoming appointments</p>`;
            return;
        }

    } catch (error) {
        console.error("Error loading appointments:", error);
    }
}

// ================= SIGN OUT =================
window.signOut = async function () {
    await signOut(auth);
    window.location.href = "/index.html";
};


/* ================= LOAD STATS ================= */
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

        const todayStr = new Date().toLocaleDateString("en-CA");

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            // FIXED DATE HANDLING
            let docDateStr = null;

            if (data.date?.toDate) {
                docDateStr = data.date.toDate().toLocaleDateString("en-CA");
            } else if (data.date) {
                docDateStr = new Date(data.date).toLocaleDateString("en-CA");
            }

            const status = String(data.status || "").toLowerCase().trim();

            if (status === "booked" || status === "waiting" || status === "scheduled") {
                inQueue++;
                totalToday++;
            }

            if (status === "completed") {
                completed++;
                totalToday++;
            }
        });

        // UPDATE UI
        document.getElementById("totalToday").textContent = totalToday;
        document.getElementById("inQueue").textContent = inQueue;
        document.getElementById("completed").textContent = completed;

        document.getElementById("avgWait").textContent =
            inQueue > 0 ? "15m" : "0m";

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}
