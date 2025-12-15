/* ------- imports ------- */
import "./style.css";
import { state as S, alloc } from './state.js';
import {
  readRules,
  stepGeneration,
  setGenomeForSpecies,
  clearGenomes
} from './rules.js';

/* ------- DOM helpers ------- */
const $ = id => document.getElementById(id);
const canvas = $('c');
const ctx    = canvas.getContext('2d');

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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const { N, cell, grid, fade, fadeMode } = S;

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
    const p = i * S.cell;
    ctx.lineWidth = i === mid ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
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
    Math.floor((y * canvas.height) / rect.height / S.cell),
    Math.floor((x * canvas.width)  / rect.width  / S.cell)
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
const runBtn   = $('run');
const wrapBtn  = $('wrap');
const fadeBtn  = $('fade');
const makeBtn  = $('make');
const speedInp = $('speed');
const spdVal   = $('spdVal');
const labelS1  = $('labelS1');
const labelS2  = $('labelS2');
const genomeFile   = $('genomeFile');
const genomeList   = $('genomeList');
const assignG1Btn  = $('assignG1');
const assignG2Btn  = $('assignG2');
const clearGBtn    = $('clearGenomes');
const genomeStatus = $('genomeStatus');
const activeG1     = $('activeG1');
const activeG2     = $('activeG2');
const activeG1Rules = $('activeG1Rules');
const activeG2Rules = $('activeG2Rules');

let loadedGenomes = [];
const b1Input = $('b1');
const s1Input = $('s1');
const b2Input = $('b2');
const s2Input = $('s2');
const y1bInput = $('y1b');
const y1sInput = $('y1s');
const y2bInput = $('y2b');
const y2sInput = $('y2s');

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
};

stepBtn.onclick = () => stepGeneration();

let timer = null;
runBtn.onclick  = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    runBtn.textContent = 'Start';
  } else {
    timer = setInterval(stepGeneration, S.interval);
    runBtn.textContent = 'Stop';
  }
};

wrapBtn.onclick = () => {
  S.wrapEdges = !S.wrapEdges;
  wrapBtn.textContent = `Wrap: ${S.wrapEdges ? 'On' : 'Off'}`;
};

fadeBtn.onclick = () => {
  S.fadeMode = !S.fadeMode;
  fadeBtn.textContent = `Fade: ${S.fadeMode ? 'On' : 'Off'}`;
  draw();
};

speedInp.oninput = () => {
  S.interval = +speedInp.value;
  spdVal.textContent = `${S.interval} ms`;
  if (timer) {
    clearInterval(timer);
    timer = setInterval(stepGeneration, S.interval);
  }
};

/* ---------- restart / size ---------- */
makeBtn.onclick = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    runBtn.textContent = 'Start';
  }
  readRules();
  S.N = Math.max(5, +$('size').value || 50);
  canvas.height = canvas.width;
  alloc(canvas);
  draw();
};

/* ---------- genome loader ---------- */
function renderGenomeList() {
  genomeList.innerHTML = '';
  loadedGenomes.forEach((g, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${g.id ?? idx} | b:${g.birth} s:${g.survival}`;
    genomeList.appendChild(opt);
  });
  genomeStatus.textContent = loadedGenomes.length
    ? `Loaded ${loadedGenomes.length} genomes`
    : 'No genomes loaded';
}

genomeFile?.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      if (!Array.isArray(data)) throw new Error('File must be a JSON array of genomes');
      loadedGenomes = data
        .filter(g => g && typeof g.birth === 'string' && typeof g.survival === 'string')
        .map(g => ({
          id: g.id ?? 'n/a',
          birth: String(g.birth).trim(),
          survival: String(g.survival).trim()
        }));
      renderGenomeList();
    } catch (err) {
      genomeStatus.textContent = `Load error: ${err.message}`;
    }
  };
  reader.readAsText(file);
});

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
  let idx = Number(genomeList.value);
  if (!Number.isInteger(idx) || idx < 0 || idx >= loadedGenomes.length) {
    if (!loadedGenomes.length) return;
    idx = 0; // default to first if none selected
  }
  const g = loadedGenomes[idx];
  try {
    setGenomeForSpecies(species, g);
    if (species === 1) activeG1.textContent = g.id ?? 'n/a';
    else activeG2.textContent = g.id ?? 'n/a';
    if (species === 1) labelS1.innerHTML = `SPECIES<br> 1: ${g.id ?? 'n/a'}`;
    else labelS2.innerHTML = `SPECIES<br> 2: ${g.id ?? 'n/a'}`;
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
    const summary = `B ${summarize(codesB)}; S ${summarize(codesS)}`;
    if (species === 1) activeG1Rules.textContent = summary;
    else activeG2Rules.textContent = summary;
    draw(); // refresh immediately
  } catch (err) {
    genomeStatus.textContent = `Assign error: ${err.message}`;
  }
}

assignG1Btn?.addEventListener('click', () => assignGenome(1));
assignG2Btn?.addEventListener('click', () => assignGenome(2));
clearGBtn?.addEventListener('click', () => {
  clearGenomes();
  activeG1.textContent = 'n/a';
  activeG2.textContent = 'n/a';
  labelS1.innerHTML = 'SPECIES<br> 1:';
  labelS2.innerHTML = 'SPECIES<br> 2:';
  activeG1Rules.textContent = 'n/a';
  activeG2Rules.textContent = 'n/a';
});

/* ---------- initial boot ---------- */
alloc(canvas);
readRules();
draw();
requestAnimationFrame(animate);

/* ---------- expose genome loader helpers for console/UI hooks ---------- */
window.symbiont = {
  setGenomeForSpecies, // (species 1|2, {birth, survival, id?})
  clearGenomes
};
