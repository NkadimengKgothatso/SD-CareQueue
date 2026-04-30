
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


document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("filterForm");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const from = document.getElementById("dateFrom").value;
        const to = document.getElementById("dateTo").value;

        console.log("Filters:", { from, to });

        // TODO: Fetch analytics data from backend
    });

    document.getElementById("exportCSV").addEventListener("click", () => {
        console.log("Export CSV");
        // TODO: implement
    });

    document.getElementById("exportPDF").addEventListener("click", () => {
        console.log("Export PDF");
        // TODO: implement
    });

});