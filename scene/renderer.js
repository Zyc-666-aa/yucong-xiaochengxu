const { Motion, clamp, STICKERS } = require('./motion');
const shaders = require('./shaders');
const assets = require('./assets');
const spriteVertex = 'attribute vec2 a;uniform vec2 size;uniform vec4 rect;uniform float angle;uniform float scale;varying vec2 uv;void main(){uv=a;vec2 p=(a-.5)*rect.zw*scale;float c=cos(angle),s=sin(angle);p=vec2(p.x*c-p.y*s,p.x*s+p.y*c)+rect.xy+rect.zw*.5;gl_Position=vec4(p.x/size.x*2.-1.,1.-p.y/size.y*2.,0.,1.);}';
const spriteFragment = 'precision mediump float;uniform sampler2D tex;uniform float opacity;uniform float screen;varying vec2 uv;void main(){vec4 c=texture2D(tex,uv);gl_FragColor=screen>.5?vec4(c.rgb*opacity,c.a*opacity):vec4(c.rgb,c.a*opacity);}';
class Scene {
  constructor(canvas, options = {}) {
    this.canvas = canvas; this.options = options; this.motion = new Motion(options.reduced);
    this.textures = {}; this.resources = []; this.running = false; this.last = 0;
    this.gl = canvas.getContext('webgl', { alpha:false, antialias:false, powerPreference:'low-power' });
    if (!this.gl) throw new Error('WEBGL_UNAVAILABLE');
    this.background = this.program(shaders.vertex, shaders.fragment);
    this.sprites = this.program(spriteVertex, spriteFragment);
    this.bgUniforms = this.uniforms(this.background,['res','size','center','radius','progress','time']);
    this.spUniforms = this.uniforms(this.sprites,['size','rect','angle','scale','tex','opacity','screen']);
    this.bgBuffer = this.buffer([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
    this.spBuffer = this.buffer([0,0,1,0,0,1,0,1,1,0,1,1]);
    this.metrics = { frames:0, longFrames:0, maxFrame:0 };
  }
  program(vs, fs) {
    const gl=this.gl, p=gl.createProgram(); this.resources.push(['program',p]);
    [ [gl.VERTEX_SHADER,vs], [gl.FRAGMENT_SHADER,fs] ].forEach(([type,src])=>{
      const shader=gl.createShader(type); this.resources.push(['shader',shader]); gl.shaderSource(shader,src); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(p,shader);
    });
    gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  uniforms(p,names) { const u={}; names.forEach(n=>u[n]=this.gl.getUniformLocation(p,n)); return u; }
  buffer(data) { const gl=this.gl,b=gl.createBuffer();this.resources.push(['buffer',b]);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return b; }
  bind(p,b) { const gl=this.gl;gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,b);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0); }
  loadOne(key, src) {
    return new Promise((resolve,reject)=>{
      const img=this.canvas.createImage();let settled=false;
      const finish=error=>{if(settled)return;settled=true;clearTimeout(timeout);img.onload=null;img.onerror=null;error?reject(error):resolve();};
      const timeout=setTimeout(()=>finish(new Error('ASSET_LOAD_TIMEOUT: '+key)),12000);
      img.onload=()=>{
        if(this.destroyed) {finish();return;}
        try {
        const gl=this.gl,t=gl.createTexture();this.resources.push(['texture',t]);gl.bindTexture(gl.TEXTURE_2D,t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        this.textures[key]=t;finish();
        } catch(error) {finish(error);}
      };
      img.onerror=()=>finish(new Error('ASSET_LOAD_FAILED: '+key));
      img.src=this.options.resolveAsset?this.options.resolveAsset(src):src;
    });
  }
  load() {
    const sources=Object.keys(assets).map(k=>[k,assets[k].src]);
    sources.push(['logo','/assets/lush-wordmark-mobile.png']);
    ['heading','hint','button','plus'].forEach(k=>sources.push([k,'/assets/scene/'+k+'.png']));
    return Promise.all(sources.map(([k,src])=>this.loadOne(k,src)));
  }
  resize(width,height,dpr=2,safeBottom=0) {
    this.scale=width/390;this.h=height/this.scale;this.safeBottom=safeBottom/this.scale;
    const ratio=Math.min(dpr,2);this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);
  }
  sprite(key,x,y,w,h,opacity=1,angle=0,scale=1,screen=false) {
    if(opacity<.001||!this.textures[key])return;
    const gl=this.gl,u=this.spUniforms;
    gl.blendFunc(screen?gl.ONE:gl.SRC_ALPHA,screen?gl.ONE_MINUS_SRC_COLOR:gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(u.rect,x,y,w,h);gl.uniform1f(u.angle,angle);gl.uniform1f(u.scale,scale);gl.uniform1f(u.opacity,opacity);gl.uniform1f(u.screen,screen?1:0);
    gl.bindTexture(gl.TEXTURE_2D,this.textures[key]);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  draw() {
    const gl=this.gl,m=this.motion,h=this.h,g=m.geometry(h),t=g.t,u=this.bgUniforms;
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.disable(gl.BLEND);this.bind(this.background,this.bgBuffer);
    gl.uniform2f(u.res,this.canvas.width,this.canvas.height);gl.uniform2f(u.size,390,h);gl.uniform2f(u.center,g.cx,g.cy);
    gl.uniform1f(u.radius,g.radius);gl.uniform1f(u.progress,t);gl.uniform1f(u.time,m.reduced?0:m.clock);gl.drawArrays(gl.TRIANGLES,0,6);
    this.bind(this.sprites,this.spBuffer);gl.enable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(this.spUniforms.tex,0);gl.uniform2f(this.spUniforms.size,390,h);
    this.sprite('logo',67,h*.36-t*85,256,256*780/2017,clamp(1-t*2.3),0,1-t*.13,true);
    for(const s of STICKERS) {const f=m.sticker(s,h,g);this.sprite(s.key,f.x,f.y,s.w,s.ht,f.opacity,f.angle,f.scale);}
    this.sprite('plus',g.cx-11,g.cy-11,22,22,clamp((t-.68)/.32),0,m.drag?.985:1);
    this.sprite('hint',105,h-116,180,30,clamp(1-t*4));
    const reveal=clamp((t-.52)/.3),heading=clamp((t-.58)/.22),action=clamp((t-.69)/.26),move=m.reduced?0:1;
    this.sprite('heading',15,h*.68+(1-reveal)*18*move+(1-heading)*12*move,360,75,reveal*heading,0,.97+heading*.03);
    this.buttonY=h-Math.max(42,this.safeBottom+16)-54;
    this.sprite('button',47,this.buttonY+(1-reveal)*18*move+(1-action)*18*move,296,54,reveal*action,0,(.97+action*.03)*(this.pressed?.97:1));
    const ready=t>=.985 && !m.drag;
    if(ready!==this.ready) {this.ready=ready;this.options.onReadyState?.(ready);}
  }
  start() {
    if(this.running||this.destroyed)return;this.running=true;this.last=0;
    const tick=ms=>{
      if(!this.running||this.destroyed)return;
      const delta=this.last?ms-this.last:16;this.last=ms;
      this.metrics.frames++;if(delta>34)this.metrics.longFrames++;this.metrics.maxFrame=Math.max(this.metrics.maxFrame,delta);
      this.motion.step(delta/1000);this.draw();this.raf=this.canvas.requestAnimationFrame(tick);
    };
    this.raf=this.canvas.requestAnimationFrame(tick);
  }
  pause() {this.running=false;if(this.raf!==undefined)this.canvas.cancelAnimationFrame(this.raf);this.raf=undefined;this.last=0;}
  touchDown(x,y,ms,id) {
    const g=this.motion.geometry(this.h),sx=x/this.scale,sy=y/this.scale;
    if(g.t<.01 ? sy<this.h-260 : Math.hypot(sx-g.cx,sy-g.cy)>Math.min(g.radius,325))return;
    this.motion.down(sx,sy,ms,id);
  }
  touchMove(x,y,ms,id) {this.motion.move(x/this.scale,y/this.scale,ms,id);}
  touchEnd(ms,cancel=false) {this.motion.release(ms,cancel);}
  destroy() {
    this.pause();this.destroyed=true;
    const gl=this.gl;
    for(const [kind,obj] of this.resources) {if(kind==='texture')gl.deleteTexture(obj);if(kind==='buffer')gl.deleteBuffer(obj);if(kind==='program')gl.deleteProgram(obj);if(kind==='shader')gl.deleteShader(obj);}
    this.resources=[];this.textures={};
  }
}
module.exports = { Scene };
