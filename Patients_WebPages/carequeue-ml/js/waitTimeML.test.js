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

test("getWaitTime posts normalized queue data to the prediction endpoint", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({
    clinicID: "7",
    queuePosition: "2",
    queueLength: "5",
    isWalkIn: true
  });

  const [url, options] = fetch.mock.calls[0];
  const body = JSON.parse(options.body);

  expect(url).toContain("/predict");
  expect(options.method).toBe("POST");
  expect(options.headers).toEqual({ "Content-Type": "application/json" });
  expect(body).toEqual({
    clinicID: 7,
    queuePosition: 2,
    queueLength: 5,
    isWalkIn: true
  });
});

test("getWaitTime returns the estimatedWaitTime on success", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 15 })
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

test("getWaitTime sends isWalkIn as true when true", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3, isWalkIn: true });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(true);
});

test("getWaitTime sends isWalkIn as false when false", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3, isWalkIn: false });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(false);
});

test("getWaitTime defaults missing isWalkIn to false", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ estimatedWaitTime: 10 })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 3 });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.isWalkIn).toBe(false);
});

test("getWaitTime returns null when estimatedWaitTime is absent", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({})
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 1 });

  expect(result).toBeNull();
});

test("getWaitTime returns null when response is not ok", async () => {
  fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: "bad request" })
  });

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5
  });

  expect(result).toBeNull();
});

test("getWaitTime returns null on network error", async () => {
  fetch.mockRejectedValue(new Error("network"));

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({
    clinicID: 1,
    queuePosition: 2,
    queueLength: 5
  });

  expect(result).toBeNull();
});

test("getWaitTime returns null on timeout", async () => {
  fetch.mockRejectedValue(new Error("timeout"));

  const { getWaitTime } = await import("./waitTimeML.js");

  const result = await getWaitTime({ clinicID: 1, queuePosition: 1, queueLength: 1 });

  expect(result).toBeNull();
});

test("queue meter element exists in DOM", () => {
  expect(document.getElementById("queueMeter")).not.toBeNull();
});
