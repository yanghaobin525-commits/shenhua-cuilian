/* Approved-v6: three unarmed body drawings + separately mounted equipment.
 * Local mesh deformation, NOT a skeletal rig. Physics/hit tests stay in game.js.
 */
(function () {
'use strict';
const C = window.GAME_CONFIG;
// v11 actor canvas: 384x480 px (art 614x768) — extra side/top room for scaled linework poses and jumps.
const CW=384,CH=480,OX=32,OYM=160;
function point(v, fallback) {
  if (Array.isArray(v)) return {x:v[0],y:v[1]};
  return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? v : fallback;
}
function metadata(scene, key, view) {
  const m = scene.cache.json.get('v6_meta_' + key) || {};
  const d = (m.views || m.directions || m)[view] || {};
  const hand = point(d.handAnchor || (m.handAnchor || {})[view] || m.handAnchor, null);
  const weapon = m.weapon || {};
  const grip = point(weapon.grip || m.weaponGrip || m.grip, null);
  return {hand,grip, foot: m.footY || m.footBaseline || C.combatArt.footY, sideFaces: m.sideFaces || m.sideFacing || 'right', weapon};
}
function triangle(ctx,img,s,d) {
  const [a,b,c]=s,[p,q,r]=d;
  const det=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);
  if(Math.abs(det)<0.0001)return;
  const A=(p.x*(b.y-c.y)+q.x*(c.y-a.y)+r.x*(a.y-b.y))/det;
  const B=(p.y*(b.y-c.y)+q.y*(c.y-a.y)+r.y*(a.y-b.y))/det;
  const D=(p.x*(c.x-b.x)+q.x*(a.x-c.x)+r.x*(b.x-a.x))/det;
  const E=(p.y*(c.x-b.x)+q.y*(a.x-c.x)+r.y*(b.x-a.x))/det;
  const F=(p.x*(b.x*c.y-c.x*b.y)+q.x*(c.x*a.y-a.x*c.y)+r.x*(a.x*b.y-b.x*a.y))/det;
  const G=(p.y*(b.x*c.y-c.x*b.y)+q.y*(c.x*a.y-a.x*c.y)+r.y*(a.x*b.y-b.x*a.y))/det;
  const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3,ex=v=>{const dx=v.x-cx,dy=v.y-cy,l=Math.hypot(dx,dy)||1;return{x:v.x+dx/l*.9,y:v.y+dy/l*.9};},P=ex(p),Q=ex(q),R=ex(r);ctx.save();ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(Q.x,Q.y);ctx.lineTo(R.x,R.y);ctx.closePath();ctx.clip();ctx.transform(A,B,D,E,F,G);const x=Math.min(a.x,b.x,c.x),y=Math.min(a.y,b.y,c.y),w=Math.max(a.x,b.x,c.x)-x,h=Math.max(a.y,b.y,c.y)-y;ctx.drawImage(img,x-1,y-1,w+2,h+2,x-1,y-1,w+2,h+2);ctx.restore();
}
class CombatArt {
  static preload(scene) {
    for (const key of Object.keys(C.heroes)) {
      const dir='assets/approved-v6/'+key+'/',revision='?v='+encodeURIComponent(C.releaseId||C.artVersion);
      for(const v of ['front','back','side','weapon'])scene.load.image('v6_'+key+'_'+v,dir+v+'.png'+revision);
      scene.load.json('v6_meta_'+key,dir+'manifest.json'+revision);
      scene.load.image('select_'+key,'assets/selection-v6/'+key+'.png'+revision);
    }
    // v10 key-pose art (static drawings switched per combo stage; not a skeletal rig).
    for(const [key,P] of Object.entries(C.poseArtV11||{})){const rv='?v='+encodeURIComponent(C.releaseId),L=(set,fr)=>scene.load.image('p11_'+key+'_'+set+'_'+fr,P.dir+set+'-'+fr+P.ext+rv);scene.load.json('pose11_meta_'+key,P.dir+'manifest.json'+rv);const V=['front','back','side'];for(const st of Object.values(P.attack))V.forEach(v=>L(st,v));V.forEach(v=>L(P.dodge,v));for(const st of Object.values(P.skills))V.forEach(v=>L(st,v));for(const st of [P.run.front,P.run.side,P.run.back])P.run.frames.forEach(f=>L(st,f));}
    (C.soul?.frames||[]).forEach((f,i)=>scene.load.image('soul11_'+i,f+'?v='+encodeURIComponent(C.releaseId)));
    for(const [key,S] of Object.entries(C.staff||{}))scene.load.image('staff11_'+key,S.file+'?v='+encodeURIComponent(C.releaseId));
    for(const [key,P] of Object.entries(C.poseArt||{})){const revision='?v='+encodeURIComponent(C.releaseId);scene.load.json('pose_meta_'+key,P.dir+'manifest.json'+revision);for(const st of P.stages)for(const v of P.views)scene.load.image('pose_'+key+'_'+st+'_'+v,P.dir+st+'-'+v+'.png'+revision);}
  }
  static validate(scene) {
    const errors=[];
    for(const key of Object.keys(C.heroes)) {
      for(const v of ['front','back','side','weapon']) if(!scene.textures.exists('v6_'+key+'_'+v)) errors.push(key+'/'+v+'.png');
      for(const v of ['front','back','side']) {const m=metadata(scene,key,v); if(!m.hand || !m.grip) errors.push(key+'/'+v+' anchors');}
    }
    return [...new Set(errors)];
  }
  constructor(scene,h) {
    this.scene=scene;this.h=h;this.id='v6_actor_'+h.isPlayer+'_'+h.key+'_'+scene.time.now+'_'+Math.random();
    this.texture=scene.textures.createCanvas(this.id,CW,CH);// art units ×.625; 256 units headroom above the 512 mesh frame
    h.spr.setTexture(this.id);h.base=h.def.size/320;
    this.weapon=scene.add.image(h.x,h.y,'v6_'+C.weaponArt[h.weapon]+'_weapon');
    // v11 staff: textured linework pole drawn in segments along a (bendable) curve into its own canvas.
    this.staffCfg=(C.staff||{})[h.key];if(this.staffCfg&&scene.textures.exists?.('staff11_'+h.key)){this.SR=2;this.SC=640;this.staffTex=scene.textures.createCanvas(this.id+'_staff',this.SC,this.SC);this.staffSig='';}this.runDist=0;this.prevPos={x:h.x,y:h.y};this.spd=0;this.prevAngle=null;this.omega=0;
    // Grip patch is real pixels from the unarmed hand, masking the pole in front views.
    this.patch=scene.textures.createCanvas(this.id+'_grip',64,64);
    this.hand=scene.add.image(h.x,h.y,this.id+'_grip');
    this.last=-1;this.view='front';this.mode='idle';this.gait=new window.ActorMotion.ContactGait();
    scene.events.once('shutdown',()=>{scene.textures.remove(this.id);scene.textures.remove(this.id+'_grip');if(this.staffTex)scene.textures.remove(this.id+'_staff');});
  }
  update(dt) {
    const h=this.h, s=this.scene;
    if(h.dead){this.weapon.setVisible(false);this.hand.setVisible(false);return;}
    const direction=s.view?s.view.vector(Math.cos(h.faceAng),Math.sin(h.faceAng)):{x:Math.cos(h.faceAng),y:Math.sin(h.faceAng)},len=Math.hypot(direction.x,direction.y);
    const co=direction.x/len,si=direction.y/len,foot=s.view?s.view.project(h.x,h.y):{x:h.x,y:h.y};
    this.view=Math.abs(co)>.64?'side':si<0?'back':'front';
    // t112 横扫千军：顺时针依次 左侧面→正面→右侧面 循环，并轻微左右横移
    const SPC=((C.poseArtV11||{})[h.key]||{}).spinCycle,spinOn=SPC&&h.action==='cast'&&h.castKind==='spin'&&h.clock&&!h.clock.done;let spinFlip=null;this.spinSway=this.spinSway||0;
    if(spinOn){const seg=Math.floor(h.clock.time/SPC.step)%3,tg=[-1,0,1][seg];this.view=seg===1?'front':'side';spinFlip=seg===0?-1:1;this.spinSway+=(tg*SPC.sway-this.spinSway)*Math.min(1,dt*SPC.swayEase);}else this.spinSway+=(0-this.spinSway)*Math.min(1,dt*12);
    foot.x+=this.spinSway;this.spinSeg=spinOn?['left','front','right'][Math.floor(h.clock.time/SPC.step)%3]:null;
    this.mode=h.actionT>0?h.action:h.moving?'walk':'idle';
    const m=metadata(s,h.key,this.view); if(!m.hand)return;
    const flip=this.view==='side' ? ((spinFlip??(co<0?-1:1))*(m.sideFaces==='left'?-1:1)) : 1;
    const FOOTC=OYM+.625*m.foot*512;h.spr.setScale(h.base*flip,h.base).setAngle(0).setOrigin(.5,FOOTC/CH);
    h.spr.setPosition(foot.x,foot.y).setDepth(s.view?s.view.depth(h.x,h.y):10+h.y);
    const unitScale=h.def.size/512;
    const t=h.t,cfg=C.combatArt,profile=h.attackProfile||C.attackMotion[h.weapon]||C.attackMotion.sword,pose=window.ActorMotion.attackPose(h,profile),identity={project:(x,y)=>({x,y}),unproject:(x,y)=>({x,y}),vector:(x,y)=>({x,y})},view=s.view||identity;
    // Feet are sampled from the approved alpha; no replacement drawings or design changes.
    const fc=s._footMaps||(s._footMaps={}),fk=h.key+'_'+this.view;
    if(!fc[fk]){let lo=218,hi=294;if(typeof document!=='undefined'){const cv=document.createElement('canvas');cv.width=cv.height=512;const cc=cv.getContext('2d',{willReadFrequently:true});cc.drawImage(s.textures.get('v6_'+h.key+'_'+this.view).getSourceImage(),0,0);const data=cc.getImageData(0,0,512,512).data,xs=[];for(let x=80;x<435;x++)for(let y=455;y<478;y++)if(data[(y*512+x)*4+3]>100){xs.push(x);break;}if(xs.length){lo=xs[Math.floor(xs.length*.22)];hi=xs[Math.floor(xs.length*.78)];}}fc[fk]=[{x:lo,y:470},{x:hi,y:470}];}
    const layout=fk+'_'+flip;if(this.layout!==layout){this.gait.legs=[{},{}];this.layout=layout;this.last=-1;}
    const gait=this.gait.update(h,dt,view,C.motion,fc[fk],unitScale,flip),sign=co<0?-1:1,aimX=co*flip,aimY=si;
    const handDelta={x:pose.reach*aimX+gait.arm*.45,y:pose.reach*aimY*.5+pose.lift+gait.arm*.18};
    const smooth=(a,b,v)=>window.ActorMotion.smooth((v-a)/(b-a));
    const deform=(x,y)=>{
      const center=(fc[fk][0].x+fc[fk][1].x)/2,leg=smooth(378,460,y)*Math.exp(-(Math.max(0,Math.abs(x-center)-70)**2)/1200),side=this.view==='side'?0:x<256?0:1,F=gait.feet[side],hip=Math.exp(-((y-365)**2)/6000),chest=Math.exp(-((y-295)**2)/9000),head=1-smooth(225,285,y);
      const twist=pose.twist*C.motion.attackTwist*(profile.twistMul||1),tx=-(y-370)*twist,ty=(x-256)*twist*.35;
      const dx=((gait.hipX*hip+gait.shoulderX*chest)*(1-leg)+tx*(1-leg)*(1-head*.75)+F.x*leg),dy=-gait.bob/unitScale*(1-leg)+ty*(1-leg)*(1-head*.75)+F.y*leg;
      const hx=m.hand.x*512,hy=m.hand.y*512,handWeight=Math.exp(-((x-hx)**2/3300+(y-hy)**2/2600));
      return{x:x+dx+handDelta.x*handWeight*(1-leg),y:y+dy+handDelta.y*handWeight*(1-leg)};
    };
    // Pose switch (static drawn key poses, not a rig): v11 attack/dodge/cast/run sets, else v10 attack stages, else mesh.
    const PA=(C.poseArt||{})[h.key],pm=PA&&s.cache.json.get('pose_meta_'+h.key),stage=profile.poseStage,clk=h.clock,tm=clk&&clk.timing;
    if(dt>0){const md=Math.hypot(h.x-this.prevPos.x,h.y-this.prevPos.y);if(md<60){this.runDist+=md;this.spd+=(md/dt-this.spd)*Math.min(1,dt*12);}this.prevPos={x:h.x,y:h.y};}
    let src=this.pickPose(h,profile,clk,tm,stage,PA,pm),lift=src?src.lift:0;
    this.poseStage=src?src.set:null;this.poseSrc=src;this.lift=lift;this.poseTop=src?(599-src.info.bbox[1])*src.k+lift:0;
    let hp=deform(m.hand.x*512,m.hand.y*512);
    if(src){const g=src.grip;hp={x:256+(g.x*512-256)*src.k,y:m.foot*512+(g.y*640-599)*src.k-lift};}
    const handX=foot.x+(hp.x-256)*unitScale*flip, handY=foot.y+(hp.y-m.foot*512)*unitScale;
    const wk=C.weaponArt[h.weapon], wm=metadata(s,wk,this.view), grip=wm.grip;
    if(!grip)return;
    const weaponScale=unitScale*((C.weaponVisualScale||{})[h.weapon]||1);
    const rest=Number(wm.weapon.rotation || wm.weapon.rotationRad || 0);
    const desired=Math.atan2(si,co)+Math.PI/2,weight=pose.weight;let angle=rest+Math.atan2(Math.sin(desired-rest),Math.cos(desired-rest))*weight+pose.angle*sign*flip;
    const SCF=this.staffCfg,useStaff=!!(this.staffTex&&SCF&&wk===h.key);
    if(useStaff)angle=this.staffAngle(h,angle,desired,clk,tm,sign);
    if(dt>0&&this.prevAngle!==null){const da=Math.atan2(Math.sin(angle-this.prevAngle),Math.cos(angle-this.prevAngle));this.omega+=(da/dt-this.omega)*Math.min(1,dt*20);}this.prevAngle=angle;
    const wdepth=(s.view?s.view.depth(h.x,h.y):h.y+10)+(this.view==='back'?-.1:.1);
    if(useStaff){this.drawStaff(h,angle,clk,tm,profile);this.weapon.setTexture(this.id+'_staff').setOrigin(.5,.5).setScale(1/this.SR).setRotation(0).setPosition(handX,handY).setAlpha(h.spr.alpha).setVisible(true).setDepth(wdepth);}
    else{this.staffPts=null;this.weapon.setTexture('v6_'+wk+'_weapon').setOrigin(grip.x,grip.y).setScale(weaponScale*flip,weaponScale).setRotation(angle).setPosition(handX,handY).setAlpha(h.spr.alpha).setVisible(true).setDepth(wdepth);}
    const frame=Math.floor(t*(this.mode==='idle'?12:32))+'_'+this.view+'_'+this.mode+'_'+(h.clock?.time||0).toFixed(2)+'_'+(src?src.tex:'')+Math.round(lift);
    if(frame!==this.last){
      this.last=frame;const ctx=this.texture.getContext();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,CW,CH);
      if(src){const pimg=s.textures.get(src.tex).getSourceImage(),k=src.k,jump=src.attack&&profile.jump,q=jump&&clk.time<tm.windup?clk.time/tm.windup:1,sq=jump?(clk.time<tm.windup*.3?1-.08*q:clk.time>tm.windup&&clk.time<tm.windup+tm.active+.06?1-.1:1):1;
        // squash on take-off / landing about the foot line; pose frame 512x640 with foot at y=599
        const K=.625*k,sx=2-sq,sy=sq;ctx.setTransform(K*sx,0,0,K*sy,OX+.625*256-K*sx*256,FOOTC-.625*lift-K*sy*599);ctx.drawImage(pimg,0,0);this.texture.refresh();
        const pc=this.patch.getContext();pc.setTransform(1,0,0,1,0,0);pc.clearRect(0,0,64,64);
        if(src.info.fists&&src.info.fists.length){const fi=src.info.fists.reduce((a,b)=>b.y>a.y?b:a,src.info.fists[0]),rad=512*cfg.handRadius;pc.save();pc.beginPath();pc.ellipse(32,32,rad*.8*k,rad*.9*k,0,0,Math.PI*2);pc.clip();pc.setTransform(k,0,0,k,32-fi.x*512*k,32-fi.y*640*k);pc.drawImage(pimg,0,0);pc.restore();this.patchPos={x:256+(fi.x*512-256)*k,y:m.foot*512+(fi.y*640-599)*k-lift};}else this.patchPos=null;this.patch.refresh();
      } else {
      this.patchPos=null;const img=s.textures.get('v6_'+h.key+'_'+this.view).getSourceImage();ctx.setTransform(.625,0,0,.625,OX,OYM);
      const nx=8,ny=14;
      // Shared sparse-cell map skips transparent tiles; output is 320px; local deformation is not an anatomical skeletal rig.
      const cache=s._combatCellMaps||(s._combatCellMaps={}),ck=h.key+'_'+this.view;
      if(!cache[ck] && typeof document!=='undefined'){const cv=document.createElement('canvas');cv.width=cv.height=512;const cc=cv.getContext('2d',{willReadFrequently:true});cc.drawImage(img,0,0);const data=cc.getImageData(0,0,512,512).data,map=[];for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){let found=false;for(let y=Math.floor(iy*512/ny);y<Math.ceil((iy+1)*512/ny)&&!found;y++)for(let x=Math.floor(ix*512/nx);x<Math.ceil((ix+1)*512/nx);x++)if(data[(y*512+x)*4+3]>8){found=true;break;}map.push(found);}cache[ck]=map;}

      if(this.view==='side'&&gait.blend>.12){const feet=fc[fk],x0=Math.min(feet[0].x,feet[1].x)-20,x1=Math.max(feet[0].x,feet[1].x)+20;ctx.save();ctx.globalAlpha=.82*gait.blend;ctx.drawImage(img,x0,430,x1-x0,48,x0+gait.feet[1].x,430+gait.feet[1].y,x1-x0,48);ctx.restore();}
      for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
        if(cache[ck]&&!cache[ck][iy*nx+ix])continue;
        const a={x:ix*512/nx,y:iy*512/ny},b={x:(ix+1)*512/nx,y:a.y},c={x:a.x,y:(iy+1)*512/ny},d={x:b.x,y:c.y};
        triangle(ctx,img,[a,b,c],[deform(a.x,a.y),deform(b.x,b.y),deform(c.x,c.y)]);
        triangle(ctx,img,[b,d,c],[deform(b.x,b.y),deform(d.x,d.y),deform(c.x,c.y)]);
      }
      this.texture.refresh();
      const pc=this.patch.getContext(), radius=512*cfg.handRadius;pc.setTransform(1,0,0,1,0,0);pc.clearRect(0,0,64,64);pc.save();pc.beginPath();pc.ellipse(32,32,radius*.72,radius,0,0,Math.PI*2);pc.clip();pc.drawImage(img,32-m.hand.x*512,32-m.hand.y*512);pc.restore();this.patch.refresh();
      }
    }
    const pp=this.patchPos,phx=pp?foot.x+(pp.x-256)*unitScale*flip:handX,phy=pp?foot.y+(pp.y-m.foot*512)*unitScale:handY;
    this.hand.setPosition(phx,phy).setScale(unitScale*flip,unitScale).setAlpha(h.spr.alpha).setVisible((this.view!=='back'||!!this.poseStage)&&!(this.poseSrc&&!this.patchPos)).setDepth((s.view?s.view.depth(h.x,h.y):h.y+10)+.2);
    if(h.flashT>0){this.weapon.setTint(0xff9a8a);this.hand.setTint(0xff9a8a);}else{this.weapon.clearTint();this.hand.clearTint();}
    this.state={spinSeg:this.spinSeg,sway:+this.spinSway.toFixed(2),poseStage:this.poseStage,poseTex:src?src.tex:null,staff:this.staffState||null,lift:this.lift,gait:{phase:gait.phase,blend:gait.blend,distance:gait.distance,feet:gait.feet.map(f=>({stance:f.stance,screen:f.screen,anchor:f.lockWorld})),bob:gait.bob},pose,weaponAngle:angle,view:this.view,mode:this.mode,flip,weapon:h.weapon,hand:{x:handX,y:handY},grip:{x:this.weapon.x,y:this.weapon.y},weaponDepth:this.weapon.depth,bodyDepth:h.spr.depth};
  }
  pickPose(h,profile,clk,tm,stage,PA,pm){
    const s=this.scene,PV=(C.poseArtV11||{})[h.key],m11=PV&&s.cache.json.get('pose11_meta_'+h.key),view=this.view;
    const mk=(set,fr,extra)=>{const tex='p11_'+h.key+'_'+set+'_'+fr,info=m11.sets[set]?.frames?.[fr];if(!info||!s.textures.exists(tex))return null;return Object.assign({set,tex,info,k:PV.scale||1,lift:0,grip:info.grip||this.fallbackGrip(info)},extra||{});};
    const atkLive=h.action==='attack'&&clk&&!clk.done&&tm&&stage;
    if(m11){
      if(atkLive&&PV.attack[stage]&&clk.time<=tm.windup+tm.active+tm.recovery*(PV.holdUntil??.7)){let lift=0;if(profile.jump){const up=window.ActorMotion.smooth(Math.min(1,clk.time/(tm.windup*.85))),down=clk.time>tm.windup?Math.min(1,(clk.time-tm.windup)/Math.max(.01,tm.active)):0;lift=(PV.heavyJumpPx||80)*up*(1-down);}const r=mk(PV.attack[stage],view,{lift,attack:true});if(r)return r;}
      if(h.dodgeState){const r=mk(PV.dodge,view);if(r)return r;}
      if(h.action==='cast'&&clk&&!clk.done&&h.castKind&&PV.skills[h.castKind]){const r=mk(PV.skills[h.castKind],view,{cast:h.castKind});if(r)return r;}
      const R=PV.run;if(!(clk&&!clk.done)&&h.moving&&this.spd>R.minSpeed){const fr=R.frames[Math.floor(this.runDist/R.stride)%R.frames.length],r=mk(R[view],fr,{run:true});if(r)return r;}
    }
    if(pm&&atkLive&&clk.time<=tm.windup+tm.active+tm.recovery*(PA.holdUntil??.7)&&s.textures.exists('pose_'+h.key+'_'+stage+'_'+view)){const info=pm.stages[stage][view];let lift=0;if(profile.jump&&info.liftPx){const up=window.ActorMotion.smooth(Math.min(1,clk.time/(tm.windup*.85))),down=clk.time>tm.windup?Math.min(1,(clk.time-tm.windup)/Math.max(.01,tm.active)):0;lift=info.liftPx*up*(1-down);}return{set:stage,tex:'pose_'+h.key+'_'+stage+'_'+view,info,k:1,lift,grip:info.grip,attack:true};}
    return null;
  }
  fallbackGrip(info){const b=info.bbox;return{x:.5,y:(599-(599-b[1])*.52)/640};}
  // staff envelope 0..1 over an attack/cast clock: extend in late windup, hold in active, retract in recovery
  staffEnv(clk,tm){if(!clk||clk.done||!tm)return{ext:0,bend:0};const t=clk.time,W=tm.windup,A=tm.active,R=tm.recovery,e=(this.staffCfg.extendEase??.6),sm=window.ActorMotion.smooth;
    const ext=t<W?sm(Math.max(0,(t-W*(1-e))/(W*e))):t<W+A?1:Math.max(0,1-sm((t-W-A)/Math.max(.01,R*.85)));
    const bend=t<W?.35*sm(t/W):t<W+A?.35+.65*Math.sin(Math.PI*Math.min(1,(t-W)/A*.5+.5*(t-W)/A)):Math.max(0,1-(t-W-A)/.06);return{ext,bend:Math.min(1,bend)};}
  staffParams(h,clk,tm,profile){const S=this.staffCfg,I=S.idle||{len:1,gripV:.5};let tgt=null;
    if(h.action==='attack'&&clk&&!clk.done&&profile.poseStage)tgt=S.stages[profile.poseStage];else if(h.action==='cast'&&clk&&!clk.done&&h.castKind)tgt=S.skills[h.castKind];
    if(!tgt)return{len:I.len,thick:I.thick??1,gripV:I.gripV??S.gripV,bend:0};const E=this.staffEnv(clk,tm);
    return{len:I.len+(tgt.len-I.len)*E.ext,thick:(I.thick??1)+((tgt.thick??1)-(I.thick??1))*E.ext,gripV:(I.gripV??.5)+((tgt.gripV??.5)-(I.gripV??.5))*E.ext,bend:(tgt.bend||0)*E.bend,flare:(tgt.flare||0)*E.bend};}
  staffAngle(h,angle,desired,clk,tm,sign){if(h.action!=='cast'||!clk||clk.done||!tm)return angle;const t=clk.time,W=tm.windup,A=tm.active,sm=window.ActorMotion.smooth;
    if(h.castKind==='spin')return desired+t*26*sign;
    if(h.castKind==='slam'){const up=0,fwd=desired+Math.PI*.0;if(t<W)return up+Math.atan2(Math.sin(angle-up),Math.cos(angle-up))*(1-sm(t/W));const q=sm(Math.min(1,(t-W)/A));return up+Math.atan2(Math.sin(fwd-up),Math.cos(fwd-up))*q;}
    if(h.castKind==='freeze')return Math.PI*.82*sign;return angle;}
  drawStaff(h,angle,clk,tm,profile){const S=this.staffCfg,P=this.staffParams(h,clk,tm,profile),R=this.SR,SC=this.SC,L=S.baseLen*P.len,ux=Math.sin(angle),uy=-Math.cos(angle),nx=-uy,ny=ux;
    const dir=this.omega>0?1:-1,bendAmt=P.bend*(S.bendSign??-1)*dir*Math.min(1,Math.abs(this.omega)/6+.35),N=S.segments||14,g=P.gripV;
    const pt=t=>{const d=(t-g)*L,q=t>=g?((t-g)/Math.max(.05,1-g))**2:.3*((g-t)/Math.max(.05,g))**2,sag=bendAmt*L*q;return{x:ux*d+nx*sag,y:uy*d+ny*sag};};
    const pts=[];for(let i=0;i<=N;i++)pts.push(pt(i/N));
    this.staffState={flare:+(P.flare||0).toFixed(3),thick:+(P.thick||1).toFixed(3),len:+P.len.toFixed(3),bend:+bendAmt.toFixed(3),gripV:+g.toFixed(3),angle:+angle.toFixed(3),tip:pts[N],butt:pts[0],lengthWorld:+L.toFixed(1)};this.staffPts=pts;
    const sig=pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join('|');if(sig===this.staffSig)return;this.staffSig=sig;
    const ctx=this.staffTex.getContext(),img=this.scene.textures.get('staff11_'+h.key).getSourceImage(),tw=img.width,th=img.height,w=S.thick*(P.thick||1)*R,c=SC/2,tp=S.taper??0;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,SC,SC);
    for(let i=0;i<N;i++){const p0=pts[i],p1=pts[i+1],dx=(p1.x-p0.x)*R,dy=(p1.y-p0.y)*R,sl=Math.hypot(dx,dy);if(sl<.01)continue;
      // texture top (v=0) = tip end t=1
      const v0=th*(1-(i+1)/N),vh=th/N;ctx.setTransform(dy/sl,-dx/sl,-dx/sl,-dy/sl,c+p1.x*R,c+p1.y*R);const tt=(i+.5)/N,fl=P.flare||0,dd=tt>=g?(tt-g)/Math.max(.05,1-g):0,ww=w*(1-tp*tt)*(tt>=g?1+fl*(dd-.35*(1-dd)):1-fl*.35);ctx.drawImage(img,0,v0,tw,vh+1,-ww/2,0,ww,sl+1.2);}
    this.staffTex.refresh();}
}
CombatArt.triangle=triangle;window.CombatArt=CombatArt;
})();
