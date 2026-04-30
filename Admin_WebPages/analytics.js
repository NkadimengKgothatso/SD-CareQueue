import { initAdminPage, db } from "/Admin_WebPages/admin.js";


document.addEventListener("DOMContentLoaded", () => {
  initAdminPage();

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