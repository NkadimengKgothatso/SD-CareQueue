const mockInitAdminPage = jest.fn();
const mockCollection = jest.fn((_db, name) => name);
const mockGetDocs = jest.fn();

jest.mock(
  "/Admin_WebPages/admin.js",
  () => ({
    initAdminPage: mockInitAdminPage,
    db: {}
  }),
  { virtual: true }
);

jest.mock(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
  () => ({
    collection: mockCollection,
    getDocs: mockGetDocs
  }),
  { virtual: true }
);

function buildDOM() {
  document.body.innerHTML = `
    <table>
      <tbody id="waitTableBody"></tbody>
    </table>

    <section id="patientsValue"></section>
    <section id="waitValue"></section>
    <section id="noShowValue"></section>
    <section id="trendValue"></section>

    <form id="filterForm"></form>

    <button id="exportCSV"></button>
    <button id="exportPDF"></button>

    <input id="dateFrom" />
    <input id="dateTo" />

    <input id="clinicSearch" />
  `;
}

function snapshotFrom(records) {
  return {
    docs: records.map(({ id, ...data }) => ({
      id,
      data: () => data
    }))
  };
}

function arrangeFirestore({
  appointments = [],
  queues = [],
  clinics = []
} = {}) {
  mockGetDocs.mockImplementation((collectionName) => {
    const snapshots = {
      Appointments: snapshotFrom(appointments),
      Queues: snapshotFrom(queues),
      clinicsObjects: snapshotFrom(clinics)
    };

    return Promise.resolve(snapshots[collectionName] || snapshotFrom([]));
  });
}

async function importAnalytics() {
  const mod = await import("./analytics.js");
  document.dispatchEvent(new Event("DOMContentLoaded"));
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  return mod;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  buildDOM();
  arrangeFirestore();
  mockInitAdminPage.mockResolvedValue();

  HTMLElement.prototype.scrollIntoView = jest.fn();
});

test("inDateRange returns true for matching dates", async () => {
  const { inDateRange } = await importAnalytics();

  expect(
    inDateRange("2026-05-09", "2026-05-01", "2026-05-31")
  ).toBe(true);
});

test("inDateRange returns false outside range", async () => {
  const { inDateRange } = await importAnalytics();

  expect(
    inDateRange("2026-06-09", "2026-05-01", "2026-05-31")
  ).toBe(false);
});

test("inDateRange returns true when range is incomplete", async () => {
  const { inDateRange } = await importAnalytics();

  expect(inDateRange("2026-06-09", "", "2026-05-31")).toBe(true);
  expect(inDateRange("2026-06-09", "2026-05-01", "")).toBe(true);
});

test("getGlobalNoShowRate calculates correctly", async () => {
  const { getGlobalNoShowRate } = await importAnalytics();

  const result = getGlobalNoShowRate([
    { status: "completed" },
    { status: "cancelled" }
  ]);

  expect(result).toBe("50.0%");
});

test("getGlobalNoShowRate handles an empty list", async () => {
  const { getGlobalNoShowRate } = await importAnalytics();

  expect(getGlobalNoShowRate([])).toBe("0.0%");
});

test("getQueueAnalytics groups queue data and defaults missing waits to zero", async () => {
  const { getQueueAnalytics } = await importAnalytics();

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
    },
    {
      clinicID: 2,
      status: "waiting"
    }
  ]);

  expect(result[1]).toEqual({
    total: 2,
    waiting: 1,
    totalWait: 30,
    maxWait: 20
  });
  expect(result[2]).toEqual({
    total: 1,
    waiting: 1,
    totalWait: 0,
    maxWait: 0
  });
});

test("getNoShowRateByClinic calculates correctly", async () => {
  const { getNoShowRateByClinic } = await importAnalytics();

  const result = getNoShowRateByClinic([
    { clinicID: 1, status: "completed" },
    { clinicID: 1, status: "cancelled" },
    { clinicID: 2, status: "completed" }
  ]);

  expect(result[1]).toMatchObject({
    total: 2,
    cancelled: 1,
    rate: "50.0"
  });
  expect(result[2].rate).toBe("0.0");
});

test("getRateColor returns green", async () => {
  const { getRateColor } = await importAnalytics();

  expect(getRateColor("5")).toBe("green");
});

test("getRateColor returns orange", async () => {
  const { getRateColor } = await importAnalytics();

  expect(getRateColor("15")).toBe("orange");
});

test("getRateColor returns red", async () => {
  const { getRateColor } = await importAnalytics();

  expect(getRateColor("30")).toBe("red");
});

test("getPreviousPeriod returns the equally sized previous range", async () => {
  const { getPreviousPeriod } = await importAnalytics();

  const result = getPreviousPeriod("2026-05-10T00:00:00.000Z", "2026-05-12T00:00:00.000Z");

  expect(result.from).toBe("2026-05-07T23:59:59.999Z");
  expect(result.to).toBe("2026-05-09T23:59:59.999Z");
});

test("countPatients only counts completed appointments in the selected range", async () => {
  const { countPatients } = await importAnalytics();

  const result = countPatients(
    [
      { status: "completed", date: "2026-05-05" },
      { status: "cancelled", date: "2026-05-06" },
      { status: "completed", date: "2026-06-01" }
    ],
    "2026-05-01",
    "2026-05-31"
  );

  expect(result).toBe(1);
});

test("setActiveRow activates selected row and clears the previous row", async () => {
  const { setActiveRow } = await importAnalytics();

  const tbody = document.getElementById("waitTableBody");

  tbody.innerHTML = `
    <tr class="active-row"></tr>
    <tr></tr>
  `;

  const rows = document.querySelectorAll("#waitTableBody tr");

  setActiveRow(rows, 1);

  expect(rows[0].classList.contains("active-row")).toBe(false);
  expect(rows[1].classList.contains("active-row")).toBe(true);
});

test("setActiveRow ignores an empty row list", async () => {
  const { setActiveRow } = await importAnalytics();

  expect(() => setActiveRow([], 0)).not.toThrow();
});

test("DOMContentLoaded loads Firestore data, renders rows, KPIs, and default active row", async () => {
  arrangeFirestore({
    appointments: [
      { id: "a1", clinicID: "c1", status: "completed", date: "2026-05-03" },
      { id: "a2", clinicID: "c1", status: "cancelled", date: "2026-05-04" },
      { id: "a3", clinicID: "c2", status: "completed", date: "2026-04-15" }
    ],
    queues: [
      { id: "q1", clinicID: "c1", status: "waiting", estimateWait: 15, date: "2026-05-03" },
      { id: "q2", clinicID: "c1", status: "done", estimateWait: 25, date: "2026-05-04" }
    ],
    clinics: [
      { id: "c1", name: "Central Clinic" },
      { id: "c2", name: "West Clinic" }
    ]
  });

  await importAnalytics();

  const rows = document.querySelectorAll("#waitTableBody tr");

  expect(mockInitAdminPage).toHaveBeenCalled();
  expect(mockCollection).toHaveBeenCalledWith({}, "Appointments");
  expect(mockCollection).toHaveBeenCalledWith({}, "Queues");
  expect(mockCollection).toHaveBeenCalledWith({}, "clinicsObjects");
  expect(document.getElementById("patientsValue").textContent).toBe("2");
  expect(document.getElementById("waitValue").textContent).toBe("20.0 min");
  expect(document.getElementById("noShowValue").textContent).toBe("33.3%");
  expect(rows).toHaveLength(2);
  expect(rows[0].children[0].textContent).toBe("Central Clinic");
  expect(rows[0].children[1].textContent.trim()).toBe("20.0 min");
  expect(rows[0].children[2].textContent).toBe("2");
  expect(rows[0].children[3].textContent.trim()).toBe("50.0%");
  expect(rows[0].children[3].getAttribute("style")).toContain("red");
  expect(rows[1].children[1].textContent.trim()).toBe("0.0 min");
  expect(rows[0].classList.contains("active-row")).toBe(true);
});

test("buildDashboard returns loaded data and filters by date range", async () => {
  arrangeFirestore({
    appointments: [
      { id: "a1", status: "completed", date: "2026-05-03" },
      { id: "a2", status: "cancelled", date: "2026-05-04" },
      { id: "a3", status: "completed", date: "2026-06-01" }
    ],
    queues: [
      { id: "q1", estimateWait: 10, date: "2026-05-03" },
      { id: "q2", estimateWait: 30, date: "2026-06-01" }
    ]
  });

  const { buildDashboard } = await importAnalytics();

  expect(buildDashboard()).toMatchObject({
    patientsSeen: 2,
    noShows: 1,
    avgWait: "20.0"
  });
  expect(buildDashboard("2026-05-01", "2026-05-31")).toMatchObject({
    patientsSeen: 1,
    noShows: 1,
    avgWait: "10.0"
  });
});

test("buildDashboard returns zero wait time when there are no queues", async () => {
  arrangeFirestore({
    appointments: [{ id: "a1", status: "completed", date: "2026-05-03" }]
  });

  const { buildDashboard } = await importAnalytics();

  expect(buildDashboard().avgWait).toBe(0);
});

test("buildDashboard treats missing queue wait estimates as zero", async () => {
  arrangeFirestore({
    queues: [
      { id: "q1", estimateWait: 20, date: "2026-05-03" },
      { id: "q2", date: "2026-05-04" }
    ]
  });

  const { buildDashboard } = await importAnalytics();

  expect(buildDashboard().avgWait).toBe("10.0");
});

test("form submit re-renders the dashboard with selected date filters", async () => {
  arrangeFirestore({
    appointments: [
      { id: "a1", clinicID: "c1", status: "completed", date: "2026-05-03" },
      { id: "a2", clinicID: "c1", status: "cancelled", date: "2026-06-04" }
    ],
    queues: [
      { id: "q1", clinicID: "c1", status: "waiting", estimateWait: 15, date: "2026-05-03" },
      { id: "q2", clinicID: "c1", status: "waiting", estimateWait: 45, date: "2026-06-04" }
    ],
    clinics: [{ id: "c1", name: "Central Clinic" }]
  });

  await importAnalytics();

  document.getElementById("dateFrom").value = "2026-06-01";
  document.getElementById("dateTo").value = "2026-06-30";
  document.getElementById("filterForm").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );

  const firstRow = document.querySelector("#waitTableBody tr");

  expect(document.getElementById("patientsValue").textContent).toBe("0");
  expect(document.getElementById("waitValue").textContent).toBe("45.0 min");
  expect(document.getElementById("noShowValue").textContent).toBe("100.0%");
  expect(firstRow.children[3].textContent.trim()).toBe("100.0%");
});

test("search input hides rows whose clinic name does not match", async () => {
  arrangeFirestore({
    clinics: [
      { id: "c1", name: "Central Clinic" },
      { id: "c2", name: "West Clinic" }
    ]
  });

  await importAnalytics();

  const search = document.getElementById("clinicSearch");
  search.value = "west";
  search.dispatchEvent(new Event("input", { bubbles: true }));

  const rows = document.querySelectorAll("#waitTableBody tr");

  expect(rows[0].style.display).toBe("none");
  expect(rows[1].style.display).toBe("");
});

test("search input handles rows without clinic cells", async () => {
  await importAnalytics();

  document.getElementById("waitTableBody").innerHTML = "<tr></tr>";

  const search = document.getElementById("clinicSearch");
  search.value = "central";
  search.dispatchEvent(new Event("input", { bubbles: true }));

  expect(document.querySelector("#waitTableBody tr").style.display).toBe("none");
});

test("mouse and keyboard navigation update the active row", async () => {
  arrangeFirestore({
    clinics: [
      { id: "c1", name: "Central Clinic" },
      { id: "c2", name: "West Clinic" }
    ]
  });

  await importAnalytics();

  const rows = document.querySelectorAll("#waitTableBody tr");

  rows[1].dispatchEvent(new Event("mouseenter"));
  expect(rows[1].classList.contains("active-row")).toBe(true);

  rows[0].dispatchEvent(new Event("click"));
  expect(rows[0].classList.contains("active-row")).toBe(true);

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  expect(rows[1].classList.contains("active-row")).toBe(true);
  expect(rows[1].scrollIntoView).toHaveBeenCalledWith({ block: "center" });

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
  expect(rows[0].classList.contains("active-row")).toBe(true);
});

test("keyboard navigation does nothing when no rows are rendered", async () => {
  await importAnalytics();

  document.getElementById("waitTableBody").innerHTML = "";

  expect(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  }).not.toThrow();
});

test("CSV export button downloads the currently filtered clinic analytics", async () => {
  arrangeFirestore({
    appointments: [
      { id: "a1", clinicID: "c1", status: "cancelled", date: "2026-05-03" },
      { id: "a2", clinicID: "c1", status: "completed", date: "2026-06-03" }
    ],
    queues: [
      { id: "q1", clinicID: "c1", estimateWait: 10, date: "2026-05-03" },
      { id: "q2", clinicID: "c1", estimateWait: 30, date: "2026-06-03" }
    ],
    clinics: [{ id: "c1", name: "Central Clinic" }]
  });
  URL.createObjectURL = jest.fn();
  URL.revokeObjectURL = jest.fn();
  const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const createObjectURLSpy = jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:analytics");
  const revokeObjectURLSpy = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

  await importAnalytics();

  document.getElementById("dateFrom").value = "2026-05-01";
  document.getElementById("dateTo").value = "2026-05-31";
  document.getElementById("exportCSV").click();

  const blob = createObjectURLSpy.mock.calls[0][0];
  const csvText = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
  expect(csvText.replace(/^\uFEFF/, "")).toBe([
    "sep=;",
    "Clinic;Avg Wait (min);Volume;No-Show Rate;Status",
    "\"Central Clinic\";10.0;1;100.0%;Active"
  ].join("\n"));
  expect(clickSpy).toHaveBeenCalled();
  expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:analytics");

  clickSpy.mockRestore();
  createObjectURLSpy.mockRestore();
  revokeObjectURLSpy.mockRestore();
});

test("PDF export button writes and prints an all-time clinic analytics report", async () => {
  arrangeFirestore({
    appointments: [{ id: "a1", clinicID: "c1", status: "completed", date: "2026-05-03" }],
    queues: [{ id: "q1", clinicID: "c1", estimateWait: 12, date: "2026-05-03" }],
    clinics: [{ id: "c1", name: "Central Clinic" }]
  });
  const reportWindow = {
    addEventListener: jest.fn((_event, callback) => callback()),
    print: jest.fn()
  };
  const createObjectURLSpy = jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:analytics-pdf");
  const revokeObjectURLSpy = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const openSpy = jest.spyOn(window, "open").mockReturnValue(reportWindow);

  await importAnalytics();

  document.getElementById("exportPDF").click();

  expect(openSpy).toHaveBeenCalledWith("blob:analytics-pdf", "_blank");
  const html = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(createObjectURLSpy.mock.calls[0][0]);
  });
  expect(html).toContain("All time");
  expect(html).toContain("Central Clinic");
  expect(html).toContain("12.0");
  expect(reportWindow.addEventListener).toHaveBeenCalledWith("load", expect.any(Function));
  expect(reportWindow.print).toHaveBeenCalled();
  expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:analytics-pdf");

  openSpy.mockRestore();
  createObjectURLSpy.mockRestore();
  revokeObjectURLSpy.mockRestore();
});

test("calculatePatientsTrend returns positive, zero-baseline, and neutral trends", async () => {
  arrangeFirestore({
    appointments: [
      { id: "prev", status: "completed", date: "2026-04-30T12:00:00.000Z" },
      { id: "current1", status: "completed", date: "2026-05-02T12:00:00.000Z" },
      { id: "current2", status: "completed", date: "2026-05-03T12:00:00.000Z" },
      { id: "zeroBaseline", status: "completed", date: "2026-07-10T12:00:00.000Z" }
    ]
  });

  const { calculatePatientsTrend } = await importAnalytics();

  expect(calculatePatientsTrend("2026-05-01T00:00:00.000Z", "2026-05-03T23:59:59.999Z")).toBe("100.0%");
  expect(calculatePatientsTrend("2026-06-01T00:00:00.000Z", "2026-06-03T23:59:59.999Z")).toBe("0%");
  expect(calculatePatientsTrend("2026-07-10T00:00:00.000Z", "2026-07-10T23:59:59.999Z")).toBe("+100%");
});

test("setActiveRow clears rows without selecting an out-of-range index", async () => {
  const { setActiveRow } = await importAnalytics();

  document.getElementById("waitTableBody").innerHTML = `
    <tr class="active-row"></tr>
    <tr class="active-row"></tr>
  `;

  const rows = document.querySelectorAll("#waitTableBody tr");

  setActiveRow(rows, 3);

  expect(rows[0].classList.contains("active-row")).toBe(false);
  expect(rows[1].classList.contains("active-row")).toBe(false);
});

test("load failures are logged instead of crashing the page", async () => {
  const error = new Error("Firestore unavailable");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockGetDocs.mockRejectedValue(error);

  await expect(importAnalytics()).resolves.toBeDefined();

  expect(consoleSpy).toHaveBeenCalledWith("Error loading clinics:", error);
  expect(consoleSpy).toHaveBeenCalledWith("Error loading appointments:", error);
  expect(consoleSpy).toHaveBeenCalledWith("Error loading queues:", error);

  consoleSpy.mockRestore();
});

test("DOMContentLoaded catches synchronous init errors", async () => {
  const error = new Error("broken init");
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockInitAdminPage.mockImplementation(() => {
    throw error;
  });

  const mod = await import("./analytics.js");
  document.dispatchEvent(new Event("DOMContentLoaded"));

  expect(mod).toBeDefined();
  expect(consoleSpy).toHaveBeenCalledWith("INIT ERROR:", error);

  consoleSpy.mockRestore();
});
