/* Original rotating 2.5D mountain island. World XY remains the sole simulation space;
 * ground is affine projected; Z is display-only; actors are upright billboards.
 */
(function(root){
'use strict';
class ArenaView {
 constructor(config,arena){this.config=config;this.arena=arena;this.shear=config.shear;this.ys=config.yScale;this.angle=0;this.targetAngle=0;this.props=[];const r=Math.hypot(arena.width,arena.height)/2;this.ox=config.marginX+r*Math.hypot(1,this.shear);this.oy=config.marginY+r*this.ys;this.width=this.ox*2;this.height=this.oy+r*this.ys+config.bottomMargin;}
 rotateVector(x,y){const c=Math.cos(this.angle),s=Math.sin(this.angle);return{x:c*x-s*y,y:s*x+c*y};}
 project(x,y,z=0){const p=this.rotateVector(x-this.arena.width/2,y-this.arena.height/2);return{x:this.ox+p.x+this.shear*p.y,y:this.oy+p.y*this.ys-z};}
 unproject(x,y,z=0,angle=this.angle){const vy=(y+z-this.oy)/this.ys,vx=x-this.ox-this.shear*vy,c=Math.cos(angle),s=Math.sin(angle);return{x:this.arena.width/2+c*vx+s*vy,y:this.arena.height/2-s*vx+c*vy};}
 vector(x,y){const p=this.rotateVector(x,y);return{x:p.x+this.shear*p.y,y:p.y*this.ys};}
 input(x,y,angle=this.angle){const vy=y/this.ys,vx=x-this.shear*vy,c=Math.cos(angle),s=Math.sin(angle);return{x:c*vx+s*vy,y:-s*vx+c*vy};}
 depth(x,y,offset=0){if(y===undefined){y=x;x=this.arena.width/2;}return 2000+this.rotateVector(x-this.arena.width/2,y-this.arena.height/2).y+(offset||0);}
 turn(sign){this.targetAngle+=sign*(this.config.rotateStep||Math.PI/4);}
 setAffine(container,inner,a,b,c,d){const beta=.5*Math.atan2(2*(a*b+c*d),a*a+c*c-b*b-d*d),co=Math.cos(beta),si=Math.sin(beta),u=a*co+b*si,v=c*co+d*si,s1=Math.hypot(u,v)||1,s2=(a*d-b*c)/s1;container.setRotation(Math.atan2(v,u)).setScale(s1,s2);inner.setRotation(-beta);}
 circle(x,y,rx,ry=rx,steps=48){return Array.from({length:steps},(_,i)=>{const a=i/steps*Math.PI*2;return this.project(x+Math.cos(a)*rx,y+Math.sin(a)*ry);});}
 sector(x,y,r,a,arc,steps=32){const p=[this.project(x,y)];for(let i=0;i<=steps;i++)p.push(this.project(x+Math.cos(a-arc/2+arc*i/steps)*r,y+Math.sin(a-arc/2+arc*i/steps)*r));return p;}
 groundShape(g,points,fill=true,stroke=true){if(fill)g.fillPoints(points,true);if(stroke)g.strokePoints(points,true);}
 /* v10 水墨：把原创石台/崖壁像素映射到"宣纸—墨"色阶，并叠加确定性的晕染墨团；仍是同一张原创底图，非外部素材。 */
 inkify(cv,amount=.85,seed=77){const c=cv.getContext('2d',{willReadFrequently:true}),img=c.getImageData(0,0,cv.width,cv.height),d=img.data,ink=[24,26,25],paper=[214,205,183];for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const l=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)/255,t=Math.pow(Math.min(1,l*1.55),1.15);for(let k=0;k<3;k++)d[i+k]=d[i+k]*(1-amount)+(ink[k]+(paper[k]-ink[k])*t)*amount;}c.putImageData(img,0,0);let r=seed;const rnd=()=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296;};c.save();c.globalCompositeOperation='source-atop';for(let i=0;i<46;i++){const x=rnd()*cv.width,y=rnd()*cv.height,R=40+rnd()*170,g=c.createRadialGradient(x,y,0,x,y,R);g.addColorStop(0,`rgba(16,18,17,${.10+rnd()*.16})`);g.addColorStop(1,'rgba(16,18,17,0)');c.fillStyle=g;c.fillRect(x-R,y-R,R*2,R*2);}c.restore();}
 build(scene){
  this.scene=scene;const W=this.arena.width,H=this.arena.height,src=scene.textures.get('mountain-top').getSourceImage();
  this.far=scene.add.image(0,0,'mountain-far').setScrollFactor(0).setDepth(-20000).setTint(this.config.inkWash?0xd6d0c0:0xb8c5bf);if(this.config.inkWash)this.far.postFX?.addColorMatrix().grayscale(.85);
  this.mid=scene.add.image(0,0,'mountain-mid').setScrollFactor(0).setDepth(-19000).setAlpha(.72);
  const R=this.config.islandRadius,cx=W/2,cy=H/2;
  const edge=this.edge=Array.from({length:64},(_,i)=>({x:cx+Math.cos(i/64*Math.PI*2)*R,y:cy+Math.sin(i/64*Math.PI*2)*R}));
  const cv=document.createElement('canvas');cv.width=W+40;cv.height=H+40;const c=cv.getContext('2d');c.translate(20,20);c.beginPath();edge.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.save();c.clip();c.fillStyle='#333f39';c.fillRect(-20,-20,W+40,H+40);
  let seed=9317;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // Small, individually clipped top-down stones: no giant directional slab bands.
  const seeds=[];for(let row=-1;row<19;row++)for(let col=-1;col<17;col++)seeds.push({x:col*94+(row%2?47:0)+(rnd()-.5)*48,y:row*82+(rnd()-.5)*44});
  const clip=(poly,nx,ny,k)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=nx*a.x+ny*a.y-k,db=nx*b.x+ny*b.y-k;if(da<=0)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}return out;};
  for(const p of seeds){let poly=[{x:-30,y:-30},{x:W+30,y:-30},{x:W+30,y:H+30},{x:-30,y:H+30}];for(const n of seeds){const dx=n.x-p.x,dy=n.y-p.y;if(n===p||dx*dx+dy*dy>245*245)continue;poly=clip(poly,dx,dy,(n.x*n.x+n.y*n.y-p.x*p.x-p.y*p.y)/2);if(!poly.length)break;}if(!poly.length)continue;c.save();c.beginPath();poly.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.clip();c.fillStyle=['#687063','#59675f','#727561','#52625a'][Math.floor(rnd()*4)];c.fillRect(p.x-160,p.y-160,320,320);c.globalAlpha=.48;c.translate(p.x,p.y);c.rotate(rnd()*Math.PI*2);c.drawImage(src,rnd()*800,rnd()*800,150,150,-160,-160,320,320);c.restore();c.strokeStyle=this.config.inkWash?'rgba(33,40,36,.55)':'#21322a';c.lineWidth=this.config.inkWash?1.6:2.7;c.stroke();}
  // Level circles remain horizontal ellipses at every yaw, giving an unambiguous ground reference.
  for(const r of (this.config.inkWash?[665]:[115,260,470,665])){c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.strokeStyle=r===665?'#0f1c17':'rgba(190,164,105,.44)';c.lineWidth=r===665?7:3;c.stroke();}
  c.restore();c.lineWidth=9;c.strokeStyle='#111d18';c.beginPath();edge.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();if(this.config.inkWash)this.inkify(cv,.82,9317);scene.textures.addCanvas('island-top',cv);
  this.floorRoot=scene.add.container(this.ox,this.oy).setDepth(-8000);this.floorTurn=scene.add.container();this.floorRoot.add(this.floorTurn);this.floorTurn.add(scene.add.image(0,0,'island-top').setDisplaySize(W+40,H+40));this.setAffine(this.floorRoot,this.floorTurn,1,this.shear,0,this.ys);this.floorBase=this.floorTurn.rotation;
  const cliff=document.createElement('canvas');cliff.width=512;cliff.height=256;const cc=cliff.getContext('2d');cc.save();cc.translate(256,128);cc.rotate(Math.PI/2);cc.drawImage(src,70,80,420,600,-128,-256,256,512);cc.restore();cc.fillStyle='rgba(12,22,23,.55)';cc.fillRect(0,0,512,256);cc.strokeStyle='#0c1618';cc.lineWidth=5;for(let i=0;i<12;i++){const x=i*47;cc.beginPath();cc.moveTo(x,0);cc.lineTo(x-19,70);cc.lineTo(x+9,145);cc.lineTo(x-24,256);cc.stroke();}if(this.config.inkWash)this.inkify(cliff,.8,51);scene.textures.addCanvas('island-cliff',cliff);
  this.faces=edge.map((a,i)=>{const b=edge[(i+1)%edge.length],L=Math.hypot(b.x-a.x,b.y-a.y),root=scene.add.container().setDepth(-8100),inner=scene.add.container();root.add(inner);const image=scene.add.image(0,0,'island-cliff').setOrigin(0).setDisplaySize(L,this.config.cliffHeight);inner.add(image);return{a,b,L,root,inner};});
  const fog=document.createElement('canvas');fog.width=768;fog.height=192;const fc=fog.getContext('2d');fc.drawImage(scene.textures.get('mountain-mid').getSourceImage(),0,650,1536,214,0,0,768,192);fc.globalCompositeOperation='destination-in';const fg=fc.createLinearGradient(0,0,0,192);fg.addColorStop(0,'transparent');fg.addColorStop(.45,'#fff');fg.addColorStop(1,'#fff');fc.fillStyle=fg;fc.fillRect(0,0,768,192);const fx=fc.createLinearGradient(0,0,768,0);fx.addColorStop(0,'transparent');fx.addColorStop(.18,'#fff');fx.addColorStop(.82,'#fff');fx.addColorStop(1,'transparent');fc.fillStyle=fx;fc.fillRect(0,0,768,192);scene.textures.addCanvas('island-near-cloud',fog);this.clouds=[-1,0,1].map((i)=>scene.add.image(0,0,'island-near-cloud').setScrollFactor(0).setDepth(849999).setAlpha(this.config.parallax.nearAlpha).setFlipX(i!==0));
  this.rim=scene.add.graphics().setDepth(-7990);this.near=scene.add.graphics().setDepth(850000).setScrollFactor(0);
  const defs=[];for(let i=0;i<10;i++){const a=i*Math.PI/5,r=690;defs.push([i%3===0?'column':i%3===1?'lamp':'broken',cx+Math.cos(a)*r,cy+Math.sin(a)*r,i%3===0?135:110]);}defs.push(['tree',cx-735,cy,175],['tree',cx+735,cy,170],['rock',cx-260,cy-230,55],['rock',cx+270,cy-210,55],['broken',cx,cy-700,95]);defs.forEach(([k,x,y,h],i)=>{if(this.config.inkWash&&k!=='tree')return;this.makeProp(scene,k,x,y,h,i);});
  scene.events.once('shutdown',()=>{for(const k of ['island-top','island-cliff','island-near-cloud'])scene.textures.remove(k);this.props.forEach(p=>scene.textures.remove(p.key));});this.update(0);
 }
 update(dt){const scene=this.scene;if(!scene)return;const oldAngle=this.angle,d=this.targetAngle-this.angle;if(Math.abs(d)>.00001)this.angle+=d*Math.min(1,dt/(this.config.rotateSmooth||.14));else this.angle=this.targetAngle;this.floorTurn.rotation=this.floorBase+this.angle;if(Math.abs(this.angle-oldAngle)>1e-7){for(const em of [scene.pInk,scene.pFire,scene.pMoon,scene.pWater,scene.pTrail])em?.forEachAlive(p=>{const w=this.unproject(p.x,p.y,p.worldZ||0,oldAngle),q=this.project(w.x,w.y,p.worldZ||0),v=this.input(p.velocityX,p.velocityY,oldAngle),n=this.vector(v.x,v.y);p.x=q.x;p.y=q.y;p.velocityX=n.x;p.velocityY=n.y;});}
  const cam=scene.cameras.main,W=scene.scale.width,H=scene.scale.height,z=cam.zoom||1,t=scene.time.now/1000,P=this.config.parallax,focus=scene.player||{x:this.arena.width/2,y:this.arena.height/2},focusView=this.vector(focus.x-this.arena.width/2,focus.y-this.arena.height/2);
  for(const [im,factor,overscan,yaw]of [[this.far,P.far,P.farOverscan,P.farYaw],[this.mid,P.mid,P.midOverscan,P.midYaw]]){const cover=Math.max(W/im.width,H/im.height)*overscan/z,dx=Math.sin(this.angle)*W*yaw-focusView.x*factor,dy=Math.cos(this.angle)*H*yaw*.2-focusView.y*factor*.35;im.setScale(cover).setPosition(W/2+dx/z,H/2+dy/z);}
  for(const f of this.faces){const a=this.project(f.a.x,f.a.y),b=this.project(f.b.x,f.b.y),v=this.rotateVector(f.b.y-f.a.y,-(f.b.x-f.a.x));f.root.setVisible(v.y>0);if(v.y<=0)continue;f.root.setPosition(a.x,a.y);this.setAffine(f.root,f.inner,(b.x-a.x)/f.L,0,(b.y-a.y)/f.L,1);}
  const g=this.rim;g.clear().lineStyle(7,0x111a1b,.9);this.groundShape(g,this.edge.map(p=>this.project(p.x,p.y)),false,true);
  for(const p of this.props){const q=this.project(p.x,p.y);p.image.setPosition(q.x,q.y).setDepth(this.depth(p.x,p.y));p.depth=p.image.depth;}
  // Feathered mirrored reuse of the delivered mid cloud, plus independently drifting procedural mist.
  for(let i=0;i<this.clouds.length;i++){const shift=Math.sin(this.angle)*W*P.nearYaw-focusView.x*P.near+Math.sin(t*P.cloudSpeed+i*.6)*P.cloudDrift;this.clouds[i].setDisplaySize(W*.9/z,H*.24/z).setPosition(W/2+((i-1)*W*.68+shift)/z,H/2+(H*.99-H/2-focusView.y*P.near*.35+Math.cos(this.angle)*H*P.nearYaw*.2+Math.sin(t*.12+i)*8)/z);}
  const ng=this.near;ng.clear();for(let i=0;i<7;i++){const x=(i/6*W+Math.sin(t*.09+i)*25+Math.sin(this.angle)*W*P.nearYaw-focusView.x*P.near),y=H+16-focusView.y*P.near*.35+Math.sin(t*.13+i)*9;ng.fillStyle(0xb4c1b8,.028).fillEllipse(W/2+(x-W/2)/z,H/2+(y-H/2)/z,260/z,90/z);}const display=im=>{const w=im.displayWidth*z,h=im.displayHeight*z,x=W/2+(im.x-W/2)*z,y=H/2+(im.y-H/2)*z;return{left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};};this.parallaxState={coverage:display(this.far),near:this.clouds.map(c=>({x:c.x,y:c.y})),far:{x:this.far.x,y:this.far.y},mid:{x:this.mid.x,y:this.mid.y},angle:this.angle};
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
  // Borrow stone ink as surface material, retaining the original silhouette and height.
  const surface=scene.textures.get('mountain-top').getSourceImage(),mask=document.createElement('canvas');mask.width=w;mask.height=h;mask.getContext('2d').drawImage(cv,0,0);c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.7;c.drawImage(surface,(id*67)%450,(id*93)%450,500,500,0,0,w,h);c.globalCompositeOperation='destination-in';c.globalAlpha=1;c.drawImage(mask,0,0);c.restore();
  const key='courtyard-prop-'+id;scene.textures.addCanvas(key,cv);const foot=this.project(x,y);const image=scene.add.image(foot.x,foot.y,key).setOrigin(.5,base/h).setScale(this.config.propScale).setDepth(this.depth(x,y));this.props.push({kind,x,y,height:height*this.config.propScale,key,image,depth:this.depth(x,y)});
 }
}
root.ArenaView=ArenaView;if(typeof module!=='undefined'&&module.exports)module.exports=ArenaView;
})(typeof window!=='undefined'?window:globalThis);
