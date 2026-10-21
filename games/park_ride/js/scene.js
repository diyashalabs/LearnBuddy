// Background layers: sky, sun, clouds, hills, grass and the trail itself.
(function () {
  const cfg = Ride.config;
  const C = cfg.colors;
  const TAU = Math.PI * 2;

  const rng = Ride.makeRng(7);
  const clouds = Array.from({ length: 5 }, (_, i) => ({
    x: -0.1 + i * 0.28 + rng() * 0.1,
    y: 0.16 + rng() * 0.36,
    r: 0.7 + rng() * 0.5
  }));

  function circle(ctx, x, y, r) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }

  function drawSky(ctx, cam) {
    const { W, horizonY: h } = cam;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.65, C.skyMid);
    g.addColorStop(1, C.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, h + 2);

    // A soft, steady sun (no pulsing).
    const sx = W * 0.78, sy = h * 0.34, sr = Math.max(16, Math.min(W, h * 2) * 0.045);
    const halo = ctx.createRadialGradient(sx, sy, sr * 0.8, sx, sy, sr * 3.2);
    halo.addColorStop(0, 'rgba(255,247,220,0.6)');
    halo.addColorStop(1, 'rgba(255,247,220,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sx - sr * 3.2, sy - sr * 3.2, sr * 6.4, sr * 6.4);
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    circle(ctx, sx, sy, sr);
    ctx.fill();
  }

  function updateClouds(dt, speedFactor) {
    for (const c of clouds) {
      c.x -= dt * (0.0025 + 0.004 * speedFactor);
      if (c.x < -0.25) c.x += 1.5;
    }
  }

  function drawClouds(ctx, cam) {
    const { W, horizonY: h } = cam;
    const unit = Math.min(W, h * 2.6) * 0.045;
    ctx.fillStyle = C.cloud;
    ctx.beginPath();
    for (const c of clouds) {
      const x = c.x * W - cam.x * W * 0.004;
      const y = c.y * h;
      const r = unit * c.r;
      ctx.moveTo(x - r * 1.9, y + r * 0.35);
      ctx.ellipse(x, y + r * 0.35, r * 1.9, r * 0.55, 0, Math.PI, TAU);
      circle(ctx, x - r * 0.8, y + r * 0.05, r * 0.75);
      circle(ctx, x + r * 0.15, y - r * 0.3, r * 1.0);
      circle(ctx, x + r * 1.05, y + r * 0.1, r * 0.65);
    }
    ctx.fill();
  }

  function hillPath(ctx, W, base, amp, freq, phase, shift) {
    ctx.beginPath();
    ctx.moveTo(-10, base + 4);
    for (let x = -10; x <= W + 10; x += 8) {
      const u = (x + shift) / Math.max(W, 1);
      const y = base - amp * (0.55 + 0.3 * Math.sin(u * freq * TAU + phase) + 0.15 * Math.sin(u * freq * 2.7 * TAU + phase * 1.7));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 10, base + 4);
    ctx.closePath();
  }

  function drawHills(ctx, cam) {
    const { W, H, horizonY: h } = cam;
    const amp = H * 0.085;
    hillPath(ctx, W, h + 1, amp, 1.2, 0.8, -cam.x * W * 0.02);
    ctx.fillStyle = C.hillFar;
    ctx.fill();
    hillPath(ctx, W, h + 1, amp * 0.55, 2.1, 2.4, -cam.x * W * 0.045);
    ctx.fillStyle = C.hillNear;
    ctx.fill();
    // Distant line of trees sitting on the horizon.
    hillPath(ctx, W, h + 1, amp * 0.22, 16, 1.1, -cam.x * W * 0.07);
    ctx.fillStyle = C.treeline;
    ctx.fill();
  }

  // Draws a horizontal shading band on every other stretch of ground; it slides
  // towards the rider as they move, which is what makes the ride feel like motion.
  function bands(ctx, cam, maxZ, x, w) {
    const L = cfg.stripe;
    const first = Math.floor(cam.z / L);
    for (let i = first; i < first + maxZ / L; i++) {
      if (i % 2) continue;
      let z1 = i * L - cam.z;
      const z2 = z1 + L;
      if (z2 < 0.3) continue;
      z1 = Math.max(z1, 0.3);
      const y1 = cam.horizonY + cam.D / z2;
      const y2 = Math.min(cam.H, cam.horizonY + cam.D / z1);
      ctx.globalAlpha = Ride.clamp((maxZ - z1) / (maxZ * 0.5), 0, 1);
      ctx.fillRect(x, y1, w, y2 - y1);
    }
    ctx.globalAlpha = 1;
  }

  function drawGround(ctx, cam) {
    const { W, H, horizonY: h } = cam;
    const g = ctx.createLinearGradient(0, h, 0, H);
    g.addColorStop(0, C.grassFar);
    g.addColorStop(0.3, C.grass);
    g.addColorStop(1, C.grassNear);
    ctx.fillStyle = g;
    ctx.fillRect(0, h, W, H - h);
    ctx.fillStyle = C.grassStripe;
    bands(ctx, cam, 40, 0, W);
  }

  function drawRoad(ctx, cam) {
    const STEPS = 54;
    const zMin = 0.28, zMax = Math.min(cfg.zFar, 62);
    const half = cfg.roadHalf;
    const sh = half + cfg.shoulder;
    const cam0 = Ride.trackCurveAt(cam.z); // curve at camera position

    // Draw far-to-near so near segments cover far ones
    for (let i = STEPS - 1; i >= 0; i--) {
      const t1 = i / STEPS, t2 = (i + 1) / STEPS;
      // Quadratic spacing: more slices near the camera for smooth curves
      const z1 = zMin + t1 * t1 * (zMax - zMin);
      const z2 = zMin + t2 * t2 * (zMax - zMin);
      const off1 = Ride.trackCurveAt(cam.z + z1) - cam0;
      const off2 = Ride.trackCurveAt(cam.z + z2) - cam0;
      const fade = Ride.clamp((cfg.zFar - z1) / 14, 0, 1);

      // Shoulder
      const sL1 = cam.project(off1 - sh, 0, z1), sR1 = cam.project(off1 + sh, 0, z1);
      const sL2 = cam.project(off2 - sh, 0, z2), sR2 = cam.project(off2 + sh, 0, z2);
      ctx.globalAlpha = fade;
      ctx.fillStyle = C.shoulder;
      ctx.beginPath();
      ctx.moveTo(sL2.x, sL2.y); ctx.lineTo(sR2.x, sR2.y);
      ctx.lineTo(sR1.x, sR1.y); ctx.lineTo(sL1.x, sL1.y);
      ctx.closePath(); ctx.fill();

      // Trail with alternating light/dark bands for speed depth cue
      const bIdx = Math.floor((cam.z + z1) / cfg.stripe);
      const rL1 = cam.project(off1 - half, 0, z1), rR1 = cam.project(off1 + half, 0, z1);
      const rL2 = cam.project(off2 - half, 0, z2), rR2 = cam.project(off2 + half, 0, z2);
      ctx.globalAlpha = fade * (bIdx % 2 ? 1.0 : 0.88);
      ctx.fillStyle = bIdx % 2 ? C.trail : C.trailFar;
      ctx.beginPath();
      ctx.moveTo(rL2.x, rL2.y); ctx.lineTo(rR2.x, rR2.y);
      ctx.lineTo(rR1.x, rR1.y); ctx.lineTo(rL1.x, rL1.y);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Centre dashes (curve-aware)
    ctx.fillStyle = C.dash;
    const dw = 0.045;
    const first = Math.floor(cam.z / cfg.dashGap);
    for (let i = first; i < first + cfg.zFar / cfg.dashGap; i++) {
      let z1 = i * cfg.dashGap - cam.z;
      const z2 = z1 + cfg.dashLen;
      if (z2 < 0.3) continue;
      z1 = Math.max(z1, 0.3);
      const off1 = Ride.trackCurveAt(cam.z + z1) - cam0;
      const off2 = Ride.trackCurveAt(cam.z + z2) - cam0;
      const p1 = cam.project(off1 - dw, 0, z1), p2 = cam.project(off1 + dw, 0, z1);
      const p3 = cam.project(off2 + dw, 0, z2), p4 = cam.project(off2 - dw, 0, z2);
      ctx.globalAlpha = cam.fade(z1) * 0.95;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  Ride.scene = { drawSky, drawClouds, updateClouds, drawHills, drawGround, drawRoad };
})();
