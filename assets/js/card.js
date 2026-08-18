/* Открытка: подарок → заставка → слайды (открытка, пожелания, фото, финал). */
(function () {
  const card = readCardFromLocation() || Object.assign({}, DEFAULT_CARD);
  applyTheme(card);

  const $ = (id) => document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- тексты ---------- */
  document.title = card.to ? `С днём рождения, ${card.to}! 🎉` : 'С днём рождения!';

  $('giftTo').textContent = card.to || 'Тебе';
  $('cardName').textContent = card.to || '';
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

  /* ---------- пасхалка: тап по фону рассыпает фонтан ---------- */
  let tapBits = [];

  function spawnBurst(x, y) {
    if (reduced || tapBits.length > 90) return;
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = 220 + Math.random() * 320;
      tapBits.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 20 + Math.random() * 20,
        angle: (Math.random() - 0.5) * 0.8,
        spin: (Math.random() - 0.5) * 6,
        life: 1,
        char: BURST_EMOJI[(Math.random() * BURST_EMOJI.length) | 0]
      });
    }
  }

  function drawBurst(dt) {
    tapBits = tapBits.filter((p) => p.life > 0 && p.y < innerHeight + 80);
    tapBits.forEach((p) => {
      p.life -= dt * 0.42;
      p.vy += 780 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.angle);
      cctx.globalAlpha = Math.min(1, Math.max(p.life, 0) * 1.6);
      cctx.font = `${p.size}px serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(p.char, 0, 0);
      cctx.restore();
    });
    cctx.globalAlpha = 1;
  }

  /* Кнопки и ссылки не трогаем — там свои действия. */
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, input, textarea, select')) return;
    spawnBurst(e.clientX, e.clientY);
  });

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
    if (tapBits.length) drawBurst(dt);
    requestAnimationFrame(tick);
  }

  function resizeAll() {
    sizeCanvas(confetti, cctx);
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
  const screens = { gift: $('screenGift'), deck: $('screenDeck') };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    $('backBtn').hidden = name === 'gift';
    scrollTo({ top: 0 });
  }

  let opened = false;
  function openGift() {
    if (opened) return;
    opened = true;
    $('giftbox').classList.add('is-opening');
    startMusic();
    setTimeout(() => { showScreen('deck'); goTo(0); }, reduced ? 0 : 520);
  }

  const box = $('giftbox');
  const giftTilt = $('giftTilt');

  if (!reduced && matchMedia('(hover: hover)').matches) {
    box.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      giftTilt.style.transform = `rotateX(${14 + dy * 16}deg) rotateY(${dx * 24}deg)`;
    });
    box.addEventListener('pointerleave', () => { giftTilt.style.transform = ''; });
  }

  box.addEventListener('click', openGift);
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(); }
  });

  $('backBtn').addEventListener('click', () => {
    opened = false;
    box.classList.remove('is-opening');
    showScreen('gift');
  });

  $('replayBtn').addEventListener('click', () => {
    opened = false;
    box.classList.remove('is-opening');
    showScreen('gift');
  });

  /* ---------- торт: 3D-модель, которую можно крутить ---------- */
  const NAME_ON_CAKE = (card.to || '').trim();

  function buildCake() {
    const orbit = $('cakeOrbit');
    if (!orbit) return null;

    const R = 96;      // радиус
    const H = 76;      // высота бока
    const N = 30;      // из скольких панелей собран цилиндр
    const step = 360 / N;
    const parts = [];

    for (let i = 0; i < N; i++) {
      const a = i * step;
      const panel = document.createElement('div');
      panel.className = 'c-panel';
      panel.style.transform = `translate(-50%, -50%) rotateY(${a}deg) translateZ(${R}em)`;
      /* лёгкая разница яркости по кругу даёт объём */
      panel.style.filter = `brightness(${(0.84 + 0.16 * Math.cos((a - 25) * Math.PI / 180)).toFixed(3)})`;
      const drip = document.createElement('span');
      drip.className = 'c-drip';
      drip.style.height = (20 + Math.round(Math.abs(Math.sin(i * 1.7)) * 16)) + 'em';
      panel.appendChild(drip);
      parts.push(panel);
    }

    /* Крышку торта приподнимаем над кромкой панелей: ровно в их плоскости
       браузер не может решить, что рисовать первым, и прячет её за боками. */
    const TOP_Y = H / 2 + 8;
    const top = document.createElement('div');
    top.className = 'c-top';
    top.style.transform = `translate(-50%, -50%) rotateX(90deg) translateZ(${TOP_Y}em)`;
    parts.push(top);

    /* свеча — тоже цилиндр, иначе с боку она схлопнулась бы в линию */
    const CR = 8, CH = 54, CN = 10;
    for (let i = 0; i < CN; i++) {
      const a = i * (360 / CN);
      const seg = document.createElement('div');
      seg.className = 'c-candle';
      seg.style.transform =
        `translate(-50%, -50%) translateY(${-TOP_Y - CH / 2}em) rotateY(${a}deg) translateZ(${CR}em)`;
      parts.push(seg);
    }

    const flame = document.createElement('div');
    flame.className = 'c-flame';
    flame.style.transform = `translate(-50%, -50%) translateY(${-TOP_Y - CH - 11}em)`;
    parts.push(flame);

    /* имя по окружности: буквы стоят на боку торта */
    const letters = [...NAME_ON_CAKE];
    const spread = 15;
    const start = -((letters.length - 1) / 2) * spread;
    letters.forEach((ch, i) => {
      /* Буква сидит во внешнем блоке: em внутри неё считались бы от её же кегля,
         и translateZ уносил бы её на километры от торта. */
      const el = document.createElement('div');
      el.className = 'c-letter';
      const glyph = document.createElement('span');
      glyph.textContent = ch;
      el.appendChild(glyph);
      el.style.transform =
        `translate(-50%, -50%) rotateY(${start + i * spread}deg) translateZ(${R + 1}em) translateY(6em)`;
      parts.push(el);
    });

    orbit.append(...parts);
    return orbit;
  }

  const orbit = buildCake();

  if (orbit) {
    let angle = -34;      // стартовый разворот: имя видно не целиком
    let velocity = 0.05;  // сама медленно крутится, пока её не трогают
    let dragging = false;
    let lastX = 0;
    let touched = false;

    const apply = () => { orbit.style.transform = `rotateX(14deg) rotateY(${angle}deg)`; };
    apply();

    const spin = () => {
      if (!dragging) {
        angle += velocity;
        if (Math.abs(velocity) > 0.05) velocity *= 0.95;
        else velocity = velocity < 0 ? -0.05 : 0.05;
        apply();
      }
      requestAnimationFrame(spin);
    };
    if (!reduced) requestAnimationFrame(spin);

    const stage = $('cake3d');
    stage.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      stage.setPointerCapture(e.pointerId);
      if (!touched) { touched = true; $('cakeHint').classList.add('is-hidden'); }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      angle += dx * 0.45;
      velocity = dx * 0.12;
      apply();
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  }

  goTo(0);
  showScreen('gift');
})();
