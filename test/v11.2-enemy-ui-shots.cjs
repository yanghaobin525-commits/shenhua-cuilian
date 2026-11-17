// v11.2: boss leap phases, minion walk bounce, select portrait + readable brush font, room title. Headless swiftshader 1024x600 touch emulation (not a real iPad).
const {chromium}=require('playwright-core'),fs=require('fs'),assert=require('node:assert/strict');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const OUT='screens/v11.2/raw/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1024,height:600},hasTouch:true,isMobile:true,deviceScaleFactor:2});const p=await ctx.newPage();p.setDefaultTimeout(90000);const R={errors:[]};p.on('pageerror',e=>R.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')R.errors.push(m.text());});
const cdp=await ctx.newCDPSession(p);const touch=(type,pts=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y,id=1])=>({x,y,id,radiusX:5,radiusY:5,force:1}))});
// select screen
await p.goto('http://127.0.0.1:8787/');await sleep(4500);await p.screenshot({path:OUT+'select.png'});
R.fonts=await p.evaluate(()=>({calli:GAME_CONFIG.calliFont,loaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)}));
await p.goto('http://127.0.0.1:8787/?hero=wukong');await p.waitForFunction(()=>window.__battle?.run&&__battle.phase==='fight'&&__battle.enemies.length>0);await sleep(400);
await p.screenshot({path:OUT+'room-title.png',clip:{x:262,y:0,width:500,height:90}});
await touch('touchStart',[[512,200]]);await touch('touchEnd');
const scr=async(u,w,h,dy)=>p.evaluate(([w,h,dy,isBoss])=>{const b=__battle,c=b.cameras.main,u=isBoss?b.boss:window.__walker,s=u.spr,r=b.game.canvas.width/b.game.canvas.clientWidth,x=((s.x-c.worldView.x)*c.zoom)/r,y=((s.y-c.worldView.y)*c.zoom)/r,z=c.zoom/r;return{x:Math.max(0,x-w*z/2),y:Math.max(0,y+dy*z-h*z/2),width:w*z,height:h*z};},[w,h,dy,u==='boss']);
// minion walk: one imp walking across, others removed
R.walk=await p.evaluate(async()=>{const b=__battle,h=b.player;h.hp=h.maxHp=99999;b.spawnQ=[];b.enemies.forEach(e=>{e.dead=true;e.spr.setVisible(false);e.shadow?.setVisible(false);});h.x=700;h.y=700;const e=b.makeEnemy('imp',520,560);e.hp=e.maxHp=1e6;e.def={...e.def,damage:0,range:1,cooldown:99};window.__walker=e;await new Promise(r=>setTimeout(r,500));const out=[];for(let i=0;i<24;i++){await new Promise(r=>requestAnimationFrame(r));const s=e.enemyArt.state;out.push({mode:s.mode,b:s.walkBounce,sy:s.sy});}return out;});
const moving=R.walk.filter(s=>s.mode==='move');R.walkSummary={frames:R.walk.length,moving:moving.length,bounceRange:[Math.min(...moving.map(s=>s.b)),Math.max(...moving.map(s=>s.b))],syRange:[Math.min(...moving.map(s=>s.sy)),Math.max(...moving.map(s=>s.sy))]};
for(let i=0;i<3;i++){await sleep(90);await p.evaluate(()=>__battle.scene.pause());await p.screenshot({path:OUT+'imp-walk-'+i+'.png',clip:await scr('imp',150,130,-40)});await p.evaluate(()=>__battle.scene.resume());}
assert.ok(moving.length>5&&R.walkSummary.bounceRange[1]-R.walkSummary.bounceRange[0]>1.5,'imp walk bounce '+JSON.stringify(R.walkSummary));
// boss leap phases
await p.evaluate(()=>{const b=__battle;window.__walker.dead=true;window.__walker.spr.setVisible(false);window.__walker.shadow?.setVisible(false);b.spawnBoss();const B=b.boss;B.hp=B.maxHp=1e6;B.x=420;B.y=520;b.player.x=820;b.player.y=640;B.cdLeap=99;B.cdLunge=99;B.cdClaw=99;});await sleep(2200);
await p.evaluate(()=>{const b=__battle,B=b.boss;B.casting=0;b.bossLeap(B,1);B.cdLunge=B.cdClaw=99;});
R.leap={};const phase=async(name,cond)=>{await p.waitForFunction(cond,null,{polling:'raf',timeout:15000});await p.evaluate(()=>__battle.scene.pause());const st=await p.evaluate(()=>{const B=__battle.boss,s=B.enemyArt.state;return{z:+(s.renderZ||0).toFixed(1),sx:s.sx,sy:s.sy,landT:+(s.landT||0).toFixed(2),shadow:+B.shadow.scaleX.toFixed(3),angle:+B.spr.angle.toFixed(1)};});R.leap[name]=st;await p.screenshot({path:OUT+'boss-leap-'+name+'.png',clip:await scr('boss',300,300,-90)});await p.evaluate(()=>__battle.scene.resume());};
R.dbg=await p.evaluate(()=>{const B=__battle.boss;return{ma:B.motionAction,leap:!!B.leap,stun:B.stunT,dead:B.dead,over:__battle.over,phase:__battle.phase,paused:__battle.scene.isPaused()};});console.log('dbg',JSON.stringify(R.dbg));await sleep(1500);console.log('dbg2',JSON.stringify(await p.evaluate(()=>{const b=__battle,B=b.boss;return{ma:B.motionAction,leap:B.leap,el:b.elapsed,hs:b.hitstopT,landT:B.landT,teles:b.teles.length};})));
await phase('1-crouch',"(()=>{const a=__battle.boss.motionAction;return a&&a.kind==='pounce'&&!__battle.boss.leap&&a.time>a.windup*.6})()");
await phase('2-rise',"(()=>{const L=__battle.boss.leap;return L&&L.t/L.duration>.2})()");
// apex + landing posed deterministically from the live leap (swiftshader runs ~9 fps, too slow to catch 0.46 s of flight reliably)
const posed=async(name,fn)=>{await p.evaluate(fn);const st=await p.evaluate(()=>{const B=__battle.boss,s=B.enemyArt.state;return{z:+(s.renderZ||0).toFixed(1),sx:s.sx,sy:s.sy,landT:+(s.landT||0).toFixed(2),shadow:+B.shadow.scaleX.toFixed(3),angle:+B.spr.angle.toFixed(1)};});R.leap[name]=st;await p.screenshot({path:OUT+'boss-leap-'+name+'.png',clip:await scr('boss',300,300,-90)});};
await p.evaluate(()=>__battle.scene.pause());
await posed('3-apex',()=>{const b=__battle,B=b.boss;if(!B.leap)B.leap={sx:B.x,sy:B.y,x:B.x+120,y:B.y,t:0,duration:.46,radius:125,height:GAME_CONFIG.boss.leap.height};B.leap.t=B.leap.duration*.5;b.syncVisuals(0);});
await posed('4-land',()=>{const b=__battle,B=b.boss;B.enemyArt.wasAir=true;B.leap=null;b.syncVisuals(0);B.enemyArt.update(.03);});
await p.evaluate(()=>__battle.scene.resume());
assert.ok(R.leap['3-apex'].z>60&&R.leap['3-apex'].shadow<R.leap['1-crouch'].shadow&&R.leap['1-crouch'].sy<1&&R.leap['4-land'].sy<1,'boss leap phases '+JSON.stringify(R.leap));
fs.writeFileSync('screens/v11.2/report-enemy-ui.json',JSON.stringify(R,null,1));assert.deepEqual(R.errors,[]);console.log('PASS v11.2 enemy/ui',JSON.stringify(R.leap),JSON.stringify(R.walkSummary));await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
