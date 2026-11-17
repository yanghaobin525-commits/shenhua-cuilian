// t116 headless check: minions are knocked back + hit-stunned by every hit, a hit cancels their windup and they cannot damage Wukong while being hit;
// the boss keeps super armour (no interrupt / no knockback, only hit flash). Chrome/swiftshader at 1024x600 touch emulation, not a real iPad.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
const BASE=process.argv[2]||'http://127.0.0.1:8787/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const r={errors:[]};
const context=await browser.newContext({viewport:{width:1024,height:600},hasTouch:true,isMobile:true});const p=await context.newPage();p.setDefaultTimeout(60000);
p.on('pageerror',e=>r.errors.push(e.message));
const cdp=await context.newCDPSession(p);const touch=(type,pts=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y,id=1])=>({x,y,id,radiusX:5,radiusY:5,force:1}))});
const tapAtk=async()=>{const b=await p.evaluate(()=>__hud.btnDefs.atk);await touch('touchStart',[[b.x,b.y]]);await sleep(70);await touch('touchEnd');};
await p.goto(BASE+'?hero=wukong');await p.waitForFunction(()=>window.__battle?.run&&__battle.phase==='fight'&&__battle.enemies.length>0);
await touch('touchStart',[[512,200]]);await touch('touchEnd');
await p.evaluate(()=>{const b=__battle,h=b.player;b.spawnQ=[];b.enemies.forEach(e=>{e.dead=true;e.spr.setVisible(false);e.shadow?.setVisible(false)});
  h.x=GAME_CONFIG.arena.width/2;h.y=GAME_CONFIG.arena.height/2;h.faceAng=Math.PI;h.hp=h.maxHp=9999;h.def={...h.def,critChance:0};
  window.__log=[];const hurt=b.hurt.bind(b);b.hurt=(t,amt,src,opt)=>{const hp=t.hp,res=hurt(t,amt,src,opt);if(t.isPlayer&&t.hp<hp)__log.push({kind:'heroHit',t:b.elapsed,src:src?.key,dmg:hp-t.hp});if(src?.isPlayer&&t.team==='enemy')__log.push({kind:'enemyHit',t:b.elapsed,stun:t.stunT,kb:!!t.kb,clock:!!(t.clock&&!t.clock.done),motion:!!t.motionAction,boss:!!t.isBoss});return res;};
  window.__imp=b.makeEnemy('imp',h.x-70,h.y);__imp.hp=__imp.maxHp=50000;__imp.def={...__imp.def,speed:0,damage:25,cooldown:.45,pounce:null};});
// control: left alone, the minion does hurt Wukong
await sleep(1600);r.control=await p.evaluate(()=>__log.filter(l=>l.kind==='heroHit').length);assert.ok(r.control>=1,'control: imp should hurt the idle player');
// interrupt A (deterministic): hit the minion while it is in its windup -> windup cancelled, release never lands during the stun
await p.waitForFunction(()=>__imp.clock&&!__imp.clock.done&&__imp.clock.time<__imp.clock.timing.windup*.7);
r.windup=await p.evaluate(()=>{const b=__battle,h=b.player;__log.length=0;const before={clock:!!(__imp.clock&&!__imp.clock.done),t:+__imp.clock.time.toFixed(3)};b.hurt(__imp,5,h);return{before,after:!!(__imp.clock&&!__imp.clock.done),stun:__imp.stunT};});
await sleep(Math.round(r.windup.stun*1000*.9));r.windup.heroHitsDuringStun=await p.evaluate(()=>__log.filter(l=>l.kind==='heroHit').length);
assert.ok(r.windup.before.clock&&!r.windup.after&&r.windup.heroHitsDuringStun===0,'windup cancelled & no damage during stun '+JSON.stringify(r.windup));
// interrupt B (real touch input): keep tapping attack for ~3s; once the first hit lands the minion is stun-locked and never damages Wukong
await sleep(200);await p.evaluate(()=>{__log.length=0;});
const t0=Date.now();while(Date.now()-t0<3000){await tapAtk();await sleep(110);
  await p.evaluate(()=>{const h=__battle.player;if(Math.hypot(__imp.x-h.x,__imp.y-h.y)>90){__imp.x=h.x-70;__imp.y=h.y;}});} // keep it inside its own attack range so it would attack if it could
await sleep(150);
r.trace=await p.evaluate(()=>__log.map(l=>[l.kind[0],+l.t.toFixed(2),l.stun&&+l.stun.toFixed(2)]));
r.interrupt=await p.evaluate(()=>{const hits=__log.filter(l=>l.kind==='enemyHit'),t1=hits[0]?.t??1e9,hero=__log.filter(l=>l.kind==='heroHit'&&l.t>t1);return{enemyHits:hits.length,heroHitsAfterFirstHit:hero.length,allStunned:hits.every(h=>h.stun>0),allKnockback:hits.every(h=>h.kb),noActionAfterHit:hits.every(h=>!h.clock&&!h.motion),interrupts:__imp.interrupts}});
assert.ok(r.interrupt.enemyHits>=5,'player should land repeated hits '+JSON.stringify(r.interrupt));
assert.equal(r.interrupt.heroHitsAfterFirstHit,0,'minion must not damage Wukong while being hit '+JSON.stringify(r.trace));
assert.ok(r.interrupt.allStunned&&r.interrupt.allKnockback&&r.interrupt.noActionAfterHit,'every hit stuns, knocks back and cancels the action');
// knockback direction: away from the attacker
r.kb=await p.evaluate(()=>{const b=__battle,h=b.player;__imp.kb=null;__imp.stunT=0;__imp.x=h.x-80;__imp.y=h.y;const x0=__imp.x;b.hurt(__imp,5,h,{skill:true});const kb=__imp.kb;return{vx:kb?.vx,away:kb&&kb.vx<0,stun:__imp.stunT,x0};});
assert.ok(r.kb.away&&r.kb.stun>0,'knockback away from attacker');
// boss super armour
r.boss=await p.evaluate(()=>{const b=__battle,h=b.player;__imp.dead=true;__imp.spr.setVisible(false);b.spawnBoss();const B=b.boss;B.hp=B.maxHp=99999;B.x=h.x-90;B.y=h.y;B.stunT=0;b.bossMotion(B,'claw',1,.3);
  const m=B.motionAction;const AP=GAME_CONFIG.combo.profiles.cudgel;const out=[];for(const st of AP){h.action='attack';h.attackProfile=st;b.hurt(B,10,h);out.push({stun:B.stunT,kb:!!B.kb,hitStun:B.hitStunT||0,motionKept:B.motionAction===m,flash:B.flashT>0});}h.action=null;return out;});
assert.ok(r.boss.every(o=>o.stun===0&&!o.kb&&o.hitStun===0&&o.motionKept&&o.flash),'boss super armour '+JSON.stringify(r.boss));
assert.deepEqual(r.errors,[]);console.log('PASS v11 interrupt:',JSON.stringify(r));await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
