// Screenshots for t120–t125 (headless Chrome/swiftshader 1024x600; not a real iPad).
const {chromium}=require('playwright-core'),fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const OUT='screens/v11-ink/';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const c=await b.newContext({viewport:{width:1024,height:600},hasTouch:true,isMobile:true});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const r={};
await p.goto('http://127.0.0.1:8787/');await p.waitForFunction(()=>window.__game?.scene?.isActive('Select'));await sleep(2200);await p.screenshot({path:OUT+'select.png'});
r.fonts=await p.evaluate(()=>[document.fonts.check('32px LiuJianMaoCao','神话'),document.fonts.check('32px MaShanZheng','神话')]);
await p.goto('http://127.0.0.1:8787/?hero=wukong');await p.waitForFunction(()=>window.__battle?.phase==='fight'&&__battle.enemies.length>0);await sleep(1500);
await p.evaluate(()=>{const B=__battle;B.spawnQ=[];B.enemies.forEach(e=>{e.def={...e.def,speed:0,damage:0,pounce:null};e.hp=e.maxHp=99999;});const h=B.player;h.hp=h.maxHp*.2;});await sleep(500);
await p.screenshot({path:OUT+'hud-hp-low.png'});await p.screenshot({path:OUT+'hud-closeup.png',clip:{x:0,y:0,width:520,height:250}});
await p.evaluate(()=>{const h=__battle.player;h.maxHp=2400;h.hp=2300;});await sleep(1800);await p.screenshot({path:OUT+'hud-hp-high.png'});
// slash ink: three stages
await p.evaluate(()=>{const B=__battle,h=B.player;h.maxHp=720;h.hp=700;const e=B.alive(B.enemies)[0];h.x=e.x+120;h.y=e.y;h.faceAng=Math.PI;});await sleep(300);
for(let s=1;s<=3;s++){await p.evaluate(()=>{const B=__battle;B.scene.resume();B.ctrl.atk=true;B.player.combo.request(B.elapsed);});
  await p.waitForFunction(st=>{const h=__battle.player;const c=h.clock,ok=h.inkTrail&&c&&!c.done&&c.time>c.timing.windup+c.timing.active*.5&&h.attackProfile?.step===st;if(ok){__battle.ctrl.atk=false;__battle.hitstopT=999;}return ok;},s,{timeout:4000,polling:'raf'}).catch(()=>{});
  const q=await p.evaluate(()=>{const h=__battle.player,cam=__battle.cameras.main,v=__battle.view.project(h.x,h.y);return{x:(v.x-cam.worldView.x)*cam.zoom,y:(v.y-cam.worldView.y)*cam.zoom,n:h.inkTrail?.strands.length,step:h.attackProfile?.step};});
  r['slash'+s]=q;await sleep(150);await p.screenshot({path:OUT+'slash-stage'+s+'.png',clip:{x:Math.max(0,q.x-230),y:Math.max(0,q.y-260),width:460,height:330}});
  await p.evaluate(()=>{__battle.hitstopT=0;});await p.waitForFunction(()=>{const h=__battle.player;return !h.inkTrail&&(!h.clock||h.clock.done||h.clock.time>h.clock.timing.windup+h.clock.timing.active);},null,{timeout:3000,polling:'raf'}).catch(()=>{});}
await p.evaluate(()=>__battle.scene.resume());await sleep(500);
// boss unfold
await p.evaluate(()=>{const B=__battle;B.enemies.forEach(e=>{e.dead=true;e.spr.setVisible(false);e.shadow?.setVisible(false)});B.spawnBoss();B.boss.def={...B.boss.def};});
for(const [ms,name] of [[250,'boss-unfold-1'],[500,'boss-unfold-2'],[1400,'boss-unfold-3']]){await sleep(ms);await p.screenshot({path:OUT+name+'.png'});}
await p.evaluate(()=>__hud.togglePause(true));await sleep(800);await p.screenshot({path:OUT+'pause.png'});
await p.evaluate(()=>{const H=__hud;const L=H.children.list[H.children.list.length-1];L.destroy();H.paused=false;H.scene.resume('Battle');});await sleep(300);
// reward cards + results (DOM)
await p.evaluate(()=>{window.RunUI.rewards([{id:'a',name:'金刚不坏',description:'受到伤害降低 8%',stacksBefore:0,stacksAfter:1},{id:'b',name:'摄魂',description:'击杀掉落的魂灵每颗回血 +1',stacksBefore:1,stacksAfter:2},{id:'c',name:'筋斗疾风',description:'移动速度提升 6%',stacksBefore:0,stacksAfter:1}],'第二间 · 云栈石桥 肃清',()=>{});});await sleep(1200);await p.screenshot({path:OUT+'reward-cards.png'});
await p.evaluate(()=>{window.RunUI.close();const B=__battle;B.spawnQ=[];for(const e of B.enemies)if(!e.dead){e.hp=0;e.dead=true;}try{B.finish(true);}catch(e){B.over=false;B.finish(false);}});
await p.waitForFunction(()=>document.querySelector('#run-overlay[data-screen=result]'),null,{timeout:30000}).catch(()=>{});await sleep(1500);await p.screenshot({path:OUT+'result.png'});
console.log(JSON.stringify({errs,r}));await b.close();})();
