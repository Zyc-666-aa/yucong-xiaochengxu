// State and equations preserved from the approved browser welcome scene.
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const KINDS = ['speech','mac','phoneSticker','star','plane','code','planet','bolt','speech','star','mac','plane','speech','phoneSticker','planet','code','bolt','star','plane','speech','mac','planet','phoneSticker','star'];
let caption = 0;
const STICKERS = KINDS.map((kind, i) => ({
  kind, key: kind === 'speech' ? 'speech' + caption++ : kind,
  w: kind === 'speech' ? 68 : kind === 'mac' ? 54 : kind === 'phoneSticker' ? 37 : kind === 'plane' ? 50 : kind === 'star' ? 25 : kind === 'planet' ? 44 : 36,
  ht: kind === 'phoneSticker' ? 58 : kind === 'speech' ? 52 : kind === 'mac' ? 54 : kind === 'plane' ? 50 : kind === 'star' ? 25 : kind === 'planet' ? 44 : 36,
  seed: i * 1.618, i
}));
class Motion {
  constructor(reduced = false) {
    this.p = 0; this.v = 0; this.target = 0; this.dx = 0;
    this.clock = 0; this.openTime = 0; this.damping = 21;
    this.drag = null; this.reduced = reduced; this.suppressTapUntil = 0;
  }
  setTarget(n, instant = false) {
    this.target = n;
    if (instant || this.reduced) { this.p = n; this.v = 0; }
    if (n) this.openTime = this.clock;
  }
  down(x, y, ms, id = 0) {
    if (this.drag) return false;
    this.drag = { x, y, p: this.p, lastY: y, lastT: ms, velocity: 0, moved: false, id };
    this.v = 0; this.damping = 21;
    return true;
  }
  move(x, y, ms, id = 0) {
    const d = this.drag;
    if (!d || d.id !== id) return;
    d.velocity = -(y - d.lastY) / Math.max(8, ms - d.lastT) * 1000 / 350;
    d.lastT = ms; d.lastY = y;
    d.moved = d.moved || Math.abs(y - d.y) > 5 || Math.abs(x - d.x) > 5;
    this.p = clamp(d.p + (d.y - y) / 350, -.025, 1.035);
    this.dx = clamp(x - d.x, -75, 75);
  }
  release(ms, cancel = false) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (cancel) { this.damping = 21; this.v = 0; return; }
    if (!d.moved) {
      this.v = 0; this.damping = 21;
      if (ms > this.suppressTapUntil) this.setTarget(this.target ? 0 : 1);
      return;
    }
    this.v = d.velocity;
    this.damping = Math.abs(this.v) > .16 ? 17 : 21;
    this.suppressTapUntil = ms + 800;
    this.setTarget(this.p + this.v * .14 > .45 ? 1 : 0);
  }
  step(dt) {
    dt = Math.min(dt || .016, .033);
    if (!this.reduced) this.clock += dt;
    if (!this.drag) {
      if (this.reduced) { this.p = this.target; this.v = 0; }
      else {
        this.v += (this.target - this.p) * 110 * dt;
        this.v *= Math.exp(-this.damping * dt);
        this.p += this.v * dt;
        if (Math.abs(this.p - this.target) < .0002 && Math.abs(this.v) < .001) { this.p = this.target; this.v = 0; }
      }
      this.dx *= Math.exp(-10 * dt);
    }
  }
  geometry(h) {
    const t = clamp(this.p);
    return { t, cy: h * .95 * (1-t) + h * .47 * t, cx: 195 + this.dx * t * .45, radius: Math.min(310,h * .38) * (1-t) + 44*t };
  }
  sticker(s, h, g) {
    const age = Math.max(0, this.clock - this.openTime);
    const phase = this.reduced ? s.i / 24 : (s.i / 24 + Math.max(0, age-.5)*.07)%1;
    const y = h*.395 - phase*(h*.51), spread = 38+phase*170;
    const x = 195+Math.sin(s.seed*4.3+phase*2.9)*spread*.69;
    const burst = clamp((g.t-.38)*2.4);
    return {
      x: 195+(x-195)*burst-s.w/2,
      y: g.cy+(y-g.cy)*burst-s.ht/2,
      scale: .35+burst*.65,
      angle: (Math.sin(s.seed*3.2)*48+(this.reduced?0:Math.sin(this.clock*.6+s.seed)*12))*Math.PI/180,
      opacity: clamp((g.t-.45)*4)*clamp((1-phase)*8)
    };
  }
}
module.exports = { Motion, clamp, STICKERS };
