import './style.css'
/* ---------- DOM refs ---------- */
const $ = id => document.getElementById(id);
const canvas=$('c'), ctx=canvas.getContext('2d');
const randBothBtn = $('randBoth');
const sizeInp=$('size'), spdInp=$('speed'), spdVal=$('spdVal');
const b1Inp=$('b1'), s1Inp=$('s1'), y1Inp=$('y1');
const b2Inp=$('b2'), s2Inp=$('s2'), y2Inp=$('y2');
const tieSel=$('tie');
const makeBtn=$('make'), rand1Btn=$('rand1'), rand2Btn=$('rand2');
const stepBtn=$('step'), runBtn=$('run'), wrapBtn=$('wrap'), fadeBtn=$('fade'), clrBtn=$('clear');

/* ---------- State ---------- */
let N=+sizeInp.value, cell=10;
let grid=[], next=[], fade=[];
let timer=null, interval=+spdInp.value;
let wrapEdges=false, fadeMode=true;

let B1,S1,B2,S2, Y1,Y2, tieMode;

/* ---------- Helpers ---------- */
const parseRule=str=>{
  const s=new Set();
  str.split(',').forEach(tok=>{
    if(!tok)return;
    if(tok.includes('-')){
      const[a,b]=tok.split('-').map(Number);
      for(let i=a;i<=b;i++) s.add(i);
    }else s.add(+tok);
  });
  return s;
};

function alloc(){
  grid=Array.from({length:N},_=>Array(N).fill(0));
  next=Array.from({length:N},_=>Array(N).fill(0));
  fade=Array.from({length:N},_=>Array(N).fill(0));
  cell=canvas.width/N;
}

function neigh(r,c,type){
  let n=0;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc)continue;
    let rr=r+dr, cc=c+dc;
    if(wrapEdges){ rr=(rr+N)%N; cc=(cc+N)%N; }
    if(rr>=0&&rr<N&&cc>=0&&cc<N && grid[rr][cc]===type) n++;
  }
  return n;
}

/* ---------- One generation ---------- */
function stepGeneration(){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const state=grid[r][c];
    const n1=neigh(r,c,1), n2=neigh(r,c,2);

    if(state===1){ // green alive
      next[r][c]=(S1.has(n1) && n2>=Y1)?1:0;
    }else if(state===2){ // red alive
      next[r][c]=(S2.has(n2) && n1>=Y2)?2:0;
    }else{ // empty square
      const greenOK = B1.has(n1) && n2>=Y1;
      const redOK   = B2.has(n2) && n1>=Y2;

      if(greenOK && !redOK) next[r][c]=1;
      else if(redOK && !greenOK) next[r][c]=2;
      else if(greenOK && redOK){
        if(tieMode==='s1') next[r][c]=1;
        else if(tieMode==='s2') next[r][c]=2;
        else if(tieMode==='rand') next[r][c]=Math.random()<.5?1:2;
        else next[r][c]=0;              // 'none'
      }else next[r][c]=0;
    }
  }
  [grid,next]=[next,grid];
}

/* ---------- Rendering & animation ---------- */
const rootStyles = getComputedStyle(document.documentElement);
const species1 = rootStyles.getPropertyValue('--species1').trim();
const species2 = rootStyles.getPropertyValue('--species2').trim();



function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const st=grid[r][c];
    const op=fadeMode?fade[r][c]:(st?1:0);
    if(op>0){
      ctx.fillStyle =
  st === 1 ? hexToRgba(species1, op)
  : st === 2 ? hexToRgba(species2, op)
  : 'rgba(0,0,0,0)'; 

      ctx.fillRect(c*cell,r*cell,cell,cell);
    }
  }
  ctx.strokeStyle='#444';
  for(let i=0;i<=N;i++){
    const p=i*cell;
    ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(canvas.width,p);ctx.stroke();
    ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,canvas.height);ctx.stroke();
  }
}

let lastTS=0;
function animate(ts){
  if(!lastTS)lastTS=ts;
  const dt=ts-lastTS; lastTS=ts;
  const frac=dt/interval;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const target=grid[r][c]?1:0;
    fade[r][c]+= (target-fade[r][c])*frac;
  }
  draw();
  requestAnimationFrame(animate);
}

/* ---------- UI ---------- */
let painting = false;
let paintValue = 1; // 1 for green, 2 for red, 0 to erase

function getCellFromEvent(e) {
  const rect   = canvas.getBoundingClientRect();      // CSS pixels
  const scaleX = canvas.width  / rect.width;          // ratio > 1 if retina / CSS‑scaled
  const scaleY = canvas.height / rect.height;

  const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
  const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top)  * scaleY;

  return [ Math.floor(y / cell), Math.floor(x / cell) ];
}


function paintCell(r, c) {
  if (r >= 0 && r < N && c >= 0 && c < N) {
    grid[r][c] = paintValue;
  }
  draw();
}

/* Mouse events */
canvas.addEventListener('mousedown', e => {
  painting = true;
  const [r, c] = getCellFromEvent(e);
  const current = grid[r][c];
  paintValue = (current + 1) % 3;
  paintCell(r, c);
});
canvas.addEventListener('mousemove', e => {
  if (painting) {
    const [r, c] = getCellFromEvent(e);
    paintCell(r, c);
  }
});
canvas.addEventListener('mouseup', () => painting = false);
canvas.addEventListener('mouseleave', () => painting = false);

/* Touch events */
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  painting = true;
  const [r, c] = getCellFromEvent(e);
  const current = grid[r][c];
  paintValue = (current + 1) % 3;
  paintCell(r, c);
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (painting) {
    const [r, c] = getCellFromEvent(e);
    paintCell(r, c);
  }
});
canvas.addEventListener('touchend', () => painting = false);
canvas.addEventListener('touchcancel', () => painting = false);


rand1Btn.onclick=()=>grid.forEach(row=>row.forEach((_,i,a)=>a[i]=Math.random()>.8?1:a[i]));
rand2Btn.onclick=()=>grid.forEach(row=>row.forEach((_,i,a)=>a[i]=Math.random()>.8?2:a[i]));
clrBtn.onclick =()=>grid.forEach(row=>row.fill(0));
randBothBtn.onclick = () =>
  grid.forEach(row =>
    row.forEach((_, i, a) => {
      const r = Math.random();
      a[i] = r > .8 ? 1 : r > .6 ? 2 : 0;          // ~20 % green, 20 % red
    })
  );
stepBtn.onclick=()=>stepGeneration();

runBtn.onclick=()=>{
  if(timer){ clearInterval(timer); timer=null; runBtn.textContent='Start'; }
  else { timer=setInterval(stepGeneration,interval); runBtn.textContent='Stop'; }
};

function readRules(){
  B1=parseRule(b1Inp.value); S1=parseRule(s1Inp.value);
  B2=parseRule(b2Inp.value); S2=parseRule(s2Inp.value);
  Y1=+y1Inp.value; Y2=+y2Inp.value;
  tieMode=tieSel.value;
}

makeBtn.onclick=()=>{
  if (timer) {                                     
    clearInterval(timer);
    timer = null;
    runBtn.textContent = 'Start';
  }
  readRules();
  N=Math.max(5,+sizeInp.value||50);
  canvas.height=canvas.width;
  alloc(); draw();
};

wrapBtn.onclick=()=>{wrapEdges=!wrapEdges; wrapBtn.textContent=`Wrap: ${wrapEdges?'On':'Off'}`;};
fadeBtn.onclick=()=>{fadeMode=!fadeMode; fadeBtn.textContent=`Fade: ${fadeMode?'On':'Off'}`; draw();};
spdInp.oninput=()=>{
  interval=+spdInp.value;
  spdVal.textContent=`${interval} ms`;
  if(timer){ clearInterval(timer); timer=setInterval(stepGeneration,interval); }
};

/* ---------- Helpers ---------- */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}


/* ---------- Init ---------- */
makeBtn.onclick();
spdInp.oninput();
requestAnimationFrame(animate);
