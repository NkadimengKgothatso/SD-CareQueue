global.fetch = jest.fn();

beforeEach(() => {
  document.body.innerHTML = `
    <div id="queueCount"></div>
    <div id="queueProgressText"></div>
    <div id="progressPercent"></div>
    <div id="queuePosition"></div>
    <div id="waitTime"></div>
    <progress id="queueMeter"></progress>
  `;

  jest.clearAllMocks();
});

test("getWaitTime returns prediction", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      estimatedWaitTime: 15
    })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5,
    isWalkIn: false
  });

  expect(result).toBe(15);
});

test("getWaitTime returns null on failed response", async () => {
  fetch.mockResolvedValue({
    ok: false
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5
  });

  expect(result).toBeNull();
});

test("getWaitTime returns null on fetch error", async () => {
  fetch.mockRejectedValue(new Error("network"));

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5
  });

  expect(result).toBeNull();
});

test("loadQueueStatusML returns cleanup function", async () => {
  const module = await import("./waitTimeML.js");

  const cleanup = module.loadQueueStatusML(
    "user1",
    "appt1",
    1,
    {}
  );

  expect(typeof cleanup).toBe("function");
});

test("queue meter exists", () => {
  expect(document.getElementById("queueMeter")).not.toBeNull();
});