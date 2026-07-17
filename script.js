(() => {
  const canvas = document.getElementById('framePlayer');
  const ctx = canvas.getContext('2d');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const AUTOPLAY_DURATION = 4000; // ms for one complete animation cycle

  // WebP frame sequence: key frames 1–46
  const imageSrcs = [1, 12, 20, 21, 28, 33, 37, 39, 40, 41, 42, 43, 44, 45, 46].map(n => `frames_2/${n}.webp`);

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
    const scale = Math.min((w * 1.30) / img.naturalWidth, (h * 1.30) / img.naturalHeight);
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
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          enableDragScrub();
          // reveal logo ticker after animation completes
          const ticker = document.querySelector('.logo-ticker');
          if (ticker) setTimeout(() => ticker.classList.add('is-visible'), 300);
        }
      }
      requestAnimationFrame(tick);
    }

    // ---------- Drag scrub ----------
    function enableDragScrub() {
      // px of vertical drag to advance one frame
      const PX_PER_FRAME = 10;
      let dragging = false;
      let startY = 0;
      let startFrame = 0;

      function getClientY(e) {
        return e.touches ? e.touches[0].clientY : e.clientY;
      }

      function onDown(e) {
        dragging  = true;
        startY    = getClientY(e);
        startFrame = currentFrame;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }

      function onMove(e) {
        if (!dragging) return;
        // drag down → positive delta → higher frame index (assemble)
        const delta = Math.round((getClientY(e) - startY) / PX_PER_FRAME);
        const next  = Math.max(0, Math.min(images.length - 1, startFrame + delta));
        drawFrame(next);
        e.preventDefault();
      }

      function onUp() {
        if (!dragging) return;
        dragging = false;
        canvas.style.cursor = 'grab';
      }

      canvas.style.cursor = 'grab';
      canvas.addEventListener('mousedown',  onDown, { passive: false });
      canvas.addEventListener('mousemove',  onMove, { passive: false });
      window.addEventListener('mouseup',    onUp);
      canvas.addEventListener('touchstart', onDown, { passive: false });
      canvas.addEventListener('touchmove',  onMove, { passive: false });
      window.addEventListener('touchend',   onUp);
    }

    // Preload all images; start playback once every image is ready
    // AND the preloader has revealed (if present this session).
    let loaded = 0;
    let imagesReady = false;
    let revealReady = !document.getElementById('preloader') ||
                      document.documentElement.classList.contains('preload-done');

const REVEAL_DELAY = 0; // start canvas animation immediately after preloader

    function tryStart() {
      if (imagesReady && revealReady) setTimeout(startAutoplay, REVEAL_DELAY);
    }

    if (!revealReady) {
      // Wait for canvas blur transition to finish before starting autoplay
      window.addEventListener('canvas-revealed', function () {
        revealReady = true;
        tryStart();
      }, { once: true });
    }

    function onLoad() {
      loaded++;
      if (loaded === images.length) {
        imagesReady = true;
        drawFrame(0); // render first frame so it shows through the canvas blur reveal
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

// Favicon pulse animation
(function initFaviconPulse() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) return;

  const FRAMES = 12;
  const INTERVAL = 200;
  const frames = Array.from({ length: FRAMES }, (_, i) =>
    'images/favicon-frames/f' + String(i).padStart(2, '0') + '.png'
  );

  // Preload all frames
  frames.forEach(src => { const img = new Image(); img.src = src; });

  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;

  let idx = 0;
  link.type = 'image/png';
  link.sizes = '32x32';

  const timer = setInterval(function () {
    link.href = frames[idx];
    idx = (idx + 1) % FRAMES;
  }, INTERVAL);

  // Stop if user turns on reduced-motion later
  mq.addEventListener('change', function (e) {
    if (e.matches) {
      clearInterval(timer);
      link.type = 'image/svg+xml';
      link.sizes = '';
      link.href = 'images/favicon.svg';
    }
  });
})();
