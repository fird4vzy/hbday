/* Общие данные и утилиты открытки. */

const DEFAULT_CARD = {
  to: 'Чарос',
  from: 'Фирдавс',
  date: '18 августа',
  signoff: 'С теплом,',
  letterTitle: 'С днём рождения!',
  letterIntro: 'Сел писать — и понял, что пожелать хочется много всего. Вот список, читай до конца 😄',
  wishes: [
    'Ну базовое и главное — будь всегда здоровой.',
    'Потом можно сказать — будь богатой, да, деньги, кто же не любит 😅',
    'Мечты и желания: надеюсь, всё, о чём ты думала, мечтала или планировала, сбудется легко и без лишнего.',
    'Чтобы у тебя не было стрессовых ситуаций, потому что этот **** стресс 🤣 плохая штука, всем болезням вина!',
    'Желаю, чтобы на вопрос «какой твой любимый день?» ты отвечала — «Каждый» :)',
    'Желаю, чтобы, когда ты чистишь мандарины, кожура снималась легко и быстро (меня это бесит).',
    'Желаю, чтобы ты никогда не чувствовала одиночества.',
    'Желаю, чтобы твой внутренний огонёк никогда не потух.',
    'Ну и у нас желают много лет жизни — хотя я не знаю зачем, ахахахаха. Ладно, шучу.'
  ],
  letterClosing: 'Желаю вообще всего того, что вспомнил. Надеюсь, прочитаешь все пункты — я пишу это уже минут 20 🤣',
  finaleTitle: 'Ещё раз — с днём рождения!',
  finaleText: 'Пусть этот год будет твоим лучшим.',
  photos: [],
  music: '',
  theme: 'party'
};

const THEMES = {
  party:  { label: 'Праздник', bg: '#17171d', accent: '#ff2e7e', warm: '#ffb347', glow: '#7b2ff7' },
  gold:   { label: 'Золото',   bg: '#16130d', accent: '#ffc233', warm: '#ff8a3d', glow: '#b06f00' },
  neon:   { label: 'Неон',     bg: '#0c1018', accent: '#22d3ee', warm: '#a78bfa', glow: '#2563eb' },
  mint:   { label: 'Мята',     bg: '#0b1512', accent: '#4ade80', warm: '#facc15', glow: '#0d9488' },
  candy:  { label: 'Карамель', bg: '#1a1016', accent: '#fb7185', warm: '#fcd34d', glow: '#c026d3' }
};

const CONFETTI_COLORS = ['#ff2e7e', '#ffb347', '#7b2ff7', '#22d3ee', '#4ade80', '#f8fafc'];

/* Пасхалка: что вылетает из точки нажатия. */
const BURST_EMOJI = ['🍊', '💸', '🎂', '💰', '🎉', '✨', '🍊', '💸'];

/* base64url <-> UTF-8, чтобы открытка целиком помещалась в ссылку. */
function encodeCard(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCard(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

/* Открытка живёт в хэше: index.html#<base64url>.
   В однофайловой сборке перед данными стоит маркер "make:" — его снимаем. */
function readCardFromLocation() {
  let raw = location.hash.replace(/^#/, '');
  if (raw === 'make') raw = '';
  else if (raw.startsWith('make:')) raw = raw.slice(5);
  if (!raw) return null;
  try {
    return Object.assign({}, DEFAULT_CARD, decodeCard(raw));
  } catch (e) {
    console.warn('Не удалось разобрать ссылку открытки:', e);
    return null;
  }
}

function applyTheme(card) {
  const theme = THEMES[card.theme] || THEMES.party;
  const root = document.documentElement;
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--warm', theme.warm);
  root.style.setProperty('--glow', theme.glow);
}

/* Ссылка на музыку -> embed. Поддержаны YouTube, Spotify и прямые mp3. */
function musicSource(url) {
  if (!url) return null;
  const u = url.trim();
  let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (m) {
    const t = (u.match(/[?&]t=(\d+)/) || [])[1];
    return {
      kind: 'iframe',
      src: `https://www.youtube.com/embed/${m[1]}?autoplay=1&loop=1&playlist=${m[1]}` + (t ? `&start=${t}` : '')
    };
  }
  m = u.match(/spotify\.com\/(?:intl-\w+\/)?(track|album|playlist)\/([\w]+)/);
  if (m) return { kind: 'iframe', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?autoplay=1` };
  if (/\.(mp3|ogg|wav|m4a)(\?.*)?$/i.test(u)) return { kind: 'audio', src: u };
  return { kind: 'iframe', src: u };
}

/* Адрес страницы открытки: рядом лежащий index.html либо этот же файл в однофайловой сборке. */
function cardBaseUrl() {
  const url = location.href.split('#')[0];
  return url.endsWith('create.html') ? url.replace(/create\.html$/, 'index.html') : url;
}
