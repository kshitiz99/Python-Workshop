const STORAGE_KEY = "pomodoro-state";

const DEFAULT_SETTINGS = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLongBreak: 4,
};

const MODE_META = {
  work: { label: "Work", color: "#d64541" },
  shortBreak: { label: "Short Break", color: "#4e9a51" },
  longBreak: { label: "Long Break", color: "#2e86c1" },
};
const XP_PER_SESSION = 25;
const XP_PER_LEVEL = 100;

const RING_CIRCUMFERENCE = 2 * Math.PI * 90;
const DEFAULT_TITLE = document.title;
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
} = PomodoroLogic;

const timeLeftEl = document.getElementById("time-left");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const sessionCountEl = document.getElementById("session-count");
const ringProgressEl = document.querySelector(".timer__ring-progress");
const modeButtons = document.querySelectorAll(".mode-btn");
const settingsToggle = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const settingsSaveBtn = document.getElementById("settings-save");
const settingWorkEl = document.getElementById("setting-work");
const settingShortBreakEl = document.getElementById("setting-short-break");
const settingLongBreakEl = document.getElementById("setting-long-break");
const settingSessionsEl = document.getElementById("setting-sessions");
const xpValueEl = document.getElementById("xp-value");
const levelValueEl = document.getElementById("level-value");
const streakValueEl = document.getElementById("streak-value");
const badgeListEl = document.getElementById("badge-list");
const weeklyCompletionRateEl = document.getElementById("weekly-completion-rate");
const weeklyAvgFocusEl = document.getElementById("weekly-avg-focus");
const monthlyCompletionRateEl = document.getElementById("monthly-completion-rate");
const monthlyAvgFocusEl = document.getElementById("monthly-avg-focus");
const weeklyGraphEl = document.getElementById("weekly-graph");
const monthlyGraphEl = document.getElementById("monthly-graph");

let settings = loadSettings();
let currentMode = "work";
let secondsLeft = getDurationSeconds(currentMode, settings);
let intervalId = null;
let sessionCount = loadSessionCount();
let audioCtx = null;
let sessionHistoryByDate = loadSessionHistory();
let focusMinutesByDate = loadFocusMinutesHistory();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.settings) {
      return { ...DEFAULT_SETTINGS, ...saved.settings };
    }
  } catch (err) {
    // ignore corrupt storage
  }
  return { ...DEFAULT_SETTINGS };
}

function loadSessionCount() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Number.isInteger(saved.sessionCount) ? saved.sessionCount : 0;
  } catch (err) {
    return 0;
  }
}

function loadSessionHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && saved.sessionHistoryByDate ? saved.sessionHistoryByDate : {};
  } catch (err) {
    return {};
  }
}

function loadFocusMinutesHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && saved.focusMinutesByDate ? saved.focusMinutesByDate : {};
  } catch (err) {
    return {};
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ settings, sessionCount, sessionHistoryByDate, focusMinutesByDate }),
  );
}

function updateDisplay() {
  const formatted = formatTime(secondsLeft);
  timeLeftEl.textContent = formatted;
  const total = getDurationSeconds(currentMode, settings);
  const offset = computeRingOffset(secondsLeft, total, RING_CIRCUMFERENCE);
  ringProgressEl.style.strokeDashoffset = offset;
  document.title = intervalId !== null ? `${formatted} - ${MODE_META[currentMode].label}` : DEFAULT_TITLE;
}

function setMode(mode) {
  currentMode = mode;
  secondsLeft = getDurationSeconds(mode, settings);
  ringProgressEl.style.stroke = MODE_META[mode].color;
  modeButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === mode);
  });
  stopTimer();
  updateDisplay();
}

function tick() {
  secondsLeft -= 1;
  updateDisplay();
  if (secondsLeft <= 0) {
    stopTimer();
    playAlertSound();
    notifyCompletion();
    if (currentMode === "work") {
      sessionCount += 1;
      const todayKey = new Date().toISOString().slice(0, 10);
      sessionHistoryByDate[todayKey] = (sessionHistoryByDate[todayKey] || 0) + 1;
      focusMinutesByDate[todayKey] = (focusMinutesByDate[todayKey] || 0) + settings.work;
      sessionCountEl.textContent = sessionCount;
      persistState();
      updateGamificationViews();
    }
    setMode(computeNextMode(currentMode, sessionCount, settings));
  }
}

function startTimer() {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, 1000);
  startBtn.textContent = "Pause";
  updateDisplay();
}

function stopTimer() {
  clearInterval(intervalId);
  intervalId = null;
  startBtn.textContent = "Start";
  updateDisplay();
}

function toggleTimer() {
  if (intervalId === null) {
    startTimer();
  } else {
    stopTimer();
  }
}

function resetTimer() {
  stopTimer();
  secondsLeft = getDurationSeconds(currentMode, settings);
  updateDisplay();
}

function notifyCompletion() {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`${MODE_META[currentMode].label} session finished!`);
  }
}

function playAlertSound() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  oscillator.connect(gain).connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.6);
}

function openSettingsPanel() {
  settingWorkEl.value = settings.work;
  settingShortBreakEl.value = settings.shortBreak;
  settingLongBreakEl.value = settings.longBreak;
  settingSessionsEl.value = settings.sessionsBeforeLongBreak;
  settingsPanel.hidden = !settingsPanel.hidden;
}

function saveSettings() {
  settings = {
    work: Math.max(1, Number(settingWorkEl.value) || DEFAULT_SETTINGS.work),
    shortBreak: Math.max(1, Number(settingShortBreakEl.value) || DEFAULT_SETTINGS.shortBreak),
    longBreak: Math.max(1, Number(settingLongBreakEl.value) || DEFAULT_SETTINGS.longBreak),
    sessionsBeforeLongBreak: Math.max(1, Number(settingSessionsEl.value) || DEFAULT_SETTINGS.sessionsBeforeLongBreak),
  };
  persistState();
  settingsPanel.hidden = true;
  setMode(currentMode);
}

function renderGraph(container, stats) {
  container.innerHTML = "";
  const maxSessions = Math.max(...stats.daily.map((entry) => entry.sessions), 1);

  stats.daily.forEach((entry) => {
    const bar = document.createElement("div");
    bar.className = "stats__bar";
    bar.style.height = `${Math.max(8, (entry.sessions / maxSessions) * 100)}%`;
    bar.title = `${entry.date}: ${entry.sessions} sessions`;

    const label = document.createElement("span");
    label.className = "stats__bar-label";
    label.textContent = entry.date.slice(5).replace("-", "/");

    const value = document.createElement("span");
    value.className = "stats__bar-value";
    value.textContent = String(entry.sessions);

    const item = document.createElement("div");
    item.className = "stats__bar-item";
    item.appendChild(value);
    item.appendChild(bar);
    item.appendChild(label);
    container.appendChild(item);
  });
}

function updateGamificationViews() {
  const xp = calculateXP(sessionCount, XP_PER_SESSION);
  const level = calculateLevel(xp, XP_PER_LEVEL);
  const streak = calculateStreak(sessionHistoryByDate);
  const weeklyStats = buildPeriodStats(sessionHistoryByDate, focusMinutesByDate, 7);
  const monthlyStats = buildPeriodStats(sessionHistoryByDate, focusMinutesByDate, 30);
  const badges = collectBadges(streak, weeklyStats.totalSessions, sessionCount);

  xpValueEl.textContent = String(xp);
  levelValueEl.textContent = String(level);
  streakValueEl.textContent = String(streak);
  weeklyCompletionRateEl.textContent = `${weeklyStats.completionRate}%`;
  weeklyAvgFocusEl.textContent = `${weeklyStats.averageFocusMinutes} min`;
  monthlyCompletionRateEl.textContent = `${monthlyStats.completionRate}%`;
  monthlyAvgFocusEl.textContent = `${monthlyStats.averageFocusMinutes} min`;

  badgeListEl.innerHTML = "";
  badges.forEach((badge) => {
    const badgeEl = document.createElement("span");
    badgeEl.className = `badge badge--${badge.tone}`;
    badgeEl.textContent = badge.label;
    badgeListEl.appendChild(badgeEl);
  });
  if (badges.length === 0) {
    const emptyEl = document.createElement("span");
    emptyEl.className = "badge badge--empty";
    emptyEl.textContent = "バッジ獲得まで継続しよう";
    badgeListEl.appendChild(emptyEl);
  }

  renderGraph(weeklyGraphEl, weeklyStats);
  renderGraph(monthlyGraphEl, monthlyStats);
}

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

startBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);
settingsToggle.addEventListener("click", openSettingsPanel);
settingsSaveBtn.addEventListener("click", saveSettings);

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && event.target.tagName !== "INPUT") {
    event.preventDefault();
    toggleTimer();
  }
});

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

sessionCountEl.textContent = sessionCount;
updateDisplay();
updateGamificationViews();
