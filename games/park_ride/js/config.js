// Shared settings, palette and small helpers for the Park Ride simulator.
(function () {
  const Ride = (window.Ride = window.Ride || {});

  Ride.config = {
    // World and camera (units are "metres-ish")
    horizon: 0.42,      // horizon height as a fraction of the canvas
    camHeight: 1,
    zNear: 1,
    zFar: 70,           // how far ahead we draw
    roadHalf: 1.25,     // half width of the trail
    shoulder: 0.16,     // sandy edge beside the trail
    playerRange: 2.2,   // how far left/right the bike can move (wider than roadHalf so you can go off-track)
    stripe: 3,          // grass/road shading band length (gives a sense of speed)
    dashLen: 1.6,
    dashGap: 4,

    // Riding
    speeds: { slow: 3.2, normal: 5.5 },
    accel: 1.4,         // how gently speed eases up and down
    steerRate: 2.0,     // sideways movement per second at full steer (world units)

    colors: {
      skyTop: '#93C1DE', skyMid: '#C4DFEC', skyLow: '#E9F1E4',
      sun: '#FFF4D2', cloud: 'rgba(255,255,255,0.88)',
      hillFar: '#B3CFAA', hillNear: '#97C08F', treeline: '#7FAE7C',
      grassFar: '#A5C78F', grass: '#8BBB72', grassNear: '#7DB065',
      grassStripe: 'rgba(52,100,48,0.07)',
      trail: '#C9B699', trailFar: '#D6C7AE', trailStripe: 'rgba(110,84,52,0.06)',
      shoulder: '#E6DAC3', dash: '#FAF5EA',
      trunk: '#86674B', trunkShade: '#6F543D',
      leaves: [
        { dark: '#4C875A', mid: '#5F9D66', light: '#84B97C' },
        { dark: '#5A8E50', mid: '#71A85E', light: '#98C47D' }
      ],
      pine: { dark: '#3E7957', light: '#52906A' },
      blossom: '#F1D9DE',
      shadow: 'rgba(40,70,40,0.16)',
      star: '#F4C542', starEdge: '#CF961C', starShine: 'rgba(255,248,214,0.9)',
      starShadow: 'rgba(90,64,30,0.18)',
      bar: '#5D6C79', barLight: '#93A2AE', barDark: '#46525D',
      grip: '#2E3944', frame: '#3C8B83', frameLight: '#5FA9A0',
      tyre: '#2C333A', tread: '#3D454D', bell: '#E0B64A', bellShade: '#B98F2E',
      skin: '#E1B28C', skinShade: '#C08E68',
      sleeve: '#5C8FC6', sleeveShade: '#4C7DB2', cuff: '#4A77A8'
    }
  };

  // Seeded random numbers: the park looks the same every ride (predictable).
  Ride.makeRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  Ride.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Gentle S-curves: track centre shifts left/right as you ride forward.
  Ride.trackCurveAt = function (z) {
    return Math.sin(z * 0.028) * 2.6 + Math.sin(z * 0.053) * 1.1;
  };

  Ride.roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
})();
