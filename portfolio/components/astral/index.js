const ABOUT_STICKERS=[
  {key:'star',w:25,ht:25,left:8,top:14,delay:60,opacity:.22,dx:3,dy:-2,rotation:-8},
  {key:'planet',w:44,ht:44,left:82,top:19,delay:210,opacity:.14,dx:-4,dy:3,rotation:5},
  {key:'plane',w:50,ht:50,left:9,top:88,delay:660,opacity:.12,dx:3,dy:-3,rotation:-7},
  {key:'code',w:36,ht:36,left:83,top:89,delay:810,opacity:.18,dx:-3,dy:2,rotation:4}
];
Component({
  properties:{quiet:Boolean},
  data:{items:ABOUT_STICKERS.map((s,i)=>({id:i,src:'/assets/scene/'+s.key+'.png',style:`left:${s.left}%;top:${s.top}%;width:${s.w*1.35}rpx;height:${s.ht*1.35}rpx;animation:astral-in 1050ms cubic-bezier(.23,1,.32,1) ${s.delay}ms both,astral-drift 20s ease-in-out ${s.delay+1050}ms infinite alternate;`,rotation:`transform:rotate(${s.rotation}deg)`}))}
});
