// v11.2 boss-spawn hitch probe (headless swiftshader; relative numbers only, not iPad timings)
const {chromium}=require('playwright-core'),fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const ctx=await browser.newContext({viewport:{width:1024,height:600},hasTouch:true,isMobile:true});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto((process.argv[2]||'http://127.0.0.1:8787/')+'?hero=wukong');await p.waitForFunction(()=>window.__battle?.run&&__battle.phase==='fight',null,{timeout:90000});
const cdp=await ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:512,y:200}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(2500);
const r=await p.evaluate(async()=>{const b=__battle;b.player.hp=b.player.maxHp=99999;const d=[];let last=performance.now(),on=true;const f=()=>{const n=performance.now();d.push(n-last);last=n;if(on)requestAnimationFrame(f);};requestAnimationFrame(f);
  await new Promise(r=>setTimeout(r,1500));const i0=d.length;const t0=performance.now();b.spawnBoss();const spawnMs=performance.now()-t0;await new Promise(r=>setTimeout(r,3000));on=false;
  const pre=d.slice(5,i0),post=d.slice(i0);const st=a=>({n:a.length,avg:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1),max:+Math.max(...a).toFixed(1),over50:a.filter(x=>x>50).length});
  return{spawnSyncMs:+spawnMs.toFixed(1),pre:st(pre),post:st(post),postFirst10:post.slice(0,10).map(x=>+x.toFixed(0)),prewarmed:window.__bossPrewarm||null};});
console.log(JSON.stringify({...r,errors}));fs.writeFileSync('screens/v11.2/boss-perf-'+(process.argv[3]||'after')+'.json',JSON.stringify({...r,errors},null,1));await browser.close();})();
