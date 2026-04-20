// clinicManagementLogic.js

function getStatusColors(status) {
    const statusColors = {
        Active: { background: "#DCFCE7", color: "#166534" },
        Closed: { background: "#FEE2E2", color: "#991B1B" },
        Busy:   { background: "#E5E7EB", color: "#374151" }
    };
    return statusColors[status] || statusColors["Active"];
}

function formatServices(service) {
    if (Array.isArray(service) && service.length > 0) return service;
    if (typeof service === "string" && service.trim()) return [service];
    return ["General"];
}

function filterClinics(clinics, searchValue) {
    const value = searchValue.toLowerCase().trim();
    return clinics.filter(c =>
        (c.name || "").toLowerCase().includes(value) ||
        (c.address || "").toLowerCase().includes(value)
    );
}

function validateClinicForm(name, address) {
    const errors = [];
    if (!name || name.trim() === "") errors.push("Clinic name is required");
    if (!address || address.trim() === "") errors.push("Address is required");
    return errors;
}

function formatClinicHours(hours) {
    if (!hours || hours.trim() === "") return "Mon-Fri: 8am - 5pm";
    return hours.trim();
}

module.exports = {
    getStatusColors,
    formatServices,
    filterClinics,
    validateClinicForm,
    formatClinicHours
};

// Makes functions available in the browser
if (typeof window !== "undefined") {
    window.clinicManagementLogic = {
        getStatusColors,
        formatServices,
        filterClinics,
        validateClinicForm,
        formatClinicHours
    };
}