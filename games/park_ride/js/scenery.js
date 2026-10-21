// Trees and bushes along both sides of the trail. Items are recycled to the far
// end once the rider passes them, so the park never runs out.
(function () {
  const cfg = Ride.config;
  const C = cfg.colors;
  const TAU = Math.PI * 2;

  function blob(ctx, p, s, parts, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const [dx, dy, r] of parts) {
      const x = p.x + dx * s, y = p.y + dy * s, rr = r * s;
      ctx.moveTo(x + rr, y);
      ctx.arc(x, y, rr, 0, TAU);
    }
    ctx.fill();
  }

  function drawRound(ctx, p, s, pal) {
    Ride.roundRect(ctx, p.x - 0.08 * s, p.y - 1.35 * s, 0.16 * s, 1.35 * s, 0.05 * s);
    ctx.fillStyle = C.trunk;
    ctx.fill();
    blob(ctx, p, s, [[0, -1.8, 0.72], [-0.52, -1.52, 0.5], [0.52, -1.56, 0.52], [0.02, -2.3, 0.52]], pal.dark);
    blob(ctx, p, s, [[0.18, -1.98, 0.5], [0.32, -2.3, 0.36], [0.5, -1.66, 0.34]], pal.mid);
    blob(ctx, p, s, [[0.3, -2.2, 0.24], [0.08, -2.46, 0.17]], pal.light);
  }

  function drawPine(ctx, p, s) {
    ctx.fillStyle = C.trunkShade;
    ctx.fillRect(p.x - 0.07 * s, p.y - 0.55 * s, 0.14 * s, 0.55 * s);
    for (let t = 0; t < 3; t++) {
      const base = p.y - (0.4 + t * 0.62) * s;
      const half = (0.85 - t * 0.2) * s;
      const top = base - 1.05 * s;
      ctx.fillStyle = C.pine.dark;
      ctx.beginPath();
      ctx.moveTo(p.x - half, base);
      ctx.lineTo(p.x + half, base);
      ctx.lineTo(p.x, top);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.pine.light;
      ctx.beginPath();
      ctx.moveTo(p.x, base);
      ctx.lineTo(p.x + half, base);
      ctx.lineTo(p.x, top);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawBush(ctx, p, s, pal) {
    blob(ctx, p, s, [[-0.32, -0.3, 0.34], [0.12, -0.4, 0.42], [0.5, -0.26, 0.3]], pal.dark);
    blob(ctx, p, s, [[0.2, -0.5, 0.24], [0.5, -0.36, 0.17]], pal.mid);
    blob(ctx, p, s, [[-0.25, -0.46, 0.06], [0.05, -0.62, 0.06], [0.42, -0.42, 0.055]], C.blossom);
  }

  const Scenery = {
    items: [],
    rng: null,
    next: {},

    reset() {
      this.rng = Ride.makeRng(42);
      this.items = [];
      for (const side of [-1, 1]) {
        this.next[side] = 1.5 + this.rng() * 2;
        while (this.next[side] < cfg.zFar + 2) this.items.push(this.make(side));
      }
    },

    make(side) {
      const r = this.rng;
      const z = this.next[side];
      this.next[side] += 1.6 + r() * 2.6;
      const off = cfg.roadHalf + cfg.shoulder + 0.8 + Math.pow(r(), 1.4) * 7;
      const k = r();
      return {
        side, z,
        x: side * off,
        kind: k < 0.28 ? 'pine' : k < 0.82 ? 'round' : 'bush',
        size: 0.85 + r() * 0.5,
        pal: C.leaves[r() < 0.5 ? 0 : 1]
      };
    },

    update(camZ) {
      for (let i = 0; i < this.items.length; i++) {
        if (this.items[i].z - camZ < 0.5) this.items[i] = this.make(this.items[i].side);
      }
    },

    draw(ctx, cam, it, rz) {
      const p = cam.project(it.x, 0, rz);
      const s = p.s * it.size;
      if (s < 0.5 || p.x < -3 * s || p.x > cam.W + 3 * s) return;
      ctx.globalAlpha = cam.fade(rz);

      ctx.fillStyle = C.shadow;
      ctx.beginPath();
      ctx.ellipse(p.x + 0.15 * s, p.y, (it.kind === 'bush' ? 0.75 : 0.85) * s, 0.16 * s, 0, 0, TAU);
      ctx.fill();

      if (it.kind === 'pine') drawPine(ctx, p, s);
      else if (it.kind === 'bush') drawBush(ctx, p, s, it.pal);
      else drawRound(ctx, p, s, it.pal);
      ctx.globalAlpha = 1;
    }
  };

  Ride.scenery = Scenery;
})();
