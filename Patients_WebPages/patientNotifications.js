import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let notifications = [];
let currentFilter = "all";

const listEl = document.getElementById("notifList");
const toastEl = document.getElementById("toast");

const nameSurnameEl = document.getElementById("userName");
const emailEl =  document.getElementById("userEmail");

onAuthStateChanged(auth, (user) => {
    if (user) {
        nameSurnameEl.textContent = user.displayName;
        emailEl.textContent = user.email;
        loadNotifications(user.uid);
    } else {
        nameSurnameEl.textContent = "Guest";
        window.location.href = "../index.html";
        return;
    }
});



function loadNotifications(userID) {
  const q = query(
  collection(db, "Notifications"),
  where("userID", "==", userID)
);

  onSnapshot(
    q,
    (snapshot) => {
      notifications = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();

         return {
          id: docSnap.id,
          type: data.type || "appointment",
          icon: getIcon(data.type),
          unread: data.read === false,
          name : data.clinicName,
          title: data.title || "Notification",
          msg: data.message || "",
          createdAt: data.createdAt, // keep raw timestamp
          time: formatTime(data.createdAt),
          tags: data.clinicName ? [`Clinic: ${data.clinicName}`] : [],
          urgent: data.type === "queue"
        };
      });

       notifications.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;

        return b.createdAt.seconds - a.createdAt.seconds;
      });

      render();
    },
    (error) => {
      console.error("Error loading notifications:", error);
      alert("Failed to load notifications");
    }
  );
}

function getIcon(type) {
  if (type === "appointment") return "📅";
  if (type === "queue") return "⏱";
  if (type === "reminder") return "🔔";
  if (type === "alert") return "⚠";
  return "🔔";
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return "Just now";

  const date = timestamp.toDate();

  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function render() {
  const filtered = notifications.filter((n) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "unread") return n.unread;
    return n.type === currentFilter;
  });

  document.getElementById("count-all").textContent = notifications.length;
  document.getElementById("count-unread").textContent =
    notifications.filter((n) => n.unread).length;

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty">
        <div class="ico">🎉</div>
        <h3>You're all caught up</h3>
        <p>No notifications match this filter.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map((n) => `
    <div class="notif ${n.unread ? "unread" : ""}" data-id="${n.id}">
      <div class="icon ${n.type}">${n.icon}</div>

      <div class="body">
        <div class="title">
          <section>${n.title} At ${n.name} </section>
          
          <section class="time">${n.time}</section>
        </div>

        <div class="msg">${n.msg}</div>

        <div class="meta">
          ${n.urgent ? `<section class="tag urgent">Urgent</section>` : ""}
          ${n.tags.map((t) => `<section class="tag">${t}</section>`).join("")}
        </div>
      </div>

      <div class="row-actions">
        ${
          n.unread
            ? `<button class="icon-btn" title="Mark as read" data-action="read" data-id="${n.id}">✓</button>`
            : ""
        }

        <button class="icon-btn" title="Dismiss" data-action="dismiss" data-id="${n.id}">✕</button>
      </div>
    </div>
  `).join("");
}

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");

  if (!btn) {
    const card = e.target.closest(".notif");

    if (card) {
      const id = card.dataset.id;
      const n = notifications.find((x) => x.id === id);

      if (n && n.unread) {
        await updateDoc(doc(db, "Notifications", id), {
          read: true
        });
      }
    }

    return;
  }

  const id = btn.dataset.id;
  const n = notifications.find((x) => x.id === id);

  if (!n) return;

  if (btn.dataset.action === "read") {
    await updateDoc(doc(db, "Notifications", id), {
      read: true
    });

    alert("Marked as read");
  }

  if (btn.dataset.action === "dismiss") {
    await deleteDoc(doc(db, "Notifications", id));

    alert("Notification deleted");
  }
});

document.getElementById("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");

  if (!btn) return;

  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.remove("active");
  });

  btn.classList.add("active");
  currentFilter = btn.dataset.filter;

  render();
});

document.getElementById("markAllBtn").addEventListener("click", async () => {
  const unreadNotifications = notifications.filter((n) => n.unread);

  for (const n of unreadNotifications) {
    await updateDoc(doc(db, "Notifications", n.id), {
      read: true
    });
  }

  alert("All notifications marked as read");
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  if (!confirm("Clear all notifications?")) return;

  for (const n of notifications) {
    await deleteDoc(doc(db, "Notifications", n.id));
  }

  alert("All notifications cleared");
});

import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let notifications = [];
let currentFilter = "all";

const listEl = document.getElementById("notifList");
const toastEl = document.getElementById("toast");

const nameSurnameEl = document.getElementById("userName");
const emailEl =  document.getElementById("userEmail");

onAuthStateChanged(auth, (user) => {
    if (user) {
        nameSurnameEl.textContent = user.displayName;
        emailEl.textContent = user.email;
        loadNotifications(user.uid);
    } else {
        nameSurnameEl.textContent = "Guest";
        window.location.href = "../index.html";
        return;
    }
});



function loadNotifications(userID) {
  const q = query(
  collection(db, "Notifications"),
  where("userID", "==", userID)
);

  onSnapshot(
    q,
    (snapshot) => {
      notifications = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();

         return {
          id: docSnap.id,
          type: data.type || "appointment",
          icon: getIcon(data.type),
          unread: data.read === false,
          name : data.clinicName,
          title: data.title || "Notification",
          msg: data.message || "",
          createdAt: data.createdAt, // keep raw timestamp
          time: formatTime(data.createdAt),
          tags: data.clinicName ? [`Clinic: ${data.clinicName}`] : [],
          urgent: data.type === "queue"
        };
      });

       notifications.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;

        return b.createdAt.seconds - a.createdAt.seconds;
      });

      render();
    },
    (error) => {
      console.error("Error loading notifications:", error);
      alert("Failed to load notifications");
    }
  );
}

function getIcon(type) {
  if (type === "appointment") return "📅";
  if (type === "queue") return "⏱";
  if (type === "reminder") return "🔔";
  if (type === "alert") return "⚠";
  return "🔔";
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return "Just now";

  const date = timestamp.toDate();

  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function render() {
  const filtered = notifications.filter((n) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "unread") return n.unread;
    return n.type === currentFilter;
  });

  document.getElementById("count-all").textContent = notifications.length;
  document.getElementById("count-unread").textContent =
    notifications.filter((n) => n.unread).length;

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty">
        <div class="ico">🎉</div>
        <h3>You're all caught up</h3>
        <p>No notifications match this filter.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map((n) => `
    <div class="notif ${n.unread ? "unread" : ""}" data-id="${n.id}">
      <div class="icon ${n.type}">${n.icon}</div>

      <div class="body">
        <div class="title">
          <section>${n.title} At ${n.name} </section>
          
          <section class="time">${n.time}</section>
        </div>

        <div class="msg">${n.msg}</div>

        <div class="meta">
          ${n.urgent ? `<section class="tag urgent">Urgent</section>` : ""}
          ${n.tags.map((t) => `<section class="tag">${t}</section>`).join("")}
        </div>
      </div>

      <div class="row-actions">
        ${
          n.unread
            ? `<button class="icon-btn" title="Mark as read" data-action="read" data-id="${n.id}">✓</button>`
            : ""
        }

        <button class="icon-btn" title="Dismiss" data-action="dismiss" data-id="${n.id}">✕</button>
      </div>
    </div>
  `).join("");
}

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");

  if (!btn) {
    const card = e.target.closest(".notif");

    if (card) {
      const id = card.dataset.id;
      const n = notifications.find((x) => x.id === id);

      if (n && n.unread) {
        await updateDoc(doc(db, "Notifications", id), {
          read: true
        });
      }
    }

    return;
  }

  const id = btn.dataset.id;
  const n = notifications.find((x) => x.id === id);

  if (!n) return;

  if (btn.dataset.action === "read") {
    await updateDoc(doc(db, "Notifications", id), {
      read: true
    });

    alert("Marked as read");
  }

  if (btn.dataset.action === "dismiss") {
    await deleteDoc(doc(db, "Notifications", id));

    alert("Notification deleted");
  }
});

document.getElementById("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");

  if (!btn) return;

  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.remove("active");
  });

  btn.classList.add("active");
  currentFilter = btn.dataset.filter;

  render();
});

document.getElementById("markAllBtn").addEventListener("click", async () => {
  const unreadNotifications = notifications.filter((n) => n.unread);

  for (const n of unreadNotifications) {
    await updateDoc(doc(db, "Notifications", n.id), {
      read: true
    });
  }

  alert("All notifications marked as read");
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  if (!confirm("Clear all notifications?")) return;

  for (const n of notifications) {
    await deleteDoc(doc(db, "Notifications", n.id));
  }

  alert("All notifications cleared");
});

