function getWindowInfo() {
  if (typeof wx.getWindowInfo === 'function') return wx.getWindowInfo();
  let info = {};
  try { info = wx.getSystemInfoSync() || {}; } catch (e) { info = {}; }
  const width = info.windowWidth || info.screenWidth || 375;
  const height = info.windowHeight || info.screenHeight || 667;
  const screenHeight = info.screenHeight || height;
  const status = info.statusBarHeight || 0;
  const safe = info.safeArea || {left:0, top:status, right:width, bottom:screenHeight};
  return Object.assign({}, info, {
    windowWidth: width,
    windowHeight: height,
    screenHeight,
    pixelRatio: info.pixelRatio || 1,
    statusBarHeight: status,
    safeArea: safe
  });
}

function getCapsuleRect(info) {
  if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
    try { return wx.getMenuButtonBoundingClientRect(); } catch (e) {}
  }
  const width = info.windowWidth || 375;
  const status = info.statusBarHeight || 0;
  const height = 32;
  const right = width - 8;
  return {top: status + 4, bottom: status + 4 + height, left: right - 88, right, width: 88, height};
}

function getBottomInset(info) {
  const screenHeight = info.screenHeight || info.windowHeight || 667;
  const safeBottom = info.safeArea && info.safeArea.bottom;
  return safeBottom === undefined ? 0 : Math.max(0, screenHeight - safeBottom);
}

function getViewportInfo(info) {
  const source = info || {};
  const width = Number(source.windowWidth || source.screenWidth || 375);
  const platform = String(source.platform || '').toLowerCase();
  const isDesktop = width >= 768 || platform === 'windows' || platform === 'mac' || platform === 'linux';
  const platformClass = platform.includes('android') ? 'android' : isDesktop ? 'desktop' : 'mobile';
  const viewportClass = width <= 340 ? 'compact' : isDesktop ? 'wide' : 'phone';
  const ratio = width / 750;
  const dockContentHeight = isDesktop ? 88 : Math.round(136 * ratio);
  const dockTopPadding = isDesktop ? 16 : Math.round(22 * ratio);
  const bottomInset = Math.max(16, getBottomInset(source));
  const dockHeight = dockContentHeight;
  return {
    platformClass,
    viewportClass,
    isDesktop,
    windowWidth: width,
    dockHeight,
    dockTopPadding,
    scrollBottom: dockHeight + dockTopPadding + bottomInset,
    contentBottom: 32
  };
}

module.exports = {getWindowInfo, getCapsuleRect, getBottomInset, getViewportInfo};
