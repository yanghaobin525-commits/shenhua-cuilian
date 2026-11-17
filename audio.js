/* 《神话·淬炼》原创合成配乐与音效。
 * 无外部音频、无采样商业曲。固定谱面：D 羽调式（D/F/G/A/C），16 小节循环。
 * Singleton API: window.ShenhuaAudio
 * unlock() 必须从 pointerdown/keydown 等可信用户手势中同步调用。
 * setVolume(0..1), setMusicVolume(0..1), setSfxVolume(0..1), setMuted(bool),
 * setMode('silent'|'arena'|'boss'), play(event), pause(reason), resume(reason), getState().
 * UI 控件由主界面调用 API 即可；本模块不创建/改变 UI。
 */
(function (root) {
'use strict';
if (root.ShenhuaAudio) return;
const cfg = Object.assign({ enabled:true, master:0.42, music:0.48, sfx:0.5, bpm:88, bossBpm:104, maxVoices:64, lookAhead:0.14, timerMs:25 }, (root.GAME_CONFIG || {}).audio);
const clamp = x => Math.max(0, Math.min(1, Number(x) || 0));
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
// 每行一小节，每格一个八分音符；0=休止。旋律有重复、应答与落音，不作随机选音。
const score = [
 [62,0,69,0,72,69,67,0], [65,0,67,69,67,0,62,0],
 [60,0,62,65,67,0,65,62], [57,0,60,0,62,0,0,0],
 [62,65,69,0,74,0,72,69], [67,0,69,72,69,0,65,0],
 [60,62,65,0,67,65,62,60], [62,0,57,0,62,0,0,0],
 [74,0,72,69,67,0,69,0], [72,69,67,65,67,0,62,0],
 [65,0,67,69,72,0,69,67], [65,62,60,0,57,0,0,0],
 [62,0,65,67,69,72,74,0], [72,69,67,0,65,0,62,0],
 [60,0,62,65,67,65,60,57], [62,0,0,69,62,0,0,0]
];
const roots = [38,38,36,33,38,41,36,38,38,36,41,33,38,41,36,38];
let ctx, master, music, sfx, noise, timer, mode='silent', unlocked=false, muted=false;
let step=0, next=0, musicLevel=clamp(cfg.music), sfxLevel=clamp(cfg.sfx), volume=clamp(cfg.master);
const paused = new Set(), voices = new Set(), recent = new Map();
let error = null;
function smooth(param, value) { if (!ctx) return; param.cancelScheduledValues(ctx.currentTime); param.setTargetAtTime(value,ctx.currentTime,0.025); }
function applyLevels() { if (!ctx) return; smooth(master.gain, muted ? 0 : volume); smooth(music.gain,musicLevel); smooth(sfx.gain,sfxLevel); }
function create() {
 if (ctx || !cfg.enabled) return;
 const AC=root.AudioContext || root.webkitAudioContext; if (!AC) { error='Web Audio unavailable'; return; }
 try {
  ctx = new AC(); master=ctx.createGain();music=ctx.createGain();sfx=ctx.createGain();
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-17;comp.knee.value=10;comp.ratio.value=5;comp.attack.value=0.006;comp.release.value=0.16;
  music.connect(master);sfx.connect(master);master.connect(comp);comp.connect(ctx.destination);applyLevels();
  noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
  const data=noise.getChannelData(0);let seed=731;
  for(let i=0;i<data.length;i++){ seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/4294967296*2-1); }
  // iOS 音频中断恢复：只在后续用户手势中尝试 resume，避免自动重试循环。
  ctx.onstatechange=()=>{ if(ctx.state==='closed') stopScheduler(); };
 } catch(e){error=String(e.message||e);}
}
function voice(t, dur, bus) {
 if (!ctx || voices.size >= cfg.maxVoices) return null;
 const g=ctx.createGain();g.connect(bus);const sources=[];
 const v={g,sources,bus,done:false,stop(){if(v.done)return;v.done=true;for(const n of sources){try{n.stop();}catch(_){}try{n.disconnect();}catch(_){}}g.disconnect();voices.delete(v);}};
 voices.add(v);
 // 一个极静音的计时源精确清理节点，不为每个音符创建 JS timeout。
 const end=ctx.createOscillator();const eg=ctx.createGain();eg.gain.value=0;end.connect(eg);eg.connect(g);
 end.onended=()=>{eg.disconnect();v.stop();};sources.push(end);end.start(t);end.stop(t+dur+0.06);
 return v;
}
function env(g,t,a,d,peak) {g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak),t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+d);}
function tone(t,n,d,level,type,bus) {
 const v=voice(t,d,bus);if(!v)return;env(v.g,t,0.006,d,level);
 const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(type==='pluck'?2400:1100,t);f.frequency.exponentialRampToValueAtTime(450,t+d);f.Q.value=0.6;f.connect(v.g);
 const o=ctx.createOscillator();o.type=type==='bass'?'sine':'triangle';o.frequency.value=hz(n);o.connect(f);o.start(t);o.stop(t+d);v.sources.push(o);
 o.onended=()=>{f.disconnect();};
}
function bell(t,n,d,level,bus) {
 const v=voice(t,d,bus);if(!v)return;env(v.g,t,0.005,d,level);
 [1,2.01,2.76,4.12].forEach((r,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hz(n)*r;g.gain.value=[0.7,0.22,0.1,0.04][i];o.connect(g);g.connect(v.g);o.start(t);o.stop(t+d);o.onended=()=>g.disconnect();v.sources.push(o);});
}
function drum(t,level,bus) {
 const v=voice(t,0.42,bus);if(!v)return;env(v.g,t,0.004,0.42,level);
 const o=ctx.createOscillator();o.frequency.setValueAtTime(115,t);o.frequency.exponentialRampToValueAtTime(43,t+0.2);o.connect(v.g);o.start(t);o.stop(t+0.42);v.sources.push(o);
}
function rustle(t,d,level,freq,bus) {
 const v=voice(t,d,bus);if(!v)return;env(v.g,t,0.003,d,level);
 const n=ctx.createBufferSource(),f=ctx.createBiquadFilter();n.buffer=noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=0.8;n.connect(f);f.connect(v.g);n.start(t);n.stop(t+d);n.onended=()=>f.disconnect();v.sources.push(n);
}
function stopVoices(bus) {for(const v of [...voices])if(!bus||v.bus===bus)v.stop();}
function stopScheduler(){if(timer){root.clearInterval(timer);timer=null;}}
function schedule() {
 if(!ctx||ctx.state!=='running'||paused.size||mode==='silent')return;
 if(next<ctx.currentTime-0.2) next=ctx.currentTime+0.04; // 后台恢复不追补漏掉的音符
 const eighth=30/(mode==='boss'?cfg.bossBpm:cfg.bpm);
 while(next<ctx.currentTime+cfg.lookAhead){
  const bar=Math.floor(step/8)%16,beat=step%8,n=score[bar][beat],boss=mode==='boss';
  if(n)tone(next,n,0.5,0.13,'pluck',music);
  if(beat===0||beat===4)tone(next,roots[bar],eighth*3.7,0.15,'bass',music);
  if(beat===0||beat===4||(boss&&beat===6))drum(next,boss?0.2:0.14,music);
  if(beat===2||beat===6)rustle(next,0.08,0.026,1700,music);
  if(bar%4===0&&beat===0)bell(next,bar===0?74:69,1.8,0.055,music);
  if(boss&&beat===7)tone(next,roots[bar]+12,0.18,0.08,'pluck',music);
  step=(step+1)%128;next+=eighth;
 }
}
function startScheduler(){if(!timer&&ctx&&mode!=='silent'&&!paused.size){next=ctx.currentTime+0.05;timer=root.setInterval(schedule,cfg.timerMs);schedule();}}
function unlock() {
 create();if(!ctx)return Promise.resolve(false);
 // resume 和静音 buffer 均同步发起于本次用户手势，不跨 await 后才调用。
 let p;try{p=ctx.resume();const b=ctx.createBufferSource();b.buffer=ctx.createBuffer(1,1,ctx.sampleRate);b.connect(master);b.onended=()=>b.disconnect();b.start(0);}catch(e){error=e.message;return Promise.resolve(false);}
 return Promise.resolve(p).then(()=>{unlocked=ctx.state==='running';if(paused.size)return ctx.suspend().then(()=>false);startScheduler();return unlocked;}).catch(e=>{error=e.message;return false;});
}
function setMode(m) {
 if(!['silent','arena','boss'].includes(m))return;
 if(m===mode){startScheduler();return;}
 mode=m;step=0;stopScheduler();if(ctx)stopVoices(music);startScheduler();
}
function pause(reason){paused.add(reason||'manual');stopScheduler();if(ctx){stopVoices();if(ctx.state==='running')ctx.suspend().catch(()=>{});}}
function resume(reason){paused.delete(reason||'manual');if(!paused.size&&ctx&&unlocked){ctx.resume().then(startScheduler).catch(e=>error=e.message);}}
const cooldowns={hit:0.085,hurt:0.22,skill:0.16,heal:0.3,pickup:0.3,wave:0.6,boss:1,bossPhase:1,victory:2,defeat:2};
function play(name,opts) {
 if(!ctx||ctx.state!=='running'||paused.size||muted)return;
 const t=ctx.currentTime+0.008,prev=recent.get(name);
 if(prev!==undefined&&t-prev<(cooldowns[name]||0.1))return;recent.set(name,t);
 const gain=opts&&opts.ai?0.4:1, S=(n,off,d,l)=>tone(t+(off||0),n,d||0.25,(l||0.13)*gain,'pluck',sfx);
 switch(name){
  case 'swing':rustle(t,.09,.055*gain,1800,sfx);break;
  case 'armor':bell(t,82,.16,.045*gain,sfx);break;
  case 'heavy':drum(t,.18,sfx);rustle(t,.15,.09*gain,450,sfx);break;
  case 'hit':rustle(t,0.065,0.12*gain,1100,sfx);tone(t,50,0.075,0.14*gain,'bass',sfx);break;
  case 'hurt':drum(t,0.22,sfx);rustle(t,0.12,0.09,650,sfx);break;
  case 'skill': S(62,0,0.18);S(69,0.045,0.22);bell(t+0.08,74,0.55,0.08*gain,sfx);rustle(t,0.15,0.035*gain,2100,sfx);break;
  case 'heal': [74,77,81].forEach((n,i)=>bell(t+i*0.09,n,0.65,0.06*gain,sfx));break;
  case 'pickup':[69,72,74].forEach((n,i)=>S(n,i*0.07,0.3,0.12));break;
  case 'wave':drum(t,0.23,sfx);drum(t+0.18,0.16,sfx);bell(t+0.36,62,1.1,0.1,sfx);break;
  case 'boss':drum(t,0.28,sfx);drum(t+0.23,0.22,sfx);bell(t,38,2,0.18,sfx);bell(t+0.5,50,1.4,0.1,sfx);break;
  case 'bossPhase':drum(t,0.26,sfx);bell(t,45,1.5,0.16,sfx);rustle(t,0.7,0.08,500,sfx);break;
  case 'victory':[62,65,69,74,77,74].forEach((n,i)=>bell(t+i*0.16,n,i===5?1.7:0.65,0.1,sfx));break;
  case 'defeat':[65,62,60,57,50].forEach((n,i)=>bell(t+i*0.22,n,1.0,0.08,sfx));break;
 }
}
root.ShenhuaAudio={unlock,setMode,play,pause,resume,
 setMuted(v){muted=!!v;applyLevels();},
 setVolume(v){volume=clamp(v);applyLevels();},
 setMusicVolume(v){musicLevel=clamp(v);applyLevels();},
 setSfxVolume(v){sfxLevel=clamp(v);applyLevels();},
 getState(){return {supported:!!(root.AudioContext||root.webkitAudioContext),unlocked,state:ctx?ctx.state:'locked',mode,muted,volume,music:musicLevel,sfx:sfxLevel,paused:[...paused],voices:voices.size,scheduler:!!timer,error};},
 destroy(){stopScheduler();stopVoices();if(ctx)ctx.close().catch(()=>{});unlocked=false;}
};
root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden)pause('hidden');else resume('hidden');});
root.addEventListener('pagehide',()=>pause('pagehide'));
root.addEventListener('pageshow',()=>resume('pagehide'));
// Safari 恢复失败时等下一个真实手势再试；有手动暂停原因时不擅自恢复。
const retry=()=>{if(!paused.size&&(!ctx||(ctx.state!=='running'&&ctx.state!=='closed')))unlock();};
root.document.addEventListener('pointerdown',retry,{passive:true});
root.document.addEventListener('keydown',retry);
})(window);
