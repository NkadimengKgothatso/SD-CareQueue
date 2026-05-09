beforeEach(() => {
  document.body.innerHTML = `
    <div class="name-Surname"></div>
    <ul id="appointmentList"></ul>

    <button class="filter-btn active" data-filter="all"></button>
    <button class="filter-btn" data-filter="today"></button>
    <button class="filter-btn" data-filter="tomorrow"></button>
    <button class="filter-btn" data-filter="walkin"></button>

    <div id="stat-total"></div>
    <div id="stat-today"></div>
    <div id="stat-tomorrow"></div>
    <div id="stat-walkin"></div>

    <div id="staffEmail"></div>
    <div id="staffAvatar"></div>
    <div id="staffName"></div>
  `;

  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

test("getTodayString returns YYYY-MM-DD format", async () => {
  const { getTodayString } = await import("./Appointments.js");

  expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("getTomorrowString returns YYYY-MM-DD format", async () => {
  const { getTomorrowString } = await import("./Appointments.js");

  expect(getTomorrowString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("minutesToTime converts minutes to HH:MM", async () => {
  const { minutesToTime } = await import("./Appointments.js");

  expect(minutesToTime(480)).toBe("08:00");
  expect(minutesToTime(510)).toBe("08:30");
  expect(minutesToTime(1020)).toBe("17:00");
});

test("getAllSlots returns appointment slots", async () => {
  const { getAllSlots } = await import("./Appointments.js");

  const slots = getAllSlots();

  expect(slots[0]).toBe("08:00");
  expect(slots).toContain("16:30");
  expect(slots).not.toContain("17:00");
});

test("renderEmptyState displays empty appointment message", async () => {
  jest.resetModules();

  document.body.innerHTML = `
    <ul id="appointmentList"></ul>
    <div class="name-Surname"></div>
  `;

  const { renderEmptyState } = await import("./Appointments.js");

  renderEmptyState();

  expect(document.body.textContent).toContain("No upcoming appointments");
});

test("buildCard creates appointment card", async () => {
  const { buildCard } = await import("./Appointments.js");

  const card = buildCard({
    id: "appt1",
    patientName: "Test Patient",
    date: "2026-05-09",
    time: "08:00",
    status: "scheduled",
    reason: "Checkup",
    isWalkIn: true
  });

  expect(card.dataset.id).toBe("appt1");
  expect(card.textContent).toContain("Test Patient");
  expect(card.textContent).toContain("Walk-in");
  expect(card.textContent).toContain("Scheduled");
  expect(card.textContent).toContain("Checkup");
});

test("buildCard marks completed appointment as done", async () => {
  const { buildCard } = await import("./Appointments.js");

  const card = buildCard({
    id: "appt2",
    patientName: "Done Patient",
    status: "completed"
  });

  expect(card.classList.contains("done-card")).toBe(true);
  expect(card.textContent).toContain("Completed");
});

test("showConfirmModal resolves true when confirm is clicked", async () => {
  const { showConfirmModal } = await import("./Appointments.js");

  const promise = showConfirmModal("Are you sure?");
  document.getElementById("confirmOkBtn").click();

  await expect(promise).resolves.toBe(true);
});

test("showConfirmModal resolves false when cancel is clicked", async () => {
  const { showConfirmModal } = await import("./Appointments.js");

  const promise = showConfirmModal("Are you sure?");
  document.getElementById("confirmCancelBtn").click();

  await expect(promise).resolves.toBe(false);
});