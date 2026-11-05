/* global PitchDetector */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Data
  // ------------------------------------------------------------------

  const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  const PRESETS = {
    standard: {
      name: '标准调音',
      badge: 'STANDARD',
      description: '最常用的六弦标准音，从低音 E 到高音 E。',
      strings: [40, 45, 50, 55, 59, 64]
    },
    dropD: {
      name: 'Drop D',
      badge: 'DROP D',
      description: '只把最低的 6 弦降到 D，摇滚与金属中很常见。',
      strings: [38, 45, 50, 55, 59, 64]
    },
    halfStep: {
      name: '降半音',
      badge: 'HALF STEP',
      description: '整体比标准调音低一个半音，常用于贴合人声音域。',
      strings: [39, 44, 49, 54, 58, 63]
    },
    openG: {
      name: '开放 G',
      badge: 'OPEN G',
      description: 'D G D G B D，滑棒与布鲁斯常用的开放调弦。',
      strings: [38, 43, 50, 55, 59, 62]
    },
    dadgad: {
      name: 'DADGAD',
      badge: 'DADGAD',
      description: 'D A D G A D，适合凯尔特、指弹和色彩独特的和声。',
      strings: [38, 45, 50, 55, 57, 62]
    },
    sevenString: {
      name: '七弦标准',
      badge: '7 STRING',
      description: '七弦标准调音，从低音 B 到高音 E。',
      strings: [35, 40, 45, 50, 55, 59, 64]
    }
  };

  const DEFAULT_SETTINGS = {
    a4: 440,
    preset: 'standard',
    mode: 'auto',
    stringIndex: 0,
    haptics: true,
    deviceId: ''
  };

  const STORAGE_KEY = 'xianzhun.settings.v1';
  const HISTORY_LENGTH = 6000;
  const GAUGE_ANGLE = 140;
  const IN_TUNE_ENTER = 4.6;
  const IN_TUNE_EXIT = 6.4;
  const TRACE_COLORS = {
    flat: '#82b4e9',
    sharp: '#ee9870',
    intune: '#83d8a5'
  };

  const GUIDE_ICONS = {
    idle: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5v17M6.5 9.5v5M17.5 9.5v5M3 11v2M21 11v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    waiting: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h2m3-4v8m3-11v14m3-10v6m3-8v10m3-6h1" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
    flat: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5m0 0-5 5m5-5 5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21h14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity=".35"/></svg>',
    sharp: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14m0 0-5-5m5 5 5-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 2h14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity=".35"/></svg>',
    intune: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.3" opacity=".38"/><path d="m8.2 12.2 2.6 2.6 5.2-5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.8 21 20H3L12 3.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 9v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="17" r=".9" fill="currentColor"/></svg>'
  };

  const ACTION_ICONS = {
    idle: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    waiting: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    flat: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 16V4m0 0L5.5 8.5M10 4l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sharp: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12m0 0 4.5-4.5M10 16 5.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    intune: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10.2 3.2 3.2L15 6.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 6v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14" r=".9" fill="currentColor"/></svg>'
  };

  const MIC_ERROR_COPY = {
    unsupported: {
      title: '此浏览器无法访问麦克风',
      text: '请尝试使用最新版 Safari、Chrome 或 Edge。你仍然可以使用「试听标准音」进行对音。',
      action: '查看说明'
    },
    insecure: {
      title: '需要 HTTPS 才能使用麦克风',
      text: '当前页面不是安全连接。请通过 HTTPS 地址打开；在本机使用 localhost 不受影响。',
      action: '查看方法'
    },
    denied: {
      title: '麦克风权限被拒绝',
      text: '请在浏览器地址栏或系统设置中允许麦克风访问，然后重新尝试。',
      action: '查看方法'
    },
    notFound: {
      title: '没有检测到麦克风',
      text: '请连接可用的麦克风或音频接口，然后重新检测。',
      action: '重新检测'
    },
    busy: {
      title: '麦克风暂时不可用',
      text: '可能正被其他应用占用。关闭占用麦克风的程序后再试一次。',
      action: '重试'
    },
    unknown: {
      title: '无法连接麦克风',
      text: '请检查浏览器的麦克风权限和设备连接，然后重试。',
      action: '重试'
    }
  };

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const $ = (id) => document.getElementById(id);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getPreset() {
    return PRESETS[state.settings.preset] || PRESETS.standard;
  }

  function midiToParts(midi) {
    const index = ((Math.round(midi) % 12) + 12) % 12;
    return {
      name: NOTE_NAMES[index],
      octave: Math.floor(midi / 12) - 1
    };
  }

  function formatNote(parts) {
    return parts.name + parts.octave;
  }

  function targetFrequency(midi) {
    return state.settings.a4 * Math.pow(2, (midi - 69) / 12);
  }

  function relativeCents(frequency, target) {
    return 1200 * Math.log2(frequency / target);
  }

  function formatHz(frequency) {
    if (!Number.isFinite(frequency)) return '—';
    return frequency < 100 ? frequency.toFixed(2) : frequency.toFixed(1);
  }

  function formatSignedCents(cents) {
    const rounded = Math.round(cents);
    if (rounded === 0) return '0';
    return (rounded > 0 ? '+' : '−') + Math.abs(rounded);
  }

  function stringNumberForIndex(index) {
    return getPreset().strings.length - index;
  }

  function frequencyToMidi(frequency) {
    return Math.round(69 + 12 * Math.log2(frequency / state.settings.a4));
  }

  function loadSettings() {
    const next = Object.assign({}, DEFAULT_SETTINGS);
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && typeof stored === 'object') {
        if (Number.isFinite(Number(stored.a4))) {
          next.a4 = clamp(Math.round(Number(stored.a4)), 415, 466);
        }
        if (PRESETS[stored.preset]) next.preset = stored.preset;
        if (stored.mode === 'auto' || stored.mode === 'manual') next.mode = stored.mode;
        if (Number.isInteger(stored.stringIndex)) next.stringIndex = stored.stringIndex;
        if (typeof stored.haptics === 'boolean') next.haptics = stored.haptics;
        if (typeof stored.deviceId === 'string') next.deviceId = stored.deviceId;
      }
    } catch (error) {
      // A corrupt or unavailable localStorage should never stop the tuner.
    }

    const stringCount = PRESETS[next.preset].strings.length;
    if (next.stringIndex < 0 || next.stringIndex >= stringCount) next.stringIndex = 0;
    return next;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch (error) {
      // Private browsing modes may reject writes; tuning remains functional.
    }
  }

  // ------------------------------------------------------------------
  // DOM + state
  // ------------------------------------------------------------------

  const dom = {
    siteHeader: document.querySelector('.site-header'),
    a4Header: $('a4Header'),
    calibrationBtn: $('calibrationBtn'),
    installBtn: $('installBtn'),
    helpBtn: $('helpBtn'),
    listenState: $('listenState'),
    statusText: $('statusText'),
    levelTrack: $('levelTrack'),
    levelFill: $('levelFill'),
    gauge: $('gauge'),
    baseArc: $('baseArc'),
    progressArc: $('progressArc'),
    inTuneArc: $('inTuneArc'),
    tickGroup: $('tickGroup'),
    scaleGroup: $('scaleGroup'),
    needle: $('needle'),
    targetText: $('targetText'),
    noteDisplay: $('noteDisplay'),
    freqDisplay: $('freqDisplay'),
    centsDisplay: $('centsDisplay'),
    centsValue: $('centsValue'),
    guidance: $('guidance'),
    guideIcon: $('guideIcon'),
    guideKicker: $('guideKicker'),
    guideTitle: $('guideTitle'),
    guideText: $('guideText'),
    guideAction: $('guideAction'),
    traceCanvas: $('traceCanvas'),
    traceHint: $('traceHint'),
    listenBtn: $('listenBtn'),
    listenBtnLabel: $('listenBtnLabel'),
    listenSpinner: $('listenSpinner'),
    referenceBtn: $('referenceBtn'),
    referenceNote: $('referenceNote'),
    inlineNotice: $('inlineNotice'),
    noticeTitle: $('noticeTitle'),
    noticeText: $('noticeText'),
    noticeAction: $('noticeAction'),
    presetSelect: $('presetSelect'),
    presetBadge: $('presetBadge'),
    presetDescription: $('presetDescription'),
    modeAuto: $('modeAuto'),
    modeManual: $('modeManual'),
    modeHint: $('modeHint'),
    stringsHint: $('stringsHint'),
    stringList: $('stringList'),
    a4Side: $('a4Side'),
    openSettingsBtn: $('openSettingsBtn'),
    settingsDialog: $('settingsDialog'),
    helpDialog: $('helpDialog'),
    installDialog: $('installDialog'),
    a4Value: $('a4Value'),
    a4Range: $('a4Range'),
    a4Minus: $('a4Minus'),
    a4Plus: $('a4Plus'),
    a4Reset: $('a4Reset'),
    inputSelect: $('inputSelect'),
    micSettingHint: $('micSettingHint'),
    hapticsToggle: $('hapticsToggle'),
    resetSettingsBtn: $('resetSettingsBtn'),
    footerHelpBtn: $('footerHelpBtn'),
    footerInstallBtn: $('footerInstallBtn'),
    helpInstallBtn: $('helpInstallBtn'),
    installUrl: $('installUrl'),
    copyUrlBtn: $('copyUrlBtn'),
    copyBtnLabel: $('copyBtnLabel'),
    installNativeBtn: $('installNativeBtn'),
    toast: $('toast'),
    srStatus: $('srStatus')
  };

  const state = {
    settings: loadSettings(),
    isListening: false,
    isStarting: false,
    session: 0,
    audioContext: null,
    analyser: null,
    source: null,
    filter: null,
    silentGain: null,
    stream: null,
    detector: null,
    timeData: null,
    animationFrame: 0,
    lastAnalysisAt: 0,
    lastTraceDrawAt: 0,
    level: 0,
    activeTargetIndex: 0,
    signal: false,
    inTune: false,
    tuningState: 'idle',
    smoothedFrequency: 0,
    pitchHistory: [],
    lastPitchAt: 0,
    lastReadingWasInTune: false,
    readingVisible: false,
    displayedNoteSignature: '',
    trace: [],
    lastHapticAt: 0,
    lastListenMode: 'idle',
    noticeHandler: null,
    referenceUntil: 0,
    referenceTimer: 0,
    toneContext: null,
    referenceSource: null,
    referencePlaying: false,
    wakeLock: null,
    autoPaused: false,
    deferredInstallPrompt: null,
    toastTimer: 0,
    copyFeedbackTimer: 0,
    lastAnnouncedKey: '',
    lastTraceHint: ''
  };

  // ------------------------------------------------------------------
  // Gauge geometry
  // ------------------------------------------------------------------

  function gaugePoint(cents, radius) {
    const angle = (-90 + (clamp(cents, -50, 50) / 50) * GAUGE_ANGLE) * (Math.PI / 180);
    return {
      x: 200 + Math.cos(angle) * radius,
      y: 200 + Math.sin(angle) * radius
    };
  }

  function arcPath(fromCents, toCents, radius) {
    if (Math.abs(toCents - fromCents) < 0.01) return '';
    const from = gaugePoint(fromCents, radius);
    const to = gaugePoint(toCents, radius);
    const largeArc = Math.abs(toCents - fromCents) / 50 * GAUGE_ANGLE > 180 ? 1 : 0;
    return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  }

  function svgElement(tag, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attributes).forEach((key) => element.setAttribute(key, attributes[key]));
    return element;
  }

  function buildGauge() {
    dom.baseArc.setAttribute('d', arcPath(-50, 50, 175));
    dom.inTuneArc.setAttribute('d', arcPath(-5, 5, 175));

    const ticksFragment = document.createDocumentFragment();
    for (let cents = -50; cents <= 50; cents += 5) {
      const major = cents % 25 === 0;
      const center = cents === 0;
      const outer = gaugePoint(cents, 168);
      const inner = gaugePoint(cents, major ? 157 : 162);
      const line = svgElement('line', {
        x1: inner.x.toFixed(2),
        y1: inner.y.toFixed(2),
        x2: outer.x.toFixed(2),
        y2: outer.y.toFixed(2)
      });
      if (major) line.classList.add('is-major');
      if (center) line.classList.add('is-center');
      ticksFragment.appendChild(line);
    }
    dom.tickGroup.replaceChildren(ticksFragment);

    const scaleFragment = document.createDocumentFragment();
    [-50, -25, 0, 25, 50].forEach((cents) => {
      const point = gaugePoint(cents, 136);
      const label = svgElement('text', {
        x: point.x.toFixed(2),
        y: (point.y + 3).toFixed(2),
        'text-anchor': 'middle'
      });
      label.textContent = cents === 0 ? '0' : (cents > 0 ? '+' : '−') + Math.abs(cents);
      if (cents === 0) label.classList.add('is-center');
      scaleFragment.appendChild(label);
    });
    dom.scaleGroup.replaceChildren(scaleFragment);

    updateGaugeNeedle(0);
  }

  function updateGaugeNeedle(cents, hasSignal) {
    const angle = (clamp(cents, -50, 50) / 50) * GAUGE_ANGLE;
    dom.gauge.style.setProperty('--needle-angle', angle.toFixed(2) + 'deg');

    if (!hasSignal) {
      dom.progressArc.setAttribute('d', '');
      return;
    }

    if (Math.abs(cents) < 0.35) {
      dom.progressArc.setAttribute('d', '');
      return;
    }

    const from = Math.min(0, clamp(cents, -50, 50));
    const to = Math.max(0, clamp(cents, -50, 50));
    dom.progressArc.setAttribute('d', arcPath(from, to, 175));
  }

  // ------------------------------------------------------------------
  // UI rendering
  // ------------------------------------------------------------------

  function setStatus(text, options) {
    const opts = options || {};
    dom.statusText.textContent = text;
    dom.listenState.dataset.live = String(Boolean(opts.live));
    dom.listenState.dataset.busy = String(Boolean(opts.busy));
  }

  function setListenUI(mode) {
    state.lastListenMode = mode;
    const listening = mode === 'listening';
    const starting = mode === 'starting';
    dom.listenBtn.classList.toggle('is-listening', listening);
    dom.listenBtn.classList.toggle('is-loading', starting);
    dom.listenBtn.setAttribute('aria-pressed', String(listening));
    dom.listenBtn.setAttribute('aria-disabled', String(starting));
    dom.listenBtn.setAttribute('aria-busy', String(starting));

    if (starting) {
      dom.listenBtnLabel.textContent = '正在连接…';
    } else if (listening) {
      dom.listenBtnLabel.textContent = '暂停聆听';
    } else if (mode === 'paused') {
      dom.listenBtnLabel.textContent = '继续聆听';
    } else if (mode === 'error') {
      dom.listenBtnLabel.textContent = '重新尝试';
    } else {
      dom.listenBtnLabel.textContent = '开启麦克风';
    }
  }

  function updateLevel(rms) {
    const db = 20 * Math.log10(Math.max(rms, 1e-7));
    let normalized = clamp((db + 60) / 54, 0, 1);
    if (normalized < 0.015) normalized = 0;
    state.level = Math.max(normalized, state.level * 0.78);
    const percent = Math.round(state.level * 100);
    dom.levelFill.style.width = percent + '%';
    dom.levelTrack.setAttribute('aria-valuenow', String(percent));
  }

  function clearLevel() {
    state.level = 0;
    dom.levelFill.style.width = '0%';
    dom.levelTrack.setAttribute('aria-valuenow', '0');
  }

  function renderNote(frequency) {
    const midi = frequencyToMidi(frequency);
    const parts = midiToParts(midi);
    const signature = parts.name + parts.octave;

    if (signature === state.displayedNoteSignature) return;
    const hadPrevious = Boolean(state.displayedNoteSignature);
    state.displayedNoteSignature = signature;

    const letter = document.createElement('span');
    letter.className = 'note-letter';
    letter.textContent = parts.name.charAt(0);

    const nodes = [letter];
    const accidental = parts.name.slice(1);
    if (accidental) {
      const accidentalNode = document.createElement('span');
      accidentalNode.className = 'note-accidental';
      accidentalNode.textContent = accidental;
      nodes.push(accidentalNode);
    }

    const octave = document.createElement('span');
    octave.className = 'note-octave';
    octave.textContent = String(parts.octave);
    nodes.push(octave);

    dom.noteDisplay.replaceChildren.apply(dom.noteDisplay, nodes);

    if (hadPrevious) {
      dom.noteDisplay.classList.remove('is-popping');
      // Force the animation to restart when the detected note changes.
      void dom.noteDisplay.offsetWidth;
      dom.noteDisplay.classList.add('is-popping');
    }
  }

  function resetNoteDisplay() {
    state.displayedNoteSignature = '';
    const empty = document.createElement('span');
    empty.className = 'note-empty';
    empty.textContent = '—';
    dom.noteDisplay.replaceChildren(empty);
  }

  function updateTargetUI() {
    const preset = getPreset();
    const index = clamp(state.activeTargetIndex, 0, preset.strings.length - 1);
    const parts = midiToParts(preset.strings[index]);
    const number = stringNumberForIndex(index);
    let targetLabel;

    if (state.readingVisible) {
      targetLabel = `${number} 弦 · 目标 ${formatNote(parts)}`;
    } else if (state.settings.mode === 'manual') {
      targetLabel = `已锁定 · ${number} 弦 ${formatNote(parts)}`;
    } else if (state.isListening) {
      targetLabel = '自动识别 · 等待拨弦';
    } else {
      targetLabel = '自动识别 · 等待开启';
    }

    dom.targetText.textContent = targetLabel;
    dom.referenceNote.textContent = formatNote(parts);
    dom.referenceBtn.title = `试听第 ${number} 弦标准音 ${formatNote(parts)} · ${formatHz(targetFrequency(preset.strings[index]))} Hz`;
    dom.referenceBtn.setAttribute('aria-label', `试听第 ${number} 弦标准音 ${formatNote(parts)}`);
    syncStringUI();
  }

  function renderStrings() {
    const preset = getPreset();
    const fragment = document.createDocumentFragment();

    preset.strings.forEach((midi, index) => {
      const parts = midiToParts(midi);
      const number = preset.strings.length - index;
      const frequency = targetFrequency(midi);
      const active = index === state.activeTargetIndex;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'string-row' + (active ? ' is-active' : '');
      button.dataset.index = String(index);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute(
        'aria-label',
        `选择第 ${number} 弦，目标音 ${formatNote(parts)}，${formatHz(frequency)} 赫兹`
      );

      const indexNode = document.createElement('span');
      indexNode.className = 'string-index';
      indexNode.textContent = `${number} 弦`;

      const noteNode = document.createElement('span');
      noteNode.className = 'string-note';
      noteNode.textContent = parts.name;
      const sup = document.createElement('sup');
      sup.textContent = String(parts.octave);
      noteNode.appendChild(sup);

      const frequencyNode = document.createElement('span');
      frequencyNode.className = 'string-frequency';
      frequencyNode.textContent = formatHz(frequency) + ' Hz';

      const statusNode = document.createElement('span');
      statusNode.className = 'string-status';
      statusNode.setAttribute('aria-hidden', 'true');

      button.append(indexNode, noteNode, frequencyNode, statusNode);
      fragment.appendChild(button);
    });

    dom.stringList.replaceChildren(fragment);
    syncStringUI();
  }

  function syncStringUI() {
    const rows = dom.stringList.querySelectorAll('.string-row');
    rows.forEach((row) => {
      const index = Number(row.dataset.index);
      const active = index === state.activeTargetIndex;
      row.classList.toggle('is-active', active);
      row.classList.toggle('is-intune', active && state.signal && state.inTune);
      row.setAttribute('aria-pressed', String(active));
    });
  }

  function updatePresetUI() {
    const preset = getPreset();
    dom.presetSelect.value = state.settings.preset;
    dom.presetBadge.textContent = preset.badge;
    dom.presetDescription.textContent = preset.description;
    renderStrings();
    updateTargetUI();
  }

  function updateModeUI() {
    const isManual = state.settings.mode === 'manual';
    dom.modeAuto.classList.toggle('is-active', !isManual);
    dom.modeManual.classList.toggle('is-active', isManual);
    dom.modeAuto.setAttribute('aria-pressed', String(!isManual));
    dom.modeManual.setAttribute('aria-pressed', String(isManual));
    dom.stringsHint.textContent = isManual ? '目标已锁定' : '点击可锁定';

    if (isManual) {
      const preset = getPreset();
      const index = clamp(state.activeTargetIndex, 0, preset.strings.length - 1);
      const number = stringNumberForIndex(index);
      dom.modeHint.textContent = `已锁定 ${number} 弦 ${formatNote(midiToParts(preset.strings[index]))}。点击其他琴弦可切换目标。`;
    } else {
      dom.modeHint.textContent = '拨哪根，听哪根。也可以在下方点选琴弦。';
    }
  }

  function updateA4UI() {
    const a4 = state.settings.a4;
    dom.a4Header.textContent = String(a4);
    dom.a4Side.textContent = String(a4);
    dom.a4Value.textContent = String(a4);
    dom.a4Range.value = String(a4);
    dom.a4Range.setAttribute('aria-valuetext', a4 + ' 赫兹');
    const percent = ((a4 - 415) / (466 - 415)) * 100;
    dom.a4Range.style.setProperty('--range-progress', percent.toFixed(2) + '%');
    dom.a4Minus.disabled = a4 <= 415;
    dom.a4Plus.disabled = a4 >= 466;
  }

  function updateReferenceButton() {
    const preset = getPreset();
    const index = clamp(state.activeTargetIndex, 0, preset.strings.length - 1);
    const parts = midiToParts(preset.strings[index]);
    dom.referenceNote.textContent = formatNote(parts);
    dom.referenceBtn.classList.toggle('is-playing', state.referencePlaying);
  }

  function setGuidance(options) {
    const tone = options.tone || 'idle';
    if (dom.guidance.dataset.tone !== tone) {
      dom.guidance.dataset.tone = tone;
      dom.guideIcon.innerHTML = GUIDE_ICONS[tone] || GUIDE_ICONS.idle;
      dom.guideAction.innerHTML = ACTION_ICONS[tone] || ACTION_ICONS.idle;
    }

    if (dom.guideKicker.textContent !== options.kicker) dom.guideKicker.textContent = options.kicker;
    if (dom.guideTitle.textContent !== options.title) dom.guideTitle.textContent = options.title;
    if (dom.guideText.textContent !== options.text) dom.guideText.textContent = options.text;
  }

  function setWaitingGuidance(announce) {
    if (!state.isListening) {
      setGuidance({
        tone: 'idle',
        kicker: '麦克风待机',
        title: '先开启麦克风',
        text: '声音只在本地分析，不会上传或保存。'
      });
      return;
    }

    const preset = getPreset();
    const index = clamp(state.activeTargetIndex, 0, preset.strings.length - 1);
    const number = stringNumberForIndex(index);
    const target = formatNote(midiToParts(preset.strings[index]));

    if (state.settings.mode === 'manual') {
      setGuidance({
        tone: 'waiting',
        kicker: `已锁定 ${number} 弦`,
        title: `拨响第 ${number} 弦`,
        text: `目标音 ${target} · ${formatHz(targetFrequency(preset.strings[index]))} Hz。`
      });
      if (announce) announceToScreenReader(`麦克风正在聆听。已锁定第 ${number} 弦，目标音 ${target}。`);
    } else {
      setGuidance({
        tone: 'waiting',
        kicker: '正在聆听',
        title: '拨响任意一根琴弦',
        text: '单根拨弦，让声音持续 1–2 秒。'
      });
      if (announce) announceToScreenReader('麦克风正在聆听。请拨响一根琴弦。');
    }
  }

  function setPausedGuidance() {
    setGuidance({
      tone: 'idle',
      kicker: '已暂停聆听',
      title: '麦克风已暂停',
      text: '点击「继续聆听」回到调音。'
    });
  }

  function announceToScreenReader(message, key) {
    if (key && key === state.lastAnnouncedKey) return;
    if (key) state.lastAnnouncedKey = key;
    dom.srStatus.textContent = '';
    window.setTimeout(() => {
      dom.srStatus.textContent = message;
    }, 30);
  }

  // ------------------------------------------------------------------
  // Readings
  // ------------------------------------------------------------------

  function nearestStringIndex(frequency) {
    const strings = getPreset().strings;
    let bestIndex = 0;
    let bestDistance = Infinity;
    strings.forEach((midi, index) => {
      const distance = Math.abs(relativeCents(frequency, targetFrequency(midi)));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function clearReading(options) {
    const opts = options || {};
    state.signal = false;
    state.inTune = false;
    state.tuningState = 'idle';
    state.smoothedFrequency = 0;
    state.pitchHistory.length = 0;
    state.lastPitchAt = 0;
    state.lastReadingWasInTune = false;
    state.readingVisible = false;
    dom.gauge.dataset.signal = 'false';
    dom.gauge.dataset.state = 'idle';
    dom.centsDisplay.setAttribute('aria-hidden', 'true');
    dom.freqDisplay.textContent = state.isListening ? '等待拨弦' : '开启麦克风，开始调音';
    resetNoteDisplay();
    updateGaugeNeedle(0, false);
    syncStringUI();
    updateTargetUI();

    if (opts.resetTrace !== false) {
      state.trace.length = 0;
      dom.traceHint.textContent = state.isListening ? '等待信号' : '最近 6 秒';
      drawTrace();
    }
  }

  function handleSignalLost() {
    const wasInTune = state.lastReadingWasInTune;
    state.signal = false;
    state.inTune = false;
    state.tuningState = 'idle';
    withGaugeState('idle', false);
    dom.centsDisplay.setAttribute('aria-hidden', 'true');
    syncStringUI();

    if (wasInTune) {
      setGuidance({
        tone: 'intune',
        kicker: '刚才已调准',
        title: '再拨一次确认',
        text: '读数会保留在表盘上，方便对照。'
      });
    } else {
      setGuidance({
        tone: 'waiting',
        kicker: '声音已减弱',
        title: '再拨一次琴弦',
        text: '让声音持续 1–2 秒，读数会更稳定。'
      });
    }
  }

  function withGaugeState(tuningState, hasSignal) {
    dom.gauge.dataset.signal = String(hasSignal);
    dom.gauge.dataset.state = tuningState;
  }

  function guidanceForPitch(cents, targetIndex, frequency) {
    const preset = getPreset();
    const parts = midiToParts(preset.strings[targetIndex]);
    const number = stringNumberForIndex(targetIndex);
    const absCents = Math.abs(cents);
    const rounded = Math.round(absCents);
    const direction = cents < 0 ? '低' : '高';
    const inTune = state.inTune;

    if (inTune) {
      return {
        tone: 'intune',
        kicker: '已校准 · ±5 音分',
        title: '准了，就是这个音。',
        text: `${number} 弦 ${formatNote(parts)} · ${frequency.toFixed(2)} Hz，保持拨弦确认稳定。`
      };
    }

    if (absCents > 50) {
      const semitones = Math.max(1, Math.round(absCents / 100));
      return {
        tone: cents < 0 ? 'flat' : 'sharp',
        kicker: `${direction === '低' ? '偏低' : '偏高'}约 ${semitones} 个半音`,
        title: cents < 0 ? '继续拧紧弦钮' : '继续放松弦钮',
        text:
          cents < 0
            ? `先把第 ${number} 弦拉近 ${formatNote(parts)}，再开始微调。`
            : `先把第 ${number} 弦放松到 ${formatNote(parts)} 附近，再开始微调。`
      };
    }

    return {
      tone: cents < 0 ? 'flat' : 'sharp',
      kicker: `${direction === '低' ? '偏低' : '偏高'} ${rounded} 音分`,
      title: cents < 0 ? '轻轻拧紧弦钮' : '轻轻放松弦钮',
      text:
        cents < 0
          ? `让第 ${number} 弦再高一点点，指针会向中央靠近。`
          : `让第 ${number} 弦再低一点点，指针会向中央靠近。`
    };
  }

  function processPitch(result, now) {
    const previousSignal = state.signal;
    let previousInTune = state.inTune;
    let targetChanged = false;
    let targetIndex = state.activeTargetIndex;

    if (state.settings.mode === 'auto') {
      targetIndex = nearestStringIndex(result.frequency);
    } else {
      targetIndex = clamp(state.activeTargetIndex, 0, getPreset().strings.length - 1);
    }

    if (targetIndex !== state.activeTargetIndex) {
      targetChanged = true;
      previousInTune = false;
      state.inTune = false;
      state.lastHapticAt = 0;
      state.activeTargetIndex = targetIndex;
      state.settings.stringIndex = targetIndex;
      state.pitchHistory.length = 0;
      state.smoothedFrequency = 0;
      state.trace.length = 0;
      state.lastPitchAt = 0;
      dom.traceHint.textContent = '等待信号';
      updateTargetUI();
      updateModeUI();
      saveSettings();
    } else {
      state.settings.stringIndex = targetIndex;
    }

    const preset = getPreset();
    const target = targetFrequency(preset.strings[targetIndex]);
    state.pitchHistory.push({ t: now, frequency: result.frequency });
    while (state.pitchHistory.length && state.pitchHistory[0].t < now - 210) {
      state.pitchHistory.shift();
    }

    const frequencies = state.pitchHistory.map((entry) => entry.frequency).sort((a, b) => a - b);
    const medianFrequency = frequencies[Math.floor(frequencies.length / 2)];

    if (
      !state.smoothedFrequency ||
      Math.abs(relativeCents(medianFrequency, state.smoothedFrequency)) > 140
    ) {
      state.smoothedFrequency = medianFrequency;
    } else {
      state.smoothedFrequency += (medianFrequency - state.smoothedFrequency) * 0.6;
    }

    const frequency = state.smoothedFrequency;
    const cents = relativeCents(frequency, target);
    const absCents = Math.abs(cents);

    state.inTune = previousInTune ? absCents <= IN_TUNE_EXIT : absCents <= IN_TUNE_ENTER;
    state.tuningState = state.inTune ? 'intune' : cents < 0 ? 'flat' : 'sharp';
    state.signal = true;
    state.lastPitchAt = now;
    state.readingVisible = true;
    state.lastReadingWasInTune = state.inTune;

    withGaugeState(state.tuningState, true);
    updateGaugeNeedle(cents, true);
    renderNote(frequency);
    dom.freqDisplay.textContent = formatHz(frequency) + ' Hz';
    dom.centsValue.textContent = formatSignedCents(cents);
    dom.centsDisplay.setAttribute('aria-hidden', 'false');

    if (!previousSignal) {
      updateTargetUI();
      dom.traceHint.textContent = '最近 6 秒';
    }

    const guidance = guidanceForPitch(cents, targetIndex, frequency);
    setGuidance(guidance);

    if (!previousInTune && state.inTune) {
      if (now - state.lastHapticAt > 2000) {
        state.lastHapticAt = now;
        triggerHaptic();
      }

      const number = stringNumberForIndex(targetIndex);
      announceToScreenReader(
        `第 ${number} 弦已调准，${formatNote(midiToParts(preset.strings[targetIndex]))}。`,
        `in-tune:${targetIndex}:${Math.floor(now / 5000)}`
      );
    } else if (targetChanged || !previousSignal) {
      const number = stringNumberForIndex(targetIndex);
      const parts = midiToParts(preset.strings[targetIndex]);
      const direction = cents < 0 ? '偏低' : '偏高';
      announceToScreenReader(
        `已识别第 ${number} 弦，目标音 ${formatNote(parts)}，${direction} ${Math.round(absCents)} 音分。`,
        `signal:${targetIndex}:${state.tuningState}`
      );
    }

    syncStringUI();
    addTracePoint(now, cents, state.tuningState);
  }

  function addTracePoint(now, cents, tuningState) {
    const latest = state.trace[state.trace.length - 1];
    if (!latest || now - latest.t > 25) {
      const safeCents = state.inTune ? clamp(cents, -4, 4) : clamp(cents, -49, 49);
      state.trace.push({ t: now, cents: safeCents, state: tuningState });
    }
    while (state.trace.length && state.trace[0].t < now - HISTORY_LENGTH - 500) {
      state.trace.shift();
    }
  }

  function triggerHaptic() {
    if (!state.settings.haptics) return;
    if (typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(13);
    } catch (error) {
      // Vibration is a nice-to-have and may be blocked by the browser.
    }
  }

  // ------------------------------------------------------------------
  // Trace canvas
  // ------------------------------------------------------------------

  function drawTrace() {
    const canvas = dom.traceCanvas;
    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const mid = height / 2;
    const usableHeight = height - 8;
    const valueToY = (cents) => mid - (clamp(cents, -55, 55) / 100) * usableHeight;
    const bandTop = valueToY(5);
    const bandBottom = valueToY(-5);

    context.fillStyle = 'rgba(131, 216, 165, 0.055)';
    context.fillRect(0, bandTop, width, Math.max(2, bandBottom - bandTop));

    context.save();
    context.setLineDash([2, 5]);
    context.strokeStyle = 'rgba(234, 225, 201, 0.12)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, mid + 0.5);
    context.lineTo(width, mid + 0.5);
    context.stroke();
    context.restore();

    if (!state.trace.length) return;

    const now = performance.now();
    const cutoff = now - HISTORY_LENGTH;
    const points = state.trace.filter((point) => point.t >= cutoff);
    if (!points.length) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 1.7;

    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];
      if (current.t - previous.t > 650) continue;
      const x1 = width - ((now - previous.t) / HISTORY_LENGTH) * width;
      const x2 = width - ((now - current.t) / HISTORY_LENGTH) * width;
      if (x1 < -2 || x2 < -2) continue;
      context.strokeStyle = TRACE_COLORS[current.state] || TRACE_COLORS.flat;
      context.beginPath();
      context.moveTo(x1, valueToY(previous.cents));
      context.lineTo(x2, valueToY(current.cents));
      context.stroke();
    }

    const latest = points[points.length - 1];
    const latestX = width - ((now - latest.t) / HISTORY_LENGTH) * width;
    if (latestX >= 0) {
      context.beginPath();
      context.fillStyle = TRACE_COLORS[latest.state] || TRACE_COLORS.flat;
      context.globalAlpha = 0.9;
      context.arc(latestX, valueToY(latest.cents), 2.1, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------------
  // Microphone capture + analysis
  // ------------------------------------------------------------------

  async function requestMicrophone(deviceId) {
    const cleanConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: { ideal: 1 }
    };

    const withDevice = deviceId
      ? Object.assign({}, cleanConstraints, { deviceId: { exact: deviceId } })
      : cleanConstraints;

    try {
      return await navigator.mediaDevices.getUserMedia({ audio: withDevice, video: false });
    } catch (error) {
      if (error && error.name === 'OverconstrainedError') {
        // Some browsers reject one of the optional processing hints, and a
        // detached saved device can also vanish between sessions.
        if (deviceId && state.settings.deviceId === deviceId) {
          state.settings.deviceId = '';
          saveSettings();
        }
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (secondError) {
          throw secondError;
        }
      }
      throw error;
    }
  }

  function chooseFftSize(sampleRate) {
    if (sampleRate >= 160000) return 16384;
    if (sampleRate >= 80000) return 8192;
    return 4096;
  }

  function attachStream(stream) {
    const context = state.audioContext;
    const source = context.createMediaStreamSource(stream);
    source.connect(state.filter);
    state.source = source;
    state.stream = stream;

    const tracks = stream.getAudioTracks();
    tracks.forEach((track) => {
      track.onended = () => {
        if (state.stream !== stream || !state.isListening) return;
        stopListening({ reason: 'device-lost' });
        failMicrophone('notFound', '麦克风连接已断开', '请检查输入设备后再试一次。');
      };
    });
  }

  function releaseStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      track.onended = null;
      try {
        track.stop();
      } catch (error) {
        // Already stopped.
      }
    });
  }

  function teardownMicrophone() {
    if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = 0;
    }
    if (state.source) {
      try {
        state.source.disconnect();
      } catch (error) {
        // Ignore graphs already torn down by the browser.
      }
      state.source = null;
    }
    if (state.stream) {
      releaseStream(state.stream);
      state.stream = null;
    }
    if (state.audioContext) {
      const context = state.audioContext;
      state.audioContext = null;
      if (context.state !== 'closed') {
        context.close().catch(() => {});
      }
    }
    state.analyser = null;
    state.filter = null;
    state.silentGain = null;
    state.detector = null;
    state.timeData = null;
    state.isStarting = false;
    state.isListening = false;
  }

  function closeInputContext() {
    if (state.audioContext) {
      const context = state.audioContext;
      state.audioContext = null;
      if (context.state !== 'closed') context.close().catch(() => {});
    }
  }

  function startAnalysisLoop() {
    if (!state.isListening) return;
    if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
    state.lastAnalysisAt = 0;
    state.lastTraceDrawAt = 0;

    const loop = () => {
      if (!state.isListening) return;
      state.animationFrame = requestAnimationFrame(loop);
      const now = performance.now();

      if (now - state.lastTraceDrawAt > 100) {
        state.lastTraceDrawAt = now;
        drawTrace();
      }

      if (now - state.lastAnalysisAt < 52) return;
      state.lastAnalysisAt = now;
      if (!state.analyser || !state.detector || !state.timeData) return;

      const data = state.timeData;
      state.analyser.getFloatTimeDomainData(data);

      // Do not let the app's own reference tone register as a guitar.
      if (state.referencePlaying || now < state.referenceUntil) {
        updateLevel(simpleRms(data));
        return;
      }

      const result = state.detector.detect(data);
      updateLevel(result.rms);

      if (result.frequency) {
        processPitch(result, now);
      } else if (state.signal && now - state.lastPitchAt > 800) {
        handleSignalLost();
      }
    };

    state.animationFrame = requestAnimationFrame(loop);
  }

  function simpleRms(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  async function startListening() {
    if (state.isStarting || state.isListening) return;

    hideNotice();
    if (state.referencePlaying) stopReferenceTone(false);
    state.isStarting = true;
    state.autoPaused = false;
    state.lastAnnouncedKey = '';
    setListenUI('starting');
    setStatus('正在连接麦克风…', { busy: true });
    if (!state.readingVisible) dom.freqDisplay.textContent = '等待麦克风权限…';
    setGuidance({
      tone: 'waiting',
      kicker: '正在连接',
      title: '等待麦克风权限',
      text: '请在浏览器提示中选择「允许」。'
    });

    if (!window.isSecureContext) {
      failMicrophone('insecure');
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      failMicrophone('unsupported');
      return;
    }

    const session = ++state.session;
    let context;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('AudioContext unavailable');
      context = new AudioContextClass({ latencyHint: 'interactive' });
      state.audioContext = context;
      if (context.state === 'suspended') {
        await context.resume().catch(() => {});
      }
    } catch (error) {
      closeInputContext();
      failMicrophone('unsupported');
      return;
    }

    let stream;
    try {
      stream = await requestMicrophone(state.settings.deviceId);
    } catch (error) {
      if (session !== state.session) return;
      state.isStarting = false;
      closeInputContext();
      handleMicrophoneFailure(error);
      return;
    }

    if (session !== state.session) {
      releaseStream(stream);
      if (state.audioContext === context) closeInputContext();
      return;
    }

    try {
      const analyser = context.createAnalyser();
      analyser.fftSize = chooseFftSize(context.sampleRate);
      analyser.smoothingTimeConstant = 0;

      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 42;
      filter.Q.value = 0.58;

      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      filter.connect(analyser);
      analyser.connect(silentGain);
      silentGain.connect(context.destination);

      state.analyser = analyser;
      state.filter = filter;
      state.silentGain = silentGain;
      state.timeData = new Float32Array(analyser.fftSize);
      state.detector = new PitchDetector(context.sampleRate, {
        bufferSize: analyser.fftSize,
        minFreq: 55,
        maxFreq: 1200
      });

      attachStream(stream);
      state.isStarting = false;
      state.isListening = true;
      state.activeTargetIndex = clamp(
        state.activeTargetIndex,
        0,
        getPreset().strings.length - 1
      );
      state.lastAnnouncedKey = '';

      setListenUI('listening');
      setStatus('正在聆听', { live: true });
      clearLevel();
      clearReading({ resetTrace: true });
      setWaitingGuidance(true);
      updateTargetUI();
      startAnalysisLoop();
      requestWakeLock();
      refreshInputDevices({ enable: true, fromPermission: true });
    } catch (error) {
      releaseStream(stream);
      teardownMicrophone();
      failMicrophone('unknown');
    }
  }

  async function stopListening(options) {
    const opts = options || {};
    const wasListening = state.isListening;
    state.session += 1;
    state.isStarting = false;
    clearLevel();
    teardownMicrophone();
    releaseWakeLock();

    if (!wasListening && !opts.forceUi) return;

    state.signal = false;
    state.inTune = false;
    state.readingVisible = false;
    setListenUI('paused');
    setStatus(opts.reason === 'hidden' ? '已自动暂停' : '麦克风已暂停');
    setPausedGuidance();
    clearReading({ resetTrace: true });
    dom.freqDisplay.textContent = opts.reason === 'hidden' ? '已自动暂停' : '麦克风已暂停';
    updateTargetUI();

    if (opts.reason === 'hidden') state.autoPaused = true;
  }

  function categoryForMicError(error) {
    const name = error && error.name ? error.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return 'denied';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      return 'notFound';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
      return 'busy';
    }
    return 'unknown';
  }

  function failMicrophone(category, customTitle, customText) {
    const copy = MIC_ERROR_COPY[category] || MIC_ERROR_COPY.unknown;
    const title = customTitle || copy.title;
    const text = customText || copy.text;
    state.isStarting = false;
    setListenUI('error');
    setStatus('麦克风未连接');
    clearReading({ resetTrace: true });
    clearLevel();
    dom.freqDisplay.textContent = '麦克风未连接';
    showMicError(category, title, text);
    setGuidance({
      tone: 'error',
      kicker: '麦克风未连接',
      title: '仍可用标准音对音',
      text: '按上方提示修复后，再点「重新尝试」。'
    });
    updateTargetUI();
  }

  function handleMicrophoneFailure(error) {
    const category = categoryForMicError(error);
    const copy = MIC_ERROR_COPY[category] || MIC_ERROR_COPY.unknown;
    failMicrophone(category, copy.title, copy.text);
  }

  function showMicError(category, customTitle, customText) {
    const copy = MIC_ERROR_COPY[category] || MIC_ERROR_COPY.unknown;
    const title = customTitle || copy.title;
    const text = customText || copy.text;

    dom.noticeTitle.textContent = title;
    dom.noticeText.textContent = text;
    dom.inlineNotice.hidden = false;

    if (category === 'unsupported' || category === 'insecure' || category === 'denied') {
      dom.noticeAction.hidden = false;
      dom.noticeAction.textContent = '查看方法';
      state.noticeHandler = () => openDialog(dom.helpDialog);
    } else {
      dom.noticeAction.hidden = false;
      dom.noticeAction.textContent = '重试';
      state.noticeHandler = () => startListening();
    }
  }

  function hideNotice() {
    dom.inlineNotice.hidden = true;
    state.noticeHandler = null;
  }

  async function refreshInputDevices(options) {
    const opts = options || {};
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      dom.micSettingHint.textContent = '当前浏览器不支持选择输入设备。';
      return;
    }

    let devices = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (error) {
      dom.micSettingHint.textContent = '暂时无法读取麦克风设备列表。';
      return;
    }

    const inputs = devices.filter((device) => device.kind === 'audioinput');
    if (!inputs.length) {
      dom.inputSelect.innerHTML = '';
      const option = document.createElement('option');
      option.textContent = '未检测到输入设备';
      dom.inputSelect.appendChild(option);
      dom.inputSelect.disabled = true;
      dom.micSettingHint.textContent = '请连接麦克风或音频接口。';
      return;
    }

    const previousValue = state.settings.deviceId;
    dom.inputSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '系统默认麦克风';
    dom.inputSelect.appendChild(defaultOption);

    let foundSelected = false;
    inputs.forEach((device, index) => {
      if (!device.deviceId) return;
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `麦克风 ${index + 1}`;
      if (device.deviceId === previousValue) {
        option.selected = true;
        foundSelected = true;
      }
      dom.inputSelect.appendChild(option);
    });

    if (!foundSelected && previousValue) {
      state.settings.deviceId = '';
      saveSettings();
    }

    dom.inputSelect.disabled = false;
    dom.inputSelect.value = state.settings.deviceId || '';

    const namesVisible = inputs.some((device) => Boolean(device.label));
    if (!namesVisible) {
      dom.micSettingHint.textContent = '首次开启麦克风后，会显示完整的设备名称。';
    } else if (opts.enable) {
      dom.micSettingHint.textContent = '选择你正在使用的麦克风或音频接口。';
    } else {
      dom.micSettingHint.textContent = '选择你正在使用的麦克风或音频接口。';
    }
  }

  async function switchInputDevice(newDeviceId) {
    const previous = state.settings.deviceId;
    state.settings.deviceId = newDeviceId;
    saveSettings();

    if (!state.isListening) return;

    let stream;
    try {
      stream = await requestMicrophone(newDeviceId);
    } catch (error) {
      state.settings.deviceId = previous;
      saveSettings();
      dom.inputSelect.value = previous || '';
      dom.micSettingHint.textContent = '切换失败，继续使用原麦克风。';
      return;
    }

    if (!state.isListening || !state.filter) {
      releaseStream(stream);
      return;
    }

    if (state.stream) releaseStream(state.stream);
    if (state.source) {
      try {
        state.source.disconnect();
      } catch (error) {
        // The graph may already be disconnected.
      }
    }

    attachStream(stream);
    await refreshInputDevices({ enable: true, fromPermission: true });
    dom.micSettingHint.textContent = '已切换输入设备。';
  }

  function handleStatusAction() {
    if (state.noticeHandler) state.noticeHandler();
  }

  // ------------------------------------------------------------------
  // Reference tone
  // ------------------------------------------------------------------

  function ensureToneContext() {
    if (!state.toneContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('No audio context');
      state.toneContext = new AudioContextClass({ latencyHint: 'interactive' });
    }
    if (state.toneContext.state === 'suspended') {
      state.toneContext.resume().catch(() => {});
    }
    return state.toneContext;
  }

  function createPluckBuffer(context, frequency) {
    const sampleRate = context.sampleRate;
    const duration = 2.5;
    const length = Math.floor(sampleRate * duration);
    const buffer = context.createBuffer(1, length, sampleRate);
    const output = buffer.getChannelData(0);
    const delayLength = Math.max(3, Math.round(sampleRate / frequency));
    const delay = new Float32Array(delayLength);

    let lowpassedNoise = 0;
    for (let i = 0; i < delayLength; i++) {
      const noise = Math.random() * 2 - 1;
      lowpassedNoise = lowpassedNoise * 0.52 + noise * 0.48;
      delay[i] = lowpassedNoise;
    }

    // A touch of pick attack at the beginning.
    for (let i = 0; i < Math.min(28, delayLength); i++) {
      delay[i] += (Math.random() * 2 - 1) * 0.22 * (1 - i / 28);
    }

    const decay = Math.pow(10, -3 / (2.8 * sampleRate));
    let index = 0;
    let previous = 0;

    for (let i = 0; i < length; i++) {
      const current = delay[index];
      const next = delay[(index + 1) % delayLength];
      const filtered = 0.5 * (current + next) * decay;
      previous = previous * 0.32 + current * 0.68;
      output[i] = previous;
      delay[index] = filtered;
      index = (index + 1) % delayLength;
    }

    // Remove any slowly drifting DC before normalising so the attack and
    // release stay clean through laptop and phone speakers.
    let sum = 0;
    for (let i = 0; i < length; i++) sum += output[i];
    const mean = sum / length;
    let peak = 0;
    for (let i = 0; i < length; i++) {
      output[i] -= mean;
      const absolute = Math.abs(output[i]);
      if (absolute > peak) peak = absolute;
    }
    const normalization = peak > 0 ? 0.3 / peak : 1;
    const fadeIn = Math.min(140, Math.floor(sampleRate * 0.003));
    const fadeOut = Math.min(Math.floor(sampleRate * 0.2), length);
    for (let i = 0; i < length; i++) {
      let gain = normalization;
      if (i < fadeIn) gain *= i / fadeIn;
      if (i > length - fadeOut) gain *= (length - i) / fadeOut;
      output[i] *= gain;
    }

    return buffer;
  }

  function playReferenceTone() {
    const preset = getPreset();
    const index = clamp(state.activeTargetIndex, 0, preset.strings.length - 1);
    const frequency = targetFrequency(preset.strings[index]);
    const parts = midiToParts(preset.strings[index]);
    const number = stringNumberForIndex(index);

    let context;
    try {
      context = ensureToneContext();
    } catch (error) {
      showToast('当前浏览器无法播放参考音');
      return;
    }

    stopReferenceTone(false);

    const source = context.createBufferSource();
    source.buffer = createPluckBuffer(context, frequency);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.3;

    const gain = context.createGain();
    gain.gain.value = 0.9;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();

    state.referenceSource = source;
    state.referencePlaying = true;
    state.referenceUntil = performance.now() + 2300;
    state.referenceTimer = window.setTimeout(() => {
      state.referencePlaying = false;
      state.referenceSource = null;
      restoreStatusAfterReference();
      updateReferenceButton();
    }, 2300);

    dom.referenceBtn.classList.add('is-playing');
    setStatus(`参考音 · ${formatNote(parts)}`, { live: state.isListening });
    showToast(`正在播放第 ${number} 弦标准音 · ${formatHz(frequency)} Hz`);
    announceToScreenReader(`正在播放第 ${number} 弦标准音 ${formatNote(parts)}，${formatHz(frequency)} 赫兹。`);
  }

  function stopReferenceTone(updateUi) {
    if (state.referenceTimer) {
      window.clearTimeout(state.referenceTimer);
      state.referenceTimer = 0;
    }
    if (state.referenceSource) {
      try {
        state.referenceSource.stop();
      } catch (error) {
        // The buffer source may already have finished.
      }
      try {
        state.referenceSource.disconnect();
      } catch (error) {
        // Ignore disconnected graph.
      }
      state.referenceSource = null;
    }
    state.referencePlaying = false;
    state.referenceUntil = 0;
    dom.referenceBtn.classList.remove('is-playing');
    if (updateUi !== false) restoreStatusAfterReference();
  }

  function restoreStatusAfterReference() {
    if (state.isListening) {
      setStatus('正在聆听', { live: true });
      return;
    }
    if (state.lastListenMode === 'error') {
      setStatus('麦克风未连接');
      return;
    }
    if (state.lastListenMode === 'paused') {
      setStatus('麦克风已暂停');
      return;
    }
    setStatus('麦克风待机');
  }

  // ------------------------------------------------------------------
  // Wake lock
  // ------------------------------------------------------------------

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || document.hidden) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      state.wakeLock = lock;
      lock.addEventListener('release', () => {
        if (state.wakeLock === lock) state.wakeLock = null;
      });
    } catch (error) {
      state.wakeLock = null;
    }
  }

  function releaseWakeLock() {
    if (state.wakeLock) {
      const lock = state.wakeLock;
      state.wakeLock = null;
      lock.release().catch(() => {});
    }
  }

  // ------------------------------------------------------------------
  // Settings actions
  // ------------------------------------------------------------------

  function setA4(value, options) {
    const opts = options || {};
    const next = clamp(Math.round(Number(value) || 440), 415, 466);
    if (next === state.settings.a4 && !opts.force) {
      updateA4UI();
      return;
    }
    state.settings.a4 = next;
    if (state.referencePlaying) stopReferenceTone(true);
    saveSettings();
    updateA4UI();
    renderStrings();
    updateTargetUI();

    if (state.isListening && state.readingVisible) {
      clearReading({ resetTrace: true });
      setWaitingGuidance(false);
    }
  }

  function changePreset(presetKey) {
    if (!PRESETS[presetKey]) return;
    state.settings.preset = presetKey;
    if (state.referencePlaying) stopReferenceTone(true);
    state.settings.stringIndex = 0;
    state.activeTargetIndex = 0;
    saveSettings();
    updatePresetUI();
    updateModeUI();
    clearReading({ resetTrace: true });

    if (state.isListening) {
      setWaitingGuidance(false);
      setStatus('正在聆听', { live: true });
    }
  }

  function selectString(index) {
    const count = getPreset().strings.length;
    if (index < 0 || index >= count) return;

    state.settings.mode = 'manual';
    if (state.referencePlaying) stopReferenceTone(true);
    state.settings.stringIndex = index;
    state.activeTargetIndex = index;
    saveSettings();
    updateModeUI();
    updateTargetUI();
    clearReading({ resetTrace: true });

    if (state.isListening) {
      setWaitingGuidance(false);
      setStatus('正在聆听', { live: true });
    }
  }

  function setMode(mode) {
    if (mode !== 'auto' && mode !== 'manual') return;
    if (state.settings.mode === mode) return;

    state.settings.mode = mode;
    if (mode === 'manual') {
      state.settings.stringIndex = state.activeTargetIndex;
    }
    saveSettings();
    updateModeUI();
    updateTargetUI();

    if (state.isListening) {
      setWaitingGuidance(false);
      clearReading({ resetTrace: true });
    }
  }

  function handleA4Input(event) {
    setA4(event.target.value, { force: true });
  }

  function resetAllSettings() {
    const button = dom.resetSettingsBtn;
    if (button.dataset.confirm !== '1') {
      button.dataset.confirm = '1';
      button.textContent = '再次点击确认重置';
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.dataset.confirm = '';
        button.textContent = '重置全部设置';
      }, 3500);
      return;
    }

    button.dataset.confirm = '';
    button.textContent = '重置全部设置';
    state.settings = Object.assign({}, DEFAULT_SETTINGS, { deviceId: state.settings.deviceId });
    saveSettings();
    state.activeTargetIndex = 0;
    updateA4UI();
    updatePresetUI();
    updateModeUI();
    updateReferenceButton();
    clearReading({ resetTrace: true });
    dom.hapticsToggle.checked = true;
    if (state.isListening) setWaitingGuidance(false);
    showToast('设置已恢复默认');
  }

  // ------------------------------------------------------------------
  // Dialogs, install + misc
  // ------------------------------------------------------------------

  function refreshDialogLock() {
    const anyOpen = Array.from(document.querySelectorAll('dialog')).some((dialog) => dialog.open);
    document.documentElement.classList.toggle('has-dialog', anyOpen);
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    refreshDialogLock();
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    refreshDialogLock();
  }

  function openSettings() {
    updateA4UI();
    dom.hapticsToggle.checked = state.settings.haptics;
    refreshInputDevices({ enable: state.isListening, fromPermission: false });
    openDialog(dom.settingsDialog);
  }

  function openHelp() {
    openDialog(dom.helpDialog);
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function platformName() {
    const agent = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(agent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      return 'ios';
    }
    if (/Android/.test(agent)) return 'android';
    return 'desktop';
  }

  function markInstallPlatform() {
    const platform = platformName();
    const rows = document.querySelectorAll('.platform-row');
    rows.forEach((row, index) => {
      const rowPlatform = index === 0 ? 'ios' : index === 1 ? 'android' : 'desktop';
      row.classList.toggle('is-current', rowPlatform === platform);
      const strong = row.querySelector('strong');
      if (!strong) return;
      let badge = strong.querySelector('.platform-current');
      if (rowPlatform === platform) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'platform-current';
          badge.textContent = '当前设备';
          strong.appendChild(badge);
        }
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function prepareInstallDialog() {
    markInstallPlatform();
    dom.installUrl.textContent = window.location.href.split('#')[0];
    dom.installNativeBtn.hidden = !state.deferredInstallPrompt;
    if (isStandalone()) {
      dom.installNativeBtn.hidden = true;
    }
  }

  function openInstallDialog() {
    if (isStandalone()) {
      showToast('弦准已经在应用模式中运行');
      return;
    }

    if (state.deferredInstallPrompt) {
      triggerInstallPrompt();
      return;
    }

    prepareInstallDialog();
    openDialog(dom.installDialog);
  }

  async function triggerInstallPrompt() {
    const prompt = state.deferredInstallPrompt;
    if (!prompt) {
      prepareInstallDialog();
      openDialog(dom.installDialog);
      return;
    }

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        showToast('正在安装弦准…');
      }
    } catch (error) {
      prepareInstallDialog();
      openDialog(dom.installDialog);
    } finally {
      state.deferredInstallPrompt = null;
      dom.installNativeBtn.hidden = true;
    }
  }

  async function copyCurrentUrl() {
    const url = window.location.href.split('#')[0];
    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        copied = false;
      }
      textarea.remove();
    }

    dom.copyBtnLabel.textContent = copied ? '已复制' : '复制失败';
    dom.copyUrlBtn.classList.toggle('is-copied', copied);
    dom.copyUrlBtn.classList.toggle('is-failed', !copied);
    announceToScreenReader(copied ? '链接已复制。' : '复制失败，请手动选择地址。');
    window.clearTimeout(state.copyFeedbackTimer);
    state.copyFeedbackTimer = window.setTimeout(() => {
      dom.copyBtnLabel.textContent = '复制';
      dom.copyUrlBtn.classList.remove('is-copied', 'is-failed');
    }, 2200);
  }

  function showToast(message, duration) {
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add('is-visible');
    state.toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove('is-visible');
    }, duration || 2600);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (state.isListening) {
        stopListening({ reason: 'hidden' });
      }
      if (state.referencePlaying) stopReferenceTone(true);
      releaseWakeLock();
      return;
    }

    if (state.isListening) requestWakeLock();
    if (state.autoPaused) {
      state.autoPaused = false;
      setStatus('已自动暂停');
      setPausedGuidance();
    }
  }

  function resumeAudioContextsOnGesture() {
    if (state.audioContext && state.audioContext.state === 'suspended' && state.isListening) {
      state.audioContext.resume().catch(() => {});
    }
    if (state.toneContext && state.toneContext.state === 'suspended') {
      state.toneContext.resume().catch(() => {});
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.protocol !== 'http:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Offline support is progressive enhancement.
      });
    });
  }

  // ------------------------------------------------------------------
  // Events + boot
  // ------------------------------------------------------------------

  function bindEvents() {
    dom.listenBtn.addEventListener('click', () => {
      if (state.isStarting) return;
      if (state.isListening) stopListening();
      else startListening();
    });

    dom.referenceBtn.addEventListener('click', playReferenceTone);
    dom.noticeAction.addEventListener('click', handleStatusAction);

    dom.presetSelect.addEventListener('change', (event) => changePreset(event.target.value));
    dom.modeAuto.addEventListener('click', () => setMode('auto'));
    dom.modeManual.addEventListener('click', () => setMode('manual'));
    dom.stringList.addEventListener('click', (event) => {
      const button = event.target.closest('.string-row');
      if (!button) return;
      selectString(Number(button.dataset.index));
    });

    dom.calibrationBtn.addEventListener('click', openSettings);
    dom.openSettingsBtn.addEventListener('click', openSettings);
    dom.helpBtn.addEventListener('click', openHelp);
    dom.footerHelpBtn.addEventListener('click', openHelp);
    dom.installBtn.addEventListener('click', openInstallDialog);
    dom.footerInstallBtn.addEventListener('click', openInstallDialog);
    dom.helpInstallBtn.addEventListener('click', () => {
      closeDialog(dom.helpDialog);
      if (state.deferredInstallPrompt) triggerInstallPrompt();
      else {
        prepareInstallDialog();
        openDialog(dom.installDialog);
      }
    });

    dom.a4Range.addEventListener('input', handleA4Input);
    dom.a4Range.addEventListener('change', handleA4Input);
    dom.a4Minus.addEventListener('click', () => setA4(state.settings.a4 - 1));
    dom.a4Plus.addEventListener('click', () => setA4(state.settings.a4 + 1));
    dom.a4Reset.addEventListener('click', () => setA4(440));
    dom.hapticsToggle.addEventListener('change', (event) => {
      state.settings.haptics = event.target.checked;
      saveSettings();
    });
    dom.inputSelect.addEventListener('change', (event) => {
      switchInputDevice(event.target.value);
    });
    dom.resetSettingsBtn.addEventListener('click', resetAllSettings);

    document.querySelectorAll('[data-close-dialog]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(button.closest('dialog')));
    });

    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('close', refreshDialogLock);
      dialog.addEventListener('cancel', () => {
        window.setTimeout(refreshDialogLock, 0);
      });
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        if (!inside) closeDialog(dialog);
      });
    });

    document.querySelectorAll('[data-open-settings]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        closeDialog(link.closest('dialog'));
        openSettings();
      });
    });

    dom.copyUrlBtn.addEventListener('click', copyCurrentUrl);
    dom.installNativeBtn.addEventListener('click', triggerInstallPrompt);

    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        refreshInputDevices({ enable: state.isListening });
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pointerdown', resumeAudioContextsOnGesture, { passive: true });
    document.addEventListener('keydown', (event) => {
      const tag = (event.target && event.target.tagName) || '';
      if (/INPUT|SELECT|TEXTAREA/.test(tag)) return;
      if (event.key === '?' && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        openHelp();
      }
    });

    window.addEventListener('resize', drawTrace);

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      dom.installNativeBtn.hidden = false;
      if (dom.installDialog.open) dom.installNativeBtn.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
      state.deferredInstallPrompt = null;
      closeDialog(dom.installDialog);
      showToast('弦准已安装到你的设备');
      dom.installBtn.hidden = true;
      dom.footerInstallBtn.hidden = true;
    });

    window.addEventListener('pagehide', () => {
      stopReferenceTone(false);
      if (state.isListening) {
        state.session += 1;
        teardownMicrophone();
        releaseWakeLock();
      }
    });
  }

  function initialize() {
    if (typeof PitchDetector !== 'function') {
      setStatus('浏览器版本过旧');
      setGuidance({
        tone: 'error',
        kicker: '需要新版本浏览器',
        title: '无法启动声音分析',
        text: '请更新 Safari、Chrome 或 Edge 后再打开。'
      });
      return;
    }

    state.activeTargetIndex = clamp(
      state.settings.stringIndex,
      0,
      getPreset().strings.length - 1
    );

    buildGauge();

    Object.keys(PRESETS).forEach((key) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = PRESETS[key].name;
      dom.presetSelect.appendChild(option);
    });

    dom.presetSelect.value = state.settings.preset;
    dom.hapticsToggle.checked = state.settings.haptics;

    updateA4UI();
    updatePresetUI();
    updateModeUI();
    updateReferenceButton();
    resetNoteDisplay();
    updateGaugeNeedle(0, false);
    withGaugeState('idle', false);
    setListenUI('idle');
    setStatus('麦克风待机');
    setGuidance({
      tone: 'idle',
      kicker: '麦克风待机',
      title: '先开启麦克风',
      text: '声音只在本地分析，不会上传或保存。'
    });
    dom.freqDisplay.textContent = '开启麦克风，开始调音';
    dom.traceHint.textContent = '最近 6 秒';
    markInstallPlatform();
    refreshInputDevices({ enable: false });
    bindEvents();
    registerServiceWorker();
    drawTrace();

    if (isStandalone()) {
      dom.installBtn.hidden = true;
      dom.footerInstallBtn.hidden = true;
    }
  }

  initialize();
})();
