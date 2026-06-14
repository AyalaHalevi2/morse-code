/* ============================================================
   CIPHER//AGENT  —  Morse Codebreaking Academy
   Single-file-style app. Audio/Music engines preserved verbatim;
   shell, navigation and the learning loop rebuilt for 2026.
   ============================================================ */
const $ = id => document.getElementById(id);

/* ==================================================================
   1. MORSE DATA + TEACHING METADATA
   ================================================================== */
const MORSE = {
  A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",
  I:"..",J:".---",K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",
  Q:"--.-",R:".-.",S:"...",T:"-",U:"..-",V:"...-",W:".--",X:"-..-",
  Y:"-.--",Z:"--..",
  "0":"-----","1":".----","2":"..---","3":"...--","4":"....-",
  "5":".....","6":"-....","7":"--...","8":"---..","9":"----.",
  ".":".-.-.-",",":"--..--","?":"..--..","'":".----.",'!':"-.-.--",
  "/":"-..-.","(":"-.--.",")":"-.--.-","&":".-...",":":"---...",
  ";":"-.-.-.","=":"-...-","+":".-.-.","-":"-....-","_":"..--.-",
  '"':".-..-.","@":".--.-.","$":"...-..-"," ":" "
};
const REVMORSE = {}; for(const k in MORSE){ if(k!==" ") REVMORSE[MORSE[k]] = k; }

/* di/dah verbalisation, auto-derived (last dot = "dit") */
function verbalize(code){
  return code.split("").map((c,i)=>{
    if(c==="-") return "dah";
    return (i===code.length-1) ? "dit" : "di";
  }).join("-");
}
/* sound/visual mnemonics for the letters (numbers use a rule) */
const MNEMO = {
  A:"About-face — a short step, then a long stride.",
  B:"A Big boss (dah) leading three little dits.",
  C:"dah-di-dah-dit — a Can-Can kicking rhythm.",
  D:"Down the steps — one dah, two dits.",
  E:"The shortest signal — a single Easy dit.",
  F:"di-di-dah-dit — a Funny little stumble.",
  G:"Good Golly — two dahs then drop to a dit.",
  H:"Four quick dits — a Hurried whisper.",
  I:"Two dits — a quick 'hi'.",
  J:"Jump! — a dit then three long dahs.",
  K:"Kick-step-Kick — dah-di-dah. The 'come back' signal.",
  L:"di-dah-di-dit — a Little uneven shuffle.",
  M:"A Mighty Moo — two long dahs.",
  N:"dah-dit — the exact mirror of A.",
  O:"OMG — three long groans, all dahs.",
  P:"di-dah-dah-dit — Polly wants a cracker.",
  Q:"dah-dah-di-dah — 'God save the Queen'.",
  R:"di-dah-dit — a Roundtrip, out and back.",
  S:"Three dits — an S-S-S hiss.",
  T:"One long Tap — a single dah.",
  U:"di-di-dah — Up, up and away.",
  V:"di-di-di-dah — Beethoven's 'V for Victory'.",
  W:"di-dah-dah — the Whole Way up.",
  X:"dah-di-di-dah — X marks both ends.",
  Y:"dah-di-dah-dah — 'Yippee-ki-yay'.",
  Z:"dah-dah-di-dit — Zee big, then small."
};
function mnemonicFor(ch){
  if(MNEMO[ch]) return MNEMO[ch];
  if(/[0-9]/.test(ch)){
    const n=+ch;
    if(n>=1&&n<=5) return `${n} dit${n>1?"s":""} then ${5-n} dah${5-n!==1?"s":""} — 1→5 count up in dits.`;
    if(n>=6&&n<=9) return `${n-5} dah${n-5>1?"s":""} then ${10-n} dit${10-n!==1?"s":""} — 6→9 count down in dits.`;
    return "Five dahs — zero is all long.";
  }
  return verbalize(MORSE[ch]);
}

/* Koch-ish frequency order; missions cluster a few chars each */
const MISSIONS = [
  {id:0,name:"FIRST CONTACT",chars:["E","T"]},
  {id:1,name:"THE ESSENTIALS",chars:["A","N","I"]},
  {id:2,name:"SIGNAL NOISE",chars:["M","S","O"]},
  {id:3,name:"DEEP STATIC",chars:["H","R","D"]},
  {id:4,name:"COVERT VOWELS",chars:["L","U","C"]},
  {id:5,name:"WHISPERS",chars:["W","F","Y"]},
  {id:6,name:"GHOST FREQUENCY",chars:["P","G","B"]},
  {id:7,name:"BLACK SITE",chars:["V","K","J"]},
  {id:8,name:"FINAL CIPHER",chars:["X","Q","Z"]},
  {id:9,name:"NUMBERS STATION",chars:["0","1","2","3","4","5","6","7","8","9"]}
];

const RANKS = [
  {name:"Recruit",min:0},{name:"Field Agent",min:120},{name:"Operative",min:350},
  {name:"Cryptanalyst",min:750},{name:"Spymaster",min:1500},{name:"Master Codebreaker",min:3000}
];

const WORDS = {
  kid:["CAT","DOG","SUN","FUN","SPY","RUN","MAP","KEY","CODE","HERO","CLUE","JUMP","STAR","HIDE"],
  std:["SPY","CODE","AGENT","DECRYPT","SIGNAL","COVERT","CIPHER","TARGET","ESCAPE","SHADOW","INTEL","SECRET","ENEMY","RADIO"],
  ham:["CQ","DE","SOS","QTH","QRZ","RST","HAM","WAVE","ANTENNA","SIGNAL","RADIO"]
};
const SENTENCES = {
  kid:["MEET AT THE OLD OAK","THE KEY IS UNDER THE MAT","FOLLOW THE RED CAR","WE WIN TONIGHT"],
  std:["THE PACKAGE IS SECURE","RENDEZVOUS AT MIDNIGHT","TRUST NO ONE","THE MOLE IS INSIDE","EXTRACTION AT DAWN","BURN THE EVIDENCE"],
  ham:["CQ CQ DE AGENT","BEST 73 OLD MAN","SIGNAL FIVE NINE"]
};

/* progressive unlock gates — min unlockedMission required */
const NAV_GATE  = {drills:1, codex:1, games:2};
const GAME_GATE = {speed:2, safe:3, word:3, defuse:4, cover:5, wanted:9};

/* ==================================================================
   2. STATE  (+ Leitner SRS via charStats)
   ================================================================== */
const State = {
  name:"AGENT", age:27, lang:"en", goal:"fun", ageGroup:"adult",
  wpm:10, pitch:600, muted:false,
  musicVol:0.5, sfxVol:0.7,
  intel:0, bestStreak:0, attempts:0, correct:0,
  mastered:new Set(),        // letters proven (box>=3) — kept in sync for badges
  charStats:{},              // { ch: {box:1-5, correct, miss, last} }
  unlockedMission:0,
  badges:new Set(),
  flicker:false,
};

const STORE_KEY="cipheragent.v2", OLD_KEY="cipheragent.v1";
function saveState(){
  try{
    const data=Object.assign({},State,{mastered:[...State.mastered],badges:[...State.badges]});
    localStorage.setItem(STORE_KEY,JSON.stringify(data));
  }catch(e){}
}
function loadState(){
  try{
    let raw=localStorage.getItem(STORE_KEY), migrating=false;
    if(!raw){ raw=localStorage.getItem(OLD_KEY); migrating=!!raw; }
    if(!raw) return false;
    const data=JSON.parse(raw);
    const mastered=Array.isArray(data.mastered)?data.mastered:[];
    const badges=Array.isArray(data.badges)?data.badges:[];
    const charStats=(data.charStats&&typeof data.charStats==="object")?data.charStats:null;
    delete data.mastered; delete data.badges; delete data.charStats;
    Object.assign(State,data);
    State.mastered=new Set(mastered);
    State.badges=new Set(badges);
    State.charStats=charStats||{};
    // migrate old "mastered" Set into charStats at box 3 so progress survives
    if(!charStats){ mastered.forEach(ch=>{ if(!State.charStats[ch]) State.charStats[ch]={box:3,correct:3,miss:0,last:0}; }); }
    if(migrating) saveState(); // write forward into v2
    return true;
  }catch(e){ return false; }
}

function ageGroupFor(age){ if(age<13) return "kid"; if(age>=60) return "senior"; return "adult"; }
function defaultsForAge(g){ if(g==="kid") return {wpm:5}; if(g==="senior") return {wpm:7}; return {wpm:10}; }

/* ---- SRS helpers ---- */
const REVIEW_MS={1:0,2:20000,3:60000,4:1800000,5:86400000};
function ensureStat(ch){ if(!State.charStats[ch]) State.charStats[ch]={box:1,correct:0,miss:0,last:0}; return State.charStats[ch]; }
function isMastered(ch){ const s=State.charStats[ch]; return !!s && s.box>=3; }
function recordChar(ch,ok,scaffolded){
  if(!ch||ch===" ") return;
  const s=ensureStat(ch);
  s.last=Date.now();
  if(ok){ s.correct++; if(!scaffolded) s.box=Math.min(5,s.box+1); }
  else  { s.miss++; s.box=1; }
  if(isMastered(ch)&&/^[A-Z]$/.test(ch)) State.mastered.add(ch);
  else if(/^[A-Z]$/.test(ch)&&!isMastered(ch)) State.mastered.delete(ch);
  saveState();
}
function masteredAll(){ return Object.keys(State.charStats).filter(c=>c!==" "&&isMastered(c)); }
function masteredLetters(){ return [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter(isMastered); }
function dueChars(){ const now=Date.now(); return masteredAll().filter(ch=>{ const s=State.charStats[ch]; return now-s.last >= (REVIEW_MS[s.box]||0); }); }

/* practice pool = mastered chars, weighted toward weaker/older ones */
function practicePool(extra){
  let p=masteredAll();
  if(extra) extra.forEach(c=>{ if(!p.includes(c)) p.push(c); });
  if(p.length<2) p=["E","T"];
  return p;
}
function drawWeighted(pool){
  // weight by (6 - box): weaker letters appear more often
  const wts=pool.map(ch=>{ const s=State.charStats[ch]; return Math.max(1,6-(s?s.box:1)); });
  let tot=wts.reduce((a,b)=>a+b,0), r=Math.random()*tot;
  for(let i=0;i<pool.length;i++){ r-=wts[i]; if(r<=0) return pool[i]; }
  return pool[pool.length-1];
}

/* ==================================================================
   3. AUDIO ENGINE  (Web Audio API — preserved; + type tick + Farnsworth gap)
   ================================================================== */
const Audio = {
  ctx:null, master:null, morseBus:null, sfxBus:null, musicBus:null, ambientBus:null,
  _stop:false, _ready:false, _duckUntil:0,

  init(){
    if(this.ctx) return;
    try{
      this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const mk=()=>this.ctx.createGain();
      this.master   = mk(); this.master.gain.value = 0.9;
      this.morseBus = mk(); this.morseBus.gain.value = 0.22;
      this.sfxBus   = mk();
      this.musicBus = mk();
      this.ambientBus = mk(); this.ambientBus.gain.value = 0.5;
      this.morseBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.ambientBus.connect(this.musicBus);
      this.master.connect(this.ctx.destination);
      this._ready=true;
      this.applyVolumes();
    }catch(e){ console.warn("No audio",e); }
  },
  resume(){ if(this.ctx && this.ctx.state==="suspended") this.ctx.resume(); },
  ready(){ return this._ready && this.ctx; },
  soft(){ return State.ageGroup==="kid"||State.ageGroup==="senior"; },

  applyVolumes(){
    if(!this.ready()) return;
    const m = State.muted?0:1;
    this.sfxBus.gain.value   = m * State.sfxVol;
    this.musicBus.gain.value = m * State.musicVol * 0.6;
    this.morseBus.gain.value = m * 0.22;
    this._baseMusic = m * State.musicVol * 0.6;
  },
  setMuted(v){ State.muted=v; this.applyVolumes(); },
  setMusicVol(v){ State.musicVol=v; this.applyVolumes(); },
  setSfxVol(v){ State.sfxVol=v; this.applyVolumes(); },

  _voice(bus,t,dur,freq,type,peak,attack){
    if(State.muted||!this.ready()) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type||"sine"; o.frequency.setValueAtTime(freq,t);
    o.connect(g); g.connect(bus);
    const a=attack||0.005, p=peak==null?1:peak;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(p,t+a);
    g.gain.setValueAtTime(p,t+Math.max(a,dur-0.01));
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.start(t); o.stop(t+dur+0.02);
    return o;
  },
  unit(){ return 1.2/State.wpm; },
  tone(t,dur,freq){ this._voice(this.morseBus,t,dur,freq||State.pitch,"sine",1,0.006); },

  duck(ms){
    if(!this.ready()) return;
    const now=this.ctx.currentTime;
    this._duckUntil=Math.max(this._duckUntil, now+ms/1000+0.15);
    const g=this.musicBus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value,now);
    g.linearRampToValueAtTime(this._baseMusic*0.3,now+0.06);
    g.setValueAtTime(this._baseMusic*0.3,this._duckUntil-0.15);
    g.linearRampToValueAtTime(this._baseMusic,this._duckUntil);
  },

  playMorse(morse, onDone, signalEl, gapScale){
    if(!this.ctx) this.init();
    this.resume();
    this._stop=false;
    const u=this.unit(), gs=gapScale||1;
    let t=this.ctx? this.ctx.currentTime+0.05 : 0;
    const lights=[];
    for(let i=0;i<morse.length;i++){
      const c=morse[i];
      if(c==="."){ this.tone(t,u); lights.push([t,true],[t+u,false]); t+=u; }
      else if(c==="-"){ this.tone(t,3*u); lights.push([t,true],[t+3*u,false]); t+=3*u; }
      else if(c===" "){ t+=3*u*gs; }       // letter gap (Farnsworth-stretchable)
      else if(c==="/"){ t+=7*u*gs; }       // word gap
      if(i<morse.length-1 && (c==="."||c==="-")) t+=u;
    }
    const totalMs=(t-(this.ctx?this.ctx.currentTime:0))*1000;
    this.duck(totalMs);
    if(signalEl){
      const base=this.ctx.currentTime;
      lights.forEach(([at,on])=>{
        const delay=(at-base)*1000;
        setTimeout(()=>{ if(!this._stop) signalEl.classList.toggle("on",on); }, Math.max(0,delay));
      });
    }
    if(onDone) setTimeout(()=>{ if(signalEl) signalEl.classList.remove("on"); if(!this._stop) onDone(); }, Math.max(0,totalMs));
    return totalMs;
  },
  playText(text, onDone, signalEl, gapScale){ return this.playMorse(textToMorse(text), onDone, signalEl, gapScale); },
  stop(){ this._stop=true; },

  _noise(bus,t,dur,vol,cutoff){
    if(State.muted||!this.ready()) return;
    const len=Math.floor(this.ctx.sampleRate*dur);
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const s=this.ctx.createBufferSource(); s.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=cutoff||1200; f.Q.value=0.8;
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t+dur);
  },

  _t(off){ return (this.ctx?this.ctx.currentTime:0)+(off||0.005); },
  _arm(){ if(!this.ctx)this.init(); this.resume(); return this.ready(); },

  beep(freq,dur){ if(!this._arm())return; this._voice(this.sfxBus,this._t(),dur||0.06,freq||520,this.soft()?"sine":"square",0.5,0.003); },
  click(){ if(!this._arm())return; const t=this._t();
    this._voice(this.sfxBus,t,0.035,this.soft()?700:880,this.soft()?"sine":"square",0.45,0.001); },
  hover(){ if(!this._arm())return; this._voice(this.sfxBus,this._t(),0.022,1500,"sine",0.14,0.001); },

  // mechanical keystroke for typing answers
  keyClick(){ if(!this._arm())return; const t=this._t();
    this._noise(this.sfxBus,t,0.018,this.soft()?0.05:0.12,2600);
    this._voice(this.sfxBus,t,0.02,this.soft()?900:1150,"square",this.soft()?0.12:0.22,0.001); },

  // typewriter tick — text appearing on screen (lighter, varied pitch)
  type(){ if(!this._arm())return; const t=this._t();
    this._noise(this.sfxBus,t,0.012,this.soft()?0.04:0.07,2800);
    this._voice(this.sfxBus,t,0.014,1000+Math.random()*350,"square",this.soft()?0.06:0.1,0.001); },

  whoosh(){ if(!this._arm())return; const t=this._t();
    if(State.muted||!this.ready())return;
    const len=Math.floor(this.ctx.sampleRate*0.22);
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const s=this.ctx.createBufferSource(); s.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type="bandpass"; f.Q.value=1.2;
    f.frequency.setValueAtTime(400,t); f.frequency.exponentialRampToValueAtTime(3000,t+0.2);
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(this.soft()?0.06:0.14,t+0.04);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t); s.stop(t+0.24); },

  success(){ if(!this._arm())return; const t=this._t(); const sft=this.soft();
    [660,880,1175].forEach((f,i)=> this._voice(this.sfxBus,t+i*0.07,0.12,f,sft?"sine":"triangle",0.5,0.004)); },
  fail(){ if(!this._arm())return; const t=this._t(); const sft=this.soft();
    this._voice(this.sfxBus,t,0.16,sft?220:160,sft?"sine":"sawtooth",0.4,0.004);
    this._voice(this.sfxBus,t+0.08,0.20,sft?170:110,sft?"sine":"sawtooth",0.4,0.004);
    if(!sft) this._noise(this.sfxBus,t,0.18,0.08,500); },
  streak(level){ if(!this._arm())return; if(level<2)return;
    const f=520+Math.min(level,12)*70;
    this._voice(this.sfxBus,this._t(),0.09,f,this.soft()?"sine":"triangle",0.4,0.003); },
  rankUp(){ if(!this._arm())return; const t=this._t(); const sft=this.soft();
    [523,659,784,1047,1319].forEach((f,i)=>{
      this._voice(this.sfxBus,t+i*0.11,0.2,f,sft?"sine":"triangle",0.5,0.005);
      this._voice(this.sfxBus,t+i*0.11,0.2,f*1.5,"sine",0.18,0.005); }); },
  badge(){ if(!this._arm())return; const t=this._t();
    this._voice(this.sfxBus,t,0.18,988,"sine",0.45,0.004);
    this._voice(this.sfxBus,t+0.12,0.3,1319,"sine",0.5,0.004);
    this._voice(this.sfxBus,t+0.12,0.3,1976,"sine",0.15,0.004); },
  missionComplete(){ if(!this._arm())return; const t=this._t(); const sft=this.soft();
    [392,523,659,784].forEach((f,i)=> this._voice(this.sfxBus,t+i*0.09,0.22,f,sft?"sine":"triangle",0.5,0.005));
    this._noise(this.sfxBus,t,0.12,sft?0.03:0.06,1800); },
  tick(urgency){ if(!this._arm())return;
    const f=440+(urgency||0)*520;
    this._voice(this.sfxBus,this._t(),0.05,f,this.soft()?"sine":"square",0.35+(urgency||0)*0.2,0.001); },
  gameOver(){ if(!this._arm())return; const t=this._t(); const sft=this.soft();
    [440,349,262,196,131].forEach((f,i)=> this._voice(this.sfxBus,t+i*0.13,0.3,f,sft?"sine":"sawtooth",0.45,0.006));
    this._noise(this.sfxBus,t+0.4,0.5,sft?0.04:0.1,300); },
  static(dur){ if(!this._arm())return; this._noise(this.sfxBus,this._t(),dur||0.25,0.06,1200); }
};

/* ==================================================================
   3b. MUSIC ENGINE — procedural looping spy score (preserved)
   ================================================================== */
const Music = {
  started:false, intense:false, _timer:null,
  nextStepTime:0, step:0, droneVoices:[], droneFilter:null, lfo:null,
  PATTERN:[0,0,7,0,3,0,7,10], ROOT:55,
  scaleHz(semi){ return this.ROOT*Math.pow(2,semi/12); },
  tempo(){ const base=this.intense?150:100; return Audio.soft()? base*0.78 : base; },
  start(){
    if(this.started || !Audio.ready()) return;
    this.started=true;
    const ctx=Audio.ctx;
    this.droneFilter=ctx.createBiquadFilter();
    this.droneFilter.type="lowpass"; this.droneFilter.frequency.value=Audio.soft()?420:520; this.droneFilter.Q.value=4;
    this.droneFilter.connect(Audio.musicBus);
    const droneGain=ctx.createGain(); droneGain.gain.value=0.16;
    droneGain.connect(this.droneFilter);
    [this.ROOT, this.scaleHz(7), this.scaleHz(12)].forEach((f,i)=>{
      const o=ctx.createOscillator(); o.type=i===2?"sine":"sawtooth";
      o.frequency.value=f; o.detune.value=(i-1)*6;
      o.connect(droneGain); o.start(); this.droneVoices.push(o);
    });
    this.lfo=ctx.createOscillator(); this.lfo.frequency.value=0.07;
    const lfoGain=ctx.createGain(); lfoGain.gain.value=Audio.soft()?120:240;
    this.lfo.connect(lfoGain); lfoGain.connect(this.droneFilter.frequency); this.lfo.start();
    this._droneGain=droneGain;
    this.nextStepTime=ctx.currentTime+0.1; this.step=0;
    this._timer=setInterval(()=>this._schedule(),40);
  },
  _schedule(){
    if(!Audio.ready()) return;
    const ctx=Audio.ctx, stepDur=(60/this.tempo())/2;
    while(this.nextStepTime < ctx.currentTime+0.15){
      this._playStep(this.step, this.nextStepTime, stepDur);
      this.step++; this.nextStepTime+=stepDur;
    }
  },
  _playStep(step,t,stepDur){
    const idx=step % this.PATTERN.length, semi=this.PATTERN[idx], f=this.scaleHz(semi);
    const o=Audio.ctx.createOscillator(), g=Audio.ctx.createGain();
    o.type=Audio.soft()?"triangle":"sawtooth"; o.frequency.value=f;
    const lp=Audio.ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=Audio.soft()?500:(this.intense?1400:900);
    o.connect(lp); lp.connect(g); g.connect(Audio.musicBus);
    const peak=Audio.soft()?0.12:0.2;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+stepDur*0.95);
    o.start(t); o.stop(t+stepDur);
    if(this.intense && idx===0 && !Audio.soft()){
      const s=Audio.ctx.createOscillator(), sg=Audio.ctx.createGain();
      s.type="square"; s.frequency.value=this.scaleHz(semi+12+7);
      s.connect(sg); sg.connect(Audio.musicBus);
      sg.gain.setValueAtTime(0.08,t); sg.gain.exponentialRampToValueAtTime(0.0001,t+stepDur*1.5);
      s.start(t); s.stop(t+stepDur*1.6);
    }
    if(Math.random() < (this.intense?0.05:0.09)){
      const bt=t+stepDur*0.5;
      Audio._voice(Audio.ambientBus,bt,0.04,1400+Math.random()*1400,"sine",0.08,0.002);
      if(Math.random()<0.4) Audio._noise(Audio.ambientBus,bt+0.05,0.06,0.04,2200);
    }
  },
  setIntense(v){
    if(this.intense===v) return;
    this.intense=v;
    if(this.droneFilter && Audio.ready()){
      const now=Audio.ctx.currentTime;
      this.droneFilter.frequency.cancelScheduledValues(now);
      this.droneFilter.frequency.linearRampToValueAtTime(v?(Audio.soft()?620:820):(Audio.soft()?420:520), now+0.5);
    }
    if(this._droneGain && Audio.ready()){
      this._droneGain.gain.linearRampToValueAtTime(v?0.22:0.16, Audio.ctx.currentTime+0.4);
    }
  }
};

/* ==================================================================
   4. ENCODE / DECODE HELPERS
   ================================================================== */
function textToMorse(text){
  return text.toUpperCase().trim().split(/\s+/).map(w=>
    w.split("").map(ch=>MORSE[ch]||"").filter(Boolean).join(" ")
  ).join(" / ");
}
function morseToText(morse){
  return morse.trim().replace(/\s*\/\s*/g," / ").replace(/ {3,}/g," / ").split(" / ")
    .map(word=> word.trim().split(/\s+/).map(code=>REVMORSE[code]||(code?"?":"")).join("")).join(" ");
}
function morseToGlyphHTML(morse){
  return morse.split("").map(c=>{
    if(c===".") return '<span class="dot"></span>';
    if(c==="-") return '<span class="dash"></span>';
    if(c==="/") return '<span class="gap"></span><span class="dim">/</span><span class="gap"></span>';
    if(c===" ") return '<span class="gap"></span>';
    return c;
  }).join("");
}

/* ==================================================================
   5. NAVIGATION + BREADCRUMB
   ================================================================== */
const SCREEN_LABEL={hq:"HQ",learn:"Training",codex:"Codex",console:"Console",drills:"Drills",games:"Field Ops",profile:"Profile"};
function navUnlocked(nav){ return State.unlockedMission >= (NAV_GATE[nav]||0); }
function updateNavLocks(){
  document.querySelectorAll("[data-nav]").forEach(el=>{
    el.classList.toggle("locked", !navUnlocked(el.getAttribute("data-nav")));
  });
}
function setCrumb(parts){
  const el=$("crumb"); if(!el) return;
  el.innerHTML = parts.map((p,i)=>{
    const last=i===parts.length-1;
    const seg = p.go && !last
      ? `<button class="seg link" data-go="${p.go}">${p.label}</button>`
      : `<button class="seg ${last?'current':''}" ${p.onClick?'data-crumb="'+p.onClick+'"':''}>${p.label}</button>`;
    return seg + (last?"":'<span class="sep">›</span>');
  }).join("");
}
function go(id){
  // gate check
  const navKey={drills:"drills",codex:"codex",games:"games"}[id];
  if(navKey && !navUnlocked(navKey)){
    const need=NAV_GATE[navKey];
    toast(`🔒 Locked — complete Mission ${need} first.`,"red"); Audio.fail(); return;
  }
  stopGame();
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const el=$("screen-"+id); if(el) el.classList.add("active");
  // shell visibility
  $("app").hidden = (id==="onboard");
  $("screen-onboard").classList.toggle("active", id==="onboard");
  // nav active state
  document.querySelectorAll(".nav-item,.tab").forEach(n=>n.classList.toggle("active", n.getAttribute("data-go")===id || (id==="learn"&&n.getAttribute("data-go")==="learn")));
  // breadcrumb
  if(id==="hq") setCrumb([{label:"HQ"}]);
  else setCrumb([{label:"HQ",go:"hq"},{label:SCREEN_LABEL[id]||id}]);
  window.scrollTo(0,0);
  if(id==="hq") renderHQ();
  if(id==="learn") renderMissions();
  if(id==="codex") renderCodex();
  if(id==="profile") renderProfile();
  if(id==="games") showGameMenu();
  if(id==="drills") showDrillMenu();
  if(id!=="onboard") Audio.whoosh();
}
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-go]");
  if(t){ e.preventDefault(); go(t.getAttribute("data-go")); }
});

/* ==================================================================
   6. HUD / THEME / FEEDBACK
   ================================================================== */
function applyTheme(){
  document.body.dataset.age = State.ageGroup==="kid"?"kid":(State.ageGroup==="senior"?"senior":"adult");
  document.body.classList.toggle("flicker", !!State.flicker);
}
function updateHUD(){
  $("hudName").textContent=State.name;
  $("hudRank").textContent=rankFor(State.intel).name;
  $("hudIntel").textContent=State.intel;
}
function rankFor(intel){ let r=RANKS[0]; for(const x of RANKS) if(intel>=x.min) r=x; return r; }
function toast(msg,cls){
  const d=document.createElement("div"); d.className="toast"+(cls==="amber"?" accent":""); d.innerHTML=msg;
  document.body.appendChild(d); setTimeout(()=>d.remove(),2300);
}
function scoreFlash(amount,x,y){
  const d=document.createElement("div"); d.className="scoreflash"; d.textContent="+"+amount;
  d.style.left=(x||window.innerWidth/2)+"px"; d.style.top=(y||window.innerHeight/2)+"px";
  document.body.appendChild(d); setTimeout(()=>d.remove(),1000);
}
function awardIntel(amount){
  const before=rankFor(State.intel).name;
  State.intel+=amount; updateHUD();
  const after=rankFor(State.intel).name;
  if(after!==before){ toast("⬆ CLEARANCE RAISED: <b class='accent'>"+after+"</b>","amber"); Audio.rankUp(); }
  checkBadges(); saveState();
}
function recordAttempt(ok){ State.attempts++; if(ok) State.correct++; saveState(); }

/* ==================================================================
   7. BADGES
   ================================================================== */
const BADGES=[
  {id:"first",name:"First Contact",desc:"Complete mission 1",test:()=>State.unlockedMission>=1},
  {id:"half",name:"Half Cipher",desc:"Master 13 letters",test:()=>masteredLetters().length>=13},
  {id:"alpha",name:"Alphabet Spy",desc:"Master all 26 letters",test:()=>masteredLetters().length>=26},
  {id:"streak10",name:"Cold Streak",desc:"10 decryption streak",test:()=>State.bestStreak>=10},
  {id:"streak25",name:"Untouchable",desc:"25 decryption streak",test:()=>State.bestStreak>=25},
  {id:"intel500",name:"Asset",desc:"500 intel points",test:()=>State.intel>=500},
  {id:"intel1500",name:"Spymaster",desc:"1500 intel points",test:()=>State.intel>=1500},
  {id:"bomb",name:"Bomb Tech",desc:"Defuse a bomb",test:()=>State.badges.has("bomb")},
  {id:"safe",name:"Safecracker",desc:"Crack the safe",test:()=>State.badges.has("safe")},
  {id:"cover",name:"Ghost",desc:"Reach round 8 in Deep Cover",test:()=>State.badges.has("cover")},
];
function checkBadges(){
  let nu=false;
  BADGES.forEach(b=>{ if(!State.badges.has(b.id) && b.test()){ State.badges.add(b.id); nu=true;
    toast("🏅 BADGE EARNED: <b class='accent'>"+b.name+"</b>","amber"); }});
  if(nu){ Audio.badge(); saveState(); }
}
function renderBadgeWall(el){
  el.innerHTML = BADGES.map(b=>{
    const got=State.badges.has(b.id);
    return `<span class="badge ${got?'':'locked'}" title="${b.desc}">${got?'🏅':'🔒'} ${b.name}</span>`;
  }).join("");
}

/* ==================================================================
   8. ONBOARDING  (typing sound + required-field validation)
   ================================================================== */
const RECRUIT_TEXT =
`> SECURE CHANNEL OPEN...
> MISSION: LEARN MORSE CODE — from zero to fluent.
>
> This is a training academy in spy's clothing. Every
> lesson teaches you to READ and SEND the dots & dashes
> ( . - ) of Morse — a few letters at a time, with
> practice before any test. Nothing is sprung on you
> cold.
>
> Complete recruitment to begin Mission 1.`;

let onboardBegun=false;
function typewriter(el,text,speed,done){
  el.textContent=""; el.classList.add("cursor-block");
  let i=0;
  (function step(){
    if(i<text.length){
      const ch=text[i++]; el.textContent+=ch;
      if(ch!=="\n"&&ch!==" ") Audio.type();     // keystroke sound as text appears
      setTimeout(step, speed);
    } else { el.classList.remove("cursor-block"); if(done) done(); }
  })();
}
function startOnboard(){
  // shows a prompt until first interaction (which unlocks audio), then types with sound
  const introEl=$("recruitIntro");
  if(!onboardBegun){
    introEl.classList.add("cursor-block");
    introEl.textContent="> tap anywhere to open secure channel";
    return;
  }
  const speed = (State.ageGroup==="kid"||State.ageGroup==="senior") ? 42 : 30;
  typewriter(introEl, RECRUIT_TEXT, speed, ()=>{ $("recruitForm").style.display="block"; validateRecruit(); });
}
function beginOnboard(){
  if(onboardBegun) return;
  onboardBegun=true;
  startOnboard();
}

/* live validation — recruitment blocked until codename + valid age */
function validateRecruit(){
  const name=($("inName").value||"").trim();
  const ageRaw=$("inAge").value;
  const age=parseInt(ageRaw,10);
  let ok=true;
  const nameHint=$("nameHint"), ageHint=$("ageHint");
  if(!name){ nameHint.textContent=""; nameHint.className="field-hint"; ok=false; }
  else { nameHint.textContent="✓ codename set"; nameHint.className="field-hint cyan"; }
  if(ageRaw==="" || isNaN(age)){ ageHint.textContent=""; ageHint.className="field-hint"; ok=false; }
  else if(age<4 || age>120){ ageHint.textContent="Enter an age between 4 and 120."; ageHint.className="field-hint err"; $("inAge").classList.add("invalid"); ok=false; }
  else { ageHint.textContent="✓ clearance calibrated"; ageHint.className="field-hint cyan"; $("inAge").classList.remove("invalid"); }
  $("recruitBtn").disabled=!ok;
  return ok;
}
["inName","inAge"].forEach(id=>{
  const el=$(id);
  el.addEventListener("input",validateRecruit);
});
$("inName").addEventListener("blur",()=>{ if(!($("inName").value||"").trim()){ $("nameHint").textContent="Codename is required, agent."; $("nameHint").className="field-hint err"; }});

$("recruitBtn").addEventListener("click",()=>{
  if(!validateRecruit()){ toast("Codename and age are required.","red"); Audio.fail(); return; }
  State.name=($("inName").value||"").trim().toUpperCase();
  State.age=parseInt($("inAge").value,10);
  State.lang=$("inLang").value;
  State.goal=$("inGoal").value;
  State.ageGroup=ageGroupFor(State.age);
  const d=defaultsForAge(State.ageGroup);
  State.wpm=d.wpm;
  if(State.goal==="fast") State.wpm=Math.min(15,State.wpm+3);
  applyTheme(); updateHUD(); updateNavLocks();
  Audio.success();
  const greet = State.ageGroup==="kid"
    ? `Welcome aboard, JUNIOR DETECTIVE ${State.name}! Let's crack some codes.`
    : `Welcome to the agency, AGENT ${State.name}. Training begins now.`;
  toast(greet,"amber");
  saveState();
  go("hq");
});

/* ==================================================================
   9. HQ + NEXT-ACTION HERO
   ================================================================== */
function nextActionPlan(){
  // returns {eyebrow, title, sub, btn, action}
  if(State.unlockedMission < MISSIONS.length){
    const m=MISSIONS[State.unlockedMission];
    const fresh = State.intel===0 && masteredAll().length===0;
    return {
      eyebrow: fresh?"START HERE":"CONTINUE TRAINING",
      title:`Mission ${m.id+1}: ${m.name}`,
      sub:`Learn ${m.chars.join("  ")} — taught step by step, then practised.`,
      btn: fresh?"▶ BEGIN TRAINING":"▶ CONTINUE",
      action:()=>{ go("learn"); startLesson(m); }
    };
  }
  if(masteredLetters().length<26 || dueChars().length){
    return { eyebrow:"KEEP SHARP", title:"Daily Brief", sub:"A mixed review of the letters due for a refresher.",
      btn:"▶ START REVIEW", action:()=>{ go("drills"); startDrill("review"); } };
  }
  const ops=["defuse","safe","speed","cover","word","wanted"];
  const pick=ops[Math.floor(Math.random()*ops.length)];
  return { eyebrow:"TODAY'S OP", title:"Field Operation", sub:"You've mastered the alphabet — go apply it under pressure.",
    btn:"▶ DEPLOY", action:()=>{ go("games"); openGame(pick); } };
}
let _nextAction=null;
function renderHQ(){
  // coachmark for brand-new agents
  const coach=$("hqCoach");
  if(State.unlockedMission===0 && State.intel===0){
    coach.innerHTML=`<div class="coachmark"><span>🧭</span><span>New here? Hit <b>Begin Training</b> — it teaches you the alphabet from scratch. Everything else unlocks as you learn.</span></div>`;
  } else coach.innerHTML="";

  const plan=nextActionPlan(); _nextAction=plan.action;
  $("nextAction").innerHTML=`<div class="hero">
      <div class="copy">
        <div class="eyebrow">${plan.eyebrow}</div>
        <h2>${plan.title}</h2>
        <p>${plan.sub}</p>
      </div>
      <div class="act"><button class="cta big" id="heroBtn">${plan.btn}</button></div>
    </div>`;
  $("heroBtn").onclick=()=>{ if(_nextAction) _nextAction(); };

  const r=rankFor(State.intel);
  $("hqRankLine").textContent="Clearance: "+r.name;
  const idx=RANKS.indexOf(r), next=RANKS[idx+1];
  let pct=100, txt="MAX CLEARANCE REACHED";
  if(next){ const span=next.min-r.min, into=State.intel-r.min;
    pct=Math.min(100,Math.round(into/span*100)); txt=`${State.intel} / ${next.min} → ${next.name}`; }
  $("hqXpBar").style.width=pct+"%"; $("hqXpText").textContent=txt;
  $("hqIntel").textContent=State.intel;
  $("hqAcc").textContent= State.attempts? Math.round(State.correct/State.attempts*100)+"%":"—";
  $("hqMastered").textContent=masteredLetters().length+"/26";
  $("hqStreak").textContent=State.bestStreak;
  renderBadgeWall($("badgeWall"));
  updateNavLocks();
}

/* ==================================================================
   10. TRAINING — 5-PHASE LESSON LOOP
   ================================================================== */
function renderMissions(){
  $("lessonView").style.display="none";
  $("missionList").style.display="grid";
  const list=$("missionList"); list.innerHTML="";
  MISSIONS.forEach(m=>{
    const locked=m.id>State.unlockedMission;
    const allMastered=m.chars.every(isMastered);
    const isNext = m.id===State.unlockedMission;
    const div=document.createElement("button");
    div.className="menu-btn mission"+(locked?" locked":"")+(isNext&&!allMastered?" next":"");
    const masteredCount=m.chars.filter(isMastered).length;
    const tag = locked?'<span class="tag locked">LOCKED</span>'
      : allMastered?'<span class="tag done">✔ DONE</span>'
      : isNext?'<span class="tag ready">START ▶</span>':'<span class="tag ready">REPLAY</span>';
    div.innerHTML=`${tag}<span class="t">Mission ${m.id+1}: ${m.name}</span>
      <span class="d">${m.chars.join("  ")} · ${masteredCount}/${m.chars.length} mastered</span>`;
    if(!locked) div.addEventListener("click",()=>startLesson(m));
    else div.addEventListener("click",()=>{toast("Clearance too low — finish the prior mission.","red");Audio.fail();});
    list.appendChild(div);
  });
}

const PHASES=[["A","INTRODUCE"],["B","MATCH"],["C","RECALL"],["D","TRANSMIT"],["E","FIELD CHECK"]];
let LS=null; // lesson state
function startLesson(m){
  if(m.id>State.unlockedMission){ toast("Locked mission.","red"); Audio.fail(); return; }
  const len=m.chars.length;
  LS={ m, chars:m.chars.slice(), pi:0, introIdx:0,
       bCorrect:0, cCorrect:0, produceIdx:0, eCorrect:0,
       goalB:Math.min(8,len*2), goalC:Math.min(8,len*2), goalE:Math.min(8,len*2) };
  $("missionList").style.display="none";
  $("lessonView").style.display="block";
  $("lessonTitle").textContent=`Mission ${m.id+1}: ${m.name}`;
  setCrumb([{label:"HQ",go:"hq"},{label:"Training",go:"learn"},{label:`Mission ${m.id+1}`}]);
  const brief = State.ageGroup==="kid"
    ? "New clues incoming, detective! Listen, look, then prove you've got it."
    : "Briefing: meet these signals, drill them, then pass the field check to advance.";
  typewriter($("lessonBrief"),brief,26);
  setPhaseUI(0);
  lpIntro();
  $("lessonView").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function setPhaseUI(idx){
  LS.pi=idx;
  $("phaseTrack").innerHTML=PHASES.map((p,i)=>`<div class="phase-pip ${i<idx?'done':''} ${i===idx?'active':''}"></div>`).join("");
  $("phaseName").textContent=`PHASE ${idx+1}/5 · ${PHASES[idx][1]}`;
}
function lessonStageEl(){ return $("lessonStage"); }

/* ---- Phase A: INTRODUCE ---- */
function lpIntro(){
  setPhaseUI(0);
  const ch=LS.chars[LS.introIdx], code=MORSE[ch];
  const last=LS.introIdx===LS.chars.length-1;
  lessonStageEl().innerHTML=`
    <div class="bigchar spotlight">${ch}</div>
    <div class="morse-glyph" style="justify-content:center;">${morseToGlyphHTML(code)}</div>
    <div class="verbal">“${verbalize(code)}”</div>
    <div class="mnemonic">${mnemonicFor(ch)}</div>
    <div style="margin:18px 0;"><span class="signal" id="lsSig"></span></div>
    <div class="row" style="justify-content:center;">
      <button class="alt" id="lsHear">▶ Hear it again</button>
      <button class="cta" id="lsNext">${last?"Start practice ▶":"Next character ▶"}</button>
    </div>
    <div class="progress-mini" style="margin-top:10px;">Character ${LS.introIdx+1} / ${LS.chars.length}</div>`;
  ensureStat(ch);
  setTimeout(()=>Audio.playMorse(code,null,$("lsSig"),1.4),350);
  $("lsHear").onclick=()=>Audio.playMorse(code,null,$("lsSig"),1.4);
  $("lsNext").onclick=()=>{
    if(!last){ LS.introIdx++; lpIntro(); }
    else lpMatch();
  };
}

/* ---- shared choice round (Phase B match / Phase C recall) ---- */
function lpChoiceRound(showGlyph){
  setPhaseUI(showGlyph?1:2);
  const target=LS.chars[Math.floor(Math.random()*LS.chars.length)];
  const code=MORSE[target];
  // choices: cluster chars, plus (recall) up to 2 mastered distractors
  let choices=LS.chars.slice();
  if(!showGlyph){
    const distract=masteredAll().filter(c=>!LS.chars.includes(c));
    for(let i=0;i<2 && distract.length;i++){ choices.push(distract.splice(Math.floor(Math.random()*distract.length),1)[0]); }
  }
  choices=shuffle([...new Set(choices)]);
  const goalTxt = showGlyph?`${LS.bCorrect}/${LS.goalB}`:`${LS.cCorrect}/${LS.goalC}`;
  lessonStageEl().innerHTML=`
    <p class="muted">${showGlyph?"Listen and watch — which character is this?":"Audio only now — name the character."}</p>
    ${showGlyph?`<div class="morse-glyph" style="justify-content:center;">${morseToGlyphHTML(code)}</div>`:""}
    <div style="margin:14px 0;"><span class="signal" id="lsSig"></span></div>
    <button class="alt" id="lsHear">▶ Replay</button>
    <div class="choice-grid" id="lsChoices"></div>
    <div class="progress-mini" style="margin-top:12px;">Correct: ${goalTxt}</div>
    <div id="lsFb"></div>`;
  setTimeout(()=>Audio.playMorse(code,null,$("lsSig"),1.4),300);
  $("lsHear").onclick=()=>Audio.playMorse(code,null,$("lsSig"),1.4);
  const grid=$("lsChoices");
  choices.forEach(c=>{
    const b=document.createElement("button"); b.className="choice"; b.textContent=c;
    b.onclick=()=>{
      [...grid.children].forEach(x=>x.disabled=true);
      const ok=c===target;
      recordChar(target,ok,showGlyph);
      recordAttempt(ok);
      if(ok){
        b.classList.add("correct"); Audio.success();
        if(showGlyph) LS.bCorrect++; else LS.cCorrect++;
        $("lsFb").innerHTML=`<div class="correction ok">✔ <b>${target}</b> — “${verbalize(code)}”. ${isMastered(target)?"<span class='cyan'>Mastered!</span>":""}</div>`;
        setTimeout(()=>{
          if(showGlyph && LS.bCorrect>=LS.goalB) lpRecall();
          else if(!showGlyph && LS.cCorrect>=LS.goalC) lpProduce();
          else lpChoiceRound(showGlyph);
        },800);
      } else {
        b.classList.add("wrong"); Audio.fail();
        showCorrection(target,c,()=>lpChoiceRound(showGlyph));
      }
    };
    grid.appendChild(b);
  });
}
function lpMatch(){ LS.bCorrect=Math.min(LS.bCorrect,0); lpChoiceRound(true); }
function lpRecall(){ lpChoiceRound(false); }

/* ---- Phase D: PRODUCE (tap pad) ---- */
function lpProduce(){
  setPhaseUI(3);
  const ch=LS.chars[LS.produceIdx], code=MORSE[ch];
  const showRef=LS.produceIdx<2; // training wheels for first couple
  lessonStageEl().innerHTML=`
    <p class="muted">Your turn to send. Tap the pattern for <b>${ch}</b>:
       short tap = <b>dot</b>, long press = <b>dash</b>.</p>
    <div class="bigchar spotlight">${ch}</div>
    <div class="morse-glyph" style="justify-content:center;opacity:${showRef?1:.25};">${morseToGlyphHTML(code)}</div>
    <div class="progress-mini">${showRef?"target shown — copy it":"from memory now"} · ${LS.produceIdx+1}/${LS.chars.length}</div>
    <div id="tapPad" role="button" tabindex="0" aria-label="Transmit pad: tap or hold for dot or dash">
      ▢ TAP / HOLD HERE<span class="echo" id="tapEcho"></span></div>
    <div class="row" style="justify-content:center;margin-top:12px;">
      <button class="danger" id="tapClear">⟲ Clear</button>
      <button class="cta" id="tapSubmit">Transmit ▶</button>
    </div>
    <div id="lsFb"></div>`;
  setupTapPad(ch,(ok)=>{
    recordAttempt(ok);
    if(ok){
      recordChar(ch,true,false); Audio.success();
      $("lsFb").innerHTML=`<div class="correction ok">✔ Sent <b>${ch}</b> perfectly.</div>`;
      setTimeout(()=>{ if(LS.produceIdx<LS.chars.length-1){ LS.produceIdx++; lpProduce(); } else lpField(); },800);
    } else {
      Audio.fail();
      showCorrection(ch,null,()=>lpProduce(),"That wasn't quite the pattern. Watch and listen, then try again:");
    }
  });
}

/* ---- Phase E: FIELD CHECK (audio-only, writes mastery, gates unlock) ---- */
function drawFieldChar(){
  const unmastered=LS.chars.filter(c=>!isMastered(c));
  const reviewPool=masteredAll().filter(c=>!LS.chars.includes(c));
  // 70% toward un-mastered cluster (or whole cluster), 30% review
  if(reviewPool.length && Math.random()<0.3) return reviewPool[Math.floor(Math.random()*reviewPool.length)];
  const pool = unmastered.length?unmastered:LS.chars;
  return pool[Math.floor(Math.random()*pool.length)];
}
function lpField(){
  setPhaseUI(4);
  const ch=drawFieldChar(), code=MORSE[ch];
  const remaining=LS.chars.filter(c=>!isMastered(c)).length;
  lessonStageEl().innerHTML=`
    <p class="muted">Field check — audio only. Decode the signal and type it. Pass all ${LS.chars.length} to complete the mission.</p>
    <div style="margin:14px 0;"><span class="signal" id="lsSig"></span></div>
    <button class="alt" id="lsHear">▶ Replay</button>
    <div style="margin-top:14px;"><div class="answer-label">YOUR DECODE</div>
      <input id="lsIn" class="answer-field mono" maxlength="1" autocapitalize="characters" inputmode="text" style="font-size:1.8em;width:110px;" placeholder="?"></div>
    <button class="cta" id="lsSubmit" style="margin-top:10px;">Decrypt ▶</button>
    <div class="progress-mini" style="margin-top:10px;">${remaining} character${remaining!==1?"s":""} left to master</div>
    <div id="lsFb"></div>`;
  setTimeout(()=>Audio.playMorse(code,null,$("lsSig")),300);
  $("lsHear").onclick=()=>Audio.playMorse(code,null,$("lsSig"));
  const inp=$("lsIn"); inp.focus();
  const submit=()=>{
    const v=(inp.value||"").trim().toUpperCase(); if(!v) return;
    const ok=v===ch;
    recordChar(ch,ok,false); recordAttempt(ok);
    if(ok){
      LS.eCorrect++; Audio.success();
      $("lsFb").innerHTML=`<div class="correction ok">✔ <b>${ch}</b> — “${verbalize(code)}”.</div>`;
      if(LS.chars.every(isMastered) && LS.eCorrect>=LS.goalE){ setTimeout(()=>completeLesson(LS.m),700); }
      else setTimeout(lpField,700);
    } else {
      Audio.fail();
      showCorrection(ch,v,()=>lpField());
    }
  };
  $("lsSubmit").onclick=submit;
  inp.onkeydown=e=>{ if(e.key==="Enter") submit(); };
}

/* ---- correction component (mandatory re-perceive) ---- */
function showCorrection(correctCh, pickedCh, onContinue, customLead){
  const code=MORSE[correctCh];
  const lead = customLead || (pickedCh
    ? `✖ That was <b>${correctCh}</b> (“${verbalize(code)}”). You said <b>${pickedCh}</b>.`
    : `✖ The signal was <b>${correctCh}</b> (“${verbalize(code)}”).`);
  const fb=$("lsFb")||lessonStageEl();
  const box=document.createElement("div"); box.className="correction";
  box.innerHTML=`<div>${lead}</div>
    <div class="morse-glyph" style="justify-content:flex-start;margin:8px 0;">${morseToGlyphHTML(code)}</div>
    <div class="row"><span class="signal" id="cxSig" style="width:44px;height:44px;"></span>
      <button class="alt" id="cxHear">▶ Hear it</button>
      <button class="cta" id="cxNext">Got it ▶</button></div>`;
  if($("lsFb")) $("lsFb").innerHTML="";
  (($("lsFb"))||lessonStageEl()).appendChild(box);
  setTimeout(()=>Audio.playMorse(code,null,$("cxSig"),1.4),250);
  $("cxHear").onclick=()=>Audio.playMorse(code,null,$("cxSig"),1.4);
  $("cxNext").onclick=()=>onContinue();
}

function completeLesson(m){
  if(m.id===State.unlockedMission) State.unlockedMission++;
  awardIntel(40);
  Audio.missionComplete();
  toast(`MISSION ${m.id+1} COMPLETE — +40 intel`,"amber");
  checkBadges(); updateNavLocks(); saveState();
  // celebrate + show what unlocked
  setPhaseUI(4);
  const unlocked=[];
  if(m.id+1===NAV_GATE.drills) unlocked.push("Drills & Codex");
  if(m.id+1===NAV_GATE.games) unlocked.push("Field Operations");
  Object.keys(GAME_GATE).forEach(g=>{ if(GAME_GATE[g]===m.id+1) unlocked.push(GAME_TITLES[g]); });
  lessonStageEl().innerHTML=`
    <div class="bigchar spotlight">✔</div>
    <h2>Mission ${m.id+1} complete</h2>
    <p class="cyan">You've mastered ${m.chars.join(", ")}. +40 intel.</p>
    ${unlocked.length?`<p class="muted">🔓 Unlocked: <b class="accent">${unlocked.join(" · ")}</b></p>`:""}
    <div class="row" style="justify-content:center;margin-top:16px;">
      <button class="alt" data-go="learn">Mission list</button>
      ${State.unlockedMission<MISSIONS.length?`<button class="cta" id="lsNextMission">Next mission ▶</button>`:`<button class="cta" data-go="hq">Back to HQ ▶</button>`}
    </div>`;
  const nb=$("lsNextMission");
  if(nb) nb.onclick=()=>{ const nm=MISSIONS[State.unlockedMission]; if(nm) startLesson(nm); };
}

function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ==================================================================
   11. CODEX
   ================================================================== */
let codexActive=null;
function renderCodex(){
  codexActive=null;
  const mk=(keys,el,dimUnmastered)=>{
    el.innerHTML="";
    keys.forEach(k=>{
      const cell=document.createElement("div");
      cell.className="codex-cell"+(dimUnmastered&&!isMastered(k)?" unmastered":"");
      cell.innerHTML=`<div class="ch">${k===" "?"␣":k}</div><div class="mc">${morseToGlyphHTML(MORSE[k])}</div>`;
      cell.addEventListener("click",()=>{
        if(codexActive && codexActive!==cell) codexActive.classList.remove("active","playing");
        codexActive=cell; cell.classList.add("active","playing");
        Audio.playMorse(MORSE[k], ()=>cell.classList.remove("playing"));
      });
      el.appendChild(cell);
    });
  };
  mk("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),$("codexLetters"),true);
  mk("0123456789".split(""),$("codexNumbers"),true);
  mk([".",",","?","'","!","/","(",")","&",":",";","=","+","-","_",'"',"@","$"],$("codexPunct"),false);
}

/* ==================================================================
   12. CONSOLE
   ================================================================== */
const encIn=$("encIn");
function renderEnc(){
  const src=encIn.value, out=$("encOut");
  if(!src.trim()){ out.innerHTML='<span class="dim">awaiting signal...</span>'; $("encDropped").textContent=""; return; }
  out.innerHTML=morseToGlyphHTML(textToMorse(src))||'<span class="dim">awaiting signal...</span>';
  const seen=new Set(), dropped=[];
  src.toUpperCase().split("").forEach(c=>{ if(/\s/.test(c))return; if(!(c in MORSE)&&!seen.has(c)){ seen.add(c); dropped.push(c);} });
  $("encDropped").textContent = dropped.length?"⚠ dropped (unsupported): "+dropped.join(" "):"";
}
encIn.addEventListener("input",renderEnc);
$("encPlay").addEventListener("click",()=>{ if(encIn.value.trim()) Audio.playText(encIn.value); });
$("encStop").addEventListener("click",()=>Audio.stop());
const decIn=$("decIn");
function renderDec(){
  const out=$("decOut");
  if(!decIn.value.trim()){ out.innerHTML='<span class="dim" style="font-size:.6em;">awaiting intercept...</span>'; return; }
  out.textContent=morseToText(decIn.value)||"—";
}
decIn.addEventListener("input",renderDec);

/* ==================================================================
   13. DRILLS
   ================================================================== */
function showDrillMenu(){ $("drillMenu").style.display="grid"; $("drillStage").style.display="none"; }
document.querySelectorAll("[data-drill]").forEach(b=> b.addEventListener("click",()=>startDrill(b.getAttribute("data-drill"))));

let drill=null;
function startDrill(type){
  drill={type, streak:0, correct:0, total:0, answer:null};
  $("drillMenu").style.display="none"; $("drillStage").style.display="block";
  const titles={intercept:"🎧 Intercept Drill",decode:"👁 Decode Drill",transmit:"📡 Transmit Drill",review:"🗂 Daily Brief"};
  $("drillTitle").textContent=titles[type];
  setCrumb([{label:"HQ",go:"hq"},{label:"Drills",go:"drills"},{label:titles[type]}]);
  const pool = type==="review" ? (dueChars().length?dueChars():masteredAll()) : practicePool();
  drill.pool = pool.length?pool:["E","T"];
  $("drillScopePill").textContent="Pool: "+drill.pool.length+" signals";
  updateDrillStats(); nextDrillRound();
}
function updateDrillStats(){ $("drillStreak").textContent=drill.streak; $("drillCorrect").textContent=drill.correct; $("drillTotal").textContent=drill.total; }
function drillChar(){ return drawWeighted(drill.pool); }

function drillResult(ok,answerCh){
  drill.total++; recordAttempt(ok);
  const fb=$("drillFeedback");
  recordChar(answerCh,ok,false);
  if(ok){
    drill.streak++; drill.correct++;
    State.bestStreak=Math.max(State.bestStreak,drill.streak);
    const mult=1+Math.floor(drill.streak/5), pts=5*mult;
    awardIntel(pts);
    fb.innerHTML=`<div class="correction ok">✔ <b>${answerCh}</b> decrypted — +${pts} intel ${mult>1?'(×'+mult+' streak)':''}</div>`;
    Audio.success(); Audio.streak(drill.streak);
    updateDrillStats(); checkBadges();
    setTimeout(nextDrillRound,750);
  }else{
    drill.streak=0;
    Audio.fail();
    const code=MORSE[answerCh];
    fb.innerHTML=`<div class="correction">✖ Signal lost — it was <b>${answerCh}</b> (“${verbalize(code)}”).
      <div class="morse-glyph" style="justify-content:flex-start;margin:6px 0;">${morseToGlyphHTML(code)}</div>
      <div class="row"><span class="signal" id="drSig" style="width:42px;height:42px;"></span>
        <button class="alt" id="drHear">▶ Hear it</button>
        <button class="cta" id="drNext">Continue ▶</button></div></div>`;
    setTimeout(()=>Audio.playMorse(code,null,$("drSig"),1.3),200);
    $("drHear").onclick=()=>Audio.playMorse(code,null,$("drSig"),1.3);
    $("drNext").onclick=()=>{ updateDrillStats(); checkBadges(); nextDrillRound(); };
    updateDrillStats(); checkBadges();
  }
}

function nextDrillRound(){
  const body=$("drillBody"), fb=$("drillFeedback");
  if(drill.type!=="transmit") fb.innerHTML="";
  const ch = (drill.type==="review"||drill.type==="intercept"||drill.type==="decode") ? drillChar() : drawWeighted(drill.pool);
  drill.answer=ch;

  if(drill.type==="intercept"||drill.type==="review"){
    body.innerHTML=`<p class="muted">Intercepted signal — identify the character.</p>
      <div style="margin:14px 0;"><span class="signal" id="dSig"></span></div>
      <button id="dReplay" class="alt">▶ Replay</button>
      <div style="margin-top:14px;"><div class="answer-label">YOUR DECODE</div>
        <input id="dInput" class="answer-field mono" maxlength="1" autocapitalize="characters" inputmode="text" style="font-size:1.7em;width:110px;" placeholder="?"></div>
      <button id="dSubmit" class="cta" style="margin-top:10px;">Decrypt ▶</button>`;
    setTimeout(()=>Audio.playMorse(MORSE[ch],null,$("dSig")),300);
    $("dReplay").onclick=()=>Audio.playMorse(MORSE[ch],null,$("dSig"));
    const inp=$("dInput"); inp.focus();
    const submit=()=>{ const v=(inp.value||"").trim().toUpperCase(); if(!v)return; drillResult(v===ch,ch); };
    $("dSubmit").onclick=submit; inp.onkeydown=e=>{ if(e.key==="Enter") submit(); };

  }else if(drill.type==="decode"){
    body.innerHTML=`<p class="muted">Decode this pattern:</p>
      <div class="morse-glyph" style="justify-content:center;font-size:2.6em;">${morseToGlyphHTML(MORSE[ch])}</div>
      <div style="margin:8px 0;"><span class="signal" id="dSig"></span></div>
      <button id="dPlay" class="alt">▶ Play signal</button>
      <div style="margin-top:14px;"><div class="answer-label">YOUR DECODE</div>
        <input id="dInput" class="answer-field mono" maxlength="1" autocapitalize="characters" inputmode="text" style="font-size:1.7em;width:110px;" placeholder="?"></div>
      <button id="dSubmit" class="cta" style="margin-top:10px;">Decrypt ▶</button>`;
    const inp=$("dInput"); inp.focus();
    $("dPlay").onclick=()=>Audio.playMorse(MORSE[ch],null,$("dSig"));
    const submit=()=>{ const v=(inp.value||"").trim().toUpperCase(); if(!v)return; drillResult(v===ch,ch); };
    $("dSubmit").onclick=submit; inp.onkeydown=e=>{ if(e.key==="Enter") submit(); };

  }else if(drill.type==="transmit"){
    body.innerHTML=`<p class="muted">Transmit this character — short tap = <b>dot</b>, long press = <b>dash</b>.</p>
      <div class="bigchar spotlight">${ch}</div>
      <div class="morse-glyph muted" style="justify-content:center;">target: ${morseToGlyphHTML(MORSE[ch])}</div>
      <div id="tapPad" role="button" tabindex="0" aria-label="Transmit pad">▢ TAP / HOLD HERE<span class="echo" id="tapEcho"></span></div>
      <div class="row" style="justify-content:center;margin-top:10px;">
        <button id="tapClear" class="danger">⟲ Clear</button>
        <button id="tapSubmit" class="cta">Transmit ▶</button></div>`;
    setupTapPad(ch,(ok)=>drillResult(ok,ch));
  }
}

/* ---- Tap pad: dot/dash by press duration. onDone(ok) ---- */
function setupTapPad(targetChar,onDone){
  const pad=$("tapPad"), echo=$("tapEcho");
  let seq="", downT=0;
  const u=()=>Audio.unit()*1000;
  const press=()=>{ downT=performance.now(); pad.classList.add("active"); Audio.resume(); };
  const release=()=>{
    if(!downT) return;
    const dur=performance.now()-downT; downT=0; pad.classList.remove("active");
    const dotMax=Math.max(u()*2,180);
    const sym = dur<dotMax ? "." : "-";
    seq+=sym; Audio.playMorse(sym); echo.innerHTML=morseToGlyphHTML(seq);
  };
  pad.onmousedown=e=>{e.preventDefault();press();};
  pad.onmouseup=e=>{e.preventDefault();release();};
  pad.onmouseleave=()=>{ if(downT) release(); };
  pad.ontouchstart=e=>{e.preventDefault();press();};
  pad.ontouchend=e=>{e.preventDefault();release();};
  let keyHeld=false;
  pad.onkeydown=e=>{ if(e.key!==" "&&e.key!=="Enter")return; e.preventDefault(); if(keyHeld)return; keyHeld=true; press(); };
  pad.onkeyup=e=>{ if(e.key!==" "&&e.key!=="Enter")return; e.preventDefault(); if(!keyHeld)return; keyHeld=false; release(); };
  pad.onblur=()=>{ if(keyHeld){ keyHeld=false; if(downT) release(); } };
  $("tapClear").onclick=()=>{ seq=""; echo.innerHTML=""; };
  $("tapSubmit").onclick=()=>{
    if(!seq){ toast("No signal transmitted.","red"); return; }
    onDone(seq===MORSE[targetChar]);
  };
}

/* ==================================================================
   14. FIELD OPERATIONS (games) — gated + briefed
   ================================================================== */
const GAME_TITLES={defuse:"💣 Defuse the Bomb",speed:"⚡ Intercept — Speed",cover:"🕶 Deep Cover",
  safe:"🔐 Crack the Safe",word:"🧩 Assemble the Intel",wanted:"🔎 Wanted: Decode the Message"};
const GAME_BRIEF={
  speed:{teaches:"automaticity — hearing a letter and knowing it instantly",
    how:"60 seconds. Decode each single intercept, type the letter, hit Enter — the next fires instantly. Wrong answers show the correct letter and move on. Pool: your mastered letters."},
  safe:{teaches:"sequences — decoding several signals in order",
    how:"The vault combination is sent one signal at a time. Decode each in order; Replay current as needed. A wrong digit just asks you to retry (no penalty) — a safe place to practise sequences."},
  word:{teaches:"reading letters in real words, not in isolation",
    how:"A code word arrives letter by letter. Decode each to spell the whole word. Replay each letter as needed; a miss lets you retry. Only words made of letters you've mastered appear."},
  defuse:{teaches:"holding several letters in your head at speed, under pressure",
    how:"A wire-code is transmitting. Replay as often as you need, Show Pattern reveals the glyphs if stuck, then type the sequence and Cut the Wire before the timer hits zero."},
  cover:{teaches:"pushing your top recognition speed",
    how:"Endless. Each round transmits a little faster. One wrong decode blows your cover — your best round is the score. Expect to fail; that's how you find your ceiling."},
  wanted:{teaches:"reading a full message — word gaps and sentence flow",
    how:"A full encrypted message was intercepted. Play it, Show Morse if stuck, then type the plaintext. Listen for the longer gaps between words. Only messages using your mastered letters appear."}
};

function showGameMenu(){
  $("gameStage").style.display="none";
  const menu=$("gameMenu"); menu.style.display="grid"; menu.innerHTML="";
  Object.keys(GAME_TITLES).forEach(g=>{
    const gate=GAME_GATE[g]||0, locked=State.unlockedMission<gate;
    const b=document.createElement("button");
    b.className="menu-btn"+(locked?" locked":"");
    b.innerHTML=`${locked?`<span class="tag locked">🔒 M${gate}</span>`:`<span class="tag ready">PLAY</span>`}
      <span class="t">${GAME_TITLES[g]}</span>
      <span class="d">${locked?`Unlocks after Mission ${gate}.`:GAME_BRIEF[g].teaches}</span>`;
    b.onclick=()=> locked
      ? (toast(`🔒 Unlocks after Mission ${gate} — keep training.`,"red"),Audio.fail())
      : openGame(g);
    menu.appendChild(b);
  });
  if(gameTimer){clearInterval(gameTimer);gameTimer=null;}
}

let gameTimer=null, game=null;
function stopGame(){ if(gameTimer){clearInterval(gameTimer);gameTimer=null;} Audio.stop(); Music.setIntense(false);
  if(game&&game.restore){ game.restore(); game=null; } }

function openGame(type){
  const gate=GAME_GATE[type]||0;
  if(State.unlockedMission<gate){ toast(`🔒 Unlocks after Mission ${gate}.`,"red"); Audio.fail(); return; }
  stopGame();
  $("gameMenu").style.display="none"; $("gameStage").style.display="block";
  $("gameTitle").textContent=GAME_TITLES[type];
  setCrumb([{label:"HQ",go:"hq"},{label:"Field Ops",go:"games"},{label:GAME_TITLES[type]}]);
  // briefing first — nothing auto-plays until BEGIN
  const br=GAME_BRIEF[type];
  $("gameBody").innerHTML=`<div class="briefing">
      <h3>How to play</h3>
      <div class="how">${br.how}</div>
      <p class="teaches">🎯 Trains: ${br.teaches}</p>
      <div class="center" style="margin-top:16px;"><button class="cta big" id="gameBegin">▶ Begin operation</button></div>
    </div>`;
  $("gameBegin").onclick=()=>{
    Music.setIntense(type==="defuse"||type==="speed");
    ({defuse:gameDefuse,speed:gameSpeed,cover:gameCover,safe:gameSafe,word:gameWord,wanted:gameWanted}[type])();
  };
}
function wordPool(){
  let pool = State.goal==="ham"?WORDS.ham:(State.ageGroup==="kid"?WORDS.kid:WORDS.std);
  const m=new Set(masteredAll());
  const ok=pool.filter(w=>w.split("").every(c=>m.has(c)));
  if(ok.length) return ok;
  // fallback: build a short word from mastered letters
  const ml=masteredLetters(); if(ml.length>=3) return [shuffle(ml).slice(0,Math.min(4,ml.length)).join("")];
  return ["ET"];
}
function sentencePool(){
  let pool = State.goal==="ham"?SENTENCES.ham:(State.ageGroup==="kid"?SENTENCES.kid:SENTENCES.std);
  const m=new Set(masteredAll());
  const ok=pool.filter(s=>s.replace(/\s/g,"").split("").every(c=>m.has(c)));
  return ok.length?ok:pool; // fallback to full list if none fully mastered
}
function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function gamePool(){ return practicePool(); }
function randCharStr(n){ const p=gamePool(); let s=""; for(let i=0;i<n;i++) s+=drawWeighted(p); return s; }

/* ---- DEFUSE THE BOMB ---- */
function gameDefuse(){
  const len = State.ageGroup==="kid"?3:4;
  const code=randCharStr(len);
  let time = State.ageGroup==="senior"?40:(State.ageGroup==="kid"?35:25);
  const body=$("gameBody");
  body.innerHTML=`<p class="muted">A device is armed. Decode the wire sequence and enter it before detonation.</p>
    <div class="bar timer-bar"><span id="bombBar" style="width:100%"></span></div>
    <p class="center amber" style="font-size:1.4em;">⏱ <span id="bombTime">${time}</span>s</p>
    <div class="center" style="margin:10px 0;"><button id="bombReplay" class="alt">▶ Replay sequence</button>
      <button id="bombHint">👁 Show pattern</button></div>
    <div class="morse-glyph center" id="bombGlyph" style="justify-content:center;min-height:1.6em;"></div>
    <div class="center"><input id="bombIn" class="mono" placeholder="decoded sequence" style="max-width:280px;text-transform:uppercase;text-align:center;">
      <div style="margin-top:10px;"><button id="bombCut" class="danger">✂ Cut the wire</button></div></div>
    <div id="bombMsg" class="center" style="min-height:1.6em;margin-top:10px;"></div>`;
  const playSeq=()=>Audio.playText(code,null,null,1.2);
  setTimeout(playSeq,400);
  $("bombReplay").onclick=playSeq;
  $("bombHint").onclick=()=>{ $("bombGlyph").innerHTML=morseToGlyphHTML(textToMorse(code)); };
  const max=time;
  gameTimer=setInterval(()=>{
    time--; $("bombTime").textContent=time; $("bombBar").style.width=(time/max*100)+"%";
    if(time>0 && time<10) Audio.tick(Math.min(1,(10-time)/9));
    if(time<=0){ clearInterval(gameTimer);gameTimer=null; Music.setIntense(false);
      $("bombMsg").innerHTML="<span class='red'>💥 BOOM. Code was "+code+"</span>";
      Audio.gameOver(); $("gameStage").classList.add("shake");
      setTimeout(()=>$("gameStage").classList.remove("shake"),500);
      $("bombCut").disabled=true; }
  },1000);
  const cut=()=>{
    const v=($("bombIn").value||"").trim().toUpperCase();
    recordAttempt(v===code);
    if(v===code){
      clearInterval(gameTimer);gameTimer=null; Music.setIntense(false);
      const bonus=20+time*3; awardIntel(bonus); State.badges.add("bomb");
      v.split("").forEach(c=>recordChar(c,true,false));
      $("bombMsg").innerHTML="<span class='cyan'>✔ Defused with "+time+"s to spare! +"+bonus+" intel</span>";
      Audio.success(); checkBadges(); $("bombCut").disabled=true;
    }else{ $("bombMsg").innerHTML="<span class='red'>✖ Wrong wire! Hurry — try again.</span>"; Audio.fail(); }
  };
  $("bombCut").onclick=cut;
  $("bombIn").onkeydown=e=>{ if(e.key==="Enter") cut(); };
}

/* ---- SPEED ---- */
function gameSpeed(){
  let time=60, score=0, cur=drawWeighted(gamePool());
  const body=$("gameBody");
  body.innerHTML=`<p class="muted">Decode as many intercepts as you can in 60 seconds. Type the character, hit Enter.</p>
    <div class="row"><span class="pill">⏱ <b id="spTime">60</b>s</span><span class="pill">Decrypted <b id="spScore">0</b></span></div>
    <div class="center" style="margin:16px 0;">
      <div style="margin-bottom:10px;"><span class="signal" id="spSig"></span></div>
      <button id="spReplay" class="alt">▶ Replay</button>
      <div style="margin-top:14px;"><input id="spIn" class="answer-field mono" maxlength="1" autocapitalize="characters" inputmode="text" style="font-size:1.8em;width:110px;" placeholder="?"></div>
    </div><div id="spMsg" class="center" style="min-height:1.4em;"></div>`;
  const sig=$("spSig");
  const playCur=()=>Audio.playMorse(MORSE[cur],null,sig);
  const nextCh=()=>{ cur=drawWeighted(gamePool()); $("spIn").value=""; setTimeout(playCur,200); };
  setTimeout(playCur,400); $("spReplay").onclick=playCur;
  const inp=$("spIn"); inp.focus();
  inp.onkeydown=e=>{
    if(e.key!=="Enter") return;
    const v=(inp.value||"").trim().toUpperCase(); const ok=v===cur;
    recordAttempt(ok); recordChar(cur,ok,false);
    if(ok){ score++; $("spScore").textContent=score; $("spMsg").innerHTML="<span class='cyan'>✔</span>"; Audio.beep(880,0.06); }
    else { $("spMsg").innerHTML="<span class='red'>✖ "+cur+"</span>"; Audio.beep(200,0.08); }
    nextCh();
  };
  gameTimer=setInterval(()=>{
    time--; $("spTime").textContent=time;
    if(time<=10) Audio.tick(Math.min(1,(10-time)/10));
    if(time<=0){ clearInterval(gameTimer);gameTimer=null; Music.setIntense(false);
      const bonus=score*4; awardIntel(bonus);
      $("gameBody").innerHTML=`<div class="center"><h2>⏹ Time</h2><p>You decrypted <b class="amber">${score}</b> intercepts.</p>
         <p class="cyan">+${bonus} intel.</p><button class="cta" onclick="openGame('speed')">▶ Run again</button></div>`;
      Audio.success(); checkBadges(); }
  },1000);
}

/* ---- DEEP COVER ---- */
function gameCover(){
  let round=1, baseWpm=Math.max(8,State.wpm), savedWpm=State.wpm, cur=drawWeighted(gamePool()), alive=true;
  const body=$("gameBody");
  body.innerHTML=`<p class="muted">Maintain your cover. Each round is faster. One wrong decode and you're exposed.</p>
    <div class="row"><span class="pill">Round <b id="cvRound">1</b></span><span class="pill">Speed <b id="cvWpm">${baseWpm}</b> WPM</span></div>
    <div class="center" style="margin:16px 0;">
      <div style="margin-bottom:10px;"><span class="signal" id="cvSig"></span></div>
      <button id="cvReplay" class="alt">▶ Replay</button>
      <div style="margin-top:14px;"><input id="cvIn" class="answer-field mono" maxlength="1" autocapitalize="characters" inputmode="text" style="font-size:1.8em;width:110px;" placeholder="?"></div>
      <button id="cvSubmit" class="cta" style="margin-top:10px;">Decrypt ▶</button>
    </div><div id="cvMsg" class="center" style="min-height:1.4em;"></div>`;
  const sig=$("cvSig");
  const setWpm=()=>{ State.wpm=Math.min(30,baseWpm+(round-1)); $("cvWpm").textContent=State.wpm; };
  const playCur=()=>Audio.playMorse(MORSE[cur],null,sig);
  const newRound=()=>{ round++; $("cvRound").textContent=round; setWpm(); cur=drawWeighted(gamePool());
    $("cvIn").value=""; $("cvIn").focus(); setTimeout(playCur,300); };
  setWpm(); setTimeout(playCur,400); $("cvReplay").onclick=playCur;
  const submit=()=>{
    if(!alive) return;
    const v=($("cvIn").value||"").trim().toUpperCase(); if(!v) return;
    const ok=v===cur; recordAttempt(ok); recordChar(cur,ok,false);
    if(ok){ const pts=8; awardIntel(pts);
      $("cvMsg").innerHTML="<span class='cyan'>✔ Cover holds — +"+pts+"</span>"; Audio.beep(880,0.06);
      if(round>=8) State.badges.add("cover"); newRound();
    }else{ alive=false;
      $("cvMsg").innerHTML="<span class='red'>✖ Cover blown — it was "+cur+". You survived "+round+" rounds.</span>";
      Audio.gameOver(); $("gameStage").classList.add("shake");
      setTimeout(()=>$("gameStage").classList.remove("shake"),500);
      State.wpm=savedWpm; updateHUD(); checkBadges();
      $("cvSubmit").outerHTML='<button class="cta" onclick="openGame(\'cover\')" style="margin-top:10px;">▶ New identity</button>';
    }
  };
  $("cvSubmit").onclick=submit; $("cvIn").onkeydown=e=>{ if(e.key==="Enter") submit(); };
  game={restore:()=>{State.wpm=savedWpm;updateHUD();}};
}

/* ---- CRACK THE SAFE ---- */
function gameSafe(){
  const len = State.ageGroup==="kid"?3:(State.goal==="fast"?5:4);
  const combo=randCharStr(len);
  let revealed=0;
  const body=$("gameBody");
  body.innerHTML=`<p class="muted">The vault has a ${len}-signal combination, sent one at a time. Decode each in order.</p>
    <div class="center"><div id="safeDisp" class="mono" style="font-size:2.2em;letter-spacing:.3em;color:var(--amber);">${"_".repeat(len)}</div></div>
    <div class="center" style="margin:14px 0;"><span class="signal" id="safeSig"></span>
      <div><button id="safeReplay" class="alt" style="margin-top:10px;">▶ Replay current</button></div></div>
    <div class="center"><input id="safeIn" class="answer-field mono" maxlength="1" autocapitalize="characters" inputmode="text" style="font-size:1.6em;width:110px;" placeholder="?">
      <div style="margin-top:10px;"><button id="safeBtn" class="cta">Enter digit ▶</button></div></div>
    <div id="safeMsg" class="center" style="min-height:1.4em;margin-top:10px;"></div>`;
  const sig=$("safeSig");
  const playCur=()=>Audio.playMorse(MORSE[combo[revealed]],null,sig);
  setTimeout(playCur,400); $("safeReplay").onclick=playCur;
  const dispEl=$("safeDisp");
  const showDisp=()=>{ dispEl.textContent = combo.slice(0,revealed) + "_".repeat(len-revealed); };
  const inp=$("safeIn"); inp.focus();
  const submit=()=>{
    const v=(inp.value||"").trim().toUpperCase(); if(!v)return;
    const ok=v===combo[revealed]; recordAttempt(ok); recordChar(combo[revealed],ok,false);
    if(ok){
      revealed++; showDisp(); inp.value=""; Audio.beep(880,0.07);
      if(revealed>=len){
        const bonus=30+len*10; awardIntel(bonus); State.badges.add("safe");
        $("safeMsg").innerHTML="<span class='cyan'>🔓 Vault open! Combination "+combo+". +"+bonus+" intel</span>";
        Audio.success(); checkBadges();
        $("safeBtn").outerHTML='<button class="cta" onclick="openGame(\'safe\')">▶ Next vault</button>';
      }else{ $("safeMsg").innerHTML="<span class='cyan'>✔ tumbler clicks...</span>"; setTimeout(playCur,400); }
    }else{ $("safeMsg").innerHTML="<span class='red'>✖ Wrong — replay and retry (no penalty).</span>"; Audio.fail();
      const code=MORSE[combo[revealed]]; setTimeout(()=>Audio.playMorse(code,null,sig,1.3),300); }
  };
  $("safeBtn").onclick=submit; inp.onkeydown=e=>{ if(e.key==="Enter") submit(); };
}

/* ---- ASSEMBLE THE INTEL ---- */
function gameWord(){
  const word=rand(wordPool());
  let pos=0;
  const body=$("gameBody");
  body.innerHTML=`<p class="muted">A code word is transmitting letter by letter. Spell the whole word.</p>
    <div class="center"><div id="wbDisp" class="mono" style="font-size:2em;letter-spacing:.25em;color:var(--amber);"></div></div>
    <div class="center" style="margin:14px 0;"><span class="signal" id="wbSig"></span>
      <div><button id="wbReplay" class="alt" style="margin-top:10px;">▶ Replay letter</button></div></div>
    <div class="center"><input id="wbIn" class="answer-field mono" maxlength="1" autocapitalize="characters" inputmode="text" style="font-size:1.6em;width:110px;" placeholder="?">
      <div style="margin-top:10px;"><button id="wbBtn" class="cta">Add letter ▶</button></div></div>
    <div id="wbMsg" class="center" style="min-height:1.4em;margin-top:10px;"></div>`;
  const sig=$("wbSig"), disp=$("wbMsg");
  const showDisp=()=>{ $("wbDisp").textContent = word.split("").map((c,i)=> i<pos?c:"_").join(" "); };
  showDisp();
  const playCur=()=>Audio.playMorse(MORSE[word[pos]],null,sig);
  setTimeout(playCur,400); $("wbReplay").onclick=playCur;
  const inp=$("wbIn"); inp.focus();
  const submit=()=>{
    const v=(inp.value||"").trim().toUpperCase(); if(!v)return;
    const ok=v===word[pos]; recordAttempt(ok); recordChar(word[pos],ok,false);
    if(ok){
      pos++; showDisp(); inp.value=""; Audio.beep(880,0.07);
      if(pos>=word.length){ const bonus=15+word.length*8; awardIntel(bonus);
        disp.innerHTML="<span class='cyan'>✔ Intel assembled: "+word+" — +"+bonus+" intel</span>"; Audio.success();
        $("wbBtn").outerHTML='<button class="cta" onclick="openGame(\'word\')">▶ Next word</button>';
      }else{ disp.innerHTML="<span class='cyan'>✔</span>"; setTimeout(playCur,400); }
    }else{ disp.innerHTML="<span class='red'>✖ Try again — "+word[pos]+"</span>"; Audio.fail();
      setTimeout(()=>Audio.playMorse(MORSE[word[pos]],null,sig,1.3),300); }
  };
  $("wbBtn").onclick=submit; inp.onkeydown=e=>{ if(e.key==="Enter") submit(); };
}

/* ---- WANTED ---- */
function gameWanted(){
  const msg=rand(sentencePool());
  const body=$("gameBody");
  body.innerHTML=`<p class="muted">🔎 A full encrypted message was intercepted. Play it, decode it, type the plaintext.</p>
    <div class="center" style="margin:12px 0;"><span class="signal" id="wtSig"></span></div>
    <div class="center"><button id="wtPlay" class="alt">▶ Play transmission</button><button id="wtHint">👁 Show Morse</button></div>
    <div class="morse-glyph center" id="wtGlyph" style="justify-content:center;font-size:1.1em;word-break:break-word;min-height:1.4em;margin:10px 0;"></div>
    <div class="center"><input id="wtIn" style="max-width:420px;text-transform:uppercase;text-align:center;" placeholder="decoded message">
      <div style="margin-top:10px;"><button class="cta" id="wtBtn">Submit decryption ▶</button></div></div>
    <div id="wtMsg" class="center" style="min-height:1.6em;margin-top:10px;"></div>`;
  $("wtPlay").onclick=()=>Audio.playText(msg,null,$("wtSig"),1.2);
  $("wtHint").onclick=()=>{ $("wtGlyph").innerHTML=morseToGlyphHTML(textToMorse(msg)); };
  setTimeout(()=>Audio.playText(msg,null,$("wtSig"),1.2),500);
  const norm=s=>s.toUpperCase().replace(/\s+/g," ").trim();
  const submit=()=>{
    const v=norm($("wtIn").value||""); const ok=v===norm(msg);
    recordAttempt(ok);
    if(ok){ const bonus=25+msg.replace(/\s/g,"").length*3; awardIntel(bonus);
      [...new Set(norm(msg).replace(/[^A-Z0-9]/g,""))].forEach(c=>recordChar(c,true,false));
      $("wtMsg").innerHTML="<span class='cyan'>✔ Lead identified! \""+msg+"\" — +"+bonus+" intel</span>";
      Audio.success(); checkBadges();
    }else{ $("wtMsg").innerHTML="<span class='red'>✖ Decryption mismatch. Replay and refine.</span>"; Audio.fail(); }
  };
  $("wtBtn").onclick=submit;
  $("wtIn").onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); submit(); } };
}

/* ==================================================================
   15. PROFILE
   ================================================================== */
function renderProfile(){
  $("setName").value=State.name; $("setAge").value=State.age; $("setGoal").value=State.goal;
  $("setWpm").value=State.wpm; $("wpmLabel").textContent=State.wpm;
  $("setPitch").value=State.pitch; $("pitchLabel").textContent=State.pitch;
  $("setMusic").value=Math.round(State.musicVol*100); $("musicLabel").textContent=Math.round(State.musicVol*100);
  $("setSfx").value=Math.round(State.sfxVol*100); $("sfxLabel").textContent=Math.round(State.sfxVol*100);
  $("muteToggle").checked=State.muted; $("flickerToggle").checked=!!State.flicker;
  $("pfRank").textContent=rankFor(State.intel).name; $("pfIntel").textContent=State.intel;
  $("pfAcc").textContent= State.attempts?Math.round(State.correct/State.attempts*100)+"%":"—";
  $("pfAttempts").textContent=State.attempts;
  $("pfMastered").textContent=masteredLetters().length+"/26";
  $("pfStreak").textContent=State.bestStreak;
  renderBadgeWall($("pfBadges"));
}
$("setWpm").addEventListener("input",e=>$("wpmLabel").textContent=e.target.value);
$("setPitch").addEventListener("input",e=>{$("pitchLabel").textContent=e.target.value; State.pitch=+e.target.value; Audio.beep(+e.target.value,0.08); saveState();});
$("setMusic").addEventListener("input",e=>{$("musicLabel").textContent=e.target.value; Audio.setMusicVol(+e.target.value/100); saveState();});
$("setSfx").addEventListener("input",e=>{$("sfxLabel").textContent=e.target.value; Audio.setSfxVol(+e.target.value/100); Audio.click(); saveState();});
$("muteToggle").addEventListener("change",e=>{ Audio.setMuted(e.target.checked); $("muteBtn").textContent=State.muted?"♪̶":"♪"; saveState(); });
$("flickerToggle").addEventListener("change",e=>{ State.flicker=e.target.checked; document.body.classList.toggle("flicker",e.target.checked); saveState(); });
$("saveProfile").addEventListener("click",()=>{
  State.name=($("setName").value||"GHOST").trim().toUpperCase()||"GHOST";
  State.age=parseInt($("setAge").value,10)||State.age;
  State.goal=$("setGoal").value; State.wpm=+$("setWpm").value; State.pitch=+$("setPitch").value;
  State.ageGroup=ageGroupFor(State.age);
  applyTheme(); updateHUD(); saveState();
  toast("✔ Calibration saved, Agent "+State.name,"amber"); Audio.success();
});
$("resetBtn").addEventListener("click",()=>{
  if(!confirm("Purge all progress and re-run recruitment?")) return;
  Object.assign(State,{name:"AGENT",age:27,goal:"fun",ageGroup:"adult",wpm:10,pitch:600,
    intel:0,bestStreak:0,attempts:0,correct:0,mastered:new Set(),charStats:{},unlockedMission:0,badges:new Set(),flicker:false});
  try{ localStorage.removeItem(STORE_KEY); localStorage.removeItem(OLD_KEY); }catch(e){}
  applyTheme(); updateHUD(); updateNavLocks();
  onboardBegun=false;
  $("inName").value=""; $("inAge").value="";
  go("onboard"); startOnboard();
});

/* mute toggle (topbar) */
$("muteBtn").addEventListener("click",()=>{
  Audio.setMuted(!State.muted); $("muteBtn").textContent=State.muted?"♪̶":"♪";
  if(!State.muted) Audio.click(); saveState();
});

/* ==================================================================
   16. BOOT
   ================================================================== */
function firstInteract(){ Audio.init(); Audio.resume(); Music.start();
  if(!onboardBegun && $("screen-onboard").classList.contains("active")) beginOnboard();
}
document.addEventListener("click",firstInteract);
document.addEventListener("keydown",firstInteract);
document.addEventListener("touchstart",firstInteract);

/* global UI SFX */
document.addEventListener("click",e=>{ if(e.target.closest("button,.btn,.codex-cell,.menu-btn,.nav-item,.tab,[data-go]")) Audio.click(); },true);
document.addEventListener("mouseover",e=>{ if(e.target.closest("button,.btn,.codex-cell,.menu-btn,.nav-item")) Audio.hover(); });
document.addEventListener("keydown",e=>{
  const tag=(e.target.tagName||"").toLowerCase();
  if((tag==="input"||tag==="textarea") && e.target.type!=="range"){
    if(e.key.length===1 || e.key==="Backspace" || e.key==="Enter") Audio.keyClick();
  }
});

window.addEventListener("DOMContentLoaded",()=>{
  const restored=loadState();
  if(restored && State.name && State.name!=="AGENT"){
    applyTheme(); updateHUD(); updateNavLocks();
    $("muteBtn").textContent= State.muted?"♪̶":"♪";
    renderEnc(); renderDec();
    go("hq");
  }else{
    applyTheme();
    renderEnc(); renderDec();
    startOnboard(); // shows "tap to begin" prompt; types on first interaction
  }
});
