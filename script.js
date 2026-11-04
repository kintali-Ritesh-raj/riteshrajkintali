(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

  function runIntro() {
    if (introStarted || !nameEl) return;
    introStarted = true;

    if (reduceMotion) {
      showFinalName();
      stage.classList.add('char-ready');
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
    if (!stage || !charBack) return;

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

    // transitionend can be skipped (for example in a background tab), so a timer backs it up
    var arrived = false;
    function arrive() {
      if (arrived) return;
      arrived = true;
      chars.forEach(function (svg) { svg.style.transition = ''; });
      stage.classList.remove('is-moonwalk');
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
    if (reduceMotion || stage.classList.contains('is-waving')) return;
    if (stage.classList.contains('is-moonwalk') || !stage.classList.contains('char-ready')) return;
    stage.classList.add('is-waving');
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

    function clearPeekTimers() {
      peekTimers.forEach(clearTimeout);
      peekTimers = [];
    }

    function later(fn, ms) {
      peekTimers.push(setTimeout(fn, ms));
    }

    function duck() {
      clearPeekTimers();
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
