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
  let currentFrame = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(currentFrame);
  }

  function drawFrame(index) {
    currentFrame = index;
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    ctx.clearRect(0, 0, w, h);

    // Fill the hero-canvas-wrap while preserving the image's aspect ratio.
    const scale = Math.min((w * 0.96) / img.naturalWidth, (h * 0.96) / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
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
        const progress = Math.min((now - startTime) / AUTOPLAY_DURATION, 1);
        const index = Math.min(Math.floor(progress * images.length), images.length - 1);
        drawFrame(index);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    // Preload all images; start playback once every image is ready
    // AND the preloader has revealed (if present this session).
    let loaded = 0;
    let imagesReady = false;
    let revealReady = !document.getElementById('preloader');

    function tryStart() {
      if (imagesReady && revealReady) startAutoplay();
    }

    if (!revealReady) {
      window.addEventListener('preloader-reveal', function () {
        revealReady = true;
        tryStart();
      }, { once: true });
    }

    function onLoad() {
      loaded++;
      if (loaded === images.length) {
        imagesReady = true;
        tryStart();
      }
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
