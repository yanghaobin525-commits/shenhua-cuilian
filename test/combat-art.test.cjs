// Mocked renderer contract only. No browser/assets/visual approval implied.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const sandbox={window:{},console};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('config.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('combat-art.js','utf8'),sandbox);
const C=sandbox.window.GAME_CONFIG,Art=sandbox.window.CombatArt;
assert.equal(Object.keys(C.heroes).length,8);assert.equal(C.teamSize,5);
assert.deepEqual(Object.keys(C.weaponArt).sort(),Array.from(C.dropWeapons).sort());
for(const h of Object.values(C.heroes)){assert(C.weaponArt[h.weapon]);assert(C.weapons[h.weapon].skill1);}
let draws=0;
const ctx=new Proxy({}, {get:(_,k)=>(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),k);if(k==='drawImage')draws++;}});
const image=()=>new Proxy({alpha:1,depth:0,x:0,y:0}, {get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='setDepth')o.depth=a[0];if(k==='setPosition'){o.x=a[0];o.y=a[1];}if(k==='setAlpha')o.alpha=a[0];return new Proxy(o,{get:(oo,kk)=>kk in oo?oo[kk]:(...aa)=>{if(kk==='setDepth')oo.depth=aa[0];if(kk==='setPosition'){oo.x=aa[0];oo.y=aa[1];}return imageChain(oo);}});}});
function imageChain(o){return new Proxy(o,{get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='setDepth')o.depth=a[0];if(k==='setPosition'){o.x=a[0];o.y=a[1];}if(k==='setAlpha')o.alpha=a[0];return imageChain(o);}});}
const scene={cache:{json:{get:()=>({handAnchor:{x:.3,y:.55},weapon:{grip:{x:.5,y:.7}}})}},textures:{createCanvas:()=>({getContext:()=>ctx,refresh(){}}),get:()=>({getSourceImage:()=>({width:512,height:512})}),remove(){}},add:{image:()=>imageChain({alpha:1,depth:0,x:0,y:0})},events:{once(){}},time:{now:1}};
for(const key of Object.keys(C.heroes)){
 const h={key,isPlayer:true,def:C.heroes[key],weapon:C.heroes[key].weapon,spr:imageChain({alpha:1}),x:100,y:100,t:1,faceAng:Math.PI/2,moving:false};
 const art=new Art(scene,h);
 for(const [angle,view] of [[Math.PI/2,'front'],[-Math.PI/2,'back'],[0,'side'],[Math.PI,'side']]){
  h.faceAng=angle;h.t+=.1;art.update(.1);assert.equal(art.state.view,view);assert.equal(art.state.mode,'idle');assert.equal(art.state.hand.x,art.state.grip.x);assert.equal(art.state.hand.y,art.state.grip.y);assert.equal(art.state.weaponDepth<art.state.bodyDepth,view==='back');
 }
 h.moving=true;h.t+=.1;art.update(.1);assert.equal(art.state.mode,'walk');
 for(const action of ['attack','cast']){h.action=action;h.actionDuration=.6;h.actionT=.3;h.t+=.1;art.update(.1);assert.equal(art.state.mode,action);}
 for(const w of C.dropWeapons){h.weapon=w;h.t+=.1;art.update(.1);assert.equal(art.state.weapon,w);}
}
assert(draws>5000);console.log('PASS: mocked eight-hero config, 3 directions + side mirror, idle/walk/attack/cast modes, eight weapon swaps, exact grip match and rear occlusion. NOT an actual-art or browser/visual test.');
