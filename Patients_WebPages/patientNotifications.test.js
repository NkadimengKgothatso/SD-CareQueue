beforeEach(() => {
  document.body.innerHTML = `
    <div id="userName"></div>
    <div id="userEmail"></div>

    <div id="notifList"></div>
    <div id="toast"></div>

    <div id="count-all"></div>
    <div id="count-unread"></div>

    <div id="filters">
      <button class="filter-btn active" data-filter="all"></button>
      <button class="filter-btn" data-filter="unread"></button>
      <button class="filter-btn" data-filter="appointment"></button>
      <button class="filter-btn" data-filter="queue"></button>
    </div>

    <button id="markAllBtn"></button>
    <button id="clearBtn"></button>
  `;

  global.alert = jest.fn();
  global.confirm = jest.fn(() => true);
});

test("getIcon returns correct icons", async () => {
  const { getIcon } = await import("./patientNotifications.js");

  expect(getIcon("appointment")).toBe("📅");
  expect(getIcon("queue")).toBe("⏱");
  expect(getIcon("reminder")).toBe("🔔");
  expect(getIcon("alert")).toBe("⚠");
  expect(getIcon("other")).toBe("🔔");
});

test("formatTime returns Just now for missing timestamp", async () => {
  const { formatTime } = await import("./patientNotifications.js");

  expect(formatTime(null)).toBe("Just now");
});

test("formatTime formats Firebase-like timestamp", async () => {
  const { formatTime } = await import("./patientNotifications.js");

  const timestamp = {
    toDate: () => new Date("2026-05-09T10:30:00")
  };

  expect(formatTime(timestamp)).toContain("2026");
});