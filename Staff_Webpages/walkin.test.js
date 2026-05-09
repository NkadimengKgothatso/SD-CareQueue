beforeEach(() => {
  document.body.innerHTML = `
    <table>
      <tbody id="walkinTable"></tbody>
    </table>

    <button class="add-btn"></button>
    <input id="nameInput" />
    <select id="reasonInput">
      <option value="">Select reason</option>
      <option value="Checkup">Checkup</option>
    </select>

    <div class="name-Surname"></div>
    <div class="clinic-name"></div>
    <div id="staffEmail"></div>
    <div id="staffAvatar"></div>
    <div id="staffName"></div>
  `;

  global.alert = jest.fn();

  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

test("getToday returns YYYY-MM-DD format", async () => {
  const { getToday } = await import("./Walkins.js");

  expect(getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("timeToMinutes converts time correctly", async () => {
  const { timeToMinutes } = await import("./Walkins.js");

  expect(timeToMinutes("08:00")).toBe(480);
  expect(timeToMinutes("08:30")).toBe(510);
  expect(timeToMinutes("17:00")).toBe(1020);
});

test("minutesToTime converts minutes correctly", async () => {
  const { minutesToTime } = await import("./Walkins.js");

  expect(minutesToTime(480)).toBe("08:00");
  expect(minutesToTime(510)).toBe("08:30");
  expect(minutesToTime(1020)).toBe("17:00");
});

test("roundToNextSlot rounds up correctly", async () => {
  const { roundToNextSlot } = await import("./Walkins.js");

  expect(roundToNextSlot(481, 30)).toBe(510);
  expect(roundToNextSlot(510, 30)).toBe(510);
});

test("isTaken returns true when slot overlaps appointment", async () => {
  const { isTaken } = await import("./Walkins.js");

  const appointments = [{ time: "08:00" }];

  expect(isTaken(480, appointments, 30)).toBe(true);
  expect(isTaken(500, appointments, 30)).toBe(true);
});

test("isTaken returns false when slot is free", async () => {
  const { isTaken } = await import("./Walkins.js");

  const appointments = [{ time: "08:00" }];

  expect(isTaken(510, appointments, 30)).toBe(false);
});

test("getNextAvailableTime skips booked slot", async () => {
  const { getNextAvailableTime } = await import("./Walkins.js");

  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-05-09T08:00:00"));

  const result = getNextAvailableTime([
    { time: "08:00", status: "waiting" }
  ]);

  expect(result).toBe("08:30");

  jest.useRealTimers();
});

test("showConfirmModal resolves true when OK is clicked", async () => {
  const { showConfirmModal } = await import("./Walkins.js");

  const promise = showConfirmModal("Add patient?");
  document.getElementById("okBtn").click();

  await expect(promise).resolves.toBe(true);
});

test("showConfirmModal resolves false when cancel is clicked", async () => {
  const { showConfirmModal } = await import("./Walkins.js");

  const promise = showConfirmModal("Add patient?");
  document.getElementById("cancelBtn").click();

  await expect(promise).resolves.toBe(false);
});