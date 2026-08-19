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
    return circumference * (1 - secondsLeft / totalSeconds);
  }

  const PomodoroLogic = {
    formatTime,
    getDurationSeconds,
    computeNextMode,
    computeRingOffset,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PomodoroLogic;
  } else {
    root.PomodoroLogic = PomodoroLogic;
  }
})(typeof window !== "undefined" ? window : globalThis);
