// ── Constants ──────────────────────────────────────────────
const TILE=28,COLS=22,ROWS=14,W=COLS*TILE,H=ROWS*TILE;
const T={E:0,B:1,S:2,L:3,R:4,G:5};
const BASE_HOLE=320,MIN_HOLE=160;

// ── Canvas ─────────────────────────────────────────────────
const canvas=document.getElementById('gc');

// Scale canvas to fit screen width while keeping aspect ratio
function resizeCanvas(){
  const maxW = Math.min(window.innerWidth - 16, 900);
  const scale = maxW / W;
  const dispW = Math.floor(W * scale);
  const dispH = Math.floor(H * scale);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = dispW + 'px';
  canvas.style.height = dispH + 'px';
  document.getElementById('wrap').style.setProperty('--w', dispW+'px');
  document.getElementById('wrap').style.width = dispW + 'px';
  const hud = document.getElementById('hud');
  if(hud) hud.style.maxWidth = dispW + 'px';
  const ctrl = document.getElementById('ctrl');
  if(ctrl) ctrl.style.maxWidth = dispW + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const ctx=canvas.getContext('2d');

// ── Audio ──────────────────────────────────────────────────
const AC=new(window.AudioContext||window.webkitAudioContext)();
let soundEnabled=true,showFPS=false;
function beep(f,t,d,v=.18,w=0){
  if(!soundEnabled)return;
  try{const g=AC.createGain(),o=AC.createOscillator();
  o.connect(g);g.connect(AC.destination);
  o.type=t;o.frequency.setValueAtTime(f,AC.currentTime+w);
  g.gain.setValueAtTime(v,AC.currentTime+w);
  g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+w+d);
  o.start(AC.currentTime+w);o.stop(AC.currentTime+w+d+.05);}catch(e){}
}
function sndCollect(){beep(880,'sine',.08,.12);beep(1320,'sine',.08,.1,.06);}
function sndDig(){beep(120,'sawtooth',.12,.15);beep(80,'sawtooth',.1,.1,.08);}
function sndDeath(){beep(440,'sawtooth',.15,.2);beep(220,'sawtooth',.2,.18,.1);beep(110,'sawtooth',.3,.15,.2);}
function sndTrap(){beep(200,'square',.05,.12);beep(150,'square',.08,.1,.04);}
function sndTeleport(){[0,.04,.08,.12,.16,.2,.24].forEach((t,i)=>{beep(200+i*180,'sawtooth',.08,.22,t);});beep(2000,'sine',.3,.25,.28);}
function sndCountdown(){beep(440,'sine',.1,.15);}
function sndGo(){beep(880,'sine',.05,.2);beep(1320,'sine',.1,.18,.06);}
document.addEventListener('pointerdown',()=>AC.resume(),{once:true});
document.addEventListener('keydown',()=>AC.resume(),{once:true});

// ── Themes ─────────────────────────────────────────────────
let currentTheme='phantom';
const THEMES={
  phantom:{name:'PHANTOM GRID',sky:'#020617',bk:'#0f172a',bf:'#1e293b',bm:'#020617',ld:'#2dd4bf',lr:'#0d9488',br:'#1e3a5f',bs:'#2dd4bf',gd:'#fde68a',gs:'#fff',py:'#ccfbf1',pd:'#0d9488',en:'#7c3aed',ed:'#4c1d95',eh:'#6d28d9',hl:'#000010',eEye:'#fde68a',flash:'#ffffff',goldCircle:true},

};
function C(){return THEMES[currentTheme];}
// Theme locked to Phantom Grid
function selectTheme(n){ currentTheme='phantom'; }

// ── Difficulty ─────────────────────────────────────────────
let settingSpeed=3,settingDiff=2;
const SPEED_LABELS={1:'Slow',2:'Slow',3:'Normal',4:'Fast',5:'Fast'};
const SPEED_PW={1:16,2:13,3:10,4:7,5:5};
const SPEED_PF={1:8,2:6,3:5,4:4,5:3};
const DIFF_ES={1:1.5,2:1.0,3:.7};
const DIFF_HL={1:1.4,2:1.0,3:.7};
const DIFF_LABELS={1:'Easy',2:'Normal',3:'Hard'};
let PLAYER_WALK=10,PLAYER_FALL=5;
function applySpeed(v){settingSpeed=+v;PLAYER_WALK=SPEED_PW[v];PLAYER_FALL=SPEED_PF[v];document.getElementById('sp-val').textContent=SPEED_LABELS[v];localStorage.setItem('pg_speed',v);}
function applyDifficulty(v){settingDiff=+v;document.getElementById('df-val').textContent=DIFF_LABELS[v];localStorage.setItem('pg_diff',v);}
function enemySpeed(lvl){return Math.round(Math.max(13,22-Math.floor(lvl*.65))*DIFF_ES[settingDiff]);}
function holeLife(lvl){return Math.round(Math.max(MIN_HOLE,(BASE_HOLE-lvl*11)*DIFF_HL[settingDiff]));}
let ladderAssistEnabled = localStorage.getItem('pg_ladder_assist')!=='0';
let digButtonsVisible = false;

function toggleDigButtons(on){
  digButtonsVisible=on;
  const ov=document.getElementById('dig-overlay');
  if(ov) ov.style.display=on?'flex':'none';
  localStorage.setItem('pg_dig_buttons',on?1:0);
}

(function(){
  const sp=+localStorage.getItem('pg_speed')||3;
  const df=+localStorage.getItem('pg_diff')||2;
  document.getElementById('sp-sl').value=sp; applySpeed(sp);
  document.getElementById('df-sl').value=df; applyDifficulty(df);
  // Restore dig buttons state
  const db=localStorage.getItem('pg_dig_buttons')==='1';
  const dbTog=document.getElementById('db-tog');
  if(dbTog){dbTog.checked=db; if(db)toggleDigButtons(true);}
  // Restore ladder assist
  const la=localStorage.getItem('pg_ladder_assist')!=='0';
  const laTog=document.getElementById('la-tog');
  if(laTog) laTog.checked=la;
})();

// ── Level names & data ─────────────────────────────────────
const LEVEL_NAMES=["THE GATE","THE CANYON","THE SPINE","THE TRIPOD","THE WINGS","THE GRID","THE COMB","THE TOWER","THE ZIGZAG","THE CROSS","THE LABYRINTH","THE GAUNTLET","THE CASCADE","THE FORTRESS","THE NEXUS"];
const LEVELS=[
 ["0000000030000300000000","0000000030000300000000","0000500030000300050000","1111111131111311111111","0000000030000300000000","0000000030000300000000","0000500030000300050000","1111111131111311111111","0000000030000300000000","0000500030000300050000","1111111131111311111111","0000000030000300000000","0000000030000300000000","1111111111111111111111"],
 ["0030000000000000000300","0030000000000000000300","0030000500050050000300","1131111111111111111311","0030000000000000000300","0030000000000000000300","0030000500050050000300","1131111111111111111311","0030000000000000000300","0030000500050050000300","1131111111111111111311","0030000000000000000300","0030000000000000000300","1111111111111111111111"],
 ["0000000000300000000000","0000000000300000000000","0000000000300000000000","1111111111311111111111","0000000000300000000000","0000000050305000000000","1111111111311111111111","0000000000300000000000","0000000050305000000000","1111111111311111111111","0000000000300000000000","0000000050305000000000","1111111111111111111111","1111111111111111111111"],
 ["0000030000030000030000","0000030000030000030000","0050030050030050030500","1111131111131111131111","0000030000030000030000","0000030000030000030000","0050030050030050030500","1111131111131111131111","0000030000030000030000","0050030050030050030500","1111131111131111131111","0000030000030000030000","0000030000030000030000","1111111111111111111111"],
 ["0003000000000000003000","0003000000000000003000","0003000005005000003000","1113111111111111113111","0003000000000000003000","4443444444444444443444","0003000005005000003000","1113111111111111113111","0003000000000000003000","0003000005005000003000","1113111111111111113111","0003000000000000003000","4443444444444444443444","1111111111111111111111"],
 ["0000300003000030000300","0000300003000030000300","0500305003050030500300","1111311113111131111311","0000300003000030000300","0000300003000030000300","0500305003050030500300","1111311113111131111311","0000300003000030000300","0500305003050030500300","1111311113111131111311","0000300003000030000300","0000300003000030000300","1111111111111111111111"],
 ["0030000300000030000300","0030000300000030000300","5030500300500030500305","1131111311111131111311","0030000300000030000300","4434444344444434444344","5030500300500030500305","1131111311111131111311","0030000300000030000300","5030500300500030500305","1131111311111131111311","4434444344444434444344","5030500300500030500305","1111111111111111111111"],
 ["0000000000330000000000","0000000000330000000000","0000000000330000000000","1111111111331111111111","0000000000330000000000","4444444444334444444444","0000500000330000050000","1111111111331111111111","0000000000330000000000","0000500000330000050000","1111111111331111111111","4444444444334444444444","0000500000330000050000","1111111111111111111111"],
 ["0000300000000000000000","0000300000000000000000","0500300050000000000000","1111311111111111131111","0000300000000000000000","0500300050000000000000","1111311111111111131111","0000000000000000030000","0000000000000500030050","1111311111111111131111","0000000000000000030000","0000000000000500030050","1111111111111111111111","1111111111111111111111"],
 ["0000030000300000300000","0000030000300000300000","0500030500300500300500","1111131111311111311111","0000030000300000300000","4444434444344444344444","0500030500300500300500","1111131111311111311111","0000030000300000300000","4444434444344444344444","0500030500300500300500","1111131111311111311111","0000030000300000300000","1111111111111111111111"],
 // L11 fixed — ladders connect all floors
 ["0003000000030000000000","0003000000030000000000","0003005000030500000000","1113111111131111111111","0003000000030000000000","0003005000030500000000","1113111111131111111111","0003000000030000003000","0003005000030050003000","1113111111131111113111","0003000000030000003000","0003005000030050003000","1113111111131111113111","1111111111111111111111"],
 ["0003000030000300003000","0003000030000300003000","5003050030500305003050","1113111131111311113111","0003000030000300003000","4443444434444344443444","5003050030500305003050","1113111131111311113111","4443444434444344443444","5003050030500305003050","1113111131111311113111","0003000030000300003000","4443444434444344443444","1111111111111111111111"],
 ["0030000000030000000000","0030000000030000000000","0030050050030000000000","1131111111131111111131","0030000000030000000000","0030050050030000000000","1131111111131111111131","0000000000030000000030","0000050000030005000030","1131111111131111111131","0000000000030000000030","0000050000030005000030","1111111111111111111111","1111111111111111111111"],
 ["0030000300000030000300","0030000300000030000300","5030500300500030500305","1131111311111131111311","0030000300000030000300","4434444344444434444344","5030500300500030500305","1131111311111131111311","0030000300000030000300","4434444344444434444344","5030500300500030500305","1131111311111131111311","4434444344444434444344","1111111111111111111111"],
 ["0030030000300000300300","0030030000300000300300","5035030500300500350305","1131131111311111311311","4434434444344444344344","5035030500300500350305","1131131111311111311311","0030030000300000300300","4434434444344444344344","5035030500300500350305","1131131111311111311311","4434434444344444344344","5035030500300500350305","1111111111111111111111"],
];

// ── State ──────────────────────────────────────────────────
let grid,player,enemies,score,lives,goldTotal,goldLeft;
let gameState='idle',paused=false,loopId,tick=0;
let holeTimers=[],keys={},level=0;
let teleporting=false;
let highScore=+localStorage.getItem('pg_hs')||0;
let collectedGoldPositions=new Set();
let levelStartTime=0;
let unlockedLevels=+localStorage.getItem('pg_unlocked')||1;
let lbLevel=0;

// Player profile
let savedInitials=localStorage.getItem('pg_initials')||'';
let pendingScoreEntry=null;

// Fixed timestep
const STEP_MS=1000/60;
let lastTime=0,accumulator=0;

// ── Level builder ───────────────────────────────────────────
function buildLevel(idx){
  const src=LEVELS[idx%LEVELS.length];
  grid=[];goldTotal=0;goldLeft=0;
  for(let r=0;r<ROWS;r++){
    grid[r]=[];
    for(let c=0;c<COLS;c++){
      const t=+src[r][c];
      grid[r][c]=t;
      if(t===T.G){goldTotal++;goldLeft++;}
    }
  }
}

function initLevel(idx,isSoftRespawn=false){
  holeTimers=[];teleporting=false;
  if(!isSoftRespawn){
    buildLevel(idx);
    collectedGoldPositions.clear();
    levelStartTime=performance.now();
  } else {
    // Soft respawn — rebuild but remove already collected gold
    buildLevel(idx);
    goldLeft=goldTotal;
    collectedGoldPositions.forEach(key=>{
      const [c,r]=key.split('_').map(Number);
      if(grid[r]&&grid[r][c]===T.G){grid[r][c]=T.E;goldLeft--;}
    });
  }
  const ps=findSpawn(10,1);
  player={col:ps.c,row:ps.r,dead:false,frame:0,facing:1,walkTimer:0,fallTimer:0};
  const n=Math.min(2+Math.floor(idx/3),6);
  const spd=enemySpeed(idx);
  const sc=[2,19,1,20,5,16],so=[0,4,7,2,6,1];
  enemies=Array.from({length:n},(_,i)=>({
    col:sc[i%6],row:1,inHole:false,carriesGold:false,
    savedGoldCol:-1,savedGoldRow:-1,frame:0,
    walkTimer:so[i%6],fallTimer:0,
    walkSpeed:spd+so[i%6],thinkTimer:(i*3)%7,
    thinkInterval:4+(i%4),goal:'patrol',dir:i%2===0?1:-1,
    stuckCounter:0,lastCol:-1,lastRow:-1,patrolCooldown:0,
  }));
  updateHUD();
  startCountdown();
}

function findSpawn(col,row){
  for(let dr=0;dr<ROWS;dr++)for(let dc=-3;dc<=3;dc++){
    const c=col+dc,r=row+dr;
    if(c<0||c>=COLS||r<0||r>=ROWS)continue;
    if(grid[r][c]===T.E&&hasSupport(c,r))return{c,r};
  }
  return{c:col,r:row};
}

// ── Countdown ───────────────────────────────────────────────
let countdownActive=false;
function startCountdown(){
  countdownActive=true;
  gameState='playing'; paused=false;
  const wrap=document.getElementById('countdown-wrap');
  const num=document.getElementById('countdown-num');
  wrap.classList.remove('hidden');
  const steps=['3','2','1','GO!'];
  const colors=['#fde68a','#fde68a','#fde68a','#2dd4bf'];
  let i=0;
  function showNext(){
    if(i>=steps.length){
      wrap.classList.add('hidden');
      countdownActive=false;
      return;
    }
    num.textContent=steps[i];
    num.style.color=colors[i];
    num.style.fontSize=steps[i]==='GO!'?'72px':'96px';
    // pop animation
    num.style.transform='scale(1.4)';
    requestAnimationFrame(()=>{
      num.style.transition='transform 0.7s ease-out';
      num.style.transform='scale(1.0)';
    });
    if(steps[i]==='3'||steps[i]==='2'||steps[i]==='1') sndCountdown();
    else sndGo();
    i++;
    setTimeout(showNext, steps[i-1]==='GO!'?800:1000);
  }
  showNext();
}

// ── Tile queries ────────────────────────────────────────────
function tileAt(c,r){if(r<0)return T.E;if(r>=ROWS)return T.S;if(c<0||c>=COLS)return T.S;return grid[r][c];}
function isSolid(c,r){const t=tileAt(c,r);return t===T.B||t===T.S;}
function isPass(c,r){return tileAt(c,r)in{0:1,3:1,4:1,5:1};}
function hasSupport(c,r){const t=tileAt(c,r),b=tileAt(c,r+1);return isSolid(c,r+1)||r>=ROWS-1||t===T.L||b===T.L||t===T.R;}
function isLad(c,r){return tileAt(c,r)===T.L;}
function isBar(c,r){return tileAt(c,r)===T.R;}
function isActiveHole(c,r){return holeTimers.some(h=>h.col===c&&h.row===r);}

// ── Dig ─────────────────────────────────────────────────────
function tryDig(dir){
  if(player.dead||gameState!=='playing'||paused||teleporting||countdownActive)return;
  const dc=dir==='left'?-1:1;
  const digC=player.col+dc,digR=player.row+1;
  if(!hasSupport(player.col,player.row))return;
  if(tileAt(digC,digR)!==T.B)return;
  if(enemies.some(e=>e.col===digC&&e.row===digR&&!e.inHole))return;
  grid[digR][digC]=T.E;
  holeTimers.push({col:digC,row:digR,timer:holeLife(level)});
  score+=10;updateHUD();sndDig();
}

// ── Player movement ─────────────────────────────────────────
function stepPlayer(){
  if(player.dead||teleporting||countdownActive)return;
  const c=player.col,r=player.row,cur=tileAt(c,r);
  const onL=cur===T.L,onB=cur===T.R;
  const onG=isSolid(c,r+1)||r>=ROWS-1||onL||isActiveHole(c,r+1);
  if(!onG&&!onB){
    player.fallTimer++;
    if(player.fallTimer>=PLAYER_FALL){
      player.fallTimer=0;
      const nr=r+1;
      if(nr<ROWS&&isPass(c,nr)&&!isActiveHole(c,nr))player.row=nr;
    }
    checkEC();return;
  }
  player.fallTimer=0;player.walkTimer++;
  if(player.walkTimer<PLAYER_WALK)return;
  player.walkTimer=0;
  let mv=false;
  if(keys['ArrowLeft']){player.facing=-1;const nc=c-1;if(nc>=0&&isPass(nc,r)&&(onG||onB||isBar(nc,r))){player.col=nc;mv=true;}}
  else if(keys['ArrowRight']){player.facing=1;const nc=c+1;if(nc<COLS&&isPass(nc,r)&&(onG||onB||isBar(nc,r))){player.col=nc;mv=true;}}
  if(keys['ArrowUp']){
    if(onL){const nr=r-1;if(nr>=0&&isPass(c,nr)){player.row=nr;mv=true;}}
    else if(ladderAssistEnabled&&!mv){
      // Ladder assist — check adjacent columns
      for(const dc of[-1,1]){
        const nc=c+dc;
        if(nc>=0&&nc<COLS&&isLad(nc,r)&&isPass(nc,r)){
          player.col=nc;
          const nr=r-1;
          if(nr>=0&&isPass(nc,nr)){player.row=nr;}
          mv=true;break;
        }
      }
    }
  }
  else if(keys['ArrowDown']){
    if(onL&&r+1<ROWS&&isPass(c,r+1)&&!isActiveHole(c,r+1)){player.row=r+1;mv=true;}
    if(!mv&&onG&&isLad(c,r+1)&&r+1<ROWS){player.row=r+1;mv=true;}
    if(!mv&&ladderAssistEnabled){
      for(const dc of[-1,1]){
        const nc=c+dc;
        if(nc>=0&&nc<COLS&&isLad(nc,r)&&isPass(nc,r)){
          player.col=nc;
          const nr=r+1;
          if(nr<ROWS&&isPass(nc,nr)&&!isActiveHole(nc,nr)){player.row=nr;}
          mv=true;break;
        }
      }
    }
  }
  if(mv)player.frame=(player.frame+1)%4;
  checkEC();
}
function checkEC(){
  for(const e of enemies){
    if(e.col===player.col&&e.row===player.row&&!e.inHole&&!player.dead){killPlayer();return;}
  }
}

// ── Gold & win ───────────────────────────────────────────────
function checkGold(){
  if(teleporting||countdownActive)return;
  if(tileAt(player.col,player.row)===T.G){
    const key=`${player.col}_${player.row}`;
    grid[player.row][player.col]=T.E;
    goldLeft--;score+=100;
    collectedGoldPositions.add(key);
    updateHUD();sndCollect();
    if(goldLeft===0)triggerTeleport();
  }
}

// ── Teleport ─────────────────────────────────────────────────
function triggerTeleport(){
  teleporting=true;sndTeleport();
  const elapsed=(performance.now()-levelStartTime)/1000;
  const speedBonus=Math.max(0,1000-Math.round(elapsed*10));
  const baseBonus=500+level*50;
  setTimeout(()=>{
    score+=baseBonus+speedBonus;
    if(score>highScore){highScore=score;localStorage.setItem('pg_hs',highScore);}
    // Unlock next level
    if(level+1>=unlockedLevels){
      unlockedLevels=Math.min(level+2,LEVELS.length);
      localStorage.setItem('pg_unlocked',unlockedLevels);
    }
    // Check leaderboard
    checkLeaderboardEntry(level,score,elapsed);
    level++;
    if(level>=LEVELS.length){
      showCredits();
    } else {
      showBanner();
    }
    updateHUD();
  },1800);
}

function showBanner(){
  gameState='banner';
  setTimeout(()=>{
    gameState='playing';
    initLevel(level);
  },1600);
}

// ── Soft respawn ─────────────────────────────────────────────
function softRespawn(){
  if(lives<=0){showGameOver();return;}
  initLevel(level,true);
}

// ── Enemies ───────────────────────────────────────────────────
function stepEnemy(e){
  if(e.inHole||teleporting||countdownActive)return;
  const c=e.col,r=e.row,cur=tileAt(c,r);
  const onL=cur===T.L,onB=cur===T.R,onG=isSolid(c,r+1)||r>=ROWS-1||onL;
  if(!onG&&!onB){
    e.fallTimer++;
    if(e.fallTimer>=5){e.fallTimer=0;if(r+1<ROWS&&isPass(c,r+1)){e.row++;checkEH(e);}}
    return;
  }
  e.fallTimer=0;e.walkTimer++;
  if(e.walkTimer<e.walkSpeed)return;
  e.walkTimer=0;
  e.thinkTimer++;
  if(e.thinkTimer>=e.thinkInterval){
    e.thinkTimer=0;
    const d=Math.abs(player.col-c)+Math.abs(player.row-r);
    if(e.patrolCooldown<=0){
      e.goal=(d<9||Math.random()<.65)?'chase':'patrol';
      if(e.goal==='patrol'&&Math.random()<.35)e.dir*=-1;
    }
  }
  if(e.patrolCooldown>0){e.patrolCooldown--;e.goal='patrol';}
  let mv=false;
  if(e.goal==='chase'){
    const rd=player.row-r,cd=player.col-c;
    if(onL&&rd!==0){const nr=r+(rd>0?1:-1);if(nr>=0&&nr<ROWS&&isPass(c,nr)){e.row=nr;mv=true;}}
    if(!mv&&rd>0&&onG&&isLad(c,r+1)){e.row++;mv=true;}
    if(!mv&&cd!==0){const hd=cd>0?1:-1,nc=c+hd;if(nc>=0&&nc<COLS&&isPass(nc,r)){e.col=nc;e.dir=hd;mv=true;}}
    if(!mv&&onG){const hd=player.col>c?1:-1;for(let dc=1;dc<=4;dc++){const lc=c+hd*dc;if(lc<0||lc>=COLS)break;if(isLad(lc,r)||isLad(lc,r+1)){const nc=c+hd;if(nc>=0&&nc<COLS&&isPass(nc,r)){e.col=nc;e.dir=hd;mv=true;}break;}if(!isPass(lc,r))break;}}
  }else{
    const nc=c+e.dir;
    if(nc>=0&&nc<COLS&&isPass(nc,r)&&(onG||onB)){e.col=nc;mv=true;}
    else{e.dir*=-1;const nc2=c+e.dir;if(nc2>=0&&nc2<COLS&&isPass(nc2,r)){e.col=nc2;mv=true;}}
  }
  if(mv)e.frame=(e.frame+1)%4;
  // Stuck detection fix
  if(e.col===e.lastCol&&e.row===e.lastRow){
    e.stuckCounter++;
  }else{e.stuckCounter=0;e.lastCol=e.col;e.lastRow=e.row;}
  if(e.stuckCounter>=3){e.goal='patrol';e.dir*=-1;e.stuckCounter=0;e.patrolCooldown=20;}
  // Ladder escape
  if(onL&&e.stuckCounter>=2){
    for(const dc of[-1,1]){const nc=c+dc;if(nc>=0&&nc<COLS&&isPass(nc,r)){e.col=nc;e.dir=dc;e.stuckCounter=0;break;}}
  }
  checkEH(e);
}

function checkEH(e){
  const h=holeTimers.find(h=>h.col===e.col&&h.row===e.row);
  if(h&&!e.inHole){
    e.inHole=true;sndTrap();
    if(tileAt(e.col,e.row)===T.G){e.carriesGold=true;e.savedGoldCol=e.col;e.savedGoldRow=e.row;grid[e.row][e.col]=T.E;}
    score+=200;updateHUD();
  }
}

function respawnEnemy(e){
  if(e.carriesGold&&e.savedGoldRow>=0){
    if(tileAt(e.savedGoldCol,e.savedGoldRow)===T.E){grid[e.savedGoldRow][e.savedGoldCol]=T.G;goldLeft++;}
    e.carriesGold=false;
  }
  e.inHole=false;
  for(let c=0;c<COLS;c++)if(isPass(c,0)&&isPass(c,1)){e.col=c;e.row=0;return;}
  e.col=0;e.row=0;
}

// ── Holes ─────────────────────────────────────────────────────
// Track which holes have warnings shown
const holesWarned=new Set();

function stepHoles(){
  for(let i=holeTimers.length-1;i>=0;i--){
    const h=holeTimers[i];h.timer--;
    // Show warning when hole about to close
    const key=h.col+'_'+h.row;
    if(h.timer<80 && !holesWarned.has(key)){
      holesWarned.add(key);
      showHoleWarning(h.col,h.row);
    }
    if(h.timer<=0){
      holesWarned.delete(key);
      removeHoleWarning(h.col,h.row);
      enemies.filter(e=>e.col===h.col&&e.row===h.row&&e.inHole).forEach(respawnEnemy);
      if(player.col===h.col&&player.row===h.row&&!player.dead)killPlayer();
      grid[h.row][h.col]=T.B;
      holeTimers.splice(i,1);
    }
  }
}

function showHoleWarning(c,r){
  // Will be drawn in the draw loop via holeWarnings set
}
function removeHoleWarning(c,r){
  // Cleaned up automatically
}

// ── Kill ───────────────────────────────────────────────────────
function killPlayer(){
  if(player.dead||teleporting)return;
  player.dead=true;lives--;updateHUD();sndDeath();
  // Death flash
  flashDeathScreen();
  // -1 LIFE text
  showLifeLost();
  // Flash lives HUD
  flashLivesHUD();
  setTimeout(()=>{
    if(lives<=0){showGameOver();}
    else{softRespawn();}
  },900);
}

function flashDeathScreen(){
  const wrap=document.getElementById('wrap');
  const flash=document.createElement('div');
  flash.style.cssText='position:absolute;inset:0;background:rgba(239,68,68,0.45);z-index:88;pointer-events:none;';
  wrap.appendChild(flash);
  setTimeout(()=>flash.remove(),400);
}

function showLifeLost(){
  const wrap=document.getElementById('wrap');
  const el=document.createElement('div');
  el.textContent='-1 LIFE';
  el.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:Space Mono,monospace;font-size:28px;font-weight:700;color:#f87171;text-shadow:2px 2px 0 #000;z-index:89;pointer-events:none;transition:all 1.2s;';
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.transform='translate(-50%,-120%)'; el.style.opacity='0'; },100);
  setTimeout(()=>el.remove(),1300);
}

function flashLivesHUD(){
  const lv=document.getElementById('h-lives');
  if(!lv)return;
  let count=0;
  const orig=lv.style.color;
  const iv=setInterval(()=>{
    lv.style.color=count%2===0?'#f87171':'#2dd4bf';
    count++;
    if(count>=6){clearInterval(iv);lv.style.color=orig;}
  },150);
}

// ── Draw ───────────────────────────────────────────────────────
function drawGrid(){
  const c=C();
  ctx.fillStyle=c.sky;ctx.fillRect(0,0,W,H);
  for(let r=0;r<ROWS;r++)for(let cl=0;cl<COLS;cl++){
    const x=cl*TILE,y=r*TILE,t=grid[r][cl];
    if(t===T.B){
      ctx.fillStyle=c.bk;ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle=c.bf;ctx.fillRect(x+1,y+1,TILE-2,Math.floor(TILE*.45));ctx.fillRect(x+1,y+Math.ceil(TILE*.52),TILE-2,Math.floor(TILE*.44));
      ctx.fillStyle=c.bm;ctx.fillRect(x,y+Math.floor(TILE*.48),TILE,2);ctx.fillRect(x+Math.floor(TILE*.5),y,2,Math.floor(TILE*.48));ctx.fillRect(x,y+Math.floor(TILE*.5),Math.floor(TILE*.5),2);
    }else if(t===T.S){
      ctx.fillStyle=c.bk;ctx.fillRect(x,y,TILE,TILE);ctx.fillStyle=c.bf;ctx.fillRect(x+1,y+1,TILE-2,TILE-2);
    }else if(t===T.L){
      ctx.fillStyle=c.ld;ctx.fillRect(x+4,y,3,TILE);ctx.fillRect(x+TILE-7,y,3,TILE);
      ctx.fillStyle=c.lr;for(let ry=3;ry<TILE;ry+=7)ctx.fillRect(x+4,y+ry,TILE-8,2);
    }else if(t===T.R){
      ctx.fillStyle=c.br;ctx.fillRect(x,y+TILE/2-2,TILE,4);ctx.fillStyle=c.bs;ctx.fillRect(x,y+TILE/2-1,TILE,1);
    }else if(t===T.G){
      if(c.goldCircle){
        const gx=x+TILE/2,gy=y+TILE/2,gr=TILE*.28;
        ctx.fillStyle=c.gd;ctx.beginPath();ctx.arc(gx,gy,gr,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=c.gs;ctx.beginPath();ctx.arc(gx-gr*.3,gy-gr*.3,gr*.3,0,Math.PI*2);ctx.fill();
      }else{
        ctx.fillStyle=c.gd;ctx.fillRect(x+4,y+4,TILE-8,TILE-8);
        ctx.fillStyle=c.gs;ctx.fillRect(x+5,y+5,TILE-10,4);
        ctx.fillStyle=c.bm;ctx.fillRect(x+4,y+TILE/2-1,TILE-8,2);ctx.fillRect(x+TILE/2-1,y+4,2,TILE-8);
      }
    }
    const hole=holeTimers.find(h=>h.col===cl&&h.row===r);
    if(hole){ctx.fillStyle=c.hl;ctx.fillRect(x+2,y+2,TILE-4,TILE-4);}
  }
}

function drawPlayer(){
  const c=C(),x=player.col*TILE+2,y=player.row*TILE+2,s=TILE-4;
  ctx.globalAlpha=player.dead?.35:1;
  ctx.fillStyle=c.py;
  ctx.fillRect(x+Math.floor(s*.22),y+Math.floor(s*.03),Math.floor(s*.56),Math.floor(s*.3));
  ctx.fillRect(x+Math.floor(s*.18),y+Math.floor(s*.34),Math.floor(s*.64),Math.floor(s*.44));
  ctx.fillStyle=c.pd;
  const ls=(player.frame%2)*Math.floor(s*.1);
  ctx.fillRect(x+Math.floor(s*.18),y+Math.floor(s*.78),Math.floor(s*.26),Math.floor(s*.2)-ls);
  ctx.fillRect(x+Math.floor(s*.56),y+Math.floor(s*.78),Math.floor(s*.26),Math.floor(s*.2)+ls);
  const ex=player.facing>0?x+Math.floor(s*.58):x+Math.floor(s*.22);
  ctx.fillStyle=c.bk||'#020617';ctx.fillRect(ex,y+Math.floor(s*.08),Math.floor(s*.14),Math.floor(s*.1));
  ctx.globalAlpha=1;
}

function drawEnemy(e){
  const c=C(),x=e.col*TILE+2,y=e.row*TILE+2,s=TILE-4;
  if(e.inHole){
    ctx.globalAlpha=.7;ctx.fillStyle=c.eh;
    ctx.fillRect(x+Math.floor(s*.1),y+Math.floor(s*.55),Math.floor(s*.8),Math.floor(s*.45));
    ctx.fillStyle=c.eEye;
    ctx.fillRect(x+Math.floor(s*.22),y+Math.floor(s*.58),Math.floor(s*.18),Math.floor(s*.1));
    ctx.fillRect(x+Math.floor(s*.6),y+Math.floor(s*.58),Math.floor(s*.18),Math.floor(s*.1));
    ctx.globalAlpha=1;return;
  }
  ctx.fillStyle=c.en;
  ctx.fillRect(x+Math.floor(s*.18),y+Math.floor(s*.03),Math.floor(s*.64),Math.floor(s*.3));
  ctx.fillRect(x+Math.floor(s*.12),y+Math.floor(s*.34),Math.floor(s*.76),Math.floor(s*.44));
  ctx.fillStyle=c.ed;
  const lp=(e.frame%2)*Math.floor(s*.08);
  ctx.fillRect(x+Math.floor(s*.12),y+Math.floor(s*.78),Math.floor(s*.3),Math.floor(s*.2)-lp);
  ctx.fillRect(x+Math.floor(s*.58),y+Math.floor(s*.78),Math.floor(s*.3),Math.floor(s*.2)+lp);
  ctx.fillStyle=c.eEye;
  ctx.fillRect(x+Math.floor(s*.24),y+Math.floor(s*.08),Math.floor(s*.18),Math.floor(s*.12));
  ctx.fillRect(x+Math.floor(s*.58),y+Math.floor(s*.08),Math.floor(s*.18),Math.floor(s*.12));
  if(e.carriesGold){ctx.fillStyle=c.gd;ctx.beginPath();ctx.arc(x+s/2,y+3,4,0,Math.PI*2);ctx.fill();}
}

// ── Banner draw ─────────────────────────────────────────────
function drawBanner(){
  drawGrid();
  ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle=C().gd;
  ctx.font='bold 20px "Space Mono",monospace';
  ctx.textAlign='center';
  ctx.fillText(`LEVEL ${level+1}`,W/2,H/2-16);
  ctx.font='bold 9px "Space Mono",monospace';
  ctx.fillStyle=C().ld;
  ctx.fillText(LEVEL_NAMES[level%LEVEL_NAMES.length],W/2,H/2+8);
  ctx.font='bold 8px "Space Mono",monospace';
  ctx.fillStyle=C().gd;
  ctx.fillText('GET READY',W/2,H/2+26);
  ctx.textAlign='left';
}

function draw(){
  drawGrid();drawPlayer();enemies.forEach(drawEnemy);
  if(showFPS){
    const now2=performance.now();
    if(!draw._last)draw._last=now2;
    const fps=Math.round(1000/(now2-draw._last));
    draw._last=now2;
    ctx.fillStyle=C().gd;ctx.font='8px "Space Mono",monospace';
    ctx.fillText(`${fps}fps`,4,12);
  }
}

// ── Timer display ───────────────────────────────────────────
function formatTime(ms){const s=Math.floor(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}

// ── HUD ─────────────────────────────────────────────────────
function updateHUD(){
  document.getElementById('h-score').textContent=score;
  document.getElementById('h-best').textContent=Math.max(score,highScore);
  document.getElementById('h-gold').textContent=(goldTotal-goldLeft)+'/'+goldTotal;
  document.getElementById('h-lives').textContent=lives;
  document.getElementById('h-lvl').textContent=level+1;
}

// ── Game loop ────────────────────────────────────────────────
function gameLoop(now=0){
  loopId=requestAnimationFrame(gameLoop);
  const delta=Math.min(now-lastTime,100);lastTime=now;
  accumulator+=delta;
  while(accumulator>=STEP_MS){
    if(gameState==='playing'&&!paused&&!countdownActive){
      tick++;stepHoles();stepPlayer();checkGold();enemies.forEach(e=>stepEnemy(e));
    }
    accumulator-=STEP_MS;
  }
  if(gameState==='playing'&&!paused){
    draw();
    document.getElementById('h-time').textContent=formatTime(performance.now()-levelStartTime);
  }
  else if(gameState==='banner') drawBanner();
}

// ── Game flow ────────────────────────────────────────────────
function startGame(fromLevel=0){
  score=0;lives=3;level=fromLevel;
  hideAllOverlays();
  gameState='playing';
  initLevel(level);
}

function playAgain(){
  // Resume from current level — NOT level 1
  score=0;lives=3;
  hideAllOverlays();
  gameState='playing';
  collectedGoldPositions.clear();
  initLevel(level);
}

function goMainMenu(){
  gameState='idle';paused=false;
  hideAllOverlays();
  showMainMenu();
}

function showMainMenu(){
  hideAllOverlays();
  document.getElementById('title-ov').classList.remove('hidden');
  document.getElementById('t-hs').textContent=highScore>0?`BEST: ${highScore}`:'';
}

function showGameOver(){
  gameState='idle';
  document.getElementById('go-score').textContent=`SCORE: ${score}`;
  document.getElementById('go-best').textContent=`BEST: ${highScore}`;
  document.getElementById('gameover-ov').classList.remove('hidden');
}

function showCredits(){
  gameState='idle';
  hideAllOverlays();
  // Fill level list in credits
  const cr=document.getElementById('cr-levels');
  cr.innerHTML=LEVELS.map((_,i)=>`<span class="cr-lbl">Level ${i+1}</span><span class="cr-val">${LEVEL_NAMES[i]}</span>`).join('');
  document.getElementById('credits-ov').classList.remove('hidden');
  // Scroll credits
  const scroll=document.getElementById('credits-scroll');
  scroll.style.top=H+'px';
  let y=H;
  const scrollInterval=setInterval(()=>{
    if(gameState!=='idle'){clearInterval(scrollInterval);return;}
    y-=0.8;
    scroll.style.top=y+'px';
    if(y<-(scroll.offsetHeight)){clearInterval(scrollInterval);endCredits();}
  },16);
}

function endCredits(){
  hideAllOverlays();showMainMenu();
}

function hideAllOverlays(){
  ['title-ov','gameover-ov','pause-ov','levelsel-ov','lb-ov','settings-ov','credits-ov'].forEach(id=>{
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById('initials-modal').classList.add('hidden');
  document.getElementById('countdown-wrap').classList.add('hidden');
}

// ── Pause ────────────────────────────────────────────────────
function togglePause(){
  if(gameState!=='playing')return;
  paused=!paused;
  document.getElementById('pause-ov').classList.toggle('hidden',!paused);
  document.getElementById('pause-info').textContent='LVL '+(level+1)+' · SCORE '+score;
  // Freeze/unfreeze game loop
  if(paused){
    // Store last time to prevent time jump on resume
    lastTime=0;
    accumulator=0;
  }
}

// ── Level Select ─────────────────────────────────────────────
function showLevelSelect(){
  hideAllOverlays();
  const grid2=document.getElementById('ls-grid');
  grid2.innerHTML='';
  for(let i=0;i<LEVELS.length;i++){
    const unlocked=i<unlockedLevels;
    const best=localStorage.getItem(`pg_best_L${i}`)||'';
    const btn=document.createElement('button');
    btn.className='ls-btn '+(unlocked?'unlocked':'locked');
    if(i===unlockedLevels-1&&unlocked)btn.classList.add('current');
    btn.innerHTML=unlocked?`<div>${i+1}</div><div style="font-size:7px;opacity:.7">${LEVEL_NAMES[i].split(' ')[1]||LEVEL_NAMES[i]}</div>${best?`<div style="font-size:6px;color:#2dd4bf">${best}</div>`:''}`:
                           `<div>🔒</div><div style="font-size:7px">${i+1}</div>`;
    if(unlocked)btn.onclick=()=>startGame(i);
    grid2.appendChild(btn);
  }
  document.getElementById('levelsel-ov').classList.remove('hidden');
}

// ── Leaderboard ───────────────────────────────────────────────
function showLeaderboard(lvl=0){
  hideAllOverlays();
  lbLevel=lvl;
  // Build tabs
  const tabs=document.getElementById('lb-tabs');
  tabs.innerHTML=LEVELS.map((_,i)=>`<button class="lb-tab${i===lvl?' active':''}" onclick="showLeaderboard(${i})">${i+1}</button>`).join('');
  renderLBTable(lvl);
  document.getElementById('lb-ov').classList.remove('hidden');
}

function renderLBTable(lvl){
  const scores=JSON.parse(localStorage.getItem(`pg_scores_L${lvl}`)||'[]');
  const tbl=document.getElementById('lb-table');
  tbl.innerHTML='<tr><th>#</th><th>NAME</th><th>SCORE</th><th>TIME</th></tr>';
  if(!scores.length){
    const tr=document.createElement('tr');
    tr.innerHTML='<td colspan="4" style="text-align:center;color:#334155;padding:8px;">NO SCORES YET</td>';
    tbl.appendChild(tr);return;
  }
  scores.forEach((s,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>#${i+1}</td><td>${s.name}</td><td>${s.score}</td><td>${formatTime(s.time*1000)}</td>`;
    tbl.appendChild(tr);
  });
}

// ── Leaderboard entry ─────────────────────────────────────────
function checkLeaderboardEntry(lvl,sc,elapsed){
  const key=`pg_scores_L${lvl}`;
  const scores=JSON.parse(localStorage.getItem(key)||'[]');
  const qualifies=scores.length<5||sc>scores[scores.length-1]?.score;
  if(!qualifies)return;
  pendingScoreEntry={lvl,sc,elapsed,key,scores};
  // Update best
  const bestKey=`pg_best_L${lvl}`;
  if(!localStorage.getItem(bestKey)||sc>+localStorage.getItem(bestKey)){
    localStorage.setItem(bestKey,sc);
  }
  document.getElementById('im-score-txt').textContent=`LEVEL ${lvl+1} · SCORE ${sc} · TIME ${formatTime(elapsed*1000)}`;
  if(savedInitials&&savedInitials.length===3){
    // Show confirmation
    document.getElementById('im-saved-initials').textContent=savedInitials;
    document.getElementById('im-confirm-section').style.display='flex';
    document.getElementById('im-confirm-section').style.flexDirection='column';
    document.getElementById('im-confirm-section').style.alignItems='center';
    document.getElementById('im-input-section').style.display='none';
  }else{
    showInitialsInput();
  }
  document.getElementById('initials-modal').classList.remove('hidden');
}

function confirmInitials(){
  saveScoreEntry(savedInitials);
}
function showInitialsInput(){
  document.getElementById('im-confirm-section').style.display='none';
  document.getElementById('im-input-section').style.display='flex';
  document.getElementById('im-input').value='';
  document.getElementById('im-input').focus();
}
function saveInitials(){
  const val=document.getElementById('im-input').value.trim().toUpperCase().slice(0,3);
  if(!val)return;
  savedInitials=val.padEnd(3,' ');
  localStorage.setItem('pg_initials',savedInitials);
  saveScoreEntry(savedInitials);
}
function skipInitials(){saveScoreEntry('???');}
function saveScoreEntry(name){
  if(!pendingScoreEntry)return;
  const {key,scores,sc,elapsed}=pendingScoreEntry;
  scores.push({name:name.trim()||'???',score:sc,time:elapsed});
  scores.sort((a,b)=>b.score-a.score);
  const trimmed=scores.slice(0,5);
  localStorage.setItem(key,JSON.stringify(trimmed));
  pendingScoreEntry=null;
  document.getElementById('initials-modal').classList.add('hidden');
}
function changePlayer(){
  savedInitials='';localStorage.removeItem('pg_initials');
  devMsg('Player reset — next score will ask for initials');
}

// ── Settings ──────────────────────────────────────────────────
function openSettings(){
  const wasPlaying=gameState==='playing'&&!paused;
  if(wasPlaying)togglePause();
  document.getElementById('settings-ov').classList.remove('hidden');
  // Build dev level grid
  const dg=document.getElementById('dev-lvl-grid');
  dg.innerHTML=LEVELS.map((_,i)=>`<button class="dev-lvl" onclick="devJumpTo(${i+1})">${i+1}</button>`).join('');
}
function closeSettings(){document.getElementById('settings-ov').classList.add('hidden');}

function switchStab(name,btn){
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ['game','audio','dev'].forEach(t=>document.getElementById('stab-'+t).style.display=t===name?'flex':'none');
}

// ── Dev mode ──────────────────────────────────────────────────
function devMsg(msg){
  const el=document.getElementById('dev-msg');
  el.textContent=msg;
  setTimeout(()=>el.textContent='',2500);
}
function devUnlockAll(){
  unlockedLevels=LEVELS.length;
  localStorage.setItem('pg_unlocked',unlockedLevels);
  devMsg('✓ All 15 levels unlocked');
}
function devReset(){
  if(!confirm('Reset ALL progress? This clears scores, unlocks, and settings.'))return;
  Object.keys(localStorage).filter(k=>k.startsWith('pg_')).forEach(k=>localStorage.removeItem(k));
  unlockedLevels=1;savedInitials='';score=0;lives=3;level=0;highScore=0;
  devMsg('✓ All progress reset');
}
function devJumpTo(lvl){
  closeSettings();
  score=0;lives=3;level=lvl-1;
  hideAllOverlays();
  gameState='playing';
  collectedGoldPositions.clear();
  initLevel(level);
}

// ── Tutorial ──────────────────────────────────────────────────
function showTutorial(){
  // Simple tutorial overlay on the title screen
  alert('PHANTOM GRID — HOW TO PLAY\n\n🎮 MOVE: Arrow keys (or on-screen D-pad)\n\n🪜 CLIMB: Up/Down arrows on ladders\n\n⛏ DIG: Z = dig left · X = dig right\n  (Also works on the floor row!)\n\n💀 TRAP: Dig holes next to enemies to trap them\n  Walk over trapped enemies safely\n\n⭕ WIN: Collect ALL gold orbs → teleport exit fires!\n\n⚡ SPEED BONUS: Finish fast for extra points\n\nP = Pause · SETTINGS for speed/difficulty\n\nGood luck! 👻');
}

// ── Input ─────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  keys[e.key]=true;
  if((e.key==='z'||e.key==='Z')&&!e.repeat)tryDig('left');
  if((e.key==='x'||e.key==='X')&&!e.repeat)tryDig('right');
  if(e.key==='p'||e.key==='P')togglePause();
  if(e.key==='Escape'){
    if(!document.getElementById('settings-ov').classList.contains('hidden'))closeSettings();
    else togglePause();
  }
});
document.addEventListener('keyup',e=>{keys[e.key]=false;});
function btnD(a){
  const m={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  keys[m[a]]=true;document.getElementById('btn-'+a)?.classList.add('pressed');
}
function btnU(a){
  const m={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  keys[m[a]]=false;document.getElementById('btn-'+a)?.classList.remove('pressed');
}

// ── Init ──────────────────────────────────────────────────────
// Prefill stab layout
document.getElementById('stab-game').style.display='flex';
document.getElementById('stab-game').style.flexDirection='column';
document.getElementById('stab-audio').style.display='none';
document.getElementById('stab-dev').style.display='none';

showMainMenu();
gameLoop();
