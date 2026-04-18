import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
  authDomain: "carequeue-284bb.firebaseapp.com",
  projectId: "carequeue-284bb",
  storageBucket: "carequeue-284bb.firebasestorage.app",
  messagingSenderId: "702048481855",
  appId: "1:702048481855:web:1bb9675ecadb9e22043e8a",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let selectedRole = "patient";
let isRedirecting = false;

const USERS_COLLECTION = "Users";
const ADMINS_COLLECTION = "admins";
const STAFF_COLLECTION = "ApprovedStaff";

// ================= ROLE SELECTION =================
window.selectRole = function (role) {
  selectedRole = role;

  ["patient", "staff", "admin"].forEach(r => {
    const el = document.getElementById("opt-" + r);
    el.classList.remove("selected", "selected-blue", "selected-purple");
  });

  const el = document.getElementById("opt-" + role);
  if (role === "patient")    el.classList.add("selected");
  else if (role === "staff") el.classList.add("selected-blue");
  else                       el.classList.add("selected-purple");
};

// ================= ADMIN CHECK =================
async function isAuthorizedAdmin(email) {
  try {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    return snapshot.docs.some(
      d => (d.data().email || "").toLowerCase().trim() === email.toLowerCase().trim()
    );
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// ================= STAFF CHECK =================
// Only emails that exist in ApprovedStaff can log in as staff
async function isApprovedStaff(email) {
  try {
    const snapshot = await getDocs(collection(db, STAFF_COLLECTION));
    return snapshot.docs.some(
      d => (d.data().email || "").toLowerCase().trim() === email.toLowerCase().trim()
    );
  } catch (error) {
    console.error("Error checking staff status:", error);
    return false;
  }
}

// ================= REDIRECT =================
function handleRedirect(role) {
  isRedirecting = true;
  if (role === "patient") {
    window.location.href = "/Patients_WebPages/PatientDashboard.html";
  } else if (role === "staff") {
    window.location.href = "../Staff_Webpages/Queues.html";
  } else {
    window.location.href = "/Admin_WebPages/StaffManagement.html";
  }
}

// ================= SIGN IN =================
window.signInWithGoogle = async function () {
  isRedirecting = true;

  const btn = document.getElementById("google-btn");
  btn.disabled = true;
  btn.querySelector("strong.provider-name").textContent = "Signing in…";

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email.toLowerCase();

    // ── ADMIN ──────────────────────────────────────────────
    if (selectedRole === "admin") {
      const isAdmin = await isAuthorizedAdmin(email);
      if (!isAdmin) {
        await signOut(auth);
        showError("Access denied: You are not authorized as an administrator.");
        resetBtn(btn);
        isRedirecting = false;
        return;
      }
      handleRedirect("admin");
      return;
    }

    // ── STAFF ──────────────────────────────────────────────
    if (selectedRole === "staff") {
      const isStaff = await isApprovedStaff(email);
      if (!isStaff) {
        await signOut(auth);
        showError("Access denied: Your email is not registered as clinic staff. Please contact your administrator.");
        resetBtn(btn);
        isRedirecting = false;
        return;
      }
      handleRedirect("staff");
      return;
    }

    // ── PATIENT ────────────────────────────────────────────
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First time patient — create their record
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: "patient",
        createdAt: serverTimestamp()
      });
    }

    handleRedirect("patient");

  } catch (err) {
    isRedirecting = false;
    showError(
      err.code === "auth/popup-closed-by-user"
        ? "Sign-in was cancelled. Please try again."
        : "Something went wrong. Please try again."
    );
    resetBtn(btn);
  }
};

// ================= SESSION RESTORE =================
// Handles users who are already signed in when they visit the login page
onAuthStateChanged(auth, async (user) => {
  if (isRedirecting) return;
  if (!user) return;

  const email = user.email.toLowerCase();

  // Check admin first
  const isAdmin = await isAuthorizedAdmin(email);
  if (isAdmin) {
    handleRedirect("admin");
    return;
  }

  // Check staff
  const isStaff = await isApprovedStaff(email);
  if (isStaff) {
    handleRedirect("staff");
    return;
  }

  // Default to patient
  handleRedirect("patient");
});

// ================= HELPERS =================
function resetBtn(btn) {
  btn.disabled = false;
  btn.querySelector("strong.provider-name").textContent = "Continue with Google";
}

function showError(msg) {
  let el = document.getElementById("auth-error");
  if (!el) {
    el = document.createElement("p");
    el.id = "auth-error";
    el.className = "auth-error";
    const providersSection = document.querySelector("section.providers");
    if (providersSection) providersSection.before(el);
  }
  el.textContent = msg;
  el.style.display = "block";
}