(() => {
  const canvas = document.getElementById('framePlayer');
  const ctx = canvas.getContext('2d');
  const pinWrap = document.getElementById('heroPinWrap');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FRAME_COUNT = 80;
  const STATIC_FRAME = 40;

  function frameSrc(i) {
    return `frames/frame_${String(i).padStart(3, '0')}.png`;
  }

  const images = [];
  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.src = frameSrc(i);
    images.push(img);
  }

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    ctx.clearRect(0, 0, w, h);

    // Fit the frame into a smaller box anchored to the right, leaving the
    // rest of the hero empty (the section's own dark background shows
    // through) so the text has room and the artwork reads as a smaller,
    // deliberately placed object rather than a full-bleed cover image.
    const isNarrow = w < 700;
    const boxW = w * (isNarrow ? 0.78 : 0.6);
    const boxH = h * (isNarrow ? 0.24 : 0.82);
    const marginRight = w * (isNarrow ? 0.03 : 0.05);

    const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = w - marginRight - dw;
    const dy = isNarrow ? h * 0.045 : (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  resize();
  window.addEventListener('resize', resize);

  if (reduceMotion) {
    const idx = STATIC_FRAME - 1;
    const wait = setInterval(() => {
      if (images[idx].complete) {
        drawFrame(idx);
        clearInterval(wait);
      }
    }, 50);
  } else {
    // ---------- Scroll-driven playback ----------
    // Frame index tracks how far the hero has scrolled past the top of the
    // viewport, so scrubbing forward/back through the sequence follows the
    // user's scroll direction instead of looping on a timer.
    let scrollRange = 1;

    function computeScrollRange() {
      scrollRange = Math.max(pinWrap.offsetHeight - window.innerHeight, 1);
    }

    function frameForScroll() {
      const rect = pinWrap.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / scrollRange));
      return Math.round(progress * (FRAME_COUNT - 1));
    }

    let ticking = false;
    function redraw() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        drawFrame(frameForScroll());
        ticking = false;
      });
    }

    computeScrollRange();
    window.addEventListener('resize', computeScrollRange);
    window.addEventListener('scroll', redraw, { passive: true });

    // Redraw whenever a frame finishes loading, in case the currently
    // needed frame wasn't ready yet (e.g. a static scroll position on load).
    images.forEach((img) => img.addEventListener('load', redraw));
    redraw();
  }
})();
