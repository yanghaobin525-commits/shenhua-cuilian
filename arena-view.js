/* Original 2.5D seal courtyard. World XY remains the sole simulation space;
 * ground is affine projected; Z is display-only; actors are upright billboards.
 */
(function(root){
'use strict';
class ArenaView {
 constructor(config,arena){this.config=config;this.arena=arena;this.shear=config.shear;this.ys=config.yScale;this.ox=config.marginX;this.oy=config.marginY;this.width=arena.width+Math.abs(this.shear)*arena.height+this.ox*2;this.height=arena.height*this.ys+this.oy+config.bottomMargin;this.props=[];}
 project(x,y,z=0){return {x:this.ox+x+this.shear*y,y:this.oy+y*this.ys-z};}
 unproject(x,y,z=0){const wy=(y+z-this.oy)/this.ys;return {x:x-this.ox-this.shear*wy,y:wy};}
 vector(x,y){return {x:x+this.shear*y,y:y*this.ys};}
 input(x,y){return {x:x-this.shear*y/this.ys,y:y/this.ys};}
 depth(y,offset=0){return 10+y+offset;}
 circle(x,y,rx,ry=rx,steps=48){return Array.from({length:steps},(_,i)=>{const a=i/steps*Math.PI*2;return this.project(x+Math.cos(a)*rx,y+Math.sin(a)*ry);});}
 sector(x,y,r,a,arc,steps=32){const p=[this.project(x,y)];for(let i=0;i<=steps;i++)p.push(this.project(x+Math.cos(a-arc/2+arc*i/steps)*r,y+Math.sin(a-arc/2+arc*i/steps)*r));return p;}
 groundShape(g,points,fill=true,stroke=true){if(fill)g.fillPoints(points,true);if(stroke)g.strokePoints(points,true);}
 build(scene){
  const {width:W,height:H}=this.arena,cv=document.createElement('canvas');cv.width=Math.ceil(this.width);cv.height=Math.ceil(this.height);const c=cv.getContext('2d');
  const rand=(()=>{let s=84371;return()=>{s=(Math.imul(s,1664525)+1013904223)|0;return(s>>>0)/4294967296;};})();
  const poly=(p,fill,stroke='#191c1a',lw=3)=>{c.beginPath();p.forEach((v,i)=>(i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y)));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke();}};
  const p=(x,y,z=0)=>this.project(x,y,z);
  let bg=c.createLinearGradient(0,0,0,cv.height);bg.addColorStop(0,'#162327');bg.addColorStop(.6,'#25292a');bg.addColorStop(1,'#151c1c');c.fillStyle=bg;c.fillRect(0,0,cv.width,cv.height);
  // Platform's visible vertical front and right faces, not a flattened picture.
  poly([p(0,H),p(W,H),p(W,H,-70),p(0,H,-70)],'#323c3b','#101716',5);
  poly([p(W,0),p(W,H),p(W,H,-70),p(W,0,-70)],'#253332','#101716',5);
  for(let x=0;x<W;x+=160){c.beginPath();c.moveTo(p(x,H).x,p(x,H).y);c.lineTo(p(x,H,-70).x,p(x,H,-70).y);c.strokeStyle='#111c1c';c.lineWidth=3;c.stroke();}
  poly([p(0,0),p(W,0),p(W,H),p(0,H)],'#62645a','#121c1b',8);
  c.save();c.beginPath();[p(0,0),p(W,0),p(W,H),p(0,H)].forEach((v,i)=>(i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y)));c.closePath();c.clip();c.setTransform(1,0,this.shear,this.ys,this.ox,this.oy);
  // Individually irregular stone slabs, oriented on the world plane.
  const colors=['#676b60','#727366','#5a635c','#7b7a68','#60685f','#6c7165'];
  for(let row=0,y=-30;y<H+80;y+=165,row++)for(let col=-1,x=(row%2)*94-170;x<W+80;x+=188,col++){
   const j=()=>rand()*12-6;
   const pts=[{x:x+7+j(),y:y+5+j()},{x:x+179+j(),y:y+8+j()},{x:x+184+j(),y:y+150+j()},{x:x+8+j(),y:y+158+j()}];poly(pts,colors[(rand()*colors.length)|0],'#303c36',4);
   c.strokeStyle='#a0a18a';c.globalAlpha=.4;c.lineWidth=2;c.beginPath();c.moveTo(x+18,y+19);c.lineTo(x+159,y+21+j());c.stroke();c.globalAlpha=1;
   if(rand()>.43){c.beginPath();c.moveTo(x+28,y+151);c.lineTo(x+60,y+107);c.lineTo(x+53,y+77);c.lineTo(x+74,y+49);c.strokeStyle='#3b4840';c.lineWidth=2;c.stroke();}
   for(let k=0;k<3;k++){c.fillStyle='#384b3e';c.globalAlpha=.28;c.beginPath();c.ellipse(x+rand()*180,y+rand()*150,4+rand()*14,2+rand()*6,rand()*3,0,Math.PI*2);c.fill();c.globalAlpha=1;}
  }
  // Cinnabar binding seal with worn stone inlay; no copied commercial texture.
  c.translate(W/2,H/2);for(const r of [370,350,300]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.strokeStyle=r===350?'#b39967':'#514840';c.lineWidth=r===350?7:5;c.stroke();}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;c.save();c.rotate(a);c.strokeStyle='#7b342b';c.lineWidth=7;c.beginPath();c.moveTo(309,-22);c.lineTo(334,-22);c.lineTo(334,15);c.lineTo(316,15);c.lineTo(316,3);c.lineTo(342,3);c.stroke();c.restore();}
  c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/8;const x=Math.cos(a)*265,y=Math.sin(a)*265;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.strokeStyle='#773c32';c.lineWidth=9;c.stroke();
  c.beginPath();c.arc(0,0,138,0,Math.PI*2);c.fillStyle='#4c5951';c.fill();c.lineWidth=6;c.strokeStyle='#a38e65';c.stroke();
  c.strokeStyle='#ad7752';c.lineWidth=8;for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.beginPath();c.moveTo(-48,-26);c.lineTo(12,-26);c.lineTo(12,-83);c.lineTo(60,-83);c.moveTo(-48,5);c.lineTo(-48,49);c.lineTo(7,49);c.stroke();c.restore();}
  c.restore();
  // Edge inlay and ground shadows of the freestanding structures.
  for(const yy of [25,H-28]){c.beginPath();c.moveTo(p(25,yy).x,p(25,yy).y);c.lineTo(p(W-25,yy).x,p(W-25,yy).y);c.strokeStyle='#ae9e77';c.lineWidth=3;c.stroke();}
  scene.textures.addCanvas('courtyard-floor',cv);scene.add.image(0,0,'courtyard-floor').setOrigin(0).setDepth(-10000);
  const definitions=[
   ['gate',1000,-20,275],['column',210,0,190],['column',1790,0,190],
   ['lamp',35,300,145],['lamp',1965,300,145],['tree',-35,720,260],['tree',2035,740,240],
   ['broken',35,990,115],['column',1965,1050,190],['column',230,1430,205],['column',1770,1430,205],
   ['lamp',660,1450,150],['lamp',1350,1450,150],['rock',80,1300,75],['rock',1910,1300,80]
  ];
  for(let i=0;i<definitions.length;i++){const [kind,x,y,h]=definitions[i];this.makeProp(scene,kind,x,y,h,i);}
  scene.events.once('shutdown',()=>{scene.textures.remove('courtyard-floor');this.props.forEach(v=>scene.textures.remove(v.key));});
 }
 makeProp(scene,kind,x,y,height,id){
  const w=kind==='gate'?480:kind==='tree'?320:210,h=kind==='gate'?380:360,cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),cx=w/2,base=h-35;
  const pt=(a,b,z=0)=>({x:cx+a+this.shear*b,y:base+b*this.ys-z});
  const path=(arr,fill,ink='#141d1b',lw=4)=>{c.beginPath();arr.forEach((v,i)=>(i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y)));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(ink){c.strokeStyle=ink;c.lineWidth=lw;c.lineJoin='round';c.stroke();}};
  const box=(a,b,z,bw,bd,bh,col)=>{const A=pt(a-bw/2,b-bd/2,z),B=pt(a+bw/2,b-bd/2,z),D=pt(a-bw/2,b+bd/2,z),E=pt(a+bw/2,b+bd/2,z),at=pt(a-bw/2,b-bd/2,z+bh),bt=pt(a+bw/2,b-bd/2,z+bh),dt=pt(a-bw/2,b+bd/2,z+bh),et=pt(a+bw/2,b+bd/2,z+bh);path([D,E,et,dt],col);path([B,E,et,bt],'#354945');path([at,bt,et,dt],'#8b9280');return {A,B,D,E,at,bt,dt,et};};
  c.fillStyle='rgba(6,15,13,.38)';c.beginPath();c.ellipse(cx+20,base+8,w*.32,23,-.12,0,Math.PI*2);c.fill();
  if(kind==='tree'){
   const branches=[[[0,0],[5,-82],[-15,-149],[10,-height]],[[-5,-105],[-74,-147],[-108,-201]],[[-57,-139],[-116,-137],[-145,-157]],[[-9,-150],[69,-171],[106,-226]],[[63,-171],[94,-157],[142,-181]],[[6,-214],[-35,-235],[-47,-height-10]]];
   branches.forEach((a,i)=>{c.beginPath();a.forEach(([xx,yy],j)=>(j?c.lineTo(cx+xx,base+yy):c.moveTo(cx+xx,base+yy)));c.strokeStyle='#111b1a';c.lineWidth=i?12:28;c.lineCap='round';c.stroke();c.strokeStyle='#66594a';c.lineWidth=i?5:17;c.stroke();});
   for(const k of [-1,1])path([pt(-13,0),pt(k*66,19),pt(k*31,-7),pt(7,0)],'#504d40');
  }else if(kind==='gate'){
   for(const k of [-1,1]){box(k*168,0,0,74,75,height-40,'#596e64');box(k*168,0,height-40,105,100,25,'#6e7662');}
   box(0,0,height-34,450,86,31,'#654632');box(0,0,height+1,480,112,19,'#6e5b40');
   for(let k=-2;k<=2;k++){const pp=pt(k*46,-3,height-63);c.fillStyle='#aa8a51';c.fillRect(pp.x-9,pp.y,18,22);}
   for(const k of [-1,1]){const a=pt(k*105,0,height-35);path([{x:a.x-14,y:a.y},{x:a.x+18,y:a.y},{x:a.x+14,y:a.y+132},{x:a.x,y:a.y+115},{x:a.x-20,y:a.y+134}],'#783d31');c.strokeStyle='#b59b63';c.lineWidth=2;c.strokeRect(a.x-6,a.y+16,11,79);}
  }else{
   box(0,0,0,103,79,22,'#65766a');
   const ph=kind==='rock'?height*.55:kind==='broken'?height*.6:height-45;
   box(0,0,22,kind==='rock'?94:55,kind==='rock'?72:51,ph,kind==='lamp'?'#697568':'#526e66');
   if(kind!=='rock'){box(0,0,ph+22,85,73,13,'#778276');const a=pt(-9,28,ph-10);c.strokeStyle='#c5aa72';c.lineWidth=3;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x+21,a.y+5);c.lineTo(a.x+21,a.y+41);c.lineTo(a.x+8,a.y+42);c.lineTo(a.x+8,a.y+25);c.lineTo(a.x+29,a.y+25);c.stroke();}
   if(kind==='lamp'){box(0,0,ph+35,62,47,32,'#2c3028');const a=pt(0,23,ph+47);c.fillStyle='#e3a755';c.fillRect(a.x-10,a.y-9,20,13);box(0,0,ph+67,86,73,8,'#7a6b4b');}
   // Broken edges, form-following ink chips; not random global noise.
   c.strokeStyle='#243a34';c.lineWidth=2;c.beginPath();const a=pt(-17,28,Math.min(ph,95));c.moveTo(a.x,a.y);c.lineTo(a.x+13,a.y+25);c.lineTo(a.x+7,a.y+47);c.lineTo(a.x+21,a.y+62);c.stroke();
  }
  const key='courtyard-prop-'+id;scene.textures.addCanvas(key,cv);const foot=this.project(x,y);const image=scene.add.image(foot.x,foot.y,key).setOrigin(.5,base/h).setDepth(this.depth(y));this.props.push({kind,x,y,height,key,image,depth:this.depth(y)});
 }
}
root.ArenaView=ArenaView;if(typeof module!=='undefined'&&module.exports)module.exports=ArenaView;
})(typeof window!=='undefined'?window:globalThis);
