/* Original configurable action windows; not measured timings from another game. */
(function(root){'use strict';
class ActionClock{
 constructor(kind,timing,release){this.kind=kind;this.timing=timing;this.time=0;this.total=timing.windup+timing.active+timing.recovery;this.release=release;this.released=false;this.cancelled=false;this.done=false;this.phase='windup';}
 update(dt){if(this.done||this.cancelled)return;this.time=Math.min(this.total,this.time+dt);if(!this.released&&this.time>=this.timing.windup){this.released=true;this.release();}this.phase=this.time<this.timing.windup?'windup':this.time<this.timing.windup+this.timing.active?'active':'recovery';if(this.time>=this.total){this.done=true;this.phase='idle';}}
 cancel(){this.cancelled=true;this.done=true;this.phase='idle';}
 get remaining(){return Math.max(0,this.total-this.time);}
}
root.ActionClock=ActionClock;if(typeof module!=='undefined'&&module.exports)module.exports=ActionClock;
})(typeof window!=='undefined'?window:globalThis);
