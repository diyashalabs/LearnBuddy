// Foreground: front wheel, fork, handlebars and the rider's hands and arms.
// Everything on the bike turns around a pivot below the screen, so steering
// tilts the bars naturally. The arms stay anchored at the (off-screen) shoulders.
(function () {
  const C = Ride.config.colors;
  const TAU = Math.PI * 2;
  const rr = Ride.roundRect;

  const GRIP_X = 352, GRIP_Y = -374;

  function drawFrame(ctx, wheelPhase) {
    // Front tyre (only the top shows)
    rr(ctx, -36, -275, 72, 380, 36);
    ctx.fillStyle = C.tyre;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = C.tread;
    const off = (wheelPhase * 60) % 40;
    for (let y = -300 + off; y < 120; y += 40) {
      rr(ctx, -24, y, 48, 8, 4);
      ctx.fill();
    }
    ctx.restore();

    // Mudguard
    rr(ctx, -46, -292, 92, 120, 46);
    ctx.fillStyle = C.frame;
    ctx.fill();
    rr(ctx, -30, -284, 18, 86, 9);
    ctx.fillStyle = C.frameLight;
    ctx.fill();

    // Fork legs and crown
    ctx.fillStyle = C.frame;
    rr(ctx, -68, -372, 20, 190, 10); ctx.fill();
    rr(ctx, 48, -372, 20, 190, 10); ctx.fill();
    rr(ctx, -80, -392, 160, 38, 19); ctx.fill();
    ctx.fillStyle = C.frameLight;
    rr(ctx, -64, -386, 60, 10, 5); ctx.fill();

    // Stem
    rr(ctx, -20, -420, 40, 52, 12);
    ctx.fillStyle = C.bar;
    ctx.fill();

    // Handlebar
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.bar;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(-322, -378);
    ctx.bezierCurveTo(-180, -425, 180, -425, 322, -378);
    ctx.stroke();
    ctx.strokeStyle = C.barLight;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-300, -390);
    ctx.bezierCurveTo(-170, -432, 170, -432, 300, -390);
    ctx.stroke();

    // Stem clamp
    rr(ctx, -32, -428, 64, 34, 10);
    ctx.fillStyle = C.barDark;
    ctx.fill();

    // Bell
    ctx.fillStyle = C.bellShade;
    rr(ctx, -186, -420, 32, 10, 4); ctx.fill();
    ctx.fillStyle = C.bell;
    ctx.beginPath();
    ctx.arc(-170, -420, 22, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-178, -430, 6, 4, -0.5, 0, TAU);
    ctx.fill();

    // Grips
    ctx.strokeStyle = C.grip;
    ctx.lineWidth = 42;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 300, -381);
      ctx.lineTo(side * 404, -366);
      ctx.stroke();
    }
  }

  // Right hand seen from behind, resting on the grip. The left hand is mirrored.
  function drawHand(ctx) {
    const gx = GRIP_X, gy = GRIP_Y;
    ctx.lineWidth = 4;
    ctx.fillStyle = C.skin;
    ctx.strokeStyle = C.skinShade;

    // Fingers curling over the far side of the grip
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(gx - 36 + i * 24, gy - 38 + Math.abs(i - 1.5) * 3, 13, 17, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // Back of the hand
    ctx.beginPath();
    ctx.ellipse(gx + 2, gy + 2, 58, 42, 0.08, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // Knuckle creases
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const x = gx - 24 + i * 24;
      ctx.beginPath();
      ctx.moveTo(x, gy - 30);
      ctx.lineTo(x + 1, gy - 18);
      ctx.stroke();
    }
    // Thumb wrapping round the inner side
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(gx - 60, gy + 8, 19, 30, -0.45, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  function drawArm(ctx, wx, wy, sx, sy, u) {
    const dx = sx - wx, dy = sy - wy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    const cx = wx + nx * 60 * u, cy = wy + ny * 60 * u;

    ctx.lineCap = 'round';
    // Wrist
    ctx.strokeStyle = C.skin;
    ctx.lineWidth = 68 * u;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(cx, cy); ctx.stroke();
    // Sleeve
    ctx.strokeStyle = C.sleeve;
    ctx.lineWidth = 120 * u;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke();
    // Soft shading along the outer edge
    ctx.strokeStyle = C.sleeveShade;
    ctx.lineWidth = 34 * u;
    const ox = -ny * 40 * u * Math.sign(sx - wx || 1), oy = nx * 40 * u * Math.sign(sx - wx || 1);
    ctx.beginPath(); ctx.moveTo(cx + ox + nx * 30 * u, cy + oy + ny * 30 * u); ctx.lineTo(sx + ox, sy + oy); ctx.stroke();
    // Cuff
    ctx.lineCap = 'butt';
    ctx.strokeStyle = C.cuff;
    ctx.lineWidth = 122 * u;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + nx * 16 * u, cy + ny * 16 * u); ctx.stroke();
  }

  Ride.bike = {
    // steer: -1..1 (already smoothed), bob: small vertical sway in px
    draw(ctx, cam, steer, bob, wheelPhase) {
      const { W, H } = cam;
      const u = Math.min(W / 1000, H / 800);
      const px = W / 2 + steer * 10 * u;
      const py = H + 200 * u + bob;
      const ang = steer * 0.17;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const toScreen = (x, y) => [px + (x * cos - y * sin) * u, py + (x * sin + y * cos) * u];

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.scale(u, u);
      drawFrame(ctx, wheelPhase);
      ctx.restore();

      for (const side of [-1, 1]) {
        const [wx, wy] = toScreen(side * (GRIP_X + 6), GRIP_Y + 34);
        drawArm(ctx, wx, wy, W / 2 + side * 560 * u, H + 430 * u, u);
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.scale(u, u);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        drawHand(ctx);
        ctx.restore();
      }
      ctx.restore();
    }
  };
})();
