// =============================================================
// waitTimeML.test.js
// =============================================================

global.fetch = jest.fn();

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();

  document.body.innerHTML = `
    <div id="queueCount"></div>
    <div id="queueProgressText"></div>
    <div id="progressPercent"></div>
    <div id="queuePosition"></div>
    <div id="waitTime"></div>
    <progress id="queueMeter"></progress>
  `;
});

// =============================================================
// warmUpAPI
// =============================================================
test("warmUpAPI calls the health endpoint without throwing", async () => {
  fetch.mockResolvedValue({});   // warmUpAPI ignores the response

  const { warmUpAPI } = await import("./waitTimeML.js");

  expect(() => warmUpAPI()).not.toThrow();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/health")
  );
});

// =============================================================
// getWaitTime — happy path
// =============================================================
test("getWaitTime returns the estimatedWaitTime on success", async () => {
  fetch.mockResolvedValue({
    ok:   true,
    json: async () => ({ estimatedWaitTime: 15 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID:      1,
    queuePosition: 2,
    queueLength:   5,
    isWalkIn:      false
  });

  expect(result).toBe(15);
});

test("getWaitTime sends isWalkIn as 1 when true", async () => {
  fetch.mockResolvedValue({
    ok:   true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3, isWalkIn: true });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(1);
});

test("getWaitTime sends isWalkIn as 0 when false", async () => {
  fetch.mockResolvedValue({
    ok:   true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3, isWalkIn: false });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(0);
});

test("getWaitTime returns null when estimatedWaitTime is absent", async () => {
  fetch.mockResolvedValue({
    ok:   true,
    json: async () => ({})     // no estimatedWaitTime key
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 1 });

  expect(result).toBeNull();
});

// =============================================================
// getWaitTime — error paths
// =============================================================
test("getWaitTime returns null when response is not ok", async () => {
  // Must include json() because the source calls res.json().catch(()=>({}))
  fetch.mockResolvedValue({
    ok:   false,
    json: async () => ({ error: "bad request" })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID:      1,
    queuePosition: 2,
    queueLength:   5
  });

  expect(result).toBeNull();
});

test("getWaitTime returns null on network error", async () => {
  fetch.mockRejectedValue(new Error("network"));

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID:      1,
    queuePosition: 2,
    queueLength:   5
  });

  expect(result).toBeNull();
});

test("getWaitTime returns null on timeout", async () => {
  // Simulate the fetchWithTimeout rejecting with a timeout error
  fetch.mockRejectedValue(new Error("timeout"));

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 1 });

  expect(result).toBeNull();
});

// =============================================================
// DOM elements
// =============================================================
test("queue meter element exists in DOM", () => {
  expect(document.getElementById("queueMeter")).not.toBeNull();
});