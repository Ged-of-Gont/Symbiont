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

const clampNeighborCounts = set =>
  new Set([...set].filter(n => Number.isFinite(n) && n >= 1 && n <= 8));

function buildCodes(selfSet, otherSet) {
  const codes = [];
  const s = clampNeighborCounts(selfSet);
  const o = clampNeighborCounts(otherSet);
  for (let total = 1; total <= 8; total++) {
    const hasSelf = s.has(total);
    const hasOther = o.has(total);
    let code = '00';
    if (hasSelf && hasOther) code = '11';
    else if (hasSelf) code = '10';
    else if (hasOther) code = '01';
    codes.push(code);
  }
  return codes;
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

/* ---------- UI → state (manual inputs -> genome codes) ---------- */
function buildRulesFromUI(species) {
  const $ = id => document.getElementById(id);
  if (species === 1) {
    const bSelf = parseRule($('b1').value);
    const bOther = parseRule($('y1b').value);
    const sSelf = parseRule($('s1').value);
    const sOther = parseRule($('y1s').value);
    S.genome1 = null;
    S.rules1Birth = buildCodes(bSelf, bOther);
    S.rules1Surv = buildCodes(sSelf, sOther);
  } else if (species === 2) {
    const bSelf = parseRule($('b2').value);
    const bOther = parseRule($('y2b').value);
    const sSelf = parseRule($('s2').value);
    const sOther = parseRule($('y2s').value);
    S.genome2 = null;
    S.rules2Birth = buildCodes(bSelf, bOther);
    S.rules2Surv = buildCodes(sSelf, sOther);
  } else {
    throw new Error('species must be 1 or 2');
  }
}

export function setManualRulesForSpecies(species) {
  buildRulesFromUI(species);
  const tieSelect = document.getElementById('tie');
  if (tieSelect) S.tieMode = tieSelect.value;
}

/* ---------- one generation ---------- */
export function stepGeneration() {
  const { N, grid, next, tieMode } = S;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const state = grid[r][c];
      const n1 = neigh(r, c, 1);
      const n2 = neigh(r, c, 2);
      const total = n1 + n2;

      /* survival */
      if (state === 1) {
        const code = total >= 1 && total <= 8 ? S.rules1Surv?.[total - 1] : '00';
        next[r][c] = allowByCode(code, n1, n2) ? 1 : 0;
        continue;
      }
      if (state === 2) {
        const code = total >= 1 && total <= 8 ? S.rules2Surv?.[total - 1] : '00';
        next[r][c] = allowByCode(code, n2, n1) ? 2 : 0;
        continue;
      }

      /* birth */
      const code1 = total >= 1 && total <= 8 ? S.rules1Birth?.[total - 1] : '00';
      const code2 = total >= 1 && total <= 8 ? S.rules2Birth?.[total - 1] : '00';
      const greenOK = allowByCode(code1, n1, n2);
      const redOK   = allowByCode(code2, n2, n1);

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
