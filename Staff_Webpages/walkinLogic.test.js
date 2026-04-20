// Staff_Webpages/walkinLogic.test.js

const WalkinLogic = require("./WalkinLogic");

test("converts time to minutes", () => {
    expect(WalkinLogic.timeToMinutes("08:00")).toBe(480);
});

test("converts minutes back to time", () => {
    expect(WalkinLogic.minutesToTime(480)).toBe("08:00");
});

test("rounds to next slot", () => {
    expect(WalkinLogic.roundToNextSlot(10, 30)).toBe(30);
});

test("returns today date in YYYY-MM-DD format", () => {
    const today = WalkinLogic.getToday();
    expect(today).toMatch(/\d{4}-\d{2}-\d{2}/);
});

test("returns today date", () => {
    const today = WalkinLogic.getToday();
    expect(today).toMatch(/\d{4}-\d{2}-\d{2}/);
});

test("detects taken slot correctly", () => {
    const appointments = [
        { time: "08:00" }
    ];

    const result = WalkinLogic.isTaken("08:00", appointments, 30);
    expect(result).toBe(true);
});

test("returns false when slot is free", () => {
    const appointments = [
        { time: "09:00" }
    ];

    const result = WalkinLogic.isTaken("08:00", appointments, 30);
    expect(result).toBe(false);
});