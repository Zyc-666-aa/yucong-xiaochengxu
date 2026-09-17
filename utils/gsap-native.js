/*
 * GSAP adapter for native WeChat Mini Program pages.
 *
 * Native WXML does not expose a browser DOM, so this module animates plain
 * JavaScript state and mirrors each tick into page.setData. Keep DOM plugins
 * such as ScrollTrigger out of this runtime path.
 */

let gsap = null;
let loadError = null;

try {
  const runtime = require('../miniprogram_npm/gsap');
  gsap = runtime && (runtime.gsap || runtime.default || runtime);
} catch (error) {
  loadError = error;
}

function getGSAP() {
  if (!gsap || typeof gsap.to !== 'function' || typeof gsap.timeline !== 'function') {
    const error = new Error('GSAP runtime is not built. Run the WeChat DevTools npm build first.');
    error.code = 'LUSH_GSAP_NOT_BUILT';
    error.cause = loadError;
    throw error;
  }
  return gsap;
}

function assertPage(page) {
  if (!page || typeof page.setData !== 'function') {
    throw new TypeError('A native page instance with setData is required.');
  }
}

function syncData(page, dataPath, state) {
  assertPage(page);
  const patch = {};
  const prefix = dataPath ? dataPath + '.' : '';
  Object.keys(state).forEach(key => {
    patch[prefix + key] = state[key];
  });
  page.setData(patch);
  return patch;
}

function createDataTween(page, dataPath, from, to, vars) {
  const runtime = getGSAP();
  const initial = Object.assign({}, from || {});
  const target = Object.assign({}, to || {});
  Object.keys(target).forEach(key => {
    if (initial[key] === undefined) initial[key] = 0;
  });
  const state = Object.assign({}, initial);
  syncData(page, dataPath, state);

  const options = Object.assign({}, vars || {});
  const userUpdate = options.onUpdate;
  const userComplete = options.onComplete;
  options.onUpdate = function () {
    syncData(page, dataPath, state);
    if (typeof userUpdate === 'function') userUpdate.call(this, state);
  };
  options.onComplete = function () {
    syncData(page, dataPath, state);
    if (typeof userComplete === 'function') userComplete.call(this, state);
  };

  const tween = runtime.to(state, Object.assign({}, target, options));
  return {
    state,
    tween,
    kill: () => tween.kill()
  };
}

function createDataTimeline(page, dataPath, initial, steps, vars) {
  const runtime = getGSAP();
  const state = Object.assign({}, initial || {});
  syncData(page, dataPath, state);

  const options = Object.assign({}, vars || {});
  const userUpdate = options.onUpdate;
  options.onUpdate = function () {
    syncData(page, dataPath, state);
    if (typeof userUpdate === 'function') userUpdate.call(this, state);
  };
  const timeline = runtime.timeline(options);

  (steps || []).forEach(step => {
    const item = step || {};
    const itemVars = Object.assign({}, item.vars || {});
    if (item.duration !== undefined) itemVars.duration = item.duration;
    if (item.ease !== undefined) itemVars.ease = item.ease;
    const position = item.position !== undefined ? item.position : item.at;
    timeline.to(state, Object.assign({}, item.to || {}, itemVars), position);
  });

  return {
    state,
    timeline,
    kill: () => timeline.kill()
  };
}

module.exports = {
  gsap,
  getGSAP,
  syncData,
  createDataTween,
  createDataTimeline
};
