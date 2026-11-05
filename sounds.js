/* Sound effects for the character, played from real recordings in sounds/ (see
   sounds/CREDITS.txt). Browsers only allow sound after the visitor has clicked, tapped or
   pressed a key, so the clips are loaded then, and nothing plays before that. The header's
   "Sound" button turns everything on or off and the choice is remembered on this device.
   script.js calls window.siteSounds.<name>(). */
(function () {
  'use strict';

  var STORE_KEY = 'rrk-sound';
  var VOLUME = 0.6;
  var CLIPS = [
    'step-1', 'step-2', 'step-3', 'step-4', 'tiptoe-1', 'tiptoe-2', 'hop',
    'cloth-1', 'cloth-2', 'cloth-3', 'cloth-4', 'creak-1', 'creak-2', 'creak-3',
    'click', 'latch', 'tin-1', 'tin-2', 'metal',
    'glass-heavy', 'glass-light', 'plank', 'wood-1', 'wood-2', 'plate',
    'bit-1', 'bit-2', 'bit-3', 'thud', 'punch', 'stomp', 'ding', 'bike-bell'
  ];
  var LOOPS = { helicopter: 'sounds/helicopter-loop.wav' };

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var buffers = {};
  var reversed = {};
  var unlocked = false;
  var enabled = true;

  try { enabled = window.localStorage.getItem(STORE_KEY) !== 'off'; } catch (e) { /* storage blocked */ }

  function setup() {
    if (ctx || !AudioCtx) return;
    try { ctx = new AudioCtx(); } catch (e) { ctx = null; return; }
    master = ctx.createGain();
    master.gain.value = enabled ? VOLUME : 0;
    // Keeps loud moments (the crash) from distorting when sounds overlap
    var limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.ratio.value = 6;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    loadAll();
  }

  function decode(arrayBuffer) {
    // The callback form also works in older Safari
    return new Promise(function (resolve, reject) {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  function load(name, url) {
    return fetch(url)
      .then(function (res) { if (!res.ok) throw new Error(url); return res.arrayBuffer(); })
      .then(decode)
      .then(function (buffer) { buffers[name] = buffer; })
      .catch(function () { /* that one sound just won't play */ });
  }

  function loadAll() {
    CLIPS.forEach(function (name) { load(name, 'sounds/' + name + '.mp3'); });
    Object.keys(LOOPS).forEach(function (name) { load(name, LOOPS[name]); });
  }

  // The first click, tap or key press is what lets the browser play sound
  function unlock() {
    setup();
    if (!ctx) return;
    unlocked = true;
    if (ctx.state === 'suspended') ctx.resume();
  }

  ['pointerdown', 'keydown', 'touchend'].forEach(function (type) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  });

  function ready() {
    return enabled && unlocked && ctx && ctx.state !== 'closed';
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function reverseOf(name) {
    if (reversed[name]) return reversed[name];
    var src = buffers[name];
    if (!src) return null;
    var copy = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
    for (var c = 0; c < src.numberOfChannels; c++) {
      var from = src.getChannelData(c);
      var to = copy.getChannelData(c);
      for (var i = 0, n = from.length; i < n; i++) to[i] = from[n - 1 - i];
    }
    reversed[name] = copy;
    return copy;
  }

  // Plays a recording. Options: at (seconds from now), vol, rate (speed and pitch),
  // pan (-1 left to 1 right), reverse, out (node to play into)
  function play(name, o) {
    o = o || {};
    var buffer = o.reverse ? reverseOf(name) : buffers[name];
    if (!buffer) return;
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = o.rate || 1;
    var gain = ctx.createGain();
    gain.gain.value = o.vol === undefined ? 1 : o.vol;
    src.connect(gain);
    var out = o.out || master;
    if (o.pan && ctx.createStereoPanner) {
      var panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, o.pan));
      gain.connect(panner);
      panner.connect(out);
    } else {
      gain.connect(out);
    }
    src.start(ctx.currentTime + (o.at || 0));
    return src;
  }

  // A stereo position that sounds can play through: fixed, or sliding from one side to
  // the other over dur seconds. It tidies itself up after life seconds.
  function place(from, to, dur, life) {
    if (!ctx.createStereoPanner) return master;
    var panner = ctx.createStereoPanner();
    var now = ctx.currentTime;
    panner.pan.setValueAtTime(from, now);
    if (to !== from) panner.pan.linearRampToValueAtTime(to, now + dur);
    panner.connect(master);
    setTimeout(function () { panner.disconnect(); }, ((life || dur) + 1) * 1000);
    return panner;
  }

  // A group of sounds that can be faded out together (for example when he leaves early)
  function group(out) {
    var bus = ctx.createGain();
    bus.connect(out || master);
    return bus;
  }

  function fadeGroup(bus) {
    var now = ctx.currentTime;
    // drop any volume changes still planned, then fade
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.setTargetAtTime(0, now, 0.08);
    setTimeout(function () { bus.disconnect(); }, 900);
  }

  // The voice for "Hello!": Indian English if the device has one, then a natural-sounding
  // English voice, then any English voice
  function helloVoice() {
    var voices = window.speechSynthesis.getVoices() || [];
    var english = voices.filter(function (v) { return /^en[-_]/i.test(v.lang); });
    return english.filter(function (v) { return /^en[-_]IN/i.test(v.lang); })[0] ||
      english.filter(function (v) { return /google|natural|online/i.test(v.name); })[0] ||
      english[0] || null;
  }

  // Some browsers load their voices a moment after the page does
  if (window.speechSynthesis && window.speechSynthesis.getVoices) window.speechSynthesis.getVoices();

  var STEPS = ['step-1', 'step-2', 'step-3', 'step-4'];
  var CLOTH = ['cloth-1', 'cloth-2', 'cloth-3', 'cloth-4'];
  var CREAKS = ['creak-1', 'creak-2', 'creak-3'];
  var DEBRIS = ['bit-1', 'bit-2', 'bit-3', 'wood-1', 'wood-2', 'plank', 'plate', 'tin-1', 'bit-1', 'bit-2'];

  var sounds = {
    /* ---- "Don't press" crash ---- */

    // The button clicks in
    press: function () {
      if (!ready()) return;
      play('click', { rate: 1.15, vol: 0.8 });
    },

    // The screen flashes: the page cracks like glass
    shatter: function () {
      if (!ready()) return;
      play('glass-heavy', { vol: 1 });
      play('glass-light', { at: 0.06, rate: 1.1, vol: 0.6, pan: -0.4 });
      play('glass-light', { at: 0.15, rate: 0.9, vol: 0.45, pan: 0.4 });
    },

    // Everything gives way: a deep crunch, then the pieces clatter onto the floor all over
    // the screen; if he's on screen, his clothes flap as he falls
    collapse: function (withCharacter) {
      if (!ready()) return;
      play('wood-1', { rate: 0.5, vol: 0.9 });
      play('plank', { at: 0.12, rate: 0.6, vol: 0.6 });
      for (var i = 0; i < 24; i++) {
        play(pick(DEBRIS), { at: rand(0.8, 1.5), rate: rand(0.85, 1.25), vol: rand(0.25, 0.6), pan: rand(-0.8, 0.8) });
      }
      if (withCharacter) {
        play('cloth-1', { at: 0.2, rate: 0.85, vol: 0.6 });
        play('cloth-3', { at: 0.6, rate: 0.9, vol: 0.5 });
      }
    },

    // He hits the floor
    impact: function () {
      if (!ready()) return;
      play('thud', { vol: 1 });
      play('punch', { at: 0.01, rate: 0.8, vol: 0.8 });
      play('glass-light', { at: 0.04, rate: 1.2, vol: 0.4 });
      play('bit-2', { at: 0.12, vol: 0.4, pan: -0.5 });
      play('bit-3', { at: 0.2, vol: 0.35, pan: 0.5 });
    },

    // Dizzy stars: little dings circling his head (left, right, middle)
    dizzy: function () {
      if (!ready()) return;
      [-0.6, 0.6, 0, -0.6, 0.6].forEach(function (pan, i) {
        play('ding', { at: 0.35 + i * 0.28, rate: 2.4 + (i % 2) * 0.3, vol: 0.22, pan: pan });
      });
    },

    // "Ow!": he winces and clutches himself
    ow: function () {
      if (!ready()) return;
      play('cloth-2', { at: 0.1, vol: 0.6 });
    },

    // "Hang on, I'll fix it…": he taps things back with a tool
    tinker: function () {
      if (!ready()) return;
      play('tin-1', { at: 0.2, vol: 0.7 });
      play('tin-2', { at: 0.45, vol: 0.6 });
      play('latch', { at: 0.75, vol: 0.6 });
      play('metal', { at: 1.0, rate: 1.3, vol: 0.5 });
    },

    // Everything rewinds back into place: the crash, played backwards
    rebuild: function () {
      if (!ready()) return;
      for (var i = 0; i < 12; i++) {
        play(pick(DEBRIS), { reverse: true, at: rand(0.05, 0.8), rate: rand(0.9, 1.3), vol: rand(0.2, 0.45), pan: rand(-0.7, 0.7) });
      }
      play('glass-heavy', { reverse: true, at: 0.75, rate: 0.8, vol: 0.8 });
    },

    // The page is back together: it clicks into place
    fixed: function () {
      if (!ready()) return;
      play('latch', { vol: 0.7 });
      play('ding', { at: 0.05, vol: 0.45 });
    },

    // His mood afterwards: stomping angrily, or shoulders heaving as he cries
    upset: function (crying) {
      if (!ready()) return;
      if (crying) {
        play('cloth-4', { at: 0.4, rate: 0.8, vol: 0.45 });
        play('cloth-2', { at: 1.1, rate: 0.75, vol: 0.4 });
      } else {
        [0.4, 0.75, 1.1].forEach(function (at) {
          play('stomp', { at: at, rate: rand(0.85, 0.95), vol: 0.85 });
        });
      }
    },

    /* ---- Hero: walking in behind "RITESH", leaning on the "H", waving ---- */

    // Footsteps as he walks in from the left. The sound travels across the speakers with
    // him, from the left edge to where he stops (o.toPan, -1 to 1).
    walkIn: function (o) {
      if (!ready()) return;
      var dur = o.duration / 1000;
      var out = place(-0.9, o.toPan, dur, dur + 1);
      for (var at = 0.05, i = 0; at < dur - 0.1; at += 0.4, i++) {
        play(pick(STEPS), { at: at, rate: rand(0.95, 1.05), vol: i % 2 ? 0.7 : 0.8, out: out });
        if (i % 2 === 0) play(pick(CLOTH), { at: at + 0.03, vol: 0.18, rate: 1.1, out: out });
      }
      play(pick(STEPS), { at: dur, vol: 0.8, out: out });
    },

    // He settles against the "H"
    lean: function () {
      if (!ready()) return;
      play('cloth-4', { vol: 0.45 });
    },

    // He says "Hello!" out loud when he waves, in the browser's own voice
    hello: function () {
      if (!ready() || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      var synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) return;
      var line = new SpeechSynthesisUtterance('Hello!');
      var voice = helloVoice();
      if (voice) line.voice = voice;
      line.lang = voice ? voice.lang : 'en-US';
      line.pitch = 1.15;
      line.rate = 1;
      line.volume = 0.9;
      synth.speak(line);
    },

    // His arm swishing back and forth
    wave: function () {
      if (!ready()) return;
      play('cloth-2', { rate: 1.15, vol: 0.5 });
      play('cloth-4', { at: 0.35, rate: 1.1, vol: 0.4 });
    },

    /* ---- Bike ride ---- */

    // The bike's bell ringing as he rides by (sounds/bike-bell.mp3). The sound travels from
    // the left speaker to the right with him and is loudest as he passes the middle.
    // o.time is the ride length in ms.
    rideStart: function (o) {
      this.rideStop();
      if (!ready()) return;
      var dur = o.time / 1000;
      var now = ctx.currentTime;
      var bus = group(place(-1, 1, dur, dur + 1));
      bus.gain.setValueAtTime(0.5, now);
      bus.gain.linearRampToValueAtTime(1, now + dur * 0.5);
      bus.gain.linearRampToValueAtTime(0.5, now + dur);
      var bell = play('bike-bell', { vol: 1, out: bus });
      this._ride = { bus: bus, sources: bell ? [bell] : [] };
    },

    // When he's gone, the sound fades out with him
    rideStop: function () {
      var ride = this._ride;
      if (!ride) return;
      this._ride = null;
      var stopAt = ctx.currentTime + 0.6;
      ride.sources.forEach(function (src) { src.stop(stopAt); });
      fadeGroup(ride.bus);
    },

    /* ---- Helicopter: flies around the page while the reader isn't scrolling ---- */

    heliStart: function () {
      this.heliStop();
      if (!ready() || !buffers.helicopter) return;
      var src = ctx.createBufferSource();
      src.buffer = buffers.helicopter;
      src.loop = true;
      var gain = ctx.createGain();
      gain.gain.value = 0;
      var panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      src.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(master);
      } else {
        gain.connect(master);
      }
      src.start(ctx.currentTime, Math.random() * 3);
      this._heli = { src: src, gain: gain, panner: panner };
    },

    // Called every frame: where it is (-1 left to 1 right) and how close (0 to 1)
    heliUpdate: function (pan, level) {
      var heli = this._heli;
      if (!heli) return;
      var now = ctx.currentTime;
      heli.gain.gain.setTargetAtTime(level * 0.9, now, 0.1);
      if (heli.panner) heli.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), now, 0.1);
      // a little higher when it's close and coming towards you, like a real one going by
      heli.src.playbackRate.setTargetAtTime(0.96 + level * 0.06, now, 0.2);
    },

    heliStop: function () {
      var heli = this._heli;
      if (!heli) return;
      this._heli = null;
      var now = ctx.currentTime;
      heli.gain.gain.cancelScheduledValues(now);
      heli.gain.gain.setValueAtTime(heli.gain.gain.value, now);
      heli.gain.gain.setTargetAtTime(0, now, 0.15);
      heli.src.stop(now + 1);
      setTimeout(function () { heli.gain.disconnect(); if (heli.panner) heli.panner.disconnect(); }, 1500);
    },

    /* ---- Guide: sneaking in from the side, the top or the bottom ---- */

    // side: 'left', 'right', 'top' or 'bottom'
    peekIn: function (side) {
      this.peekOut(true);
      if (!ready()) return;
      var p = side === 'left' ? -0.85 : side === 'right' ? 0.85 : 0;
      var bus = group(place(p, p, 0, 6));
      this._peek = bus;

      if (side === 'top') {
        // The rope takes his weight as he lowers himself down, then creaks as he swings
        play('creak-2', { vol: 0.5, out: bus });
        play('cloth-3', { at: 0.05, vol: 0.5, out: bus });
        // one creak at each end of the swing (it takes 1.2s each way)
        [0.55, 1.75, 2.95, 4.15].forEach(function (at) {
          play(pick(CREAKS), { at: at, rate: rand(0.9, 1.1), vol: 0.28, out: bus });
        });
      } else if (side === 'bottom') {
        // Pops up from below: a rustle of clothes and a little hop onto his feet
        play('cloth-1', { vol: 0.55, out: bus });
        play('hop', { at: 0.36, vol: 0.6, out: bus });
        play('tiptoe-1', { at: 0.44, vol: 0.35, out: bus });
      } else {
        // From the side: two sneaky tiptoe steps, then he leans round the edge
        play('tiptoe-1', { vol: 0.5, out: bus });
        play('tiptoe-2', { at: 0.17, vol: 0.45, out: bus });
        play(pick(CLOTH), { at: 0.26, vol: 0.5, out: bus });
      }
    },

    // He ducks back out of sight: a quick swish of his clothes (quiet = no swish, just
    // stop any creaking that was still going)
    peekOut: function (quiet) {
      var bus = this._peek;
      if (!bus) return;
      this._peek = null;
      fadeGroup(bus);
      if (quiet === true || !ready()) return;
      play('cloth-3', { rate: 1.3, vol: 0.45 });
    },

    /* ---- On/off ---- */

    supported: !!AudioCtx,

    isEnabled: function () {
      return enabled;
    },

    setEnabled: function (on) {
      enabled = !!on;
      try { window.localStorage.setItem(STORE_KEY, enabled ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
      if (master) master.gain.setTargetAtTime(enabled ? VOLUME : 0, ctx.currentTime, 0.02);
      if (!enabled && window.speechSynthesis) window.speechSynthesis.cancel();
    }
  };

  window.siteSounds = sounds;

  // Header "Sound" button
  var button = document.querySelector('.sound-btn');
  if (button) {
    if (!sounds.supported) {
      button.hidden = true;
    } else {
      var state = button.querySelector('.sound-state');
      var show = function () {
        button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        if (state) state.textContent = enabled ? 'on' : 'off';
      };
      show();
      button.addEventListener('click', function () {
        sounds.setEnabled(!enabled);
        show();
        // A little click to confirm it's on
        if (ready()) play('click', { rate: 1.4, vol: 0.5 });
      });
    }
  }
})();
