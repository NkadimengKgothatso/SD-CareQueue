beforeEach(() => {
  document.body.innerHTML = `
    <table>
      <tbody id="waitTableBody"></tbody>
    </table>

    <div id="patientsValue"></div>
    <div id="waitValue"></div>
    <div id="noShowValue"></div>
    <div id="trendValue"></div>

    <form id="filterForm"></form>

    <input id="dateFrom" />
    <input id="dateTo" />

    <input id="clinicSearch" />
  `;
});

test("inDateRange returns true for matching dates", async () => {
  const { inDateRange } = await import("./Analytics.js");

  expect(
    inDateRange("2026-05-09", "2026-05-01", "2026-05-31")
  ).toBe(true);
});

test("inDateRange returns false outside range", async () => {
  const { inDateRange } = await import("./Analytics.js");

  expect(
    inDateRange("2026-06-09", "2026-05-01", "2026-05-31")
  ).toBe(false);
});

test("getGlobalNoShowRate calculates correctly", async () => {
  const { getGlobalNoShowRate } = await import("./Analytics.js");

  const result = getGlobalNoShowRate([
    { status: "completed" },
    { status: "cancelled" }
  ]);

  expect(result).toBe("50.0%");
});

test("getQueueAnalytics groups queue data", async () => {
  const { getQueueAnalytics } = await import("./Analytics.js");

  const result = getQueueAnalytics([
    {
      clinicID: 1,
      status: "waiting",
      estimateWait: 20
    },
    {
      clinicID: 1,
      status: "completed",
      estimateWait: 10
    }
  ]);

  expect(result[1].total).toBe(2);
  expect(result[1].waiting).toBe(1);
  expect(result[1].maxWait).toBe(20);
});

test("getNoShowRateByClinic calculates correctly", async () => {
  const { getNoShowRateByClinic } = await import("./Analytics.js");

  const result = getNoShowRateByClinic([
    { clinicID: 1, status: "completed" },
    { clinicID: 1, status: "cancelled" }
  ]);

  expect(result[1].rate).toBe("50.0");
});

test("getRateColor returns green", async () => {
  const { getRateColor } = await import("./Analytics.js");

  expect(getRateColor("5")).toBe("green");
});

test("getRateColor returns orange", async () => {
  const { getRateColor } = await import("./Analytics.js");

  expect(getRateColor("15")).toBe("orange");
});

test("getRateColor returns red", async () => {
  const { getRateColor } = await import("./Analytics.js");

  expect(getRateColor("30")).toBe("red");
});

test("getPreviousPeriod returns previous dates", async () => {
  const { getPreviousPeriod } = await import("./Analytics.js");

  const result = getPreviousPeriod(
    "2026-05-01",
    "2026-05-31"
  );

  expect(result.from).toBeDefined();
  expect(result.to).toBeDefined();
});

test("setActiveRow activates selected row", async () => {
  const { setActiveRow } = await import("./Analytics.js");

  const tbody = document.getElementById("waitTableBody");

  tbody.innerHTML = `
    <tr></tr>
    <tr></tr>
  `;

  const rows = document.querySelectorAll("#waitTableBody tr");

  setActiveRow(rows, 1);

  expect(rows[1].classList.contains("active-row"))
    .toBe(true);
});