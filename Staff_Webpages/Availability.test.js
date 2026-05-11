beforeEach(() => {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ];

  document.body.innerHTML = `
    <div id="saveStatus"></div>
    <div class="week-card-header"></div>

    ${days.map(day => `
      <div id="row-${day}"></div>
      <input type="checkbox" id="toggle-${day}" />
      <input id="start-${day}" value="08:00" />
      <input id="end-${day}" value="17:00" />
    `).join("")}

    <button id="saveBtn"></button>

    <div id="staffName"></div>
    <div id="staffEmail"></div>
    <div id="staffAvatar"></div>
    <div class="name-Surname"></div>
  `;
});

test("convertTo24Hour converts AM correctly", async () => {
  const { convertTo24Hour } = await import("./Availability.js");

  expect(convertTo24Hour("7", "am")).toBe("07:00");
  expect(convertTo24Hour("12", "am")).toBe("00:00");
});

test("convertTo24Hour converts PM correctly", async () => {
  const { convertTo24Hour } = await import("./Availability.js");

  expect(convertTo24Hour("5", "pm")).toBe("17:00");
  expect(convertTo24Hour("12", "pm")).toBe("12:00");
});

test("parseClinicHours parses clinic hours", async () => {
  const { parseClinicHours } = await import("./Availability.js");

  const result = parseClinicHours("Mon-Fri: 7am-5pm");

  expect(result.openTime).toBe("07:00");
  expect(result.closeTime).toBe("17:00");
  expect(result.workDays).toContain("monday");
  expect(result.workDays).toContain("friday");
});

test("parseClinicHours returns null for invalid format", async () => {
  const { parseClinicHours } = await import("./Availability.js");

  const result = parseClinicHours("INVALID");

  expect(result).toBeNull();
});

test("capitalise capitalises first letter", async () => {
  const { capitalise } = await import("./Availability.js");

  expect(capitalise("monday")).toBe("Monday");
});

test("showStatus updates status element", async () => {
  const { showStatus } = await import("./Availability.js");

  showStatus("Saved successfully", "success");

  expect(document.getElementById("saveStatus").textContent)
    .toContain("Saved successfully");
});

test("readScheduleFromPage reads schedule", async () => {
  const { readScheduleFromPage } = await import("./Availability.js");

  document.getElementById("toggle-monday").checked = true;

  const result = readScheduleFromPage();

  expect(result.monday.isWorking).toBe(true);
  expect(result.monday.start).toBe("08:00");
});

test("applyScheduleToPage applies values", async () => {
  const { applyScheduleToPage } = await import("./Availability.js");

  applyScheduleToPage({
    monday: {
      isWorking: true,
      start: "09:00",
      end: "15:00"
    }
  });

  expect(document.getElementById("start-monday").value)
    .toBe("09:00");

  expect(document.getElementById("end-monday").value)
    .toBe("15:00");
});