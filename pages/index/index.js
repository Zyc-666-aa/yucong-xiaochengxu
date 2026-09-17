const {Motion}=require('../../scene/liquid-core');
const {Renderer}=require('../../scene/liquid-renderer');
Page({
 data:{phase:'idle',ready:false,failed:false,leaving:false,hint:'上滑展开，或点击球体'},
 onLoad(){this.motion=new Motion(false);this.hidden=false;},
 onReady(){this.initScene();},
 onShow(){this.hidden=false;if(this.canvas)this.startLoop();},
 onHide(){this.hidden=true;this.motion.release(Date.now(),true);this.stopLoop();},
 onUnload(){this.stopLoop();if(this.renderer)this.renderer.destroy();},
 onResize(){if(this.canvas)this.resizeScene();},
 initScene(){wx.createSelectorQuery().in(this).select('#liquidCanvas').fields({node:true,size:true}).exec(res=>{
  try{if(!res[0]||!res[0].node)throw Error('CANVAS_UNAVAILABLE');this.canvas=res[0].node;this.renderer=new Renderer(this.canvas,{assetBase:'/assets/',createImage:()=>this.canvas.createImage(),createTextCanvas:()=>wx.createOffscreenCanvas({type:'2d',width:256,height:180})});this.resizeScene();this.startLoop();}catch(e){this.failScene();}
 });},
 resizeScene(){const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();this.w=info.windowWidth;this.h=info.windowHeight;try{this.renderer.resize(this.w,this.h,info.pixelRatio);}catch(e){this.failScene();}},
 failScene(){this.stopLoop();this.motion.fail();this.setData({phase:'error',failed:true,ready:true,hint:'可直接查看作品'});},
 startLoop(){if(this.raf||this.hidden||!this.canvas||this.data.failed)return;this.last=0;const frame=()=>{this.raf=null;if(this.hidden)return;const now=Date.now();this.motion.step(this.last?Math.min((now-this.last)/1000,.05):1/60);this.last=now;try{this.renderer.draw(this.motion);}catch(e){this.failScene();return;}this.syncState();this.raf=this.canvas.requestAnimationFrame(frame);};this.raf=this.canvas.requestAnimationFrame(frame);},
 stopLoop(){if(this.raf&&this.canvas)this.canvas.cancelAnimationFrame(this.raf);this.raf=null;},
 syncState(){const phase=this.motion.state,ready=phase==='revealed'||(this.motion.target===1&&this.motion.p>.985)||phase==='error',hint=this.motion.drag?(this.motion.drag.vertical?'松手展开':'左右拖动，松手归位'):'左右轻拨 · 上滑展开';if(phase!==this.data.phase||ready!==this.data.ready||hint!==this.data.hint)this.setData({phase,ready,hint});},
 touchStart(e){if(this.data.failed)return;const t=e.touches[0];if(!t)return;const g=this.motion.geometry(this.w,this.h);if(Math.hypot(t.clientX-g.cx,t.clientY-g.cy)>g.r)return;this.motion.down(t.clientX,t.clientY,Date.now(),t.identifier,this.h,this.w);this.syncState();},
 touchMove(e){const d=this.motion.drag;if(!d)return;const t=e.touches.find(t=>t.identifier===d.id);if(t)this.motion.move(t.clientX,t.clientY,Date.now(),t.identifier);},
 touchEnd(){this.motion.release(Date.now());this.syncState();},
 touchCancel(){this.motion.release(Date.now(),true);this.syncState();},
 startPortfolio(){if(this.data.leaving)return;this.motion.enter();this.stopLoop();this.setData({phase:'entered',leaving:true});setTimeout(()=>wx.navigateTo({url:'/portfolio/pages/main/index',success:()=>{this.motion.reset();this.setData({leaving:false,ready:false,phase:this.motion.state});},fail:()=>{this.setData({leaving:false,ready:true});this.motion.setTarget(1,true);this.startLoop();}}),180);}
});
