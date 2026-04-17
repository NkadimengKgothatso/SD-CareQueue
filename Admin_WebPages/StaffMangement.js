
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
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

const ADMINS_COLLECTION = "admins"; // lowercase — matches Firestore collection name

// ================= ADMIN CHECK =================
async function isUserAdmin(user) {
  if (!user) return false;
  try {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    const match = snapshot.docs.find(doc => {
      const stored = (doc.data().email || "").toLowerCase().trim();
      return stored === user.email.toLowerCase().trim();
    });
    return !!match;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// ================= AUTH GUARD =================
async function checkAdminAuth(user) {
  if (!user) {
    window.location.href = "/index.html";
    return false;
  }

  const isAdmin = await isUserAdmin(user);
  if (!isAdmin) {
    await signOut(auth);
    window.location.href = "/index.html";
    return false;
  }

  // Update admin name in UI if element exists
  const adminNameSpan = document.getElementById("adminName");
  const adminEmailSpan = document.getElementById("adminEmail");
  const adminAvatarDiv = document.getElementById("adminAvatar");

  if (adminNameSpan) {
    adminNameSpan.textContent = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Admin";
  }
  if (adminEmailSpan) {
    adminEmailSpan.textContent = user.email;
  }
  if (adminAvatarDiv) {
    adminAvatarDiv.textContent = user.displayName
      ? user.displayName.charAt(0).toUpperCase()
      : user.email.charAt(0).toUpperCase();
  }

  return true;
}



// ================= INIT =================
onAuthStateChanged(auth, async (user) => {
  await checkAdminAuth(user);
  // Staff management functionality will be added in the next sprint
});
