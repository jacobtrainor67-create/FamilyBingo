
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

const itemsInput = document.getElementById('itemsInput');
const boardEl = document.getElementById('board');
const boardSizeEl = document.getElementById('boardSize');
const freeSpaceEl = document.getElementById('freeSpace');
const statusBar = document.getElementById('statusBar');

const generateBtn = document.getElementById('generateBtn');
const clearMarksBtn = document.getElementById('clearMarksBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const saveListBtn = document.getElementById('saveListBtn');
const loadListBtn = document.getElementById('loadListBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

const STORAGE_KEY = 'bingo.custom.list.v1';
const STATE_KEY = 'bingo.state.v1';

let tiles = []; // [{text, marked, free}, ...]
let size = parseInt(boardSizeEl.value, 10);

function saveState(){
  const data = { size, free: freeSpaceEl.checked, tiles };
  localStorage.setItem(STATE_KEY, JSON.stringify(data));
}
function loadState(){
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    size = data.size || size;
    boardSizeEl.value = String(size);
    freeSpaceEl.checked = !!data.free;
    tiles = Array.isArray(data.tiles) ? data.tiles : [];
    if (tiles.length === size*size) {
      renderBoard();
      updateStatus();
      return true;
    }
    return false;
  } catch { return false; }
}

function updateStatus(msg){
  if (msg) {
    statusBar.textContent = msg;
    return;
  }
  const wins = checkWins();
  if (wins > 0) {
    statusBar.innerHTML = `🎉 <span class="win">BINGO!</span> ${wins} line${wins>1?'s':''} completed`;
  } else {
    const marked = tiles.filter(t=>t.marked).length;
    statusBar.innerHTML = `🟦 <span class="lose">${marked}/${tiles.length}</span> marked`;
  }
}

function parseItems(){
  const list = itemsInput.value
    .split(/\r?\n/)
    .map(s=>s.trim())
    .filter(Boolean);
  return [...new Set(list)];
}
function shuffle(arr){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function generateBoard(){
  size = parseInt(boardSizeEl.value, 10);
  const list = parseItems();
  const needed = size*size - (freeSpaceEl.checked ? 1 : 0);
  if (list.length < needed){
    updateStatus(`Need at least ${needed} items (you provided ${list.length}).`);
    return;
  }
  const chosen = shuffle(list).slice(0, needed);
  tiles = [];
  let idx = 0;
  for (let r=0;r<size;r++){
    for (let c=0;c<size;c++){
      const center = (r === Math.floor(size/2) && c === Math.floor(size/2));
      if (freeSpaceEl.checked && center){
        tiles.push({text:'FREE', marked:true, free:true});
      } else {
        tiles.push({text: chosen[idx++], marked:false, free:false});
      }
    }
  }
  renderBoard();
  updateStatus('Board generated! Tap tiles to mark them.');
  saveState();
}

function renderBoard(){
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.innerHTML = '';
  tiles.forEach((t, i)=>{
    const div = document.createElement('button');
    div.className = 'tile' + (t.marked ? ' marked' : '') + (t.free ? ' free':'');
    div.setAttribute('role','gridcell');
    div.setAttribute('aria-pressed', t.marked ? 'true' : 'false');
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = t.text;
    div.appendChild(label);
    if (t.marked){
      const chk = document.createElement('span');
      chk.className = 'check';
      chk.textContent = '✓';
      div.appendChild(chk);
    }
    div.addEventListener('click', ()=>{
      tiles[i].marked = !tiles[i].marked;
      renderBoard();
      updateStatus();
      saveState();
    });
    boardEl.appendChild(div);
  });
}

function clearMarks(){
  tiles = tiles.map(t=>({...t, marked: t.free ? true : false}));
  renderBoard();
  updateStatus('Marks cleared.');
  saveState();
}
function shuffleBoard(){
  const labels = tiles.filter(t=>!t.free).map(t=>t.text);
  const shuffled = shuffle(labels);
  let k=0;
  tiles = tiles.map(t=> t.free ? t : ({text: shuffled[k++], marked:false, free:false}));
  renderBoard();
  updateStatus('Board shuffled.');
  saveState();
}

function checkWins(){
  let wins = 0;
  // rows
  for (let r=0;r<size;r++){
    if (tiles.slice(r*size, r*size+size).every(t=>t.marked)) wins++;
  }
  // cols
  for (let c=0;c<size;c++){
    let ok = true;
    for (let r=0;r<size;r++){
      if (!tiles[r*size+c].marked){ ok=false; break; }
    }
    if (ok) wins++;
  }
  // diagonals
  let d1 = true, d2 = true;
  for (let i=0;i<size;i++){
    if (!tiles[i*size+i].marked) d1=false;
    if (!tiles[i*size+(size-1-i)].marked) d2=false;
  }
  if (d1) wins++;
  if (d2) wins++;
  return wins;
}

function saveList(){
  const list = parseItems();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  updateStatus('List saved locally.');
}
function loadList(){
  try{
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    itemsInput.value = list.join('\n');
    updateStatus('Loaded saved list.');
  }catch{
    updateStatus('No saved list found.');
  }
}
function exportData(){
  const data = {
    version: 1,
    size, free: freeSpaceEl.checked,
    tiles
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'bingo-board.json';
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}
function importData(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      size = parseInt(data.size)||5;
      boardSizeEl.value = String(size);
      freeSpaceEl.checked = !!data.free;
      tiles = Array.isArray(data.tiles) ? data.tiles : [];
      renderBoard();
      updateStatus('Imported board.');
      saveState();
    }catch(e){
      updateStatus('Import failed.');
    }
  };
  reader.readAsText(file);
}

generateBtn.addEventListener('click', generateBoard);
clearMarksBtn.addEventListener('click', clearMarks);
shuffleBtn.addEventListener('click', shuffleBoard);
saveListBtn.addEventListener('click', saveList);
loadListBtn.addEventListener('click', loadList);
exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', (e)=>{
  if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
});

// initial restore
if (!loadState()){
  // seed example items once
  const sample = [
    "Blue car","Someone says 'literally'","Dog barks","Spilled coffee","Laugh out loud",
    "New emoji","High five","Inside joke","Phone rings","Unexpected guest",
    "Funny hat","Selfie time","Tea spill","Cat meows","Strong opinion",
    "Plot twist","Song stuck in head","Double text","Dad joke","Slow clap",
    "Victory dance","Mic drop","Happy accident","Air high-five","Free choice"
  ];
  itemsInput.value = sample.join('\n');
  generateBoard();
}

// register service worker
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
