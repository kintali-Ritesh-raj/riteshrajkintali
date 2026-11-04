/* Resume page: tells transition.js when to open the white cover, slides the paper in,
   and sets up the buttons.

   Download PDF: downloads resume.pdf when it exists. If it hasn't been added yet, the
   button becomes "Save as PDF" and opens the print dialog instead, where the paper
   prints on its own (see the print styles in styles.css). */
(function () {
  var MIN_COVER = 700;
  var MAX_COVER = 3000;
  var PAPER_DELAY = 300; // the paper starts sliding in while the circle is still opening
  var started = Date.now();
  var stack = document.querySelector('.paper-stack');
  var download = document.querySelector('.resume-download');
  var printButton = document.querySelector('.resume-print');
  var revealed = false;

  function reveal() {
    if (revealed) return;
    revealed = true;
    var wait = Math.max(0, MIN_COVER - (Date.now() - started));
    setTimeout(function () {
      if (window.revealPage) window.revealPage();
      setTimeout(function () { stack.classList.add('is-in'); }, PAPER_DELAY);
    }, wait);
  }

  // Wait for the fonts so the paper doesn't reflow as it appears
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reveal);
  else reveal();
  setTimeout(reveal, MAX_COVER);

  function printPaper() {
    window.print();
  }

  printButton.addEventListener('click', printPaper);

  // No resume.pdf yet: turn Download into "Save as PDF" of this page
  function useSaveAsPdf() {
    download.removeAttribute('download');
    download.setAttribute('href', '#');
    download.setAttribute('role', 'button');
    download.innerHTML = 'Save as PDF <span aria-hidden="true">↓</span>';
    download.addEventListener('click', function (e) {
      e.preventDefault();
      printPaper();
    });
  }

  if (location.protocol !== 'file:' && window.fetch) {
    fetch(download.getAttribute('href'), { method: 'HEAD' })
      .then(function (res) { if (!res.ok) useSaveAsPdf(); })
      .catch(useSaveAsPdf);
  }
})();
