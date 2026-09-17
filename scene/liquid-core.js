(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LushLiquid=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const rubber=(value,min,max,range)=>{const edge=clamp(value,min,max),over=value-edge;return edge+over*.22/(1+Math.abs(over)/range);};
  class Motion {
    constructor(reduced=false){this.reduced=reduced;this.reset();}
    reset(){this.p=0;this.v=0;this.side=0;this.sideV=0;this.flowX=0;this.target=0;this.drag=null;this.press=0;this.pressTarget=0;this.flow=0;this.pointer=null;this.releaseAge=10;this.releaseEnergy=0;this.clock=0;this.revealAge=0;this.state=this.reduced?'reduced':'idle';}
    setTarget(n,instant=false){this.target=n;this.drag=null;if(this.reduced||instant){this.p=n;this.v=0;this.side=0;this.sideV=0;this.state=this.reduced?'reduced':n?'revealed':'idle';}else this.state='settling';}
    down(x,y,ms,id,h,w=h*.462){
      if(this.drag||this.state==='entered'||this.state==='error')return;
      this.drag={x,y,p:this.p,side:this.side,id,lastT:ms,velocity:0,velocityX:0,moved:false,vertical:false,distance:h*.50,width:w,oldTarget:this.target,history:[{x,y,t:ms}]};
      this.pointer={x,y};this.v=0;this.sideV=0;this.press=Math.max(this.press,.12);this.pressTarget=1;this.state=this.reduced?'reduced':'pressed';
    }
    move(x,y,ms,id){
      const d=this.drag;if(!d||d.id!==id)return;this.pointer={x,y};d.history.push({x,y,t:ms});
      while(d.history.length>2&&ms-d.history[0].t>80)d.history.shift();
      const first=d.history[0],time=Math.max(8,ms-first.t);
      d.velocity=clamp((first.y-y)/time*1000/d.distance,-3,3);
      d.velocityX=clamp((x-first.x)/time*1000,-1200,1200);d.lastT=ms;
      const dx=x-d.x,dy=d.y-y;
      d.moved=d.moved||Math.hypot(dx,dy)>4;
      d.vertical=Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*.4;
      if(d.moved&&!this.reduced){
        this.p=rubber(d.p+dy/d.distance,0,1,.2);
        this.side=rubber(d.side+dx,-d.width*.24,d.width*.24,d.width*.25);
        this.v=d.velocity;this.sideV=d.velocityX;this.state='dragging';
      }
    }
    release(ms,cancel=false){
      const d=this.drag;if(!d)return;this.drag=null;this.pressTarget=0;this.releaseAge=0;
      const stale=ms-d.lastT>100;
      this.sideV=cancel||stale?0:d.velocityX;
      this.releaseEnergy=cancel?0:Math.min(1,.25+Math.abs(d.velocity)*.18+Math.abs(this.sideV)/2400);
      if(cancel){this.v=0;this.setTarget(d.oldTarget);return;}
      if(!d.moved||this.reduced){this.setTarget(this.target?0:1);return;}
      this.v=stale?0:d.velocity;
      // Horizontal exploration returns home without opening the welcome flow.
      this.setTarget(d.vertical?(this.p+this.v*.12>.45?1:0):d.oldTarget);
    }
    step(dt){
      dt=clamp(dt,0,.05);this.press+=(this.pressTarget-this.press)*(1-Math.exp(-16*dt));
      this.flow+=(this.v-this.flow)*(1-Math.exp(-12*dt));
      this.flowX+=(this.sideV/400-this.flowX)*(1-Math.exp(-12*dt));this.releaseAge+=dt;
      if(!this.reduced)this.clock+=dt;
      if(this.p>.985&&!this.reduced)this.revealAge+=dt;else if(this.p<.60)this.revealAge=0;
      if(this.state!=='settling')return;
      let left=dt;
      while(left>0){const t=Math.min(left,1/120);this.v+=((this.target-this.p)*150-this.v*23)*t;this.p+=this.v*t;this.sideV+=(-this.side*180-this.sideV*22)*t;this.side+=this.sideV*t;left-=t;}
      if(Math.abs(this.p-this.target)<.0005&&Math.abs(this.v)<.004&&Math.abs(this.side)<.05&&Math.abs(this.sideV)<.15){this.p=this.target;this.v=0;this.side=0;this.sideV=0;this.state=this.target?'revealed':'idle';}
    }
    geometry(w,h){const p=clamp(this.p);if(this.reduced||this.state==='error')return {cx:w*.5,cy:h*.54,r:72,p};return {cx:w*.5+this.side,cy:h-h*.50*this.p,r:Math.min(w*.61,h*.33)*(1-p)+Math.min(48,w*.105)*p,p};}
    enter(){this.drag=null;this.v=0;this.sideV=0;this.state='entered';}
    fail(){this.drag=null;this.v=0;this.sideV=0;this.state='error';}
  }
  return {Motion,clamp};
});
