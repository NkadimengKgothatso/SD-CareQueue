
// Import Firebase modules

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


//Firebase project config

const firebaseConfig = {
  apiKey:            "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
  authDomain:        "carequeue-284bb.firebaseapp.com",
  projectId:         "carequeue-284bb",
  storageBucket:     "carequeue-284bb.firebasestorage.app",
  messagingSenderId: "702048481855",
  appId:             "1:702048481855:web:1bb9675ecadb9e22043e8a",
};


// Initialize Firebase App

const app  = initializeApp(firebaseConfig);

// Firebase Authentication instance
const auth = getAuth(app);

// Firestore database instance
const db   = getFirestore(app);


// Role selection logic
// Default role is 'patient'
let selectedRole = "patient";

// Called when user clicks a role
window.selectRole = function(role) {
  selectedRole = role;

  // Remove selection from all roles
  ["patient", "staff", "admin"].forEach(r => {
    const el = document.getElementById("opt-" + r);
    el.classList.remove("selected", "selected-blue", "selected-purple");
    el.querySelector(".role-radio").innerHTML = "";
  });

  // Add selection to clicked role
  const el = document.getElementById("opt-" + role);
  el.querySelector(".role-radio").innerHTML = '<span class="radio-inner"></span>';

  // Add color class based on role
  if (role === "patient")    el.classList.add("selected");        // Green
  else if (role === "staff") el.classList.add("selected-blue");   // Blue
  else                       el.classList.add("selected-purple"); // Purple
};


// Google Sign-In

window.signInWithGoogle = async function() {
  const btn = document.getElementById("google-btn");
  btn.disabled = true;                       // prevent double clicks
  btn.querySelector(".provider-name").textContent = "Signing in…";

  try {
    const provider = new GoogleAuthProvider();          // Google provider
    const result   = await signInWithPopup(auth, provider); // Firebase popup
    const user     = result.user;                        // Firebase user object

    const userRef  = doc(db, "Users", user.uid);        // Firestore document for this user
    const userSnap = await getDoc(userRef);            // Check if user already exists

    if (!userSnap.exists()) {
      // First-time sign-in → create new document
      await setDoc(userRef, {
        uid:         user.uid,
        displayName: user.displayName,
        email:       user.email,
        photoURL:    user.photoURL,
        role:        selectedRole,
        createdAt:   serverTimestamp()
      });
    } else {
      // Returning user → update role if changed
      await setDoc(userRef, { role: selectedRole }, { merge: true });
    }

    // Redirect based on role
    handleRedirect(selectedRole, user);

  } catch (err) {
    console.error("Sign-in error:", err);
    showError(err.code === "auth/popup-closed-by-user"
      ? "Sign-in was cancelled. Please try again."
      : "Something went wrong. Please try again.");
    btn.disabled = false;
    btn.querySelector(".provider-name").textContent = "Continue with Google";
  }
};


// Redirect users based on role

function handleRedirect(role, user) {
  if (role === "patient") {
    window.location.href = "../Patients_WebPages/Dashboard.html"; // patient dashboard
  } else {
    showPlaceholder(role, user); // staff/admin placeholder
  }
}


// Placeholder for staff/admin

function showPlaceholder(role, user) {
  const card = document.querySelector("article.login-card");
  const roleLabel = role === "staff" ? "Clinic Staff" : "Admin";

  card.innerHTML = `
    <section class="placeholder-wrap">
    
      <h2 class="placeholder-title">Welcome, ${user.displayName?.split(" ")[0] || "there"}!</h2>
      <p class="placeholder-role">${roleLabel} Portal</p>
      <p class="placeholder-msg">
        The <strong>${roleLabel}</strong> portal is coming soon.<br/>
        Your account has been created and your role saved.
      </p>
      <p class="placeholder-badge ${role === "staff" ? "badge-blue" : "badge-purple"}">
        ${roleLabel}
      </p>
      <button class="sign-out-btn" onclick="handleSignOut()">← Sign out</button>
    </section>
  `;
}


// Sign out logic

window.handleSignOut = async function() {
  await signOut(auth);
  window.location.reload();
};


// Display error messages

function showError(msg) {
  let el = document.getElementById("auth-error");
  if (!el) {
    el = document.createElement("p");
    el.id = "auth-error";
    el.className = "auth-error";
    document.querySelector(".providers").before(el);
  }
  el.textContent = msg;
  el.style.display = "block";
}


// Auto redirect if user already signed in

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userRef  = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const savedRole = userSnap.data().role;

        if (savedRole === "patient") {
          window.location.href = "../Patients WebPages/Dashboard.html";
        } else {
          showPlaceholder(savedRole, user);
        }
      }
    } catch (e) {
      console.warn("Firestore read failed:", e.message);
    }
  }
});
