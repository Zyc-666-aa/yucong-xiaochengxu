const INTRO_CACHE_VERSION = 'v2';
const INTRO_CACHE_NAME = 'lush-intro-' + INTRO_CACHE_VERSION + '.mp4';
const animationRuntime = require('./utils/gsap-native');

App({
  globalData: {
    name: 'Albert Lush',
    version: 'native-candidate-10',
    animationRuntime,
    replayIntro: false,
    introVideoPromise: null,
    introVideoPath: ''
  },
  ensureIntroVideo() {
    if (this.globalData.introVideoPromise) return this.globalData.introVideoPromise;
    const fs = wx.getFileSystemManager();
    const source = '/assets/LUSH_logo_inflation_animation_1080p_202609061602.mp4';
    const destination = wx.env.USER_DATA_PATH + '/' + INTRO_CACHE_NAME;
    this.globalData.introVideoPromise = new Promise(resolve => {
      const done = path => {
        this.globalData.introVideoPath = path || '';
        if (!path) this.globalData.introVideoPromise = null;
        resolve(path || '');
      };
      const copy = () => fs.copyFile({
        srcPath: source,
        destPath: destination,
        success: () => done(destination),
        fail: () => done('')
      });
      const keepOrCopy = sourceStat => fs.stat({
        path: destination,
        success: destinationStat => {
          const sameSize = sourceStat && destinationStat && sourceStat.size === destinationStat.size;
          if (sameSize) done(destination); else copy();
        },
        fail: copy
      });
      fs.stat({path: source, success: keepOrCopy, fail: () => fs.access({
        path: destination,
        success: () => done(destination),
        fail: copy
      })});
    });
    return this.globalData.introVideoPromise;
  }
});
