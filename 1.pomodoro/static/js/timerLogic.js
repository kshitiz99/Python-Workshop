// Pure, DOM-free timer logic - shared between the browser and unit tests.
(function (root) {
  const MODE_DURATION_KEYS = {
    work: "work",
    shortBreak: "shortBreak",
    longBreak: "longBreak",
  };

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function getDurationSeconds(mode, settings) {
    const key = MODE_DURATION_KEYS[mode] || "work";
    return settings[key] * 60;
  }

  function computeNextMode(currentMode, sessionCount, settings) {
    if (currentMode !== "work") return "work";
    const isLongBreakDue = sessionCount > 0 && sessionCount % settings.sessionsBeforeLongBreak === 0;
    return isLongBreakDue ? "longBreak" : "shortBreak";
  }

  function computeRingOffset(secondsLeft, totalSeconds, circumference) {
    if (totalSeconds <= 0) return circumference;
    const safeSecondsLeft = Math.min(Math.max(secondsLeft, 0), totalSeconds);
    return circumference * (1 - safeSecondsLeft / totalSeconds);
  }

  function interpolateChannel(start, end, t) {
    return Math.round(start + (end - start) * t);
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }

  function computeProgressColor(secondsLeft, totalSeconds) {
    if (totalSeconds <= 0) return "#d64541";
    const safeSecondsLeft = Math.min(Math.max(secondsLeft, 0), totalSeconds);
    const elapsedRatio = 1 - safeSecondsLeft / totalSeconds;

    const COLOR_BLUE = [46, 134, 193];
    const COLOR_YELLOW = [241, 196, 15];
    const COLOR_RED = [214, 69, 65];

    const [start, end, t] =
      elapsedRatio <= 0.5
        ? [COLOR_BLUE, COLOR_YELLOW, elapsedRatio * 2]
        : [COLOR_YELLOW, COLOR_RED, (elapsedRatio - 0.5) * 2];

    return rgbToHex(
      interpolateChannel(start[0], end[0], t),
      interpolateChannel(start[1], end[1], t),
      interpolateChannel(start[2], end[2], t)
    );
  }

  function normalizeDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function formatDateKey(date) {
    const normalized = normalizeDate(date);
    return [
      String(normalized.getFullYear()).padStart(4, "0"),
      String(normalized.getMonth() + 1).padStart(2, "0"),
      String(normalized.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function shiftDate(date, dayOffset) {
    const shifted = normalizeDate(date);
    shifted.setDate(shifted.getDate() + dayOffset);
    return shifted;
  }

  function calculateXP(completedWorkSessions, xpPerSession) {
    const safeSessions = Math.max(0, Number(completedWorkSessions) || 0);
    const safeXPPerSession = Math.max(1, Number(xpPerSession) || 25);
    return safeSessions * safeXPPerSession;
  }

  function calculateLevel(totalXP, xpPerLevel) {
    const safeXP = Math.max(0, Number(totalXP) || 0);
    const safeXPPerLevel = Math.max(1, Number(xpPerLevel) || 100);
    return Math.floor(safeXP / safeXPPerLevel) + 1;
  }

  function calculateStreak(sessionHistoryByDate, referenceDate) {
    const history = sessionHistoryByDate || {};
    const today = referenceDate ? normalizeDate(new Date(referenceDate)) : normalizeDate(new Date());
    let streak = 0;

    for (let cursor = today; ; cursor = shiftDate(cursor, -1)) {
      const key = formatDateKey(cursor);
      if ((history[key] || 0) <= 0) break;
      streak += 1;
    }

    return streak;
  }

  function buildPeriodStats(sessionHistoryByDate, focusMinutesByDate, days, referenceDate) {
    const safeDays = Math.max(1, Number(days) || 7);
    const history = sessionHistoryByDate || {};
    const focusHistory = focusMinutesByDate || {};
    const today = referenceDate ? normalizeDate(new Date(referenceDate)) : normalizeDate(new Date());

    let totalSessions = 0;
    let activeDays = 0;
    let totalFocusMinutes = 0;
    const daily = [];

    for (let i = safeDays - 1; i >= 0; i -= 1) {
      const date = shiftDate(today, -i);
      const key = formatDateKey(date);
      const sessions = Math.max(0, Number(history[key]) || 0);
      const focusMinutes = Math.max(0, Number(focusHistory[key]) || 0);
      daily.push({ date: key, sessions, focusMinutes });
      totalSessions += sessions;
      totalFocusMinutes += focusMinutes;
      if (sessions > 0) activeDays += 1;
    }

    return {
      days: safeDays,
      totalSessions,
      activeDays,
      completionRate: Number(((activeDays / safeDays) * 100).toFixed(1)),
      averageFocusMinutes: totalSessions > 0 ? Number((totalFocusMinutes / totalSessions).toFixed(1)) : 0,
      daily,
    };
  }

  function collectBadges(streakDays, weeklySessions, totalSessions) {
    const badges = [];
    const streak = Math.max(0, Number(streakDays) || 0);
    const weekly = Math.max(0, Number(weeklySessions) || 0);
    const total = Math.max(0, Number(totalSessions) || 0);

    if (streak >= 3) {
      badges.push({ id: "streak-3", label: "3日連続", tone: "bronze" });
    }
    if (weekly >= 10) {
      badges.push({ id: "weekly-10", label: "週10回達成", tone: "silver" });
    }
    if (total >= 100) {
      badges.push({ id: "total-100", label: "100回達成", tone: "gold" });
    }

    return badges;
  }

  const PomodoroLogic = {
    formatTime,
    getDurationSeconds,
    computeNextMode,
    computeRingOffset,
    computeProgressColor,
    calculateXP,
    calculateLevel,
    calculateStreak,
    buildPeriodStats,
    collectBadges,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PomodoroLogic;
  } else {
    root.PomodoroLogic = PomodoroLogic;
  }
})(typeof window !== "undefined" ? window : globalThis);
