// Pseudo-3D camera: turns world positions (x sideways, y up, z ahead) into screen pixels.
(function () {
  const cfg = Ride.config;

  Ride.camera = {
    W: 0, H: 0, horizonY: 0, D: 1,
    x: 0,   // sideways position of the rider (world units)
    z: 0,   // distance travelled

    resize(W, H) {
      this.W = W;
      this.H = H;
      this.horizonY = Math.round(H * cfg.horizon);
      // Ground at the near plane lands exactly on the bottom edge.
      this.D = ((H - this.horizonY) * cfg.zNear) / cfg.camHeight;
    },

    // rz = distance ahead of the camera
    project(wx, wy, rz) {
      const s = this.D / rz;
      return {
        x: this.W / 2 + (wx - this.x) * s,
        y: this.horizonY + (cfg.camHeight - wy) * s,
        s
      };
    },

    // Things fade in softly in the distance instead of popping into view.
    fade(rz) {
      return Ride.clamp((cfg.zFar - rz) / 14, 0, 1);
    }
  };
})();
