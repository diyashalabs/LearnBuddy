// Procedural background music for Park Ride.
// Plays a cheerful looping tune using Web Audio API oscillators.
// No external files — all synthesized in the browser.
(function () {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain (fade in/out)
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  // Reverb-lite: short convolver impulse
  function makeReverb(dur) {
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }
  const reverb = makeReverb(0.5);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.22;
  reverb.connect(reverbGain);
  reverbGain.connect(masterGain);

  // Note frequencies (C major, two octaves)
  const NOTE = { C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392.00,A4:440.00,B4:493.88,
                 C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880.00 };

  // Melody: cheerful 8-bar loop (note, duration in beats, volume)
  const BPM = 138;
  const BEAT = 60 / BPM;

  const MELODY = [
    ['E5',.5,1],['D5',.5,.7],['C5',.5,1],['E5',.5,.8],
    ['G5',1,1], ['G5',.5,.5],
    ['A5',.5,1],['G5',.5,.7],['F5',.5,.85],['E5',.5,.7],
    ['D5',1,.9], ['D5',.5,.4],
    ['F5',.5,1],['E5',.5,.7],['D5',.5,.85],['F5',.5,.7],
    ['A5',1,1], ['A5',.5,.4],
    ['G5',.5,.9],['F5',.5,.7],['E5',.5,.8],['D5',.5,.6],
    ['C5',2,1],
  ];

  // Bass line (root + fifth pattern)
  const BASS = [
    ['C4',1],['G4',1],['C4',1],['G4',1],
    ['F4',1],['C4',1],['G4',1],['G4',1],
    ['A4',1],['E4',1],['A4',1],['E4',1],
    ['F4',1],['C4',1],['G4',1],['G4',1],
  ];

  // Chord stabs (played on beat 1 and 3 of each bar)
  const CHORDS = [
    [['C4','E4','G4'],2],
    [['F4','A4','C5'],2],
    [['A4','C5','E5'],2],
    [['G4','B4','D5'],2],
  ];

  let schedulerTimer = null;
  let loopStart = null;

  function melodyDuration() {
    return MELODY.reduce((s,[,d]) => s + d * BEAT, 0);
  }
  function bassDuration() {
    return BASS.reduce((s,[,d]) => s + d * BEAT, 0);
  }

  function playNote(freq, startTime, duration, vol, type = 'triangle') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    const atk = 0.01, rel = 0.12;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + atk);
    gain.gain.setValueAtTime(vol, startTime + duration - rel);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.connect(reverb);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  function scheduleLoop(startTime) {
    const melLen = melodyDuration();
    const bassLen = bassDuration();
    const loopLen = Math.max(melLen, bassLen);

    // Melody
    let t = startTime;
    for (const [n, d, v] of MELODY) {
      playNote(NOTE[n], t, d * BEAT * 0.82, v * 0.32, 'triangle');
      t += d * BEAT;
    }

    // Bass
    t = startTime;
    for (const [n, d] of BASS) {
      playNote(NOTE[n] / 2, t, d * BEAT * 0.7, 0.22, 'sawtooth');
      t += d * BEAT;
    }

    // Chords
    t = startTime;
    for (const [notes, d] of CHORDS) {
      for (const n of notes) {
        playNote(NOTE[n], t, d * BEAT * 0.55, 0.07, 'sine');
      }
      t += d * BEAT;
    }

    // Hi-hat rhythm: every half beat
    const steps = Math.floor(loopLen / (BEAT * 0.5));
    for (let i = 0; i < steps; i++) {
      const ht = startTime + i * BEAT * 0.5;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 1.2);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = i % 2 === 0 ? 0.08 : 0.04;
      src.connect(g);
      g.connect(masterGain);
      src.start(ht);
    }

    // Kick on beats 1 and 3
    for (let b = 0; b < loopLen / BEAT; b++) {
      if (b % 2 === 0) {
        const kt = startTime + b * BEAT;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(120, kt);
        osc.frequency.exponentialRampToValueAtTime(40, kt + 0.12);
        g.gain.setValueAtTime(0.5, kt);
        g.gain.exponentialRampToValueAtTime(0.001, kt + 0.25);
        osc.connect(g); g.connect(masterGain);
        osc.start(kt); osc.stop(kt + 0.28);
      }
    }

    return loopLen;
  }

  let running = false;
  let nextLoopAt = 0;
  const LOOKAHEAD = 0.1;

  function pump() {
    if (!running) return;
    const now = ctx.currentTime;
    if (nextLoopAt - now < LOOKAHEAD) {
      const len = scheduleLoop(nextLoopAt);
      nextLoopAt += len;
    }
    schedulerTimer = setTimeout(pump, 50);
  }

  // Low thud + noise burst for cyclist collision
  function playBump() {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    // Thud: sine sweep 90→28 Hz
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.3);
    // Short noise crack
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);
    const ns = ctx.createBufferSource();
    ns.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.value = 0.45;
    ns.connect(ng); ng.connect(masterGain);
    ns.start(t);
  }

  // Grass rustle: band-passed noise burst
  function playGrass() {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.45), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource();
    ns.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.06);
    g.gain.linearRampToValueAtTime(0, t + 0.45);
    ns.connect(filter); filter.connect(g); g.connect(masterGain);
    ns.start(t);
  }

  // Ascending three-note chime: ding-ding-DING!
  function playChime() {
    if (ctx.state === 'suspended') ctx.resume();
    const freqs = [880, 1108.73, 1318.51]; // A5 – C#6 – E6 (major chord arpeggio)
    freqs.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.10;
      // Bell body: sine fundamental
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Bell shimmer: higher partial
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.76; // inharmonic partial
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(i === 2 ? 0.38 : 0.22, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + (i === 2 ? 0.9 : 0.55));
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(i === 2 ? 0.12 : 0.07, t + 0.006);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g); g.connect(masterGain);
      osc2.connect(g2); g2.connect(masterGain);
      osc.start(t); osc.stop(t + 1.1);
      osc2.start(t); osc2.stop(t + 0.5);
    });
  }

  const Music = {
    start() {
      if (ctx.state === 'suspended') ctx.resume();
      if (running) return;
      running = true;
      nextLoopAt = ctx.currentTime + 0.05;
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
      pump();
    },
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(schedulerTimer);
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    },
    setVolume(v) { // 0–1
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(v, ctx.currentTime);
    },
    playCollect: playChime,
    playBump:    playBump,
    playGrass:   playGrass,
  };

  Ride.music = Music;
})();
