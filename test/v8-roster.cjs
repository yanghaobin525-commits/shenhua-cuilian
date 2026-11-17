// Real production-asset browser integration. Never mocks or falls back to old portraits.
const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('fs');
const BASE=process.argv[2]||'http://127.0.0.1:8787/';const WIDTH=Number(process.env.TEST_WIDTH||1024),HEIGHT=Number(process.env.TEST_HEIGHT||768),UNIT=Math.min(WIDTH/1180,HEIGHT/820);const OUT='screens/';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const context=await browser.newContext({viewport:{width:WIDTH,height:HEIGHT},deviceScaleFactor:2,hasTouch:true,isMobile:true});const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()+':'+r.failure().errorText));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+':'+r.url());});
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__artBlocked||window.__game?.scene.isActive('Select'));
 const missing=await page.evaluate(()=>window.__artBlocked);assert(!missing,'Missing actual art: '+JSON.stringify(missing));
 const keys=await page.evaluate(()=>Object.keys(GAME_CONFIG.heroes));assert.equal(keys.length,8);
 const selectionTouch=[];
 const scdp=await context.newCDPSession(page);
 for(const key of keys){
  const target=await page.evaluate(k=>{const s=__game.scene.getScene('Select'),c=s.cards[k];s.strip.x=Math.max(s.stripBase+s.stripMin,Math.min(s.stripBase,s.stripBase+200*s.u-c.x));return {x:(s.strip.x+c.x)/2,y:(s.scale.height-84*s.u)/2};},key);
  await scdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x,y:target.y,id:7,radiusX:5,radiusY:5,force:1}]});
  await scdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(k=>__game.scene.getScene('Select').sel===k,key);selectionTouch.push(key);
 }
 await page.screenshot({path:OUT+WIDTH+'x'+HEIGHT+'-v8-roster-selection.png'});
 const cdp=await context.newCDPSession(page);const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y,id=1])=>({x,y,id,radiusX:5,radiusY:5,force:1}))});
 const tap=async(x,y)=>{await touch('touchStart',[[x,y]]);await touch('touchEnd',[]);};
 await tap(WIDTH-175*UNIT,HEIGHT-84*UNIT);await page.locator('[data-action=start]').tap();await page.waitForFunction(()=>window.__battle?.sys.isActive());
 await page.waitForFunction(()=>window.__hud?.sys.isActive()&&!!__hud.joyHome);
 assert.equal(await page.evaluate(()=>__battle.heroes.length),5);assert.deepEqual(await page.evaluate(()=>Object.keys(__hud.btnDefs)),['atk','s1']);assert.deepEqual(await page.evaluate(()=>__hud.equipmentSlots),['weapon','clothes','shoes']);
 const before=await page.evaluate(()=>__battle.player.x);
 await touch('touchStart',[[180*UNIT,HEIGHT-180*UNIT,1]]);await touch('touchMove',[[270*UNIT,HEIGHT-180*UNIT,1]]);await touch('touchStart',[[270*UNIT,HEIGHT-180*UNIT,1],[WIDTH-155*UNIT,HEIGHT-155*UNIT,2]]);
 await page.waitForFunction(x=>__battle.player.x>x+30,before);
 await page.waitForFunction(()=>__battle.ctrl.atk&&__battle.player.cd.attack>0);
 await touch('touchEnd',[]);await page.waitForFunction(()=>!__battle.ctrl.atk&&__battle.ctrl.mx===0);
 await tap(WIDTH-340*UNIT,HEIGHT-108*UNIT);await page.waitForFunction(()=>__battle.player.cd.skill1>0);
 const report={base:BASE,width:WIDTH,height:HEIGHT,heroes:{},touch:true,selectionTouch};
 for(const key of keys){
  await page.goto(BASE+'?hero='+key+'&god=1',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__battle?.sys.isActive());
  // Isolate the visual/attack fixture from wave AI; it still uses real Battle methods and real assets.
  await page.evaluate(()=>{__battle.phase='break';__battle.breakT=999;__battle.heroes.slice(1).forEach(h=>h.dead=true);__battle.enemies.forEach(e=>e.dead=true);});
  const views=[];
  for(const [mx,my,view] of [[0,1,'front'],[0,-1,'back'],[1,0,'side'],[-1,0,'side']]){
   await page.evaluate(([x,y])=>Object.assign(__battle.ctrl,{mx:x,my:y}),[mx,my]);
   await page.waitForFunction(v=>__battle.player.art.state?.view===v&&__battle.player.art.state.mode==='walk',view);
   views.push(await page.evaluate(()=>__battle.player.art.state));
   const crop=await page.evaluate(()=>{const b=__battle,p=b.worldToScreen(b.player.x,b.player.y),d=Math.min(devicePixelRatio,GAME_CONFIG.maxPixelRatio);return{x:Math.max(0,Math.min(innerWidth-220,p.x/d-110)),y:Math.max(0,Math.min(innerHeight-190,p.y/d-155)),width:220,height:190};});await page.screenshot({path:OUT+'alpha-scene-'+key+'-'+view+'-'+mx+'.png',clip:crop});
   await page.evaluate(()=>Object.assign(__battle.ctrl,{mx:0,my:0}));
  }
  await page.waitForFunction(()=>__battle.player.art.state.mode==='idle');
  const transparency=await page.evaluate(()=>({canvasCorner:Array.from(__battle.player.art.texture.getContext().getImageData(0,0,1,1).data),premultiplied:__game.renderer.gl?.getContextAttributes().premultipliedAlpha}));assert.equal(transparency.canvasCorner[3],0);
  const hit=await page.evaluate(()=>{const b=__battle,p=b.player;p.x=1000;p.y=800;const e=b.makeEnemy('zheng',p.x+65,p.y);e.def={...e.def,speed:0,damage:0};e.hp=10000;window.__hitEnemy=e;window.__hitOld=e.hp;b.doAttack(p,0);return {old:window.__hitOld,weapon:p.weapon};});
  await page.waitForFunction(()=>__hitEnemy.hp<__hitOld);hit.now=await page.evaluate(()=>__hitEnemy.hp);assert(hit.now<hit.old,key+' default-weapon actual hit');
  await page.waitForFunction(()=>__battle.player.art.state.mode==='attack');
  await page.waitForFunction(()=>__battle.player.actionT===0);
  const defaultSkill=await page.evaluate(()=>{const b=__battle,p=b.player;p.hp=p.maxHp-120;const e=__hitEnemy;window.__skillTarget=e;window.__skillEnemyHP=e.hp;window.__skillPlayerHP=p.hp;b.doSkill(p,'skill1',e);return {kind:b.W(p).skill1.kind,weapon:p.weapon};});
  if(defaultSkill.kind==='heal')await page.waitForFunction(()=>__battle.player.hp>__skillPlayerHP);else await page.waitForFunction(()=>__skillTarget.hp<__skillEnemyHP);
  defaultSkill.enemyDelta=await page.evaluate(()=>__skillEnemyHP-__skillTarget.hp);defaultSkill.healDelta=await page.evaluate(()=>__battle.player.hp-__skillPlayerHP);
  await page.waitForFunction(()=>__battle.player.art.state.mode==='cast');
  const swaps=[];
  for(const w of await page.evaluate(()=>GAME_CONFIG.dropWeapons)){
   await page.evaluate(w=>{const b=__battle;b.drops.forEach(d=>d.noPickT=999);b.dropWeapon(w,b.player.x,b.player.y);},w);
   await page.waitForFunction(w=>__battle.player.weapon===w&&__battle.player.art.state.weapon===w&&__hud.labels.s1.text.replace(/\n/g,'')===GAME_CONFIG.weapons[w].skill1.name,w);
   swaps.push(w);
  }
  const skillHit=await page.evaluate(()=>{const b=__battle,p=b.player;p.weapon='sword';b.cancelAction(p);const e=b.makeEnemy('zheng',p.x+65,p.y);e.hp=10000;window.__last=e;window.__lastHP=e.hp;b.doSkill(p,'skill1',e);return{old:e.hp};});await page.waitForFunction(()=>__last.hp<__lastHP);skillHit.now=await page.evaluate(()=>__last.hp);assert(skillHit.now<skillHit.old,key+' delayed skill actual hit');
  await page.waitForFunction(()=>__battle.player.art.state.mode==='cast');
  await page.screenshot({path:OUT+WIDTH+'x'+HEIGHT+'-v8-roster-'+key+'-battle.png'});
  for(const v of views){assert.equal(v.hand.x,v.grip.x);assert.equal(v.hand.y,v.grip.y);assert.equal(v.weaponDepth<v.bodyDepth,v.view==='back');}
  report.heroes[key]={transparency,views:views.map(v=>v.view),swaps,hit,defaultSkill,skillHit};console.log('PASS production hero:',key);
 }
 await page.goto(BASE+'?hero=nezha&wave=4&god=1');await page.waitForFunction(()=>window.__battle?.boss);await page.evaluate(()=>__battle.hurt(__battle.boss,__battle.boss.maxHp*.55,__battle.boss));await page.waitForFunction(()=>__battle.boss.phase===2);await page.evaluate(()=>{const b=__battle;b.player.x=b.boss.x;b.player.y=b.boss.y+210;});
 await page.waitForFunction(()=>__battle.elapsed>5&&__hud.bannerTxt.alpha<.01);await page.screenshot({path:OUT+WIDTH+'x'+HEIGHT+'-v8-roster-boss.png'});report.bossPhase2=true;
 report.fpsBoss=await page.evaluate(()=>Math.round(__game.loop.actualFps));
 await page.goto(BASE+'?hero=erlang&god=1');await page.waitForFunction(()=>window.__battle&&(__battle.elapsed>7||__battle.phase==='reward'));await page.screenshot({path:OUT+WIDTH+'x'+HEIGHT+'-v8-roster-live-battle.png'});report.fpsBattle=await page.evaluate(()=>Math.round(__game.loop.actualFps));report.autonomous=await page.evaluate(()=>({elapsed:__battle.elapsed,phase:__battle.phase}));
 await page.setViewportSize({width:820,height:1180});assert(await page.locator('#rotate').isVisible());
 report.errors=errors;fs.writeFileSync(OUT+WIDTH+'x'+HEIGHT+'-v8-roster-test-report.json',JSON.stringify(report,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
