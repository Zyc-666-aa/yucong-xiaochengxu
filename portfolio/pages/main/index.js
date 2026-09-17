const content = require('../../data');
const orderedItems = content.items.slice().sort((a,b)=>a.id==='lush'?-1:b.id==='lush'?1:0);
const {getWindowInfo, getCapsuleRect, getBottomInset} = require('../../../utils/runtime');
const contact = content.contact;
const resume = content.resume;
const contactValue = () => [contact.phone && ('电话：' + contact.phone), contact.wechat && ('微信：' + contact.wechat), contact.email && ('邮箱：' + contact.email)].filter(Boolean).join('\n');
const resumeValue = () => [resume.name + ' / ' + resume.english, resume.role, '方向：' + resume.focus.join(' / '), resume.summary, contactValue(), resume.note].filter(Boolean).join('\n');
const safePhone = value => String(value || '').replace(/[^\d+]/g, '');
const knowledgeViewNode = node => node && node.id !== 'root' ? {...node,linkNodes:(node.links || []).map(id => content.knowledge.nodes.find(item => item.id === id)).filter(Boolean)} : node;

Page({
  data: {section:'work',sectionTitle:'作品',category:'项目经历',categories:['项目经历','设计作品','UI设计','VIBE CODING'],items:orderedItems,shown:orderedItems,sections:content.sections,contact:content.contact,resume:content.resume,lab:content.lab,designFlow:content.designFlow,labIndex:0,labFocus:content.lab[0],labImageKey:'lab-0',archive:content.archive,knowledge:false,knowledgeNode:content.knowledge,knowledgeNodes:content.knowledge.nodes,knowledgeTrail:[],menu:false,sheetLeaving:false,info:null,infoLeaving:false,infoImageFailed:false,failedImages:{},dockOrbFailed:false,aboutOrb:{dragX:0,dragY:0,shiftX:0,shiftY:0,tilt:0,dragging:false},contentTop:88,bottom:24,scrollTop:0},

  onLoad() {
    this._timers = new Set();
    this._positions = {};
    const info = getWindowInfo();
    const cap = getCapsuleRect(info);
    this.setData({contentTop:(cap.bottom || info.statusBarHeight + 32) + 16,bottom:Math.max(16,getBottomInset(info)),vibeMethod:content.vibeMethod});
    if (typeof wx.showShareMenu === 'function') wx.showShareMenu({withShareTicket:true});
  },

  later(fn, ms) { const id = setTimeout(() => { this._timers.delete(id); fn(); }, ms); this._timers.add(id); },
  onScroll(e) { this._positions[this.data.section] = e.detail.scrollTop; },
  selectCategory(e) { const category=e.currentTarget.dataset.category; const filterCategory=category==='项目经历'?'全部':category==='设计作品'?'平面设计':category; this.setData({category,shown:filterCategory==='全部'?this.data.items:this.data.items.filter(i=>i.category===filterCategory)}); },
  openProject(e) { const id=e.currentTarget.dataset.id; if(!content.items.some(i=>i.id===id)||this._navigating)return; this._navigating=true; wx.navigateTo({url:'/portfolio/pages/detail/index?id='+id,complete:()=>{this._navigating=false;}}); },
  switchSection(e) { const id=typeof e==='string'?e:e.currentTarget.dataset.id; const section=content.sections.find(s=>s.id===id); if(!section)return; this.setData({section:id,sectionTitle:section.label,scrollTop:this._positions[id]||0,menu:false,sheetLeaving:false,info:null}); },
  works() { this.switchSection('work'); },
  about() { this.switchSection('about'); },
  aboutOrbTouchStart(e) {
    const t=e.touches && e.touches[0];
    if(!t)return;
    this._aboutOrbTouch={x:t.clientX,y:t.clientY};
    this.setData({'aboutOrb.dragging':true});
  },
  aboutOrbTouchMove(e) {
    const t=e.touches && e.touches[0],start=this._aboutOrbTouch;
    if(!t||!start)return;
    const x=Math.max(-16,Math.min(16,t.clientX-start.x)),y=Math.max(-16,Math.min(16,t.clientY-start.y));
    this.setData({'aboutOrb.dragX':x,'aboutOrb.dragY':y,'aboutOrb.shiftX':Number((x*.18).toFixed(1)),'aboutOrb.shiftY':Number((y*.18).toFixed(1)),'aboutOrb.tilt':Number((x*.18).toFixed(1))});
  },
  aboutOrbTouchEnd() {
    this._aboutOrbTouch=null;
    this.setData({'aboutOrb.dragX':0,'aboutOrb.dragY':0,'aboutOrb.shiftX':0,'aboutOrb.shiftY':0,'aboutOrb.tilt':0,'aboutOrb.dragging':false});
  },
  openGlassLab() { wx.navigateTo({url:'/effects/pages/glass/index',fail:()=>wx.showToast({title:'界面效果暂时无法打开',icon:'none'})}); },
  openMenu() { this._menuRevision=(this._menuRevision||0)+1; this.setData({menu:true,sheetLeaving:false}); },
  closeMenu() { if(this.data.sheetLeaving)return; this.setData({sheetLeaving:true}); const revision=this._menuRevision; this.later(()=>{if(revision===this._menuRevision)this.setData({menu:false,sheetLeaving:false});},180); },
  selectStep(e) { const index=Number(e.currentTarget.dataset.index); if(content.lab[index])this.setData({labIndex:index,labFocus:content.lab[index],labImageKey:'lab-'+index}); },
  imageError(e) { const id=e.currentTarget.dataset.imageId; if(id)this.setData({['failedImages.'+id]:true}); },
  dockOrbError() { this.setData({dockOrbFailed:true}); },
  infoImageError() { this.setData({infoImageFailed:true}); },
  showInfo(info) { this._infoRevision=(this._infoRevision||0)+1; this.setData({info,infoLeaving:false,infoImageFailed:false}); },
  openArchive(e) { const item=content.archive.find(x=>x.id===e.currentTarget.dataset.id); if(item)this.showInfo({title:item.title,body:item.note,image:item.image,archiveId:item.id}); },
  collaboration() { this.showInfo({title:'简历预览',body:resumeValue(),archiveId:'resume',resumeReady:true,resumeValue:resumeValue()}); },
  contact() { const value=contactValue(); this.showInfo({title:'联系入口',body:value||'联系信息尚未配置。',archiveId:'contact',contactReady:!!value,contactValue:value}); },
  openKnowledge() { this.setData({knowledge:true,knowledgeNode:content.knowledge,knowledgeNodes:content.knowledge.nodes,knowledgeTrail:[]}); },
  copyObsidianLink() { this.copyText(content.knowledge.obsidianUri,'已复制 Obsidian 索引链接','复制失败，请手动记录'); },
  closeKnowledge() { this.setData({knowledge:false,knowledgeNode:content.knowledge,knowledgeTrail:[]}); },
  selectKnowledgeNode(e) {
    const id=e.currentTarget.dataset.id;
    const node=content.knowledge.nodes.find(item=>item.id===id);
    if(!node)return;
    const current=this.data.knowledgeNode;
    const trail=(this.data.knowledgeTrail||[]).slice();
    if(current&&current.id!=='root')trail.push(current.id);
    this.setData({knowledgeNode:knowledgeViewNode(node),knowledgeTrail:trail});
  },
  backKnowledge() {
    const trail=this.data.knowledgeTrail||[];
    const current=this.data.knowledgeNode;
    if(trail.length){
      const id=trail[trail.length-1];
      const node=content.knowledge.nodes.find(item=>item.id===id)||content.knowledge;
      this.setData({knowledgeNode:knowledgeViewNode(node),knowledgeTrail:trail.slice(0,-1)});
    } else if(current&&current.id!=='root') {
      this.setData({knowledgeNode:content.knowledge,knowledgeTrail:[]});
    } else {
      this.closeKnowledge();
    }
  },
  copyText(value, successTitle, failureTitle) {
    if(!value){wx.showToast({title:'信息尚未配置',icon:'none'});return;}
    wx.setClipboardData({data:value,success:()=>wx.showToast({title:successTitle,icon:'none'}),fail:()=>wx.showToast({title:failureTitle || '复制失败',icon:'none'})});
  },
  copyContact() { this.copyText(this.data.info && this.data.info.contactValue,'已复制联系信息','复制失败，请手动选择'); },
  copyContactPart(e) { const kind=e.currentTarget.dataset.kind; const value=contact[kind]; const label=kind==='phone'?'电话':kind==='wechat'?'微信号':'邮箱'; this.copyText(value,'已复制'+label,'复制失败，请手动选择'); },
  callPhone() {
    const phone=safePhone(contact.phone);
    if(!phone){wx.showToast({title:'电话号码尚未配置',icon:'none'});return;}
    wx.makePhoneCall({phoneNumber:phone,fail:()=>wx.showToast({title:'无法拨号，请复制号码',icon:'none'})});
  },
  copyResume() { this.copyText(this.data.info && this.data.info.resumeValue,'已复制简历摘要','复制失败，请手动选择'); },
  exportResume() {
    const text = this.data.info && this.data.info.resumeValue || resumeValue();
    const fs = typeof wx.getFileSystemManager === 'function' ? wx.getFileSystemManager() : null;
    const filePath = (wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : '') + '/zhang-yucong-resume.txt';
    const fallback = () => this.copyText(text,'已复制简历摘要','导出失败，请手动复制');
    if (!fs || !filePath || typeof fs.writeFile !== 'function') { fallback(); return; }
    fs.writeFile({filePath,data:text,encoding:'utf8',success:()=>{
      if (typeof wx.openDocument !== 'function') { fallback(); return; }
      wx.openDocument({filePath,fileType:'txt',showMenu:true,fail:fallback});
    },fail:fallback});
  },
  closeInfo() { if(this.data.infoLeaving)return; this.setData({infoLeaving:true}); const revision=this._infoRevision; this.later(()=>{if(revision===this._infoRevision)this.setData({info:null,infoLeaving:false});},180); },
  previewInfo() { const src=this.data.info && this.data.info.image; if(src)wx.getImageInfo({src,success:r=>wx.previewImage({urls:[r.path],current:r.path}),fail:()=>wx.showToast({title:'图片暂时无法打开',icon:'none'})}); },
  showIntroProject() { this.closeInfo(); wx.navigateTo({url:'/portfolio/pages/detail/index?id=lush'}); },
  replay() { getApp().globalData.replayIntro=true; wx.navigateBack({delta:getCurrentPages().length-1}); },
  onShareAppMessage() { return {title:'LUSH 作品集｜张誉聪',path:'/portfolio/pages/main/index'}; },
  onShareTimeline() { return {title:'LUSH 作品集｜张誉聪'}; },
  sheetDown(e) { const p=e.touches[0]; this._sheetTouch={y:p.clientY,t:Date.now()}; },
  sheetUp(e) { const p=e.changedTouches[0],s=this._sheetTouch; this._sheetTouch=null; if(!p||!s)return; const d=p.clientY-s.y; if(d>70||(d>15&&d/Math.max(16,Date.now()-s.t)>.5)){if(this.data.info)this.closeInfo();else this.closeMenu();} },
  noop() {},
  onUnload() { if(this._timers)this._timers.forEach(clearTimeout); if(this._timers)this._timers.clear(); }
});

