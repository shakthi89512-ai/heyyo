/**
 * Serene — Peaceful Minimalist Pomodoro
 * High clarity, distraction-free focus experience with Web Audio API sound synthesis.
 * Built with full defensive error handling for 100% reliable deployment on any platform.
 */

(() => {
  'use strict';

  // --- Global Safety Catchers ---
  window.addEventListener('error', (event) => {
    console.warn('Serene captured handled warning:', event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Serene captured unhandled promise:', event.reason);
  });

  // --- Safe Storage Utility (Handles private browsing / disabled storage) ---
  const safeStorage = {
    get(key, fallback = null) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const val = window.localStorage.getItem(key);
          return val !== null ? val : fallback;
        }
      } catch (e) {
        console.warn('LocalStorage read unavailable:', e);
      }
      return fallback;
    },
    set(key, value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
      } catch (e) {
        console.warn('LocalStorage write unavailable:', e);
      }
    }
  };

  // --- Configuration & Default Settings ---
  const DEFAULT_SETTINGS = {
    focusTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    customTime: 45,
    chimeEnabled: true,
    chimeVolume: 0.7,
    ambientVolume: 0.35,
    autoBreak: false,
    autoFocus: false
  };

  const STORAGE_KEYS = {
    SETTINGS: 'serene_pomodoro_settings',
    THEME: 'serene_pomodoro_theme',
    HISTORY: 'serene_pomodoro_history',
    SAVED_GOAL: 'serene_pomodoro_saved_goal'
  };

  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 150; // r=150 -> ~942.477

  const MINDFUL_QUOTES = [
    '"Do one thing with full presence, then move to the next."',
    '"Simplicity is about subtracting the obvious and adding the meaningful."',
    '"Quiet the mind, and the soul will speak."',
    '"In the midst of movement and chaos, keep stillness inside of you."',
    '"Peace comes from within. Do not seek it without."',
    '"Focus on the step in front of you, not the whole mountain."',
    '"One intentional moment can change the course of an entire day."'
  ];

  // --- Application State ---
  const state = {
    mode: 'focus', // 'focus', 'shortBreak', 'longBreak', 'custom'
    status: 'idle', // 'idle', 'running', 'paused'
    remainingSeconds: 25 * 60,
    totalDurationSeconds: 25 * 60,
    timerInterval: null,
    endTime: null,
    sessionCount: 1,
    currentGoal: '',
    settings: { ...DEFAULT_SETTINGS },
    history: [],
    ambientActive: false
  };

  // --- Audio Context & Sound Synthesizer ---
  let audioCtx = null;
  let ambientSourceNode = null;
  let ambientGainNode = null;

  function initAudioContext() {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext initialization note:', e);
    }
  }

  /**
   * Generates a warm, resonant Tibetan singing bowl chime with harmonic overtones
   */
  function playPeacefulChime() {
    if (!state.settings.chimeEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;
      const masterGain = audioCtx.createGain();
      const baseVol = Math.max(0.01, state.settings.chimeVolume);
      masterGain.gain.setValueAtTime(baseVol, now);
      masterGain.connect(audioCtx.destination);

      // Singing bowl harmonic frequencies and relative amplitudes
      const harmonics = [
        { freq: 432, gain: 0.45, decay: 4.5 },   // Fundamental root tone
        { freq: 864, gain: 0.22, decay: 3.8 },   // Octave
        { freq: 1296, gain: 0.12, decay: 3.2 },  // 5th harmonic
        { freq: 1728, gain: 0.06, decay: 2.5 },  // Warm sparkle
        { freq: 2160, gain: 0.03, decay: 1.8 }
      ];

      harmonics.forEach(({ freq, gain, decay }) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();

        const detuneOffset = (Math.random() - 0.5) * 2;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + detuneOffset, now);

        oscGain.gain.setValueAtTime(gain, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + decay + 0.1);
      });
    } catch (err) {
      console.warn('Audio playback handled note:', err);
    }
  }

  /**
   * Ambient Pink/Brown noise generator for gentle background focus
   */
  function startAmbientNoise() {
    initAudioContext();
    if (!audioCtx) return;

    try {
      if (ambientSourceNode) {
        stopAmbientNoise();
      }

      const bufferSize = 4 * audioCtx.sampleRate; // 4 seconds loop
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      ambientSourceNode = audioCtx.createBufferSource();
      ambientSourceNode.buffer = noiseBuffer;
      ambientSourceNode.loop = true;

      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(380, audioCtx.currentTime);

      ambientGainNode = audioCtx.createGain();
      const vol = Math.max(0.001, state.settings.ambientVolume * 0.4);
      ambientGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);

      ambientSourceNode.connect(lowpass);
      lowpass.connect(ambientGainNode);
      ambientGainNode.connect(audioCtx.destination);

      ambientSourceNode.start(0);
      state.ambientActive = true;
      updateAmbientButtonUI();
    } catch (err) {
      console.warn('Ambient noise handled note:', err);
    }
  }

  function stopAmbientNoise() {
    if (ambientSourceNode) {
      try {
        ambientSourceNode.stop();
        ambientSourceNode.disconnect();
      } catch (e) {}
      ambientSourceNode = null;
    }
    state.ambientActive = false;
    updateAmbientButtonUI();
  }

  function toggleAmbientNoise() {
    if (state.ambientActive) {
      stopAmbientNoise();
    } else {
      startAmbientNoise();
    }
  }

  function updateAmbientVolume(val) {
    state.settings.ambientVolume = val;
    if (ambientGainNode && audioCtx) {
      try {
        ambientGainNode.gain.setValueAtTime(val * 0.4, audioCtx.currentTime);
      } catch (e) {}
    }
  }

  // --- Safe DOM Elements Accessor ---
  const el = {};

  function initElements() {
    const ids = [
      'app', 'themeToggleBtn', 'ambientBtn', 'breatheBtn', 'historyBtn', 'settingsBtn',
      'customDurationRow', 'customMinutesInput', 'applyCustomBtn',
      'goalInputWrap', 'goalInput', 'goalDisplayWrap', 'goalDisplayText', 'editGoalBtn',
      'progressRingIndicator', 'timerDisplay', 'sessionStatusText', 'sessionCountText',
      'startPauseBtn', 'startPauseText', 'playIcon', 'pauseIcon', 'resetBtn', 'skipBtn',
      'zenQuote', 'completionNotice', 'completionTitle', 'completionMessage', 'dismissNoticeBtn',
      'settingsModal', 'settingFocus', 'settingShortBreak', 'settingLongBreak',
      'settingChimeToggle', 'settingChimeVolume', 'settingAmbientVolume',
      'settingAutoBreak', 'settingAutoFocus', 'saveSettingsBtn',
      'historyModal', 'statSessionsToday', 'statMinutesToday', 'historyList', 'clearHistoryBtn',
      'breathingModal', 'breathingPhaseText', 'closeBreathingBtn', 'themeColorMeta'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });

    el.html = document.documentElement;
    el.iconMoon = document.querySelector('.icon-moon');
    el.iconSun = document.querySelector('.icon-sun');
    el.iconSoundOff = document.querySelector('.icon-sound-off');
    el.iconSoundOn = document.querySelector('.icon-sound-on');
    el.modeBtns = document.querySelectorAll('.mode-btn') || [];
  }

  // --- Storage & Initialization ---
  function loadSavedData() {
    const savedTheme = safeStorage.get(STORAGE_KEYS.THEME);
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    const savedSettings = safeStorage.get(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      try {
        state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      } catch (e) {
        state.settings = { ...DEFAULT_SETTINGS };
      }
    }

    const savedHistory = safeStorage.get(STORAGE_KEYS.HISTORY);
    if (savedHistory) {
      try {
        state.history = JSON.parse(savedHistory) || [];
      } catch (e) {
        state.history = [];
      }
    }

    const savedGoal = safeStorage.get(STORAGE_KEYS.SAVED_GOAL, '');
    if (savedGoal && el.goalInput) {
      el.goalInput.value = savedGoal;
      state.currentGoal = savedGoal;
    }
  }

  function saveSettings() {
    safeStorage.set(STORAGE_KEYS.SETTINGS, state.settings);
  }

  function saveHistory() {
    safeStorage.set(STORAGE_KEYS.HISTORY, state.history);
  }

  // --- Theme Management ---
  function setTheme(theme) {
    if (!el.html) return;
    el.html.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      if (el.iconMoon) el.iconMoon.classList.add('hidden');
      if (el.iconSun) el.iconSun.classList.remove('hidden');
      if (el.themeColorMeta) el.themeColorMeta.setAttribute('content', '#141715');
    } else {
      if (el.iconMoon) el.iconMoon.classList.remove('hidden');
      if (el.iconSun) el.iconSun.classList.add('hidden');
      if (el.themeColorMeta) el.themeColorMeta.setAttribute('content', '#557560');
    }
    safeStorage.set(STORAGE_KEYS.THEME, theme);
  }

  function toggleTheme() {
    const current = (el.html && el.html.getAttribute('data-theme')) || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
  }

  // --- Timer Display & Progress Ring ---
  function formatTime(totalSeconds) {
    const safeSec = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateTimerUI() {
    const formatted = formatTime(state.remainingSeconds);
    if (el.timerDisplay) el.timerDisplay.textContent = formatted;

    const modeLabel = state.mode === 'focus' ? 'Focus' : 'Break';
    const goalSnippet = state.currentGoal ? ` • ${state.currentGoal}` : '';
    if (state.status === 'running') {
      document.title = `(${formatted}) ${modeLabel}${goalSnippet} — Serene`;
    } else if (state.status === 'paused') {
      document.title = `(Paused) ${formatted} — Serene`;
    } else {
      document.title = 'Serene — Peaceful Pomodoro';
    }

    if (el.progressRingIndicator) {
      const progress = state.totalDurationSeconds > 0 
        ? state.remainingSeconds / state.totalDurationSeconds 
        : 0;
      const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
      el.progressRingIndicator.style.strokeDashoffset = offset;
    }
  }

  function updateStatusText() {
    if (!el.sessionStatusText) return;
    if (state.status === 'idle') {
      el.sessionStatusText.textContent = state.mode === 'focus' 
        ? 'Ready to focus' 
        : 'Time to rest & recharge';
    } else if (state.status === 'running') {
      el.sessionStatusText.textContent = state.mode === 'focus' 
        ? 'Deep in concentration' 
        : 'Resting mindfully';
    } else if (state.status === 'paused') {
      el.sessionStatusText.textContent = 'Session paused';
    }
  }

  function updateSessionCountUI() {
    if (!el.sessionCountText) return;
    if (state.mode === 'focus') {
      el.sessionCountText.textContent = `Session ${state.sessionCount} of 4`;
    } else if (state.mode === 'shortBreak') {
      el.sessionCountText.textContent = 'Short mindful pause';
    } else if (state.mode === 'longBreak') {
      el.sessionCountText.textContent = 'Extended rejuvenation';
    } else {
      el.sessionCountText.textContent = 'Custom session';
    }
  }

  function updateAmbientButtonUI() {
    if (!el.ambientBtn) return;
    if (state.ambientActive) {
      el.ambientBtn.classList.add('active-ambient');
      if (el.iconSoundOff) el.iconSoundOff.classList.add('hidden');
      if (el.iconSoundOn) el.iconSoundOn.classList.remove('hidden');
    } else {
      el.ambientBtn.classList.remove('active-ambient');
      if (el.iconSoundOff) el.iconSoundOff.classList.remove('hidden');
      if (el.iconSoundOn) el.iconSoundOn.classList.add('hidden');
    }
  }

  // --- Goal / Intention Management ---
  function updateGoalDisplay(isRunning) {
    if (!el.goalInput) return;
    const rawGoal = el.goalInput.value.trim();
    state.currentGoal = rawGoal;
    safeStorage.set(STORAGE_KEYS.SAVED_GOAL, rawGoal);

    if (isRunning && rawGoal) {
      if (el.goalDisplayText) el.goalDisplayText.textContent = rawGoal;
      if (el.goalInputWrap) el.goalInputWrap.classList.add('hidden');
      if (el.goalDisplayWrap) el.goalDisplayWrap.classList.remove('hidden');
    } else {
      if (el.goalInputWrap) el.goalInputWrap.classList.remove('hidden');
      if (el.goalDisplayWrap) el.goalDisplayWrap.classList.add('hidden');
    }
  }

  // --- Timer Core Logic ---
  function getDurationForMode(mode) {
    switch (mode) {
      case 'focus':
        return state.settings.focusTime * 60;
      case 'shortBreak':
        return state.settings.shortBreakTime * 60;
      case 'longBreak':
        return state.settings.longBreakTime * 60;
      case 'custom':
        return (state.settings.customTime || 45) * 60;
      default:
        return 25 * 60;
    }
  }

  function setMode(newMode) {
    if (state.status === 'running') {
      pauseTimer();
    }
    state.mode = newMode;

    if (el.modeBtns) {
      el.modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === newMode);
      });
    }

    if (el.customDurationRow) {
      el.customDurationRow.classList.toggle('hidden', newMode !== 'custom');
    }

    state.totalDurationSeconds = getDurationForMode(newMode);
    state.remainingSeconds = state.totalDurationSeconds;
    state.status = 'idle';

    updateButtonStates();
    updateTimerUI();
    updateStatusText();
    updateSessionCountUI();
    updateGoalDisplay(false);
  }

  function startTimer() {
    initAudioContext();
    state.status = 'running';
    state.endTime = Date.now() + state.remainingSeconds * 1000;

    updateButtonStates();
    updateStatusText();
    updateGoalDisplay(true);

    if (state.timerInterval) clearInterval(state.timerInterval);

    state.timerInterval = setInterval(() => {
      const now = Date.now();
      const remainingMs = state.endTime - now;
      state.remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      updateTimerUI();

      if (state.remainingSeconds <= 0) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        handleSessionCompletion();
      }
    }, 200);
  }

  function pauseTimer() {
    state.status = 'paused';
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    updateButtonStates();
    updateTimerUI();
    updateStatusText();
  }

  function toggleStartPause() {
    if (state.status === 'running') {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function resetTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.status = 'idle';
    state.remainingSeconds = state.totalDurationSeconds;
    updateButtonStates();
    updateTimerUI();
    updateStatusText();
    updateGoalDisplay(false);
    hideCompletionNotice();
  }

  function skipSession() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    advanceToNextSession(false);
  }

  function updateButtonStates() {
    if (!el.startPauseText) return;
    if (state.status === 'running') {
      if (el.playIcon) el.playIcon.classList.add('hidden');
      if (el.pauseIcon) el.pauseIcon.classList.remove('hidden');
      el.startPauseText.textContent = 'Pause';
      document.body.classList.add('zen-mode');
    } else {
      if (el.playIcon) el.playIcon.classList.remove('hidden');
      if (el.pauseIcon) el.pauseIcon.classList.add('hidden');
      el.startPauseText.textContent = state.status === 'paused' ? 'Resume' : 'Begin Focus';
      document.body.classList.remove('zen-mode');
    }
  }

  // --- Session Completion Flow ---
  function handleSessionCompletion() {
    state.status = 'idle';
    updateButtonStates();
    playPeacefulChime();

    const wasFocus = state.mode === 'focus';
    const goalTitle = state.currentGoal || 'Undesignated Focus';
    const durationMins = Math.round(state.totalDurationSeconds / 60);

    if (wasFocus) {
      const historyItem = {
        id: Date.now(),
        goal: goalTitle,
        duration: durationMins,
        timestamp: new Date().toISOString()
      };
      state.history.unshift(historyItem);
      saveHistory();
      renderHistoryModal();
    }

    showCompletionNotice(wasFocus, goalTitle);
    advanceToNextSession(true);
  }

  function advanceToNextSession(fromCompletion) {
    if (state.mode === 'focus') {
      if (state.sessionCount < 4) {
        state.sessionCount++;
        setMode('shortBreak');
      } else {
        state.sessionCount = 1;
        setMode('longBreak');
      }
      if (fromCompletion && state.settings.autoBreak) {
        startTimer();
      }
    } else {
      setMode('focus');
      if (fromCompletion && state.settings.autoFocus) {
        startTimer();
      }
    }
  }

  function showCompletionNotice(wasFocus, goalTitle) {
    if (!el.completionNotice) return;
    if (wasFocus) {
      if (el.completionTitle) el.completionTitle.textContent = 'Focus Session Completed';
      if (el.completionMessage) el.completionMessage.textContent = `Completed intention: "${goalTitle}". Now give yourself grace to rest.`;
    } else {
      if (el.completionTitle) el.completionTitle.textContent = 'Break Complete';
      if (el.completionMessage) el.completionMessage.textContent = 'Your mind has rested. Feel free to resume your focus when ready.';
    }
    el.completionNotice.classList.remove('hidden');

    setTimeout(() => {
      hideCompletionNotice();
    }, 8000);
  }

  function hideCompletionNotice() {
    if (el.completionNotice) {
      el.completionNotice.classList.add('hidden');
    }
  }

  // --- History & Stats ---
  function renderHistoryModal() {
    if (!el.statSessionsToday || !el.statMinutesToday || !el.historyList) return;

    const todayStr = new Date().toDateString();
    const todaySessions = state.history.filter(item => {
      return item && item.timestamp && new Date(item.timestamp).toDateString() === todayStr;
    });

    const totalTodayMins = todaySessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    el.statSessionsToday.textContent = todaySessions.length;
    el.statMinutesToday.textContent = totalTodayMins;

    if (state.history.length === 0) {
      el.historyList.innerHTML = `
        <li class="history-empty">No sessions recorded yet today. Begin your first intention when ready.</li>
      `;
      return;
    }

    el.historyList.innerHTML = state.history.slice(0, 20).map(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <li class="history-item">
          <div class="history-item-left">
            <span class="history-item-icon">✓</span>
            <span class="history-goal-title" title="${escapeHtml(item.goal)}">${escapeHtml(item.goal)}</span>
          </div>
          <span class="history-item-time">${item.duration}m &bull; ${timeStr}</span>
        </li>
      `;
    }).join('');
  }

  function clearHistory() {
    if (confirm('Clear all completed session records?')) {
      state.history = [];
      saveHistory();
      renderHistoryModal();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Settings Form Sync ---
  function openSettingsModal() {
    if (!el.settingsModal) return;
    if (el.settingFocus) el.settingFocus.value = state.settings.focusTime;
    if (el.settingShortBreak) el.settingShortBreak.value = state.settings.shortBreakTime;
    if (el.settingLongBreak) el.settingLongBreak.value = state.settings.longBreakTime;
    if (el.settingChimeToggle) el.settingChimeToggle.checked = state.settings.chimeEnabled;
    if (el.settingChimeVolume) el.settingChimeVolume.value = Math.round(state.settings.chimeVolume * 100);
    if (el.settingAmbientVolume) el.settingAmbientVolume.value = Math.round(state.settings.ambientVolume * 100);
    if (el.settingAutoBreak) el.settingAutoBreak.checked = state.settings.autoBreak;
    if (el.settingAutoFocus) el.settingAutoFocus.checked = state.settings.autoFocus;

    el.settingsModal.classList.remove('hidden');
  }

  function applySettings() {
    if (el.settingFocus) state.settings.focusTime = Math.max(1, parseInt(el.settingFocus.value, 10) || 25);
    if (el.settingShortBreak) state.settings.shortBreakTime = Math.max(1, parseInt(el.settingShortBreak.value, 10) || 5);
    if (el.settingLongBreak) state.settings.longBreakTime = Math.max(1, parseInt(el.settingLongBreak.value, 10) || 15);
    if (el.settingChimeToggle) state.settings.chimeEnabled = el.settingChimeToggle.checked;
    if (el.settingChimeVolume) state.settings.chimeVolume = parseInt(el.settingChimeVolume.value, 10) / 100;
    if (el.settingAmbientVolume) state.settings.ambientVolume = parseInt(el.settingAmbientVolume.value, 10) / 100;
    if (el.settingAutoBreak) state.settings.autoBreak = el.settingAutoBreak.checked;
    if (el.settingAutoFocus) state.settings.autoFocus = el.settingAutoFocus.checked;

    updateAmbientVolume(state.settings.ambientVolume);
    saveSettings();

    if (state.status === 'idle') {
      state.totalDurationSeconds = getDurationForMode(state.mode);
      state.remainingSeconds = state.totalDurationSeconds;
      updateTimerUI();
    }

    if (el.settingsModal) el.settingsModal.classList.add('hidden');
  }

  // --- Breathing Guide ---
  let breathingInterval = null;
  function openBreathingModal() {
    if (!el.breathingModal) return;
    el.breathingModal.classList.remove('hidden');
    let phase = 0;
    const phases = [
      'Breathe In (4s)',
      'Hold Gently (4s)',
      'Breathe Out (4s)',
      'Rest in Stillness (4s)'
    ];
    if (el.breathingPhaseText) el.breathingPhaseText.textContent = phases[0];

    if (breathingInterval) clearInterval(breathingInterval);
    breathingInterval = setInterval(() => {
      phase = (phase + 1) % phases.length;
      if (el.breathingPhaseText) el.breathingPhaseText.textContent = phases[phase];
    }, 4000);
  }

  function closeBreathingModal() {
    if (el.breathingModal) el.breathingModal.classList.add('hidden');
    if (breathingInterval) {
      clearInterval(breathingInterval);
      breathingInterval = null;
    }
  }

  // --- Rotate Quotes Daily / on load ---
  function setupZenQuote() {
    if (!el.zenQuote) return;
    const randomQuote = MINDFUL_QUOTES[Math.floor(Math.random() * MINDFUL_QUOTES.length)];
    el.zenQuote.textContent = randomQuote;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    if (el.modeBtns) {
      el.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
      });
    }

    if (el.applyCustomBtn && el.customMinutesInput) {
      el.applyCustomBtn.addEventListener('click', () => {
        const customVal = Math.max(1, parseInt(el.customMinutesInput.value, 10) || 45);
        state.settings.customTime = customVal;
        saveSettings();
        if (state.mode === 'custom') {
          setMode('custom');
        }
      });
    }

    if (el.startPauseBtn) el.startPauseBtn.addEventListener('click', toggleStartPause);
    if (el.resetBtn) el.resetBtn.addEventListener('click', resetTimer);
    if (el.skipBtn) el.skipBtn.addEventListener('click', skipSession);

    if (el.goalInput) {
      el.goalInput.addEventListener('input', () => {
        state.currentGoal = el.goalInput.value.trim();
        safeStorage.set(STORAGE_KEYS.SAVED_GOAL, state.currentGoal);
      });

      el.goalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          el.goalInput.blur();
          if (state.status !== 'running') {
            startTimer();
          }
        }
      });
    }

    if (el.editGoalBtn) {
      el.editGoalBtn.addEventListener('click', () => {
        if (el.goalDisplayWrap) el.goalDisplayWrap.classList.add('hidden');
        if (el.goalInputWrap) el.goalInputWrap.classList.remove('hidden');
        if (el.goalInput) el.goalInput.focus();
      });
    }

    if (el.themeToggleBtn) el.themeToggleBtn.addEventListener('click', toggleTheme);
    if (el.ambientBtn) el.ambientBtn.addEventListener('click', toggleAmbientNoise);
    if (el.breatheBtn) el.breatheBtn.addEventListener('click', openBreathingModal);
    if (el.historyBtn) {
      el.historyBtn.addEventListener('click', () => {
        renderHistoryModal();
        if (el.historyModal) el.historyModal.classList.remove('hidden');
      });
    }
    if (el.settingsBtn) el.settingsBtn.addEventListener('click', openSettingsModal);

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
        if (modalId === 'breathingModal') closeBreathingModal();
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
          if (backdrop.id === 'breathingModal') closeBreathingModal();
        }
      });
    });

    if (el.saveSettingsBtn) el.saveSettingsBtn.addEventListener('click', applySettings);
    if (el.clearHistoryBtn) el.clearHistoryBtn.addEventListener('click', clearHistory);
    if (el.closeBreathingBtn) el.closeBreathingBtn.addEventListener('click', closeBreathingModal);
    if (el.dismissNoticeBtn) el.dismissNoticeBtn.addEventListener('click', hideCompletionNotice);

    if (el.settingAmbientVolume) {
      el.settingAmbientVolume.addEventListener('input', (e) => {
        updateAmbientVolume(parseInt(e.target.value, 10) / 100);
      });
    }

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleStartPause();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetTimer();
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        document.body.classList.toggle('zen-mode');
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
        closeBreathingModal();
        hideCompletionNotice();
      }
    });
  }

  // --- App Initialization with State Guard ---
  function init() {
    initElements();
    loadSavedData();
    setupEventListeners();
    setupZenQuote();
    setMode('focus');
  }

  // Handles both already-loaded DOM and pending DOM state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
