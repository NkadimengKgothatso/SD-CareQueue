import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db   = getFirestore(app);

const ADMINS_COLLECTION = "admins";

// ================= ADMIN CHECK =================
async function isUserAdmin(user) {
    if (!user) return false;
    try {
        const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
        return snapshot.docs.some(d =>
            (d.data().email || "").toLowerCase().trim() === user.email.toLowerCase().trim()
        );
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// ================= POPULATE SIDEBAR =================
// Single source of truth for the sidebar user info across ALL admin pages.
// StaffManagement.js, clinicManagement.js, Dashboard.js, Analytics.js, etc.
// all get this behaviour for free by importing admin.js.
function populateSidebar(user) {
    const nameEl   = document.getElementById("adminName");
    const emailEl  = document.getElementById("adminEmail");
    const avatarEl = document.getElementById("adminAvatar");

    const displayName = user.displayName || "";
    const email       = user.email       || "";

    if (nameEl)   nameEl.textContent   = displayName || email.split("@")[0];
    if (emailEl)  emailEl.textContent  = email;
    // Avatar uses first letter of display name; falls back to first letter of email
    if (avatarEl) avatarEl.textContent = (displayName.charAt(0) || email.charAt(0)).toUpperCase();
}

// ================= AUTH GUARD =================
// Runs on every admin page. Redirects non-admins back to login.
// Resolves with the verified user so page-specific JS can continue.
export async function initAdminPage() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = "/index.html";
                return;
            }

            const isAdmin = await isUserAdmin(user);
            if (!isAdmin) {
                await signOut(auth);
                window.location.href = "/index.html";
                return;
            }

            populateSidebar(user);
            resolve(user);
        });
    });
}

// ================= SIGN OUT =================
export async function adminSignOut() {
    await signOut(auth);
    window.location.href = "/index.html";
}

export { auth, db };