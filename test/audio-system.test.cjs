/* 无浏览器/无设备播放的结构与时序自测；不等于人工试听或 iOS 真机验证。 */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let nextId=0, timers=new Map(),ends=[],pitches=[], contexts=[];
class Param {constructor(v=0){this.value=v;}cancelScheduledValues(){}setTargetAtTime(v){assert(Number.isFinite(v));this.value=v;}setValueAtTime(v){assert(Number.isFinite(v));this.value=v;}exponentialRampToValueAtTime(v){assert(v>0&&Number.isFinite(v));this.value=v;}}
class Node {constructor(){this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.threshold=new Param();this.knee=new Param();this.ratio=new Param();this.attack=new Param();this.release=new Param();}connect(n){assert(n);return n;}disconnect(){}start(t=0){assert(Number.isFinite(t));if(this.frequency.value)pitches.push(this.frequency.value);}stop(t){if(t===undefined){if(this.onended){const fn=this.onended;this.onended=null;fn();}}else {assert(Number.isFinite(t));ends.push({n:this,t});}}}
class AC {constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination=new Node();contexts.push(this);}createGain(){return new Node();}createOscillator(){return new Node();}createDynamicsCompressor(){return new Node();}createBiquadFilter(){return new Node();}createBufferSource(){return new Node();}createBuffer(c,len){return {getChannelData:()=>new Float32Array(len)};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
const listeners={},windowListeners={};
const window={GAME_CONFIG:{audio:{master:0.42,maxVoices:64}},AudioContext:AC,document:{hidden:false,addEventListener(k,f){listeners[k]=f;}},addEventListener(k,f){windowListeners[k]=f;},setInterval(fn){const id=++nextId;timers.set(id,fn);return id;},clearInterval(id){timers.delete(id);}};
vm.runInNewContext(fs.readFileSync('audio.js','utf8'),{window,console});
function advance(seconds){const c=contexts[0];for(let t=0;t<seconds;t+=0.025){c.currentTime+=0.025;for(const f of [...timers.values()])f();const due=ends.filter(e=>e.t<=c.currentTime);ends=ends.filter(e=>e.t>c.currentTime);for(const {n} of due)if(n.onended){const fn=n.onended;n.onended=null;fn();}}}
(async()=>{
 const a=window.ShenhuaAudio;
 assert.equal(contexts.length,0);assert.equal(a.getState().state,'locked');
 a.setMode('arena');assert.equal(timers.size,0);
 assert(await a.unlock());assert.equal(contexts.length,1);assert.equal(timers.size,1);
 a.setMode('arena');await a.unlock();assert.equal(timers.size,1);assert.equal(contexts.length,1);
 advance(44);assert(pitches.length>100);assert(a.getState().voices<=64);
 for(const event of ['hit','hurt','skill','heal','pickup','wave','boss','bossPhase','victory','defeat']){a.play(event);advance(0.02);}
 for(let i=0;i<200;i++)a.play('hit');assert(a.getState().voices<=64);
 a.setMuted(true);assert.equal(a.getState().muted,true);a.setVolume(5);assert.equal(a.getState().volume,1);a.setMusicVolume(-2);assert.equal(a.getState().music,0);a.setSfxVolume(0.3);
 a.setMuted(false);a.setMusicVolume(0.48);
 window.document.hidden=true;listeners.visibilitychange();assert.equal(timers.size,0);assert.equal(a.getState().voices,0);
 a.pause('manual');window.document.hidden=false;listeners.visibilitychange();await Promise.resolve();assert.equal(timers.size,0);assert.equal(a.getState().state,'suspended');
 a.resume('manual');await Promise.resolve();assert.equal(timers.size,1);
 a.setMode('boss');assert.equal(timers.size,1);advance(40);
 assert.equal(a.getState().mode,'boss');assert(a.getState().voices<=64);
 a.setMode('silent');assert.equal(timers.size,0);assert.equal(a.getState().voices,0);
 a.play('victory');advance(4);assert.equal(a.getState().voices,0);
 windowListeners.pagehide();assert.equal(a.getState().state,'suspended');windowListeners.pageshow();await Promise.resolve();assert.equal(timers.size,0);
 a.destroy();assert.equal(a.getState().state,'closed');assert.equal(timers.size,0);
 console.log('PASS: lazy unlock, single context/scheduler, 84s scored scheduling, all 10 events, throttling/64-voice bound, mute/levels, nested pause/visibility, scene stop and cleanup. No browser or audible playback used.');
})().catch(e=>{console.error(e);process.exitCode=1;});
