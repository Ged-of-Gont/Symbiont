// src/state.js
export const state = {
    /* world geometry */
    N: 50,
    cell: 10,
  
    /* 2‑D arrays (filled by alloc) */
    grid: [[]],
    next: [[]],
    fade: [[]],
  
    /* toggles & timing */
    wrapEdges: false,
    fadeMode:  true,
    interval:  120,        // ms per generation
  
    /* rule parameters */
    B1: new Set([3]),
    S1: new Set([2, 3]),
    B2: new Set([3]),
    S2: new Set([2, 3]),
    Y1b: 0, Y1s: 0,
    Y2b: 0, Y2s: 0,
    tieMode: 'none'
  };
  
  /* (re)allocate arrays and compute cell size */
  export function alloc(canvas) {
    const { N } = state;
    state.grid = Array.from({ length: N }, () => Array(N).fill(0));
    state.next = Array.from({ length: N }, () => Array(N).fill(0));
    state.fade = Array.from({ length: N }, () => Array(N).fill(0));
    state.cell = canvas.width / N;
  }
  