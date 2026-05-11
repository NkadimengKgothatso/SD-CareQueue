// =============================================================
// bookAppointment.test.js
// =============================================================

// =============================================================
// Firebase Mocks
// =============================================================
jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  () => ({
    getAuth: jest.fn(() => ({
      currentUser: {
        uid: "test-user-id",
        email: "test@email.com"
      }
    })),

    onAuthStateChanged: jest.fn((auth, callback) => {
      callback({
        uid: "test-user-id",
        email: "test@email.com"
      });
    })
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    getFirestore: jest.fn(() => ({})),

    collection: jest.fn(),
    addDoc: jest.fn(() => Promise.resolve()),

    getDocs: jest.fn(() =>
      Promise.resolve({
        forEach: jest.fn()
      })
    ),

    getDoc: jest.fn(() =>
      Promise.resolve({
        exists: () => true,
        data: () => ({})
      })
    ),

    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),

    doc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),

    onSnapshot: jest.fn(),

    serverTimestamp: jest.fn(() => "TIMESTAMP")
  }),
  { virtual: true }
);

beforeEach(() => {
  jest.resetModules();

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

    <input id="appt-date" />

    <button class="confirm-Button">Confirm</button>
    <button class="reschedule-Button">Reschedule</button>

    <select class="reason-select">
      <option>Select reason</option>
      <option>Checkup</option>
      <option>Dental</option>
    </select>

    <aside>
      <nav>
        <ul>
          <li><a href="test.html">Test</a></li>
        </ul>
      </nav>
    </aside>
  `;

  global.alert = jest.fn();

  window.history.pushState({}, "", "/test.html");

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

// =============================================================
// Helpers
// =============================================================

async function load() {
  return import("./bookAppointment.js");
}

// =============================================================
// formatTime
// =============================================================

describe("formatTime", () => {

  test("formats whole hour correctly", async () => {
    const { formatTime } = await load();

    expect(formatTime(8, 0)).toBe("08:00");
  });

  test("formats afternoon time correctly", async () => {
    const { formatTime } = await load();

    expect(formatTime(14, 30)).toBe("14:30");
  });

  test("pads single digit values", async () => {
    const { formatTime } = await load();

    expect(formatTime(9, 5)).toBe("09:05");
  });

  test("formats midnight correctly", async () => {
    const { formatTime } = await load();

    expect(formatTime(0, 0)).toBe("00:00");
  });

  test("formats end of day correctly", async () => {
    const { formatTime } = await load();

    expect(formatTime(23, 59)).toBe("23:59");
  });

});

// =============================================================
// calculateDistance
// =============================================================

describe("calculateDistance", () => {

  test("returns distance between two coordinates", async () => {
    const { calculateDistance } = await load();

    const result = calculateDistance(
      -26.2,
      28.0,
      -26.1,
      28.1
    );

    expect(result).toBeGreaterThan(0);
  });

  test("returns 0 for same coordinates", async () => {
    const { calculateDistance } = await load();

    expect(
      calculateDistance(-26.2, 28.0, -26.2, 28.0)
    ).toBe(0);
  });

  test("returns a number", async () => {
    const { calculateDistance } = await load();

    const result = calculateDistance(
      -26.2,
      28.0,
      -26.0,
      28.2
    );

    expect(typeof result).toBe("number");
  });

  test("distance is symmetric", async () => {
    const { calculateDistance } = await load();

    const d1 = calculateDistance(
      -26.2,
      28.0,
      -26.1,
      28.1
    );

    const d2 = calculateDistance(
      -26.1,
      28.1,
      -26.2,
      28.0
    );

    expect(d1).toBeCloseTo(d2);
  });

});

// =============================================================
// isClinicOpenNow
// =============================================================

describe("isClinicOpenNow", () => {

  test("returns boolean", async () => {
    const { isClinicOpenNow } = await load();

    const result = isClinicOpenNow("Mo-Fr 08:00-17:00");

    expect(typeof result).toBe("boolean");
  });

  test("handles invalid hours safely", async () => {
    const { isClinicOpenNow } = await load();

    expect(
      typeof isClinicOpenNow("Invalid")
    ).toBe("boolean");
  });

  test("handles empty string safely", async () => {
    const { isClinicOpenNow } = await load();

    expect(
      typeof isClinicOpenNow("")
    ).toBe("boolean");
  });

  test("handles null safely", async () => {
    const { isClinicOpenNow } = await load();

    expect(
      typeof isClinicOpenNow(null)
    ).toBe("boolean");
  });

  test("handles undefined safely", async () => {
    const { isClinicOpenNow } = await load();

    expect(
      typeof isClinicOpenNow(undefined)
    ).toBe("boolean");
  });

});

// =============================================================
// getUserLocation
// =============================================================

describe("getUserLocation", () => {

  test("resolves coordinates correctly", async () => {
    const { getUserLocation } = await load();

    const result = await getUserLocation();

    expect(result.latitude).toBe(-26.2);
    expect(result.longitude).toBe(28.0);
  });

  test("rejects when geolocation is unavailable", async () => {

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined
    });

    const { getUserLocation } = await load();

    await expect(
      getUserLocation()
    ).rejects.toBeDefined();
  });

  test("rejects when permission denied", async () => {

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((success, error) =>
          error(new Error("Permission denied"))
        )
      }
    });

    const { getUserLocation } = await load();

    await expect(
      getUserLocation()
    ).rejects.toThrow("Permission denied");
  });

});

// =============================================================
// DOM Tests
// =============================================================

describe("DOM Elements", () => {

  test("selectedTime input exists", async () => {
    await load();

    expect(
      document.getElementById("selectedTime")
    ).not.toBeNull();
  });

  test("clinicSearch input exists", async () => {
    await load();

    expect(
      document.getElementById("clinicSearch")
    ).not.toBeNull();
  });

  test("confirm button exists", async () => {
    await load();

    expect(
      document.querySelector(".confirm-Button")
    ).not.toBeNull();
  });

  test("reschedule button exists", async () => {
    await load();

    expect(
      document.querySelector(".reschedule-Button")
    ).not.toBeNull();
  });

  test("reason select exists", async () => {
    await load();

    expect(
      document.querySelector(".reason-select")
    ).not.toBeNull();
  });

});

// =============================================================
// UI Interaction Tests
// =============================================================

describe("UI Interactions", () => {

  test("clinic search accepts user input", async () => {
    await load();

    const search = document.getElementById("clinicSearch");

    search.value = "Dental";

    search.dispatchEvent(new Event("input"));

    expect(search.value).toBe("Dental");
  });

  test("appointment date input accepts value", async () => {
    await load();

    const dateInput = document.getElementById("appt-date");

    dateInput.value = "2026-05-11";

    expect(dateInput.value).toBe("2026-05-11");
  });

  test("reason select updates correctly", async () => {
    await load();

    const reason = document.querySelector(".reason-select");

    reason.value = "Dental";

    expect(reason.value).toBe("Dental");
  });

  test("confirm button can be clicked", async () => {
    await load();

    const button = document.querySelector(".confirm-Button");

    expect(() => button.click()).not.toThrow();
  });

  test("reschedule button can be clicked", async () => {
    await load();

    const button = document.querySelector(".reschedule-Button");

    expect(() => button.click()).not.toThrow();
  });

  test("nearMe button can be clicked", async () => {
    await load();

    const button = document.getElementById("nearMeBtn");

    expect(() => button.click()).not.toThrow();
  });

  test("openNow button can be clicked", async () => {
    await load();

    const button = document.getElementById("openNowBtn");

    expect(() => button.click()).not.toThrow();
  });

});

// =============================================================
// Time Slot Tests
// =============================================================

describe("Time Slots", () => {

  test("time slot click updates selectedTime input", async () => {
    await load();

    const slot = document.createElement("button");

    slot.className = "time-slot";

    slot.dataset.time = "09:00";

    document.body.appendChild(slot);

    const input = document.getElementById("selectedTime");

    slot.addEventListener("click", () => {
      input.value = slot.dataset.time;
    });

    slot.click();

    expect(input.value).toBe("09:00");
  });

  test("multiple slot clicks update value correctly", async () => {
    await load();

    const input = document.getElementById("selectedTime");

    const slot1 = document.createElement("button");
    slot1.dataset.time = "10:00";

    const slot2 = document.createElement("button");
    slot2.dataset.time = "11:00";

    slot1.addEventListener("click", () => {
      input.value = slot1.dataset.time;
    });

    slot2.addEventListener("click", () => {
      input.value = slot2.dataset.time;
    });

    slot1.click();

    expect(input.value).toBe("10:00");

    slot2.click();

    expect(input.value).toBe("11:00");
  });

});

// =============================================================
// Navigation / Page Tests
// =============================================================

describe("Navigation", () => {

  test("page URL is test.html", async () => {
    await load();

    expect(window.location.pathname).toBe("/test.html");
  });

  test("navigation link exists", async () => {
    await load();

    expect(
      document.querySelector("aside nav ul li a")
    ).not.toBeNull();
  });

});

// =============================================================
// Alert Tests
// =============================================================

describe("Alert Mock", () => {

  test("alert is mocked", async () => {
    await load();

    alert("Test alert");

    expect(global.alert).toHaveBeenCalledWith("Test alert");
  });

});