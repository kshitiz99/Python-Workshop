const {
  formatTime,
  getDurationSeconds,
  computeNextMode,
  computeRingOffset,
  calculateXP,
  calculateLevel,
  calculateStreak,
  buildPeriodStats,
  collectBadges,
} = require("../static/js/timerLogic");

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

describe("calculateXP", () => {
  test("calculates XP from completed sessions", () => {
    expect(calculateXP(4, 25)).toBe(100);
  });

  test("guards against invalid values", () => {
    expect(calculateXP(-1, 25)).toBe(0);
    expect(calculateXP(3, 0)).toBe(75);
  });
});

describe("calculateLevel", () => {
  test("levels up every 100 XP by default", () => {
    expect(calculateLevel(0, 100)).toBe(1);
    expect(calculateLevel(99, 100)).toBe(1);
    expect(calculateLevel(100, 100)).toBe(2);
    expect(calculateLevel(250, 100)).toBe(3);
  });
});

describe("calculateStreak", () => {
  test("counts consecutive days ending today", () => {
    const history = {
      "2026-08-17": 2,
      "2026-08-18": 1,
      "2026-08-19": 3,
    };
    expect(calculateStreak(history, "2026-08-19T12:00:00Z")).toBe(3);
  });

  test("returns zero when today has no completion", () => {
    const history = {
      "2026-08-18": 1,
    };
    expect(calculateStreak(history, "2026-08-19T12:00:00Z")).toBe(0);
  });
});

describe("buildPeriodStats", () => {
  test("builds completion rate and average focus from daily history", () => {
    const sessions = {
      "2026-08-17": 2,
      "2026-08-18": 1,
      "2026-08-19": 1,
    };
    const focusMinutes = {
      "2026-08-17": 50,
      "2026-08-18": 25,
      "2026-08-19": 30,
    };

    const stats = buildPeriodStats(sessions, focusMinutes, 7, "2026-08-19T12:00:00Z");
    expect(stats.totalSessions).toBe(4);
    expect(stats.activeDays).toBe(3);
    expect(stats.completionRate).toBe(42.9);
    expect(stats.averageFocusMinutes).toBe(26.3);
    expect(stats.daily).toHaveLength(7);
  });
});

describe("collectBadges", () => {
  test("awards expected badges for streak, weekly and total milestones", () => {
    const badges = collectBadges(3, 10, 100).map((badge) => badge.id);
    expect(badges).toEqual(["streak-3", "weekly-10", "total-100"]);
  });

  test("returns empty list when no badge condition is met", () => {
    expect(collectBadges(1, 2, 5)).toEqual([]);
  });
});
