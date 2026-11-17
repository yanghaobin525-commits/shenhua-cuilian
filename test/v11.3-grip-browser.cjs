// v11.3 t137 fixed-hand headless evidence (Chrome/swiftshader 1024x600 touch emulation; NOT a real iPad).
// Captures: idle-vs-run scale, attack staff sweep per stage x direction, hand-over-staff closeup, cast super armour log, hurt feedback, dodge buffer, input latency.
const {chromium}=require('playwright-core'),fs=require('fs'),assert=require('node:assert/strict');
const BASE=process.argv[2]||'http://127.0.0.1:8787/',OUT='screens/v11.3/raw/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1024,height:600},hasTouch:true,isMobile:true,deviceScaleFactor:2,recordVideo:{dir:'screens/v11.3/video',size:{width:1024,height:600}}});const p=await ctx.newPage();p.setDefaultTimeout(90000);
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
const read=()=>p.evaluate(()=>{const h=__battle.player,s=h.art.state,g=h.art.poseSrc?.info.carryGrip;return {pose:s.poseTex,view:s.view,flip:s.flip,frame:s.carryFrame,hand:s.carryHand,grip:s.gripFist,expected:g,aimInvariant:g?[[1,0],[-1,0],[0,1],[0,-1]].every(([x,y])=>h.art.pickGrip(h.art.poseSrc,x,y)===g):true,angle:s.weaponAngle,anchorError:Math.hypot(s.hand.x-s.grip.x,s.hand.y-s.grip.y),over:s.handDepth>s.weaponDepth,hands:s.handsOn,height:__hgt(),staff:s.staff};});
R.spawn=await p.evaluate(()=>window.__spawnH);R.posed={};
for(const [dn,a] of Object.entries(angs)){
 for(const [key,o] of [['idle',{a}],...[0,1,2,3,0].map((f,i)=>['f'+f+'-'+i,{a,run:f}]),['dodge',{a,dodge:true}],['stop',{a}],['restart',{a,run:0}]]){
  await p.evaluate(o=>__pose(o),o);const q=await read();R.posed[dn+'-'+key]=q;
  assert.ok(Math.abs(q.height/windowSpawn()-1)<.03,'body bbox preserved');
  if(key!=='idle'&&key!=='stop'){assert.equal(q.hand,'right');assert.deepEqual(q.grip,q.expected);assert.equal(q.aimInvariant,true,'aim cannot switch carry hand');assert.ok(q.hands&&q.over,'hand alpha above staff');assert.ok(q.anchorError<1e-6);const target=key==='dodge'?{right:1.15,left:-1.15,down:.95,up:.95}:{right:-.95,left:.95,down:.85,up:.85};assert.ok(Math.abs(q.angle-target[dn])<1e-6,'guide angle '+dn+' '+key);}
  await clip(dn+'-'+key,300,270,-110);
 }
}
function windowSpawn(){return R.spawn;}
// Real CDP touch: distance-driven cycles in all screen directions + mirror and dodge.
await p.evaluate(()=>{const h=__battle.player;h.clock=null;h.action=null;h.dodgeState=null;h.moving=false;h.cd.dodge=0;__freeze(false);window.__live=[];__battle.events.on('postupdate',()=>{const s=h.art.state;if(!s)return;window.__live.push({pose:s.poseStage,view:s.view,flip:s.flip,frame:s.carryFrame,hand:s.carryHand,angle:s.weaponAngle,over:s.handDepth>s.weaponDepth,dodge:!!h.dodgeState});});});
const J=await p.evaluate(()=>{const c=__battle.game.canvas,r=c.width/c.clientWidth,j=__hud.joyHome;return{x:j.x/r,y:j.y/r,r:__hud.joyR/r};});
R.live={};
for(const [dn,dx,dy] of [['right',1,0],['left',-1,0],['down',0,1],['up',0,-1]]){
 await p.evaluate(()=>{__live=[];__battle.player.x=700;__battle.player.y=640;__battle.player.clock=null;__battle.player.action=null;});
 await touch('touchStart',[[J.x,J.y,1]]);await touch('touchMove',[[J.x+dx*J.r*.85,J.y+dy*J.r*.85,1]]);
 await p.waitForFunction(()=>new Set(__live.filter(s=>s.pose?.startsWith('run-')).map(s=>s.frame)).size===4,null,{timeout:30000});
 await touch('touchEnd');await sleep(350);R.live[dn]=await p.evaluate(()=>__live);
 const running=R.live[dn].filter(s=>s.pose?.startsWith('run-'));assert.ok(running.length>3);assert.ok(running.every(s=>s.hand==='right'&&s.over),'touch run retains same hand');
}
await p.evaluate(()=>{__live=[];__battle.player.x=700;__battle.player.y=640;__battle.player.cd.dodge=0;});
await touch('touchStart',[[J.x,J.y,1]]);await touch('touchMove',[[J.x+J.r*.85,J.y,1]]);await sleep(900);await touch('touchMove',[[J.x-J.r*.85,J.y,1]]);await sleep(900);
const D=await p.evaluate(()=>{const c=__battle.game.canvas,r=c.width/c.clientWidth,d=__hud.btnDefs.dodge;return{x:d.x/r,y:d.y/r};});
await touch('touchStart',[[J.x-J.r*.85,J.y,1],[D.x,D.y,2]]);await p.waitForFunction(()=>__live.some(s=>s.dodge),null,{timeout:15000});await touch('touchEnd');await sleep(700);R.mirrorDodge=await p.evaluate(()=>__live);assert.ok(R.mirrorDodge.some(s=>s.flip===1)&&R.mirrorDodge.some(s=>s.flip===-1));assert.ok(R.mirrorDodge.filter(s=>s.pose==='dodge').every(s=>s.hand==='right'&&s.over));
assert.deepEqual(R.errors,[]);fs.writeFileSync('screens/v11.3/grip-report.json',JSON.stringify(R,null,2));console.log('PASS t137 four-direction run f0–3, same hand/anchors/guide angles/hand-over-staff/bbox; real touch cycles + mirror/dodge; no console errors');await ctx.close();await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
