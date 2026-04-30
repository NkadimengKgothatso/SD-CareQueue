import { initAdminPage, db } from "/Admin_WebPages/admin.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let appointments = [];


//loads all appointments from Firestore because everything depends on them
async function loadAppointments() {
    try {
        const snapshot = await getDocs(collection(db, "Appointments"));

        appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("Appointments loaded:", appointments);

    } catch (error) {
        console.error("Error loading appointments:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {

    initAdminPage();

    // STEP 1: LOAD DATA
    loadAppointments();

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