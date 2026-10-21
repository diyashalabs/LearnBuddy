// Steering and Go/Stop input. Keyboard and on-screen buttons today; a sensor
// (ESP32 handlebar, pedal cadence) can later set left/right/go through this same module.
(function () {
  const Input = {
    left: false,
    right: false,

    get steer() {
      return (this.right ? 1 : 0) - (this.left ? 1 : 0);
    },

    attach({ leftBtn, rightBtn, onToggle }) {
      const keys = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };

      window.addEventListener('keydown', e => {
        const dir = keys[e.key];
        if (dir) { this[dir] = true; e.preventDefault(); return; }
        if ((e.key === ' ' || e.code === 'Space') && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
          e.preventDefault();
          if (!e.repeat) onToggle();
        }
      });
      window.addEventListener('keyup', e => {
        const dir = keys[e.key];
        if (dir) this[dir] = false;
      });
      window.addEventListener('blur', () => { this.left = this.right = false; });

      const hold = (btn, dir) => {
        const on = e => {
          this[dir] = true;
          btn.classList.add('is-held');
          try { btn.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
        };
        const off = () => { this[dir] = false; btn.classList.remove('is-held'); };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('lostpointercapture', off);
        btn.addEventListener('contextmenu', e => e.preventDefault());
      };
      hold(leftBtn, 'left');
      hold(rightBtn, 'right');
    }
  };

  Ride.input = Input;
})();
