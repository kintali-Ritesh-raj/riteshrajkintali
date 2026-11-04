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

  /* ---- "Don't press" button (header, under Contact): the site falls apart.
     1. The screen flashes and shakes, and a navy floor rises at the bottom.
     2. Everything on screen breaks into pieces (big words split into letters, the "H"
        included) that tumble down with gravity, bounce on the floor and pile up.
        The character leaning on the "H" falls too: he tumbles and lands lying down.
     3. On impact: another shake, a burst of shards, dizzy crashStars around his head, and
        he gets hurt (bandages, plasters, a bruise).
     4. Everything rewinds back into place. He's back leaning on the "H", still
        bandaged, and stays that way until the page is reloaded. ---- */
  var breakBtn = document.querySelector('.break-btn');

  if (breakBtn && 'animate' in document.documentElement) {
    var breakStatus = document.querySelector('.break-status');
    var PIECES = [
      '.wordmark', '.nav-list li', '.break-btn',
      '.hero-top > span', '.hero-keep .shard-ltr', '.hero-h', '.hero-dots span',
      '.hero-lede', '.hero-links li', '.cta-inner > span',
      '.section-num', '.section-head h2 .shard-ltr', '.statement', '.timeline > div',
      '.work-intro p', '.work-all', '.work-heading', '.case-role', '.case-link', '.case-body > div',
      '.skills > div', '.contact-lede', '.contact-email .shard-ltr', '.contact-links li',
      '.footer-inner p'
    ].join(',');
    var SPLIT = '.hero-keep, .section-head h2, .contact-email';
    var crashing = false;
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

    // Wrap each letter of the big words so they can fly apart on their own
    function crashSplitLetters() {
      document.querySelectorAll(SPLIT).forEach(function (el) {
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
          acceptNode: function (node) {
            return node.parentNode.closest('.hero-h, .shard-ltr, .sr-only') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          }
        });
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (node) {
          var frag = document.createDocumentFragment();
          node.textContent.split('').forEach(function (ch) {
            if (ch.trim() === '') {
              frag.appendChild(document.createTextNode(ch));
              return;
            }
            var span = document.createElement('span');
            span.className = 'shard-ltr';
            span.textContent = ch;
            frag.appendChild(span);
          });
          node.parentNode.replaceChild(frag, node);
        });
      });
    }

    function crashJoinLetters() {
      document.querySelectorAll('.shard-ltr').forEach(function (span) {
        var parent = span.parentNode;
        parent.replaceChild(document.createTextNode(span.textContent), span);
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

    function collapse(floorTop) {
      crashSplitLetters();
      pieceAnims = Array.prototype.filter.call(document.querySelectorAll(PIECES), function (el) {
        return !el.closest('.guide, .sr-only') && crashOnScreen(el);
      }).map(function (el) { return crashFall(el, floorTop); });
      charAnim = crashOnScreen(charBack) ? fallCharacter(floorTop) : null;
    }

    function rebuild() {
      pieceAnims.concat(charAnim ? [charAnim] : []).forEach(function (anim) {
        anim.playbackRate = 1.6;
        anim.reverse();
      });
    }

    // Bubble and dizzy crashStars follow the character's head wherever it ended up
    var crashBubble = null;
    var crashStars = null;

    function crashHeadBox() {
      return charHead.getBoundingClientRect();
    }

    function crashSay(text) {
      if (!crashBubble) crashBubble = crashEl('crash-crashBubble');
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
      crashStars = crashEl('crash-crashStars');
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
      crashJoinLetters();
      document.querySelectorAll('.crash-floor, .crash-flash, .shard, .crash-crashStars').forEach(function (el) { el.remove(); });
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

      var floor = crashEl('crash-floor');
      var floorTop = floor.getBoundingClientRect().top;

      // Reduced motion: nothing falls; he just gets bandaged
      if (reduceMotion) {
        floor.remove();
        document.documentElement.classList.add('is-hurt');
        crashSay('Nice try. Nothing falls with reduced motion on, but I still got hurt.');
        crashLater(function () {
          crashHush();
          crashFinish();
          crashing = false;
          breakBtn.setAttribute('aria-disabled', 'false');
        }, 3500);
        return;
      }

      floor.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      crashEl('crash-flash').animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      crashShake(10);
      crashLater(function () { collapse(floorTop); }, 120);

      // He hits the floor: shake, shards, crashStars, and the injuries appear
      crashLater(function () {
        crashShake(14);
        document.documentElement.classList.add('is-hurt');
        var target = charAnim ? charBack.getBoundingClientRect() : null;
        burstShards(target ? target.left + target.width / 2 : window.innerWidth / 2, floorTop - 6);
        if (charAnim) {
          crashShowStars();
          crashSay('Ow! …I think I broke it.');
        }
      }, 1450);

      crashLater(function () {
        if (charAnim) crashSay("Hang on, I'll fix it…");
      }, 3100);

      // Rewind everything back into place
      crashLater(function () {
        crashHush();
        if (crashStars) crashStars.remove();
        floor.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }],
          { duration: 300, delay: 300, easing: 'ease-in', fill: 'forwards' });
        rebuild();
      }, 4500);

      crashLater(function () {
        crashFinish();
        if (breakStatus) breakStatus.textContent = 'The page is back together. The character is bandaged up.';
        if (crashOnScreen(charBack)) crashSay("I'm okay! Just a few scratches.");
      }, 5600);

      crashLater(function () {
        crashHush();
        crashing = false;
        breakBtn.setAttribute('aria-disabled', 'false');
      }, 8000);
    }

    breakBtn.addEventListener('click', function () {
      if (!crashing) crash();
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
