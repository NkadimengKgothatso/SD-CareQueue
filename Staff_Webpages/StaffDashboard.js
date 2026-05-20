import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs,
    updateDoc,
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
// This stops the dashboard from loading the same data more than once.
let hasLoaded = false;


/* ================= AUTH LISTENER ================= */
// Runs after Firebase checks whether a staff member is signed in.
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
            
            return;
        }

        let clinicID = null;
        let staffName = "Staff";
        let staffEmail = user.email;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            clinicID = Number(data.clinicId);
            staffName = data.name || "Staff";

            // Display the staff name in the top bar.
            document.querySelectorAll(".name-Surname").forEach(el => {
                el.textContent = staffName;
            });

            const today = new Date().toDateString();
            const clinicTimeEl = document.getElementById("clinicAndTime");

            if (clinicTimeEl) {
                clinicTimeEl.textContent = `${data.clinicName} · ${today}`;
            }
        });

        // ─── Sidebar footer (STAFF) ─────────────────────────────
        const staffNameEl = document.getElementById("staffName");
        const staffEmailEl = document.getElementById("staffEmail");
        const staffAvatarEl = document.getElementById("staffAvatar");

        if (staffNameEl) staffNameEl.textContent = staffName;
        if (staffEmailEl) staffEmailEl.textContent = staffEmail;

        if (staffAvatarEl) {
            const initials = staffName
                .split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase();

            staffAvatarEl.textContent = initials;
        }

        // Load the dashboard data only after the staff clinic has been found.
        if (!clinicID) {
            return;
        }

        loadAppointments(clinicID);
        loadStats(clinicID);
        loadStaffNotifications(clinicID);

    } catch (error) {
        console.error("Error loading user:", error);
    }
});

let cancelledAppointments=0; 

/* ================= LOAD APPOINTMENTS ================= */
async function loadAppointments(clinicID) {
    try {
        const container = document.querySelector(".appointments");
        container.innerHTML = "";

        const q = query(
            collection(db, "Appointments"),
            where("clinicID", "==", clinicID)
        );

        const snapshot = await getDocs(q);
       

        const todayStr = new Date().toLocaleDateString("en-CA");

        const docs = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        docs.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

        let displayedAppointments = 0;

        for (const data of docs) {
            const status = String(data.status || "").toLowerCase().trim();

            if (status === "cancelled" || status === "completed" ) continue;

            let docDateStr = null;

            if (data.date?.toDate) {
                docDateStr = data.date.toDate().toLocaleDateString("en-CA");
            } else if (data.date) {
                docDateStr = new Date(data.date).toLocaleDateString("en-CA");
            }

            // Only show appointments that belong to today.
            if (docDateStr !== todayStr) continue;

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
            } else if (data.patientName) {
                displayName = data.patientName;
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
            displayedAppointments++;
        }

        if (displayedAppointments === 0) {
            container.innerHTML = `<p class="empty">No appointments for today</p>`;
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


/* ================= Load Staff Notifications ================= */
async function loadStaffNotifications(clinicID) {
    try {
        const container = document.getElementById("notificationsContainer");

        container.innerHTML = "";

        const q = query(
            collection(db, "Notifications"),
            where("clinicID", "==", Number(clinicID)),
            where("targetRole", "==", "staff")
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = `
                <p class="empty">No notifications</p>
            `;
            return;
        }

        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Show the newest notifications first.
        notifications.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
        });

       notifications.forEach(data => {

            let colorClass = "blue";

            if (data.title?.toLowerCase().includes("cancel")) {
                colorClass = "red";
            } else if (
                data.title?.toLowerCase().includes("walk-in") ||
                data.title?.toLowerCase().includes("joined")
            ) {
                colorClass = "green";
            }

            const createdDate = data.createdAt?.toDate
                ? data.createdAt.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })
                : "Just now";

            const article = document.createElement("article");

            article.className = `
                notification 
                ${colorClass} 
                ${data.read ? "read" : ""}
            `;

            article.innerHTML = `
                <p>
                    ${data.message}
                    <br>
                    <small>${createdDate}</small>
                </p>
            `;

            // When staff clicks a notification, mark it as read and remove it from the list.
            article.addEventListener("click", async () => {
                try {
                    if (!data.read) {
                        await updateDoc(doc(db, "Notifications", data.id), {
                            read: true
                        });
                    }

                    article.classList.add("read");

                    setTimeout(() => {
                        article.remove();

                        if (container.children.length === 0) {
                            container.innerHTML = `<p class="empty">No notifications</p>`;
                        }
                    }, 500);

                } catch (error) {
                    console.error("Error marking notification as read:", error);
                }
            });

            container.appendChild(article);
        });

    } catch (error) {
        console.error("Error loading notifications:", error);
    }
}

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

            let docDateStr = null;

            // Support both Firestore Timestamp dates and normal string dates.
            if (data.date?.toDate) {
                docDateStr = data.date.toDate().toLocaleDateString("en-CA");
            }
            else if (data.date) {
                docDateStr = new Date(data.date).toLocaleDateString("en-CA");
            }

            if (docDateStr !== todayStr) return;

            const status = String(data.status || "").toLowerCase().trim();

            totalToday++;

            if (status === "booked" || status === "waiting" || status === "scheduled") {
                inQueue++;
            }

            if (status === "completed") {
                completed++;
            }
        });

        // Update the summary cards on the dashboard.
        document.getElementById("totalToday").textContent = totalToday;
        document.getElementById("inQueue").textContent = inQueue;
        document.getElementById("completed").textContent = completed;

        document.getElementById("avgWait").textContent =
            inQueue > 0 ? "30m" : "0m";

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

export {
  loadAppointments,
  loadStats
};
