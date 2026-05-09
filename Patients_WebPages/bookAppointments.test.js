global.alert = jest.fn();

window.history.pushState({}, "", "/test.html");

Object.defineProperty(global.navigator, "geolocation", {
  value: {
    getCurrentPosition: jest.fn((success) =>
      success({
        coords: {
          latitude: -26.2,
          longitude: 28.0
        }
      })
    )
  },
  configurable: true
});

beforeEach(() => {
  document.body.innerHTML = `
    <div id="pageTitle"></div>

    <div id="timeSlots"></div>
    <input id="selectedTime" />

    <button id="nearMeBtn"></button>
    <button id="openNowBtn"></button>

    <input id="clinicSearch" />
    <div id="clinicResults"></div>

    <div id="userName"></div>
    <div id="userEmail"></div>

    <input id="appt-date" />

    <button class="confirm-Button"></button>
    <button class="reschedule-Button"></button>

    <select class="reason-select">
      <option>Select reason</option>
      <option>Checkup</option>
    </select>

    <aside>
      <nav>
        <ul>
          <li><a href="test.html"></a></li>
        </ul>
      </nav>
    </aside>
  `;

  global.alert = jest.fn();

  window.history.pushState({}, "", "/test.html");

  global.navigator.geolocation = {
    getCurrentPosition: jest.fn((success) =>
      success({
        coords: {
          latitude: -26.2,
          longitude: 28.0
        }
      })
    )
  };
});

test("formatTime formats correctly", async () => {
  const { formatTime } = await import("./BookAppointments.js");

  expect(formatTime(8, 0)).toBe("08:00");
  expect(formatTime(14, 30)).toBe("14:30");
});

test("calculateDistance returns distance", async () => {
  const { calculateDistance } = await import("./BookAppointments.js");

  const result = calculateDistance(
    -26.2,
    28.0,
    -26.1,
    28.1
  );

  expect(result).toBeGreaterThan(0);
});

test("isClinicOpenNow returns boolean", async () => {
  const { isClinicOpenNow } = await import("./BookAppointments.js");

  const result = isClinicOpenNow("Mo-Fr 08:00-17:00");

  expect(typeof result).toBe("boolean");
});

test("displayClinics renders clinic cards", async () => {
  const { displayClinics } = await import("./BookAppointments.js");

  displayClinics([
    {
      id: "1",
      name: "Care Clinic",
      distance: 2.5
    }
  ]);

  expect(document.body.textContent)
    .toContain("Care Clinic");
});

test("getUserLocation resolves coordinates", async () => {
  const { getUserLocation } = await import("./BookAppointments.js");

  const result = await getUserLocation();

  expect(result.latitude).toBe(-26.2);
  expect(result.longitude).toBe(28.0);
});