beforeEach(() => {
  document.body.innerHTML = `
    <ul id="upcoming"></ul>

    <div class="name-Surname"></div>

    <div id="stat-total"></div>
    <div id="stat-inqueue"></div>
    <div id="stat-completed"></div>
    <div id="stat-avgwait"></div>

    <div id="staffEmail"></div>
    <div id="staffAvatar"></div>
    <div id="staffName"></div>
  `;

  global.alert = jest.fn();
});

test("getTodayString returns YYYY-MM-DD", async () => {
  const { getTodayString } = await import("./Queues.js");

  expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("renderEmptyState displays queue empty message", async () => {
  jest.resetModules();

  document.body.innerHTML = `
    <ul id="upcoming"></ul>
    <div class="name-Surname"></div>
  `;

  const { renderEmptyState } = await import("./Queues.js");

  renderEmptyState();

  expect(document.body.textContent)
    .toContain("No patients in queue for today");
});

test("buildCard creates waiting patient card", async () => {
  const { buildCard } = await import("./Queues.js");

  const card = buildCard({
    id: "appt1",
    patientName: "John Doe",
    time: "08:00",
    status: "waiting",
    reason: "Checkup",
    isWalkIn: true
  }, 1);

  expect(card.dataset.appointmentId).toBe("appt1");
  expect(card.textContent).toContain("John Doe");
  expect(card.textContent).toContain("Waiting");
  expect(card.textContent).toContain("Walk-in");
  expect(card.textContent).toContain("Checkup");
});

test("buildCard creates completed patient card", async () => {
  const { buildCard } = await import("./Queues.js");

  const card = buildCard({
    id: "appt2",
    patientName: "Jane Doe",
    status: "completed"
  }, "—");

  expect(card.classList.contains("done-card"))
    .toBe(true);

  expect(card.textContent)
    .toContain("Completed");
});

test("updateStats updates dashboard counts", async () => {
  const module = await import("./Queues.js");

  module.queueData = [
    { status: "waiting" },
    { status: "in consultation" },
    { status: "completed" }
  ];

  module.updateStats();

  expect(document.getElementById("stat-total").textContent)
    .toBe("3");

  expect(document.getElementById("stat-inqueue").textContent)
    .toBe("2");

  expect(document.getElementById("stat-completed").textContent)
    .toBe("1");
});