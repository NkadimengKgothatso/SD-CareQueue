// Import Firebase (MODULAR SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

//  Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.firebasestorage.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for HTML to load
window.addEventListener("DOMContentLoaded", () => {

    const nameEl = document.getElementById("userName");
    const roleEl = document.getElementById("userRole");

    //  Check user login
    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            // Redirect if not logged in
            window.location.href = "../Login/index.html";
            return;
        }

        try {
            console.log("UID:", user.uid); // debug

            //  Get user from Firestore
            const userRef = doc(db, "Users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();

                console.log("User data:", data); // debug

                //  Display name & role
                nameEl.textContent = data.displayName || "No Name";
                document.getElementById("welcomeMessage").textContent ="Welcome back, " + data.displayName;
                roleEl.textContent = data.role || "No Role";

            } else {
                nameEl.textContent = "User not found";
                roleEl.textContent = "N/A";
            }

        } catch (error) {
            console.error("Error fetching user:", error);
            nameEl.textContent = "Error";
            roleEl.textContent = "Error";
        }
    });
});

// show real-time date in the header
function formatDate() {
    const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    };

    return new Date().toLocaleDateString("en-ZA", options);
}

document.getElementById("currentDate").textContent = formatDate();




// Logout function
window.signOut = async function () {
    await signOut(auth);
    window.location.href = "../Login/index.html";
};

