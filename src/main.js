/* ------- imports ------- */
import "./style.css";
import { state as S, alloc }          from './state.js';
import { readRules, stepGeneration }  from './rules.js';

/* ------- DOM helpers ------- */
const $ = id => document.getElementById(id);
const canvas = $('c');
const ctx    = canvas.getContext('2d');

/* ------- colour helper ------- */
const css = getComputedStyle(document.documentElement);
const color1 = css.getPropertyValue('--species1').trim();
const color2 = css.getPropertyValue('--species2').trim();
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

/* ---------- initial boot ---------- */
alloc(canvas);
readRules();
draw();
requestAnimationFrame(animate);
