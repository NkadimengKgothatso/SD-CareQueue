const {
    getStatusColors,
    formatServices,
    filterClinics,
    validateClinicForm,
    formatClinicHours
} = require("./clinicManagementLogic");

describe("getStatusColors", () => {
    test("returns green for Active", () => {
        const colors = getStatusColors("Active");
        expect(colors.background).toBe("#DCFCE7");
        expect(colors.color).toBe("#166534");
    });

    test("returns red for Closed", () => {
        const colors = getStatusColors("Closed");
        expect(colors.background).toBe("#FEE2E2");
        expect(colors.color).toBe("#991B1B");
    });

    test("returns grey for Busy", () => {
        const colors = getStatusColors("Busy");
        expect(colors.background).toBe("#E5E7EB");
        expect(colors.color).toBe("#374151");
    });

    test("defaults to Active colors for unknown status", () => {
        const colors = getStatusColors("Unknown");
        expect(colors.background).toBe("#DCFCE7");
    });
});

describe("formatServices", () => {
    test("returns array as-is if valid", () => {
        expect(formatServices(["General", "HIV"])).toEqual(["General", "HIV"]);
    });

    test("wraps a string in an array", () => {
        expect(formatServices("General")).toEqual(["General"]);
    });

    test("returns General for empty array", () => {
        expect(formatServices([])).toEqual(["General"]);
    });

    test("returns General for null", () => {
        expect(formatServices(null)).toEqual(["General"]);
    });
});

describe("filterClinics", () => {
    const clinics = [
        { name: "Soweto Clinic", address: "Johannesburg" },
        { name: "Cape Town Health", address: "Western Cape" },
        { name: "Durban Medical", address: "KwaZulu-Natal" }
    ];

    test("filters by name", () => {
        const result = filterClinics(clinics, "soweto");
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Soweto Clinic");
    });

    test("filters by address", () => {
        const result = filterClinics(clinics, "western cape");
        expect(result.length).toBe(1);
    });

    test("returns all clinics for empty search", () => {
        const result = filterClinics(clinics, "");
        expect(result.length).toBe(3);
    });

    test("returns empty array for no match", () => {
        const result = filterClinics(clinics, "zzznomatch");
        expect(result.length).toBe(0);
    });
});

describe("validateClinicForm", () => {
    test("returns no errors for valid input", () => {
        const errors = validateClinicForm("Soweto Clinic", "Johannesburg");
        expect(errors.length).toBe(0);
    });

    test("returns error for empty name", () => {
        const errors = validateClinicForm("", "Johannesburg");
        expect(errors).toContain("Clinic name is required");
    });

    test("returns error for empty address", () => {
        const errors = validateClinicForm("Soweto Clinic", "");
        expect(errors).toContain("Address is required");
    });

    test("returns two errors for both empty", () => {
        const errors = validateClinicForm("", "");
        expect(errors.length).toBe(2);
    });
});

describe("formatClinicHours", () => {
    test("returns default hours for empty string", () => {
        expect(formatClinicHours("")).toBe("Mon-Fri: 8am - 5pm");
    });

    test("returns default hours for null", () => {
        expect(formatClinicHours(null)).toBe("Mon-Fri: 8am - 5pm");
    });

    test("returns trimmed custom hours", () => {
        expect(formatClinicHours("  Mon-Sat: 7am - 6pm  ")).toBe("Mon-Sat: 7am - 6pm");
    });
});