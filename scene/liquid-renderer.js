(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LushRenderer=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const vert='attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
const background=`precision highp float;varying vec2 uv;uniform vec2 size;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 q=vec2(uv.x,1.-uv.y)*size;vec2 cell=floor(q/23.);vec2 f=fract(q/23.);vec2 center=vec2(hash(cell+3.),hash(cell+7.));float d=length((f-center)*23.);
float star=exp(-d*d/0.52)*step(.75,hash(cell))*(.1+.38*hash(cell+11.));
float dust=hash(floor(q*1.1))*.008;float floorLight=smoothstep(.65,1.,q.y/size.y)*step(.987,hash(floor(q/2.)))*.032;
gl_FragColor=vec4(vec3(.001,.002,.004)+vec3(.8,.88,1.)*(star+dust+floorLight),1.);}`;
const spriteVert=`attribute vec2 position;varying vec2 uv;varying vec2 pixel;uniform vec2 size;uniform vec4 rect;uniform float angle;
void main(){uv=position*.5+.5;vec2 p=position*rect.zw*.5;float c=cos(angle),s=sin(angle);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+rect.xy;pixel=p;gl_Position=vec4(p.x/size.x*2.-1.,1.-p.y/size.y*2.,0.,1.);}`;
const spriteFrag=`precision mediump float;varying vec2 uv;varying vec2 pixel;uniform vec3 portal;uniform float emerging;uniform sampler2D tex;uniform float opacity;uniform float balloon;uniform float clock;
void main(){vec2 p=uv;p.y+=sin(p.x*6.283+clock*.7)*.008*balloon;vec4 c=texture2D(tex,p);
if(balloon>.5){float mask=smoothstep(.01,.045,max(c.r,max(c.g,c.b)));float sheen=pow(max(0.,1.-abs(p.x-fract(clock*.045))/.16),3.);c.rgb+=c.rgb*sheen*.14;c.a*=mask;}
// The lower part of each sticker is contained by the sphere until it clears the lip.
float containment=1.;
if(emerging>.5){float circle=1.-smoothstep(portal.z-1.,portal.z+1.,length(pixel-portal.xy));float above=1.-smoothstep(portal.y-portal.z*.64,portal.y-portal.z*.64+2.,pixel.y);containment=max(circle,above);}
gl_FragColor=vec4(c.rgb,c.a*opacity*containment);}`;
const lens=`precision highp float;
varying vec2 uv;
uniform sampler2D scene;
uniform vec2 size,center,touch;
uniform float radius,progress,pressed,solid,flow,flowX,releaseAge,releaseEnergy;
vec3 sampleScene(vec2 p){return texture2D(scene,clamp(p,vec2(.001),vec2(.999))).rgb;}
// Trace both interfaces of a spherical dielectric into the actual scene texture.
vec2 lensUV(vec3 entry,vec3 normal,float ior){
  vec3 inside=refract(vec3(0.,0.,-1.),normal,1./ior);
  vec3 exitPoint=entry+inside*max(.001,-2.*dot(entry,inside));
  vec3 outgoing=refract(inside,-normalize(exitPoint),ior);
  vec2 projected=exitPoint.xy+outgoing.xy*((-2.20-exitPoint.z)/min(-.08,outgoing.z));
  vec2 pixel=center+mix(entry.xy,projected,mix(.62,.26,smoothstep(.62,1.,progress)))*radius;
  return vec2(pixel.x/size.x,1.-pixel.y/size.y);
}
void main(){
  vec2 q=vec2(uv.x,1.-uv.y)*size,z=(q-center)/radius;
  float r=length(z);
  vec3 outside=sampleScene(uv),color=outside;
  float compact=smoothstep(.62,1.,progress);
  color+=vec3(.10,.12,.17)*exp(-abs(r-1.)*radius/8.)*compact*.45;
  if(r<1.){
    float depth=sqrt(max(.00001,1.-r*r));
    vec3 entry=vec3(z,depth);
    vec2 touchOnSphere=clamp((touch-center)/radius,vec2(-.85,-.85),vec2(.85,-.70));
    vec2 contact=z-touchOnSphere;
    float local=exp(-dot(contact,contact)*7.);
    float release=sin(length(contact)*15.-releaseAge*19.)*exp(-releaseAge*5.5)*releaseEnergy;
    float envelope=1.-smoothstep(.80,1.,r);
    vec2 stress=contact*local*pressed*.10+vec2(z.x*z.y,-(1.-z.y*z.y))*clamp(flow,-2.,2.)*.028+vec2(-(1.-z.x*z.x),z.x*z.y)*clamp(flowX,-2.,2.)*.035;
    float pressure=pressed+exp(-releaseAge*7.)*releaseEnergy*.28;
    float dent=exp(-dot(contact,contact)/.078)*pressure*(1.-compact*.7);
    vec3 normal=normalize(vec3(z/depth-contact*dent*2.8+stress+z*release*.022,1.));
    float thickness=.03*pressed*local;
    vec2 mid=lensUV(entry,normal,1.38+thickness);
    // Dispersion follows the same optical path; no painted RGB rings.
    float split=.004+.022*pow(r,4.)+compact*.020+.006*min(abs(flow)+abs(flowX),1.);
    vec2 red=lensUV(entry,normal,1.38+thickness-split);
    vec2 blue=lensUV(entry,normal,1.38+thickness+split);
    color=vec3(sampleScene(red).r,sampleScene(mid).g,sampleScene(blue).b);
    float fresnel=.035+.965*pow(1.-normal.z,5.);
    color*=vec3(.96,.985,1.0)*(1.-.11*depth);
    color+=vec3(.008,.013,.020)*depth;
    float restTint=(1.-compact)*(.022+.032*depth);
    color+=vec3(.52,.72,.84)*restTint;
    // The supplied expanded-state reference has a denser, neutral grey core.
    vec3 compactTint=vec3(.235,.244,.26)+vec3(.035)*depth;
    // Preserve the actual coloured sticker image through the glass instead of painting over it.
float detail=smoothstep(.06,.42,max(color.r,max(color.g,color.b)));
color=mix(color,compactTint,compact*mix(.78,.16,detail));
    vec3 reflected=reflect(vec3(0.,0.,-1.),normal);
    vec2 lightShift=vec2(clamp((touch.x-center.x)/radius,-1.,1.)*.12*pressed+flowX*.05,-flow*.04);
    vec3 key=normalize(vec3(-.4+lightShift.x,-.72+lightShift.y,.58));
    float sheet=pow(max(dot(reflected,key),0.),22.);
    float narrow=pow(max(dot(reflected,normalize(vec3(.58,-.53,.62))),0.),100.);
    float rim=exp(-pow((r-.989)*radius/mix(3.1,1.1,compact),2.));
    float inner=exp(-pow((r-.964)*radius/mix(5.5,2.,compact),2.));
    float facing=clamp(.56-.43*z.y-.22*z.x,.03,1.);
    color+=vec3(.66,.77,.89)*sheet*(.13+.10*pressed);
    color+=vec3(.86,.94,1.)*narrow*.13;
    color+=vec3(.79,.88,.96)*rim*facing*.65;
    color+=vec3(.49,.58,.65)*inner*facing*(.50+.12*pressed);
    color+=vec3(.13,.21,.29)*fresnel*facing*.32;
    float shoulder=exp(-pow((r-.957)/.030,2.))*pow(max(-z.y*.9-z.x*.22,0.),2.);
    float reflectedStrip=exp(-pow((reflected.y+.70+reflected.x*.10)/.11,2.))*exp(-pow(reflected.x/.85,6.));
    color+=vec3(.48,.65,.78)*shoulder*.38;
    color+=vec3(.65,.76,.84)*reflectedStrip*(.055+.04*pressed)*(1.-compact*.8);
    // A pressure-driven depression carries its spectral rim with the contact point.
    float distanceToTouch=length(contact);
    float blueBand=exp(-pow((distanceToTouch-.35)/.082,2.));
    float cyanBand=exp(-pow((distanceToTouch-.44)/.040,2.));
    float outerLip=exp(-pow((distanceToTouch-.50)/.030,2.));
    float indentation=pressure*(1.-compact*.82)*envelope;
    color*=1.-dent*.30;
    color+=vec3(.055,.24,.72)*blueBand*indentation*.65;
    color+=vec3(.02,.64,.73)*cyanBand*indentation*.65;
    color+=vec3(.52,.52,.45)*outerLip*indentation*.28;
    // A compressed reflected scene provides moving detail along the thick edge.
    vec2 reflectionUV=vec2(.5+reflected.x*.6,.64+reflected.y*.36);
    color+=sampleScene(reflectionUV)*fresnel*.12;
    float caustic=exp(-pow((r-.93)*radius/5.,2.))*pow(max(z.y*.7+z.x*.3,0.),3.);
    color+=vec3(.035,.24,.32)*caustic*.3;
    float basalGlow=exp(-(size.y-q.y)/(size.y*.075))*(1.-compact)*(.8+.2*pressed);
    color+=vec3(.014,.38,.43)*basalGlow;
    if(solid>.5)color=vec3(.095,.12,.15)+vec3(.4,.48,.55)*rim*.6;
    float cross=max((1.-smoothstep(1.3,1.8,abs(q.x-center.x)))*(1.-smoothstep(9.,10.,abs(q.y-center.y))),(1.-smoothstep(1.3,1.8,abs(q.y-center.y)))*(1.-smoothstep(9.,10.,abs(q.x-center.x))));
    color+=vec3(.84,.88,.94)*cross*smoothstep(.8,1.,progress);
    color=mix(color,outside,smoothstep(1.-1./radius,1.,r));
  }
  gl_FragColor=vec4(color,1.);
}`;
const kinds=['speech0','mac','phoneSticker','star','plane','code','planet','bolt','speech1','star','mac','plane','speech2','phoneSticker','planet','code','bolt','star','plane','speech3','mac','planet','phoneSticker','star','speech0','bolt','planet','code','speech2','star'];

// A time-staggered stream. Every cycle starts below the centre of the same lens.
// No pre-scattered starting positions: birth -> rolling at the lip -> free flight.
function stickerPose(i,key,age,G,w,h,m){
 const interval=.15,life=kinds.length*interval;
 const elapsed=age-i*interval;if(elapsed<0)return null;
 const a=elapsed%life,t=a/life,exit=.20;
 const inside=Math.min(1,t/exit),flight=Math.max(0,(t-exit)/(1-exit));
 const seed=i*2.39996323,lane=Math.sin(seed);
 const lipX=lane*G.r*.38;
 const travel=Math.min(h*.59,620);
 const rise=travel*flight;
 const fan=(Math.min(w*.35,195)*Math.pow(flight,.75));
 const x=G.cx+lipX+Math.sin(seed+flight*2.1)*fan+Math.sin(inside*Math.PI)*G.r*.12;
 const y=G.cy+G.r*(.32-1.24*inside)-rise;
 const scale=(w<350?.87:1)*(.46+.54*Math.min(1,inside*1.3));
 const width=(key.startsWith('speech')?72:key==='phoneSticker'?43:key==='star'?29:54)*scale;
 const height=width*(key==='phoneSticker'?1.47:key.startsWith('speech')?.7:1);
 const roll=(1-Math.min(1,inside))*Math.PI*1.2*(i%2?1:-1);
 const angle=lane*.65+roll+flight*Math.sin(seed)*1.3+Math.sin(m.clock*.6+i)*.06;
 const opacity=Math.min(1,a/.12)*Math.min(1,(1-t)/.12)*Math.max(0,Math.min(1,(G.p-.60)/.32));
 return {x,y,w:width,h:height,angle,opacity,t,emerging:t<.37?1:0};
}
class Renderer{
 constructor(canvas,options={}){this.canvas=canvas;this.options=options;const g=this.gl=canvas.getContext('webgl',{alpha:false,antialias:false});if(!g)throw Error('WEBGL_UNAVAILABLE');this.resources=[];this.textures={};this.bg=this.program(vert,background);this.lens=this.program(vert,lens);this.sprite=this.program(spriteVert,spriteFrag);this.buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);this.texture=this.newTexture();this.fbo=g.createFramebuffer();this.readyCount=0;this.loadAssets();}
 program(v,f){const g=this.gl,p=g.createProgram();for(const [type,src]of[[g.VERTEX_SHADER,v],[g.FRAGMENT_SHADER,f]]){const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));g.attachShader(p,s);g.deleteShader(s);}g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));this.resources.push(p);return p;}
 newTexture(){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}
 upload(key,image){if(this.dead)return;const g=this.gl,t=this.newTexture();g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);this.textures[key]={texture:t,w:image.width,h:image.height};this.readyCount++;}
 loadAssets(){const factory=this.options.createImage||(()=>new Image()),base=this.options.assetBase||'../miniprogram-liquid-candidate/assets/';for(const key of ['logo',...new Set(kinds.filter(k=>!k.startsWith('speech'))) ]){const img=factory();img.onload=()=>{try{this.upload(key,img);}catch(e){this.assetError=String(e);}};img.onerror=()=>{this.assetError='ASSET_UNAVAILABLE: '+key;};img.src=key==='logo'?base+'lush-wordmark-mobile.png':base+'scene/'+key+'.png';}
 if(this.options.createTextCanvas){['去创造','灵感来了','设计日常','把想法做出来'].forEach((label,i)=>{const c=this.options.createTextCanvas();c.width=256;c.height=180;const x=c.getContext('2d');x.fillStyle='#f3f3ed';x.strokeStyle='#16181b';x.lineWidth=5;x.beginPath();x.moveTo(22,20);x.quadraticCurveTo(126,0,232,22);x.quadraticCurveTo(255,60,229,130);x.lineTo(249,164);x.lineTo(192,146);x.quadraticCurveTo(70,178,20,133);x.quadraticCurveTo(0,75,22,20);x.fill();x.stroke();x.fillStyle='#171a1d';x.textAlign='center';x.textBaseline='middle';x.font=(i===3?'25':'32')+'px sans-serif';x.fillText(label,127,82);this.upload('speech'+i,c);});}}
 use(p){const g=this.gl;g.useProgram(p);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);const a=g.getAttribLocation(p,'position');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);g.uniform2f(g.getUniformLocation(p,'size'),this.w,this.h);}
 resize(w,h,dpr=1){this.w=w;this.h=h;const g=this.gl,s=Math.min(dpr,1.5);this.canvas.width=Math.round(w*s);this.canvas.height=Math.round(h*s);g.bindTexture(g.TEXTURE_2D,this.texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,this.canvas.width,this.canvas.height,0,g.RGBA,g.UNSIGNED_BYTE,null);g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.texture,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('FRAMEBUFFER_INCOMPLETE');g.bindFramebuffer(g.FRAMEBUFFER,null);}
 image(key,x,y,w,h,angle,opacity,balloon,m,pose=null,G=null){const t=this.textures[key];if(!t||opacity<=0)return;const g=this.gl,p=this.sprite;this.use(p);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,t.texture);g.uniform1i(g.getUniformLocation(p,'tex'),0);g.uniform3f(g.getUniformLocation(p,'portal'),G?G.cx:0,G?G.cy:0,G?G.r:1);g.uniform1f(g.getUniformLocation(p,'emerging'),pose?pose.emerging:0);g.uniform4f(g.getUniformLocation(p,'rect'),x,y,w,h);for(const[k,v]of Object.entries({angle,opacity,balloon,clock:m.clock}))g.uniform1f(g.getUniformLocation(p,k),v);g.drawArrays(g.TRIANGLES,0,6);}
 draw(m){const g=this.gl,G=m.geometry(this.w,this.h),p=G.p;g.viewport(0,0,this.canvas.width,this.canvas.height);g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.disable(g.BLEND);this.use(this.bg);g.drawArrays(g.TRIANGLES,0,6);
 g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
 const logoW=Math.min(this.w*.92,490)*.8*(1+.024*Math.sin(m.clock*1.3))*(1-p*.13);const logoH=logoW*247/640;
 this.image('logo',this.w*.5,this.h*.435-p*this.h*.1,logoW,logoH,-.018*Math.sin(m.clock*.9),m.reduced?0:Math.pow(1-p,1.5),1,m);
 if(!m.reduced){kinds.forEach((key,i)=>{const pose=stickerPose(i,key,m.revealAge,G,this.w,this.h,m);if(pose)this.image(key,pose.x,pose.y,pose.w,pose.h,pose.angle,pose.opacity,0,m,pose,G);});}
 g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,null);const program=this.lens;this.use(program);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.texture);g.uniform1i(g.getUniformLocation(program,'scene'),0);g.uniform2f(g.getUniformLocation(program,'center'),G.cx,G.cy);g.uniform2f(g.getUniformLocation(program,'touch'),m.pointer?m.pointer.x:G.cx,m.pointer?m.pointer.y:G.cy);for(const[k,v]of Object.entries({radius:G.r,progress:p,speed:m.v,pressed:m.press,solid:m.reduced?1:0,clock:m.clock,flow:m.flow,flowX:m.flowX,releaseAge:m.releaseAge,releaseEnergy:m.releaseEnergy}))g.uniform1f(g.getUniformLocation(program,k),v);g.drawArrays(g.TRIANGLES,0,6);}
 destroy(){this.dead=true;const g=this.gl;this.resources.forEach(p=>g.deleteProgram(p));Object.values(this.textures).forEach(t=>g.deleteTexture(t.texture));g.deleteBuffer(this.buffer);g.deleteTexture(this.texture);g.deleteFramebuffer(this.fbo);}
}
return {Renderer,stickerPose,stickerKinds:kinds};
});
