// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================= FIREBASE CONFIG =================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};


// ================= INITIALIZE =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ======================================================================
// LOG QUEUE HISTORY
// ======================================================================
// Call this when patient is served/completed
// ======================================================================

export async function logQueueCompletion({

    clinicID,
    appointmentId,
    userID,

    queuePosition,
    queueLength,

    createdAT,
    appointmentTime,

    avgServiceTime = 30

}) {

    try {

        // ==============================================================
        // FIRESTORE TIMESTAMP SUPPORT
        // ==============================================================

        const joinedDate =
            createdAT instanceof Timestamp
                ? createdAT.toDate()
                : new Date(createdAT);

        const servedDate =
            appointmentTime instanceof Timestamp
                ? appointmentTime.toDate()
                : new Date(appointmentTime);

        // ==============================================================
        // ACTUAL WAIT TIME
        // ==============================================================

        const actualWaitTime = Math.round(
            (servedDate.getTime() - joinedDate.getTime()) / 60000
        );

        // ==============================================================
        // TIME FEATURES
        // ==============================================================

        const hour = joinedDate.getHours();

        // Sunday=0 → Saturday=6
        const dayOfWeek = joinedDate.getDay();

        // ==============================================================
        // BUILD RECORD
        // ==============================================================

        const record = {

            // Patient
            userID: String(userID),

            // Clinic
            clinicID: Number(clinicID),

            // Appointment
            appointmentId: String(appointmentId),

            // Queue state
            queuePosition: Number(queuePosition),

            // IMPORTANT: correct field name
            queueLength: Number(queueLength),

            // Timing
            createdAT: joinedDate,
            appointmentTime: servedDate,

            // Features
            hour,
            dayOfWeek,

            avgServiceTime: Number(avgServiceTime),

            // TARGET VARIABLE
            actualWaitTime,

            // Metadata
            loggedAt: new Date()
        };

        // ==============================================================
        // SAVE TO FIRESTORE
        // ==============================================================

        await addDoc(collection(db, "QueueHistory"), record);

        console.log(
            `✅ QueueHistory Logged | clinic=${clinicID} | wait=${actualWaitTime} min`
        );

    } catch (error) {

        console.error("❌ Failed to log QueueHistory:", error);

    }
}


// ======================================================================
// TEST FUNCTION
// ======================================================================

window.testQueueHistory = async function () {

    await logQueueCompletion({

        clinicID: 1234567,

        userID: "user12",

        appointmentId: "appt456",

        queuePosition: 3,

        queueLength: 5,

        createdAT: new Date("2026-05-09T14:25:34"),

        appointmentTime: new Date("2026-05-09T18:26:33"),

        avgServiceTime: 30
    });
};




