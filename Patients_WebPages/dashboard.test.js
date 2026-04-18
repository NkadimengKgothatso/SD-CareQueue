// Patients_WebPages/dashboard.test.js

const {
  filterUpcomingAppointments,
  calcQueueProgress,
  calcWaitTime,
  getQueueMessage
} = require("./dashboardLogic");

describe("filterUpcomingAppointments", () => {
  test("returns only appointments on or before today", () => {
    const appointments = [
      { date: "2020-01-01" },
      { date: "2099-12-31" },
      { date: "2023-06-15" },
    ];
    const result = filterUpcomingAppointments(appointments);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2020-01-01");
  });

  test("returns empty array if all appointments are in the future", () => {
    const appointments = [{ date: "2099-01-01" }];
    expect(filterUpcomingAppointments(appointments)).toHaveLength(0);
  });

  test("sorts by date ascending", () => {
    const appointments = [
      { date: "2023-06-15" },
      { date: "2021-03-01" },
    ];
    const result = filterUpcomingAppointments(appointments);
    expect(result[0].date).toBe("2021-03-01");
  });
});

describe("calcQueueProgress", () => {
  test("returns 0 when total is 0", () => {
    expect(calcQueueProgress(1, 0)).toBe(0);
  });

  test("returns 0% when position equals total", () => {
    expect(calcQueueProgress(5, 5)).toBe(0);
  });

  test("returns 100% when position is 0", () => {
    expect(calcQueueProgress(0, 5)).toBe(100);
  });

  test("calculates correct percentage", () => {
    expect(calcQueueProgress(1, 4)).toBe(75);
  });
});

describe("calcWaitTime", () => {
  test("uses estimateWait if provided", () => {
    expect(calcWaitTime(3, 15)).toBe(15);
  });

  test("calculates wait from position if no estimate", () => {
    expect(calcWaitTime(4, 0)).toBe(24);
  });

  test("returns 0 wait for position 1 with no estimate", () => {
    expect(calcWaitTime(1, 0)).toBe(0);
  });
});

describe("getQueueMessage", () => {
  test("returns next message when position is 1", () => {
    expect(getQueueMessage(1, 90)).toBe("You're next! Please get ready.");
  });

  test("returns almost there when percent >= 70", () => {
    expect(getQueueMessage(2, 75)).toBe("Almost there — you're very close.");
  });

  test("returns steady message when percent >= 40", () => {
    expect(getQueueMessage(3, 50)).toBe("You are moving steadily through the queue.");
  });

  test("returns default message when percent < 40", () => {
    expect(getQueueMessage(5, 20)).toBe("You're in the queue. We'll keep you updated.");
  });
});