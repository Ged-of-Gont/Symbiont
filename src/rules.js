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

/* ---------- evolver genome helpers ---------- */
function pairsFromBits(bits) {
  if (typeof bits !== 'string' || bits.length !== 16 || /[^01]/.test(bits)) {
    throw new Error('Genome bits must be a 16-character 0/1 string.');
  }
  const codes = [];
  for (let i = 0; i < 16; i += 2) codes.push(bits.slice(i, i + 2)); // counts 1..8
  return codes;
}

function allowByCode(code, nSelf, nOther) {
  const total = nSelf + nOther;
  if (total < 1 || total > 8) return false;
  switch (code) {
    case '10': return nSelf === total && nOther === 0;   // self only
    case '01': return nOther === total && nSelf === 0;   // other only
    case '11': return true;                              // any mix summing to total
    default:   return false;                             // '00' or unknown
  }
}

export function setGenomeForSpecies(species, genome) {
  if (species !== 1 && species !== 2) throw new Error('species must be 1 or 2');
  if (!genome || typeof genome.birth !== 'string' || typeof genome.survival !== 'string') {
    throw new Error('genome must include birth and survival bit strings');
  }
  const birthCodes = pairsFromBits(genome.birth);
  const survCodes  = pairsFromBits(genome.survival);
  if (species === 1) {
    S.genome1 = genome;
    S.rules1Birth = birthCodes;
    S.rules1Surv  = survCodes;
  } else {
    S.genome2 = genome;
    S.rules2Birth = birthCodes;
    S.rules2Surv  = survCodes;
  }
}

export function clearGenomes() {
  S.genome1 = S.genome2 = null;
  S.rules1Birth = S.rules1Surv = null;
  S.rules2Birth = S.rules2Surv = null;
}

/* ---------- UI → state ---------- */
export function readRules() {
  clearGenomes(); // switching to manual input clears loaded genomes
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

  const useGenomes = S.rules1Birth && S.rules1Surv && S.rules2Birth && S.rules2Surv;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const state = grid[r][c];
      const n1 = neigh(r, c, 1);
      const n2 = neigh(r, c, 2);
      const total = n1 + n2;

      /* survival */
      if (state === 1) {
        if (useGenomes) {
          const code = total >= 1 && total <= 8 ? S.rules1Surv[total - 1] : '00';
          next[r][c] = allowByCode(code, n1, n2) ? 1 : 0;
        } else {
          next[r][c] = S1.has(n1) && n2 >= Y1s ? 1 : 0;
        }
        continue;
      }
      if (state === 2) {
        if (useGenomes) {
          const code = total >= 1 && total <= 8 ? S.rules2Surv[total - 1] : '00';
          next[r][c] = allowByCode(code, n2, n1) ? 2 : 0;
        } else {
          next[r][c] = S2.has(n2) && n1 >= Y2s ? 2 : 0;
        }
        continue;
      }

      /* birth */
      let greenOK, redOK;
      if (useGenomes) {
        const code1 = total >= 1 && total <= 8 ? S.rules1Birth[total - 1] : '00';
        const code2 = total >= 1 && total <= 8 ? S.rules2Birth[total - 1] : '00';
        greenOK = allowByCode(code1, n1, n2);
        redOK   = allowByCode(code2, n2, n1);
      } else {
        greenOK = B1.has(n1) && n2 >= Y1b;
        redOK   = B2.has(n2) && n1 >= Y2b;
      }

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
