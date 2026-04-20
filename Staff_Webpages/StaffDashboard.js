// ================= IMPORTS =================
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


// ================= CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.appspot.com",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};


// ================= SAFE HELPERS =================
export function parseClinicId(rawClinicId) {
    const cleaned = String(rawClinicId).trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}


// ================= CORE LOGIC =================
export async function handleUser(user, db) {
    const q = query(
        collection(db, "ApprovedStaff"),
        where("email", "==", user.email)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        const clinicID = parseClinicId(data.clinicId);
        if (clinicID === null) return null;

        return {
            clinicID,
            data
        };
    }

    return null;
}


// ================= LOAD APPOINTMENTS =================
export async function loadAppointments(db, clinicID) {
    const container = document?.querySelector?.(".appointments");
    if (!container) return;

    let cancelledAppointments = 0;

    const q = query(
        collection(db, "Appointments"),
        where("clinicID", "==", clinicID)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        container.innerHTML += `<p class="empty">No upcoming appointments</p>`;
        return;
    }

    const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    docs.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    for (const data of docs) {
        const status = String(data.status || "").toLowerCase().trim();

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

    if (snapshot.size === cancelledAppointments) {
        container.innerHTML += `<p class="empty">No upcoming appointments</p>`;
    }
}


// ================= LOAD STATS =================
export async function loadStats(db, clinicID) {
    const totalEl = document?.getElementById?.("totalToday");
    const queueEl = document?.getElementById?.("inQueue");
    const completedEl = document?.getElementById?.("completed");
    const avgEl = document?.getElementById?.("avgWait");

    const q = query(
        collection(db, "Appointments"),
        where("clinicID", "==", clinicID)
    );

    const snapshot = await getDocs(q);

    let totalToday = 0;
    let inQueue = 0;
    let completed = 0;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const status = String(data.status || "").toLowerCase().trim();

        if (["booked", "waiting", "scheduled"].includes(status)) {
            inQueue++;
            totalToday++;
        }

        if (status === "completed") {
            completed++;
            totalToday++;
        }
    });

    if (totalEl) totalEl.textContent = totalToday;
    if (queueEl) queueEl.textContent = inQueue;
    if (completedEl) completedEl.textContent = completed;
    if (avgEl) avgEl.textContent = inQueue > 0 ? "15m" : "0m";
}


// ================= INIT (BROWSER ONLY) =================
export function initApp() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    let hasLoaded = false;

    onAuthStateChanged(auth, async (user) => {
        if (!user || hasLoaded) return;
        hasLoaded = true;

        try {
            const result = await handleUser(user, db);

            if (!result) return;

            const { clinicID, data } = result;

            // Safe DOM updates
            const nameEls = document?.querySelectorAll?.(".name-Surname") || [];
            nameEls.forEach(el => {
                el.textContent = data.displayName || "";
            });

            const today = new Date().toDateString();
            const clinicTimeEl = document?.getElementById?.("clinicAndTime");

            if (clinicTimeEl) {
                clinicTimeEl.textContent = `${data.assignedClinic || ""} · ${today}`;
            }

            await loadAppointments(db, clinicID);
            await loadStats(db, clinicID);

        } catch (error) {
            console.error("Error loading user:", error);
        }
    });

    // expose signOut
    if (typeof window !== "undefined") {
        window.signOut = async function () {
            await signOut(auth);
            window.location.href = "/index.html";
        };
    }
}


// ================= RUN ONLY IN BROWSER =================
if (typeof window !== "undefined") {
    initApp();
}
