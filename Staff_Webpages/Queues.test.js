beforeEach(() => {
  document.body.innerHTML = `
    <ul id="upcoming"></ul>

    <div id="stat-total"></div>
    <div id="stat-inqueue"></div>
    <div id="stat-completed"></div>
    <div id="stat-avgwait"></div>

    <div class="name-Surname"></div>

    <div id="staffName"></div>
    <div id="staffEmail"></div>
    <div id="staffAvatar"></div>
  `;

  global.alert = jest.fn();
});

test("getTodayString returns YYYY-MM-DD", async () => {
  const { getTodayString } = await import("./Queues.js");

  expect(getTodayString()).toMatch(/\d{4}-\d{2}-\d{2}/);
});


test("buildCard creates waiting patient card", async () => {
  const { buildCard } = await import("./Queues.js");

  const card = buildCard({
    id: "1",
    patientName: "John Doe",
    time: "08:00",
    status: "waiting",
    reason: "Checkup",
    isWalkIn: true
  }, 1);

  expect(card.textContent).toContain("John Doe");
  expect(card.textContent).toContain("Waiting");
  expect(card.textContent).toContain("Walk-in");
  expect(card.textContent).toContain("Checkup");
});

test("buildCard creates completed patient card", async () => {
  const { buildCard } = await import("./Queues.js");

  const card = buildCard({
    id: "2",
    patientName: "Jane Doe",
    time: "09:00",
    status: "completed",
    reason: "Follow-up"
  }, "—");

  expect(card.textContent).toContain("Jane Doe");
  expect(card.textContent).toContain("Completed");
  expect(card.classList.contains("done-card")).toBe(true);
});

test("updateStats updates dashboard counts", async () => {
  const module = await import("./Queues.js");

  module.__setQueueDataForTest([
    { status: "waiting" },
    { status: "in consultation" },
    { status: "completed" }
  ]);

  module.updateStats();

  expect(document.getElementById("stat-total").textContent)
    .toBe("3");

  expect(document.getElementById("stat-inqueue").textContent)
    .toBe("2");

  expect(document.getElementById("stat-completed").textContent)
    .toBe("1");
});