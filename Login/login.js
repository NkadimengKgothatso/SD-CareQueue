
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

// Firebase project config
const firebaseConfig = {
  apiKey:            "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
  authDomain:        "carequeue-284bb.firebaseapp.com",
  projectId:         "carequeue-284bb",
  storageBucket:     "carequeue-284bb.firebasestorage.app",
  messagingSenderId: "702048481855",
  appId:             "1:702048481855:web:1bb9675ecadb9e22043e8a",
};

// Initialize Firebase
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Default selected role is patient
let selectedRole = "patient";

// Role Selection 
// Called when user clicks a role option
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


// Shows a popup(modal) asking user to confirm their role
// Returns a Promise that resolves true (confirmed) or false (cancelled)
function showConfirmModal(role) {
  return new Promise((resolve) => {
    const modal      = document.getElementById("confirm-modal");
    const roleName   = document.getElementById("modal-role-name");
    const confirmBtn = document.getElementById("modal-confirm");
    const cancelBtn  = document.getElementById("modal-cancel");

    // Display the selected role name in the modal
    roleName.textContent = role.charAt(0).toUpperCase() + role.slice(1);

    // Open the modal
    modal.showModal();

    // User clicked confirm
    confirmBtn.onclick = () => {
      modal.close();
      resolve(true);
    };

    // User clicked cancel
    cancelBtn.onclick = () => {
      modal.close();
      resolve(false);
    };
  });
}

// Google Sign-In 
window.signInWithGoogle = async function() {
  const btn = document.getElementById("google-btn");
  btn.disabled = true; // Prevent double clicks
  btn.querySelector("strong.provider-name").textContent = "Signing in…";

  try {
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(auth, provider); // Open Google popup
    const user     = result.user;

    const userRef  = doc(db, "Users", user.uid); // Reference to user's Firestore doc
    const userSnap = await getDoc(userRef);      // Check if user already exists

    if (!userSnap.exists()) {
      // First time signing in — show confirmation modal before saving role
      const confirmed = await showConfirmModal(selectedRole);

      if (!confirmed) {
        // User cancelled — sign them out and reset button
        btn.disabled = false;
        btn.querySelector("strong.provider-name").textContent = "Continue with Google";
        await signOut(auth);
        return;
      }

      // Save new user document to Firestore
      await setDoc(userRef, {
        uid:         user.uid,
        displayName: user.displayName,
        email:       user.email,
        photoURL:    user.photoURL,
        role:        selectedRole,
        createdAt:   serverTimestamp()
      });

      handleRedirect(selectedRole, user);

    } else {
      // Returning user — use their saved role, ignore what they selected
      const savedRole = userSnap.data().role;
      handleRedirect(savedRole, user);
    }

  } catch (err) {
    console.error("Sign-in error:", err);
    showError(err.code === "auth/popup-closed-by-user"
      ? "Sign-in was cancelled. Please try again."
      : "Something went wrong. Please try again.");
    btn.disabled = false;
    btn.querySelector("strong.provider-name").textContent = "Continue with Google";
  }
};

//  Redirect Based on Role 
function handleRedirect(role, user) {
  if (role === "patient") {
    // Redirect patient to their dashboard
    window.location.href = "../Patients_WebPages/PatientDashboard.html";
  } else {
    // Show placeholder for staff and admin (coming in future sprints)
    showPlaceholder(role, user);
  }
}

// Staff / Admin Placeholder
// Replaces the login card with a placeholder message for non-patient roles
function showPlaceholder(role, user) {
  const card      = document.querySelector("article.login-card");
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

// Sign Out 
window.handleSignOut = async function() {
  await signOut(auth);
  window.location.reload();
};

 
// Displays an error message above the Google button
function showError(msg) {
  let el = document.getElementById("auth-error");
  if (!el) {
    el = document.createElement("p");
    el.id = "auth-error";
    el.className = "auth-error";
    document.querySelector("section.providers").before(el);
  }
  el.textContent = msg;
  el.style.display = "block";
}


// If user is already signed in, skip login and redirect immediately
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userRef  = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const savedRole = userSnap.data().role;

        if (savedRole === "patient") {
          window.location.href = "../Patients_WebPages/PatientDashboard.html";
        } else {
          showPlaceholder(savedRole, user);
        }
      }
    } catch (e) {
      console.warn("Firestore read failed:", e.message);
    }
  }
});