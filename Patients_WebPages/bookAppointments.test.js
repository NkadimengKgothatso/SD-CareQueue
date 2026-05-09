beforeEach(() => {
  document.body.innerHTML = `
    <section id="pageTitle"></section>
    <section id="timeSlots"></section>
    <input id="selectedTime" />

    <button id="nearMeBtn"></button>
    <button id="openNowBtn"></button>

    <input id="clinicSearch" />
    <section id="clinicResults"></section>

    <section id="userName"></section>
    <section id="userEmail"></section>

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

test("formatTime formats correctly", async () => {
  const { formatTime } = await import("./bookAppointment.js");

  expect(formatTime(8, 0)).toBe("08:00");
  expect(formatTime(14, 30)).toBe("14:30");
});

test("calculateDistance returns distance", async () => {
  const { calculateDistance } = await import("./bookAppointment.js");

  const result = calculateDistance(-26.2, 28.0, -26.1, 28.1);

  expect(result).toBeGreaterThan(0);
});

test("isClinicOpenNow returns boolean", async () => {
  const { isClinicOpenNow } = await import("./bookAppointment.js");

  const result = isClinicOpenNow("Mo-Fr 08:00-17:00");

  expect(typeof result).toBe("boolean");
});

test("displayClinics renders clinic cards", async () => {
  const { displayClinics } = await import("./bookAppointment.js");

  displayClinics([
    {
      id: "1",
      name: "Care Clinic",
      distance: 2.5
    }
  ]);

  expect(document.body.textContent).toContain("Care Clinic");
});

test("getUserLocation resolves coordinates", async () => {
  const { getUserLocation } = await import("./bookAppointment.js");

  const result = await getUserLocation();

  expect(result.latitude).toBe(-26.2);
  expect(result.longitude).toBe(28.0);
});