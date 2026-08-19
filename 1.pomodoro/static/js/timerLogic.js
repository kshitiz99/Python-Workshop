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

  const PomodoroLogic = {
    formatTime,
    getDurationSeconds,
    computeNextMode,
    computeRingOffset,
    computeProgressColor,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PomodoroLogic;
  } else {
    root.PomodoroLogic = PomodoroLogic;
  }
})(typeof window !== "undefined" ? window : globalThis);
