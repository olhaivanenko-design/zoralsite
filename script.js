(() => {
  const canvas = document.getElementById('framePlayer');
  const ctx = canvas.getContext('2d');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const AUTOPLAY_DURATION = 4000; // ms for one complete animation cycle

  // Unique image sequence: 1-11.png appears once, then 12.png through 41.png
  const imageSrcs = ['frames_2/1-11.png'];
  for (let i = 12; i <= 41; i++) imageSrcs.push(`frames_2/${i}.png`);

  const images = imageSrcs.map(src => {
    const img = new Image();
    img.src = src;
    return img;
  });

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
    const idx = Math.floor(images.length / 2);
    const wait = setInterval(() => {
      if (images[idx].complete) {
        drawFrame(idx);
        clearInterval(wait);
      }
    }, 50);
  } else {
    // ---------- Autoplay loop ----------
    function startAutoplay() {
      let startTime = null;
      function tick(now) {
        if (startTime === null) startTime = now;
        const progress = ((now - startTime) % AUTOPLAY_DURATION) / AUTOPLAY_DURATION;
        const index = Math.min(Math.floor(progress * images.length), images.length - 1);
        drawFrame(index);
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    // Preload all images; start playback only once every image is ready.
    let loaded = 0;
    function onLoad() {
      loaded++;
      if (loaded === images.length) startAutoplay();
    }
    images.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        onLoad();
      } else {
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onLoad); // treat errors as loaded to not block playback
      }
    });
  }
})();
