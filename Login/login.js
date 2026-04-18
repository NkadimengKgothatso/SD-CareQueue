

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
  getDocs
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
const ADMINS_COLLECTION = "admins"; // lowercase — matches Firestore collection name

// ================= ROLE SELECTION =================
// Default selected role is patient

window.selectRole = function(role) {
  

  selectedRole = role;

  // Remove highlight from all role options
  ["patient", "staff", "admin"].forEach(r => {
    const el = document.getElementById("opt-" + r);
    el.classList.remove("selected", "selected-blue", "selected-purple");
  });

  // Highlight the selected role with the correct color
  const el = document.getElementById("opt-" + role);
  if (role === "patient")    el.classList.add("selected");        // Green
  else if (role === "staff") el.classList.add("selected-blue");   // Blue
  else                       el.classList.add("selected-purple"); // Purple
};

// ================= ADMIN CHECK =================
// Reads all docs in admins collection and matches by email field
async function isAuthorizedAdmin(email) {
  try {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    const match = snapshot.docs.find(doc => {
      const stored = (doc.data().email || "").toLowerCase().trim();
      return stored === email.toLowerCase().trim();
    });
    return !!match;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// ================= PATIENT RECORD =================
async function createPatientRecord(user) {
  try {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: "patient",
        createdAt: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error("Error creating patient record:", error);
    return false;
  }
}

// ================= REDIRECT =================
function handleRedirect(role) {
  isRedirecting = true;
  if (role === "patient") {
    window.location.href = "/Patients_WebPages/PatientDashboard.html";
  } else if(role== "staff"){
    // Show dashboard for staff
     window.location.href = "../Staff_Webpages/StaffDashboard.html";  
    }
    else  {
      window.location.href = "/Admin_WebPages/StaffManagement.html"; }
  
}

window.signInWithGoogle = async function() {
  isRedirecting = true;

  const btn = document.getElementById("google-btn");
  btn.disabled = true;
  btn.querySelector("strong.provider-name").textContent = "Signing in…";

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email.toLowerCase();

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    // ================= ADMIN =================
    if (selectedRole === "admin") {
      const isAdmin = await isAuthorizedAdmin(email);

      if (!isAdmin) {
        isRedirecting = false;
        await signOut(auth);
        showError("Access denied: You are not authorized as an administrator.");
        btn.disabled = false;
        btn.querySelector("strong.provider-name").textContent = "Continue with Google";
        return;
      }

      handleRedirect("admin");
      return;
    }

    // ================= PATIENT + STAFF =================
    if (!userSnap.exists()) {
      // First-time user → save to Users
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: selectedRole, // THIS is what ensures staff is saved correctly
        createdAt: serverTimestamp()
      });

      handleRedirect(selectedRole);

    } else {
      // Returning user → use saved role
      const savedRole = userSnap.data().role;
      handleRedirect(savedRole);
    }

  } catch (err) {
    isRedirecting = false;

    showError(
      err.code === "auth/popup-closed-by-user"
        ? "Sign-in was cancelled. Please try again."
        : "Something went wrong. Please try again."
    );

    btn.disabled = false;
    btn.querySelector("strong.provider-name").textContent = "Continue with Google";
  }
};

// ================= ERROR DISPLAY =================
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

// ================= SESSION RESTORE =================
// Handles users who are already logged in when they visit the login page
onAuthStateChanged(auth, async (user) => {
  if (isRedirecting) return;

  if (user) {
    const email = user.email.toLowerCase();

    // 🔹 Check admin first
    const isAdmin = await isAuthorizedAdmin(email);
    if (isAdmin) {
      handleRedirect("admin");
      return;
    }

    // 🔹 Then check Users (patient + staff)
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const role = userSnap.data().role;
      handleRedirect(role);
    } else {
      handleRedirect("patient"); // fallback
    }
  }
});