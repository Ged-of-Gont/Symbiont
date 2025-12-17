// src/state.js
export const state = {
    /* world geometry */
    N: 36,
    cell: 10,
  
    /* 2‑D arrays (filled by alloc) */
    grid: [[]],
    next: [[]],
    fade: [[]],
  
    /* toggles & timing */
  wrapEdges: true,
  fadeMode:  false,
  interval:  120,        // ms per generation
  
  /* rule parameters */
  B1: new Set([3]),
  S1: new Set([2, 3]),
  B2: new Set([3]),
  S2: new Set([2, 3]),
  Y1b: 0, Y1s: 0,
  Y2b: 0, Y2s: 0,
  tieMode: 'none',

  /* evolver-style genomes (optional) */
  genome1: null, // { id, birth, survival }
  genome2: null,
  rules1Birth: null, // arrays of length 8 with codes '00'/'01'/'10'/'11'
  rules1Surv: null,
  rules2Birth: null,
  rules2Surv: null,

  // decoded UI counts per species (self/other)
  uiFields1: { bSelf: '0', sSelf: '0', bOther: '0', sOther: '0' },
  uiFields2: { bSelf: '0', sSelf: '0', bOther: '0', sOther: '0' }
};
  
  /* (re)allocate arrays and compute cell size */
  export function alloc(canvas) {
    const { N } = state;
    state.grid = Array.from({ length: N }, () => Array(N).fill(0));
    state.next = Array.from({ length: N }, () => Array(N).fill(0));
    state.fade = Array.from({ length: N }, () => Array(N).fill(0));
    state.cell = canvas.width / N;
  }
  
