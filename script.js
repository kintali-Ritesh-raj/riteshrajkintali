(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Plays one of the sound effects from sounds.js (does nothing if it isn't loaded)
  function sound(name, arg) {
    var sfx = window.siteSounds;
    if (sfx && typeof sfx[name] === 'function') sfx[name](arg);
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---- Fit the hero name to the full content width ---- */
  var nameEl = document.querySelector('.hero-name');
  var nameLines = document.querySelectorAll('.hero-line');

  function visibleLines() {
    return Array.prototype.filter.call(nameLines, function (line) {
      return line.getClientRects().length > 0;
    });
  }

  // Visible lines share one size: the one that makes the longest line fill the width
  function fitName() {
    if (!nameEl || !nameLines.length) return;
    var lines = visibleLines();
    var size = Infinity;
    lines.forEach(function (line) {
      line.style.fontSize = '100px';
      var textWidth = line.getBoundingClientRect().width;
      if (textWidth) size = Math.min(size, Math.floor((100 * nameEl.clientWidth) / textWidth));
    });
    if (!isFinite(size)) return;
    lines.forEach(function (line) { line.style.fontSize = size + 'px'; });
    placeChar();
  }

  /* ---- Character: stand beside the "H" of "RITESH" and lean on it ---- */
  var stage = document.querySelector('.hero-stage');
  var charBack = document.querySelector('.char-back');
  var hLetter = document.querySelector('.hero-h');
  var baseline = document.querySelector('.hero-baseline');
  var measureCtx = document.createElement('canvas').getContext('2d');

  // viewBox "-20 -25 220 395": he stands on y=360 (the baseline); x=60, y=110 is the
  // top-right corner of the "H", so his arm lies across the top of its right stem and his
  // hand drapes over the front; his hair starts at y=-20
  var VB_MIN_X = -20;
  var VB_MIN_Y = -25;
  var VB_WIDTH = 220;
  var VB_CORNER_X = 60;
  var VB_CORNER_Y = 110;
  var VB_FEET = 360;
  var VB_HEAD_TOP = -20;

  function capHeight(fontSize) {
    measureCtx.font = '900 ' + fontSize + 'px Archivo';
    var ascent = measureCtx.measureText('H').actualBoundingBoxAscent;
    return ascent || fontSize * 0.72;
  }

  // Only placed once the name is down to "RITESH"; before that the character is hidden
  function placeChar() {
    if (!stage || !charBack || !hLetter || !baseline) return;
    if (!nameEl.classList.contains('is-final')) return;
    stage.style.paddingTop = '';

    var box = stage.getBoundingClientRect();
    var fontSize = parseFloat(nameLines[0].style.fontSize);
    var feetY = baseline.getBoundingClientRect().top - box.top;
    var cornerY = feetY - capHeight(fontSize);
    var scale = (feetY - cornerY) / (VB_FEET - VB_CORNER_Y);
    // Right edge of the "H" itself: its box includes a little side spacing
    var cornerX = hLetter.getBoundingClientRect().right - box.left - fontSize * 0.02;

    var width = VB_WIDTH * scale;
    var left = cornerX - (VB_CORNER_X - VB_MIN_X) * scale;
    var top = feetY - (VB_FEET - VB_MIN_Y) * scale;

    // Make room above the name so the head never overlaps the line above
    var extra = Math.max(0, 8 - (top + (VB_HEAD_TOP - VB_MIN_Y) * scale));
    if (extra) {
      stage.style.paddingTop = parseFloat(getComputedStyle(stage).paddingTop) + extra + 'px';
      top += extra;
    }

    charBack.style.width = width + 'px';
    charBack.style.left = left + 'px';
    charBack.style.top = top + 'px';
    placeAngryBubble();
  }

  // After the "Don't press" crash he's angry: "Don't press the button!" sits above his head,
  // kept inside the hero so it never runs off the edge of the screen
  function placeAngryBubble() {
    var bubble = stage && stage.querySelector('.angry-bubble');
    if (!bubble) return;
    var head = document.querySelector('.char-head').getBoundingClientRect();
    var box = stage.getBoundingClientRect();
    var half = bubble.offsetWidth / 2;
    var centre = head.left + head.width / 2 - box.left;
    var x = Math.min(stage.clientWidth - half - 4, Math.max(half + 4, centre));
    bubble.style.left = x + 'px';
    bubble.style.top = head.top - box.top - 6 + 'px';
    // point the tail at his head even when the bubble had to shift sideways
    bubble.style.setProperty('--tail', Math.min(90, Math.max(10, 50 + ((centre - x) / bubble.offsetWidth) * 100)) + '%');
  }

  // How he reacts depends on how many times "Don't press" has been pressed since the
  // page loaded: angrier on presses 1 to 3, then he breaks down crying from press 4 on
  var ANGRY_LINES = ["Don't press the button!", "I said DON'T press it!", 'Seriously?! Stop pressing it!'];
  var SAD_LINE = "Please… please don't do it.";

  function getUpset(presses) {
    var crying = presses > ANGRY_LINES.length;
    var root = document.documentElement;
    root.classList.toggle('is-angry', !crying);
    root.classList.toggle('is-sad', crying);
    var old = stage.querySelector('.angry-bubble');
    if (old) old.remove();
    var bubble = document.createElement('p');
    bubble.className = 'angry-bubble' + (crying ? ' is-pleading' : '');
    bubble.setAttribute('aria-hidden', 'true');
    bubble.textContent = crying ? SAD_LINE : ANGRY_LINES[presses - 1];
    stage.appendChild(bubble);
    sound('upset', crying);
    // wait a frame so the step away from the "H" has been applied before measuring
    requestAnimationFrame(placeAngryBubble);
  }

  var resizeFrame;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(function () {
      fitName();
    });
  });
  fitName();

  /* ---- Intro: full name -> letters of RAJ and KINTALI fall away -> RITESH. grows
     -> the character walks in and leans on the H ---- */
  var FULL_NAME_HOLD = 1400;
  var LEAVE_TIME = 900;
  var GROW_TIME = 400;

  // Wrap each letter of RAJ and KINTALI so they can fall away one after another
  function splitLetters() {
    var i = 0;
    document.querySelectorAll('.hero-out').forEach(function (word) {
      Array.prototype.slice.call(word.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split('').forEach(function (ch) {
            var span = document.createElement('span');
            span.className = 'ltr';
            span.textContent = ch;
            span.style.setProperty('--i', i);
            span.style.setProperty('--r', (i % 2 ? -1 : 1) * (6 + (i % 3) * 4) + 'deg');
            word.insertBefore(span, node);
            i++;
          });
          word.removeChild(node);
        } else if (node.nodeType === 1) {
          node.classList.add('ltr');
          node.style.setProperty('--i', i++);
        }
      });
    });
  }

  // Shrink the name to RITESH. and animate it from its old size to the new one
  function showFinalName() {
    var line = nameLines[0];
    var keep = line.querySelector('.hero-keep');
    var first = keep.getBoundingClientRect();
    nameEl.classList.add('is-final');
    fitName();
    if (reduceMotion) return;

    var last = keep.getBoundingClientRect();
    var ratio = first.width / last.width;
    line.style.transition = 'none';
    line.style.transform = 'translate(' + (first.left - last.left) + 'px,' + (first.top - last.top) + 'px) scale(' + ratio + ')';
    line.getBoundingClientRect();
    line.style.transition = 'transform ' + GROW_TIME + 'ms cubic-bezier(0.2, 0.7, 0.2, 1)';
    line.style.transform = '';
    setTimeout(function () { line.style.transition = ''; }, GROW_TIME + 50);
  }

  var introStarted = false;
  var introDone = false;
  var introBtn = document.querySelector('.break-btn');
  if (introBtn) introBtn.setAttribute('aria-disabled', 'true');

  // Pressing "Don't press" mid-intro would freeze the letters and the moonwalk halfway,
  // so the button waits until both are finished
  function finishIntro() {
    introDone = true;
    if (introBtn) introBtn.setAttribute('aria-disabled', 'false');
  }

  function runIntro() {
    if (introStarted || !nameEl) return;
    introStarted = true;

    if (reduceMotion) {
      showFinalName();
      stage.classList.add('char-ready');
      finishIntro();
      return;
    }

    splitLetters();
    setTimeout(function () {
      nameEl.classList.add('is-leaving');
      setTimeout(function () {
        showFinalName();
        setTimeout(walkIn, GROW_TIME + 100);
      }, LEAVE_TIME);
    }, FULL_NAME_HOLD);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      fitName();
      runIntro();
    });
  } else {
    runIntro();
  }

  // He moonwalks in from the left, passing behind "RITESH", stops beside the "H",
  // leans on it and waves

  function walkIn() {
    if (!stage || !charBack) {
      finishIntro();
      return;
    }

    var distance = parseFloat(charBack.style.left) + charBack.getBoundingClientRect().width + 24;
    var duration = Math.min(2600, Math.max(1300, distance * 2.4));
    var chars = [charBack];

    chars.forEach(function (svg) { svg.style.transition = 'none'; });
    stage.style.setProperty('--walk-x', -distance + 'px');
    stage.classList.add('is-moonwalk', 'char-ready');
    charBack.getBoundingClientRect(); // apply the start position before animating

    // Glide at a steady pace, easing off just before the stop
    chars.forEach(function (svg) { svg.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.3, 0, 0.55, 1)'; });
    stage.style.setProperty('--walk-x', '0px');
    // Footsteps that travel across the speakers to where he stops (he's still at the start,
    // so his stopping point is the walk distance further right)
    var startBox = charBack.getBoundingClientRect();
    var stopX = startBox.left + startBox.width / 2 + distance;
    sound('walkIn', {
      duration: duration,
      toPan: Math.max(-1, Math.min(1, (stopX / window.innerWidth) * 2 - 1))
    });

    // transitionend can be skipped (for example in a background tab), so a timer backs it up
    var arrived = false;
    function arrive() {
      if (arrived) return;
      arrived = true;
      chars.forEach(function (svg) { svg.style.transition = ''; });
      stage.classList.remove('is-moonwalk');
      sound('lean');
      finishIntro();
      setTimeout(wave, 300);
    }
    charBack.addEventListener('transitionend', function (e) {
      // Ignore transitions bubbling up from inside him (like his head turning)
      if (e.target === charBack && e.propertyName === 'transform') arrive();
    });
    setTimeout(arrive, duration + 150);
  }

  /* ---- Hero character motion: blink, eyes follow the cursor, wave, tilt on scroll ---- */
  var charHead = document.querySelector('.char-head');
  var guide = document.querySelector('.guide');

  function blinkLoop() {
    setTimeout(function () {
      [charBack, guide].forEach(function (el) { if (el) el.style.setProperty('--blink', '0.1'); });
      setTimeout(function () {
        [charBack, guide].forEach(function (el) { if (el) el.style.removeProperty('--blink'); });
        blinkLoop();
      }, 160);
    }, 2500 + Math.random() * 3000);
  }

  function wave() {
    var root = document.documentElement;
    if (root.classList.contains('is-angry') || root.classList.contains('is-sad')) return;
    if (reduceMotion || stage.classList.contains('is-waving')) return;
    if (stage.classList.contains('is-moonwalk') || !stage.classList.contains('char-ready')) return;
    stage.classList.add('is-waving');
    sound('wave');
    sound('hello');
  }

  if (stage && charHead && !reduceMotion) {
    blinkLoop();

    document.querySelector('.h-wave').addEventListener('animationend', function () {
      stage.classList.remove('is-waving');
    });
    charBack.addEventListener('pointerenter', wave);
    charBack.addEventListener('click', wave);

    if (finePointer) {
      var eyeFrame;
      window.addEventListener('pointermove', function (e) {
        cancelAnimationFrame(eyeFrame);
        eyeFrame = requestAnimationFrame(function () {
          var head = charHead.getBoundingClientRect();
          var dx = e.clientX - (head.left + head.width / 2);
          var dy = e.clientY - (head.top + head.height / 2);
          var dist = Math.hypot(dx, dy) || 1;
          var reach = Math.min(1, dist / 300) * 3.5;
          charBack.style.setProperty('--look-x', (dx / dist) * reach + 'px');
          charBack.style.setProperty('--look-y', (dy / dist) * reach + 'px');
        });
      });
    }

    // As the hero scrolls away, the head tilts to look down at the page.
    // Coming back to the top gets a wave.
    var hero = document.querySelector('.hero');
    var wasAway = false;
    var tiltFrame;
    window.addEventListener('scroll', function () {
      cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(function () {
        var progress = Math.min(1, window.scrollY / hero.offsetHeight);
        charHead.style.setProperty('--tilt', progress * 14 + 'deg');
        if (progress > 0.5) wasAway = true;
        if (wasAway && progress < 0.05) {
          wasAway = false;
          wave();
        }
      });
    }, { passive: true });
  }

  /* ---- Guide: hide-and-seek once the hero is gone.
     While you scroll he ducks out of sight. When you stop, he sneaks back in from the
     edge the current section names (data-side: left, right, top or bottom), darts his
     eyes around like a thief, strikes that section's pose and says his line.
     The hero and current section are measured live each time, so he always matches
     what's on screen. ---- */
  if (guide && stage) {
    var bubble = guide.querySelector('.guide-bubble');
    var figure = guide.querySelector('.guide-figure');
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-buddy]'));
    var settleTimer;
    var peekTimers = [];
    var peekY = window.scrollY;

    function heroGone() {
      return stage.getBoundingClientRect().bottom <= 0;
    }

    // The section crossing 45% of the screen height; at the very bottom, the last one
    function currentSection() {
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) return sections[sections.length - 1];
      var line = window.innerHeight * 0.45;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        if (r.top <= line && r.bottom > line) return sections[i];
      }
      return null;
    }

    // He's hidden during the crash and the bike ride, so he makes no sound then
    function guideSeen() {
      var root = document.documentElement;
      return !root.classList.contains('is-crashing') && !root.classList.contains('is-riding') &&
        !root.classList.contains('is-flying');
    }

    function clearPeekTimers() {
      peekTimers.forEach(clearTimeout);
      peekTimers = [];
    }

    function later(fn, ms) {
      peekTimers.push(setTimeout(fn, ms));
    }

    function duck() {
      clearPeekTimers();
      if (guide.classList.contains('is-peeking')) sound('peekOut', !guideSeen());
      guide.classList.remove('is-peeking');
      bubble.classList.remove('is-shown');
      guide.style.removeProperty('--look-x');
    }

    // Shifty eyes: left, right, left, then settle on the content
    function lookAround() {
      [-3.5, 3.5, -3.5].forEach(function (x, i) {
        later(function () { guide.style.setProperty('--look-x', x + 'px'); }, i * 260);
      });
      later(function () { guide.style.removeProperty('--look-x'); }, 780);
    }

    function peek() {
      var gone = heroGone();
      guide.classList.toggle('is-visible', gone);
      var section = gone ? currentSection() : null;
      if (!section) {
        duck();
        return;
      }
      // Already peeking at this section: leave the running sequence alone
      if (guide.classList.contains('is-peeking') && guide.dataset.section === section.id) return;

      duck();
      guide.dataset.section = section.id;
      var side = section.dataset.side || 'left';

      // Switch sides while he's off screen, without animating the jump
      if (guide.dataset.side !== side) {
        figure.style.transition = 'none';
        guide.dataset.side = side;
        figure.getBoundingClientRect();
        figure.style.transition = '';
      }
      guide.dataset.pose = section.dataset.pose || 'point';
      guide.classList.add('is-peeking');
      if (guideSeen()) sound('peekIn', side);
      peekY = window.scrollY;

      if (reduceMotion) {
        bubble.textContent = section.dataset.buddy;
        bubble.classList.add('is-shown');
        return;
      }
      later(lookAround, 420);
      later(function () {
        bubble.textContent = section.dataset.buddy;
        bubble.classList.add('is-shown');
      }, 1200);
      later(function () { bubble.classList.remove('is-shown'); }, 5200);
    }

    function schedulePeek() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(peek, 350);
    }

    // Scrolling scares him off; small nudges (like the hero resizing during its intro) don't.
    // Crossing into another section or back into the hero always does.
    window.addEventListener('scroll', function () {
      if (!guide.classList.contains('is-peeking')) {
        schedulePeek();
        return;
      }
      var section = currentSection();
      var moved = Math.abs(window.scrollY - peekY) > 40;
      var changed = heroGone() ? (section && section.id !== guide.dataset.section) : true;
      if (moved || changed) {
        duck();
        schedulePeek();
      }
    }, { passive: true });

    window.addEventListener('resize', schedulePeek);
    schedulePeek();

    guide.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---- Orange dots that move away from the cursor ---- */
  var dots = document.querySelectorAll('.hero-dots span');

  if (stage && finePointer && !reduceMotion) {
    var RADIUS = 180;
    var PUSH = 70;
    var pointer = null;
    var dotFrame;

    function moveDots() {
      var box = stage.getBoundingClientRect();
      dots.forEach(function (dot) {
        if (!pointer) {
          dot.style.transform = '';
          return;
        }
        var cx = box.left + dot.offsetLeft + dot.offsetWidth / 2;
        var cy = box.top + dot.offsetTop + dot.offsetHeight / 2;
        var dx = cx - pointer.x;
        var dy = cy - pointer.y;
        var dist = Math.hypot(dx, dy) || 1;
        if (dist > RADIUS) {
          dot.style.transform = '';
          return;
        }
        var force = ((RADIUS - dist) / RADIUS) * PUSH;
        dot.style.transform = 'translate(' + (dx / dist) * force + 'px,' + (dy / dist) * force + 'px)';
      });
    }

    stage.addEventListener('pointermove', function (e) {
      pointer = { x: e.clientX, y: e.clientY };
      cancelAnimationFrame(dotFrame);
      dotFrame = requestAnimationFrame(moveDots);
    });
    stage.addEventListener('pointerleave', function () {
      pointer = null;
      moveDots();
    });
  }

  /* ---- Work index: open and close case studies ---- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.work-item'));
  var allButton = document.querySelector('.work-all');

  function setOpen(item, open) {
    item.classList.toggle('is-open', open);
    item.querySelector('.work-toggle').setAttribute('aria-expanded', String(open));
  }

  function syncAllButton() {
    if (!allButton) return;
    var allOpen = items.every(function (item) { return item.classList.contains('is-open'); });
    allButton.textContent = allOpen ? 'Close all' : 'Open all';
    allButton.setAttribute('aria-pressed', String(allOpen));
  }

  items.forEach(function (item) {
    item.querySelector('.work-toggle').addEventListener('click', function () {
      setOpen(item, !item.classList.contains('is-open'));
      syncAllButton();
      updatePreviewHint(item);
    });
  });

  if (allButton) {
    allButton.hidden = false;
    allButton.addEventListener('click', function () {
      var open = allButton.getAttribute('aria-pressed') !== 'true';
      items.forEach(function (item) { setOpen(item, open); });
      syncAllButton();
    });
  }

  /* ---- Cursor-following preview on the work index ---- */
  var preview = document.querySelector('.preview');
  var previewTitle = preview && preview.querySelector('.preview-title');
  var previewMeta = preview && preview.querySelector('.preview-meta');
  var previewHint = preview && preview.querySelector('.preview-hint');

  function updatePreviewHint(item) {
    if (!previewHint) return;
    previewHint.textContent = item.classList.contains('is-open') ? 'Click to close' : 'Click to read the case study';
  }

  if (preview && finePointer && !reduceMotion) {
    items.forEach(function (item) {
      var toggle = item.querySelector('.work-toggle');

      toggle.addEventListener('pointerenter', function () {
        previewTitle.textContent = item.dataset.previewTitle || '';
        previewMeta.textContent = item.dataset.previewMeta || '';
        updatePreviewHint(item);
        preview.classList.add('is-visible');
      });

      toggle.addEventListener('pointermove', function (e) {
        var x = Math.min(e.clientX + 24, window.innerWidth - preview.offsetWidth - 16);
        var y = Math.min(e.clientY + 24, window.innerHeight - preview.offsetHeight - 16);
        preview.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });

      toggle.addEventListener('pointerleave', function () {
        preview.classList.remove('is-visible');
      });
    });
  }

  /* ---- "Don't press" button (header, under Contact): the site falls apart.
     1. The screen flashes and shakes, and a navy floor rises at the bottom.
     2. Everything on screen breaks into pieces (big words split into letters, the "H"
        included) that tumble down with gravity, bounce on the floor and pile up.
        The character leaning on the "H" falls too: he tumbles and lands lying down.
     3. On impact: another shake, a burst of shards, dizzy stars around his head, and
        he gets hurt (bandages, plasters, a bruise).
     4. Everything rewinds back into place. He's back leaning on the "H", still
        bandaged, and stays that way until the page is reloaded. ---- */
  var breakBtn = document.querySelector('.break-btn');

  if (breakBtn && 'animate' in document.documentElement) {
    var breakStatus = document.querySelector('.break-status');
    // Everything inside these breaks apart
    var CRASH_ROOTS = '.site-header, main, .site-footer';
    // Non-text pieces that fall whole
    var WHOLE_PIECES = '.hero-h, .hero-dots span, .status-dot, .work-icon';
    // Text that isn't split into letters
    var SKIP_TEXT = 'svg, .sr-only, .guide, .preview, .hero-h';
    var crashing = false;
    var presses = 0;
    var crashTimers = [];
    var pieceAnims = [];
    var charAnim = null;

    function crashLater(fn, ms) {
      crashTimers.push(setTimeout(fn, ms));
    }

    function crashRand(min, max) {
      return min + Math.random() * (max - min);
    }

    function blockScroll(e) {
      if (e.type !== 'keydown' || [' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(e.key) !== -1) {
        e.preventDefault();
      }
    }

    function lockScroll(on) {
      var method = on ? 'addEventListener' : 'removeEventListener';
      window[method]('wheel', blockScroll, { passive: false });
      window[method]('touchmove', blockScroll, { passive: false });
      window[method]('keydown', blockScroll);
    }

    function crashOnScreen(el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    }

    // Wrap every letter of the on-screen text in its own span so it can fly off alone.
    // Letters of a word sit inside a no-wrap span, so words never break across lines.
    function crashSplitText() {
      var nodes = [];
      document.querySelectorAll(CRASH_ROOTS).forEach(function (root) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: function (node) {
            var parent = node.parentNode;
            if (!node.textContent.trim() || parent.closest(SKIP_TEXT) || !crashOnScreen(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        while (walker.nextNode()) nodes.push(walker.currentNode);
      });
      nodes.forEach(function (node) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (!part.trim()) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var word = document.createElement('span');
          word.className = 'shard-word';
          Array.prototype.forEach.call(part, function (ch) {
            var letter = document.createElement('span');
            letter.className = 'shard-ltr';
            letter.textContent = ch;
            word.appendChild(letter);
          });
          frag.appendChild(word);
        });
        node.parentNode.replaceChild(frag, node);
      });
    }

    function crashJoinText() {
      document.querySelectorAll('.shard-word').forEach(function (word) {
        var parent = word.parentNode;
        parent.replaceChild(document.createTextNode(word.textContent), word);
        parent.normalize();
      });
    }

    function crashEl(className) {
      var el = document.createElement('div');
      el.className = className;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      return el;
    }

    // Shake the page's own blocks, not <body>: a transform on <body> would pull the
    // fixed floor, shards and crashBubble out of place
    var shakeTargets = document.querySelectorAll('.site-header, main, .site-footer');

    function crashShake(strength) {
      shakeTargets.forEach(function (el) {
        el.animate([
          { transform: 'translate(0, 0)' },
          { transform: 'translate(' + -strength + 'px, ' + strength / 2 + 'px)' },
          { transform: 'translate(' + strength + 'px, ' + -strength / 2 + 'px)' },
          { transform: 'translate(' + -strength / 2 + 'px, ' + strength + 'px)' },
          { transform: 'translate(0, 0)' }
        ], { duration: 320, easing: 'ease-out' });
      });
    }

    function burstShards(x, y) {
      for (var i = 0; i < 26; i++) {
        var shard = crashEl('shard shard--' + (i % 3 ? 'navy' : 'orange') + ' shard--' + 'abc'[i % 3]);
        var size = crashRand(8, 22);
        shard.style.setProperty('--size', size + 'px');
        shard.style.left = x - size / 2 + 'px';
        shard.style.top = y - size / 2 + 'px';
        var dx = crashRand(-320, 320);
        var spin = crashRand(-540, 540);
        shard.animate([
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
          { transform: 'translate(' + dx * 0.6 + 'px, ' + crashRand(-260, -80) + 'px) rotate(' + spin / 2 + 'deg)', opacity: 1, offset: 0.45, easing: 'cubic-bezier(0.5, 0, 1, 0.5)' },
          { transform: 'translate(' + dx + 'px, ' + crashRand(-10, 10) + 'px) rotate(' + spin + 'deg)', opacity: 0 }
        ], { duration: crashRand(800, 1200), fill: 'forwards' }).onfinish = function () {
          this.effect.target.remove();
        };
      }
    }

    // A piece falls to the floor and lands somewhere on the pile, with a little bounce
    function crashFall(el, floorTop) {
      var r = el.getBoundingClientRect();
      var big = r.width > 220;
      var dy = floorTop - crashRand(0, big ? 14 : 46) - r.bottom;
      var dx = crashRand(-90, 90);
      var spin = big ? crashRand(-14, 14) : crashRand(-200, 200);
      return el.animate([
        { transform: 'translate(0, 0) rotate(0deg)', easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + spin + 'deg)', offset: 0.78, easing: 'ease-out' },
        { transform: 'translate(' + dx * 1.04 + 'px, ' + (dy - crashRand(8, 22)) + 'px) rotate(' + spin * 1.06 + 'deg)', offset: 0.9, easing: 'ease-in' },
        { transform: 'translate(' + dx * 1.06 + 'px, ' + dy + 'px) rotate(' + spin * 1.1 + 'deg)' }
      ], {
        duration: crashRand(900, 1250),
        // the lower on screen, the sooner it gives way
        delay: crashRand(0, 260) + (1 - r.top / window.innerHeight) * 160,
        fill: 'forwards'
      });
    }

    // The character tumbles over and lands lying on his back on the floor
    function fallCharacter(floorTop) {
      var r = charBack.getBoundingClientRect();
      var spin = -90;
      // Lying down, his box is as tall as he was wide: sit that on the floor
      var dy = floorTop - r.width / 2 - (r.top + r.height / 2) + r.width * 0.08;
      var dx = -Math.min(160, r.left * 0.3);
      return charBack.animate([
        { transform: 'translate(0, 0) rotate(0deg)', easing: 'cubic-bezier(0.5, 0, 1, 0.5)' },
        { transform: 'translate(' + dx * 0.4 + 'px, ' + (-40) + 'px) rotate(25deg)', offset: 0.2, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + spin + 'deg)', offset: 0.82, easing: 'ease-out' },
        { transform: 'translate(' + dx + 'px, ' + (dy - 18) + 'px) rotate(' + (spin - 4) + 'deg)', offset: 0.91, easing: 'ease-in' },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + spin + 'deg)' }
      ], { duration: 1300, delay: 150, fill: 'forwards' });
    }

    // Coloured boxes (the orange bar, buttons, the navy footer) and divider lines belong to
    // containers that don't move, so each visible one is copied into a slab that can fall,
    // and the real background/border is hidden until the page rebuilds
    var hiddenStyles = [];
    var TRANSPARENT = /^(transparent|rgba\(0, 0, 0, 0\))$/;

    function hideStyle(el, prop, value) {
      hiddenStyles.push([el, prop, el.style[prop]]);
      el.style[prop] = value;
    }

    function crashSlab(left, top, width, height, styles) {
      var slab = crashEl('crash-slab');
      slab.style.left = left + 'px';
      slab.style.top = top + 'px';
      slab.style.width = width + 'px';
      slab.style.height = height + 'px';
      Object.keys(styles).forEach(function (prop) { slab.style[prop] = styles[prop]; });
      return slab;
    }

    function crashMakeSlabs() {
      var slabs = [];
      document.querySelectorAll(CRASH_ROOTS).forEach(function (root) {
        [root].concat(Array.prototype.slice.call(root.querySelectorAll('*'))).forEach(function (el) {
          if (el.closest('svg, .guide, .sr-only, .shard-word') || el.closest(WHOLE_PIECES)) return;
          if (!crashOnScreen(el)) return;
          var cs = getComputedStyle(el);
          var r = el.getBoundingClientRect();
          var hasBg = !TRANSPARENT.test(cs.backgroundColor);
          var hasShadow = cs.boxShadow !== 'none';
          if (hasBg || hasShadow) {
            slabs.push(crashSlab(r.left, r.top, r.width, r.height, {
              background: hasBg ? cs.backgroundColor : 'transparent',
              boxShadow: cs.boxShadow,
              borderRadius: cs.borderRadius
            }));
            if (hasBg) hideStyle(el, 'backgroundColor', 'transparent');
            if (hasShadow) hideStyle(el, 'boxShadow', 'none');
          }
          [
            ['Top', r.left, r.top, r.width, 'h'],
            ['Bottom', r.left, r.bottom, r.width, 'h'],
            ['Left', r.left, r.top, r.height, 'v'],
            ['Right', r.right, r.top, r.height, 'v']
          ].forEach(function (b) {
            var side = b[0];
            var size = parseFloat(cs['border' + side + 'Width']);
            if (!size || cs['border' + side + 'Style'] === 'none' || TRANSPARENT.test(cs['border' + side + 'Color'])) return;
            var color = cs['border' + side + 'Color'];
            if (b[4] === 'h') {
              slabs.push(crashSlab(b[1], side === 'Bottom' ? b[2] - size : b[2], b[3], size, { background: color }));
            } else {
              slabs.push(crashSlab(side === 'Right' ? b[1] - size : b[1], b[2], size, b[3], { background: color }));
            }
            hideStyle(el, 'border' + side + 'Color', 'transparent');
          });
        });
      });
      return slabs;
    }

    function crashRestoreSlabs() {
      for (var i = hiddenStyles.length - 1; i >= 0; i--) {
        hiddenStyles[i][0].style[hiddenStyles[i][1]] = hiddenStyles[i][2];
      }
      hiddenStyles = [];
      document.querySelectorAll('.crash-slab').forEach(function (slab) { slab.remove(); });
    }

    function collapse(floorTop) {
      var slabs = crashMakeSlabs();
      crashSplitText();
      var letters = Array.prototype.filter.call(document.querySelectorAll('.shard-ltr'), crashOnScreen);
      var whole = Array.prototype.filter.call(document.querySelectorAll(WHOLE_PIECES), function (el) {
        return !el.closest('.guide') && crashOnScreen(el);
      });
      pieceAnims = letters.concat(whole, slabs).map(function (el) { return crashFall(el, floorTop); });
      charAnim = crashOnScreen(charBack) ? fallCharacter(floorTop) : null;
    }

    function rebuild() {
      pieceAnims.concat(charAnim ? [charAnim] : []).forEach(function (anim) {
        anim.playbackRate = 1.6;
        anim.reverse();
      });
    }

    // Bubble and dizzy stars follow the character's head wherever it ended up
    var crashBubble = null;
    var crashStars = null;

    function crashHeadBox() {
      return charHead.getBoundingClientRect();
    }

    function crashSay(text) {
      if (!crashBubble) crashBubble = crashEl('crash-bubble');
      var head = crashHeadBox();
      var x = Math.min(window.innerWidth - 140, Math.max(140, head.left + head.width / 2));
      crashBubble.style.left = x + 'px';
      crashBubble.style.top = Math.max(70, head.top - 12) + 'px';
      crashBubble.textContent = text;
      crashBubble.classList.add('is-shown');
    }

    function crashHush() {
      if (crashBubble) crashBubble.classList.remove('is-shown');
    }

    function crashShowStars() {
      var head = crashHeadBox();
      crashStars = crashEl('crash-stars');
      crashStars.innerHTML = '<span>★</span><span>★</span><span>★</span>';
      crashStars.style.setProperty('--ring', Math.max(head.width, head.height) * 1.2 + 'px');
      crashStars.style.left = head.left + head.width / 2 + 'px';
      crashStars.style.top = head.top + head.height / 2 + 'px';
    }

    function crashFinish() {
      pieceAnims.forEach(function (anim) { anim.cancel(); });
      if (charAnim) charAnim.cancel();
      pieceAnims = [];
      charAnim = null;
      crashJoinText();
      crashRestoreSlabs();
      document.querySelectorAll('.crash-floor, .crash-flash, .shard, .crash-stars').forEach(function (el) { el.remove(); });
      crashStars = null;
      document.documentElement.classList.remove('is-crashing');
      lockScroll(false);
      // the hero name may need refitting after its letters were joined back up
      fitName();
    }

    function crash() {
      crashing = true;
      breakBtn.setAttribute('aria-disabled', 'true');
      document.documentElement.classList.add('is-crashing');
      lockScroll(true);
      crashTimers.forEach(clearTimeout);
      crashTimers = [];
      crashHush();
      if (breakStatus) breakStatus.textContent = 'You pressed it. The page fell apart.';
      presses++;
      var oldShout = stage.querySelector('.angry-bubble');
      if (oldShout) oldShout.remove();

      var floor = crashEl('crash-floor');
      var floorTop = floor.getBoundingClientRect().top;
      sound('press');

      // Reduced motion: nothing falls; he just gets bandaged, then angry
      if (reduceMotion) {
        floor.remove();
        document.documentElement.classList.add('is-hurt');
        sound('ow');
        crashSay('Nice try. Nothing falls with reduced motion on, but I still got hurt.');
        crashLater(function () {
          crashHush();
          crashFinish();
          getUpset(presses);
          crashing = false;
          breakBtn.setAttribute('aria-disabled', 'false');
        }, 3500);
        return;
      }

      floor.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      crashEl('crash-flash').animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      crashShake(10);
      sound('shatter');
      crashLater(function () {
        collapse(floorTop);
        sound('collapse', !!charAnim);
      }, 120);

      // He hits the floor: shake, shards, crashStars, and the injuries appear
      crashLater(function () {
        crashShake(14);
        document.documentElement.classList.add('is-hurt');
        var target = charAnim ? charBack.getBoundingClientRect() : null;
        burstShards(target ? target.left + target.width / 2 : window.innerWidth / 2, floorTop - 6);
        sound('impact');
        if (charAnim) {
          crashShowStars();
          crashSay('Ow! …I think I broke it.');
          sound('ow');
          sound('dizzy');
        }
      }, 1450);

      crashLater(function () {
        if (charAnim) {
          crashSay("Hang on, I'll fix it…");
          sound('tinker');
        }
      }, 3100);

      // Rewind everything back into place
      crashLater(function () {
        crashHush();
        if (crashStars) crashStars.remove();
        floor.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }],
          { duration: 300, delay: 300, easing: 'ease-in', fill: 'forwards' });
        rebuild();
        sound('rebuild');
      }, 4500);

      crashLater(function () {
        crashFinish();
        sound('fixed');
        getUpset(presses);
        if (breakStatus) breakStatus.textContent = 'The page is back together. The character says: ' + stage.querySelector('.angry-bubble').textContent;
      }, 5600);

      crashLater(function () {
        crashHush();
        crashing = false;
        breakBtn.setAttribute('aria-disabled', 'false');
      }, 8000);
    }

    breakBtn.addEventListener('click', function () {
      if (!crashing && introDone) crash();
    });
  }

  /* ---- Bike ride: when the reader stops scrolling for a few seconds, the character rides
     a bicycle across the bottom of the screen, and again every so often while they keep
     reading. Only when the hero is out of view (so he's never on screen twice), never
     during the crash, and not at all with reduced motion. The ride itself is pure CSS;
     this only decides when it starts. ---- */
  var rider = document.querySelector('.rider');

  if (rider && stage && !reduceMotion) {
    var IDLE_DELAY = 5000;   // how long the page has to sit still before the first ride
    var RIDE_GAP = 20000;    // pause between rides while the reader keeps reading
    var riderBubble = rider.querySelector('.rider-bubble');
    var rideTimer;
    var rideEndTimer;
    var riding = false;
    var stillAt = window.scrollY;

    /* Pedalling. All numbers are in the SVG's own units. The crank turns around the bottom
       bracket, each foot sits on its pedal, and the knee is placed so the thigh and shin
       keep their lengths (two-bone IK from the hip on the saddle). The wheels turn exactly
       as far as the bike travels, so they roll instead of skidding. */
    var CRANK_X = 134, CRANK_Y = 164, CRANK_LEN = 13;
    var HIP_X = 110, HIP_Y = 100, THIGH = 40, SHIN = 37;
    var WHEEL_R = 37;   // outer edge of the tyre
    var GEAR = 1.5;     // wheel turns per pedal turn
    var VIEW_W = 200;   // width of the SVG viewBox
    var rideSpokes = rider.querySelectorAll('.r-spokes');
    var armNear = rider.querySelector('.r-arm-near');
    var armFar = rider.querySelector('.r-arm-far');
    var pedalNear = rider.querySelector('.r-pedal-near');
    var pedalFar = rider.querySelector('.r-pedal-far');
    var legNear = rider.querySelector('.r-leg-near');
    var legFar = rider.querySelector('.r-leg-far');
    var legs = [legNear, legFar].map(function (g) {
      return { line: g.querySelector('.r-leg-line'), shoe: g.querySelector('.r-shoe') };
    });
    var rideStart = 0;
    var rideSpeed = 0;     // SVG units per millisecond
    var pedalFrame;

    function num(n) { return Math.round(n * 100) / 100; }

    function placeLeg(leg, pedalX, pedalY) {
      // The ankle sits just behind and above the pedal, so the ball of the foot is on it
      var ax = pedalX - 4, ay = pedalY - 10;
      var dx = ax - HIP_X, dy = ay - HIP_Y;
      var dist = Math.min(Math.sqrt(dx * dx + dy * dy), THIGH + SHIN - 0.01);
      var along = (THIGH * THIGH - SHIN * SHIN + dist * dist) / (2 * dist);
      var out = Math.sqrt(Math.max(0, THIGH * THIGH - along * along));
      // Knee bends forward, towards the handlebars
      var kx = HIP_X + (along * dx + out * dy) / dist;
      var ky = HIP_Y + (along * dy - out * dx) / dist;
      leg.line.setAttribute('d', 'M' + HIP_X + ' ' + HIP_Y + ' L' + num(kx) + ' ' + num(ky) +
        ' L' + num(ax) + ' ' + num(ay));
      leg.shoe.setAttribute('transform', 'translate(' + num(ax) + ' ' + num(ay) + ')');
    }

    function placePedal(arm, pedal, x, y) {
      arm.setAttribute('d', 'M' + CRANK_X + ' ' + CRANK_Y + ' L' + num(x) + ' ' + num(y));
      pedal.setAttribute('x', num(x - 6));
      pedal.setAttribute('y', num(y - 2));
    }

    // wheelAngle in radians, clockwise (the way the wheels turn riding to the right)
    function poseRider(wheelAngle) {
      var crank = wheelAngle / GEAR;
      var sx = Math.sin(crank) * CRANK_LEN, sy = -Math.cos(crank) * CRANK_LEN;
      placePedal(armNear, pedalNear, CRANK_X + sx, CRANK_Y + sy);
      placePedal(armFar, pedalFar, CRANK_X - sx, CRANK_Y - sy);
      placeLeg(legs[0], CRANK_X + sx, CRANK_Y + sy);
      placeLeg(legs[1], CRANK_X - sx, CRANK_Y - sy);
      var deg = num((wheelAngle * 180 / Math.PI) % 360);
      for (var i = 0; i < rideSpokes.length; i++) {
        rideSpokes[i].setAttribute('transform', 'rotate(' + deg + ')');
      }
    }

    function pedalStep(now) {
      if (!riding) return;
      var travelled = Math.max(0, now - rideStart) * rideSpeed;
      poseRider(travelled / WHEEL_R);
      pedalFrame = requestAnimationFrame(pedalStep);
    }

    poseRider(0);

    function rideLine() {
      var root = document.documentElement;
      if (root.classList.contains('is-sad')) return '*sniff*… keep reading.';
      if (root.classList.contains('is-angry')) return "Still mad. Keep reading.";
      return "Just riding by. Keep reading!";
    }

    function canRide() {
      var root = document.documentElement;
      return !document.hidden &&
        !root.classList.contains('is-crashing') &&
        stage.getBoundingClientRect().bottom <= 0;
    }

    function scheduleRide(ms) {
      clearTimeout(rideTimer);
      stillAt = window.scrollY;
      rideTimer = setTimeout(startRide, ms);
    }

    function endRide() {
      clearTimeout(rideEndTimer);
      cancelAnimationFrame(pedalFrame);
      sound('rideStop');
      rider.classList.remove('is-riding');
      document.documentElement.classList.remove('is-riding');
      riding = false;
      scheduleRide(RIDE_GAP);
    }

    /* Helicopter: takes turns with the bike ride (helicopter first). It flies in from the
       right, weaves across the page and slows down to hover in the middle with its
       searchlight sweeping, then carries on off the left edge. The rotor sound follows
       it across the speakers and gets louder as it comes closer. */
    var heli = document.querySelector('.heli');
    var heliBanner = heli && heli.querySelector('.heli-banner');
    var nextShow = heli ? 'heli' : 'bike';
    var flying = false;
    var flightFrame;
    var flightStart = 0;
    var flightTime = 0;
    var flightEndTimer;
    var lastFlightX = null;
    var lastFlightAt = 0;

    function flightStep(now) {
      if (!flying) return;
      var t = Math.min(1, Math.max(0, (now - flightStart) / flightTime));
      var W = window.innerWidth;
      var H = window.innerHeight;
      var w = heli.offsetWidth;
      var trail = heliBanner ? heliBanner.offsetWidth : 0;
      // Fast at the edges, slowing to a hover in the middle (always moving left)
      var p = t + 0.06 * Math.sin(2 * Math.PI * t);
      var startX = W + 40;
      var endX = -(w + trail + 80);
      var x = startX + (endX - startX) * p + 0.05 * W * Math.sin(4 * Math.PI * p);
      var y = H * (0.16 + 0.1 * Math.sin(3 * Math.PI * p + 0.6)) + 4 * Math.sin(now / 280);
      // Nose dips the faster it goes (it flies nose first, to the left)
      var speed = lastFlightX === null ? 0 : (lastFlightX - x) / Math.max(1, now - lastFlightAt);
      var tilt = -Math.max(0, Math.min(12, speed * 50));
      lastFlightX = x;
      lastFlightAt = now;
      heli.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';
      heli.classList.toggle('is-hovering', t > 0.33 && t < 0.67);

      // Sound: fades in from far away, loudest while it's on screen, fades out leaving
      var centre = x + w / 2;
      var onScreen = Math.max(0, Math.min(1, 1.3 - Math.abs(centre / W - 0.5) * 1.6));
      var level = Math.min(1, t / 0.12, (1 - t) / 0.12) * (0.35 + 0.65 * onScreen);
      if (window.siteSounds && window.siteSounds.heliUpdate) window.siteSounds.heliUpdate((centre / W) * 2 - 1, level);

      if (t >= 1) {
        endFlight();
        return;
      }
      flightFrame = requestAnimationFrame(flightStep);
    }

    function startFlight() {
      flying = true;
      riding = true;
      flightTime = Math.round(Math.min(16000, Math.max(11000, window.innerWidth * 11)));
      flightStart = performance.now();
      lastFlightX = null;
      heli.style.transform = 'translate(' + (window.innerWidth + 40) + 'px, ' + Math.round(window.innerHeight * 0.2) + 'px)';
      document.documentElement.classList.add('is-flying');
      heli.classList.add('is-flying');
      sound('peekOut', true); // the guide is hidden while he flies: stop any rope creaks
      sound('heliStart');
      cancelAnimationFrame(flightFrame);
      flightFrame = requestAnimationFrame(flightStep);
      // requestAnimationFrame stops in a background tab, so a timer makes sure it ends
      flightEndTimer = setTimeout(endFlight, flightTime + 300);
    }

    function endFlight() {
      if (!flying) return;
      flying = false;
      clearTimeout(flightEndTimer);
      cancelAnimationFrame(flightFrame);
      sound('heliStop');
      heli.classList.remove('is-flying', 'is-hovering');
      document.documentElement.classList.remove('is-flying');
      riding = false;
      scheduleRide(RIDE_GAP);
    }

    function startRide() {
      if (riding) return;
      // The page moved since the countdown began (a scroll whose event hasn't arrived yet):
      // the reader isn't sitting still, so start counting again
      if (window.scrollY !== stillAt || !canRide()) {
        scheduleRide(IDLE_DELAY);
        return;
      }
      if (nextShow === 'heli') {
        nextShow = 'bike';
        startFlight();
        return;
      }
      if (heli) nextShow = 'heli';
      riding = true;
      // Same speed on any screen: about 6.5ms per pixel of width, between 5 and 9 seconds
      var time = Math.round(Math.min(9000, Math.max(5000, window.innerWidth * 6.5)));
      rider.style.setProperty('--ride-time', time + 'ms');
      riderBubble.textContent = rideLine();
      document.documentElement.classList.add('is-riding');
      rider.classList.add('is-riding');
      // He crosses from just off the left edge to just off the right edge (ride-across),
      // so the distance is the screen width plus his own width, in SVG units
      var riderWidth = rider.offsetWidth || 1;
      rideSpeed = (window.innerWidth + riderWidth) / time * (VIEW_W / riderWidth);
      rideStart = performance.now();
      sound('peekOut', true); // the guide is hidden while he rides: stop any rope creaks
      sound('rideStart', { time: time });
      cancelAnimationFrame(pedalFrame);
      pedalFrame = requestAnimationFrame(pedalStep);
      // animationend can be skipped (for example in a background tab), so a timer backs it up
      rideEndTimer = setTimeout(endRide, time + 200);
    }

    rider.addEventListener('animationend', function (e) {
      if (e.target === rider && e.animationName === 'ride-across') endRide();
    });

    // Any scrolling or typing resets the countdown; an active ride just carries on
    ['scroll', 'keydown', 'touchstart'].forEach(function (type) {
      window.addEventListener(type, function () {
        if (!riding) scheduleRide(IDLE_DELAY);
      }, { passive: true });
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearTimeout(rideTimer);
      else if (!riding) scheduleRide(IDLE_DELAY);
    });

    scheduleRide(IDLE_DELAY);
  }

  /* ---- Fade sections in as they scroll into view ---- */
  var reveals = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  reveals.forEach(function (el) { observer.observe(el); });
})();
