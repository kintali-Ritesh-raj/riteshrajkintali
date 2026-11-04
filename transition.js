/* Page transition shared by index.html and resume.html.

   Leaving: a click on a link with data-transition sends three circles out from the click
   point (orange, then navy, then white) until white covers the whole screen, shows a
   spinning loader with the attribute's text, then goes to the link.

   Arriving: a page that starts with a .wipe.is-covering element (see resume.html) stays
   covered in white with the loader until it calls window.revealPage(); the cover then
   opens up through a shrinking circle.

   Without JavaScript the links are ordinary links and the cover is hidden by CSS. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LEAVE_TIME = 1150; // circles (about 950ms) plus a moment of the loader

  function buildWipe(label) {
    var wipe = document.createElement('div');
    wipe.className = 'wipe';
    wipe.setAttribute('aria-hidden', 'true');
    wipe.innerHTML =
      '<span class="wipe-circle wipe-circle--orange"></span>' +
      '<span class="wipe-circle wipe-circle--navy"></span>' +
      '<span class="wipe-circle wipe-circle--white"></span>' +
      '<div class="wipe-loader"><span class="wipe-ring"></span><span class="wipe-label"></span></div>';
    wipe.querySelector('.wipe-label').textContent = label;
    document.body.appendChild(wipe);
    return wipe;
  }

  function leave(url, x, y, label) {
    if (reduceMotion) {
      window.location.href = url;
      return;
    }
    var wipe = buildWipe(label);
    // Big enough to reach the farthest corner from the click
    var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 4;
    wipe.querySelectorAll('.wipe-circle').forEach(function (circle) {
      circle.style.width = circle.style.height = r * 2 + 'px';
      circle.style.left = x - r + 'px';
      circle.style.top = y - r + 'px';
    });
    wipe.getBoundingClientRect(); // start from scale(0) before animating
    wipe.classList.add('is-leaving');
    setTimeout(function () { window.location.href = url; }, LEAVE_TIME);
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-transition]');
    if (!link || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in new tab" work
    e.preventDefault();
    var rect = link.getBoundingClientRect();
    // Keyboard "clicks" have no pointer position, so start from the link's centre
    var x = e.clientX || rect.left + rect.width / 2;
    var y = e.clientY || rect.top + rect.height / 2;
    leave(link.href, x, y, link.dataset.transition || 'Loading');
  });

  // Coming back with the browser's back button can restore the page still covered
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    document.querySelectorAll('.wipe.is-leaving').forEach(function (wipe) { wipe.remove(); });
  });

  // Arriving: open the cover once the page says it's ready
  var cover = document.querySelector('.wipe.is-covering');
  window.revealPage = function () {
    if (!cover || cover.classList.contains('is-revealing')) return;
    if (reduceMotion) {
      cover.remove();
      return;
    }
    cover.classList.add('is-revealing');
    setTimeout(function () { cover.remove(); }, 900);
  };
})();
