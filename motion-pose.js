/* Distance-driven contact gait + piecewise weapon actions. Original animation math;
 * local image deformation/layer reuse, not a full anatomical skeletal rig. */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);},mix=(a,b,t)=>a+(b-a)*t;
function attackPose(h,profile){
 const clock=h.clock,active=h.actionT>0||clock&&!clock.done;if(!active)return{weight:0,reach:0,lift:0,angle:0,twist:0,strike:0,stage:'idle'};
 const timing=clock?.timing||{windup:.18,active:.08,recovery:.24},time=clock?clock.time:(1-h.actionT/(h.actionDuration||.5))*(timing.windup+timing.active+timing.recovery),w=timing.windup,a=timing.active,r=timing.recovery;
 let strike,weight=1,stage;
 if(time<w){const t=time/w;stage=t<.58?'anticipation':'strike';strike=t<.58?mix(0,-.30,smooth(t/.58)):mix(-.30,1,smooth((t-.58)/.42));weight=smooth(Math.min(1,t*5));}
 else if(time<w+a){stage='contact';strike=mix(1,1.12,smooth((time-w)/a));}
 else{stage='recovery';const t=smooth((time-w-a)/r);strike=mix(1.12,0,t);weight=1-t;}
 const kind=h.action==='cast'?'cast':profile.kind,reach=profile.reach||44,arc=profile.arc||1.2;
 return{weight,stage,strike,reach:kind==='cast'?strike*14:strike*reach,lift:kind==='rise'?-(profile.raise||48)*Math.max(0,strike)*weight:kind==='ranged'?-(profile.raise||0)*Math.max(0,strike)*weight:kind==='overhead'?-Math.max(0,-strike)*150:kind==='ranged'?-Math.max(0,-strike)*38:kind==='cast'?-weight*55:Math.max(0,-strike)*12,angle:kind==='slash'?(strike-1)*arc*.85*weight*(profile.sweepSign||1):kind==='rise'?-(strike-1)*1.05*weight:kind==='overhead'?(strike-1)*1.1*weight:kind==='cast'?-.35*weight:kind==='ranged'?(1-strike)*.45*weight*(profile.sweepSign||1):.10*(1-strike)*weight,twist:clamp(strike,-.4,1.2)*(kind==='ranged'?.35:1)*weight,kind};
}
class ContactGait{
 constructor(){this.phase=0;this.blend=0;this.prev=null;this.legs=[{},{}];this.distance=0;this.dir={x:1,y:0};}
 update(h,dt,view,cfg,rest,unit,flip){
  let dx=this.prev?h.x-this.prev.x:0,dy=this.prev?h.y-this.prev.y:0,d=Math.hypot(dx,dy);const teleport=d>Math.max(80,(h.def.speed||235)*Math.max(dt,.016)*3);
  if(dt<=0)d=0;if(teleport){d=0;this.legs=[{},{}];}if(dt>0||!this.prev)this.prev={x:h.x,y:h.y};
  if(d>.001&&!teleport){this.dir={x:dx/d,y:dy/d};this.phase+=d/cfg.stride;this.distance+=d;}
  const moving=d>.001&&!teleport,goal=moving?1:0,k=1-Math.exp(-Math.max(0,dt)/(goal>this.blend?cfg.startSmooth:cfg.stopSmooth));this.blend=mix(this.blend,goal,k);
  const rootFoot=view.project(h.x,h.y),dir=view.vector(this.dir.x,this.dir.y),lead=cfg.stride*.30/2;
  const feet=rest.map((foot,i)=>{
   const phase=((this.phase+i*.5)%1+1)%1,stance=phase<.30,old=this.legs[i],base={x:rootFoot.x+(foot.x-256)*unit*flip,y:rootFoot.y+(foot.y-470)*unit};let x,y;
   if(stance){if(!old.stance||!old.anchor||teleport){const q=view.unproject(base.x,base.y);old.anchor={x:q.x+this.dir.x*lead,y:q.y+this.dir.y*lead};}const q=view.project(old.anchor.x,old.anchor.y);x=q.x-base.x;y=q.y-base.y;}
   else{const t=(phase-.30)/.70,f=mix(-lead,lead,smooth(t));x=dir.x*f;y=dir.y*f-Math.sin(Math.PI*t)*cfg.footLift;}
   old.stance=stance;const max=cfg.maxFootTravel,scale=Math.min(1,max/(Math.hypot(x,y)||1));x*=scale*this.blend;y*=scale*this.blend;
   return Object.assign(old,{phase,x:x/unit/flip,y:y/unit,screen:{x:base.x+x,y:base.y+y},lockWorld:old.anchor});
  });this.legs=feet;const cycle=(this.phase%1)*Math.PI*2;
  return{phase:this.phase,blend:this.blend,distance:this.distance,feet,bob:Math.abs(Math.sin(cycle))*cfg.bodyBounce*this.blend,hipX:Math.sin(cycle)*cfg.torsoSway*.45*this.blend,shoulderX:-Math.sin(cycle)*cfg.torsoSway*this.blend,arm:Math.sin(cycle)*11*this.blend};
 }
}
root.ActorMotion={ContactGait,attackPose,smooth};if(typeof module!=='undefined'&&module.exports)module.exports=root.ActorMotion;
})(typeof window!=='undefined'?window:globalThis);
