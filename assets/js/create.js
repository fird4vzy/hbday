/* Конструктор открытки: собирает форму в ссылку вида index.html#<base64url>. */
(function () {
  const $ = (id) => document.getElementById(id);
  let attached = [];   // фото, вшитые в ссылку (data:URL)

  /* ---------- темы ---------- */
  const themeSelect = $('theme');
  Object.entries(THEMES).forEach(([key, t]) => {
    themeSelect.add(new Option(t.label, key, key === DEFAULT_CARD.theme, key === DEFAULT_CARD.theme));
  });
  themeSelect.addEventListener('change', () => applyTheme({ theme: themeSelect.value }));

  /* ---------- предзаполнение: пример или редактирование существующей ссылки ---------- */
  const preset = readCardFromLocation() || DEFAULT_CARD;
  const TEXT_FIELDS = ['to', 'from', 'date', 'signoff', 'letterTitle', 'letterIntro',
                       'letterClosing', 'finaleTitle', 'finaleText', 'music'];
  TEXT_FIELDS.forEach((id) => { $(id).value = preset[id] || ''; });
  $('age').value = preset.age || '';
  $('wishes').value = (preset.wishes || []).join('\n');
  if (preset.theme && THEMES[preset.theme]) themeSelect.value = preset.theme;

  const presetPhotos = preset.photos || [];
  $('photoUrls').value = presetPhotos.filter((p) => !p.startsWith('data:')).join('\n');
  attached = presetPhotos.filter((p) => p.startsWith('data:'));
  applyTheme({ theme: themeSelect.value });

  /* ---------- сжатие приложенных фото ---------- */
  function compress(file, maxSide = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  $('photoFiles').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    $('photoStatus').textContent = 'Обрабатываю фотографии…';
    try {
      attached = attached.concat(await Promise.all(files.map((f) => compress(f))));
      const kb = Math.round(attached.join('').length / 1024);
      $('photoStatus').textContent = `Прикреплено фото: ${attached.length} (~${kb} КБ в ссылке).`;
    } catch (err) {
      $('photoStatus').textContent = 'Не удалось прочитать один из файлов.';
    }
  });

  /* ---------- сборка данных ---------- */
  function collect() {
    const data = { theme: themeSelect.value };
    TEXT_FIELDS.forEach((id) => { data[id] = $(id).value.trim(); });
    data.age = $('age').value.trim();
    data.wishes = $('wishes').value.split('\n').map((s) => s.trim()).filter(Boolean);
    data.photos = $('photoUrls').value.split('\n').map((s) => s.trim()).filter(Boolean).concat(attached);
    return data;
  }

  const buildUrl = () => cardBaseUrl() + '#' + encodeCard(collect());

  /* ---------- действия ---------- */
  let toastTimer = null;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = buildUrl();
    $('resultLink').value = url;
    $('openBtn').href = url;
    $('waBtn').href = 'https://wa.me/?text=' + encodeURIComponent('Тебе открытка 🎁 ' + url);
    $('result').classList.add('is-visible');

    const kb = Math.round(url.length / 1024);
    $('sizeHint').textContent = kb > 8
      ? `Длина ссылки ~${kb} КБ. Мессенджеры такое обычно переваривают, но если ссылка обрежется — замени вложенные фото на ссылки.`
      : `Длина ссылки ~${kb} КБ — отправляется куда угодно.`;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('previewBtn').addEventListener('click', () => window.open(buildUrl(), '_blank', 'noopener'));

  $('copyBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('resultLink').value);
      toast('Ссылка скопирована');
    } catch (e) {
      $('resultLink').select();
      document.execCommand('copy');
      toast('Ссылка скопирована');
    }
  });
})();
