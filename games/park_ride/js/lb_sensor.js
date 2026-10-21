// LearnBuddy sensor bridge for Park Ride.
// Pressure (HX710B) → speed; S1/S2 IR → steer left/right.
(function () {
  const cfg = window.Ride.config;
  window.Ride.sensorSpeed = null;   // null = use the on-screen controls as normal

  const MAX_SPEED = 9.0;            // top speed at full blow (faster than "normal" 5.5)
  const DEAD_ZONE = 8;              // pct below this = coast to stop

  function pctToSpeed(pct) {
    if (pct < DEAD_ZONE) return 0;
    // smooth ramp: 8 % → 0, 100 % → MAX_SPEED
    return ((pct - DEAD_ZONE) / (100 - DEAD_ZONE)) * MAX_SPEED;
  }

  // IR state per sensor index (0 = S1 = left, 1 = S2 = right)
  const blocked = [false, false];
  const blockStart = [-Infinity, -Infinity];

  function applyIR(sensorNum, value) {
    const i = sensorNum - 1;
    if (i < 0 || i > 1) return;
    const nowBlocked = (value === 0);
    if (nowBlocked && !blocked[i]) blockStart[i] = performance.now();
    else if (!nowBlocked && blocked[i]) {
      // only count short blocks (not a permanent obstruction)
      if (performance.now() - blockStart[i] < 2000) {
        // momentary pass → keep state as transient pulse handled by RotiInput pattern
      }
    }
    blocked[i] = nowBlocked;
    // S1 = left, S2 = right — held state drives continuous steering
    if (i === 0) window.Ride.input.left  = nowBlocked;
    if (i === 1) window.Ride.input.right = nowBlocked;
  }

  // Messages from LearnBuddy.html (postMessage relay)
  window.addEventListener('message', function (e) {
    const d = e.data;
    if (!d) return;
    if (d.type === 'pressure') {
      const pct = typeof d.pct === 'number' ? d.pct : 0;
      window.Ride.sensorSpeed = pctToSpeed(pct);
    }
    if (d.type === 'ir') applyIR(d.s, d.v);
  });

  // Also handle the lb:ir custom event fired by BLE/WS connectors inside this window
  document.addEventListener('lb:ir', function (e) {
    const d = e.detail;
    applyIR(d.s ?? d.sensor, d.v ?? d.value);
  });
})();
