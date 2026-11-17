/* Approved-v6: three unarmed body drawings + separately mounted equipment.
 * Local mesh deformation, NOT a skeletal rig. Physics/hit tests stay in game.js.
 */
(function () {
'use strict';
const C = window.GAME_CONFIG;
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
  ctx.save();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.clip();ctx.transform(A,B,D,E,F,G);const x=Math.min(a.x,b.x,c.x),y=Math.min(a.y,b.y,c.y),w=Math.max(a.x,b.x,c.x)-x,h=Math.max(a.y,b.y,c.y)-y;ctx.drawImage(img,x,y,w,h,x,y,w,h);ctx.restore();
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
    this.texture=scene.textures.createCanvas(this.id,320,400);// 512x640 art units: 128 units headroom above the old 512 frame for leaping poses
    h.spr.setTexture(this.id);h.base=h.def.size/320;
    this.weapon=scene.add.image(h.x,h.y,'v6_'+C.weaponArt[h.weapon]+'_weapon');
    // Grip patch is real pixels from the unarmed hand, masking the pole in front views.
    this.patch=scene.textures.createCanvas(this.id+'_grip',64,64);
    this.hand=scene.add.image(h.x,h.y,this.id+'_grip');
    this.last=-1;this.view='front';this.mode='idle';this.gait=new window.ActorMotion.ContactGait();
    scene.events.once('shutdown',()=>{scene.textures.remove(this.id);scene.textures.remove(this.id+'_grip');});
  }
  update(dt) {
    const h=this.h, s=this.scene;
    if(h.dead){this.weapon.setVisible(false);this.hand.setVisible(false);return;}
    const direction=s.view?s.view.vector(Math.cos(h.faceAng),Math.sin(h.faceAng)):{x:Math.cos(h.faceAng),y:Math.sin(h.faceAng)},len=Math.hypot(direction.x,direction.y);
    const co=direction.x/len,si=direction.y/len,foot=s.view?s.view.project(h.x,h.y):{x:h.x,y:h.y};
    this.view=Math.abs(co)>.64?'side':si<0?'back':'front';
    this.mode=h.actionT>0?h.action:h.moving?'walk':'idle';
    const m=metadata(s,h.key,this.view); if(!m.hand)return;
    const flip=this.view==='side' ? ((co<0?-1:1)*(m.sideFaces==='left'?-1:1)) : 1;
    h.spr.setScale(h.base*flip,h.base).setAngle(0).setOrigin(.5,(m.foot*512+128)/640);
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
    // Pose-stage switch: during an attack with a configured stage, show the matching drawn key pose.
    const PA=(C.poseArt||{})[h.key],pm=PA&&s.cache.json.get('pose_meta_'+h.key),stage=profile.poseStage,clk=h.clock,tm=clk&&clk.timing;
    let poseInfo=null,lift=0;
    if(pm&&stage&&h.action==='attack'&&clk&&!clk.done&&clk.time<=tm.windup+tm.active+tm.recovery*(PA.holdUntil??.7)&&s.textures.exists('pose_'+h.key+'_'+stage+'_'+this.view)){
      poseInfo=pm.stages[stage][this.view];
      if(profile.jump&&poseInfo.liftPx){const up=window.ActorMotion.smooth(Math.min(1,clk.time/(tm.windup*.85))),down=clk.time>tm.windup?Math.min(1,(clk.time-tm.windup)/Math.max(.01,tm.active)):0;lift=poseInfo.liftPx*up*(1-down);}
    }
    this.poseStage=poseInfo?stage:null;this.lift=lift;
    let hp=deform(m.hand.x*512,m.hand.y*512);
    if(poseInfo){const g=poseInfo.grip;hp={x:g.x*512,y:g.y*640-128-lift};}
    const handX=foot.x+(hp.x-256)*unitScale*flip, handY=foot.y+(hp.y-m.foot*512)*unitScale;
    const wk=C.weaponArt[h.weapon], wm=metadata(s,wk,this.view), grip=wm.grip;
    if(!grip)return;
    const weaponScale=unitScale*((C.weaponVisualScale||{})[h.weapon]||1);
    const rest=Number(wm.weapon.rotation || wm.weapon.rotationRad || 0);
    const desired=Math.atan2(si,co)+Math.PI/2,weight=pose.weight,angle=rest+Math.atan2(Math.sin(desired-rest),Math.cos(desired-rest))*weight+pose.angle*sign*flip;
    this.weapon.setTexture('v6_'+wk+'_weapon').setOrigin(grip.x,grip.y).setScale(weaponScale*flip,weaponScale).setRotation(angle).setPosition(handX,handY).setAlpha(h.spr.alpha).setVisible(true).setDepth((s.view?s.view.depth(h.x,h.y):h.y+10)+(this.view==='back'?-.1:.1));
    const frame=Math.floor(t*(this.mode==='idle'?12:32))+'_'+this.view+'_'+this.mode+'_'+(h.clock?.time||0).toFixed(2)+'_'+(this.poseStage||'')+Math.round(lift);
    if(frame!==this.last){
      this.last=frame;const ctx=this.texture.getContext();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,320,400);
      if(poseInfo){const pimg=s.textures.get('pose_'+h.key+'_'+stage+'_'+this.view).getSourceImage(),q=clk.time<tm.windup?clk.time/tm.windup:1,sq=profile.jump?(clk.time<tm.windup*.3?1-.08*q:clk.time>tm.windup&&clk.time<tm.windup+tm.active+.06?1-.1:1):1;
        // squash on take-off / landing, about the foot line (599 art units)
        ctx.setTransform(.625*(2-sq),0,0,.625*sq,320*(1-(2-sq))/2,.625*599*(1-sq));ctx.drawImage(pimg,0,-lift);this.texture.refresh();
        const fi=poseInfo.fists.reduce((a,b)=>b.y>a.y?b:a,poseInfo.fists[0]),pc=this.patch.getContext(),rad=512*cfg.handRadius;pc.clearRect(0,0,64,64);pc.save();pc.beginPath();pc.ellipse(32,32,rad*.8,rad*.9,0,0,Math.PI*2);pc.clip();pc.drawImage(pimg,32-fi.x*512,32-fi.y*640+lift);pc.restore();this.patch.refresh();this.patchPos={x:fi.x*512,y:fi.y*640-128-lift};
      } else {
      this.patchPos=null;const img=s.textures.get('v6_'+h.key+'_'+this.view).getSourceImage();ctx.setTransform(.625,0,0,.625,0,80);
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
      const pc=this.patch.getContext(), radius=512*cfg.handRadius;pc.clearRect(0,0,64,64);pc.save();pc.beginPath();pc.ellipse(32,32,radius*.72,radius,0,0,Math.PI*2);pc.clip();pc.drawImage(img,32-m.hand.x*512,32-m.hand.y*512);pc.restore();this.patch.refresh();
      }
    }
    const pp=this.patchPos,phx=pp?foot.x+(pp.x-256)*unitScale*flip:handX,phy=pp?foot.y+(pp.y-m.foot*512)*unitScale:handY;
    this.hand.setPosition(phx,phy).setScale(unitScale*flip,unitScale).setAlpha(h.spr.alpha).setVisible(this.view!=='back'||!!this.poseStage).setDepth((s.view?s.view.depth(h.x,h.y):h.y+10)+.2);
    if(h.flashT>0){this.weapon.setTint(0xff9a8a);this.hand.setTint(0xff9a8a);}else{this.weapon.clearTint();this.hand.clearTint();}
    this.state={poseStage:this.poseStage,lift:this.lift,gait:{phase:gait.phase,blend:gait.blend,distance:gait.distance,feet:gait.feet.map(f=>({stance:f.stance,screen:f.screen,anchor:f.lockWorld})),bob:gait.bob},pose,weaponAngle:angle,view:this.view,mode:this.mode,flip,weapon:h.weapon,hand:{x:handX,y:handY},grip:{x:this.weapon.x,y:this.weapon.y},weaponDepth:this.weapon.depth,bodyDepth:h.spr.depth};
  }
}
CombatArt.triangle=triangle;window.CombatArt=CombatArt;
})();
