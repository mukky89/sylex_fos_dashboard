/* =============================================
   SYLEX FOS Dashboard — App Logic v2
   ============================================= */

// ==============================
// AUTH (prihlásenie / token)
// ==============================
let AUTH_TOKEN = localStorage.getItem('fos_token') || '';
let CURRENT_USER = null;
let _appStarted = false;
const _origFetch = window.fetch.bind(window);

// Globálny wrapper — pridá token k /api volaniam a rieši 401
window.fetch = function (url, opts = {}) {
  const isApi = typeof url === 'string' && url.startsWith('/api') && !url.startsWith('/api/auth');
  if (isApi && AUTH_TOKEN) {
    opts = Object.assign({}, opts, { headers: Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + AUTH_TOKEN }) });
  }
  return _origFetch(url, opts).then(r => {
    if (r.status === 401 && isApi) handleAuthExpired();
    return r;
  });
};

function handleAuthExpired() {
  AUTH_TOKEN = ''; CURRENT_USER = null;
  localStorage.removeItem('fos_token');
  showLogin();
}
function showLogin() { document.getElementById('loginOverlay')?.classList.remove('hidden'); document.body.classList.add('logged-out'); }
function hideLogin() { document.getElementById('loginOverlay')?.classList.add('hidden'); document.body.classList.remove('logged-out'); }
function showLoginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

async function doLogin(e) {
  if (e) e.preventDefault();
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  try {
    const r = await _origFetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const d = await r.json();
    if (!r.ok) { showLoginError(d.error || 'Prihlásenie zlyhalo'); return; }
    AUTH_TOKEN = d.token; CURRENT_USER = d.user;
    localStorage.setItem('fos_token', AUTH_TOKEN);
    document.getElementById('loginError')?.classList.add('hidden');
    document.getElementById('loginPass').value = '';
    hideLogin();
    startApp();
  } catch (err) { showLoginError('Sieťová chyba: ' + err.message); }
}
function logout() {
  AUTH_TOKEN = ''; CURRENT_USER = null;
  localStorage.removeItem('fos_token');
  location.reload();
}
function renderUserChip() {
  const el = document.getElementById('hdrUser');
  if (!el || !CURRENT_USER) return;
  el.innerHTML = `<span class="hdr-user-name" title="${escHtml(CURRENT_USER.username)}${CURRENT_USER.role === 'admin' ? ' · admin' : ''}">👤 ${escHtml(CURRENT_USER.name || CURRENT_USER.username)}</span>`;
}
function tokenQS() { return AUTH_TOKEN ? ('?token=' + encodeURIComponent(AUTH_TOKEN)) : ''; }

// ==============================
// GUIDED TOUR
// ==============================

const TOUR_STEPS = [
  { page: 'home', el: null,
    title: '👋 Vitaj v FOS Dashboard!',
    desc: 'Tento sprievodca ťa prevedie <strong>všetkými modulmi</strong> — a postupne otvorí každú podstránku a ukáže jej komponenty. Naviguj tlačidlami <strong>Ďalší / Späť</strong> alebo klávesmi <kbd>→</kbd> / <kbd>←</kbd>. Ukonči <kbd>Esc</kbd>.',
  },
  { page: 'home', el: '.logo',
    title: 'FOS Dashboard — logo',
    desc: 'Kliknutím na logo sa kedykoľvek vrátiš na úvod. <strong>FOS Dashboard</strong> je centrálny hub pre divíziu Fiber Optics Sensors.',
  },
  { page: 'home', el: '#headerQuicklinks',
    title: '🔗 Rýchle linky',
    desc: 'Prístup k interným systémom: <strong>DBFOS</strong>, <strong>ISYS</strong>, <strong>PEAKLOGGER 🔑</strong>. Rozbalovacie menu odkryje Dochádzku, Obedy a SharePoint.',
  },
  { page: 'home', el: '.header-right',
    title: '🔍 Rýchle akcie v hlavičke',
    desc: 'Vpravo: <strong>vyhľadávanie (Ctrl+K)</strong> naprieč celým dashboardom, <strong>rýchle pridanie (+)</strong>, <strong>notifikácie 🔔</strong> a prihlásený používateľ s odhlásením.',
  },
  { page: 'home', el: '.nav',
    title: '🧭 Hlavná navigácia',
    desc: 'Všetky moduly v jednom riadku. Teraz ťa sprievodca po nich postupne <strong>preklikne a ukáže ich obsah</strong>.',
  },

  // ── Podstránky ──
  { page: 'wiki', el: '#page-wiki .sidebar',
    title: '📖 WIKI — Knowledge Base',
    desc: 'Technická dokumentácia v kategóriách. Vľavo je <strong>vyhľadávanie</strong>, zoznam kategórií a tlačidlo <strong>+ Nový záznam</strong>. Podporuje obrázky a rich-text.',
  },
  { page: 'calendar', el: '#page-calendar .cal-toolbar',
    title: '📅 Kalendár',
    desc: 'Udalosti tímu — porady, <strong>dovolenky</strong>, služobné cesty, PN. Tu prepínaš mesiace a exportuješ do <strong>Excelu</strong>. Dovolenky sa premietnu do Manažmentu.',
  },
  { page: 'procedures', el: '#procListView',
    title: '📋 Pracovné postupy',
    desc: 'Štandardizované SOP. Každý postup má <strong>operácie (rich-text), BOZP upozornenia, ochranné pomôcky, obrázky</strong> a export do <strong>Wordu</strong> aj náhľad/tlač.',
  },
  { page: 'fbg', el: '#page-fbg .fbg-frame-card',
    title: '📡 FBG Peak — vizualizácia',
    desc: 'Interaktívna animácia FBG senzorov: naťahovanie mriežky a <strong>posun odrazového peaku</strong>. Nižšie je simulácia <strong>Strain Cable SC-01</strong> a <strong>FBG senzor teploty a vibrácií</strong> s konfiguráciou a interogačnou schémou.',
  },
  { page: 'dev', el: '#page-dev .admin-tabs',
    title: '⭐ Vývoj výrobkov — 9 záložiek',
    desc: 'Projekty (kanban), Testy, Kalibrácie, Prototypy, Vlastníci (PO/BO), <strong>Interrogátory S-line</strong>, Datasheety a <strong>FBG nástroje</strong> (kalkulačka + WDM plánovač).',
  },
  { page: 'dev', el: '#projectsBoard',
    title: '🗂️ Projekty — kanban',
    desc: 'Projekty po fázach <strong>Koncept → Prototyp → Testovanie → Výroba → Ukončené</strong>. Kartu posúvaš medzi fázami šípkami, klik = úprava.',
  },
  { page: 'tasks', el: '#page-tasks .tasks-filters',
    title: '✅ Úlohy',
    desc: 'Tvoje osobné úlohy — termín, priorita, odškrtnutie. Filtre <strong>Aktívne / Všetky / Hotové</strong>. Úlohy s termínom dnes/po termíne sa zobrazia aj v notifikáciách.',
  },
  { page: 'crm', el: '#page-crm .crm-sidebar',
    title: '👥 CRM — zákazníci & emaily',
    desc: 'Evidencia kontaktov a komunikácie. <strong>Pretiahni email (.eml/.msg)</strong> do schránky → automaticky sa rozparsuje a priradí ku kontaktu.',
  },
  { page: 'mgmt', el: '#page-mgmt .mgmt-grid',
    title: '📊 Manažment — prehľad',
    desc: 'Kto na čom pracuje, stav úloh a projektov, <strong>🏖️ dovolenky</strong>, sklad interrogátorov a <strong>anonymné otázky</strong> pre vedenie.',
  },
  { page: 'admin', el: '#page-admin .admin-tabs',
    title: '⚙️ Administrácia',
    desc: 'Pre admin rolu: linky v hlavičke, nastavenia senzora T3511, <strong>správa používateľov</strong> a systém (ukážkové dáta).',
  },

  // ── Späť na úvod ──
  { page: 'home', el: '.home-news-section',
    title: '📢 Novinky / oznámenia',
    desc: 'Dôležité správy priamo na úvode (info / dôležité / upozornenie / vyriešené). Možno ich pripnúť navrch a upravovať.',
  },
  { page: 'home', el: '.home-side',
    title: '📅 Kalendár + ✅ úlohy na úvode',
    desc: 'Vpravo na úvode máš najbližšie udalosti z kalendára a svoje aktívne úlohy — rýchle odškrtnutie aj preklik na detail.',
  },
  { page: 'home', el: '#hdrSensorBtn',
    title: '🌡️ Senzory v labe',
    desc: 'Teplota a vlhkosť zo senzora T3511 v labe. Klik → stránka Senzory s grafom histórie. Bodka ukazuje online/offline stav.',
  },
  { page: 'home', el: '.tour-fab',
    title: '❓ Pomoc kedykoľvek',
    desc: 'Týmto tlačidlom spustíš sprievodcu znova kedykoľvek.',
  },
  { page: 'home', el: null,
    title: '🎉 Sprievodca dokončený!',
    desc: 'Teraz poznáš všetky moduly FOS Dashboard aj ich obsah. <strong>Príjemnú prácu!</strong> 🚀',
  },
];

let _tourIdx   = 0;
let _tourSaved = [];

function startTour() {
  showPage('home');
  _tourIdx = 0;
  document.body.classList.add('tour-active');
  document.getElementById('tourOverlay').classList.remove('hidden');
  _tourRender(0);
  document.addEventListener('keydown', _tourKey);
}

function endTour() {
  _tourRestoreEls();
  document.body.classList.remove('tour-active');
  const ov = document.getElementById('tourOverlay');
  ov.classList.add('hidden');
  ov.classList.remove('tour-no-el');
  ov.style.clipPath = 'none'; ov.style.webkitClipPath = 'none';
  document.getElementById('tourHighlight').classList.add('hidden');
  document.removeEventListener('keydown', _tourKey);
}

function tourBgClick(e) {
  if (e.target === document.getElementById('tourOverlay')) endTour();
}

function tourNav(dir) {
  const nxt = _tourIdx + dir;
  if (nxt >= TOUR_STEPS.length) { endTour(); return; }
  if (nxt < 0) return;
  _tourIdx = nxt;
  _tourRender(_tourIdx);
}

function _tourKey(e) {
  if (e.key === 'Escape')     { endTour(); }
  if (e.key === 'ArrowRight') { tourNav(1);  }
  if (e.key === 'ArrowLeft')  { tourNav(-1); }
}

function _tourRestoreEls() {
  _tourSaved.forEach(({ el, z, pos }) => { el.style.zIndex = z; el.style.position = pos; });
  _tourSaved = [];
}

// Vyreže "dieru" do tmavého overlayu presne na komponente (zvyšok ostane zašedený)
function _spotlightClip(x, y, w, h) {
  const X = Math.max(0, Math.round(x)), Y = Math.max(0, Math.round(y));
  const R = Math.round(x + w), B = Math.round(y + h);
  return `polygon(0px 0px, 0px 100%, ${X}px 100%, ${X}px ${Y}px, ${R}px ${Y}px, ${R}px ${B}px, ${X}px ${B}px, ${X}px 100%, 100% 100%, 100% 0px)`;
}

function _tourRender(idx) {
  const step  = TOUR_STEPS[idx];
  const total = TOUR_STEPS.length;

  // text content
  document.getElementById('tourStepNum').textContent  = `${idx + 1} / ${total}`;
  document.getElementById('tourTitle').textContent    = step.title;
  document.getElementById('tourDesc').innerHTML       = step.desc;
  document.getElementById('tourProgFill').style.width = `${(idx / (total - 1)) * 100}%`;

  // buttons
  const prevBtn = document.getElementById('tourPrev');
  const nextBtn = document.getElementById('tourNext');
  if (idx === 0) prevBtn.classList.add('hidden'); else prevBtn.classList.remove('hidden');
  nextBtn.textContent = (idx === total - 1) ? '✓ Zavrieť' : 'Ďalší →';
  nextBtn.classList.toggle('done', idx === total - 1);

  const overlay = document.getElementById('tourOverlay');
  const hl  = document.getElementById('tourHighlight');
  const pop = document.getElementById('tourPopover');

  const noTarget = () => {
    overlay.classList.add('tour-no-el');     // celé tmavé (dim cez overlay)
    hl.classList.add('hidden');
    pop.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%);';
  };

  // Ak krok patrí na inú stránku, najprv tam prejdi
  if (step.page && _activePageName() !== step.page) {
    showPage(step.page);
  }

  if (!step.el) { noTarget(); return; }

  // Počkaj kým je cieľový prvok v DOM a viditeľný (podstránky sa načítavajú async)
  _waitForEl(step.el, (target) => {
    if (!target) { noTarget(); return; }
    overlay.classList.remove('tour-no-el');

    const measure = () => {
      const r = target.getBoundingClientRect();
      if (!r.width && !r.height) { noTarget(); return; }
      const pad = 8;
      hl.classList.remove('hidden');
      hl.style.top = `${r.top - pad}px`;
      hl.style.left = `${r.left - pad}px`;
      hl.style.width = `${r.width + pad * 2}px`;
      hl.style.height = `${r.height + pad * 2}px`;
      _tourPlacePop(r, pop);
    };

    if (getComputedStyle(target).position === 'fixed') {
      requestAnimationFrame(measure);
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      _afterScroll(measure);
    }
  });
}

function _activePageName() {
  return (document.querySelector('.page.active')?.id || '').replace('page-', '');
}
// Počká kým prvok existuje a má rozmer (max ~2.7 s), potom zavolá cb
function _waitForEl(sel, cb, tries = 0) {
  const t = document.querySelector(sel);
  if (t && (t.offsetWidth || t.offsetHeight || t.getClientRects().length)) return cb(t);
  if (tries > 45) return cb(t || null);
  setTimeout(() => _waitForEl(sel, cb, tries + 1), 60);
}

// Zavolá cb keď sa stránka prestane rolovať (alebo po ~1.9 s poistka)
function _afterScroll(cb) {
  let last = null, tries = 0;
  const tick = () => {
    const y = window.scrollY;
    if (y === last || tries++ > 30) { cb(); return; }
    last = y; setTimeout(tick, 60);
  };
  setTimeout(tick, 70);
}

function _tourPlacePop(rect, pop) {
  const PW = 360, PH = 270, GAP = 14;
  const vw = window.innerWidth, vh = window.innerHeight;
  let top, left;
  if (rect.bottom + PH + GAP < vh)      top = rect.bottom + GAP;
  else if (rect.top - PH - GAP > 0)     top = rect.top - PH - GAP;
  else                                   top = Math.max(GAP, (vh - PH) / 2);
  left = Math.max(GAP, Math.min(vw - PW - GAP, rect.left + rect.width / 2 - PW / 2));
  pop.style.cssText = `top:${top}px;left:${left}px;transform:none;`;
}

// Spustí appku po úspešnom prihlásení
// ══════════════════════════════════════════════════════════════════════════════
//  UI LAYOUT — alternatívny sidebar (konfigurovateľný v Admin → Vzhľad)
// ══════════════════════════════════════════════════════════════════════════════
const SB_THEMES = ['dark', 'light', 'minimal', 'icon', 'gradient', 'aurora', 'sunset'];
const UI_ACCENTS = {
  cyan:    { '--accent': '#0891b2', '--accent2': '#1d4ed8', '--border-focus': '#0891b2', '--ui-accent': '#06b6d4', '--ui-accent2': '#3b82f6' },
  indigo:  { '--accent': '#4f46e5', '--accent2': '#7c3aed', '--border-focus': '#4f46e5', '--ui-accent': '#6366f1', '--ui-accent2': '#8b5cf6' },
  emerald: { '--accent': '#059669', '--accent2': '#0d9488', '--border-focus': '#059669', '--ui-accent': '#10b981', '--ui-accent2': '#14b8a6' },
  amber:   { '--accent': '#d97706', '--accent2': '#b45309', '--border-focus': '#d97706', '--ui-accent': '#f59e0b', '--ui-accent2': '#f97316' },
  rose:    { '--accent': '#e11d48', '--accent2': '#be123c', '--border-focus': '#e11d48', '--ui-accent': '#f43f5e', '--ui-accent2': '#fb7185' },
  violet:  { '--accent': '#7c3aed', '--accent2': '#6d28d9', '--border-focus': '#7c3aed', '--ui-accent': '#8b5cf6', '--ui-accent2': '#a855f7' },
};
const UI_RADII = {
  soft:  { '--radius': '8px',  '--radius-lg': '12px' },
  sharp: { '--radius': '3px',  '--radius-lg': '4px' },
  round: { '--radius': '14px', '--radius-lg': '20px' },
};
let UI_CFG = { nav: 'header', sidebarTheme: 'dark', accent: 'cyan', density: 'comfortable', radius: 'soft', motion: 'on' };

function applyUiLayout() {
  const b = document.body, r = document.documentElement;
  b.classList.toggle('layout-sidebar', UI_CFG.nav === 'sidebar');
  SB_THEMES.forEach(t => b.classList.toggle('sbt-' + t, UI_CFG.nav === 'sidebar' && UI_CFG.sidebarTheme === t));

  // Akcentová farba
  const acc = UI_ACCENTS[UI_CFG.accent] || UI_ACCENTS.cyan;
  Object.entries(acc).forEach(([k, v]) => r.style.setProperty(k, v));
  // Zaoblenie rohov
  const rad = UI_RADII[UI_CFG.radius] || UI_RADII.soft;
  Object.entries(rad).forEach(([k, v]) => r.style.setProperty(k, v));
  // Hustota
  b.classList.toggle('ui-compact', UI_CFG.density === 'compact');
  // Animácie
  b.classList.toggle('ui-reduce-motion', UI_CFG.motion === 'off');

  renderSidebarUser();
}

function renderSidebarUser() {
  const el = document.getElementById('asbUser');
  if (!el || !CURRENT_USER) return;
  const name = CURRENT_USER.name || CURRENT_USER.username || '';
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  el.innerHTML = `<div class="asb-user">
    <div class="asb-avatar">${escHtml(initials)}</div>
    <div class="asb-user-info">
      <span class="asb-user-name">${escHtml(name)}</span>
      <span class="asb-user-mail">${escHtml(CURRENT_USER.email || (CURRENT_USER.role === 'admin' ? 'administrátor' : 'používateľ'))}</span>
    </div>
    <button class="asb-logout" onclick="logout()" title="Odhlásiť sa"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
  </div>`;
}

async function loadUiConfig() {
  // 1) okamžite z localStorage (žiadny blik), 2) potvrď zo servera
  try {
    const cached = JSON.parse(localStorage.getItem('fos_ui') || 'null');
    if (cached && cached.nav) { UI_CFG = { ...UI_CFG, ...cached }; applyUiLayout(); }
  } catch {}
  try {
    const cfg = await fetch('/api/admin/config').then(r => r.json());
    if (Array.isArray(cfg)) {
      const get = k => cfg.find(c => c.key === k)?.value;
      const nav = get('ui.nav'); const theme = get('ui.sidebarTheme');
      const accent = get('ui.accent'); const density = get('ui.density');
      const radius = get('ui.radius'); const motion = get('ui.motion');
      if (nav) UI_CFG.nav = nav;
      if (theme && SB_THEMES.includes(theme)) UI_CFG.sidebarTheme = theme;
      if (accent && UI_ACCENTS[accent]) UI_CFG.accent = accent;
      if (density === 'compact' || density === 'comfortable') UI_CFG.density = density;
      if (radius && UI_RADII[radius]) UI_CFG.radius = radius;
      if (motion === 'on' || motion === 'off') UI_CFG.motion = motion;
      localStorage.setItem('fos_ui', JSON.stringify(UI_CFG));
      applyUiLayout();
    }
  } catch {}
}

async function _saveUiCfg(key, value) {
  localStorage.setItem('fos_ui', JSON.stringify(UI_CFG));
  try {
    await fetch('/api/admin/config/' + key, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value })
    });
    const s = document.getElementById('apprSaved');
    if (s) { s.textContent = '✓ Uložené'; s.classList.add('show'); setTimeout(() => s.classList.remove('show'), 1600); }
  } catch {}
}

function setNavLayout(nav) {
  UI_CFG.nav = nav; applyUiLayout(); renderAppearanceAdmin(); _saveUiCfg('ui.nav', nav);
}
function setSidebarTheme(theme) {
  if (!SB_THEMES.includes(theme)) return;
  UI_CFG.sidebarTheme = theme;
  if (UI_CFG.nav !== 'sidebar') { UI_CFG.nav = 'sidebar'; applyUiLayout(); _saveUiCfg('ui.nav', 'sidebar'); }
  else applyUiLayout();
  renderAppearanceAdmin(); _saveUiCfg('ui.sidebarTheme', theme);
}
function setAccent(accent) {
  if (!UI_ACCENTS[accent]) return;
  UI_CFG.accent = accent; applyUiLayout(); renderAppearanceAdmin(); _saveUiCfg('ui.accent', accent);
}
function setDensity(density) {
  if (density !== 'compact' && density !== 'comfortable') return;
  UI_CFG.density = density; applyUiLayout(); renderAppearanceAdmin(); _saveUiCfg('ui.density', density);
}
function setRadius(radius) {
  if (!UI_RADII[radius]) return;
  UI_CFG.radius = radius; applyUiLayout(); renderAppearanceAdmin(); _saveUiCfg('ui.radius', radius);
}
function setMotion(motion) {
  if (motion !== 'on' && motion !== 'off') return;
  UI_CFG.motion = motion; applyUiLayout(); renderAppearanceAdmin(); _saveUiCfg('ui.motion', motion);
}

function renderAppearanceAdmin() {
  document.querySelectorAll('.appr-layout').forEach(b => b.classList.toggle('active', b.dataset.nav === UI_CFG.nav));
  document.querySelectorAll('.appr-theme').forEach(b => b.classList.toggle('active', b.dataset.theme === UI_CFG.sidebarTheme));
  document.querySelectorAll('.appr-accent').forEach(b => b.classList.toggle('active', b.dataset.accent === UI_CFG.accent));
  document.querySelectorAll('.appr-opt[data-density]').forEach(b => b.classList.toggle('active', b.dataset.density === UI_CFG.density));
  document.querySelectorAll('.appr-opt[data-radius]').forEach(b => b.classList.toggle('active', b.dataset.radius === UI_CFG.radius));
  document.querySelectorAll('.appr-opt[data-motion]').forEach(b => b.classList.toggle('active', b.dataset.motion === UI_CFG.motion));
  const sec = document.getElementById('apprThemeSection');
  if (sec) sec.classList.toggle('dim', UI_CFG.nav !== 'sidebar');
}

function startApp() {
  renderUserChip();
  if (_appStarted) { loadNotif(); return; }
  _appStarted = true;
  loadUiConfig();
  loadHeaderLinks();
  loadAppVersion();
  loadNotif();
  setInterval(loadNotif, 120000);
  calCheckReminders(); setInterval(calCheckReminders, 60000);
  updateDateTime();
  setInterval(updateDateTime, 1000);
  loadThermoData();
  setInterval(loadThermoData, 30000);
  const hash = location.hash.slice(1);
  if (hash) handleHash(hash);
  else { _activatePage('home'); loadHomeKB(); }
}

async function bootstrap() {
  if (AUTH_TOKEN) {
    try {
      const r = await _origFetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + AUTH_TOKEN } });
      if (r.ok) { CURRENT_USER = (await r.json()).user; hideLogin(); startApp(); return; }
    } catch (e) {}
  }
  showLogin();
}

// ==============================
// STATE
// ==============================
let products    = [];
let categories  = [];
let currentProductId  = null;
let currentProduct    = null;
let currentCategoryId = null;
let editingProductId  = null;
let quill       = null;
let pendingImages = [];

// ==============================
// PARTICLES (home page)
// ==============================
(function initParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration  = (9 + Math.random() * 14) + 's';
    p.style.animationDelay     = (Math.random() * 12) + 's';
    p.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
    const sz = (1 + Math.random() * 1.5) + 'px';
    p.style.width = p.style.height = sz;
    c.appendChild(p);
  }
})();

// ==============================
// PEAKLOGGER POPOVER
// ==============================
let plCredsLoaded = false;
let plCredsData   = { user: '', pass: '' };
let plVisible     = false;

async function loadPeakloggerCreds() {
  if (plCredsLoaded) return;
  try {
    const r = await fetch('/api/credentials/peaklogger');
    plCredsData = await r.json();
    plCredsLoaded = true;
  } catch { plCredsData = { user: '—', pass: '—' }; }
}

async function togglePeakloggerCreds(e) {
  e.stopPropagation();
  const popover = document.getElementById('plPopover');
  if (!popover) return;

  // Position under the chip
  const chip = e.target.closest('.ql-chip');
  if (chip) {
    const rect = chip.getBoundingClientRect();
    popover.style.left = rect.left + 'px';
    popover.style.right = 'auto';
  }

  if (!popover.classList.contains('hidden')) {
    popover.classList.add('hidden');
    return;
  }

  await loadPeakloggerCreds();
  plVisible = false;
  document.getElementById('plUser').textContent = '••••••';
  document.getElementById('plPass').textContent = '••••••••••••';
  document.getElementById('plToggle').textContent = '👁 Zobraziť';
  popover.classList.remove('hidden');
}

function togglePlVisible() {
  plVisible = !plVisible;
  document.getElementById('plUser').textContent = plVisible ? plCredsData.user : '••••••';
  document.getElementById('plPass').textContent = plVisible ? plCredsData.pass : '••••••••••••';
  document.getElementById('plToggle').textContent = plVisible ? '🙈 Skryť' : '👁 Zobraziť';
}

function openPeaklogger(e) {
  // only open if not clicking the key button
  if (!e.target.classList.contains('ql-cred-btn')) {
    window.open('https://mukovnik.xyz/', '_blank');
  }
}

// Close popover when clicking outside
document.addEventListener('click', () => {
  const p = document.getElementById('plPopover');
  if (p) p.classList.add('hidden');
});

// ==============================
// THERMOMETER WIDGET
// ==============================
async function loadThermoData() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const cls = (id, c) => { const el = document.getElementById(id); if (el) el.className = c; };
  try {
    const data = await fetch('/api/sensor/thermo').then(r => r.json());
    if (data.online) {
      const t = data.temperature !== null ? data.temperature.toFixed(1) : '--.-';
      const h = data.humidity    !== null ? data.humidity.toFixed(1)    : '--.-';
      set('thermoValue',   t); set('sensorTempVal', t);
      set('humValue',      h); set('sensorHumVal',  h);
      ['thermoStatus','sensorStatus'].forEach(id => { set(id,'ONLINE'); cls(id,'thermo-status thermo-online'); });
      cls('thermoDot', 'hdr-sensor-dot on');
    } else {
      ['thermoValue','humValue','sensorTempVal','sensorHumVal'].forEach(id => set(id,'--.-'));
      ['thermoStatus','sensorStatus'].forEach(id => { set(id,'OFFLINE'); cls(id,'thermo-status thermo-offline'); });
      cls('thermoDot', 'hdr-sensor-dot off');
    }
  } catch {
    ['thermoStatus','sensorStatus'].forEach(id => { set(id,'OFFLINE'); cls(id,'thermo-status thermo-offline'); });
    cls('thermoDot', 'hdr-sensor-dot off');
  }
}
// (loadThermoData sa spúšťa v startApp po prihlásení)

// ==============================
// SENSOR CHART
// ==============================
let sensorChart = null;
let chartHours  = 6;

async function loadSensorChart(hours) {
  if (hours !== undefined) chartHours = hours;

  // Sync range buttons
  document.querySelectorAll('.hsc-range-btn').forEach(btn =>
    btn.classList.toggle('active', parseInt(btn.dataset.hours) === chartHours)
  );

  try {
    const res  = await fetch(`/api/sensor/history?hours=${chartHours}`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const tempPts = data.filter(r => r.temperature !== null)
                        .map(r => ({ x: new Date(r.timestamp), y: r.temperature }));
    const humPts  = data.filter(r => r.humidity !== null)
                        .map(r => ({ x: new Date(r.timestamp), y: r.humidity }));

    // No-data overlay
    const wrap   = document.getElementById('hscWrap');
    let noData   = wrap?.querySelector('.hsc-no-data');
    if (data.length === 0) {
      if (!noData && wrap) {
        noData = document.createElement('div');
        noData.className = 'hsc-no-data';
        noData.textContent = 'Žiadne dáta — prvý záznam príde o chvíľu';
        wrap.appendChild(noData);
      }
    } else if (noData) { noData.remove(); }

    if (!sensorChart) {
      initSensorChart(tempPts, humPts);
    } else {
      sensorChart.data.datasets[0].data = tempPts;
      sensorChart.data.datasets[1].data = humPts;
      sensorChart.update('none'); // preserve zoom/pan state
    }

    if (data.length > 0) {
      const last = new Date(data[data.length - 1].timestamp);
      const el   = document.getElementById('hscLastUpdate');
      if (el) el.textContent = 'Posl.: ' + last.toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) { console.error('Chart load:', e); }
}

function initSensorChart(tempPts, humPts) {
  const canvas = document.getElementById('sensorChart');
  if (!canvas || typeof Chart === 'undefined') return;

  sensorChart = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Teplota °C',
          data: tempPts,
          yAxisID: 'yT',
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34,211,238,0.07)',
          borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
          tension: 0.3, fill: true
        },
        {
          label: 'Vlhkosť %RH',
          data: humPts,
          yAxisID: 'yH',
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129,140,248,0.07)',
          borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
          tension: 0.3, fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'dd.MM.yyyy HH:mm',
            displayFormats: { minute: 'HH:mm', hour: 'HH:mm', day: 'dd.MM', week: 'dd.MM' }
          },
          grid:  { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'rgba(255,255,255,0.35)', maxTicksLimit: 8, font: { size: 11 } }
        },
        yT: {
          position: 'left',
          grid:  { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#22d3ee', font: { size: 11 }, callback: v => v.toFixed(1) + '°' },
          title: { display: true, text: '°C', color: '#22d3ee', font: { size: 11 } }
        },
        yH: {
          position: 'right',
          grid:  { drawOnChartArea: false },
          ticks: { color: '#818cf8', font: { size: 11 }, callback: v => v.toFixed(0) + '%' },
          title: { display: true, text: '%RH', color: '#818cf8', font: { size: 11 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.92)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#94a3b8',
          bodyColor: '#e2e8f0',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) : 'N/A'}`
          }
        },
        zoom: {
          pan:  { enabled: true, mode: 'x' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
        }
      }
    }
  });
}

function resetChartZoom() {
  if (sensorChart) sensorChart.resetZoom();
}

// Auto-refresh chart every 60 s, only when sensors page is active
setInterval(() => {
  if (document.getElementById('page-sensors')?.classList.contains('active')) loadSensorChart();
}, 60000);

// ==============================
// ROUTING / PAGES
// ==============================
function setHash(hash) { history.pushState(null, '', '#' + hash); }

window.addEventListener('popstate', () => handleHash(location.hash.slice(1)));

async function handleHash(hash) {
  if (!hash || hash === 'home') { _activatePage('home'); loadHomeKB(); return; }
  if (hash === 'sensors') { _activatePage('sensors'); loadThermoData(); loadSensorChart(); return; }
  if (hash === 'fbg')     { _activatePage('fbg'); return; }
  if (hash === 'bb')      { _activatePage('bb'); loadBb(); return; }
  if (hash === 'calendar') { _activatePage('calendar'); loadCalendar(); return; }
  if (hash === 'procedures') { _activatePage('procedures'); loadProcedures(); return; }
  if (hash === 'guides')  { _activatePage('guides');  loadGuides(); return; }
  if (hash === 'dev')     { _activatePage('dev');     loadDev(); return; }
  if (hash.startsWith('project/')) {
    const id = hash.slice('project/'.length);
    if (id === 'new') { if (!projectsData.length) await loadProjectsData(); await openProjectPage(null); }
    else { if (!projectsData.length) await loadProjectsData(); await openProjectPage(id); }
    return;
  }
  if (hash === 'util')    { _activatePage('util');    loadUtil(); return; }
  if (hash === 'prod')    { _activatePage('prod');    loadProd(); return; }
  if (hash === 'mfg')     { _activatePage('mfg');     loadMfg(); return; }
  if (hash === 'tasks')   { _activatePage('tasks');   loadTasks(); return; }
  if (hash === 'crm')     { _activatePage('crm');     loadCrm(); return; }
  if (hash === 'mgmt')    { _activatePage('mgmt');    loadManagement(); return; }
  if (hash === 'admin')   { _activatePage('admin');   switchAdminTab('links'); return; }
  if (hash === 'changelog') { _activatePage('changelog'); renderChangelog(); return; }
  if (hash === 'wiki') { _activatePage('wiki'); await loadWiki(); return; }
  if (hash.startsWith('wiki/cat/')) {
    const catId = hash.slice('wiki/cat/'.length);
    _activatePage('wiki'); await loadWiki();
    showCategoryView(catId === 'uncategorized' ? null : catId); return;
  }
  if (hash.startsWith('wiki/')) {
    const id = hash.slice('wiki/'.length);
    _activatePage('wiki'); await loadWiki(); await openProduct(id); return;
  }
}

function _activatePage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === name));
  document.querySelectorAll('.asb-link').forEach(l => l.classList.toggle('active', l.dataset.page === name));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
}

function showPage(name) {
  _activatePage(name);
  setHash(name);
  if (name === 'wiki')    loadWiki();
  if (name === 'home')    loadHomeKB();
  if (name === 'sensors') { loadThermoData(); loadSensorChart(); }
  if (name === 'calendar') loadCalendar();
  if (name === 'procedures') loadProcedures();
  if (name === 'guides')  loadGuides();
  if (name === 'dev')     loadDev();
  if (name === 'util')    loadUtil();
  if (name === 'prod')    loadProd();
  if (name === 'mfg')     loadMfg();
  if (name === 'tasks')   loadTasks();
  if (name === 'crm')     loadCrm();
  if (name === 'mgmt')    loadManagement();
  if (name === 'admin')   switchAdminTab('links');
  if (name === 'changelog') renderChangelog();
  if (name === 'bb')      loadBb();
}

// ==============================
// WIKI LOAD
// ==============================
async function loadWiki() {
  await Promise.all([loadCategories(), loadProducts()]);
  renderSidebar();
  renderWikiHome();
}

async function loadCategories() {
  try { const r = await fetch('/api/categories'); categories = await r.json(); }
  catch { categories = []; }
}

async function loadProducts() {
  try { const r = await fetch('/api/products'); products = await r.json(); }
  catch { products = []; }
}

// ==============================
// WIKI HOME
// ==============================
function showWikiHome() {
  currentProductId = null; currentCategoryId = null;
  document.getElementById('wikiWelcome').classList.remove('hidden');
  document.getElementById('productDetail').classList.add('hidden');
  document.getElementById('categoryView').classList.add('hidden');
  document.querySelectorAll('.product-item').forEach(i => i.classList.remove('active'));
  const homeBtn = document.getElementById('swnHome');
  if (homeBtn) homeBtn.classList.add('active');
  setHash('wiki');
  renderWikiCrumbs(null);
  renderWikiHome();
}

// WIKI breadcrumbs — items: [{label, act?}], posledná = aktuálna (bez odkazu)
function renderWikiCrumbs(items) {
  const el = document.getElementById('wikiCrumbs'); if (!el) return;
  if (!items || !items.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = items.map((it, i) => {
    const sep = i > 0 ? '<span class="crumb-sep">›</span>' : '';
    return i === items.length - 1
      ? `${sep}<span class="crumb-cur">${escHtml(it.label)}</span>`
      : `${sep}<a onclick="${it.act || ''}">${escHtml(it.label)}</a>`;
  }).join('');
}

function renderWikiHome() {
  renderWikiCategories();
  renderWikiRecent();
}

function renderWikiCategories() {
  const el = document.getElementById('whCats');
  if (!el) return;
  el.innerHTML = '';

  const grouped = {};
  products.forEach(p => {
    const cid = p.category?._id;
    if (cid) grouped[cid] = (grouped[cid] || 0) + 1;
  });
  const uncatCount = products.filter(p => !p.category?._id).length;

  if (categories.length === 0 && uncatCount === 0) {
    el.innerHTML = '<div class="wh-empty">Žiadne kategórie.<div class="wh-empty-actions"><button class="btn-sm" onclick="openCategoryModal()">+ Nová kategória</button></div></div>';
    return;
  }

  categories.forEach(cat => {
    const count = grouped[cat._id] || 0;
    const card = document.createElement('div');
    card.className = 'wh-cat-card';
    if (cat.color) card.style.setProperty('--cat-color', cat.color);
    card.innerHTML = `
      <div class="wh-cat-icon-wrap">${cat.icon || '📁'}</div>
      <div class="wh-cat-name">${escHtml(cat.name)}</div>
      <div class="wh-cat-count">${count} ${pluralSk(count)}</div>`;
    card.onclick = () => showCategoryView(cat._id);
    el.appendChild(card);
  });

  if (uncatCount > 0) {
    const card = document.createElement('div');
    card.className = 'wh-cat-card';
    card.innerHTML = `<div class="wh-cat-icon-wrap">📄</div><div class="wh-cat-name">Nezaradené</div><div class="wh-cat-count">${uncatCount} ${pluralSk(uncatCount)}</div>`;
    card.onclick = () => showCategoryView(null);
    el.appendChild(card);
  }

  const addCard = document.createElement('div');
  addCard.className = 'wh-cat-card wh-cat-add';
  addCard.innerHTML = `<div class="wh-cat-icon-wrap" style="color:var(--text-xdim)">+</div><div class="wh-cat-name" style="color:var(--text-dim)">Nová kategória</div>`;
  addCard.onclick = () => openCategoryModal();
  el.appendChild(addCard);
}

function renderWikiRecent() {
  const el = document.getElementById('whRecent');
  if (!el) return;
  el.innerHTML = '';
  if (products.length === 0) {
    el.innerHTML = '<div class="wh-empty">Žiadne záznamy.<div class="wh-empty-actions"><button class="btn-primary" onclick="openProductModal()">+ Pridať prvý záznam</button></div></div>';
    return;
  }
  const sorted = [...products].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8);
  sorted.forEach(p => {
    const catObj = categories.find(c => c._id === (p.category?._id || p.category));
    el.appendChild(makeArticleCard(p, catObj));
  });
}

function makeArticleCard(p, catObj) {
  const icon = catObj?.icon || '📄';
  const catName = catObj?.name || '';
  const card = document.createElement('div');
  card.className = 'wh-article-card';
  card.innerHTML = `
    <div class="wh-article-cat-icon">${icon}</div>
    <div class="wh-article-body">
      <div class="wh-article-title">${escHtml(p.name)}</div>
      ${p.description ? `<div class="wh-article-desc">${escHtml(p.description)}</div>` : ''}
      <div class="wh-article-meta">
        ${catName ? `<span class="wh-article-badge">${escHtml(catName)}</span>` : ''}
        <span class="wh-article-date">${fmtDate(p.updatedAt)}</span>
        ${p.model ? `<span class="wh-article-date" style="color:var(--text-xdim)">${escHtml(p.model)}</span>` : ''}
      </div>
    </div>
    <div class="wh-article-arrow">›</div>`;
  card.onclick = () => openProduct(p._id);
  return card;
}

// ==============================
// CATEGORY VIEW
// ==============================
function showCategoryView(catId) {
  setHash(catId ? 'wiki/cat/' + catId : 'wiki/cat/uncategorized');
  currentCategoryId = catId;
  document.getElementById('wikiWelcome').classList.add('hidden');
  document.getElementById('productDetail').classList.add('hidden');
  document.getElementById('categoryView').classList.remove('hidden');
  document.querySelectorAll('.product-item').forEach(i => i.classList.remove('active'));
  const homeBtn = document.getElementById('swnHome');
  if (homeBtn) homeBtn.classList.remove('active');

  const cat = catId ? categories.find(c => c._id === catId) : null;
  const prods = catId
    ? products.filter(p => p.category && (p.category._id === catId || p.category === catId))
    : products.filter(p => !p.category || !p.category._id);

  document.getElementById('cvIcon').textContent  = cat ? (cat.icon || '📁') : '📄';
  document.getElementById('cvTitle').textContent = cat ? cat.name : 'Nezaradené';
  document.getElementById('cvCount').textContent = `${prods.length} ${pluralSk(prods.length)}`;
  renderWikiCrumbs([{ label: 'WIKI', act: 'showWikiHome()' }, { label: cat ? cat.name : 'Nezaradené' }]);

  const listEl = document.getElementById('cvArticles');
  listEl.innerHTML = '';
  if (prods.length === 0) {
    listEl.innerHTML = '<div class="wh-empty">Táto kategória je prázdna.<div class="wh-empty-actions"><button class="btn-primary" onclick="openProductModal()">+ Pridať záznam</button></div></div>';
    return;
  }
  prods.forEach(p => listEl.appendChild(makeArticleCard(p, cat)));
}

// ==============================
// SIDEBAR
// ==============================
function renderSidebar() {
  const catContainer  = document.getElementById('sidebarCategories');
  const prodContainer = document.getElementById('sidebarProducts');
  const grouped = {};
  const uncategorized = [];

  products.forEach(p => {
    if (p.category && p.category._id) {
      const cid = p.category._id;
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(p);
    } else { uncategorized.push(p); }
  });

  catContainer.innerHTML = '';
  prodContainer.innerHTML = '';

  categories.forEach(cat => {
    const prods = grouped[cat._id] || [];
    if (prods.length === 0) return;
    const group = document.createElement('div');
    group.className = 'category-group';
    group.innerHTML = `<div class="category-label" onclick="showCategoryView('${cat._id}')">
      <span>${cat.icon || '📁'}</span>
      <span>${escHtml(cat.name)}</span>
      <span class="cat-count">${prods.length}</span>
    </div>`;
    prods.forEach(p => group.appendChild(makeProductItem(p)));
    catContainer.appendChild(group);
  });

  uncategorized.forEach(p => prodContainer.appendChild(makeProductItem(p)));
  if (products.length === 0) {
    prodContainer.innerHTML = '<div class="empty-state">Žiadne záznamy.</div>';
  }
}

function makeProductItem(product) {
  const item = document.createElement('div');
  item.className = 'product-item' + (product._id === currentProductId ? ' active' : '');
  item.dataset.id = product._id;
  item.onclick = () => openProduct(product._id);
  item.innerHTML = `
    <div class="product-item-dot dot-${product.status}"></div>
    <div style="flex:1;min-width:0">
      <div class="product-item-name">${escHtml(product.name)}</div>
      ${product.model ? `<div class="product-item-model">${escHtml(product.model)}</div>` : ''}
    </div>`;
  return item;
}

// ==============================
// SEARCH
// ==============================
function filterProducts() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  document.querySelectorAll('.product-item').forEach(item => {
    const p = products.find(x => x._id === item.dataset.id);
    if (!p) return;
    const match = !q || p.name.toLowerCase().includes(q) ||
      (p.model || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q));
    item.style.display = match ? '' : 'none';
  });
}

function liveSearch(q) {
  filterProducts();
  if (q.trim().length < 1) {
    renderWikiHome();
    document.getElementById('wikiWelcome').classList.remove('hidden');
    document.getElementById('productDetail').classList.add('hidden');
    document.getElementById('categoryView').classList.add('hidden');
    return;
  }
  showSearchResults(q.trim().toLowerCase());
}

function showSearchResults(q) {
  const matched = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q) ||
    (p.model || '').toLowerCase().includes(q) ||
    (p.tags || []).some(t => t.toLowerCase().includes(q))
  );

  document.getElementById('wikiWelcome').classList.remove('hidden');
  document.getElementById('productDetail').classList.add('hidden');
  document.getElementById('categoryView').classList.add('hidden');

  // Hide categories, show results in recent section
  const catSection = document.getElementById('whCats')?.closest('.wh-section');
  if (catSection) catSection.style.display = 'none';

  const recentSection = document.getElementById('whRecent')?.closest('.wh-section');
  const head = recentSection?.querySelector('.wh-section-head h2');
  if (head) head.textContent = `Výsledky hľadania "${q}" (${matched.length})`;

  const el = document.getElementById('whRecent');
  if (!el) return;
  el.innerHTML = '';
  if (matched.length === 0) {
    el.innerHTML = `<div class="wh-empty">Žiadne výsledky pre "<strong>${escHtml(q)}</strong>".</div>`;
    return;
  }
  matched.forEach(p => {
    const catObj = categories.find(c => c._id === (p.category?._id || p.category));
    el.appendChild(makeArticleCard(p, catObj));
  });
}

function restoreWikiSections() {
  const catSection = document.getElementById('whCats')?.closest('.wh-section');
  if (catSection) catSection.style.display = '';
  const head = document.getElementById('whRecent')?.closest('.wh-section')?.querySelector('.wh-section-head h2');
  if (head) head.textContent = 'Nedávno upravené';
}

// ==============================
// HOME PAGE KB PREVIEW
// ==============================
// ── Úvod: Pracovné postupy + vyhľadávanie ─────────────────────────────────────
let homeProcData = [];
async function loadHomeProcedures() {
  try {
    const r = await fetch('/api/procedures');
    homeProcData = await r.json();
    if (!Array.isArray(homeProcData)) homeProcData = [];
  } catch { homeProcData = []; }
  const cnt = document.getElementById('homeProcCount');
  if (cnt) cnt.textContent = homeProcData.length;
  renderHomeProcedures();
}
function renderHomeProcedures() {
  const el = document.getElementById('homeProcList');
  if (!el) return;
  const q = (document.getElementById('homeProcSearch')?.value || '').toLowerCase();
  let items = homeProcData.filter(p =>
    !q || (p.title || '').toLowerCase().includes(q) ||
    (p.department || '').toLowerCase().includes(q) ||
    (p.author || '').toLowerCase().includes(q));
  items = [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (!q) items = items.slice(0, 6);

  el.innerHTML = '';
  if (items.length === 0) {
    el.innerHTML = `<div style="font-size:0.78rem;color:rgba(255,255,255,0.3);padding:8px 0">${homeProcData.length === 0 ? 'Žiadne postupy. Vytvor prvý v sekcii Postupy.' : 'Žiadne výsledky.'}</div>`;
    return;
  }
  items.forEach(p => {
    const stepCount = (p.steps || []).length;
    const card = document.createElement('div');
    card.className = 'hkb-card';
    card.innerHTML = `
      <div class="hkb-card-icon">📋</div>
      <div class="hkb-card-body">
        <div class="hkb-card-title">${escHtml(p.title)}</div>
        <div class="hkb-card-meta">${p.department ? escHtml(p.department) + ' · ' : ''}${stepCount} operácií · ${fmtDate(p.updatedAt)}</div>
      </div>
      <div class="hkb-card-arrow">›</div>`;
    card.onclick = () => { showPage('procedures'); setTimeout(() => openProcedureById(p._id), 250); };
    el.appendChild(card);
  });
}

const HOME_CAL_TYPE_ICON = { event: '📌', meeting: '👥', dovolenka: '🏖️', sluzobka: '🚗', homeoffice: '🏠', pn: '🏥' };
async function loadHomeCalendar() {
  const el = document.getElementById('homeCalList'); if (!el) return;
  const from = calYmd(new Date());
  const to = calYmd(new Date(Date.now() + 45 * 864e5));
  let evs = [];
  try { evs = await fetch(`/api/calendar?from=${from}&to=${to}`).then(r => r.json()); if (!Array.isArray(evs)) evs = []; } catch { evs = []; }
  evs = evs.filter(e => String(e.endDate || e.date).slice(0, 10) >= from)
           .sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 6);
  if (!evs.length) { el.innerHTML = '<div class="home-cal-empty">Žiadne nadchádzajúce udalosti.</div>'; return; }
  const todayKey = from;
  el.innerHTML = '';
  evs.forEach(e => {
    const key = String(e.date).slice(0, 10);
    const isToday = key === todayKey;
    const d = new Date(key + 'T12:00:00');
    const item = document.createElement('div');
    item.className = 'home-cal-item' + (isToday ? ' home-cal-today' : '');
    item.style.setProperty('--ev', e.color || '#00d4ff');
    item.onclick = () => showPage('calendar');
    item.innerHTML = `
      <div class="home-cal-date"><span class="hc-day">${d.getDate()}</span><span class="hc-mon">${DT_MONTHS[d.getMonth()].slice(0, 3)}</span></div>
      <div class="home-cal-body">
        <div class="home-cal-evtitle">${HOME_CAL_TYPE_ICON[e.type] || '📌'} ${escHtml(e.title)}</div>
        <div class="home-cal-evmeta">${isToday ? 'dnes' : fmtDate(e.date)}${e.time ? ' · ' + escHtml(e.time) : ''}${e.person ? ' · ' + escHtml(e.person) : ''}</div>
      </div>`;
    el.appendChild(item);
  });
}

async function loadHomeTasks() {
  const el = document.getElementById('homeTaskList'); if (!el) return;
  let tasks = [];
  try { tasks = await fetch('/api/tasks').then(r => r.json()); if (!Array.isArray(tasks)) tasks = []; } catch { tasks = []; }
  const todayKey = calYmd(new Date());
  // iba aktuálne NEDOKONČENÉ úlohy
  const openAll = tasks.filter(t => !t.done);
  // zoradenie: po termíne → s termínom (najbližší) → ostatné
  const rank = t => (t.due && String(t.due).slice(0, 10) < todayKey) ? 0 : (t.due ? 1 : 2);
  const open = openAll.slice().sort((a, b) => {
    const ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb;
    return (a.due ? String(a.due) : '9999').localeCompare(b.due ? String(b.due) : '9999');
  }).slice(0, 6);

  const cntEl = document.getElementById('homeTaskCount');
  if (cntEl) cntEl.textContent = openAll.length ? openAll.length : '';

  if (!open.length) { el.innerHTML = '<div class="home-cal-empty">Žiadne nedokončené úlohy. 🎉</div>'; return; }
  const statusOf = t => (typeof taskStatusOf === 'function') ? taskStatusOf(t) : (t.status || (t.done ? 'done' : 'todo'));
  el.innerHTML = '';
  open.forEach(t => {
    const prio = (typeof TK_PRIO !== 'undefined' ? TK_PRIO[t.priority] : null) || { l: '', c: '#3b82f6' };
    const od = t.due && String(t.due).slice(0, 10) < todayKey;
    const row = document.createElement('div');
    row.className = 'home-task-item';
    row.style.setProperty('--ev', prio.c);

    const chips = [];
    if (t.project)  chips.push(`<span class="task-chip task-chip-pj">🗂️ ${escHtml(t.project)}</span>`);
    if (t.customer) chips.push(`<span class="task-chip task-chip-cust">🏢 ${escHtml(t.customer)}</span>`);

    const meta = [];
    if (prio.l) meta.push(`<span class="home-task-prio" style="color:${prio.c}">${prio.l}</span>`);
    if (t.due)  meta.push(`<span class="${od ? 'task-od' : ''}">📅 ${fmtDate(t.due)}${od ? ' — po termíne' : ''}</span>`);
    if (t.createdAt) meta.push(`<span class="home-task-added" title="Dátum pridania">➕ ${fmtDate(t.createdAt)}</span>`);

    const p = Math.max(0, Math.min(100, t.progress || 0));
    const showProg = p > 0 || statusOf(t) === 'inprogress';
    const pcls = p >= 100 ? 'pf-done' : p >= 50 ? 'pf-mid' : 'pf-lo';

    row.innerHTML = `
      <button class="home-task-check" title="Označiť ako hotové">✓</button>
      <div class="home-task-body">
        <div class="home-task-title">${escHtml(t.title)}</div>
        ${chips.length ? `<div class="home-task-chips">${chips.join('')}</div>` : ''}
        <div class="home-task-meta">${meta.join('<span class="home-task-sep">·</span>')}</div>
        ${showProg ? `<div class="task-prog home-task-prog"><div class="task-prog-track"><div class="task-prog-fill ${pcls}" style="width:${p}%"></div></div><span class="task-prog-val">${p}%</span></div>` : ''}
        ${t.note ? `<div class="home-task-note">📝 ${escHtml(t.note)}</div>` : ''}
      </div>`;
    row.querySelector('.home-task-check').onclick = async (e) => {
      e.stopPropagation();
      try { await fetch('/api/tasks/' + t._id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: true }) }); loadHomeTasks(); loadNotif(); } catch {}
    };
    row.querySelector('.home-task-body').onclick = () => showPage('tasks');
    el.appendChild(row);
  });
}

async function loadHomeKB() {
  loadAnnouncements();
  loadHomeProcedures();
  loadHomeCalendar();
  loadHomeTasks();
  try {
    const [cR, pR] = await Promise.all([fetch('/api/categories'), fetch('/api/products')]);
    const cats = await cR.json();
    const prods = await pR.json();

    // KB stats
    const prodCount = document.getElementById('kbProdCount');
    const catCount  = document.getElementById('kbCatCount');
    if (prodCount) prodCount.textContent = prods.length;
    if (catCount)  catCount.textContent  = cats.length;

    // Recent chips
    const el = document.getElementById('homeKBPreview');
    if (!el) return;
    el.innerHTML = '';

    const sorted = [...prods].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 10);
    if (sorted.length === 0) {
      el.innerHTML = '<span style="font-size:0.78rem;color:rgba(255,255,255,0.3)">Žiadne záznamy — otvorte KB a pridajte prvý.</span>';
      return;
    }
    sorted.forEach(p => {
      const cat = cats.find(c => c._id === (p.category?._id || p.category));
      const chip = document.createElement('div');
      chip.className = 'home-kb-preview-item';
      chip.innerHTML = `<span>${cat?.icon || '📄'}</span>${escHtml(p.name)}`;
      chip.onclick = () => { showPage('wiki'); setTimeout(() => openProduct(p._id), 150); };
      el.appendChild(chip);
    });

    // Recent KB articles (dark cards)
    const recentEl = document.getElementById('homeKBRecent');
    if (recentEl) {
      recentEl.innerHTML = '';
      const recent = [...prods].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
      if (recent.length === 0) {
        recentEl.innerHTML = '<div style="font-size:0.78rem;color:rgba(255,255,255,0.25);padding:8px 0">Žiadne záznamy.</div>';
      } else {
        recent.forEach(p => {
          const cat = cats.find(c => c._id === (p.category?._id || p.category));
          const card = document.createElement('div');
          card.className = 'hkb-card';
          card.innerHTML = `
            <div class="hkb-card-icon">${cat?.icon || '📄'}</div>
            <div class="hkb-card-body">
              <div class="hkb-card-title">${escHtml(p.name)}</div>
              <div class="hkb-card-meta">${cat?.name ? escHtml(cat.name) + ' · ' : ''}${fmtDate(p.updatedAt)}</div>
            </div>
            <div class="hkb-card-arrow">›</div>`;
          card.onclick = () => { showPage('wiki'); setTimeout(() => openProduct(p._id), 150); };
          recentEl.appendChild(card);
        });
      }
    }
  } catch {}
}

function homeSearch(q) {
  if (q.trim().length > 0) {
    showPage('wiki');
    setTimeout(() => {
      const inp = document.getElementById('wikiSearchMain');
      if (inp) { inp.value = q; liveSearch(q); }
    }, 150);
  }
}

// ==============================
// PRODUCT DETAIL
// ==============================
async function openProduct(id) {
  currentProductId = id;
  setHash('wiki/' + id);
  document.querySelectorAll('.product-item').forEach(i => i.classList.toggle('active', i.dataset.id === id));
  const homeBtn = document.getElementById('swnHome');
  if (homeBtn) homeBtn.classList.remove('active');

  try {
    const r = await fetch(`/api/products/${id}`);
    const p = await r.json();
    currentProduct = p;
    renderProductDetail(p);
  } catch { alert('Chyba pri načítaní záznamu'); }
}

function renderProductDetail(p) {
  document.getElementById('wikiWelcome').classList.add('hidden');
  document.getElementById('categoryView').classList.add('hidden');
  document.getElementById('productDetail').classList.remove('hidden');

  // Breadcrumb (interný v detaile + globálny nad obsahom)
  const bcCatEl = document.getElementById('pdBcCat');
  const catObj = p.category ? categories.find(c => c._id === (p.category._id || p.category)) : null;
  if (bcCatEl) {
    bcCatEl.textContent = catObj ? catObj.name : (p.category?.name || '');
    bcCatEl.dataset.catId = p.category?._id || p.category || '';
  }
  renderWikiCrumbs([
    { label: 'WIKI', act: 'showWikiHome()' },
    { label: catObj ? catObj.name : 'Nezaradené', act: `showCategoryView(${catObj ? `'${catObj._id}'` : 'null'})` },
    { label: p.name }
  ]);

  // Title & desc
  document.getElementById('detailName').textContent = p.name;
  const descEl = document.getElementById('detailDesc');
  descEl.textContent = p.description || '';
  descEl.style.display = p.description ? '' : 'none';

  // Badges
  const metaEl = document.getElementById('detailMeta');
  metaEl.innerHTML = '';
  if (p.category) {
    const catObj = categories.find(c => c._id === (p.category._id || p.category));
    const name = catObj?.name || p.category?.name || '';
    if (name) {
      const b = document.createElement('span');
      b.className = 'pd-cat-badge';
      b.textContent = name;
      metaEl.appendChild(b);
    }
  }
  const sb = document.createElement('span');
  sb.className = 'pd-status-badge status-' + p.status;
  sb.textContent = statusLabel(p.status);
  metaEl.appendChild(sb);

  // Info row
  const infoEl = document.getElementById('detailInfoRow');
  const infoParts = [];
  if (p.model)     infoParts.push(`<div class="pd-info-item"><strong>Model:</strong> ${escHtml(p.model)}</div>`);
  if (p.version)   infoParts.push(`<div class="pd-info-item"><strong>Verzia:</strong> ${escHtml(p.version)}</div>`);
  if (p.url)       infoParts.push(`<div class="pd-info-item"><strong>URL:</strong> <a href="${escHtml(p.url)}" target="_blank">${escHtml(p.url)}</a></div>`);
  if (p.tags?.length) infoParts.push(`<div class="pd-info-item"><strong>Tagy:</strong> ${p.tags.map(t => escHtml(t)).join(', ')}</div>`);
  infoParts.push(`<div class="pd-info-item" style="margin-left:auto"><strong>Upravené:</strong> ${fmtDate(p.updatedAt)}</div>`);
  infoEl.innerHTML = infoParts.join('');
  infoEl.style.display = infoParts.length > 1 ? '' : 'none';

  // Content
  document.getElementById('detailContent').innerHTML = p.content || '<p style="color:var(--text-xdim)">Žiadny obsah. Kliknite Upraviť pre pridanie.</p>';

  // Images
  const imgEl = document.getElementById('detailImages');
  imgEl.innerHTML = '';
  (p.images || []).forEach(img => {
    const card = document.createElement('div');
    card.className = 'pd-image-card';
    card.innerHTML = `<img src="${img.url}" alt="${escHtml(img.caption || '')}">
      ${img.caption ? `<div class="pd-image-caption">${escHtml(img.caption)}</div>` : ''}`;
    imgEl.appendChild(card);
  });
}

function goBackToCategory() {
  const bcCatEl = document.getElementById('pdBcCat');
  const catId = bcCatEl?.dataset.catId;
  if (catId) showCategoryView(catId);
  else showWikiHome();
}

// ==============================
// EDIT / DELETE
// ==============================
function editCurrentProduct() {
  if (currentProduct) openProductModal(currentProduct);
}

async function deleteCurrentProduct() {
  if (!currentProductId) return;
  if (!await uiConfirm('Naozaj odstrániť tento záznam?')) return;
  try {
    await fetch(`/api/products/${currentProductId}`, { method: 'DELETE' });
    currentProductId = null; currentProduct = null;
    await loadProducts();
    renderSidebar();
    showWikiHome();
  } catch { alert('Chyba pri odstraňovaní'); }
}

// ==============================
// PRODUCT MODAL
// ==============================
function openProductModal(product = null) {
  editingProductId = product ? product._id : null;
  pendingImages = product ? [...(product.images || [])] : [];

  document.getElementById('modalTitle').textContent = product ? 'Upraviť záznam' : 'Nový záznam';
  document.getElementById('fName').value    = product?.name        || '';
  document.getElementById('fModel').value   = product?.model       || '';
  document.getElementById('fVersion').value = product?.version     || '';
  document.getElementById('fDesc').value    = product?.description || '';
  document.getElementById('fUrl').value     = product?.url         || '';
  document.getElementById('fTags').value    = (product?.tags || []).join(', ');

  const statusVal = product?.status || 'active';
  document.querySelector(`input[name="fStatus"][value="${statusVal}"]`).checked = true;

  // Category select
  const catSel = document.getElementById('fCategory');
  catSel.innerHTML = '<option value="">— bez kategórie —</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c._id;
    opt.textContent = `${c.icon || ''} ${c.name}`;
    if (product?.category && (product.category._id === c._id || product.category === c._id)) opt.selected = true;
    catSel.appendChild(opt);
  });

  // Quill
  quill = null;
  document.getElementById('quillEditor').innerHTML = '';
  quill = new Quill('#quillEditor', {
    theme: 'snow',
    placeholder: 'Konfigurácia, nastavenia, poznámky, linky...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }],
        ['blockquote', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean']
      ]
    }
  });
  if (product?.content) quill.clipboard.dangerouslyPasteHTML(product.content);

  quill.getModule('toolbar').addHandler('image', quillImageHandler);

  renderImagePreviews();
  enableFileDrop(document.querySelector('#productModal .image-upload-zone'), (files) =>
    dropImagesTo(files, (url) => { pendingImages.push({ url, caption: '' }); renderImagePreviews(); }));
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  editingProductId = null; pendingImages = []; quill = null;
}

// ==============================
// QUILL IMAGE HANDLER
// ==============================
function quillImageHandler() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    const url = await uploadImage(file);
    if (url) { const range = quill.getSelection(true); quill.insertEmbed(range.index, 'image', url); }
  };
  input.click();
}

// ==============================
// IMAGE UPLOAD
// ==============================
async function uploadImage(file) {
  const fd = new FormData(); fd.append('image', file);
  try {
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const d = await r.json(); return d.url;
  } catch { alert('Chyba pri nahrávaní obrázka'); return null; }
}

async function handleImageUpload(input) {
  for (const file of input.files) {
    const url = await uploadImage(file);
    if (url) pendingImages.push({ url, caption: '' });
  }
  renderImagePreviews(); input.value = '';
}

function renderImagePreviews() {
  const list = document.getElementById('imagePreviewList');
  if (!list) return;
  list.innerHTML = '';
  pendingImages.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.innerHTML = `<img src="${img.url}" alt=""><button class="image-preview-remove" onclick="removeImage(${i})">✕</button>`;
    list.appendChild(item);
  });
}

function removeImage(i) { pendingImages.splice(i, 1); renderImagePreviews(); }

// ==============================
// SAVE PRODUCT
// ==============================
async function saveProduct() {
  const name = document.getElementById('fName').value.trim();
  if (!name) { alert('Zadajte názov záznamu'); return; }

  const body = {
    name,
    model:       document.getElementById('fModel').value.trim(),
    version:     document.getElementById('fVersion').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    url:         document.getElementById('fUrl').value.trim(),
    category:    document.getElementById('fCategory').value || null,
    status:      document.querySelector('input[name="fStatus"]:checked').value,
    content:     quill ? quill.root.innerHTML : '',
    images:      pendingImages,
    tags:        document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean)
  };

  try {
    const url    = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
    const method = editingProductId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const saved = await r.json();
    closeProductModal();
    await loadProducts();
    renderSidebar();
    renderWikiHome();
    if (saved._id) openProduct(saved._id);
  } catch { alert('Chyba pri ukladaní'); }
}

// ==============================
// CATEGORY MODAL
// ==============================
function openCategoryModal() {
  document.getElementById('cName').value  = '';
  document.getElementById('cIcon').value  = '📡';
  document.getElementById('cColor').value = '#0891b2';
  const descEl = document.getElementById('cDesc');
  if (descEl) descEl.value = '';
  document.getElementById('categoryModal').classList.remove('hidden');
}
function closeCategoryModal() {
  document.getElementById('categoryModal').classList.add('hidden');
}

async function saveCategory() {
  const name = document.getElementById('cName').value.trim();
  if (!name) { alert('Zadajte názov kategórie'); return; }
  try {
    const r = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        icon:        document.getElementById('cIcon').value  || '📁',
        color:       document.getElementById('cColor').value,
        description: document.getElementById('cDesc')?.value || ''
      })
    });
    const cat = await r.json();
    categories.push(cat);
    const sel = document.getElementById('fCategory');
    if (sel) {
      const opt = document.createElement('option');
      opt.value = cat._id; opt.textContent = `${cat.icon} ${cat.name}`; opt.selected = true;
      sel.appendChild(opt);
    }
    closeCategoryModal();
    renderWikiCategories();
  } catch { alert('Chyba pri ukladaní kategórie'); }
}

// ==============================
// HELPERS
// ==============================
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════════════════════
//  UX: Toast notifikácie + štýlovaný confirm (nahrádza natívne alert/confirm)
// ══════════════════════════════════════════════════════════════════════════════
function toast(msg, type = 'info', ms = 3400) {
  let c = document.getElementById('toastWrap');
  if (!c) { c = document.createElement('div'); c.id = 'toastWrap'; c.className = 'toast-wrap'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  const ico = type === 'error' ? '✕' : type === 'success' ? '✓' : type === 'warn' ? '⚠' : 'ℹ';
  t.innerHTML = `<span class="toast-ico">${ico}</span><span class="toast-msg"></span><button class="toast-x" title="Zavrieť">✕</button>`;
  t.querySelector('.toast-msg').textContent = String(msg == null ? '' : msg);
  const close = () => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 220); };
  t.querySelector('.toast-x').onclick = close;
  c.appendChild(t);
  if (ms) setTimeout(close, ms);
  return t;
}
// Natívny alert → toast (heuristika typu podľa textu)
window.alert = function (m) {
  const s = String(m == null ? '' : m);
  const err = /chyb|zlyhal|neplatn|nepodaril|nemož|nemoz|error|fail/i.test(s);
  const ok  = /hotovo|uložen|ulozen|úspe|uspe|vytvoren|odoslan|pridan|aktualizovan|✓/i.test(s);
  toast(s, err ? 'error' : ok ? 'success' : 'info', err ? 5200 : 3400);
};

let _confirmResolve = null;
function uiConfirm(message, opts = {}) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    const m = document.getElementById('confirmModal');
    if (!m) { resolve(window.confirm ? true : true); return; }
    document.getElementById('confirmMsg').textContent = String(message || 'Naozaj pokračovať?');
    const ok = document.getElementById('confirmOk'), cancel = document.getElementById('confirmCancel');
    const danger = opts.danger !== undefined ? opts.danger : /odstrán|zmaz|vymaz|odstrani|vymaž|nevratn|delete|trvale/i.test(String(message));
    ok.textContent = opts.okText || (danger ? 'Odstrániť' : 'Potvrdiť');
    cancel.textContent = opts.cancelText || 'Zrušiť';
    ok.className = danger ? 'btn-danger-solid' : 'btn-primary';
    document.getElementById('confirmIco').textContent = danger ? '⚠' : '?';
    document.getElementById('confirmIco').className = 'confirm-ico' + (danger ? ' danger' : '');
    m.classList.remove('hidden');
    setTimeout(() => ok.focus(), 40);
  });
}
function _confirmDone(val) {
  document.getElementById('confirmModal')?.classList.add('hidden');
  if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(val); }
}

// ── Stráženie neuložených zmien v modaloch ──
const _modalSnap = {};
function _modalState(modalId) {
  const m = document.getElementById(modalId); if (!m) return '';
  return [...m.querySelectorAll('input, textarea, select')].map(e => e.type === 'checkbox' ? (e.checked ? '1' : '0') : (e.value || '')).join('');
}
function modalSnapshot(modalId) { _modalSnap[modalId] = _modalState(modalId); }
async function modalGuardClose(modalId) {
  if (_modalSnap[modalId] != null && _modalState(modalId) !== _modalSnap[modalId]) {
    const ok = await uiConfirm('Máte neuložené zmeny. Naozaj zavrieť bez uloženia?', { danger: false, okText: 'Zavrieť', cancelText: 'Pokračovať v úprave' });
    if (!ok) return false;
  }
  delete _modalSnap[modalId];
  document.getElementById(modalId)?.classList.add('hidden');
  return true;
}

function fmtDate(iso) { return new Date(iso).toLocaleDateString('sk-SK'); }
function fmtDateTime(iso) { return new Date(iso).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function pluralSk(n) {
  if (n === 1) return 'záznam';
  if (n >= 2 && n <= 4) return 'záznamy';
  return 'záznamov';
}
function statusLabel(s) {
  return { active: 'Aktívny', development: 'Vývoj', discontinued: 'Ukončený' }[s] || s;
}

// ==============================
// PRODUCT MODEL — add url field
// ==============================
// (handled via fUrl input in modal, saved in body.url)

// ==============================
// HEADER MENU (kategorizované rozbalovacie menu)
// ==============================
// Definícia skupín → rozbalovacie menu v hlavičke (v poradí zľava)
const HEADER_GROUP_DEFS = [
  { key: 'files',      label: 'Súbory',     icon: '📁' },  // servery + sablony
  { key: 'custom',     label: 'Nástroje',   icon: '⚙️' },
  { key: 'erp',        label: 'ERP',        icon: '📊' },
  { key: 'sharepoint', label: 'SharePoint', icon: '🔗' },
  { key: 'other',      label: 'Odkazy',     icon: '🔖' },
];
function groupKeyFor(g) {
  if (g === 'servery' || g === 'sablony') return 'files';
  if (g === 'custom')     return 'custom';
  if (g === 'erp')        return 'erp';
  if (g === 'sharepoint') return 'sharepoint';
  return 'other';
}
let _headerGroups = {};

async function loadHeaderLinks() {
  const container = document.getElementById('headerQuicklinks');
  if (!container) return;
  try {
    const r = await fetch('/api/admin/links');
    const links = await r.json();
    const active = links.filter(l => l.active);

    // Pripnuté odkazy → priamo v hlavičke; zvyšok → kategorizované dropdowny
    const pinned = active.filter(l => l.pinned);
    const rest   = active.filter(l => !l.pinned);

    _headerGroups = {};
    rest.forEach(l => {
      const k = groupKeyFor(l.group);
      (_headerGroups[k] = _headerGroups[k] || []).push(l);
    });

    container.innerHTML = '';

    // Priame čipy (DBFOS, ISYS, …)
    pinned.forEach(l => container.appendChild(makeDirectChip(l)));
    if (pinned.length && rest.length) {
      const sep = document.createElement('div'); sep.className = 'ql-sep'; container.appendChild(sep);
    }

    // Dropdowny podľa kategórií
    HEADER_GROUP_DEFS.forEach(def => {
      const items = _headerGroups[def.key];
      if (!items || !items.length) return;
      const chip = document.createElement('div');
      chip.className = 'ql-chip ql-menu ql-menu-' + def.key;
      chip.onclick = (e) => toggleHeaderMenu(e, def.key);
      chip.innerHTML = `<span class="ql-files-icon">${def.icon}</span> ${escHtml(def.label)} <span class="ql-files-caret">▾</span>`;
      container.appendChild(chip);
    });
  } catch (e) { console.error('loadHeaderLinks:', e); }
}

// Priamy čip v hlavičke (pripnutý odkaz)
function makeDirectChip(l) {
  const colorClass = 'ql-' + (l.color || 'sp');
  if (l.hasCredential && l.credentialKey) {
    const div = document.createElement('div');
    div.className = `ql-chip ${colorClass}`;
    div.style.cursor = 'pointer';
    div.onclick = (e) => { if (!e.target.classList.contains('ql-cred-btn')) window.open(l.url, '_blank'); };
    div.innerHTML = `${l.hasDot ? '<span class="ql-dot"></span>' : ''} ${escHtml(l.label)}
      <button class="ql-cred-btn" onclick="togglePeakloggerCreds(event)" title="Zobraziť prístupy">🔑</button>`;
    return div;
  }
  const a = document.createElement('a');
  a.className = `ql-chip ${colorClass}`;
  a.href = l.url; a.target = '_blank';
  a.innerHTML = `${l.hasDot ? '<span class="ql-dot"></span>' : ''} ${escHtml(l.label)}`;
  return a;
}

// Konvertuj cestu (G:\... alebo \\server\...) na file: URL pre "otvoriť"
function toFileHref(val) {
  if (!val) return '#';
  if (/^[a-zA-Z]:[\\/]/.test(val)) return 'file:///' + val.replace(/\\/g, '/');
  if (/^\\\\/.test(val))           return 'file:' + val.replace(/\\/g, '/');
  return val; // http(s) alebo iné — necháme tak
}
function isFilePath(val) {
  return /^[a-zA-Z]:[\\/]/.test(val) || /^\\\\/.test(val);
}

// Otvorenie priečinka na file serveri.
// Prehliadače z bezpečnostných dôvodov blokujú navigáciu na file:// z https stránky,
// preto cestu skopírujeme do schránky + zobrazíme dialóg s návodom (a skúsime aj priame otvorenie).
function openServerFolder(path) {
  if (!path) return;
  if (!isFilePath(path)) { window.open(path, '_blank'); return; } // http(s) odkaz
  try { navigator.clipboard && navigator.clipboard.writeText(path); } catch (_) {}
  showFolderDialog(path);
}

function showFolderDialog(path) {
  let m = document.getElementById('folderDialog');
  if (!m) {
    m = document.createElement('div');
    m.id = 'folderDialog'; m.className = 'modal hidden';
    m.innerHTML = `<div class="modal-backdrop" onclick="closeFolderDialog()"></div>
      <div class="modal-box modal-sm">
        <div class="modal-header"><h2>📁 Otvoriť priečinok</h2><button class="modal-close" onclick="closeFolderDialog()">✕</button></div>
        <div class="modal-body">
          <p class="folder-dlg-hint">Prehliadač z bezpečnostných dôvodov nedokáže priamo otvoriť sieťový priečinok. Cesta je <strong>skopírovaná do schránky</strong> — stačí ju vložiť do Prieskumníka.</p>
          <input type="text" id="folderDlgPath" class="folder-dlg-path" readonly>
          <ol class="folder-dlg-steps">
            <li>Otvor <strong>Prieskumník</strong> — <kbd>⊞ Win</kbd> + <kbd>E</kbd></li>
            <li>Klikni do adresného riadku — <kbd>Ctrl</kbd> + <kbd>L</kbd></li>
            <li>Vlož a potvrď — <kbd>Ctrl</kbd> + <kbd>V</kbd>, <kbd>Enter</kbd></li>
          </ol>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeFolderDialog()">Zavrieť</button>
          <button class="btn-sm" id="folderDlgTry">↗ Skúsiť otvoriť priamo</button>
          <button class="btn-primary" id="folderDlgCopy">📋 Kopírovať cestu</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }
  const inp = m.querySelector('#folderDlgPath');
  inp.value = path;
  m.querySelector('#folderDlgCopy').onclick = () => {
    const b = m.querySelector('#folderDlgCopy');
    try { navigator.clipboard.writeText(path); } catch (_) { inp.select(); try { document.execCommand('copy'); } catch (_) {} }
    b.textContent = '✓ Skopírované'; setTimeout(() => { b.textContent = '📋 Kopírovať cestu'; }, 1400);
  };
  m.querySelector('#folderDlgTry').onclick = () => { try { window.open(toFileHref(path), '_blank'); } catch (_) {} };
  m.classList.remove('hidden');
  setTimeout(() => { inp.focus(); inp.select(); }, 50);
}
function closeFolderDialog() { document.getElementById('folderDialog')?.classList.add('hidden'); }

// Riadok odkazu s cestou (serverové priečinky / šablóny) — otvoriť + kopírovať
function fileRowHtml(l) {
  const isFile = isFilePath(l.url);
  const safeUrl = JSON.stringify(l.url).replace(/"/g, '&quot;');
  const copyBtn = isFile
    ? `<button class="files-row-btn" onclick="copyToClipboard(this, ${safeUrl})" title="Kopírovať cestu">⧉</button>`
    : '';
  // File cesty otvárame cez openServerFolder (file:// z https je blokované), http(s) klasicky
  const linkAttrs = isFile
    ? `href="#" onclick="event.preventDefault(); openServerFolder(${safeUrl})"`
    : `href="${escHtml(l.url)}" target="_blank"`;
  return `<div class="files-row">
    <a class="files-row-link" ${linkAttrs} title="${escHtml(l.url)}">
      <span class="files-row-label">${escHtml(l.label)}</span>
      <span class="files-row-path">${escHtml(l.url)}</span>
    </a>
    ${copyBtn}
  </div>`;
}

// Generický riadok odkazu (ERP, SharePoint, Nástroje…) — vrátane prístupov (🔑)
function menuRowHtml(l) {
  if (isFilePath(l.url)) return fileRowHtml(l);
  if (l.hasCredential && l.credentialKey) {
    return `<div class="files-row">
        <a class="files-row-link" href="${escHtml(l.url)}" target="_blank" title="${escHtml(l.url)}">
          <span class="files-row-label">${escHtml(l.label)}</span>
        </a>
        <button class="files-row-btn" onclick="toggleMenuCred(event, this, '${escHtml(l.credentialKey)}')" title="Zobraziť prístupy">🔑</button>
      </div>
      <div class="menu-cred hidden"></div>`;
  }
  return `<div class="files-row">
      <a class="files-row-link" href="${escHtml(l.url)}" target="_blank" title="${escHtml(l.url)}">
        <span class="files-row-label">${escHtml(l.label)}</span>
      </a>
    </div>`;
}

function buildMenuBody(groupKey) {
  const items = _headerGroups[groupKey] || [];
  if (groupKey === 'files') {
    const folders   = items.filter(l => l.group === 'servery');
    const templates = items.filter(l => l.group === 'sablony');
    const section = (title, list) => list.length
      ? `<div class="files-section"><div class="files-section-title">${title}</div>${list.map(fileRowHtml).join('')}</div>` : '';
    return (section('📁 Serverové priečinky', folders) + section('📄 Šablóny', templates))
      || '<div class="files-empty">Žiadne odkazy.</div>';
  }
  return items.map(menuRowHtml).join('') || '<div class="files-empty">Žiadne odkazy.</div>';
}

function toggleHeaderMenu(e, groupKey) {
  e.stopPropagation();
  const pop = document.getElementById('menuDropdown');
  if (!pop) return;
  const chip = e.target.closest('.ql-chip');

  // Klik na rovnaký chip → zavrieť
  if (pop.dataset.group === groupKey && !pop.classList.contains('hidden')) {
    pop.classList.add('hidden'); pop.dataset.group = '';
    return;
  }

  document.getElementById('menuDropdownBody').innerHTML = buildMenuBody(groupKey);
  pop.dataset.group = groupKey;
  if (chip) {
    const rect = chip.getBoundingClientRect();
    pop.style.left = Math.max(8, rect.left) + 'px';
    pop.style.right = 'auto';
  }
  pop.classList.remove('hidden');
}

// Inline zobrazenie prístupov (credential) v rozbalovacom menu
async function toggleMenuCred(e, btn, key) {
  e.stopPropagation();
  const row = btn.closest('.files-row');
  const credEl = row?.nextElementSibling;
  if (!credEl || !credEl.classList.contains('menu-cred')) return;
  if (!credEl.classList.contains('hidden')) { credEl.classList.add('hidden'); return; }

  credEl.innerHTML = '<div class="menu-cred-row">Načítavam…</div>';
  credEl.classList.remove('hidden');
  try {
    const c = await fetch('/api/credentials/' + key).then(r => r.json());
    const enc = (s) => JSON.stringify(s || '').replace(/"/g, '&quot;');
    credEl.innerHTML = `
      <div class="menu-cred-row">
        <span class="menu-cred-label">Login</span>
        <span class="menu-cred-val">${escHtml(c.user || '—')}</span>
        <button class="files-row-btn" onclick="copyToClipboard(this, ${enc(c.user)})" title="Kopírovať">⧉</button>
      </div>
      <div class="menu-cred-row">
        <span class="menu-cred-label">Heslo</span>
        <span class="menu-cred-val">${escHtml(c.pass || '—')}</span>
        <button class="files-row-btn" onclick="copyToClipboard(this, ${enc(c.pass)})" title="Kopírovať">⧉</button>
      </div>`;
  } catch { credEl.innerHTML = '<div class="menu-cred-row">Chyba pri načítaní</div>'; }
}

async function copyToClipboard(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = old; }, 1200);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
}

// Zatvor rozbalovacie menu pri kliku mimo
document.addEventListener('click', () => {
  const p = document.getElementById('menuDropdown');
  if (p) { p.classList.add('hidden'); p.dataset.group = ''; }
});

// ==============================
// HOME KB — RECENT NEWS
// ==============================
// (integrated into loadHomeKB below)

// ==============================
// NOVINKY (oznámenia)
// ==============================
let announcementsData = [];
const ANN_TYPES = {
  info:      { icon: 'ℹ️', label: 'Informácia' },
  important: { icon: '📢', label: 'Dôležité' },
  success:   { icon: '✅', label: 'Úspech' },
  warning:   { icon: '⚠️', label: 'Upozornenie' },
};

async function loadAnnouncements() {
  try {
    const r = await fetch('/api/announcements');
    announcementsData = await r.json();
    if (!Array.isArray(announcementsData)) announcementsData = [];
  } catch { announcementsData = []; }
  renderAnnouncements();
}

function renderAnnouncements() {
  const el = document.getElementById('homeNewsList');
  if (!el) return;
  el.innerHTML = '';
  if (announcementsData.length === 0) {
    el.innerHTML = '<div class="news-empty">Žiadne novinky. Pridajte prvé oznámenie tlačidlom vyššie.</div>';
    return;
  }
  announcementsData.forEach(a => {
    const t = ANN_TYPES[a.type] || ANN_TYPES.info;
    const card = document.createElement('div');
    card.className = 'news-card news-' + a.type + (a.pinned ? ' news-pinned' : '');
    card.innerHTML = `
      <div class="news-card-icon">${t.icon}</div>
      <div class="news-card-body">
        <div class="news-card-title">
          ${a.pinned ? '<span class="news-pin">📌</span>' : ''}${escHtml(a.title)}
        </div>
        ${a.body ? `<div class="news-card-text">${escHtml(a.body)}</div>` : ''}
        <div class="news-card-meta">
          <span>${fmtDate(a.date)}</span>
          ${a.author ? `<span>· ${escHtml(a.author)}</span>` : ''}
          <span class="news-type-badge">${t.label}</span>
        </div>
      </div>
      <div class="news-card-actions">
        <button class="admin-icon-btn" onclick="openAnnouncementModal(announcementsData.find(x => x._id === '${a._id}'))" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteAnnouncement('${a._id}')" title="Odstrániť">✕</button>
      </div>`;
    el.appendChild(card);
  });
}

function openAnnouncementModal(ann = null) {
  const isEdit = ann && typeof ann === 'object';
  document.getElementById('annModalTitle').textContent = isEdit ? 'Upraviť novinku' : 'Nová novinka';
  document.getElementById('anId').value     = isEdit ? ann._id : '';
  document.getElementById('anTitle').value  = isEdit ? (ann.title || '') : '';
  document.getElementById('anBody').value   = isEdit ? (ann.body || '') : '';
  document.getElementById('anType').value   = isEdit ? (ann.type || 'info') : 'info';
  document.getElementById('anDate').value   = isEdit && ann.date ? String(ann.date).slice(0, 10) : calYmd(new Date());
  document.getElementById('anAuthor').value = isEdit ? (ann.author || '') : '';
  document.getElementById('anPinned').checked = isEdit ? !!ann.pinned : false;
  document.getElementById('anDeleteBtn').style.display = isEdit ? '' : 'none';
  document.getElementById('announcementModal').classList.remove('hidden');
}

function closeAnnouncementModal() {
  document.getElementById('announcementModal').classList.add('hidden');
}

async function saveAnnouncement() {
  const title = document.getElementById('anTitle').value.trim();
  if (!title) { alert('Zadajte nadpis novinky'); return; }
  const body = {
    title,
    body:   document.getElementById('anBody').value.trim(),
    type:   document.getElementById('anType').value,
    date:   document.getElementById('anDate').value || undefined,
    author: document.getElementById('anAuthor').value.trim(),
    pinned: document.getElementById('anPinned').checked
  };
  const id = document.getElementById('anId').value;
  try {
    const endpoint = id ? '/api/announcements/' + id : '/api/announcements';
    const method   = id ? 'PUT' : 'POST';
    const resp = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      alert('Chyba ' + resp.status + ': ' + (err.error || 'Neznáma chyba'));
      return;
    }
    closeAnnouncementModal();
    loadAnnouncements();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function deleteAnnouncement(id) {
  if (!id) return;
  if (!await uiConfirm('Naozaj odstrániť túto novinku?')) return;
  try {
    await fetch('/api/announcements/' + id, { method: 'DELETE' });
    loadAnnouncements();
  } catch { alert('Chyba pri odstraňovaní'); }
}

// ==============================
// CALENDAR (kancelária)
// ==============================
const CAL_MONTHS = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];
const CAL_TYPE_LABELS = {
  event: 'Udalosť', meeting: 'Porada', dovolenka: 'Dovolenka',
  sluzobka: 'Služobná cesta', homeoffice: 'Home office', pn: 'PN / Lekár'
};
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-11
let calEvents = [];
let calExternal = [];   // udalosti z napojených ICS feedov (Outlook) — len na čítanie
let calView = 'month';  // 'month' | 'week' | 'day'
let calRef  = new Date(); // referenčný dátum (kotva pohľadu)
let calPersonFilter = ''; // filter podľa osoby / zdroja
let calTextFilter = '';   // textový filter
let calTypeFilter = '';   // filter podľa typu
let calBh = false;        // len pracovné hodiny (7–19) v týždeň/deň
let _calRemind = new Set();// už zobrazené pripomienky
let calZoom = 46;         // px / hodina v týždennom a dennom pohľade

// Date -> 'YYYY-MM-DD' (local components)
function calYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Rozsah [from,to] pre aktuálny pohľad
function calRange() {
  if (calView === 'week') {
    const offset = (calRef.getDay() + 6) % 7;
    const mon = new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate() - offset);
    return [mon, new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)];
  }
  if (calView === 'day') return [new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate()),
                                  new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate())];
  // month (s presahom susedných mesiacov)
  return [new Date(calRef.getFullYear(), calRef.getMonth() - 1, 1),
          new Date(calRef.getFullYear(), calRef.getMonth() + 2, 0)];
}

async function loadCalendar() {
  calYear = calRef.getFullYear(); calMonth = calRef.getMonth();
  const [from, to] = calRange();
  try {
    const [ev, ext] = await Promise.all([
      fetch(`/api/calendar?from=${calYmd(from)}&to=${calYmd(to)}`).then(r => r.json()),
      fetch(`/api/calendar/external?from=${calYmd(from)}&to=${calYmd(to)}`).then(r => r.json()).catch(() => [])
    ]);
    calEvents = Array.isArray(ev) ? ev : [];
    calExternal = Array.isArray(ext) ? ext : [];
  } catch { calEvents = []; calExternal = []; }
  renderCalendar();
}

// Build map: 'YYYY-MM-DD' -> [events] (multi-day events appear on each day)
function calBuildDayMap() {
  const map = {};
  const add = (key, ev) => { (map[key] = map[key] || []).push(ev); };
  calEvents.concat(calExternal).filter(calVisible).forEach(ev => {
    const startKey = String(ev.date).slice(0, 10);
    const endKey   = ev.endDate ? String(ev.endDate).slice(0, 10) : startKey;
    let cur = new Date(startKey + 'T12:00:00');
    const end = new Date(endKey + 'T12:00:00');
    // Guard against malformed ranges
    if (isNaN(cur) || isNaN(end) || end < cur) { add(startKey, ev); return; }
    let guard = 0;
    while (cur <= end && guard < 400) { add(calYmd(cur), ev); cur.setDate(cur.getDate() + 1); guard++; }
  });
  return map;
}

// ── pomocné ──
function calVisible(ev) {
  if (calPersonFilter && (ev.external ? ev.source : ev.person) !== calPersonFilter) return false;
  if (calTypeFilter) { const t = ev.external ? 'outlook' : (ev.type || 'event'); if (t !== calTypeFilter) return false; }
  if (calTextFilter) {
    const hay = [ev.title, ev.person, ev.source, ev.note].filter(Boolean).join(' ').toLowerCase();
    if (!hay.includes(calTextFilter.toLowerCase())) return false;
  }
  return true;
}
function calIsMultiDay(ev) { return ev.endDate && String(ev.endDate).slice(0, 10) !== String(ev.date).slice(0, 10); }
function parseHM(s) { const m = String(s || '').match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1] * 60 + +m[2]) : null; }
function calWeekDays() {
  const offset = (calRef.getDay() + 6) % 7;
  const mon = new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
}
function calEvOwner(ev) { return ev.external ? (ev.source || 'Outlook') : (ev.person || ''); }
function calInitials(name) { return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).map(w => w[0].toUpperCase()).join('') || '?'; }
// Zlúči rovnaké udalosti rôznych ľudí/zdrojov (rovnaký názov + dátum + čas) do jednej, so zoznamom vlastníkov
function calMergeEvents(list) {
  const groups = new Map();
  list.forEach(ev => {
    const key = [String(ev.title || '').trim().toLowerCase(), String(ev.date).slice(0, 10), String(ev.endDate || '').slice(0, 10), ev.time || '', ev.allDay ? 1 : 0].join('|');
    let m = groups.get(key);
    if (!m) { m = Object.assign({}, ev); m._ref = ev; m._owners = []; m._count = 0; groups.set(key, m); }
    m._count++;
    const own = calEvOwner(ev);
    if (own && !m._owners.includes(own)) m._owners.push(own);
  });
  return [...groups.values()];
}
function calEvChipHtml(ev) {
  const ref = ev._ref || ev;
  const ext = ref.external;
  const allday = ev.allDay || calIsMultiDay(ev);
  const color = ev.color || (ext ? '#7c3aed' : '#00d4ff');
  const dataAttr = ext ? `data-ext="${calExternal.indexOf(ref)}"` : `data-id="${ref._id}"`;
  const multi = ev._owners && ev._owners.length > 1;
  const cls = `cal-ev ${allday ? 'cal-ev-allday' : 'cal-ev-timed'}${ext ? ' cal-ev-ext' : ''}${multi ? ' cal-ev-merged' : ''}`;
  const ownerFull = (ev._owners && ev._owners.length) ? ev._owners.join(', ') : calEvOwner(ev);
  const ownerDisp = (ev._owners && ev._owners.length) ? ev._owners.map(calInitials).join(', ') : calInitials(calEvOwner(ev));
  const icon = multi ? '👥' : (ext ? '📅' : '👤');
  const ownerHtml = ownerFull ? `<span class="cal-ev-owner" title="${escHtml(ownerFull)}"> · ${icon} ${escHtml(ownerDisp)}</span>` : '';
  const tip = escHtml(ev.title) + (ownerFull ? '\n' + (multi ? 'Spoločné: ' : '') + escHtml(ownerFull) : '') + (ext ? ' (len na čítanie)' : '');
  if (allday) {
    return `<div class="${cls}" style="--ev-color:${escHtml(color)}" ${dataAttr} title="${tip}"><span class="cal-ev-txt">${escHtml(ev.title)}</span>${ownerHtml}</div>`;
  }
  const t = ev.time ? `<span class="cal-ev-time">${escHtml(ev.time)}</span>` : '';
  return `<div class="${cls}" style="--ev-color:${escHtml(color)}" ${dataAttr} title="${tip}"><span class="cal-ev-dot"></span><span class="cal-ev-main">${t}<span class="cal-ev-txt">${escHtml(ev.title)}</span>${ownerHtml}</span></div>`;
}
function calAttachEvClicks(root) {
  root.querySelectorAll('.cal-ev, .cal-span').forEach(el => el.onclick = (e) => {
    e.stopPropagation();
    if (el.dataset.ext != null) { const ev = calExternal[+el.dataset.ext]; if (ev) showExternalEvent(ev); return; }
    const ev = calEvents.find(x => x._id === el.dataset.id); if (ev) openEventModal(ev);
  });
}
function calFillPersonFilter() {
  const sel = document.getElementById('calPerson'); if (!sel) return;
  const persons = [...new Set(calEvents.map(e => (e.person || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'));
  const sources = [...new Set(calExternal.map(e => (e.source || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'));
  let html = '<option value="">👥 Všetci</option>';
  if (persons.length) html += '<optgroup label="Osoby">' + persons.map(p => `<option value="${escHtml(p)}"${p === calPersonFilter ? ' selected' : ''}>${escHtml(p)}</option>`).join('') + '</optgroup>';
  if (sources.length) html += '<optgroup label="Zdroje">' + sources.map(s => `<option value="${escHtml(s)}"${s === calPersonFilter ? ' selected' : ''}>📅 ${escHtml(s)}</option>`).join('') + '</optgroup>';
  sel.innerHTML = html; sel.value = calPersonFilter;
}

function renderCalendar() {
  const vp = document.getElementById('calViewport'); if (!vp) return;
  document.querySelectorAll('[data-calview]').forEach(b => b.classList.toggle('active', b.dataset.calview === calView));
  document.getElementById('calZoomCtl')?.classList.toggle('hidden', calView === 'month');
  document.getElementById('calBhBtn')?.classList.toggle('hidden', calView === 'month');
  const ty = document.getElementById('calType'); if (ty) ty.value = calTypeFilter;
  calFillPersonFilter();
  if (calView === 'month') renderCalMonth(vp);
  else renderCalTimeGrid(vp, calView === 'week' ? calWeekDays() : [new Date(calRef)]);
}

// ── Slovenské štátne sviatky a dni pracovného pokoja ──
const _holCache = {};
function calEaster(y) { // Meeus/Jones/Butcher
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
function skHolidays(y) {
  if (_holCache[y]) return _holCache[y];
  const map = {};
  const set = (mo, d, name) => { map[`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = name; };
  set(1, 1, 'Deň vzniku SR'); set(1, 6, 'Zjavenie Pána (Traja králi)');
  set(5, 1, 'Sviatok práce'); set(5, 8, 'Deň víťazstva nad fašizmom');
  set(7, 5, 'Sv. Cyril a Metod'); set(8, 29, 'Výročie SNP');
  set(9, 1, 'Deň Ústavy SR'); set(9, 15, 'Sedembolestná Panna Mária');
  set(11, 1, 'Sviatok všetkých svätých'); set(11, 17, 'Deň boja za slobodu a demokraciu');
  set(12, 24, 'Štedrý deň'); set(12, 25, 'Prvý sviatok vianočný'); set(12, 26, 'Druhý sviatok vianočný');
  const e = calEaster(y);
  const gf = new Date(e); gf.setDate(e.getDate() - 2);
  const em = new Date(e); em.setDate(e.getDate() + 1);
  map[calYmd(gf)] = 'Veľký piatok'; map[calYmd(em)] = 'Veľkonočný pondelok';
  _holCache[y] = map; return map;
}
function calHolidayName(key) { return skHolidays(+key.slice(0, 4))[key] || ''; }

function renderCalMonth(vp) {
  document.getElementById('calMonthLabel').textContent = `${CAL_MONTHS[calMonth]} ${calYear}`;
  const todayKey = calYmd(new Date());
  const offset = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const gridStart = new Date(calYear, calMonth, 1 - offset);
  const all = calEvents.concat(calExternal).filter(calVisible);
  const evKey = ev => String(ev.date).slice(0, 10);
  const evEndKey = ev => String(ev.endDate || ev.date).slice(0, 10);
  const spanning = calMergeEvents(all.filter(ev => ev.allDay || calIsMultiDay(ev)));
  const timed = calMergeEvents(all.filter(ev => !(ev.allDay || calIsMultiDay(ev)) && ev.time)).sort((a, b) => (parseHM(a.time) || 0) - (parseHM(b.time) || 0));
  const timedByDay = {}; timed.forEach(ev => (timedByDay[evKey(ev)] = timedByDay[evKey(ev)] || []).push(ev));
  const MAXLANES = 4, LANE = 23, NUMH = 32;

  let weeksHtml = '';
  for (let w = 0; w < 6; w++) {
    const wkKeys = [], wkDates = [];
    for (let c = 0; c < 7; c++) { const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + c); wkKeys.push(calYmd(d)); wkDates.push(d); }
    const wStart = wkKeys[0], wEnd = wkKeys[6];
    // spanning segmenty pre tento týždeň
    const segs = [];
    spanning.forEach(ev => {
      const s = evKey(ev), e = evEndKey(ev);
      if (e < wStart || s > wEnd) return;
      let startCol = wkKeys.indexOf(s), endCol = wkKeys.indexOf(e);
      const contL = startCol === -1; if (contL) startCol = 0;
      const contR = endCol === -1; if (contR) endCol = 6;
      segs.push({ ev, startCol, endCol, contL, contR });
    });
    segs.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));
    const lanes = [];
    segs.forEach(seg => { let L = 0; for (; ;) { const occ = lanes[L] || []; if (occ.every(r => seg.endCol < r.s || seg.startCol > r.e)) { (lanes[L] = lanes[L] || []).push({ s: seg.startCol, e: seg.endCol }); seg.lane = L; break; } L++; } });
    const laneCount = Math.min(lanes.length, MAXLANES);

    const bars = segs.filter(s => s.lane < MAXLANES).map(seg => {
      const ev = seg.ev, ref = ev._ref || ev, ext = ref.external, color = ev.color || (ext ? '#7c3aed' : '#00d4ff');
      const left = seg.startCol / 7 * 100, width = (seg.endCol - seg.startCol + 1) / 7 * 100;
      const data = ext ? `data-ext="${calExternal.indexOf(ref)}"` : `data-id="${ref._id}"`;
      const cls = `cal-span${seg.contL ? ' cont-l' : ''}${seg.contR ? ' cont-r' : ''}`;
      const multi = ev._owners && ev._owners.length > 1;
      const own = (ev._owners && ev._owners.length) ? ev._owners.join(', ') : calEvOwner(ev);
      const ownDisp = (ev._owners && ev._owners.length) ? ev._owners.map(calInitials).join(', ') : calInitials(calEvOwner(ev));
      const ownTxt = own ? ` · ${multi ? '👥' : (ext ? '📅' : '👤')} ${escHtml(ownDisp)}` : '';
      return `<div class="${cls}" ${data} style="--ev-color:${escHtml(color)};left:calc(${left}% + 3px);width:calc(${width}% - 6px);top:${seg.lane * LANE}px" title="${escHtml(ev.title)}${own ? ' · ' + escHtml(own) : ''}">${seg.contL ? '◂ ' : ''}${escHtml(ev.title)}${ownTxt}${seg.contR ? ' ▸' : ''}</div>`;
    }).join('');

    let cellsHtml = '';
    for (let c = 0; c < 7; c++) {
      const d = wkDates[c], key = wkKeys[c], inMonth = d.getMonth() === calMonth, we = (d.getDay() === 0 || d.getDay() === 6);
      const dayTimed = timedByDay[key] || [];
      const budget = Math.max(1, 5 - laneCount);
      const timedShown = dayTimed.slice(0, budget);
      const hiddenSpan = segs.filter(s => c >= s.startCol && c <= s.endCol && s.lane >= MAXLANES).length;
      const more = (dayTimed.length - timedShown.length) + hiddenSpan;
      const hol = calHolidayName(key);
      const holHtml = hol ? `<div class="cal-holiday" title="Štátny sviatok: ${escHtml(hol)}">🇸🇰 ${escHtml(hol)}</div>` : '';
      cellsHtml += `<div class="cal-cell${inMonth ? '' : ' cal-cell-out'}${key === todayKey ? ' cal-cell-today' : ''}${we ? ' cal-cell-weekend' : ''}${hol ? ' cal-cell-holiday' : ''}" data-day="${key}">
        ${c === 0 ? `<span class="cal-wk" title="Číslo týždňa">T${calIsoWeek(d)}</span>` : ''}
        <div class="cal-cell-num" data-open-day="${key}">${d.getDate()}</div>
        <div class="cal-cell-events" style="padding-top:${laneCount * LANE}px">${holHtml}${timedShown.map(calEvChipHtml).join('')}${more > 0 ? `<div class="cal-more" data-open-day="${key}">+${more} ďalšie</div>` : ''}</div>
      </div>`;
    }
    weeksHtml += `<div class="cal-week"><div class="cal-week-cells">${cellsHtml}</div><div class="cal-week-spans" style="top:${NUMH}px">${bars}</div></div>`;
  }
  vp.innerHTML = `<div class="cal-weekdays"><div>Po</div><div>Ut</div><div>St</div><div>Št</div><div>Pi</div><div class="cal-weekend">So</div><div class="cal-weekend">Ne</div></div><div class="cal-grid-weeks">${weeksHtml}</div>`;
  vp.querySelectorAll('[data-open-day]').forEach(el => el.onclick = (e) => { e.stopPropagation(); calOpenDay(el.dataset.openDay); });
  vp.querySelectorAll('.cal-cell').forEach(cell => cell.onclick = (e) => { if (e.target === cell || e.target.classList.contains('cal-cell-events')) openEventModal(null, cell.dataset.day); });
  calAttachEvClicks(vp);
  // Drag & drop — presun internej udalosti na iný deň
  vp.querySelectorAll('.cal-ev[data-id], .cal-span[data-id]').forEach(el => {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/cal', el.dataset.id); e.dataTransfer.effectAllowed = 'move'; el.classList.add('cal-dragging'); });
    el.addEventListener('dragend', () => el.classList.remove('cal-dragging'));
  });
  vp.querySelectorAll('.cal-cell').forEach(cell => {
    cell.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/cal')) { e.preventDefault(); cell.classList.add('cal-cell-dragover'); } });
    cell.addEventListener('dragleave', () => cell.classList.remove('cal-cell-dragover'));
    cell.addEventListener('drop', e => { e.preventDefault(); cell.classList.remove('cal-cell-dragover'); const id = e.dataTransfer.getData('text/cal'); if (id) calMoveEvent(id, cell.dataset.day); });
  });
}
async function calMoveEvent(id, newKey) {
  const ev = calEvents.find(x => x._id === id); if (!ev) return;
  if (ev.recurFreq && ev.recurFreq !== 'none') { toast('Opakovanú udalosť presuň cez úpravu.', 'warn'); return; }
  const oldKey = String(ev.date).slice(0, 10); if (oldKey === newKey) return;
  const delta = Math.round((new Date(newKey + 'T12:00') - new Date(oldKey + 'T12:00')) / 864e5);
  const nd = new Date(ev.date); nd.setDate(nd.getDate() + delta);
  const body = { date: calYmd(nd) };
  if (ev.endDate) { const ned = new Date(ev.endDate); ned.setDate(ned.getDate() + delta); body.endDate = calYmd(ned); }
  try { const r = await fetch('/api/calendar/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (r.ok) { toast('Udalosť presunutá.', 'success'); loadCalendar(); } else toast('Presun zlyhal.', 'error'); }
  catch { toast('Sieťová chyba.', 'error'); }
}

function calOpenDay(key) { const [y, m, da] = key.split('-').map(Number); calRef = new Date(y, m - 1, da); setCalView('day'); }

// Rozvrhnutie prekrývajúcich sa udalostí do stĺpcov (lanes)
function calEvEndMin(ev, s) { const e = parseHM(ev.endTime); return (e && e > s) ? Math.min(1440, e) : Math.min(1440, s + 60); }
function calLayoutLanes(evs) {
  const items = evs.map(ev => { const s = parseHM(ev.time) ?? 0; return { ev, s, e: calEvEndMin(ev, s) }; }).sort((a, b) => a.s - b.s || a.e - b.e);
  let cluster = [], cEnd = -1;
  const flush = () => { const lanes = []; cluster.forEach(it => { let l = lanes.findIndex(end => it.s >= end); if (l === -1) { l = lanes.length; lanes.push(it.e); } else lanes[l] = it.e; it.lane = l; }); const cols = lanes.length; cluster.forEach(it => it.cols = cols); };
  items.forEach(it => { if (cluster.length && it.s >= cEnd) { flush(); cluster = []; cEnd = -1; } cluster.push(it); cEnd = Math.max(cEnd, it.e); });
  if (cluster.length) flush();
  return items;
}

function renderCalTimeGrid(vp, days) {
  const lbl = document.getElementById('calMonthLabel');
  if (calView === 'day') lbl.textContent = days[0].toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  else { const a = days[0], b = days[6]; lbl.textContent = `${a.getDate()}.${a.getMonth() + 1}. – ${b.getDate()}.${b.getMonth() + 1}. ${b.getFullYear()}`; }
  const dayMap = calBuildDayMap();
  const todayKey = calYmd(new Date());
  const hourH = calZoom, H0 = calBh ? 7 : 0, H1 = calBh ? 19 : 24, HN = H1 - H0;
  const WD = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

  let head = '<div class="ctg-corner"></div>';
  let allday = '<div class="ctg-corner ctg-allday-lbl">celý deň</div>';
  let cols = '';
  days.forEach(d => {
    const key = calYmd(d), we = (d.getDay() === 0 || d.getDay() === 6), isToday = key === todayKey;
    const hol = calHolidayName(key);
    head += `<div class="ctg-dayhdr${isToday ? ' ctg-today' : ''}${we ? ' ctg-we' : ''}${hol ? ' ctg-hol' : ''}" data-open-day="${key}" title="${hol ? 'Sviatok: ' + escHtml(hol) : ''}"><span class="ctg-dow">${WD[(d.getDay() + 6) % 7]}</span> <span class="ctg-dnum">${d.getDate()}.${d.getMonth() + 1}.</span></div>`;
    const dayEvs = dayMap[key] || [];
    const holHtml = hol ? `<div class="cal-holiday" title="Štátny sviatok: ${escHtml(hol)}">🇸🇰 ${escHtml(hol)}</div>` : '';
    allday += `<div class="ctg-allday-cell${we ? ' ctg-we' : ''}" data-newday="${key}">${holHtml}${calMergeEvents(dayEvs.filter(ev => ev.allDay || calIsMultiDay(ev))).map(calEvChipHtml).join('')}</div>`;
    let lines = ''; for (let h = H0; h < H1; h++) lines += `<div class="ctg-line" style="top:${(h - H0) * hourH}px"></div>`;
    const laid = calLayoutLanes(calMergeEvents(dayEvs.filter(ev => !ev.allDay && !calIsMultiDay(ev) && ev.time)));
    const evhtml = laid.map(it => {
      if (it.e <= H0 * 60 || it.s >= H1 * 60) return '';
      const top = Math.max(0, (it.s - H0 * 60) / 60 * hourH);
      const height = Math.max(15, (Math.min(it.e, H1 * 60) - Math.max(it.s, H0 * 60)) / 60 * hourH - 2);
      const w = 100 / it.cols, left = it.lane * w, ev = it.ev, ref = ev._ref || ev, ext = ref.external;
      const multi = ev._owners && ev._owners.length > 1, conflict = it.cols > 1;
      const _own = (ev._owners && ev._owners.length) ? ev._owners.join(', ') : calEvOwner(ev);
      const _ownDisp = (ev._owners && ev._owners.length) ? ev._owners.map(calInitials).join(', ') : calInitials(calEvOwner(ev));
      const inner = `<span class="ctg-ev-time">${escHtml(ev.time)}</span> ${escHtml(ev.title)}${_own ? `<span class="ctg-ev-owner" title="${escHtml(_own)}"> · ${multi ? '👥' : (ext ? '📅' : '👤')} ${escHtml(_ownDisp)}</span>` : ''}`;
      const cls = `cal-ev ctg-ev${ext ? ' cal-ev-ext' : ''}${conflict ? ' ctg-ev-conflict' : ''}`;
      const ds = ext ? `data-ext="${calExternal.indexOf(ref)}"` : `data-id="${ref._id}"`;
      return `<div class="${cls}" ${ds} style="--ev-color:${escHtml(ev.color || (ext ? '#7c3aed' : '#00d4ff'))};top:${top}px;height:${height}px;left:${left}%;width:calc(${w}% - 3px)" title="${conflict ? '⚠ Prekryv · ' : ''}${escHtml(ev.title)}${_own ? ' · ' + escHtml(_own) : ''}">${conflict ? '<span class="ctg-conf">⚠</span>' : ''}${inner}</div>`;
    }).join('');
    cols += `<div class="ctg-daycol${we ? ' ctg-we' : ''}${isToday ? ' ctg-today' : ''}" data-newday="${key}" style="height:${HN * hourH}px">${lines}${evhtml}</div>`;
  });
  let gutter = ''; for (let h = H0; h < H1; h++) gutter += `<div class="ctg-hour" style="height:${hourH}px"><span>${String(h).padStart(2, '0')}:00</span></div>`;

  vp.innerHTML = `<div class="ctg ctg-${calView}" style="--ctg-days:${days.length}">
    <div class="ctg-head">${head}</div>
    <div class="ctg-allday">${allday}</div>
    <div class="ctg-body"><div class="ctg-gutter">${gutter}</div><div class="ctg-cols">${cols}</div></div>
  </div>`;
  calAttachEvClicks(vp);
  vp.querySelectorAll('[data-open-day]').forEach(el => el.onclick = () => calOpenDay(el.dataset.openDay));
  vp.querySelectorAll('[data-newday]').forEach(el => el.onclick = (e) => { if (e.target === el) openEventModal(null, el.dataset.newday); });
  const body = vp.querySelector('.ctg-body'); if (body) body.scrollTop = Math.max(0, (7 - H0) * hourH - 8);
}

// Read-only zobrazenie externej (Outlook) udalosti
function showExternalEvent(ev) {
  const sameDay = !ev.endDate || String(ev.endDate).slice(0, 10) === String(ev.date).slice(0, 10);
  const d = fmtDate(ev.date) + (sameDay ? '' : ' – ' + fmtDate(ev.endDate));
  const when = ev.allDay ? 'celodenná' : (ev.time || '');
  toast(`📅 ${ev.title}\n${d}${when ? ' · ' + when : ''}${ev.note ? '\n' + ev.note : ''}\nZdroj: ${ev.source || 'Outlook'} · len na čítanie`, 'info', 7000);
}

// ── Správa ICS feedov (Outlook → dashboard) ──
function openIcsModal() {
  document.getElementById('icsUrl').value = '';
  document.getElementById('icsLabel').value = '';
  document.getElementById('icsColor').value = '#7c3aed';
  document.getElementById('icsTestMsg').textContent = '';
  loadIcsFeeds();
  document.getElementById('icsModal').classList.remove('hidden');
}
function closeIcsModal() { document.getElementById('icsModal').classList.add('hidden'); }
async function loadIcsFeeds() {
  let feeds = [];
  try { feeds = await fetch('/api/calendar/feeds').then(r => r.json()); } catch {}
  const el = document.getElementById('icsFeedList'); if (!el) return;
  if (!Array.isArray(feeds) || !feeds.length) { el.innerHTML = '<div class="ics-empty">Zatiaľ žiadny napojený kalendár.</div>'; return; }
  el.innerHTML = '<div class="ics-feed-title">Napojené kalendáre</div>' + feeds.map(f => `
    <div class="ics-feed">
      <span class="ics-feed-dot" style="background:${escHtml(f.color || '#7c3aed')}"></span>
      <span class="ics-feed-label">${escHtml(f.label || 'Outlook')}</span>
      <button class="ics-feed-del" onclick="deleteIcsFeed('${f._id}')" title="Odpojiť">✕</button>
    </div>`).join('');
}
async function testIcsFeed() {
  const url = document.getElementById('icsUrl').value.trim();
  const msg = document.getElementById('icsTestMsg');
  if (!url) { msg.textContent = 'Zadaj ICS odkaz.'; msg.className = 'ics-test err'; return; }
  msg.textContent = 'Testujem…'; msg.className = 'ics-test';
  try {
    const r = await fetch('/api/calendar/feeds/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'chyba');
    msg.textContent = `✓ Funguje — našlo sa ${d.count} udalostí.`; msg.className = 'ics-test ok';
  } catch (e) { msg.textContent = '✕ ' + e.message; msg.className = 'ics-test err'; }
}
async function saveIcsFeed() {
  const url = document.getElementById('icsUrl').value.trim();
  if (!url) { toast('Zadaj ICS odkaz.', 'error'); return; }
  const body = { url, label: document.getElementById('icsLabel').value.trim() || 'Outlook', color: document.getElementById('icsColor').value };
  try {
    const r = await fetch('/api/calendar/feeds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    document.getElementById('icsUrl').value = ''; document.getElementById('icsLabel').value = ''; document.getElementById('icsTestMsg').textContent = '';
    toast('Kalendár napojený — udalosti sa načítajú.', 'success');
    await loadIcsFeeds(); loadCalendar();
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function deleteIcsFeed(id) {
  if (!await uiConfirm('Odpojiť tento kalendár?')) return;
  try { await fetch('/api/calendar/feeds/' + id, { method: 'DELETE' }); await loadIcsFeeds(); loadCalendar(); toast('Odpojené.', 'success'); }
  catch (e) { toast('Chyba: ' + e.message, 'error'); }
}

function exportCalendarExcel() {
  window.location.href = '/api/calendar/export.xlsx';
}

function setCalView(v) { calView = v; loadCalendar(); }
function calNav(dir) {
  if (calView === 'month') calRef = new Date(calRef.getFullYear(), calRef.getMonth() + dir, 1);
  else if (calView === 'week') calRef = new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate() + 7 * dir);
  else calRef = new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate() + dir);
  loadCalendar();
}
function calGoToday() { calRef = new Date(); loadCalendar(); }
function setCalPerson(v) { calPersonFilter = v; renderCalendar(); }
function setCalText(v) { calTextFilter = v.trim(); renderCalendar(); }
function setCalType(v) { calTypeFilter = v; renderCalendar(); }
function toggleCalBh() { calBh = !calBh; document.getElementById('calBhBtn')?.classList.toggle('active', calBh); renderCalendar(); }
function calJumpDate(v) { if (!v) return; const [y, m, d] = v.split('-').map(Number); calRef = new Date(y, m - 1, d); setCalView('day'); }

// ISO číslo týždňa
function calIsoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7; firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  return 1 + Math.round((t - firstThu) / (7 * 864e5));
}

// Tlač
function calPrint() { document.body.classList.add('printing-cal'); window.print(); setTimeout(() => document.body.classList.remove('printing-cal'), 600); }

// iCal export (odber v Outlooku)
async function openCalExportModal() {
  try {
    const d = await fetch('/api/calendar/feed-url').then(r => r.json());
    document.getElementById('calExportUrl').value = location.origin + '/api/calendar/feed.ics?token=' + d.token;
  } catch { document.getElementById('calExportUrl').value = ''; }
  document.getElementById('calExportModal').classList.remove('hidden');
}
function calCopyExportUrl() {
  const inp = document.getElementById('calExportUrl'); inp.select();
  navigator.clipboard?.writeText(inp.value).then(() => toast('Odkaz skopírovaný.', 'success'), () => { try { document.execCommand('copy'); toast('Odkaz skopírovaný.', 'success'); } catch { toast('Skopíruj odkaz ručne.', 'info'); } });
}

// Pripomienky — kontroluje nadchádzajúce udalosti
async function calCheckReminders() {
  try {
    const now = new Date();
    const from = calYmd(now), to = calYmd(new Date(now.getTime() + 2 * 864e5));
    const evs = await fetch(`/api/calendar?from=${from}&to=${to}`).then(r => r.json());
    if (!Array.isArray(evs)) return;
    evs.forEach(ev => {
      if (!ev.reminderMin || ev.allDay || !ev.time) return;
      const [h, mi] = ev.time.split(':').map(Number);
      const start = new Date(ev.date); start.setHours(h, mi, 0, 0);
      const diff = (start - now) / 60000;
      const key = ev._id + '|' + calYmd(start);
      if (diff > 0 && diff <= ev.reminderMin && !_calRemind.has(key)) {
        _calRemind.add(key);
        toast(`⏰ ${ev.title} o ${ev.time}${ev.person ? ' · ' + ev.person : ''}`, 'info', 9000);
      }
    });
  } catch {}
}
function calZoomBy(d) { calZoom = Math.max(28, Math.min(96, calZoom + d * 12)); renderCalendar(); }

// ── Event modal ─────────────────────────────────────────────────────────────
function openEventModal(event = null, prefillDate = null) {
  const isEdit = event && typeof event === 'object';
  document.getElementById('eventModalTitle').textContent = isEdit ? 'Upraviť udalosť' : 'Nová udalosť';
  document.getElementById('evId').value      = isEdit ? event._id : '';
  document.getElementById('evTitle').value   = isEdit ? (event.title || '') : '';
  document.getElementById('evPerson').value  = isEdit ? (event.person || '') : '';
  document.getElementById('evDate').value    = isEdit ? String(event.date).slice(0, 10) : (prefillDate || calYmd(new Date()));
  document.getElementById('evEndDate').value = isEdit && event.endDate ? String(event.endDate).slice(0, 10) : '';
  document.getElementById('evAllDay').checked = isEdit ? (event.allDay !== false) : true;
  document.getElementById('evTime').value    = isEdit ? (event.time || '') : '';
  document.getElementById('evEndTime').value = isEdit ? (event.endTime || '') : '';
  document.getElementById('evType').value    = isEdit ? (event.type || 'event') : 'event';
  document.getElementById('evColor').value   = isEdit ? (event.color || '#00d4ff') : '#00d4ff';
  document.getElementById('evNote').value    = isEdit ? (event.note || '') : '';
  document.getElementById('evRecur').value   = isEdit ? (event.recurFreq || 'none') : 'none';
  document.getElementById('evRecurUntil').value = isEdit && event.recurUntil ? String(event.recurUntil).slice(0, 10) : '';
  document.getElementById('evReminder').value = isEdit ? String(event.reminderMin || 0) : '0';
  document.getElementById('evDeleteBtn').style.display = isEdit ? '' : 'none';
  toggleEventTime(); toggleEventRecur();
  document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() {
  document.getElementById('eventModal').classList.add('hidden');
}

function toggleEventTime() {
  const allDay = document.getElementById('evAllDay').checked;
  document.getElementById('evTimeWrap').style.display = allDay ? 'none' : '';
  document.getElementById('evEndTimeWrap').style.display = allDay ? 'none' : '';
}
function toggleEventRecur() {
  document.getElementById('evRecurUntilWrap').style.display = document.getElementById('evRecur').value === 'none' ? 'none' : '';
}

async function saveEvent() {
  const title = document.getElementById('evTitle').value.trim();
  const date  = document.getElementById('evDate').value;
  if (!title) { alert('Zadajte názov udalosti'); return; }
  if (!date)  { alert('Zadajte dátum'); return; }

  const endDate = document.getElementById('evEndDate').value || null;
  if (endDate && endDate < date) { alert('Dátum "do" nemôže byť pred dátumom "od"'); return; }

  const allDay = document.getElementById('evAllDay').checked;
  const body = {
    title,
    person:  document.getElementById('evPerson').value.trim(),
    date,
    endDate,
    allDay,
    time:    allDay ? '' : document.getElementById('evTime').value,
    endTime: allDay ? '' : document.getElementById('evEndTime').value,
    type:    document.getElementById('evType').value,
    color:   document.getElementById('evColor').value,
    note:    document.getElementById('evNote').value.trim(),
    recurFreq:  document.getElementById('evRecur').value,
    recurUntil: document.getElementById('evRecurUntil').value || null,
    reminderMin: Number(document.getElementById('evReminder').value) || 0
  };

  const id = document.getElementById('evId').value;
  try {
    const endpoint = id ? '/api/calendar/' + id : '/api/calendar';
    const method   = id ? 'PUT' : 'POST';
    const resp = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      alert('Chyba ' + resp.status + ': ' + (err.error || 'Neznáma chyba'));
      return;
    }
    closeEventModal();
    loadCalendar();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function deleteEvent() {
  const id = document.getElementById('evId').value;
  if (!id) return;
  if (!await uiConfirm('Naozaj odstrániť túto udalosť?')) return;
  try {
    await fetch('/api/calendar/' + id, { method: 'DELETE' });
    closeEventModal();
    loadCalendar();
  } catch { alert('Chyba pri odstraňovaní'); }
}

// ==============================
// PROCEDURES (pracovné postupy → Word)
// ==============================
let proceduresData = [];
const PROC_STATUS = { active: 'Aktívny', draft: 'Koncept', archived: 'Archivovaný' };

// Číselník typov upozornení a ochranných pomôcok (z /api/procedures/meta)
const PROC_META_FALLBACK = {
  warnings: [
    { key: 'manipulacia', label: 'Pozor pri manipulácii', icon: '⚠️' },
    { key: 'chemikalia',  label: 'Pozor na chemikáliu',   icon: '🧪' },
    { key: 'general',     label: 'Všeobecné upozornenie', icon: '❗' },
  ],
  ppe: [
    { key: 'okuliare', label: 'Ochranné okuliare', icon: '🥽' },
    { key: 'rukavice', label: 'Ochranné rukavice', icon: '🧤' },
  ]
};
let PROC_META = { warnings: [], ppe: [] };
let stepEditors = {};
let stepSeq = 0;
let currentDetailProcedure = null;

// Vyber obrázok z disku a nahraj → vráti URL (alebo null)
function pickImageUpload() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => { const f = input.files[0]; if (!f) { resolve(null); return; } resolve((await uploadImage(f)) || null); };
    input.click();
  });
}

// Vytvor editor operácie (TipTap, s fallbackom na textarea ak bundle nie je načítaný)
function mountStepEditor(el, html) {
  if (window.SylexEditor && typeof window.SylexEditor.createEditor === 'function') {
    return window.SylexEditor.createEditor(el, {
      content: html || '',
      placeholder: 'Podrobný popis operácie…',
      onImageRequest: pickImageUpload
    });
  }
  // Fallback — jednoduchý textarea
  el.innerHTML = '<textarea class="tt-fallback" rows="4" placeholder="Popis operácie…"></textarea>';
  const ta = el.querySelector('textarea');
  ta.value = stripHtmlText(html || '');
  return {
    getHTML: () => ta.value.trim() ? '<p>' + ta.value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</p>' : '',
    destroy: () => {}
  };
}
function destroyAllStepEditors() {
  Object.values(stepEditors).forEach(e => { try { e.destroy(); } catch (_) {} });
  stepEditors = {};
}

async function loadProcMeta() {
  if (PROC_META.warnings && PROC_META.warnings.length) return;
  try {
    const m = await fetch('/api/procedures/meta').then(r => r.json());
    PROC_META = (m && m.warnings) ? m : PROC_META_FALLBACK;
  } catch { PROC_META = PROC_META_FALLBACK; }
}
function procWarnMap() { const m = {}; (PROC_META.warnings || []).forEach(w => m[w.key] = w); return m; }
function procPpeMap()  { const m = {}; (PROC_META.ppe || []).forEach(w => m[w.key] = w); return m; }
function stripHtmlText(html) { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); }

async function loadProcedures() {
  await loadProcMeta();
  backToProcedureList();
  const list = document.getElementById('procList');
  if (list) list.innerHTML = '<div class="admin-loading">Načítavam…</div>';
  try {
    const r = await fetch('/api/procedures');
    proceduresData = await r.json();
    if (!Array.isArray(proceduresData)) proceduresData = [];
  } catch { proceduresData = []; }
  renderProcedures();
}

function renderProcedures() {
  const list = document.getElementById('procList');
  if (!list) return;
  const q = (document.getElementById('procSearch')?.value || '').toLowerCase();
  const items = proceduresData.filter(p =>
    !q || (p.title || '').toLowerCase().includes(q) ||
    (p.department || '').toLowerCase().includes(q) ||
    (p.author || '').toLowerCase().includes(q)
  );

  if (items.length === 0) {
    list.innerHTML = proceduresData.length === 0
      ? '<div class="proc-empty">Zatiaľ žiadne postupy.<div class="proc-empty-actions"><button class="btn-primary" onclick="openProcedureModal()">+ Vytvoriť prvý postup</button></div></div>'
      : '<div class="proc-empty">Žiadne výsledky pre zadané hľadanie.</div>';
    return;
  }

  list.innerHTML = '';
  items.forEach(p => {
    const stepCount = (p.steps || []).filter(s => stripHtmlText(s.text) || s.image).length;
    const card = document.createElement('div');
    card.className = 'proc-card';
    card.innerHTML = `
      <div class="proc-card-main" onclick="openProcedureById('${p._id}')">
        <div class="proc-card-top">
          <span class="proc-card-title">${escHtml(p.title)}</span>
          <span class="proc-status-badge proc-status-${p.status}">${PROC_STATUS[p.status] || p.status}</span>
        </div>
        <div class="proc-card-meta">
          ${p.department ? `<span>🏢 ${escHtml(p.department)}</span>` : ''}
          ${p.author ? `<span>👤 ${escHtml(p.author)}</span>` : ''}
          <span>🪜 ${stepCount} ${stepCount === 1 ? 'operácia' : (stepCount >= 2 && stepCount <= 4 ? 'operácie' : 'operácií')}</span>
          <span>🕒 ${fmtDate(p.updatedAt)}</span>
        </div>
      </div>
      <div class="proc-card-actions">
        <button class="btn-word" onclick="generateProcedureWord('${p._id}')" title="Stiahnuť ako Word">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Word
        </button>
        <button class="admin-icon-btn" onclick="openProcedureById('${p._id}')" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteProcedure('${p._id}')" title="Odstrániť">✕</button>
      </div>`;
    list.appendChild(card);
  });
}

function generateProcedureWord(id) {
  window.location.href = `/api/procedures/${id}/docx`;
}

// ── Detail / náhľad (read-only) ───────────────────────────────────────────────
function renderProcedureDetailHtml(p) {
  const wm = procWarnMap(), pm = procPpeMap();
  const figCounter = { n: 0 };
  const steps = (p.steps || []).filter(s => stripHtmlText(s.text) || s.image || (s.note || '').trim() || (s.warnings && s.warnings.length) || (s.ppe && s.ppe.length));
  const meta = [];
  if (p.department) meta.push(`<span>🏢 ${escHtml(p.department)}</span>`);
  if (p.author)     meta.push(`<span>👤 ${escHtml(p.author)}</span>`);
  if (p.date)       meta.push(`<span>📅 ${fmtDate(p.date)}</span>`);
  meta.push(`<span class="proc-status-badge proc-status-${p.status || 'active'}">${PROC_STATUS[p.status] || p.status || ''}</span>`);

  let html = `
    <div class="pdv-head">
      <div class="pdv-eyebrow">PRACOVNÝ POSTUP</div>
      <h1 class="pdv-title">${escHtml(p.title || '(bez názvu)')}</h1>
      <div class="pdv-meta">${meta.join('')}</div>
    </div>`;

  if ((p.purpose || '').trim())
    html += `<div class="pdv-section"><h3>Cieľ / Účel</h3><p class="pdv-purpose">${escHtml(p.purpose).replace(/\n/g, '<br>')}</p></div>`;

  const tools = (p.tools || []).filter(t => (t.name || '').trim());
  if (tools.length)
    html += `<div class="pdv-section"><h3>Potrebné pomôcky / nástroje</h3><ul class="pdv-tools">${tools.map(t => `<li><strong>${escHtml(t.name)}</strong>${t.note ? ` — ${escHtml(t.note)}` : ''}</li>`).join('')}</ul></div>`;

  if (steps.length) {
    html += `<div class="pdv-section"><h3>Postup</h3><div class="pdv-steps">`;
    steps.forEach((s, i) => {
      const warns = (s.warnings || []).map(k => wm[k] ? `<span class="pdv-badge pdv-warn">${wm[k].icon} ${escHtml(wm[k].label)}</span>` : '').join('');
      const ppes  = (s.ppe || []).map(k => pm[k] ? `<span class="pdv-badge pdv-ppe">${pm[k].icon} ${escHtml(pm[k].label)}</span>` : '').join('');
      const pos = s.image ? (s.imagePos || 'below') : 'below';
      const figN = s.image ? ++figCounter.n : 0;
      const imgHtml = s.image
        ? `<figure class="pdv-fig pdv-fig-${pos}"><img src="${escHtml(s.image)}" alt=""><figcaption>Obrázok ${figN}${s.caption ? ': ' + escHtml(s.caption) : ''}</figcaption></figure>`
        : '';
      html += `<div class="pdv-step">
        <div class="pdv-step-num">${i + 1}</div>
        <div class="pdv-step-body">
          ${pos === 'right' || pos === 'left' ? imgHtml : ''}
          <div class="pdv-step-text">${s.text || ''}</div>
          ${(s.note || '').trim() ? `<div class="pdv-step-note">📝 ${escHtml(s.note)}</div>` : ''}
          ${pos === 'below' ? imgHtml : ''}
          ${warns ? `<div class="pdv-badges pdv-badges-warn">${warns}</div>` : ''}
          ${ppes ? `<div class="pdv-badges pdv-badges-ppe">${ppes}</div>` : ''}
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  const risks = (p.risks || []).filter(r => (r || '').trim());
  if (risks.length)
    html += `<div class="pdv-section"><h3>Riziká / Upozornenia</h3><ul class="pdv-risks">${risks.map(r => `<li>${escHtml(r)}</li>`).join('')}</ul></div>`;

  const atts = (p.attachments || []).filter(a => (a.label || a.url || '').trim());
  if (atts.length)
    html += `<div class="pdv-section"><h3>Prílohy / Odkazy</h3><ul class="pdv-atts">${atts.map(a => `<li>${escHtml(a.label || a.url)}${a.label && a.url ? ` <span class="pdv-att-url">${escHtml(a.url)}</span>` : ''}</li>`).join('')}</ul></div>`;

  return html;
}

async function showProcedureDetail(id) {
  await loadProcMeta();
  let p = proceduresData.find(x => x._id === id) || null;
  try { p = await fetch('/api/procedures/' + id).then(r => r.json()); } catch {}
  if (!p || p.error) { alert('Postup sa nepodarilo načítať'); return; }
  currentDetailProcedure = p;
  const det = document.getElementById('procDetail');
  det.innerHTML = `
    <div class="pdv-toolbar">
      <button class="btn-secondary" onclick="backToProcedureList()">← Späť na zoznam</button>
      <div class="pdv-toolbar-actions">
        <button class="btn-word" onclick="generateProcedureWord('${p._id}')">⬇ Word</button>
        <button class="btn-edit" onclick="editDetailProcedure()">✎ Upraviť</button>
        <button class="btn-delete" onclick="deleteProcedure('${p._id}')">🗑 Odstrániť</button>
      </div>
    </div>
    <div class="pdv-card">${renderProcedureDetailHtml(p)}</div>`;
  document.getElementById('procListView').classList.add('hidden');
  det.classList.remove('hidden');
}
function editDetailProcedure() { if (currentDetailProcedure) openProcedureModal(currentDetailProcedure); }
function backToProcedureList() {
  const det = document.getElementById('procDetail');
  if (det) det.classList.add('hidden');
  const ev = document.getElementById('procEditView');
  if (ev) ev.classList.add('hidden');
  const lv = document.getElementById('procListView');
  if (lv) lv.classList.remove('hidden');
}

// ── Náhľad počas editácie (z modalu) ──────────────────────────────────────────
function openProcedurePreview() {
  const p = collectProcedureForm();
  document.getElementById('procPreviewBody').innerHTML = renderProcedureDetailHtml(p);
  document.getElementById('procPreviewModal').classList.remove('hidden');
}
function closeProcedurePreview() { document.getElementById('procPreviewModal').classList.add('hidden'); }

// ── Dynamické riadky (pomôcky, prílohy) ───────────────────────────────────────
function procRemoveRow(btn) { btn.closest('.proc-row')?.remove(); }

function addToolRow(tool = {}) {
  const c = document.getElementById('prToolsRows');
  const row = document.createElement('div');
  row.className = 'proc-row';
  row.innerHTML = `
    <input type="text" class="proc-tool-name" placeholder="Pomôcka / nástroj" value="${escHtml(tool.name || '')}">
    <input type="text" class="proc-tool-note" placeholder="Poznámka" value="${escHtml(tool.note || '')}">
    <button type="button" class="proc-row-del" onclick="procRemoveRow(this)" title="Odstrániť">✕</button>`;
  c.appendChild(row);
}

function addAttachmentRow(att = {}) {
  const c = document.getElementById('prAttRows');
  const row = document.createElement('div');
  row.className = 'proc-row';
  row.innerHTML = `
    <input type="text" class="proc-att-label" placeholder="Popis" value="${escHtml(att.label || '')}">
    <input type="text" class="proc-att-url" placeholder="Odkaz / cesta (napr. G:\\Projekty\\...)" value="${escHtml(att.url || '')}">
    <button type="button" class="proc-row-del" onclick="procRemoveRow(this)" title="Odstrániť">✕</button>`;
  c.appendChild(row);
}

// ── Operácie (rich karty) ─────────────────────────────────────────────────────
function procMoveStep(btn, dir) {
  const card = btn.closest('.proc-step-card');
  if (!card) return;
  if (dir < 0 && card.previousElementSibling) card.parentNode.insertBefore(card, card.previousElementSibling);
  if (dir > 0 && card.nextElementSibling)     card.parentNode.insertBefore(card.nextElementSibling, card);
}
function procRemoveStep(btn) {
  const card = btn.closest('.proc-step-card');
  if (!card) return;
  const ed = stepEditors[card.dataset.sid];
  if (ed) { try { ed.destroy(); } catch (_) {} delete stepEditors[card.dataset.sid]; }
  card.remove();
}

function renderIconPicker(el, defs, selected, countEl) {
  if (!el) return;
  const updCount = () => { if (countEl) countEl.textContent = selected.length ? `(${selected.length})` : ''; };
  el.innerHTML = '';
  (defs || []).forEach(d => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'proc-icon-btn' + (selected.includes(d.key) ? ' active' : '');
    b.title = d.label;
    b.innerHTML = `<span class="pi-emoji">${d.icon}</span><span class="pi-label">${escHtml(d.label)}</span>`;
    b.onclick = () => {
      const i = selected.indexOf(d.key);
      if (i >= 0) selected.splice(i, 1); else selected.push(d.key);
      b.classList.toggle('active');
      updCount();
    };
    el.appendChild(b);
  });
  updCount();
}

function renderStepThumb(card) {
  const el = card.querySelector('.proc-step-img');
  if (!el) return;
  el.innerHTML = card._image
    ? `<div class="proc-thumb"><img src="${escHtml(card._image)}" alt=""><button type="button" class="proc-thumb-del" onclick="removeStepImage(this)" title="Odstrániť obrázok">✕</button></div>`
    : '<span class="proc-thumb-empty">Žiadny obrázok</span>';
}
function removeStepImage(btn) { const card = btn.closest('.proc-step-card'); if (card) { card._image = ''; renderStepThumb(card); } }

async function importStepImage(btn) {
  const card = btn.closest('.proc-step-card');
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    const url = await uploadImage(f);
    if (url) { card._image = url; renderStepThumb(card); }
  };
  input.click();
}

function addStepRow(step = {}) {
  const c = document.getElementById('prStepsRows');
  const sid = 'pstep_' + (++stepSeq);
  const card = document.createElement('div');
  card.className = 'proc-step-card';
  card.dataset.sid = sid;
  card._image    = step.image || '';
  card._warnings = [...(step.warnings || [])];
  card._ppe      = [...(step.ppe || [])];
  card.innerHTML = `
    <div class="proc-step-card-hdr">
      <span class="proc-step-badge">Operácia</span>
      <div class="proc-step-card-tools">
        <button type="button" class="proc-row-move" onclick="procMoveStep(this,-1)" title="Hore">↑</button>
        <button type="button" class="proc-row-move" onclick="procMoveStep(this,1)" title="Dole">↓</button>
        <button type="button" class="proc-row-dup" onclick="duplicateStep(this)" title="Duplikovať operáciu">⧉</button>
        <button type="button" class="proc-row-del" onclick="procRemoveStep(this)" title="Odstrániť">✕</button>
      </div>
    </div>
    <div class="proc-step-editor" id="${sid}_ed"></div>
    <input type="text" class="proc-step-note" placeholder="Krátka poznámka (voliteľné)" value="${escHtml(step.note || '')}">
    <div class="proc-step-section">
      <div class="proc-mini-label">Obrázok operácie</div>
      <div class="proc-step-img"></div>
      <div class="proc-img-controls">
        <button type="button" class="btn-sm" onclick="importStepImage(this)">🖼 Importovať</button>
        <select class="proc-img-pos" title="Rozloženie obrázka">
          <option value="below">Pod textom</option>
          <option value="right">Vpravo (text vľavo)</option>
          <option value="left">Vľavo (text vpravo)</option>
        </select>
        <input type="text" class="proc-img-caption" placeholder="Popis obrázka (Obrázok N: …)">
      </div>
    </div>
    <div class="proc-step-section">
      <button type="button" class="proc-collapse-btn" onclick="toggleStepSection(this)">
        <span class="proc-collapse-caret">▸</span> ⚠️ Upozornenia <span class="proc-collapse-count" id="${sid}_warnc"></span>
      </button>
      <div class="proc-icon-pick proc-collapsible hidden" id="${sid}_warn"></div>
    </div>
    <div class="proc-step-section">
      <button type="button" class="proc-collapse-btn" onclick="toggleStepSection(this)">
        <span class="proc-collapse-caret">▸</span> 🦺 Ochranné pracovné pomôcky <span class="proc-collapse-count" id="${sid}_ppec"></span>
      </button>
      <div class="proc-icon-pick proc-collapsible hidden" id="${sid}_ppe"></div>
    </div>`;
  c.appendChild(card);

  stepEditors[sid] = mountStepEditor(card.querySelector('.proc-step-editor'), step.text || '');

  card.querySelector('.proc-img-pos').value = step.imagePos || 'below';
  card.querySelector('.proc-img-caption').value = step.caption || '';
  renderStepThumb(card);
  enableFileDrop(card.querySelector('.proc-step-img'), (files) =>
    dropImagesTo(files, (url) => { card._image = url; renderStepThumb(card); }));
  renderIconPicker(document.getElementById(sid + '_warn'), PROC_META.warnings, card._warnings, document.getElementById(sid + '_warnc'));
  renderIconPicker(document.getElementById(sid + '_ppe'),  PROC_META.ppe,      card._ppe,      document.getElementById(sid + '_ppec'));
  return card;
}

// Načítaj dáta operácie z karty
function stepDataFromCard(card) {
  const ed = stepEditors[card.dataset.sid];
  return {
    text:     ed ? ed.getHTML() : '',
    note:     card.querySelector('.proc-step-note').value.trim(),
    image:    card._image || '',
    imagePos: card.querySelector('.proc-img-pos')?.value || 'below',
    caption:  card.querySelector('.proc-img-caption')?.value.trim() || '',
    warnings: [...(card._warnings || [])],
    ppe:      [...(card._ppe || [])]
  };
}

// Duplikuj operáciu — vloží kópiu hneď za pôvodnú
function duplicateStep(btn) {
  const src = btn.closest('.proc-step-card');
  if (!src) return;
  const data = stepDataFromCard(src);
  const newCard = addStepRow(data);   // appendne na koniec
  if (newCard && src.nextSibling) src.parentNode.insertBefore(newCard, src.nextSibling);
  else if (newCard) src.parentNode.appendChild(newCard);
}

function toggleStepSection(btn) {
  const pick = btn.parentNode.querySelector('.proc-collapsible');
  if (!pick) return;
  const hidden = pick.classList.toggle('hidden');
  const caret = btn.querySelector('.proc-collapse-caret');
  if (caret) caret.textContent = hidden ? '▸' : '▾';
}

function collectSteps() {
  return [...document.querySelectorAll('#prStepsRows .proc-step-card')].map(card => {
    const ed = stepEditors[card.dataset.sid];
    return {
      text:     ed ? ed.getHTML() : '',
      note:     card.querySelector('.proc-step-note').value.trim(),
      image:    card._image || '',
      imagePos: card.querySelector('.proc-img-pos')?.value || 'below',
      caption:  card.querySelector('.proc-img-caption')?.value.trim() || '',
      warnings: card._warnings || [],
      ppe:      card._ppe || []
    };
  }).filter(s => stripHtmlText(s.text) || s.image || s.note || (s.warnings && s.warnings.length) || (s.ppe && s.ppe.length));
}

function collectProcedureForm() {
  const tools = [...document.querySelectorAll('#prToolsRows .proc-row')].map(r => ({
    name: r.querySelector('.proc-tool-name').value.trim(),
    note: r.querySelector('.proc-tool-note').value.trim()
  })).filter(t => t.name);
  const attachments = [...document.querySelectorAll('#prAttRows .proc-row')].map(r => ({
    label: r.querySelector('.proc-att-label').value.trim(),
    url:   r.querySelector('.proc-att-url').value.trim()
  })).filter(a => a.label || a.url);
  const risks = document.getElementById('prRisks').value.split('\n').map(s => s.trim()).filter(Boolean);
  return {
    title:      document.getElementById('prTitle').value.trim(),
    department: document.getElementById('prDepartment').value.trim(),
    author:     document.getElementById('prAuthor').value.trim(),
    date:       document.getElementById('prDate').value || undefined,
    purpose:    document.getElementById('prPurpose').value.trim(),
    status:     document.querySelector('input[name="prStatus"]:checked')?.value || 'active',
    tools, steps: collectSteps(), risks, attachments
  };
}

// ── Editor (plnostránkový) ────────────────────────────────────────────────────
async function openProcedureById(id) {
  let p = proceduresData.find(x => x._id === id) || null;
  try { const fresh = await fetch('/api/procedures/' + id).then(r => r.json()); if (fresh && !fresh.error) p = fresh; } catch {}
  if (!p) { alert('Postup sa nepodarilo načítať'); return; }
  openProcedureModal(p);
}

async function openProcedureModal(proc = null) {
  await loadProcMeta();
  const isEdit = proc && typeof proc === 'object';
  document.getElementById('procModalTitle').textContent = isEdit ? 'Upraviť postup' : 'Nový postup';
  document.getElementById('prId').value         = isEdit ? proc._id : '';
  document.getElementById('prTitle').value      = isEdit ? (proc.title || '') : '';
  document.getElementById('prDepartment').value = isEdit ? (proc.department || '') : '';
  document.getElementById('prAuthor').value     = isEdit ? (proc.author || '') : '';
  document.getElementById('prDate').value       = isEdit && proc.date ? String(proc.date).slice(0, 10) : calYmd(new Date());
  document.getElementById('prPurpose').value    = isEdit ? (proc.purpose || '') : '';
  document.getElementById('prRisks').value      = isEdit ? (proc.risks || []).join('\n') : '';
  const statusVal = isEdit ? (proc.status || 'active') : 'active';
  const statusRadio = document.querySelector(`input[name="prStatus"][value="${statusVal}"]`);
  if (statusRadio) statusRadio.checked = true;
  document.getElementById('prDeleteBtn').style.display = isEdit ? '' : 'none';

  // Reset dynamických častí
  destroyAllStepEditors();
  document.getElementById('prToolsRows').innerHTML = '';
  document.getElementById('prStepsRows').innerHTML = '';
  document.getElementById('prAttRows').innerHTML   = '';
  const tools = (isEdit && proc.tools && proc.tools.length) ? proc.tools : [{}];
  const steps = (isEdit && proc.steps && proc.steps.length) ? proc.steps : [{}];
  const atts  = (isEdit && proc.attachments && proc.attachments.length) ? proc.attachments : [];
  tools.forEach(addToolRow);
  steps.forEach(addStepRow);
  atts.forEach(addAttachmentRow);

  // Plnostránkový editor
  document.getElementById('procListView').classList.add('hidden');
  const det = document.getElementById('procDetail');
  if (det) det.classList.add('hidden');
  document.getElementById('procEditView').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function closeProcedureModal() {
  document.getElementById('procEditView').classList.add('hidden');
  document.getElementById('procListView').classList.remove('hidden');
}

async function saveProcedure() {
  const body = collectProcedureForm();
  if (!body.title) { alert('Zadajte názov postupu'); return; }

  const id = document.getElementById('prId').value;
  try {
    const endpoint = id ? '/api/procedures/' + id : '/api/procedures';
    const method   = id ? 'PUT' : 'POST';
    const resp = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      alert('Chyba ' + resp.status + ': ' + (err.error || 'Neznáma chyba'));
      return;
    }
    closeProcedureModal();
    loadProcedures();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function deleteProcedure(id) {
  if (!id) return;
  if (!await uiConfirm('Naozaj odstrániť tento postup?')) return;
  try {
    await fetch('/api/procedures/' + id, { method: 'DELETE' });
    closeProcedureModal();
    loadProcedures();
  } catch { alert('Chyba pri odstraňovaní'); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  NÁVODY (Guides) — dokumenty s revíziami, rich-text obsah, Word export
// ══════════════════════════════════════════════════════════════════════════════
let guidesData = [];
let guideEditor = null;       // SylexEditor handle pre hlavný obsah
let currentGuide = null;      // práve otvorený návod (vrátane revisions[])

async function loadGuides() {
  backToGuideList();
  const list = document.getElementById('guideList');
  if (list) list.innerHTML = '<div class="admin-loading">Načítavam…</div>';
  try {
    const r = await fetch('/api/guides');
    guidesData = await r.json();
    if (!Array.isArray(guidesData)) guidesData = [];
  } catch { guidesData = []; }
  renderGuides();
}

function backToGuideList() {
  document.getElementById('guideEditView')?.classList.add('hidden');
  document.getElementById('guideListView')?.classList.remove('hidden');
}

function renderGuides() {
  const list = document.getElementById('guideList');
  if (!list) return;
  const q = (document.getElementById('guideSearch')?.value || '').toLowerCase();
  const items = guidesData.filter(g =>
    !q || (g.title || '').toLowerCase().includes(q) ||
    (g.category || '').toLowerCase().includes(q) ||
    (g.author || '').toLowerCase().includes(q)
  );
  if (items.length === 0) {
    list.innerHTML = guidesData.length === 0
      ? '<div class="proc-empty">Zatiaľ žiadne návody.<div class="proc-empty-actions"><button class="btn-primary" onclick="openGuideModal()">+ Vytvoriť prvý návod</button></div></div>'
      : '<div class="proc-empty">Žiadne výsledky pre zadané hľadanie.</div>';
    return;
  }
  list.innerHTML = '';
  items.forEach(g => {
    const revCount = g.revCount != null ? g.revCount : (g.revisions || []).length;
    const card = document.createElement('div');
    card.className = 'proc-card';
    card.innerHTML = `
      <div class="proc-card-main" onclick="openGuideById('${g._id}')">
        <div class="proc-card-top">
          <span class="proc-card-title">${escHtml(g.title)}</span>
          <span class="guide-rev-chip">r${g.rev || 1}</span>
          <span class="proc-status-badge proc-status-${g.status}">${PROC_STATUS[g.status] || g.status}</span>
        </div>
        <div class="proc-card-meta">
          ${g.category ? `<span>🗂️ ${escHtml(g.category)}</span>` : ''}
          ${g.author ? `<span>👤 ${escHtml(g.author)}</span>` : ''}
          <span>🏷 ${revCount} ${revCount === 1 ? 'revízia' : (revCount >= 2 && revCount <= 4 ? 'revízie' : 'revízií')}</span>
          <span>🕒 ${fmtDate(g.updatedAt)}</span>
        </div>
      </div>
      <div class="proc-card-actions">
        <button class="btn-word" onclick="generateGuideWord('${g._id}')" title="Stiahnuť ako Word">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Word
        </button>
        <button class="admin-icon-btn" onclick="openGuideById('${g._id}')" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteGuide('${g._id}')" title="Odstrániť">✕</button>
      </div>`;
    list.appendChild(card);
  });
}

function generateGuideWord(id) { window.location.href = `/api/guides/${id}/docx` + tokenQS(); }

async function openGuideById(id) {
  let g = null;
  try { g = await fetch('/api/guides/' + id).then(r => r.json()); } catch {}
  if (!g || g.error) { alert('Návod sa nepodarilo načítať'); return; }
  openGuideModal(g);
}

function addGuideAttRow(att = {}) {
  const c = document.getElementById('gdAttRows');
  const row = document.createElement('div');
  row.className = 'proc-row';
  row.innerHTML = `
    <input type="text" class="gd-att-label" placeholder="Popis" value="${escHtml(att.label || '')}">
    <input type="text" class="gd-att-url" placeholder="Odkaz / cesta" value="${escHtml(att.url || '')}">
    <button type="button" class="proc-row-del" onclick="procRemoveRow(this)" title="Odstrániť">✕</button>`;
  c.appendChild(row);
}

function openGuideModal(guide = null) {
  const isEdit = guide && typeof guide === 'object';
  currentGuide = isEdit ? guide : null;
  document.getElementById('guideModalTitle').textContent = isEdit ? 'Upraviť návod' : 'Nový návod';
  document.getElementById('gdId').value       = isEdit ? guide._id : '';
  document.getElementById('gdTitle').value    = isEdit ? (guide.title || '') : '';
  document.getElementById('gdCategory').value = isEdit ? (guide.category || '') : '';
  document.getElementById('gdAuthor').value   = isEdit ? (guide.author || '') : (CURRENT_USER ? (CURRENT_USER.name || CURRENT_USER.username || '') : '');
  document.getElementById('gdDate').value     = isEdit && guide.date ? String(guide.date).slice(0, 10) : calYmd(new Date());
  document.getElementById('gdSummary').value  = isEdit ? (guide.summary || '') : '';
  const statusVal = isEdit ? (guide.status || 'active') : 'active';
  const sr = document.querySelector(`input[name="gdStatus"][value="${statusVal}"]`); if (sr) sr.checked = true;

  document.getElementById('guideDeleteBtn').style.display = isEdit ? '' : 'none';
  document.getElementById('guideRevBtn').style.display = isEdit ? '' : 'none';
  const chip = document.getElementById('guideRevChip');
  if (chip) { chip.style.display = isEdit ? '' : 'none'; chip.textContent = isEdit ? ('r' + (guide.rev || 1)) : ''; }

  // Prílohy
  document.getElementById('gdAttRows').innerHTML = '';
  ((isEdit && guide.attachments) || []).forEach(addGuideAttRow);

  // Hlavný rich-text editor
  if (guideEditor) { try { guideEditor.destroy(); } catch (_) {} guideEditor = null; }
  const edEl = document.getElementById('gdContentEditor');
  edEl.innerHTML = '';
  guideEditor = mountStepEditor(edEl, isEdit ? (guide.content || '') : '');

  renderGuideRevisions();

  document.getElementById('guideListView').classList.add('hidden');
  document.getElementById('guideEditView').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function closeGuideModal() {
  if (guideEditor) { try { guideEditor.destroy(); } catch (_) {} guideEditor = null; }
  document.getElementById('guideEditView').classList.add('hidden');
  document.getElementById('guideListView').classList.remove('hidden');
  currentGuide = null;
}

function collectGuideForm() {
  const atts = [...document.querySelectorAll('#gdAttRows .proc-row')].map(r => ({
    label: r.querySelector('.gd-att-label').value.trim(),
    url:   r.querySelector('.gd-att-url').value.trim()
  })).filter(a => a.label || a.url);
  return {
    title:    document.getElementById('gdTitle').value.trim(),
    category: document.getElementById('gdCategory').value.trim(),
    author:   document.getElementById('gdAuthor').value.trim(),
    date:     document.getElementById('gdDate').value || null,
    summary:  document.getElementById('gdSummary').value.trim(),
    content:  guideEditor ? guideEditor.getHTML() : '',
    status:   (document.querySelector('input[name="gdStatus"]:checked') || {}).value || 'active',
    attachments: atts
  };
}

async function saveGuide() {
  const body = collectGuideForm();
  if (!body.title) { alert('Zadajte názov návodu'); return; }
  const id = document.getElementById('gdId').value;
  try {
    const endpoint = id ? '/api/guides/' + id : '/api/guides';
    const method   = id ? 'PUT' : 'POST';
    const resp = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); alert('Chyba ' + resp.status + ': ' + (e.error || '')); return; }
    const saved = await resp.json();
    // Ostaň v editore (aby šlo hneď vytvoriť revíziu), len obnov stav
    currentGuide = saved;
    document.getElementById('gdId').value = saved._id;
    document.getElementById('guideDeleteBtn').style.display = '';
    document.getElementById('guideRevBtn').style.display = '';
    const chip = document.getElementById('guideRevChip');
    if (chip) { chip.style.display = ''; chip.textContent = 'r' + (saved.rev || 1); }
    document.getElementById('guideModalTitle').textContent = 'Upraviť návod';
    renderGuideRevisions();
    // Aktualizuj zoznam na pozadí
    loadGuidesSilent();
    toastGuide('Uložené ✓');
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function loadGuidesSilent() {
  try { const r = await fetch('/api/guides'); const d = await r.json(); if (Array.isArray(d)) guidesData = d; } catch {}
}

async function createGuideRevision() {
  const id = document.getElementById('gdId').value;
  const body = collectGuideForm();
  if (!body.title) { alert('Najprv zadajte názov a uložte návod'); return; }
  if (!id) { alert('Najprv uložte návod (vznikne revízia r1), potom môžete pridávať ďalšie.'); return; }
  const note = window.prompt('Popis zmeny pre novú revíziu (changelog):', '');
  if (note === null) return;
  try {
    const resp = await fetch('/api/guides/' + id + '/revisions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, note })
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); alert('Chyba: ' + (e.error || resp.status)); return; }
    currentGuide = await resp.json();
    const chip = document.getElementById('guideRevChip');
    if (chip) chip.textContent = 'r' + (currentGuide.rev || 1);
    renderGuideRevisions();
    loadGuidesSilent();
    toastGuide('Revízia r' + currentGuide.rev + ' vytvorená ✓');
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

function renderGuideRevisions() {
  const el = document.getElementById('gdRevList');
  if (!el) return;
  const id = document.getElementById('gdId').value;
  const revs = (currentGuide && currentGuide.revisions) ? currentGuide.revisions.slice().sort((a, b) => b.rev - a.rev) : [];
  if (!id) { el.innerHTML = '<div class="guide-rev-empty">Uložením návodu vznikne prvá revízia (r1).</div>'; return; }
  if (!revs.length) { el.innerHTML = '<div class="guide-rev-empty">Žiadne revízie. Klikni „+ Nová".</div>'; return; }
  const curRev = currentGuide.rev || revs[0].rev;
  el.innerHTML = revs.map(r => `
    <div class="guide-rev-item${r.rev === curRev ? ' current' : ''}">
      <div class="guide-rev-item-top">
        <span class="guide-rev-tag">r${r.rev}</span>
        <span class="guide-rev-date">${fmtDate(r.date)}</span>
      </div>
      ${r.note ? `<div class="guide-rev-msg">${escHtml(r.note)}</div>` : ''}
      ${r.author ? `<div class="guide-rev-auth">👤 ${escHtml(r.author)}</div>` : ''}
      <div class="guide-rev-actions">
        <button class="btn-xs" onclick="viewGuideRevision(${r.rev})" title="Zobraziť">👁</button>
        <button class="btn-xs" onclick="generateGuideRevWord('${id}', ${r.rev})" title="Word">📄</button>
        <button class="btn-xs" onclick="restoreGuideRevision(${r.rev})" title="Obnoviť do editora">↩ Obnoviť</button>
      </div>
    </div>`).join('');
}

function generateGuideRevWord(id, rev) { window.location.href = `/api/guides/${id}/revisions/${rev}/docx` + tokenQS(); }

function viewGuideRevision(rev) {
  const r = (currentGuide.revisions || []).find(x => x.rev === rev);
  if (!r) return;
  document.getElementById('guidePreviewTitle').textContent = `👁 Revízia r${rev} — ${currentGuide.title || ''}`;
  document.getElementById('guidePreviewBody').innerHTML = buildGuideDetailHtml({
    ...currentGuide, title: r.title || currentGuide.title, summary: r.summary, content: r.content, rev: r.rev, date: r.date
  });
  const foot = document.getElementById('guidePreviewFoot');
  foot.innerHTML = `<button class="btn-secondary" onclick="closeGuidePreview()">Zavrieť</button>
    <button class="btn-sm" onclick="generateGuideRevWord('${currentGuide._id}', ${rev})">📄 Word</button>
    <button class="btn-primary" onclick="restoreGuideRevision(${rev}); closeGuidePreview();">↩ Obnoviť túto revíziu</button>`;
  document.getElementById('guidePreviewModal').classList.remove('hidden');
}

async function restoreGuideRevision(rev) {
  const id = document.getElementById('gdId').value;
  if (!id) return;
  if (!await uiConfirm(`Obnoviť obsah z revízie r${rev} do editora? Aktuálne neuložené zmeny sa prepíšu (vytvorenie revízie ostáva zachované).`)) return;
  try {
    const resp = await fetch(`/api/guides/${id}/restore/${rev}`, { method: 'POST' });
    if (!resp.ok) { alert('Obnova zlyhala'); return; }
    currentGuide = await resp.json();
    // Naplň editor obnoveným obsahom
    document.getElementById('gdTitle').value = currentGuide.title || '';
    document.getElementById('gdSummary').value = currentGuide.summary || '';
    if (guideEditor && guideEditor.setHTML) guideEditor.setHTML(currentGuide.content || '');
    renderGuideRevisions();
    loadGuidesSilent();
    toastGuide('Obnovené z r' + rev + ' ✓');
  } catch (e) { alert('Chyba: ' + e.message); }
}

async function deleteGuide(id) {
  if (!id) return;
  if (!await uiConfirm('Naozaj odstrániť tento návod vrátane všetkých revízií?')) return;
  try {
    await fetch('/api/guides/' + id, { method: 'DELETE' });
    closeGuideModal();
    loadGuides();
  } catch { alert('Chyba pri odstraňovaní'); }
}

// ── Náhľad / detail (read-only HTML) ──────────────────────────────────────────
function buildGuideDetailHtml(g) {
  const meta = [];
  if (g.category) meta.push(`<span>🗂️ ${escHtml(g.category)}</span>`);
  if (g.author)   meta.push(`<span>👤 ${escHtml(g.author)}</span>`);
  meta.push(`<span>🏷 r${g.rev || 1}</span>`);
  if (g.date)     meta.push(`<span>📅 ${fmtDate(g.date)}</span>`);
  const atts = (g.attachments || []).filter(a => a.label || a.url);
  return `
    <div class="proc-detail-head">
      <h1 class="proc-detail-title">${escHtml(g.title || '')}</h1>
      <div class="proc-detail-meta">${meta.join('')}</div>
      ${g.summary ? `<p class="guide-detail-summary">${escHtml(g.summary)}</p>` : ''}
    </div>
    <div class="guide-detail-content">${g.content || '<p style="opacity:.5">— bez obsahu —</p>'}</div>
    ${atts.length ? `<div class="proc-detail-sec"><h3>Prílohy / Odkazy</h3><ul>${atts.map(a => `<li>${escHtml(a.label || a.url)}${a.label && a.url ? ` — <span style="opacity:.6">${escHtml(a.url)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}`;
}

function openGuidePreview() {
  const g = collectGuideForm();
  g.rev = currentGuide ? currentGuide.rev : 1;
  document.getElementById('guidePreviewTitle').textContent = '👁 Náhľad návodu';
  document.getElementById('guidePreviewBody').innerHTML = buildGuideDetailHtml(g);
  document.getElementById('guidePreviewFoot').innerHTML = '<button class="btn-secondary" onclick="closeGuidePreview()">Zavrieť</button>';
  document.getElementById('guidePreviewModal').classList.remove('hidden');
}
function closeGuidePreview() { document.getElementById('guidePreviewModal').classList.add('hidden'); }

function toastGuide(msg) {
  let t = document.getElementById('guideToast');
  if (!t) { t = document.createElement('div'); t.id = 'guideToast'; t.className = 'guide-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1900);
}

// ==============================
// ADMIN
// ==============================
let adminCurrentTab = 'links';

function switchAdminTab(tab) {
  adminCurrentTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  document.querySelectorAll('.admin-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'adminTab-' + tab)
  );
  if (tab === 'links')  loadAdminLinks();
  if (tab === 'sensor') { loadSensorConfigAdmin(); loadSensorStats(); }
  if (tab === 'users') loadUsers();
  if (tab === 'appearance') renderAppearanceAdmin();
}

// ── Header links management ──────────────────────────────────────────────
async function loadAdminLinks() {
  const container = document.getElementById('adminLinksList');
  if (!container) return;
  container.innerHTML = '<div class="admin-loading">Načítavam…</div>';
  try {
    const r = await fetch('/api/admin/links');
    const links = await r.json();
    container.innerHTML = '';
    if (links.length === 0) {
      container.innerHTML = '<div class="admin-loading">Žiadne linky. Pridajte prvý pomocou tlačidla vyššie.</div>';
      return;
    }
    links.forEach((l, idx) => {
      const item = document.createElement('div');
      item.className = 'admin-link-item' + (l.active ? '' : ' admin-link-inactive');
      item.dataset.id = l._id;
      const colorClass = 'ql-chip ql-' + (l.color || 'sp');
      item.innerHTML = `
        <div class="admin-link-handle" title="Poradie">
          <span>⠿</span>
        </div>
        <span class="${colorClass} admin-link-chip">${escHtml(l.label)}</span>
        <div class="admin-link-info">
          <div class="admin-link-label">${escHtml(l.label)}</div>
          <div class="admin-link-url">${escHtml(l.url)}</div>
        </div>
        <div class="admin-link-actions">
          <button class="admin-icon-btn" onclick="moveLinkUp('${l._id}')" title="Nahor">↑</button>
          <button class="admin-icon-btn" onclick="moveLinkDown('${l._id}')" title="Nadol">↓</button>
          <button class="admin-icon-btn" onclick="openLinkModal(${JSON.stringify(l).replace(/"/g,'&quot;')})" title="Upraviť">✎</button>
          <button class="admin-icon-btn danger" onclick="deleteLink('${l._id}')" title="Odstrániť">✕</button>
        </div>`;
      container.appendChild(item);
    });
  } catch (e) {
    container.innerHTML = '<div class="admin-loading">Chyba pri načítaní.</div>';
  }
}

function openLinkModal(link) {
  const isEdit = link && typeof link === 'object';
  document.getElementById('linkModalTitle').textContent = isEdit ? 'Upraviť link' : 'Nový link';
  document.getElementById('lmId').value       = isEdit ? link._id        : '';
  document.getElementById('lmLabel').value    = isEdit ? link.label      : '';
  document.getElementById('lmUrl').value      = isEdit ? link.url        : '';
  document.getElementById('lmColor').value    = isEdit ? (link.color || 'sp') : 'sp';
  document.getElementById('lmGroup').value    = isEdit ? (link.group || 'sharepoint') : 'sharepoint';
  document.getElementById('lmHasDot').checked = isEdit ? !!link.hasDot   : false;
  document.getElementById('lmActive').checked = isEdit ? !!link.active   : true;
  document.getElementById('lmPinned').checked = isEdit ? !!link.pinned   : false;
  document.getElementById('lmHasCred').checked = isEdit ? !!link.hasCredential : false;
  document.getElementById('lmCredKey').value  = isEdit ? (link.credentialKey || '') : '';
  document.getElementById('lmCredKeyWrap').style.display = (isEdit && link.hasCredential) ? '' : 'none';
  document.getElementById('linkModal').classList.remove('hidden');
}

function closeLinkModal() {
  document.getElementById('linkModal').classList.add('hidden');
}

function toggleCredKey() {
  const show = document.getElementById('lmHasCred').checked;
  document.getElementById('lmCredKeyWrap').style.display = show ? '' : 'none';
}

async function saveLink() {
  const label = document.getElementById('lmLabel').value.trim();
  const url   = document.getElementById('lmUrl').value.trim();
  if (!label || !url) { alert('Zadajte popis a URL'); return; }

  const id = document.getElementById('lmId').value;
  const body = {
    label, url,
    color:         document.getElementById('lmColor').value,
    group:         document.getElementById('lmGroup').value,
    hasDot:        document.getElementById('lmHasDot').checked,
    active:        document.getElementById('lmActive').checked,
    pinned:        document.getElementById('lmPinned').checked,
    hasCredential: document.getElementById('lmHasCred').checked,
    credentialKey: document.getElementById('lmCredKey').value.trim()
  };

  try {
    const endpoint = id ? '/api/admin/links/' + id : '/api/admin/links';
    const method   = id ? 'PUT' : 'POST';
    const resp = await fetch(endpoint, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      alert('Chyba ' + resp.status + ': ' + (err.error || 'Neznáma chyba servera'));
      return;
    }
    closeLinkModal();
    loadAdminLinks();
    loadHeaderLinks();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function resetDefaultLinks() {
  if (!await uiConfirm('Toto VYMAŽE všetky existujúce linky a nahradí ich predvolenými (DBFOS, ISYS, PEAKLOGGER, Dochádzka, Obedy, Obedy Fantozzi, SharePoint linky). Pokračovať?')) return;
  try {
    const resp = await fetch('/api/admin/links/reset-defaults', { method: 'POST' });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      alert('Chyba: ' + (e.error || resp.status));
      return;
    }
    const d = await resp.json();
    loadAdminLinks();
    loadHeaderLinks();
    alert(`✓ Predvolené linky obnovené (${d.count} linkov).`);
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function deleteLink(id) {
  if (!await uiConfirm('Naozaj odstrániť tento link?')) return;
  try {
    await fetch('/api/admin/links/' + id, { method: 'DELETE' });
    loadAdminLinks();
    loadHeaderLinks();
  } catch { alert('Chyba pri odstraňovaní'); }
}

async function moveLinkUp(id) {
  await _shiftLink(id, -1);
}
async function moveLinkDown(id) {
  await _shiftLink(id, 1);
}

async function _shiftLink(id, direction) {
  try {
    const r = await fetch('/api/admin/links');
    const links = await r.json();
    const idx = links.findIndex(l => l._id === id);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= links.length) return;
    // Swap orders
    const updates = [
      { _id: links[idx]._id,     order: links[swapIdx].order },
      { _id: links[swapIdx]._id, order: links[idx].order }
    ];
    await fetch('/api/admin/links/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    loadAdminLinks();
    loadHeaderLinks();
  } catch { alert('Chyba pri zmene poradia'); }
}

// ── Sensor config ─────────────────────────────────────────────────────────
async function loadSensorConfigAdmin() {
  try {
    const r = await fetch('/api/admin/config');
    const cfg = await r.json();
    const get = key => cfg.find(c => c.key === key)?.value ?? '';
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('cfgSensorIp',       get('sensor.ip'));
    setVal('cfgSensorPath',     get('sensor.path'));
    setVal('cfgSensorInterval', get('sensor.interval'));
    setVal('cfgSensorCh1',      get('sensor.ch1'));
    setVal('cfgSensorCh2',      get('sensor.ch2'));
  } catch { console.error('loadSensorConfigAdmin error'); }
}

async function saveSensorConfig() {
  const entries = [
    { key: 'sensor.ip',       value: document.getElementById('cfgSensorIp')?.value.trim() },
    { key: 'sensor.path',     value: document.getElementById('cfgSensorPath')?.value.trim() },
    { key: 'sensor.interval', value: Number(document.getElementById('cfgSensorInterval')?.value) },
    { key: 'sensor.ch1',      value: document.getElementById('cfgSensorCh1')?.value.trim() },
    { key: 'sensor.ch2',      value: document.getElementById('cfgSensorCh2')?.value.trim() },
  ].filter(e => e.value !== '' && e.value !== undefined);

  try {
    await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entries) });
    alert('Nastavenia senzora uložené.');
    loadSensorStats();
  } catch { alert('Chyba pri ukladaní'); }
}

async function loadSensorStats() {
  try {
    const r = await fetch('/api/admin/sensor/stats');
    const s = await r.json();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('statTotal',  s.total ?? '—');
    set('statOldest', s.oldest ? new Date(s.oldest).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
    set('statNewest', s.newest ? new Date(s.newest).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  } catch { console.error('loadSensorStats error'); }
}

async function clearSensorHistory() {
  if (!await uiConfirm('Naozaj vymazať celú históriu senzorov? Táto akcia je nevratná.')) return;
  try {
    const r = await fetch('/api/admin/sensor/history', { method: 'DELETE' });
    const d = await r.json();
    alert(`Vymazaných ${d.deleted} záznamov.`);
    loadSensorStats();
  } catch { alert('Chyba pri mazaní histórie'); }
}

async function seedSampleData() {
  if (!await uiConfirm('Vložiť ukážkové dáta (Novinky, WIKI, Postupy)? Existujúce záznamy sa preskočia.')) return;
  const el = document.getElementById('seedResult');
  if (el) el.textContent = 'Vkladám…';
  try {
    const r = await fetch('/api/admin/seed-samples', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { if (el) el.textContent = 'Chyba: ' + (d.error || r.status); return; }
    if (el) el.innerHTML = `✓ Vložené — Novinky: <strong>${d.announcements}</strong>, kategórie: <strong>${d.categories}</strong>, WIKI: <strong>${d.products}</strong>, Postupy: <strong>${d.procedures}</strong>, Projekty: <strong>${d.projects ?? 0}</strong>, Kalibrácie: <strong>${d.instruments ?? 0}</strong>, Testy: <strong>${d.tests ?? 0}</strong>, Prototypy: <strong>${d.prototypes ?? 0}</strong>.`;
  } catch (e) { if (el) el.textContent = 'Sieťová chyba: ' + e.message; }
}

async function seedGuidesData() {
  const el = document.getElementById('seedGuidesResult');
  if (el) el.textContent = 'Importujem…';
  try {
    const r = await fetch('/api/admin/seed-guides', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { if (el) el.textContent = 'Chyba: ' + (d.error || r.status); return; }
    if (el) el.innerHTML = `✓ Hotovo — vložené: <strong>${d.inserted}</strong>, preskočené (už existujú): <strong>${d.skipped}</strong>.${d.titles && d.titles.length ? ' Nové: ' + d.titles.map(escHtml).join(', ') : ''}`;
  } catch (e) { if (el) el.textContent = 'Sieťová chyba: ' + e.message; }
}

// ==============================
// HLAVIČKA — vyhľadávanie, rýchle pridanie, notifikácie
// ==============================
function positionUnder(btn, el) {
  const rect = btn.getBoundingClientRect();
  el.style.top = (rect.bottom + 8) + 'px';
  el.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
  el.style.left = 'auto';
}
function closeHdrPopovers(except) {
  ['quickAddMenu', 'notifPanel'].forEach(id => { if (id !== except) document.getElementById(id)?.classList.add('hidden'); });
}

// ── Globálne vyhľadávanie (Ctrl+K) ────────────────────────────────────────────
let cmdCache = null;
async function loadCmdData() {
  const [prods, procs, anns, links] = await Promise.all([
    fetch('/api/products').then(r => r.json()).catch(() => []),
    fetch('/api/procedures').then(r => r.json()).catch(() => []),
    fetch('/api/announcements').then(r => r.json()).catch(() => []),
    fetch('/api/admin/links').then(r => r.json()).catch(() => []),
  ]);
  cmdCache = { prods, procs, anns, links };
  return cmdCache;
}
async function openCmdPalette() {
  const pal = document.getElementById('cmdPalette'); if (!pal) return;
  pal.classList.remove('hidden');
  const inp = document.getElementById('cmdInput'); inp.value = '';
  document.getElementById('cmdResults').innerHTML = '<div class="cmd-hint">Začni písať…</div>';
  await loadCmdData();
  setTimeout(() => inp.focus(), 30);
}
function closeCmdPalette() { document.getElementById('cmdPalette')?.classList.add('hidden'); }
function cmdMatch(s, q) { return (s || '').toLowerCase().includes(q); }
function cmdSearch(q) {
  q = (q || '').trim().toLowerCase();
  const el = document.getElementById('cmdResults'); if (!el) return;
  if (!cmdCache) { el.innerHTML = '<div class="cmd-hint">Načítavam…</div>'; return; }
  if (q.length < 1) { el.innerHTML = '<div class="cmd-hint">Začni písať…</div>'; return; }
  const res = [];
  (cmdCache.prods || []).filter(p => cmdMatch(p.name, q) || cmdMatch(p.model, q) || (p.tags || []).some(t => cmdMatch(t, q))).slice(0, 6)
    .forEach(p => res.push({ icon: '📚', label: p.name, sub: 'WIKI', act: () => { closeCmdPalette(); showPage('wiki'); setTimeout(() => openProduct(p._id), 220); } }));
  (cmdCache.procs || []).filter(p => cmdMatch(p.title, q) || cmdMatch(p.department, q) || cmdMatch(p.author, q)).slice(0, 6)
    .forEach(p => res.push({ icon: '📋', label: p.title, sub: 'Postup', act: () => { closeCmdPalette(); showPage('procedures'); setTimeout(() => openProcedureById(p._id), 250); } }));
  (cmdCache.anns || []).filter(a => cmdMatch(a.title, q) || cmdMatch(a.body, q)).slice(0, 5)
    .forEach(a => res.push({ icon: '📢', label: a.title, sub: 'Novinka', act: () => { closeCmdPalette(); showPage('home'); } }));
  (cmdCache.links || []).filter(l => l.active && (cmdMatch(l.label, q) || cmdMatch(l.url, q))).slice(0, 6)
    .forEach(l => res.push({ icon: '🔗', label: l.label, sub: 'Odkaz', act: () => { closeCmdPalette(); window.open(l.url, '_blank'); } }));
  if (!res.length) { el.innerHTML = `<div class="cmd-hint">Žiadne výsledky pre „${escHtml(q)}".</div>`; return; }
  el.innerHTML = '';
  res.forEach(r => {
    const d = document.createElement('div');
    d.className = 'cmd-item';
    d.innerHTML = `<span class="cmd-item-icon">${r.icon}</span><span class="cmd-item-label">${escHtml(r.label)}</span><span class="cmd-item-sub">${r.sub}</span>`;
    d.onclick = r.act;
    el.appendChild(d);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  FOS ASISTENT — vizuálny rule-based chatbot (bez externého LLM)
// ══════════════════════════════════════════════════════════════════════════════
let _botInit = false;

// Báza znalostí: k = kľúčové slová, a = HTML odpoveď, go = stránka na otvorenie (voliteľné)
const BOT_KB = [
  { k: ['ahoj', 'cau', 'cаo', 'hello', 'hi', 'zdravim', 'dobry den', 'cica'],
    a: 'Ahoj! 👋 Som <b>FOS Asistent</b>. Pomôžem ti zorientovať sa v dashboarde — opýtaj sa napr. „ako pridám postup?", „kde nájdem datasheet?" alebo „čo je vo Vývoji?".' },

  { k: ['co vies', 'co dokazes', 'help', 'pomoc', 'na co si', 'co robis', 'ako mi pomozes', 'funkcie'],
    a: 'Viem ťa naviesť po celom systéme. Hlavné moduly:<ul><li>📚 <b>WIKI FOS</b> — produkty a znalostná báza</li><li>📋 <b>Postupy</b> — pracovné postupy + export do Wordu</li><li>📅 <b>Kalendár</b> — udalosti, export do Excelu</li><li>✅ <b>Úlohy</b> — osobné úlohy</li><li>📧 <b>CRM</b> — kontakty a e-maily</li><li>🔬 <b>Vývoj</b> — projekty, testy, kalibrácie, FBG nástroje, interrogátory…</li><li>📈 <b>Management</b> — prehľad tímu</li></ul>Klikni na chip nižšie alebo napíš otázku.' },

  { k: ['wiki', 'znalost', 'produkt', 'senzor produkt', 'katalog', 'baza'],
    a: 'V <b>WIKI FOS</b> nájdeš produkty a znalostnú bázu FOS divízie. Otvoríš produkt kliknutím na kartu; vyhľadávať môžeš aj cez <code>Ctrl+K</code>.', go: 'wiki' },

  { k: ['postup', 'procedur', 'navod', 'pracovny postup', 'instrukcia', 'work instruction'],
    a: 'Modul <b>Postupy</b> obsahuje pracovné postupy s bohatým editorom (obrázky, výstrahy, PPE ikony). Nový postup pridáš tlačidlom <b>+ Nový postup</b>, hotový vieš <b>exportovať do Wordu</b> (s obsahom, obrázkami a krížovými odkazmi).', go: 'procedures' },

  { k: ['ako pridam postup', 'novy postup', 'vytvorit postup', 'pridat postup'],
    a: 'Pridanie postupu:<ul><li>Otvor modul <b>Postupy</b></li><li>Klikni <b>+ Nový postup</b></li><li>Vyplň názov, oddelenie a obsah v editore</li><li>Ulož — potom ho môžeš exportovať do Wordu</li></ul>', go: 'procedures' },

  { k: ['navod', 'navody', 'manual', 'guide', 'revizia', 'revizie', 'verzia dokumentu', 'changelog'],
    a: 'Modul <b>Návody</b> slúži na dokumenty s <b>revíziami</b> — rich-text obsah (formáty, farby, obrázky), história verzií a export do Wordu. Pri úprave klikni <b>🏷 Nová revízia</b> a vznikne milník, ku ktorému sa vieš vrátiť (Obnoviť). Každú revíziu vieš zobraziť aj stiahnuť ako Word.', go: 'guides' },

  { k: ['kalendar', 'udalost', 'event', 'termin', 'stretnutie', 'porada'],
    a: 'V <b>Kalendári</b> spravuješ udalosti tímu. Klikni na deň pre novú udalosť. Celý kalendár vieš <b>exportovať do Excelu</b> tlačidlom v hlavičke modulu.', go: 'calendar' },

  { k: ['uloha', 'ulohy', 'task', 'todo', 'to do', 'co mam robit', 'moje ulohy'],
    a: 'Modul <b>Úlohy</b> je tvoj osobný zoznam úloh — pridávaj, označuj ako hotové a sleduj stav. Manažér vidí súhrn úloh celého tímu v <b>Managemente</b>.', go: 'tasks' },

  { k: ['crm', 'kontakt', 'email', 'mail', 'zakaznik', 'klient', 'firma'],
    a: 'V <b>CRM</b> vedieš kontakty a e-mailovú komunikáciu. E-maily (<code>.eml</code>) vieš pridať jednoduchým <b>pretiahnutím</b> do okna (drag &amp; drop).', go: 'crm' },

  { k: ['vyvoj', 'dev', 'projekt', 'kanban', 'test', 'kalibracia', 'prototyp', 'r&d', 'rnd'],
    a: 'Sekcia <b>Vývoj</b> združuje R&amp;D nástroje:<ul><li>Projekty (kanban)</li><li>Testy &amp; Kalibrácie</li><li>Prototypy</li><li>Vlastníci PO/BO</li><li>Interrogátory S-line</li><li>Datasheety</li><li>FBG nástroje</li></ul>', go: 'dev' },

  { k: ['datasheet', 'datovy list', 'specifikacia', 'sc-01', 'sc01'],
    a: 'Datasheety nájdeš vo <b>Vývoji → Datasheety</b>. Každý datasheet vieš exportovať do <b>Wordu</b> s obrázkami a tabuľkami parametrov.', go: 'dev' },

  { k: ['interrogator', 'interogator', 's-line', 'sline', 'jednotka', 'oprava'],
    a: 'Register <b>Interrogátorov S-line</b> je vo Vývoji — evidujú sa kusy, ich stav a história opráv. Skladové počty vidno aj v <b>Managemente</b>.', go: 'dev' },

  { k: ['fbg', 'peak', 'vlnova dlzka', 'wavelength', 'strain', 'napatie', 'kalkulacka', 'wdm', 'koeficient', 'bragg'],
    a: 'FBG nástroje (vo Vývoji aj na samostatnej stránke <b>FBG</b>): vizualizácia spektra a posunu peaku, prepočet <b>vlnová dĺžka ↔ strain/teplota</b>, kalibračné koeficienty a <b>WDM plánovač</b> kanálov.', go: 'fbg' },

  { k: ['vytazenie', 'komora', 'komory', 'klimaticka', 'pec', 'pece', 'rezervacia', 'rezervovat', 'booking', 'obsadenost', 'kalendar komory', 'test bezi', 'gantt'],
    a: 'Modul <b>Vyťaženie technológií</b> je rezervačný kalendár (Gantt) pre <b>klimatické komory a pece</b>. Vidíš, čo a dokedy beží, koľko hodín zaberie test, ktoré objednávky sú kde a aké je % vyťaženie každého zariadenia. Klikni na riadok pre novú rezerváciu.', go: 'util' },

  { k: ['vyroba', 'planovanie vyroby', 'vyrobna zakazka', 'work order', 'production', 'zakazka', 'pracovisko', 'linka', 'kanban vyroba', 'expedicia'],
    a: 'Modul <b>Plánovanie výroby</b> spravuje <b>výrobné zákazky</b> cez fázy (Plánovaná → Príprava → Vo výrobe → Kontrola → Hotová → Expedovaná) na <b>Kanban tabuli s drag&amp;drop</b>. Sleduješ množstvá (plán/vyrobené), termíny, prioritu, vyťaženie pracovísk a KPI prehľad.', go: 'prod' },

  { k: ['management', 'manazer', 'prehlad', 'kto na com robi', 'dovolenka', 'vacation', 'summary', 'tim'],
    a: 'Modul <b>Management</b> ukazuje, kto na čom pracuje, stav úloh a projektov, sklad interrogátorov a <b>prehľad dovoleniek</b>. Nájdeš tu aj anonymné otázky tímu.', go: 'mgmt' },

  { k: ['anonym', 'otazka', 'spytat sa', 'anonymna otazka'],
    a: 'Anonymné otázky pošleš v module <b>Management</b> — autor sa neukladá, takže sa môžeš pýtať bez obáv. Odpovedať/mazať môže len admin.', go: 'mgmt' },

  { k: ['vyhladaj', 'vyhladavanie', 'hladat', 'search', 'najst', 'ctrl k', 'ctrl+k'],
    a: 'Rýchle vyhľadávanie otvoríš klávesovou skratkou <code>Ctrl+K</code> (alebo <code>Cmd+K</code>). Hľadá naprieč produktmi, postupmi, novinkami aj odkazmi. Skús aj sem napísať názov a vyhľadám to za teba.' },

  { k: ['admin', 'nastavenie', 'sprava', 'pouzivatel', 'user', 'heslo', 'odkazy', 'links'],
    a: 'V <b>Admin</b> sekcii (len pre adminov) sa spravujú používatelia, odkazy v hlavičke, senzory a systémové nástroje (napr. naplnenie ukážkových dát).', go: 'admin' },

  { k: ['prihlasenie', 'login', 'odhlasit', 'logout', 'heslo zabudol', 'prihlasit'],
    a: 'Do systému sa prihlasuješ menom a heslom. Odhlásiš sa cez menu používateľa vpravo hore. Zabudnuté heslo ti resetuje administrátor cez Admin → Používatelia.' },

  { k: ['pwa', 'mobil', 'aplikacia', 'android', 'install', 'instalovat', 'telefon', 'na plochu'],
    a: 'Dashboard je <b>PWA</b> — vieš si ho nainštalovať do telefónu: otvor v prehliadači, ponuka → <b>Pridať na plochu</b>. Funguje aj offline (základné dáta).' },

  { k: ['novinka', 'oznam', 'announcement', 'aktualita', 'news'],
    a: 'Novinky/oznamy tímu sa zobrazujú na <b>Domovskej stránke</b>. Nový oznam pridáš cez tlačidlo <b>+</b> v hlavičke → Novinka.', go: 'home' },

  { k: ['sprievodca', 'tour', 'preliadka', 'prehliadka', 'navod aplikacie'],
    a: 'Interaktívneho <b>Sprievodcu</b> spustíš tlačidlom <b>Pomoc</b> vľavo dole — krok za krokom ťa prevedie všetkými modulmi aj podstránkami.' },

  { k: ['teplota', 'vlhkost', 'thermo', 'klima', 'laborator klima'],
    a: 'Aktuálna <b>teplota a vlhkosť</b> z laboratória sa ukazuje v pravom dolnom rohu. Klikni na ikonu grafu pre detail v module <b>Senzory</b>.', go: 'sensors' },

  { k: ['vdaka', 'dakujem', 'super', 'diky', 'thanks', 'paradne'],
    a: 'Nie je za čo! 😊 Ak budeš ešte niečo potrebovať, som tu vpravo dole.' },
];

const BOT_CHIPS = [
  { t: 'Čo vieš?', q: 'co vies' },
  { t: '📋 Pridať postup', q: 'ako pridam postup' },
  { t: '🔬 Vývoj', q: 'vyvoj' },
  { t: '📈 Management', q: 'management' },
  { t: '🔍 Vyhľadávanie', q: 'vyhladavanie' },
  { t: '📱 Mobilná appka', q: 'pwa' },
];

function _botStrip(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // odstráň diakritiku
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toggleBot() {
  const panel = document.getElementById('botPanel');
  const fab = document.getElementById('botFab');
  if (!panel) return;
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if (fab) fab.style.display = opening ? 'none' : '';
  if (opening) {
    if (!_botInit) { _botInit = true; botGreet(); }
    setTimeout(() => document.getElementById('botInput')?.focus(), 80);
  }
}

function botGreet() {
  botAddMsg('bot', 'Ahoj! 👋 Som <b>FOS Asistent</b>. Spýtaj sa ma na čokoľvek o systéme — alebo klikni na jednu z možností nižšie.');
  botRenderChips();
}

function botRenderChips() {
  const el = document.getElementById('botChips'); if (!el) return;
  el.innerHTML = '';
  BOT_CHIPS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'bot-chip'; b.textContent = c.t;
    b.onclick = () => { botAddMsg('user', escHtml(c.t)); botRespond(c.q); };
    el.appendChild(b);
  });
}

function botAddMsg(who, html, actionHtml) {
  const box = document.getElementById('botMsgs'); if (!box) return null;
  const wrap = document.createElement('div');
  wrap.className = 'bot-msg ' + who;
  const av = who === 'bot' ? '<div class="bot-msg-av">🤖</div>' : '';
  wrap.innerHTML = `${av}<div class="bot-bubble">${html}${actionHtml || ''}</div>`;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
  return wrap;
}

function botTyping(on) {
  const box = document.getElementById('botMsgs'); if (!box) return;
  let t = document.getElementById('botTyping');
  if (on) {
    if (t) return;
    t = document.createElement('div');
    t.id = 'botTyping'; t.className = 'bot-msg bot';
    t.innerHTML = '<div class="bot-msg-av">🤖</div><div class="bot-bubble bot-typing"><span></span><span></span><span></span></div>';
    box.appendChild(t); box.scrollTop = box.scrollHeight;
  } else if (t) { t.remove(); }
}

function botSend() {
  const inp = document.getElementById('botInput'); if (!inp) return;
  const q = inp.value.trim(); if (!q) return;
  inp.value = '';
  botAddMsg('user', escHtml(q));
  botRespond(q);
}

function botRespond(q) {
  botTyping(true);
  setTimeout(() => {
    botTyping(false);
    const hit = botMatch(q);
    if (hit) {
      let action = '';
      if (hit.go) action = `<div><button class="bot-action" onclick="botGo('${hit.go}')">Otvoriť modul →</button></div>`;
      botAddMsg('bot', hit.a, action);
    } else {
      botSearchFallback(q);
    }
  }, 360 + Math.random() * 320);
}

function botMatch(q) {
  const s = _botStrip(q);
  if (!s) return null;
  const words = s.split(' ');
  let best = null, bestScore = 0;
  for (const item of BOT_KB) {
    let score = 0;
    for (const kw of item.k) {
      const ks = _botStrip(kw);
      if (!ks) continue;
      if (s.includes(ks)) { score += ks.includes(' ') ? 5 : 3; continue; }
      // čiastočná zhoda po slovách
      if (words.some(w => w.length > 2 && ks.split(' ').some(p => p.startsWith(w) || w.startsWith(p)))) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return bestScore >= 2 ? best : null;
}

async function botSearchFallback(q) {
  const s = _botStrip(q);
  try {
    if (!cmdCache) { botTyping(true); await loadCmdData(); botTyping(false); }
  } catch { /* ignore */ }
  const results = [];
  const m = (txt) => txt && _botStrip(txt).includes(s);
  (cmdCache?.prods || []).filter(p => m(p.name) || m(p.model)).slice(0, 4)
    .forEach(p => results.push({ icon: '📚', label: p.name, sub: 'WIKI', go: () => { showPage('wiki'); setTimeout(() => openProduct(p._id), 240); } }));
  (cmdCache?.procs || []).filter(p => m(p.title) || m(p.department)).slice(0, 4)
    .forEach(p => results.push({ icon: '📋', label: p.title, sub: 'Postup', go: () => { showPage('procedures'); setTimeout(() => openProcedureById(p._id), 260); } }));
  (cmdCache?.anns || []).filter(a => m(a.title)).slice(0, 3)
    .forEach(a => results.push({ icon: '📢', label: a.title, sub: 'Novinka', go: () => showPage('home') }));

  if (results.length) {
    botAddMsg('bot', `Našiel som <b>${results.length}</b> ${results.length === 1 ? 'výsledok' : 'výsledkov'} pre „${escHtml(q)}":`);
    const box = document.getElementById('botMsgs');
    const wrap = document.createElement('div');
    wrap.className = 'bot-msg bot';
    wrap.innerHTML = '<div class="bot-msg-av">🔍</div><div class="bot-bubble" id="botResWrap"></div>';
    box.appendChild(wrap);
    const rw = wrap.querySelector('#botResWrap');
    results.forEach((r, i) => {
      const btn = document.createElement('button');
      btn.className = 'bot-action'; btn.style.marginRight = '6px';
      btn.innerHTML = `${r.icon} ${escHtml(r.label)} <span style="opacity:.6">· ${r.sub}</span>`;
      btn.onclick = () => { r.go(); toggleBot(); };
      rw.appendChild(btn);
    });
    box.scrollTop = box.scrollHeight;
  } else {
    botAddMsg('bot', `Hmm, na „${escHtml(q)}" nemám priamu odpoveď. 🤔 Skús to inak, alebo klikni na niektorú z možností:`);
    botRenderChips();
  }
}

function botGo(page) {
  const panel = document.getElementById('botPanel');
  if (panel && !panel.classList.contains('hidden')) toggleBot();
  showPage(page);
}

// ── Rýchle pridanie (+) ───────────────────────────────────────────────────────
function toggleQuickAdd(e) {
  e.stopPropagation();
  const m = document.getElementById('quickAddMenu');
  closeHdrPopovers('quickAddMenu');
  positionUnder(e.currentTarget, m);
  m.classList.toggle('hidden');
}
function quickAdd(type) {
  document.getElementById('quickAddMenu').classList.add('hidden');
  if (type === 'news') openAnnouncementModal();
  else if (type === 'procedure') { showPage('procedures'); setTimeout(() => openProcedureModal(), 280); }
  else if (type === 'event') { showPage('calendar'); setTimeout(() => openEventModal(), 280); }
  else if (type === 'wiki') { showPage('wiki'); setTimeout(() => openProductModal(), 320); }
  else if (type === 'project') { showPage('dev'); setTimeout(() => { switchDevTab('projects'); openProjectModal(); }, 200); }
}

// ── Notifikácie (🔔) ──────────────────────────────────────────────────────────
let notifData = { newAnns: [], todayEvs: [] };
async function loadNotif() {
  try {
    const key = calYmd(new Date());
    const [anns, evs, instr, tasks] = await Promise.all([
      fetch('/api/announcements').then(r => r.json()).catch(() => []),
      fetch(`/api/calendar?from=${key}&to=${key}`).then(r => r.json()).catch(() => []),
      fetch('/api/instruments').then(r => r.json()).catch(() => []),
      fetch('/api/tasks').then(r => r.json()).catch(() => []),
    ]);
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const newAnns = (Array.isArray(anns) ? anns : []).filter(a => new Date(a.date || a.createdAt) >= weekAgo);
    const todayEvs = Array.isArray(evs) ? evs : [];
    // Kalibrácie po termíne alebo do 30 dní
    const calDue = (Array.isArray(instr) ? instr : []).filter(i => {
      if (!i.nextCalibration) return false;
      const days = Math.ceil((new Date(i.nextCalibration) - new Date()) / 864e5);
      return days <= 30;
    });
    // Nedokončené úlohy po termíne / dnes
    const todayEnd = new Date(new Date().toDateString()); todayEnd.setHours(23, 59, 59);
    const tasksDue = (Array.isArray(tasks) ? tasks : []).filter(t => !t.done && t.due && new Date(t.due) <= todayEnd);
    notifData = { newAnns, todayEvs, calDue, tasksDue };
    const count = newAnns.length + todayEvs.length + calDue.length + tasksDue.length;
    const b = document.getElementById('notifBadge');
    if (b) { b.textContent = count > 9 ? '9+' : count; b.classList.toggle('hidden', count === 0); }
  } catch (e) {}
}
function toggleNotif(e) {
  e.stopPropagation();
  const m = document.getElementById('notifPanel');
  closeHdrPopovers('notifPanel');
  positionUnder(e.currentTarget, m);
  renderNotif();
  m.classList.toggle('hidden');
}
function renderNotif() {
  const el = document.getElementById('notifList'); if (!el) return;
  let h = '';
  if (notifData.todayEvs.length) {
    h += '<div class="notif-group">Dnes v kalendári</div>';
    notifData.todayEvs.forEach(ev => { h += `<div class="notif-item" onclick="closeHdrPopovers();showPage('calendar')"><span>📅</span><span>${escHtml(ev.title)}${ev.time ? ' · ' + escHtml(ev.time) : ''}${ev.person ? ' · ' + escHtml(ev.person) : ''}</span></div>`; });
  }
  if ((notifData.tasksDue || []).length) {
    h += '<div class="notif-group">Úlohy — termín dnes / po termíne</div>';
    notifData.tasksDue.forEach(t => {
      const od = new Date(t.due) < new Date(new Date().toDateString());
      h += `<div class="notif-item" onclick="closeHdrPopovers();showPage('tasks')"><span>✅</span><span>${escHtml(t.title)}${od ? ' — po termíne' : ' — dnes'}</span></div>`;
    });
  }
  if ((notifData.calDue || []).length) {
    h += '<div class="notif-group">Kalibrácie (≤30 dní / po termíne)</div>';
    notifData.calDue.forEach(i => {
      const days = Math.ceil((new Date(i.nextCalibration) - new Date()) / 864e5);
      const lbl = days < 0 ? 'po termíne' : `o ${days} dní`;
      h += `<div class="notif-item" onclick="closeHdrPopovers();showPage('dev');setTimeout(()=>switchDevTab('instruments'),100)"><span>📐</span><span>${escHtml(i.name)} — ${lbl}</span></div>`;
    });
  }
  if (notifData.newAnns.length) {
    h += '<div class="notif-group">Nové novinky (7 dní)</div>';
    notifData.newAnns.slice(0, 6).forEach(a => { h += `<div class="notif-item" onclick="closeHdrPopovers();showPage('home')"><span>📢</span><span>${escHtml(a.title)}</span></div>`; });
  }
  if (!h) h = '<div class="cmd-hint" style="padding:14px">Žiadne nové notifikácie.</div>';
  el.innerHTML = h;
}

// Klávesové skratky + zatváranie hlavičkových popoverov
document.addEventListener('keydown', (e) => {
  // Štýlovaný confirm: Esc = zrušiť, Enter = potvrdiť
  const cm = document.getElementById('confirmModal');
  if (cm && !cm.classList.contains('hidden')) {
    if (e.key === 'Escape') { e.preventDefault(); _confirmDone(false); return; }
    if (e.key === 'Enter')  { e.preventDefault(); _confirmDone(true); return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdPalette(); }
  if (e.key === 'Escape') { closeCmdPalette(); closeHdrPopovers(); }
});

// ── Generický sortovač tabuliek (klik na hlavičku) — funguje na ľubovoľnej .sortable ──
document.addEventListener('click', (e) => {
  const th = e.target.closest('table.sortable th[data-sortable]');
  if (!th) return;
  const table = th.closest('table'), tbody = table.tBodies[0]; if (!tbody) return;
  const idx = [...th.parentElement.children].indexOf(th);
  const asc = !th.classList.contains('sort-asc');
  table.querySelectorAll('th').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
  th.classList.add(asc ? 'sort-asc' : 'sort-desc');
  const val = (row) => {
    const cell = row.children[idx]; if (!cell) return '';
    const raw = (cell.dataset.sort ?? cell.textContent).trim();
    const num = parseFloat(raw.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return { raw, num: isNaN(num) ? null : num };
  };
  [...tbody.rows].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va.num !== null && vb.num !== null) return asc ? va.num - vb.num : vb.num - va.num;
    return asc ? va.raw.localeCompare(vb.raw, 'sk') : vb.raw.localeCompare(va.raw, 'sk');
  }).forEach(r => tbody.appendChild(r));
});
document.addEventListener('click', () => closeHdrPopovers());

// ==============================
// VÝVOJ — Projekty / Testy / Kalibrácie / Prototypy
// ==============================
let devCurrentTab = 'projects';
function loadDev() { switchDevTab(devCurrentTab || 'projects'); }
function switchDevTab(tab) {
  devCurrentTab = tab;
  document.querySelectorAll('#page-dev .admin-tab').forEach(t => t.classList.toggle('active', t.dataset.dtab === tab));
  document.querySelectorAll('#page-dev .admin-panel').forEach(p => p.classList.toggle('active', p.id === 'devTab-' + tab));
  if (tab === 'projects') loadProjects();
  if (tab === 'tests') loadTests();
  if (tab === 'instruments') loadInstruments();
  if (tab === 'prototypes') loadPrototypes();
  if (tab === 'owners') loadOwners();
  if (tab === 'interrogators') loadInterrogators();
  if (tab === 'datasheets') loadDatasheets();
  if (tab === 'fbgtools') loadFbgTools();
}

// ==============================
// FBG NÁSTROJE — kalkulačka, koeficienty, WDM plánovač
// ==============================
let sensorTypesData = [];
const WDM_COLORS = ['#00d4ff', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#f97316', '#22d3ee', '#4ade80'];
let _wdmSeq = 0;

async function loadFbgTools() {
  try { sensorTypesData = await fetch('/api/sensor-types').then(r => r.json()); if (!Array.isArray(sensorTypesData)) sensorTypesData = []; }
  catch { sensorTypesData = []; }
  renderSensorTypes();
  // naplň dropdown kalkulačky
  const sel = document.getElementById('calcType');
  if (sel) sel.innerHTML = '<option value="">— vlastné —</option>' + sensorTypesData.map(t => `<option value="${t._id}">${escHtml(t.name)}</option>`).join('');
  // WDM — inicializuj ak prázdne
  if (!document.querySelectorAll('#wdmRows .proc-row').length) {
    addWdmRow({ name: 'FBG 1', l0: 1530, se: 1.2, eps: 2000 });
    addWdmRow({ name: 'FBG 2', l0: 1535, se: 1.2, eps: 2000 });
  }
  calcRun(); wdmCompute();
}

// ── Koeficienty (tabuľka + modal) ──
function renderSensorTypes() {
  const tb = document.getElementById('stBody'); if (!tb) return;
  if (!sensorTypesData.length) { tb.innerHTML = '<tr><td colspan="6" class="owners-empty">Žiadne typy. Pridaj typ senzora.</td></tr>'; return; }
  tb.innerHTML = '';
  sensorTypesData.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${escHtml(t.name)}</strong></td><td>${t.lambda0}</td><td>${t.sEps}</td><td>${t.sTemp}</td><td>±${t.rangeEps}</td>
      <td class="owner-actions"><button class="admin-icon-btn" onclick="openSensorTypeModal(sensorTypesData.find(x=>x._id==='${t._id}'))">✎</button>
      <button class="admin-icon-btn danger" onclick="deleteSensorType('${t._id}')">✕</button></td>`;
    tb.appendChild(tr);
  });
}
function openSensorTypeModal(t = null) {
  const e = t && typeof t === 'object';
  document.getElementById('stModalTitle').textContent = e ? 'Upraviť typ senzora' : 'Nový typ senzora';
  document.getElementById('stId').value = e ? t._id : '';
  document.getElementById('stName').value = e ? (t.name || '') : '';
  document.getElementById('stL0').value = e ? (t.lambda0 ?? 1550) : 1550;
  document.getElementById('stRange').value = e ? (t.rangeEps ?? 2500) : 2500;
  document.getElementById('stSe').value = e ? (t.sEps ?? 1.2) : 1.2;
  document.getElementById('stSt').value = e ? (t.sTemp ?? 10) : 10;
  document.getElementById('stNote').value = e ? (t.note || '') : '';
  document.getElementById('stDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('sensorTypeModal').classList.remove('hidden');
}
function closeSensorTypeModal() { document.getElementById('sensorTypeModal').classList.add('hidden'); }
async function saveSensorType() {
  const name = document.getElementById('stName').value.trim();
  if (!name) { alert('Zadaj názov typu'); return; }
  const body = { name, lambda0: +document.getElementById('stL0').value || 1550, rangeEps: +document.getElementById('stRange').value || 2500,
    sEps: +document.getElementById('stSe').value || 1.2, sTemp: +document.getElementById('stSt').value || 10, note: document.getElementById('stNote').value.trim() };
  const id = document.getElementById('stId').value;
  try {
    const r = await fetch(id ? '/api/sensor-types/' + id : '/api/sensor-types', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeSensorTypeModal(); loadFbgTools();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteSensorType(id) {
  if (!id || !await uiConfirm('Odstrániť typ senzora?')) return;
  try { await fetch('/api/sensor-types/' + id, { method: 'DELETE' }); closeSensorTypeModal(); loadFbgTools(); } catch { alert('Chyba'); }
}

// ── Kalkulačka ──
function calcApplyType() {
  const t = sensorTypesData.find(x => x._id === document.getElementById('calcType').value);
  if (!t) return;
  document.getElementById('calcL0').value = t.lambda0;
  document.getElementById('calcSe').value = t.sEps;
  document.getElementById('calcSt').value = t.sTemp;
  calcRun();
}
function calcRun() {
  const l0 = +document.getElementById('calcL0').value, lb = +document.getElementById('calcLb').value;
  const se = +document.getElementById('calcSe').value || 1.2, st = +document.getElementById('calcSt').value || 0, dt = +document.getElementById('calcDt').value || 0;
  const shiftPm = (lb - l0) * 1000;
  const eps = (shiftPm - st * dt) / se;
  document.getElementById('calcShift').textContent = Math.round(shiftPm);
  document.getElementById('calcEps').textContent = Math.round(eps);
}

// ── WDM plánovač ──
function addWdmRow(d = {}) {
  const c = document.getElementById('wdmRows'); const id = 'wdm_' + (++_wdmSeq);
  const row = document.createElement('div'); row.className = 'proc-row'; row.dataset.id = id;
  const opts = '<option value="">vlastné</option>' + sensorTypesData.map(t => `<option value="${t._id}">${escHtml(t.name)}</option>`).join('');
  row.innerHTML = `
    <input type="text" class="wdm-name" placeholder="Názov" value="${escHtml(d.name || '')}" style="max-width:120px" oninput="wdmCompute()">
    <select class="wdm-type" onchange="wdmApplyType(this)" style="max-width:120px">${opts}</select>
    <input type="number" class="wdm-l0" placeholder="λB0" value="${d.l0 ?? 1530}" step="0.1" oninput="wdmCompute()" style="max-width:90px">
    <input type="number" class="wdm-se" placeholder="S_ε" value="${d.se ?? 1.2}" step="0.01" oninput="wdmCompute()" style="max-width:80px">
    <input type="number" class="wdm-eps" placeholder="ε_max" value="${d.eps ?? 2000}" step="50" oninput="wdmCompute()" style="max-width:90px">
    <button type="button" class="proc-row-del" onclick="this.closest('.proc-row').remove(); wdmCompute();">✕</button>`;
  c.appendChild(row);
}
function wdmApplyType(sel) {
  const t = sensorTypesData.find(x => x._id === sel.value); if (!t) return;
  const row = sel.closest('.proc-row');
  row.querySelector('.wdm-l0').value = t.lambda0; row.querySelector('.wdm-se').value = t.sEps;
  if (!row.querySelector('.wdm-name').value) row.querySelector('.wdm-name').value = t.name;
  row.querySelector('.wdm-eps').value = t.rangeEps;
  wdmCompute();
}
function wdmCompute() {
  const rows = [...document.querySelectorAll('#wdmRows .proc-row')];
  const chans = rows.map((r, i) => {
    const l0 = +r.querySelector('.wdm-l0').value, se = +r.querySelector('.wdm-se').value || 1.2, eps = +r.querySelector('.wdm-eps').value || 0;
    const half = (se * eps) / 1000; // nm
    return { name: r.querySelector('.wdm-name').value || ('FBG ' + (i + 1)), l0, min: l0 - half, max: l0 + half, color: WDM_COLORS[i % WDM_COLORS.length] };
  }).filter(c => c.l0);
  drawWdm(chans);
  // detekcia prekrytí
  const warn = [];
  for (let i = 0; i < chans.length; i++) for (let j = i + 1; j < chans.length; j++) {
    if (chans[i].min <= chans[j].max && chans[j].min <= chans[i].max) warn.push(`${chans[i].name} ✕ ${chans[j].name}`);
  }
  const w = document.getElementById('wdmWarn');
  w.innerHTML = warn.length ? `⚠️ Prekrytie pásiem: <strong>${warn.join(', ')}</strong> — uprav λB0 alebo rozsah.` : (chans.length ? '✅ Žiadne prekrytie — kanály sú oddelené.' : '');
  w.className = 'wdm-warn ' + (warn.length ? 'wdm-bad' : 'wdm-ok');
}
function drawWdm(chans) {
  const svg = document.getElementById('wdmChart'); if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg'; const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  svg.innerHTML = '';
  const WMIN = 1500, WMAX = 1600, X0 = 50, X1 = 970, Y = 95;
  const x = (wl) => X0 + (wl - WMIN) / (WMAX - WMIN) * (X1 - X0);
  svg.appendChild(mk('line', { x1: X0, y1: Y, x2: X1, y2: Y, stroke: 'rgba(255,255,255,0.3)' }));
  for (let wl = WMIN; wl <= WMAX; wl += 20) {
    svg.appendChild(mk('line', { x1: x(wl), y1: Y, x2: x(wl), y2: Y + 5, stroke: 'rgba(255,255,255,0.3)' }));
    const t = mk('text', { x: x(wl), y: Y + 18, fill: '#94a3b8', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'monospace' }); t.textContent = wl; svg.appendChild(t);
  }
  const tl = mk('text', { x: (X0 + X1) / 2, y: Y + 34, fill: '#94a3b8', 'font-size': 11, 'text-anchor': 'middle' }); tl.textContent = 'vlnová dĺžka λ [nm]'; svg.appendChild(tl);
  chans.forEach((c, i) => {
    const yb = 20 + (i % 3) * 18;
    const xa = x(c.min), xb = x(c.max);
    svg.appendChild(mk('rect', { x: xa, y: yb, width: Math.max(2, xb - xa), height: 12, rx: 3, fill: c.color, opacity: 0.5, stroke: c.color }));
    svg.appendChild(mk('line', { x1: x(c.l0), y1: yb - 3, x2: x(c.l0), y2: yb + 15, stroke: c.color, 'stroke-width': 2 }));
    const t = mk('text', { x: x(c.l0), y: yb - 5, fill: c.color, 'font-size': 10, 'text-anchor': 'middle' }); t.textContent = c.name; svg.appendChild(t);
  });
}

// ── Vývoj výrobkov — projekty (workflow + 3 zobrazenia: kanban / zoznam / gantt) ──
const PJ_WORKFLOWS = {
  development: { label: 'Vývoj', stages: [
    { key: 'koncept', label: 'Koncept', c: '#6366f1' },
    { key: 'prototyp', label: 'Prototyp', c: '#06b6d4' },
    { key: 'testovanie', label: 'Testovanie', c: '#fbbf24' },
    { key: 'vyroba', label: 'Výroba', c: '#10b981' },
    { key: 'ukoncene', label: 'Ukončené', c: '#64748b' }
  ] },
  sales: { label: 'Predaj', stages: [
    { key: 'lead', label: 'Dopyt / Lead', c: '#6366f1' },
    { key: 'kvalifikacia', label: 'Kvalifikácia', c: '#0ea5e9' },
    { key: 'ponuka', label: 'Cenová ponuka', c: '#06b6d4' },
    { key: 'vyjednavanie', label: 'Vyjednávanie', c: '#fbbf24' },
    { key: 'objednavka', label: 'Objednávka', c: '#10b981' },
    { key: 'uzavrete', label: 'Uzavreté', c: '#64748b' }
  ] }
};
// Štandardné výstupy vývoja (vždy tento zoznam) — status splnených úloh projektu
const PJ_DELIVERABLES = [
  { key: 'boo', label: 'BOO', short: 'BOO' },
  { key: 'bom', label: 'BOM', short: 'BOM' },
  { key: 'datasheet_web', label: 'Datasheet web', short: 'Datasheet' },
  { key: 'std_wavelength', label: 'Standard wavelength configuration', short: 'Wavelength cfg' },
  { key: 'test_protocol', label: 'Testovací protokol', short: 'Test protokol' },
  { key: 'calibration', label: 'Kalibračné dáta', short: 'Kalibrácia' },
  { key: 'routing', label: 'Technologický postup', short: 'Postup' },
  { key: 'erp_card', label: 'ERP karta položky', short: 'ERP karta' },
  { key: 'marketing', label: 'Marketingové materiály', short: 'Marketing' }
];
const PJ_PRIO = { low: { l: 'Nízka', c: '#64748b' }, normal: { l: 'Normálna', c: '#3b82f6' }, high: { l: 'Vysoká', c: '#ef4444' } };
let projectsData = [];
let _dragPid = null;
let pjView = 'list', pjWorkflow = 'development', pjDelivFilter = 'all';

function pjStages(wf) { return (PJ_WORKFLOWS[wf || pjWorkflow] || PJ_WORKFLOWS.development).stages; }
// Dual-track: projekt môže mať súčasne predajný aj vývojový proces (legacy fallback z workflow/phase)
function pjSalesStage(p) { if (p.salesStage) return p.salesStage; if (p.workflow === 'sales' && p.phase) return p.phase; return ''; }
function pjDevStage(p) { if (p.devStage) return p.devStage; if ((p.workflow || 'development') !== 'sales' && p.phase) return p.phase; return ''; }
function pjStageOf(p, wf) { return (wf || pjWorkflow) === 'sales' ? pjSalesStage(p) : pjDevStage(p); }
function pjActive(p, wf) { return !!pjStageOf(p, wf); }
// Hotové stupne tracku (môžu byť nepostupné). Legacy fallback: stupne po reprezentatívny vrátane.
function pjDoneSet(p, wf) {
  const field = wf === 'sales' ? p.salesDone : p.devDone;
  if (Array.isArray(field)) return field;
  const cur = pjStageOf(p, wf); if (!cur) return [];
  const st = pjStages(wf), idx = st.findIndex(s => s.key === cur);
  return idx < 0 ? [] : st.slice(0, idx + 1).map(s => s.key);
}
// Reprezentatívny stupeň = najďalší hotový; ak nič, prvý (alebo uložený) — pre kanban/zoznam
function pjRepKey(wf, doneArr, fallbackStage) {
  const st = pjStages(wf); let best = -1;
  (doneArr || []).forEach(k => { const i = st.findIndex(s => s.key === k); if (i > best) best = i; });
  return best >= 0 ? st[best].key : (fallbackStage || st[0].key);
}
function pjRepStage(p, wf) { return pjActive(p, wf) ? pjRepKey(wf, pjDoneSet(p, wf), pjStageOf(p, wf)) : ''; }
function pjStageInfo(p, wf) { wf = wf || pjWorkflow; const st = pjStages(wf), key = pjRepStage(p, wf) || pjStageOf(p, wf); return st.find(s => s.key === key) || st[0]; }
// Update objekt pre presun stage v danom tracku (kanban = sekvenčné naplnenie po cieľ)
function pjStageUpdate(p, wf, key) {
  const st = pjStages(wf), idx = st.findIndex(s => s.key === key);
  const done = idx < 0 ? [] : st.slice(0, idx + 1).map(s => s.key);
  const u = {};
  if (wf === 'sales') { u.salesDone = done; u.salesStage = key; } else { u.devDone = done; u.devStage = key; }
  const dev = wf === 'development' ? key : pjDevStage(p);
  const sales = wf === 'sales' ? key : pjSalesStage(p);
  u.workflow = dev ? 'development' : 'sales';
  u.phase = dev || sales;
  return u;
}
// Chevron bar pre štandardné výstupy (každý nezávisle hotový / nehotový)
function pjDelivChevron(doneArr, onclickTpl, extraCls) {
  return PJ_DELIVERABLES.map(d => {
    const on = (doneArr || []).includes(d.key);
    const tag = onclickTpl ? 'button' : 'span';
    const attr = onclickTpl ? ` type="button" onclick="${onclickTpl(d.key)}"` : '';
    return `<${tag} class="pj-chev pj-chev-deliv ${on ? 'done' : 'future'} ${extraCls || ''}"${attr} title="${escHtml(d.label)}">${escHtml(d.short || d.label)}</${tag}>`;
  }).join('');
}
// Chevron flow (breadcrumb proces) — done / current / future; farba podľa tracku (sales/dev)
function pjChevron(stages, doneArr, repKey, track, extraCls, readonly) {
  return stages.map(s => {
    const cls = (doneArr || []).includes(s.key) ? 'done' : (s.key === repKey ? 'current' : 'future');
    const tag = readonly ? 'span' : 'button';
    const attr = readonly ? '' : ` type="button" onclick="pjPickStage('${track}','${s.key}')"`;
    return `<${tag} class="pj-chev pj-chev-${track} ${cls} ${extraCls || ''}"${attr}>${escHtml(s.label)}</${tag}>`;
  }).join('');
}
function _segActive(id, idx) { const seg = document.getElementById(id); if (!seg) return; [...seg.children].forEach((b, i) => b.classList.toggle('active', i === idx)); }
function pjSetView(v) { pjView = v; _segActive('pjViewSeg', { kanban: 0, list: 1, gantt: 2 }[v]); renderProjects(); }
function pjSetWorkflow(w) { pjWorkflow = w; _segActive('pjWorkflowSeg', { development: 0, sales: 1 }[w]); renderProjects(); }

async function loadProjects() {
  try { projectsData = await fetch('/api/projects').then(r => r.json()); if (!Array.isArray(projectsData)) projectsData = []; }
  catch { projectsData = []; }
  renderProjects();
}
async function seedProjectsData() {
  if (!await uiConfirm('Nahradiť ukážkové projekty novými (každý s predajným aj vývojovým procesom)?')) return;
  try {
    const r = await fetch('/api/admin/seed-projects', { method: 'POST' }); const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await loadProjects(); toast(`Vygenerovaných ${d.inserted} projektov.`, 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
function pjDelivMatch(p) {
  if (pjDelivFilter === 'all') return true;
  if (!pjActive(p, 'development')) return false;             // výstupy sa týkajú vývoja
  const done = p.deliverables || [], tot = PJ_DELIVERABLES.length;
  if (pjDelivFilter === 'complete') return done.length >= tot;
  if (pjDelivFilter === 'incomplete') return done.length < tot;
  if (pjDelivFilter.startsWith('done:')) return done.includes(pjDelivFilter.slice(5));
  if (pjDelivFilter.startsWith('missing:')) return !done.includes(pjDelivFilter.slice(8));
  return true;
}
function pjDelivFilterOpts() {
  const opt = (v, l) => `<option value="${v}"${pjDelivFilter === v ? ' selected' : ''}>${l}</option>`;
  const done = PJ_DELIVERABLES.map(d => opt('done:' + d.key, escHtml(d.short || d.label))).join('');
  const miss = PJ_DELIVERABLES.map(d => opt('missing:' + d.key, escHtml(d.short || d.label))).join('');
  return `<select class="pj-col-filter" onchange="pjSetDelivFilter(this.value)" onclick="event.stopPropagation()">
    ${opt('all', '— všetky —')}${opt('complete', '✓ všetky hotové')}${opt('incomplete', '✗ niektorý chýba')}
    <optgroup label="Má hotový výstup">${done}</optgroup><optgroup label="Chýba výstup">${miss}</optgroup></select>`;
}
function pjSetDelivFilter(v) { pjDelivFilter = v; renderProjects(); }
function renderProjects() {
  const host = document.getElementById('projectsBoard'); if (!host) return;
  _segActive('pjViewSeg', { kanban: 0, list: 1, gantt: 2 }[pjView]);
  _segActive('pjWorkflowSeg', { development: 0, sales: 1 }[pjWorkflow]);
  const wfSeg = document.getElementById('pjWorkflowSeg'); if (wfSeg) wfSeg.style.display = pjView === 'list' ? 'none' : '';
  const q = (document.getElementById('projSearch')?.value || '').toLowerCase();
  const match = p => !q || (p.title || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q);
  host.style.gridTemplateColumns = '';
  if (pjView === 'list') {
    // zoznam: zobraz oba procesy (predaj aj vývoj) + filter podľa výstupov
    const items = projectsData.filter(p => (pjActive(p, 'sales') || pjActive(p, 'development')) && match(p) && pjDelivMatch(p));
    host.className = ''; renderPjList(host, items);
  } else {
    const items = projectsData.filter(p => pjActive(p, pjWorkflow) && match(p));
    if (pjView === 'gantt') { host.className = ''; renderPjGantt(host, items); }
    else renderPjKanban(host, items);
  }
}
function renderPjKanban(host, items) {
  const stages = pjStages();
  host.className = 'kanban';
  host.style.gridTemplateColumns = `repeat(${stages.length}, minmax(196px, 1fr))`;
  host.innerHTML = '';
  stages.forEach((ph, idx) => {
    const col = document.createElement('div');
    col.className = 'kanban-col'; col.dataset.phase = ph.key;
    const colItems = items.filter(p => pjRepStage(p, pjWorkflow) === ph.key);
    col.innerHTML = `<div class="kanban-col-hdr" style="border-bottom:2px solid ${ph.c}66">${ph.label} <span class="kanban-count">${colItems.length}</span></div>`;
    const body = document.createElement('div'); body.className = 'kanban-col-body';
    col.addEventListener('dragover', (e) => { if (_dragPid) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('kanban-col-drop'); } });
    col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('kanban-col-drop'); });
    col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('kanban-col-drop'); onKanbanDrop(ph.key); });
    colItems.forEach(p => body.appendChild(pjCard(p, idx, stages)));
    col.appendChild(body); host.appendChild(col);
  });
}
function pjCard(p, idx, stages) {
  const prio = PJ_PRIO[p.priority] || PJ_PRIO.normal;
  const dl = p.deadline ? new Date(p.deadline) : null;
  const overdue = dl && dl < new Date() && pjRepStage(p, pjWorkflow) !== stages[stages.length - 1].key;
  const card = document.createElement('div');
  card.className = 'kanban-card'; card.style.setProperty('--prio', prio.c);
  card.draggable = true; card.dataset.pid = p._id;
  card.addEventListener('dragstart', (e) => { _dragPid = p._id; card.classList.add('kanban-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', p._id); } catch (_) {} });
  card.addEventListener('dragend', () => { _dragPid = null; card.classList.remove('kanban-dragging'); document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('kanban-col-drop')); });
  // paralelný proces (druhý track) — odznak že beží súčasne
  const otherWf = pjWorkflow === 'sales' ? 'development' : 'sales';
  let parallel = '';
  if (pjActive(p, otherWf)) { const oi = pjStageInfo(p, otherWf); parallel = `<span class="pj-par-chip" style="--c:${oi.c}" title="Prebieha súčasne">${otherWf === 'sales' ? '💼' : '🛠'} ${escHtml(oi.label)}</span>`; }
  let deliv = '';
  if (pjWorkflow === 'development') {
    const done = (p.deliverables || []).length, tot = PJ_DELIVERABLES.length, pct = Math.round(done / tot * 100);
    deliv = `<div class="pj-card-deliv" title="Štandardné výstupy: ${done}/${tot}"><div class="pj-card-deliv-bar"><div style="width:${pct}%"></div></div><span>${done}/${tot}</span></div>`;
  }
  card.innerHTML = `
    <div class="kanban-card-top" onclick="openProjectModal(projectsData.find(x=>x._id==='${p._id}'))">
      <span class="kanban-card-title"><span class="kanban-grip" title="Potiahni na presun">⠿</span>${escHtml(p.title)}</span>
      ${p.code ? `<span class="kanban-card-code">${escHtml(p.code)}</span>` : ''}
    </div>
    <div class="kanban-card-meta">
      ${p.owner ? `<span>👤 ${escHtml(p.owner)}</span>` : ''}
      ${dl ? `<span class="${overdue ? 'kanban-overdue' : ''}">📅 ${fmtDate(p.deadline)}</span>` : ''}
      <span class="kanban-prio" title="Priorita">${prio.l}</span>
    </div>
    ${parallel}
    ${deliv}
    <div class="kanban-card-actions">
      ${idx > 0 ? `<button onclick="moveProjectPhase('${p._id}',-1)" title="Späť">←</button>` : '<span></span>'}
      ${p.folder ? `<button onclick="openFolderLink('${encodeURIComponent(p.folder)}')" title="Priečinok">📁</button>` : ''}
      ${idx < stages.length - 1 ? `<button onclick="moveProjectPhase('${p._id}',1)" title="Ďalej">→</button>` : '<span></span>'}
    </div>`;
  return card;
}
function renderPjList(host, items) {
  if (!items.length) { host.innerHTML = '<div class="dev-empty">Žiadne projekty pre tento filter.</div>'; return; }
  const rows = items.map(p => {
    const sales = pjSalesStage(p), dev = pjDevStage(p);
    const sDone = pjDoneSet(p, 'sales'), dDone = pjDoneSet(p, 'development');
    const dl = p.deadline ? new Date(p.deadline) : null;
    const overdue = dl && dl < new Date();
    const salesChev = sales ? `<div class="pj-flow pj-flow-sm">${pjChevron(PJ_WORKFLOWS.sales.stages, sDone, pjRepKey('sales', sDone, sales), 'sales', null, true)}</div>` : '<span class="prod-t-qty">neaktívne</span>';
    const devChev = dev ? `<div class="pj-flow pj-flow-sm">${pjChevron(PJ_WORKFLOWS.development.stages, dDone, pjRepKey('development', dDone, dev), 'dev', null, true)}</div>` : '<span class="prod-t-qty">neaktívne</span>';
    const procStack = `<div class="pj-proc-stack">
      <div class="pj-proc-line"><span class="pj-proc-tag pj-proc-tag-sales">Predaj</span>${salesChev}</div>
      <div class="pj-proc-line"><span class="pj-proc-tag pj-proc-tag-dev">Vývoj</span>${devChev}</div>
      ${dev ? `<div class="pj-proc-line"><span class="pj-proc-tag pj-proc-tag-deliv">Výstupy</span>${pjListDeliv(p)}</div>` : ''}
    </div>`;
    return `<tr onclick="openProjectModal(projectsData.find(x=>x._id==='${p._id}'))">
      <td><span class="prod-t-num">${escHtml(p.title)}</span>${p.code ? `<span class="prod-t-qty">${escHtml(p.code)}</span>` : ''}</td>
      <td>${procStack}</td>
      <td>${escHtml(p.owner || '—')}</td>
      <td class="${overdue ? 'kanban-overdue' : ''}">${dl ? fmtDate(p.deadline) : '—'}</td>
    </tr>`;
  }).join('');
  host.innerHTML = `<div class="prod-list pj-list-wrap"><table class="prod-table">
    <thead><tr><th>Projekt</th><th><div class="pj-col-hd">Procesy &amp; výstupy ${pjDelivFilterOpts()}</div></th><th>Vlastník</th><th>Termín</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
// Výstupy v zozname — chevron bar (ako workflow), priamo prepínateľný
function pjListDeliv(p) {
  if (!pjDevStage(p)) return '<span class="prod-t-qty">—</span>';
  const done = p.deliverables || [], tot = PJ_DELIVERABLES.length, full = done.length >= tot;
  const bar = pjDelivChevron(done, k => `event.stopPropagation();pjToggleDeliv('${p._id}','${k}',this)`, 'pj-chev-sm');
  return `<div class="pj-deliv-cell" onclick="event.stopPropagation()"><div class="pj-flow pj-deliv-flow">${bar}</div><span id="pjcnt-${p._id}" class="pj-out-lbl ${full ? 'done' : ''}">${full ? '✓ ' : ''}${done.length}/${tot}</span></div>`;
}
async function pjToggleDeliv(id, key, btn) {
  const p = projectsData.find(x => x._id === id); if (!p) return;
  p.deliverables = p.deliverables || [];
  const i = p.deliverables.indexOf(key), on = i < 0;
  if (on) p.deliverables.push(key); else p.deliverables.splice(i, 1);
  btn.classList.toggle('done', on); btn.classList.toggle('future', !on);
  const tot = PJ_DELIVERABLES.length, doneN = p.deliverables.length, full = doneN >= tot;
  const cnt = document.getElementById('pjcnt-' + id);
  if (cnt) { cnt.textContent = (full ? '✓ ' : '') + doneN + '/' + tot; cnt.classList.toggle('done', full); }
  try { const r = await fetch('/api/projects/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliverables: p.deliverables }) }); if (!r.ok) throw 0; }
  catch { toast('Uloženie zlyhalo', 'error'); await loadProjectsData(); }
  if (pjDelivFilter !== 'all') renderProjects();
}
function renderPjGantt(host, items) {
  if (!items.length) { host.innerHTML = '<div class="dev-empty">Žiadne projekty v tomto workflow.</div>'; return; }
  const withDates = items.map(p => {
    const start = p.startDate ? new Date(p.startDate) : (p.createdAt ? new Date(p.createdAt) : new Date());
    let end = p.deadline ? new Date(p.deadline) : new Date(start.getTime() + 30 * 864e5);
    if (end < start) end = new Date(start.getTime() + 7 * 864e5);
    return { p, start, end };
  });
  let min = withDates[0].start, max = withDates[0].end;
  withDates.forEach(d => { if (d.start < min) min = d.start; if (d.end > max) max = d.end; });
  const mStart = new Date(min.getFullYear(), min.getMonth(), 1);
  const mEnd = new Date(max.getFullYear(), max.getMonth() + 1, 1);
  const months = [];
  for (let d = new Date(mStart); d < mEnd; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
  const COLW = 80, totalMs = mEnd - mStart, trackW = months.length * COLW;
  const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  const xOf = (date) => (date - mStart) / totalMs * trackW;
  const head = months.map((d, i) => `<div class="ug-day" style="left:${i * COLW}px;width:${COLW}px"><span class="ug-day-wd">${d.getFullYear()}</span><span class="ug-day-d">${mNames[d.getMonth()]}</span></div>`).join('');
  const now = new Date(), nowX = (now >= mStart && now < mEnd) ? xOf(now) : -1;
  const rows = withDates.map(({ p, start, end }) => {
    const st = pjStageInfo(p), left = xOf(start), w = Math.max(10, xOf(end) - left);
    const cells = months.map((d, i) => `<div class="ug-cell" style="left:${i * COLW}px;width:${COLW}px"></div>`).join('');
    return `<div class="ug-row">
      <div class="ug-eq"><div class="ug-eq-txt"><span class="ug-eq-name">${escHtml(p.title)}</span><span class="ug-eq-code">${escHtml(p.code || st.label)}</span></div></div>
      <div class="ug-track" style="width:${trackW}px">${cells}
        <div class="ug-bar" style="left:${left}px;width:${w}px;background:${st.c}" onclick="openProjectModal(projectsData.find(x=>x._id==='${p._id}'))"><span class="ug-bar-lbl">${escHtml(p.title)} · ${st.label}</span></div>
      </div></div>`;
  }).join('');
  host.innerHTML = `<div class="util-gantt-wrap"><div class="util-gantt" style="min-width:${180 + trackW}px">
    <div class="ug-head"><div class="ug-corner">Projekt</div><div class="ug-days" style="width:${trackW}px">${head}</div></div>
    ${rows}
    ${nowX >= 0 ? `<div class="ug-now" style="left:${180 + nowX}px"></div>` : ''}
  </div></div>`;
}
function openFolderLink(enc) {
  openServerFolder(decodeURIComponent(enc));
}
// Presun kartičky drag&drop do iného stage aktuálneho tracku (optimistický update + PUT)
async function pjSetStage(p, key) {
  const u = pjStageUpdate(p, pjWorkflow, key);
  const prev = { salesStage: p.salesStage, devStage: p.devStage, salesDone: p.salesDone, devDone: p.devDone, workflow: p.workflow, phase: p.phase };
  Object.assign(p, u); renderProjects();
  try {
    const r = await fetch('/api/projects/' + p._id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch { Object.assign(p, prev); renderProjects(); toast('Presun zlyhal — skús znova.', 'error'); }
}
async function onKanbanDrop(stageKey) {
  const id = _dragPid; _dragPid = null;
  if (!id) return;
  const p = projectsData.find(x => x._id === id); if (!p) return;
  if (pjRepStage(p, pjWorkflow) === stageKey) return;
  pjSetStage(p, stageKey);
}
function moveProjectPhase(id, dir) {
  const p = projectsData.find(x => x._id === id); if (!p) return;
  const stages = pjStages(pjWorkflow);
  const i = stages.findIndex(x => x.key === pjRepStage(p, pjWorkflow));
  const ni = i + dir; if (ni < 0 || ni >= stages.length) return;
  pjSetStage(p, stages[ni].key);
}
// ── Detail projektu = samostatná stránka (komplexný obsah) ──
let pjPageData = null, pjPageIsNew = false, pjPageTests = [];
function pjBlankProject() {
  // nový projekt má defaultne oba procesy — predajný aj vývojový
  return {
    title: '', code: '',
    salesStage: PJ_WORKFLOWS.sales.stages[0].key,
    devStage: PJ_WORKFLOWS.development.stages[0].key,
    salesDone: [], devDone: [],
    priority: 'normal', owner: '', startDate: null, deadline: null,
    deliverables: [], folder: '', tags: [], links: [], description: '', notes: ''
  };
}
// openProjectModal je zachované meno kvôli existujúcim onclickom — presmeruje na stránku
function openProjectModal(p = null) { openProjectPage(p && typeof p === 'object' ? p : null); }
async function openProjectPage(arg) {
  let src = null;
  if (arg && typeof arg === 'object') src = arg;
  else if (arg) src = projectsData.find(x => x._id === arg) || await fetch('/api/projects/' + arg).then(r => r.ok ? r.json() : null).catch(() => null);
  pjPageIsNew = !src;
  pjPageData = src ? JSON.parse(JSON.stringify(src)) : pjBlankProject();
  // normalizuj dual-track + hotové stupne z legacy
  if (src) {
    pjPageData.salesStage = pjSalesStage(src); pjPageData.devStage = pjDevStage(src);
    pjPageData.salesDone = pjPageData.salesStage ? pjDoneSet(src, 'sales') : [];
    pjPageData.devDone = pjPageData.devStage ? pjDoneSet(src, 'development') : [];
  }
  pjPageData.tags = pjPageData.tags || []; pjPageData.links = pjPageData.links || [];
  setHash('project/' + (src ? src._id : 'new'));
  _activatePage('project');
  pjPageTests = [];
  renderProjectPage();
  if (src && src.title) { // súvisiace testovacie protokoly (best-effort)
    try { const all = await fetch('/api/tests').then(r => r.json()); if (Array.isArray(all)) { pjPageTests = all.filter(t => (t.project || '').trim() && (t.project || '').toLowerCase() === src.title.toLowerCase()); if (pjPageTests.length) pjRenderRelated(); } } catch (_) {}
  }
}
function backToProjects() { showPage('dev'); setTimeout(() => switchDevTab('projects'), 0); }
const PJ_PRIO_OPTS = [['low', 'Nízka'], ['normal', 'Normálna'], ['high', 'Vysoká']];
function renderProjectPage() {
  const host = document.getElementById('pjPageInner'); if (!host || !pjPageData) return;
  const d = pjPageData, dl = d.deadline ? new Date(d.deadline) : null;
  const overdue = dl && dl < new Date();
  const prioOpts = PJ_PRIO_OPTS.map(([v, l]) => `<option value="${v}"${d.priority === v ? ' selected' : ''}>${l}</option>`).join('');
  host.innerHTML = `
    <div class="pjp-top">
      <button class="btn-secondary btn-sm" onclick="backToProjects()">← Späť na projekty</button>
      <div class="pjp-top-actions">
        ${pjPageIsNew ? '' : '<button class="btn-delete btn-sm" onclick="deleteProject(pjPageData._id)">Odstrániť</button>'}
        <button class="btn-primary" onclick="savePjPage()">💾 Uložiť</button>
      </div>
    </div>
    <div class="pjp-head">
      <input class="pjp-title-input" type="text" placeholder="Názov projektu *" value="${escHtml(d.title || '')}" oninput="pjPageData.title=this.value">
      <input class="pjp-code-input" type="text" placeholder="Kód (napr. P-2026-01)" value="${escHtml(d.code || '')}" oninput="pjPageData.code=this.value">
    </div>
    <div class="pjp-grid">
      <div class="pjp-main">
        <div class="pjp-card">
          <div class="pjp-card-hd">⚙️ Procesy <span class="pjp-card-hint">klik na stupeň = označiť hotový (aj nepostupne)</span></div>
          <div id="pjPageFlows"></div>
        </div>
        <div class="pjp-card" id="pjPageDelivCard">
          <div class="pjp-card-hd">📦 Štandardné výstupy <span id="pjDelivCount" class="pj-deliv-count"></span></div>
          <div class="pj-deliv" id="pjDelivList"></div>
        </div>
        <div class="pjp-card">
          <div class="pjp-card-hd">📝 Popis</div>
          <textarea class="pjp-textarea" rows="4" placeholder="Popis projektu…" oninput="pjPageData.description=this.value">${escHtml(d.description || '')}</textarea>
        </div>
        <div class="pjp-card">
          <div class="pjp-card-hd">🗒️ Poznámky</div>
          <textarea class="pjp-textarea" rows="3" placeholder="Interné poznámky…" oninput="pjPageData.notes=this.value">${escHtml(d.notes || '')}</textarea>
        </div>
        <div class="pjp-card">
          <div class="pjp-card-hd">🔗 Odkazy <button class="btn-secondary btn-sm" onclick="pjAddLink()">+ Pridať</button></div>
          <div id="pjLinksList"></div>
        </div>
        <div class="pjp-card" id="pjRelatedCard" style="display:none">
          <div class="pjp-card-hd">🧪 Súvisiace testovacie protokoly</div>
          <div id="pjRelatedList"></div>
        </div>
      </div>
      <aside class="pjp-aside">
        <div class="pjp-card">
          <div class="pjp-card-hd">📋 Detaily</div>
          <div class="form-group"><label>Priorita</label><select onchange="pjPageData.priority=this.value">${prioOpts}</select></div>
          <div class="form-group"><label>Zodpovedný</label><input type="text" value="${escHtml(d.owner || '')}" oninput="pjPageData.owner=this.value"></div>
          <div class="form-group"><label>Začiatok</label><input type="date" value="${d.startDate ? String(d.startDate).slice(0, 10) : ''}" onchange="pjPageData.startDate=this.value||null"></div>
          <div class="form-group"><label>Termín (deadline)</label><input type="date" value="${d.deadline ? String(d.deadline).slice(0, 10) : ''}" onchange="pjPageData.deadline=this.value||null"></div>
          ${overdue ? '<div class="pjp-overdue">⚠️ Po termíne</div>' : ''}
          <div class="form-group"><label>Priečinok / odkaz</label><input type="text" value="${escHtml(d.folder || '')}" placeholder="G:\\Projekty\\…" oninput="pjPageData.folder=this.value"></div>
          <div class="form-group"><label>Tagy (čiarkou)</label><input type="text" value="${escHtml((d.tags || []).join(', '))}" oninput="pjPageData.tags=this.value.split(',').map(s=>s.trim()).filter(Boolean)"></div>
        </div>
      </aside>
    </div>`;
  pjRenderPageFlows();
  pjBuildDeliverables(d.deliverables || []);
  pjRenderLinks();
  pjRenderRelated();
}
// klik na stupeň prepne jeho stav „hotový" (nepostupne)
function pjPickStage(track, key) {
  const arr = track === 'sales' ? (pjPageData.salesDone || (pjPageData.salesDone = [])) : (pjPageData.devDone || (pjPageData.devDone = []));
  const i = arr.indexOf(key); if (i >= 0) arr.splice(i, 1); else arr.push(key);
  pjRenderPageFlows();
}
function pjToggleTrack(track) {
  if (track === 'sales') { const on = !pjPageData.salesStage; pjPageData.salesStage = on ? PJ_WORKFLOWS.sales.stages[0].key : ''; pjPageData.salesDone = []; }
  else { const on = !pjPageData.devStage; pjPageData.devStage = on ? PJ_WORKFLOWS.development.stages[0].key : ''; pjPageData.devDone = []; }
  pjRenderPageFlows();
  const card = document.getElementById('pjPageDelivCard'); if (card) card.style.display = pjPageData.devStage ? '' : 'none';
}
function pjRenderPageFlows() {
  const el = document.getElementById('pjPageFlows'); if (!el) return;
  const sOn = !!pjPageData.salesStage, dOn = !!pjPageData.devStage;
  const sDone = pjPageData.salesDone || [], dDone = pjPageData.devDone || [];
  const sRep = pjRepKey('sales', sDone, pjPageData.salesStage), dRep = pjRepKey('development', dDone, pjPageData.devStage);
  el.innerHTML = `
    <div class="pj-track pj-track-sales"><label class="pj-track-hd"><input type="checkbox" ${sOn ? 'checked' : ''} onchange="pjToggleTrack('sales')"> 💼 Predajný proces</label>
      <div class="pj-flow">${sOn ? pjChevron(PJ_WORKFLOWS.sales.stages, sDone, sRep, 'sales') : '<span class="pj-flow-off">neaktívne — zapni vyššie</span>'}</div></div>
    <div class="pj-track pj-track-dev"><label class="pj-track-hd"><input type="checkbox" ${dOn ? 'checked' : ''} onchange="pjToggleTrack('dev')"> 🛠 Vývojový proces</label>
      <div class="pj-flow">${dOn ? pjChevron(PJ_WORKFLOWS.development.stages, dDone, dRep, 'dev') : '<span class="pj-flow-off">neaktívne — zapni vyššie</span>'}</div></div>`;
  const card = document.getElementById('pjPageDelivCard'); if (card) card.style.display = dOn ? '' : 'none';
}
function pjBuildDeliverables(done) {
  const list = document.getElementById('pjDelivList'); if (!list) return;
  list.className = 'pj-flow pj-deliv-flow';
  list.innerHTML = pjDelivChevron(done || [], k => `pjToggleDelivPage('${k}')`);
  pjUpdateDelivCount();
}
function pjToggleDelivPage(key) {
  const arr = pjPageData.deliverables || (pjPageData.deliverables = []);
  const i = arr.indexOf(key); if (i >= 0) arr.splice(i, 1); else arr.push(key);
  pjBuildDeliverables(arr);
}
function pjUpdateDelivCount() {
  const tot = PJ_DELIVERABLES.length, done = (pjPageData && pjPageData.deliverables || []).length;
  const el = document.getElementById('pjDelivCount'); if (el) el.textContent = `${done}/${tot} hotové`;
}
function pjAddLink() { pjPageData.links.push({ label: '', url: '' }); pjRenderLinks(); }
function pjDelLink(i) { pjPageData.links.splice(i, 1); pjRenderLinks(); }
function pjRenderLinks() {
  const el = document.getElementById('pjLinksList'); if (!el) return;
  if (!pjPageData.links.length) { el.innerHTML = '<div class="pjp-empty">Žiadne odkazy.</div>'; return; }
  el.innerHTML = pjPageData.links.map((l, i) => `<div class="pjp-link-row">
    <input type="text" placeholder="Popis" value="${escHtml(l.label || '')}" oninput="pjPageData.links[${i}].label=this.value">
    <input type="text" placeholder="https://…" value="${escHtml(l.url || '')}" oninput="pjPageData.links[${i}].url=this.value">
    <button class="btn-delete btn-sm" onclick="pjDelLink(${i})">✕</button></div>`).join('');
}
function pjRenderRelated() {
  const card = document.getElementById('pjRelatedCard'), list = document.getElementById('pjRelatedList');
  if (!card || !list) return;
  if (!pjPageTests.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  list.innerHTML = pjPageTests.map(t => {
    const r = TS_RESULT[t.result] || TS_RESULT.na;
    return `<div class="pjp-rel-row" onclick="showPage('dev');setTimeout(()=>{switchDevTab('tests');},0)"><span>${escHtml(t.title)}</span><span class="proc-status ${r.c}">${r.l}</span></div>`;
  }).join('');
}
async function savePjPage() {
  const d = pjPageData; if (!d) return;
  const title = (d.title || '').trim();
  if (!title) { toast('Zadajte názov projektu', 'warn'); return; }
  if (!d.salesStage && !d.devStage) { toast('Zapni aspoň jeden proces — Predaj alebo Vývoj.', 'warn'); return; }
  const salesOn = !!d.salesStage, devOn = !!d.devStage;
  const sDone = salesOn ? (d.salesDone || []) : [], dDone = devOn ? (d.devDone || []) : [];
  const salesStage = salesOn ? pjRepKey('sales', sDone, d.salesStage) : '';
  const dev = devOn ? pjRepKey('development', dDone, d.devStage) : '';
  const body = {
    title, code: (d.code || '').trim(),
    salesStage, devStage: dev, salesDone: sDone, devDone: dDone,
    workflow: dev ? 'development' : 'sales', phase: dev || salesStage,   // legacy/analytika
    priority: d.priority || 'normal', owner: (d.owner || '').trim(),
    startDate: d.startDate || null, deadline: d.deadline || null,
    deliverables: devOn ? (d.deliverables || []) : [],
    folder: (d.folder || '').trim(), tags: d.tags || [],
    links: (d.links || []).filter(l => (l.url || '').trim() || (l.label || '').trim()),
    description: (d.description || '').trim(), notes: (d.notes || '').trim()
  };
  try {
    const resp = await fetch(pjPageIsNew ? '/api/projects' : '/api/projects/' + d._id, { method: pjPageIsNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); toast('Chyba: ' + (er.error || resp.status), 'error'); return; }
    toast('Projekt uložený.', 'success');
    await loadProjectsData();
    backToProjects();
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function loadProjectsData() {
  try { projectsData = await fetch('/api/projects').then(r => r.json()); if (!Array.isArray(projectsData)) projectsData = []; } catch { projectsData = []; }
}
async function deleteProject(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť projekt?')) return;
  try { await fetch('/api/projects/' + id, { method: 'DELETE' }); toast('Projekt odstránený.', 'success'); await loadProjectsData(); backToProjects(); } catch { toast('Chyba pri mazaní', 'error'); }
}

// ── Testy ─────────────────────────────────────────────────────────────────────
const TS_RESULT = { pass: { l: 'Vyhovel', c: 'proc-status-active' }, fail: { l: 'Nevyhovel', c: 'proc-status-archived' }, na: { l: 'N/A', c: 'proc-status-draft' } };
let testsData = [];
async function loadTests() {
  try { testsData = await fetch('/api/tests').then(r => r.json()); if (!Array.isArray(testsData)) testsData = []; } catch { testsData = []; }
  renderTests();
}
function renderTests() {
  const el = document.getElementById('testsList'); if (!el) return;
  const q = (document.getElementById('testSearch')?.value || '').toLowerCase();
  const items = testsData.filter(t => !q || (t.title || '').toLowerCase().includes(q) || (t.project || '').toLowerCase().includes(q) || (t.product || '').toLowerCase().includes(q));
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne protokoly.</div>'; return; }
  el.innerHTML = '';
  items.forEach(t => {
    const rr = TS_RESULT[t.result] || TS_RESULT.na;
    const card = document.createElement('div');
    card.className = 'proc-card';
    card.innerHTML = `
      <div class="proc-card-main" onclick="openTestModal(testsData.find(x=>x._id==='${t._id}'))">
        <div class="proc-card-top"><span class="proc-card-title">${escHtml(t.title)}</span><span class="proc-status-badge ${rr.c}">${rr.l}</span></div>
        <div class="proc-card-meta">
          ${t.project ? `<span>🗂️ ${escHtml(t.project)}</span>` : ''}${t.product ? `<span>📦 ${escHtml(t.product)}</span>` : ''}
          ${t.tester ? `<span>👤 ${escHtml(t.tester)}</span>` : ''}<span>📊 ${(t.measurements || []).length} meraní</span><span>🕒 ${fmtDate(t.date)}</span>
        </div>
      </div>
      <div class="proc-card-actions">
        <button class="btn-word" onclick="window.location.href='/api/tests/${t._id}/export.xlsx'" title="Excel">⬇ Excel</button>
        <button class="admin-icon-btn" onclick="openTestModal(testsData.find(x=>x._id==='${t._id}'))" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteTest('${t._id}')" title="Odstrániť">✕</button>
      </div>`;
    el.appendChild(card);
  });
}
function addMeasureRow(m = {}) {
  const c = document.getElementById('tsMeasRows');
  const row = document.createElement('div'); row.className = 'proc-row';
  row.innerHTML = `
    <input type="text" class="ms-name" placeholder="Meranie" value="${escHtml(m.name || '')}" style="flex:2">
    <input type="text" class="ms-value" placeholder="Hodnota" value="${escHtml(m.value || '')}">
    <input type="text" class="ms-unit" placeholder="Jedn." value="${escHtml(m.unit || '')}" style="max-width:70px">
    <input type="text" class="ms-min" placeholder="Min" value="${escHtml(m.min || '')}" style="max-width:70px">
    <input type="text" class="ms-max" placeholder="Max" value="${escHtml(m.max || '')}" style="max-width:70px">
    <label class="ms-pass" title="Vyhovel"><input type="checkbox" class="ms-passchk" ${m.pass ? 'checked' : ''}> ✓</label>
    <button type="button" class="proc-row-del" onclick="procRemoveRow(this)">✕</button>`;
  c.appendChild(row);
}
function openTestModal(t = null) {
  const e = t && typeof t === 'object';
  document.getElementById('tsModalTitle').textContent = e ? 'Upraviť protokol' : 'Nový protokol';
  document.getElementById('tsId').value = e ? t._id : '';
  document.getElementById('tsTitle').value = e ? (t.title || '') : '';
  document.getElementById('tsDate').value = e && t.date ? String(t.date).slice(0, 10) : calYmd(new Date());
  document.getElementById('tsProject').value = e ? (t.project || '') : '';
  document.getElementById('tsProduct').value = e ? (t.product || '') : '';
  document.getElementById('tsTester').value = e ? (t.tester || '') : '';
  document.getElementById('tsType').value = e ? (t.ptype || '') : '';
  const rv = e ? (t.result || 'na') : 'na';
  const rb = document.querySelector(`input[name="tsResult"][value="${rv}"]`); if (rb) rb.checked = true;
  document.getElementById('tsNote').value = e ? (t.note || '') : '';
  document.getElementById('tsMeasRows').innerHTML = '';
  const meas = (e && t.measurements && t.measurements.length) ? t.measurements : [{}];
  meas.forEach(addMeasureRow);
  document.getElementById('tsDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('testModal').classList.remove('hidden');
}
function closeTestModal() { document.getElementById('testModal').classList.add('hidden'); }
async function saveTest() {
  const title = document.getElementById('tsTitle').value.trim();
  if (!title) { alert('Zadajte názov protokolu'); return; }
  const measurements = [...document.querySelectorAll('#tsMeasRows .proc-row')].map(r => ({
    name: r.querySelector('.ms-name').value.trim(), value: r.querySelector('.ms-value').value.trim(),
    unit: r.querySelector('.ms-unit').value.trim(), min: r.querySelector('.ms-min').value.trim(),
    max: r.querySelector('.ms-max').value.trim(), pass: r.querySelector('.ms-passchk').checked
  })).filter(m => m.name || m.value);
  const body = {
    title, date: document.getElementById('tsDate').value || undefined,
    project: document.getElementById('tsProject').value.trim(), product: document.getElementById('tsProduct').value.trim(),
    tester: document.getElementById('tsTester').value.trim(), ptype: document.getElementById('tsType').value.trim(),
    result: document.querySelector('input[name="tsResult"]:checked')?.value || 'na', measurements,
    note: document.getElementById('tsNote').value.trim()
  };
  const id = document.getElementById('tsId').value;
  try {
    const resp = await fetch(id ? '/api/tests/' + id : '/api/tests', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); alert('Chyba: ' + (er.error || resp.status)); return; }
    closeTestModal(); loadTests();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteTest(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť protokol?')) return;
  try { await fetch('/api/tests/' + id, { method: 'DELETE' }); closeTestModal(); loadTests(); } catch { alert('Chyba'); }
}

// ── Kalibrácie ────────────────────────────────────────────────────────────────
let instrumentsData = [];
function calStatus(next) {
  if (!next) return { l: 'neurčené', c: '#64748b', k: 'none' };
  const days = Math.ceil((new Date(next) - new Date()) / 864e5);
  if (days < 0) return { l: 'Po termíne', c: '#ef4444', k: 'overdue' };
  if (days <= 30) return { l: `O ${days} dní`, c: '#f59e0b', k: 'soon' };
  return { l: 'OK', c: '#10b981', k: 'ok' };
}
function addMonths(dateStr, months) {
  const d = new Date(dateStr); if (isNaN(d)) return '';
  d.setMonth(d.getMonth() + (Number(months) || 0));
  return calYmd(d);
}
async function loadInstruments() {
  try { instrumentsData = await fetch('/api/instruments').then(r => r.json()); if (!Array.isArray(instrumentsData)) instrumentsData = []; } catch { instrumentsData = []; }
  renderInstruments();
}
function renderInstruments() {
  const el = document.getElementById('instrList'); if (!el) return;
  const q = (document.getElementById('instrSearch')?.value || '').toLowerCase();
  const items = instrumentsData.filter(i => !q || (i.name || '').toLowerCase().includes(q) || (i.serial || '').toLowerCase().includes(q) || (i.type || '').toLowerCase().includes(q));
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne prístroje.</div>'; return; }
  el.innerHTML = '';
  items.forEach(i => {
    const st = calStatus(i.nextCalibration);
    const card = document.createElement('div');
    card.className = 'proc-card';
    card.innerHTML = `
      <div class="proc-card-main" onclick="openInstrumentModal(instrumentsData.find(x=>x._id==='${i._id}'))">
        <div class="proc-card-top"><span class="proc-card-title">${escHtml(i.name)}</span>
          <span class="cal-badge" style="--c:${st.c}">${st.l}</span></div>
        <div class="proc-card-meta">
          ${i.serial ? `<span>🔢 ${escHtml(i.serial)}</span>` : ''}${i.type ? `<span>🏷️ ${escHtml(i.type)}</span>` : ''}
          ${i.location ? `<span>📍 ${escHtml(i.location)}</span>` : ''}
          ${i.lastCalibration ? `<span>posl.: ${fmtDate(i.lastCalibration)}</span>` : ''}
          ${i.nextCalibration ? `<span>ďalšia: ${fmtDate(i.nextCalibration)}</span>` : ''}
        </div>
      </div>
      <div class="proc-card-actions">
        <button class="admin-icon-btn" onclick="openInstrumentModal(instrumentsData.find(x=>x._id==='${i._id}'))" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteInstrument('${i._id}')" title="Odstrániť">✕</button>
      </div>`;
    el.appendChild(card);
  });
}
function openInstrumentModal(i = null) {
  const e = i && typeof i === 'object';
  document.getElementById('inModalTitle').textContent = e ? 'Upraviť prístroj' : 'Nový prístroj';
  document.getElementById('inId').value = e ? i._id : '';
  document.getElementById('inName').value = e ? (i.name || '') : '';
  document.getElementById('inSerial').value = e ? (i.serial || '') : '';
  document.getElementById('inType').value = e ? (i.type || '') : '';
  document.getElementById('inLocation').value = e ? (i.location || '') : '';
  document.getElementById('inLast').value = e && i.lastCalibration ? String(i.lastCalibration).slice(0, 10) : '';
  document.getElementById('inInterval').value = e ? (i.intervalMonths || 12) : 12;
  document.getElementById('inNext').value = e && i.nextCalibration ? String(i.nextCalibration).slice(0, 10) : '';
  document.getElementById('inResponsible').value = e ? (i.responsible || '') : '';
  document.getElementById('inNote').value = e ? (i.note || '') : '';
  document.getElementById('inDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('instrumentModal').classList.remove('hidden');
}
function closeInstrumentModal() { document.getElementById('instrumentModal').classList.add('hidden'); }
async function saveInstrument() {
  const name = document.getElementById('inName').value.trim();
  if (!name) { alert('Zadajte názov prístroja'); return; }
  const last = document.getElementById('inLast').value || null;
  const interval = Number(document.getElementById('inInterval').value) || 12;
  let next = document.getElementById('inNext').value || null;
  if (!next && last) next = addMonths(last, interval);
  const body = {
    name, serial: document.getElementById('inSerial').value.trim(), type: document.getElementById('inType').value.trim(),
    location: document.getElementById('inLocation').value.trim(), responsible: document.getElementById('inResponsible').value.trim(),
    lastCalibration: last, nextCalibration: next, intervalMonths: interval, note: document.getElementById('inNote').value.trim()
  };
  const id = document.getElementById('inId').value;
  try {
    const resp = await fetch(id ? '/api/instruments/' + id : '/api/instruments', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); alert('Chyba: ' + (er.error || resp.status)); return; }
    closeInstrumentModal(); loadInstruments(); loadNotif();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteInstrument(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť prístroj?')) return;
  try { await fetch('/api/instruments/' + id, { method: 'DELETE' }); closeInstrumentModal(); loadInstruments(); loadNotif(); } catch { alert('Chyba'); }
}

// ── Prototypy ─────────────────────────────────────────────────────────────────
let prototypesData = [];
let ptImagesData = [];
async function loadPrototypes() {
  try { prototypesData = await fetch('/api/prototypes').then(r => r.json()); if (!Array.isArray(prototypesData)) prototypesData = []; } catch { prototypesData = []; }
  renderPrototypes();
}
function renderPrototypes() {
  const el = document.getElementById('protoList'); if (!el) return;
  const q = (document.getElementById('protoSearch')?.value || '').toLowerCase();
  const items = prototypesData.filter(p => !q || (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.project || '').toLowerCase().includes(q));
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne prototypy.</div>'; return; }
  el.innerHTML = '';
  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'proc-card';
    const thumb = (p.images || [])[0];
    card.innerHTML = `
      <div class="proc-card-main" onclick="openPrototypeModal(prototypesData.find(x=>x._id==='${p._id}'))" style="display:flex;gap:12px;align-items:center">
        ${thumb ? `<img src="${escHtml(thumb.url)}" class="proto-thumb" alt="">` : ''}
        <div style="flex:1;min-width:0">
          <div class="proc-card-top"><span class="proc-card-title">${escHtml(p.name)}</span>
            ${p.version ? `<span class="proc-status-badge proc-status-draft">${escHtml(p.version)}</span>` : ''}
            <span class="proc-status-badge ${p.status === 'archived' ? 'proc-status-archived' : 'proc-status-active'}">${p.status === 'archived' ? 'Archív' : 'Aktívny'}</span>
          </div>
          <div class="proc-card-meta">
            ${p.code ? `<span>🔢 ${escHtml(p.code)}</span>` : ''}${p.project ? `<span>🗂️ ${escHtml(p.project)}</span>` : ''}<span>🕒 ${fmtDate(p.date)}</span>
          </div>
        </div>
      </div>
      <div class="proc-card-actions">
        <button class="admin-icon-btn" onclick="openPrototypeModal(prototypesData.find(x=>x._id==='${p._id}'))" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deletePrototype('${p._id}')" title="Odstrániť">✕</button>
      </div>`;
    el.appendChild(card);
  });
}
function renderPtImages() {
  const el = document.getElementById('ptImages'); if (!el) return;
  el.innerHTML = '';
  ptImagesData.forEach((img, i) => {
    const d = document.createElement('div'); d.className = 'image-preview-item';
    d.innerHTML = `<img src="${escHtml(img.url)}" alt=""><button class="image-preview-remove" onclick="removePtImage(${i})">✕</button>`;
    el.appendChild(d);
  });
}
function removePtImage(i) { ptImagesData.splice(i, 1); renderPtImages(); }
async function addPrototypeImage() {
  const url = await pickImageUpload();
  if (url) { ptImagesData.push({ url, caption: '' }); renderPtImages(); }
}
function openPrototypeModal(p = null) {
  const e = p && typeof p === 'object';
  document.getElementById('ptModalTitle').textContent = e ? 'Upraviť prototyp' : 'Nový prototyp';
  document.getElementById('ptId').value = e ? p._id : '';
  document.getElementById('ptName').value = e ? (p.name || '') : '';
  document.getElementById('ptCode').value = e ? (p.code || '') : '';
  document.getElementById('ptVersion').value = e ? (p.version || '') : '';
  document.getElementById('ptProject').value = e ? (p.project || '') : '';
  document.getElementById('ptDate').value = e && p.date ? String(p.date).slice(0, 10) : calYmd(new Date());
  document.getElementById('ptStatus').value = e ? (p.status || 'active') : 'active';
  document.getElementById('ptDescription').value = e ? (p.description || '') : '';
  document.getElementById('ptResults').value = e ? (p.results || '') : '';
  ptImagesData = e ? [...(p.images || [])] : [];
  renderPtImages();
  enableFileDrop(document.getElementById('ptImages'), (files) =>
    dropImagesTo(files, (url) => { ptImagesData.push({ url, caption: '' }); renderPtImages(); }));
  document.getElementById('ptDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('prototypeModal').classList.remove('hidden');
}
function closePrototypeModal() { document.getElementById('prototypeModal').classList.add('hidden'); }
async function savePrototype() {
  const name = document.getElementById('ptName').value.trim();
  if (!name) { alert('Zadajte názov prototypu'); return; }
  const body = {
    name, code: document.getElementById('ptCode').value.trim(), version: document.getElementById('ptVersion').value.trim(),
    project: document.getElementById('ptProject').value.trim(), date: document.getElementById('ptDate').value || undefined,
    status: document.getElementById('ptStatus').value, description: document.getElementById('ptDescription').value.trim(),
    results: document.getElementById('ptResults').value.trim(), images: ptImagesData
  };
  const id = document.getElementById('ptId').value;
  try {
    const resp = await fetch(id ? '/api/prototypes/' + id : '/api/prototypes', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); alert('Chyba: ' + (er.error || resp.status)); return; }
    closePrototypeModal(); loadPrototypes();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deletePrototype(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť prototyp?')) return;
  try { await fetch('/api/prototypes/' + id, { method: 'DELETE' }); closePrototypeModal(); loadPrototypes(); } catch { alert('Chyba'); }
}

// ==============================
// INIT
// ==============================
async function loadAppVersion() {
  const el = document.getElementById('appVersion');
  if (!el) return;
  try {
    const v = await fetch('/api/version').then(r => r.json());
    el.textContent = 'v' + v.version;
    const commit = v.commit && v.commit !== 'unknown' ? v.commit.slice(0, 7) : 'local';
    el.title = `Verzia ${v.version} · commit ${commit} · env ${v.env} · DB ${v.dbState}`;
  } catch { el.textContent = ''; }
}

// ==============================
// CHANGELOG (história zmien)
// ==============================
const CHANGELOG = [
  { v: '1.61.0', date: '14. 6. 2026', tag: 'ui', items: [
    'Zoznam projektov: krajší dizajn — každý proces aj výstupy na jednom riadku (bez zalamovania), farebné textové štítky (Predaj/Vývoj/Výstupy), elegantnejšie chevrony na tmavom pozadí.',
  ] },
  { v: '1.60.1', date: '14. 6. 2026', tag: 'ui', items: [
    'Zoznam projektov: štandardné výstupy sú teraz v jednom stĺpci pod procesmi (💼 predaj / 🛠 vývoj / 📦 výstupy).',
  ] },
  { v: '1.60.0', date: '14. 6. 2026', tag: 'ui', items: [
    'Štandardné výstupy sú teraz chevron bar (ako workflow) — tyrkysové, klik prepína hotový/nehotový (v detaile aj v zozname).',
  ] },
  { v: '1.59.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Workflow nemusí ísť postupne — klikom na ktorýkoľvek stupeň ho označíš ako hotový (aj nepostupne), opätovný klik ho odznačí.',
    'Hotové stupne sa ukladajú samostatne pre predaj aj vývoj; pozícia na boarde sa odvodzuje od najďalšieho hotového stupňa.',
  ] },
  { v: '1.58.1', date: '14. 6. 2026', tag: 'ui', items: [
    'Detail projektu: odstránená sekcia „Spojený životný cyklus (predaj → vývoj)".',
  ] },
  { v: '1.58.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Nový projekt má defaultne zapnutý predajný aj vývojový proces.',
    'Tlačidlo „🎲 Ukážkové dáta" v projektoch — vygeneruje nové testovacie projekty, každý s predajným aj vývojovým procesom a stavom výstupov.',
  ] },
  { v: '1.57.0', date: '14. 6. 2026', tag: 'ui', items: [
    'Zoznam projektov: procesy predaj a vývoj sú v jednom stĺpci pod sebou (predaj hore, vývoj dole) namiesto dvoch stĺpcov.',
  ] },
  { v: '1.56.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Zoznam projektov: filter výstupov priamo v hlavičke stĺpca „Výstupy" — dá sa filtrovať podľa konkrétneho výstupu (má hotový / chýba) aj súhrnne (všetky hotové / niektorý chýba).',
    'Lepšia čitateľnosť stĺpca Projekt (širší, názov sa nezalamuje na pol slova).',
  ] },
  { v: '1.55.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Zoznam projektov: všetky štandardné výstupy sú zobrazené ako zaškrtávacie políčka priamo v hlavnom zobrazení — dajú sa odškrtnúť bez otvárania detailu (okamžité uloženie).',
  ] },
  { v: '1.54.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Backbone: nový 1-kanálový interrogátor (S-line Scan 800, 1 kanál) ako samostatný objekt.',
    'Backbone: kombinované objekty „S-line Scan + Switch 1×16" a „S-line Scan + Splitter 1×8" — dve zariadenia natrvalo spolu (interný patchcord), aby išli vždy pokope.',
    'Backbone: konektorové spojenie a WPA-01 (vodeodolné konektorové spojenie) ako korálky na kábli s presnejším pomenovaním.',
  ] },
  { v: '1.53.1', date: '14. 6. 2026', tag: 'fix', items: [
    'Chevron procesy: dlhé názvy stupňov (napr. „Cenová ponuka") sa už nezalamujú — opravený rozbitý tvar v zozname.',
  ] },
  { v: '1.53.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Vývoj výrobkov: predvolené zobrazenie je teraz Zoznam.',
    'Zoznam ukazuje súčasne predajný aj vývojový proces (oba chevron toky) v jednom riadku.',
    'Filter podľa výstupov: všetky / len dokončené / len nedokončené.',
    'Farebné odlíšenie procesov — predaj modrá, vývoj zelená (chevrony aj ľavý pruh).',
    'Opravený „Spojený životný cyklus" — jeden riadok s vodorovným posunom namiesto rozbitého zalamovania.',
  ] },
  { v: '1.52.1', date: '14. 6. 2026', tag: 'fix', items: [
    'Detail projektu: zviditeľnené texty na tmavom pozadí (štandardné výstupy, hlavičky procesov) — predtým tmavé na tmavom.',
  ] },
  { v: '1.52.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Vývoj výrobkov: detail projektu sa otvára ako samostatná stránka (namiesto modálu) s komplexným obsahom.',
    'Stránka projektu: chevron procesy (predaj/vývoj + spojený cyklus), checklist výstupov, popis, poznámky, odkazy (viacero), detaily, súvisiace testovacie protokoly.',
    'Editovateľné odkazy projektu a popis (predtým neboli v UI); plynulé ukladanie a mazanie z detailu.',
  ] },
  { v: '1.51.0', date: '14. 6. 2026', tag: 'feat', items: [
    'FBG: nová interaktívna animácia „FBG senzor teploty a vibrácií" — konštrukcia sondy, spektrálna odozva a interogačná jednotka s konfiguráciou (teplota, amplitúda/frekvencia vibrácií, citlivosti) a predvoľbami.',
  ] },
  { v: '1.50.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Projekty: procesy zobrazené ako chevron tok (breadcrumb) — klik na stupeň ho nastaví.',
    'Predaj a vývoj môžu na projekte prebiehať SÚČASNE (paralelne) — každý má vlastný proces, zapína sa samostatne.',
    'Spojený životný cyklus: keď bežia oba procesy, modál ukáže reťaz Predaj → Vývoj (nadväzujú na seba).',
    'Kanban/Zoznam/Gantt rešpektujú zvolený proces; karta/riadok ukazuje aj paralelne bežiaci druhý proces.',
  ] },
  { v: '1.49.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Vývoj výrobkov → Projekty: prepínanie zobrazenia Kanban / Zoznam / Gantt.',
    'Každý projekt má vlastný workflow — Vývoj (Koncept→Prototyp→Testovanie→Výroba→Ukončené) alebo Predaj (Dopyt→Kvalifikácia→Cenová ponuka→Vyjednávanie→Objednávka→Uzavreté).',
    'Vývojové projekty majú status štandardných výstupov (vždy rovnaký zoznam): BOO, BOM, Datasheet web, Standard wavelength configuration, Testovací protokol, Kalibračné dáta, Technologický postup, ERP karta, Marketing — s priebehom na karte aj v zozname.',
    'Gantt projektov po mesiacoch s farbou podľa stage a čiarou „dnes"; nové pole Začiatok pre časovú os.',
  ] },
  { v: '1.48.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Backbone: klávesa Delete (alebo Backspace) zmaže vybraný komponent alebo kábel.',
    'Backbone: dvojklik na komponent alebo kábel = úprava popisu priamo na plátne (napr. „4 f @ 5m").',
  ] },
  { v: '1.47.0', date: '14. 6. 2026', tag: 'ui', items: [
    'Backbone: komponenty vykreslené ako realistické zariadenia — S-line interrogátory s LCD displejom, stavovými LED a radom FC konektorov; WCB-01 ako skriňa s vekom, skrutkami a káblovými priechodkami; splitter s vejárovým rozbočením; FBG senzor ako kapsula s mriežkou a zeleným hrotom.',
    'Tmavý (dark) režim plátna s jemnou bodkovou mriežkou — verný štýlu Sylex schémy.',
    'Vylepšená animácia toku: po kábloch putujú svetelné impulzy (fotóny) so žiarou namiesto jednoduchej čiarkovanej čiary.',
  ] },
  { v: '1.46.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Backbone editor v štýle oficiálnej Sylex schémy „FBG monitoring system" — zelený branding, reálne komponenty.',
    'Katalóg komponentov: S-line Scan/Switch/Splitter/Comp (interrogátory), WCB-01 prepojovacia skriňa, splitter, FBG senzory so zeleným hrotom.',
    'Káble môžu mať inline komponenty („korálky") — konektory a ochrany WSP-01, WCP-01, FSP-01, LCP-03, WPA-01 — pridávajú sa v paneli kábla.',
    'Uzly majú porty (konektory) a nový panel s výberom typu komponentu zoskupeným podľa kategórie.',
  ] },
  { v: '1.45.1', date: '14. 6. 2026', tag: 'fix', items: [
    'Rozbaľovacie zoznamy (combobox) majú tmavé pozadie a svetly text — predtym boli moznosti na bielom nečitateľné.',
  ] },
  { v: '1.45.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Udalosti majú koncový čas (od–do) → presné trvanie v týždeň/deň pohľade.',
    'Opakované udalosti (denne/týždenne/mesačne/ročne, voliteľne „do dátumu").',
    'Pripomienky pred udalosťou (10 min – 1 deň) ako upozornenie v appke.',
    'Filter podľa typu udalosti + čísla týždňov (ISO) v mesačnom pohľade.',
    'Týždeň/deň: prepínač „pracovné hodiny" (7–19) a upozornenie na prekrývajúce sa udalosti.',
    'Presun udalosti myšou (drag & drop) na iný deň v mesačnom pohľade.',
    'iCal export — odkaz na odoberanie kalendára v Outlooku + tlač/PDF.',
  ] },
  { v: '1.44.2', date: '13. 6. 2026', tag: 'ui', items: [
    'V zázname kalendára sa vlastník/kalendár zobrazuje len ako iniciálky (napr. Martin Múčka → MM); plné meno je v tooltipe.',
  ] },
  { v: '1.44.1', date: '13. 6. 2026', tag: 'ui', items: [
    'Informácie v zázname kalendára zlúčené do jedného riadku (čas · názov · meno) — kompaktnejšie.',
  ] },
  { v: '1.44.0', date: '13. 6. 2026', tag: 'feat', items: [
    'Kalendár prepnutý na tmavý motív.',
    'Vyhľadávanie podľa dátumu — výberom dátumu kalendár skočí na daný deň.',
    'Rovnaké udalosti pre rôznych ľudí sa zlúčia do jedného záznamu so zoznamom mien (👥) — prehľadnejšie pri viacerých kalendároch.',
  ] },
  { v: '1.43.0', date: '13. 6. 2026', tag: 'feat', items: [
    'Kalendár zobrazuje slovenské štátne sviatky (vrátane pohyblivých — Veľký piatok, Veľkonočný pondelok) výrazne červenou.',
  ] },
  { v: '1.42.1', date: '13. 6. 2026', tag: 'ui', items: [
    'Dnešný deň v kalendári je zvýraznený celým rámčekom v akcentovej farbe (nielen číslom).',
  ] },
  { v: '1.42.0', date: '13. 6. 2026', tag: 'feat', items: [
    'Kalendár má textový filter (hľadanie podľa názvu, mena, zdroja).',
    'Každý záznam v kalendári ukazuje, koho je (osoba alebo zdroj kalendára) — dôležité pri viacerých napojených kalendároch.',
  ] },
  { v: '1.41.1', date: '13. 6. 2026', tag: 'ui', items: [
    'Názvy udalostí v kalendári sa už neorezávajú — zalomia sa na celý text (bunky sa podľa potreby zväčšia).',
  ] },
  { v: '1.41.0', date: '13. 6. 2026', tag: 'ui', items: [
    'Kalendár má svetlý (Outlook-like) motív — čistejší a čitateľnejší.',
    'Viacdňové udalosti sa zobrazujú ako súvislý farebný pruh cez bunky (nie samostatne na každom dni), s naznačením pokračovania ◂ ▸.',
  ] },
  { v: '1.40.1', date: '13. 6. 2026', tag: 'ui', items: [
    'Prepracovaný mesačný kalendár v štýle Outlooku — väčšie bunky, čitateľnejšie názvy udalostí.',
    'Celodenné udalosti ako plný farebný pruh, časové ako bodka + čas + názov; číslo dňa vľavo, dnešok zvýraznený, na bunku až 5 udalostí.',
  ] },
  { v: '1.40.0', date: '11. 6. 2026', tag: 'feat', items: [
    'Nový modul Backbone — interaktívny editor optickej topológie (interrogátor · splittre · káble · senzory) s animovaným tokom svetla po vláknach.',
    'Ťahanie uzlov myšou, pridávanie a prepájanie uzlov, úprava káblov (počet vlákien @ dĺžka), auto-rozloženie, export PNG, ukladanie.',
    'Ukážková topológia CB OA77 / CB OA79 podľa reálnej schémy.',
  ] },
  { v: '1.39.0', date: '11. 6. 2026', tag: 'feat', items: [
    'Kalendár má pohľady Mesiac / Týždeň / Deň s časovou mriežkou a tlačidlami zoom (± výška hodiny).',
    'Filter podľa osoby a zdroja (Outlook) — zobrazí len vybrané udalosti.',
    'Rozbalenie dňa — klik na číslo dňa alebo „+N ďalšie" otvorí denný pohľad; prekrývajúce sa udalosti sa rozložia vedľa seba.',
  ] },
  { v: '1.38.0', date: '11. 6. 2026', tag: 'feat', items: [
    'Napojenie Outlook kalendára — cez tlačidlo „🔗 Outlook" vložíš publikovaný ICS odkaz a tvoje Outlook udalosti sa zobrazia v kalendári (len na čítanie, prerušovaný okraj).',
    'Podpora opakovaných udalostí a správny prepočet času (Európa/Bratislava); test pripojenia feedu.',
  ] },
  { v: '1.37.0', date: '11. 6. 2026', tag: 'feat', items: [
    'Úlohy sa zoskupujú podľa projektu a zákazníka (prepínač „🗂️ Zoskupiť").',
    'Projekt a zákazník majú combobox — ponúknu sa skôr použité názvy (datalist), nový názov sa zapamätá.',
    'Podúlohy (checklist) sa zobrazujú priamo v úlohách na stránke — v zozname, v zoskupení aj na kanban kartách.',
  ] },
  { v: '1.36.0', date: '10. 6. 2026', tag: 'feat', items: [
    'Toast notifikácie — namiesto vyskakovacích okien sa hlášky zobrazujú elegantne v rohu (zelená/červená podľa typu).',
    'Štýlované potvrdzovacie dialógy (Esc = zrušiť, Enter = potvrdiť) namiesto sivých okien prehliadača.',
    'Tabuľky (zmenové výkazy, expedované zákazky) sa dajú triediť klikom na hlavičku a hlavička ostáva pri skrolovaní.',
    'Drobková navigácia (breadcrumbs) vo WIKI — WIKI › Kategória › Článok.',
    'Upozornenie na neuložené zmeny pri zatváraní formulárov (úloha, zákazka, postup).',
  ] },
  { v: '1.35.4', date: '10. 6. 2026', tag: 'fix', items: [
    'Nadpisy kategórií v sidebari sa zobrazujú v plnej výške (už nie sú orezané zvrchu) a s lepším kontrastom.',
    'V sidebar layoute sú verzia a odhlásenie zarovnané úplne doprava.',
  ] },
  { v: '1.35.2', date: '10. 6. 2026', tag: 'ui', items: [
    'Bočné menu rozdelené do kategórií s oddeľovacími čiarami (Znalosti · Výroba · Organizácia · Vedenie & systém).',
    'Hlavička sprehľadnená — odstránený indikátor „ONLINE"; verzia aplikácie a odhlásenie presunuté úplne doprava.',
  ] },
  { v: '1.35.1', date: '10. 6. 2026', tag: 'ui', items: [
    'Bočné menu (sidebar) zobrazuje plné názvy modulov namiesto skratiek (napr. „Vyťaženie technológií", „Plánovanie výroby", „Riadenie výroby", „Pracovné postupy", „Administrácia").',
    'Bočný panel mierne rozšírený, aby sa dlhé názvy zmestili.',
  ] },
  { v: '1.35.0', date: '10. 6. 2026', tag: 'feat', items: [
    'Nová stránka Changelog v menu — história všetkých zmien; verzia v hlavičke je klikateľná.',
  ] },
  { v: '1.34.3', date: '10. 6. 2026', tag: 'fix', items: [
    'Senzor (teplota/vlhkosť) presunutý z plávajúceho rohového widgetu do nenápadného tlačidla v hlavičke (ikonka teplomera + online/offline bodka). Klik otvorí stránku Senzory s grafom.',
    'Chatbot vrátený do pravého dolného rohu — už sa neprekrýva so senzorom.',
  ] },
  { v: '1.34.2', date: '10. 6. 2026', tag: 'fix', items: [
    'Tlačidlo „Pomoc" sa už neprekrýva s pätičkou bočného panela (sidebar layout); na mobile sa vracia doľava.',
  ] },
  { v: '1.34.1', date: '10. 6. 2026', tag: 'fix', items: [
    'Na prihlasovacej obrazovke sa skryjú plávajúce prvky (Pomoc, chatbot, senzor), ktoré predtým prekrývali login.',
  ] },
  { v: '1.34.0', date: '10. 6. 2026', tag: 'feat', items: [
    'Operačný Gantt sa naplní dátami — technologické postupy pridané pre všetky výrobky.',
    'Viac výrobných zákaziek a viac aktívnych v rozvrhu výroby.',
    'Nový zoznam „Expedované zákazky a objednávky" s vyhľadávaním a súčtami.',
  ] },
  { v: '1.33.0', date: '10. 6. 2026', tag: 'feat', items: [
    'Procesný Gantt: os Y = operácie (procesy), os X = čas; operácie nadväzujú na seba (finish-to-start) so spojnicami závislostí.',
    'Prepínač pohľadov Procesy / Pracoviská; adaptívna časová os (hodiny / dni).',
  ] },
  { v: '1.32.0', date: '10. 6. 2026', tag: 'feat', items: [
    'Operačný Gantt „rozvrh operácií × pracoviská" — spája technológie a procesy: konečná kapacita pracovísk, farby a tok zákazky, identifikácia úzkeho miesta.',
  ] },
  { v: '1.31.0', date: '10. 6. 2026', tag: 'major', items: [
    'Nový modul Riadenie výroby (MES): dielenská tabuľa so živým stavom pracovísk, OEE, prestoje, zmätkovitosť, zmenové výkazy.',
    'Normované operácie / technologické postupy (t/ks, t/výrobok, linka) + kalkulačka kapacity pre dávku.',
    'Manažment: predaj, tržby a ziskovosť — KPI a grafy (marža, mesačný trend, top zákazníci a produkty).',
    'Úlohy: podúlohy (checklist) s automatickým prepočtom progresu.',
    'Vzhľad: nové vizuálne témy sidebaru Aurora a Sunset; vylepšenia prístupnosti (focus-visible, redukcia pohybu).',
    'Oprava: tmavý text na tmavom pozadí v manažment analytikách.',
  ] },
  { v: '1.30.0', date: 'skôr', tag: 'base', items: [
    'Východisková verzia: WIKI, Kalendár, Postupy, Návody, FBG, Vývoj, Vyťaženie technológií, Plánovanie výroby, Úlohy, CRM, Manažment, Admin.',
  ] },
];
const CL_TAG = {
  major: { l: 'Veľká aktualizácia', c: '#10b981' },
  feat:  { l: 'Novinka', c: '#00d4ff' },
  fix:   { l: 'Oprava', c: '#f59e0b' },
  ui:    { l: 'Vzhľad', c: '#8b5cf6' },
  base:  { l: 'Základ', c: '#64748b' },
};
function renderChangelog() {
  const el = document.getElementById('changelogList'); if (!el) return;
  const cur = document.getElementById('clCurrentVer');
  if (cur) cur.textContent = 'v' + (CHANGELOG[0]?.v || '');
  el.innerHTML = CHANGELOG.map((e, i) => {
    const t = CL_TAG[e.tag] || CL_TAG.feat;
    return `<div class="cl-entry${i === 0 ? ' cl-latest' : ''}">
      <div class="cl-side"><span class="cl-dot" style="background:${t.c}"></span>${i < CHANGELOG.length - 1 ? '<span class="cl-line"></span>' : ''}</div>
      <div class="cl-body">
        <div class="cl-head">
          <span class="cl-ver">v${e.v}</span>
          <span class="cl-tag" style="background:${t.c}22;color:${t.c};border:1px solid ${t.c}55">${t.l}</span>
          ${i === 0 ? '<span class="cl-now">aktuálna</span>' : ''}
          <span class="cl-date">${e.date}</span>
        </div>
        <ul class="cl-items">${e.items.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul>
      </div>
    </div>`;
  }).join('');
}

// ==============================
// HODINY / DÁTUM / MENINY
// ==============================
const DT_DAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const DT_MONTHS = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
function updateDateTime() {
  const now = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const clock = document.getElementById('dtClock');
  if (clock) clock.textContent = `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`;
  const dateEl = document.getElementById('dtDate');
  if (dateEl) dateEl.textContent = `${DT_DAYS[now.getDay()]}, ${now.getDate()}. ${DT_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const menEl = document.getElementById('dtMeniny');
  if (menEl) menEl.textContent = (window.getMeniny ? window.getMeniny(now) : '') || '—';
}

// ==============================
// ÚLOHY (per-user)
// ==============================
let tasksData = [];
let taskFilter = 'open';
let taskView = 'list';
let taskGroup = true;   // zoskupiť podľa projektu + zákazníka
let _dragTaskId = null;
let tkSubtasks = [];   // pracovná kópia podúloh v modale
const TK_PRIO = { low: { l: 'Nízka', c: '#64748b' }, normal: { l: 'Normálna', c: '#3b82f6' }, high: { l: 'Vysoká', c: '#ef4444' } };
const TK_STATUS = [{ key: 'todo', label: 'Čaká' }, { key: 'inprogress', label: 'Prebieha' }, { key: 'done', label: 'Hotové' }];
function taskStatusOf(t) { return t.status || (t.done ? 'done' : 'todo'); }

async function loadTasks() {
  const sub = document.getElementById('tasksSub');
  if (sub && CURRENT_USER) sub.textContent = 'Osobný zoznam úloh — ' + (CURRENT_USER.name || CURRENT_USER.username);
  try { tasksData = await fetch('/api/tasks').then(r => r.json()); if (!Array.isArray(tasksData)) tasksData = []; }
  catch { tasksData = []; }
  fillTaskDatalists();
  renderTasks();
}
// Combobox: ponuka projektov a zákazníkov z uložených úloh
function fillTaskDatalists() {
  const uniq = (key) => [...new Set(tasksData.map(t => (t[key] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'));
  const pl = document.getElementById('tkProjectList'); if (pl) pl.innerHTML = uniq('project').map(x => `<option value="${escHtml(x)}">`).join('');
  const cl = document.getElementById('tkCustomerList'); if (cl) cl.innerHTML = uniq('customer').map(x => `<option value="${escHtml(x)}">`).join('');
}
function toggleTaskGroup() {
  taskGroup = !taskGroup;
  document.getElementById('taskGroupBtn')?.classList.toggle('active', taskGroup);
  renderTasks();
}
function setTaskFilter(f) {
  taskFilter = f;
  document.querySelectorAll('.tasks-filter').forEach(b => b.classList.toggle('active', b.dataset.tfilter === f));
  renderTasks();
}
function setTaskView(v) {
  taskView = v;
  document.querySelectorAll('.tasks-view').forEach(b => b.classList.toggle('active', b.dataset.tview === v));
  document.querySelector('.tasks-filters')?.classList.toggle('hidden', v === 'kanban');
  document.getElementById('taskGroupBtn')?.classList.toggle('hidden', v === 'kanban');
  document.querySelector('.tasks-inner')?.classList.toggle('tasks-wide', v === 'kanban');
  renderTasks();
}
function taskOverdue(t) { return !t.done && t.due && new Date(t.due) < new Date(new Date().toDateString()); }

// ── Spoločné kúsky kartičiek ──────────────────────────────────────────────────
function taskChipsHtml(t) {
  const chips = [];
  if (t.project)  chips.push(`<span class="task-chip task-chip-pj">🗂️ ${escHtml(t.project)}</span>`);
  if (t.customer) chips.push(`<span class="task-chip task-chip-cust">🏢 ${escHtml(t.customer)}</span>`);
  return chips.length ? `<div class="task-chips">${chips.join('')}</div>` : '';
}
function taskProgressHtml(t) {
  const p = Math.max(0, Math.min(100, t.progress || 0));
  const cls = p >= 100 ? 'pf-done' : p >= 50 ? 'pf-mid' : 'pf-lo';
  return `<div class="task-prog"><div class="task-prog-track"><div class="task-prog-fill ${cls}" style="width:${p}%"></div></div><span class="task-prog-val">${p}%</span></div>`;
}
function taskMetaHtml(t) {
  const prio = TK_PRIO[t.priority] || TK_PRIO.normal;
  const od = taskOverdue(t);
  const parts = [`<span class="task-prio">${prio.l}</span>`];
  if (t.due) parts.push(`<span class="${od ? 'task-od' : ''}">📅 ${fmtDate(t.due)}${od ? ' — po termíne' : ''}</span>`);
  if (t.subtasks && t.subtasks.length) {
    const done = t.subtasks.filter(s => s.done).length;
    parts.push(`<span class="task-subbadge ${done === t.subtasks.length ? 'all' : ''}" title="Podúlohy">☑ ${done}/${t.subtasks.length}</span>`);
  }
  if (t.createdAt) parts.push(`<span class="task-created" title="Dátum pridania">➕ ${fmtDate(t.createdAt)}</span>`);
  return `<div class="task-meta">${parts.join('')}</div>`;
}

// Inline checklist podúloh (zoznamový pohľad) — klik prepína stav
function taskSubInlineHtml(t) {
  if (!t.subtasks || !t.subtasks.length) return '';
  return `<div class="task-sub-inline" onclick="event.stopPropagation()">${t.subtasks.map(s => `
    <label class="task-sub-il ${s.done ? 'done' : ''}">
      <input type="checkbox" ${s.done ? 'checked' : ''} onclick="event.stopPropagation();toggleSubtaskInline('${t._id}','${s._id}')">
      <span>${escHtml(s.title)}</span>
    </label>`).join('')}</div>`;
}

function renderTasks() {
  const listEl = document.getElementById('tasksList');
  const kanbanEl = document.getElementById('tasksKanban');
  if (!listEl || !kanbanEl) return;
  if (taskView === 'kanban') {
    listEl.classList.add('hidden'); kanbanEl.classList.remove('hidden');
    renderTaskKanban();
  } else {
    kanbanEl.classList.add('hidden'); listEl.classList.remove('hidden');
    renderTaskList();
  }
}

// Vnútro riadka úlohy (zdieľané pre plochý aj zoskupený pohľad)
function taskRowClass(t) { return 'task-row' + (t.done ? ' task-done' : '') + (taskOverdue(t) ? ' task-overdue' : ''); }
function taskRowInner(t, withGrip) {
  return `
      ${withGrip ? '<span class="task-grip" title="Potiahni na zmenu poradia">⠿</span>' : '<span class="task-grip task-grip-off">•</span>'}
      <button class="task-check" onclick="toggleTask('${t._id}', ${t.done ? 'false' : 'true'})" title="${t.done ? 'Označiť ako nehotové' : 'Označiť ako hotové'}">${t.done ? '✓' : ''}</button>
      <div class="task-body" onclick="openTaskModal(tasksData.find(x=>x._id==='${t._id}'))">
        <div class="task-title">${escHtml(t.title)}</div>
        ${taskChipsHtml(t)}
        ${taskMetaHtml(t)}
        ${(t.progress || taskStatusOf(t) === 'inprogress' || (t.subtasks && t.subtasks.length)) ? taskProgressHtml(t) : ''}
        ${t.note ? `<div class="task-note">📝 ${escHtml(t.note)}</div>` : ''}
        ${t.description ? `<div class="task-desc">${escHtml(t.description)}</div>` : ''}
        ${taskSubInlineHtml(t)}
      </div>
      <button class="admin-icon-btn danger" onclick="deleteTask('${t._id}')" title="Odstrániť">✕</button>`;
}

function renderTaskList() {
  const el = document.getElementById('tasksList'); if (!el) return;
  let items = tasksData.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  if (taskFilter === 'open') items = items.filter(t => !t.done);
  else if (taskFilter === 'done') items = items.filter(t => t.done);
  el.ondragover = null; el.ondrop = null;
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne úlohy v tomto filtri.</div>'; return; }

  if (taskGroup) { renderTaskListGrouped(el, items); return; }

  // plochý pohľad + drag&drop preusporiadanie
  el.innerHTML = '';
  items.forEach(t => {
    const row = document.createElement('div');
    row.className = taskRowClass(t);
    row.style.setProperty('--prio', (TK_PRIO[t.priority] || TK_PRIO.normal).c);
    row.dataset.tid = t._id;
    row.draggable = true;
    row.addEventListener('dragstart', (e) => { _dragTaskId = t._id; row.classList.add('kanban-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', t._id); } catch (_) {} });
    row.addEventListener('dragend', () => { _dragTaskId = null; row.classList.remove('kanban-dragging'); });
    row.innerHTML = taskRowInner(t, true);
    el.appendChild(row);
  });
  el.ondragover = (e) => {
    if (!_dragTaskId) return; e.preventDefault();
    const after = getTaskDragAfter(el, e.clientY);
    const drag = el.querySelector('.kanban-dragging'); if (!drag) return;
    if (after == null) el.appendChild(drag); else el.insertBefore(drag, after);
  };
  el.ondrop = (e) => { e.preventDefault(); persistTaskOrderFromDom(); };
}

// Zoskupenie úloh podľa projektu + zákazníka
function renderTaskListGrouped(el, items) {
  const groups = {};
  items.forEach(t => {
    const p = (t.project || '').trim(), c = (t.customer || '').trim();
    const key = p + '' + c;
    (groups[key] = groups[key] || { project: p, customer: c, items: [] }).items.push(t);
  });
  const arr = Object.values(groups).sort((a, b) => {
    const ax = (a.project || a.customer) ? 0 : 1, bx = (b.project || b.customer) ? 0 : 1;
    if (ax !== bx) return ax - bx;
    return (a.project || '').localeCompare(b.project || '', 'sk') || (a.customer || '').localeCompare(b.customer || '', 'sk');
  });
  el.innerHTML = arr.map(g => {
    const label = [g.project ? `🗂️ ${escHtml(g.project)}` : '', g.customer ? `🏢 ${escHtml(g.customer)}` : ''].filter(Boolean).join(' · ') || '📋 Bez projektu / zákazníka';
    const open = g.items.filter(t => !t.done).length;
    const rows = g.items.sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(t => `<div class="${taskRowClass(t)}" style="--prio:${(TK_PRIO[t.priority] || TK_PRIO.normal).c}" data-tid="${t._id}">${taskRowInner(t, false)}</div>`).join('');
    return `<div class="task-group">
      <div class="task-group-hdr"><span class="task-group-name">${label}</span><span class="task-group-count">${open} / ${g.items.length}</span></div>
      <div class="task-group-body">${rows}</div>
    </div>`;
  }).join('');
}

function renderTaskKanban() {
  const board = document.getElementById('tasksKanban'); if (!board) return;
  board.innerHTML = '';
  TK_STATUS.forEach(col => {
    const colEl = document.createElement('div');
    colEl.className = 'kanban-col';
    const items = tasksData.filter(t => taskStatusOf(t) === col.key).sort((a, b) => (a.order || 0) - (b.order || 0));
    colEl.innerHTML = `<div class="kanban-col-hdr">${col.label} <span class="kanban-count">${items.length}</span></div>`;
    const body = document.createElement('div'); body.className = 'kanban-col-body'; body.dataset.status = col.key;
    body.addEventListener('dragover', (e) => {
      if (!_dragTaskId) return; e.preventDefault();
      const after = getTaskDragAfter(body, e.clientY);
      const drag = document.querySelector('.kanban-dragging'); if (!drag) return;
      if (after == null) body.appendChild(drag); else body.insertBefore(drag, after);
      colEl.classList.add('kanban-col-drop');
    });
    body.addEventListener('dragleave', (e) => { if (!body.contains(e.relatedTarget)) colEl.classList.remove('kanban-col-drop'); });
    body.addEventListener('drop', (e) => { e.preventDefault(); document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('kanban-col-drop')); persistTaskOrderFromDom(); });
    items.forEach(t => body.appendChild(taskKanbanCard(t)));
    colEl.appendChild(body);
    board.appendChild(colEl);
  });
}

function taskKanbanCard(t) {
  const prio = TK_PRIO[t.priority] || TK_PRIO.normal;
  const od = taskOverdue(t);
  const card = document.createElement('div');
  card.className = 'kanban-card task-kanban-card' + (od ? ' task-overdue' : '');
  card.style.setProperty('--prio', prio.c);
  card.draggable = true;
  card.dataset.tid = t._id;
  card.addEventListener('dragstart', (e) => { _dragTaskId = t._id; card.classList.add('kanban-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', t._id); } catch (_) {} });
  card.addEventListener('dragend', () => { _dragTaskId = null; card.classList.remove('kanban-dragging'); document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('kanban-col-drop')); });
  card.innerHTML = `
    <div class="kanban-card-top" onclick="openTaskModal(tasksData.find(x=>x._id==='${t._id}'))">
      <span class="kanban-card-title"><span class="kanban-grip" title="Potiahni">⠿</span>${escHtml(t.title)}</span>
    </div>
    ${taskChipsHtml(t)}
    ${taskProgressHtml(t)}
    ${taskMetaHtml(t)}
    ${t.note ? `<div class="task-note">📝 ${escHtml(t.note)}</div>` : ''}
    ${taskSubInlineHtml(t)}
    <div class="kanban-card-actions">
      <span class="task-prio" style="color:${prio.c}">${prio.l}</span>
      <button onclick="deleteTask('${t._id}')" title="Odstrániť">✕</button>
    </div>`;
  return card;
}

function getTaskDragAfter(container, y) {
  const els = [...container.querySelectorAll('.kanban-card:not(.kanban-dragging), .task-row:not(.kanban-dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity }).element || null;
}

async function persistTaskOrderFromDom() {
  _dragTaskId = null;
  const payload = [];
  if (taskView === 'kanban') {
    document.querySelectorAll('#tasksKanban .kanban-col-body').forEach(body => {
      const status = body.dataset.status;
      [...body.querySelectorAll('.kanban-card')].forEach(card => payload.push({ id: card.dataset.tid, order: payload.length, status }));
    });
  } else {
    [...document.querySelectorAll('#tasksList .task-row')].forEach(row => payload.push({ id: row.dataset.tid, order: payload.length }));
  }
  // optimistický lokálny update
  payload.forEach(p => {
    const t = tasksData.find(x => x._id === p.id);
    if (!t) return;
    t.order = p.order;
    if (p.status) { t.status = p.status; t.done = p.status === 'done'; }
  });
  try { await fetch('/api/tasks/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: payload }) }); }
  catch { /* ignore — re-render aj tak */ }
  renderTasks();
  loadNotif();
}

async function toggleTask(id, done) {
  try { await fetch('/api/tasks/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) }); loadTasks(); loadNotif(); }
  catch { alert('Chyba'); }
}
function openTaskModal(t = null) {
  const e = t && typeof t === 'object';
  document.getElementById('tkModalTitle').textContent = e ? 'Upraviť úlohu' : 'Nová úloha';
  document.getElementById('tkId').value = e ? t._id : '';
  document.getElementById('tkTitle').value = e ? (t.title || '') : '';
  document.getElementById('tkProject').value = e ? (t.project || '') : '';
  document.getElementById('tkCustomer').value = e ? (t.customer || '') : '';
  document.getElementById('tkDue').value = e && t.due ? String(t.due).slice(0, 10) : '';
  document.getElementById('tkPriority').value = e ? (t.priority || 'normal') : 'normal';
  document.getElementById('tkStatus').value = e ? taskStatusOf(t) : 'todo';
  const prog = e ? (t.progress || 0) : 0;
  document.getElementById('tkProgress').value = prog;
  document.getElementById('tkProgressVal').textContent = prog;
  document.getElementById('tkDesc').value = e ? (t.description || '') : '';
  document.getElementById('tkNote').value = e ? (t.note || '') : '';
  tkSubtasks = e && Array.isArray(t.subtasks) ? t.subtasks.map(s => ({ title: s.title, done: !!s.done })) : [];
  renderSubtaskEditor();
  document.getElementById('tkDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('taskModal').classList.remove('hidden');
  modalSnapshot('taskModal');
}
function closeTaskModal() { modalGuardClose('taskModal'); }

// ── Podúlohy v modale ─────────────────────────────────────────────────────────
function renderSubtaskEditor() {
  const list = document.getElementById('tkSubList');
  const cnt = document.getElementById('tkSubCount');
  const hint = document.getElementById('tkProgHint');
  const slider = document.getElementById('tkProgress');
  if (!list) return;
  if (!tkSubtasks.length) {
    list.innerHTML = '<div class="tk-sub-empty">Žiadne podúlohy — pridaj checklist nižšie.</div>';
  } else {
    list.innerHTML = tkSubtasks.map((s, i) => `
      <div class="tk-sub-item ${s.done ? 'done' : ''}">
        <button type="button" class="tk-sub-check" onclick="toggleSubtaskEditor(${i})" title="Hotovo / nehotovo">${s.done ? '✓' : ''}</button>
        <input type="text" class="tk-sub-title" value="${escHtml(s.title)}" oninput="updateSubtaskTitle(${i}, this.value)">
        <button type="button" class="tk-sub-del" onclick="removeSubtask(${i})" title="Odstrániť">✕</button>
      </div>`).join('');
  }
  const done = tkSubtasks.filter(s => s.done).length;
  if (cnt) cnt.textContent = tkSubtasks.length ? `(${done}/${tkSubtasks.length} hotových)` : '';
  // ak sú podúlohy, progres sa odvodzuje z nich → slider zamkni a ukáž odvodenú hodnotu
  if (tkSubtasks.length) {
    const p = Math.round(done / tkSubtasks.length * 100);
    if (slider) { slider.value = p; slider.disabled = true; }
    document.getElementById('tkProgressVal').textContent = p;
    if (hint) hint.textContent = 'Progres sa počíta automaticky z podúloh';
  } else {
    if (slider) slider.disabled = false;
    if (hint) hint.textContent = '';
  }
}
function addSubtask() {
  const inp = document.getElementById('tkSubInput');
  const v = (inp.value || '').trim();
  if (!v) return;
  tkSubtasks.push({ title: v, done: false });
  inp.value = ''; inp.focus();
  renderSubtaskEditor();
}
function toggleSubtaskEditor(i) { if (tkSubtasks[i]) { tkSubtasks[i].done = !tkSubtasks[i].done; renderSubtaskEditor(); } }
function updateSubtaskTitle(i, val) { if (tkSubtasks[i]) tkSubtasks[i].title = val; }
function removeSubtask(i) { tkSubtasks.splice(i, 1); renderSubtaskEditor(); }

// Prepnutie podúlohy priamo v zozname úloh (mimo modalu)
async function toggleSubtaskInline(taskId, subId) {
  const t = tasksData.find(x => x._id === taskId); if (!t) return;
  const sub = (t.subtasks || []).find(s => s._id === subId); if (!sub) return;
  sub.done = !sub.done;
  const subtasks = t.subtasks.map(s => ({ title: s.title, done: !!s.done }));
  try {
    const r = await fetch('/api/tasks/' + taskId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subtasks }) });
    if (r.ok) { const upd = await r.json(); Object.assign(t, upd); }
  } catch {}
  renderTasks(); loadNotif();
}
async function saveTask() {
  const title = document.getElementById('tkTitle').value.trim();
  if (!title) { alert('Zadajte názov úlohy'); return; }
  const body = {
    title, due: document.getElementById('tkDue').value || null,
    priority: document.getElementById('tkPriority').value,
    status: document.getElementById('tkStatus').value,
    progress: Number(document.getElementById('tkProgress').value) || 0,
    project: document.getElementById('tkProject').value.trim(),
    customer: document.getElementById('tkCustomer').value.trim(),
    note: document.getElementById('tkNote').value.trim(),
    description: document.getElementById('tkDesc').value.trim(),
    subtasks: tkSubtasks.filter(s => (s.title || '').trim()).map(s => ({ title: s.title.trim(), done: !!s.done }))
  };
  const id = document.getElementById('tkId').value;
  try {
    const resp = await fetch(id ? '/api/tasks/' + id : '/api/tasks', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); alert('Chyba: ' + (er.error || resp.status)); return; }
    modalSnapshot('taskModal'); closeTaskModal(); loadTasks(); loadNotif();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteTask(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť úlohu?')) return;
  try { await fetch('/api/tasks/' + id, { method: 'DELETE' }); modalSnapshot('taskModal'); closeTaskModal(); loadTasks(); loadNotif(); }
  catch { alert('Chyba'); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  VYŤAŽENIE TECHNOLÓGIÍ — rezervačný kalendár komôr a pecí (Gantt timeline)
// ══════════════════════════════════════════════════════════════════════════════
let utilEquipment = [];
let utilBookings = [];
let utilRangeDays = 7;
let utilStart = null;            // Date — začiatok okna (00:00)
let utilFilterEq = null;         // _id zariadenia — filter Ganttu (null = všetky)
const UTIL_STATUS = { planned: { l: 'Plánované', c: '#64748b' }, running: { l: 'Prebieha', c: '#10b981' }, done: { l: 'Dokončené', c: '#3b82f6' }, cancelled: { l: 'Zrušené', c: '#ef4444' } };
const UTIL_TYPE_IMG = { chamber: '/assets/equipment/chamber.svg', oven: '/assets/equipment/oven.svg', other: '/assets/equipment/oven.svg' };

function utilDayStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function utilWindowEnd() { return new Date(utilStart.getTime() + utilRangeDays * 864e5); }
function toLocalInput(d) { d = new Date(d); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function utilDurStr(ms) {
  const h = ms / 36e5;
  if (h < 24) return (Math.round(h * 10) / 10) + ' h';
  const d = Math.floor(h / 24), rh = Math.round(h - d * 24);
  return d + ' d' + (rh ? ' ' + rh + ' h' : '');
}

async function loadUtil() {
  if (!utilStart) utilStart = utilDayStart(new Date());
  document.getElementById('utilRangeSel').value = String(utilRangeDays);
  try {
    const from = utilStart.toISOString(), to = utilWindowEnd().toISOString();
    const [eq, bk] = await Promise.all([
      fetch('/api/equipment').then(r => r.json()).catch(() => []),
      fetch(`/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(r => r.json()).catch(() => [])
    ]);
    utilEquipment = Array.isArray(eq) ? eq.filter(e => e.active !== false) : [];
    utilBookings = Array.isArray(bk) ? bk : [];
  } catch { utilEquipment = []; utilBookings = []; }
  renderUtil();
}
async function seedUtilData() {
  if (!await uiConfirm('Vygenerovať náhodné ukážkové rezervácie na najbližší mesiac?\nNahradia sa len predošlé ukážkové dáta — reálne rezervácie ostanú.')) return;
  try {
    const r = await fetch('/api/admin/seed-bookings', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { alert('Chyba: ' + (d.error || r.status)); return; }
    utilToday();
    setTimeout(() => alert('Hotovo — vytvorených ' + d.inserted + ' rezervácií pre ' + d.equipment + ' zariadení.'), 200);
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
function utilShift(dir) { utilStart = new Date(utilStart.getTime() + dir * utilRangeDays * 864e5); loadUtil(); }
function utilToday() { utilStart = utilDayStart(new Date()); loadUtil(); }
function utilSetRange(v) { utilRangeDays = Math.max(1, parseInt(v) || 7); loadUtil(); }

function renderUtil() {
  // ak filtrované zariadenie už neexistuje, zruš filter
  if (utilFilterEq && !utilEquipment.some(e => e._id === utilFilterEq)) utilFilterEq = null;
  renderUtilLabel();
  renderUtilFilterChip();
  renderUtilStats();
  renderUtilGantt();
}
function utilSetFilter(id) {
  utilFilterEq = (id && utilFilterEq === id) ? null : (id || null);
  renderUtil();
}
function renderUtilFilterChip() {
  const chip = document.getElementById('utilFilterChip'); if (!chip) return;
  if (!utilFilterEq) { chip.classList.add('hidden'); return; }
  const eq = utilEquipment.find(e => e._id === utilFilterEq);
  if (!eq) { chip.classList.add('hidden'); return; }
  chip.classList.remove('hidden');
  chip.innerHTML = `🔍 ${escHtml(eq.name)} <span class="ufc-x">✕</span>`;
}
function renderUtilLabel() {
  const el = document.getElementById('utilRangeLabel'); if (!el) return;
  const end = new Date(utilWindowEnd().getTime() - 1);
  el.textContent = `${fmtDate(utilStart)} – ${fmtDate(end)}`;
}

function renderUtilStats() {
  const el = document.getElementById('utilStats'); if (!el) return;
  const winMs = utilRangeDays * 864e5;
  const ws = utilStart.getTime(), we = utilWindowEnd().getTime();
  el.innerHTML = utilEquipment.map(eq => {
    const bs = utilBookings.filter(b => (b.equipment?._id || b.equipment) === eq._id && b.status !== 'cancelled');
    let used = 0; bs.forEach(b => { const s = Math.max(new Date(b.start).getTime(), ws), e = Math.min(new Date(b.end).getTime(), we); if (e > s) used += e - s; });
    const pct = Math.round(used / winMs * 100);
    const cls = pct >= 80 ? 'hi' : pct >= 40 ? 'mid' : 'lo';
    return `<div class="util-stat${utilFilterEq === eq._id ? ' active' : ''}" onclick="utilSetFilter('${eq._id}')" title="Zobraziť len toto zariadenie v časovej osi">
      <div class="util-stat-top"><img src="${UTIL_TYPE_IMG[eq.type] || UTIL_TYPE_IMG.other}" class="util-stat-img" alt=""><div>
        <div class="util-stat-name">${escHtml(eq.name)}</div>
        <div class="util-stat-code">${escHtml(eq.code || '')}</div></div></div>
      <div class="util-stat-bar"><div class="util-stat-fill us-${cls}" style="width:${Math.min(100, pct)}%"></div></div>
      <div class="util-stat-meta"><span><strong>${pct}%</strong> vyťaženie</span><span>${utilDurStr(used)} · ${bs.length} ${bs.length === 1 ? 'rezervácia' : (bs.length >= 2 && bs.length <= 4 ? 'rezervácie' : 'rezervácií')}</span></div>
    </div>`;
  }).join('') || '<div class="proc-empty">Žiadne zariadenia. Pridaj ich cez „⚙ Zariadenia".</div>';
}

function renderUtilGantt() {
  const wrap = document.getElementById('utilGantt'); if (!wrap) return;
  const ws = utilStart.getTime(), winMs = utilRangeDays * 864e5;
  const days = utilRangeDays;
  // hlavička dní
  let head = '<div class="ug-corner">Zariadenie</div><div class="ug-days">';
  for (let i = 0; i < days; i++) {
    const d = new Date(ws + i * 864e5);
    const wd = d.getDay(); const weekend = (wd === 0 || wd === 6);
    head += `<div class="ug-day${weekend ? ' ug-weekend' : ''}" style="left:${i / days * 100}%;width:${100 / days}%">
      <span class="ug-day-wd">${['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][wd]}</span>
      <span class="ug-day-d">${d.getDate()}.${d.getMonth() + 1}.</span></div>`;
  }
  head += '</div>';

  // riadky (voliteľne filtrované na jedno zariadenie)
  const eqList = utilFilterEq ? utilEquipment.filter(e => e._id === utilFilterEq) : utilEquipment;
  let rows = '';
  eqList.forEach(eq => {
    const bs = utilBookings.filter(b => (b.equipment?._id || b.equipment) === eq._id)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    const laneEnds = [];
    bs.forEach(b => {
      const s = new Date(b.start).getTime(), e = new Date(b.end).getTime();
      let lane = laneEnds.findIndex(end => s >= end);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); } else laneEnds[lane] = e;
      b._lane = lane;
    });
    const lanes = Math.max(1, laneEnds.length);
    const rowH = lanes * 30 + 8;
    // gridlines
    let grid = '';
    for (let i = 0; i < days; i++) {
      const d = new Date(ws + i * 864e5); const weekend = (d.getDay() === 0 || d.getDay() === 6);
      grid += `<div class="ug-cell${weekend ? ' ug-weekend' : ''}" style="left:${i / days * 100}%;width:${100 / days}%"></div>`;
    }
    // bars
    let bars = '';
    bs.forEach(b => {
      const s = Math.max(new Date(b.start).getTime(), ws), e = Math.min(new Date(b.end).getTime(), ws + winMs);
      if (e <= s) return;
      const left = (s - ws) / winMs * 100, width = (e - s) / winMs * 100;
      const st = UTIL_STATUS[b.status] || UTIL_STATUS.planned;
      const dur = utilDurStr(new Date(b.end) - new Date(b.start));
      const tip = `${b.title}${b.order ? ' · ' + b.order : ''}${b.customer ? ' · ' + b.customer : ''}\n${fmtDateTime(b.start)} → ${fmtDateTime(b.end)} (${dur})${b.profile ? '\n' + b.profile : ''}`;
      bars += `<div class="ug-bar ug-st-${b.status}" style="left:${left}%;width:${Math.max(width, 1.5)}%;top:${b._lane * 30 + 4}px;background:${st.c};border-left:3px solid ${eq.color || '#0891b2'}"
        title="${escHtml(tip)}" onclick="event.stopPropagation(); openBookingModal(utilBookings.find(x=>x._id==='${b._id}'))">
        <span class="ug-bar-lbl">${escHtml(b.title)}${b.order ? ' · ' + escHtml(b.order) : ''}</span></div>`;
    });
    rows += `<div class="ug-row" style="height:${rowH}px">
      <div class="ug-eq" onclick="utilSetFilter('${eq._id}')" title="Filtrovať len toto zariadenie"><img src="${UTIL_TYPE_IMG[eq.type] || UTIL_TYPE_IMG.other}" class="ug-eq-img" alt=""><div class="ug-eq-txt"><span class="ug-eq-name">${escHtml(eq.name)}</span><span class="ug-eq-code">${escHtml(eq.code || '')}</span></div></div>
      <div class="ug-track" data-eqid="${eq._id}" onclick="utilTrackClick(event, '${eq._id}')">${grid}${bars}</div>
    </div>`;
  });
  if (!utilEquipment.length) rows = '<div class="proc-empty" style="margin:20px">Žiadne zariadenia.</div>';

  // čiara "teraz"
  const now = Date.now(); let nowLine = '';
  if (now >= ws && now <= ws + winMs) {
    const leftPx = `calc(180px + (100% - 180px) * ${(now - ws) / winMs})`;
    nowLine = `<div class="ug-now" style="left:${leftPx}"></div>`;
  }
  wrap.innerHTML = `<div class="ug-head">${head}</div><div class="ug-body">${rows}</div>${nowLine}`;
  // Minimálna šírka podľa počtu dní → pri 14/30 dňoch vznikne horizontálne scrollovanie
  const dayW = days <= 7 ? 96 : days <= 14 ? 78 : 58;
  wrap.style.minWidth = (180 + days * dayW) + 'px';
}

function utilTrackClick(e, eqId) {
  if (e.target.closest('.ug-bar')) return;
  const track = e.currentTarget;
  const rect = track.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  let t = new Date(utilStart.getTime() + ratio * utilRangeDays * 864e5);
  t.setMinutes(0, 0, 0); // zarovnaj na hodinu
  openBookingModal(null, eqId, t);
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function utilEqOptions(sel) {
  const s = document.getElementById('bkEquipment'); if (!s) return;
  s.innerHTML = utilEquipment.map(eq => `<option value="${eq._id}">${escHtml(eq.name)}${eq.code ? ' (' + escHtml(eq.code) + ')' : ''}</option>`).join('');
  if (sel) s.value = sel;
}
function openBookingModal(b = null, presetEq = null, presetStart = null) {
  if (!utilEquipment.length) { alert('Najprv pridaj aspoň jedno zariadenie (⚙ Zariadenia).'); return; }
  const e = b && typeof b === 'object';
  document.getElementById('bkModalTitle').textContent = e ? 'Upraviť rezerváciu' : 'Nová rezervácia';
  document.getElementById('bkId').value = e ? b._id : '';
  utilEqOptions(e ? (b.equipment?._id || b.equipment) : (presetEq || utilEquipment[0]._id));
  document.getElementById('bkTitle').value = e ? (b.title || '') : '';
  document.getElementById('bkOrder').value = e ? (b.order || '') : '';
  document.getElementById('bkCustomer').value = e ? (b.customer || '') : '';
  const start = e ? new Date(b.start) : (presetStart || new Date());
  const end = e ? new Date(b.end) : new Date(start.getTime() + 4 * 36e5);
  document.getElementById('bkStart').value = toLocalInput(start);
  document.getElementById('bkEnd').value = toLocalInput(end);
  document.getElementById('bkStatus').value = e ? (b.status || 'planned') : 'planned';
  document.getElementById('bkProfile').value = e ? (b.profile || '') : '';
  document.getElementById('bkNote').value = e ? (b.note || '') : '';
  document.getElementById('bkDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('bookingModal').classList.remove('hidden');
  utilUpdateDurHint();
  ['bkStart', 'bkEnd'].forEach(id => { document.getElementById(id).oninput = utilUpdateDurHint; });
}
function utilUpdateDurHint() {
  const s = new Date(document.getElementById('bkStart').value), e = new Date(document.getElementById('bkEnd').value);
  const hint = document.getElementById('bkDurHint');
  if (isNaN(s) || isNaN(e) || e <= s) { hint.textContent = e <= s ? '⚠ Koniec musí byť po začiatku.' : ''; hint.className = 'util-dur-hint' + (e <= s ? ' warn' : ''); return; }
  hint.textContent = '⏱ Trvanie: ' + utilDurStr(e - s); hint.className = 'util-dur-hint';
}
function closeBookingModal() { document.getElementById('bookingModal').classList.add('hidden'); }
async function saveBooking() {
  const body = {
    equipment: document.getElementById('bkEquipment').value,
    title: document.getElementById('bkTitle').value.trim(),
    order: document.getElementById('bkOrder').value.trim(),
    customer: document.getElementById('bkCustomer').value.trim(),
    start: document.getElementById('bkStart').value ? new Date(document.getElementById('bkStart').value).toISOString() : null,
    end: document.getElementById('bkEnd').value ? new Date(document.getElementById('bkEnd').value).toISOString() : null,
    status: document.getElementById('bkStatus').value,
    profile: document.getElementById('bkProfile').value.trim(),
    note: document.getElementById('bkNote').value.trim()
  };
  if (!body.title) { alert('Zadaj názov testu'); return; }
  if (!body.start || !body.end || new Date(body.end) <= new Date(body.start)) { alert('Skontroluj časový rozsah — koniec musí byť po začiatku.'); return; }
  const id = document.getElementById('bkId').value;
  try {
    const r = await fetch(id ? '/api/bookings/' + id : '/api/bookings', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeBookingModal(); loadUtil();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteBooking(id) {
  if (!id || !await uiConfirm('Odstrániť túto rezerváciu?')) return;
  try { await fetch('/api/bookings/' + id, { method: 'DELETE' }); closeBookingModal(); loadUtil(); }
  catch { alert('Chyba'); }
}

// ── Equipment manager ─────────────────────────────────────────────────────────
function openEquipmentManager() { renderEquipMgr(); resetEquipForm(); document.getElementById('equipmentModal').classList.remove('hidden'); }
function closeEquipmentManager() { document.getElementById('equipmentModal').classList.add('hidden'); }
function renderEquipMgr() {
  const el = document.getElementById('equipMgrList'); if (!el) return;
  const typeLbl = { chamber: 'Komora', oven: 'Pec', other: 'Iné' };
  el.innerHTML = utilEquipment.map(eq => `
    <div class="equip-mgr-row">
      <span class="equip-color" style="background:${eq.color || '#0891b2'}"></span>
      <span class="equip-mgr-name">${escHtml(eq.name)} <span class="equip-mgr-code">${escHtml(eq.code || '')} · ${typeLbl[eq.type] || eq.type}</span></span>
      <button class="btn-xs" onclick="editEquipment('${eq._id}')">✎</button>
      <button class="btn-xs" onclick="deleteEquipment('${eq._id}')">✕</button>
    </div>`).join('') || '<div class="proc-empty">Žiadne zariadenia.</div>';
}
function resetEquipForm() {
  document.getElementById('eqId').value = ''; document.getElementById('eqName').value = '';
  document.getElementById('eqCode').value = ''; document.getElementById('eqType').value = 'chamber';
  document.getElementById('eqColor').value = '#0891b2';
  document.getElementById('eqCancelBtn').style.display = 'none';
}
function editEquipment(id) {
  const eq = utilEquipment.find(x => x._id === id); if (!eq) return;
  document.getElementById('eqId').value = eq._id; document.getElementById('eqName').value = eq.name || '';
  document.getElementById('eqCode').value = eq.code || ''; document.getElementById('eqType').value = eq.type || 'chamber';
  document.getElementById('eqColor').value = eq.color || '#0891b2';
  document.getElementById('eqCancelBtn').style.display = '';
}
async function saveEquipment() {
  const body = {
    name: document.getElementById('eqName').value.trim(), code: document.getElementById('eqCode').value.trim(),
    type: document.getElementById('eqType').value, color: document.getElementById('eqColor').value
  };
  if (!body.name) { alert('Zadaj názov zariadenia'); return; }
  const id = document.getElementById('eqId').value;
  try {
    const r = await fetch(id ? '/api/equipment/' + id : '/api/equipment', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    const eq = await fetch('/api/equipment').then(x => x.json()); utilEquipment = eq.filter(e => e.active !== false);
    renderEquipMgr(); resetEquipForm(); renderUtil();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteEquipment(id) {
  if (!await uiConfirm('Odstrániť zariadenie? Súvisiace rezervácie ostanú, ale nebudú sa zobrazovať.')) return;
  try {
    await fetch('/api/equipment/' + id, { method: 'DELETE' });
    utilEquipment = utilEquipment.filter(e => e._id !== id);
    renderEquipMgr(); renderUtil();
  } catch { alert('Chyba'); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PLÁNOVANIE VÝROBY — výrobné zákazky (Kanban + zoznam + KPI + vyťaženie liniek)
// ══════════════════════════════════════════════════════════════════════════════
let prodData = [];
let prodView = 'gantt';
let _dragProdId = null;
const PROD_STAGES = [
  { key: 'plan', label: 'Plánovaná', c: '#64748b' },
  { key: 'material', label: 'Príprava materiálu', c: '#8b5cf6' },
  { key: 'production', label: 'Vo výrobe', c: '#0891b2' },
  { key: 'qc', label: 'Kontrola kvality', c: '#f59e0b' },
  { key: 'done', label: 'Hotová', c: '#10b981' },
  { key: 'shipped', label: 'Expedovaná', c: '#3b82f6' }
];
const PROD_PRIO = { low: { l: 'Nízka', c: '#64748b' }, normal: { l: 'Normálna', c: '#3b82f6' }, high: { l: 'Vysoká', c: '#f59e0b' }, urgent: { l: 'Urgentná', c: '#ef4444' } };
const prodStageMap = k => PROD_STAGES.find(s => s.key === k) || PROD_STAGES[0];

async function loadProd() {
  try { prodData = await fetch('/api/production').then(r => r.json()); if (!Array.isArray(prodData)) prodData = []; }
  catch { prodData = []; }
  // datalist pracovísk
  const dl = document.getElementById('poLineList');
  if (dl) { const set = [...new Set(prodData.map(o => o.workstation).filter(Boolean))]; dl.innerHTML = set.map(w => `<option value="${escHtml(w)}">`).join(''); }
  renderProdKpis();
  setProdView(prodView);   // synchronizuj viditeľnosť pohľadu (default = gantt) + vykresli
  renderProdLines();
}

function setProdView(v) {
  prodView = v;
  document.querySelectorAll('[data-pview]').forEach(b => b.classList.toggle('active', b.dataset.pview === v));
  document.getElementById('prodKanban').classList.toggle('hidden', v !== 'kanban');
  document.getElementById('prodList').classList.toggle('hidden', v !== 'list');
  document.getElementById('prodGantt').classList.toggle('hidden', v !== 'gantt');
  document.getElementById('prodLinesCard')?.classList.toggle('hidden', v === 'gantt');
  renderProd();
}

function prodFiltered() {
  const q = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  if (!q) return prodData.slice();
  return prodData.filter(o => [o.number, o.product, o.customer, o.salesOrder, o.workstation, o.assignee].some(x => (x || '').toLowerCase().includes(q)));
}
function prodOverdue(o) { return o.due && !['done', 'shipped'].includes(o.stage) && new Date(o.due) < new Date(new Date().toDateString()); }

async function renderProdKpis() {
  let s = null;
  try { s = await fetch('/api/production/summary').then(r => r.json()); } catch {}
  const el = document.getElementById('prodKpis'); if (!el) return;
  if (!s || s.error) { el.innerHTML = ''; return; }
  const card = (val, label, sub, cls) => `<div class="prod-kpi ${cls || ''}"><div class="prod-kpi-val">${val}</div><div class="prod-kpi-lbl">${label}</div>${sub ? `<div class="prod-kpi-sub">${sub}</div>` : ''}</div>`;
  el.innerHTML =
    card(s.active, 'Aktívne zákazky', s.total + ' celkom', 'pk-blue') +
    card(s.inProduction, 'Vo výrobe', '', 'pk-cyan') +
    card(s.overdue, 'Po termíne', '', s.overdue ? 'pk-red' : '') +
    card(s.fulfillment + '%', 'Plnenie množstva', s.qtyDone + ' / ' + s.qtyPlanned + ' ks', 'pk-green');
}

function renderProd() {
  if (prodView === 'kanban') renderProdKanban();
  else if (prodView === 'list') renderProdList();
  else if (prodView === 'gantt') renderProdGantt();
}

function prodCardHtml(o) {
  const prio = PROD_PRIO[o.priority] || PROD_PRIO.normal;
  const od = prodOverdue(o);
  const p = Math.max(0, Math.min(100, o.progress || 0));
  const pcls = p >= 100 ? 'pf-done' : p >= 50 ? 'pf-mid' : 'pf-lo';
  return `
    <div class="kanban-card-top" onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))">
      <span class="kanban-card-title"><span class="kanban-grip" title="Potiahni">⠿</span>${escHtml(o.product)}</span>
      <span class="kanban-card-code">${escHtml(o.number || '')}${o.customer ? ' · ' + escHtml(o.customer) : ''}</span>
    </div>
    <div class="prod-card-chips">
      ${o.priority && o.priority !== 'normal' ? `<span class="prod-chip" style="background:${prio.c}22;color:${prio.c};border:1px solid ${prio.c}55">${prio.l}</span>` : ''}
      ${o.workstation ? `<span class="prod-chip prod-chip-line">🏭 ${escHtml(o.workstation)}</span>` : ''}
    </div>
    <div class="task-prog"><div class="task-prog-track"><div class="task-prog-fill ${pcls}" style="width:${p}%"></div></div><span class="task-prog-val">${p}%</span></div>
    <div class="kanban-card-meta">
      <span>📦 ${o.qtyDone || 0}/${o.qtyPlanned || 0} ${escHtml(o.unit || 'ks')}</span>
      ${o.due ? `<span class="${od ? 'kanban-overdue' : ''}">📅 ${fmtDate(o.due)}</span>` : ''}
    </div>`;
}

function renderProdKanban() {
  const board = document.getElementById('prodKanban'); if (!board) return;
  const items = prodFiltered();
  board.innerHTML = '';
  PROD_STAGES.forEach(st => {
    const col = document.createElement('div');
    col.className = 'kanban-col';
    const colItems = items.filter(o => o.stage === st.key).sort((a, b) => (a.order || 0) - (b.order || 0));
    col.innerHTML = `<div class="kanban-col-hdr" style="border-bottom-color:${st.c}66">${st.label} <span class="kanban-count">${colItems.length}</span></div>`;
    const body = document.createElement('div'); body.className = 'kanban-col-body'; body.dataset.stage = st.key;
    body.addEventListener('dragover', (e) => {
      if (!_dragProdId) return; e.preventDefault();
      const after = prodGetDragAfter(body, e.clientY);
      const drag = document.querySelector('.kanban-dragging'); if (!drag) return;
      if (after == null) body.appendChild(drag); else body.insertBefore(drag, after);
      col.classList.add('kanban-col-drop');
    });
    body.addEventListener('dragleave', (e) => { if (!body.contains(e.relatedTarget)) col.classList.remove('kanban-col-drop'); });
    body.addEventListener('drop', (e) => { e.preventDefault(); document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('kanban-col-drop')); persistProdOrder(); });
    colItems.forEach(o => {
      const card = document.createElement('div');
      card.className = 'kanban-card prod-card' + (prodOverdue(o) ? ' task-overdue' : '');
      card.style.setProperty('--prio', (PROD_PRIO[o.priority] || PROD_PRIO.normal).c);
      card.draggable = true; card.dataset.pid = o._id;
      card.addEventListener('dragstart', (e) => { _dragProdId = o._id; card.classList.add('kanban-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', o._id); } catch (_) {} });
      card.addEventListener('dragend', () => { _dragProdId = null; card.classList.remove('kanban-dragging'); document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('kanban-col-drop')); });
      card.innerHTML = prodCardHtml(o);
      body.appendChild(card);
    });
    col.appendChild(body);
    board.appendChild(col);
  });
}
function prodGetDragAfter(container, y) {
  const els = [...container.querySelectorAll('.kanban-card:not(.kanban-dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity }).element || null;
}
async function persistProdOrder() {
  _dragProdId = null;
  const payload = [];
  document.querySelectorAll('#prodKanban .kanban-col-body').forEach(body => {
    const stage = body.dataset.stage;
    [...body.querySelectorAll('.kanban-card')].forEach(card => payload.push({ id: card.dataset.pid, order: payload.length, stage }));
  });
  payload.forEach(p => { const o = prodData.find(x => x._id === p.id); if (o) { o.order = p.order; o.stage = p.stage; } });
  try { await fetch('/api/production/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: payload }) }); } catch {}
  renderProdKpis(); renderProdLines();
}

function renderProdList() {
  const el = document.getElementById('prodList'); if (!el) return;
  const items = prodFiltered().sort((a, b) => (a.due ? String(a.due) : '9999').localeCompare(b.due ? String(b.due) : '9999'));
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne výrobné zákazky.</div>'; return; }
  el.innerHTML = `<table class="prod-table"><thead><tr>
    <th>Zákazka</th><th>Produkt</th><th>Zákazník</th><th>Pracovisko</th><th>Množstvo</th><th>Fáza</th><th>Termín</th><th></th>
    </tr></thead><tbody>${items.map(o => {
    const st = prodStageMap(o.stage), prio = PROD_PRIO[o.priority] || PROD_PRIO.normal, od = prodOverdue(o);
    const p = Math.max(0, Math.min(100, o.progress || 0));
    return `<tr onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))">
      <td><span class="prod-t-num">${escHtml(o.number || '')}</span><span class="prod-t-prio" style="color:${prio.c}">${o.priority !== 'normal' ? prio.l : ''}</span></td>
      <td>${escHtml(o.product)}</td>
      <td>${escHtml(o.customer || '—')}</td>
      <td>${escHtml(o.workstation || '—')}</td>
      <td><div class="prod-t-qty">${o.qtyDone || 0}/${o.qtyPlanned || 0} ${escHtml(o.unit || 'ks')}</div><div class="prod-t-bar"><div style="width:${p}%"></div></div></td>
      <td><span class="prod-stage-badge" style="background:${st.c}22;color:${st.c};border:1px solid ${st.c}66">${st.label}</span></td>
      <td class="${od ? 'task-od' : ''}">${o.due ? fmtDate(o.due) : '—'}</td>
      <td><button class="admin-icon-btn danger" onclick="event.stopPropagation(); deleteProd('${o._id}')">✕</button></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function renderProdLines() {
  const el = document.getElementById('prodLines'); if (!el) return;
  const lines = {};
  prodData.filter(o => !['done', 'shipped'].includes(o.stage)).forEach(o => {
    const k = o.workstation || '— nepriradené —';
    lines[k] = lines[k] || { name: k, orders: 0, qty: 0 };
    lines[k].orders++; lines[k].qty += (o.qtyPlanned || 0);
  });
  const arr = Object.values(lines).sort((a, b) => b.orders - a.orders);
  if (!arr.length) { el.innerHTML = '<div class="proc-empty">Žiadne aktívne zákazky.</div>'; return; }
  const maxOrders = Math.max(...arr.map(l => l.orders), 1);
  el.innerHTML = arr.map(l => `
    <div class="prod-line-row">
      <span class="prod-line-name">${escHtml(l.name)}</span>
      <div class="prod-line-bar"><div class="prod-line-fill" style="width:${Math.round(l.orders / maxOrders * 100)}%"></div></div>
      <span class="prod-line-meta">${l.orders} ${l.orders === 1 ? 'zákazka' : (l.orders >= 2 && l.orders <= 4 ? 'zákazky' : 'zákaziek')} · ${l.qty} ks</span>
    </div>`).join('');
}

// ── modal ─────────────────────────────────────────────────────────────────────
function prodSyncProgress() {
  const pl = Number(document.getElementById('poQtyPlanned').value) || 0;
  const dn = Number(document.getElementById('poQtyDone').value) || 0;
  if (pl > 0) { const p = Math.max(0, Math.min(100, Math.round(dn / pl * 100))); document.getElementById('poProgress').value = p; document.getElementById('poProgressVal').textContent = p; }
}
function openProdModal(o = null) {
  const e = o && typeof o === 'object';
  document.getElementById('poModalTitle').textContent = e ? 'Upraviť zákazku' : 'Nová výrobná zákazka';
  const set = (id, v) => document.getElementById(id).value = v;
  set('poId', e ? o._id : '');
  set('poNumber', e ? (o.number || '') : '');
  set('poSalesOrder', e ? (o.salesOrder || '') : '');
  set('poProduct', e ? (o.product || '') : '');
  set('poCustomer', e ? (o.customer || '') : '');
  set('poWorkstation', e ? (o.workstation || '') : '');
  set('poQtyPlanned', e ? (o.qtyPlanned || 0) : '');
  set('poQtyDone', e ? (o.qtyDone || 0) : '');
  set('poUnit', e ? (o.unit || 'ks') : 'ks');
  set('poStage', e ? (o.stage || 'plan') : 'plan');
  set('poPriority', e ? (o.priority || 'normal') : 'normal');
  set('poStart', e && o.start ? String(o.start).slice(0, 10) : '');
  set('poDue', e && o.due ? String(o.due).slice(0, 10) : '');
  set('poAssignee', e ? (o.assignee || '') : '');
  const prog = e ? (o.progress || 0) : 0;
  set('poProgress', prog); document.getElementById('poProgressVal').textContent = prog;
  set('poNote', e ? (o.note || '') : '');
  document.getElementById('poDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('prodModal').classList.remove('hidden');
  modalSnapshot('prodModal');
}
function closeProdModal() { modalGuardClose('prodModal'); }
async function saveProd() {
  const body = {
    number: document.getElementById('poNumber').value.trim(),
    salesOrder: document.getElementById('poSalesOrder').value.trim(),
    product: document.getElementById('poProduct').value.trim(),
    customer: document.getElementById('poCustomer').value.trim(),
    workstation: document.getElementById('poWorkstation').value.trim(),
    qtyPlanned: Number(document.getElementById('poQtyPlanned').value) || 0,
    qtyDone: Number(document.getElementById('poQtyDone').value) || 0,
    unit: document.getElementById('poUnit').value.trim() || 'ks',
    stage: document.getElementById('poStage').value,
    priority: document.getElementById('poPriority').value,
    start: document.getElementById('poStart').value || null,
    due: document.getElementById('poDue').value || null,
    assignee: document.getElementById('poAssignee').value.trim(),
    progress: Number(document.getElementById('poProgress').value) || 0,
    note: document.getElementById('poNote').value.trim()
  };
  if (!body.product) { alert('Zadaj produkt'); return; }
  const id = document.getElementById('poId').value;
  try {
    const r = await fetch(id ? '/api/production/' + id : '/api/production', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    modalSnapshot('prodModal'); closeProdModal(); loadProd();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteProd(id) {
  if (!id || !await uiConfirm('Odstrániť túto výrobnú zákazku?')) return;
  try { await fetch('/api/production/' + id, { method: 'DELETE' }); modalSnapshot('prodModal'); closeProdModal(); loadProd(); }
  catch { alert('Chyba'); }
}
async function seedProdData() {
  if (!await uiConfirm('Vygenerovať ukážkové výrobné zákazky? Nahradia sa len predošlé ukážkové dáta.')) return;
  try {
    const r = await fetch('/api/admin/seed-production', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { alert('Chyba: ' + (d.error || r.status)); return; }
    loadProd();
    setTimeout(() => alert('Hotovo — vytvorených ' + d.inserted + ' zákaziek.'), 200);
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  RIADENIE VÝROBY (MES / dielenská vrstva) — pracoviská · OEE · prestoje
// ══════════════════════════════════════════════════════════════════════════════
let mfgCenters = [];
let mfgReports = [];
let mfgSummary = null;

const WC_STATUS_META = {
  running:     { l: 'Beží',          c: '#10b981' },
  setup:       { l: 'Pretypovanie',  c: '#8b5cf6' },
  idle:        { l: 'Nečinné',       c: '#94a3b8' },
  maintenance: { l: 'Údržba',        c: '#f59e0b' },
  down:        { l: 'Porucha',       c: '#ef4444' }
};
const WC_KIND_META = { line: '🏭 Linka', machine: '⚙️ Stroj', assembly: '🔧 Montáž', manual: '✋ Ručné', inspection: '🔍 Kontrola' };
const DT_REASON_META = {
  breakdown: 'Porucha', setup: 'Nastavenie', material: 'Materiál', quality: 'Kvalita',
  noOperator: 'Bez obsluhy', changeover: 'Pretypovanie', other: 'Iné'
};
const SHIFT_META = { R: 'Ranná', P: 'Poobedná', N: 'Nočná' };

function mfgRange() { return parseInt(document.getElementById('mfgRange')?.value) || 7; }
function oeeClass(v) { return v >= 85 ? 'oee-good' : v >= 60 ? 'oee-mid' : 'oee-low'; }
function fmtMin(m) { m = Math.round(m || 0); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); return h + ' h ' + (m % 60) + ' min'; }

async function loadMfg() {
  const days = mfgRange();
  try {
    const [c, r, s] = await Promise.all([
      fetch('/api/manufacturing/workcenters').then(x => x.json()),
      fetch('/api/manufacturing/reports?days=' + days).then(x => x.json()),
      fetch('/api/manufacturing/summary?days=' + days).then(x => x.json())
    ]);
    mfgCenters = Array.isArray(c) ? c : [];
    mfgReports = Array.isArray(r) ? r : [];
    mfgSummary = s && !s.error ? s : null;
  } catch { mfgCenters = []; mfgReports = []; mfgSummary = null; }
  // datalist pracovísk do modalu výkazu
  const dl = document.getElementById('srWcList');
  if (dl) dl.innerHTML = mfgCenters.map(c => `<option value="${escHtml(c.name)}">`).join('');
  renderMfgKpis();
  renderMfgBoard();
  renderMfgReports();
  renderMfgDowntime();
  renderMfgWcOee();
  loadRoutings();
  loadMfgSchedule();
}

function renderMfgKpis() {
  const el = document.getElementById('mfgKpis'); if (!el) return;
  const s = mfgSummary;
  if (!s) { el.innerHTML = '<div class="proc-empty" style="grid-column:1/-1">Žiadne dáta — pridaj pracovisko alebo vlož ukážkové dáta.</div>'; return; }
  const card = (val, label, sub, cls) => `<div class="prod-kpi ${cls || ''}"><div class="prod-kpi-val">${val}</div><div class="prod-kpi-lbl">${label}</div>${sub ? `<div class="prod-kpi-sub">${sub}</div>` : ''}</div>`;
  el.innerHTML =
    card(s.oee + '%', 'OEE (celkové)', `D ${s.availability}% · V ${s.performance}% · K ${s.quality}%`, s.oee >= 85 ? 'pk-green' : s.oee >= 60 ? 'pk-cyan' : 'pk-red') +
    card(s.running + '/' + s.centersTotal, 'Bežiace pracoviská', s.byStatus.down ? s.byStatus.down + ' v poruche' : 'bez porúch', s.byStatus.down ? 'pk-red' : 'pk-blue') +
    card((s.goodToday + s.scrapToday), 'Výroba dnes (ks)', s.targetToday ? s.fulfillToday + '% cieľa' : '—', 'pk-blue') +
    card(s.scrapRate + '%', 'Zmätkovitosť dnes', s.scrapToday + ' NOK ks', s.scrapRate > 5 ? 'pk-red' : '') +
    card(fmtMin(s.downtimeToday), 'Prestoje dnes', s.downtimeByReason[0] ? DT_REASON_META[s.downtimeByReason[0].reason] : 'žiadne', s.downtimeToday ? 'pk-red' : '');
}

function renderMfgBoard() {
  const el = document.getElementById('mfgBoard'); if (!el) return;
  if (!mfgCenters.length) { el.innerHTML = '<div class="proc-empty">Žiadne pracoviská. Pridaj prvé tlačidlom „+ Pracovisko".</div>'; return; }
  el.innerHTML = mfgCenters.map(c => {
    const m = WC_STATUS_META[c.status] || WC_STATUS_META.idle;
    const since = c.statusSince ? mfgSince(c.statusSince) : '';
    const opts = Object.entries(WC_STATUS_META).map(([k, v]) => `<option value="${k}" ${k === c.status ? 'selected' : ''}>${v.l}</option>`).join('');
    return `<div class="wc-card wc-status-${c.status}">
      <div class="wc-top">
        <div class="wc-name-wrap">
          <span class="wc-name">${escHtml(c.name)}</span>
          <span class="wc-meta">${escHtml(c.code || '')}${c.code ? ' · ' : ''}${WC_KIND_META[c.kind] || ''}</span>
        </div>
        <button class="wc-edit" onclick="openWcModal(mfgCenters.find(x=>x._id==='${c._id}'))" title="Upraviť">✎</button>
      </div>
      <div class="wc-status-row">
        <span class="wc-dot wc-${c.status}"></span>
        <select class="wc-status-sel" onchange="setWcStatus('${c._id}', this.value)">${opts}</select>
        ${since ? `<span class="wc-since">${since}</span>` : ''}
      </div>
      <div class="wc-body">
        ${c.currentOrder ? `<div class="wc-line"><span>Zákazka</span><b>${escHtml(c.currentOrder)}</b></div>` : ''}
        ${c.operator ? `<div class="wc-line"><span>Operátor</span><b>${escHtml(c.operator)}</b></div>` : ''}
        ${c.ratedCapacity ? `<div class="wc-line"><span>Kapacita</span><b>${c.ratedCapacity} ks/h</b></div>` : ''}
        ${c.shiftTarget ? `<div class="wc-line"><span>Cieľ/zmena</span><b>${c.shiftTarget} ks</b></div>` : ''}
      </div>
    </div>`;
  }).join('');
}
function mfgSince(d) {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'teraz';
  if (mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60); if (h < 24) return h + ' h';
  return Math.floor(h / 24) + ' d';
}

async function setWcStatus(id, status) {
  const c = mfgCenters.find(x => x._id === id); if (c) c.status = status;
  try { await fetch('/api/manufacturing/workcenters/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); } catch {}
  loadMfg();
}

function renderMfgReports() {
  const el = document.getElementById('mfgReports'); if (!el) return;
  const q = (document.getElementById('mfgSearch')?.value || '').toLowerCase();
  let items = mfgReports;
  if (q) items = items.filter(r => [r.workCenter, r.product, r.orderNumber, r.operator].some(x => (x || '').toLowerCase().includes(q)));
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne zmenové výkazy v zvolenom období.</div>'; return; }
  el.innerHTML = `<table class="prod-table mfg-table sortable"><thead><tr>
    <th data-sortable>Dátum</th><th data-sortable>Zm.</th><th data-sortable>Pracovisko</th><th data-sortable>Dobré/NOK</th><th data-sortable>Prestoj</th><th data-sortable>OEE (D·V·K)</th><th></th>
    </tr></thead><tbody>${items.map(r => {
    const k = r.kpi || {};
    return `<tr onclick="openSrModal(mfgReports.find(x=>x._id==='${r._id}'))" style="cursor:pointer">
      <td data-sort="${new Date(r.date).getTime()}">${fmtDate(r.date)}</td>
      <td><span class="mfg-shift">${r.shift}</span></td>
      <td><b>${escHtml(r.workCenter)}</b>${r.product ? `<div class="mfg-sub">${escHtml(r.product)}</div>` : ''}</td>
      <td>${r.goodQty || 0}<span class="mfg-nok"> / ${r.scrapQty || 0}</span></td>
      <td>${r.downtimeMinutes ? fmtMin(r.downtimeMinutes) + (r.downtimeReason && r.downtimeReason !== 'none' ? `<div class="mfg-sub">${DT_REASON_META[r.downtimeReason] || ''}</div>` : '') : '—'}</td>
      <td><div class="mfg-oee-cell"><span class="mfg-oee-badge ${oeeClass(k.oee || 0)}">${k.oee || 0}%</span><span class="mfg-apq">${k.availability || 0}·${k.performance || 0}·${k.quality || 0}</span></div></td>
      <td class="mfg-row-edit">✎</td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function renderMfgDowntime() {
  const el = document.getElementById('mfgDowntime'); if (!el) return;
  const s = mfgSummary;
  if (!s || !s.downtimeByReason.length) { el.innerHTML = '<div class="mfg-empty-sm">Bez evidovaných prestojov 🎉</div>'; return; }
  const max = s.downtimeByReason[0].minutes || 1;
  el.innerHTML = s.downtimeByReason.map(d => `
    <div class="mfg-dt-row">
      <div class="mfg-dt-top"><span>${DT_REASON_META[d.reason] || d.reason}</span><b>${fmtMin(d.minutes)}</b></div>
      <div class="mfg-dt-track"><div class="mfg-dt-fill" style="width:${Math.round(d.minutes / max * 100)}%"></div></div>
    </div>`).join('');
}

function renderMfgWcOee() {
  const el = document.getElementById('mfgWcOee'); if (!el) return;
  const s = mfgSummary;
  if (!s || !s.centersOee.length) { el.innerHTML = '<div class="mfg-empty-sm">Zatiaľ bez výkazov.</div>'; return; }
  el.innerHTML = s.centersOee.map(w => `
    <div class="mfg-wco-row">
      <div class="mfg-wco-top"><span>${escHtml(w.name)}</span><b class="${oeeClass(w.oee)}">${w.oee}%</b></div>
      <div class="mfg-dt-track"><div class="mfg-wco-fill ${oeeClass(w.oee)}" style="width:${w.oee}%"></div></div>
    </div>`).join('');
}

// ── Pracovisko: modal ──
function openWcModal(wc = null) {
  document.getElementById('wcModalTitle').textContent = wc ? 'Upraviť pracovisko' : 'Nové pracovisko';
  document.getElementById('wcId').value = wc?._id || '';
  document.getElementById('wcName').value = wc?.name || '';
  document.getElementById('wcCode').value = wc?.code || '';
  document.getElementById('wcKind').value = wc?.kind || 'line';
  document.getElementById('wcStatus').value = wc?.status || 'idle';
  document.getElementById('wcCapacity').value = wc?.ratedCapacity || '';
  document.getElementById('wcTarget').value = wc?.shiftTarget || '';
  document.getElementById('wcOrder').value = wc?.currentOrder || '';
  document.getElementById('wcOperator').value = wc?.operator || '';
  document.getElementById('wcLocation').value = wc?.location || '';
  document.getElementById('wcNote').value = wc?.note || '';
  document.getElementById('wcDeleteBtn').style.display = wc ? '' : 'none';
  document.getElementById('wcModal').classList.remove('hidden');
}
function closeWcModal() { document.getElementById('wcModal').classList.add('hidden'); }
async function saveWc() {
  const id = document.getElementById('wcId').value;
  const body = {
    name: document.getElementById('wcName').value.trim(),
    code: document.getElementById('wcCode').value.trim(),
    kind: document.getElementById('wcKind').value,
    status: document.getElementById('wcStatus').value,
    ratedCapacity: document.getElementById('wcCapacity').value,
    shiftTarget: document.getElementById('wcTarget').value,
    currentOrder: document.getElementById('wcOrder').value.trim(),
    operator: document.getElementById('wcOperator').value.trim(),
    location: document.getElementById('wcLocation').value.trim(),
    note: document.getElementById('wcNote').value.trim()
  };
  if (!body.name) { alert('Zadaj názov pracoviska.'); return; }
  try {
    const url = id ? '/api/manufacturing/workcenters/' + id : '/api/manufacturing/workcenters';
    const r = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json(); alert('Chyba: ' + (d.error || r.status)); return; }
    closeWcModal(); loadMfg();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteWc(id) {
  if (!id || !await uiConfirm('Odstrániť toto pracovisko?')) return;
  try { await fetch('/api/manufacturing/workcenters/' + id, { method: 'DELETE' }); closeWcModal(); loadMfg(); }
  catch (e) { alert('Sieťová chyba: ' + e.message); }
}

// ── Zmenový výkaz: modal ──
function srToInputDate(d) { const x = d ? new Date(d) : new Date(); return x.toISOString().slice(0, 10); }
function openSrModal(sr = null) {
  document.getElementById('srModalTitle').textContent = sr ? 'Upraviť zmenový výkaz' : 'Nový zmenový výkaz';
  document.getElementById('srId').value = sr?._id || '';
  document.getElementById('srDate').value = srToInputDate(sr?.date);
  document.getElementById('srShift').value = sr?.shift || 'R';
  document.getElementById('srWorkCenter').value = sr?.workCenter || '';
  document.getElementById('srOrder').value = sr?.orderNumber || '';
  document.getElementById('srProduct').value = sr?.product || '';
  document.getElementById('srPlanned').value = sr?.plannedMinutes ?? 480;
  document.getElementById('srDowntime').value = sr?.downtimeMinutes ?? 0;
  document.getElementById('srReason').value = sr?.downtimeReason || 'none';
  document.getElementById('srGood').value = sr?.goodQty ?? 0;
  document.getElementById('srScrap').value = sr?.scrapQty ?? 0;
  document.getElementById('srIdealRate').value = sr?.idealRate ?? 0;
  document.getElementById('srTarget').value = sr?.targetQty ?? 0;
  document.getElementById('srOperator').value = sr?.operator || '';
  document.getElementById('srNote').value = sr?.note || '';
  document.getElementById('srDeleteBtn').style.display = sr ? '' : 'none';
  srPreview();
  document.getElementById('srModal').classList.remove('hidden');
}
function closeSrModal() { document.getElementById('srModal').classList.add('hidden'); }
function srVal(id) { return Number(document.getElementById(id).value) || 0; }
function srComputeOee() {
  const planned = srVal('srPlanned'), downtime = Math.min(srVal('srDowntime'), planned);
  const runtime = Math.max(0, planned - downtime);
  const good = srVal('srGood'), scrap = srVal('srScrap'), total = good + scrap;
  const ideal = srVal('srIdealRate'), target = srVal('srTarget');
  const availability = planned > 0 ? runtime / planned : 0;
  let performance;
  if (ideal > 0 && runtime > 0) performance = total / (ideal * runtime / 60);
  else if (target > 0) performance = total / target;
  else performance = total > 0 ? 1 : 0;
  performance = Math.max(0, Math.min(1, performance));
  const quality = total > 0 ? good / total : 0;
  const cl = v => Math.max(0, Math.min(100, Math.round(v * 100)));
  return { a: cl(availability), p: cl(performance), q: cl(quality), oee: cl(availability * performance * quality) };
}
function srPreview() {
  const el = document.getElementById('srPreviewBox'); if (!el) return;
  const k = srComputeOee();
  el.innerHTML = `<div class="mfg-prev-grid">
    <div class="mfg-prev-cell"><span>Dostupnosť</span><b>${k.a}%</b></div>
    <div class="mfg-prev-cell"><span>Výkon</span><b>${k.p}%</b></div>
    <div class="mfg-prev-cell"><span>Kvalita</span><b>${k.q}%</b></div>
    <div class="mfg-prev-cell mfg-prev-oee ${oeeClass(k.oee)}"><span>OEE</span><b>${k.oee}%</b></div>
  </div>`;
}
async function saveSr() {
  const id = document.getElementById('srId').value;
  const body = {
    date: document.getElementById('srDate').value || undefined,
    shift: document.getElementById('srShift').value,
    workCenter: document.getElementById('srWorkCenter').value.trim(),
    orderNumber: document.getElementById('srOrder').value.trim(),
    product: document.getElementById('srProduct').value.trim(),
    plannedMinutes: srVal('srPlanned'), downtimeMinutes: srVal('srDowntime'),
    downtimeReason: document.getElementById('srReason').value,
    goodQty: srVal('srGood'), scrapQty: srVal('srScrap'),
    idealRate: srVal('srIdealRate'), targetQty: srVal('srTarget'),
    operator: document.getElementById('srOperator').value.trim(),
    note: document.getElementById('srNote').value.trim()
  };
  if (!body.workCenter) { alert('Zadaj pracovisko.'); return; }
  try {
    const url = id ? '/api/manufacturing/reports/' + id : '/api/manufacturing/reports';
    const r = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json(); alert('Chyba: ' + (d.error || r.status)); return; }
    closeSrModal(); loadMfg();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteSr(id) {
  if (!id || !await uiConfirm('Odstrániť tento zmenový výkaz?')) return;
  try { await fetch('/api/manufacturing/reports/' + id, { method: 'DELETE' }); closeSrModal(); loadMfg(); }
  catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function seedMfgData() {
  if (!await uiConfirm('Vygenerovať ukážkové pracoviská a zmenové výkazy? Nahradia sa len predošlé ukážkové dáta.')) return;
  try {
    const r = await fetch('/api/admin/seed-manufacturing', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { alert('Chyba: ' + (d.error || r.status)); return; }
    loadMfg();
    setTimeout(() => alert(`Hotovo — ${d.centers} pracovísk a ${d.reports} výkazov.`), 200);
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  NORMOVANÉ OPERÁCIE — technologické postupy (t/ks · t/výrobok · linka)
// ══════════════════════════════════════════════════════════════════════════════
let mfgRoutings = [];
let mfgRtSelectedId = null;
let rtOps = [];        // pracovná kópia operácií v modale
let mfgRtQty = 1;      // plánované množstvo pre kalkulačku kapacity

// t/výrobok pre operáciu = t/ks × ks × (strojový čas ? 1 : prirážka)
function opTimeJs(op, coeff) { return (Number(op.tPiece) || 0) * (Number(op.qty) || 1) * (op.machine ? 1 : (Number(coeff) || 1)); }
function rtFmt(n) { return (Math.round((n || 0) * 1000) / 1000).toLocaleString('sk-SK', { maximumFractionDigits: 3 }); }
function rtFmtH(min) { return (Math.round((min || 0) / 60 * 10) / 10).toLocaleString('sk-SK', { maximumFractionDigits: 1 }) + ' h'; }

async function loadRoutings() {
  try { mfgRoutings = await fetch('/api/manufacturing/routings').then(r => r.json()); if (!Array.isArray(mfgRoutings)) mfgRoutings = []; }
  catch { mfgRoutings = []; }
  if (!mfgRoutings.find(r => r._id === mfgRtSelectedId)) mfgRtSelectedId = mfgRoutings[0]?._id || null;
  // datalist liniek do modalu (z pracovísk + existujúcich postupov)
  const dl = document.getElementById('rtLineList');
  if (dl) {
    const lines = new Set(mfgCenters.map(c => c.name));
    mfgRoutings.forEach(r => (r.operations || []).forEach(o => o.line && lines.add(o.line)));
    dl.innerHTML = [...lines].map(l => `<option value="${escHtml(l)}">`).join('');
  }
  renderRtList();
  renderRtDetail();
  renderMfgGantt();   // postupy ovplyvňujú rozvrh
}

function renderRtList() {
  const el = document.getElementById('mfgRtList'); if (!el) return;
  if (!mfgRoutings.length) { el.innerHTML = '<div class="proc-empty" style="padding:14px">Žiadne postupy. Klikni na <strong>🎲 Ukážkový postup</strong> alebo <strong>+ Postup</strong>.</div>'; return; }
  el.innerHTML = mfgRoutings.map(r => `
    <button class="rt-item ${r._id === mfgRtSelectedId ? 'active' : ''}" onclick="selectRouting('${r._id}')">
      <span class="rt-item-name">${escHtml(r.product)}</span>
      <span class="rt-item-meta">${r.code ? escHtml(r.code) + ' · ' : ''}${r.totals.items} operácií · ${rtFmt(r.totals.totalMin)} min</span>
    </button>`).join('');
}
function selectRouting(id) { mfgRtSelectedId = id; renderRtList(); renderRtDetail(); }

function renderRtDetail() {
  const el = document.getElementById('mfgRtDetail'); if (!el) return;
  const r = mfgRoutings.find(x => x._id === mfgRtSelectedId);
  if (!r) { el.innerHTML = '<div class="proc-empty" style="padding:24px">Vyber technologický postup vľavo.</div>'; return; }
  const coeff = Number(r.coeff) || 1.1;

  const rows = (r.operations || []).map(op => `
    <tr>
      <td>${escHtml(op.group || '')}</td>
      <td class="rt-code">${escHtml(op.code || '')}</td>
      <td>${escHtml(op.desc || '')}</td>
      <td class="rt-num">${rtFmt(op.tPiece)}</td>
      <td class="rt-num">${rtFmt(op.qty || 1)}</td>
      <td class="rt-num rt-strong">${rtFmt(opTimeJs(op, coeff))}</td>
      <td>${op.machine ? '<span class="rt-mach">⚙ ' + escHtml(op.line || 'Strojový čas') + '</span>' : escHtml(op.line || '')}</td>
      <td class="rt-opnote">${escHtml(op.opNote || '')}</td>
    </tr>`).join('');

  // Rozloženie času podľa linky
  const max = Math.max(...r.totals.byLine.map(l => l.min), 1);
  const lineRows = r.totals.byLine.map(l => `
    <div class="rt-line-row">
      <div class="rt-line-top"><span>${escHtml(l.line)}</span><b>${rtFmt(l.min)} min · ${rtFmtH(l.min)}</b></div>
      <div class="rt-line-track"><div class="rt-line-fill" style="width:${Math.round(l.min / max * 100)}%"></div></div>
      <div class="rt-line-sub">${Math.round(l.min / r.totals.totalMin * 100)} % z celkového času</div>
    </div>`).join('');

  // Kalkulačka kapacity pre dávku
  const qty = mfgRtQty > 0 ? mfgRtQty : 1;
  const calcRows = r.totals.byLine.map(l => `
    <tr><td>${escHtml(l.line)}</td><td class="rt-num">${rtFmtH(l.min * qty)}</td><td class="rt-num">${(l.min * qty / 480).toLocaleString('sk-SK', { maximumFractionDigits: 1 })}</td></tr>`).join('');

  el.innerHTML = `
    <div class="rt-detail-hdr">
      <div>
        <div class="rt-detail-title">${escHtml(r.product)}</div>
        <div class="rt-detail-sub">${r.code ? escHtml(r.code) + ' · ' : ''}prirážka na ručné operácie ×${rtFmt(coeff)}</div>
      </div>
      <button class="btn-secondary btn-sm" onclick="openRtModal(mfgRoutings.find(x=>x._id==='${r._id}'))">✎ Upraviť</button>
    </div>
    <div class="rt-ops-table-wrap">
      <table class="rt-ops-table rt-view">
        <thead><tr><th>Č</th><th>Kód</th><th>Popis</th><th>t/ks</th><th>ks</th><th>t/výrobok</th><th>linka</th><th>Popis operácie</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="rt-ops-foot">Položiek: <strong>${r.totals.items}</strong> · <span>t/výrobok: <strong>${rtFmt(r.totals.totalMin)}</strong> min (${rtFmtH(r.totals.totalMin)})</span></div>

    <div class="rt-grid">
      <div class="rt-sub-card">
        <h3 class="rt-sub-h">🏭 Rozloženie času podľa linky</h3>
        ${lineRows}
      </div>
      <div class="rt-sub-card">
        <h3 class="rt-sub-h">📦 Kapacita pre dávku</h3>
        <div class="rt-calc-input">
          <label>Plánované množstvo (ks)</label>
          <input type="number" min="1" value="${qty}" oninput="mfgRtQty=Math.max(1,parseInt(this.value)||1);renderRtDetail()">
        </div>
        <table class="rt-calc-table">
          <thead><tr><th>Linka</th><th>Čas</th><th>Zmien (8h)</th></tr></thead>
          <tbody>${calcRows}</tbody>
          <tfoot><tr><td>Spolu</td><td class="rt-num">${rtFmtH(r.totals.totalMin * qty)}</td><td class="rt-num">${(r.totals.totalMin * qty / 480).toLocaleString('sk-SK', { maximumFractionDigits: 1 })}</td></tr></tfoot>
        </table>
      </div>
    </div>`;
}

// ── Modal: editácia postupu ───────────────────────────────────────────────────
function openRtModal(r = null) {
  const e = r && typeof r === 'object';
  document.getElementById('rtModalTitle').textContent = e ? 'Upraviť technologický postup' : 'Nový technologický postup';
  document.getElementById('rtId').value = e ? r._id : '';
  document.getElementById('rtProduct').value = e ? (r.product || '') : '';
  document.getElementById('rtCode').value = e ? (r.code || '') : '';
  document.getElementById('rtCoeff').value = e ? (r.coeff || 1.1) : 1.1;
  document.getElementById('rtNote').value = e && r.note !== 'seed' ? (r.note || '') : '';
  rtOps = e ? (r.operations || []).map(o => ({ group: o.group || '', code: o.code || '', desc: o.desc || '', tPiece: o.tPiece || 0, qty: o.qty || 1, line: o.line || '', machine: !!o.machine, opNote: o.opNote || '' }))
            : [{ group: '', code: '', desc: '', tPiece: 0, qty: 1, line: '', machine: false, opNote: '' }];
  document.getElementById('rtDeleteBtn').style.display = e ? '' : 'none';
  renderRtOps();
  document.getElementById('rtModal').classList.remove('hidden');
  modalSnapshot('rtModal');
}
function closeRtModal() { modalGuardClose('rtModal'); }
function rtCoeff() { return Number(document.getElementById('rtCoeff').value) || 1.1; }

function renderRtOps() {
  const body = document.getElementById('rtOpsBody'); if (!body) return;
  const coeff = rtCoeff();
  body.innerHTML = rtOps.map((op, i) => `
    <tr>
      <td><input class="rt-in rt-in-xs" value="${escHtml(op.group)}" oninput="updateRtOp(${i},'group',this.value)"></td>
      <td><input class="rt-in rt-in-sm" value="${escHtml(op.code)}" oninput="updateRtOp(${i},'code',this.value)"></td>
      <td><input class="rt-in" value="${escHtml(op.desc)}" oninput="updateRtOp(${i},'desc',this.value)"></td>
      <td><input class="rt-in rt-in-num" type="number" step="0.001" value="${op.tPiece}" oninput="updateRtOp(${i},'tPiece',this.value)"></td>
      <td><input class="rt-in rt-in-num" type="number" step="1" value="${op.qty}" oninput="updateRtOp(${i},'qty',this.value)"></td>
      <td class="rt-num rt-strong" id="rtOpT-${i}">${rtFmt(opTimeJs(op, coeff))}</td>
      <td><input class="rt-in rt-in-sm" list="rtLineList" value="${escHtml(op.line)}" oninput="updateRtOp(${i},'line',this.value)"></td>
      <td style="text-align:center"><input type="checkbox" ${op.machine ? 'checked' : ''} onchange="updateRtOp(${i},'machine',this.checked)" title="Strojový čas — bez prirážky"></td>
      <td><button type="button" class="tk-sub-del" onclick="removeRtOp(${i})" title="Odstrániť">✕</button></td>
    </tr>`).join('');
  refreshRtTotals();
}
function updateRtOp(i, field, val) {
  if (!rtOps[i]) return;
  if (field === 'machine') { rtOps[i].machine = !!val; }
  else if (field === 'tPiece' || field === 'qty') { rtOps[i][field] = Number(val) || 0; }
  else { rtOps[i][field] = val; }
  // prepočítaj len dotknutý riadok + footer (bez re-renderu, nech sa nestratí fokus)
  if (field === 'tPiece' || field === 'qty' || field === 'machine') {
    const cell = document.getElementById('rtOpT-' + i);
    if (cell) cell.textContent = rtFmt(opTimeJs(rtOps[i], rtCoeff()));
    refreshRtTotals();
  }
}
function refreshRtTotals() {
  const coeff = rtCoeff();
  const total = rtOps.reduce((s, op) => s + opTimeJs(op, coeff), 0);
  const cnt = document.getElementById('rtOpsCount'); if (cnt) cnt.textContent = rtOps.length;
  const tot = document.getElementById('rtOpsTotal'); if (tot) tot.textContent = rtFmt(total);
}
function addRtOp() {
  const last = rtOps[rtOps.length - 1];
  rtOps.push({ group: last?.group || '', code: '', desc: '', tPiece: 0, qty: 1, line: last?.line || '', machine: !!last?.machine, opNote: '' });
  renderRtOps();
}
function removeRtOp(i) { rtOps.splice(i, 1); renderRtOps(); }

async function saveRt() {
  const product = document.getElementById('rtProduct').value.trim();
  if (!product) { alert('Zadaj názov výrobku.'); return; }
  const body = {
    product, code: document.getElementById('rtCode').value.trim(),
    coeff: rtCoeff(), note: document.getElementById('rtNote').value.trim(),
    operations: rtOps.filter(o => (o.desc || '').trim() || (o.code || '').trim())
  };
  const id = document.getElementById('rtId').value;
  try {
    const r = await fetch(id ? '/api/manufacturing/routings/' + id : '/api/manufacturing/routings', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert('Chyba: ' + (d.error || r.status)); return; }
    const saved = await r.json(); mfgRtSelectedId = saved._id || mfgRtSelectedId;
    modalSnapshot('rtModal'); closeRtModal(); loadRoutings();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteRt(id) {
  if (!id || !await uiConfirm('Odstrániť tento technologický postup?')) return;
  try { await fetch('/api/manufacturing/routings/' + id, { method: 'DELETE' }); mfgRtSelectedId = null; modalSnapshot('rtModal'); closeRtModal(); loadRoutings(); }
  catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function seedRoutingsData() {
  if (!await uiConfirm('Načítať ukážkový technologický postup (DBFOS senzor — 20 normovaných operácií)?')) return;
  try {
    const r = await fetch('/api/admin/seed-routings', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { alert('Chyba: ' + (d.error || r.status)); return; }
    mfgRtSelectedId = null;
    loadRoutings();
    setTimeout(() => alert(`Hotovo — ${d.routings} postupov, ${d.operations} operácií.`), 200);
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROZVRH VÝROBY — operačný Gantt (pracoviská × operácie z tech. postupov)
//  Spája technológie (pracoviská/linky) a procesy (normované operácie zákaziek)
// ══════════════════════════════════════════════════════════════════════════════
let mfgOrders = [];
let mfgGanttDayW = 64;          // px/deň (zoom)
let mfgGanttSel = null;         // vybraná zákazka (zvýraznenie toku)
let mfgGanttSort = 'priority';
let mfgGanttMode = 'process';   // 'process' (operácie × čas) | 'resource' (pracoviská × čas)
let mfgGanttOrderId = null;     // vybraná zákazka/postup pre procesný pohľad
const MFG_ORDER_COLORS = ['#00d4ff', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#f43f5e', '#3b82f6', '#eab308', '#8b5cf6', '#22c55e'];

function setMfgGanttMode(m) { mfgGanttMode = m; renderMfgGantt(); }
function setMfgGanttOrder(id) { mfgGanttOrderId = id; renderMfgGantt(); }

// Adaptívna časová os — zarovnané okno + delenia (hodiny/dni podľa rozsahu)
function mfgAxisTicks(t0, t1) {
  const H = 36e5, D = 864e5;
  const span = Math.max(t1 - t0, H);
  let step, fmt;
  if (span <= 10 * H) { step = H; fmt = d => `${d.getHours()}:00`; }
  else if (span <= 2 * D) { step = 3 * H; fmt = d => `${d.getDate()}.${d.getMonth() + 1}. ${d.getHours()}h`; }
  else { step = D; fmt = d => `${d.getDate()}.${d.getMonth() + 1}.`; }
  const d0 = new Date(t0);
  if (step >= D) d0.setHours(0, 0, 0, 0);
  else { d0.setMinutes(0, 0, 0); if (step === 3 * H) d0.setHours(Math.floor(d0.getHours() / 3) * 3); }
  const ws = d0.getTime();
  const winMs = Math.ceil((t1 - ws) / step) * step || step;
  const ticks = [];
  for (let t = ws; t <= ws + winMs + 1; t += step) ticks.push({ t, left: (t - ws) / winMs * 100, label: fmt(new Date(t)) });
  return { ws, winMs, step, stepPct: step / winMs * 100, ticks };
}

function _normStr(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
function mfgMatchRouting(product) {
  const t = _normStr(product); if (!t) return null;
  let r = mfgRoutings.find(x => _normStr(x.product) === t);
  if (!r) r = mfgRoutings.find(x => { const p = _normStr(x.product); return p && (p.includes(t) || t.includes(p)); });
  return r || null;
}
// minúty operácie pre celú dávku: ručné = t/výrobok × množstvo, strojové = fixne (1 beh)
function mfgOpBatchMin(op, coeff, orderQty) {
  const per = opTimeJs(op, coeff);
  return op.machine ? per : per * Math.max(1, orderQty);
}
function fmtDur(min) {
  min = Math.round(min);
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return h + ' h' + (m ? ' ' + m + ' min' : '');
  const d = Math.floor(h / 24);
  return d + ' d' + (h % 24 ? ' ' + (h % 24) + ' h' : '');
}

async function loadMfgSchedule() {
  try { mfgOrders = await fetch('/api/production').then(r => r.json()); if (!Array.isArray(mfgOrders)) mfgOrders = []; }
  catch { mfgOrders = []; }
  renderMfgGantt();
  renderMfgShipped();
}

// Zoznam expedovaných zákaziek + objednávok
function renderMfgShipped() {
  const el = document.getElementById('mfgShippedList'); if (!el) return;
  const cnt = document.getElementById('mfgShippedCount');
  const q = (document.getElementById('mfgShipSearch')?.value || '').toLowerCase();
  let items = mfgOrders.filter(o => o.stage === 'shipped');
  const totalQty = items.reduce((s, o) => s + (o.qtyPlanned || 0), 0);
  if (cnt) cnt.textContent = items.length ? `${items.length} zákaziek · ${totalQty} ks` : '';
  if (q) items = items.filter(o => [o.number, o.salesOrder, o.product, o.customer].some(x => (x || '').toLowerCase().includes(q)));
  items.sort((a, b) => (b.due ? +new Date(b.due) : 0) - (a.due ? +new Date(a.due) : 0));
  if (!items.length) {
    el.innerHTML = `<div class="proc-empty" style="margin:6px 0">${mfgOrders.some(o => o.stage === 'shipped') ? 'Nič nevyhovuje hľadaniu.' : 'Žiadne expedované zákazky.'}</div>`;
    return;
  }
  el.innerHTML = `<div class="rt-ops-table-wrap"><table class="prod-table rt-view mfg-ship-table sortable"><thead><tr>
    <th data-sortable>Zákazka</th><th data-sortable>Objednávka</th><th data-sortable>Produkt</th><th data-sortable>Zákazník</th><th data-sortable>Množstvo</th><th data-sortable>Termín</th>
    </tr></thead><tbody>${items.map(o => `<tr>
      <td class="rt-code">${escHtml(o.number || '—')}</td>
      <td>${escHtml(o.salesOrder || '—')}</td>
      <td>${escHtml(o.product || '')}</td>
      <td>${escHtml(o.customer || '—')}</td>
      <td class="rt-num" data-sort="${o.qtyPlanned || 0}">${o.qtyPlanned || 0} ${escHtml(o.unit || 'ks')}</td>
      <td data-sort="${o.due ? new Date(o.due).getTime() : 0}">${o.due ? fmtDate(o.due) : '—'}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function setMfgGanttSort(v) { mfgGanttSort = v; renderMfgGantt(); }
function mfgGanttZoom(dir) { mfgGanttDayW = Math.max(26, Math.min(160, mfgGanttDayW + dir * 18)); renderMfgGantt(); }
function mfgGanttSelect(id) { mfgGanttSel = (mfgGanttSel === id ? null : id); renderMfgGantt(); }

function buildMfgSchedule() {
  const active = mfgOrders.filter(o => !['done', 'shipped'].includes(o.stage));
  const prioRank = { urgent: 0, high: 1, normal: 2, low: 3 };
  const inf = Number.MAX_SAFE_INTEGER;
  const sorted = active.slice().sort((a, b) => {
    if (mfgGanttSort === 'due') return (a.due ? +new Date(a.due) : inf) - (b.due ? +new Date(b.due) : inf);
    if (mfgGanttSort === 'number') return String(a.number || '').localeCompare(String(b.number || ''));
    return (prioRank[a.priority] ?? 2) - (prioRank[b.priority] ?? 2) || ((a.due ? +new Date(a.due) : inf) - (b.due ? +new Date(b.due) : inf));
  });
  const base = Date.now();
  const wcAvail = {};
  const bars = [], unscheduled = [], orderColor = {};
  let ci = 0;
  sorted.forEach(o => {
    const routing = mfgMatchRouting(o.product);
    if (!routing || !(routing.operations || []).length) { unscheduled.push(o); return; }
    const color = MFG_ORDER_COLORS[ci++ % MFG_ORDER_COLORS.length]; orderColor[o._id] = color;
    const coeff = Number(routing.coeff) || 1.1;
    const qty = o.qtyPlanned || 1;
    const ops = routing.operations.slice().sort((a, b) => String(a.group || '').localeCompare(String(b.group || '')));
    let ready = o.start ? Math.max(base, +new Date(o.start)) : base;
    ops.forEach((op, idx) => {
      const line = op.line || '— nepriradené —';
      const dur = mfgOpBatchMin(op, coeff, qty) * 60000;
      const start = Math.max(ready, wcAvail[line] || base);
      const end = start + dur;
      wcAvail[line] = end; ready = end;
      bars.push({ orderId: o._id, number: o.number, product: o.product, customer: o.customer, qty, color, seq: idx + 1, total: ops.length, code: op.code, desc: op.desc, line, machine: op.machine, start, end, durMin: dur / 60000, due: o.due, priority: o.priority });
    });
  });
  // záťaž liniek
  const lineLoad = {};
  bars.forEach(b => { lineLoad[b.line] = (lineLoad[b.line] || 0) + b.durMin; });
  return { bars, unscheduled, orderColor, sorted, lineLoad };
}

// Dispečer — prepína procesný (operácie × čas) a zdrojový (pracoviská × čas) pohľad
function renderMfgGantt() {
  document.querySelectorAll('[data-gmode]').forEach(b => b.classList.toggle('active', b.dataset.gmode === mfgGanttMode));
  const sortSel = document.getElementById('mfgGanttSort'); const ordSel = document.getElementById('mfgGanttOrder');
  if (sortSel) { sortSel.value = mfgGanttSort; sortSel.style.display = mfgGanttMode === 'resource' ? '' : 'none'; }
  if (ordSel) ordSel.style.display = mfgGanttMode === 'process' ? '' : 'none';
  if (mfgGanttMode === 'process') renderMfgGanttProcess();
  else renderMfgGanttResource();
}

function renderMfgGanttResource() {
  const chart = document.getElementById('mfgGanttChart'); if (!chart) return;
  chart.className = 'util-gantt mfg-gantt';
  const info = document.getElementById('mfgGanttInfo');
  const legendEl = document.getElementById('mfgGanttLegend');
  const unEl = document.getElementById('mfgGanttUnsched');
  const flowEl = document.getElementById('mfgGanttFlow');

  const sched = buildMfgSchedule();

  // Nenaplánované zákazky (bez postupu)
  if (unEl) {
    unEl.innerHTML = sched.unscheduled.length
      ? `<div class="mfg-gantt-warn">⚠ Bez technologického postupu (${sched.unscheduled.length}): ${sched.unscheduled.slice(0, 8).map(o => escHtml(o.product)).join(', ')}${sched.unscheduled.length > 8 ? '…' : ''} — pridaj postup pre tieto výrobky nižšie.</div>`
      : '';
  }

  if (!sched.bars.length) {
    chart.innerHTML = '<div class="proc-empty" style="margin:20px">Žiadne naplánovateľné operácie. Potrebné sú <strong>aktívne výrobné zákazky</strong> (Plánovanie výroby) a <strong>technologický postup</strong> pre daný výrobok.</div>';
    if (info) info.innerHTML = ''; if (legendEl) legendEl.innerHTML = ''; if (flowEl) flowEl.classList.add('hidden');
    chart.style.minWidth = '';
    return;
  }

  // Časové okno
  const dayMs = 864e5;
  const t0 = Math.min(...sched.bars.map(b => b.start), Date.now());
  const t1 = Math.max(...sched.bars.map(b => b.end));
  const startDay = new Date(t0); startDay.setHours(0, 0, 0, 0);
  const ws = startDay.getTime();
  let days = Math.max(1, Math.min(90, Math.ceil((t1 - ws) / dayMs)));
  const winMs = days * dayMs;

  // Linky (riadky) = pracoviská v poradí + ďalšie linky z operácií; len tie s operáciami
  const order = [];
  mfgCenters.forEach(c => { if (!order.includes(c.name)) order.push(c.name); });
  sched.bars.forEach(b => { if (!order.includes(b.line)) order.push(b.line); });
  const lines = order.filter(l => sched.bars.some(b => b.line === l));
  const maxLoad = Math.max(...Object.values(sched.lineLoad), 1);

  // Hlavička dní
  let head = '<div class="ug-corner">Pracovisko / linka</div><div class="ug-days">';
  for (let i = 0; i < days; i++) {
    const d = new Date(ws + i * dayMs); const wd = d.getDay(); const we = (wd === 0 || wd === 6);
    head += `<div class="ug-day${we ? ' ug-weekend' : ''}" style="left:${i / days * 100}%;width:${100 / days}%">
      <span class="ug-day-wd">${['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][wd]}</span>
      <span class="ug-day-d">${d.getDate()}.${d.getMonth() + 1}.</span></div>`;
  }
  head += '</div>';

  // Riadky
  let rows = '';
  lines.forEach(line => {
    let grid = '';
    for (let i = 0; i < days; i++) { const we = [0, 6].includes(new Date(ws + i * dayMs).getDay()); grid += `<div class="ug-cell${we ? ' ug-weekend' : ''}" style="left:${i / days * 100}%;width:${100 / days}%"></div>`; }
    const lineBars = sched.bars.filter(b => b.line === line);
    let bars = '';
    lineBars.forEach(b => {
      const s = Math.max(b.start, ws), e = Math.min(b.end, ws + winMs); if (e <= s) return;
      const left = (s - ws) / winMs * 100, width = (e - s) / winMs * 100;
      const dim = mfgGanttSel && mfgGanttSel !== b.orderId;
      const tip = `${b.number || ''} · ${b.product} (${b.qty} ks)\n${b.seq}/${b.total} ${b.code ? b.code + ' — ' : ''}${b.desc}\n${b.line}${b.machine ? ' ⚙ strojový čas' : ''}\n${fmtDateTime(b.start)} → ${fmtDateTime(b.end)} (${fmtDur(b.durMin)})`;
      bars += `<div class="ug-bar mfg-opbar${b.machine ? ' mfg-opbar-mach' : ''}${dim ? ' mfg-opbar-dim' : ''}" style="left:${left}%;width:${Math.max(width, 0.8)}%;top:5px;background:${b.color}"
        title="${escHtml(tip)}" onclick="event.stopPropagation(); mfgGanttSelect('${b.orderId}')">
        <span class="mfg-opbar-seq">${b.seq}</span><span class="ug-bar-lbl">${escHtml(b.desc)}</span></div>`;
    });
    const load = sched.lineLoad[line] || 0;
    const isWc = mfgCenters.some(c => c.name === line);
    rows += `<div class="ug-row mfg-gantt-row">
      <div class="ug-eq mfg-lane" title="Záťaž: ${fmtDur(load)}">
        <span class="mfg-lane-bar"><span class="mfg-lane-fill" style="height:${Math.round(load / maxLoad * 100)}%"></span></span>
        <div class="ug-eq-txt"><span class="ug-eq-name">${escHtml(line)}${isWc ? '' : ' <span class="mfg-lane-ext">ext</span>'}</span><span class="ug-eq-code">${fmtDur(load)}</span></div>
      </div>
      <div class="ug-track">${grid}${bars}</div>
    </div>`;
  });

  // Čiara "teraz"
  const now = Date.now(); let nowLine = '';
  if (now >= ws && now <= ws + winMs) nowLine = `<div class="ug-now" style="left:calc(190px + (100% - 190px) * ${(now - ws) / winMs})"></div>`;

  chart.innerHTML = `<div class="ug-head">${head}</div><div class="ug-body" onclick="if(mfgGanttSel){mfgGanttSel=null;renderMfgGantt();}">${rows}</div>${nowLine}`;
  chart.style.minWidth = (190 + days * mfgGanttDayW) + 'px';

  // Info riadok
  const totalMin = sched.bars.reduce((s, b) => s + b.durMin, 0);
  const bottleneck = Object.entries(sched.lineLoad).sort((a, b) => b[1] - a[1])[0];
  if (info) info.innerHTML =
    `<span class="mfg-gi"><b>${sched.sorted.length - sched.unscheduled.length}</b> zákaziek</span>
     <span class="mfg-gi"><b>${sched.bars.length}</b> operácií</span>
     <span class="mfg-gi">Horizont: <b>${fmtDate(startDay)} → ${fmtDate(new Date(t1))}</b></span>
     <span class="mfg-gi">Σ práce: <b>${fmtDur(totalMin)}</b></span>
     ${bottleneck ? `<span class="mfg-gi mfg-gi-bn">Úzke miesto: <b>${escHtml(bottleneck[0])}</b> (${fmtDur(bottleneck[1])})</span>` : ''}`;

  // Legenda zákaziek
  if (legendEl) {
    const seen = new Set();
    const items = sched.bars.filter(b => { if (seen.has(b.orderId)) return false; seen.add(b.orderId); return true; });
    legendEl.innerHTML = items.map(b => `
      <button class="mfg-leg-chip ${mfgGanttSel === b.orderId ? 'active' : ''}" onclick="mfgGanttSelect('${b.orderId}')">
        <span class="mfg-leg-dot" style="background:${b.color}"></span>${escHtml(b.number || b.product)} <span class="mfg-leg-prod">${escHtml(b.product)}</span>
      </button>`).join('');
  }

  // Tok vybranej zákazky (procesná postupnosť cez pracoviská)
  if (flowEl) {
    if (!mfgGanttSel) { flowEl.classList.add('hidden'); flowEl.innerHTML = ''; }
    else {
      const chain = sched.bars.filter(b => b.orderId === mfgGanttSel).sort((a, b) => a.start - b.start);
      if (!chain.length) { flowEl.classList.add('hidden'); }
      else {
        const o = chain[0];
        flowEl.classList.remove('hidden');
        flowEl.innerHTML = `<div class="mfg-flow-hdr"><span class="mfg-leg-dot" style="background:${o.color}"></span><b>${escHtml(o.number || '')}</b> · ${escHtml(o.product)} · ${o.qty} ks <span class="mfg-flow-tot">tok: ${fmtDur(chain.reduce((s, b) => s + b.durMin, 0))}</span></div>
        <div class="mfg-flow-chain">${chain.map((b, i) => `<span class="mfg-flow-step${b.machine ? ' mach' : ''}"><span class="mfg-flow-line">${escHtml(b.line)}</span><span class="mfg-flow-op">${b.seq}. ${escHtml(b.desc)}</span><span class="mfg-flow-dur">${fmtDur(b.durMin)}</span></span>${i < chain.length - 1 ? '<span class="mfg-flow-arr">→</span>' : ''}`).join('')}</div>`;
      }
    }
  }
}

// ── Procesný Gantt: os Y = operácie (procesy), os X = čas; operácie nadväzujú ──
function renderMfgGanttProcess() {
  const chart = document.getElementById('mfgGanttChart'); if (!chart) return;
  chart.className = 'util-gantt mfg-gantt mfg-gantt-process';
  const info = document.getElementById('mfgGanttInfo');
  const legendEl = document.getElementById('mfgGanttLegend');
  const unEl = document.getElementById('mfgGanttUnsched');
  const flowEl = document.getElementById('mfgGanttFlow');
  if (flowEl) { flowEl.classList.add('hidden'); flowEl.innerHTML = ''; }

  // Zoznam vybrateľných položiek: aktívne zákazky s postupom, inak postupy (qty=1)
  const active = mfgOrders.filter(o => !['done', 'shipped'].includes(o.stage));
  let list = [];
  active.forEach(o => { const r = mfgMatchRouting(o.product); if (r && (r.operations || []).length) list.push({ id: 'o:' + o._id, label: `${o.number || ''} · ${o.product} (${o.qtyPlanned || 1} ks)`, order: o, routing: r }); });
  let viaRouting = false;
  if (!list.length) {
    viaRouting = true;
    list = mfgRoutings.filter(r => (r.operations || []).length).map(r => ({ id: 'r:' + r._id, label: `${r.product} (postup · 1 ks)`, order: null, routing: r }));
  }
  if (unEl) unEl.innerHTML = '';

  if (!list.length) {
    chart.innerHTML = '<div class="proc-empty" style="margin:20px">Žiadna zákazka ani postup na zobrazenie. Pridaj <strong>technologický postup</strong> a aktívnu <strong>výrobnú zákazku</strong>.</div>';
    if (info) info.innerHTML = ''; if (legendEl) legendEl.innerHTML = '';
    chart.style.minWidth = ''; return;
  }
  const ordSel = document.getElementById('mfgGanttOrder');
  if (!list.find(x => x.id === mfgGanttOrderId)) mfgGanttOrderId = list[0].id;
  if (ordSel) ordSel.innerHTML = list.map(x => `<option value="${x.id}" ${x.id === mfgGanttOrderId ? 'selected' : ''}>${escHtml(x.label)}</option>`).join('');
  const chosen = list.find(x => x.id === mfgGanttOrderId);

  // Sekvenčný rozvrh operácií (každá nadväzuje na predošlú — finish-to-start)
  const routing = chosen.routing, o = chosen.order;
  const coeff = Number(routing.coeff) || 1.1;
  const qty = o ? (o.qtyPlanned || 1) : 1;
  const ops = routing.operations.slice().sort((a, b) => String(a.group || '').localeCompare(String(b.group || '')));
  const base = (o && o.start) ? +new Date(o.start) : Date.now();
  let prev = base; const rows = [];
  ops.forEach((op, i) => { const dur = mfgOpBatchMin(op, coeff, qty) * 60000; const s = prev; const e = s + dur; prev = e; rows.push({ ...op, seq: i + 1, start: s, end: e, durMin: dur / 60000 }); });
  const t0 = base, t1 = rows.length ? rows[rows.length - 1].end : base + 36e5;

  const ax = mfgAxisTicks(t0, t1);
  const ws = ax.ws, winMs = ax.winMs;

  // Farby podľa linky (technológie)
  const lineColors = {}; let ci = 0;
  rows.forEach(r => { const l = r.line || '—'; if (!(l in lineColors)) lineColors[l] = MFG_ORDER_COLORS[ci++ % MFG_ORDER_COLORS.length]; });

  // Hlavička časovej osi
  let head = '<div class="ug-corner">Operácia / proces</div><div class="ug-days">';
  ax.ticks.forEach(tk => { head += `<div class="ug-day" style="left:${tk.left}%;width:${ax.stepPct}%"><span class="ug-day-d">${tk.label}</span></div>`; });
  head += '</div>';

  // Mriežka (zdieľaná pre všetky riadky)
  let grid = '';
  ax.ticks.forEach(tk => { grid += `<div class="ug-cell" style="left:${tk.left}%;width:${ax.stepPct}%"></div>`; });

  // Riadky = operácie
  let body = '';
  rows.forEach((r, i) => {
    const left = (r.start - ws) / winMs * 100, width = (r.end - r.start) / winMs * 100;
    const col = lineColors[r.line || '—'];
    const link = i > 0 ? `<div class="mfg-plink" style="left:${left}%"></div>` : '';
    const tip = `${r.seq}. ${r.code ? r.code + ' — ' : ''}${r.desc}\n${r.line || ''}${r.machine ? ' ⚙ strojový čas' : ''}\n${fmtDateTime(r.start)} → ${fmtDateTime(r.end)} (${fmtDur(r.durMin)})`;
    body += `<div class="ug-row mfg-prow">
      <div class="ug-eq mfg-plabel" title="${escHtml(r.desc)}">
        <span class="mfg-pseq">${r.seq}</span>
        <div class="ug-eq-txt"><span class="ug-eq-name">${escHtml(r.desc)}</span><span class="ug-eq-code"><span class="mfg-pline" style="background:${col}"></span>${escHtml(r.line || '—')}${r.machine ? ' · ⚙' : ''}</span></div>
      </div>
      <div class="ug-track">${grid}${link}<div class="ug-bar mfg-pbar${r.machine ? ' mfg-opbar-mach' : ''}" style="left:${left}%;width:${Math.max(width, 0.6)}%;top:4px;background:${col}" title="${escHtml(tip)}"><span class="ug-bar-lbl">${fmtDur(r.durMin)}</span></div></div>
    </div>`;
  });

  const now = Date.now(); let nowLine = '';
  if (now >= ws && now <= ws + winMs) nowLine = `<div class="ug-now" style="left:calc(220px + (100% - 220px) * ${(now - ws) / winMs})"></div>`;

  chart.innerHTML = `<div class="ug-head">${head}</div><div class="ug-body">${body}</div>${nowLine}`;
  const cols = ax.ticks.length;
  chart.style.minWidth = (220 + cols * (ax.step >= 864e5 ? mfgGanttDayW : 54)) + 'px';

  // Info
  const work = rows.reduce((s, r) => s + r.durMin, 0);
  const lead = (t1 - t0) / 60000;
  if (info) info.innerHTML =
    `<span class="mfg-gi"><b>${escHtml((o && o.number) ? o.number : routing.product)}</b>${o ? ' · ' + escHtml(o.product) : ' · postup'}</span>
     <span class="mfg-gi">Množstvo: <b>${qty} ks</b></span>
     <span class="mfg-gi"><b>${rows.length}</b> operácií</span>
     <span class="mfg-gi">Priebežný čas: <b>${fmtDur(lead)}</b></span>
     <span class="mfg-gi">Σ práce: <b>${fmtDur(work)}</b></span>
     ${viaRouting ? '<span class="mfg-gi mfg-gi-bn">bez zákazky — postup (1 ks)</span>' : ''}`;

  // Legenda = technológie (linky/pracoviská)
  if (legendEl) {
    legendEl.innerHTML = Object.entries(lineColors).map(([line, c]) =>
      `<span class="mfg-leg-chip"><span class="mfg-leg-dot" style="background:${c}"></span>${escHtml(line)}</span>`).join('');
  }
}

// ── Gantt rozvrh výroby + AI analýza/optimalizácia (vizuálne) ──────────────────
let prodGanttDays = 14;
let prodGanttStart = null;
function prodGanttInit() { if (!prodGanttStart) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 3); prodGanttStart = d; } }
function prodGanttShift(dir) { prodGanttInit(); prodGanttStart = new Date(prodGanttStart.getTime() + dir * prodGanttDays * 864e5); renderProdGantt(); }
function prodGanttToday() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 3); prodGanttStart = d; renderProdGantt(); }
function prodGanttSetRange(v) { prodGanttDays = Math.max(1, parseInt(v) || 14); renderProdGantt(); }

// Odvodí časový úsek zákazky (start..due); ak chýba, dopočíta rozumný rozsah
function prodSpan(o) {
  let s = o.start ? new Date(o.start) : null;
  let e = o.due ? new Date(o.due) : null;
  if (!s && !e) return null;
  if (!s) s = new Date(new Date(e).getTime() - 2 * 864e5);
  if (!e) e = new Date(new Date(s).getTime() + 2 * 864e5);
  if (e <= s) e = new Date(s.getTime() + 864e5);
  return { s, e };
}

function renderProdGantt() {
  const chart = document.getElementById('prodGanttChart'); if (!chart) return;
  prodGanttInit();
  const sel = document.getElementById('prodGanttRange'); if (sel) sel.value = String(prodGanttDays);
  renderProdAi();
  const ws = prodGanttStart.getTime(), winMs = prodGanttDays * 864e5, days = prodGanttDays;
  const lbl = document.getElementById('prodGanttLabel');
  if (lbl) lbl.textContent = `${fmtDate(prodGanttStart)} – ${fmtDate(new Date(ws + winMs - 1))}`;

  const items = prodFiltered();
  const groups = {};
  items.forEach(o => {
    const sp = prodSpan(o); if (!sp) return;
    if (sp.e.getTime() <= ws || sp.s.getTime() >= ws + winMs) return;
    const k = o.workstation || '— nepriradené —';
    (groups[k] = groups[k] || []).push({ o, sp });
  });

  let head = '<div class="ug-corner">Pracovisko</div><div class="ug-days">';
  for (let i = 0; i < days; i++) {
    const d = new Date(ws + i * 864e5); const wd = d.getDay(); const we = (wd === 0 || wd === 6);
    head += `<div class="ug-day${we ? ' ug-weekend' : ''}" style="left:${i / days * 100}%;width:${100 / days}%"><span class="ug-day-wd">${['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][wd]}</span><span class="ug-day-d">${d.getDate()}.${d.getMonth() + 1}.</span></div>`;
  }
  head += '</div>';

  let rows = '';
  Object.keys(groups).sort().forEach(line => {
    const arr = groups[line].sort((a, b) => a.sp.s - b.sp.s);
    const laneEnds = [];
    arr.forEach(it => { const s = it.sp.s.getTime(); let lane = laneEnds.findIndex(end => s >= end); if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.sp.e.getTime()); } else laneEnds[lane] = it.sp.e.getTime(); it._lane = lane; });
    const lanes = Math.max(1, laneEnds.length); const rowH = lanes * 34 + 8;
    // vyťaženie pracoviska v okne
    let used = 0; arr.forEach(({ sp }) => { const s = Math.max(sp.s.getTime(), ws), e = Math.min(sp.e.getTime(), ws + winMs); if (e > s) used += e - s; });
    const loadPct = Math.round(used / winMs * 100);
    const loadCls = loadPct > 85 ? 'pgl-hi' : loadPct > 50 ? 'pgl-mid' : 'pgl-lo';
    let grid = '';
    for (let i = 0; i < days; i++) { const d = new Date(ws + i * 864e5); const we = (d.getDay() === 0 || d.getDay() === 6); grid += `<div class="ug-cell${we ? ' ug-weekend' : ''}" style="left:${i / days * 100}%;width:${100 / days}%"></div>`; }
    let bars = '';
    arr.forEach(it => {
      const o = it.o; const s = Math.max(it.sp.s.getTime(), ws), e = Math.min(it.sp.e.getTime(), ws + winMs); if (e <= s) return;
      const left = (s - ws) / winMs * 100, width = (e - s) / winMs * 100; const st = prodStageMap(o.stage); const od = prodOverdue(o);
      const prio = PROD_PRIO[o.priority] || PROD_PRIO.normal;
      const p = Math.max(0, Math.min(100, o.progress || 0));
      const cust = o.customer || o.product || '';
      const label = `${o.priority === 'urgent' ? '🔴 ' : ''}${escHtml(cust)}${o.number ? ` · ${escHtml(o.number)}` : ''}`;
      const tip = `${o.number || ''} · ${o.product}\nZákazník: ${o.customer || '—'}\n${o.qtyDone || 0}/${o.qtyPlanned || 0} ${o.unit || 'ks'} (${p} %) · ${st.label}${o.due ? '\nTermín: ' + fmtDate(o.due) : ''}${od ? ' ⚠ po termíne' : ''}`;
      const prioEdge = (o.priority === 'urgent' || o.priority === 'high') ? `box-shadow: inset 4px 0 0 ${prio.c};` : '';
      bars += `<div class="ug-bar pg-bar${od ? ' pg-bar-late' : ''}" style="left:${left}%;width:${Math.max(width, 2)}%;top:${it._lane * 34 + 4}px;background:${st.c};${prioEdge}" title="${escHtml(tip)}" onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))">
        <span class="ug-bar-lbl">${label}</span>
        <span class="pg-bar-prog"><i style="width:${p}%"></i></span>
      </div>`;
    });
    const cnt = arr.length;
    rows += `<div class="ug-row" style="height:${rowH}px">
      <div class="ug-eq" style="cursor:default">
        <div class="ug-eq-txt" style="flex:1">
          <span class="ug-eq-name">${escHtml(line)}</span>
          <span class="ug-eq-load"><span class="ug-eq-loadbar"><i class="${loadCls}" style="width:${Math.min(100, loadPct)}%"></i></span><span class="ug-eq-loadval">${loadPct}% · ${cnt}</span></span>
        </div>
      </div>
      <div class="ug-track">${grid}${bars}</div></div>`;
  });
  if (!Object.keys(groups).length) rows = '<div class="proc-empty" style="margin:20px">Žiadne naplánované zákazky v tomto období. Doplň termíny alebo posuň rozsah.</div>';

  const now = Date.now(); let nowLine = '';
  if (now >= ws && now <= ws + winMs) nowLine = `<div class="ug-now" style="left:calc(180px + (100% - 180px) * ${(now - ws) / winMs})"></div>`;
  chart.innerHTML = `<div class="ug-head">${head}</div><div class="ug-body">${rows}</div>${nowLine}`;
  const dayW = days <= 7 ? 96 : days <= 14 ? 78 : 58;
  chart.style.minWidth = (180 + days * dayW) + 'px';
}

// ── "AI" analýza & optimalizácia (rule-based, prezentované ako AI) ─────────────
function prodDaysLate(o) { return Math.max(1, Math.round((Date.now() - new Date(o.due)) / 864e5)); }
function prodAiAnalyze() {
  prodGanttInit();
  const orders = prodData;
  const now = new Date(new Date().toDateString());
  const active = orders.filter(o => !['done', 'shipped'].includes(o.stage));
  const overdue = active.filter(o => o.due && new Date(o.due) < now);
  const unscheduled = active.filter(o => !o.start && !o.due);
  const unassigned = active.filter(o => !o.workstation);
  const urgentLate = active.filter(o => o.priority === 'urgent' && o.due && new Date(o.due) < now);

  const ws = prodGanttStart.getTime(), winMs = prodGanttDays * 864e5, we = ws + winMs;
  const lines = {};
  active.forEach(o => { const sp = prodSpan(o); if (!sp) return; const k = o.workstation || '— nepriradené —'; (lines[k] = lines[k] || []).push({ o, sp }); });
  const loads = []; let conflicts = 0; const conflictPairs = [];
  Object.keys(lines).forEach(name => {
    const arr = lines[name]; let used = 0;
    arr.forEach(({ sp }) => { const s = Math.max(sp.s.getTime(), ws), e = Math.min(sp.e.getTime(), we); if (e > s) used += e - s; });
    loads.push({ name, pct: Math.round(used / winMs * 100), count: arr.length });
    const sorted = arr.slice().sort((a, b) => a.sp.s - b.sp.s);
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++)
      if (sorted[i].sp.e > sorted[j].sp.s && sorted[i].sp.s < sorted[j].sp.e) { conflicts++; conflictPairs.push([sorted[i].o, sorted[j].o]); }
  });
  loads.sort((a, b) => b.pct - a.pct);
  const overloaded = loads.filter(l => l.pct > 85);

  let score = 100 - overdue.length * 8 - conflicts * 6 - overloaded.length * 10 - unscheduled.length * 3 - urgentLate.length * 10 - unassigned.length * 2;
  score = Math.max(5, Math.min(100, Math.round(score)));

  const findings = [];
  findings.push(overdue.length ? { t: 'bad', m: `<b>${overdue.length}</b> ${overdue.length === 1 ? 'zákazka' : 'zákaziek'} po termíne` } : { t: 'ok', m: 'Žiadne zákazky po termíne' });
  findings.push(conflicts ? { t: 'bad', m: `<b>${conflicts}</b> ${conflicts === 1 ? 'konflikt prekrytia' : 'konfliktov prekrytia'} na pracoviskách` } : { t: 'ok', m: 'Žiadne kapacitné konflikty' });
  if (overloaded.length) findings.push({ t: 'warn', m: `Preťažené: ${overloaded.map(l => escHtml(l.name) + ' (' + l.pct + '%)').join(', ')}` });
  if (unassigned.length) findings.push({ t: 'warn', m: `<b>${unassigned.length}</b> zákaziek bez pracoviska` });
  if (unscheduled.length) findings.push({ t: 'warn', m: `<b>${unscheduled.length}</b> zákaziek bez termínu` });
  if (loads.length) findings.push({ t: 'info', m: `Najvyťaženejšie: <b>${escHtml(loads[0].name)}</b> (${loads[0].pct}%)` });

  const sugg = [];
  urgentLate.forEach(o => sugg.push(`⏫ Uprednostni urgentnú <b>${escHtml(o.number || o.product)}</b> — mešká ${prodDaysLate(o)} dní.`));
  overdue.filter(o => o.priority !== 'urgent').slice(0, 3).forEach(o => sugg.push(`📅 Presuň <b>${escHtml(o.number || o.product)}</b> na začiatok radu — mešká ${prodDaysLate(o)} dní.`));
  if (overloaded.length) { const free = loads.filter(l => l.pct < 50); overloaded.forEach(l => sugg.push(`⚖️ <b>${escHtml(l.name)}</b> vyťažená na ${l.pct}% — presuň časť zákaziek${free.length ? ` na <b>${escHtml(free[0].name)}</b> (${free[0].pct}%)` : ' na voľnejšie pracovisko'}.`)); }
  conflictPairs.slice(0, 2).forEach(([a, b]) => sugg.push(`🔀 <b>${escHtml(a.number || a.product)}</b> a <b>${escHtml(b.number || b.product)}</b> sa prekrývajú — posuň jednu o 1–2 dni.`));
  if (unassigned.length) sugg.push(`🏭 Prideľ pracovisko k <b>${unassigned.length}</b> zákazkám.`);
  if (unscheduled.length) sugg.push(`🗓️ Doplň termíny k <b>${unscheduled.length}</b> zákazkám.`);
  if (!sugg.length) sugg.push('✅ Plán je vyvážený — žiadne kritické úpravy nie sú potrebné.');

  return { score, findings, suggestions: sugg, loads, overdue: overdue.length, conflicts };
}

function renderProdAi() {
  const el = document.getElementById('prodAi'); if (!el) return;
  const a = prodAiAnalyze();
  const col = a.score >= 80 ? '#10b981' : a.score >= 55 ? '#f59e0b' : '#ef4444';
  const lbl = a.score >= 80 ? 'Zdravý plán' : a.score >= 55 ? 'Vyžaduje pozornosť' : 'Kritický stav';
  el.innerHTML = `
    <div class="pg-ai-grid">
      <div class="pg-ai-card">
        <div class="pg-ai-head">🤖 AI analýza plánu</div>
        <div class="pg-score-wrap"><div class="pg-score" style="color:${col}">${a.score}<span>/100</span></div><div class="pg-score-lbl" style="color:${col}">${lbl}</div></div>
        <ul class="pg-findings">${a.findings.map(f => `<li class="pgf-${f.t}">${f.m}</li>`).join('')}</ul>
      </div>
      <div class="pg-ai-card">
        <div class="pg-ai-head">✨ AI optimalizácia <span class="pg-ai-badge">návrh</span></div>
        <ul class="pg-sugg">${a.suggestions.slice(0, 4).map(s => `<li>${s}</li>`).join('')}${a.suggestions.length > 4 ? `<li class="pg-sugg-more">+ ${a.suggestions.length - 4} ďalších odporúčaní</li>` : ''}</ul>
        <button class="btn-primary pg-opt-btn" onclick="prodOptimize()">✨ Optimalizovať plán</button>
        <div class="pg-opt-note" id="prodOptNote"></div>
      </div>
    </div>`;
}

function prodOptimize() {
  const note = document.getElementById('prodOptNote'); const btn = document.querySelector('.pg-opt-btn');
  if (!note || !btn) return;
  btn.disabled = true; btn.textContent = '🧠 Analyzujem…';
  note.innerHTML = '<div class="pg-opt-prog"><div></div></div>';
  setTimeout(() => {
    const a = prodAiAnalyze();
    const gain = Math.min(100 - a.score, a.overdue * 5 + a.conflicts * 4 + 6);
    const proj = Math.min(100, a.score + gain);
    btn.disabled = false; btn.textContent = '✨ Optimalizovať plán';
    note.innerHTML = `<div class="pg-opt-result">
      <div class="pg-opt-arrow">${a.score} <span>→</span> <b>${proj}</b> / 100</div>
      <p>Navrhované kroky: zoradenie podľa <b>priority a termínov</b>, rozloženie záťaže z preťažených pracovísk a posun prekrývajúcich sa zákaziek. <i>Vizuálny návrh — neukladá sa do plánu.</i></p>
    </div>`;
  }, 1100);
}

// ==============================
// POUŽÍVATELIA (admin)
// ==============================
let usersData = [];
const US_ROLE = { admin: 'Admin', user: 'Používateľ' };
async function loadUsers() {
  const el = document.getElementById('usersList'); if (el) el.innerHTML = '<div class="admin-loading">Načítavam…</div>';
  try {
    const r = await fetch('/api/users');
    if (r.status === 403) { if (el) el.innerHTML = '<div class="admin-loading">Len admin má prístup k správe používateľov.</div>'; return; }
    usersData = await r.json(); if (!Array.isArray(usersData)) usersData = [];
  } catch { usersData = []; }
  renderUsers();
}
function renderUsers() {
  const el = document.getElementById('usersList'); if (!el) return;
  if (!usersData.length) { el.innerHTML = '<div class="admin-loading">Žiadni používatelia.</div>'; return; }
  el.innerHTML = '';
  usersData.forEach(u => {
    const item = document.createElement('div');
    item.className = 'admin-link-item' + (u.active ? '' : ' admin-link-inactive');
    item.innerHTML = `
      <span class="ql-chip ql-${u.role === 'admin' ? 'purple' : 'blue'} admin-link-chip">${u.role === 'admin' ? 'ADMIN' : 'USER'}</span>
      <div class="admin-link-info">
        <div class="admin-link-label">${escHtml(u.name || u.username)} <span style="color:var(--text-xdim)">@${escHtml(u.username)}</span></div>
        <div class="admin-link-url">${US_ROLE[u.role] || u.role}${u.active ? '' : ' · neaktívny'}</div>
      </div>
      <div class="admin-link-actions">
        <button class="admin-icon-btn" onclick="openUserModal(usersData.find(x=>x._id==='${u._id}'))" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteUser('${u._id}')" title="Odstrániť">✕</button>
      </div>`;
    el.appendChild(item);
  });
}
function openUserModal(u = null) {
  const e = u && typeof u === 'object';
  document.getElementById('usModalTitle').textContent = e ? 'Upraviť používateľa' : 'Nový používateľ';
  document.getElementById('usId').value = e ? u._id : '';
  document.getElementById('usUsername').value = e ? u.username : '';
  document.getElementById('usUsername').disabled = !!e;
  document.getElementById('usName').value = e ? (u.name || '') : '';
  document.getElementById('usPassword').value = '';
  document.getElementById('usPassLabel').textContent = e ? 'Nové heslo (nechaj prázdne = bez zmeny)' : 'Heslo *';
  document.getElementById('usRole').value = e ? (u.role || 'user') : 'user';
  document.getElementById('usActive').checked = e ? !!u.active : true;
  document.getElementById('usDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('userModal').classList.remove('hidden');
}
function closeUserModal() { document.getElementById('userModal').classList.add('hidden'); }
async function saveUser() {
  const id = document.getElementById('usId').value;
  const username = document.getElementById('usUsername').value.trim();
  const password = document.getElementById('usPassword').value;
  if (!id && (!username || !password)) { alert('Meno a heslo sú povinné'); return; }
  const body = {
    name: document.getElementById('usName').value.trim(),
    role: document.getElementById('usRole').value,
    active: document.getElementById('usActive').checked
  };
  if (password) body.password = password;
  if (!id) body.username = username;
  try {
    const resp = await fetch(id ? '/api/users/' + id : '/api/users', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); alert('Chyba: ' + (er.error || resp.status)); return; }
    closeUserModal(); loadUsers();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteUser(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť používateľa?')) return;
  try {
    const r = await fetch('/api/users/' + id, { method: 'DELETE' });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeUserModal(); loadUsers();
  } catch { alert('Chyba'); }
}

// ==============================
// INTERROGÁTORY (evidencia kusov + história opráv)
// ==============================
let interrogatorsData = [];
const IG_STATUS = {
  sklad:    { l: 'Na sklade',  c: 'proc-status-draft' },
  predany:  { l: 'Predaný',    c: 'proc-status-active' },
  zakaznik: { l: 'U zákazníka',c: 'proc-status-active' },
  oprava:   { l: 'V oprave',   c: 'proc-status-archived' },
  vyradeny: { l: 'Vyradený',   c: 'proc-status-archived' },
};
async function loadInterrogators() {
  try { interrogatorsData = await fetch('/api/interrogators').then(r => r.json()); if (!Array.isArray(interrogatorsData)) interrogatorsData = []; }
  catch { interrogatorsData = []; }
  renderInterrogators();
}
function renderInterrogators() {
  const tb = document.getElementById('intgBody'); if (!tb) return;
  const q = (document.getElementById('intgSearch')?.value || '').toLowerCase();
  const items = interrogatorsData.filter(i => !q || (i.serial || '').toLowerCase().includes(q) ||
    (i.customer || '').toLowerCase().includes(q) || (i.model || '').toLowerCase().includes(q) || (i.soldTo || '').toLowerCase().includes(q));
  if (!items.length) { tb.innerHTML = '<tr><td colspan="8" class="owners-empty">Žiadne interrogátory.</td></tr>'; return; }
  tb.innerHTML = '';
  items.forEach(i => {
    const st = IG_STATUS[i.status] || IG_STATUS.sklad;
    const rc = (i.repairs || []).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escHtml(i.serial)}</strong></td>
      <td>${escHtml(i.model || '')}${i.channels ? ' · ' + i.channels + ' kn.' : ''}</td>
      <td>${i.manufacturedAt ? fmtDate(i.manufacturedAt) : '—'}</td>
      <td><span class="proc-status-badge ${st.c}">${st.l}</span></td>
      <td>${escHtml(i.customer || '—')}</td>
      <td>${i.soldAt ? fmtDate(i.soldAt) : '—'}</td>
      <td>${rc ? '🔧 ' + rc : '—'}</td>
      <td class="owner-actions">
        <button class="admin-icon-btn" onclick="openInterrogatorModal(interrogatorsData.find(x=>x._id==='${i._id}'))" title="Detail / upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteInterrogator('${i._id}')" title="Odstrániť">✕</button>
      </td>`;
    tb.appendChild(tr);
  });
}
function addRepairRow(r = {}) {
  const c = document.getElementById('igRepairs');
  const row = document.createElement('div'); row.className = 'proc-row';
  row.innerHTML = `
    <input type="date" class="rp-date" value="${r.date ? String(r.date).slice(0, 10) : ''}" style="max-width:140px">
    <input type="text" class="rp-desc" placeholder="Popis opravy" value="${escHtml(r.description || '')}" style="flex:2">
    <input type="text" class="rp-tech" placeholder="Technik" value="${escHtml(r.technician || '')}">
    <input type="text" class="rp-cost" placeholder="Cena" value="${escHtml(r.cost || '')}" style="max-width:90px">
    <button type="button" class="proc-row-del" onclick="procRemoveRow(this)">✕</button>`;
  c.appendChild(row);
}
function openInterrogatorModal(i = null) {
  const e = i && typeof i === 'object';
  document.getElementById('igModalTitle').textContent = e ? ('Interrogátor ' + (i.serial || '')) : 'Nový interrogátor';
  const v = (id, val) => { document.getElementById(id).value = val; };
  v('igId', e ? i._id : ''); v('igSerial', e ? (i.serial || '') : ''); v('igModel', e ? (i.model || 'S-line') : 'S-line');
  v('igChannels', e && i.channels ? i.channels : ''); v('igFirmware', e ? (i.firmware || '') : ''); v('igHw', e ? (i.hwRevision || '') : '');
  v('igMade', e && i.manufacturedAt ? String(i.manufacturedAt).slice(0, 10) : '');
  v('igStatus', e ? (i.status || 'sklad') : 'sklad'); v('igLocation', e ? (i.location || '') : '');
  v('igCustomer', e ? (i.customer || '') : ''); v('igSoldTo', e ? (i.soldTo || '') : '');
  v('igSoldAt', e && i.soldAt ? String(i.soldAt).slice(0, 10) : ''); v('igWarranty', e && i.warrantyUntil ? String(i.warrantyUntil).slice(0, 10) : '');
  v('igNotes', e ? (i.notes || '') : '');
  document.getElementById('igRepairs').innerHTML = '';
  (e && i.repairs ? i.repairs : []).forEach(addRepairRow);
  document.getElementById('igDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('interrogatorModal').classList.remove('hidden');
}
function closeInterrogatorModal() { document.getElementById('interrogatorModal').classList.add('hidden'); }
async function saveInterrogator() {
  const serial = document.getElementById('igSerial').value.trim();
  if (!serial) { alert('Zadajte sériové číslo'); return; }
  const repairs = [...document.querySelectorAll('#igRepairs .proc-row')].map(r => ({
    date: r.querySelector('.rp-date').value || null, description: r.querySelector('.rp-desc').value.trim(),
    technician: r.querySelector('.rp-tech').value.trim(), cost: r.querySelector('.rp-cost').value.trim()
  })).filter(x => x.description || x.date);
  const num = (id) => { const x = document.getElementById(id).value; return x ? Number(x) : null; };
  const dt = (id) => document.getElementById(id).value || null;
  const body = {
    serial, model: document.getElementById('igModel').value.trim(), channels: num('igChannels'),
    firmware: document.getElementById('igFirmware').value.trim(), hwRevision: document.getElementById('igHw').value.trim(),
    manufacturedAt: dt('igMade'), status: document.getElementById('igStatus').value,
    location: document.getElementById('igLocation').value.trim(), customer: document.getElementById('igCustomer').value.trim(),
    soldTo: document.getElementById('igSoldTo').value.trim(), soldAt: dt('igSoldAt'), warrantyUntil: dt('igWarranty'),
    notes: document.getElementById('igNotes').value.trim(), repairs
  };
  const id = document.getElementById('igId').value;
  try {
    const r = await fetch(id ? '/api/interrogators/' + id : '/api/interrogators', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeInterrogatorModal(); loadInterrogators();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteInterrogator(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť tento interrogátor z evidencie?')) return;
  try { await fetch('/api/interrogators/' + id, { method: 'DELETE' }); closeInterrogatorModal(); loadInterrogators(); } catch { alert('Chyba'); }
}

// ==============================
// VLASTNÍCI PRODUKTOV (PO / BO)
// ==============================
let ownersData = [];
let userOptions = null;
async function loadUserOptions() {
  if (userOptions) return userOptions;
  try { userOptions = await fetch('/api/users/options').then(r => r.json()); if (!Array.isArray(userOptions)) userOptions = []; }
  catch { userOptions = []; }
  return userOptions;
}
function userName(u) { return u ? (u.name || u.username || '—') : '—'; }
async function loadOwners() {
  await loadUserOptions();
  try { ownersData = await fetch('/api/owners').then(r => r.json()); if (!Array.isArray(ownersData)) ownersData = []; }
  catch { ownersData = []; }
  renderOwners();
}
function renderOwners() {
  const tb = document.getElementById('ownersBody'); if (!tb) return;
  const q = (document.getElementById('ownerSearch')?.value || '').toLowerCase();
  const items = ownersData.filter(o => !q || (o.product || '').toLowerCase().includes(q) ||
    userName(o.po).toLowerCase().includes(q) || userName(o.bo).toLowerCase().includes(q));
  if (!items.length) { tb.innerHTML = '<tr><td colspan="7" class="owners-empty">Žiadne záznamy.</td></tr>'; return; }
  const today = calYmd(new Date());
  tb.innerHTML = '';
  items.forEach(o => {
    const expired = o.validTo && String(o.validTo).slice(0, 10) < today;
    const tr = document.createElement('tr');
    if (expired) tr.className = 'owner-expired';
    tr.innerHTML = `
      <td><strong>${escHtml(o.product)}</strong></td>
      <td>👤 ${escHtml(userName(o.po))}</td>
      <td>${o.bo ? '🔁 ' + escHtml(userName(o.bo)) : '—'}</td>
      <td>${o.validFrom ? fmtDate(o.validFrom) : '—'}</td>
      <td>${o.validTo ? fmtDate(o.validTo) : '—'}</td>
      <td class="owner-note">${escHtml(o.note || '')}</td>
      <td class="owner-actions">
        <button class="admin-icon-btn" onclick="openOwnerModal(ownersData.find(x=>x._id==='${o._id}'))" title="Upraviť">✎</button>
        <button class="admin-icon-btn danger" onclick="deleteOwner('${o._id}')" title="Odstrániť">✕</button>
      </td>`;
    tb.appendChild(tr);
  });
}
function fillUserSelect(sel, val) {
  sel.innerHTML = '<option value="">— nikto —</option>' + (userOptions || []).map(u => `<option value="${u._id}">${escHtml(userName(u))}</option>`).join('');
  sel.value = val || '';
}
async function openOwnerModal(o = null) {
  await loadUserOptions();
  const e = o && typeof o === 'object';
  document.getElementById('owModalTitle').textContent = e ? 'Upraviť vlastníctvo' : 'Nový záznam vlastníctva';
  document.getElementById('owId').value = e ? o._id : '';
  document.getElementById('owProduct').value = e ? (o.product || '') : '';
  fillUserSelect(document.getElementById('owPO'), e && o.po ? (o.po._id || o.po) : '');
  fillUserSelect(document.getElementById('owBO'), e && o.bo ? (o.bo._id || o.bo) : '');
  document.getElementById('owFrom').value = e && o.validFrom ? String(o.validFrom).slice(0, 10) : calYmd(new Date());
  document.getElementById('owTo').value = e && o.validTo ? String(o.validTo).slice(0, 10) : '';
  document.getElementById('owNote').value = e ? (o.note || '') : '';
  document.getElementById('owDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('ownerModal').classList.remove('hidden');
}
function closeOwnerModal() { document.getElementById('ownerModal').classList.add('hidden'); }
async function saveOwner() {
  const product = document.getElementById('owProduct').value.trim();
  if (!product) { alert('Zadajte produkt'); return; }
  const body = {
    product, po: document.getElementById('owPO').value || null, bo: document.getElementById('owBO').value || null,
    validFrom: document.getElementById('owFrom').value || null, validTo: document.getElementById('owTo').value || null,
    note: document.getElementById('owNote').value.trim()
  };
  const id = document.getElementById('owId').value;
  try {
    const r = await fetch(id ? '/api/owners/' + id : '/api/owners', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeOwnerModal(); loadOwners();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteOwner(id) {
  if (!id || !await uiConfirm('Odstrániť záznam vlastníctva?')) return;
  try { await fetch('/api/owners/' + id, { method: 'DELETE' }); closeOwnerModal(); loadOwners(); } catch { alert('Chyba'); }
}

// ==============================
// DATASHEETY (editor → Word + tlač do PDF)
// ==============================
let datasheetsData = [];
let dsDescEditor = null;
let dsImagesData = [];
let currentDatasheet = null;

async function loadDatasheets() {
  backToDatasheetList();
  try { datasheetsData = await fetch('/api/datasheets').then(r => r.json()); if (!Array.isArray(datasheetsData)) datasheetsData = []; }
  catch { datasheetsData = []; }
  renderDatasheets();
}
function renderDatasheets() {
  const el = document.getElementById('dsList'); if (!el) return;
  const q = (document.getElementById('dsSearch')?.value || '').toLowerCase();
  const items = datasheetsData.filter(d => !q || (d.title || '').toLowerCase().includes(q) || (d.partNumber || '').toLowerCase().includes(q));
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne datasheety.<div class="proc-empty-actions"><button class="btn-primary" onclick="openDatasheetModal()">+ Vytvoriť datasheet</button></div></div>'; return; }
  el.innerHTML = '';
  items.forEach(d => {
    const card = document.createElement('div');
    card.className = 'proc-card';
    card.innerHTML = `
      <div class="proc-card-main" onclick="showDatasheetDetail('${d._id}')">
        <div class="proc-card-top"><span class="proc-card-title">${escHtml(d.title)}</span>
          <span class="proc-status-badge ${d.status === 'released' ? 'proc-status-active' : 'proc-status-draft'}">${d.status === 'released' ? 'Released' : 'Draft'}</span></div>
        <div class="proc-card-meta">${d.partNumber ? `<span>🔖 ${escHtml(d.partNumber)}</span>` : ''}${d.category ? `<span>🏷️ ${escHtml(d.category)}</span>` : ''}<span>v${escHtml(d.version || '1.0')}</span><span>🕒 ${fmtDate(d.updatedAt)}</span></div>
      </div>
      <div class="proc-card-actions">
        <button class="btn-word" onclick="dsWord('${d._id}')" title="Word">⬇ Word</button>
        <button class="admin-icon-btn" onclick="showDatasheetDetail('${d._id}')" title="Náhľad">👁</button>
        <button class="admin-icon-btn danger" onclick="deleteDatasheet('${d._id}')" title="Odstrániť">✕</button>
      </div>`;
    el.appendChild(card);
  });
}
function dsWord(id) { window.location.href = `/api/datasheets/${id}/docx${tokenQS()}`; }

function renderDatasheetDetailHtml(p) {
  const meta = [['Part number', p.partNumber], ['Model', p.model], ['Kategória', p.category], ['Verzia', p.version], ['Dátum', fmtDate(p.date)], ['Stav', p.status === 'released' ? 'Released' : 'Draft']].filter(r => r[1]);
  const list = (arr) => (arr || []).filter(x => (x || '').trim()).map(x => `<li>${escHtml(x)}</li>`).join('');
  const specs = (p.specs || []).filter(s => (s.param || '').trim());
  const ord = (p.ordering || []).filter(o => (o.code || o.description || '').trim());
  let h = `<div class="dsv-head"><div class="dsv-eyebrow">DATASHEET</div><h1 class="dsv-title">${escHtml(p.title || '')}</h1>${p.tagline ? `<div class="dsv-tag">${escHtml(p.tagline)}</div>` : ''}</div>`;
  h += `<table class="dsv-meta">${meta.map(([k, v]) => `<tr><th>${k}</th><td>${escHtml(String(v))}</td></tr>`).join('')}</table>`;
  if ((p.description || '').trim()) h += `<div class="dsv-section"><h3>Popis</h3><div class="dsv-rich">${p.description}</div></div>`;
  if (list(p.features)) h += `<div class="dsv-section"><h3>Vlastnosti</h3><ul>${list(p.features)}</ul></div>`;
  if (specs.length) h += `<div class="dsv-section"><h3>Špecifikácie</h3><table class="dsv-specs"><thead><tr><th>Parameter</th><th>Hodnota</th><th>Jednotka</th></tr></thead><tbody>${specs.map(s => `<tr><td>${escHtml(s.param)}</td><td>${escHtml(s.value || '')}</td><td>${escHtml(s.unit || '')}</td></tr>`).join('')}</tbody></table></div>`;
  if (list(p.applications)) h += `<div class="dsv-section"><h3>Aplikácie</h3><ul>${list(p.applications)}</ul></div>`;
  if ((p.dimensions || '').trim()) h += `<div class="dsv-section"><h3>Rozmery</h3><p>${escHtml(p.dimensions).replace(/\n/g, '<br>')}</p></div>`;
  if (ord.length) h += `<div class="dsv-section"><h3>Objednávacie informácie</h3><table class="dsv-specs"><thead><tr><th>Kód</th><th>Popis</th></tr></thead><tbody>${ord.map(o => `<tr><td>${escHtml(o.code || '')}</td><td>${escHtml(o.description || '')}</td></tr>`).join('')}</tbody></table></div>`;
  if ((p.images || []).length) h += `<div class="dsv-section dsv-images">${p.images.map(im => `<figure><img src="${escHtml(im.url)}" alt="">${im.caption ? `<figcaption>${escHtml(im.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`;
  if ((p.notes || '').trim()) h += `<div class="dsv-section"><h3>Poznámky</h3><p>${escHtml(p.notes).replace(/\n/g, '<br>')}</p></div>`;
  return h;
}
async function showDatasheetDetail(id) {
  let p = datasheetsData.find(x => x._id === id);
  try { const f = await fetch('/api/datasheets/' + id).then(r => r.json()); if (f && !f.error) p = f; } catch {}
  if (!p) { alert('Nepodarilo sa načítať'); return; }
  currentDatasheet = p;
  const det = document.getElementById('dsDetail');
  det.innerHTML = `
    <div class="pdv-toolbar">
      <button class="btn-secondary" onclick="backToDatasheetList()">← Späť</button>
      <div class="pdv-toolbar-actions">
        <button class="btn-word" onclick="dsWord('${p._id}')">⬇ Word</button>
        <button class="btn-primary" onclick="printDatasheet()">🖨 Tlač / PDF</button>
        <button class="btn-edit" onclick="openDatasheetModal(currentDatasheet)">✎ Upraviť</button>
      </div>
    </div>
    <div class="ds-paper" id="dsPaper">${renderDatasheetDetailHtml(p)}</div>`;
  document.getElementById('dsListView').classList.add('hidden');
  det.classList.remove('hidden');
}
function backToDatasheetList() {
  document.getElementById('dsDetail')?.classList.add('hidden');
  document.getElementById('dsListView')?.classList.remove('hidden');
}
function printDatasheet() { document.body.classList.add('printing-ds'); window.print(); setTimeout(() => document.body.classList.remove('printing-ds'), 500); }

function addSpecRow(s = {}) {
  const c = document.getElementById('dsSpecs'); const row = document.createElement('div'); row.className = 'proc-row';
  row.innerHTML = `<input type="text" class="sp-param" placeholder="Parameter" value="${escHtml(s.param || '')}" style="flex:2">
    <input type="text" class="sp-value" placeholder="Hodnota" value="${escHtml(s.value || '')}">
    <input type="text" class="sp-unit" placeholder="Jedn." value="${escHtml(s.unit || '')}" style="max-width:90px">
    <button type="button" class="proc-row-del" onclick="procRemoveRow(this)">✕</button>`;
  c.appendChild(row);
}
function addOrderRow(o = {}) {
  const c = document.getElementById('dsOrdering'); const row = document.createElement('div'); row.className = 'proc-row';
  row.innerHTML = `<input type="text" class="or-code" placeholder="Kód" value="${escHtml(o.code || '')}">
    <input type="text" class="or-desc" placeholder="Popis" value="${escHtml(o.description || '')}" style="flex:2">
    <button type="button" class="proc-row-del" onclick="procRemoveRow(this)">✕</button>`;
  c.appendChild(row);
}
function renderDsImages() {
  const el = document.getElementById('dsImages'); if (!el) return;
  el.innerHTML = '';
  dsImagesData.forEach((img, i) => { const d = document.createElement('div'); d.className = 'image-preview-item'; d.innerHTML = `<img src="${escHtml(img.url)}" alt=""><button class="image-preview-remove" onclick="removeDsImage(${i})">✕</button>`; el.appendChild(d); });
}
function removeDsImage(i) { dsImagesData.splice(i, 1); renderDsImages(); }
async function addDatasheetImage() { const url = await pickImageUpload(); if (url) { dsImagesData.push({ url, caption: '' }); renderDsImages(); } }

function openDatasheetModal(p = null) {
  const e = p && typeof p === 'object';
  document.getElementById('dsModalTitle').textContent = e ? 'Upraviť datasheet' : 'Nový datasheet';
  const v = (id, val) => document.getElementById(id).value = val;
  v('dsId', e ? p._id : ''); v('dsTitle', e ? (p.title || '') : ''); v('dsPart', e ? (p.partNumber || '') : '');
  v('dsTagline', e ? (p.tagline || '') : ''); v('dsModel', e ? (p.model || '') : ''); v('dsCategory', e ? (p.category || 'Sensing systems') : 'Sensing systems');
  v('dsVersion', e ? (p.version || '1.0') : '1.0'); v('dsDate', e && p.date ? String(p.date).slice(0, 10) : calYmd(new Date()));
  v('dsStatus', e ? (p.status || 'draft') : 'draft');
  v('dsFeatures', e ? (p.features || []).join('\n') : ''); v('dsApps', e ? (p.applications || []).join('\n') : '');
  v('dsDimensions', e ? (p.dimensions || '') : ''); v('dsNotes', e ? (p.notes || '') : '');
  document.getElementById('dsSpecs').innerHTML = ''; ((e && p.specs && p.specs.length) ? p.specs : [{}]).forEach(addSpecRow);
  document.getElementById('dsOrdering').innerHTML = ''; ((e && p.ordering && p.ordering.length) ? p.ordering : [{}]).forEach(addOrderRow);
  dsImagesData = e ? [...(p.images || [])] : []; renderDsImages();
  enableFileDrop(document.getElementById('dsImages'), (files) => dropImagesTo(files, (url) => { dsImagesData.push({ url, caption: '' }); renderDsImages(); }));
  if (dsDescEditor) { try { dsDescEditor.destroy(); } catch (_) {} dsDescEditor = null; }
  dsDescEditor = mountStepEditor(document.getElementById('dsDescEditor'), e ? (p.description || '') : '');
  document.getElementById('dsDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('datasheetModal').classList.remove('hidden');
}
function closeDatasheetModal() { document.getElementById('datasheetModal').classList.add('hidden'); }
async function saveDatasheet() {
  const title = document.getElementById('dsTitle').value.trim();
  if (!title) { alert('Zadajte názov produktu'); return; }
  const lines = (id) => document.getElementById(id).value.split('\n').map(s => s.trim()).filter(Boolean);
  const specs = [...document.querySelectorAll('#dsSpecs .proc-row')].map(r => ({ param: r.querySelector('.sp-param').value.trim(), value: r.querySelector('.sp-value').value.trim(), unit: r.querySelector('.sp-unit').value.trim() })).filter(s => s.param);
  const ordering = [...document.querySelectorAll('#dsOrdering .proc-row')].map(r => ({ code: r.querySelector('.or-code').value.trim(), description: r.querySelector('.or-desc').value.trim() })).filter(o => o.code || o.description);
  const body = {
    title, partNumber: document.getElementById('dsPart').value.trim(), tagline: document.getElementById('dsTagline').value.trim(),
    model: document.getElementById('dsModel').value.trim(), category: document.getElementById('dsCategory').value.trim(),
    version: document.getElementById('dsVersion').value.trim(), date: document.getElementById('dsDate').value || undefined,
    status: document.getElementById('dsStatus').value, description: dsDescEditor ? dsDescEditor.getHTML() : '',
    features: lines('dsFeatures'), applications: lines('dsApps'), specs, ordering,
    dimensions: document.getElementById('dsDimensions').value.trim(), notes: document.getElementById('dsNotes').value.trim(), images: dsImagesData
  };
  const id = document.getElementById('dsId').value;
  try {
    const r = await fetch(id ? '/api/datasheets/' + id : '/api/datasheets', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeDatasheetModal(); loadDatasheets();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteDatasheet(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť datasheet?')) return;
  try { await fetch('/api/datasheets/' + id, { method: 'DELETE' }); closeDatasheetModal(); loadDatasheets(); } catch { alert('Chyba'); }
}

// ==============================
// MANAŽMENT — prehľad + anonymné otázky
// ==============================
const PHASE_LABELS = { koncept: 'Koncept', prototyp: 'Prototyp', testovanie: 'Testovanie', vyroba: 'Výroba', ukoncene: 'Ukončené' };
const IGS_LABELS = { sklad: 'Na sklade', predany: 'Predaný', zakaznik: 'U zákazníka', oprava: 'V oprave', vyradeny: 'Vyradený' };

async function loadManagement() {
  await renderMgmtQuestions();
  loadSalesAnalytics();
  let s = null;
  try { s = await fetch('/api/management/summary').then(r => r.json()); } catch {}
  if (!s || s.error) { document.getElementById('mgmtStats').innerHTML = '<div class="mgmt-empty">Prehľad sa nepodarilo načítať.</div>'; return; }

  const card = (label, val, sub, cls) => `<div class="mgmt-stat ${cls || ''}"><div class="mgmt-stat-val">${val}</div><div class="mgmt-stat-lbl">${label}</div>${sub ? `<div class="mgmt-stat-sub">${sub}</div>` : ''}</div>`;
  document.getElementById('mgmtStats').innerHTML =
    card('Aktívne úlohy', s.taskTotals.open, '', 'st-blue') +
    card('Po termíne', s.taskTotals.overdue, '', s.taskTotals.overdue ? 'st-red' : '') +
    card('Hotové úlohy', s.taskTotals.done, '', 'st-green') +
    card('Projekty', s.projectsTotal, (s.phases.vyroba || 0) + ' vo výrobe', 'st-cyan') +
    card('Interrogátory', s.igTotal, (s.igStatus.sklad || 0) + ' na sklade', 'st-cyan');

  renderMgmtAnalytics(s);

  // Kto na čom pracuje
  const u = document.getElementById('mgmtUsers');
  if (!s.users.length) u.innerHTML = '<div class="mgmt-empty">Žiadne úlohy zatiaľ.</div>';
  else u.innerHTML = s.users.map(x => {
    const proj = (s.ownerProjects[x.name] || []).map(p => `<span class="mgmt-proj-chip">${escHtml(p.title)}</span>`).join('');
    return `<div class="mgmt-user">
      <div class="mgmt-user-top"><span class="mgmt-user-name">${escHtml(x.name)}</span>
        <span class="mgmt-user-counts">${x.open} aktívnych${x.overdue ? ` · <span class="task-od">${x.overdue} po termíne</span>` : ''} · ${x.done} hotových</span></div>
      ${proj ? `<div class="mgmt-user-proj">${proj}</div>` : ''}
    </div>`;
  }).join('');

  // Projekty podľa fáz
  document.getElementById('mgmtPhases').innerHTML = Object.keys(PHASE_LABELS).map(k =>
    `<div class="mgmt-bar-row"><span>${PHASE_LABELS[k]}</span><span class="mgmt-bar-val">${s.phases[k] || 0}</span></div>`).join('');
  // Interrogátory podľa stavu
  document.getElementById('mgmtInterr').innerHTML = Object.keys(IGS_LABELS).map(k =>
    `<div class="mgmt-bar-row"><span>${IGS_LABELS[k]}</span><span class="mgmt-bar-val">${s.igStatus[k] || 0}</span></div>`).join('');

  // ── Dovolenky ────────────────────────────────────────────────────────────
  const vacEl = document.getElementById('mgmtVacations');
  if (vacEl) {
    const vacs = s.vacations || [];
    if (!vacs.length) {
      vacEl.innerHTML = '<div class="mgmt-empty">Žiadne plánované dovolenky v najbližších 30 dňoch.</div>';
    } else {
      vacEl.innerHTML = vacs.map(v => {
        const dateFrom = v.date ? new Date(v.date).toLocaleDateString('sk-SK', {day:'numeric', month:'numeric', year:'numeric'}) : '—';
        const dateTo   = v.endDate ? new Date(v.endDate).toLocaleDateString('sk-SK', {day:'numeric', month:'numeric', year:'numeric'}) : null;
        const dateStr  = dateTo && dateTo !== dateFrom ? `${dateFrom} – ${dateTo}` : dateFrom;
        const active   = v.isActive;
        return `<div class="mgmt-vac-row${active ? ' vac-active' : ''}">
          <span class="mgmt-vac-icon">${active ? '🏖️' : '📅'}</span>
          <div class="mgmt-vac-info">
            <span class="mgmt-vac-person">${escHtml(v.person)}</span>
            ${v.title && v.title !== v.person ? `<span class="mgmt-vac-title">${escHtml(v.title)}</span>` : ''}
          </div>
          <div class="mgmt-vac-right">
            <span class="mgmt-vac-dates">${dateStr}</span>
            ${active ? '<span class="vac-badge-now">Teraz</span>' : ''}
          </div>
        </div>`;
      }).join('');
    }
  }
}

// ── R&D & výrobné analytiky (vizuálne) ────────────────────────────────────────
function _svgDonut(segs, size = 96) {
  const r = size / 2 - 8, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  const total = segs.reduce((a, s) => a + s.v, 0) || 1;
  let off = 0;
  const arcs = segs.filter(s => s.v > 0).map(s => {
    const len = C * s.v / total;
    const c = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.c}" stroke-width="11" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    off += len; return c;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="11"/>${arcs}
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="currentColor" font-size="${(size * 0.28).toFixed(0)}" font-weight="700">${segs.reduce((a, s) => a + s.v, 0)}</text>
  </svg>`;
}
function _svgGauge(pct, size = 124) {
  pct = Math.max(0, Math.min(100, pct));
  const r = size / 2 - 11, cx = size / 2, cy = size / 2, C = Math.PI * r;
  const len = C * pct / 100;
  const col = pct >= 85 ? '#10b981' : pct >= 55 ? '#fbbf24' : '#67e8f9';
  const d = `M11 ${cy} A ${r} ${r} 0 0 1 ${size - 11} ${cy}`;
  return `<svg width="${size}" height="${size / 2 + 8}" viewBox="0 0 ${size} ${size / 2 + 8}">
    <path d="${d}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="11" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}"/>
  </svg>`;
}

function renderMgmtAnalytics(s) {
  const el = document.getElementById('mgmtAnalytics');
  if (!el) return;
  const cards = [];

  // 1) Vyťaženie R&D tímu (kapacita) — z reálnych úloh
  const users = s.users || [];
  if (users.length) {
    const utils = users.map(u => {
      const util = Math.min(130, Math.round(u.open * 15 + u.overdue * 12));
      return { name: u.name, util, open: u.open, overdue: u.overdue };
    }).sort((a, b) => b.util - a.util);
    const avg = Math.round(utils.reduce((a, u) => a + Math.min(100, u.util), 0) / utils.length);
    const rows = utils.map(u => {
      const w = Math.min(100, u.util);
      const cls = u.util >= 90 ? 'hi' : u.util >= 60 ? 'mid' : 'lo';
      return `<div class="an-cap-row">
        <div class="an-cap-top"><span class="an-cap-name">${escHtml(u.name)}</span><span class="an-cap-pct">${u.util}%${u.util > 100 ? ' ⚠' : ''}</span></div>
        <div class="an-cap-track"><div class="an-cap-fill ${cls}" style="width:${w}%"></div></div>
        <div class="an-cap-sub">${u.open} aktívnych${u.overdue ? ' · ' + u.overdue + ' po termíne' : ''}</div>
      </div>`;
    }).join('');
    const badge = avg >= 90 ? 'bad' : avg >= 70 ? 'warn' : 'ok';
    cards.push(`<div class="an-card">
      <div class="an-card-hdr"><span class="an-title">👥 Vyťaženie R&D tímu</span><span class="an-badge ${badge}">Ø ${avg}%</span></div>
      ${rows}
      <div class="an-foot-note">Odhad z počtu aktívnych úloh a sklzov · &gt;100 % = preťaženie</div>
    </div>`);
  }

  // 2) Rozloženie projektov podľa fáz — donut (reálne)
  const phaseColors = { koncept: '#6366f1', prototyp: '#00d4ff', testovanie: '#fbbf24', vyroba: '#10b981', ukoncene: '#64748b' };
  const phaseSegs = Object.keys(PHASE_LABELS).map(k => ({ v: s.phases[k] || 0, c: phaseColors[k], l: PHASE_LABELS[k] }));
  const phaseTotal = phaseSegs.reduce((a, x) => a + x.v, 0);
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">🗂️ Projekty podľa fáz</span><span class="an-badge info">${phaseTotal} spolu</span></div>
    <div class="an-donut-wrap">
      <div style="color:#e8f0fb">${_svgDonut(phaseSegs)}</div>
      <div class="an-legend">${phaseSegs.map(x => `<div class="an-leg-row"><span class="an-leg-dot" style="background:${x.c}"></span>${x.l}<span class="an-leg-val">${x.v}</span></div>`).join('')}</div>
    </div>
  </div>`);

  // 3) Výrobná kapacita interrogátorov — gauge (cieľ kvartál, ilustračný)
  const produced = s.igTotal || 0;
  const target = Math.max(24, Math.ceil((produced || 1) / 6) * 6 + 6);
  const pct = Math.round(produced / target * 100);
  const gBadge = pct >= 85 ? 'ok' : pct >= 55 ? 'warn' : 'bad';
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">🏭 Výrobná kapacita</span><span class="an-badge ${gBadge}">${pct}%</span></div>
    <div class="an-gauge-wrap">
      <div style="color:#e8f0fb">${_svgGauge(pct)}</div>
      <div class="an-gauge-meta">
        <div><span class="an-gauge-big">${produced}</span> / ${target}</div>
        <div class="an-gauge-lbl">interrogátorov · cieľ kvartálu</div>
        <div class="an-gauge-lbl">${s.igStatus?.oprava || 0} v oprave · ${s.igStatus?.sklad || 0} na sklade</div>
      </div>
    </div>
    <div class="an-foot-note">Cieľ kvartálu je ilustračný (odvodený od stavu)</div>
  </div>`);

  // 4) Priepustnosť tímu (velocity) — 8 týždňov (ilustračný trend ukotvený na hotové úlohy)
  const done = s.taskTotals?.done || 0;
  const base = Math.max(3, Math.round(done / 8) || 4);
  const wave = [0.7, 0.85, 0.6, 1.0, 0.8, 1.15, 0.95, 1.1];
  const velo = wave.map((w, i) => Math.max(1, Math.round(base * w) + (i === 7 ? 0 : 0)));
  const vmax = Math.max(...velo, 1);
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">⚡ Priepustnosť tímu</span><span class="an-badge info">${velo.reduce((a, b) => a + b, 0)} / 8 týž.</span></div>
    <div class="an-bars">${velo.map((v, i) => `<div class="an-bar-col"><div class="an-bar-stack"><div class="an-bar real" style="height:${Math.round(v / vmax * 100)}%"></div></div><div class="an-bar-x">T${i + 1}</div></div>`).join('')}</div>
    <div class="an-foot-note">Hotové úlohy / týždeň — ilustračný trend (Σ hotových: ${done})</div>
  </div>`);

  // 5) Plán vs. dostupná kapacita — najbližších 6 týždňov (ilustračné)
  const teamCap = Math.max(1, users.length) * 5; // 5 "kapacitných bodov"/osoba/týždeň
  const planW = [0.9, 1.05, 0.8, 1.2, 0.95, 0.7];
  const pmax = Math.max(teamCap, ...planW.map(w => teamCap * w));
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">📅 Plán vs. kapacita</span><span class="an-badge info">6 týždňov</span></div>
    <div class="an-bars">${planW.map((w, i) => {
      const plan = Math.round(teamCap * w);
      const ph = Math.round(teamCap / pmax * 100);
      const planh = Math.round(plan / pmax * 100);
      return `<div class="an-bar-col"><div class="an-bar-stack" style="flex-direction:row;align-items:flex-end;gap:2px;max-width:30px">
        <div class="an-bar real" style="height:${planh}%;width:50%" title="Plán: ${plan}"></div>
        <div class="an-bar plan" style="height:${ph}%;width:50%" title="Kapacita: ${teamCap}"></div>
      </div><div class="an-bar-x">T${i + 1}</div></div>`;
    }).join('')}</div>
    <div class="an-bars-legend"><span><i style="background:linear-gradient(180deg,#00d4ff,#6366f1)"></i> Plán</span><span><i style="background:rgba(99,102,241,0.55)"></i> Dostupná kapacita</span></div>
    <div class="an-foot-note">Kapacita = ${users.length || 0} ľudí × 5 b./týž. · ilustračné</div>
  </div>`);

  // 6) R&D pipeline — funnel (reálne fázy)
  const fn = [
    { l: 'Koncept', v: s.phases.koncept || 0, c: '#6366f1' },
    { l: 'Prototyp', v: s.phases.prototyp || 0, c: '#00d4ff' },
    { l: 'Testovanie', v: s.phases.testovanie || 0, c: '#fbbf24' },
    { l: 'Výroba', v: s.phases.vyroba || 0, c: '#10b981' },
  ];
  const fmax = Math.max(...fn.map(x => x.v), 1);
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">🔬 R&D pipeline</span><span class="an-badge info">lievik</span></div>
    <div class="an-funnel">${fn.map(x => `<div class="an-fn-row"><span class="an-fn-lbl">${x.l}</span><div class="an-fn-bar" style="width:${Math.max(12, x.v / fmax * 100)}%;background:${x.c}">${x.v}</div></div>`).join('')}</div>
    <div class="an-foot-note">Počet projektov v jednotlivých fázach vývoja</div>
  </div>`);

  // 7) Interrogátory podľa stavu — stacked bar (reálne)
  const igColors = { sklad: '#10b981', predany: '#6366f1', zakaznik: '#00d4ff', oprava: '#f59e0b', vyradeny: '#64748b' };
  const igTot = s.igTotal || 0;
  const igSegs = Object.keys(IGS_LABELS).map(k => ({ l: IGS_LABELS[k], v: s.igStatus[k] || 0, c: igColors[k] })).filter(x => x.v > 0);
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">📟 Interrogátory — stav</span><span class="an-badge info">${igTot} ks</span></div>
    <div class="an-stackbar">${igTot ? igSegs.map(x => `<div class="an-stackbar-seg" style="width:${x.v / igTot * 100}%;background:${x.c}" title="${x.l}: ${x.v}"></div>`).join('') : ''}</div>
    <div class="an-stack-legend">${igSegs.map(x => `<div class="an-leg-row"><span class="an-leg-dot" style="background:${x.c}"></span>${x.l}<span class="an-leg-val">${x.v}</span></div>`).join('') || '<span class="mgmt-empty">Žiadne interrogátory.</span>'}</div>
  </div>`);

  el.innerHTML = cards.join('');
}

// ── Predaj · tržby · ziskovosť ────────────────────────────────────────────────
const SALE_CAT_COLORS = { 'FBG senzory': '#00d4ff', 'Interrogátory': '#6366f1', 'Káble': '#10b981', 'Služby': '#f59e0b', 'Ostatné': '#64748b' };
function eur(n) {
  n = Math.round(n || 0);
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace('.', ',') + ' k€';
  return n + ' €';
}
function eurFull(n) { return Math.round(n || 0).toLocaleString('sk-SK') + ' €'; }

async function loadSalesAnalytics() {
  const months = parseInt(document.getElementById('mgmtSalesRange')?.value) || 12;
  let s = null;
  try { s = await fetch('/api/management/sales?months=' + months).then(r => r.json()); } catch {}
  const kpiEl = document.getElementById('mgmtSalesKpis');
  const anEl = document.getElementById('mgmtSalesAnalytics');
  if (!kpiEl || !anEl) return;
  if (!s || s.error || !s.orders) {
    kpiEl.innerHTML = '';
    anEl.innerHTML = '<div class="an-card" style="grid-column:1/-1"><div class="an-empty">Žiadne predajné dáta za zvolené obdobie. Klikni na <strong>🎲 Ukážkové dáta</strong> pre demo.</div></div>';
    return;
  }

  // KPI
  const stat = (label, val, sub, cls) => `<div class="mgmt-stat ${cls || ''}"><div class="mgmt-stat-val">${val}</div><div class="mgmt-stat-lbl">${label}</div>${sub ? `<div class="mgmt-stat-sub">${sub}</div>` : ''}</div>`;
  const gArrow = s.growth > 0 ? '▲' : s.growth < 0 ? '▼' : '▬';
  kpiEl.innerHTML =
    stat('Tržby', eur(s.revenue), s.months + ' mes. · ' + s.orders + ' predajov', 'st-cyan') +
    stat('Zisk', eur(s.profit), 'po odpočítaní nákladov', 'st-green') +
    stat('Marža', s.margin + '%', s.margin >= 45 ? 'výborná' : s.margin >= 30 ? 'dobrá' : 'nízka', s.margin >= 45 ? 'st-green' : s.margin >= 30 ? 'st-blue' : 'st-red') +
    stat('Rast (m/m)', gArrow + ' ' + Math.abs(s.growth) + '%', 'oproti min. mesiacu', s.growth >= 0 ? 'st-green' : 'st-red') +
    stat('Priem. predaj', eur(s.avgOrder), 'hodnota objednávky', 'st-blue');

  const cards = [];

  // 1) Mesačný trend tržieb + zisku (bars)
  const mx = Math.max(...s.monthly.map(m => m.revenue), 1);
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">📈 Tržby & zisk po mesiacoch</span><span class="an-badge info">${s.months} mes.</span></div>
    <div class="an-bars sales-bars">${s.monthly.map(m => {
      const rh = Math.round(m.revenue / mx * 100);
      const ph = Math.round(m.profit / mx * 100);
      return `<div class="an-bar-col" title="${m.label}: tržby ${eurFull(m.revenue)} · zisk ${eurFull(m.profit)}">
        <div class="an-bar-stack" style="flex-direction:row;align-items:flex-end;gap:2px;max-width:34px">
          <div class="an-bar real" style="height:${rh}%;width:55%"></div>
          <div class="an-bar profit" style="height:${ph}%;width:45%"></div>
        </div><div class="an-bar-x">${m.label.slice(0, 2)}</div></div>`;
    }).join('')}</div>
    <div class="an-bars-legend"><span><i style="background:linear-gradient(180deg,#00d4ff,#6366f1)"></i> Tržby</span><span><i style="background:#10b981"></i> Zisk</span></div>
  </div>`);

  // 2) Celková marža — gauge
  const mBadge = s.margin >= 45 ? 'ok' : s.margin >= 30 ? 'warn' : 'bad';
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">🎯 Zisková marža</span><span class="an-badge ${mBadge}">${s.margin}%</span></div>
    <div class="an-gauge-wrap">
      <div style="color:#e8f0fb">${_svgGauge(s.margin)}</div>
      <div class="an-gauge-meta">
        <div><span class="an-gauge-big">${s.margin}%</span></div>
        <div class="an-gauge-lbl">zisk ${eur(s.profit)} z tržieb ${eur(s.revenue)}</div>
        <div class="an-gauge-lbl">náklady ${eur(s.cost)}</div>
      </div>
    </div>
    <div class="an-foot-note">Hrubá marža = zisk / tržby</div>
  </div>`);

  // 3) Tržby podľa kategórie — donut
  const catSegs = s.byCategory.map(c => ({ v: c.revenue, c: SALE_CAT_COLORS[c.name] || '#64748b', l: c.name }));
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">🧩 Tržby podľa kategórie</span><span class="an-badge info">${eur(s.revenue)}</span></div>
    <div class="an-donut-wrap">
      <div style="color:#e8f0fb">${_svgDonut(catSegs.map(x => ({ v: x.v, c: x.c })))}</div>
      <div class="an-legend">${catSegs.map(x => `<div class="an-leg-row"><span class="an-leg-dot" style="background:${x.c}"></span>${escHtml(x.l)}<span class="an-leg-val">${eur(x.v)}</span></div>`).join('')}</div>
    </div>
  </div>`);

  // 4) Top zákazníci podľa tržieb (cap rows)
  const cmax = Math.max(...s.byCustomer.map(c => c.revenue), 1);
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">🏢 Top zákazníci</span><span class="an-badge info">${s.byCustomer.length}</span></div>
    ${s.byCustomer.map(c => `<div class="an-cap-row">
      <div class="an-cap-top"><span class="an-cap-name">${escHtml(c.name)}</span><span class="an-cap-pct">${eur(c.revenue)}</span></div>
      <div class="an-cap-track"><div class="an-cap-fill lo" style="width:${Math.round(c.revenue / cmax * 100)}%"></div></div>
      <div class="an-cap-sub">zisk ${eur(c.profit)} · marža ${c.margin}% · ${c.orders} obj.</div>
    </div>`).join('')}
  </div>`);

  // 5) Ziskovosť podľa produktu (cap rows, farba podľa marže)
  const pmax = Math.max(...s.byProduct.map(p => p.revenue), 1);
  cards.push(`<div class="an-card">
    <div class="an-card-hdr"><span class="an-title">📦 Ziskovosť produktov</span><span class="an-badge info">${s.byProduct.length}</span></div>
    ${s.byProduct.slice(0, 8).map(p => {
      const cls = p.margin >= 50 ? 'lo' : p.margin >= 30 ? 'mid' : 'hi';
      return `<div class="an-cap-row">
        <div class="an-cap-top"><span class="an-cap-name">${escHtml(p.name)}</span><span class="an-cap-pct">marža ${p.margin}%</span></div>
        <div class="an-cap-track"><div class="an-cap-fill ${cls}" style="width:${Math.round(p.revenue / pmax * 100)}%"></div></div>
        <div class="an-cap-sub">tržby ${eur(p.revenue)} · zisk ${eur(p.profit)} · ${p.qty} ks</div>
      </div>`;
    }).join('')}
    <div class="an-foot-note">Zoradené podľa zisku · farba = výška marže</div>
  </div>`);

  anEl.innerHTML = cards.join('');
}

async function seedSalesData() {
  if (!await uiConfirm('Vygenerovať ukážkové predajné dáta za 12 mesiacov? Nahradia sa len predošlé ukážkové dáta.')) return;
  try {
    const r = await fetch('/api/admin/seed-sales', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { alert('Chyba: ' + (d.error || r.status)); return; }
    loadSalesAnalytics();
    setTimeout(() => alert('Hotovo — vytvorených ' + d.inserted + ' predajov.'), 200);
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}

async function renderMgmtQuestions() {
  const el = document.getElementById('mgmtQList'); if (!el) return;
  let qs = [];
  try { qs = await fetch('/api/questions').then(r => r.json()); if (!Array.isArray(qs)) qs = []; } catch { qs = []; }
  const isAdmin = CURRENT_USER && CURRENT_USER.role === 'admin';
  if (!qs.length) { el.innerHTML = '<div class="mgmt-empty">Zatiaľ žiadne otázky.</div>'; return; }
  el.innerHTML = qs.map(q => `
    <div class="mgmt-q ${q.answered ? 'answered' : ''}">
      <div class="mgmt-q-text">❓ ${escHtml(q.text)}</div>
      ${q.answer ? `<div class="mgmt-q-answer">💬 ${escHtml(q.answer)}</div>` : ''}
      <div class="mgmt-q-foot">
        <span class="mgmt-q-date">${fmtDate(q.createdAt)}${q.answered ? ' · zodpovedané' : ''}</span>
        ${isAdmin ? `<span class="mgmt-q-actions">
          <button class="btn-sm" onclick="answerQuestion('${q._id}', ${JSON.stringify(q.answer || '').replace(/"/g, '&quot;')})">${q.answered ? 'Upraviť odpoveď' : 'Odpovedať'}</button>
          <button class="admin-icon-btn danger" onclick="deleteQuestion('${q._id}')">✕</button>
        </span>` : ''}
      </div>
    </div>`).join('');
}
async function submitQuestion() {
  const inp = document.getElementById('mgmtQInput');
  const text = inp.value.trim();
  if (!text) { alert('Napíš otázku'); return; }
  try {
    const r = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); alert('Chyba: ' + (e.error || r.status)); return; }
    inp.value = '';
    renderMgmtQuestions();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function answerQuestion(id, current) {
  const ans = window.prompt('Odpoveď na otázku:', current || '');
  if (ans === null) return;
  try {
    await fetch('/api/questions/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: ans }) });
    renderMgmtQuestions();
  } catch { alert('Chyba'); }
}
async function deleteQuestion(id) {
  if (!await uiConfirm('Odstrániť otázku?')) return;
  try { await fetch('/api/questions/' + id, { method: 'DELETE' }); renderMgmtQuestions(); } catch { alert('Chyba'); }
}

// ==============================
// DRAG & DROP — generický helper
// ==============================
function enableFileDrop(el, onFiles, opts = {}) {
  if (!el || el._dropWired) return;
  el._dropWired = true;
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => {
    e.preventDefault(); el.classList.remove('drag-over');
    const files = [...(e.dataTransfer.files || [])];
    if (files.length) onFiles(files, e);
    else if (opts.onText) {
      const t = e.dataTransfer.getData('text/html') || e.dataTransfer.getData('text/plain');
      if (t) opts.onText(t);
    }
  });
}
async function dropImagesTo(files, cb) {
  for (const f of files) {
    if (f.type && !/^image\//.test(f.type)) continue;
    const url = await uploadImage(f);
    if (url) cb(url);
  }
}

// ==============================
// CRM (kontakty + emaily, drag-drop)
// ==============================
let contactsData = [];
let crmSelected = null;          // contactId | 'none' | null
let crmEmailsData = [];
const CRM_STATUS = { lead: { l: 'Lead', c: 'proc-status-draft' }, active: { l: 'Aktívny', c: 'proc-status-active' }, inactive: { l: 'Neaktívny', c: 'proc-status-archived' } };

async function loadCrm() {
  try { contactsData = await fetch('/api/crm/contacts').then(r => r.json()); if (!Array.isArray(contactsData)) contactsData = []; } catch { contactsData = []; }
  renderContacts();
  if (crmSelected) selectContact(crmSelected); else renderCrmMain();
}
function renderContacts() {
  const el = document.getElementById('crmContactList'); if (!el) return;
  const q = (document.getElementById('crmSearch')?.value || '').toLowerCase();
  const items = contactsData.filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
  el.innerHTML = '';
  if (!items.length) { el.innerHTML = '<div class="crm-empty-sm">Žiadne kontakty.</div>'; }
  items.forEach(c => {
    const st = CRM_STATUS[c.status] || CRM_STATUS.lead;
    const d = document.createElement('div');
    d.className = 'crm-contact' + (crmSelected === c._id ? ' active' : '');
    d.onclick = () => selectContact(c._id);
    d.innerHTML = `<div class="crm-contact-name">${escHtml(c.name)}</div>
      <div class="crm-contact-sub">${escHtml(c.company || c.email || '')} <span class="proc-status-badge ${st.c}">${st.l}</span></div>`;
    el.appendChild(d);
  });
  document.getElementById('crmUnassigned')?.classList.toggle('active', crmSelected === 'none');
}
async function selectContact(id) {
  crmSelected = id;
  renderContacts();
  await loadCrmEmails();
  renderCrmMain();
}
async function loadCrmEmails() {
  if (!crmSelected) { crmEmailsData = []; return; }
  try { crmEmailsData = await fetch('/api/crm/emails?contact=' + crmSelected).then(r => r.json()); if (!Array.isArray(crmEmailsData)) crmEmailsData = []; } catch { crmEmailsData = []; }
}
function renderCrmMain() {
  const m = document.getElementById('crmMain'); if (!m) return;
  if (!crmSelected) { m.innerHTML = '<div class="crm-empty">Vyber kontakt vľavo, alebo pretiahni email na „Nezaradené".</div>'; return; }
  const c = crmSelected === 'none' ? null : contactsData.find(x => x._id === crmSelected);
  const head = c
    ? `<div class="crm-detail-hdr">
         <div><h1 class="crm-detail-name">${escHtml(c.name)}</h1>
           <div class="crm-detail-meta">${[c.company, c.email, c.phone].filter(Boolean).map(escHtml).join(' · ')}</div>
           ${c.note ? `<div class="crm-detail-note">${escHtml(c.note)}</div>` : ''}</div>
         <div class="pdv-toolbar-actions">
           <button class="btn-edit" onclick="openContactModal(contactsData.find(x=>x._id==='${c._id}'))">✎ Upraviť</button>
         </div>
       </div>`
    : `<div class="crm-detail-hdr"><div><h1 class="crm-detail-name">📥 Nezaradené emaily</h1><div class="crm-detail-meta">Emaily zatiaľ bez priradeného kontaktu</div></div></div>`;

  m.innerHTML = head + `
    <div class="crm-dropzone" id="crmDrop">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v16H4z" opacity="0"/><path d="M22 12.5V18a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h11"/><polyline points="3 6 12 13 17 9"/></svg>
      <div>Pretiahni sem <strong>email</strong> (.eml/.msg) alebo súbor — automaticky sa pridá</div>
      <button class="btn-sm" onclick="document.getElementById('crmEmailFile').click()">alebo vyber súbor</button>
      <input type="file" id="crmEmailFile" multiple accept=".eml,.msg,message/rfc822,*/*" style="display:none" onchange="crmHandleFiles([...this.files]); this.value=''">
      <button class="btn-sm" onclick="openCrmEmailModal()">+ Pridať ručne</button>
    </div>
    <div id="crmEmailList" class="crm-email-list"></div>`;

  enableFileDrop(document.getElementById('crmDrop'),
    (files) => crmHandleFiles(files),
    { onText: (t) => crmHandleText(t) });
  renderCrmEmails();
}
function renderCrmEmails() {
  const el = document.getElementById('crmEmailList'); if (!el) return;
  if (!crmEmailsData.length) { el.innerHTML = '<div class="crm-empty-sm">Žiadne emaily. Pretiahni sem email.</div>'; return; }
  el.innerHTML = '';
  crmEmailsData.forEach(e => {
    const d = document.createElement('div');
    d.className = 'crm-email';
    d.innerHTML = `
      <div class="crm-email-main" onclick="openCrmEmailModal(crmEmailsData.find(x=>x._id==='${e._id}'))">
        <div class="crm-email-subj">✉️ ${escHtml(e.subject)}</div>
        <div class="crm-email-meta">${e.from ? escHtml(e.from) + ' · ' : ''}${fmtDate(e.date)}</div>
        ${e.body ? `<div class="crm-email-snippet">${escHtml(e.body.slice(0, 160))}</div>` : ''}
      </div>
      <div class="crm-email-actions">
        ${e.fileUrl ? `<a class="admin-icon-btn" href="${escHtml(e.fileUrl)}" target="_blank" title="Súbor">📎</a>` : ''}
        <button class="admin-icon-btn danger" onclick="deleteCrmEmail('${e._id}')" title="Odstrániť">✕</button>
      </div>`;
    el.appendChild(d);
  });
}
async function uploadEmailFile(file) {
  const fd = new FormData(); fd.append('file', file);
  try { const r = await fetch('/api/crm/emails/upload', { method: 'POST', body: fd }); return await r.json(); }
  catch { return null; }
}
async function crmHandleFiles(files) {
  const contact = crmSelected === 'none' ? null : crmSelected;
  for (const f of files) {
    const meta = await uploadEmailFile(f);
    if (!meta || meta.error) continue;
    await fetch('/api/crm/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact, subject: meta.subject, from: meta.from, to: meta.to, date: meta.date, body: meta.body, fileUrl: meta.fileUrl }) });
  }
  await loadCrmEmails(); renderCrmEmails();
}
async function crmHandleText(t) {
  const contact = crmSelected === 'none' ? null : crmSelected;
  const text = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return;
  const subject = text.slice(0, 60);
  await fetch('/api/crm/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact, subject, body: text }) });
  await loadCrmEmails(); renderCrmEmails();
}

// Kontakt modal
function openContactModal(c = null) {
  const e = c && typeof c === 'object';
  document.getElementById('coModalTitle').textContent = e ? 'Upraviť kontakt' : 'Nový kontakt';
  document.getElementById('coId').value = e ? c._id : '';
  document.getElementById('coName').value = e ? (c.name || '') : '';
  document.getElementById('coCompany').value = e ? (c.company || '') : '';
  document.getElementById('coEmail').value = e ? (c.email || '') : '';
  document.getElementById('coPhone').value = e ? (c.phone || '') : '';
  document.getElementById('coStatus').value = e ? (c.status || 'lead') : 'lead';
  document.getElementById('coTags').value = e ? (c.tags || []).join(', ') : '';
  document.getElementById('coNote').value = e ? (c.note || '') : '';
  document.getElementById('coDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('contactModal').classList.remove('hidden');
}
function closeContactModal() { document.getElementById('contactModal').classList.add('hidden'); }
async function saveContact() {
  const name = document.getElementById('coName').value.trim();
  if (!name) { alert('Zadajte meno'); return; }
  const body = {
    name, company: document.getElementById('coCompany').value.trim(), email: document.getElementById('coEmail').value.trim(),
    phone: document.getElementById('coPhone').value.trim(), status: document.getElementById('coStatus').value,
    tags: document.getElementById('coTags').value.split(',').map(s => s.trim()).filter(Boolean),
    note: document.getElementById('coNote').value.trim()
  };
  const id = document.getElementById('coId').value;
  try {
    const r = await fetch(id ? '/api/crm/contacts/' + id : '/api/crm/contacts', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const saved = await r.json();
    if (!r.ok) { alert('Chyba: ' + (saved.error || r.status)); return; }
    closeContactModal();
    await loadCrm();
    if (saved._id) selectContact(saved._id);
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteContact(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť kontakt? (emaily ostanú ako nezaradené)')) return;
  try { await fetch('/api/crm/contacts/' + id, { method: 'DELETE' }); closeContactModal(); crmSelected = null; loadCrm(); } catch { alert('Chyba'); }
}

// CRM email modal
function openCrmEmailModal(em = null) {
  const e = em && typeof em === 'object';
  document.getElementById('ceModalTitle').textContent = e ? 'Email' : 'Nový email';
  document.getElementById('ceId').value = e ? em._id : '';
  document.getElementById('ceSubject').value = e ? (em.subject || '') : '';
  document.getElementById('ceDate').value = e && em.date ? String(em.date).slice(0, 10) : calYmd(new Date());
  document.getElementById('ceFrom').value = e ? (em.from || '') : '';
  document.getElementById('ceTo').value = e ? (em.to || '') : '';
  document.getElementById('ceBody').value = e ? (em.body || '') : '';
  const sel = document.getElementById('ceContact');
  sel.innerHTML = '<option value="">— nezaradené —</option>' + contactsData.map(c => `<option value="${c._id}">${escHtml(c.name)}${c.company ? ' (' + escHtml(c.company) + ')' : ''}</option>`).join('');
  sel.value = e ? (em.contact || '') : (crmSelected && crmSelected !== 'none' ? crmSelected : '');
  const fw = document.getElementById('ceFileWrap');
  if (e && em.fileUrl) { fw.style.display = ''; const a = document.getElementById('ceFile'); a.href = em.fileUrl; a.textContent = '📎 ' + em.fileUrl.split('/').pop(); }
  else fw.style.display = 'none';
  document.getElementById('ceDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('crmEmailModal').classList.remove('hidden');
}
function closeCrmEmailModal() { document.getElementById('crmEmailModal').classList.add('hidden'); }
async function saveCrmEmail() {
  const body = {
    subject: document.getElementById('ceSubject').value.trim() || '(bez predmetu)',
    date: document.getElementById('ceDate').value || undefined,
    from: document.getElementById('ceFrom').value.trim(), to: document.getElementById('ceTo').value.trim(),
    contact: document.getElementById('ceContact').value || null,
    body: document.getElementById('ceBody').value.trim()
  };
  const id = document.getElementById('ceId').value;
  try {
    const r = await fetch(id ? '/api/crm/emails/' + id : '/api/crm/emails', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeCrmEmailModal(); await loadCrmEmails(); renderCrmEmails();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteCrmEmail(id) {
  if (!id || !await uiConfirm('Odstrániť email?')) return;
  try { await fetch('/api/crm/emails/' + id, { method: 'DELETE' }); closeCrmEmailModal(); await loadCrmEmails(); renderCrmEmails(); } catch { alert('Chyba'); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  BACKBONE EDITOR — optická topológia (interrogátor · splitter · káble · senzory)
// ══════════════════════════════════════════════════════════════════════════════
let bbList = [], bbDoc = null, bbSel = null, bbConnect = null, bbAnim = true, bbDrag = null, bbRenderReq = false;
// Katalóg komponentov (Sylex FBG monitoring system)
const BB_TYPES = {
  scan:      { label: 'S-line Scan 800',    grp: 'interr', fill: '#222a33', text: '#fff',     ports: 4,  w: 168, h: 58 },
  scan1:     { label: 'S-line Scan 800 (1 kanál)', grp: 'interr', fill: '#222a33', text: '#fff', ports: 1, w: 176, h: 58 },
  scan16:    { label: 'S-line Scan + Switch 1×16', grp: 'interr', fill: '#222a33', text: '#fff', combo: true,
               units: [{ name: 'S-line Scan 800', ports: 1 }, { name: 'S-line Switch 1×16', ports: 16 }], ports: 16, w: 214, h: 104 },
  scan8:     { label: 'S-line Scan + Splitter 1×8', grp: 'interr', fill: '#222a33', text: '#fff', combo: true,
               units: [{ name: 'S-line Scan 800', ports: 1 }, { name: 'S-line Splitter 1×8', ports: 8 }], ports: 8, w: 204, h: 104 },
  switch:    { label: 'S-line Switch 1×16', grp: 'interr', fill: '#222a33', text: '#fff',     ports: 8,  w: 196, h: 58 },
  splitter8: { label: 'S-line Splitter 1×8',grp: 'interr', fill: '#222a33', text: '#fff',     ports: 8,  w: 184, h: 58 },
  comp:      { label: 'S-line Comp (PC)',    grp: 'interr', fill: '#2a313b', text: '#fff',     ports: 0,  w: 152, h: 58 },
  interrogator:{ label: 'Interrogátor',      grp: 'interr', fill: '#222a33', text: '#fff',     ports: 4,  w: 160, h: 58 },
  wcb:       { label: 'WCB-01 Connection box',grp: 'box',   fill: '#2c322a', text: '#fff',     ports: 0,  w: 186, h: 58 },
  splitter:  { label: 'Splitter 1×4',        grp: 'box',    fill: '#2f6b22', text: '#fff',     ports: 4,  w: 138, h: 50 },
  patch:     { label: 'Prepojovacia',        grp: 'box',    fill: '#2f6b22', text: '#fff',     ports: 2,  w: 134, h: 50 },
  sensor:    { label: 'FBG senzor',          grp: 'sensor', fill: '#f4f6f3', text: '#14321a', tip: '#8DC63F', ports: 0, w: 138, h: 44 },
  sensors:   { label: 'Senzory',             grp: 'sensor', fill: '#f4f6f3', text: '#14321a', tip: '#8DC63F', ports: 0, w: 156, h: 44 },
};
const BB_TYPE_LABEL = Object.fromEntries(Object.entries(BB_TYPES).map(([k, v]) => [k, v.label]));
const BB_GROUPS = { interr: 'Interrogátor', box: 'Rozvádzač / splitter', sensor: 'Senzor' };
// Inline komponenty na kábli (korálky)
const BB_PARTS = { conn: 'Konektor', 'WSP-01': 'WSP-01', 'WCP-01': 'WCP-01', 'FSP-01': 'FSP-01', 'LCP-03': 'LCP-03', 'WPA-01': 'WPA-01' };
const BB_PART_NAME = { conn: 'Konektorové spojenie', 'WSP-01': 'WSP-01 splice protection', 'WCP-01': 'WCP-01 watertight conn.', 'FSP-01': 'FSP-01 fiber splice', 'LCP-03': 'LCP-03 pigtail', 'WPA-01': 'WPA-01 vodeodolné kon. spojenie' };

function bbTy(n) { return BB_TYPES[n.type] || BB_TYPES.splitter; }
function bbNodeW(n) { return Math.max(bbTy(n).w, (n.label || '').length * 7.2 + 26); }
function bbNodeH(n) { return bbTy(n).h || 42; }
function bbNode(id) { return bbDoc && bbDoc.nodes.find(n => n.nid === id); }
function bbUid(p) { return p + Math.random().toString(36).slice(2, 8); }

async function loadBb() {
  bbInitEvents();
  try { bbList = await fetch('/api/backbones').then(r => r.json()); if (!Array.isArray(bbList)) bbList = []; } catch { bbList = []; }
  const sel = document.getElementById('bbSelect');
  if (sel) sel.innerHTML = bbList.map(b => `<option value="${b._id}">${escHtml(b.name)}</option>`).join('') || '<option value="">— žiadna topológia —</option>';
  if (bbList.length) { const keep = bbDoc && bbList.find(b => b._id === bbDoc._id); await bbLoadOne((keep || bbList[0])._id); }
  else { bbDoc = null; bbRender(); bbPanelRender(); }
}
async function bbLoadOne(id) {
  if (!id) return;
  try { bbDoc = await fetch('/api/backbones/' + id).then(r => r.json()); } catch { return; }
  const sel = document.getElementById('bbSelect'); if (sel) sel.value = id;
  bbSel = null; bbConnect = null; bbRender(); bbPanelRender();
}
async function bbNew() {
  try {
    const doc = await fetch('/api/backbones', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nový backbone', nodes: [{ nid: bbUid('n'), type: 'interrogator', label: 'Interrogátor', x: 60, y: 80 }], links: [] }) }).then(r => r.json());
    await loadBb(); await bbLoadOne(doc._id); toast('Nová topológia vytvorená.', 'success');
  } catch (e) { toast('Chyba: ' + e.message, 'error'); }
}
async function seedBackboneData() {
  if (!await uiConfirm('Načítať ukážkovú topológiu (CB OA77 / CB OA79)?')) return;
  try {
    const r = await fetch('/api/admin/seed-backbones', { method: 'POST' }); const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    bbDoc = null; await loadBb(); toast('Ukážka načítaná.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

// ── kreslenie ──
function bbLinkPts(l) {
  const a = bbNode(l.from), b = bbNode(l.to); if (!a || !b) return null;
  const x1 = a.x + bbNodeW(a), y1 = a.y + bbNodeH(a) / 2, x2 = b.x, y2 = b.y + bbNodeH(b) / 2;
  const mx = Math.max(x1 + 16, (x1 + x2) / 2);
  return [[x1, y1], [mx, y1], [mx, y2], [x2, y2]];
}
function bbPathD(pts) { return 'M' + pts.map(p => p[0] + ',' + p[1]).join(' L'); }
function bbDefs() {
  return `<defs>
    <filter id="bbGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="bbFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.14)"/><stop offset="0.5" stop-color="rgba(255,255,255,0.02)"/><stop offset="1" stop-color="rgba(0,0,0,0.22)"/></linearGradient>
  </defs>`;
}
// Vykreslenie realistického zariadenia (podľa Sylex S-line / WCB / FBG)
function bbNodeInner(n, ty, w, h) {
  const lbl = escHtml(n.label || '(uzol)');
  const T = (x, y, s, anchor) => `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="${s}">`;
  // Kombinované zariadenie — dve zariadenia natrvalo spolu (napr. Scan 800 + Switch/Splitter)
  if (ty.combo) {
    const gap = 8, uh = (h - gap) / 2;
    let out = '';
    ty.units.forEach((u, ui) => {
      const yo = ui * (uh + gap);
      const pn = Math.min(u.ports || 0, 12);
      let ports = '';
      for (let i = 0; i < pn; i++) { const cx = 16 + i * (w - 32) / Math.max(1, pn - 1); ports += `<circle class="bb-fc" cx="${cx}" cy="${yo + uh - 9}" r="3.2"/><circle class="bb-fc-i" cx="${cx}" cy="${yo + uh - 9}" r="1.3"/>`; }
      out += `
        <rect class="bb-dev-body" y="${yo}" width="${w}" height="${uh}" rx="5" style="fill:${ty.fill}"/>
        <rect class="bb-dev-face" x="3" y="${yo + 3}" width="${w - 6}" height="${uh - 6}" rx="3"/>
        <rect class="bb-dev-accent" x="3" y="${yo + 3}" width="6" height="${uh - 6}"/>
        <rect class="bb-lcd" x="13" y="${yo + 7}" width="50" height="13" rx="2"/>${T(38, yo + 17, 'font-family:monospace;font-size:7px;fill:#7ee06a;letter-spacing:.3px')}S-line</text>
        <circle class="bb-led on" cx="${w - 12}" cy="${yo + 11}" r="2.4"/>
        <circle class="bb-led" cx="${w - 21}" cy="${yo + 11}" r="2.4"/>
        ${T(w / 2 + 6, yo + uh / 2 + 5, `font-family:var(--font);font-size:10.5px;font-weight:700;fill:${ty.text}`)}${escHtml(u.name)}</text>
        ${ports}`;
    });
    // interný patchcord — zariadenia sú pevne prepojené (preto idú vždy spolu)
    out += `<line class="bb-fan" x1="16" y1="${uh - 9}" x2="16" y2="${uh + gap + uh / 2}"/><circle class="bb-fc-i" cx="16" cy="${uh + gap + uh / 2}" r="1.6"/>`;
    return out;
  }
  if (ty.grp === 'interr') {
    const isComp = n.type === 'comp';
    const pn = Math.min(ty.ports || 0, 12);
    let ports = '';
    for (let i = 0; i < pn; i++) { const cx = 16 + i * (w - 32) / Math.max(1, pn - 1); ports += `<circle class="bb-fc" cx="${cx}" cy="${h - 10}" r="3.4"/><circle class="bb-fc-i" cx="${cx}" cy="${h - 10}" r="1.4"/>`; }
    const screen = isComp
      ? `<rect class="bb-lcd" x="13" y="9" width="${w - 26}" height="20" rx="2"/>${T(w / 2, 22, 'font-family:monospace;font-size:8px;fill:#7ee06a')}S-line Comp</text>`
      : `<rect class="bb-lcd" x="13" y="9" width="58" height="16" rx="2"/>${T(42, 20, 'font-family:monospace;font-size:8px;fill:#7ee06a;letter-spacing:.4px')}S-line</text>`;
    return `
      <rect class="bb-dev-body" width="${w}" height="${h}" rx="6" style="fill:${ty.fill}"/>
      <rect class="bb-dev-face" x="3" y="3" width="${w - 6}" height="${h - 6}" rx="4"/>
      <rect class="bb-dev-accent" x="3" y="3" width="6" height="${h - 6}"/>
      ${screen}
      <circle class="bb-led on" cx="${w - 12}" cy="13" r="2.7"/>
      <circle class="bb-led" cx="${w - 22}" cy="13" r="2.7"/>
      ${T(w / 2 + 3, h / 2 + 6, `font-family:var(--font);font-size:12.5px;font-weight:700;fill:${ty.text}`)}${lbl}</text>
      ${ports}`;
  }
  if (n.type === 'wcb') {
    return `
      <rect class="bb-dev-body" width="${w}" height="${h}" rx="6" style="fill:${ty.fill}"/>
      <rect class="bb-box-lid" x="6" y="6" width="${w - 12}" height="${h - 12}" rx="3"/>
      <circle class="bb-screw" cx="11" cy="11" r="1.6"/><circle class="bb-screw" cx="${w - 11}" cy="11" r="1.6"/>
      <circle class="bb-screw" cx="11" cy="${h - 11}" r="1.6"/><circle class="bb-screw" cx="${w - 11}" cy="${h - 11}" r="1.6"/>
      <rect class="bb-gland" x="-4" y="${h / 2 - 14}" width="8" height="8" rx="2"/><rect class="bb-gland" x="-4" y="${h / 2 + 6}" width="8" height="8" rx="2"/>
      <rect class="bb-gland" x="${w - 4}" y="${h / 2 - 14}" width="8" height="8" rx="2"/><rect class="bb-gland" x="${w - 4}" y="${h / 2 + 6}" width="8" height="8" rx="2"/>
      ${T(w / 2, h / 2 + 5, `font-family:var(--font);font-size:12.5px;font-weight:700;fill:${ty.text}`)}${lbl}</text>`;
  }
  if (ty.grp === 'box') {
    const pn = Math.min(ty.ports || 4, 6);
    let fan = '';
    for (let i = 0; i < pn; i++) { const fy = 12 + i * (h - 24) / Math.max(1, pn - 1); fan += `<line class="bb-fan" x1="${w - 22}" y1="${h / 2}" x2="${w - 8}" y2="${fy}"/><circle class="bb-fc-i" cx="${w - 8}" cy="${fy}" r="1.8"/>`; }
    return `
      <rect class="bb-dev-body" width="${w}" height="${h}" rx="7" style="fill:${ty.fill}"/>
      <rect class="bb-dev-face" x="3" y="3" width="${w - 6}" height="${h - 6}" rx="5"/>
      <circle class="bb-fc-i" cx="10" cy="${h / 2}" r="2.2"/><line class="bb-fan" x1="10" y1="${h / 2}" x2="${w - 22}" y2="${h / 2}"/>
      ${fan}
      ${T(w / 2 - 6, h / 2 + 5, `font-family:var(--font);font-size:12px;font-weight:700;fill:${ty.text}`)}${lbl}</text>`;
  }
  // senzor — kapsula s FBG mriežkou a zeleným hrotom
  let grating = '';
  for (let i = 0; i < 5; i++) { const gx = 16 + i * 4; grating += `<line class="bb-grating" x1="${gx}" y1="${h / 2 - 6}" x2="${gx}" y2="${h / 2 + 6}"/>`; }
  return `
    <rect class="bb-sensor-body" width="${w}" height="${h}" rx="${h / 2}" style="fill:${ty.fill}"/>
    <rect class="bb-tip" x="-5" y="${h / 2 - 6}" width="10" height="12" rx="2.5" style="fill:${ty.tip}"/>
    ${grating}
    ${T(w / 2 + 12, h / 2 + 4, `font-family:var(--font);font-size:11.5px;font-weight:700;fill:${ty.text}`, 'middle')}${lbl}</text>`;
}
function bbPolyPoint(pts, t) {
  const segs = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push({ a: pts[i - 1], b: pts[i], len }); total += len; }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) { const s = segs[i]; if (target <= s.len || i === segs.length - 1) { const f = s.len ? Math.min(1, target / s.len) : 0; return [s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f]; } target -= s.len; }
  return pts[pts.length - 1];
}
function bbRender() {
  const svg = document.getElementById('bbSvg'); if (!svg) return;
  if (!bbDoc) { svg.innerHTML = '<text x="40" y="60" class="bb-empty-txt">Žiadna topológia — klikni na „🎲 Ukážka" alebo „+ Nová".</text>'; svg.setAttribute('width', 600); svg.setAttribute('height', 200); svg.setAttribute('viewBox', '0 0 600 200'); return; }
  let maxX = 400, maxY = 240;
  bbDoc.nodes.forEach(n => { maxX = Math.max(maxX, n.x + bbNodeW(n) + 250); maxY = Math.max(maxY, n.y + bbNodeH(n) + 60); });
  svg.setAttribute('width', maxX); svg.setAttribute('height', maxY); svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
  let links = '', flows = '', labels = '', beads = '', photons = '';
  bbDoc.links.forEach(l => {
    const pts = bbLinkPts(l); if (!pts) return;
    const d = bbPathD(pts);
    const sel = bbSel && bbSel.kind === 'link' && bbSel.id === l.lid;
    links += `<path class="bb-link${sel ? ' sel' : ''}" data-lid="${l.lid}" d="${d}"/>`;
    flows += `<path class="bb-flow" d="${d}"/>`;
    photons += `<circle class="bb-photon" r="2.6"><animateMotion dur="2.4s" repeatCount="indefinite" path="${d}"/></circle>`
            +  `<circle class="bb-photon" r="2.6"><animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="${d}"/></circle>`;
    const txt = l.label || (l.length > 0 ? `${l.fibers} f @ ${l.length}m` : '');
    if (txt) { const mid = bbPolyPoint(pts, 0.5); labels += `<text class="bb-link-lbl" x="${mid[0]}" y="${mid[1] - 7}" text-anchor="middle">${escHtml(txt)}</text>`; }
    (l.parts || []).forEach((p, i) => {
      const t = 0.12 + (i + 0.5) / ((l.parts.length) + 0.5) * 0.72;
      const pt = bbPolyPoint(pts, t);
      beads += `<g class="bb-bead" data-lid="${l.lid}" transform="translate(${pt[0] - 8},${pt[1] - 5})"><rect width="16" height="10" rx="2.5"/><text x="8" y="-3" text-anchor="middle" class="bb-bead-lbl">${escHtml(BB_PARTS[p] || p)}</text></g>`;
    });
  });
  let nodes = '';
  bbDoc.nodes.forEach(n => {
    const ty = bbTy(n), w = bbNodeW(n), h = bbNodeH(n), sel = bbSel && bbSel.kind === 'node' && bbSel.id === n.nid, conn = bbConnect === n.nid;
    const selRect = (sel || conn) ? `<rect class="bb-sel-ring" x="-3" y="-3" width="${w + 6}" height="${h + 6}" rx="9"/>` : '';
    nodes += `<g class="bb-node bb-${ty.grp}${sel ? ' sel' : ''}${conn ? ' conn' : ''}" data-nid="${n.nid}" transform="translate(${n.x},${n.y})">
      ${selRect}${bbNodeInner(n, ty, w, h)}
    </g>`;
  });
  svg.innerHTML = `${bbDefs()}<g>${links}</g><g class="bb-flows">${flows}${photons}</g><g>${labels}</g><g class="bb-beads">${beads}</g><g>${nodes}</g>`;
}
function bbScheduleRender() { if (bbRenderReq) return; bbRenderReq = true; requestAnimationFrame(() => { bbRenderReq = false; bbRender(); }); }

// ── interakcia ──
function bbInitEvents() {
  const svg = document.getElementById('bbSvg'); if (!svg || svg._bbInit) return; svg._bbInit = true;
  svg.addEventListener('pointerdown', bbPointerDown);
  svg.addEventListener('dblclick', bbDblClick);
  window.addEventListener('pointermove', bbPointerMove);
  window.addEventListener('pointerup', bbPointerUp);
  document.addEventListener('keydown', bbKeyDown);
}
// Delete/Backspace zmaže vybraný uzol alebo kábel (mimo textových polí)
function bbKeyDown(e) {
  if (_activePageName() !== 'bb' || !bbDoc || !bbSel) return;
  const t = e.target, tag = (t.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;
  e.preventDefault();
  if (bbSel.kind === 'node') bbDeleteNode(bbSel.id); else bbDeleteLink(bbSel.id);
}
// Dvojklik = úprava popisu uzla / kábla priamo na plátne
function bbDblClick(e) {
  if (!bbDoc) return;
  const ng = e.target.closest('.bb-node');
  if (ng) { const n = bbNode(ng.dataset.nid); if (n) bbInlineEdit(ng, n.label || '', v => { n.label = v; }); return; }
  const el = e.target.closest('.bb-bead') || e.target.closest('.bb-link');
  if (el) {
    const l = bbDoc.links.find(x => x.lid === el.dataset.lid); if (!l) return;
    const cur = l.label || (l.length > 0 ? `${l.fibers} f @ ${l.length}m` : '');
    bbInlineEdit(el, cur, v => { l.label = v; });
  }
}
function bbInlineEdit(targetEl, value, commit) {
  const wrap = document.getElementById('bbCanvasWrap'); if (!wrap) return;
  wrap.querySelector('.bb-inline-edit')?.remove();
  const wr = wrap.getBoundingClientRect(), er = targetEl.getBoundingClientRect();
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'bb-inline-edit'; inp.value = value;
  inp.style.left = (er.left - wr.left + wrap.scrollLeft) + 'px';
  inp.style.top = (er.top - wr.top + wrap.scrollTop) + 'px';
  inp.style.width = Math.max(90, er.width) + 'px';
  let done = false;
  const finish = (save) => { if (done) return; done = true; if (save) { commit(inp.value.trim()); bbRender(); bbPanelRender(); } inp.remove(); };
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') finish(true); else if (ev.key === 'Escape') finish(false); });
  inp.addEventListener('blur', () => finish(true));
  wrap.appendChild(inp); inp.focus(); inp.select();
}
function bbClientToSvg(e) { const svg = document.getElementById('bbSvg'); const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function bbPointerDown(e) {
  if (!bbDoc) return;
  const ng = e.target.closest('.bb-node');
  if (ng) { const n = bbNode(ng.dataset.nid); if (!n) return; const p = bbClientToSvg(e); bbDrag = { nid: n.nid, dx: p.x - n.x, dy: p.y - n.y, moved: false, sx: e.clientX, sy: e.clientY }; document.getElementById('bbCanvasWrap')?.classList.add('bb-dragging'); return; }
  const bd = e.target.closest('.bb-bead');
  if (bd) { bbSelect('link', bd.dataset.lid); return; }
  const lk = e.target.closest('.bb-link');
  if (lk) { bbSelect('link', lk.dataset.lid); return; }
  bbSelect(null);
}
function bbPointerMove(e) {
  if (!bbDrag) return;
  const p = bbClientToSvg(e), n = bbNode(bbDrag.nid); if (!n) return;
  n.x = Math.max(0, Math.round(p.x - bbDrag.dx)); n.y = Math.max(0, Math.round(p.y - bbDrag.dy));
  if (Math.abs(e.clientX - bbDrag.sx) + Math.abs(e.clientY - bbDrag.sy) > 3) bbDrag.moved = true;
  bbScheduleRender();
}
function bbPointerUp() {
  document.getElementById('bbCanvasWrap')?.classList.remove('bb-dragging');
  if (!bbDrag) return;
  if (!bbDrag.moved) {
    if (bbConnect && bbConnect !== bbDrag.nid) { bbCreateLink(bbConnect, bbDrag.nid); bbConnect = null; }
    else bbSelect('node', bbDrag.nid);
  }
  bbDrag = null; bbRender();
}
function bbSelect(kind, id) { bbSel = kind ? { kind, id } : null; if (kind !== 'node') bbConnect = null; bbRender(); bbPanelRender(); }

function bbAddNode(type) {
  if (!bbDoc) { toast('Najprv vytvor alebo načítaj topológiu.', 'warn'); return; }
  const wrap = document.getElementById('bbCanvasWrap');
  const x = (wrap?.scrollLeft || 0) + 60, y = (wrap?.scrollTop || 0) + 60;
  const n = { nid: bbUid('n'), type, label: BB_TYPE_LABEL[type] || 'Uzol', x, y };
  bbDoc.nodes.push(n); bbSelect('node', n.nid);
}
function bbCreateLink(from, to) {
  if (from === to) return;
  if (bbDoc.links.some(l => l.from === from && l.to === to)) { toast('Kábel už existuje.', 'warn'); return; }
  const l = { lid: bbUid('k'), from, to, fibers: 4, length: 5, label: '' };
  bbDoc.links.push(l); bbSelect('link', l.lid);
}
function bbStartConnect() { if (bbSel && bbSel.kind === 'node') { bbConnect = bbSel.id; toast('Klikni na cieľový uzol — vytvorí sa kábel.', 'info'); bbRender(); } }
function bbUpdateNode(id, field, val) { const n = bbNode(id); if (!n) return; n[field] = field === 'label' ? val : val; bbScheduleRender(); }
function bbUpdateLink(id, field, val) { const l = bbDoc.links.find(x => x.lid === id); if (!l) return; l[field] = (field === 'fibers' || field === 'length') ? (Number(val) || 0) : val; bbScheduleRender(); }
function bbDeleteNode(id) { bbDoc.nodes = bbDoc.nodes.filter(n => n.nid !== id); bbDoc.links = bbDoc.links.filter(l => l.from !== id && l.to !== id); bbSelect(null); }
function bbDeleteLink(id) { bbDoc.links = bbDoc.links.filter(l => l.lid !== id); bbSelect(null); }

function bbPanelRender() {
  const el = document.getElementById('bbPanel'); if (!el) return;
  if (!bbDoc) { el.innerHTML = '<div class="bb-panel-empty">Žiadna topológia.</div>'; return; }
  if (!bbSel) { el.innerHTML = `<div class="bb-panel-hd">Topológia</div>
    <div class="form-group"><label>Názov</label><input type="text" value="${escHtml(bbDoc.name || '')}" oninput="bbDoc.name=this.value"></div>
    <div class="bb-panel-stat">${bbDoc.nodes.length} uzlov · ${bbDoc.links.length} káblov</div>
    <div class="bb-panel-empty">Klikni na uzol alebo kábel pre úpravu.</div>`; return; }
  if (bbSel.kind === 'node') {
    const n = bbNode(bbSel.id); if (!n) { el.innerHTML = ''; return; }
    const typeOpts = Object.keys(BB_GROUPS).map(g =>
      `<optgroup label="${BB_GROUPS[g]}">` + Object.entries(BB_TYPES).filter(([, v]) => v.grp === g)
        .map(([k, v]) => `<option value="${k}"${n.type === k ? ' selected' : ''}>${escHtml(v.label)}</option>`).join('') + `</optgroup>`).join('');
    el.innerHTML = `<div class="bb-panel-hd">Komponent</div>
      <div class="form-group"><label>Popis</label><input type="text" id="bbNodeLabel" value="${escHtml(n.label || '')}" oninput="bbUpdateNode('${n.nid}','label',this.value)"></div>
      <div class="form-group"><label>Typ</label><select onchange="bbChangeType('${n.nid}',this.value)">${typeOpts}</select></div>
      <button class="btn-secondary btn-sm bb-panel-btn" onclick="bbStartConnect()">🔗 Prepojiť z tohto komponentu →</button>
      <button class="btn-delete bb-panel-btn" onclick="bbDeleteNode('${n.nid}')">Odstrániť</button>`;
  } else {
    const l = bbDoc.links.find(x => x.lid === bbSel.id); if (!l) { el.innerHTML = ''; return; }
    const a = bbNode(l.from), b = bbNode(l.to);
    const partsHtml = (l.parts || []).length
      ? (l.parts).map((p, i) => `<span class="bb-part-chip">${escHtml(BB_PARTS[p] || p)}<button onclick="bbPartDel('${l.lid}',${i})" title="Odstrániť">✕</button></span>`).join('')
      : '<span class="bb-panel-empty">žiadne</span>';
    el.innerHTML = `<div class="bb-panel-hd">Kábel</div>
      <div class="bb-panel-stat">${escHtml(a ? a.label : '?')} → ${escHtml(b ? b.label : '?')}</div>
      <div class="form-row">
        <div class="form-group"><label>Vlákna</label><input type="number" min="0" value="${l.fibers}" oninput="bbUpdateLink('${l.lid}','fibers',this.value)"></div>
        <div class="form-group"><label>Dĺžka (m)</label><input type="number" min="0" value="${l.length}" oninput="bbUpdateLink('${l.lid}','length',this.value)"></div>
      </div>
      <div class="form-group"><label>Vlastný popis (voliteľné)</label><input type="text" value="${escHtml(l.label || '')}" placeholder="napr. 4 f @ 5m" oninput="bbUpdateLink('${l.lid}','label',this.value)"></div>
      <div class="form-group"><label>Komponenty na kábli (konektory, ochrany)</label>
        <div class="bb-parts">${partsHtml}</div>
        <div class="bb-part-add"><select id="bbPartSel">${Object.entries(BB_PART_NAME).map(([k, v]) => `<option value="${k}">${escHtml(v)}</option>`).join('')}</select><button class="btn-secondary btn-sm" onclick="bbPartAdd('${l.lid}')">+ Pridať</button></div>
      </div>
      <button class="btn-delete bb-panel-btn" onclick="bbDeleteLink('${l.lid}')">Odstrániť kábel</button>`;
  }
}
function bbChangeType(id, val) { const n = bbNode(id); if (!n) return; n.type = val; if (!n.label || Object.values(BB_TYPE_LABEL).includes(n.label)) n.label = BB_TYPE_LABEL[val] || n.label; bbRender(); bbPanelRender(); }
function bbPartAdd(lid) { const l = bbDoc.links.find(x => x.lid === lid); if (!l) return; const v = document.getElementById('bbPartSel')?.value; if (!v) return; (l.parts = l.parts || []).push(v); bbRender(); bbPanelRender(); }
function bbPartDel(lid, i) { const l = bbDoc.links.find(x => x.lid === lid); if (!l || !l.parts) return; l.parts.splice(i, 1); bbRender(); bbPanelRender(); }

function bbAutoLayout() {
  if (!bbDoc) return;
  const incoming = {}; bbDoc.links.forEach(l => incoming[l.to] = (incoming[l.to] || 0) + 1);
  const children = {}; bbDoc.links.forEach(l => (children[l.from] = children[l.from] || []).push(l.to));
  const depth = {}; const roots = bbDoc.nodes.filter(n => !incoming[n.nid]);
  const q = roots.map(n => n.nid); roots.forEach(n => depth[n.nid] = 0);
  let guard = 0;
  while (q.length && guard++ < 5000) { const id = q.shift(); (children[id] || []).forEach(c => { if (depth[c] == null || depth[c] < depth[id] + 1) { depth[c] = depth[id] + 1; q.push(c); } }); }
  const byDepth = {}; bbDoc.nodes.forEach(n => { const d = depth[n.nid] ?? 0; (byDepth[d] = byDepth[d] || []).push(n); });
  let x = 40;
  Object.keys(byDepth).map(Number).sort((a, b) => a - b).forEach(d => {
    const arr = byDepth[d].sort((a, b) => a.y - b.y); let mw = 120;
    arr.forEach((n, i) => { n.x = x; n.y = i * 58 + 40; mw = Math.max(mw, bbNodeW(n)); });
    x += mw + 90;
  });
  bbRender(); toast('Rozložené.', 'success');
}
function bbToggleAnim() {
  bbAnim = !bbAnim;
  document.getElementById('bbCanvasWrap')?.classList.toggle('bb-anim', bbAnim);
  const b = document.getElementById('bbAnimBtn'); if (b) b.textContent = bbAnim ? '⏸ Animácia' : '▶ Animácia';
}
async function bbSave() {
  if (!bbDoc || !bbDoc._id) { toast('Najprv vytvor topológiu.', 'warn'); return; }
  try {
    const r = await fetch('/api/backbones/' + bbDoc._id, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: bbDoc.name, nodes: bbDoc.nodes, links: bbDoc.links }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    const sel = document.getElementById('bbSelect'); const idx = bbList.findIndex(b => b._id === bbDoc._id); if (idx >= 0) bbList[idx].name = bbDoc.name;
    if (sel) { const cur = sel.value; sel.innerHTML = bbList.map(b => `<option value="${b._id}">${escHtml(b.name)}</option>`).join(''); sel.value = cur; }
    toast('Topológia uložená.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
function bbExportPng() {
  const svg = document.getElementById('bbSvg'); if (!svg || !bbDoc) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = svg.viewBox.baseVal.width; c.height = svg.viewBox.baseVal.height;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = (bbDoc.name || 'backbone') + '.png'; a.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
}

// Štart: over prihlásenie, potom spusti appku
bootstrap();
