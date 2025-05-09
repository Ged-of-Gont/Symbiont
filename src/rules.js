// src/rules.js
import { state as S } from './state.js';

/* ---------- helpers ---------- */
export function parseRule(str) {
  const set = new Set();
  str.split(',').forEach(tok => {
    if (!tok) return;
    if (tok.includes('-')) {
      const [a, b] = tok.split('-').map(Number);
      for (let i = a; i <= b; i++) set.add(i);
    } else {
      set.add(+tok);
    }
  });
  return set;
}

function neigh(r, c, type) {
  let n = 0;
  const { N, grid, wrapEdges } = S;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      let rr = r + dr,
        cc = c + dc;
      if (wrapEdges) {
        rr = (rr + N) % N;
        cc = (cc + N) % N;
      }
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && grid[rr][cc] === type) n++;
    }
  }
  return n;
}

/* ---------- UI → state ---------- */
export function readRules() {
  const $ = id => document.getElementById(id);
  S.B1 = parseRule($('b1').value);
  S.S1 = parseRule($('s1').value);
  S.B2 = parseRule($('b2').value);
  S.S2 = parseRule($('s2').value);

  S.Y1b = +$('y1b').value;
  S.Y1s = +$('y1s').value;
  S.Y2b = +$('y2b').value;
  S.Y2s = +$('y2s').value;
  S.tieMode = $('tie').value;
}

/* ---------- one generation ---------- */
export function stepGeneration() {
  const {
    N,
    grid,
    next,
    B1,
    S1,
    B2,
    S2,
    Y1b,
    Y1s,
    Y2b,
    Y2s,
    tieMode
  } = S;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const state = grid[r][c];
      const n1 = neigh(r, c, 1);
      const n2 = neigh(r, c, 2);

      /* survival */
      if (state === 1) {
        next[r][c] = S1.has(n1) && n2 >= Y1s ? 1 : 0;
        continue;
      }
      if (state === 2) {
        next[r][c] = S2.has(n2) && n1 >= Y2s ? 2 : 0;
        continue;
      }

      /* birth */
      const greenOK = B1.has(n1) && n2 >= Y1b;
      const redOK   = B2.has(n2) && n1 >= Y2b;

      if (greenOK && !redOK) next[r][c] = 1;
      else if (redOK && !greenOK) next[r][c] = 2;
      else if (greenOK && redOK) {
        switch (tieMode) {
          case 's1':   next[r][c] = 1; break;
          case 's2':   next[r][c] = 2; break;
          case 'rand': next[r][c] = Math.random() < 0.5 ? 1 : 2; break;
          default:     next[r][c] = 0;
        }
      } else {
        next[r][c] = 0;
      }
    }
  }
  /* swap buffers */
  S.grid = next;
  S.next = grid;
}
