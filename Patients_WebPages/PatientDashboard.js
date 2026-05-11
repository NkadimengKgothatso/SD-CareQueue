// ================= Firebase Setup =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= ML IMPORT =================
import {
    warmUpAPI,
    loadQueueStatusML
} from "./carequeue-ml/js/waitTimeML.js";

// ================= Firebase Config =================
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// ================= INIT =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= STATE =================
let emptyStates, filledStates;
let clinicsMap = new Map();
let queueUnsubscribe = null;

let patientName = "";
let patientEmail = "";

// ================= DOM HELPER =================
const $ = (id) => document.getElementById(id);

// ================= LOAD CLINICS =================
async function loadClinics() {
    const snapshot = await getDocs(collection(db, "clinicsObjects"));
    clinicsMap.clear();

    snapshot.forEach(docSnap => {
        const c = docSnap.data();
        const id = c.id ? String(c.id) : docSnap.id;
        clinicsMap.set(id, c);
    });
}

// ================= VISITS COUNT =================
async function loadVisitsCount(userId) {
    const el = $("visitsCount");

    const snapshot = await getDocs(
        query(
            collection(db, "Appointments"),
            where("userID", "==", userId),
            where("status", "==", "completed")
        )
    );

    el.textContent = snapshot.size;
}

// ================= QUEUE STATS =================
async function loadQueueStats(clinicID, appointmentId, userId) {
    try {
        const queueSnap = await getDocs(
            query(
                collection(db, "Queues"),
                where("clinicID", "==", clinicID),
                where("status", "==", "waiting")
            )
        );

        if (queueSnap.empty) return;

        let queue = [];

        queueSnap.forEach(doc => {
            queue.push(doc.data());
        });

        // sort by position
        queue.sort((a, b) => a.position - b.position);

        const userIndex = queue.findIndex(q => q.appointmentId === appointmentId);

        const queueLength = queue.length;

        if (userIndex === -1) return;

        const position = userIndex + 1;
        const ahead = position - 1;

        // progress (how close to being served)
        const progress = Math.max(
            0,
            Math.min(100, ((queueLength - position + 1) / queueLength) * 100)
        );

        // UI updates
        $("queuePosition").textContent = position;
        $("queueCount").textContent = `${queueLength} people in queue`;
        $("queueProgressText").textContent = `${ahead} people ahead of you`;

        $("queueMeter").value = progress;
        $("progressPercent").textContent = `${Math.round(progress)}%`;

    } catch (err) {
        console.error("Queue stats error:", err);
    }
}

// ================= APPOINTMENTS =================
async function loadAppointments(userId) {
    const container = $("appointmentsContainer");
    container.innerHTML = "";

    const snapshot = await getDocs(
        query(collection(db, "Appointments"), where("userID", "==", userId))
    );

    if (snapshot.empty) {
        emptyStates.style.display = "block";
        filledStates.style.display = "none";
        return;
    }

    await loadClinics();

    const appointments = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = appointments
        .filter(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            return d >= today && !["cancelled", "completed"].includes((a.status || "").toLowerCase());
        })
        .sort((a, b) =>
            new Date(`${a.date}T${a.time || "00:00"}`) -
            new Date(`${b.date}T${b.time || "00:00"}`)
        );

    if (!upcoming.length) {
        emptyStates.style.display = "block";
        filledStates.style.display = "none";
        return;
    }

    filledStates.style.display = "block";

    const next = upcoming[0];
    const clinic = clinicsMap.get(String(next.clinicID));

    container.innerHTML = `
        <li class="appointment-card upcoming-card">
            <article class="card-body">

                <header class="card-header">
                    <h2>${clinic?.name || "Clinic"}</h2>
                </header>

                <section>
                    <p>${next.date} • ${next.time}</p>
                    <p>${next.reason || "General"}</p>
                </section>

                <footer>
                    <span>${next.status}</span>
                </footer>

            </article>
        </li>
    `;

    // ML WAIT TIME (kept)
    if (queueUnsubscribe) queueUnsubscribe();

    queueUnsubscribe = loadQueueStatusML(
        userId,
        next.id,
        next.clinicID,
        db,
        clinic?.name,
        patientName,
        patientEmail
    );

    // 🔥 NEW: queue stats + progress
    await loadQueueStats(next.clinicID, next.id, userId);
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", () => {

    warmUpAPI();

    emptyStates = $("emptyStates");
    filledStates = $("filledStates");

    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            window.location.href = "/index.html";
            return;
        }

        const snap = await getDoc(doc(db, "Users", user.uid));

        if (snap.exists()) {
            const data = snap.data();

            patientName = data.displayName || "";
            patientEmail = user.email || "";

            $("userName").textContent = patientName || "User";
            $("userEmail").textContent = patientEmail;
            $("welcomeMessage").textContent = `Welcome, ${patientName}`;

            $("userRole").textContent = data.role || "";
        }

        $("currentDate").textContent = new Date().toLocaleDateString("en-ZA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        // 🔥 LOAD EVERYTHING
        await loadAppointments(user.uid);
        await loadVisitsCount(user.uid);
    });
});

// ================= SIGN OUT =================
window.signOut = async function () {
    if (queueUnsubscribe) queueUnsubscribe();
    await firebaseSignOut(auth);
    window.location.href = "/index.html";
};