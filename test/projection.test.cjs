const assert=require('node:assert/strict'),ArenaView=require('../arena-view.js'),fs=require('fs'),vm=require('vm');const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('config.js','utf8'),sandbox);const C=sandbox.window.GAME_CONFIG,V=new ArenaView(C.view25d,C.arena),near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(let i=0;i<10000;i++){const x=(i*173.7)%2000,y=(i*91.3)%1400,z=(i*7.1)%300,p=V.project(x,y,z),q=V.unproject(p.x,p.y,z);near(x,q.x);near(y,q.y);}
for(const [x,y]of [[1,0],[0,1],[-1,0],[0,-1],[.5,.8],[-.7,-.3]]){const w=V.input(x,y),p=V.vector(w.x,w.y);near(x,p.x);near(y,p.y);}
const ring=V.circle(1000,700,200);for(let i=0;i<ring.length;i++){const q=V.unproject(ring[i].x,ring[i].y);near(Math.hypot(q.x-1000,q.y-700),200);}
let area=0;ring.forEach((p,i)=>{const q=ring[(i+1)%ring.length];area+=p.x*q.y-q.x*p.y;});assert(Math.abs(Math.abs(area/2)/(Math.PI*200**2)-C.view25d.yScale)<.003);
const top=V.project(1000,700,200),foot=V.project(1000,700);near(foot.y-top.y,200);near(foot.x,top.x);assert(V.depth(899)<V.depth(900));assert(V.depth(901)>V.depth(900));
console.log('PASS: 10,000 affine/Z inverse transforms; six inverse control directions; projected-circle plane/area; full-height billboard Z; world-foot depth ordering. Numerical tests, not visual approval.');
