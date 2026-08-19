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

const RING_CIRCUMFERENCE = 2 * Math.PI * 90;
const DEFAULT_TITLE = document.title;
const { formatTime, getDurationSeconds, computeNextMode, computeRingOffset, computeProgressColor } = PomodoroLogic;

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

let settings = loadSettings();
let currentMode = "work";
let secondsLeft = getDurationSeconds(currentMode, settings);
let animationFrameId = null;
let targetEndTimeMs = null;
let sessionCount = loadSessionCount();
let audioCtx = null;

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

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, sessionCount }));
}

function updateDisplay(displaySeconds = Math.ceil(secondsLeft), preciseSecondsLeft = secondsLeft) {
  const formatted = formatTime(displaySeconds);
  timeLeftEl.textContent = formatted;
  const total = getDurationSeconds(currentMode, settings);
  const offset = computeRingOffset(preciseSecondsLeft, total, RING_CIRCUMFERENCE);
  ringProgressEl.style.strokeDashoffset = offset;
  ringProgressEl.style.stroke =
    currentMode === "work" ? computeProgressColor(preciseSecondsLeft, total) : MODE_META[currentMode].color;
  document.title = animationFrameId !== null ? `${formatted} - ${MODE_META[currentMode].label}` : DEFAULT_TITLE;
}

function setMode(mode) {
  stopTimer();
  currentMode = mode;
  secondsLeft = getDurationSeconds(mode, settings);
  document.body.classList.toggle("is-focus-mode", mode === "work");
  modeButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === mode);
  });
  updateDisplay();
}

function startTimer() {
  if (animationFrameId !== null) return;
  targetEndTimeMs = Date.now() + secondsLeft * 1000;
  startBtn.textContent = "Pause";
  const animate = () => {
    const remainingMs = Math.max(0, targetEndTimeMs - Date.now());
    const preciseSecondsLeft = remainingMs / 1000;
    const displaySeconds = Math.ceil(preciseSecondsLeft);

    secondsLeft = preciseSecondsLeft;
    updateDisplay(displaySeconds, preciseSecondsLeft);

    if (remainingMs <= 0) {
      stopTimer(false);
      secondsLeft = 0;
      updateDisplay(0, 0);
      playAlertSound();
      notifyCompletion();
      if (currentMode === "work") {
        sessionCount += 1;
        sessionCountEl.textContent = sessionCount;
        persistState();
      }
      setMode(computeNextMode(currentMode, sessionCount, settings));
      return;
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);
}

function stopTimer(refreshDisplay = true) {
  if (animationFrameId !== null && targetEndTimeMs !== null) {
    const remainingMs = Math.max(0, targetEndTimeMs - Date.now());
    secondsLeft = remainingMs / 1000;
  }
  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  targetEndTimeMs = null;
  startBtn.textContent = "Start";
  if (refreshDisplay) updateDisplay();
}

function toggleTimer() {
  if (animationFrameId === null) {
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
setMode(currentMode);
