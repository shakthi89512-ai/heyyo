# Serene — Peaceful & Minimalist Pomodoro

A calm, distraction-free Pomodoro web application designed to help you focus with clarity and intention.

## ✨ Features

- **Mindful Goal Setting**: Set your focus intention before you start. As soon as you begin, your goal is pinned gracefully as your focus anchor.
- **Serene Aesthetics**: Soft warm paper / linen light theme and gentle moss/slate dark theme with zero visual clutter.
- **Customizable Durations**: Focus, Short Break, Long Break, and Custom minute inputs.
- **Zero-Dependency Audio**:
  - **Tibetan Singing Bowl**: A synthesized harmonic bell that chimes gently when a session completes (powered by the Web Audio API—no audio files to fail loading).
  - **Ambient Focus Noise**: Soft pink/brown noise generator with a lowpass filter simulating distant rain/wind to mask environmental distractions.
- **Mindful Breathing Exercise**: 4-4-4-4 Box breathing guide to ground your nervous system before starting deep work.
- **Focus / Zen Mode**: When the timer runs, extraneous navigation fades softly into the background.
- **History & Reflections**: Tracks your completed focus sessions and goals for the day.
- **Keyboard Shortcuts**:
  - `Space`: Start / Pause
  - `R`: Reset timer
  - `Z`: Toggle Zen Mode
  - `Esc`: Close modals & dialogues

## 🚀 How to Run

1. Open `index.html` directly in any web browser (Chrome, Edge, Firefox, Safari).
2. Or serve locally with any static web server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```
