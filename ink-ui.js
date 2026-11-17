/* 手绘游丝风 UI / 笔痕工具（全部代码生成，原创）。
   - Phaser Graphics：inkRect / inkCircle / inkBar / hatch / brushStroke（毛笔笔痕：起笔顿压、中段飞白干笔丝、收笔出锋、墨晕）。
   - Phaser 文字：calli()——草书字体 + 粗描边 + 墨晕阴影 + 飞白（destination-out 干笔擦痕）+ 笔划揭示动画。
   种子固定，逐帧重绘不会"抖动闪烁"。 */
(function(root){'use strict';
const C=root.GAME_CONFIG;
function rng(seed){let a=(seed|0)||0x9e3779b9;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const INK=0x120c09,GOLD=0xc9a85a,RED=0x7e2418;
// 一条手绘抖线：密化 + 低频法向抖动，两端轻微出头
function wobble(x1,y1,x2,y2,jit,R,over=0){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux,n=Math.max(3,Math.ceil(L/10)),o1=(R()-.5)*over,o2=(R()-.3)*over,ph=R()*6.28,ph2=R()*6.28,pts=[];
  for(let i=0;i<=n;i++){const t=i/n,s=-o1+(L+o1+o2)*t,j=(Math.sin(t*3.1+ph)*.6+Math.sin(t*7.3+ph2)*.4)*jit;pts.push({x:x1+ux*s+nx*j,y:y1+uy*s+ny*j});}return pts;}
function strokePts(g,pts,w,color,alpha){g.lineStyle(w,color,alpha);g.strokePoints(pts,false);}
// 线段复描：粗墨线 + 细丝复描 1–2 遍
function inkLine(g,x1,y1,x2,y2,o={}){const R=o.R||rng(o.seed||7),u=o.u||1,w=(o.w||3)*u,passes=o.passes??3,jit=(o.jit??1.6)*u;
  strokePts(g,wobble(x1,y1,x2,y2,jit,R,(o.over??6)*u),w,o.color??INK,o.alpha??1);
  for(let p=1;p<passes;p++)strokePts(g,wobble(x1+(R()-.5)*2*u,y1+(R()-.5)*2*u,x2+(R()-.5)*2*u,y2+(R()-.5)*2*u,jit*1.3,R,(o.over??6)*u*1.4),Math.max(1,w*(.28+R()*.2)),p===passes-1&&o.accent!=null?o.accent:(o.color??INK),(o.alpha??1)*(.55+R()*.35));}
// 线段裁剪到矩形（Liang–Barsky）
function clip(x0,y0,x1,y1,rx,ry,rw,rh){let t0=0,t1=1;const dx=x1-x0,dy=y1-y0,p=[-dx,dx,-dy,dy],q=[x0-rx,rx+rw-x0,y0-ry,ry+rh-y0];for(let i=0;i<4;i++){if(p[i]===0){if(q[i]<0)return null;}else{const r=q[i]/p[i];if(p[i]<0){if(r>t1)return null;if(r>t0)t0=r;}else{if(r<t0)return null;if(r<t1)t1=r;}}}return[x0+t0*dx,y0+t0*dy,x0+t1*dx,y0+t1*dy];}
// 交叉排线（矩形内），可只排一角/一边
function hatch(g,x,y,w,h,o={}){const R=o.R||rng(o.seed||3),u=o.u||1,sp=(o.spacing||7)*u,a=o.angle??.85,ca=Math.cos(a),sa=Math.sin(a),D=Math.hypot(w,h),cx=x+w/2,cy=y+h/2;g.lineStyle((o.w||1)*u,o.color??INK,o.alpha??.35);
  for(let d=-D/2;d<=D/2;d+=sp*(.8+R()*.4)){if(o.edge&&Math.abs(d)<D/2*(1-o.edge))continue;const px=cx-sa*d,py=cy+ca*d,s=clip(px-ca*D,py-sa*D,px+ca*D,py+sa*D,x,y,w,h);if(!s)continue;const k=.1+R()*.25,e=.05+R()*.2;g.lineBetween(s[0]+(s[2]-s[0])*k,s[1]+(s[3]-s[1])*k,s[2]-(s[2]-s[0])*e,s[3]-(s[3]-s[1])*e);}
  if(o.cross){hatch(g,x,y,w,h,{...o,cross:false,angle:a+1.35,alpha:(o.alpha??.35)*.7,spacing:(o.spacing||7)*1.4,seed:(o.seed||3)+11});}}
// 手绘框：暗底（非圆角矢量），四边独立抖线出头，复描，边带排线，可选金/暗红细丝
function inkRect(g,x,y,w,h,o={}){const R=rng(o.seed||(x*13+y*7+w)|0),u=o.u||1;
  if(o.fill!=null){const j=2*u,pts=[{x:x+R()*j,y:y+R()*j},{x:x+w-R()*j,y:y+R()*j},{x:x+w-R()*j,y:y+h-R()*j},{x:x+R()*j,y:y+h-R()*j}];g.fillStyle(o.fill,o.fillAlpha??.8);g.fillPoints(pts,true);}
  if(o.hatch!==false)hatch(g,x+3*u,y+3*u,w-6*u,h-6*u,{R,u,spacing:o.hatchSpacing||6,alpha:o.hatchAlpha??.28,color:o.hatchColor??0x000000,edge:o.hatchEdge??.32,cross:o.cross??true});
  const lw=o.w||3.2,acc=o.accent??GOLD;
  inkLine(g,x,y,x+w,y,{R,u,w:lw,accent:acc,color:o.color});inkLine(g,x+w,y,x+w,y+h,{R,u,w:lw*.9,accent:acc,color:o.color});inkLine(g,x+w,y+h,x,y+h,{R,u,w:lw*1.15,accent:acc,color:o.color});inkLine(g,x,y+h,x,y,{R,u,w:lw,accent:acc,color:o.color});
  if(o.inner!==false){const m=5*u;g.lineStyle(1.1*u,acc,.55);g.strokePoints(wobble(x+m,y+m,x+w-m,y+m,1.2*u,R,3*u),false);g.strokePoints(wobble(x+m,y+h-m,x+w-m,y+h-m,1.2*u,R,3*u),false);}}
// 手绘圆：多遍不闭合抖圈 + 一侧月牙排线
function inkCircle(g,x,y,r,o={}){const R=rng(o.seed||(x*3+y*5+r)|0),u=o.u||1;
  if(o.fill!=null){g.fillStyle(o.fill,o.fillAlpha??.9);g.fillCircle(x,y,r);}
  if(o.hatch!==false){g.lineStyle(1*u,0x000000,o.hatchAlpha??.32);for(let i=-r;i<r;i+=5*u){const yy=y+i,half=Math.sqrt(Math.max(0,r*r-i*i));const a0=x+half*(.25+R()*.15);g.lineBetween(a0,yy+half*.12,x+half*.92,yy-half*.12);}}
  const passes=o.passes??3;for(let p=0;p<passes;p++){const a0=R()*6.28,span=6.28*(p?0.75+R()*.35:1.04),rr=r*(1+(p?(R()-.5)*.06:0)),pts=[],n=48,ph=R()*6;for(let i=0;i<=n;i++){const a=a0+span*i/n,j=Math.sin(a*3+ph)*1.2*u;pts.push({x:x+Math.cos(a)*(rr+j),y:y+Math.sin(a)*(rr+j)});}
    strokePts(g,pts,p?Math.max(1,(o.w||4)*u*.35):(o.w||4)*u,p===passes-1&&o.accent!=null?o.accent:(o.color??INK),p?.7:1);}}
// 手绘条（血条）：凹槽 + 填充 + 毛边描线 + 排线高光
function inkBar(g,x,y,w,h,frac,o={}){const u=o.u||1,R=rng(o.seed||91);if(w<4)return;g.fillStyle(o.trough??0x1b1110,.85);g.fillRect(x,y,w,h);
  const fw=Math.max(0,w*Math.min(1,frac));if(fw>0){g.fillStyle(o.color??0xa8321e,1);g.fillRect(x,y,fw,h);g.fillStyle(0x000000,.28);g.fillRect(x,y+h*.62,fw,h*.38);g.lineStyle(1*u,0xffd9a0,.35);g.lineBetween(x+2*u,y+h*.28,x+fw-2*u,y+h*.28);
    g.lineStyle(1*u,0x000000,.22);for(let i=x+4*u;i<x+fw;i+=6*u)g.lineBetween(i,y+h,i+h*.7,y);}
  const lw=o.w||2.6;inkLine(g,x,y,x+w,y,{R,u,w:lw,jit:.8,over:4,accent:o.accent??GOLD});inkLine(g,x,y+h,x+w,y+h,{R,u,w:lw*1.2,jit:.8,over:4,accent:o.accent??GOLD});inkLine(g,x,y-1*u,x,y+h+1*u,{R,u,w:lw,jit:.5,over:2,passes:2});inkLine(g,x+w,y-1*u,x+w,y+h+1*u,{R,u,w:lw,jit:.5,over:2,passes:2});}
/* 毛笔笔痕：pts 自起笔到收笔。宽度：起笔顿压→中段→出锋变尖；中段多根干笔丝随机断续形成飞白；外圈墨晕。o 见 GAME_CONFIG.feel.slashInk */
function brushStroke(g,pts,o={}){if(!pts||pts.length<3)return;const R=rng(o.seed||1),n=pts.length,L=[0];for(let i=1;i<n;i++)L.push(L[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));const T=L[n-1]||1;if(T<6)return;
  const W=o.width||6,press=o.press??.14,tip=o.tip??1.7,color=o.color??INK,alpha=o.alpha??.8,hairs=Math.max(1,o.hairs??5),dry=o.dry??.35,dryFrom=o.dryFrom??.3,halo=o.halo??.22;
  const prof=t=>t<press?(.55+.45*Math.sin(t/press*Math.PI/2))*(1+.18*Math.sin(t/press*Math.PI)):Math.pow(Math.max(0,1-(t-press)/(1-press)),tip)*.92+.08*(1-t);
  const nrm=i=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:-dy/l,y:dx/l};};
  const N=pts.map((p,i)=>nrm(i)),wob=pts.map((p,i)=>Math.sin(L[i]*.09+R()*.6)*.12);
  if(halo>0){const left=[],right=[];for(let i=0;i<n;i++){const t=L[i]/T,w=W*prof(t)*1.55*.5;left.push({x:pts[i].x+N[i].x*w,y:pts[i].y+N[i].y*w});right.push({x:pts[i].x-N[i].x*w,y:pts[i].y-N[i].y*w});}g.fillStyle(color,alpha*halo);g.fillPoints(left.concat(right.reverse()),true);}
  for(let hI=0;hI<hairs;hI++){const off=hairs===1?0:(hI/(hairs-1)-.5),hw=1.25/hairs,edge=Math.abs(off)*2,dropP=dry*(.45+edge*.9);let run=[],skip=0;
    const flush=()=>{if(run.length>=2){const l=[],r=[];for(const q of run){l.push({x:q.x+q.nx*q.w,y:q.y+q.ny*q.w});r.push({x:q.x-q.nx*q.w,y:q.y-q.ny*q.w});}g.fillStyle(color,alpha*(1-edge*.25));g.fillPoints(l.concat(r.reverse()),true);}run=[];};
    for(let i=0;i<n;i++){const t=L[i]/T,w=W*prof(t);if(skip>0){skip--;continue;}if(t>dryFrom&&t<.97&&R()<dropP*.5){flush();skip=1+Math.floor(R()*3*(1+edge));continue;}
      const c=(off+wob[i]*(1-edge))*w,hwid=Math.max(.35,w*hw*.5*(1-(t>dryFrom?R()*.35:0)));run.push({x:pts[i].x+N[i].x*c,y:pts[i].y+N[i].y*c,nx:N[i].x,ny:N[i].y,w:hwid});}
    flush();}}
/* ---------- 草书标题：字体 + 描边 + 墨晕 + 飞白 + 笔划揭示 ---------- */
const CALLI=()=>C.calliFont||'"LiuJianMaoCao","MaShanZheng",cursive';
function feibai(t,o={}){const cv=t.canvas,ctx=t.context;if(!cv||!ctx)return t;const R=rng(o.seed||((t.text||'').length*97+7)),w=cv.width,h=cv.height,n=Math.round((o.streaks??16)*(w/300+.6));ctx.save();ctx.globalCompositeOperation='destination-out';
  for(let i=0;i<n;i++){const y=R()*h,x=R()*w,len=w*(.15+R()*.45),th=Math.max(.6,h*(.01+R()*.025)),a=-.25+R()*.18;ctx.globalAlpha=.35+R()*.55;ctx.beginPath();ctx.moveTo(x,y);for(let k=1;k<=6;k++){ctx.lineTo(x+Math.cos(a)*len*k/6,y+Math.sin(a)*len*k/6+(R()-.5)*th);}ctx.lineWidth=th;ctx.lineCap='round';ctx.stroke();}
  ctx.restore();t.frame?.source?.update?.();t.dirty=true;return t;}
function calli(scene,x,y,s,size,o={}){const u=1,stroke=o.stroke||'#1a0f0a',accent=o.accent;const t=scene.add.text(x,y,s,{fontFamily:CALLI(),fontSize:Math.round(size)+'px',color:o.color||'#f3e2b0',stroke:accent||stroke,strokeThickness:Math.max(2,Math.round(size*(o.strokeK??.11))),padding:{x:size*.2,y:size*.15},shadow:{offsetX:size*.03,offsetY:size*.05,color:'rgba(8,4,2,.85)',blur:size*.22,stroke:true,fill:true},align:o.align||'left'});
  if(o.origin)t.setOrigin(...[].concat(o.origin));if(o.feibai!==false){t.updateText?.();feibai(t,o);}
  if(o.reveal){reveal(scene,t,o.reveal);}return t;}
function reveal(scene,t,dur=650){const w=t.width,h=t.height;t.setCrop(0,0,0,h);const st={p:0};scene.tweens.add({targets:st,p:1,duration:dur,ease:'Sine.InOut',onUpdate:()=>t.setCrop(0,0,w*st.p,h),onComplete:()=>t.setCrop()});return t;}
root.InkUI={rng,wobble,inkLine,hatch,inkRect,inkCircle,inkBar,brushStroke,calli,feibai,reveal,CALLI,INK,GOLD,RED};
})(window);
