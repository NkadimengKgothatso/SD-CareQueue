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

test("render shows empty state when no notifications match", async () => {
  jest.resetModules();

  document.body.innerHTML = `
    <div id="userName"></div>
    <div id="userEmail"></div>
    <div id="notifList"></div>
    <div id="toast"></div>
    <div id="count-all"></div>
    <div id="count-unread"></div>
    <div id="filters"></div>
    <button id="markAllBtn"></button>
    <button id="clearBtn"></button>
  `;

  const module = await import("./patientNotifications.js");

  module.__setNotificationsForTest([]);
  module.__setCurrentFilterForTest("all");
  module.render();

  expect(document.body.textContent).toContain("caught up");
});

test("render displays notification card", async () => {
  jest.resetModules();

  document.body.innerHTML = `
    <div id="userName"></div>
    <div id="userEmail"></div>
    <div id="notifList"></div>
    <div id="toast"></div>
    <div id="count-all"></div>
    <div id="count-unread"></div>
    <div id="filters"></div>
    <button id="markAllBtn"></button>
    <button id="clearBtn"></button>
  `;

  const module = await import("./patientNotifications.js");

  module.__setNotificationsForTest([
    {
      id: "n1",
      type: "appointment",
      icon: "ICON",
      unread: true,
      name: "Care Clinic",
      title: "Appointment Booked",
      msg: "Your appointment is confirmed",
      time: "Today",
      tags: ["Clinic: Care Clinic"],
      urgent: false
    }
  ]);

  module.__setCurrentFilterForTest("all");
  module.render();

  expect(document.body.textContent).toContain("Appointment Booked");
  expect(document.body.textContent).toContain("Care Clinic");
});

test("render filters unread notifications", async () => {
  jest.resetModules();

  document.body.innerHTML = `
    <div id="userName"></div>
    <div id="userEmail"></div>
    <div id="notifList"></div>
    <div id="toast"></div>
    <div id="count-all"></div>
    <div id="count-unread"></div>
    <div id="filters"></div>
    <button id="markAllBtn"></button>
    <button id="clearBtn"></button>
  `;

  const module = await import("./patientNotifications.js");

  module.__setNotificationsForTest([
    {
      id: "n1",
      type: "appointment",
      icon: "ICON",
      unread: true,
      name: "Care Clinic",
      title: "Unread Notification",
      msg: "Unread message",
      time: "Today",
      tags: [],
      urgent: false
    },
    {
      id: "n2",
      type: "queue",
      icon: "ICON",
      unread: false,
      name: "Other Clinic",
      title: "Read Notification",
      msg: "Read message",
      time: "Today",
      tags: [],
      urgent: false
    }
  ]);

  module.__setCurrentFilterForTest("unread");
  module.render();

  expect(document.body.textContent).toContain("Unread Notification");
  expect(document.body.textContent).not.toContain("Read Notification");
});