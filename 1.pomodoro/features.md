# Pomodoro Timer - Feature List

## Core Timer Features
- [ ] Countdown timer displaying minutes:seconds
- [ ] Start / Pause toggle button
- [ ] Reset button (resets current mode back to its full duration)
- [ ] Circular progress ring that visually depletes as time passes
- [ ] Automatic transition/notification when time reaches 0

## Mode Management
- [ ] Three modes: Work, Short Break, Long Break
- [ ] Mode selector buttons that switch the active mode and reset the timer
- [ ] Distinct color per mode (work / short break / long break)
- [ ] Auto-cycle: after N work sessions, automatically suggest/switch to long break

## Session Tracking
- [ ] Completed session counter (increments after each finished Work session)
- [ ] Persist session count across page reloads (localStorage)
- [ ] Daily/weekly session history (optional, stretch goal)

## Notifications & Feedback
- [ ] Browser notification when a session ends
- [ ] Sound alert when a session ends
- [ ] Tab title updates with remaining time (so it's visible even when tab is unfocused)

## Settings / Customization
- [ ] Configurable durations for Work / Short Break / Long Break
- [ ] Configurable number of work sessions before a long break
- [ ] Settings persisted in localStorage (or via Flask backend API)

## Backend (Flask)
- [ ] Serve static HTML/CSS/JS via Flask routes
- [ ] (Optional) API endpoint to save/load user settings
- [ ] (Optional) API endpoint to save/load session history (e.g., JSON file or SQLite)

## UI / UX Polish
- [ ] Responsive layout for mobile/desktop
- [ ] Keyboard shortcut support (e.g., Space to start/pause)
- [ ] Visual state feedback (disabled/active button states)
