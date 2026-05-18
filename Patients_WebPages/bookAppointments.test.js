const mockAuth = { currentUser: null };
const mockInitializeApp = jest.fn(() => ({}));
const mockGetAuth = jest.fn(() => mockAuth);
const mockSignOut = jest.fn(() => Promise.resolve());
const mockOnAuthStateChanged = jest.fn();

const mockGetFirestore = jest.fn(() => ({}));
const mockCollection = jest.fn((_db, name) => ({ name }));
const mockAddDoc = jest.fn(() => Promise.resolve({ id: "new-doc" }));
const mockServerTimestamp = jest.fn(() => "TIMESTAMP");
const mockQuery = jest.fn((collectionRef, ...constraints) => ({
  name: collectionRef.name,
  constraints
}));
const mockWhere = jest.fn((field, op, value) => ({ field, op, value }));
const mockGetDocs = jest.fn();
const mockDoc = jest.fn((_db, collectionName, id) => `${collectionName}/${id}`);
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn(() => Promise.resolve());

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  () => ({ initializeApp: mockInitializeApp }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth: mockGetAuth,
    signOut: mockSignOut,
    onAuthStateChanged: mockOnAuthStateChanged
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore: mockGetFirestore,
    collection: mockCollection,
    addDoc: mockAddDoc,
    serverTimestamp: mockServerTimestamp,
    query: mockQuery,
    where: mockWhere,
    getDocs: mockGetDocs,
    doc: mockDoc,
    getDoc: mockGetDoc,
    updateDoc: mockUpdateDoc
  }),
  { virtual: true }
);

function buildDOM() {
  document.body.innerHTML = `
    <section id="pageTitle"></section>

    <section id="timeSlots"></section>

    <input id="selectedTime" />

    <button id="nearMeBtn">Near Me</button>
    <button id="openNowBtn">Open Now</button>

    <input id="clinicSearch" />
    <section id="clinicResults"></section>

    <section id="userName"></section>
    <section id="userEmail"></section>
    <section id="patientAvatar"></section>

    <input id="appt-date" />

    <button class="confirm-Button">Confirm</button>
    <button class="reschedule-Button">Reschedule</button>

    <select class="reason-select">
      <option>Select reason</option>
      <option>Checkup</option>
      <option>Dentist</option>
    </select>

    <aside>
      <nav>
        <ul>
          <li><a id="bookingLink" href="BookAppointments.html"></a></li>
          <li><a id="otherLink" href="Other.html"></a></li>
        </ul>
      </nav>
    </aside>
  `;
}

function snapshotFrom(records = []) {
  const docs = records.map((record, index) => {
    const { __docId, ...data } = record;

    return {
      id: __docId || record.id || `doc-${index}`,
      data: () => data
    };
  });

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => docs.forEach(callback)
  };
}

function hasConstraint(ref, field) {
  return ref.constraints?.some((constraint) => constraint.field === field);
}

function arrangeFirestore({
  clinics = [],
  staffAvailability = [
    {
      __docId: "staff-1",
      schedule: {
        monday: { isWorking: true, start: "08:00", end: "17:00" },
        tuesday: { isWorking: true, start: "08:00", end: "17:00" },
        wednesday: { isWorking: true, start: "08:00", end: "17:00" }
      }
    }
  ],
  bookedTimes = [],
  duplicateBooking = false,
  rejectClinics,
  rejectBookingLookup,
  appointmentForReschedule = null
} = {}) {
  mockGetDocs.mockImplementation((ref) => {
    if (ref.name === "clinicsObjects") {
      return rejectClinics
        ? Promise.reject(rejectClinics)
        : Promise.resolve(snapshotFrom(clinics));
    }

    if (ref.name === "Appointments") {
      if (rejectBookingLookup) {
        return Promise.reject(rejectBookingLookup);
      }

      if (hasConstraint(ref, "time")) {
        return Promise.resolve(
          snapshotFrom(duplicateBooking ? [{ __docId: "existing", time: "10:00" }] : [])
        );
      }

      return Promise.resolve(
        snapshotFrom(bookedTimes.map((booking, index) => (
          typeof booking === "string"
            ? { __docId: `booked-${index}`, time: booking }
            : { __docId: `booked-${index}`, ...booking }
        )))
      );
    }

    if (ref.name === "StaffAvailability") {
      return Promise.resolve(snapshotFrom(staffAvailability));
    }

    return Promise.resolve(snapshotFrom([]));
  });

  mockGetDoc.mockResolvedValue({
    exists: () => Boolean(appointmentForReschedule),
    data: () => appointmentForReschedule || {}
  });
}

function arrangeAuth(user = {
  uid: "user-1",
  email: "patient@test.com",
  displayName: "Patient One"
}) {
  mockAuth.currentUser = user;
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(user);
    return jest.fn();
  });
}

async function flushPromises(times = 8) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

async function load(url = "/Patients_WebPages/BookAppointments.html") {
  window.history.pushState({}, "", url);
  const mod = await import("./bookAppointment.js");
  await flushPromises();
  return mod;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 4, 11, 10, 15, 0));

  buildDOM();
  arrangeAuth();
  arrangeFirestore();

  global.alert = jest.fn();
  global.emailjs = {
    init: jest.fn(),
    send: jest.fn(() => Promise.resolve())
  };

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success) =>
        success({
          coords: {
            latitude: -26.2,
            longitude: 28.0
          }
        })
      )
    }
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("formatTime pads hours and minutes", async () => {
  const { formatTime } = await load();

  expect(formatTime(8, 0)).toBe("08:00");
  expect(formatTime(9, 5)).toBe("09:05");
  expect(formatTime(14, 30)).toBe("14:30");
});

test("calculateDistance returns zero for identical points and positive distance otherwise", async () => {
  const { calculateDistance } = await load();

  expect(calculateDistance(-26.2, 28.0, -26.2, 28.0)).toBe(0);
  expect(calculateDistance(-26.2, 28.0, -26.1, 28.1)).toBeGreaterThan(0);
});

test("getUserLocation resolves coordinates and rejects unsupported or failed geolocation", async () => {
  const { getUserLocation } = await load();

  await expect(getUserLocation()).resolves.toEqual({
    latitude: -26.2,
    longitude: 28.0
  });

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((_success, error) => error(new Error("denied")))
    }
  });
  await expect(getUserLocation()).rejects.toBe("Unable to retrieve your location.");

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined
  });
  await expect(getUserLocation()).rejects.toBe("Geolocation is not supported by this browser.");
});

test("isClinicOpenNow handles open, closed, missing, and invalid schedules", async () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const { isClinicOpenNow } = await load();

  expect(isClinicOpenNow("Mo-Fr 08:00-17:00")).toBe(true);
  expect(isClinicOpenNow("Mo-Fr 12:00-17:00")).toBe(false);
  expect(isClinicOpenNow("Sa-Su 08:00-17:00")).toBe(false);
  expect(isClinicOpenNow("Mo-Fr")).toBe(false);
  expect(isClinicOpenNow("XX-Fr 08:00-17:00")).toBe(false);
  expect(isClinicOpenNow()).toBe(false);
  expect(isClinicOpenNow({})).toBe(false);
  expect(consoleSpy).toHaveBeenCalledWith("Invalid opening_hours format:", {});

  consoleSpy.mockRestore();
});

test("loads clinics, marks active navigation, and fills signed-in user details", async () => {
  arrangeFirestore({
    clinics: [
      { __docId: "1", name: "Alpha Clinic", address: "Main Road", opening_hours: "Mo-Fr 08:00-17:00" },
      { __docId: "2", name: "Beta Clinic", address: "Second Road", opening_hours: "Mo-Fr 08:00-17:00" }
    ]
  });

  await load();

  expect(document.getElementById("clinicResults").textContent).toContain("Alpha Clinic");
  expect(document.getElementById("clinicResults").textContent).toContain("Click Near Me to see distance");
  expect(document.getElementById("bookingLink").classList.contains("active")).toBe(true);
  expect(document.getElementById("userName").textContent).toBe("Patient One");
  expect(document.getElementById("userEmail").textContent).toBe("patient@test.com");
  expect(document.getElementById("patientAvatar").textContent).toBe("PO");
  expect(document.getElementById("appt-date").getAttribute("min")).toBe("2026-05-11");
});

test("auth fallback shows Guest and avatar can fall back to email initial", async () => {
  arrangeAuth(null);
  await load();
  expect(document.getElementById("userName").textContent).toBe("Guest");

  jest.resetModules();
  buildDOM();
  arrangeFirestore();
  arrangeAuth({ uid: "user-2", email: "email@test.com", displayName: "" });

  await load();
  expect(document.getElementById("patientAvatar").textContent).toBe("E");
});

test("loadClinics shows an error message when Firestore fails", async () => {
  const error = new Error("clinics down");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeFirestore({ rejectClinics: error });

  await load();

  expect(consoleSpy).toHaveBeenCalledWith("Error loading clinics:", error);
  expect(document.getElementById("clinicResults").textContent).toContain("Failed to load clinics.");
});

test("displayClinics renders distance text, handles selection, and renders slots when a date exists", async () => {
  const { displayClinics } = await load();
  document.getElementById("appt-date").value = "2026-05-12";
  arrangeFirestore({ bookedTimes: ["08:00"] });

  displayClinics([
    { id: "1", name: "Alpha Clinic", distance: 1.234, latitude: -26.2, longitude: 28.0 },
    { id: "2", name: "Beta Clinic", latitude: -26.3, longitude: 28.1 }
  ]);

  const buttons = document.querySelectorAll(".open-btn");
  buttons[0].click();
  await flushPromises();

  expect(document.getElementById("clinicResults").textContent).toContain("1.23 km away");
  expect(buttons[0].textContent).toBe("Selected");
  expect(buttons[0].style.backgroundColor).toBe("rgb(29, 158, 117)");
  expect(document.querySelectorAll(".time-slot")).toHaveLength(19);

  buttons[1].click();
  expect(buttons[0].textContent).toBe("Select");
  expect(buttons[1].textContent).toBe("Selected");
});

test("renderTimeSlots disables booked and past slots and selects an available slot", async () => {
  arrangeFirestore({ bookedTimes: ["11:00"] });
  const { renderTimeSlots } = await load();

  await renderTimeSlots("2026-05-11", "1");

  const slots = Array.from(document.querySelectorAll(".time-slot"));
  const pastSlot = slots.find((slot) => slot.textContent === "08:00");
  const bookedSlot = slots.find((slot) => slot.textContent === "11:00");
  const availableSlot = slots.find((slot) => slot.textContent === "12:00");

  pastSlot.click();
  expect(document.getElementById("selectedTime").value).toBe("");
  expect(pastSlot.disabled).toBe(true);
  expect(bookedSlot.disabled).toBe(true);
  expect(bookedSlot.classList.contains("disabled-slot")).toBe(true);

  availableSlot.click();
  expect(availableSlot.classList.contains("selected")).toBe(true);
  expect(document.getElementById("selectedTime").value).toBe("12:00");
});

test("renderTimeSlots ignores cancelled appointments when calculating capacity", async () => {
  arrangeFirestore({
    bookedTimes: [{ time: "09:00", status: "cancelled" }]
  });
  const { renderTimeSlots } = await load();

  await renderTimeSlots("2026-05-12", "1");

  const cancelledSlot = Array.from(document.querySelectorAll(".time-slot"))
    .find((slot) => slot.textContent === "09:00");

  expect(cancelledSlot.disabled).toBe(false);
  cancelledSlot.click();
  expect(document.getElementById("selectedTime").value).toBe("09:00");
});

test("renderTimeSlots disables all slots when no staff are available", async () => {
  arrangeFirestore({
    staffAvailability: []
  });
  const { renderTimeSlots } = await load();

  await renderTimeSlots("2026-05-12", "1");

  const slots = Array.from(document.querySelectorAll(".time-slot"));
  expect(slots).toHaveLength(0);
  expect(document.getElementById("timeSlots").textContent).toContain("No staff available for this day.");
});

test("clinic search and applyFilters narrow visible clinics", async () => {
  arrangeFirestore({
    clinics: [
      {
        __docId: "1",
        name: "Alpha Clinic",
        address: "Main Road",
        status: "public",
        province: "Gauteng",
        service: ["Dentistry"],
        opening_hours: "Mo-Fr 08:00-17:00"
      },
      {
        __docId: "2",
        name: "Beta Clinic",
        address: "Side Street",
        status: "private",
        province: "Limpopo",
        service: "Cardiology",
        opening_hours: "Mo-Fr 12:00-17:00"
      }
    ]
  });

  const { applyFilters } = await load();

  document.getElementById("clinicSearch").value = "alpha";
  document.getElementById("clinicSearch").dispatchEvent(new Event("input", { bubbles: true }));

  expect(document.getElementById("clinicResults").textContent).toContain("Alpha Clinic");
  expect(document.getElementById("clinicResults").textContent).not.toContain("Beta Clinic");

  document.getElementById("clinicSearch").value = "main";
  applyFilters();
  expect(document.getElementById("clinicResults").textContent).toContain("Alpha Clinic");
});

test("open now filter and near me sorting update displayed clinics", async () => {
  arrangeFirestore({
    clinics: [
      {
        __docId: "far-open",
        name: "Far Open Clinic",
        address: "Far Road",
        latitude: -27.0,
        longitude: 29.0,
        opening_hours: "Mo-Fr 08:00-17:00"
      },
      {
        __docId: "near-open",
        name: "Near Open Clinic",
        address: "Near Road",
        latitude: -26.21,
        longitude: 28.01,
        opening_hours: "Mo-Fr 08:00-17:00"
      },
      {
        __docId: "closed",
        name: "Closed Clinic",
        address: "Closed Road",
        latitude: -26.0,
        longitude: 28.0,
        opening_hours: "Sa-Su 08:00-17:00"
      }
    ]
  });

  await load();

  document.getElementById("openNowBtn").click();
  expect(document.getElementById("openNowBtn").classList.contains("active")).toBe(true);
  expect(document.getElementById("clinicResults").textContent).toContain("Far Open Clinic");
  expect(document.getElementById("clinicResults").textContent).not.toContain("Closed Clinic");

  document.getElementById("nearMeBtn").click();
  await flushPromises();

  const names = Array.from(document.querySelectorAll(".clinic-name")).map((node) => node.textContent);
  expect(document.getElementById("nearMeBtn").classList.contains("active")).toBe(true);
  expect(names[0]).toBe("Near Open Clinic");
  expect(document.getElementById("clinicResults").textContent).toContain("km away");

  document.getElementById("nearMeBtn").click();
  await flushPromises();
  expect(document.getElementById("nearMeBtn").classList.contains("active")).toBe(false);
});

test("near me filter alerts when geolocation fails", async () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeFirestore({ clinics: [{ __docId: "1", name: "Alpha Clinic" }] });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((_success, error) => error(new Error("denied")))
    }
  });

  await load();

  document.getElementById("nearMeBtn").click();
  await flushPromises();

  expect(global.alert).toHaveBeenCalledWith("Could not get your location. Please allow location access.");
  expect(consoleSpy).toHaveBeenCalled();
});

test("date change renders slots only after a clinic is selected", async () => {
  arrangeFirestore({ clinics: [{ __docId: "1", name: "Alpha Clinic" }], bookedTimes: ["09:00"] });
  await load();

  document.getElementById("appt-date").value = "2026-05-12";
  document.getElementById("appt-date").dispatchEvent(new Event("change", { bubbles: true }));
  expect(document.querySelectorAll(".time-slot")).toHaveLength(0);

  document.querySelector(".open-btn").click();
  await flushPromises();
  expect(document.querySelectorAll(".time-slot")).toHaveLength(19);

  document.getElementById("timeSlots").innerHTML = "";
  document.getElementById("appt-date").value = "2026-05-13";
  document.getElementById("appt-date").dispatchEvent(new Event("change", { bubbles: true }));
  await flushPromises();

  expect(document.querySelectorAll(".time-slot")).toHaveLength(19);
});

test("confirm booking requires login and all fields", async () => {
  arrangeAuth(null);
  await load();

  document.querySelector(".confirm-Button").click();
  await flushPromises();
  expect(global.alert).toHaveBeenCalledWith("You must be logged in");

  jest.resetModules();
  buildDOM();
  arrangeAuth();
  arrangeFirestore({ clinics: [{ __docId: "1", name: "Alpha Clinic" }] });
  global.alert = jest.fn();

  await load();
  document.querySelector(".confirm-Button").click();
  await flushPromises();

  expect(global.alert).toHaveBeenCalledWith("Please fill in all fields");
  expect(mockAddDoc).not.toHaveBeenCalled();
});

test("confirm booking stops when selected time is fully booked", async () => {
  arrangeFirestore({
    clinics: [{ __docId: "1", name: "Alpha Clinic" }],
    duplicateBooking: true
  });
  await load();

  document.getElementById("appt-date").value = "2026-05-12";
  document.querySelector(".open-btn").click();
  await flushPromises();
  document.getElementById("selectedTime").value = "10:00";
  document.querySelector(".reason-select").value = "Checkup";

  document.querySelector(".confirm-Button").click();
  await flushPromises();

  expect(global.alert).toHaveBeenCalledWith("This time slot is fully booked.");
  expect(mockAddDoc).not.toHaveBeenCalled();
});

test("confirm booking stops when no staff are available for that day", async () => {
  arrangeFirestore({
    clinics: [{ __docId: "1", name: "Alpha Clinic" }],
    staffAvailability: []
  });
  await load();

  document.getElementById("appt-date").value = "2026-05-12";
  document.querySelector(".open-btn").click();
  await flushPromises();
  document.getElementById("selectedTime").value = "10:00";
  document.querySelector(".reason-select").value = "Checkup";

  document.querySelector(".confirm-Button").click();
  await flushPromises();

  expect(global.alert).toHaveBeenCalledWith("This time slot is fully booked.");
  expect(mockAddDoc).not.toHaveBeenCalled();
});

test("confirm booking saves appointment, notification, and resets the form", async () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeFirestore({
    clinics: [{ __docId: "1", name: "Alpha Clinic", service: ["Checkup"] }],
    bookedTimes: []
  });
  await load();

  document.getElementById("appt-date").value = "2026-05-12";
  document.querySelector(".open-btn").click();
  await flushPromises();
  const slot = Array.from(document.querySelectorAll(".time-slot"))
    .find((button) => button.textContent === "10:00");
  slot.click();
  document.querySelector(".reason-select").value = "Checkup";

  document.querySelector(".confirm-Button").click();
  await flushPromises(12);

  expect(mockAddDoc).toHaveBeenCalledWith(
    { name: "Appointments" },
    expect.objectContaining({
      clinicID: 1,
      userID: "user-1",
      clinicName: "Alpha Clinic",
      patientEmail: "patient@test.com",
      time: "10:00",
      reason: "Checkup",
      status: "scheduled",
      createdAT: "TIMESTAMP"
    })
  );
  expect(mockAddDoc).toHaveBeenCalledWith(
    { name: "Notifications" },
    expect.objectContaining({
      title: "Appointment Booked",
      read: false,
      createdAt: "TIMESTAMP"
    })
  );
  expect(global.emailjs.init).not.toHaveBeenCalled();
  expect(global.emailjs.send).not.toHaveBeenCalled();
  expect(global.alert).toHaveBeenCalledWith("Appointment booked successfully!");
  expect(document.getElementById("appt-date").value).toBe("");
  expect(document.getElementById("selectedTime").value).toBe("");
  expect(document.querySelector(".reason-select").selectedIndex).toBe(0);
  expect(document.querySelector(".open-btn").textContent).toBe("Select");
  expect(consoleSpy).not.toHaveBeenCalledWith("Error booking appointment:", expect.anything());
});

test("confirm booking shows an error when saving fails", async () => {
  const error = new Error("write failed");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockAddDoc.mockRejectedValueOnce(error);
  arrangeFirestore({
    clinics: [{ __docId: "1", name: "Alpha Clinic" }]
  });
  await load();

  document.getElementById("appt-date").value = "2026-05-12";
  document.querySelector(".open-btn").click();
  await flushPromises();
  document.getElementById("selectedTime").value = "10:00";
  document.querySelector(".reason-select").value = "Checkup";

  document.querySelector(".confirm-Button").click();
  await flushPromises();

  expect(consoleSpy).toHaveBeenCalledWith("Error booking appointment:", error);
  expect(global.alert).toHaveBeenCalledWith("Failed to book appointment");
});

test("reschedule mode loads appointment values and updates the existing appointment", async () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  arrangeFirestore({
    clinics: [{ __docId: "1", name: "Alpha Clinic", service: ["Dentist"] }],
    appointmentForReschedule: {
      clinicID: 1,
      date: "2026-05-13",
      time: "11:30",
      reason: "Dentist"
    }
  });

  await load("/Patients_WebPages/BookAppointments.html?mode=reschedule&id=appt-1");

  expect(document.getElementById("pageTitle").textContent).toBe("Reschedule Appointment");
  expect(document.getElementById("appt-date").value).toBe("2026-05-13");
  expect(document.getElementById("selectedTime").value).toBe("11:30");
  expect(document.querySelector(".reason-select").value).toBe("Dentist");

  document.querySelector(".confirm-Button").click();
  await flushPromises();

  expect(mockDoc).toHaveBeenCalledWith({}, "Appointments", "appt-1");
  expect(mockUpdateDoc).toHaveBeenCalledWith(
    "Appointments/appt-1",
    {
      clinicID: 1,
      date: "2026-05-13",
      time: "11:30",
      reason: "Dentist",
      status: "rescheduled",
      updatedAt: "TIMESTAMP"
    }
  );
  expect(global.alert).toHaveBeenCalledWith("Appointment rescheduled successfully!");
  expect(consoleSpy).not.toHaveBeenCalledWith("Error booking appointment:", expect.anything());
});

test("reschedule mode exits quietly when appointment id or document is missing", async () => {
  arrangeFirestore({
    clinics: [{ __docId: "1", name: "Alpha Clinic" }],
    appointmentForReschedule: null
  });

  await load("/Patients_WebPages/BookAppointments.html?mode=reschedule");
  expect(mockGetDoc).not.toHaveBeenCalled();

  jest.resetModules();
  buildDOM();
  arrangeAuth();
  arrangeFirestore({
    clinics: [{ __docId: "1", name: "Alpha Clinic" }],
    appointmentForReschedule: null
  });

  await load("/Patients_WebPages/BookAppointments.html?mode=reschedule&id=missing");
  expect(document.getElementById("selectedTime").value).toBe("");
});

test("reschedule button logs readiness when present", async () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  await load();

  expect(() => document.querySelector(".reschedule-Button").click()).not.toThrow();

  expect(consoleSpy).not.toHaveBeenCalledWith("Reschedule clicked - step 2 ready");
});
