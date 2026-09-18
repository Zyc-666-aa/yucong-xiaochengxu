const {createNativeGlass}=require('../../glass-scene');
const {getWindowInfo,getCapsuleRect,getViewportInfo}=require('../../../utils/runtime');
Page({
 data:{top:72,on:true,failed:false,controlWidth:64,controlHeight:44,platformClass:'mobile',viewportClass:'phone'},
 onLoad(){this._disposed=false;const info=getWindowInfo();this.info=info;const cap=getCapsuleRect(info);this.setData({top:(cap.bottom||info.statusBarHeight+32)+16,...getViewportInfo(info)});},
 onReady(){this.init();},
 init(){wx.createSelectorQuery().in(this).select('#glassCanvas').fields({node:true,size:true,rect:true}).exec(r=>{if(this._disposed)return;try{const box=r[0];if(!box||!box.node)throw Error('Canvas unavailable');this.box=box;this.scene=createNativeGlass(box.node,{pixelRatio:this.info.pixelRatio,on:this.data.on,mode:this.info.theme==='light'?'light':'dark',createCanvas:()=>wx.createOffscreenCanvas({type:'2d',width:512,height:512}),onError:()=>this.fail()});this.scene.resize(box.width,box.height);this.scene.setSize(1);const foot=this.scene.measureSwitch();this.setData({controlWidth:Math.max(44,foot.width),controlHeight:Math.max(44,foot.height)});}catch(error){this.fail();}});},
 toggle(){const on=!this.data.on;this.setData({on});if(this.scene)this.scene.setOn(on);},
 pointer(e){const p=e.touches[0],b=this.box;if(p&&b&&this.scene)this.scene.setPointer(Math.max(-1,Math.min(1,(p.clientX-b.left)/b.width*2-1)),Math.max(-1,Math.min(1,1-(p.clientY-b.top)/b.height*2)));},
 resetPointer(){if(this.scene)this.scene.setPointer(0,0);},
 fail(){this.release();if(!this._disposed)this.setData({failed:true});},
 retry(){this.setData({failed:false},()=>wx.nextTick(()=>this.init()));},
 release(){if(this.scene){try{this.scene.dispose();}catch(error){}this.scene=null;}},
 onHide(){this.release();},
 onShow(){if(this.box&&!this.scene&&!this.data.failed)wx.nextTick(()=>this.init());},
 onResize(){this.release();if(!this.data.failed)wx.nextTick(()=>this.init());},
 onUnload(){this._disposed=true;this.release();},
 back(){wx.navigateBack({fail:()=>wx.redirectTo({url:'/portfolio/pages/main/index'})});}
});
