const {items}=require('../../data');
const {getWindowInfo,getCapsuleRect,getBottomInset}=require('../../../utils/runtime');
Page({
  data:{sections:[],activeSection:"summary",targetScroll:0,item:null,top:72,bottom:24,videoSrc:'',videoError:false,coverFailed:false,failedMedia:{},documentPreview:null,documentPreviewFailed:false,documentPreviewLoading:false},
  onLoad(query){
    this._disposed=false;
    const item=items.find(i=>i.id===query.id);
    const info=getWindowInfo();
    const cap=getCapsuleRect(info);
    this.setData({sections:[...(item&&item.snapshot?[{id:'result',label:'结果'}]:[]),{id:'summary',label:'摘要'},...(item&&item.journey?[{id:'process',label:'过程'}]:[]),...(item&&item.journey&&item.journey.reviews&&item.journey.reviews.length?[{id:'review',label:'复盘'}]:[]),...(item&&item.documents&&item.documents.length?[{id:'documents',label:'资料'}]:[])],item:item||null,activeSection:item&&item.snapshot?'result':'summary',top:(cap.bottom||info.statusBarHeight+32)+16,bottom:Math.max(16,getBottomInset(info)),coverFailed:false,failedMedia:{}});
    if(item && item.video)getApp().ensureIntroVideo().then(path=>{if(this._disposed)return;if(path)this.setData({videoSrc:path});else this.setData({videoError:true});});
  },
  jumpSection(e){
    const id=e.currentTarget.dataset.id;if(!this.data.sections.some(s=>s.id===id))return;
    const q=wx.createSelectorQuery().in(this);q.select('#case-'+id).boundingClientRect();q.select('.detail-scroll').boundingClientRect();q.select('.detail-scroll').scrollOffset();q.exec(r=>{if(this._disposed||!r[0]||!r[1]||!r[2])return;const next=Math.max(0,r[2].scrollTop+r[0].top-r[1].top-18);this.setData({targetScroll:r[2].scrollTop},()=>{if(!this._disposed)this.setData({targetScroll:next,activeSection:id});});});
  },
  onDetailScroll(e){
    this._scrollMetrics=e.detail;
    if(this._scrollTimer)return;this._scrollTimer=setTimeout(()=>{this._scrollTimer=null;if(this._disposed)return;const q=wx.createSelectorQuery().in(this);q.select('.detail-scroll').boundingClientRect();this.data.sections.forEach(s=>q.select('#case-'+s.id).boundingClientRect());q.exec(r=>{if(this._disposed||!r[0])return;let active='summary';this.data.sections.forEach((s,i)=>{if(r[i+1]&&r[i+1].top<=r[0].top+80)active=s.id;});const m=this._scrollMetrics;if(m&&m.scrollHeight-m.scrollTop<=r[0].height+8&&this.data.sections.length)active=this.data.sections[this.data.sections.length-1].id;if(active!==this.data.activeSection)this.setData({activeSection:active});});},100);
  },
  back(){wx.navigateBack({fail:()=>wx.redirectTo({url:'/portfolio/pages/main/index'})});},
  preview(e){const src=e.currentTarget.dataset.src;if(!this.data.item||!this.data.item.media.includes(src))return;wx.getImageInfo({src,success:r=>wx.previewImage({urls:[r.path],current:r.path}),fail:()=>wx.showToast({title:'图片暂时无法打开',icon:'none'})});},
  fallbackDocumentPreview(doc){if(!doc||!doc.preview||typeof wx.previewImage!=='function'){wx.showToast({title:'资料暂时无法打开',icon:'none'});return;}wx.getImageInfo({src:doc.preview,success:r=>wx.previewImage({urls:[r.path],current:r.path}),fail:()=>wx.showToast({title:'资料预览暂时无法打开',icon:'none'})});},
  previewDocument(e){const id=e.currentTarget.dataset.docId;const docs=this.data.item&&this.data.item.documents||[];const doc=docs.find(x=>x.id===id);if(!doc)return;this.setData({documentPreview:doc,documentPreviewFailed:false,documentPreviewLoading:!!doc.preview});},
  previewDocumentImage(){const doc=this.data.documentPreview;if(!doc||!doc.preview||typeof wx.previewImage!=='function'){wx.showToast({title:'资料暂时无法放大',icon:'none'});return;}wx.getImageInfo({src:doc.preview,success:r=>wx.previewImage({urls:[r.path],current:r.path}),fail:()=>wx.showToast({title:'资料暂时无法放大',icon:'none'})});},
  openDocumentPreviewPdf(){const doc=this.data.documentPreview;if(doc)this.openDocumentFile(doc);},
  openDocumentFile(doc){if(!doc||this._documentOpening)return;this._documentOpening=true;if(!doc.file){this._documentOpening=false;this.fallbackDocumentPreview(doc);return;}const fs=wx.getFileSystemManager();const userPath=wx.env&&wx.env.USER_DATA_PATH;const destination=userPath?userPath+'/lush-'+doc.id+'.pdf':doc.file;const finish=(filePath,ok)=>{wx.hideLoading();if(!ok||!filePath){this._documentOpening=false;this.fallbackDocumentPreview(doc);return;}if(typeof wx.openDocument!=='function'){this._documentOpening=false;this.fallbackDocumentPreview(doc);return;}wx.openDocument({filePath,fileType:'pdf',showMenu:true,success:()=>{},fail:()=>this.fallbackDocumentPreview(doc),complete:()=>{this._documentOpening=false;}});};wx.showLoading({title:'打开资料',mask:true});if(!userPath){finish(destination,true);return;}fs.access({path:destination,success:()=>finish(destination,true),fail:()=>fs.copyFile({srcPath:doc.file,destPath:destination,success:()=>finish(destination,true),fail:()=>finish('',false)})});},
  closeDocumentPreview(){if(this.data.documentPreview)this.setData({documentPreview:null,documentPreviewFailed:false,documentPreviewLoading:false});},
  documentPreviewLoad(){this.setData({documentPreviewLoading:false});},
  documentPreviewError(){this.setData({documentPreviewFailed:true,documentPreviewLoading:false});},
  noop(){},
  replay(){getApp().globalData.replayIntro=true;wx.navigateBack({delta:getCurrentPages().length-1});},
  onVideoError(){this.setData({videoError:true});},
  coverError(){this.setData({coverFailed:true});},
  imageError(e){const index=e.currentTarget.dataset.mediaIndex;if(index!==undefined)this.setData({['failedMedia.'+index]:true});},
  onHide(){if(this.data.item&&this.data.item.video)wx.createVideoContext('caseVideo',this).pause();},
  onUnload(){this._disposed=true;clearTimeout(this._scrollTimer);}
});
