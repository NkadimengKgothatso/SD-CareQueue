const {
    timeToMinutes,
    minutesToTime,
    roundToNextSlot
} = require("../Staff_Webpages/walkinLogic");

test("converts time to minutes", () => {
    expect(timeToMinutes("08:00")).toBe(480);
});

test("converts minutes back to time", () => {
    expect(minutesToTime(480)).toBe("08:00");
});

test("rounds to next slot", () => {
    expect(roundToNextSlot(10, 30)).toBe(30);
});