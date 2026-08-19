const { formatTime, getDurationSeconds, computeNextMode, computeRingOffset } = require("../static/js/timerLogic");

describe("formatTime", () => {
  test("formats whole minutes with zero seconds", () => {
    expect(formatTime(300)).toBe("05:00");
  });

  test("pads single-digit minutes and seconds", () => {
    expect(formatTime(65)).toBe("01:05");
  });

  test("formats zero as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });
});

describe("getDurationSeconds", () => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, sessionsBeforeLongBreak: 4 };

  test("returns work duration in seconds", () => {
    expect(getDurationSeconds("work", settings)).toBe(25 * 60);
  });

  test("returns short break duration in seconds", () => {
    expect(getDurationSeconds("shortBreak", settings)).toBe(5 * 60);
  });

  test("returns long break duration in seconds", () => {
    expect(getDurationSeconds("longBreak", settings)).toBe(15 * 60);
  });

  test("falls back to work duration for unknown modes", () => {
    expect(getDurationSeconds("unknown", settings)).toBe(25 * 60);
  });
});

describe("computeNextMode", () => {
  const settings = { work: 25, shortBreak: 5, longBreak: 15, sessionsBeforeLongBreak: 4 };

  test("returns work after a break finishes", () => {
    expect(computeNextMode("shortBreak", 1, settings)).toBe("work");
    expect(computeNextMode("longBreak", 4, settings)).toBe("work");
  });

  test("returns shortBreak after a work session when not due for long break", () => {
    expect(computeNextMode("work", 1, settings)).toBe("shortBreak");
    expect(computeNextMode("work", 2, settings)).toBe("shortBreak");
    expect(computeNextMode("work", 3, settings)).toBe("shortBreak");
  });

  test("returns longBreak after every Nth work session", () => {
    expect(computeNextMode("work", 4, settings)).toBe("longBreak");
    expect(computeNextMode("work", 8, settings)).toBe("longBreak");
  });

  test("respects a custom sessionsBeforeLongBreak", () => {
    const customSettings = { ...settings, sessionsBeforeLongBreak: 2 };
    expect(computeNextMode("work", 2, customSettings)).toBe("longBreak");
    expect(computeNextMode("work", 1, customSettings)).toBe("shortBreak");
  });
});

describe("computeRingOffset", () => {
  test("returns 0 when the timer is at full duration", () => {
    expect(computeRingOffset(60, 60, 100)).toBe(0);
  });

  test("returns full circumference when time is up", () => {
    expect(computeRingOffset(0, 60, 100)).toBe(100);
  });

  test("returns half the circumference at the midpoint", () => {
    expect(computeRingOffset(30, 60, 100)).toBe(50);
  });
});
