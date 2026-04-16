import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA8a7NhWrtgST9ZY68Dnvxhe8YDyfKqVOA",
    authDomain: "carequeue-284bb.firebaseapp.com",
    projectId: "carequeue-284bb",
    storageBucket: "carequeue-284bb.app",
    messagingSenderId: "702048481855",
    appId: "1:702048481855:web:1bb9675ecadb9e22043e8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Table reference by id
const tableBody = document.getElementById("walkinTable");

// Firestore query
const q = query(
    collection(db, "walkins"),
    orderBy("createdAt", "asc")
);

// Real-time listener,to avoid refreshing pages
onSnapshot(q, (snapshot) => {

    let rows = "";
    let index = 1;

    snapshot.forEach((doc) => {
        const data = doc.data();

        rows += `
            <tr>
                <td>${index++}</td>
                <td>${data.name}</td>
                <td>${data.reason}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = rows;
});