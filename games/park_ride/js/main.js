// Ride loop: updates speed and steering, then draws the scene back to front.
(function () {
  const cfg = Ride.config;
  const cam = Ride.camera;

  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d');
  const sceneEl = document.getElementById('scene');
  const el = {
    count: document.getElementById('starCount'),
    badge: document.getElementById('badge'),
    hint: document.getElementById('hint'),
    go: document.getElementById('btnGo'),
    goLabel: document.getElementById('goLabel'),
    left: document.getElementById('btnLeft'),
    right: document.getElementById('btnRight'),
    warning: document.getElementById('warning'),
  };

  function showWarning(msg) {
    el.warning.textContent = msg;
    el.warning.classList.remove('hidden');
    el.warning.classList.remove('warn-anim');
    // Force reflow so animation restarts
    void el.warning.offsetWidth;
    el.warning.classList.add('warn-anim');
    clearTimeout(state._warnTimer);
    state._warnTimer = setTimeout(() => el.warning.classList.add('hidden'), 1400);
  }

  const state = {
    riding: false,
    speed: 0,
    speedKey: 'normal',
    riderX: 0,       // world units offset from track centre (±playerRange)
    steerVis: 0,     // smoothed steering for the handlebar tilt
    wheel: 0,
    collected: 0,
    _wasOffTrack: false,
    _cyclistCollide: false,
    _warnTimer: null,
  };

  Ride.scenery.reset();
  Ride.stars.reset();
  Ride.cyclists.reset();

  // ---- Sizing (sharp on laptops and TVs) ----
  function resize() {
    const r = sceneEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cam.resize(w, h);
    render();
  }
  new ResizeObserver(resize).observe(sceneEl);

  // ---- Controls ----
  function setRiding(on) {
    state.riding = on;
    el.go.setAttribute('aria-pressed', String(on));
    el.goLabel.textContent = on ? 'Stop' : 'Go';
    el.hint.classList.toggle('is-hidden', on);
    if (on) Ride.music.start(); else Ride.music.stop();
  }

  el.go.addEventListener('click', () => setRiding(!state.riding));
  Ride.input.attach({ leftBtn: el.left, rightBtn: el.right, onToggle: () => setRiding(!state.riding) });

  document.querySelectorAll('input[name="speed"]').forEach(r => {
    r.addEventListener('change', () => { if (r.checked) state.speedKey = r.value; });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setRiding(false);
  });

  function onCollect() {
    state.collected++;
    el.count.textContent = state.collected;
    el.badge.classList.add('bump');
    setTimeout(() => el.badge.classList.remove('bump'), 250);
    Ride.music.playCollect();
  }

  // ---- Update ----
  let _musicRunning = false;
  function step(dt) {
    const target = (Ride.sensorSpeed != null) ? Ride.sensorSpeed : (state.riding ? cfg.speeds[state.speedKey] : 0);
    // Keep music in sync when sensor drives speed directly
    if (Ride.sensorSpeed != null) {
      const shouldPlay = Ride.sensorSpeed > 0.5;
      if (shouldPlay && !_musicRunning) { Ride.music.start(); _musicRunning = true; }
      if (!shouldPlay && _musicRunning) { Ride.music.stop(); _musicRunning = false; }
    } else {
      _musicRunning = state.riding;
    }
    state.speed += (target - state.speed) * Math.min(1, dt * cfg.accel);
    if (state.speed < 0.01 && !state.riding) state.speed = 0;
    cam.z += state.speed * dt;

    const steer = Ride.input.steer;
    const pace = state.speed / cfg.speeds.normal;
    // riderX is now in world units; clamp to playerRange so you can go off-trail
    state.riderX = Ride.clamp(state.riderX + steer * cfg.steerRate * pace * dt, -cfg.playerRange, cfg.playerRange);
    state.steerVis += (steer - state.steerVis) * Math.min(1, dt * 6);
    // Camera follows track curve + player offset
    cam.x = Ride.trackCurveAt(cam.z) + state.riderX;

    state.wheel += state.speed * dt * 1.4;

    // ---- Off-track detection ----
    const onShoulder = Math.abs(state.riderX) > cfg.roadHalf;
    const offTrack   = Math.abs(state.riderX) > cfg.roadHalf + cfg.shoulder;
    if (offTrack) {
      state.speed *= Math.pow(0.18, dt); // grass slows you down hard
      if (!state._wasOffTrack) {
        showWarning('🌿 STAY ON THE TRAIL!');
        Ride.music.playGrass();
        state._wasOffTrack = true;
      }
    } else if (onShoulder) {
      state.speed *= Math.pow(0.55, dt); // shoulder is slow too
      state._wasOffTrack = false;
    } else {
      state._wasOffTrack = false;
    }

    // ---- Cyclist collision ----
    let hitting = false;
    for (const it of Ride.cyclists.items) {
      const rz = it.z - cam.z;
      if (rz > 0 && rz < 1.9 && Math.abs(it.xRel - state.riderX) < 0.85) {
        hitting = true;
        if (!state._cyclistCollide) {
          showWarning('💥 WATCH OUT!');
          Ride.music.playBump();
          state.speed *= 0.45;
          state._cyclistCollide = true;
        }
        break;
      }
    }
    if (!hitting) state._cyclistCollide = false;

    Ride.scene.updateClouds(dt, pace);
    Ride.scenery.update(cam.z);
    Ride.stars.update(cam.z, cam.x, dt, onCollect);
    Ride.cyclists.update(cam.z, dt);
  }

  // ---- Draw ----
  function render() {
    if (!cam.W) return;
    ctx.clearRect(0, 0, cam.W, cam.H);
    Ride.scene.drawSky(ctx, cam);
    Ride.scene.drawClouds(ctx, cam);
    Ride.scene.drawHills(ctx, cam);
    Ride.scene.drawGround(ctx, cam);
    Ride.scene.drawRoad(ctx, cam);

    // Trees and stars, farthest first
    const list = [];
    for (const it of Ride.scenery.items) list.push({ rz: it.z - cam.z, it, mod: Ride.scenery });
    for (const s of Ride.stars.items) list.push({ rz: Ride.stars.depth(s, cam.z), it: s, mod: Ride.stars });
    for (const c of Ride.cyclists.items) list.push({ rz: Ride.cyclists.depth(c, cam.z), it: c, mod: Ride.cyclists });
    list.sort((a, b) => b.rz - a.rz);
    for (const d of list) {
      if (d.rz > 0.3 && d.rz < cfg.zFar) d.mod.draw(ctx, cam, d.it, d.rz);
    }

    const u = Math.min(cam.W / 1000, cam.H / 800);
    const bob = Math.sin(state.wheel * 1.6) * 2 * u * (state.speed / cfg.speeds.normal);
    Ride.bike.draw(ctx, cam, state.steerVis, bob, state.wheel);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();
