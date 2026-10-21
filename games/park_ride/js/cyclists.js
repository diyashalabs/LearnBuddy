// NPC cyclists ahead on the trail. Each rides at their own pace so the player
// can overtake them by blowing harder, or get passed when slowing down.
(function () {
  const cfg = Ride.config;
  const TAU = Math.PI * 2;

  const PALETTES = [
    { helmet: '#E8353F', jersey: '#2D6FC4', shorts: '#1a2545' },
    { helmet: '#F5A020', jersey: '#2BAA58', shorts: '#0e3018' },
    { helmet: '#9B30D0', jersey: '#E84830', shorts: '#2a0f00' },
    { helmet: '#1CAAEE', jersey: '#E83070', shorts: '#1a0830' },
    { helmet: '#38C060', jersey: '#E07820', shorts: '#301500' },
    { helmet: '#FF4488', jersey: '#20A0A0', shorts: '#083030' },
  ];

  function drawCyclist(ctx, cam, it, rz) {
    const p = cam.project(it.x, 0, rz);
    const s = p.s;
    if (s < 1.5) return;

    const gx = p.x, gy = p.y;
    const col = it.colors;

    ctx.save();
    ctx.globalAlpha = cam.fade(rz);

    // Ground shadow
    ctx.fillStyle = 'rgba(40,70,40,0.2)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, s * 0.52, s * 0.09, 0, 0, TAU);
    ctx.fill();

    // Wheels (edge-on — thin vertical ellipses)
    const wheelR = s * 0.7;
    const wheelW = Math.max(1.5, wheelR * 0.13);
    const axleY  = gy - wheelR;
    for (const wx of [gx - s * 0.2, gx + s * 0.2]) {
      ctx.fillStyle = '#2C333A';
      ctx.beginPath();
      ctx.ellipse(wx, axleY, wheelW, wheelR, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(100,115,125,0.45)';
      ctx.beginPath();
      ctx.ellipse(wx - wheelW * 0.3, axleY - wheelR * 0.28, wheelW * 0.5, wheelR * 0.22, 0, 0, TAU);
      ctx.fill();
    }

    // Seat tube
    const seatTopY = gy - wheelR * 1.38;
    ctx.strokeStyle = col.jersey;
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gx, gy - wheelR * 0.28);
    ctx.lineTo(gx, seatTopY);
    ctx.stroke();

    // Hips / shorts
    ctx.fillStyle = col.shorts;
    ctx.beginPath();
    ctx.ellipse(gx, seatTopY - s * 0.08, s * 0.2, s * 0.16, 0, 0, TAU);
    ctx.fill();

    // Torso (cyclist lean: top shifts forward/left)
    const torsoTopX = gx - s * 0.07;
    const torsoTopY = seatTopY - s * 0.58;
    ctx.fillStyle = col.jersey;
    ctx.beginPath();
    ctx.ellipse(torsoTopX, torsoTopY + s * 0.14, s * 0.17, s * 0.27, -0.22, 0, TAU);
    ctx.fill();

    // Arms to handlebars
    const hbarY = torsoTopY + s * 0.08;
    const hbarLX = gx - s * 0.33, hbarRX = gx + s * 0.33;
    ctx.strokeStyle = col.jersey;
    ctx.lineWidth = Math.max(1, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(torsoTopX, torsoTopY + s * 0.1);
    ctx.lineTo(hbarLX, hbarY + s * 0.04);
    ctx.moveTo(torsoTopX, torsoTopY + s * 0.1);
    ctx.lineTo(hbarRX, hbarY + s * 0.04);
    ctx.stroke();

    // Handlebars
    ctx.strokeStyle = '#4a5560';
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(hbarLX, hbarY + s * 0.04);
    ctx.lineTo(hbarRX, hbarY + s * 0.04);
    ctx.stroke();

    // Head + helmet
    const headX = torsoTopX + s * 0.02;
    const headY = torsoTopY - s * 0.2;
    ctx.fillStyle = col.helmet;
    ctx.beginPath();
    ctx.arc(headX, headY, s * 0.17, 0, TAU);
    ctx.fill();
    // Visor
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.arc(headX, headY + s * 0.07, s * 0.17, 0.1, Math.PI - 0.1);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(headX - s * 0.05, headY - s * 0.06, s * 0.065, s * 0.04, -0.5, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  const Cyclists = {
    items: [],
    rng: null,

    reset() {
      this.rng = Ride.makeRng(999);
      this.items = [];
      // Seed 6 cyclists spread ahead at varying distances
      const starts = [7, 14, 22, 32, 44, 56];
      for (let i = 0; i < 6; i++) this.items.push(this._make(starts[i]));
    },

    _make(absoluteZ) {
      const r = this.rng;
      return {
        z: absoluteZ,
        xRel: (r() * 2 - 1) * cfg.roadHalf * 0.65, // offset from track centre (world units)
        speed: 3.5 + r() * 3.5,           // 3.5 – 7.0 m/s
        colors: PALETTES[Math.floor(r() * PALETTES.length)],
        wobble: r() * TAU,
      };
    },

    update(camZ, dt) {
      for (const it of this.items) {
        it.z += it.speed * dt;

        // gentle side-to-side wobble (stays on the trail)
        it.wobble += dt * 1.1;
        it.xRel += Math.sin(it.wobble) * 0.003;
        it.xRel = Ride.clamp(it.xRel, -cfg.roadHalf * 0.8, cfg.roadHalf * 0.8);

        const rz = it.z - camZ;
        if (rz < -1 || rz > cfg.zFar + 8) {
          it.z = camZ + 18 + this.rng() * 45;
          it.xRel = (this.rng() * 2 - 1) * cfg.roadHalf * 0.65;
          it.speed = 3.5 + this.rng() * 3.5;
          it.colors = PALETTES[Math.floor(this.rng() * PALETTES.length)];
        }
      }
    },

    depth(it, camZ) { return it.z - camZ; },

    draw(ctx, cam, it, rz) {
      // World X = track centre at cyclist's Z + their relative offset
      const worldX = Ride.trackCurveAt(it.z) + it.xRel;
      drawCyclist(ctx, cam, { x: worldX, colors: it.colors, wobble: it.wobble }, rz);
    }
  };

  Ride.cyclists = Cyclists;
})();
