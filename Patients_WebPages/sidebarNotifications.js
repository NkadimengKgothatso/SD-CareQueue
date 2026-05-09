import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import {
  onAuthStateChanged
} from "firebase/auth";

const badge = document.getElementById("sidebarUnreadCount");

onAuthStateChanged(auth, (user) => {
  if (!user || !badge) return;

  const q = query(
    collection(db, "Notifications"),
    where("userID", "==", user.uid),
    where("read", "==", false)
  );

  onSnapshot(q, (snapshot) => {
    const unreadCount = snapshot.size;

    badge.textContent = unreadCount;

    if (unreadCount === 0) {
      badge.classList.add("hidden");
    } else {
      badge.classList.remove("hidden");
    }
  });
});