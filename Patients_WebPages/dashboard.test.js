// Patients_WebPages/dashboard.test.js

// Import functions to be tested from dashboardLogic file
const {
  filterUpcomingAppointments,
  calcQueueProgress,
  calcWaitTime,
  getQueueMessage
} = require("./dashboardLogic");

// Test suite for filtering and sorting appointments
describe("filterUpcomingAppointments", () => {

  // Test filtering appointments that are on or before today
  test("returns only appointments on or before today", () => {
    // Sample appointment data
    const appointments = [
      { date: "2020-01-01" },
      { date: "2099-12-31" },
      { date: "2023-06-15" },
    ];

    // Call the function
    const result = filterUpcomingAppointments(appointments);

    // Expect only 2 valid appointments
    expect(result).toHaveLength(2);

    // Expect first result to be the earliest date
    expect(result[0].date).toBe("2020-01-01");
  });

  // Test case when all appointments are in the future
  test("returns empty array if all appointments are in the future", () => {
    // Future appointment only
    const appointments = [{ date: "2099-01-01" }];

    // Expect no appointments returned
    expect(filterUpcomingAppointments(appointments)).toHaveLength(0);
  });

  // Test if sorting works correctly
  test("sorts by date ascending", () => {
    // Unsorted appointment list
    const appointments = [
      { date: "2023-06-15" },
      { date: "2021-03-01" },
    ];

    // Call the function
    const result = filterUpcomingAppointments(appointments);

    // Expect earliest date first
    expect(result[0].date).toBe("2021-03-01");
  });
});

// Test suite for queue progress calculation
describe("calcQueueProgress", () => {

  // Test when total queue is zero
  test("returns 0 when total is 0", () => {
    expect(calcQueueProgress(1, 0)).toBe(0);
  });

  // Test when user is last in queue
  test("returns 0% when position equals total", () => {
    expect(calcQueueProgress(5, 5)).toBe(0);
  });

  // Test when user is at the front (position 0 edge case)
  test("returns 100% when position is 0", () => {
    expect(calcQueueProgress(0, 5)).toBe(100);
  });

  // Test normal percentage calculation
  test("calculates correct percentage", () => {
    expect(calcQueueProgress(1, 4)).toBe(75);
  });
});

// Test suite for wait time calculation
describe("calcWaitTime", () => {

  // Test when backend provides estimated wait time
  test("uses estimateWait if provided", () => {
    expect(calcWaitTime(3, 15)).toBe(15);
  });

  // Test fallback calculation using queue position
  test("calculates wait from position if no estimate", () => {
    expect(calcWaitTime(4, 0)).toBe(24);
  });

  // Test when user is first in queue (no wait)
  test("returns 0 wait for position 1 with no estimate", () => {
    expect(calcWaitTime(1, 0)).toBe(0);
  });
});

// Test suite for queue messages
describe("getQueueMessage", () => {

  // Test message when user is next in queue
  test("returns next message when position is 1", () => {
    expect(getQueueMessage(1, 90)).toBe("You're next! Please get ready.");
  });

  // Test message when user is close to the front
  test("returns almost there when percent >= 70", () => {
    expect(getQueueMessage(2, 75)).toBe("Almost there — you're very close.");
  });

  // Test message when user is mid-queue
  test("returns steady message when percent >= 40", () => {
    expect(getQueueMessage(3, 50)).toBe("You are moving steadily through the queue.");
  });

  // Test default message for early queue position
  test("returns default message when percent < 40", () => {
    expect(getQueueMessage(5, 20)).toBe("You're in the queue. We'll keep you updated.");
  });
});