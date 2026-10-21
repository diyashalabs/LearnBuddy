// Big, friendly stars that float above the trail. They follow a fixed pattern
// (three in a row, then the next lane over) so the ride is predictable.
(function () {
  const cfg = Ride.config;
  const C = cfg.colors;
  const TAU = Math.PI * 2;

  const LANES = [-0.6, 0, 0.6];
  const ORDER = [1, 1, 1, 2, 2, 2, 1, 1, 1, 0, 0, 0];
  const HEIGHT = 0.5;      // how high the star floats
  const SIZE = 0.27;       // star radius in world units
  const REACH = 0.42;      // how close the bike must be to collect
  const COLLECT_TIME = 0.7;

  function starPath(ctx, x, y, R, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r : R;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  const Stars = {
    items: [],
    count: 0,
    nextZ: 0,

    reset() {
      this.items = [];
      this.count = 0;
      this.nextZ = 14;
      this.fill(0);
    },

    fill(camZ) {
      while (this.nextZ < camZ + cfg.zFar) {
        const lane = LANES[ORDER[this.count % ORDER.length]];
        this.items.push({ z: this.nextZ, x: lane, collected: false, t: 0, hitZ: 0 });
        this.nextZ += this.count % 3 === 2 ? 10 : 3.4;
        this.count++;
      }
    },

    update(camZ, riderX, dt, onCollect) {
      this.fill(camZ);
      for (const s of this.items) {
        if (s.collected) { s.t += dt; continue; }
        const rz = s.z - camZ;
        // Collect only while the star is still above the handlebars, so the
        // gentle "collected" fade always happens in clear view.
        if (rz < 1.35 && rz > 0.9 && Math.abs(s.x - riderX) < REACH) {
          s.collected = true;
          s.hitZ = rz;
          onCollect();
        }
      }
      this.items = this.items.filter(s => s.collected ? s.t < COLLECT_TIME : s.z - camZ > 0.3);
    },

    // Distance used for drawing order.
    depth(s, camZ) {
      return s.collected ? s.hitZ : s.z - camZ;
    },

    draw(ctx, cam, s, rz) {
      let lift = 0, alpha = cam.fade(rz), grow = 1;
      if (s.collected) {
        const k = Math.min(1, s.t / COLLECT_TIME);
        const ease = 1 - (1 - k) * (1 - k);
        lift = ease * 0.5;
        alpha = 1 - k;
        grow = 1 + ease * 0.35;
      }
      const ground = cam.project(s.x, 0, rz);
      const c = cam.project(s.x, HEIGHT + lift, rz);
      const R = SIZE * c.s * grow;
      if (R < 0.8) return;

      ctx.globalAlpha = alpha;
      if (!s.collected) {
        ctx.fillStyle = C.starShadow;
        ctx.beginPath();
        ctx.ellipse(ground.x, ground.y, R * 0.75, R * 0.2, 0, 0, TAU);
        ctx.fill();
      }
      starPath(ctx, c.x, c.y, R, R * 0.5);
      ctx.fillStyle = C.star;
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, R * 0.11);
      ctx.strokeStyle = C.starEdge;
      ctx.stroke();

      ctx.fillStyle = C.starShine;
      ctx.beginPath();
      ctx.ellipse(c.x - R * 0.2, c.y - R * 0.22, R * 0.2, R * 0.1, -0.6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  Ride.stars = Stars;
})();
