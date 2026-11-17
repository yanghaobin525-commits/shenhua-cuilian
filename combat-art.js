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
    this.texture=scene.textures.createCanvas(this.id,256,256);
    h.spr.setTexture(this.id);h.base=h.def.size/256;
    this.weapon=scene.add.image(h.x,h.y,'v6_'+C.weaponArt[h.weapon]+'_weapon');
    // Grip patch is real pixels from the unarmed hand, masking the pole in front views.
    this.patch=scene.textures.createCanvas(this.id+'_grip',64,64);
    this.hand=scene.add.image(h.x,h.y,this.id+'_grip');
    this.last=-1;this.view='front';this.mode='idle';
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
    h.spr.setScale(h.base*flip,h.base).setAngle(0).setOrigin(.5,m.foot);
    h.spr.setPosition(foot.x,foot.y).setDepth(s.view?s.view.depth(h.x,h.y):10+h.y);
    const unitScale=h.def.size/512;
    const t=h.t, cfg=C.combatArt, p=h.actionT>0?1-h.actionT/h.actionDuration:0;
    const swing=h.actionT>0?Math.sin(Math.PI*p):0;
    const sign=co<0?-1:1;
    const handDelta={x: swing*(h.action==='cast'?10:38)*sign,y:-swing*(h.action==='cast'?45:10)+(h.moving?Math.sin(t*12)*5:Math.sin(t*3)*2)};
    const deform=(x,y)=>{
      const hx=m.hand.x*512,hy=m.hand.y*512;
      const weight=Math.exp(-((x-hx)**2/4200+(y-hy)**2/5000));
      const leg=Math.max(0,(y/512-.70)/.22),side=x<256?1:-1;
      return {x:x+handDelta.x*weight+(h.moving?Math.sin(t*12)*7*leg*side:0), y:y+handDelta.y*weight+(h.moving?Math.cos(t*12)*9*leg*side:Math.sin(t*3)*2*(1-y/512))};
    };
    const hp=deform(m.hand.x*512,m.hand.y*512), handX=foot.x+(hp.x-256)*unitScale*flip, handY=foot.y+(hp.y-m.foot*512)*unitScale;
    const wk=C.weaponArt[h.weapon], wm=metadata(s,wk,this.view), grip=wm.grip;
    if(!grip)return;
    const weaponScale=unitScale*((C.weaponVisualScale||{})[h.weapon]||1);
    const rest=Number(wm.weapon.rotation || wm.weapon.rotationRad || 0);
    const angle=rest+(h.action==='cast'?-swing*.45:swing*1.55)*sign*flip;
    this.weapon.setTexture('v6_'+wk+'_weapon').setOrigin(grip.x,grip.y).setScale(weaponScale*flip,weaponScale).setRotation(angle).setPosition(handX,handY).setAlpha(h.spr.alpha).setVisible(true).setDepth((s.view?s.view.depth(h.x,h.y):h.y+10)+(this.view==='back'?-.1:.1));
    const frame=Math.floor(t*cfg.fps);
    if(frame!==this.last){
      this.last=frame;const ctx=this.texture.getContext(),img=s.textures.get('v6_'+h.key+'_'+this.view).getSourceImage();ctx.setTransform(.5,0,0,.5,0,0);ctx.clearRect(0,0,512,512);
      const nx=6,ny=10;
      // Shared sparse-cell map skips transparent tiles; output is 256px, enough for the 112-world-pixel actors at Retina scale.
      const cache=s._combatCellMaps||(s._combatCellMaps={}),ck=h.key+'_'+this.view;
      if(!cache[ck] && typeof document!=='undefined'){const cv=document.createElement('canvas');cv.width=cv.height=512;const cc=cv.getContext('2d',{willReadFrequently:true});cc.drawImage(img,0,0);const data=cc.getImageData(0,0,512,512).data,map=[];for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){let found=false;for(let y=Math.floor(iy*512/ny);y<Math.ceil((iy+1)*512/ny)&&!found;y++)for(let x=Math.floor(ix*512/nx);x<Math.ceil((ix+1)*512/nx);x++)if(data[(y*512+x)*4+3]>8){found=true;break;}map.push(found);}cache[ck]=map;}

      for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
        if(cache[ck]&&!cache[ck][iy*nx+ix])continue;
        const a={x:ix*512/nx,y:iy*512/ny},b={x:(ix+1)*512/nx,y:a.y},c={x:a.x,y:(iy+1)*512/ny},d={x:b.x,y:c.y};
        triangle(ctx,img,[a,b,c],[deform(a.x,a.y),deform(b.x,b.y),deform(c.x,c.y)]);
        triangle(ctx,img,[b,d,c],[deform(b.x,b.y),deform(d.x,d.y),deform(c.x,c.y)]);
      }
      this.texture.refresh();
      const pc=this.patch.getContext(), radius=512*cfg.handRadius;pc.clearRect(0,0,64,64);pc.save();pc.beginPath();pc.ellipse(32,32,radius*.72,radius,0,0,Math.PI*2);pc.clip();pc.drawImage(img,32-m.hand.x*512,32-m.hand.y*512);pc.restore();this.patch.refresh();
    }
    this.hand.setPosition(handX,handY).setScale(unitScale*flip,unitScale).setAlpha(h.spr.alpha).setVisible(this.view!=='back').setDepth((s.view?s.view.depth(h.x,h.y):h.y+10)+.2);
    if(h.flashT>0){this.weapon.setTint(0xff9a8a);this.hand.setTint(0xff9a8a);}else{this.weapon.clearTint();this.hand.clearTint();}
    this.state={view:this.view,mode:this.mode,flip,weapon:h.weapon,hand:{x:handX,y:handY},grip:{x:this.weapon.x,y:this.weapon.y},weaponDepth:this.weapon.depth,bodyDepth:h.spr.depth};
  }
}
window.CombatArt=CombatArt;
})();
