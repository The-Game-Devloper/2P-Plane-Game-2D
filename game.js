// --- SETTINGS & INVENTORY PERSISTENCE ---
const SETTINGS_KEY = 'flappySettings_v3_custo'; 
let settings = { 
  difficulty: 'Medium', 
  music: 'On', 
  powerUps: 'On',
  p1Name: 'Player 1', 
  p2Name: 'Player 2', 
  bgColor: '#87CEEB' 
};

// --- SHOP DATA DEFINITION ---
const SHOP_ITEMS = [
  { id: 'ufo', name: '🛸 Space UFO', type: 'skin', cost: 120, display: '🛸' },
  { id: 'dragon', name: '🐉 Mythic Dragon', type: 'skin', cost: 350, display: '🐉' },
  { id: 'plane', name: '🛩️ Propeller Plane', type: 'skin', cost: 50, display: '🛩️' },
  { id: 'ghost', name: '👻 Ghostly Form', type: 'skin', cost: 200, display: '👻' },
  { id: 'fire_trail', name: '🔥 Fire Trail', type: 'trail', cost: 80, display: '🔥' },
  { id: 'star_trail', name: '✨ Star Trail', type: 'trail', cost: 150, display: '✨' },
  { id: 'bubble_trail', name: '💦 Bubble Trail', type: 'trail', cost: 60, display: '💦' }
];

// Persistent progression storage
let inventoryP1 = JSON.parse(localStorage.getItem('invP1')) || ['default'];
let inventoryP2 = JSON.parse(localStorage.getItem('invP2')) || ['default'];

// Dynamic selections chosen inside match setup screen
let equippedP1 = { skin: 'default', trail: 'none' };
let equippedP2 = { skin: 'default', trail: 'none' };

let currentMode = 'racing';
let isMobile = false; 
let player1, player2, score1, score2;
let myObstacles = [], mySpikes = [], myCoins = [], myItems = [], particles = [], visualTrails = [];
let player1Alive = true, player2Alive = true;
let eliminationFrame1 = null, eliminationFrame2 = null, gameEndedByWin = false;
let backgroundComp, endPlatform = null, endFlag = null;

// Currency Systems
let highScore1 = +localStorage.getItem('highScoreP1') || 0;
let highScore2 = +localStorage.getItem('highScoreP2') || 0;
let winsP1 = +localStorage.getItem('winsP1') || 0;
let winsP2 = +localStorage.getItem('winsP2') || 0;
let totalCoinsP1 = +localStorage.getItem('totalCoinsP1') || 0;
let totalCoinsP2 = +localStorage.getItem('totalCoinsP2') || 0;
let bankCoinsP1 = +localStorage.getItem('bankCoinsP1') || 0;
let bankCoinsP2 = +localStorage.getItem('bankCoinsP2') || 0;
let totalDiamondsP1 = +localStorage.getItem('totalDiamondsP1') || 0; 
let totalDiamondsP2 = +localStorage.getItem('totalDiamondsP2') || 0; 

let coinsCollectedP1 = 0, coinsCollectedP2 = 0;
let diamondsCollectedP1 = 0, diamondsCollectedP2 = 0;

const MAX_HEALTH = 9;
let hp1 = MAX_HEALTH, hp2 = MAX_HEALTH;
let tempHpExpire1 = 0, tempHpExpire2 = 0;
let hitCooldownFrames1 = 0, hitCooldownFrames2 = 0;

const MAGNET_RADIUS = 200;
const MAGNET_DURATION_FRAMES = 15 * 60; 

let obstacleSpeed = 2;
let spawnIntervalFrames = 130;
let pipeGap = 150;
let spikeDensity = 0.6; 
let damageMap = { Easy:1, Medium:2, Hard:9 }; 
let spikeEffectHardPulse = false; 
let itemSettings = { magnetChance: 0.10, heartChances: {red:0.35, green:0.12, pink:0.03, gold:0.02}, potionChances: {poison:0.35, heal:0.08, rainbow:0.02} };

// --- MENU CONTROL SYSTEMS ---
function loadSettings() {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (saved) settings = {...settings, ...saved}; 
  
  document.getElementById('difficulty').value = settings.difficulty;
  document.getElementById('musicToggle').value = settings.music;
  document.getElementById('powerUpsToggle').value = settings.powerUps;
  document.getElementById('p1Name').value = settings.p1Name;
  document.getElementById('p2Name').value = settings.p2Name;
  document.getElementById('bgColor').value = settings.bgColor;
}

function saveSettings() {
  settings.difficulty = document.getElementById('difficulty').value;
  settings.music = document.getElementById('musicToggle').value;
  settings.powerUps = document.getElementById('powerUpsToggle').value;
  settings.p1Name = (document.getElementById('p1Name').value || 'Player 1').trim().substring(0,10);
  settings.p2Name = (document.getElementById('p2Name').value || 'Player 2').trim().substring(0,10);
  settings.bgColor = document.getElementById('bgColor').value;

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  const bg = document.getElementById('bgMusic');
  if (settings.music === 'On') bg.play().catch(()=>{});
  else bg.pause();
}

function openSettings(){ loadSettings(); document.getElementById('settingsPopup').style.display='block'; }
// Fixed bugs by referencing proper scope actions inside single calls
function closeSettings(){ saveSettings(); document.getElementById('settingsPopup').style.display='none'; }
function openCustomization(){ loadSettings(); document.getElementById('customizationPopup').style.display='block'; }
function closeCustomization(){ saveSettings(); document.getElementById('customizationPopup').style.display='none'; }
function openAbout(){ document.getElementById('aboutPopup').style.display='block'; }
function closeAbout(){ document.getElementById('aboutPopup').style.display='none'; }
function openStats(){ updateStatsDisplay(); document.getElementById('statsPopup').style.display='block'; }
function closeStats(){ document.getElementById('statsPopup').style.display='none'; }
function openCustomMode(){ document.getElementById('customModePopup').style.display='block'; }
function closeCustomMode(){ document.getElementById('customModePopup').style.display='none'; }
function showComingSoon(modeName) { alert(`Mode ${modeName} is COMING SOON!`); }

// --- SHOP LOGIC SYSTEMS ---
function openShop() {
  updateShopWalletsDisplay();
  const tbody = document.getElementById('shopItemsBody');
  tbody.innerHTML = '';

  SHOP_ITEMS.forEach(item => {
    const p1Owns = inventoryP1.includes(item.id);
    const p2Owns = inventoryP2.includes(item.id);

    const p1Btn = p1Owns ? `<button class="buy-btn unlocked" disabled>Unlocked</button>` : `<button class="buy-btn" onclick="buyItem(1, '${item.id}', ${item.cost})">Buy</button>`;
    const p2Btn = p2Owns ? `<button class="buy-btn unlocked" disabled>Unlocked</button>` : `<button class="buy-btn" onclick="buyItem(2, '${item.id}', ${item.cost})">Buy</button>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.name}</strong></td>
      <td><span class="small">${item.type.toUpperCase()}</span></td>
      <td><strong>${item.cost} 💿</strong></td>
      <td>${p1Btn}</td>
      <td>${p2Btn}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('shopPopup').style.display = 'block';
}

function closeShop() {
  document.getElementById('shopPopup').style.display = 'none';
}

function updateShopWalletsDisplay() {
  document.getElementById('shopP1Name').textContent = settings.p1Name;
  document.getElementById('shopP2Name').textContent = settings.p2Name;
  document.getElementById('shopCoinsP1').textContent = totalCoinsP1;
  document.getElementById('shopCoinsP2').textContent = totalCoinsP2;
}

function buyItem(playerNum, itemId, cost) {
  if (playerNum === 1) {
    if (totalCoinsP1 >= cost) {
      totalCoinsP1 -= cost;
      inventoryP1.push(itemId);
      localStorage.setItem('totalCoinsP1', totalCoinsP1);
      localStorage.setItem('invP1', JSON.stringify(inventoryP1));
      alert(`${settings.p1Name} successfully purchased item!`);
    } else { alert(`Not enough coins for ${settings.p1Name}!`); }
  } else {
    if (totalCoinsP2 >= cost) {
      totalCoinsP2 -= cost;
      inventoryP2.push(itemId);
      localStorage.setItem('totalCoinsP2', totalCoinsP2);
      localStorage.setItem('invP2', JSON.stringify(inventoryP2));
      alert(`${settings.p2Name} successfully purchased item!`);
    } else { alert(`Not enough coins for ${settings.p2Name}!`); }
  }
  updateShopWalletsDisplay();
  openShop(); // Refresh table contents
}

// --- EQUIPMENT CHOICE SYSTEM (MATCH PREPARATION AREA) ---
function openEquipmentScreen() {
  document.getElementById('equipP1Title').textContent = settings.p1Name;
  document.getElementById('equipP2Title').textContent = settings.p2Name;

  populateEquipList(1, inventoryP1, 'p1EquipList');
  populateEquipList(2, inventoryP2, 'p2EquipList');

  document.getElementById('equipmentPopup').style.display = 'block';
}

function populateEquipList(playerNum, inventory, elementId) {
  const target = document.getElementById(elementId);
  target.innerHTML = '<h5>Skins</h5>';
  
  // Base Defaults
  const defSkinDiv = createEquipRadio(playerNum, 'skin', 'default', 'Original Bird (✈)', true);
  target.appendChild(defSkinDiv);

  SHOP_ITEMS.filter(i => i.type === 'skin').forEach(item => {
    if (inventory.includes(item.id)) {
      target.appendChild(createEquipRadio(playerNum, 'skin', item.id, `${item.display} ${item.name}`, false));
    }
  });

  const trailHeader = document.createElement('h5');
  trailHeader.style.marginTop = "10px";
  trailHeader.textContent = "Trails";
  target.appendChild(trailHeader);

  target.appendChild(createEquipRadio(playerNum, 'trail', 'none', 'No Trail Effect', true));
  SHOP_ITEMS.filter(i => i.type === 'trail').forEach(item => {
    if (inventory.includes(item.id)) {
      target.appendChild(createEquipRadio(playerNum, 'trail', item.id, `${item.display} ${item.name}`, false));
    }
  });
}

function createEquipRadio(playerNum, type, id, labelText, isChecked) {
  const holder = document.createElement('div');
  holder.className = 'equip-item';
  const checkedAttr = isChecked ? 'checked' : '';
  holder.innerHTML = `
    <input type="radio" id="eq_${playerNum}_${type}_${id}" name="eq_${playerNum}_${type}" value="${id}" ${checkedAttr}>
    <label for="eq_${playerNum}_${type}_${id}">${labelText}</label>
  `;
  return holder;
}

function confirmEquipmentAndStart() {
  // Capture Radio values safely
  const p1Skins = document.getElementsByName('eq_1_skin');
  p1Skins.forEach(r => { if(r.checked) equippedP1.skin = r.value; });
  const p1Trails = document.getElementsByName('eq_1_trail');
  p1Trails.forEach(r => { if(r.checked) equippedP1.trail = r.value; });

  const p2Skins = document.getElementsByName('eq_2_skin');
  p2Skins.forEach(r => { if(r.checked) equippedP2.skin = r.value; });
  const p2Trails = document.getElementsByName('eq_2_trail');
  p2Trails.forEach(r => { if(r.checked) equippedP2.trail = r.value; });

  document.getElementById('equipmentPopup').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'block';

  document.getElementById('winner').innerHTML = `Mode: ${currentMode.toUpperCase()} - Race to the Flag`;
  startCountdown();
}

function selectMode(mode){
  closeCustomMode();
  currentMode = mode;
  
  if (window.innerWidth < 1000) { 
      document.getElementById('controls').style.display='flex'; 
      isMobile = true;
  } else {
      document.getElementById('controls').style.display='none';
      isMobile = false;
  }

  if (mode === 'racing') {
    openEquipmentScreen(); // Trigger the optional match choices window
  } else {
    document.getElementById('winner').innerHTML = `ERROR: Mode ${mode} not yet implemented.`;
    document.getElementById('restartBtn').style.display='inline'; 
  }
}

// --- RENDERING TRAILS SYSTEM ---
function spawnVisualTrail(x, y, trailType) {
  if (trailType === 'none') return;
  let graphic = '✨';
  if (trailType === 'fire_trail') graphic = '🔥';
  if (trailType === 'bubble_trail') graphic = '💦';

  visualTrails.push({
    x: x, y: y, graphic: graphic, alpha: 1.7,
    update() {
      const ctx = myGameArea.context;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.font = '16px Arial';
      ctx.fillText(this.graphic, this.x, this.y);
      ctx.restore();
      this.x -= obstacleSpeed; // scroll back along with game field
      this.alpha -= 0.04;
    }
  });
}

// --- BASE ENGINE CODE LOGIC ---
function startCountdown(){
  let counter = 3;
  const countdownEl = document.getElementById('countdown');
  countdownEl.textContent = `Game starts in: ${counter}`;
  const iv = setInterval(()=> {
    counter--;
    if (counter === 0) {
      clearInterval(iv);
      countdownEl.textContent='GO!';
      setTimeout(()=> countdownEl.textContent='', 700);
      startGame();
    } else countdownEl.textContent = `Game starts in: ${counter}`;
  }, 1000);
}

function startGame(){
  myGameArea.canvas.style.backgroundColor = settings.bgColor; 
  
  const diff = settings.difficulty;
  if (diff === 'Easy') { obstacleSpeed = 1.5; spawnIntervalFrames = 160; pipeGap = 180; spikeDensity = 0.35; spikeEffectHardPulse=false; }
  else if (diff === 'Medium') { obstacleSpeed = 2; spawnIntervalFrames = 130; pipeGap = 150; spikeDensity = 0.6; spikeEffectHardPulse=false; }
  else { obstacleSpeed = 3; spawnIntervalFrames = 110; pipeGap = 120; spikeEffectHardPulse=true; }

  loadBackground();
  backgroundComp.speedX = -1;

  // Assign lookups for custom items matching choices verified inside popup
  let p1Model = ['✈1'];
  if(equippedP1.skin !== 'default') {
    const itemObj = SHOP_ITEMS.find(i => i.id === equippedP1.skin);
    if(itemObj) p1Model = [itemObj.display];
  }
  let p2Model = ['✈2'];
  if(equippedP2.skin !== 'default') {
    const itemObj = SHOP_ITEMS.find(i => i.id === equippedP2.skin);
    if(itemObj) p2Model = [itemObj.display];
  }

  player1 = new emojiBird(60, 240, p1Model, settings.p1Name); player1.magnet = false; player1.magnetTimer = 0; player1.tempHp = 0; player1.invuln = 0;
  player2 = new emojiBird(140, 240, p2Model, settings.p2Name); player2.magnet = false; player2.magnetTimer = 0; player2.tempHp = 0; player2.invuln = 0;
  
  player1.gravity = player2.gravity = 0.09;
  score1 = new component('20px','Consolas','black',20,30,'text');
  score2 = new component('20px','Consolas','black',820,30,'text');
  coinsCollectedP1 = coinsCollectedP2 = 0;
  diamondsCollectedP1 = diamondsCollectedP2 = 0; 
  player1Alive = player2Alive = true;
  eliminationFrame1 = eliminationFrame2 = null;
  myObstacles = []; mySpikes = []; myCoins = []; myItems = []; particles = []; visualTrails = []; endPlatform = endFlag = null; gameEndedByWin = false;
  hp1 = hp2 = MAX_HEALTH;
  tempHpExpire1 = tempHpExpire2 = 0;
  hitCooldownFrames1 = hitCooldownFrames2 = 0;

  document.getElementById('restartBtn').onclick = openCustomMode; 
  document.getElementById('restartBtn').textContent = 'SELECT MODE';
  document.getElementById('restartBtn').style.display='none';
  document.getElementById('winner').innerHTML='';
  myGameArea.start();
  updateHealthHUD();
}

function loadBackground(){
  backgroundComp = new component(960,540,'background',0,0,'background');
  backgroundComp.image = new Image();
  backgroundComp.image.src = '152930c9-8d02-4b31-81dd-043e0562a83d.png';
}

const myGameArea = {
  canvas: document.createElement('canvas'),
  start() {
    this.canvas.width = 960; this.canvas.height = 540;
    this.context = this.canvas.getContext('2d');
    const gameContainer = document.getElementById('gameContainer');
    if(gameContainer.firstChild && gameContainer.firstChild.tagName === 'CANVAS') {
        gameContainer.removeChild(gameContainer.firstChild);
    }
    gameContainer.insertBefore(this.canvas, gameContainer.firstChild);
    this.frameNo = 0;
    clearInterval(this.interval);
    this.interval = setInterval(updateGameArea, 20);
    this.startTime = Date.now(); 
  },
  clear() { this.context.clearRect(0,0,this.canvas.width,this.canvas.height); }
};

function emojiBird(x,y,frames, name){
  this.width = 36; this.height = 36; this.x = x; this.y = y;
  this.gravity = 0; this.gravitySpeed = 0; this.frames = frames; this.frameIndex = 0;
  this.name = name; 
  this.update = ()=>{ 
    const ctx = myGameArea.context;
    ctx.save();
    
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    if (this.invuln > 0) {
        ctx.fillStyle = `rgba(0, 123, 255, ${0.8 + 0.2 * Math.sin(myGameArea.frameNo / 4)})`;
        ctx.shadowColor = 'blue';
        ctx.shadowBlur = 8;
    }
    ctx.fillText(this.name, this.x + 18, this.y - 8); 
    ctx.shadowBlur = 0; 
    ctx.textAlign = 'left'; 
    
    ctx.font = '34px Arial';
    
    if (this.magnet && this.magnetTimer>0){
      ctx.beginPath();
      ctx.arc(this.x+18, this.y+18, 28 + Math.sin(myGameArea.frameNo/6)*2, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,150,0.08)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,120,0.35)'; ctx.stroke();
      ctx.font = '20px Arial';
      ctx.fillText('🧲', this.x+12 + Math.sin(myGameArea.frameNo/6)*10, this.y - 6);
    }
    
    if (this.invuln > 0){
         ctx.save();
         ctx.globalAlpha = 0.3 + 0.3 * Math.abs(Math.sin(myGameArea.frameNo/4));
         ctx.fillStyle = 'purple';
         ctx.beginPath();
         ctx.arc(this.x+18, this.y+18, 20, 0, Math.PI*2);
         ctx.fill();
         ctx.restore();
    }
    
    ctx.fillText(this.frames[this.frameIndex], this.x, this.y + 28);
    ctx.restore();
    if (myGameArea.frameNo % 8 === 0) this.frameIndex = (this.frameIndex + 1) % this.frames.length;
  };
  this.newPos = ()=>{ 
    this.gravitySpeed += this.gravity;
    this.y += this.gravitySpeed;
    if (this.y > myGameArea.canvas.height - this.height) { this.y = myGameArea.canvas.height - this.height; this.gravitySpeed = 0; }
    if (this.y < -10) { this.y = -10; this.gravitySpeed = 0; }
  };
  this.crashWith = other => {
    return !(this.y + this.height < other.y || this.y > other.y + other.height ||
             this.x + this.width < other.x || this.x > other.x + other.width);
  };
}

function component(width,height,color,x,y,type){
  this.type = type; this.width = width; this.height = height;
  this.x = x; this.y = y; this.speedX = 0; this.speedY = 0;
  if (type === 'image' || type === 'background'){
    this.image = new Image(); this.image.src = color;
  }
  this.update = ()=>{ 
    const ctx = myGameArea.context;
    if (type === 'image' || type==='background'){
      ctx.drawImage(this.image,this.x,this.y,this.width,this.height);
      if (type==='background' && this.x <= -this.width) ctx.drawImage(this.image,this.x+this.width,this.y,this.width,this.height);
    } else if (type==='text'){
      ctx.font = width + ' ' + height;
      ctx.fillStyle = color;
      ctx.fillText(this.text,this.x,this.y);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(this.x,this.y,this.width,this.height);
    }
  };
  this.newPos = ()=>{ this.x += this.speedX; if (type==='background' && this.x <= -this.width) this.x = 0; };
}

function coin(x,y){
  this.width=26; this.height=26; this.x=x; this.y=y;
  const chance=Math.random();
  this.text = chance < 0.12 ? '💎' : '💿';
  this.value = this.text==='💎'?10:1;
  this.update = ()=>{ const ctx = myGameArea.context; ctx.font='22px Arial'; ctx.fillText(this.text,this.x,this.y+this.height); };
  this.newPos = ()=> this.x -= obstacleSpeed;
  this.crashWith = other => !(this.y + this.height < other.y ||
                              this.y > other.y + other.height ||
                              this.x + this.width < other.x ||
                              this.x > other.x + other.width);
}

function itemFactory(type, x, y){
  const it = { x:x, y:y, width:28, height:28, type:type, vx:0, vy:0 };
  if (type==='red'){ it.emoji='❤️'; it.heal=1; }
  else if (type==='green'){ it.emoji='💚'; it.heal=3; }
  else if (type==='pink'){ it.emoji='💖'; it.heal=MAX_HEALTH; }
  else if (type==='gold'){ it.emoji='💛'; it.temp=true; it.heal=1; it.duration=15*50; } 
  else if (type==='poison'){ it.emoji='🧪'; it.dmg=2; }
  else if (type==='healpot'){ it.emoji='💊'; it.heal=2; }
  else if (type==='rainbow'){ it.emoji='🟣'; it.invuln=10*50; }
  else if (type==='magnet'){ it.emoji='🧲'; it.duration = MAGNET_DURATION_FRAMES; }
  it.update = function(){ const ctx = myGameArea.context; ctx.font='24px Arial'; ctx.fillText(this.emoji, this.x, this.y+22); };
  it.newPos = function(){ this.x -= obstacleSpeed; };
  it.crashWith = other => !(this.y + this.height < other.y ||
      this.y > other.y + other.height ||
      this.x + this.width < other.x ||
      this.x > other.x + other.width);
  return it;
}

function createSpikeRow(x, baseY, widthPixels, pointingUp = false) {
  const spikeWidth = 10;
  const count = Math.floor(widthPixels / spikeWidth);
  return {
    x: x, y: baseY, width: widthPixels, height: spikeWidth, spikeCount: count, pointingUp: pointingUp,
    update() {
      const ctx = myGameArea.context;
      const diff = settings.difficulty;
      let fill = '#b0b0b0';
      if (diff === 'Easy') fill = '#c0d6a5';
      else if (diff === 'Medium') fill = '#9fbf6b';
      else fill = spikeEffectHardPulse ? `rgba(255,80,80,${0.6 + 0.4 * Math.abs(Math.sin(myGameArea.frameNo/6))})` : '#ff5c5c';

      const spikeW = this.width / Math.max(1, this.spikeCount);
      for (let i=0;i<this.spikeCount;i++){
        const sx = this.x + i*spikeW;
        if (this.pointingUp){
          ctx.beginPath(); ctx.moveTo(sx, this.y);
          ctx.lineTo(sx + spikeW/2, this.y - this.height - (settings.difficulty==='Hard'?4:0)*(Math.abs(Math.sin(myGameArea.frameNo/8))));
          ctx.lineTo(sx + spikeW, this.y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(sx, this.y);
          ctx.lineTo(sx + spikeW/2, this.y + this.height + (settings.difficulty==='Hard'?4:0)*(Math.abs(Math.sin(myGameArea.frameNo/8))));
          ctx.lineTo(sx + spikeW, this.y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke();
        }
      }
    },
    newPos() { this.x -= obstacleSpeed; },
    crashWith(other) {
      return !(other.y + other.height < this.y || other.y > this.y + this.height ||
               other.x + other.width < this.x || other.x > this.x + this.width);
    }
  };
}

function particle(x,y, vx, vy, life){
  this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.age=0;
  this.update = ()=>{ const ctx = myGameArea.context; this.x += this.vx; this.y += this.vy; this.vy += 0.12; this.age++; ctx.save(); ctx.translate(this.x, this.y); ctx.rotate((this.age/10) % (Math.PI*2)); ctx.fillStyle = ['#ff3b3b','#ffd23f','#7efc6f','#6ab0ff'][this.age % 4]; ctx.fillRect(-3,-3,6,6); ctx.restore(); };
  this.isDead = ()=> this.age > this.life;
}

function drawPipe(ctx, x, y, w, h, flipped=false){
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#5cb85c'); grad.addColorStop(1, '#3d8b3d');
  ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2f6f2f';
  if (!flipped) ctx.fillRect(x-2, y + h - 18, w+4, 18);
  else ctx.fillRect(x-2, y, w+4, 18);
  ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffffff';
  for (let i=0; i<3; i++) { ctx.fillRect(x + 6 + i*10, y + 8, 6, Math.min(60, h-16)); }
  ctx.globalAlpha = 1;
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
}
    
function updateGameArea(){
  const gameRunning = player1Alive || player2Alive;

  if (!gameRunning){
    clearInterval(myGameArea.interval);
    showWinner();
    document.getElementById('restartBtn').style.display='inline';
    return;
  }

  myGameArea.clear();
  myGameArea.frameNo++;
  backgroundComp.newPos();
  backgroundComp.update();

  // Draw and handle cosmetic equipment trail objects
  if(myGameArea.frameNo % 3 === 0) {
    if(player1Alive) spawnVisualTrail(player1.x, player1.y + 10, equippedP1.trail);
    if(player2Alive) spawnVisualTrail(player2.x, player2.y + 10, equippedP2.trail);
  }
  for(let i = visualTrails.length - 1; i >= 0; i--) {
    visualTrails[i].update();
    if(visualTrails[i].alpha <= 0) visualTrails.splice(i, 1);
  }

  // obstacle creation window 
  if (myGameArea.frameNo < 10000 && (myGameArea.frameNo === 1 || myGameArea.frameNo % spawnIntervalFrames === 0)){
    const x = 980;
    const height = Math.floor(Math.random()*220) + 80; 
    const gap = pipeGap;

    const moving = Math.random() < 0.25;
    const moveAmp = moving ? (settings.difficulty=='Easy'?18 : settings.difficulty=='Medium'?30:50) : 0;
    const moveSpeed = moving ? (settings.difficulty=='Easy'?0.02:settings.difficulty=='Medium'?0.04:0.08) : 0;

    myObstacles.push({
      x: x, y: 0, w: 76, h: height, baseY:0, oscAmp:moveAmp, oscSpeed:moveSpeed,
      update() { const curY = this.baseY + (this.oscAmp? Math.sin(myGameArea.frameNo * this.oscSpeed)*this.oscAmp : 0); drawPipe(myGameArea.context, this.x, curY, this.w, this.h, false); this.drawY = curY; },
      newPos() { this.x -= obstacleSpeed; }
    });
    myObstacles.push({
      x: x-4, y: Math.max(0, height - 22), w: 84, h: 22,
      update() { const ctx = myGameArea.context; ctx.fillStyle = '#2f6f2f'; ctx.fillRect(this.x, this.y, this.w, this.h); },
      newPos() { this.x -= obstacleSpeed; }
    });

    const topSpikeRow = createSpikeRow(x, height, 76, false);
    topSpikeRow.spikeCount = Math.max(1, Math.floor((76/10) * spikeDensity));
    mySpikes.push(topSpikeRow);

    const bottomH = 540 - height - gap;
    myObstacles.push({
      x: x, y: height + gap, w: 76, h: bottomH, baseY: height + gap, oscAmp:moveAmp, oscSpeed:moveSpeed,
      update() { const curY = this.baseY + (this.oscAmp? Math.sin(myGameArea.frameNo * this.oscSpeed)*this.oscAmp : 0); drawPipe(myGameArea.context, this.x, curY, this.w, this.h, true); this.drawY = curY; },
      newPos() { this.x -= obstacleSpeed; }
    });
    myObstacles.push({
      x: x-4, y: height + gap, w: 84, h: 22,
      update() { const ctx = myGameArea.context; ctx.fillStyle = '#2f6f2f'; ctx.fillRect(this.x, this.y, this.w, this.h); },
      newPos() { this.x -= obstacleSpeed; }
    });

    const bottomSpikeRow = createSpikeRow(x, height + gap, 76, true);
    bottomSpikeRow.spikeCount = Math.max(1, Math.floor((76/10) * spikeDensity));
    mySpikes.push(bottomSpikeRow);

    const midY = height + gap/2;
    for (let i=-1;i<=1;i++){
      const spawnRand = Math.random();
      if (settings.powerUps === 'On' && spawnRand < 0.22){
        const r = Math.random();
        if (r < itemSettings.heartChances.red) myItems.push(itemFactory('red', x+14, midY + i*18));
        else if (r < itemSettings.heartChances.red + itemSettings.heartChances.green) myItems.push(itemFactory('green', x+14, midY + i*18));
        else if (r < itemSettings.heartChances.red + itemSettings.heartChances.green + itemSettings.heartChances.pink) myItems.push(itemFactory('pink', x+14, midY + i*18));
        else if (r < itemSettings.heartChances.red + itemSettings.heartChances.green + itemSettings.heartChances.pink + itemSettings.heartChances.gold) myItems.push(itemFactory('gold', x+14, midY + i*18));
        else {
          const p = Math.random();
          if (p < itemSettings.potionChances.poison) myItems.push(itemFactory('poison', x+14, midY + i*18));
          else if (p < itemSettings.potionChances.poison + itemSettings.potionChances.heal) myItems.push(itemFactory('healpot', x+14, midY + i*18));
          else if (p < itemSettings.potionChances.poison + itemSettings.potionChances.heal + itemSettings.potionChances.rainbow) myItems.push(itemFactory('rainbow', x+14, midY + i*18));
          else if (Math.random() < itemSettings.magnetChance) myItems.push(itemFactory('magnet', x+14, midY + i*18));
          else myCoins.push(new coin(x+14, midY + i*18));
        }
      } else { myCoins.push(new coin(x+14, midY + i*18)); }
    }
  }

  if (myGameArea.frameNo === 10100){
    endPlatform = { x: 980, y: 520, w: 220, h: 20, update() { const ctx = myGameArea.context; ctx.fillStyle = 'white'; ctx.fillRect(this.x, this.y, this.w, this.h); }, newPos() { this.x -= obstacleSpeed; } };
    endFlag = { x: 980+170, y: 120, w: 8, h: 400, update() { const ctx = myGameArea.context; const sway = Math.sin(myGameArea.frameNo/6) * 6; ctx.fillStyle = 'brown'; ctx.fillRect(this.x, this.y, 4, this.h); ctx.fillStyle = 'lightgreen'; ctx.beginPath(); ctx.moveTo(this.x+4, this.y+6); ctx.lineTo(this.x+4+24 + sway, this.y+12); ctx.lineTo(this.x+4, this.y+20); ctx.closePath(); ctx.fill(); }, newPos() { this.x -= obstacleSpeed; } };
  }

  for (let i=myObstacles.length-1;i>=0;i--){ myObstacles[i].newPos(); myObstacles[i].update(); if (myObstacles[i].x < -90) myObstacles.splice(i,1); }
  for (let i=mySpikes.length-1;i>=0;i--){ mySpikes[i].newPos(); mySpikes[i].update(); if (mySpikes[i].x < -90) mySpikes.splice(i,1); }

  for (let i=0;i<myCoins.length;i++){
    myCoins[i].newPos(); myCoins[i].update();
    if (player1Alive && player1.crashWith(myCoins[i])) { 
        if (myCoins[i].text === '💎') diamondsCollectedP1++; else coinsCollectedP1 += myCoins[i].value; 
        myCoins.splice(i--,1); 
    } else if (player2Alive && player2.crashWith(myCoins[i])) { 
        if (myCoins[i].text === '💎') diamondsCollectedP2++; else coinsCollectedP2 += myCoins[i].value; 
        myCoins.splice(i--,1); 
    }
  }

  for (let i=0;i<myItems.length;i++){
    const it = myItems[i]; it.newPos(); it.update();
    [ {pl:player1, alive:player1Alive}, {pl:player2, alive:player2Alive} ].forEach(obj=>{
      if (!obj.alive || !obj.pl) return;
      if (obj.pl.magnet && obj.pl.magnetTimer>0){
        const dx = (obj.pl.x+obj.pl.width/2) - it.x; const dy = (obj.pl.y+obj.pl.height/2) - it.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < MAGNET_RADIUS){ it.x += dx * 0.08; it.y += dy * 0.08; }
      }
    });
    if (player1Alive && player1.crashWith(it)){ collectItem(1, it); myItems.splice(i--,1); continue; }
    else if (player2Alive && player2.crashWith(it)){ collectItem(2, it); myItems.splice(i--,1); continue; }
  }

  if (endPlatform) { endPlatform.newPos(); endPlatform.update(); }
  if (endFlag) { endFlag.newPos(); endFlag.update(); }
  for (let i=particles.length-1;i>=0;i--){ particles[i].update(); if (particles[i].isDead()) particles.splice(i,1); }

  if (hitCooldownFrames1 > 0) hitCooldownFrames1--;
  if (hitCooldownFrames2 > 0) hitCooldownFrames2--;

  [player1, player2].forEach((pl, idx)=> {
    if ((idx===0 && !player1Alive) || (idx===1 && !player2Alive)) return;
    for (let j=0;j<myObstacles.length;j++){
      const o = myObstacles[j]; const oY = (typeof o.drawY !== 'undefined') ? o.drawY : o.y;
      if (pl.crashWith({ x:o.x, y:oY, width: o.w||76, height: o.h||20 })){
        if (((idx===0 && hitCooldownFrames1===0) || (idx===1 && hitCooldownFrames2===0)) && pl.invuln===0){
          const dmg = damageMap[settings.difficulty] || 1;
          if (idx===0) { hp1 -= dmg; hitCooldownFrames1 = 30; if (hp1 <= 0) { player1Alive = false; eliminationFrame1 = myGameArea.frameNo; } }
          else { hp2 -= dmg; hitCooldownFrames2 = 30; if (hp2 <= 0) { player2Alive = false; eliminationFrame2 = myGameArea.frameNo; } }
        }
      }
    }
    for (let s=0;s<mySpikes.length;s++){
      if (mySpikes[s].crashWith({ x:pl.x, y:pl.y, width:pl.width, height:pl.height })){
        if (((idx===0 && hitCooldownFrames1===0) || (idx===1 && hitCooldownFrames2===0)) && pl.invuln===0){
          const dmg = damageMap[settings.difficulty] || 1;
          if (idx===0) { hp1 -= dmg; hitCooldownFrames1 = 30; if (hp1 <= 0) { player1Alive = false; eliminationFrame1 = myGameArea.frameNo; } }
          else { hp2 -= dmg; hitCooldownFrames2 = 30; if (hp2 <= 0) { player2Alive = false; eliminationFrame2 = myGameArea.frameNo; } }
        }
      }
    }
    if (endPlatform && endFlag){
      const goalBox = { x: endFlag.x - 10, y: endFlag.y, width: 36, height: endFlag.h + 10 };
      if (pl.crashWith(goalBox)){
        if (idx===0 && player1Alive){ coinsCollectedP1 += 5000; eliminationFrame1 = myGameArea.frameNo; player1Alive = player2Alive = false; gameEndedByWin = true; }
        else if (idx===1 && player2Alive){ coinsCollectedP2 += 5000; eliminationFrame2 = myGameArea.frameNo; player2Alive = player1Alive = false; gameEndedByWin = true; }
      }
    }
    if ((idx===0 && player1Alive) || (idx===1 && player2Alive)){ pl.newPos(); pl.update(); }
    if (idx===0){
      if (player1.invuln>0) player1.invuln--; if (player1.magnet && player1.magnetTimer>0) player1.magnetTimer--; if (player1.magnetTimer<=0) player1.magnet=false;
    } else {
      if (player2.invuln>0) player2.invuln--; if (player2.magnet && player2.magnetTimer>0) player2.magnetTimer--; if (player2.magnetTimer<=0) player2.magnet=false;
    }
  });

  const elapsedTime = Date.now() - myGameArea.startTime;
  const formattedTimer = formatTime(elapsedTime);
  score1.text = `${settings.p1Name.substring(0,6)}: ${player1Alive ? formattedTimer : 'OUT'}  💿:${coinsCollectedP1} 💎:${diamondsCollectedP1}`;
  score2.text = `${settings.p2Name.substring(0,6)}: ${player2Alive ? formattedTimer : 'OUT'}  💿:${coinsCollectedP2} 💎:${diamondsCollectedP2}`;
  score1.update(); score2.update();
  updateHealthHUD();
}

function collectItem(playerIdx, it){
  const pl = (playerIdx===1) ? player1 : player2;
  let newHp = (playerIdx===1) ? hp1 : hp2;
  if (it.type==='red' || it.type==='green' || it.type==='healpot'){ newHp = Math.min(MAX_HEALTH + (pl.tempHp||0), newHp + (it.heal||1)); }
  else if (it.type==='pink'){ newHp = MAX_HEALTH + (pl.tempHp||0); }
  else if (it.type==='poison'){ newHp -= it.dmg; }
  else if (it.type==='rainbow'){ pl.invuln = it.invuln; }
  else if (it.type==='magnet'){ pl.magnet = true; pl.magnetTimer = it.duration; }
  
  if (playerIdx===1) { hp1 = newHp; if (hp1 <= 0) player1Alive = false; }
  else { hp2 = newHp; if (hp2 <= 0) player2Alive = false; }
}

function updateHealthHUD(){
  const hearts = (n) => {
    let s = ''; const full = '❤️'; const empty = '🤍';
    for (let i=0;i<MAX_HEALTH;i++) s += (i < Math.min(n,MAX_HEALTH) ? full : empty) + ' ';
    return s;
  };
  document.getElementById('healthP1').innerHTML = `${settings.p1Name} HP: ${hearts(Math.max(0, hp1))}`;
  document.getElementById('healthP2').innerHTML = `${settings.p2Name} HP: ${hearts(Math.max(0, hp2))}`;
  document.getElementById('scoreDisplay').innerHTML = `<strong>Score</strong> <div class="small">Timer: ${formatTime(Date.now() - (myGameArea.startTime||Date.now()))}</div>`;
  document.getElementById('scoreDisplay2').innerHTML = `<strong>Score</strong> <div class="small">Timer: ${formatTime(Date.now() - (myGameArea.startTime||Date.now()))}</div>`;
}

function showWinner(){
  const finalTimeMs = Date.now() - myGameArea.startTime;
  const finalTimeFormatted = formatTime(finalTimeMs);
  const w = document.getElementById('winner');
  let finalFrame1 = player1Alive ? myGameArea.frameNo : (eliminationFrame1||0);
  let finalFrame2 = player2Alive ? myGameArea.frameNo : (eliminationFrame2||0);
  
  let msg = `🎖️ Game Over!<br>${settings.p1Name}: ${coinsCollectedP1} 💿 | ${settings.p2Name}: ${coinsCollectedP2} 💿<br>`; 

  if (finalFrame1 > highScore1){ highScore1 = finalFrame1; localStorage.setItem('highScoreP1', highScore1); }
  if (finalFrame2 > highScore2){ highScore2 = finalFrame2; localStorage.setItem('highScoreP2', highScore2); }
  
  // Permanent wallet growth integration
  totalCoinsP1 += coinsCollectedP1 + (diamondsCollectedP1 * 10);
  totalCoinsP2 += coinsCollectedP2 + (diamondsCollectedP2 * 10);
  totalDiamondsP1 += diamondsCollectedP1;
  totalDiamondsP2 += diamondsCollectedP2;
  
  localStorage.setItem('totalCoinsP1', totalCoinsP1);
  localStorage.setItem('totalCoinsP2', totalCoinsP2);
  localStorage.setItem('totalDiamondsP1', totalDiamondsP1);
  localStorage.setItem('totalDiamondsP2', totalDiamondsP2);

  if (gameEndedByWin){
    if (finalFrame1 > finalFrame2){ msg += `🎉 ${settings.p1Name} reached the goal! (+5000 Coins)`; winsP1++; }
    else { msg += `🎉 ${settings.p2Name} reached the goal! (+5000 Coins)`; winsP2++; }
  } else if (finalFrame1 > finalFrame2){ msg += `🏆 ${settings.p1Name} Survived Longer!`; winsP1++; }
  else if (finalFrame2 > finalFrame1){ msg += `🏆 ${settings.p2Name} Survived Longer!`; winsP2++; }
  else { msg += "🤝 It's a Tie!"; }
  
  localStorage.setItem('winsP1', winsP1);
  localStorage.setItem('winsP2', winsP2);
  w.innerHTML = msg;
  updateHighScoresDisplay();
}

function updateStatsDisplay(){
  document.getElementById('statsContent').innerHTML = `
      <h4>🏆 High Score (Frames)</h4>
      <p>${settings.p1Name}: ${highScore1} | ${settings.p2Name}: ${highScore2}</p>
      <h4>🎉 Total Wins</h4>
      <p>${settings.p1Name}: ${winsP1} | ${settings.p2Name}: ${winsP2}</p>
      <h4>💰 Total Vault Wallet</h4>
      <p>${settings.p1Name}: ${totalCoinsP1} 💿 (${totalDiamondsP1} 💎) [Bank Vault: ${bankCoinsP1} 💿]</p>
      <p>${settings.p2Name}: ${totalCoinsP2} 💿 (${totalDiamondsP2} 💎) [Bank Vault: ${bankCoinsP2} 💿]</p>
  `;
}

function updateHighScoresDisplay(){
  document.getElementById('highScores').innerHTML = `🏆 High Score P1: ${highScore1} &nbsp;&nbsp; 🏆 High Score P2: ${highScore2}`;
}

function movePlayer1(n){ if (player1Alive) player1.gravity = n; }
function movePlayer2(n){ if (player2Alive) player2.gravity = n; }
function movePlayer1Boost(n){ if (player1Alive && !isMobile) player1.gravity = n; }
function movePlayer2Boost(n){ if (player2Alive && !isMobile) player2.gravity = n; }
function resetProgress(){ localStorage.clear(); location.reload(); }

// --- KEYBOARD EVENT CONTROLLERS ---
document.addEventListener('keydown', e=>{
  if (e.key === 'w') movePlayer1(-0.22);
  if (e.key === 'ArrowUp') movePlayer2(-0.22);
  if (e.key === 's') movePlayer1Boost(-0.8);
  if (e.code === 'Space') movePlayer2Boost(-0.8);
});
document.addEventListener('keyup', e=>{
  if (e.key === 'w' || e.key === 's') movePlayer1(0.09);
  if (e.key === 'ArrowUp' || e.code === 'Space') movePlayer2(0.09);
});

// Initial startup routines
loadSettings(); 
applySettings();
updateHighScoresDisplay();
// --- CENTRAL BANKING MANAGEMENT UTILITIES ---

function openBank() {
  refreshBankDisplay();
  document.getElementById('bankPopup').style.display = 'block';
}

function closeBank() {
  document.getElementById('bankPopup').style.display = 'none';
}

function refreshBankDisplay() {
  // Synchronize Custom Nicknames
  document.getElementById('bankP1Name').textContent = settings.p1Name;
  document.getElementById('bankP2Name').textContent = settings.p2Name;

  // Render Current Values
  document.getElementById('bankPocketP1').textContent = totalCoinsP1;
  document.getElementById('bankVaultP1').textContent = bankCoinsP1;
  
  document.getElementById('bankPocketP2').textContent = totalCoinsP2;
  document.getElementById('bankVaultP2').textContent = bankCoinsP2;
}

function executeBankAction(playerNum, action) {
  const inputField = document.getElementById(`bankAmountP${playerNum}`);
  const val = parseInt(inputField.value);

  if (isNaN(val) || val <= 0) {
    alert("Please enter a valid amount higher than zero!");
    return;
  }

  if (playerNum === 1) {
    if (action === 'deposit') {
      if (totalCoinsP1 >= val) {
        totalCoinsP1 -= val;
        bankCoinsP1 += val;
        alert(`Successfully deposited ${val} 💿 to your safe vault!`);
      } else { alert(`Insufficient pocket coins!`); }
    } 
    else if (action === 'withdraw') {
      if (bankCoinsP1 >= val) {
        bankCoinsP1 -= val;
        totalCoinsP1 += val;
        alert(`Successfully withdrew ${val} 💿 to your active balance!`);
      } else { alert(`Insufficient vault coins inside your bank!`); }
    } 
    else if (action === 'transfer') {
      if (bankCoinsP1 >= val) {
        bankCoinsP1 -= val;
        bankCoinsP2 += val; // Securely wires funds straight to Player 2's secure vault storage
        alert(`Successfully wired ${val} 💿 directly to ${settings.p2Name}'s bank vault!`);
      } else { alert(`You need to have at least ${val} 💿 inside your Vault to initiate a secure transfer!`); }
    }
  } else { // Player 2 Operations Handling
    if (action === 'deposit') {
      if (totalCoinsP2 >= val) {
        totalCoinsP2 -= val;
        bankCoinsP2 += val;
        alert(`Successfully deposited ${val} 💿 to your safe vault!`);
      } else { alert(`Insufficient pocket coins!`); }
    } 
    else if (action === 'withdraw') {
      if (bankCoinsP2 >= val) {
        bankCoinsP2 -= val;
        totalCoinsP2 += val;
        alert(`Successfully withdrew ${val} 💿 to your active balance!`);
      } else { alert(`Insufficient vault coins inside your bank!`); }
    } 
    else if (action === 'transfer') {
      if (bankCoinsP2 >= val) {
        bankCoinsP2 -= val;
        bankCoinsP1 += val; // Securely wires funds straight to Player 1's secure vault storage
        alert(`Successfully wired ${val} 💿 directly to ${settings.p1Name}'s bank vault!`);
      } else { alert(`You need to have at least ${val} 💿 inside your Vault to initiate a secure transfer!`); }
    }
  }

  // Commit changes to persistent local cache memory
  localStorage.setItem('totalCoinsP1', totalCoinsP1);
  localStorage.setItem('totalCoinsP2', totalCoinsP2);
  localStorage.setItem('bankCoinsP1', bankCoinsP1);
  localStorage.setItem('bankCoinsP2', bankCoinsP2);

  // Clean data input context fields and reload readout metrics
  inputField.value = '';
  refreshBankDisplay();
}
