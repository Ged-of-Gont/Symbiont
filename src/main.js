/* ------- imports ------- */
import "./style.css";
import { state as S, alloc } from './state.js';
import {
  stepGeneration,
  setGenomeForSpecies,
  clearGenomes,
  setManualRulesForSpecies
} from './rules.js';

/* ------- DOM helpers ------- */
const $ = id => document.getElementById(id);
const canvas = $('c');
const ctx    = canvas.getContext('2d');
let canvasDpr = window.devicePixelRatio || 1;

const syncCanvasSize = () => {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const cssSize = rect.width || rect.height;
  if (!cssSize) return;
  const displaySize = Math.max(1, Math.round(cssSize * dpr));
  if (canvas.width !== displaySize || canvas.height !== displaySize) {
    canvas.width = displaySize;
    canvas.height = displaySize;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.cell = cssSize / S.N;
  canvasDpr = dpr;
};

/* ------- colour helper ------- */
const css = getComputedStyle(document.documentElement);
const color1 = css.getPropertyValue('--species1').trim() || '#70c559';
const color2 = css.getPropertyValue('--species2').trim() || '#f03cb1';
const hexToRgba = (hex, a) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(
    hex.slice(3, 5),
    16
  )},${parseInt(hex.slice(5, 7), 16)},${a})`;

/* ------- draw grid & cells ------- */
function draw() {
  const { N, cell, grid, fade, fadeMode } = S;
  const size = cell * N;
  const dpr = canvasDpr || 1;
  const align = value => Math.round(value * dpr) / dpr;
  ctx.clearRect(0, 0, size, size);

  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const st = grid[r][c];
      const op = fadeMode ? fade[r][c] : st ? 1 : 0;
      if (!op) continue;
      ctx.fillStyle =
        st === 1 ? hexToRgba(color1, op) : hexToRgba(color2, op);
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }

  /* grid lines with bold centre */
  ctx.strokeStyle = '#444';
  const mid = Math.floor(N / 2);
  for (let i = 0; i <= N; i++) {
    const p = align(i * cell);
    ctx.lineWidth = i === mid ? 3 / dpr : 1 / dpr;
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
  }
  ctx.lineWidth = 1 / dpr;
}

/* ------- animate fade ------- */
let lastTS = 0;
const FADE_MS = 400;

function animate(ts) {
  if (!lastTS) lastTS = ts;
  const step = (ts - lastTS) / FADE_MS;
  lastTS = ts;

  const { N, grid, fade } = S;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const target = grid[r][c] ? 1 : 0;
      if (fade[r][c] < target) fade[r][c] = Math.min(target, fade[r][c] + step);
      else if (fade[r][c] > target)
        fade[r][c] = Math.max(target, fade[r][c] - step);
    }

  draw();
  requestAnimationFrame(animate);
}

/* ---------- painting (mouse / touch) ---------- */
let painting   = false;
let paintValue = 1;               // 0 empty, 1 green, 2 red

function getCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return [
    Math.floor(y / S.cell),
    Math.floor(x / S.cell)
  ];
}

function paintCell(r, c) {
  if (r >= 0 && r < S.N && c >= 0 && c < S.N) {
    S.grid[r][c] = paintValue;
    S.fade[r][c] = 0;             // start fade‑in from 0
  }
  draw();
}

const startPaint = e => {
  painting = true;
  const [r, c] = getCellFromEvent(e);
  paintValue   = (S.grid[r][c] + 1) % 3;
  paintCell(r, c);
};
const movePaint = e => painting && paintCell(...getCellFromEvent(e));
const endPaint  = () => (painting = false);

canvas.addEventListener('mousedown', startPaint);
canvas.addEventListener('mousemove', movePaint);
canvas.addEventListener('mouseup',   endPaint);
canvas.addEventListener('mouseleave', endPaint);
canvas.addEventListener('touchstart', e => { e.preventDefault(); startPaint(e); });
canvas.addEventListener('touchmove',  e => { e.preventDefault(); movePaint(e);  });
canvas.addEventListener('touchend',   endPaint);
canvas.addEventListener('touchcancel',endPaint);

/* ---------- button handlers ---------- */
const rand1Btn = $('rand1');
const rand2Btn = $('rand2');
const randBoth = $('randBoth');
const clrBtn   = $('clear');
const stepBtn  = $('step');
const stepBackBtn = $('stepBack');
const runBtn   = $('run');
const saveBtn  = $('save');
const wrapBtn  = $('wrap');
const fadeBtn  = $('fade');
const makeBtn  = $('make');
const speedInp = $('speed');
const labelS1  = $('labelS1');
const labelS2  = $('labelS2');
const genomeList   = $('genomeList');
const assignG1Btn  = $('assignG1');
const assignG2Btn  = $('assignG2');
const clearGBtn    = $('clearGenomes');
const genomeStatus = $('genomeStatus');
const browseBtn    = $('browseBtn');
const tieSelect    = $('tie');
const bundleModal  = $('bundleModal');
const bundleSelect = $('bundleSelect');
const bundleLoad   = $('bundleLoad');
const bundleCancel = $('bundleCancel');
const bundleClose  = $('bundleClose');
const speciesRows  = document.querySelectorAll('.species-row');
const speciesRow1 = document.querySelector('.species-row[data-species="1"]');
const speciesRow2 = document.querySelector('.species-row[data-species="2"]');
const fadeHome = fadeBtn ? { parent: fadeBtn.parentNode, next: fadeBtn.nextSibling } : null;
const assignG1Home = assignG1Btn ? { parent: assignG1Btn.parentNode, next: assignG1Btn.nextSibling } : null;
const assignG2Home = assignG2Btn ? { parent: assignG2Btn.parentNode, next: assignG2Btn.nextSibling } : null;
const speedControl = speedInp?.closest('.speed-control');
const speedHome = speedControl ? { parent: speedControl.parentNode, next: speedControl.nextSibling } : null;
const speedPanel = document.querySelector('.speed-panel');
const speedPanelRow = document.getElementById('speedPanelRow');

/* ---------- icon helpers ---------- */
const ICON_BASE = `${import.meta.env.BASE_URL}svg-assets/`;
const iconHref = name => `${ICON_BASE}${name}.svg#icon`;
const ASSIGN_ICON_DESKTOP = `${ICON_BASE}assign.svg#icon`;
const ASSIGN_ICON_MOBILE = `${ICON_BASE}${encodeURIComponent('mobile assign.svg')}#icon`;
const ICON_PLAY  = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><use href="${iconHref('play')}"></use></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><use href="${iconHref('pause')}"></use></svg>`;
const snapshotName = () => {
  const fmtId = g => {
    const id = g && g.id ? String(g.id) : 'custom';
    return id.trim() ? id : 'custom';
  };
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${fmtId(S.genome1)} x ${fmtId(S.genome2)}_${yyyy}_${mm}_${dd}.jpg`;
};
const setWrapButtonState = isOn => {
  if (!wrapBtn) return;
  wrapBtn.dataset.state = isOn ? 'on' : 'off';
  wrapBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  wrapBtn.setAttribute('aria-label', `Wrap edges ${isOn ? 'on' : 'off'}`);
  if (canvas) {
    canvas.classList.toggle('wrap-unbound', isOn);
  }
};

const setRunButtonState = isRunning => {
  if (!runBtn) return;
  runBtn.dataset.state = isRunning ? 'running' : 'stopped';
  runBtn.setAttribute('aria-pressed', isRunning ? 'true' : 'false');
  runBtn.setAttribute('aria-label', isRunning ? 'Pause simulation' : 'Start simulation');
  runBtn.innerHTML = `${isRunning ? ICON_PAUSE : ICON_PLAY}`;
};

const setFadeButtonState = isOn => {
  if (!fadeBtn) return;
  const fadeLabel = `Fade: ${isOn ? 'On' : 'Off'}`;
  fadeBtn.textContent = fadeLabel;
  fadeBtn.setAttribute('data-tooltip', fadeLabel);
  fadeBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
};

const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;
const updateGenomeListSize = () => {
  if (!genomeList) return;
  genomeList.size = isMobileViewport() ? 1 : 8;
};

const positionFadeButton = () => {
  if (!fadeBtn || !fadeHome) return;
  if (isMobileViewport()) {
    const sprinkleRow = randBoth?.closest('.control-row');
    if (sprinkleRow && fadeBtn.parentNode !== sprinkleRow) {
      sprinkleRow.insertBefore(fadeBtn, randBoth?.nextSibling);
    }
  } else if (fadeBtn.parentNode !== fadeHome.parent) {
    fadeHome.parent.insertBefore(fadeBtn, fadeHome.next);
  }
};

const positionSpeedControl = () => {
  if (!speedControl || !speedHome) return;
  if (!isMobileViewport()) {
    if (speedControl.parentNode !== speedHome.parent) {
      speedHome.parent.insertBefore(speedControl, speedHome.next);
    }
    speedPanel?.classList.remove('is-active');
    return;
  }
  if (!speedPanelRow) return;
  if (speedControl.parentNode !== speedPanelRow) {
    speedPanelRow.appendChild(speedControl);
  }
  speedPanel?.classList.add('is-active');
};

const positionAssignButtons = () => {
  if (!assignG1Btn || !assignG2Btn || !assignG1Home || !assignG2Home) return;
  if (isMobileViewport()) {
    if (speciesRow1 && assignG1Btn.parentNode !== speciesRow1) {
      const toggle1 = speciesRow1.querySelector('.species-toggle');
      if (toggle1) speciesRow1.insertBefore(assignG1Btn, toggle1);
      else speciesRow1.insertBefore(assignG1Btn, speciesRow1.firstChild);
    }
    if (speciesRow2 && assignG2Btn.parentNode !== speciesRow2) {
      const toggle2 = speciesRow2.querySelector('.species-toggle');
      if (toggle2) speciesRow2.insertBefore(assignG2Btn, toggle2);
      else speciesRow2.insertBefore(assignG2Btn, speciesRow2.firstChild);
    }
    return;
  }
  if (assignG1Btn.parentNode !== assignG1Home.parent) {
    const ref = assignG1Home.next && assignG1Home.next.parentNode === assignG1Home.parent
      ? assignG1Home.next
      : null;
    assignG1Home.parent.insertBefore(assignG1Btn, ref);
  }
  if (assignG2Btn.parentNode !== assignG2Home.parent) {
    const ref = assignG2Home.next && assignG2Home.next.parentNode === assignG2Home.parent
      ? assignG2Home.next
      : null;
    assignG2Home.parent.insertBefore(assignG2Btn, ref);
  }
};

const updateAssignIconSource = () => {
  const href = isMobileViewport() ? ASSIGN_ICON_MOBILE : ASSIGN_ICON_DESKTOP;
  [assignG1Btn, assignG2Btn].forEach(btn => {
    if (!btn) return;
    const use = btn.querySelector('use');
    if (!use) return;
    use.setAttribute('href', href);
    use.setAttribute('xlink:href', href);
  });
};

const enforceMobileDefaults = () => {
  if (!isMobileViewport()) return;
  S.wrapEdges = true;
  S.fadeMode = false;
};

const ensureMobileGenomeList = () => {
  if (!isMobileViewport()) return;
  if (lastFileName === MOBILE_GENOME_FILE) return;
  loadBundledGenomes(MOBILE_GENOME_FILE);
};

const DEFAULT_GRID_SIZE_DESKTOP = 40;
const DEFAULT_GRID_SIZE_MOBILE = 16;
const updateSizeInputForMobile = () => {
  if (!sizeInput || sizeInput.dataset.userSet === 'true') return;
  const next = isMobileViewport() ? DEFAULT_GRID_SIZE_MOBILE : DEFAULT_GRID_SIZE_DESKTOP;
  sizeInput.value = String(next);
  sizeInput.setAttribute('value', String(next));
};

const setSpeciesRowOpen = (row, isOpen) => {
  row.classList.toggle('is-open', isOpen);
  const toggle = row.querySelector('.species-toggle');
  if (toggle) {
    const expanded = isMobileViewport() ? isOpen : true;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
};

speciesRows.forEach(row => {
  setSpeciesRowOpen(row, false);
  const toggle = row.querySelector('.species-toggle');
  toggle?.addEventListener('click', () => {
    if (!isMobileViewport()) return;
    setSpeciesRowOpen(row, !row.classList.contains('is-open'));
  });
});

/* ---------- history for stepping backward ---------- */
const HISTORY_LIMIT = 500;
const history = [];
const cloneGrid = grid => grid.map(row => row.slice());

const pushHistory = () => {
  history.push(cloneGrid(S.grid));
  if (history.length > HISTORY_LIMIT) history.shift();
};

const stepForward = () => {
  pushHistory();
  stepGeneration();
};

const stepBackward = () => {
  if (!history.length) return;
  if (timer) {
    clearInterval(timer);
    timer = null;
    setRunButtonState(false);
  }
  S.grid = history.pop();
  const n = S.grid.length;
  S.next = Array.from({ length: n }, () => Array(n).fill(0));
  S.fade = S.grid.map(row => row.map(cell => (cell ? 1 : 0)));
  draw();
};

let loadedGenomes = [];
let lastFileName = null;
const MOBILE_GENOME_FILE = 'mobile_genome_list.json';
// Add bundled genome files here (relative to public/). First entry is default.
const bundledGenomeFiles = [
  'master_genome_list.json',
  MOBILE_GENOME_FILE
];
const b1Input = $('b1');
const s1Input = $('s1');
const b2Input = $('b2');
const s2Input = $('s2');
const y1bInput = $('y1b');
const y1sInput = $('y1s');
const y2bInput = $('y2b');
const y2sInput = $('y2s');
// ensure rule inputs start empty to avoid misleading defaults
[b1Input, s1Input, b2Input, s2Input, y1bInput, y1sInput, y2bInput, y2sInput].forEach(inp => {
  if (inp) {
    inp.value = '';
    inp.removeAttribute('value');
  }
});

/* ---------- speed slider (log-ish, inverted: right = faster) ---------- */
const sliderMin = speedInp ? Number(speedInp.min) || 0 : 0;
const sliderMax = speedInp ? Number(speedInp.max) || 100 : 100;
const intervalMin = 50;
const intervalMax = 1000;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const logMin = Math.log(intervalMin);
const logMax = Math.log(intervalMax);
const sliderRange = sliderMax - sliderMin;
const sliderToInterval = v => {
  const t = sliderRange ? (clamp(v, sliderMin, sliderMax) - sliderMin) / sliderRange : 0;
  // log taper: more travel allocated to the faster (lower ms) end
  const logVal = logMax - t * (logMax - logMin);
  return Math.round(Math.exp(logVal));
};
const intervalToSlider = interval => {
  const clamped = clamp(interval, intervalMin, intervalMax);
  const logVal = Math.log(clamped);
  const t = (logMax - logVal) / (logMax - logMin);
  return sliderMin + t * sliderRange;
};
if (speedInp) speedInp.value = intervalToSlider(S.interval);

function clearSpeciesGenome(species) {
  if (species === 1) {
    S.genome1 = null;
    labelS1.innerHTML = 'SPECIES<br> 1: custom';
  } else {
    S.genome2 = null;
    labelS2.innerHTML = 'SPECIES<br> 2: custom';
  }
  // rebuild this species' rules from inputs so the sim follows UI edits
  setManualRulesForSpecies(species);
}

[b1Input, s1Input, y1bInput, y1sInput].forEach(inp => {
  inp?.addEventListener('input', () => clearSpeciesGenome(1));
});
[b2Input, s2Input, y2bInput, y2sInput].forEach(inp => {
  inp?.addEventListener('input', () => clearSpeciesGenome(2));
});

tieSelect?.addEventListener('change', () => {
  S.tieMode = tieSelect.value;
});

rand1Btn.onclick = () => {
  S.grid.forEach((row, r) => {
    row.forEach((_, i) => {
      if (Math.random() > 0.8) row[i] = 1;
      S.fade[r][i] = 0;
    });
  });
};

rand2Btn.onclick = () => {
  S.grid.forEach((row, r) => {
    row.forEach((_, i) => {
      if (Math.random() > 0.8) row[i] = 2;
      S.fade[r][i] = 0;
    });
  });
};


randBoth.onclick = () => {
  S.grid.forEach((row, r) => {
    row.forEach((_, i) => {
      const n = Math.random();
      row[i] = n > 0.8 ? 1 : n > 0.6 ? 2 : 0;
      S.fade[r][i] = 0;
    });
  });
};

clrBtn.onclick = () => {
  S.grid.forEach((row, r) => {
    row.fill(0);
    S.fade[r].fill(0);
  });
  history.length = 0;
  // Clearing should also halt a running simulation (same as pressing Stop)
  if (timer) {
    clearInterval(timer);
    timer = null;
    setRunButtonState(false);
  }
};

stepBtn.onclick = () => stepForward();
stepBackBtn?.addEventListener('click', stepBackward);
saveBtn?.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = snapshotName();
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  link.click();
});

let timer = null;
runBtn.onclick  = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    setRunButtonState(false);
  } else {
    timer = setInterval(stepForward, S.interval);
    setRunButtonState(true);
  }
};

wrapBtn.onclick = () => {
  S.wrapEdges = !S.wrapEdges;
  setWrapButtonState(S.wrapEdges);
};

fadeBtn.onclick = () => {
  S.fadeMode = !S.fadeMode;
  setFadeButtonState(S.fadeMode);
  draw();
};

speedInp.oninput = () => {
  S.interval = sliderToInterval(+speedInp.value);
  if (timer) {
    clearInterval(timer);
    timer = setInterval(stepForward, S.interval);
  }
};

/* ---------- restart / size ---------- */
makeBtn.onclick = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    setRunButtonState(false);
  }
  history.length = 0;
  if (tieSelect) S.tieMode = tieSelect.value;
  if (!S.genome1) setManualRulesForSpecies(1);
  if (!S.genome2) setManualRulesForSpecies(2);
  S.N = Math.max(5, +$('size').value || 50);
  syncCanvasSize();
  alloc(canvas, S.cell);
  draw();
};

/* ---------- genome loader ---------- */
function renderGenomeList() {
  genomeList.innerHTML = '';
  const usePlaceholder = isMobileViewport();
  if (usePlaceholder) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Select a genome';
    opt.disabled = true;
    opt.selected = true;
    genomeList.appendChild(opt);
  }
  loadedGenomes.forEach((g, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${g.id ?? idx} | b:${g.birth} s:${g.survival}`;
    genomeList.appendChild(opt);
  });
  if (loadedGenomes.length && !usePlaceholder) {
    genomeList.value = '0';
  }
  if (loadedGenomes.length) {
    const name = lastFileName ? `${lastFileName}` : 'bundled';
    genomeStatus.textContent = `Loaded: ${name} (${loadedGenomes.length} genomes)`;
  } else {
    genomeStatus.textContent = 'No genomes loaded';
  }
}

function populateBundleSelect() {
  if (!bundleSelect) return;
  bundleSelect.innerHTML = '';
  bundledGenomeFiles.forEach(file => {
    const opt = document.createElement('option');
    opt.value = file;
    opt.textContent = file;
    bundleSelect.appendChild(opt);
  });
}

async function loadBundledGenomes(fileName) {
  const path = fileName.startsWith('/') ? fileName : `/${fileName}`;
  genomeStatus.textContent = 'Loading bundled genomes...';
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Bundled file must be a JSON array of genomes');
    loadedGenomes = data
      .filter(g => g && typeof g.birth === 'string' && typeof g.survival === 'string')
      .map(g => ({
        id: g.id ?? 'n/a',
        birth: String(g.birth).trim(),
        survival: String(g.survival).trim()
      }));
    lastFileName = path.replace(/^\//, '');
    renderGenomeList();
  } catch (err) {
    genomeStatus.textContent = `Load error: ${err.message}`;
  } finally {
    if (bundleModal) bundleModal.classList.add('hidden');
  }
}

function openBundleModal() {
  populateBundleSelect();
  if (bundleModal) bundleModal.classList.remove('hidden');
}

browseBtn?.addEventListener('click', openBundleModal);
bundleLoad?.addEventListener('click', () => {
  const file = bundleSelect?.value || bundledGenomeFiles[0];
  loadBundledGenomes(file);
});
const closeModal = () => bundleModal?.classList.add('hidden');
bundleCancel?.addEventListener('click', closeModal);
bundleClose?.addEventListener('click', closeModal);

function pairsFromBits(bits) {
  if (typeof bits !== 'string' || bits.length !== 16) return [];
  const codes = [];
  for (let i = 0; i < 16; i += 2) codes.push(bits.slice(i, i + 2));
  return codes;
}

function decodeCountsFromBits(bits) {
  if (typeof bits !== 'string' || bits.length !== 16) return '';
  const counts = [];
  for (let i = 0; i < 16; i += 2) {
    const code = bits.slice(i, i + 2);
    if (code !== '00') counts.push((i / 2) + 1);
  }
  return counts.join(',');
}

function assignGenome(species) {
  const rawValue = genomeList.value;
  let idx = Number(rawValue);
  if (rawValue === '' || !Number.isInteger(idx) || idx < 0 || idx >= loadedGenomes.length) {
    if (!loadedGenomes.length) return;
    idx = 0; // default to first if none selected
    genomeList.value = '0';
  }
  const g = loadedGenomes[idx];
  try {
    setGenomeForSpecies(species, g);
    const idLabel = g.id ?? 'n/a';
    if (species === 1) labelS1.innerHTML = `#1:<br> ${idLabel}`;
    else labelS2.innerHTML = `#2:<br> ${idLabel}`;
    // populate inputs for this species only: self+any in own boxes, other+any in the opposite-color boxes of the same row
    const countSelfAny = bits => {
      if (typeof bits !== 'string' || bits.length !== 16) return [];
      const out = [];
      for (let i = 0; i < 16; i += 2) {
        const code = bits.slice(i, i + 2);
        if (code === '10' || code === '11') out.push((i / 2) + 1);
      }
      return out;
    };
    const countOtherAny = bits => {
      if (typeof bits !== 'string' || bits.length !== 16) return [];
      const out = [];
      for (let i = 0; i < 16; i += 2) {
        const code = bits.slice(i, i + 2);
        if (code === '01' || code === '11') out.push((i / 2) + 1);
      }
      return out;
    };
    const fmt = arr => arr.length ? arr.join(',') : '0';
    const bSelf = countSelfAny(g.birth);
    const bOther = countOtherAny(g.birth);
    const sSelf = countSelfAny(g.survival);
    const sOther = countOtherAny(g.survival);
    const vb = fmt(bSelf), vs = fmt(sSelf), voB = fmt(bOther), voS = fmt(sOther);
    if (species === 1) {
      b1Input.type = 'text'; s1Input.type = 'text'; y1bInput.type = 'text'; y1sInput.type = 'text';
      b1Input.value = vb; b1Input.setAttribute('value', vb);
      s1Input.value = vs; s1Input.setAttribute('value', vs);
      y1bInput.value = voB; y1bInput.setAttribute('value', voB);
      y1sInput.value = voS; y1sInput.setAttribute('value', voS);
      setTimeout(() => {
        b1Input.value = vb; s1Input.value = vs; y1bInput.value = voB; y1sInput.value = voS;
      }, 0);
    } else {
      b2Input.type = 'text'; s2Input.type = 'text'; y2bInput.type = 'text'; y2sInput.type = 'text';
      b2Input.value = vb; b2Input.setAttribute('value', vb);
      s2Input.value = vs; s2Input.setAttribute('value', vs);
      y2bInput.value = voB; y2bInput.setAttribute('value', voB);
      y2sInput.value = voS; y2sInput.setAttribute('value', voS);
      setTimeout(() => {
        b2Input.value = vb; s2Input.value = vs; y2bInput.value = voB; y2sInput.value = voS;
      }, 0);
    }
    // show code breakdown (split self-only, other-only, any; count '11' in both self/other buckets)
    const codesB = pairsFromBits(g.birth);
    const codesS = pairsFromBits(g.survival);
    const summarize = codes => {
      const selfOnly = [];
      const otherOnly = [];
      const any = [];
      codes.forEach((code, i) => {
        const n = i + 1;
        if (code === '10') selfOnly.push(n);
        if (code === '01') otherOnly.push(n);
        if (code === '11') { any.push(n); selfOnly.push(n); otherOnly.push(n); }
      });
      const fmt = arr => arr.length ? arr.join(',') : '-';
      return `self: ${fmt(selfOnly)} | other: ${fmt(otherOnly)} | any: ${fmt(any)}`;
    };
    draw(); // refresh immediately
  } catch (err) {
    genomeStatus.textContent = `Assign error: ${err.message}`;
  }
}

assignG1Btn?.addEventListener('click', () => assignGenome(1));
assignG2Btn?.addEventListener('click', () => assignGenome(2));
clearGBtn?.addEventListener('click', () => {
  clearGenomes();
  lastFileName = null;
  loadedGenomes = [];
  renderGenomeList();
  labelS1.innerHTML = 'SPECIES<br> 1:';
  labelS2.innerHTML = 'SPECIES<br> 2:';
  // clear fields visually
  [b1Input, s1Input, y1bInput, y1sInput].forEach(inp => { inp.value = ''; inp.setAttribute('value',''); });
  [b2Input, s2Input, y2bInput, y2sInput].forEach(inp => { inp.value = ''; inp.setAttribute('value',''); });
  genomeStatus.textContent = 'No genomes loaded';
  setManualRulesForSpecies(1);
  setManualRulesForSpecies(2);
});

/* ---------- initial boot ---------- */
// apply size input to state before alloc
const sizeInput = document.getElementById('size');
sizeInput?.addEventListener('input', () => {
  sizeInput.dataset.userSet = 'true';
});
updateSizeInputForMobile();
if (sizeInput) {
  const n = Math.max(5, +sizeInput.value || S.N);
  S.N = n;
}
updateGenomeListSize();
ensureMobileGenomeList();
positionFadeButton();
positionSpeedControl();
positionAssignButtons();
updateAssignIconSource();
enforceMobileDefaults();
syncCanvasSize();
alloc(canvas, S.cell);
history.length = 0;
setRunButtonState(false);
setWrapButtonState(S.wrapEdges);
setFadeButtonState(S.fadeMode);
setManualRulesForSpecies(1);
setManualRulesForSpecies(2);
draw();
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  syncCanvasSize();
  updateGenomeListSize();
  ensureMobileGenomeList();
  positionFadeButton();
  positionSpeedControl();
  positionAssignButtons();
  updateAssignIconSource();
  enforceMobileDefaults();
  setWrapButtonState(S.wrapEdges);
  setFadeButtonState(S.fadeMode);
  updateSizeInputForMobile();
  if (!isMobileViewport()) {
    speciesRows.forEach(row => setSpeciesRowOpen(row, false));
  }
  draw();
});

/* ---------- expose genome loader helpers for console/UI hooks ---------- */
window.symbiont = {
  setGenomeForSpecies, // (species 1|2, {birth, survival, id?})
  clearGenomes
};
