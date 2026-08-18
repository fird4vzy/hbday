/* Открытка: подарок → заставка → слайды (открытка, пожелания, фото, финал). */
(function () {
  const card = readCardFromLocation() || Object.assign({}, DEFAULT_CARD);
  applyTheme(card);

  const $ = (id) => document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- тексты ---------- */
  document.title = card.to ? `С днём рождения, ${card.to}! 🎉` : 'С днём рождения!';
  const age = card.age ? `Тебе ${card.age}!` : '';

  $('giftTo').textContent = card.to || 'Тебе';
  $('introName').textContent = card.to || '';
  $('introAge').textContent = age;
  $('cardName').textContent = card.to || '';
  $('cardAge').textContent = age;
  $('cardAge').hidden = !age;
  $('cardDate').textContent = card.date || '';
  $('cardDate').hidden = !card.date;
  $('cardSignoff').textContent = card.signoff || '';
  $('cardFrom').textContent = card.from || '';
  $('letterSign').textContent = card.from ? `— ${card.from}` : '';
  $('finaleTitle').textContent = card.finaleTitle || '';
  $('finaleText').textContent = card.finaleText || '';

  /* ---------- конфетти ---------- */
  const confetti = $('confetti');
  const cctx = confetti.getContext('2d');
  let pieces = [];

  function sizeCanvas(el, context) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = innerWidth * dpr;
    el.height = innerHeight * dpr;
    el.style.width = innerWidth + 'px';
    el.style.height = innerHeight + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makePiece(fromTop) {
    return {
      x: Math.random() * innerWidth,
      y: fromTop ? -20 - Math.random() * innerHeight : Math.random() * innerHeight,
      w: 4 + Math.random() * 6,
      h: 7 + Math.random() * 9,
      speed: 18 + Math.random() * 40,
      sway: 12 + Math.random() * 26,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 3,
      angle: Math.random() * Math.PI,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      alpha: 0.35 + Math.random() * 0.45
    };
  }

  function resetConfetti() {
    pieces = Array.from({ length: innerWidth < 600 ? 34 : 60 }, () => makePiece(false));
  }

  /* ---------- фейерверк на заставке ---------- */
  const fw = $('fireworks');
  const fctx = fw.getContext('2d');
  let sparks = [];
  let fireworksOn = false;

  function burst(x, y) {
    const hue = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
    const count = 34 + ((Math.random() * 16) | 0);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const v = 70 + Math.random() * 130;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: hue });
    }
  }

  let lastBurst = 0;
  function drawFireworks(dt, now) {
    fctx.clearRect(0, 0, innerWidth, innerHeight);
    if (now - lastBurst > 900) {
      lastBurst = now;
      burst(innerWidth * (0.2 + Math.random() * 0.6), innerHeight * (0.15 + Math.random() * 0.45));
    }
    sparks = sparks.filter((s) => s.life > 0);
    sparks.forEach((s) => {
      s.life -= dt * 0.6;
      s.vy += 60 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      fctx.globalAlpha = Math.max(s.life, 0);
      fctx.fillStyle = s.color;
      fctx.fillRect(s.x, s.y, 2.5, 2.5);
    });
    fctx.globalAlpha = 1;
  }

  /* ---------- общий цикл анимации ---------- */
  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    cctx.clearRect(0, 0, innerWidth, innerHeight);
    pieces.forEach((p, i) => {
      p.y += p.speed * dt;
      p.phase += dt;
      p.angle += p.spin * dt;
      const x = p.x + Math.sin(p.phase) * p.sway;
      cctx.save();
      cctx.translate(x, p.y);
      cctx.rotate(p.angle);
      cctx.globalAlpha = p.alpha;
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cctx.restore();
      if (p.y > innerHeight + 30) pieces[i] = makePiece(true);
    });
    cctx.globalAlpha = 1;

    if (fireworksOn) drawFireworks(dt, now);
    requestAnimationFrame(tick);
  }

  function resizeAll() {
    sizeCanvas(confetti, cctx);
    sizeCanvas(fw, fctx);
    resetConfetti();
  }

  resizeAll();
  addEventListener('resize', resizeAll);
  if (!reduced) requestAnimationFrame(tick);

  /* ---------- музыка ---------- */
  const source = musicSource(card.music);
  const toggle = $('musicToggle');
  let playing = false;

  function startMusic() {
    if (!source || playing) return;
    playing = true;
    toggle.classList.add('is-on', 'is-playing');
    if (source.kind === 'audio') {
      const audio = $('musicAudio');
      audio.src = source.src;
      audio.volume = 0.6;
      audio.play().catch(() => { playing = false; toggle.classList.remove('is-playing'); });
    } else {
      const frame = $('musicFrame');
      frame.hidden = false;
      frame.src = source.src;
      /* Spotify рисует свой плеер — его показываем, YouTube прячем за кадром */
      if (/spotify\.com/.test(source.src)) frame.classList.add('is-visible');
    }
  }

  function stopMusic() {
    playing = false;
    toggle.classList.remove('is-playing');
    if (source.kind === 'audio') $('musicAudio').pause();
    else {
      const frame = $('musicFrame');
      frame.src = '';
      frame.classList.remove('is-visible');
      frame.hidden = true;
    }
  }

  if (source) {
    toggle.classList.add('is-on');
    toggle.addEventListener('click', () => (playing ? stopMusic() : startMusic()));
  }

  /* ---------- слайд с фотографиями ---------- */
  const photos = (card.photos || []).filter(Boolean);
  if (photos.length) {
    const slide = document.createElement('article');
    slide.className = 'slide';
    slide.dataset.slide = 'photos';
    slide.innerHTML = '<p class="eyebrow pink">наши кадры</p>' +
                      '<div class="photo-frame"></div><div class="photo-dots"></div>';
    const finale = document.querySelector('[data-slide="finale"]');
    finale.parentNode.insertBefore(slide, finale);

    const frame = slide.querySelector('.photo-frame');
    const dots = slide.querySelector('.photo-dots');
    let shown = 0;

    photos.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.alt = `Фото ${i + 1}`;
      img.loading = i === 0 ? 'eager' : 'lazy';
      if (i === 0) img.classList.add('is-active');
      frame.appendChild(img);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Фото ${i + 1}`);
      if (i === 0) dot.classList.add('is-active');
      dot.addEventListener('click', () => show(i));
      dots.appendChild(dot);
    });

    const imgs = [...frame.children];
    const dotEls = [...dots.children];
    function show(next) {
      shown = (next + photos.length) % photos.length;
      imgs.forEach((el, i) => el.classList.toggle('is-active', i === shown));
      dotEls.forEach((el, i) => el.classList.toggle('is-active', i === shown));
    }
    if (photos.length > 1) setInterval(() => show(shown + 1), 5000);
  }

  /* ---------- письмо с пожеланиями ---------- */
  const wishesEl = $('wishes');
  (card.wishes || []).forEach((text) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span>';
    li.querySelector('span').textContent = text;
    wishesEl.appendChild(li);
  });

  const timers = [];
  let letterPlayed = false;
  let letterDone = false;

  function finishLetter() {
    timers.splice(0).forEach(clearTimeout);
    $('letterTitleText').textContent = card.letterTitle || '';
    $('caret').classList.add('is-done');
    $('letterIntro').textContent = card.letterIntro || '';
    [...wishesEl.children].forEach((li) => li.classList.add('is-shown'));
    $('letterClosing').textContent = card.letterClosing || '';
    $('letterClosing').classList.add('is-shown');
    $('skipHint').hidden = true;
    letterDone = true;
  }

  function playLetter() {
    if (letterPlayed) return;
    letterPlayed = true;
    if (reduced) { finishLetter(); return; }

    const title = card.letterTitle || '';
    const titleEl = $('letterTitleText');
    let i = 0;

    const typeNext = () => {
      titleEl.textContent = title.slice(0, ++i);
      if (i < title.length) timers.push(setTimeout(typeNext, 55));
      else {
        $('caret').classList.add('is-done');
        $('letterIntro').textContent = card.letterIntro || '';
        [...wishesEl.children].forEach((li, n) => {
          timers.push(setTimeout(() => li.classList.add('is-shown'), 260 + n * 420));
        });
        timers.push(setTimeout(() => {
          $('letterClosing').textContent = card.letterClosing || '';
          $('letterClosing').classList.add('is-shown');
          $('skipHint').hidden = true;
          letterDone = true;
        }, 260 + wishesEl.children.length * 420));
      }
    };
    timers.push(setTimeout(typeNext, 400));
  }

  document.querySelector('[data-slide="letter"]').addEventListener('click', (e) => {
    if (letterPlayed && !letterDone && !e.target.closest('button')) finishLetter();
  });

  /* ---------- навигация по слайдам ---------- */
  const slidesEl = $('slides');
  const slides = [...slidesEl.children];
  const dotsEl = $('dots');
  const prevBtn = document.querySelector('.nav-btn[data-dir="prev"]');
  const nextBtn = document.querySelector('.nav-btn[data-dir="next"]');
  let current = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Слайд ${i + 1}`);
    if (i === 0) dot.classList.add('is-active');
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  function goTo(next) {
    current = Math.max(0, Math.min(next, slides.length - 1));
    slides.forEach((el, i) => el.classList.toggle('is-active', i === current));
    [...dotsEl.children].forEach((el, i) => el.classList.toggle('is-active', i === current));
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;
    if (slides[current].dataset.slide === 'letter') playLetter();
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  $('unlockBtn').addEventListener('click', () => goTo(current + 1));
  addEventListener('keydown', (e) => {
    if ($('screenDeck').hidden) return;
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  let touchX = null;
  slidesEl.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  slidesEl.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  /* ---------- переходы между экранами ---------- */
  const screens = { gift: $('screenGift'), intro: $('screenIntro'), deck: $('screenDeck') };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    fireworksOn = name === 'intro' && !reduced;
    if (!fireworksOn) { sparks = []; fctx.clearRect(0, 0, innerWidth, innerHeight); }
    $('backBtn').hidden = name === 'gift';
    scrollTo({ top: 0 });
  }

  let opened = false;
  function openGift() {
    if (opened) return;
    opened = true;
    $('giftbox').classList.add('is-opening');
    startMusic();
    setTimeout(() => showScreen('intro'), reduced ? 0 : 520);
  }

  const box = $('giftbox');
  box.addEventListener('click', openGift);
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(); }
  });

  $('continueBtn').addEventListener('click', () => { showScreen('deck'); goTo(0); });

  $('backBtn').addEventListener('click', () => {
    opened = false;
    box.classList.remove('is-opening');
    showScreen('gift');
  });

  $('replayBtn').addEventListener('click', () => { showScreen('intro'); goTo(0); });

  goTo(0);
  showScreen('gift');
})();
