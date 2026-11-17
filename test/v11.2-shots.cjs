// v11.2 headless evidence (Chrome/swiftshader 1024x600 touch emulation; NOT a real iPad).
// Captures: idle-vs-run scale, attack staff sweep per stage x direction, hand-over-staff closeup, cast super armour log, hurt feedback, dodge buffer, input latency.
const {chromium}=require('playwright-core'),fs=require('fs'),assert=require('node:assert/strict');
const BASE=process.argv[2]||'http://127.0.0.1:8787/',OUT='screens/v11.2/raw/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1024,height:600},hasTouch:true,isMobile:true,deviceScaleFactor:2});const p=await ctx.newPage();p.setDefaultTimeout(90000);
const R={errors:[]};p.on('pageerror',e=>R.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')R.errors.push(m.text());});
const cdp=await ctx.newCDPSession(p);const touch=(type,pts=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y,id=1])=>({x,y,id,radiusX:5,radiusY:5,force:1}))});
await p.goto(BASE+'?hero=wukong');await p.waitForFunction(()=>window.__battle?.player?.art?.state);
await p.evaluate(()=>{const h=__battle.player,src=h.spr.texture.getSourceImage(),cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;const c=cv.getContext('2d');c.drawImage(src,0,0);const d=c.getImageData(0,0,cv.width,cv.height).data;let y0=-1,y1=-1;for(let y=0;y<cv.height&&y0<0;y++)for(let x=0;x<cv.width;x++)if(d[(y*cv.width+x)*4+3]>60){y0=y;break;}for(let y=cv.height-1;y>=0&&y1<0;y--)for(let x=0;x<cv.width;x++)if(d[(y*cv.width+x)*4+3]>60){y1=y;break;}window.__spawnH=+((y1-y0)*Math.abs(h.spr.scaleY)).toFixed(2);});
await p.waitForFunction(()=>window.__battle?.run&&__battle.phase==='fight'&&__battle.enemies.length>0);
await touch('touchStart',[[512,200]]);await touch('touchEnd');await sleep(300);
await p.evaluate(()=>{const b=__battle,h=b.player;b.spawnQ=[];b.enemies.forEach(e=>{if(!e.dead){e.hp=e.maxHp=1e7;e.x=GAME_CONFIG.arena.width-60;e.y=60;e.def={...e.def,speed:0};e.stunT=1e6;e.spr.setVisible(false);e.shadow?.setVisible(false);}});
  h.hp=h.maxHp=99999;h.x=700;h.y=640;
  window.__scr=()=>{const c=b.cameras.main,s=h.spr,r=b.game.canvas.width/b.game.canvas.clientWidth;return{x:((s.x-c.worldView.x)*c.zoom+c.x)/r,y:((s.y-c.worldView.y)*c.zoom+c.y)/r,z:c.zoom/r};};
  window.__freeze=on=>{if(on)b.scene.pause();else b.scene.resume();};
  window.__face=a=>{h.faceAng=a;};});
const clip=async(name,w=200,hgt=230,dy=-120)=>{await p.evaluate(()=>{const h=__battle.player;if(Math.hypot(h.x-700,h.y-640)>80){h.x=700;h.y=640;h.art.update(0);}});const s=await p.evaluate(()=>__scr());(R.clips=R.clips||{})[name]=s;const W=w*s.z/1.2,H=hgt*s.z/1.2;await p.screenshot({path:OUT+name+'.png',clip:{x:Math.max(0,s.x-W/2),y:Math.max(0,s.y+dy*s.z/1.2-H/2),width:W,height:H}});return s;};
const angs={right:0,left:Math.PI,down:Math.PI/2,up:-Math.PI/2};
// ---------- 1. figure size: spawn reference vs idle / run frames / attacks / dodge / casts ----------
await p.evaluate(()=>{window.__hgt=()=>{const h=__battle.player,src=h.spr.texture.getSourceImage(),cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;const c=cv.getContext('2d');c.drawImage(src,0,0);const d=c.getImageData(0,0,cv.width,cv.height).data;let y0=-1,y1=-1;for(let y=0;y<cv.height&&y0<0;y++)for(let x=0;x<cv.width;x++)if(d[(y*cv.width+x)*4+3]>60){y0=y;break;}for(let y=cv.height-1;y>=0&&y1<0;y--)for(let x=0;x<cv.width;x++)if(d[(y*cv.width+x)*4+3]>60){y1=y;break;}return +((y1-y0)*Math.abs(h.spr.scaleY)).toFixed(2);};
  window.__pose=(o)=>{const b=__battle,h=b.player,C=GAME_CONFIG;__freeze(true);h.clock=null;h.action=null;h.castKind=null;h.dodgeState=null;h.moving=false;h.art.spd=0;h.faceAng=o.a;
    if(o.run!=null){h.moving=true;h.art.spd=220;const R=C.poseArtV11.wukong.run;h.art.runDist=(o.run+.5)*R.cycleStride/R.frames.length;}
    if(o.stage!=null){h.attackProfile={...C.attackMotion[h.weapon],...C.combo.profiles[h.weapon][o.stage],step:o.stage+1};b.beginAction(h,'attack',()=>{});h.clock.release=()=>{};h.clock.time=o.windup?h.clock.timing.windup*.6:h.clock.timing.windup+h.clock.timing.active*.5;}
    if(o.cast){const w=b.W(h),sk=o.cast;h.attackProfile=null;b.beginAction(h,'cast',()=>{});h.castKind=w[sk].kind;h.clock.release=()=>{};h.clock.time=h.clock.timing.windup*.6;}
    if(o.dodge){h.dodgeState={a:o.a,t:.05,dur:.2,speed:0,ghostT:9};}
    h.art.last=-1;h.art.update(0);const s=h.art.state;const r={pose:s.poseTex||'v6-idle-'+s.view,view:s.view,screenH:__hgt(),handsOverStaff:s.handDepth>s.weaponDepth};h.dodgeState=null;return r;};});
R.size={};const sizeShot=async(name,o)=>{R.size[name]=await p.evaluate(o=>__pose(o),o);await sleep(80);await clip('size-'+name,220,240,-110);};
R.size.spawn=await p.evaluate(()=>({pose:'spawn',screenH:window.__spawnH}));
await sizeShot('idle-right',{a:0});await sizeShot('idle-left',{a:Math.PI});await sizeShot('idle-down',{a:Math.PI/2});await sizeShot('idle-up',{a:-Math.PI/2});
for(const [dn,a] of [['right',0],['left',Math.PI],['down',Math.PI/2],['up',-Math.PI/2]])for(let f=0;f<4;f++)await sizeShot(`run-${dn}-f${f}`,{a,run:f});
for(const [i,st] of ['light','normal','heavy'].entries())await sizeShot('attack-'+st,{a:0,stage:i});
await sizeShot('dodge',{a:0,dodge:true});for(const sk of ['skill1','skill2','skill3'])await sizeShot('cast-'+sk,{a:0,cast:sk});
await p.evaluate(()=>{const h=__battle.player;h.clock=null;h.action=null;__freeze(false);});
for(const [dir,a] of Object.entries(angs)){for(let stage=0;stage<3;stage++)await sizeShot('attack-'+['light','normal','heavy'][stage]+'-'+dir+'-windup',{a,stage,windup:true});await sizeShot('dodge-'+dir,{a,dodge:true});for(const cast of ['skill1','skill2','skill3'])await sizeShot('cast-'+cast+'-'+dir,{a,cast});}
const ref=R.size.spawn.screenH,upright=Object.keys(R.size);
R.sizeCheck=Object.fromEntries(Object.entries(R.size).map(([k,v])=>[k,{pose:v.pose,screenH:v.screenH,ratio:+(v.screenH/ref).toFixed(3),asserted:upright.includes(k)}]));
const badSize=upright.filter(k=>Math.abs(R.size[k].screenH/ref-1)>.03);assert.deepEqual(badSize,[],'all pose frames must be within ±3% of spawn height '+JSON.stringify(R.sizeCheck));
// ---------- 2. attack staff sweep per stage x direction ----------
R.attack={};
for(const [i,stage] of ['light','normal','heavy'].entries()) for(const dir of ['left','right','up','down']){
  const samples=await p.evaluate(([i,a])=>{const b=__battle,h=b.player,C=GAME_CONFIG;__freeze(true);h.clock=null;h.moving=false;h.faceAng=a;const prof={...C.attackMotion[h.weapon],...C.combo.profiles[h.weapon][i],step:i+1,finisher:i===2};h.attackProfile=prof;b.beginAction(h,'attack',()=>{});h.faceAng=a;h.clock.release=()=>{};const tm=h.clock.timing,T=tm.windup+tm.active,out=[];
    for(let q=0;q<=12;q++){h.clock.time=T*q/12+(q===12?tm.recovery*.2:0);h.art.last=-1;h.art.update(0);const s=h.art.state,st=s.staff,w=h.art.weapon;out.push({t:+h.clock.time.toFixed(3),ang:+s.weaponAngle.toFixed(3),tip:{x:+(w.x+st.tip.x).toFixed(1),y:+(w.y+st.tip.y).toFixed(1)},grip:{x:+w.x.toFixed(1),y:+w.y.toFixed(1)},gripFist:s.gripFist,pose:s.poseTex,hands:s.handsOn,handAbove:s.handDepth>s.weaponDepth,sweep:h.art.sweep});}
    return out;},[i,angs[dir]]);
  // verify: tip ends on the attack side and moves monotonically in the mirrored sweep direction
  const last=samples[11],g=last.grip,dx=last.tip.x-g.x,dy=last.tip.y-g.y,side=Math.abs(Math.cos(angs[dir]))>.08?Math.sign(Math.cos(angs[dir])):1;
  const dA=[];for(let q=5;q<12;q++){let d=samples[q+1].ang-samples[q].ang;d=Math.atan2(Math.sin(d),Math.cos(d));dA.push(d);}
  const mono=dA.every(d=>d*side>=-1e-3);const endsTowardTarget=dir==='left'?dx<0:dir==='right'?dx>0:dir==='down'?dy>-5:true;
  R.attack[stage+'-'+dir]={side,mono,endsTowardTarget,startAng:samples[0].ang,endAng:last.ang,endTipRel:{dx:+dx.toFixed(1),dy:+dy.toFixed(1)},pose:last.pose,handAbove:samples.every(s=>s.handAbove||!s.hands)};
  fs.writeFileSync(OUT+`attack-${stage}-${dir}.json`,JSON.stringify(samples));
  // three frames: anticipation, mid swing, end of active
  for(const [lab,q] of [['a',2],['b',7],['c',11]]){await p.evaluate(([q])=>{const h=__battle.player,tm=h.clock.timing,T=tm.windup+tm.active;h.clock.time=T*q/12;h.art.last=-1;h.art.update(0);},[q]);await sleep(60);await clip(`atk-${stage}-${dir}-${lab}`,260,260,-110);}
  await p.evaluate(()=>{const h=__battle.player;h.clock=null;h.action=null;__freeze(false);});
}
// live trail (real update loop) for normal swing to the left and right
R.live={};
for(const dir of ['left','right']){await p.evaluate(()=>__freeze(false));await sleep(300);
  await p.evaluate(([a])=>{const b=__battle,h=b.player,C=GAME_CONFIG;h.clock=null;h.cd.attack=0;h.combo.reset();h.faceAng=a;h.combo.request(b.elapsed);b.doAttack(h,a,null);h.combo.reset();b.doAttack;},[angs[dir]]);
  await p.waitForFunction(()=>{const h=__battle.player;return h.clock&&h.clock.time>h.clock.timing.windup+h.clock.timing.active*.6;},null,{polling:'raf'});await p.evaluate(()=>__freeze(true));await clip('live-trail-light-'+dir,300,260,-100);
  R.live[dir]=await p.evaluate(()=>{const h=__battle.player;return{stage:h.attackProfile.poseStage,sweep:h.art.sweep,faceAng:h.faceAng};});await p.evaluate(()=>__freeze(false));}
// ---------- 3. cast super armour while being hit ----------
await sleep(500);
R.cast=await p.evaluate(async()=>{const b=__battle,h=b.player;h.clock=null;h.cd.skill1=h.cd.skill2=h.cd.skill3=0;b.armorLog=[];h.castArmorBlocks=0;h.hurtIframeT=0;const imp=b.makeEnemy('imp',h.x-60,h.y);imp.hp=imp.maxHp=1e6;imp.def={...imp.def,speed:0};imp.stunT=1e6;
  const res={};for(const sk of ['skill1','skill2','skill3']){h.clock=null;h.cd[sk]=0;b.doSkill(h,sk,null);const kind=h.castKind,clk=h.clock,hp0=h.hp;let resolved=false;const rel=clk.release;clk.release=()=>{resolved=true;rel();};
    const log=[];const tm=clk.timing;for(const frac of [.15,.5,.9]){await new Promise(r=>{const f=()=>{if(clk.done||clk.time>=tm.windup*frac*(frac>.8?1.1:1))r();else requestAnimationFrame(f);};f();});h.hurtIframeT=0;b.hurt(h,25,imp);log.push({clock:+clk.time.toFixed(3),cancelled:clk.cancelled,stunT:h.stunT,kb:!!h.kb,hp:h.hp});}
    await new Promise(r=>{const f=()=>{if(clk.done)r();else requestAnimationFrame(f);};f();});res[sk]={kind,log,damageTaken:hp0-h.hp,cancelled:clk.cancelled,resolved,completed:clk.done&&!clk.cancelled};await new Promise(r=>setTimeout(r,250));}
  imp.dead=true;imp.spr.setVisible(false);imp.shadow?.setVisible(false);return{res,armorBlocks:h.castArmorBlocks,armorLog:b.armorLog};});
for(const [k,v] of Object.entries(R.cast.res))assert.ok(v.completed&&v.resolved&&!v.cancelled&&v.damageTaken>0&&v.log.every(l=>!l.cancelled&&!(l.stunT>0)),'cast super armour '+k+' '+JSON.stringify(v));
// cast screenshot while being hit
await p.evaluate(()=>{const b=__battle,h=b.player;h.cd.skill2=0;h.clock=null;b.doSkill(h,'skill2',null);});await p.waitForFunction(()=>{const h=__battle.player;return h.clock&&h.clock.time>h.clock.timing.windup*.4;},null,{polling:'raf'});
await p.evaluate(()=>{const b=__battle,h=b.player;h.hurtIframeT=0;b.hurt(h,30,b.enemies.find(e=>!e.dead)||null);});await sleep(40);await p.evaluate(()=>__freeze(true));await clip('cast-hit-no-interrupt',300,280,-110);
R.castShot=await p.evaluate(()=>{const h=__battle.player;return{action:h.action,cast:h.castKind,clock:+h.clock.time.toFixed(3),cancelled:h.clock.cancelled,stunT:h.stunT};});await p.evaluate(()=>__freeze(false));await sleep(800);
// ---------- 4. hurt feedback during an attack: flash + shake + i-frames, no interrupt ----------
R.hurt=await p.evaluate(async()=>{const b=__battle,h=b.player,C=GAME_CONFIG;h.clock=null;h.cd.attack=0;h.hurtIframeT=0;h.combo.reset();h.combo.request(b.elapsed);b.doAttack(h,0,null);const clk=h.clock;await new Promise(r=>requestAnimationFrame(r));b.hurt(h,20,null);const after={cancelled:clk.cancelled,stunT:h.stunT,iframe:+h.hurtIframeT.toFixed(2),flinch:h.flinchT>0,silh:(b.silh||[]).filter(s=>!s.done).length};const hp1=h.hp;b.hurt(h,20,null);after.secondHitBlocked=h.hp===hp1;return after;});
await sleep(30);await p.evaluate(()=>__freeze(true));await clip('hurt-flash',260,260,-110);await p.evaluate(()=>__freeze(false));
assert.ok(!R.hurt.cancelled&&!(R.hurt.stunT>0)&&R.hurt.secondHitBlocked,'hurt feedback without interrupt '+JSON.stringify(R.hurt));
// ---------- 5. dodge buffer + input latency (real touch) ----------
await sleep(700);
R.dodgeBuffer=await p.evaluate(async()=>{const b=__battle,h=b.player;h.clock=null;h.dodgeState=null;h.cd.dodge=.15;b.ctrl.dodge=true;const t0=b.elapsed;await new Promise(r=>{const f=()=>{if(h.dodgeState||b.elapsed-t0>.6)r();else requestAnimationFrame(f);};f();});return{executed:!!h.dodgeState,after:+(b.elapsed-t0).toFixed(3)};});
assert.ok(R.dodgeBuffer.executed,'dodge pressed during cooldown must execute when ready');
await sleep(600);
const lat=async(btn,cond)=>{await p.evaluate(([cond])=>{window.__lat=null;const t0=performance.now();let n=0;const f=()=>{n++;if(eval(cond)){window.__lat={ms:+(performance.now()-t0).toFixed(1),frames:n};return;}if(n<120)requestAnimationFrame(f);};window.__latStart=()=>{const s=performance.now();window.__lat0=s;};requestAnimationFrame(f);},[cond]);};
R.latency={};
await p.evaluate(()=>{__hud.input.on('pointerdown',()=>{window.__t0={ms:performance.now(),el:__battle.elapsed,frame:__battle.game.loop.frame};});});
for(const [btn,cond] of [['atk',"__battle.player.action==='attack'&&!!__battle.player.clock&&!__battle.player.clock.done&&!!__battle.player.art.state.poseStage"],['dodge',"!!__battle.player.dodgeState&&__battle.player.art.state.poseStage==='dodge'"]]){
  await p.evaluate(()=>{const h=__battle.player;h.clock=null;h.action=null;h.dodgeState=null;h.cd.attack=0;h.cd.dodge=0;h.combo.reset();window.__t0=null;window.__t1=null;});await sleep(600);
  await p.evaluate(([cond])=>{const f=()=>{if(window.__t0&&eval(cond)){window.__t1={ms:performance.now(),el:__battle.elapsed,frame:__battle.game.loop.frame};return;}requestAnimationFrame(f);};requestAnimationFrame(f);},[cond]);
  const b=await p.evaluate(k=>{const c=document.querySelector('canvas'),d=c.width/c.clientWidth,q=__hud.btnDefs[k];return{x:q.x/d,y:q.y/d};},btn);await touch('touchStart',[[b.x,b.y,7]]);await p.waitForFunction(()=>!!window.__t1,null,{timeout:10000}).catch(()=>{});await touch('touchEnd');
  R.latency[btn]=await p.evaluate(()=>window.__t1&&window.__t0?{gameFrames:__t1.frame-__t0.frame,ms:+(__t1.ms-__t0.ms).toFixed(1),gameSec:+(__t1.el-__t0.el).toFixed(3)}:{fail:true,t0:window.__t0});}
// ---------- hand-over-staff closeups ----------
for(const dir of ['right','left']){await p.evaluate(([a])=>{const h=__battle.player;__freeze(true);h.clock=null;h.action=null;h.moving=false;h.faceAng=a;h.art.last=-1;h.art.update(0);},[angs[dir]]);await sleep(80);await clip('hand-closeup-idle-'+dir,120,120,-80);await p.evaluate(()=>__freeze(false));}
await p.evaluate(()=>{const b=__battle,h=b.player,C=GAME_CONFIG;__freeze(true);h.faceAng=0;h.attackProfile={...C.attackMotion[h.weapon],...C.combo.profiles[h.weapon][2],step:3};b.beginAction(h,'attack',()=>{});h.clock.release=()=>{};h.clock.time=h.clock.timing.windup*.5;h.art.last=-1;h.art.update(0);});await sleep(80);await clip('hand-closeup-heavy',160,200,-150);
await p.evaluate(()=>{const h=__battle.player;h.clock=null;h.action=null;__freeze(false);});
fs.writeFileSync('screens/v11.2/report.json',JSON.stringify(R,null,1));
const bad=Object.entries(R.attack).filter(([k,v])=>!v.mono||!v.endsTowardTarget);assert.deepEqual(bad,[],'staff sweep direction');
assert.ok(R.latency.atk.gameFrames<=2&&R.latency.dodge.gameFrames<=2,'pointerdown must act within two game frames');assert.deepEqual(R.errors,[]);console.log('PASS v11.2 shots',JSON.stringify({size:R.sizeCheck,latency:R.latency,dodge:R.dodgeBuffer,hurt:R.hurt,castShot:R.castShot}));await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
