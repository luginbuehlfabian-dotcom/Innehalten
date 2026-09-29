'use strict';
/* =========================================================
   Innehalten – persönliche Meditations-App (PWA)
   Reines JavaScript, keine Abhängigkeiten, kein Build-Schritt.
   ========================================================= */

const COMPLETE_RATIO = 0.9;               // ab 90 % gehört gilt eine Sitzung als erledigt
const AUDIO_CACHE = 'innehalten-audio-v1';
const TIMER_MIN = 1, TIMER_MAX = 90;
const TIMER_PRESETS = [5, 10, 15, 20, 30, 45];
const PALETTE = ['sage', 'peri', 'marigold', 'rose', 'sky', 'sand'];
const MOODS = ['Angespannt', 'Unruhig', 'Neutral', 'Ruhig', 'Gelöst'];
const MOOD_COLORS = ['var(--peri)', 'var(--sky)', 'var(--sand)', 'var(--sage)', 'var(--marigold)'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/* ---------- Helfer ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const abs = f => new URL(f, location.href).href;

const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); return addDays(x, -((x.getDay() + 6) % 7)); };
const dayDiff = (a, b) => Math.round((b - a) / 864e5);

const fmtTime = sec => { sec = Math.max(0, Math.round(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`; };
const fmtMin = sec => sec ? `${Math.max(1, Math.round(sec / 60))} Min` : '';
const fmtClock = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDateLong = d => d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

/** Dauer aus content.json: Zahl = Minuten, Text "mm:ss" oder "h:mm:ss" */
function parseDuration(v) {
  if (typeof v === 'number') return v * 60;
  if (!v) return 0;
  const s = String(v).trim();
  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) return s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? 0 : n * 60;
}

/* ---------- Icons ---------- */
const sv = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const I = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.6v12.8a1.2 1.2 0 0 0 1.8 1l10-6.4a1.2 1.2 0 0 0 0-2L9.3 4.6a1.2 1.2 0 0 0-1.8 1z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.7" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.7" fill="currentColor"/></svg>',
  back15: sv('<path d="M4.6 12.5a7.5 7.5 0 1 0 2.1-6"/><path d="M4.5 3.8v3.9h3.9"/><text x="12.4" y="15.3" text-anchor="middle" font-size="7.2" font-weight="700" fill="currentColor" stroke="none" font-family="ui-rounded,system-ui,sans-serif">15</text>'),
  fwd15: sv('<path d="M19.4 12.5a7.5 7.5 0 1 1-2.1-6"/><path d="M19.5 3.8v3.9h-3.9"/><text x="11.6" y="15.3" text-anchor="middle" font-size="7.2" font-weight="700" fill="currentColor" stroke="none" font-family="ui-rounded,system-ui,sans-serif">15</text>'),
  down: sv('<path d="M6 9.5l6 6 6-6"/>'),
  left: sv('<path d="M14.5 6l-6 6 6 6"/>'),
  right: sv('<path d="M9.5 6l6 6-6 6"/>'),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  search: sv('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  offline: sv('<path d="M7.2 18.5a4.4 4.4 0 0 1-.7-8.8 6 6 0 0 1 11.5 1.7 3.6 3.6 0 0 1-.8 7.1z"/><path d="M9.6 14l1.9 1.9 3.3-3.4"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  minus: sv('<path d="M5 12h14"/>'),
  tabToday: sv('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2M12 19.2v2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M2.8 12h2M19.2 12h2M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>'),
  tabLib: sv('<rect x="3.5" y="4" width="5.5" height="16" rx="1.8"/><rect x="11" y="4" width="4.5" height="16" rx="1.6"/><path d="M17.6 5.4l2.5-.6 2 14.6-2.5.6z"/>'),
  tabTimer: sv('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.3 1.8M9.5 2.8h5M12 2.8V6"/>'),
  tabProg: sv('<path d="M5 20v-6M10 20V9M15 20v-8M20 20V5"/>'),
  sprout: sv('<path d="M12 21v-8"/><path d="M12 13c0-4 2.5-6.5 7-6.5 0 4.2-2.6 6.5-7 6.5z"/><path d="M12 15c0-3.3-2-5.5-6-5.5 0 3.6 2.2 5.5 6 5.5z"/>'),
  edit: sv('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
};
const CAT_ICONS = {
  leaf: sv('<path d="M5 19c0-8.5 5.3-14 14-14 0 8.7-5.5 14-14 14z"/><path d="M5 19l8.5-8.5"/>'),
  moon: sv('<path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z"/>'),
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  wave: sv('<path d="M3 10c3-3.5 6-3.5 9 0s6 3.5 9 0"/><path d="M3 16c3-3.5 6-3.5 9 0s6 3.5 9 0"/>'),
  drop: sv('<path d="M12 3.5c4 4.8 6 8 6 10.8a6 6 0 0 1-12 0c0-2.8 2-6 6-10.8z"/>'),
  heart: sv('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>'),
  wind: sv('<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 15h15a3 3 0 1 1-3 3"/>'),
  stone: sv('<ellipse cx="12" cy="17.5" rx="7" ry="2.8"/><ellipse cx="12" cy="11.8" rx="5" ry="2.4"/><ellipse cx="12" cy="6.8" rx="3" ry="1.8"/>'),
  circle: sv('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/>'),
};
const ICON_KEYS = Object.keys(CAT_ICONS);

function moodFace(n) {
  const c = (n - 3) * 2.6; // Mundkrümmung
  return `<svg class="face" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18" style="fill:${MOOD_COLORS[n - 1]}"/>
    <circle cx="14.5" cy="17" r="1.9" fill="#3B2838"/><circle cx="25.5" cy="17" r="1.9" fill="#3B2838"/>
    <path d="M13.5 ${25.5 - c / 2} Q20 ${25.5 + c} 26.5 ${25.5 - c / 2}" fill="none" stroke="#3B2838" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}

function sceneSVG(ph) {
  const orbs = {
    morning: '<circle class="orb-c" cx="96" cy="104" r="28"/>',
    day: '<circle class="orb-c" cx="258" cy="46" r="24"/><rect class="cloud" x="54" y="40" width="70" height="20" rx="10"/><rect class="cloud" x="80" y="28" width="38" height="20" rx="10"/>',
    evening: '<circle class="orb-c" cx="236" cy="108" r="32"/>',
    night: '<circle class="star" cx="60" cy="30" r="1.6"/><circle class="star" cx="120" cy="52" r="1.2"/><circle class="star" cx="178" cy="24" r="1.5"/><circle class="star" cx="300" cy="70" r="1.2"/><circle class="star" cx="36" cy="72" r="1.1"/><circle class="orb-c" cx="256" cy="44" r="19"/><circle class="moon-cut" cx="265" cy="38" r="16"/>',
  };
  return `<svg viewBox="0 0 340 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-a"/><stop offset="1" class="sky-b"/></linearGradient></defs>
    <rect width="340" height="150" fill="url(#skyg)"/>
    ${orbs[ph]}
    <path class="hill-1" d="M0 118 C60 92 120 96 180 112 S290 104 340 92 V150 H0z"/>
    <path class="hill-2" d="M0 136 C70 116 150 118 214 130 S310 128 340 120 V150 H0z"/>
  </svg>`;
}

const STONES_SVG = `<svg viewBox="0 0 110 90" aria-hidden="true">
  <ellipse cx="55" cy="74" rx="36" ry="11" style="fill:var(--sand-soft)"/>
  <ellipse cx="55" cy="54" rx="24" ry="10" style="fill:var(--sage-soft)"/>
  <ellipse cx="55" cy="37" rx="15" ry="7.5" style="fill:var(--peri-soft)"/>
  <ellipse cx="55" cy="24" rx="8" ry="5" style="fill:var(--marigold-soft)"/></svg>`;

function courseArt(seed) {
  const v = seed % 3;
  if (v === 0) return '<svg class="course-art" viewBox="0 0 120 120"><circle cx="70" cy="50" r="42" opacity=".35"/><circle cx="52" cy="66" r="22" opacity=".6"/></svg>';
  if (v === 1) return '<svg class="course-art" viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" opacity=".25"/><circle cx="60" cy="60" r="28" opacity=".35"/><circle cx="60" cy="60" r="12" opacity=".7"/></svg>';
  return '<svg class="course-art" viewBox="0 0 120 120"><circle cx="46" cy="44" r="26" opacity=".4"/><circle cx="80" cy="60" r="30" opacity=".3"/><circle cx="56" cy="82" r="14" opacity=".65"/></svg>';
}

function paintIcons(root = document) {
  $$('[data-icon]', root).forEach(el => { if (!el.firstChild) el.innerHTML = I[el.dataset.icon] || ''; });
}

/* ---------- IndexedDB ---------- */
const DB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('innehalten', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      };
      r.onsuccess = () => { this._db = r.result; res(this._db); };
      r.onerror = () => rej(r.error);
    });
  },
  async run(store, mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => res(req ? req.result : undefined);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  },
  all(store) { return this.run(store, 'readonly', s => s.getAll()); },
  put(store, v) { return this.run(store, 'readwrite', s => s.put(v)); },
  putMany(store, arr) { return this.run(store, 'readwrite', s => { arr.forEach(v => s.put(v)); return null; }); },
  del(store, k) { return this.run(store, 'readwrite', s => s.delete(k)); },
};

/* ---------- Zustand ---------- */
const S = {
  tab: 'today', sessions: [], kv: {}, cached: new Set(),
  libCat: 'all', libQuery: '', courseId: null,
  calMonth: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  timerMin: 10, moodSel: null, confirmRes: null, sheetOpen: false,
};
let C = null; // Inhalte aus content.json

function setKV(key, value) {
  S.kv[key] = value;
  return DB.put('kv', { key, value }).catch(() => {});
}
function delKV(key) {
  delete S.kv[key];
  return DB.del('kv', key).catch(() => {});
}

/* ---------- Inhalte ---------- */
async function loadContent() {
  try {
    const r = await fetch('content.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    return normalize(await r.json());
  } catch (e) {
    console.warn('content.json konnte nicht geladen werden', e);
    const c = normalize({});
    c.error = true;
    return c;
  }
}

function normalize(raw) {
  const cats = [], catMap = new Map(), ex = new Map(), courseMap = new Map();
  const addCat = c => {
    const i = cats.length;
    const cat = { id: c.id, title: c.title || c.id, color: PALETTE.includes(c.color) ? c.color : PALETTE[i % PALETTE.length], icon: CAT_ICONS[c.icon] ? c.icon : ICON_KEYS[i % ICON_KEYS.length], description: c.description || '', group: c.group || '' };
    cats.push(cat); catMap.set(cat.id, cat); return cat;
  };
  (raw.categories || []).forEach(c => c && c.id && addCat(c));
  const ensureCat = id => (id && !catMap.has(id) ? addCat({ id }) : catMap.get(id));

  const courses = (raw.courses || []).map((c, ci) => {
    ensureCat(c.category);
    const course = { id: c.id || `kurs-${ci + 1}`, title: c.title || 'Kurs', category: c.category, description: c.description || '', seed: ci, units: [] };
    course.units = (c.sessions || c.units || []).map((u, i) => {
      const e = { ...u, id: u.id || `${course.id}-${i + 1}`, type: 'unit', courseId: course.id, index: i, category: u.category || c.category, duration: parseDuration(u.duration) };
      ex.set(e.id, e); return e;
    });
    courseMap.set(course.id, course);
    return course;
  });
  const singles = (raw.singles || raw.exercises || []).map((u, i) => {
    ensureCat(u.category);
    const e = { ...u, id: u.id || `uebung-${i + 1}`, type: 'single', duration: parseDuration(u.duration), tags: (u.tags || []).map(norm) };
    ex.set(e.id, e); return e;
  });
  return { cats, catMap, courses, courseMap, singles, ex };
}

const STILLE_CAT = { id: 'stille', title: 'Stille', color: 'peri', icon: 'circle' };
function catOf(x) {
  if (!x || x.category === 'stille' || x.type === 'timer') return STILLE_CAT;
  return (C && C.catMap.get(x.category)) || { id: x.category || '', title: x.category || 'Ohne Kategorie', color: 'sand', icon: 'circle' };
}
const getDur = e => (e && (S.kv['dur:' + e.id] || e.duration)) || 0;

/* ---------- Statistik ---------- */
function completedSet() { return new Set(S.sessions.filter(s => s.exerciseId).map(s => s.exerciseId)); }
function nextUnit(course, done = completedSet()) { return course.units.find(u => !done.has(u.id)) || null; }

function stats() {
  const days = new Set(S.sessions.map(s => s.day));
  let d = new Date(), current = 0;
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  while (days.has(dayKey(d))) { current++; d = addDays(d, -1); }
  let longest = 0, run = 0, prev = null;
  [...days].sort().forEach(k => {
    const dt = parseDay(k);
    run = prev && dayDiff(prev, dt) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run); prev = dt;
  });
  const totalSec = S.sessions.reduce((a, s) => a + (s.seconds || 0), 0);
  return { days, current, longest, totalMin: Math.round(totalSec / 60), count: S.sessions.length };
}

function weeklyMinutes(n = 8) {
  const w0 = addDays(startOfWeek(new Date()), -7 * (n - 1));
  const weeks = Array.from({ length: n }, (_, i) => ({ start: addDays(w0, 7 * i), sec: 0 }));
  S.sessions.forEach(s => {
    const i = Math.floor(dayDiff(w0, parseDay(s.day)) / 7);
    if (i >= 0 && i < n) weeks[i].sec += s.seconds || 0;
  });
  return weeks;
}

function phase(h = new Date().getHours()) {
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}
const TAG_OF_PHASE = { morning: 'morgen', day: 'tag', evening: 'abend', night: 'nacht' };
const REASON_OF_TAG = {
  morgen: 'Passt gut in deinen Morgen.',
  tag: 'Eine kleine Pause für zwischendurch.',
  abend: 'Zum Ausklingen des Tages.',
  nacht: 'Zum Loslassen vor dem Schlafen.',
};

function greeting() {
  const name = (S.kv.name || '').trim();
  const g = { morning: 'Guten Morgen', day: 'Schön, dass du da bist', evening: 'Guten Abend', night: 'Gute Nacht' }[phase()];
  return name ? `${g}, ${name}` : g;
}

function suggestion() {
  if (!C) return null;
  const done = completedSet();
  const seen = new Set();
  // 1. zuletzt begonnener, noch nicht abgeschlossener Kurs
  for (const s of [...S.sessions].sort((a, b) => b.ts - a.ts)) {
    if (!s.courseId || seen.has(s.courseId)) continue;
    seen.add(s.courseId);
    const c = C.courseMap.get(s.courseId);
    const n = c && nextUnit(c, done);
    if (n) return { ex: n, reason: `Weiter mit „${c.title}“, Einheit ${n.index + 1} von ${c.units.length}.` };
  }
  // 2. Einzelübung passend zur Tageszeit
  const tag = TAG_OF_PHASE[phase()];
  const dayNo = Math.floor(parseDay(dayKey()).getTime() / 864e5);
  const tagged = C.singles.filter(x => x.tags.includes(tag));
  if (tagged.length) return { ex: tagged[dayNo % tagged.length], reason: REASON_OF_TAG[tag] };
  // 3. noch nicht begonnener Kurs
  const fresh = C.courses.find(c => c.units.length && !c.units.some(u => done.has(u.id)));
  if (fresh) return { ex: fresh.units[0], reason: `Der Anfang von „${fresh.title}“.` };
  // 4. irgendeine Einzelübung, täglich wechselnd
  if (C.singles.length) return { ex: C.singles[dayNo % C.singles.length], reason: 'Heute für dich ausgewählt.' };
  const any = C.courses.find(c => c.units.length);
  return any ? { ex: any.units[0], reason: 'Noch einmal von vorn.' } : null;
}

/* ---------- Rendering ---------- */
const view = $('#view');

function render(resetScroll = false) {
  let html = '';
  if (S.tab === 'today') html = renderToday();
  else if (S.tab === 'library') html = S.courseId ? renderCourse() : renderLibrary();
  else if (S.tab === 'timer') html = renderTimer();
  else if (S.tab === 'progress') html = renderProgress();
  view.innerHTML = `<div class="page">${html}</div>`;
  paintIcons(view);
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === S.tab));
  if (resetScroll) view.scrollTop = 0;
}

function setTab(tab) {
  if (tab === S.tab && tab === 'library' && S.courseId) { S.courseId = null; }
  else if (tab === S.tab) { view.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  S.tab = tab;
  render(true);
}

function contentNotice() {
  if (C.error) return `<div class="card"><h3>Inhalte nicht gefunden</h3><p class="muted small">Die Datei content.json konnte nicht geladen werden. Prüfe, ob sie im selben Ordner wie index.html liegt und gültiges JSON enthält.</p></div>`;
  return '';
}

/* Heute */
function renderToday() {
  const st = stats();
  const today = new Date();
  const doneToday = st.days.has(dayKey(today));
  const sug = suggestion();
  const ph = phase();

  let hero;
  if (sug) {
    const e = sug.ex, cat = catOf(e);
    hero = `<section class="card hero c-${cat.color}">
      <div class="scene ${ph}">${sceneSVG(ph)}</div>
      <div class="hero-body">
        <p class="hero-kicker">${doneToday ? 'Heute schon erledigt. Magst du noch eine?' : 'Deine Übung für heute'}</p>
        <h2 class="hero-title">${esc(e.title)}</h2>
        <p class="hero-reason">${esc(sug.reason)}</p>
        <div class="hero-foot">
          <span class="pill">${esc(cat.title)}</span><span class="dur">${fmtMin(getDur(e))}</span>
          <span class="spacer"></span>
          <button class="hero-play" data-act="play" data-id="${esc(e.id)}" aria-label="${esc(e.title)} abspielen"><span data-icon="play"></span></button>
        </div>
      </div>
    </section>`;
  } else {
    hero = `<section class="card hero"><div class="scene ${ph}">${sceneSVG(ph)}</div>
      <div class="hero-body"><h2 class="hero-title">Noch keine Übungen</h2>
      <p class="hero-reason">Trage deine Aufnahmen in content.json ein. Bis dahin kannst du mit dem Stille-Timer meditieren.</p></div></section>`;
  }

  const ws = startOfWeek(today);
  const tk = dayKey(today);
  let weekDone = 0;
  const dots = WD.map((l, i) => {
    const d = addDays(ws, i), k = dayKey(d);
    const done = st.days.has(k); if (done) weekDone++;
    const cls = ['wd-dot', done && 'done', k === tk && 'today', k > tk && 'future'].filter(Boolean).join(' ');
    return `<div><div class="wd-label">${l}</div><div class="${cls}">${done ? '<span data-icon="check"></span>' : ''}</div></div>`;
  }).join('');

  const streakText = st.current === 0
    ? 'Heute ist ein guter Tag, um zu beginnen.'
    : doneToday ? 'Du bist heute schon drangeblieben.' : 'Meditiere heute, damit deine Serie weiterwächst.';

  return `
    <header class="page-head"><p class="date">${fmtDateLong(today)}</p><h1>${esc(greeting())}</h1></header>
    ${contentNotice()}
    ${hero}
    <section class="card">
      <div class="streak">
        <div class="streak-art">${streakArt(st.current)}</div>
        <div><div class="streak-num">${st.current}</div><div class="streak-label">${st.current === 1 ? 'Tag in Folge' : 'Tage in Folge'}</div></div>
      </div>
      <p class="streak-text" style="margin:-8px 0 16px">${streakText}</p>
      <div class="card-head" style="margin-bottom:8px"><h3>Diese Woche</h3><span class="muted small">${weekDone} von 7 Tagen</span></div>
      <div class="week">${dots}</div>
    </section>
    <button class="card quiet-cta" data-act="tab" data-tab="timer">
      <span class="qi"><span data-icon="tabTimer"></span></span>
      <span class="qt"><h3>Stille Meditation</h3><span class="muted small">Ohne Anleitung, mit Gong am Anfang und Ende</span></span>
      <span class="chev" data-icon="right"></span>
    </button>`;
}

function streakArt(n) {
  // eine kleine Pflanze, die mit der Serie wächst (bis 5 Blätter)
  const leaves = Math.min(5, Math.max(1, Math.ceil(n / 3)));
  const L = [
    '<path d="M32 40c0-9 6-14 15-14 0 9-6 14-15 14z" style="fill:var(--sage)"/>',
    '<path d="M32 44c0-8-5-12-13-12 0 8 5 12 13 12z" style="fill:var(--sage)" opacity=".8"/>',
    '<path d="M32 30c0-7 4.5-11 11.5-11 0 7-4.5 11-11.5 11z" style="fill:var(--sage)" opacity=".9"/>',
    '<path d="M32 34c0-6.5-4-10-10.5-10 0 6.5 4 10 10.5 10z" style="fill:var(--sage)" opacity=".7"/>',
    '<circle cx="32" cy="16" r="5" style="fill:var(--marigold)"/>',
  ];
  const stem = n > 0 ? `<path d="M32 56V${n > 6 ? 18 : 28}" stroke="var(--sage)" stroke-width="3" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="31" style="fill:var(--sage-soft)"/>
    <path d="M18 56h28" stroke="var(--sand)" stroke-width="3" stroke-linecap="round"/>
    ${stem}${n > 0 ? L.slice(0, leaves).join('') : '<ellipse cx="32" cy="53" rx="5" ry="3" style="fill:var(--sand)"/>'}
  </svg>`;
}

/* Bibliothek */
function renderLibrary() {
  const chips = [{ id: 'all', title: 'Alle' }, ...C.cats].map(c =>
    `<button class="chip ${S.libCat === c.id ? 'active' : ''}" data-act="cat" data-cat="${esc(c.id)}">${esc(c.title)}</button>`).join('');
  return `
    <header class="page-head"><h1>Bibliothek</h1></header>
    ${contentNotice()}
    <label class="search"><span data-icon="search"></span>
      <input id="search" type="search" placeholder="Titel, Thema oder Kategorie" value="${esc(S.libQuery)}" autocomplete="off" autocorrect="off" enterkeyhint="search"></label>
    <div class="chips" role="tablist">${chips}</div>
    <div id="lib-results" class="page">${libResults()}</div>`;
}

function exRow(e, opts = {}) {
  const cat = catOf(e);
  const done = opts.done;
  const cached = e.file && S.cached.has(abs(e.file));
  const iconInner = done ? '<span data-icon="check"></span>'
    : opts.number ? String(opts.number)
    : `<span class="ci">${CAT_ICONS[cat.icon]}</span>`;
  const meta = [opts.showCat !== false ? `<span>${esc(cat.title)}</span>` : '', getDur(e) ? `<span>${fmtMin(getDur(e))}</span>` : '', opts.extraMeta || ''].join('');
  return `<button class="row c-${cat.color} ${opts.next ? 'next' : ''}" data-act="play" data-id="${esc(e.id)}">
    <span class="row-icon ${done ? 'done' : ''}">${iconInner}</span>
    <span class="row-body"><span class="row-title">${esc(e.title)}</span>
      <span class="row-meta">${meta}</span>
      ${opts.desc && e.description ? `<span class="row-desc">${esc(e.description)}</span>` : ''}
    </span>
    <span class="row-end">${cached ? '<span data-icon="offline" title="Offline verfügbar"></span>' : ''}</span>
  </button>`;
}

function courseCard(c, done) {
  const cat = catOf(c);
  const n = c.units.filter(u => done.has(u.id)).length;
  const next = nextUnit(c, done);
  const pct = c.units.length ? Math.round(n / c.units.length * 100) : 0;
  return `<button class="course-card c-${cat.color}" data-act="course" data-id="${esc(c.id)}">
    ${courseArt(c.seed)}
    <h3>${esc(c.title)}</h3>
    <p class="cc-meta">${c.units.length} ${c.units.length === 1 ? 'Einheit' : 'Einheiten'}</p>
    <p class="cc-next">${next ? (n ? `Weiter: Einheit ${next.index + 1}` : 'Neu') : 'Abgeschlossen'}</p>
    <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
  </button>`;
}

function libResults() {
  const done = completedSet();
  const q = norm(S.libQuery.trim());
  const inCat = x => S.libCat === 'all' || x.category === S.libCat;
  const hay = x => norm(`${x.title} ${x.description || ''} ${catOf(x).title}`);

  if (q) {
    const courses = C.courses.filter(c => inCat(c) && hay(c).includes(q));
    const items = [...C.singles, ...C.courses.flatMap(c => c.units)].filter(e => inCat(e) && hay(e).includes(q));
    if (!courses.length && !items.length) return emptyState('Nichts gefunden', `Zu „${esc(S.libQuery)}“ gibt es keine Übung.`);
    return `${courses.length ? `<div class="courses">${courses.map(c => courseCard(c, done)).join('')}</div>` : ''}
      ${items.length ? `<div class="list">${items.map(e => exRow(e, { done: done.has(e.id), extraMeta: e.courseId ? `<span>${esc(C.courseMap.get(e.courseId).title)}</span>` : '' })).join('')}</div>` : ''}`;
  }

  const cats = C.cats.filter(c => S.libCat === 'all' || c.id === S.libCat);
  let html = '', lastGroup = null;
  for (const cat of cats) {
    const courses = C.courses.filter(c => c.category === cat.id);
    const singles = C.singles.filter(e => e.category === cat.id);
    if (!courses.length && !singles.length) continue;
    if (S.libCat === 'all' && cat.group && cat.group !== lastGroup) { html += `<h2 class="group-title">${esc(cat.group)}</h2>`; lastGroup = cat.group; }
    html += `<h2 class="section-title">${esc(cat.title)}</h2>`;
    if (courses.length) html += `<div class="courses">${courses.map(c => courseCard(c, done)).join('')}</div>`;
    if (singles.length) html += `<div class="list">${singles.map(e => exRow(e, { showCat: false, desc: true })).join('')}</div>`;
  }
  return html || emptyState('Hier ist noch nichts', 'Sobald du Übungen in content.json einträgst, erscheinen sie hier.');
}

function emptyState(title, text) {
  return `<div class="empty">${STONES_SVG}<h3>${title}</h3><p class="muted small">${text}</p></div>`;
}

function renderCourse() {
  const c = C.courseMap.get(S.courseId);
  if (!c) { S.courseId = null; return renderLibrary(); }
  const done = completedSet();
  const cat = catOf(c);
  const n = c.units.filter(u => done.has(u.id)).length;
  const next = nextUnit(c, done);
  const pct = c.units.length ? Math.round(n / c.units.length * 100) : 0;
  const cta = next
    ? `<button class="btn primary block" data-act="play" data-id="${esc(next.id)}"><span data-icon="play"></span>${n ? `Einheit ${next.index + 1} starten` : 'Kurs beginnen'}</button>`
    : c.units.length ? `<button class="btn soft block" data-act="play" data-id="${esc(c.units[0].id)}">Kurs abgeschlossen. Noch einmal hören</button>` : '';
  return `
    <button class="back" data-act="back"><span data-icon="left"></span>Bibliothek</button>
    <section class="course-hero c-${cat.color}">
      ${courseArt(c.seed)}
      <h1>${esc(c.title)}</h1>
      ${c.description ? `<p>${esc(c.description)}</p>` : ''}
      <p class="progress-text">${n} von ${c.units.length} Einheiten abgeschlossen</p>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </section>
    ${cta}
    <div class="list">${c.units.map(u => exRow(u, { number: u.index + 1, done: done.has(u.id), next: next && u.id === next.id, showCat: false, desc: true })).join('')}</div>`;
}

/* Timer */
function renderTimer() {
  const m = S.timerMin;
  const quietCount = S.sessions.filter(s => s.type === 'timer').length;
  return `
    <header class="page-head"><h1>Stille</h1><p class="muted">Meditation ohne Anleitung</p></header>
    <section class="card timer-card">
      <div class="dial">
        <button class="round-btn" data-act="tdec" aria-label="Eine Minute weniger" ${m <= TIMER_MIN ? 'disabled' : ''}><span data-icon="minus"></span></button>
        <div class="dial-center"><span class="dial-num" id="dial-num">${m}</span><span class="dial-unit">Minuten</span></div>
        <button class="round-btn" data-act="tinc" aria-label="Eine Minute mehr" ${m >= TIMER_MAX ? 'disabled' : ''}><span data-icon="plus"></span></button>
      </div>
      <div class="chips wrap">${TIMER_PRESETS.map(p => `<button class="chip ${p === m ? 'active' : ''}" data-act="tpreset" data-v="${p}">${p} Min</button>`).join('')}</div>
      <button class="btn primary block" data-act="tstart"><span data-icon="play"></span>Stille beginnen</button>
      <p class="hint center">Ein Klangschalen-Gong erklingt zu Beginn und am Ende. Der Timer läuft auch bei gesperrtem Bildschirm weiter.</p>
    </section>
    ${quietCount ? `<p class="hint center">${quietCount} stille ${quietCount === 1 ? 'Sitzung' : 'Sitzungen'} bisher</p>` : ''}`;
}

/* Fortschritt */
function renderProgress() {
  const st = stats();
  const tk = dayKey();
  const m = S.calMonth;
  const first = new Date(m.getFullYear(), m.getMonth(), 1, 12);
  const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const nowMonth = new Date(); const isCurrentMonth = m.getFullYear() === nowMonth.getFullYear() && m.getMonth() === nowMonth.getMonth();
  let cells = WD.map(w => `<div class="cal-wd">${w}</div>`).join('') + '<div></div>'.repeat(lead);
  for (let d = 1; d <= daysIn; d++) {
    const k = `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(d)}`;
    const has = st.days.has(k);
    const cls = ['cal-day', has && 'has', k === tk && 'today', k > tk && 'future'].filter(Boolean).join(' ');
    cells += has ? `<button class="${cls}" data-act="day" data-day="${k}" aria-label="${d}. – Sitzungen ansehen">${d}</button>` : `<div class="${cls}">${d}</div>`;
  }
  const monthCount = [...st.days].filter(k => k.startsWith(`${m.getFullYear()}-${pad(m.getMonth() + 1)}`)).length;

  const weeks = weeklyMinutes(8);
  const max = Math.max(10, ...weeks.map(w => w.sec / 60));
  const bars = weeks.map((w, i) => {
    const min = Math.round(w.sec / 60);
    return `<div class="bar-col ${i === weeks.length - 1 ? 'now' : ''}">
      <span class="bar-val">${min || ''}</span>
      <div class="bar-track"><div class="bar-fill" style="height:${Math.max(2, min / max * 100)}%"></div></div>
      <span class="bar-lbl">${w.start.getDate()}.${w.start.getMonth() + 1}.</span></div>`;
  }).join('');

  const recent = [...S.sessions].sort((a, b) => b.ts - a.ts).slice(0, 6);
  const lastBackup = S.kv.lastBackup;
  const backupDue = S.sessions.length && (!lastBackup || Date.now() - lastBackup > 14 * 864e5);

  return `
    <header class="page-head"><h1>Fortschritt</h1></header>
    <div class="stats">
      <div class="stat"><div class="stat-num">${st.current}<small>${st.current === 1 ? 'Tag' : 'Tage'}</small></div><div class="stat-label">Aktuelle Serie</div></div>
      <div class="stat"><div class="stat-num">${st.longest}<small>${st.longest === 1 ? 'Tag' : 'Tage'}</small></div><div class="stat-label">Längste Serie</div></div>
      <div class="stat"><div class="stat-num">${st.totalMin}<small>Min</small></div><div class="stat-label">Gesamtzeit</div></div>
      <div class="stat"><div class="stat-num">${st.count}</div><div class="stat-label">Sitzungen</div></div>
    </div>

    <section class="card">
      <div class="card-head">
        <div><h2>${MONTHS[m.getMonth()]} ${m.getFullYear()}</h2><p class="muted small">${monthCount} ${monthCount === 1 ? 'Tag' : 'Tage'} meditiert</p></div>
        <div class="cal-nav">
          <button data-act="cal" data-v="-1" aria-label="Vorheriger Monat"><span data-icon="left"></span></button>
          <button data-act="cal" data-v="1" aria-label="Nächster Monat" ${isCurrentMonth ? 'disabled' : ''}><span data-icon="right"></span></button>
        </div>
      </div>
      <div class="cal-grid">${cells}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Minuten pro Woche</h2><span class="muted small">8 Wochen</span></div>
      <div class="bars">${bars}</div>
    </section>

    ${recent.length ? `<h2 class="section-title">Zuletzt</h2>
    <div class="list">${recent.map(entryRow).join('')}</div>` : ''}

    <h2 class="section-title">Einstellungen und Backup</h2>
    <section class="card settings">
      <div class="field"><label for="name-input">Wie darf ich dich begrüßen?</label>
        <input id="name-input" class="text-input" type="text" placeholder="Dein Vorname" value="${esc(S.kv.name || '')}" autocomplete="given-name" enterkeyhint="done"></div>
      <p class="hint ${backupDue ? 'warn' : ''}">${lastBackup ? `Letztes Backup am ${new Date(lastBackup).toLocaleDateString('de-DE')}.` : 'Noch kein Backup gespeichert.'} Dein Fortschritt liegt nur auf diesem Gerät. Sichere ihn regelmäßig, zum Beispiel in iCloud Drive.</p>
      <div class="btn-row">
        <button class="btn soft" data-act="export">Backup sichern</button>
        <button class="btn soft" data-act="import">Backup laden</button>
      </div>
      <p class="hint">Offline gespeichert: ${S.cached.size} ${S.cached.size === 1 ? 'Übung' : 'Übungen'}. ${S.cached.size ? '<button class="link-btn" data-act="clear-offline">Offline-Speicher leeren</button>' : ''}</p>
    </section>`;
}

function entryRow(s) {
  const d = parseDay(s.day);
  const when = s.day === dayKey() ? 'Heute' : s.day === dayKey(addDays(new Date(), -1)) ? 'Gestern' : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return `<button class="entry" data-act="edit-session" data-id="${esc(s.id)}">
    ${s.mood ? moodFace(s.mood) : '<span class="no-face"></span>'}
    <span class="row-body"><span class="row-title">${esc(s.title)}</span>
      <span class="row-meta"><span>${when}, ${fmtClock(s.ts)}</span><span>${fmtMin(s.seconds)}</span></span>
      ${s.note ? `<span class="entry-note">${esc(s.note)}</span>` : ''}
    </span></button>`;
}

/* ---------- Sheets ---------- */
const sheet = $('#sheet'), backdrop = $('#backdrop');
function openSheet(html) {
  sheet.innerHTML = `<div class="handle"></div>${html}`;
  paintIcons(sheet);
  sheet.scrollTop = 0;
  requestAnimationFrame(() => { sheet.classList.add('open'); backdrop.classList.add('open'); });
  S.sheetOpen = true;
}
function closeSheet() {
  sheet.classList.remove('open'); backdrop.classList.remove('open');
  S.sheetOpen = false;
  if (S.confirmRes) { const r = S.confirmRes; S.confirmRes = null; r(false); }
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
}
function confirmSheet(title, text, okLabel, danger = false) {
  return new Promise(res => {
    if (S.confirmRes) S.confirmRes(false);
    openSheet(`<h2>${title}</h2>${text ? `<p class="muted">${text}</p>` : ''}
      <div class="sheet-actions"><button class="btn soft" data-act="confirm-no">Abbrechen</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-act="confirm-yes">${okLabel}</button></div>`);
    S.confirmRes = res;
  });
}

function moodSheet(id, editing = false) {
  const s = S.sessions.find(x => x.id === id);
  if (!s) return;
  S.moodSel = s.mood || null;
  const faces = MOODS.map((l, i) => `<button class="mood ${S.moodSel === i + 1 ? 'sel' : ''}" data-act="mood" data-v="${i + 1}" aria-label="${l}">${moodFace(i + 1)}<span>${l}</span></button>`).join('');
  openSheet(`
    <h2>${editing ? esc(s.title) : 'Schön, dass du dir die Zeit genommen hast.'}</h2>
    <p class="muted">${editing ? `${parseDay(s.day).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}, ${fmtClock(s.ts)}, ${fmtMin(s.seconds)}` : 'Wie fühlst du dich jetzt?'}</p>
    <div class="moods">${faces}</div>
    <textarea id="note" rows="3" maxlength="500" placeholder="Kurze Notiz (optional)">${esc(s.note || '')}</textarea>
    <div class="sheet-actions">
      ${editing ? `<button class="btn danger" data-act="del-session" data-id="${esc(s.id)}">Eintrag löschen</button>` : '<button class="btn soft" data-act="sheet-close">Überspringen</button>'}
      <button class="btn primary" data-act="mood-save" data-id="${esc(s.id)}">Speichern</button>
    </div>`);
}

function daySheet(k) {
  const list = S.sessions.filter(s => s.day === k).sort((a, b) => a.ts - b.ts);
  const min = Math.round(list.reduce((a, s) => a + (s.seconds || 0), 0) / 60);
  openSheet(`<h2>${parseDay(k).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
    <p class="muted">${list.length} ${list.length === 1 ? 'Sitzung' : 'Sitzungen'}, ${min} Minuten</p>
    <div>${list.map(entryRow).join('')}</div>
    <div class="sheet-actions single"><button class="btn soft" data-act="sheet-close">Schließen</button></div>`);
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
$('#toast').addEventListener('click', () => $('#toast').classList.remove('show'));

/* ---------- Offline-Audio ---------- */
async function refreshCached() {
  if (!('caches' in window)) return;
  try { const c = await caches.open(AUDIO_CACHE); S.cached = new Set((await c.keys()).map(r => r.url)); } catch (e) { /* ignorieren */ }
}
async function cacheAudio(url) {
  if (!('caches' in window) || S.cached.has(url)) return;
  try {
    const c = await caches.open(AUDIO_CACHE);
    if (await c.match(url)) { S.cached.add(url); return; }
    const r = await fetch(url);
    if (r.ok && r.status === 200) { await c.put(url, r); S.cached.add(url); }
  } catch (e) { /* offline oder Speicher voll – egal */ }
}

/* ---------- Player ---------- */
const audio = $('#audio');
const player = $('#player');
const seek = $('#p-seek');
let P = null; // aktuelle Wiedergabe

function newPlayback(ex, mode) {
  return { ex, mode, recorded: false, sessionId: null, carry: 0, resumeAt: 0, timerDur: 0, blobUrl: null, seeking: false, lastSave: 0, lastPos: 0 };
}

function showPlayer() {
  const cat = catOf(P.ex);
  player.className = `player c-${cat.color}`;
  player.dataset.mode = P.mode;
  $('#p-cat').textContent = cat.title;
  $('#p-title').textContent = P.ex.title;
  $('#p-desc').textContent = P.mode === 'timer' ? `${Math.round(P.timerDur / 60)} Minuten Stille. Ruhig atmen, nichts tun müssen.` : (P.ex.description || '');
  player.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => player.classList.add('open'));
  updatePlayerUI();
}

function hidePlayer() {
  player.classList.remove('open', 'playing');
  player.setAttribute('aria-hidden', 'true');
}

function openPlayer(ex) {
  if (P) teardown();
  if (!ex.file) { toast('Für diese Übung ist keine Audiodatei eingetragen.'); return; }
  P = newPlayback(ex, 'audio');
  const url = abs(ex.file);
  const saved = S.kv['pos:' + ex.id] || 0;
  const dur = getDur(ex);
  if (saved > 20 && (!dur || saved < dur * 0.95)) P.resumeAt = saved;
  audio.src = P.resumeAt ? `${url}#t=${Math.floor(P.resumeAt)}` : url;
  showPlayer();
  if (P.resumeAt) { player.classList.add('resumed'); $('#p-resume-at').textContent = fmtTime(P.resumeAt); P.carry = P.resumeAt; }
  audio.play().catch(() => {});
  setMediaSession();
  setTimeout(() => cacheAudio(url), 1500);
}

function seekBy(d) {
  if (!P || P.mode !== 'audio') return;
  const dur = isFinite(audio.duration) ? audio.duration : getDur(P.ex);
  audio.currentTime = clamp(audio.currentTime + d, 0, Math.max(0, dur - 0.5));
  updatePlayerUI();
}

function currentDuration() {
  if (!P) return 0;
  if (P.mode === 'timer') return P.timerDur;
  return isFinite(audio.duration) && audio.duration > 0 ? audio.duration : getDur(P.ex);
}

function heardSeconds() {
  let t = 0;
  const r = audio.played;
  for (let i = 0; i < r.length; i++) t += r.end(i) - r.start(i);
  return t + P.carry;
}

function updatePlayerUI() {
  if (!P) return;
  const dur = currentDuration();
  const t = Math.min(audio.currentTime || 0, dur || Infinity);
  const p = dur ? clamp(t / dur, 0, 1) : 0;
  if (!P.seeking) seek.value = Math.round(p * 1000);
  seek.style.setProperty('--p', `${(P.seeking ? seek.value / 10 : p * 100)}%`);
  $('#p-elapsed').textContent = fmtTime(t);
  $('#p-remaining').textContent = '−' + fmtTime(dur - t);
  if (P.mode === 'timer') $('#p-big').textContent = t >= dur ? 'Fertig' : fmtTime(dur - t);
}

function checkComplete() {
  if (!P || P.recorded) return;
  const dur = currentDuration();
  if (!dur) return;
  const heard = P.mode === 'timer' ? audio.currentTime : heardSeconds();
  if (heard >= dur * COMPLETE_RATIO) recordSession();
}

async function recordSession() {
  if (!P || P.recorded) return;
  P.recorded = true;
  const ex = P.ex, timer = P.mode === 'timer';
  const s = {
    id: uid(), ts: Date.now(), day: dayKey(),
    type: timer ? 'timer' : ex.type,
    exerciseId: timer ? null : ex.id,
    courseId: ex.courseId || null,
    title: ex.title,
    category: timer ? 'stille' : ex.category,
    seconds: Math.round(currentDuration()),
    mood: null, note: '',
  };
  P.sessionId = s.id;
  S.sessions.push(s);
  player.classList.add('recorded');
  if (!timer) delKV('pos:' + ex.id);
  try { await DB.put('sessions', s); } catch (e) { toast('Sitzung konnte nicht gespeichert werden.'); }
}

function savePosition(force = false) {
  if (!P || P.mode !== 'audio' || P.recorded) return;
  const now = Date.now();
  if (!force && now - P.lastSave < 5000) return;
  P.lastSave = now;
  const t = audio.currentTime || 0;
  if (t > 5) setKV('pos:' + P.ex.id, Math.floor(t));
}

/** Player schließen. Stoppt die Wiedergabe und fragt ggf. nach der Stimmung. */
async function closePlayer() {
  if (!P) { hidePlayer(); return; }
  if (P.mode === 'timer' && !P.recorded && !audio.paused && audio.currentTime > 5) {
    const ok = await confirmSheet('Stille beenden?', 'Die Sitzung zählt erst, wenn du mindestens 90 % der Zeit gesessen hast.', 'Beenden');
    if (!ok) return;
  }
  finishPlayback();
}

function finishPlayback() {
  if (!P) return;
  checkComplete();
  const { recorded, sessionId, mode } = P;
  if (recorded && mode === 'timer') {
    // tatsächlich gesessene Zeit speichern, falls früher beendet
    const s = S.sessions.find(x => x.id === sessionId);
    const sat = Math.round(Math.min(audio.currentTime, P.timerDur));
    if (s && sat < s.seconds) { s.seconds = sat; DB.put('sessions', s).catch(() => {}); }
  }
  if (!recorded) savePosition(true);
  teardown();
  hidePlayer();
  render();
  if (recorded) setTimeout(() => moodSheet(sessionId, false), 420);
}

function teardown() {
  audio.pause();
  if (P && P.blobUrl) URL.revokeObjectURL(P.blobUrl);
  audio.removeAttribute('src');
  audio.load();
  player.classList.remove('recorded', 'resumed', 'playing');
  if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; try { navigator.mediaSession.playbackState = 'none'; } catch (e) { /* */ } }
  P = null;
}

/* Media Session: Steuerung auf dem Sperrbildschirm */
function setMediaSession() {
  if (!('mediaSession' in navigator) || !P) return;
  const ms = navigator.mediaSession;
  const cat = catOf(P.ex);
  try {
    ms.metadata = new MediaMetadata({
      title: P.ex.title, artist: 'Innehalten', album: cat.title,
      artwork: [{ src: abs('icons/icon-512.png'), sizes: '512x512', type: 'image/png' }, { src: abs('icons/icon-192.png'), sizes: '192x192', type: 'image/png' }],
    });
  } catch (e) { /* */ }
  const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch (e) { /* nicht unterstützt */ } };
  const isAudio = P.mode === 'audio';
  set('play', () => audio.play());
  set('pause', () => audio.pause());
  set('seekbackward', isAudio ? () => seekBy(-15) : null);
  set('seekforward', isAudio ? () => seekBy(15) : null);
  set('seekto', isAudio ? d => { audio.currentTime = d.seekTime; updatePlayerUI(); } : null);
  set('previoustrack', null);
  set('nexttrack', null);
}
function updatePositionState() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState || !P) return;
  const dur = isFinite(audio.duration) ? audio.duration : 0;
  if (!dur) return;
  try { navigator.mediaSession.setPositionState({ duration: dur, playbackRate: audio.playbackRate || 1, position: clamp(audio.currentTime, 0, dur) }); } catch (e) { /* */ }
}

audio.addEventListener('play', () => { player.classList.add('playing'); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
audio.addEventListener('pause', () => { player.classList.remove('playing'); if ('mediaSession' in navigator && P) navigator.mediaSession.playbackState = 'paused'; savePosition(true); });
audio.addEventListener('timeupdate', () => {
  if (!P) return;
  updatePlayerUI();
  checkComplete();
  savePosition();
  if (Math.abs(audio.currentTime - P.lastPos) > 1) { P.lastPos = audio.currentTime; updatePositionState(); }
});
audio.addEventListener('loadedmetadata', () => {
  if (!P) return;
  if (P.mode === 'audio' && isFinite(audio.duration) && audio.duration > 0) {
    const d = Math.round(audio.duration);
    if (Math.abs((S.kv['dur:' + P.ex.id] || 0) - d) > 1) setKV('dur:' + P.ex.id, d);
    if (P.resumeAt && audio.currentTime < P.resumeAt - 2) audio.currentTime = P.resumeAt;
  }
  updatePlayerUI(); updatePositionState();
});
audio.addEventListener('ended', () => {
  if (!P) return;
  checkComplete();
  if (!P.recorded && P.mode === 'audio') {
    delKV('pos:' + P.ex.id);
    toast('Weniger als 90 % gehört, deshalb nicht gezählt.');
  }
  if (P.mode === 'audio' || P.recorded) finishPlayback();
});
audio.addEventListener('error', async () => {
  if (!P || !audio.getAttribute('src')) return;
  const src = (audio.currentSrc || audio.src).split('#')[0];
  teardown(); hidePlayer();
  toast(await diagnoseAudio(src), 9000);
});

/** Findet heraus, warum eine Audiodatei nicht lädt, und formuliert eine verständliche Meldung. */
async function diagnoseAudio(url) {
  if (!navigator.onLine) return 'Diese Übung ist offline noch nicht verfügbar.';
  const drive = /googleapis\.com\/drive\//.test(url);
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-1' } });
    if (r.ok) {
      return drive
        ? 'Die Datei ist erreichbar, aber der Player darf sie nicht laden. Entferne in der Google Cloud Console die Website-Einschränkung des API-Schlüssels (die Einschränkung auf die Drive API bleibt).'
        : 'Die Datei ist erreichbar, aber das Format wird nicht unterstützt. Verwende MP3 oder M4A.';
    }
    let msg = '';
    try { msg = ((await r.json()).error || {}).message || ''; } catch (e) { /* kein JSON */ }
    if (/referer|referrer/i.test(msg)) return 'Der API-Schlüssel blockiert diese Website. Prüfe in der Google Cloud Console die Website-Einschränkung des Schlüssels.';
    if (/API key not valid/i.test(msg)) return 'Der API-Schlüssel in content.json ist ungültig.';
    if (/has not been used|is disabled/i.test(msg)) return 'Die Google Drive API ist für den Schlüssel nicht aktiviert.';
    if (/cannotDownload|download/i.test(msg)) return 'Google Drive erlaubt das Herunterladen dieser Datei nicht. Prüfe in der Freigabe, ob Betrachter herunterladen dürfen.';
    if (r.status === 404) return drive ? 'Datei nicht gefunden. Ist der Drive-Ordner auf „Jeder mit dem Link“ freigegeben?' : 'Datei nicht gefunden. Stimmt der Pfad in content.json?';
    if (r.status === 403 && /quota|rate|limit/i.test(msg)) return 'Google Drive drosselt gerade die Abrufe. Versuche es in einer Weile noch einmal.';
    return `Audio konnte nicht geladen werden (Fehler ${r.status}${msg ? `: ${msg}` : ''}).`;
  } catch (e) {
    return 'Die Audiodatei konnte nicht geladen werden. Prüfe die Internetverbindung.';
  }
}

seek.addEventListener('input', () => { if (!P) return; P.seeking = true; seek.style.setProperty('--p', `${seek.value / 10}%`); $('#p-elapsed').textContent = fmtTime(seek.value / 1000 * currentDuration()); });
seek.addEventListener('change', () => {
  if (!P) return;
  if (P.mode === 'audio') audio.currentTime = seek.value / 1000 * currentDuration();
  P.seeking = false; updatePlayerUI();
});

/* ---------- Stille-Timer: erzeugt eine WAV-Datei mit Gong – Stille – Gong ----------
   So läuft der Timer als normales Audio und funktioniert auch bei gesperrtem Bildschirm. */
const SR = 8000;
let gongCache = null;
function gongSamples() {
  if (gongCache) return gongCache;
  const len = SR * 9, out = new Float32Array(len);
  const f0 = 176;
  // Verhältnis, Lautstärke, Abklingzeit (s) – angelehnt an eine Klangschale
  const partials = [[1, 1, 5.2], [2.02, .42, 3.4], [2.76, .38, 2.6], [5.4, .16, 1.4], [8.9, .06, .8]];
  for (const [r, a, tau] of partials) {
    const f = f0 * r;
    if (f > SR / 2 - 200) continue;
    const w1 = 2 * Math.PI * f / SR, w2 = 2 * Math.PI * (f + .8) / SR;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.exp(-t / tau) * (1 - Math.exp(-t / .006));
      out[i] += a * env * (Math.sin(w1 * i) + .6 * Math.sin(w2 * i + 1.3));
    }
  }
  let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  const fadeStart = len - SR;
  for (let i = 0; i < len; i++) {
    out[i] = out[i] / peak * .55;
    if (i > fadeStart) out[i] *= (len - i) / SR;
  }
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = clamp(Math.round(128 + out[i] * 127), 0, 255);
  return (gongCache = u8);
}
function buildTimerWav(sec) {
  const g = gongSamples();
  const body = Math.round(sec * SR);
  let total = body + g.length;
  const pad1 = total % 2;
  const header = new ArrayBuffer(44), v = new DataView(header);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + total + pad1, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, total, true);
  const chunk = new Uint8Array(SR * 30).fill(128);
  const parts = [header, g];
  let rest = body - g.length;
  while (rest > 0) { const n = Math.min(rest, chunk.length); parts.push(n === chunk.length ? chunk : chunk.subarray(0, n)); rest -= n; }
  parts.push(g);
  if (pad1) parts.push(new Uint8Array([128]));
  return new Blob(parts, { type: 'audio/wav' });
}

function startTimer() {
  if (P) teardown();
  const sec = S.timerMin * 60;
  P = newPlayback({ id: 'timer', title: 'Stille Meditation', category: 'stille', type: 'timer' }, 'timer');
  P.timerDur = sec;
  P.blobUrl = URL.createObjectURL(buildTimerWav(sec));
  audio.src = P.blobUrl;
  showPlayer();
  audio.play().catch(() => {});
  setMediaSession();
}

/* ---------- Backup ---------- */
async function exportData() {
  const data = {
    app: 'innehalten', version: 1, exportedAt: new Date().toISOString(),
    sessions: S.sessions,
    kv: Object.entries(S.kv).filter(([k]) => !k.startsWith('pos:')).map(([key, value]) => ({ key, value })),
  };
  const name = `innehalten-backup-${dayKey()}.json`;
  const file = new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' });
  const done = () => { setKV('lastBackup', Date.now()); render(); toast('Backup gesichert'); };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Innehalten Backup' }); done(); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  done();
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.sessions)) throw new Error('format');
    const valid = data.sessions.filter(s => s && s.id && /^\d{4}-\d{2}-\d{2}$/.test(s.day));
    const known = new Set(S.sessions.map(s => s.id));
    const added = valid.filter(s => !known.has(s.id)).length;
    const ok = await confirmSheet('Backup laden?', `${valid.length} Sitzungen gefunden, davon ${added} neu. Vorhandene Einträge bleiben erhalten.`, 'Laden');
    if (!ok) return;
    await DB.putMany('sessions', valid);
    if (Array.isArray(data.kv)) {
      const kv = data.kv.filter(r => r && r.key && r.key !== 'lastBackup');
      await DB.putMany('kv', kv);
      kv.forEach(r => { S.kv[r.key] = r.value; });
    }
    S.sessions = await DB.all('sessions');
    closeSheet();
    render();
    toast(`${added} ${added === 1 ? 'Sitzung' : 'Sitzungen'} hinzugefügt`);
  } catch (e) {
    toast('Diese Datei ist kein gültiges Innehalten-Backup.');
  }
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const { act, id } = el.dataset;
  switch (act) {
    case 'tab': setTab(el.dataset.tab); break;
    case 'play': { const ex = C.ex.get(id); if (ex) openPlayer(ex); break; }
    case 'course': S.courseId = id; render(true); break;
    case 'back': S.courseId = null; render(true); break;
    case 'cat': S.libCat = el.dataset.cat; $('#lib-results').innerHTML = libResults(); paintIcons(view); $$('.chip[data-act="cat"]').forEach(c => c.classList.toggle('active', c.dataset.cat === S.libCat)); break;
    case 'tdec': case 'tinc': case 'tpreset': {
      S.timerMin = act === 'tpreset' ? +el.dataset.v : clamp(S.timerMin + (act === 'tinc' ? 1 : -1), TIMER_MIN, TIMER_MAX);
      setKV('timerMin', S.timerMin); render(); break;
    }
    case 'tstart': startTimer(); break;
    case 'cal': S.calMonth = new Date(S.calMonth.getFullYear(), S.calMonth.getMonth() + (+el.dataset.v), 1); render(); break;
    case 'day': daySheet(el.dataset.day); break;
    case 'edit-session': moodSheet(id, true); break;
    case 'mood': S.moodSel = +el.dataset.v; $$('.mood', sheet).forEach(m => m.classList.toggle('sel', +m.dataset.v === S.moodSel)); break;
    case 'mood-save': {
      const s = S.sessions.find(x => x.id === id);
      if (s) { s.mood = S.moodSel; s.note = ($('#note', sheet).value || '').trim(); await DB.put('sessions', s).catch(() => {}); }
      closeSheet(); render(); toast('Gespeichert'); break;
    }
    case 'del-session': {
      const ok = await confirmSheet('Eintrag löschen?', 'Diese Sitzung wird aus deinem Fortschritt entfernt.', 'Löschen', true);
      if (ok) { S.sessions = S.sessions.filter(x => x.id !== id); await DB.del('sessions', id).catch(() => {}); closeSheet(); render(); toast('Eintrag gelöscht'); }
      break;
    }
    case 'confirm-yes': { const r = S.confirmRes; S.confirmRes = null; closeSheet(); r && r(true); break; }
    case 'confirm-no': case 'sheet-close': closeSheet(); break;
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
    case 'clear-offline': {
      const ok = await confirmSheet('Offline-Speicher leeren?', 'Die Audios werden beim nächsten Abspielen wieder geladen. Dein Fortschritt bleibt erhalten.', 'Leeren', true);
      if (ok) { await caches.delete(AUDIO_CACHE).catch(() => {}); S.cached = new Set(); closeSheet(); render(); toast('Offline-Speicher geleert'); }
      break;
    }
    case 'p-toggle': if (P) (audio.paused ? audio.play().catch(() => {}) : audio.pause()); break;
    case 'p-back': seekBy(-15); break;
    case 'p-fwd': seekBy(15); break;
    case 'p-close': closePlayer(); break;
    case 'p-restart': if (P) { audio.currentTime = 0; P.carry = 0; P.resumeAt = 0; player.classList.remove('resumed'); audio.play().catch(() => {}); } break;
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'search') {
    S.libQuery = e.target.value;
    $('#lib-results').innerHTML = libResults();
    paintIcons($('#lib-results'));
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'name-input') { setKV('name', e.target.value.trim()); toast('Gespeichert'); }
  if (e.target.id === 'import-file' && e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'name-input') e.target.blur();
  if (e.key === 'Escape') { if (S.sheetOpen) closeSheet(); else if (P) closePlayer(); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { savePosition(true); return; }
  // Zurück in der App: Abschluss prüfen und Ansicht auffrischen (z. B. neuer Tag)
  if (P) { checkComplete(); updatePlayerUI(); }
  const active = document.activeElement;
  if (!S.sheetOpen && !(active && /INPUT|TEXTAREA/.test(active.tagName))) render();
});

/* ---------- Start ---------- */
async function init() {
  paintIcons(document);
  try {
    const [sessions, kv] = await Promise.all([DB.all('sessions'), DB.all('kv')]);
    S.sessions = sessions || [];
    S.kv = Object.fromEntries((kv || []).map(r => [r.key, r.value]));
  } catch (e) {
    toast('Der lokale Speicher ist nicht verfügbar. Fortschritt wird nicht gesichert.');
  }
  S.timerMin = clamp(S.kv.timerMin || 10, TIMER_MIN, TIMER_MAX);
  C = await loadContent();
  await refreshCached();
  render(true);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service Worker', err));
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
init();
