const STORAGE_KEY = "pomodoro-state";

const DEFAULT_SETTINGS = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLongBreak: 4,
  theme: "dark",
  sounds: {
    start: true,
    end: true,
    tick: false,
  },
};

const MODE_META = {
  work: { label: "Work", color: "#d64541" },
  shortBreak: { label: "Short Break", color: "#4e9a51" },
  longBreak: { label: "Long Break", color: "#2e86c1" },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 90;
const DEFAULT_TITLE = document.title;
const { formatTime, getDurationSeconds, computeNextMode, computeRingOffset } = PomodoroLogic;

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
const settingThemeEl = document.getElementById("setting-theme");
const settingSoundStartEl = document.getElementById("setting-sound-start");
const settingSoundEndEl = document.getElementById("setting-sound-end");
const settingSoundTickEl = document.getElementById("setting-sound-tick");

const WORK_OPTIONS = [15, 25, 35, 45];
const BREAK_OPTIONS = [5, 10, 15];
const THEME_OPTIONS = ["dark", "light", "focus"];

let settings = loadSettings();
let currentMode = "work";
let secondsLeft = getDurationSeconds(currentMode, settings);
let intervalId = null;
let sessionCount = loadSessionCount();
let audioCtx = null;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.settings) {
      return {
        ...DEFAULT_SETTINGS,
        ...saved.settings,
        work: getAllowedNumber(saved.settings.work, WORK_OPTIONS, DEFAULT_SETTINGS.work),
        shortBreak: getAllowedNumber(saved.settings.shortBreak, BREAK_OPTIONS, DEFAULT_SETTINGS.shortBreak),
        longBreak: getAllowedNumber(saved.settings.longBreak, BREAK_OPTIONS, DEFAULT_SETTINGS.longBreak),
        theme: getAllowedTheme(saved.settings.theme),
        sounds: {
          ...DEFAULT_SETTINGS.sounds,
          ...(saved.settings.sounds || {}),
        },
      };
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

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, sessionCount }));
}

function getAllowedNumber(value, allowedValues, fallback) {
  const parsed = Number(value);
  return allowedValues.includes(parsed) ? parsed : fallback;
}

function getAllowedTheme(value) {
  return THEME_OPTIONS.includes(value) ? value : DEFAULT_SETTINGS.theme;
}

function applyTheme(theme) {
  const resolvedTheme = getAllowedTheme(theme);
  document.body.classList.remove("theme-dark", "theme-light", "theme-focus");
  document.body.classList.add(`theme-${resolvedTheme}`);
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
  if (secondsLeft > 0 && settings.sounds.tick) {
    playTickSound();
  }
  updateDisplay();
  if (secondsLeft <= 0) {
    stopTimer();
    playEndSound();
    notifyCompletion();
    if (currentMode === "work") {
      sessionCount += 1;
      sessionCountEl.textContent = sessionCount;
      persistState();
    }
    setMode(computeNextMode(currentMode, sessionCount, settings));
  }
}

function startTimer() {
  if (intervalId !== null) return;
  playStartSound();
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

function playTone(frequency, durationSeconds, volume) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationSeconds);
  oscillator.connect(gain).connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + durationSeconds);
}

function playStartSound() {
  if (!settings.sounds.start) return;
  playTone(660, 0.15, 0.12);
}

function playEndSound() {
  if (!settings.sounds.end) return;
  playTone(880, 0.6, 0.2);
}

function playTickSound() {
  playTone(520, 0.03, 0.015);
}

function openSettingsPanel() {
  settingWorkEl.value = settings.work;
  settingShortBreakEl.value = settings.shortBreak;
  settingLongBreakEl.value = settings.longBreak;
  settingSessionsEl.value = settings.sessionsBeforeLongBreak;
  settingThemeEl.value = settings.theme;
  settingSoundStartEl.checked = settings.sounds.start;
  settingSoundEndEl.checked = settings.sounds.end;
  settingSoundTickEl.checked = settings.sounds.tick;
  settingsPanel.hidden = !settingsPanel.hidden;
}

function saveSettings() {
  settings = {
    work: getAllowedNumber(settingWorkEl.value, WORK_OPTIONS, DEFAULT_SETTINGS.work),
    shortBreak: getAllowedNumber(settingShortBreakEl.value, BREAK_OPTIONS, DEFAULT_SETTINGS.shortBreak),
    longBreak: getAllowedNumber(settingLongBreakEl.value, BREAK_OPTIONS, DEFAULT_SETTINGS.longBreak),
    sessionsBeforeLongBreak: Math.max(1, Number(settingSessionsEl.value) || DEFAULT_SETTINGS.sessionsBeforeLongBreak),
    theme: getAllowedTheme(settingThemeEl.value),
    sounds: {
      start: settingSoundStartEl.checked,
      end: settingSoundEndEl.checked,
      tick: settingSoundTickEl.checked,
    },
  };
  persistState();
  applyTheme(settings.theme);
  settingsPanel.hidden = true;
  setMode(currentMode);
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
applyTheme(settings.theme);
updateDisplay();
