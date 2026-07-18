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
let UI_CFG = { nav: 'header', sidebarTheme: 'dark', accent: 'cyan', density: 'comfortable', radius: 'soft', motion: 'on', hiddenModules: [], webTheme: 'dark' };
const WEB_THEMES = ['dark', 'light', 'warm'];

// Skryteľné moduly (cez Administrácia → Moduly). Domov a Administrácia sa skryť nedajú.
const MODULES = [
  { key: 'wiki',       icon: '📚', label: 'WIKI FOS' },
  { key: 'procedures', icon: '📋', label: 'Pracovné postupy' },
  { key: 'guides',     icon: '📖', label: 'Návody' },
  { key: 'fbg',        icon: '📈', label: 'FBG vizualizácia' },
  { key: 'bb',         icon: '🕸️', label: 'Backbone' },
  { key: 'dev',        icon: '⭐', label: 'Vývoj výrobkov' },
  { key: 'util',       icon: '🗓️', label: 'Vyťaženie technológií' },
  { key: 'prod',       icon: '🏭', label: 'Plánovanie výroby' },
  { key: 'mfg',        icon: '⚙️', label: 'Riadenie výroby' },
  { key: 'pwf',        icon: '🔀', label: 'Workflow výroby' },
  { key: 'powners',    icon: '👥', label: 'Vlastníci produktov' },
  { key: 'photos',     icon: '📷', label: 'Fotky z výroby' },
  { key: 'calendar',   icon: '📅', label: 'Kalendár' },
  { key: 'tasks',      icon: '✅', label: 'Úlohy' },
  { key: 'crm',        icon: '👥', label: 'CRM' },
  { key: 'github',     icon: '🐙', label: 'GitHub projekty' },
  { key: 'remote',     icon: '🖥️', label: 'Vzdialené PC' },
  { key: 'mgmt',       icon: '📊', label: 'Manažment' },
  { key: 'changelog',  icon: '🗒️', label: 'Changelog' },
];

// Skry/zobraz navigačné položky podľa UI_CFG.hiddenModules
function applyHiddenModules() {
  const hidden = new Set(UI_CFG.hiddenModules || []);
  document.querySelectorAll('.nav-link[data-page], .asb-link[data-page], .tabbar-item[data-page]').forEach(l => {
    if (l.dataset.page === 'home' || l.dataset.page === 'admin') return; // nikdy neskrývať
    l.classList.toggle('nav-hidden', hidden.has(l.dataset.page));
  });
}

// Mobilná výsuvná navigácia (appSidebar ako drawer) — otvorenie/zatvorenie
function toggleMobileNav() {
  document.body.classList.contains('mobile-nav-open') ? closeMobileNav() : openMobileNav();
}
// Zamknutie scrollu stránky cez position:fixed + uložený scrollY — na rozdiel
// od obyčajného overflow:hidden funguje spoľahlivo aj na iOS Safari (viď
// poznámka pri .mobile-nav-open v style.css). Bez toho sa dalo stať, že sa
// pozadie pod drawerom "gumovo" posunulo a na položky menu sa nedalo trafiť.
let _mobileNavScrollY = 0;
function openMobileNav() {
  _mobileNavScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = -_mobileNavScrollY + 'px';
  document.body.classList.add('mobile-nav-open');
  document.getElementById('mobileNavBackdrop')?.classList.add('show');
  document.getElementById('mobileNavBtn')?.setAttribute('aria-expanded', 'true');
}
function closeMobileNav() {
  const wasOpen = document.body.classList.contains('mobile-nav-open');
  document.body.classList.remove('mobile-nav-open');
  document.body.style.top = '';
  if (wasOpen) window.scrollTo(0, _mobileNavScrollY);
  document.getElementById('mobileNavBackdrop')?.classList.remove('show');
  document.getElementById('mobileNavBtn')?.setAttribute('aria-expanded', 'false');
  // Vyčistiť filter menu, aby bol drawer pri ďalšom otvorení kompletný
  const asbF = document.getElementById('asbFilter');
  if (asbF && asbF.value) { asbF.value = ''; filterAppSidebar(''); }
}

// Filter položiek v draweri (input v hlavičke appSidebar) — skryje nezhodujúce
// sa odkazy a prázdne skupinové nadpisy
function filterAppSidebar(q) {
  q = (q || '').trim().toLowerCase();
  const nav = document.querySelector('#appSidebar .asb-nav');
  if (!nav) return;
  nav.querySelectorAll('.asb-link').forEach(l => {
    const hit = !q || l.textContent.toLowerCase().includes(q) || (l.title || '').toLowerCase().includes(q);
    l.classList.toggle('asb-filtered-out', !hit);
  });
  nav.querySelectorAll('.asb-group').forEach(g => {
    let el = g.nextElementSibling, any = false;
    while (el && !el.classList.contains('asb-group')) {
      if (el.classList.contains('asb-link') && !el.classList.contains('asb-filtered-out') && !el.classList.contains('nav-hidden')) { any = true; break; }
      el = el.nextElementSibling;
    }
    g.classList.toggle('asb-filtered-out', !any);
  });
}

function applyUiLayout() {
  const b = document.body, r = document.documentElement;
  b.classList.toggle('layout-sidebar', UI_CFG.nav === 'sidebar');
  // Téma sidebaru sa aplikuje vždy (nielen pri nav==='sidebar'), lebo appSidebar
  // slúži aj ako mobilný výsuvný drawer bez ohľadu na zvolený desktop layout.
  SB_THEMES.forEach(t => b.classList.toggle('sbt-' + t, UI_CFG.sidebarTheme === t));

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

  // Web téma (celý web) — svetlé motívy
  WEB_THEMES.forEach(t => b.classList.toggle('theme-' + t, t !== 'dark' && UI_CFG.webTheme === t));

  applyHiddenModules();
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
      const hidden = get('ui.hiddenModules');
      const webTheme = get('ui.webTheme');
      if (webTheme && WEB_THEMES.includes(webTheme)) UI_CFG.webTheme = webTheme;
      if (nav) UI_CFG.nav = nav;
      if (theme && SB_THEMES.includes(theme)) UI_CFG.sidebarTheme = theme;
      if (accent && UI_ACCENTS[accent]) UI_CFG.accent = accent;
      if (density === 'compact' || density === 'comfortable') UI_CFG.density = density;
      if (radius && UI_RADII[radius]) UI_CFG.radius = radius;
      if (motion === 'on' || motion === 'off') UI_CFG.motion = motion;
      if (Array.isArray(hidden)) UI_CFG.hiddenModules = hidden.filter(k => typeof k === 'string');
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
function setWebTheme(t) {
  if (!WEB_THEMES.includes(t)) return;
  UI_CFG.webTheme = t; applyUiLayout(); renderAppearanceAdmin(); _saveUiCfg('ui.webTheme', t);
}

function renderAppearanceAdmin() {
  document.querySelectorAll('.appr-layout').forEach(b => b.classList.toggle('active', b.dataset.nav === UI_CFG.nav));
  document.querySelectorAll('.appr-theme').forEach(b => b.classList.toggle('active', b.dataset.theme === UI_CFG.sidebarTheme));
  document.querySelectorAll('.appr-accent').forEach(b => b.classList.toggle('active', b.dataset.accent === UI_CFG.accent));
  document.querySelectorAll('.appr-opt[data-density]').forEach(b => b.classList.toggle('active', b.dataset.density === UI_CFG.density));
  document.querySelectorAll('.appr-opt[data-radius]').forEach(b => b.classList.toggle('active', b.dataset.radius === UI_CFG.radius));
  document.querySelectorAll('.appr-opt[data-motion]').forEach(b => b.classList.toggle('active', b.dataset.motion === UI_CFG.motion));
  document.querySelectorAll('.appr-web[data-web]').forEach(b => b.classList.toggle('active', b.dataset.web === UI_CFG.webTheme));
  const sec = document.getElementById('apprThemeSection');
  if (sec) sec.classList.toggle('dim', UI_CFG.nav !== 'sidebar');
}

// ── Admin: skrývanie jednotlivých modulov z navigácie ──────────────────────────
function renderModulesAdmin() {
  const el = document.getElementById('modulesGrid'); if (!el) return;
  const hidden = new Set(UI_CFG.hiddenModules || []);
  el.innerHTML = MODULES.map(m => {
    const on = !hidden.has(m.key);
    return `<label class="mod-item ${on ? '' : 'mod-off'}" title="${on ? 'Zobrazené' : 'Skryté'} — ${escHtml(m.label)}">
      <span class="mod-ico">${m.icon}</span>
      <span class="mod-label">${escHtml(m.label)}</span>
      <span class="mod-switch"><input type="checkbox" ${on ? 'checked' : ''} onchange="toggleModule('${m.key}', this.checked)"><span class="mod-track"></span></span>
    </label>`;
  }).join('');
  const cnt = document.getElementById('modulesHiddenCount');
  if (cnt) cnt.textContent = hidden.size ? (hidden.size + ' skrytých') : 'žiadne skryté';
}
function toggleModule(key, visible) {
  const set = new Set(UI_CFG.hiddenModules || []);
  if (visible) set.delete(key); else set.add(key);
  UI_CFG.hiddenModules = [...set];
  applyHiddenModules();
  renderModulesAdmin();
  _saveUiCfg('ui.hiddenModules', UI_CFG.hiddenModules);
}
function showAllModules() {
  if (!(UI_CFG.hiddenModules || []).length) { toast('Žiadne skryté moduly.', 'info'); return; }
  UI_CFG.hiddenModules = [];
  applyHiddenModules(); renderModulesAdmin();
  _saveUiCfg('ui.hiddenModules', UI_CFG.hiddenModules);
  toast('Všetky moduly sú opäť zobrazené.', 'success');
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
let pendingAttachments = [];

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
  if (hash === 'pwf')     { _activatePage('pwf');     loadPwf(); return; }
  if (hash === 'gpn')     { _activatePage('gpn');     loadGpn(); return; }
  if (hash === 'powners') { _activatePage('powners'); loadPowners(); return; }
  if (hash === 'tasks/new') { _activatePage('tasks'); await loadTasks(); openTaskModal(); return; }  // PWA skratka „Nová úloha"
  if (hash === 'tasks')   { _activatePage('tasks');   loadTasks(); return; }
  if (hash === 'crm')     { _activatePage('crm');     loadCrm(); return; }
  if (hash === 'mgmt')    { _activatePage('mgmt');    loadManagement(); return; }
  if (hash === 'photos')  { _activatePage('photos');  loadPhotos(); return; }
  if (hash === 'github')  { _activatePage('github');  loadGithub(); return; }
  if (hash === 'remote')  { _activatePage('remote');  loadRemote(); return; }
  if (hash === 'fileserver') { _activatePage('fileserver'); loadFileShares(); return; }
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
  document.querySelectorAll('.tabbar-item[data-page]').forEach(l => l.classList.toggle('active', l.dataset.page === name));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
  closeMobileNav();
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
  if (name === 'pwf')     loadPwf();
  if (name === 'gpn')     loadGpn();
  if (name === 'powners') loadPowners();
  if (name === 'tasks')   loadTasks();
  if (name === 'crm')     loadCrm();
  if (name === 'mgmt')    loadManagement();
  if (name === 'photos')  loadPhotos();
  if (name === 'github')  loadGithub();
  if (name === 'remote')  loadRemote();
  if (name === 'fileserver') loadFileShares();
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
        <div class="home-cal-evmeta">${isToday ? 'dnes' : fmtDate(e.date)}${calEvTimeRange(e) ? ' · ' + escHtml(calEvTimeRange(e)) : ''}${e.source ? ' · 📅 ' + escHtml(e.source) : ''}</div>
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

  // Prílohy (súbory)
  const attEl = document.getElementById('detailAttachments');
  const atts = p.attachments || [];
  attEl.innerHTML = atts.length ? '<div class="pd-attachments-h">Prílohy</div>' + atts.map(a => `
    <a class="pd-att-card" href="${a.url}" download="${escHtml(a.name || '')}" target="_blank" rel="noopener">
      <svg class="pd-att-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      <div class="pd-att-body">
        <div class="pd-att-name">${escHtml(a.name || '')}</div>
        <div class="pd-att-size">${fsFmtSize(a.size)}</div>
      </div>
      <svg class="pd-att-dl" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </a>`).join('') : '';
  attEl.classList.toggle('hidden', !atts.length);
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
  pendingAttachments = product ? [...(product.attachments || [])] : [];

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

  renderAttachmentPreviews();
  enableFileDrop(document.querySelector('#productModal .file-upload-zone'), (files) => dropAttachmentsTo(files));
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  editingProductId = null; pendingImages = []; pendingAttachments = []; quill = null;
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
// PRÍLOHY (súbory) — drag & drop upload
// ==============================
async function uploadAttachmentFile(file) {
  const fd = new FormData(); fd.append('file', file);
  try {
    const r = await fetch('/api/upload/file', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.status);
    return d;
  } catch (e) { toast('Chyba pri nahrávaní súboru: ' + e.message, 'error'); return null; }
}

async function dropAttachmentsTo(files) {
  toast(`Nahrávam ${files.length} súbor(ov)…`, 'info');
  for (const f of files) {
    const d = await uploadAttachmentFile(f);
    if (d) pendingAttachments.push({ url: d.url, name: d.name, size: d.size, mime: d.mime });
  }
  renderAttachmentPreviews();
}

async function handleFileUpload(input) {
  if (input.files && input.files.length) await dropAttachmentsTo([...input.files]);
  input.value = '';
}

function renderAttachmentPreviews() {
  const list = document.getElementById('filePreviewList');
  if (!list) return;
  list.innerHTML = pendingAttachments.map((a, i) => `
    <div class="file-preview-item">
      <svg class="file-preview-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      <span class="file-preview-name" title="${escHtml(a.name || '')}">${escHtml(a.name || '')}</span>
      <span class="file-preview-size">${fsFmtSize(a.size)}</span>
      <button class="file-preview-remove" onclick="removeAttachment(${i})">✕</button>
    </div>`).join('');
}

function removeAttachment(i) { pendingAttachments.splice(i, 1); renderAttachmentPreviews(); }

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
    attachments: pendingAttachments,
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
  { key: 'jedlo',      label: 'Jedlo',      icon: '🍽️' },  // obedy (Sylex, Fantozzi)
  { key: 'erp',        label: 'ERP',        icon: '📊' },
  { key: 'sharepoint', label: 'SharePoint', icon: '🔗' },
  { key: 'other',      label: 'Odkazy',     icon: '🔖' },
];
function groupKeyFor(g) {
  if (g === 'servery' || g === 'sablony') return 'files';
  if (g === 'custom')     return 'custom';
  if (g === 'jedlo')      return 'jedlo';
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
let calView = localStorage.getItem('calView') || 'week';  // 'month' | 'week' | 'day' — predvolený týždeň
let calRef  = new Date(); // referenčný dátum (kotva pohľadu)
const CAL_INT_KEY = '__interne__';   // kľúč pre interné (ručne zapísané) udalosti
let calSrcHidden = new Set();        // skryté zdroje kalendára (kľúč = názov zdroja / CAL_INT_KEY)
let calTheme = localStorage.getItem('calTheme') || 'dark';   // motív: dark | light | soft
function applyCalTheme() {
  const page = document.getElementById('page-calendar'); if (!page) return;
  page.classList.remove('cal-light', 'cal-theme-light', 'cal-theme-soft');
  if (calTheme === 'light') page.classList.add('cal-light', 'cal-theme-light');
  else if (calTheme === 'soft') page.classList.add('cal-light', 'cal-theme-soft');
  const sel = document.getElementById('calThemeSel'); if (sel) sel.value = calTheme;
}
function setCalTheme(v) { calTheme = v; localStorage.setItem('calTheme', v); applyCalTheme(); }
let calTextFilter = '';   // textový filter
let calTypeFilter = '';   // filter podľa typu
let calBh = localStorage.getItem('calBh') !== '0';   // len pracovné hodiny (7–19) — predvolene zapnuté
let _calRemind = new Set();// už zobrazené pripomienky
let calZoom = parseInt(localStorage.getItem('calZoom')) || 64;   // px / hodina v týždennom a dennom pohľade

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

let _calLoadSeq = 0;
function calShowLoading(on) { document.getElementById('calLoader')?.classList.toggle('hidden', !on); }
function calShowFeedLoading(on) { document.getElementById('calFeedLoading')?.classList.toggle('hidden', !on); }

async function loadCalendar() {
  calYear = calRef.getFullYear(); calMonth = calRef.getMonth();
  const [from, to] = calRange();
  const seq = ++_calLoadSeq;   // ochrana pred prekrytím pri rýchlom prepínaní
  calShowLoading(true);
  // 1) Interné udalosti (rýchle) — vykresli hneď, nech kalendár nečaká na ICS
  try {
    const ev = await fetch(`/api/calendar?from=${calYmd(from)}&to=${calYmd(to)}`).then(r => r.json());
    if (seq !== _calLoadSeq) return;
    calEvents = Array.isArray(ev) ? ev : [];
  } catch { calEvents = []; }
  calShowLoading(false);
  renderCalendar();
  // 2) Napojené ICS feedy (pomalšie) — dofetchuj a prekresli s jemným indikátorom
  calShowFeedLoading(true);
  try {
    const ext = await fetch(`/api/calendar/external?from=${calYmd(from)}&to=${calYmd(to)}`).then(r => r.json());
    if (seq !== _calLoadSeq) return;
    calExternal = Array.isArray(ext) ? ext : [];
  } catch { calExternal = []; }
  if (seq !== _calLoadSeq) return;
  calShowFeedLoading(false);
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
// kľúč zdroja udalosti (interné vs. názov externého kalendára)
function calSrcKey(ev) { return ev.external ? (ev.source || 'Outlook') : CAL_INT_KEY; }
function calVisible(ev) {
  if (calSrcHidden.has(calSrcKey(ev))) return false;
  if (calTypeFilter) { const t = ev.external ? 'outlook' : (ev.type || 'event'); if (t !== calTypeFilter) return false; }
  if (calTextFilter) {
    const hay = [ev.title, ev.source, ev.note].filter(Boolean).join(' ').toLowerCase();
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
function calEvOwner(ev) { return ev.external ? (ev.source || 'Outlook') : ''; }
// Zlúči rovnaké udalosti z viacerých zdrojov (rovnaký názov + dátum + čas) do jednej, so zoznamom zdrojov
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
// priezvisko z názvu zdroja ("Marek Múčka" → "Múčka"; jednoslovné názvy ostávajú celé)
function calSurname(name) { const w = String(name || '').trim().split(/\s+/); return w[w.length - 1] || ''; }
// priezviská vlastníkov udalosti (zlúčená = viac zdrojov, oddelené čiarkou); interné = ''
function calEvSurnames(ev) {
  const srcs = (ev._owners && ev._owners.length) ? ev._owners : (calEvOwner(ev) ? [calEvOwner(ev)] : []);
  return srcs.map(calSurname).filter(Boolean).join(', ');
}
// tooltip so zdrojom (farba chipu identifikuje zdroj, text netreba v každej udalosti)
function calEvTip(ev) {
  const srcs = (ev._owners && ev._owners.length) ? ev._owners : (calEvOwner(ev) ? [calEvOwner(ev)] : []);
  const ext = (ev._ref || ev).external;
  const rng = calEvTimeRange(ev);
  return escHtml(ev.title)
    + (rng ? '\n🕒 ' + escHtml(rng) : '')
    + (srcs.length ? '\n' + (srcs.length > 1 ? 'Zdroje: ' : 'Zdroj: ') + escHtml(srcs.join(', ')) : '')
    + (ext ? ' (len na čítanie)' : '');
}
// Kontrastná farba textu pre danú farbu udalosti — na svetlých farbách tmavý text,
// na tmavých svetlý (aby text v udalostiach bol vždy čitateľný, hlavne v tmavom režime).
function calContrastText(color) {
  const c = String(color || '').trim();
  const m = c.match(/^#?([0-9a-fA-F]{6})$/) || c.match(/^#?([0-9a-fA-F]{3})$/);
  if (!m) return '#ffffff';
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  // perceptuálny jas (0–1); prah 0.6 → svetlé pozadie dostane tmavý text
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#111827' : '#ffffff';
}
// Časový rozsah udalosti „od – do" (ak je zadaný koniec), inak len začiatok
function calEvTimeRange(ev) {
  if (!ev || !ev.time) return '';
  return ev.endTime ? (ev.time + ' – ' + ev.endTime) : ev.time;
}
function calEvChipHtml(ev) {
  const ref = ev._ref || ev;
  const ext = ref.external;
  const allday = ev.allDay || calIsMultiDay(ev);
  const color = ev.color || (ext ? '#7c3aed' : '#00d4ff');
  const dataAttr = ext ? `data-ext="${calExternal.indexOf(ref)}"` : `data-id="${ref._id}"`;
  const multi = ev._owners && ev._owners.length > 1;
  const cls = `cal-ev ${allday ? 'cal-ev-allday' : 'cal-ev-timed'}${ext ? ' cal-ev-ext' : ''}${multi ? ' cal-ev-merged' : ''}`;
  const sn = calEvSurnames(ev);
  const tip = calEvTip(ev);
  if (allday) {
    const badge = sn ? `<span class="cal-ev-owner"> · ${escHtml(sn)}</span>` : '';
    return `<div class="${cls}" style="--ev-color:${escHtml(color)};--ev-text:${calContrastText(color)}" ${dataAttr} title="${tip}"><span class="cal-ev-txt">${escHtml(ev.title)}</span>${badge}</div>`;
  }
  // Časovaná udalosť — čas (od–do), názov a vlastník POD SEBOU
  const rng = calEvTimeRange(ev);
  const t = rng ? `<span class="cal-ev-time">${escHtml(rng)}</span>` : '';
  const owner = sn ? `<span class="cal-ev-owner">${escHtml(sn)}</span>` : '';
  return `<div class="${cls}" style="--ev-color:${escHtml(color)}" ${dataAttr} title="${tip}"><span class="cal-ev-dot"></span><span class="cal-ev-main">${t}<span class="cal-ev-txt">${escHtml(ev.title)}</span>${owner}</span></div>`;
}
function calAttachEvClicks(root) {
  root.querySelectorAll('.cal-ev, .cal-span').forEach(el => el.onclick = (e) => {
    e.stopPropagation();
    if (el.dataset.ext != null) { const ev = calExternal[+el.dataset.ext]; if (ev) showExternalEvent(ev); return; }
    const ev = calEvents.find(x => x._id === el.dataset.id); if (ev) openEventModal(ev);
  });
}
// ── Zdroje kalendára ako farebné prepínacie chipy (klik = zobraziť/skryť, ⊙ = iba tento) ──
function calSources() {
  // zdroj → { name, color, count } z aktuálne načítaných externých udalostí
  const map = new Map();
  calExternal.forEach(e => {
    const k = (e.source || 'Outlook').trim() || 'Outlook';
    const m = map.get(k) || { key: k, name: k, color: e.color || '#7c3aed', count: 0 };
    m.count++; map.set(k, m);
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'sk'));
}
function calRenderSrcChips() {
  const el = document.getElementById('calSrcBar'); if (!el) return;
  const srcs = calSources();
  // odstráň skryté zdroje, ktoré už neexistujú (okrem interných)
  [...calSrcHidden].forEach(k => { if (k !== CAL_INT_KEY && !srcs.some(s => s.key === k)) calSrcHidden.delete(k); });
  const chip = (key, name, color, count, icon) => {
    const off = calSrcHidden.has(key);
    return `<button class="cal-src-chip${off ? ' off' : ''}" style="--src-c:${escHtml(color)}"
      onclick="calToggleSrc(decodeURIComponent('${encodeURIComponent(key)}'))"
      ondblclick="calSoloSrc(decodeURIComponent('${encodeURIComponent(key)}'))"
      title="${off ? 'Klik = zobraziť zdroj' : 'Klik = skryť zdroj'} · dvojklik = iba tento zdroj">
      <span class="cal-src-dot"></span>${icon ? icon + ' ' : ''}${escHtml(name)}<span class="cal-src-n">${count}</span>
    </button>`;
  };
  const intCount = calEvents.length;
  let html = chip(CAL_INT_KEY, 'Interné (dashboard)', '#00d4ff', intCount, '✏️');
  html += srcs.map(s => chip(s.key, s.name, s.color, s.count, '📅')).join('');
  if (calSrcHidden.size) html += `<button class="cal-src-chip cal-src-all" onclick="calShowAllSrc()" title="Zobraziť všetky zdroje">Zobraziť všetky</button>`;
  if (!srcs.length) html += `<button class="cal-src-chip cal-src-add" onclick="openIcsModal()" title="Napojiť Outlook / RON / iný kalendár cez ICS">+ Napojiť kalendár</button>`;
  el.innerHTML = html;
}
function calToggleSrc(key) {
  if (calSrcHidden.has(key)) calSrcHidden.delete(key); else calSrcHidden.add(key);
  renderCalendar();
}
function calSoloSrc(key) {
  // dvojklik: zobraz iba tento zdroj; ak už je sólo, zobraz všetky
  const all = [CAL_INT_KEY, ...calSources().map(s => s.key)];
  const isSolo = !calSrcHidden.has(key) && calSrcHidden.size === all.length - 1;
  calSrcHidden = isSolo ? new Set() : new Set(all.filter(k => k !== key));
  renderCalendar();
}
function calShowAllSrc() { calSrcHidden.clear(); renderCalendar(); }

function renderCalendar() {
  const vp = document.getElementById('calViewport'); if (!vp) return;
  document.querySelectorAll('[data-calview]').forEach(b => b.classList.toggle('active', b.dataset.calview === calView));
  document.getElementById('calZoomCtl')?.classList.toggle('hidden', calView === 'month');
  const bhBtn = document.getElementById('calBhBtn');
  if (bhBtn) { bhBtn.classList.toggle('hidden', calView === 'month'); bhBtn.classList.toggle('active', calBh); }
  const ty = document.getElementById('calType'); if (ty) ty.value = calTypeFilter;
  applyCalTheme();
  calRenderSrcChips();
  if (calView === 'month') renderCalMonth(vp);
  else renderCalTimeGrid(vp, calView === 'week' ? calWeekDays() : [new Date(calRef)]);
  calUpdateSticky();
}
// Ukotvenie hlavičky dní pod lepkavú lištu filtrov (offset = výška hlavičky appky + lišty)
function calUpdateSticky() {
  const tb = document.querySelector('#page-calendar .cal-toolbar'); if (!tb) return;
  const hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 58;
  document.documentElement.style.setProperty('--cal-sticky-top', (hh + tb.offsetHeight) + 'px');
  if (!calUpdateSticky._bound) { calUpdateSticky._bound = true; window.addEventListener('resize', () => { if (document.getElementById('page-calendar')?.classList.contains('active')) calUpdateSticky(); }); }
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
      const sn = calEvSurnames(ev);
      const snTxt = sn ? ` <span class="cal-ev-owner">· ${escHtml(sn)}</span>` : '';
      return `<div class="${cls}" ${data} style="--ev-color:${escHtml(color)};left:calc(${left}% + 3px);width:calc(${width}% - 6px);top:${seg.lane * LANE}px" title="${calEvTip(ev)}">${seg.contL ? '◂ ' : ''}${escHtml(ev.title)}${snTxt}${seg.contR ? ' ▸' : ''}</div>`;
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
  let alldayCells = '';
  let cols = '';
  days.forEach(d => {
    const key = calYmd(d), we = (d.getDay() === 0 || d.getDay() === 6), isToday = key === todayKey;
    const hol = calHolidayName(key);
    head += `<div class="ctg-dayhdr${isToday ? ' ctg-today' : ''}${we ? ' ctg-we' : ''}${hol ? ' ctg-hol' : ''}" data-open-day="${key}" title="${hol ? 'Sviatok: ' + escHtml(hol) : ''}"><span class="ctg-dow">${WD[(d.getDay() + 6) % 7]}</span> <span class="ctg-dnum">${d.getDate()}.${d.getMonth() + 1}.</span></div>`;
    const dayEvs = dayMap[key] || [];
    const holHtml = hol ? `<div class="cal-holiday" title="Štátny sviatok: ${escHtml(hol)}">🇸🇰 ${escHtml(hol)}</div>` : '';
    // Iba podklad bunky (víkend/sviatok/klik + sviatkový chip) — celodenné/viacdňové udalosti sa kreslia ako spojené pruhy (nižšie)
    alldayCells += `<div class="ctg-allday-cell${we ? ' ctg-we' : ''}${hol ? ' ctg-hol' : ''}" data-newday="${key}">${holHtml}</div>`;
    let lines = ''; for (let h = H0; h < H1; h++) lines += `<div class="ctg-line" style="top:${(h - H0) * hourH}px"></div>`;
    const laid = calLayoutLanes(calMergeEvents(dayEvs.filter(ev => !ev.allDay && !calIsMultiDay(ev) && ev.time)));
    const evhtml = laid.map(it => {
      if (it.e <= H0 * 60 || it.s >= H1 * 60) return '';
      const top = Math.max(0, (it.s - H0 * 60) / 60 * hourH);
      const height = Math.max(24, (Math.min(it.e, H1 * 60) - Math.max(it.s, H0 * 60)) / 60 * hourH - 2);
      const w = 100 / it.cols, left = it.lane * w, ev = it.ev, ref = ev._ref || ev, ext = ref.external;
      const conflict = it.cols > 1;
      const sn = calEvSurnames(ev);
      // pod seba: čas, popis (zalomí sa po slovách), meno používateľa
      const inner = `<span class="ctg-ev-time">${escHtml(calEvTimeRange(ev))}</span><span class="ctg-ev-title">${escHtml(ev.title)}</span>${sn ? `<span class="ctg-ev-owner">${escHtml(sn)}</span>` : ''}`;
      const cls = `cal-ev ctg-ev${ext ? ' cal-ev-ext' : ''}${conflict ? ' ctg-ev-conflict' : ''}`;
      const ds = ext ? `data-ext="${calExternal.indexOf(ref)}"` : `data-id="${ref._id}"`;
      const evColor = ev.color || (ext ? '#7c3aed' : '#00d4ff');
      return `<div class="${cls}" ${ds} style="--ev-color:${escHtml(evColor)};--ev-text:${calContrastText(evColor)};top:${top}px;min-height:${height}px;left:${left}%;width:calc(${w}% - 3px)" title="${conflict ? '⚠ Prekryv · ' : ''}${calEvTip(ev)}">${conflict ? '<span class="ctg-conf">⚠</span>' : ''}${inner}</div>`;
    }).join('');
    cols += `<div class="ctg-daycol${we ? ' ctg-we' : ''}${isToday ? ' ctg-today' : ''}${hol ? ' ctg-hol' : ''}" data-newday="${key}" style="height:${HN * hourH}px">${lines}${evhtml}</div>`;
  });

  // ── Celodenné / viacdňové udalosti ako SPOJENÉ pruhy cez dni (ako v mesačnom pohľade) ──
  const wkKeys = days.map(calYmd), wStart = wkKeys[0], wEnd = wkKeys[wkKeys.length - 1], NCOL = days.length;
  const evKey = ev => String(ev.date).slice(0, 10), evEndKey = ev => String(ev.endDate || ev.date).slice(0, 10);
  const spanning = calMergeEvents(calEvents.concat(calExternal).filter(calVisible).filter(ev => ev.allDay || calIsMultiDay(ev)));
  const adSegs = [];
  spanning.forEach(ev => {
    const s = evKey(ev), e = evEndKey(ev);
    if (e < wStart || s > wEnd) return;
    let startCol = wkKeys.indexOf(s), endCol = wkKeys.indexOf(e);
    const contL = startCol === -1; if (contL) startCol = 0;
    const contR = endCol === -1; if (contR) endCol = NCOL - 1;
    adSegs.push({ ev, startCol, endCol, contL, contR });
  });
  adSegs.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));
  const adLanes = [];
  adSegs.forEach(seg => { let L = 0; for (; ;) { const occ = adLanes[L] || []; if (occ.every(r => seg.endCol < r.s || seg.startCol > r.e)) { (adLanes[L] = adLanes[L] || []).push({ s: seg.startCol, e: seg.endCol }); seg.lane = L; break; } L++; } });
  const adLaneCount = adLanes.length;
  const ADLANE = 24;
  const spanBars = adSegs.map(seg => {
    const ev = seg.ev, ref = ev._ref || ev, ext = ref.external, color = ev.color || (ext ? '#7c3aed' : '#00d4ff');
    const left = seg.startCol / NCOL * 100, width = (seg.endCol - seg.startCol + 1) / NCOL * 100;
    const data = ext ? `data-ext="${calExternal.indexOf(ref)}"` : `data-id="${ref._id}"`;
    const cls = `cal-span${seg.contL ? ' cont-l' : ''}${seg.contR ? ' cont-r' : ''}`;
    const sn = calEvSurnames(ev);
    const snTxt = sn ? ` <span class="cal-ev-owner">· ${escHtml(sn)}</span>` : '';
    return `<div class="${cls}" ${data} style="--ev-color:${escHtml(color)};--ev-text:${calContrastText(color)};left:calc(${left}% + 3px);width:calc(${width}% - 6px);top:${seg.lane * ADLANE}px" title="${calEvTip(ev)}">${seg.contL ? '◂ ' : ''}${escHtml(ev.title)}${snTxt}${seg.contR ? ' ▸' : ''}</div>`;
  }).join('');
  const allday = `<div class="ctg-corner ctg-allday-lbl">celý deň</div><div class="ctg-allday-body">${alldayCells}<div class="ctg-allday-spans">${spanBars}</div></div>`;

  let gutter = ''; for (let h = H0; h < H1; h++) gutter += `<div class="ctg-hour" style="height:${hourH}px"><span>${String(h).padStart(2, '0')}:00</span></div>`;

  vp.innerHTML = `<div class="ctg ctg-${calView}" style="--ctg-days:${days.length}">
    <div class="ctg-head">${head}</div>
    <div class="ctg-allday" style="--ad-lanes:${adLaneCount}">${allday}</div>
    <div class="ctg-body"><div class="ctg-gutter">${gutter}</div><div class="ctg-cols">${cols}</div></div>
  </div>`;
  calAttachEvClicks(vp);
  vp.querySelectorAll('[data-open-day]').forEach(el => el.onclick = () => calOpenDay(el.dataset.openDay));
  vp.querySelectorAll('[data-newday]').forEach(el => el.onclick = (e) => { if (e.target === el) openEventModal(null, el.dataset.newday); });
  const body = vp.querySelector('.ctg-body'); if (body) body.scrollTop = Math.max(0, (7 - H0) * hourH - 8);
  // Zarovnaj hlavičku a riadok „celý deň" s mriežkou — kompenzuj šírku skrolovacej lišty tela
  const ctg = vp.querySelector('.ctg');
  if (body && ctg) { const sbw = Math.max(0, body.offsetWidth - body.clientWidth); ctg.style.setProperty('--sbw', sbw + 'px'); }
}

// Read-only zobrazenie externej (Outlook) udalosti
function showExternalEvent(ev) {
  const sameDay = !ev.endDate || String(ev.endDate).slice(0, 10) === String(ev.date).slice(0, 10);
  const d = fmtDate(ev.date) + (sameDay ? '' : ' – ' + fmtDate(ev.endDate));
  const when = ev.allDay ? 'celodenná' : calEvTimeRange(ev);
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

function setCalView(v) { calView = v; localStorage.setItem('calView', v); loadCalendar(); }
function calNav(dir) {
  if (calView === 'month') calRef = new Date(calRef.getFullYear(), calRef.getMonth() + dir, 1);
  else if (calView === 'week') calRef = new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate() + 7 * dir);
  else calRef = new Date(calRef.getFullYear(), calRef.getMonth(), calRef.getDate() + dir);
  loadCalendar();
}
function calGoToday() { calRef = new Date(); loadCalendar(); }
function setCalText(v) { calTextFilter = v.trim(); renderCalendar(); }
function setCalType(v) { calTypeFilter = v; renderCalendar(); }
function toggleCalBh() { calBh = !calBh; localStorage.setItem('calBh', calBh ? '1' : '0'); renderCalendar(); }
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

// Zdieľanie kalendára — verejný odkaz na zobrazenie + iCal odber
async function openCalExportModal() {
  try {
    const d = await fetch('/api/calendar/feed-url').then(r => r.json());
    document.getElementById('calExportUrl').value = location.origin + '/api/calendar/feed.ics?token=' + d.token;
    document.getElementById('calShareUrl').value  = location.origin + '/calendar-share.html?token=' + d.token;
  } catch { document.getElementById('calExportUrl').value = ''; document.getElementById('calShareUrl').value = ''; }
  document.getElementById('calExportModal').classList.remove('hidden');
}
function _calCopy(id, msg) {
  const inp = document.getElementById(id); if (!inp || !inp.value) { toast('Odkaz sa nepodarilo načítať.', 'error'); return; }
  inp.select();
  navigator.clipboard?.writeText(inp.value).then(() => toast(msg, 'success'), () => { try { document.execCommand('copy'); toast(msg, 'success'); } catch { toast('Skopíruj odkaz ručne.', 'info'); } });
}
function calCopyShareUrl() { _calCopy('calShareUrl', 'Odkaz na zobrazenie skopírovaný — pošli ho kolegovi.'); }
function calCopyExportUrl() { _calCopy('calExportUrl', 'iCal odkaz skopírovaný.'); }

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
        toast(`⏰ ${ev.title} o ${ev.time}`, 'info', 9000);
      }
    });
  } catch {}
}
function calZoomBy(d) { calZoom = Math.max(28, Math.min(120, calZoom + d * 12)); localStorage.setItem('calZoom', String(calZoom)); renderCalendar(); }

// ── Event modal ─────────────────────────────────────────────────────────────
function openEventModal(event = null, prefillDate = null) {
  const isEdit = event && typeof event === 'object';
  document.getElementById('eventModalTitle').textContent = isEdit ? 'Upraviť udalosť' : 'Nová udalosť';
  document.getElementById('evId').value      = isEdit ? event._id : '';
  document.getElementById('evTitle').value   = isEdit ? (event.title || '') : '';
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

// ============================================================
// Naplánovať stretnutie — hľadač spoločného voľného termínu
// ============================================================
// Zoznam kalendárov (ľudí): interný dashboard + napojené externé zdroje
function calMeetingPeople() {
  const list = [{ key: CAL_INT_KEY, name: 'Interné (dashboard)', color: '#00d4ff' }];
  calSources().forEach(s => list.push({ key: s.key, name: s.name, color: s.color }));
  return list;
}
function openMeetingModal() {
  const people = calMeetingPeople();
  document.getElementById('meetPeople').innerHTML = people.map(p => `
    <label class="meet-person">
      <input type="checkbox" class="meet-cb" value="${encodeURIComponent(p.key)}">
      <span class="meet-person-dot" style="background:${escHtml(p.color)}"></span>
      <span class="meet-person-name">${escHtml(p.name)}</span>
    </label>`).join('') || '<div class="meet-empty">Zatiaľ nie sú napojené žiadne kalendáre — pridaj ich cez „🔗 Kalendáre".</div>';
  document.getElementById('meetResults').innerHTML = '';
  document.getElementById('meetingModal').classList.remove('hidden');
}
function closeMeetingModal() { document.getElementById('meetingModal').classList.add('hidden'); }
function calMinToHM(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

// Obsadené intervaly [odMin, doMin] pre daný deň a vybrané zdroje (zlúčené)
function calMeetingBusy(dayKey, keySet) {
  const iv = [];
  calEvents.concat(calExternal).forEach(ev => {
    if (!keySet.has(calSrcKey(ev))) return;
    const startKey = String(ev.date).slice(0, 10);
    const endKey = ev.endDate ? String(ev.endDate).slice(0, 10) : startKey;
    if (dayKey < startKey || dayKey > endKey) return;
    const multi = endKey !== startKey;
    if (ev.allDay || multi) { iv.push([0, 1440]); return; }     // celodenná/viacdňová = obsadený celý deň
    const s = parseHM(ev.time); if (s == null) return;          // bez času a nie celodenná → neblokuje
    const e = parseHM(ev.endTime);
    iv.push([s, (e && e > s) ? Math.min(1440, e) : Math.min(1440, s + 60)]);
  });
  iv.sort((a, b) => a[0] - b[0]);
  const merged = [];
  iv.forEach(cur => {
    const last = merged[merged.length - 1];
    if (last && cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else merged.push(cur.slice());
  });
  return merged;
}

// Nájsť najbližšie termíny, kde majú VŠETCI vybraní voľno (v pracovnom čase, cez pracovné dni)
function calMeetingSlots(keys, durationMin, opts) {
  const { days, workStart, workEnd, maxResults } = opts;
  const keySet = new Set(keys);
  const gran = 15;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = calYmd(now);
  const out = [];
  for (let d = 0; d < days && out.length < maxResults; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;              // víkend
    const key = calYmd(day);
    if (calHolidayName(key)) continue;                 // štátny sviatok
    let cursor = workStart;
    if (key === todayKey) cursor = Math.max(cursor, Math.ceil(nowMin / gran) * gran);  // dnes nie do minulosti
    if (cursor >= workEnd) continue;
    const busy = calMeetingBusy(key, keySet).filter(b => b[1] > cursor && b[0] < workEnd);
    let t = cursor;
    for (const [bs, be] of busy) {
      if (bs - t >= durationMin) { out.push({ key, start: t, end: t + durationMin }); if (out.length >= maxResults) break; }
      t = Math.max(t, be);
      if (t >= workEnd) break;
    }
    if (out.length < maxResults && workEnd - t >= durationMin) out.push({ key, start: t, end: t + durationMin });
  }
  return out;
}

function calFindMeeting() {
  const keys = [...document.querySelectorAll('.meet-cb:checked')].map(cb => decodeURIComponent(cb.value));
  const res = document.getElementById('meetResults');
  if (!keys.length) { res.innerHTML = '<div class="meet-msg err">Vyber aspoň jedného účastníka.</div>'; return; }
  const dur = +document.getElementById('meetDur').value || 60;
  const workStart = parseHM(document.getElementById('meetFrom').value) ?? 480;
  const workEnd = parseHM(document.getElementById('meetTo').value) ?? 960;
  const days = Math.min(60, Math.max(1, +document.getElementById('meetDays').value || 14));
  if (workEnd - workStart < dur) { res.innerHTML = '<div class="meet-msg err">Pracovný čas je kratší ako dĺžka stretnutia.</div>'; return; }
  const slots = calMeetingSlots(keys, dur, { days, workStart, workEnd, maxResults: 6 });
  const names = keys.map(k => k === CAL_INT_KEY ? 'Interné' : calSurname(k)).join(', ');
  if (!slots.length) { res.innerHTML = `<div class="meet-msg err">V najbližších ${days} dňoch sa nenašiel spoločný voľný termín (${dur} min) pre: ${escHtml(names)}. Skús kratšie trvanie alebo väčší rozsah dní.</div>`; return; }
  const wd = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
  const fmt = s => { const dt = new Date(s.key + 'T00:00:00'); return `${wd[dt.getDay()]} ${dt.getDate()}.${dt.getMonth() + 1}.${dt.getFullYear()}`; };
  let html = `<div class="meet-msg ok">Najbližší spoločný voľný termín pre <strong>${escHtml(names)}</strong> — vybral(a) si najlepší a klikni „Vytvoriť".</div><div class="meet-slots">`;
  slots.forEach((s, i) => {
    html += `<div class="meet-slot${i === 0 ? ' meet-slot-best' : ''}">
      <div class="meet-slot-when"><span class="meet-slot-day">${escHtml(fmt(s))}${i === 0 ? ' · najbližší' : ''}</span><span class="meet-slot-time">${calMinToHM(s.start)} – ${calMinToHM(s.end)}</span></div>
      <button class="btn-primary btn-sm" onclick="meetCreateEvent('${s.key}',${s.start},${s.end},'${encodeURIComponent(names)}')">Vytvoriť</button>
    </div>`;
  });
  html += '</div>';
  res.innerHTML = html;
}

// Z nájdeného termínu otvorí formulár novej udalosti s predvyplneným časom a účastníkmi
function meetCreateEvent(dayKey, startMin, endMin, namesEnc) {
  const names = decodeURIComponent(namesEnc || '');
  closeMeetingModal();
  openEventModal(null, dayKey);
  document.getElementById('evAllDay').checked = false;
  toggleEventTime();
  document.getElementById('evTime').value = calMinToHM(startMin);
  document.getElementById('evEndTime').value = calMinToHM(endMin);
  document.getElementById('evType').value = 'meeting';
  const t = document.getElementById('evTitle');
  t.value = 'Stretnutie' + (names ? ': ' + names : '');
  t.focus();
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

// ── Výber obrázka: galéria Fotiek + nahratie z disku → potom anotácie ──
let _photoPicker = null;
function openPhotoPicker() {
  return new Promise(resolve => {
    _photoPicker = { resolve, cat: 'all', photos: [], cats: [] };
    document.getElementById('photoPickerModal').classList.remove('hidden');
    const s = document.getElementById('pkSearch'); if (s) s.value = '';
    document.getElementById('pkGrid').innerHTML = '<div class="pk-empty">Načítavam fotky…</div>';
    document.getElementById('pkCats').innerHTML = '';
    photoPickerLoad();
  });
}
async function photoPickerLoad() {
  try {
    const [cats, list] = await Promise.all([
      fetch('/api/photos/categories').then(r => r.json()),
      fetch('/api/photos').then(r => r.json())
    ]);
    if (!_photoPicker) return;
    _photoPicker.cats = Array.isArray(cats) ? cats : [];
    _photoPicker.photos = Array.isArray(list) ? list : [];
  } catch { if (_photoPicker) _photoPicker.photos = []; }
  if (!_photoPicker) return;
  renderPhotoPickerCats(); renderPhotoPickerGrid();
}
function closePhotoPicker(url) {
  document.getElementById('photoPickerModal').classList.add('hidden');
  const r = _photoPicker && _photoPicker.resolve; _photoPicker = null;
  if (r) r(url || null);
}
function photoPickerCancel() { closePhotoPicker(null); }
function photoPickerSetCat(c) { if (!_photoPicker) return; _photoPicker.cat = c; renderPhotoPickerCats(); renderPhotoPickerGrid(); }
function photoPickerPick(id) { const p = _photoPicker && _photoPicker.photos.find(x => x._id === id); if (p) closePhotoPicker(p.url); }
async function photoPickerUpload(input) {
  const f = input.files[0]; if (!f) return;
  input.value = '';
  const btnTxt = document.getElementById('pkGrid'); if (btnTxt) btnTxt.innerHTML = '<div class="pk-empty">Nahrávam…</div>';
  const url = await uploadImage(f);
  closePhotoPicker(url);
}
function pkFiltered() {
  if (!_photoPicker) return [];
  const q = (document.getElementById('pkSearch')?.value || '').toLowerCase();
  return _photoPicker.photos.filter(p => {
    const catId = p.category?._id || p.category || null;
    if (_photoPicker.cat === 'none' && catId) return false;
    if (_photoPicker.cat !== 'all' && _photoPicker.cat !== 'none' && catId !== _photoPicker.cat) return false;
    if (q) { const hay = [p.title, p.author, p.note, ...(p.tags || []), p.category?.name].filter(Boolean).join(' ').toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
}
function renderPhotoPickerCats() {
  const el = document.getElementById('pkCats'); if (!el) return;
  const chips = [`<button class="pk-chip ${_photoPicker.cat === 'all' ? 'active' : ''}" onclick="photoPickerSetCat('all')">Všetky</button>`];
  _photoPicker.cats.forEach(c => chips.push(`<button class="pk-chip ${_photoPicker.cat === c._id ? 'active' : ''}" onclick="photoPickerSetCat('${c._id}')">${escHtml(c.icon || '')} ${escHtml(c.name)}</button>`));
  el.innerHTML = chips.join('');
}
function renderPhotoPickerGrid() {
  const el = document.getElementById('pkGrid'); if (!el) return;
  const items = pkFiltered();
  if (!items.length) { el.innerHTML = '<div class="pk-empty">Žiadne fotky — nahraj novú z disku alebo pridaj fotky v module Fotky.</div>'; return; }
  el.innerHTML = items.map(p => `<div class="pk-tile" onclick="photoPickerPick('${p._id}')" title="${escHtml(p.title || '')}">
    <img loading="lazy" src="${escHtml(p.url)}" alt="">
    <div class="pk-tile-cap">${escHtml(p.title || p.originalName || 'Bez názvu')}</div>
  </div>`).join('');
}

// Vloženie obrázka: vyber z galérie/disku → anotačný editor → vráti URL (alebo null)
async function pickImageUpload() {
  const url = await openPhotoPicker();
  if (!url) return null;
  const finalUrl = await openImageAnnotator(url);  // kruhy/rámčeky/popisy/bubliny (dá sa preskočiť)
  return finalUrl || url;
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

// Vlastník postupu (fallback na Vypracoval / Autor pre staršie záznamy)
function procOwnerOf(p) { return p.owner || (p.validity && p.validity.preparedBy) || p.author || ''; }
function procStepCount(p) { return (p.steps || []).filter(s => stripHtmlText(s.text) || s.image).length; }

// Stav zoradenia tabuľky postupov
let procSort = { key: 'updatedAt', dir: 'desc' };
function setProcSort(key) {
  if (procSort.key === key) procSort.dir = procSort.dir === 'asc' ? 'desc' : 'asc';
  else procSort = { key, dir: (key === 'updatedAt' || key === 'nextRevision') ? 'desc' : 'asc' };
  renderProcedures();
}

function renderProcedures() {
  const list = document.getElementById('procList');
  if (!list) return;
  const q = (document.getElementById('procSearch')?.value || '').toLowerCase();
  const statusF = document.getElementById('procStatusFilter')?.value || '';
  const revF = document.getElementById('procRevFilter')?.value || '';

  if (proceduresData.length === 0) {
    list.innerHTML = '<div class="proc-empty">Zatiaľ žiadne postupy.<div class="proc-empty-actions"><button class="btn-primary" onclick="openProcedureModal()">+ Vytvoriť prvý postup</button></div></div>';
    return;
  }

  let items = proceduresData.filter(p => {
    if (q) {
      const hay = `${p.title || ''} ${p.department || ''} ${p.author || ''} ${procOwnerOf(p)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusF && (p.status || 'active') !== statusF) return false;
    if (revF) {
      const r = procRevisionStatus(p);
      if (revF === 'none' && r) return false;
      if (revF === 'over' && !(r && r.level === 'over')) return false;
      if (revF === 'soon' && !(r && r.level === 'soon')) return false;
    }
    return true;
  });

  // Zoradenie
  const dir = procSort.dir === 'asc' ? 1 : -1;
  const val = (p) => {
    switch (procSort.key) {
      case 'title':      return (p.title || '').toLowerCase();
      case 'owner':      return procOwnerOf(p).toLowerCase();
      case 'department': return (p.department || '').toLowerCase();
      case 'status':     return PROC_STATUS[p.status] || p.status || '';
      case 'steps':      return procStepCount(p);
      case 'updatedAt':  return new Date(p.updatedAt || 0).getTime();
      default:           return '';
    }
  };
  items.sort((a, b) => {
    if (procSort.key === 'nextRevision') {
      const ta = (a.validity && a.validity.nextRevision) ? new Date(a.validity.nextRevision).getTime() : null;
      const tb = (b.validity && b.validity.nextRevision) ? new Date(b.validity.nextRevision).getTime() : null;
      if (ta === null && tb === null) return 0;
      if (ta === null) return 1;   // postupy bez revízie vždy naspodok
      if (tb === null) return -1;
      return (ta - tb) * dir;
    }
    const va = val(a), vb = val(b);
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'sk') * dir;
  });

  if (items.length === 0) {
    list.innerHTML = '<div class="proc-empty">Žiadne výsledky pre zadané filtre.</div>';
    return;
  }

  const arrow = (key) => procSort.key === key ? (procSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  const th = (key, label, cls = '') => `<th class="proc-th${cls ? ' ' + cls : ''}${procSort.key === key ? ' active' : ''}" onclick="setProcSort('${key}')">${label}${arrow(key)}</th>`;

  let html = `<div class="proc-table-wrap"><table class="proc-table">
    <thead><tr>
      ${th('title', 'Názov')}
      ${th('owner', 'Vlastník')}
      ${th('department', 'Oddelenie')}
      ${th('status', 'Stav')}
      ${th('steps', 'Operácie', 'num')}
      ${th('nextRevision', 'Ďalšia revízia')}
      ${th('updatedAt', 'Aktualizované')}
      <th class="proc-th-actions">Akcie</th>
    </tr></thead><tbody>`;

  items.forEach(p => {
    const owner = procOwnerOf(p);
    const r = procRevisionStatus(p);
    const nr = p.validity && p.validity.nextRevision;
    const revCell = nr
      ? `${fmtDate(nr)}${(r && r.level !== 'ok') ? ` <span class="pdv-rev-flag pdv-rev-${r.level}">${r.level === 'over' ? 'po termíne' : 'čoskoro'}</span>` : ''}`
      : '<span class="pdv-muted">—</span>';
    html += `<tr class="proc-tr" onclick="openProcedureById('${p._id}')">
        <td class="proc-td-title">${escHtml(p.title)}</td>
        <td>${owner ? escHtml(owner) : '<span class="pdv-muted">—</span>'}</td>
        <td>${p.department ? escHtml(p.department) : '<span class="pdv-muted">—</span>'}</td>
        <td><span class="proc-status-badge proc-status-${p.status}">${PROC_STATUS[p.status] || p.status}</span></td>
        <td class="proc-td-num">${procStepCount(p)}</td>
        <td class="proc-td-rev">${revCell}</td>
        <td class="proc-td-date">${fmtDate(p.updatedAt)}</td>
        <td class="proc-td-actions" onclick="event.stopPropagation()">
          <div class="proc-actions-row">
            <button class="admin-icon-btn" onclick="generateProcedureWord('${p._id}')" title="Stiahnuť ako Word">⬇</button>
            <button class="admin-icon-btn" onclick="openProcedureById('${p._id}')" title="Upraviť">✎</button>
            <button class="admin-icon-btn danger" onclick="deleteProcedure('${p._id}')" title="Odstrániť">✕</button>
          </div>
        </td>
      </tr>`;
  });
  html += `</tbody></table></div>`;
  list.innerHTML = html;
}

function generateProcedureWord(id) {
  window.location.href = `/api/procedures/${id}/docx` + tokenQS();
}

// ── Anotácie obrázka operácie (bubliny so šípkami) ────────────────────────────
// Veľkosť písma anotácie je RELATÍVNA (cqw = % šírky obrázka), aby sa škálovala
// so zobrazením. Staré absolútne px hodnoty (>10) prevedieme na relatívne.
function annotFontSize(v) {
  let n = Number(v);
  if (isNaN(n)) return 4;
  if (n > 10) n = n / 3.2;            // migrácia legacy px (napr. 14px → ~4.4)
  return Math.max(2, Math.min(10, Math.round(n * 10) / 10));
}
function annotNorm(a) {
  return {
    x: clampNum(a.x, 50), y: clampNum(a.y, 18),
    tx: clampNum(a.tx, 50), ty: clampNum(a.ty, 60),
    text: a.text || '', fontSize: annotFontSize(a.fontSize),
    textColor: a.textColor || '#111827', borderColor: a.borderColor || '#e11d48',
    bg: a.bg || '#ffffff', arrow: a.arrow !== false
  };
}
function clampNum(v, d) { const n = Number(v); return isNaN(n) ? d : Math.max(0, Math.min(100, n)); }
// HTML prekrytia anotácií nad obrázkom (edit=true → interaktívne úchyty)
function renderAnnotationsHtml(annots, edit) {
  if (!Array.isArray(annots) || !annots.length) return '';
  const arr = annots.map(annotNorm);
  const markers = arr.map((a, i) => a.arrow ? `<marker id="pdvArr${i}" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L5,2.5 L0,5 Z" fill="${escHtml(a.borderColor)}"/></marker>` : '').join('');
  const lines = arr.map((a, i) => a.arrow ? `<line x1="${a.x}" y1="${a.y}" x2="${a.tx}" y2="${a.ty}" stroke="${escHtml(a.borderColor)}" stroke-width="0.7" marker-end="url(#pdvArr${i})"/>` : '').join('');
  const svg = `<svg class="pdv-annot-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs>${markers}</defs>${lines}</svg>`;
  const items = arr.map((a, i) => {
    const st = `left:${a.x}%;top:${a.y}%;--afs:${a.fontSize};color:${escHtml(a.textColor)};border-color:${escHtml(a.borderColor)};background:${escHtml(a.bg)}`;
    const tip = (a.arrow && edit) ? `<span class="pdv-annot-tip" data-tip="${i}" style="left:${a.tx}%;top:${a.ty}%"></span>` : '';
    return `<div class="pdv-annot${edit ? ' pdv-annot-edit' : ''}" data-annot="${i}" style="${st}"><span class="pdv-annot-txt">${escHtml(a.text)}</span></div>${tip}`;
  }).join('');
  return `<div class="pdv-annots${edit ? ' pdv-annots-edit' : ''}">${svg}${items}</div>`;
}

// ── Editor anotácií (bubliny so šípkami) ──────────────────────────────────────
let _annotCard = null, _annots = [], _annotSel = -1, _annotDrag = null;

function openAnnotEditor(btn) {
  const card = btn.closest('.proc-step-card'); if (!card) return;
  if (!card._image) { toast('Najprv importuj obrázok operácie.', 'warn'); return; }
  _annotCard = card;
  _annots = (card._annots || []).map(annotNorm);
  _annotSel = _annots.length ? 0 : -1;
  document.getElementById('annotStage').innerHTML = `<img src="${escHtml(card._image)}" alt="" class="annot-img" draggable="false">`;
  document.getElementById('annotModal').classList.remove('hidden');
  const img = document.querySelector('#annotStage .annot-img');
  if (img && !img.complete) img.addEventListener('load', annotRender, { once: true });
  annotRender();
}
function closeAnnotEditor() { document.getElementById('annotModal').classList.add('hidden'); _annotCard = null; _annotDrag = null; }

function annotRender() {
  const stage = document.getElementById('annotStage'); if (!stage) return;
  const old = stage.querySelector('.pdv-annots'); if (old) old.remove();
  stage.insertAdjacentHTML('beforeend', renderAnnotationsHtml(_annots, true));
  stage.querySelectorAll('.pdv-annot').forEach(el => {
    const i = +el.dataset.annot; el.classList.toggle('sel', i === _annotSel);
    el.addEventListener('mousedown', e => annotDragStart(e, 'box', i));
  });
  stage.querySelectorAll('.pdv-annot-tip').forEach(el => {
    el.addEventListener('mousedown', e => annotDragStart(e, 'tip', +el.dataset.tip));
  });
  annotRenderCtl();
}

function annotRenderCtl() {
  const el = document.getElementById('annotCtl'); if (!el) return;
  if (_annotSel < 0 || !_annots[_annotSel]) { el.innerHTML = '<div class="annot-empty">Pridaj bublinu tlačidlom vyššie, alebo klikni na existujúcu.</div>'; return; }
  const a = _annots[_annotSel];
  el.innerHTML = `
    <label class="annot-lbl">Text bubliny</label>
    <textarea class="annot-in" rows="2" oninput="annotUpd('text',this.value)">${escHtml(a.text)}</textarea>
    <label class="annot-lbl">Veľkosť písma (škáluje sa s obrázkom): <b>${a.fontSize}</b></label>
    <input type="range" class="annot-range" min="2" max="10" step="0.5" value="${a.fontSize}" oninput="annotUpd('fontSize',this.value)">
    <div class="annot-colors">
      <label>Text<input type="color" value="${escHtml(a.textColor)}" oninput="annotUpd('textColor',this.value)"></label>
      <label>Orámovanie<input type="color" value="${escHtml(a.borderColor)}" oninput="annotUpd('borderColor',this.value)"></label>
      <label>Pozadie<input type="color" value="${escHtml(a.bg)}" oninput="annotUpd('bg',this.value)"></label>
    </div>
    <label class="annot-chk"><input type="checkbox" ${a.arrow ? 'checked' : ''} onchange="annotUpd('arrow',this.checked)"> Zobraziť šípku k cieľu</label>
    <button type="button" class="btn-delete btn-sm annot-delbtn" onclick="annotDel()">🗑 Odstrániť bublinu</button>`;
}

function annotUpd(field, val) {
  const a = _annots[_annotSel]; if (!a) return;
  if (field === 'fontSize') a.fontSize = Number(val) || 14;
  else if (field === 'arrow') a.arrow = !!val;
  else a[field] = val;
  annotRender();
}
function annotAdd() {
  _annots.push(annotNorm({ x: 22 + Math.random() * 16, y: 16 + Math.random() * 12, tx: 55, ty: 55, text: 'Nový popis', fontSize: 4, arrow: true }));
  _annotSel = _annots.length - 1; annotRender();
}
function annotDel() { if (_annotSel < 0) return; _annots.splice(_annotSel, 1); _annotSel = _annots.length ? Math.min(_annotSel, _annots.length - 1) : -1; annotRender(); }

function annotDragStart(e, kind, i) {
  e.preventDefault(); e.stopPropagation();
  _annotSel = i;
  const img = document.querySelector('#annotStage .annot-img');
  _annotDrag = { kind, i, moved: false, rect: img.getBoundingClientRect() };
  document.addEventListener('mousemove', annotDragMove);
  document.addEventListener('mouseup', annotDragEnd);
  annotRenderCtl();
}
function annotDragMove(e) {
  if (!_annotDrag) return;
  _annotDrag.moved = true;
  const r = _annotDrag.rect;
  const px = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
  const py = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
  const a = _annots[_annotDrag.i]; if (!a) return;
  if (_annotDrag.kind === 'box') { a.x = Math.round(px * 10) / 10; a.y = Math.round(py * 10) / 10; }
  else { a.tx = Math.round(px * 10) / 10; a.ty = Math.round(py * 10) / 10; }
  annotRender();
}
function annotDragEnd() { _annotDrag = null; document.removeEventListener('mousemove', annotDragMove); document.removeEventListener('mouseup', annotDragEnd); }

function annotSave() {
  if (_annotCard) { _annotCard._annots = _annots.map(annotNorm); scheduleProcLivePreview(); }
  closeAnnotEditor();
  toast('Anotácie uložené do operácie (nezabudni Uložiť postup).', 'success');
}

// ── Detail / náhľad (read-only) ───────────────────────────────────────────────
function renderProcedureDetailHtml(p) {
  const wm = procWarnMap(), pm = procPpeMap();
  const figCounter = { n: 0 };
  const steps = (p.steps || []).filter(s => stripHtmlText(s.text) || s.image || (s.note || '').trim() || (s.warnings && s.warnings.length) || (s.ppe && s.ppe.length));
  const meta = [];
  if (p.department) meta.push(`<span>🏢 ${escHtml(p.department)}</span>`);
  if (p.author)     meta.push(`<span>👤 ${escHtml(p.author)}</span>`);
  if (p.owner)      meta.push(`<span>🛡️ Vlastník: ${escHtml(p.owner)}</span>`);
  if (p.date)       meta.push(`<span>📅 ${fmtDate(p.date)}</span>`);
  meta.push(`<span class="proc-status-badge proc-status-${p.status || 'active'}">${PROC_STATUS[p.status] || p.status || ''}</span>`);

  const idLine = [];
  if (p.procNumber) idLine.push(escHtml(p.procNumber));
  if (p.edition)    idLine.push('Vydanie ' + escHtml(p.edition));
  if (p.validity && p.validity.revision) idLine.push('Rev. ' + escHtml(p.validity.revision));

  let html = `
    <div class="pdv-head" data-seg="identifikacia">
      <div class="pdv-eyebrow">PRACOVNÝ POSTUP${idLine.length ? ' · ' + idLine.join(' · ') : ''}</div>
      <h1 class="pdv-title" data-edit="prTitle">${escHtml(p.title || '(bez názvu)')}</h1>
      <div class="pdv-meta">${meta.join('')}</div>
    </div>`;

  // Pomocníci na vykreslenie
  let sec = 0;
  const sh = (t) => `<h3><span class="pdv-secno">${++sec}.</span> ${escHtml(t)}</h3>`;
  const textSec = (val, bind) => `<p class="pdv-purpose"${bind ? ` data-edit="${bind}"` : ''}>${escHtml(val).replace(/\n/g, '<br>')}</p>`;
  const dtable = (headers, rows, tbl) => `<div class="pdv-table-wrap"><table class="pdv-dtable"${tbl ? ` data-tbl="${tbl}"` : ''}><thead><tr>${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escHtml(c || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const filled = (arr, keys) => (arr || []).filter(o => keys.some(k => (o[k] || '').toString().trim()));
  const off = new Set(p.disabledSegments || []);
  const colsFor = (key) => (p.tableCols && Array.isArray(p.tableCols[key]) && p.tableCols[key].length) ? p.tableCols[key] : ((PROC_META.tableDefs && PROC_META.tableDefs[key]) || PROC_TABLE_FALLBACK[key] || []);
  const tdata = (key) => { const cols = colsFor(key); const rows = (p[key] || []).filter(r => cols.some(c => (r[c.key] || '').toString().trim())); return { cols, rows }; };
  const dtableDyn = (key) => { const { cols, rows } = tdata(key); return dtable(cols.map(c => c.label), rows.map(r => cols.map(c => { const v = r[c.key]; return (c.type === 'date' && v) ? fmtDate(v) : (v || ''); })), key); };

  if ((p.purpose || '').trim() && !off.has('purpose'))
    html += `<div class="pdv-section" data-seg="purpose">${sh('Účel')}${textSec(p.purpose, 'prPurpose')}</div>`;

  if ((p.scope || '').trim() && !off.has('purpose'))
    html += `<div class="pdv-section" data-seg="purpose">${sh('Rozsah platnosti')}${textSec(p.scope, 'prScope')}</div>`;

  const relatedDocs = tdata('relatedDocs').rows;
  if (relatedDocs.length && !off.has('resources'))
    html += `<div class="pdv-section" data-seg="resources">${sh('Súvisiace dokumenty a normy')}${dtableDyn('relatedDocs')}</div>`;

  if ((p.definitions || '').trim() && !off.has('purpose'))
    html += `<div class="pdv-section" data-seg="purpose">${sh('Definície a skratky')}${textSec(p.definitions, 'prDefinitions')}</div>`;

  const equipment = tdata('equipment').rows;
  if (equipment.length && !off.has('resources'))
    html += `<div class="pdv-section" data-seg="resources">${sh('Špeciálne vybavenie')}${dtableDyn('equipment')}</div>`;

  const materials = tdata('materials').rows;
  if (materials.length && !off.has('resources'))
    html += `<div class="pdv-section" data-seg="resources">${sh('Materiály a spotrebný materiál')}${dtableDyn('materials')}</div>`;

  const tools = (p.tools || []).filter(t => (t.name || '').trim());
  if (tools.length && !off.has('resources'))
    html += `<div class="pdv-section" data-seg="resources"><h3>Potrebné pomôcky / nástroje</h3><ul class="pdv-tools">${tools.map(t => `<li><strong>${escHtml(t.name)}</strong>${t.note ? ` — ${escHtml(t.note)}` : ''}</li>`).join('')}</ul></div>`;

  const prep = (p.prepChecklist || []).filter(x => (x || '').trim());
  if (prep.length && !off.has('procedure'))
    html += `<div class="pdv-section" data-seg="procedure">${sh('Príprava pracoviska a zariadení')}<ul class="pdv-checklist" data-editlist="prPrepChecklist">${prep.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul></div>`;

  if (steps.length && !off.has('procedure')) {
    html += `<div class="pdv-section" data-seg="procedure">${sh('Postup montáže')}<div class="pdv-steps">`;
    let curSection = null, subPrefix = null, subCount = 0, globalNo = 0;
    steps.forEach((s, i) => {
      if ((s.section || '') && s.section !== curSection) {
        curSection = s.section;
        const mm = curSection.match(/^\s*(\d+(?:\.\d+)*)/);
        subPrefix = mm ? mm[1] : null;
        subCount = 0;
        html += `<h4 class="pdv-substep">${escHtml(curSection)}</h4>`;
      }
      let numLabel;
      if (subPrefix) { subCount++; numLabel = subPrefix + '.' + subCount; }
      else { globalNo++; numLabel = String(globalNo); }
      const warns = (s.warnings || []).map(k => wm[k] ? `<span class="pdv-badge pdv-warn"><img class="pdv-picto" src="/assets/pictograms/warn_${k}.png" alt=""> ${escHtml(wm[k].label)}</span>` : '').join('');
      const ppes  = (s.ppe || []).map(k => pm[k] ? `<span class="pdv-badge pdv-ppe"><img class="pdv-picto" src="/assets/pictograms/ppe_${k}.png" alt=""> ${escHtml(pm[k].label)}</span>` : '').join('');
      const pos = s.image ? (s.imagePos || 'below') : 'below';
      const figN = s.image ? ++figCounter.n : 0;
      const imgStyle = s.imgWidth ? ` style="width:${Math.max(15, Math.min(100, s.imgWidth))}%"` : '';
      const imgHtml = s.image
        ? `<figure class="pdv-fig pdv-fig-${pos}"${imgStyle}><div class="pdv-fig-img"><img src="${escHtml(s.image)}" alt="">${renderAnnotationsHtml(s.annotations, false)}</div><figcaption>Obrázok ${figN}${s.caption ? ': ' + escHtml(s.caption) : ''}</figcaption><span class="pdv-resize"></span></figure>`
        : '';
      html += `<div class="pdv-step">
        <div class="pdv-step-num">${numLabel}</div>
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

  const safety = tdata('safety').rows;
  if (safety.length && !off.has('safety'))
    html += `<div class="pdv-section" data-seg="safety">${sh('Bezpečnosť pri práci (BOZP)')}${dtableDyn('safety')}</div>`;

  const risks = (p.risks || []).filter(r => (r || '').trim());
  if (risks.length && !off.has('safety'))
    html += `<div class="pdv-section" data-seg="safety"><h3>Ďalšie riziká / upozornenia</h3><ul class="pdv-risks" data-editlist="prRisks">${risks.map(r => `<li>${escHtml(r)}</li>`).join('')}</ul></div>`;

  const waste = tdata('waste').rows;
  if (waste.length && !off.has('waste'))
    html += `<div class="pdv-section" data-seg="waste">${sh('Nakladanie s odpadmi')}${dtableDyn('waste')}</div>`;

  const maintenance = tdata('maintenance').rows;
  if (maintenance.length && !off.has('waste'))
    html += `<div class="pdv-section" data-seg="waste">${sh('Údržba zariadení a prípravku')}${dtableDyn('maintenance')}</div>`;

  const troubleshooting = tdata('troubleshooting').rows;
  if (troubleshooting.length && !off.has('waste'))
    html += `<div class="pdv-section" data-seg="waste">${sh('Riešenie problémov')}${dtableDyn('troubleshooting')}</div>`;

  const atts = (p.attachments || []).filter(a => (a.label || a.url || '').trim());
  if (atts.length && !off.has('attachments'))
    html += `<div class="pdv-section" data-seg="attachments"><h3>Prílohy / Odkazy</h3><ul class="pdv-atts">${atts.map(a => `<li>${escHtml(a.label || a.url)}${a.label && a.url ? ` <span class="pdv-att-url">${escHtml(a.url)}</span>` : ''}</li>`).join('')}</ul></div>`;

  const changeLog = tdata('changeLog').rows;
  if (changeLog.length && !off.has('changelog'))
    html += `<div class="pdv-section" data-seg="changelog"><h3>História zmien</h3>${dtableDyn('changeLog')}</div>`;

  const v = p.validity || {};
  if (!off.has('validity') && (v.preparedBy || v.approvedBy || v.validFrom || v.nextRevision || v.unit || v.revision || p.author)) {
    const revInfo = procRevisionStatus(p);
    const nextRevCell = v.nextRevision
      ? `${fmtDate(v.nextRevision)}${revInfo ? ` <span class="pdv-rev-flag pdv-rev-${revInfo.level}">${revInfo.label}</span>` : ''}`
      : '<span class="pdv-muted">— (max. 2 roky od vydania)</span>';
    const row = (label, value) => `<tr><th>${label}</th><td>${value || '<span class="pdv-muted">—</span>'}</td></tr>`;
    html += `<div class="pdv-section" data-seg="validity"><h3>Platnosť pracovného postupu</h3>
      <table class="pdv-validity">
        ${row('Vypracoval', escHtml(v.preparedBy || p.author || ''))}
        ${row('Schválil', escHtml(v.approvedBy || ''))}
        ${row('Platnosť od', v.validFrom ? fmtDate(v.validFrom) : '')}
        ${row('Nasledujúca revízia', nextRevCell)}
        ${row('Útvar', escHtml(v.unit || ''))}
        ${row('Revízia / Zmena', escHtml(v.revision || ''))}
      </table></div>`;
  }

  return html;
}

// Stav revízie postupu: vráti {level, label, days} ak má nastavenú nasledujúcu revíziu.
// level: 'over' (po termíne), 'soon' (≤30 dní), 'ok' (viac než 30 dní).
function procRevisionStatus(p) {
  const nr = p && p.validity && p.validity.nextRevision;
  if (!nr) return null;
  const days = Math.ceil((new Date(nr) - new Date()) / 864e5);
  if (days < 0)  return { level: 'over', label: `Revízia po termíne (${-days} dní)`, days };
  if (days <= 30) return { level: 'soon', label: `Revízia o ${days} dní`, days };
  return { level: 'ok', label: `Platí do ${fmtDate(nr)}`, days };
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
        <button class="btn-word" onclick="printProcedurePdf(currentDetailProcedure)">⬇ PDF</button>
        <button class="btn-word" onclick="generateProcedureWord('${p._id}')">⬇ Word</button>
        <button class="btn-edit" onclick="editDetailProcedure()">✎ Upraviť</button>
        <button class="btn-delete" onclick="deleteProcedure('${p._id}')">🗑 Odstrániť</button>
      </div>
    </div>
    <div class="pdv-card proc-detail pp-theme-${p.design || 'sylex'}">${renderProcedureDetailHtml(p)}</div>`;
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
let currentPreviewProc = null;
function openProcedurePreview() {
  currentPreviewProc = collectProcedureForm();
  document.getElementById('procPreviewBody').innerHTML = `<div class="pdv-card proc-detail pp-theme-${currentPreviewProc.design || 'sylex'}">${renderProcedureDetailHtml(currentPreviewProc)}</div>`;
  document.getElementById('procPreviewModal').classList.remove('hidden');
}
function closeProcedurePreview() { document.getElementById('procPreviewModal').classList.add('hidden'); }

// ── Generovanie PDF z náhľadu (cez tlač prehliadača) ──────────────────────────
function buildProcedurePrintDoc(p) {
  const inner = renderProcedureDetailHtml(p);
  const title = escHtml(p.title || 'Pracovný postup');
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="/css/style.css">
<style>
  @page { size: A4; margin: 15mm 13mm 16mm; }
  html, body { background:#fff; margin:0; padding:0; }
  body { font-family: var(--font), Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .proc-detail { padding: 22px; max-width: 900px; margin: 0 auto; }
  .proc-detail .pdv-card { box-shadow:none; border-radius:0; max-width:none; margin:0; }
  .pdv-section, .pdv-step, .pdv-table-wrap, .pdv-validity { break-inside: avoid; }
  .pdv-substep { break-after: avoid; }
  .pp-bar { position: sticky; top:0; z-index:10; display:flex; gap:10px; justify-content:center; padding:12px; background:#1a1a2e; }
  .pp-bar button { background:#97bf0d; color:#1a1a2e; border:0; border-radius:8px; padding:10px 20px; font-weight:800; font-family:inherit; font-size:14px; cursor:pointer; }
  .pp-bar button.sec { background:rgba(255,255,255,.16); color:#fff; }
  @media print {
    .pp-noprint { display:none !important; }
    .proc-detail { padding:0; }
    /* zruš globálne app pravidlo (kalendár), ktoré skrýva body * pri tlači */
    html, body, body * { visibility: visible !important; }
  }
</style></head>
<body>
  <div class="pp-bar pp-noprint">
    <button onclick="window.print()">⬇ Uložiť ako PDF / Tlačiť</button>
    <button class="sec" onclick="window.close()">Zavrieť</button>
  </div>
  <div class="proc-detail pp-theme-${p.design || 'sylex'}"><div class="pdv-card">${inner}</div></div>
  <script>
    window.addEventListener('load', function(){ setTimeout(function(){ try { window.focus(); window.print(); } catch(e){} }, 500); });
  <\/script>
</body></html>`;
}
function printProcedurePdf(p) {
  if (!p) { toast('Najprv otvor náhľad postupu', 'warn'); return; }
  const w = window.open('', '_blank');
  if (!w) { toast('Povoľ vyskakovacie okná pre generovanie PDF', 'warn'); return; }
  w.document.open();
  w.document.write(buildProcedurePrintDoc(p));
  w.document.close();
}

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

// ── Generické tabuľkové sekcie (história zmien, dokumenty, vybavenie, …) ───────
// Každý stĺpec: [kľúč, placeholder, šírka(flex), type]
// Predvolené stĺpce (fallback ak /meta nedobehne)
const PROC_TABLE_FALLBACK = {
  changeLog:   [{ key: 'version', label: 'Verzia', flex: 0.6 }, { key: 'change', label: 'Zmena', flex: 0.6 }, { key: 'date', label: 'Dátum', flex: 1, type: 'date' }, { key: 'reason', label: 'Dôvod zmeny', flex: 2 }, { key: 'author', label: 'Vypracoval', flex: 1.4 }],
  relatedDocs: [{ key: 'document', label: 'Dokument / Norma', flex: 1.6 }, { key: 'description', label: 'Popis', flex: 2 }, { key: 'reference', label: 'Číslo / Odkaz', flex: 1.4 }],
  equipment:   [{ key: 'no', label: 'č.', flex: 0.5 }, { key: 'name', label: 'Názov položky', flex: 1.8 }, { key: 'description', label: 'Popis / P/N', flex: 2 }, { key: 'calibration', label: 'Kalibrácia', flex: 1 }],
  materials:   [{ key: 'no', label: 'č.', flex: 0.5 }, { key: 'name', label: 'Názov', flex: 1.6 }, { key: 'description', label: 'Popis', flex: 1.8 }, { key: 'partNumber', label: 'Sylex PN', flex: 1 }, { key: 'quantity', label: 'Množstvo', flex: 0.9 }],
  safety:      [{ key: 'risk', label: 'Riziko', flex: 1.4 }, { key: 'source', label: 'Zdroj', flex: 2 }, { key: 'measure', label: 'Opatrenie', flex: 2 }],
  waste:       [{ key: 'waste', label: 'Odpad', flex: 1.6 }, { key: 'category', label: 'Kategória', flex: 1.4 }, { key: 'disposal', label: 'Likvidácia', flex: 2 }],
  maintenance: [{ key: 'equipment', label: 'Zariadenie', flex: 1.6 }, { key: 'interval', label: 'Interval', flex: 1 }, { key: 'task', label: 'Úkon', flex: 2.2 }, { key: 'responsible', label: 'Zodpovedný', flex: 1.2 }],
  troubleshooting: [{ key: 'problem', label: 'Problém', flex: 1.6 }, { key: 'cause', label: 'Príčina', flex: 2 }, { key: 'solution', label: 'Riešenie', flex: 2 }],
};
const PROC_TABLE_KEYS = Object.keys(PROC_TABLE_FALLBACK);
let procTableCols = {};   // aktuálne stĺpce v editore: { key: [{key,label,flex,type}] }
function procTableDefaults(key) {
  const d = (PROC_META.tableDefs && PROC_META.tableDefs[key]) || PROC_TABLE_FALLBACK[key] || [];
  return d.map(c => ({ ...c }));
}
// Inicializuje editor tabuľky (hlavička so stĺpcami + riadky)
function initProcTable(key, cols, rows) {
  const c = document.getElementById('pt_' + key);
  if (!c) return;
  const src = (cols && cols.length) ? cols : procTableDefaults(key);
  procTableCols[key] = src.map(x => ({ key: x.key || ('col_' + Math.random().toString(36).slice(2, 7)), label: x.label || '', flex: x.flex || 1, type: x.type }));
  c.innerHTML = '<div class="pt-head"></div><div class="pt-rows"></div>';
  renderProcTableHead(key);
  (rows || []).forEach(r => addProcTableRow(key, r));
}
function renderProcTableHead(key) {
  const head = document.querySelector('#pt_' + key + ' .pt-head');
  if (!head) return;
  const cols = procTableCols[key] || [];
  head.innerHTML = cols.map((col, i) =>
    `<div class="pt-col" style="flex:${col.flex || 1}">` +
      `<input class="pt-collabel" value="${escHtml(col.label || '')}" placeholder="Názov stĺpca" title="Hlavička stĺpca" oninput="procRenameCol('${key}',${i},this.value)">` +
      `<button type="button" class="pt-coldel" title="Odobrať stĺpec" onclick="procDelCol('${key}',${i})">×</button>` +
    `</div>`).join('') +
    `<button type="button" class="pt-coladd" title="Pridať stĺpec" onclick="procAddCol('${key}')">＋</button>`;
}
function addProcTableRow(key, data = {}) {
  const cols = procTableCols[key];
  const rowsC = document.querySelector('#pt_' + key + ' .pt-rows');
  if (!cols || !rowsC) return;
  const row = document.createElement('div');
  row.className = 'proc-row proc-row-multi';
  row.innerHTML = cols.map(col => {
    const v = (col.type === 'date' && data[col.key]) ? String(data[col.key]).slice(0, 10) : (data[col.key] || '');
    return `<input type="${col.type || 'text'}" data-col="${col.key}" style="flex:${col.flex || 1}" placeholder="${escHtml(col.label || '')}" value="${escHtml(v)}">`;
  }).join('') + `<button type="button" class="proc-row-del" onclick="procRemoveRow(this)" title="Odstrániť riadok">✕</button>`;
  rowsC.appendChild(row);
}
function procRenameCol(key, i, label) {
  if (procTableCols[key] && procTableCols[key][i]) procTableCols[key][i].label = label;
  document.querySelectorAll('#pt_' + key + ' .pt-rows .proc-row').forEach(r => {
    const inp = r.children[i]; if (inp && inp.tagName === 'INPUT') inp.placeholder = label;
  });
  scheduleProcLivePreview();
}
function procAddCol(key) {
  if (!procTableCols[key]) return;
  const nk = 'col_' + Math.random().toString(36).slice(2, 8);
  procTableCols[key].push({ key: nk, label: 'Nový stĺpec', flex: 1 });
  renderProcTableHead(key);
  document.querySelectorAll('#pt_' + key + ' .pt-rows .proc-row').forEach(r => {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.setAttribute('data-col', nk); inp.style.flex = '1'; inp.placeholder = 'Nový stĺpec';
    r.insertBefore(inp, r.querySelector('.proc-row-del'));
  });
  scheduleProcLivePreview();
}
function procDelCol(key, i) {
  const cols = procTableCols[key];
  if (!cols || cols.length <= 1) { toast('Tabuľka musí mať aspoň jeden stĺpec', 'warn'); return; }
  cols.splice(i, 1);
  renderProcTableHead(key);
  document.querySelectorAll('#pt_' + key + ' .pt-rows .proc-row').forEach(r => {
    const inp = r.children[i]; if (inp && inp.tagName === 'INPUT') inp.remove();
  });
  scheduleProcLivePreview();
}
function collectProcTable(key) {
  const cols = procTableCols[key] || [];
  return [...document.querySelectorAll('#pt_' + key + ' .pt-rows .proc-row')].map(r => {
    const o = {};
    cols.forEach(col => { o[col.key] = (r.querySelector(`[data-col="${col.key}"]`)?.value || '').trim(); });
    return o;
  }).filter(o => Object.values(o).some(v => v));
}
function collectProcTableColsAll() {
  const out = {};
  PROC_TABLE_KEYS.forEach(k => { if (procTableCols[k]) out[k] = procTableCols[k].map(c => ({ key: c.key, label: c.label, flex: c.flex, type: c.type })); });
  return out;
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
function removeStepImage(btn) { const card = btn.closest('.proc-step-card'); if (card) { card._image = ''; renderStepThumb(card); scheduleProcLivePreview(); } }

async function importStepImage(btn) {
  const card = btn.closest('.proc-step-card');
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    const url = await uploadImage(f);
    if (url) { card._image = url; renderStepThumb(card); scheduleProcLivePreview(); }
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
  card._imgWidth = step.imgWidth || null;
  card._annots   = Array.isArray(step.annotations) ? step.annotations.map(annotNorm) : [];
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
    <input type="text" class="proc-step-subsection" placeholder="Podsekcia (napr. 8.1 Príprava vlákna) — voliteľné" value="${escHtml(step.section || '')}">
    <div class="proc-step-editor" id="${sid}_ed"></div>
    <div class="proc-step-dictrow">
      <button type="button" class="proc-step-mic" onclick="dictForStep(this)" title="Nadiktovať popis operácie hlasom (slovenčina)">
        <span class="proc-step-mic-ico">🎤</span><span class="proc-step-mic-dot"></span>Diktovať operáciu
      </button>
    </div>
    <input type="text" class="proc-step-note" placeholder="Krátka poznámka (voliteľné)" value="${escHtml(step.note || '')}">
    <div class="proc-step-section">
      <div class="proc-mini-label">Obrázok operácie</div>
      <div class="proc-step-img"></div>
      <div class="proc-img-controls">
        <button type="button" class="btn-sm" onclick="importStepImage(this)">🖼 Importovať</button>
        <button type="button" class="btn-sm" onclick="openAnnotEditor(this)" title="Pridať bubliny so šípkami na obrázok">🎯 Anotovať</button>
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
    dropImagesTo(files, (url) => { card._image = url; renderStepThumb(card); scheduleProcLivePreview(); }));
  renderIconPicker(document.getElementById(sid + '_warn'), PROC_META.warnings, card._warnings, document.getElementById(sid + '_warnc'));
  renderIconPicker(document.getElementById(sid + '_ppe'),  PROC_META.ppe,      card._ppe,      document.getElementById(sid + '_ppec'));
  return card;
}

// Načítaj dáta operácie z karty
function stepDataFromCard(card) {
  const ed = stepEditors[card.dataset.sid];
  return {
    section:  card.querySelector('.proc-step-subsection')?.value.trim() || '',
    text:     ed ? ed.getHTML() : '',
    note:     card.querySelector('.proc-step-note').value.trim(),
    image:    card._image || '',
    imagePos: card.querySelector('.proc-img-pos')?.value || 'below',
    imgWidth: card._imgWidth || undefined,
    caption:  card.querySelector('.proc-img-caption')?.value.trim() || '',
    warnings: [...(card._warnings || [])],
    ppe:      [...(card._ppe || [])],
    annotations: (card._annots || []).map(annotNorm)
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
      section:  card.querySelector('.proc-step-subsection')?.value.trim() || '',
      text:     ed ? ed.getHTML() : '',
      note:     card.querySelector('.proc-step-note').value.trim(),
      image:    card._image || '',
      imagePos: card.querySelector('.proc-img-pos')?.value || 'below',
      imgWidth: card._imgWidth || undefined,
      caption:  card.querySelector('.proc-img-caption')?.value.trim() || '',
      warnings: card._warnings || [],
      ppe:      card._ppe || [],
      annotations: (card._annots || []).map(annotNorm)
    };
  }).filter(s => stripHtmlText(s.text) || s.image || s.note || s.section || (s.warnings && s.warnings.length) || (s.ppe && s.ppe.length));
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
  const prepChecklist = document.getElementById('prPrepChecklist').value.split('\n').map(s => s.trim()).filter(Boolean);
  return {
    title:      document.getElementById('prTitle').value.trim(),
    procNumber: document.getElementById('prProcNumber').value.trim(),
    edition:    document.getElementById('prEdition').value.trim(),
    department: document.getElementById('prDepartment').value.trim(),
    author:     document.getElementById('prAuthor').value.trim(),
    owner:      document.getElementById('prOwner').value.trim(),
    date:       document.getElementById('prDate').value || undefined,
    purpose:    document.getElementById('prPurpose').value.trim(),
    scope:      document.getElementById('prScope').value.trim(),
    definitions: document.getElementById('prDefinitions').value.trim(),
    status:     document.querySelector('input[name="prStatus"]:checked')?.value || 'active',
    design:     document.getElementById('prDesign')?.value || 'sylex',
    changeLog:       collectProcTable('changeLog'),
    relatedDocs:     collectProcTable('relatedDocs'),
    equipment:       collectProcTable('equipment'),
    materials:       collectProcTable('materials'),
    prepChecklist,
    safety:          collectProcTable('safety'),
    waste:           collectProcTable('waste'),
    maintenance:     collectProcTable('maintenance'),
    troubleshooting: collectProcTable('troubleshooting'),
    validity: {
      preparedBy:   document.getElementById('prValPreparedBy').value.trim(),
      approvedBy:   document.getElementById('prValApprovedBy').value.trim(),
      validFrom:    document.getElementById('prValValidFrom').value || undefined,
      nextRevision: document.getElementById('prValNextRevision').value || undefined,
      unit:         document.getElementById('prValUnit').value.trim(),
      revision:     document.getElementById('prValRevision').value.trim()
    },
    tools, steps: collectSteps(), risks, attachments,
    disabledSegments: collectDisabledSegments(),
    tableCols: collectProcTableColsAll()
  };
}

// Po zadaní „Platnosť od" navrhne nasledujúcu revíziu o 2 roky (ak nie je vyplnená).
function procSuggestNextRevision() {
  const from = document.getElementById('prValValidFrom').value;
  const next = document.getElementById('prValNextRevision');
  if (!from || next.value) return;
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 2);
  next.value = calYmd(d);
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
  const prDesignEl = document.getElementById('prDesign'); if (prDesignEl) prDesignEl.value = (isEdit && proc.design) || 'sylex';
  document.getElementById('prTitle').value      = isEdit ? (proc.title || '') : '';
  document.getElementById('prProcNumber').value = isEdit ? (proc.procNumber || '') : '';
  document.getElementById('prEdition').value    = isEdit ? (proc.edition || '') : '';
  document.getElementById('prDepartment').value = isEdit ? (proc.department || '') : '';
  document.getElementById('prAuthor').value     = isEdit ? (proc.author || '') : '';
  document.getElementById('prOwner').value      = isEdit ? (proc.owner || '') : '';
  document.getElementById('prDate').value       = isEdit && proc.date ? String(proc.date).slice(0, 10) : calYmd(new Date());
  document.getElementById('prPurpose').value    = isEdit ? (proc.purpose || '') : '';
  document.getElementById('prScope').value      = isEdit ? (proc.scope || '') : '';
  document.getElementById('prDefinitions').value = isEdit ? (proc.definitions || '') : '';
  document.getElementById('prPrepChecklist').value = isEdit ? (proc.prepChecklist || []).join('\n') : '';
  document.getElementById('prRisks').value      = isEdit ? (proc.risks || []).join('\n') : '';
  const statusVal = isEdit ? (proc.status || 'active') : 'active';
  const statusRadio = document.querySelector(`input[name="prStatus"][value="${statusVal}"]`);
  if (statusRadio) statusRadio.checked = true;
  const v = (isEdit && proc.validity) ? proc.validity : {};
  document.getElementById('prValPreparedBy').value   = v.preparedBy || '';
  document.getElementById('prValApprovedBy').value   = v.approvedBy || '';
  document.getElementById('prValValidFrom').value    = v.validFrom ? String(v.validFrom).slice(0, 10) : '';
  document.getElementById('prValNextRevision').value = v.nextRevision ? String(v.nextRevision).slice(0, 10) : '';
  document.getElementById('prValUnit').value         = v.unit || '';
  document.getElementById('prValRevision').value     = v.revision || '';
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
  procTableCols = {};
  PROC_TABLE_KEYS.forEach(k => initProcTable(k, (isEdit && proc.tableCols && proc.tableCols[k]), (isEdit && proc[k]) || []));

  // Obnov stav zapnutia/vypnutia kategórií
  const disSet = new Set((isEdit && proc.disabledSegments) || []);
  document.querySelectorAll('#procEditView .proc-seg').forEach(seg => {
    const on = !disSet.has(seg.dataset.seg);
    seg.classList.toggle('disabled', !on);
    const cb = seg.querySelector('.proc-seg-en');
    if (cb) cb.checked = on;
  });

  // Plnostránkový editor
  document.getElementById('procListView').classList.add('hidden');
  const det = document.getElementById('procDetail');
  if (det) det.classList.add('hidden');
  document.getElementById('procEditView').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'auto' });
  _procActiveSeg = null; _procHlSelector = null;
  const ppl = document.querySelector('.proc-preview-label');
  if (ppl) ppl.textContent = 'ŽIVÝ NÁHĽAD · A4';
  wireProcLivePreview();
  setTimeout(updateProcLivePreview, 80);
}

// ── Živý A4 náhľad vedľa editora ──────────────────────────────────────────────
let _procPrevTimer = null, _procPrevWired = false;
function fitProcA4Preview() {
  const pane = document.querySelector('.proc-edit-preview');
  const paper = document.getElementById('procLivePreview');
  if (!pane || !paper || pane.offsetParent === null) return;
  const avail = pane.clientWidth - 32;
  paper.style.zoom = Math.max(0.3, Math.min(1, avail / 794));
}
function updateProcLivePreview() {
  if (_procInlineEditing) return;   // počas inline úprav neprekresľuj (nezahodí kurzor)
  const el = document.getElementById('procLivePreview');
  if (!el || el.offsetParent === null) return;
  const design = document.getElementById('prDesign')?.value || 'sylex';
  el.className = 'proc-detail pdv-card pp-a4 pp-theme-' + design;
  try { el.innerHTML = renderProcedureDetailHtml(collectProcedureForm()); } catch (e) {}
  fitProcA4Preview();
  makePreviewInteractive();   // najprv priraď data-sid operáciám…
  applyPreviewHighlight();    // …potom vie highlight nájsť konkrétny objekt
}
// Zmena dizajnu → premietni do náhľadu
function onProcDesignChange() { updateProcLivePreview(); }

// Karty operácií, ktoré sa reálne renderujú do náhľadu (rovnaký filter ako render)
function activeStepCards() {
  return [...document.querySelectorAll('#prStepsRows .proc-step-card')].filter(card => {
    const ed = stepEditors[card.dataset.sid];
    const text = ed ? ed.getHTML() : '';
    const note = (card.querySelector('.proc-step-note')?.value || '').trim();
    return stripHtmlText(text) || card._image || note || (card._warnings && card._warnings.length) || (card._ppe && card._ppe.length);
  });
}

// Sprístupní náhľad na priame úpravy (text, poradie, obrázky)
function makePreviewInteractive() {
  const paper = document.getElementById('procLivePreview');
  if (!paper) return;
  const editFlag = (el) => {
    el.addEventListener('focus', () => { _procInlineEditing = true; });
    el.addEventListener('focusin', () => { _procInlineEditing = true; });
    el.addEventListener('blur',  () => { _procInlineEditing = false; });
  };

  // 1) jednoduché textové polia
  paper.querySelectorAll('[data-edit]').forEach(el => {
    if (el.dataset.wired) return; el.dataset.wired = '1';
    el.setAttribute('contenteditable', 'true'); el.classList.add('pdv-editable');
    editFlag(el);
    el.addEventListener('input', () => {
      const f = document.getElementById(el.dataset.edit);
      if (f) f.value = el.innerText.replace(/\u00a0/g, ' ').trim();
    });
  });
  // editovateľné zoznamy (kontrolný zoznam, riziká)
  paper.querySelectorAll('[data-editlist]').forEach(ul => {
    if (ul.dataset.wired) return; ul.dataset.wired = '1';
    ul.classList.add('pdv-editable');
    ul.querySelectorAll('li').forEach(li => li.setAttribute('contenteditable', 'true'));
    editFlag(ul);
    ul.addEventListener('input', () => {
      const f = document.getElementById(ul.dataset.editlist);
      if (f) f.value = [...ul.querySelectorAll('li')].map(li => li.innerText.trim()).filter(Boolean).join('\n');
    });
  });

  // 2) operácie — text, poznámka, obrázok, drag (mapovanie na karty cez sid)
  const cards = activeStepCards();
  const steps = [...paper.querySelectorAll('.pdv-step')];
  steps.forEach((stepEl, i) => {
    const card = cards[i]; if (!card) return;
    const sid = card.dataset.sid; stepEl.dataset.sid = sid;

    // Klik na operáciu v náhľade → sfokusuj a odscroluj príslušnú kartu v editore vľavo
    if (!stepEl.dataset.linkwired) {
      stepEl.dataset.linkwired = '1';
      stepEl.addEventListener('mousedown', () => focusEditorCard(card));
    }

    const tx = stepEl.querySelector('.pdv-step-text');
    if (tx && !tx.dataset.wired) {
      tx.dataset.wired = '1'; tx.setAttribute('contenteditable', 'true'); tx.classList.add('pdv-editable');
      editFlag(tx);
      tx.addEventListener('blur', () => {
        _procInlineEditing = false;
        const ed = stepEditors[sid];
        if (ed && ed.setHTML) { try { ed.setHTML(tx.innerHTML); } catch (e) {} }
        else { const ta = card.querySelector('.proc-step-editor textarea'); if (ta) ta.value = tx.innerText; }
      });
    }
    const nt = stepEl.querySelector('.pdv-step-note');
    if (nt && !nt.dataset.wired) {
      nt.dataset.wired = '1'; nt.setAttribute('contenteditable', 'true'); nt.classList.add('pdv-editable');
      editFlag(nt);
      nt.addEventListener('input', () => {
        const inp = card.querySelector('.proc-step-note');
        if (inp) inp.value = nt.innerText.replace(/^\s*📝\s*/, '').trim();
      });
    }
    const fig = stepEl.querySelector('.pdv-fig');
    if (fig && !fig.dataset.wired) {
      fig.dataset.wired = '1'; fig.classList.add('pdv-img-edit');
      fig.title = 'Klik: zmena pozície (pod textom → vpravo → vľavo) · roh: zmena veľkosti';
      fig.addEventListener('click', (e) => { if (e.target.closest('.pdv-resize')) return; cycleStepImagePos(card); });
      addImgResize(fig, card);
    }
  });

  setupStepDrag(paper);
}

// Zvýrazni a odscroluj kartu operácie v editore (prepojenie náhľad → editor)
let _cardFocusTimer = null;
function focusEditorCard(card) {
  if (!card) return;
  document.querySelectorAll('#prStepsRows .proc-step-card.card-focus').forEach(c => c.classList.remove('card-focus'));
  card.classList.add('card-focus');
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  clearTimeout(_cardFocusTimer);
  _cardFocusTimer = setTimeout(() => card.classList.remove('card-focus'), 2000);
}

function cycleStepImagePos(card) {
  const sel = card.querySelector('.proc-img-pos'); if (!sel) return;
  const order = ['below', 'right', 'left'];
  sel.value = order[(order.indexOf(sel.value || 'below') + 1) % order.length];
  updateProcLivePreview();
}

function addImgResize(fig, card) {
  const handle = fig.querySelector('.pdv-resize');
  if (!handle || handle.dataset.wired) return; handle.dataset.wired = '1';
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    const body = fig.closest('.pdv-step-body') || fig.parentElement;
    const bodyW = body.getBoundingClientRect().width;
    const startX = e.clientX, startW = fig.getBoundingClientRect().width;
    _procInlineEditing = true;
    const onMove = (ev) => {
      let pct = Math.round(((startW + (ev.clientX - startX)) / bodyW) * 100);
      pct = Math.max(15, Math.min(100, pct));
      fig.style.width = pct + '%'; card._imgWidth = pct;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
      _procInlineEditing = false; updateProcLivePreview();
    };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  });
}

// Drag-reorder operácií v náhľade (úchyt ⠿), zmení poradie kariet vo formulári
function setupStepDrag(paper) {
  let dragSid = null;
  paper.querySelectorAll('.pdv-step').forEach(stepEl => {
    let h = stepEl.querySelector('.pdv-drag');
    if (!h) {
      h = document.createElement('span');
      h.className = 'pdv-drag'; h.textContent = '⠿'; h.title = 'Ťahaj pre zmenu poradia';
      h.setAttribute('draggable', 'true');
      stepEl.insertBefore(h, stepEl.firstChild);
    }
    if (!h.dataset.wired) {
      h.dataset.wired = '1';
      h.addEventListener('dragstart', (e) => { dragSid = stepEl.dataset.sid; stepEl.classList.add('pdv-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragSid); } catch (_) {} });
      h.addEventListener('dragend', () => { stepEl.classList.remove('pdv-dragging'); paper.querySelectorAll('.pdv-step').forEach(s => s.classList.remove('pdv-drop-before', 'pdv-drop-after')); dragSid = null; });
    }
    if (!stepEl.dataset.dropWired) {
      stepEl.dataset.dropWired = '1';
      stepEl.addEventListener('dragover', (e) => {
        if (!dragSid) return; e.preventDefault();
        const r = stepEl.getBoundingClientRect();
        const after = (e.clientY - r.top) > r.height / 2;
        stepEl.classList.toggle('pdv-drop-after', after);
        stepEl.classList.toggle('pdv-drop-before', !after);
      });
      stepEl.addEventListener('dragleave', () => stepEl.classList.remove('pdv-drop-before', 'pdv-drop-after'));
      stepEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const dstSid = stepEl.dataset.sid, after = stepEl.classList.contains('pdv-drop-after');
        stepEl.classList.remove('pdv-drop-before', 'pdv-drop-after');
        if (dragSid && dragSid !== dstSid) {
          const cont = document.getElementById('prStepsRows');
          const src = cont.querySelector('.proc-step-card[data-sid="' + dragSid + '"]');
          const dst = cont.querySelector('.proc-step-card[data-sid="' + dstSid + '"]');
          if (src && dst) { dst.insertAdjacentElement(after ? 'afterend' : 'beforebegin', src); updateProcLivePreview(); }
        }
        dragSid = null;
      });
    }
  });
}
function scheduleProcLivePreview() { clearTimeout(_procPrevTimer); _procPrevTimer = setTimeout(updateProcLivePreview, 250); }

// ── Prepojenie editor ↔ náhľad: zameranie konkrétneho objektu ──
let _procActiveSeg = null, _procSyncSuspend = false, _procInlineEditing = false, _procHlSelector = null;
function applyPreviewHighlight() {
  const paper = document.getElementById('procLivePreview');
  if (!paper) return null;
  paper.querySelectorAll('.pdv-hl').forEach(e => e.classList.remove('pdv-hl'));
  if (!_procHlSelector) return null;
  let els;
  try { els = [...paper.querySelectorAll(_procHlSelector)]; } catch (e) { els = []; }
  els.forEach(e => e.classList.add('pdv-hl'));   // zvýrazni presne vybraný objekt (sekcia / operácia / riadok / tabuľka)
  return els[0] || null;
}
// Zameria v náhľade konkrétny objekt podľa práve klikaného poľa v editore
function focusPreviewFromForm(el) {
  const seg = el.closest('.proc-seg');
  if (!seg || seg.classList.contains('disabled')) return;
  const paper = document.getElementById('procLivePreview');
  let selector = '[data-seg="' + seg.dataset.seg + '"]';   // fallback: celá kategória
  const card = el.closest('.proc-step-card');
  const trow = el.closest('.proc-row-multi');
  const fid = el.id || el.closest('[id]')?.id || '';
  const has = (sel) => paper && paper.querySelector(sel);
  if (card && has('.pdv-step[data-sid="' + card.dataset.sid + '"]')) {
    selector = '.pdv-step[data-sid="' + card.dataset.sid + '"]';            // konkrétna operácia
  } else if (trow && trow.closest('[id^="pt_"]')) {
    const cont = trow.closest('[id^="pt_"]');
    const key = cont.id.slice(3);
    const rows = [...cont.querySelectorAll('.pt-rows .proc-row')];
    const nonEmpty = rows.filter(r => [...r.querySelectorAll('[data-col]')].some(i => i.value.trim()));
    const idx = nonEmpty.indexOf(trow);
    if (idx >= 0 && has('[data-tbl="' + key + '"] tbody tr:nth-child(' + (idx + 1) + ')'))
      selector = '[data-tbl="' + key + '"] tbody tr:nth-child(' + (idx + 1) + ')';   // konkrétny riadok
    else if (has('[data-tbl="' + key + '"]'))
      selector = '[data-tbl="' + key + '"]';                                          // celá tabuľka (prázdny riadok)
  } else if (el.closest('.pt-head') && el.closest('[id^="pt_"]') && has('[data-tbl="' + el.closest('[id^="pt_"]').id.slice(3) + '"]')) {
    selector = '[data-tbl="' + el.closest('[id^="pt_"]').id.slice(3) + '"]';          // editácia hlavičky → celá tabuľka
  } else if (fid && has('[data-edit="' + fid + '"], [data-editlist="' + fid + '"]')) {
    selector = '[data-edit="' + fid + '"], [data-editlist="' + fid + '"]';            // konkrétne textové pole
  } else if (el.closest('#prToolsRows') && has('.pdv-tools')) {
    selector = '.pdv-tools';
  }
  _procActiveSeg = seg.dataset.seg;
  _procHlSelector = selector;
  const lbl = document.querySelector('.proc-preview-label');
  const segTitle = seg.querySelector('.proc-seg-title')?.textContent || '';
  if (lbl) lbl.innerHTML = 'ŽIVÝ NÁHĽAD · A4' + (segTitle ? ' &nbsp;·&nbsp; <span class="ppl-cat">' + escHtml(segTitle) + '</span>' : '');
  const target = applyPreviewHighlight();
  const pane = document.querySelector('.proc-edit-preview');
  if (pane && target && pane.offsetParent !== null) {
    const tr = target.getBoundingClientRect(), pr = pane.getBoundingClientRect();
    if (tr.top < pr.top + 8 || tr.bottom > pr.bottom - 8) {
      pane.scrollTo({ top: Math.max(0, pane.scrollTop + (tr.top - pr.top) - 18), behavior: 'smooth' });
    }
  }
}

// Rozbalenie / zbalenie segmentu (kategórie)
function toggleProcSeg(el) { el.closest('.proc-seg')?.classList.toggle('collapsed'); }
// Zapnutie / vypnutie kategórie (vynechanie z postupu + prečíslovanie)
function toggleProcSegEnabled(cb) {
  const seg = cb.closest('.proc-seg');
  if (!seg) return;
  seg.classList.toggle('disabled', !cb.checked);
  if (!cb.checked) seg.classList.remove('collapsed');
  updateProcLivePreview();
}
// Zoznam vypnutých kategórií
function collectDisabledSegments() {
  return [...document.querySelectorAll('#procEditView .proc-seg.disabled')].map(s => s.dataset.seg).filter(Boolean);
}
function wireProcLivePreview() {
  if (_procPrevWired) return;
  const root = document.getElementById('procEditView');
  if (!root) return;
  root.addEventListener('input', scheduleProcLivePreview);
  root.addEventListener('change', scheduleProcLivePreview);
  root.addEventListener('click', (e) => { if (e.target.closest('button, .proc-icon-btn')) scheduleProcLivePreview(); });
  window.addEventListener('resize', fitProcA4Preview);

  // Klik / zameranie poľa → zameraj konkrétny objekt v náhľade (operácia, pole, tabuľka)
  const segOf = (e) => focusPreviewFromForm(e.target);
  root.addEventListener('focusin', segOf);
  root.addEventListener('click', segOf);
  // (žiadny priebežný synchronizovaný scroll — náhľad sa posunie len pri kliku na pole)
  _procPrevWired = true;
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
//  HLASOVÝ DIKTÁT (Speech-to-text SK) — nahrávanie zvuku + živý prepis slovenčiny
//  Prepis: Web Speech API (sk-SK, beží v prehliadači). Zvuk: MediaRecorder.
//  Výsledný text sa vloží do naposledy zameraného poľa editora postupu,
//  nahrávku je možné priložiť k postupu ako prílohu.
// ══════════════════════════════════════════════════════════════════════════════
let _dictLastField = null;   // naposledy zamerané editovateľné pole v editore postupu
let dictRec = null;          // SpeechRecognition inštancia
let dictMedia = null;        // MediaRecorder
let dictStream = null;       // mic stream
let dictChunks = [];         // audio chunky
let dictBlob = null;         // hotová nahrávka
let dictUrl = null;          // object URL nahrávky
let dictFinal = '';          // akumulovaný finálny prepis
let dictRunning = false;     // beží nahrávanie?
let dictWantStop = false;    // úmyselné zastavenie (nereštartovať rozpoznávanie)

// Sleduj naposledy zamerané textové pole v editore postupu (mimo panela diktátu)
function _dictIsEditable(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const t = el.tagName;
  if (t === 'TEXTAREA') return true;
  if (t === 'INPUT') { const ty = (el.getAttribute('type') || 'text').toLowerCase(); return ['text', 'search', 'url', 'tel', ''].includes(ty); }
  return false;
}
document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (!el || el.closest('#dictPanel')) return;
  if (_dictIsEditable(el) && el.closest('#procEditView')) _dictLastField = el;
});

function dictSpeechCtor() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

function openDictation() {
  dictFinal = '';
  document.getElementById('dictText').value = '';
  document.getElementById('dictInterim').textContent = '';
  dictRenderAudio();
  dictSetUi(false);
  dictShowTarget();
  if (!dictSpeechCtor()) dictStatus('Rozpoznávanie reči podporuje Chrome/Edge. Zvuk sa nahrá vždy, text môžeš napísať ručne.', 'warn');
  else dictStatus('Klikni na 🎙 Štart a hovor po slovensky.', '');
  document.getElementById('dictPanel').classList.remove('hidden');
}
function closeDictation() {
  if (dictRunning) dictStop();
  document.getElementById('dictPanel').classList.add('hidden');
}

// Diktovanie priamo pre konkrétnu operáciu (tlačidlo 🎤 pri texte operácie)
function dictForStep(btn) {
  const card = btn.closest('.proc-step-card'); if (!card) return;
  const ed = card.querySelector('.proc-step-editor .ProseMirror')
          || card.querySelector('.proc-step-editor [contenteditable]')
          || card.querySelector('.proc-step-editor textarea');
  if (ed) { try { ed.focus(); } catch (_) {} _dictLastField = ed; }
  openDictation();
}

function dictShowTarget() {
  const el = document.getElementById('dictTarget'); if (!el) return;
  const f = _dictLastField;
  if (f && document.body.contains(f)) {
    let name = 'pole';
    const card = f.closest('.proc-step-card');
    if (card) name = 'operácia' + (f.classList.contains('proc-step-note') ? ' — poznámka' : (f.classList.contains('proc-step-subsection') ? ' — podsekcia' : ''));
    else {
      const lbl = f.closest('.form-group')?.querySelector('label');
      if (lbl) name = lbl.textContent.replace('*', '').trim();
      else if (f.placeholder) name = f.placeholder.slice(0, 40);
    }
    el.innerHTML = `Text sa vloží do: <strong>${escHtml(name)}</strong>`;
    el.classList.remove('dict-target-none');
  } else {
    el.innerHTML = '⚠ Klikni najprv do poľa v postupe, kam sa má text vložiť (potom sem).';
    el.classList.add('dict-target-none');
  }
}

async function dictToggle() { if (dictRunning) dictStop(); else await dictStart(); }

async function dictStart() {
  // 1) mikrofón + nahrávanie zvuku
  try { dictStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { dictStatus('Prístup k mikrofónu bol zamietnutý.', 'error'); return; }
  dictChunks = []; dictBlob = null;
  if (dictUrl) { URL.revokeObjectURL(dictUrl); dictUrl = null; }
  try {
    dictMedia = new MediaRecorder(dictStream);
    dictMedia.ondataavailable = ev => { if (ev.data && ev.data.size) dictChunks.push(ev.data); };
    dictMedia.onstop = () => {
      if (dictChunks.length) { dictBlob = new Blob(dictChunks, { type: dictChunks[0].type || 'audio/webm' }); dictUrl = URL.createObjectURL(dictBlob); }
      dictRenderAudio();
    };
    dictMedia.start();
  } catch { /* nahrávanie zvuku je voliteľné */ }

  // 2) rozpoznávanie reči (sk-SK)
  const SR = dictSpeechCtor();
  if (SR) {
    dictRec = new SR();
    dictRec.lang = 'sk-SK'; dictRec.continuous = true; dictRec.interimResults = true;
    dictRec.onresult = dictOnResult;
    dictRec.onerror = ev => { if (ev.error === 'no-speech' || ev.error === 'aborted') return; dictStatus('Rozpoznávanie: ' + ev.error, 'error'); };
    dictRec.onend = () => { if (dictRunning && !dictWantStop) { try { dictRec.start(); } catch (_) {} } };  // udrž beh
    try { dictRec.start(); } catch (_) {}
  }
  dictRunning = true; dictWantStop = false;
  dictSetUi(true);
  dictStatus(SR ? '● Nahrávam… hovor po slovensky.' : '● Nahrávam zvuk (bez automatického prepisu).', 'rec');
}

function dictStop() {
  dictWantStop = true; dictRunning = false;
  try { dictRec && dictRec.stop(); } catch (_) {}
  try { if (dictMedia && dictMedia.state !== 'inactive') dictMedia.stop(); } catch (_) {}
  try { dictStream && dictStream.getTracks().forEach(t => t.stop()); } catch (_) {}
  dictSetUi(false);
  dictStatus('Zastavené. Text uprav a vlož do poľa; nahrávku môžeš priložiť.', 'ok');
}

function dictOnResult(ev) {
  let interim = '';
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const r = ev.results[i];
    if (r.isFinal) dictFinal += (dictFinal && !/\s$/.test(dictFinal) ? ' ' : '') + r[0].transcript.trim();
    else interim += r[0].transcript;
  }
  const ta = document.getElementById('dictText');
  if (ta) { ta.value = dictFinal; ta.scrollTop = ta.scrollHeight; }
  const iv = document.getElementById('dictInterim');
  if (iv) iv.textContent = interim ? '… ' + interim : '';
}
function dictOnEdit() { dictFinal = document.getElementById('dictText').value; }

function dictRenderAudio() {
  const el = document.getElementById('dictAudio'); if (!el) return;
  if (!dictUrl) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="dict-audio-row">
      <audio controls src="${dictUrl}" class="dict-player"></audio>
      <button class="btn-secondary btn-sm" onclick="dictDownload()">⬇ Stiahnuť</button>
      <button class="btn-primary btn-sm" onclick="dictAttach(this)">📎 Priložiť k postupu</button>
    </div>`;
}

function dictExt() {
  const t = (dictBlob && dictBlob.type) || '';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('mp4') || t.includes('m4a')) return 'm4a';
  if (t.includes('wav')) return 'wav';
  return 'webm';
}
function dictDownload() {
  if (!dictUrl) return;
  const a = document.createElement('a');
  a.href = dictUrl; a.download = 'diktat-' + Date.now() + '.' + dictExt();
  document.body.appendChild(a); a.click(); a.remove();
}

async function dictAttach(btn) {
  if (!dictBlob) { toast('Žiadna nahrávka na priloženie.', 'warn'); return; }
  const fd = new FormData();
  fd.append('audio', dictBlob, 'diktat-' + Date.now() + '.' + dictExt());
  if (btn) { btn.disabled = true; btn.textContent = 'Nahrávam…'; }
  try {
    const r = await fetch('/api/upload/audio', { method: 'POST', body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast('Chyba nahrávania: ' + (d.error || r.status), 'error'); return; }
    // Zapni segment Prílohy, ak bol vypnutý, a pridaj riadok
    const seg = document.querySelector('#procEditView .proc-seg[data-seg="attachments"]');
    if (seg && seg.classList.contains('disabled')) { const cb = seg.querySelector('.proc-seg-en'); if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); } }
    addAttachmentRow({ label: 'Hlasová nahrávka (' + new Date().toLocaleString('sk-SK') + ')', url: d.url });
    scheduleProcLivePreview();
    toast('Nahrávka priložená k postupu — nezabudni Uložiť.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '📎 Priložiť k postupu'; } }
}

// Vlož prepísaný text do naposledy zameraného poľa
function dictInsertText(text) {
  const el = _dictLastField;
  if (!el || !document.body.contains(el)) { toast('Klikni najprv do poľa v postupe (Zavrieť → klik do poľa → Diktovať).', 'warn'); return false; }
  el.focus();
  if (el.isContentEditable) {
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) {}
    if (!ok) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) { const rng = sel.getRangeAt(0); rng.deleteContents(); rng.insertNode(document.createTextNode(text)); sel.collapseToEnd(); }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? el.value.length;
    const pre = el.value.slice(0, s), post = el.value.slice(e);
    const glue = pre && !/\s$/.test(pre) ? ' ' : '';
    el.value = pre + glue + text + post;
    const pos = (pre + glue + text).length; try { el.setSelectionRange(pos, pos); } catch (_) {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return true;
}
function dictInsert() {
  const t = document.getElementById('dictText').value.trim();
  if (!t) { toast('Žiadny text na vloženie.', 'warn'); return; }
  if (dictInsertText(t)) { toast('Text vložený do poľa.', 'success'); scheduleProcLivePreview(); }
}
function dictCopy() {
  const t = document.getElementById('dictText').value;
  if (!t) { toast('Žiadny text.', 'warn'); return; }
  navigator.clipboard?.writeText(t).then(() => toast('Skopírované.', 'success'), () => toast('Nepodarilo sa skopírovať.', 'error'));
}
function dictClear() { dictFinal = ''; document.getElementById('dictText').value = ''; document.getElementById('dictInterim').textContent = ''; }

function dictSetUi(recording) {
  const btn = document.getElementById('dictRecBtn'); const lbl = document.getElementById('dictRecLbl');
  if (btn) btn.classList.toggle('recording', !!recording);
  if (lbl) lbl.textContent = recording ? '■ Zastaviť' : '🎙 Štart nahrávania';
}
function dictStatus(msg, type) {
  const el = document.getElementById('dictStatus'); if (!el) return;
  el.textContent = msg || '';
  el.className = 'dict-status' + (type ? ' dict-status-' + type : '');
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
  if (tab === 'users') { loadUsers(); loadMailStatus(); }
  if (tab === 'appearance') renderAppearanceAdmin();
  if (tab === 'modules') renderModulesAdmin();
  if (tab === 'projcfg') loadPjConfigAdmin();
}

// ── Admin: konfigurácia workflow procesov a štandardných výstupov ──
let _pjCfgWork = null;
function pjSlug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || ('k' + Math.random().toString(36).slice(2, 7));
}
function pjCfgFromLive() {
  return {
    workflows: {
      sales: { label: PJ_WORKFLOWS.sales.label, stages: PJ_WORKFLOWS.sales.stages.map(s => ({ key: s.key, label: s.label })) },
      development: { label: PJ_WORKFLOWS.development.label, stages: PJ_WORKFLOWS.development.stages.map(s => ({ key: s.key, label: s.label })) }
    },
    deliverables: PJ_DELIVERABLES.map(d => ({ key: d.key, label: d.label, short: d.short || '' }))
  };
}
async function loadPjConfigAdmin() {
  await ensureProjectConfig();
  _pjCfgWork = pjCfgFromLive();
  renderPjCfgEditor();
}
function renderPjCfgEditor() {
  const el = document.getElementById('pjCfgEditor'); if (!el || !_pjCfgWork) return;
  const w = _pjCfgWork;
  const stageRows = wf => w.workflows[wf].stages.map((s, i) => `
    <div class="pjcfg-row"><span class="pjcfg-num">${i + 1}.</span>
      <input type="text" value="${escHtml(s.label)}" oninput="_pjCfgWork.workflows['${wf}'].stages[${i}].label=this.value">
      <button class="btn-delete btn-sm" title="Odstrániť" onclick="pjCfgDelStage('${wf}',${i})">✕</button></div>`).join('');
  const delivRows = w.deliverables.map((d, i) => `
    <div class="pjcfg-row">
      <input type="text" placeholder="Názov" value="${escHtml(d.label)}" oninput="_pjCfgWork.deliverables[${i}].label=this.value">
      <input type="text" class="pjcfg-short" placeholder="Skratka" value="${escHtml(d.short || '')}" oninput="_pjCfgWork.deliverables[${i}].short=this.value">
      <button class="btn-delete btn-sm" title="Odstrániť" onclick="pjCfgDelDeliv(${i})">✕</button></div>`).join('');
  el.innerHTML = `<div class="pjcfg-grid">
    <div class="pjcfg-col pjcfg-col-sales"><h3>💼 Predajný proces</h3>
      <label class="pjcfg-lbl">Názov procesu</label><input type="text" value="${escHtml(w.workflows.sales.label)}" oninput="_pjCfgWork.workflows.sales.label=this.value">
      <label class="pjcfg-lbl">Stupne</label>${stageRows('sales')}
      <button class="btn-secondary btn-sm pjcfg-add" onclick="pjCfgAddStage('sales')">+ Pridať stupeň</button></div>
    <div class="pjcfg-col pjcfg-col-dev"><h3>🛠 Vývojový proces</h3>
      <label class="pjcfg-lbl">Názov procesu</label><input type="text" value="${escHtml(w.workflows.development.label)}" oninput="_pjCfgWork.workflows.development.label=this.value">
      <label class="pjcfg-lbl">Stupne</label>${stageRows('development')}
      <button class="btn-secondary btn-sm pjcfg-add" onclick="pjCfgAddStage('development')">+ Pridať stupeň</button></div>
    <div class="pjcfg-col pjcfg-col-deliv"><h3>📦 Štandardné výstupy</h3>
      <label class="pjcfg-lbl">Názov · skratka (zobrazenie v chevrone)</label>${delivRows}
      <button class="btn-secondary btn-sm pjcfg-add" onclick="pjCfgAddDeliv()">+ Pridať výstup</button></div>
  </div>`;
}
function pjCfgAddStage(wf) { _pjCfgWork.workflows[wf].stages.push({ key: '', label: 'Nový stupeň' }); renderPjCfgEditor(); }
function pjCfgDelStage(wf, i) { _pjCfgWork.workflows[wf].stages.splice(i, 1); renderPjCfgEditor(); }
function pjCfgAddDeliv() { _pjCfgWork.deliverables.push({ key: '', label: 'Nový výstup', short: '' }); renderPjCfgEditor(); }
function pjCfgDelDeliv(i) { _pjCfgWork.deliverables.splice(i, 1); renderPjCfgEditor(); }
async function savePjConfig() {
  const w = _pjCfgWork; if (!w) return;
  const assign = items => { const seen = new Set(); items.forEach(it => { let k = it.key || pjSlug(it.label); while (seen.has(k)) k += '_'; it.key = k; seen.add(k); }); };
  ['sales', 'development'].forEach(wf => { w.workflows[wf].stages = w.workflows[wf].stages.filter(s => (s.label || '').trim()); assign(w.workflows[wf].stages); });
  w.deliverables = w.deliverables.filter(d => (d.label || '').trim()); assign(w.deliverables);
  if (!w.workflows.sales.stages.length || !w.workflows.development.stages.length) { toast('Každý proces musí mať aspoň jeden stupeň.', 'warn'); return; }
  try {
    const r = await fetch('/api/projects/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); toast('Chyba: ' + (e.error || r.status), 'error'); return; }
    pjApplyConfig(w); renderPjCfgEditor(); toast('Konfigurácia uložená.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
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
// Každá položka nesie "key" (typ:id:relevantná-hodnota) — potvrdenie (dismiss) sa
// pamätá per-user na serveri; ak sa relevantná hodnota zmení (napr. nový termín),
// key sa zmení a notifikácia sa objaví znova.
let notifData = { newAnns: [], todayEvs: [], calDue: [], tasksDue: [], procRevDue: [], gpnAttention: [] };
let notifDismissed = new Set();
async function loadNotif() {
  try {
    const key = calYmd(new Date());
    const [anns, evs, instr, tasks, procs, gpn, dismissed] = await Promise.all([
      fetch('/api/announcements').then(r => r.json()).catch(() => []),
      fetch(`/api/calendar?from=${key}&to=${key}`).then(r => r.json()).catch(() => []),
      fetch('/api/instruments').then(r => r.json()).catch(() => []),
      fetch('/api/tasks').then(r => r.json()).catch(() => []),
      fetch('/api/procedures').then(r => r.json()).catch(() => []),
      fetch('/api/gpn').then(r => r.json()).catch(() => []),
      fetch('/api/notifications/dismissed').then(r => r.json()).catch(() => ({ keys: [] })),
    ]);
    notifDismissed = new Set((dismissed && dismissed.keys) || []);
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const newAnns = (Array.isArray(anns) ? anns : []).filter(a => new Date(a.date || a.createdAt) >= weekAgo)
      .map(a => ({ item: a, key: 'ann:' + a._id }));
    const todayEvs = (Array.isArray(evs) ? evs : []).map(ev => ({ item: ev, key: 'cal:' + ev._id + ':' + key }));
    // Kalibrácie po termíne alebo do 30 dní
    const calDue = (Array.isArray(instr) ? instr : []).filter(i => {
      if (!i.nextCalibration) return false;
      const days = Math.ceil((new Date(i.nextCalibration) - new Date()) / 864e5);
      return days <= 30;
    }).map(i => ({ item: i, key: 'instr:' + i._id + ':' + i.nextCalibration }));
    // Nedokončené úlohy po termíne / dnes
    const todayEnd = new Date(new Date().toDateString()); todayEnd.setHours(23, 59, 59);
    const tasksDue = (Array.isArray(tasks) ? tasks : []).filter(t => !t.done && t.due && new Date(t.due) <= todayEnd)
      .map(t => ({ item: t, key: 'task:' + t._id + ':' + t.due }));
    // Pracovné postupy s nasledujúcou revíziou po termíne alebo do 30 dní (okrem archivovaných)
    const procRevDue = (Array.isArray(procs) ? procs : []).filter(p => {
      if (p.status === 'archived') return false;
      const nr = p.validity && p.validity.nextRevision;
      if (!nr) return false;
      return Math.ceil((new Date(nr) - new Date()) / 864e5) <= 30;
    }).map(p => ({ item: p, key: 'proc:' + p._id + ':' + p.validity.nextRevision }));
    // GPN požiadavky vyžadujúce pozornosť: nové/na kontrolu + čakajúce na doplnenie
    const gpnAll = Array.isArray(gpn) ? gpn : [];
    const gpnAttention = gpnAll.filter(t => ['new', 'waiting_review', 'waiting_info'].includes(t.status))
      .map(t => ({ item: t, key: 'gpn:' + t._id + ':' + t.status }));

    const undismissed = (arr) => arr.filter(x => !notifDismissed.has(x.key));
    notifData = {
      newAnns: undismissed(newAnns), todayEvs: undismissed(todayEvs), calDue: undismissed(calDue),
      tasksDue: undismissed(tasksDue), procRevDue: undismissed(procRevDue), gpnAttention: undismissed(gpnAttention)
    };
    updateNotifBadge();
  } catch (e) {}
}
function updateNotifBadge() {
  const count = Object.values(notifData).reduce((s, arr) => s + (arr ? arr.length : 0), 0);
  const b = document.getElementById('notifBadge');
  if (b) { b.textContent = count > 9 ? '9+' : count; b.classList.toggle('hidden', count === 0); }
}
// Potvrdí (skryje) jednu notifikáciu — zapamätá sa per-user na serveri
async function dismissNotifItem(itemKey, evt) {
  if (evt) evt.stopPropagation();
  notifDismissed.add(itemKey);
  Object.keys(notifData).forEach(k => { notifData[k] = notifData[k].filter(x => x.key !== itemKey); });
  renderNotif();
  updateNotifBadge();
  try { await fetch('/api/notifications/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: [itemKey] }) }); } catch {}
}
// Potvrdí všetky aktuálne zobrazené notifikácie naraz
async function dismissAllNotif() {
  const keys = Object.values(notifData).flat().map(x => x.key);
  if (!keys.length) return;
  keys.forEach(k => notifDismissed.add(k));
  notifData = { newAnns: [], todayEvs: [], calDue: [], tasksDue: [], procRevDue: [], gpnAttention: [] };
  renderNotif();
  updateNotifBadge();
  try { await fetch('/api/notifications/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys }) }); } catch {}
}
function toggleNotif(e) {
  e.stopPropagation();
  const m = document.getElementById('notifPanel');
  closeHdrPopovers('notifPanel');
  positionUnder(e.currentTarget, m);
  renderNotif();
  m.classList.toggle('hidden');
}
// Zostaví jednu položku notifikácie: klikom na telo sa prejde na súvisiacu stránku,
// tlačidlom ✕ sa potvrdí (dismissNotifItem) bez toho, aby sa spustila navigácia.
function notifItemHtml(icon, label, itemKey, navigateJs) {
  return `<div class="notif-item">
    <div class="notif-item-body" onclick="closeHdrPopovers();${navigateJs}"><span>${icon}</span><span>${label}</span></div>
    <button class="notif-dismiss" onclick="dismissNotifItem('${itemKey}', event)" title="Označiť ako prečítané">✕</button>
  </div>`;
}
function renderNotif() {
  const el = document.getElementById('notifList'); if (!el) return;
  let h = '';
  if (notifData.todayEvs.length) {
    h += '<div class="notif-group">Dnes v kalendári</div>';
    notifData.todayEvs.forEach(({ item: ev, key }) => {
      h += notifItemHtml('📅', `${escHtml(ev.title)}${calEvTimeRange(ev) ? ' · ' + escHtml(calEvTimeRange(ev)) : ''}`, key, "showPage('calendar')");
    });
  }
  if ((notifData.tasksDue || []).length) {
    h += '<div class="notif-group">Úlohy — termín dnes / po termíne</div>';
    notifData.tasksDue.forEach(({ item: t, key }) => {
      const od = new Date(t.due) < new Date(new Date().toDateString());
      h += notifItemHtml('✅', `${escHtml(t.title)}${od ? ' — po termíne' : ' — dnes'}`, key, "showPage('tasks')");
    });
  }
  if ((notifData.calDue || []).length) {
    h += '<div class="notif-group">Kalibrácie (≤30 dní / po termíne)</div>';
    notifData.calDue.forEach(({ item: i, key }) => {
      const days = Math.ceil((new Date(i.nextCalibration) - new Date()) / 864e5);
      const lbl = days < 0 ? 'po termíne' : `o ${days} dní`;
      h += notifItemHtml('📐', `${escHtml(i.name)} — ${lbl}`, key, "showPage('dev');setTimeout(()=>switchDevTab('instruments'),100)");
    });
  }
  if ((notifData.procRevDue || []).length) {
    h += '<div class="notif-group">Pracovné postupy — revízia (≤30 dní / po termíne)</div>';
    notifData.procRevDue.forEach(({ item: p, key }) => {
      const days = Math.ceil((new Date(p.validity.nextRevision) - new Date()) / 864e5);
      const lbl = days < 0 ? 'po termíne' : `o ${days} dní`;
      h += notifItemHtml('📋', `${escHtml(p.title)} — revízia ${lbl}`, key, `showPage('procedures');setTimeout(()=>openProcedureById('${p._id}'),250)`);
    });
  }
  if ((notifData.gpnAttention || []).length) {
    h += '<div class="notif-group">GPN požiadavky — vyžadujú pozornosť</div>';
    notifData.gpnAttention.slice(0, 8).forEach(({ item: t, key }) => {
      const m = { new: 'nová', waiting_review: 'na kontrolu', waiting_info: 'čaká na doplnenie' }[t.status] || t.status;
      h += notifItemHtml('🧩', `${escHtml(t.number || '')} · ${escHtml(t.product || t.customer || '')} — ${m}`, key, `showPage('gpn');setTimeout(()=>openGpnDetail('${t._id}'),250)`);
    });
  }
  if (notifData.newAnns.length) {
    h += '<div class="notif-group">Nové novinky (7 dní)</div>';
    notifData.newAnns.slice(0, 6).forEach(({ item: a, key }) => {
      h += notifItemHtml('📢', escHtml(a.title), key, "showPage('home')");
    });
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
  if (e.key === 'Escape') { closeCmdPalette(); closeHdrPopovers(); closeMobileNav(); }
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
// PJ_WORKFLOWS / PJ_DELIVERABLES sú default; dajú sa prepísať z admin konfigurácie (/api/projects/config)
let PJ_WORKFLOWS = {
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
// Štandardné výstupy vývoja — status splnených úloh projektu (default; editovateľné v admine)
let PJ_DELIVERABLES = [
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
const PJ_STATUS = { active: { l: 'Aktívny', c: '#10b981' }, onhold: { l: 'Pozastavený', c: '#f59e0b' }, done: { l: 'Dokončený', c: '#3b82f6' }, cancelled: { l: 'Zrušený', c: '#ef4444' } };
const PJ_STATUS_ORDER = ['active', 'onhold', 'done', 'cancelled'];
let projectsData = [];
let _dragPid = null;
let pjView = 'list', pjWorkflow = 'development', pjDelivFilter = 'all';
let pjFilters = { text: '', status: '', owner: '', sales: '', dev: '', deadline: '' };
function pjSetFilter(key, val) { pjFilters[key] = val; renderProjects(); }
function pjClearFilters() { pjFilters = { text: '', status: '', owner: '', sales: '', dev: '', deadline: '' }; pjDelivFilter = 'all'; const s = document.getElementById('projSearch'); if (s) s.value = ''; renderProjects(); }

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
// onclickTpl(key) => reťazec do onclick; ak nie je → needitovateľné (span)
function pjChevron(stages, doneArr, repKey, track, extraCls, onclickTpl) {
  const last = stages.length - 1;
  return stages.map((s, i) => {
    let cls = (doneArr || []).includes(s.key) ? 'done' : 'future';
    if (s.key === repKey) cls += ' cur';                 // aktuálny stav
    if (i === 0) cls += ' pj-chev-start';                // prvý
    if (i === last) cls += ' pj-chev-end';               // posledný
    const tag = onclickTpl ? 'button' : 'span';
    const attr = onclickTpl ? ` type="button" onclick="${onclickTpl(s.key)}"` : '';
    return `<${tag} class="pj-chev pj-chev-${track} ${cls} ${extraCls || ''}"${attr}>${escHtml(s.label)}</${tag}>`;
  }).join('');
}
// Prepnutie stupňa (hotový/nehotový) priamo zo zoznamu — okamžité uloženie
async function pjToggleStageList(id, track, key) {
  const p = projectsData.find(x => x._id === id); if (!p) return;
  const wf = track === 'sales' ? 'sales' : 'development';
  const done = pjDoneSet(p, wf).slice();
  const i = done.indexOf(key); if (i >= 0) done.splice(i, 1); else done.push(key);
  const rep = pjRepKey(wf, done, pjStageOf(p, wf));
  const prev = { salesStage: p.salesStage, devStage: p.devStage, salesDone: p.salesDone, devDone: p.devDone, workflow: p.workflow, phase: p.phase };
  const u = {};
  if (wf === 'sales') { u.salesDone = done; u.salesStage = rep; } else { u.devDone = done; u.devStage = rep; }
  const dev = wf === 'development' ? rep : pjDevStage(p);
  const sales = wf === 'sales' ? rep : pjSalesStage(p);
  u.workflow = dev ? 'development' : 'sales'; u.phase = dev || sales;
  Object.assign(p, u); renderProjects();
  try { const r = await fetch('/api/projects/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) }); if (!r.ok) throw 0; }
  catch { Object.assign(p, prev); renderProjects(); toast('Uloženie zlyhalo', 'error'); }
}
function _segActive(id, idx) { const seg = document.getElementById(id); if (!seg) return; [...seg.children].forEach((b, i) => b.classList.toggle('active', i === idx)); }
function pjSetView(v) { pjView = v; _segActive('pjViewSeg', { kanban: 0, list: 1, gantt: 2 }[v]); renderProjects(); }
function pjSetWorkflow(w) { pjWorkflow = w; _segActive('pjWorkflowSeg', { development: 0, sales: 1 }[w]); renderProjects(); }

// Konfigurácia workflow/výstupov z admina (s fallbackom na defaulty)
const PJ_STAGE_PALETTE = ['#6366f1', '#0ea5e9', '#06b6d4', '#fbbf24', '#10b981', '#64748b', '#a855f7', '#f97316', '#ef4444'];
let _pjCfgLoaded = false;
function pjApplyConfig(cfg) {
  if (!cfg) return;
  if (cfg.workflows) ['sales', 'development'].forEach(wf => {
    const w = cfg.workflows[wf];
    if (w && Array.isArray(w.stages) && w.stages.length) {
      PJ_WORKFLOWS[wf] = { label: w.label || (PJ_WORKFLOWS[wf] && PJ_WORKFLOWS[wf].label) || wf,
        stages: w.stages.map((s, i) => ({ key: s.key, label: s.label, c: s.c || PJ_STAGE_PALETTE[i % PJ_STAGE_PALETTE.length] })) };
    }
  });
  if (Array.isArray(cfg.deliverables) && cfg.deliverables.length)
    PJ_DELIVERABLES = cfg.deliverables.map(d => ({ key: d.key, label: d.label, short: d.short || d.label }));
}
async function ensureProjectConfig() {
  if (_pjCfgLoaded) return; _pjCfgLoaded = true;
  try { const cfg = await fetch('/api/projects/config').then(r => r.ok ? r.json() : null); pjApplyConfig(cfg); } catch (_) {}
}
async function loadProjects() {
  await ensureProjectConfig();
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
// Sofistikované filtre nad stĺpcami zoznamu
function pjListMatch(p) {
  const f = pjFilters;
  if (f.text) { const t = f.text.toLowerCase(); if (!((p.title || '').toLowerCase().includes(t) || (p.code || '').toLowerCase().includes(t))) return false; }
  if (f.status && (p.status || 'active') !== f.status) return false;
  if (f.owner && (p.owner || '') !== f.owner) return false;
  if (f.sales && pjRepStage(p, 'sales') !== f.sales) return false;
  if (f.dev && pjRepStage(p, 'development') !== f.dev) return false;
  if (f.deadline) {
    const dl = p.deadline ? new Date(p.deadline) : null, now = new Date();
    if (f.deadline === 'none' && dl) return false;
    if (f.deadline === 'has' && !dl) return false;
    if (f.deadline === 'overdue' && !(dl && dl < now)) return false;
    if (f.deadline === 'month') { if (!dl || dl.getFullYear() !== now.getFullYear() || dl.getMonth() !== now.getMonth()) return false; }
  }
  return true;
}
function pjOwnerOptions() {
  const owners = [...new Set(projectsData.map(p => (p.owner || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'));
  return `<option value="">— ktokoľvek —</option>` + owners.map(o => `<option value="${escHtml(o)}"${pjFilters.owner === o ? ' selected' : ''}>${escHtml(o)}</option>`).join('');
}
function pjStatusFilterOptions() {
  return `<option value="">— všetky —</option>` + PJ_STATUS_ORDER.map(k => `<option value="${k}"${pjFilters.status === k ? ' selected' : ''}>${PJ_STATUS[k].l}</option>`).join('');
}
function pjStageFilterOptions(wf, sel) {
  return `<option value="">všetky</option>` + pjStages(wf).map(s => `<option value="${s.key}"${sel === s.key ? ' selected' : ''}>${escHtml(s.label)}</option>`).join('');
}
function pjDeadlineFilterOptions() {
  const opt = (v, l) => `<option value="${v}"${pjFilters.deadline === v ? ' selected' : ''}>${l}</option>`;
  return opt('', '— všetky —') + opt('overdue', '⚠ po termíne') + opt('month', 'tento mesiac') + opt('has', 's termínom') + opt('none', 'bez termínu');
}
function pjListFilterRow() {
  return `<tr class="pj-filter-row">
    <th><input type="text" class="pj-col-filter" placeholder="Hľadať projekt / kód…" aria-label="Hľadať projekt alebo kód" value="${escHtml(pjFilters.text)}" oninput="pjSetFilter('text',this.value)"></th>
    <th><select class="pj-col-filter" onchange="pjSetFilter('status',this.value)">${pjStatusFilterOptions()}</select></th>
    <th><div class="pj-fcell">
      <div class="pj-fcell-row"><span class="pj-fcell-tag" title="Predaj">💼</span><select class="pj-col-filter" onchange="pjSetFilter('sales',this.value)">${pjStageFilterOptions('sales', pjFilters.sales)}</select></div>
      <div class="pj-fcell-row"><span class="pj-fcell-tag" title="Vývoj">🛠</span><select class="pj-col-filter" onchange="pjSetFilter('dev',this.value)">${pjStageFilterOptions('development', pjFilters.dev)}</select></div>
      <div class="pj-fcell-row"><span class="pj-fcell-tag" title="Výstupy">📦</span>${pjDelivFilterOpts()}</div>
    </div></th>
    <th><select class="pj-col-filter" onchange="pjSetFilter('owner',this.value)">${pjOwnerOptions()}</select></th>
    <th><select class="pj-col-filter" onchange="pjSetFilter('deadline',this.value)">${pjDeadlineFilterOptions()}</select><button class="pj-filter-clear" title="Zrušiť filtre" aria-label="Zrušiť filtre" onclick="pjClearFilters()">✕</button></th>
  </tr>`;
}
function renderProjects() {
  const host = document.getElementById('projectsBoard'); if (!host) return;
  _segActive('pjViewSeg', { kanban: 0, list: 1, gantt: 2 }[pjView]);
  _segActive('pjWorkflowSeg', { development: 0, sales: 1 }[pjWorkflow]);
  const wfSeg = document.getElementById('pjWorkflowSeg'); if (wfSeg) wfSeg.style.display = pjView === 'list' ? 'none' : '';
  const q = (document.getElementById('projSearch')?.value || '').toLowerCase();
  const match = p => !q || (p.title || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q);
  host.style.gridTemplateColumns = '';
  if (pjView === 'list') {
    // zoznam: zobraz oba procesy (predaj aj vývoj) + sofistikované filtre nad stĺpcami
    const items = projectsData.filter(p => (pjActive(p, 'sales') || pjActive(p, 'development')) && match(p) && pjDelivMatch(p) && pjListMatch(p));
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
    const salesChev = sales ? `<div class="pj-flow pj-flow-sm">${pjChevron(PJ_WORKFLOWS.sales.stages, sDone, pjRepKey('sales', sDone, sales), 'sales', null, k => `event.stopPropagation();pjToggleStageList('${p._id}','sales','${k}')`)}</div>` : '<span class="prod-t-qty">neaktívne</span>';
    const devChev = dev ? `<div class="pj-flow pj-flow-sm">${pjChevron(PJ_WORKFLOWS.development.stages, dDone, pjRepKey('development', dDone, dev), 'dev', null, k => `event.stopPropagation();pjToggleStageList('${p._id}','dev','${k}')`)}</div>` : '<span class="prod-t-qty">neaktívne</span>';
    const procStack = `<div class="pj-proc-stack">
      <div class="pj-proc-line"><span class="pj-proc-tag pj-proc-tag-sales">Predaj</span>${salesChev}</div>
      <div class="pj-proc-line"><span class="pj-proc-tag pj-proc-tag-dev">Vývoj</span>${devChev}</div>
      ${dev ? `<div class="pj-proc-line"><span class="pj-proc-tag pj-proc-tag-deliv">Výstupy</span>${pjListDeliv(p)}</div>` : ''}
    </div>`;
    const st = PJ_STATUS[p.status] || PJ_STATUS.active;
    return `<tr onclick="openProjectModal(projectsData.find(x=>x._id==='${p._id}'))">
      <td><span class="prod-t-num">${escHtml(p.title)}</span>${p.code ? `<span class="prod-t-qty">${escHtml(p.code)}</span>` : ''}</td>
      <td><span class="pj-status-badge" style="--c:${st.c}">${st.l}</span></td>
      <td>${procStack}</td>
      <td>${escHtml(p.owner || '—')}</td>
      <td class="${overdue ? 'kanban-overdue' : ''}">${dl ? fmtDate(p.deadline) : '—'}</td>
    </tr>`;
  }).join('');
  const active = pjListActiveCount();
  host.innerHTML = `<div class="prod-list pj-list-wrap"><table class="prod-table">
    <thead><tr><th>Projekt</th><th>Stav</th><th>Procesy &amp; výstupy</th><th>Vlastník</th><th>Termín ${active ? `<span class="pj-filter-badge" title="Aktívne filtre">filtre: ${active} · ${items.length}</span>` : ''}</th></tr>
    ${pjListFilterRow()}</thead>
    <tbody>${rows}</tbody></table></div>`;
}
function pjListActiveCount() {
  let n = 0; const f = pjFilters;
  ['text', 'status', 'owner', 'sales', 'dev', 'deadline'].forEach(k => { if (f[k]) n++; });
  if (pjDelivFilter !== 'all') n++;
  return n;
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
    status: 'active', priority: 'normal', owner: '', startDate: null, deadline: null,
    deliverables: [], folder: '', tags: [], links: [], comments: [], description: '', notes: ''
  };
}
// openProjectModal je zachované meno kvôli existujúcim onclickom — presmeruje na stránku
function openProjectModal(p = null) { openProjectPage(p && typeof p === 'object' ? p : null); }
async function openProjectPage(arg) {
  await ensureProjectConfig();
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
  pjPageData.tags = pjPageData.tags || []; pjPageData.links = pjPageData.links || []; pjPageData.comments = pjPageData.comments || [];
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
  const curStatus = d.status || 'active';
  const statusOpts = PJ_STATUS_ORDER.map(k => `<option value="${k}"${curStatus === k ? ' selected' : ''}>${PJ_STATUS[k].l}</option>`).join('');
  const stInfo = PJ_STATUS[curStatus] || PJ_STATUS.active;
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
      <span class="pj-status-badge pjp-status-badge" id="pjStatusBadge" style="--c:${stInfo.c}">${stInfo.l}</span>
    </div>
    <div class="pjp-grid">
      <div class="pjp-main">
        <div class="pjp-card">
          <div class="pjp-card-hd">⚙️ Procesy <span class="pjp-card-hint">klik na stupeň = označiť hotový (aj nepostupne)</span></div>
          <div id="pjPageFlows"></div>
        </div>
        <div class="pjp-card pjp-com-card pjp-com-sales"><div class="pjp-card-hd">💬 Komentáre — Predaj</div><div id="pjCom-sales"></div></div>
        <div class="pjp-card pjp-com-card pjp-com-dev"><div class="pjp-card-hd">💬 Komentáre — Vývoj</div><div id="pjCom-dev"></div></div>
        <div class="pjp-card" id="pjPageDelivCard">
          <div class="pjp-card-hd">📦 Štandardné výstupy <span id="pjDelivCount" class="pj-deliv-count"></span></div>
          <div class="pj-deliv" id="pjDelivList"></div>
        </div>
        <div class="pjp-card pjp-com-card pjp-com-deliv"><div class="pjp-card-hd">💬 Komentáre — Výstupy</div><div id="pjCom-deliv"></div></div>
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
          <div class="form-group"><label>Stav projektu</label><select onchange="pjPageData.status=this.value;pjSyncStatusBadge()">${statusOpts}</select></div>
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
  ['sales', 'dev', 'deliv'].forEach(pjRenderComments);
}
function pjSyncStatusBadge() {
  const b = document.getElementById('pjStatusBadge'); if (!b) return;
  const s = PJ_STATUS[pjPageData.status] || PJ_STATUS.active;
  b.textContent = s.l; b.style.setProperty('--c', s.c);
}
function pjDateTime(d) {
  try { return new Date(d).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}
function pjRenderComments(scope) {
  const el = document.getElementById('pjCom-' + scope); if (!el) return;
  const list = (pjPageData.comments || []).filter(c => c.scope === scope).sort((a, b) => new Date(b.at) - new Date(a.at));
  const items = list.length ? list.map(c => `<div class="pjc-item">
      <div class="pjc-meta"><span class="pjc-author">${escHtml(c.author || '—')}</span><span class="pjc-at">${pjDateTime(c.at)}</span>${c._id ? `<button class="pjc-del" title="Zmazať" onclick="pjDelComment('${scope}','${c._id}')">✕</button>` : ''}</div>
      <div class="pjc-text">${escHtml(c.text)}</div></div>`).join('')
    : '<div class="pjp-empty">Zatiaľ žiadne komentáre.</div>';
  el.innerHTML = `<div class="pjc-list">${items}</div>
    <div class="pjc-add"><input type="text" id="pjcIn-${scope}" placeholder="Pridať komentár / zmenu…" onkeydown="if(event.key==='Enter')pjAddComment('${scope}')"><button class="btn-secondary btn-sm" onclick="pjAddComment('${scope}')">Pridať</button></div>`;
}
async function pjAddComment(scope) {
  const inp = document.getElementById('pjcIn-' + scope); const text = (inp && inp.value || '').trim(); if (!text) return;
  if (pjPageIsNew) {
    pjPageData.comments = pjPageData.comments || [];
    pjPageData.comments.push({ scope, text, author: (CURRENT_USER && (CURRENT_USER.name || CURRENT_USER.username)) || '', at: new Date().toISOString() });
    if (inp) inp.value = ''; pjRenderComments(scope); return;
  }
  try {
    const r = await fetch('/api/projects/' + pjPageData._id + '/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, text }) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); toast('Chyba: ' + (e.error || r.status), 'error'); return; }
    pjPageData.comments = await r.json(); if (inp) inp.value = ''; pjRenderComments(scope);
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function pjDelComment(scope, cid) {
  if (pjPageIsNew) { pjPageData.comments = (pjPageData.comments || []).filter(c => c._id !== cid); pjRenderComments(scope); return; }
  try { const r = await fetch('/api/projects/' + pjPageData._id + '/comments/' + cid, { method: 'DELETE' }); if (!r.ok) throw 0; pjPageData.comments = await r.json(); pjRenderComments(scope); }
  catch { toast('Mazanie zlyhalo', 'error'); }
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
      <div class="pj-flow">${sOn ? pjChevron(PJ_WORKFLOWS.sales.stages, sDone, sRep, 'sales', null, k => `pjPickStage('sales','${k}')`) : '<span class="pj-flow-off">neaktívne — zapni vyššie</span>'}</div></div>
    <div class="pj-track pj-track-dev"><label class="pj-track-hd"><input type="checkbox" ${dOn ? 'checked' : ''} onchange="pjToggleTrack('dev')"> 🛠 Vývojový proces</label>
      <div class="pj-flow">${dOn ? pjChevron(PJ_WORKFLOWS.development.stages, dDone, dRep, 'dev', null, k => `pjPickStage('dev','${k}')`) : '<span class="pj-flow-off">neaktívne — zapni vyššie</span>'}</div></div>`;
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
    status: d.status || 'active',
    priority: d.priority || 'normal', owner: (d.owner || '').trim(),
    startDate: d.startDate || null, deadline: d.deadline || null,
    deliverables: devOn ? (d.deliverables || []) : [],
    folder: (d.folder || '').trim(), tags: d.tags || [],
    links: (d.links || []).filter(l => (l.url || '').trim() || (l.label || '').trim()),
    comments: d.comments || [],
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
    d.innerHTML = `<img src="${escHtml(img.url)}" alt=""><button class="image-preview-annotate" onclick="reAnnotatePtImage(${i})" title="Anotovať (kruhy, popisy, bubliny)">✎</button><button class="image-preview-remove" onclick="removePtImage(${i})">✕</button>`;
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
  { v: '2.61.0', date: '18. 7. 2026', tag: 'feat', items: [
    '<strong>Kalendár — „Naplánovať stretnutie".</strong> Nové tlačidlo v hlavičke kalendára otvorí hľadač voľného termínu: cez checkboxy vyberieš ľudí (napojené kalendáre + interné), zvolíš dĺžku, pracovný čas a rozsah dní — appka nájde <strong>najbližší termín, kedy majú všetci vybraní voľno</strong> (preskočí víkendy a sviatky). Ponúkne niekoľko najbližších slotov a jedným klikom z termínu vytvoríš udalosť s predvyplneným časom a účastníkmi.',
  ] },
  { v: '2.60.1', date: '18. 7. 2026', tag: 'fix', items: [
    '<strong>Kalendár — meno vlastníka lepšie čitateľné pri každej farbe.</strong> Meno kalendára v udalostiach je teraz červené na malom tmavom čipe, takže je dobre čitateľné na akomkoľvek farebnom pozadí udalosti (ružová, fialová, zelená, žltá…), nielen na tmavých.',
  ] },
  { v: '2.60.0', date: '18. 7. 2026', tag: 'fix', items: [
    '<strong>Kalendár — meno kalendára v udalostiach výraznou červenou.</strong> V tmavom režime má vlastník/meno kalendára v každej udalosti (týždenný/denný pohľad, celodenné pruhy) výraznú červenú farbu s tmavým obrysom pre čitateľnosť aj na farebných pozadiach.',
    '<strong>Moje úlohy — väčšie a čitateľnejšie písmo.</strong> Zväčšené písmo v zozname aj v tabuľke (Grid) a zosvetlené predtým vyblednuté (slabo čitateľné) texty — názvy, meta údaje, popisy, poznámky, hlavičky stĺpcov, skupiny a prehľad „dnes/zajtra".',
  ] },
  { v: '2.59.0', date: '18. 7. 2026', tag: 'fix', items: [
    '<strong>Moje úlohy — krajšie ikony v paneli nástrojov.</strong> Tlačidlá „Zoskupiť", „Zbaliť/Rozbaliť všetky" a prepínač pohľadov (Zoznam/Kanban/Grid) majú namiesto nejednotných znakov (⊟, ⊞, ☰, ▦, ▤) čisté líniové SVG ikony zarovnané s textom.',
    '<strong>Kalendár — čitateľný text udalostí v tmavom režime.</strong> Farba textu v udalostiach sa teraz automaticky prispôsobí (tmavý text na svetlých farbách, svetlý na tmavých), takže názov aj čas sú vždy dobre viditeľné — platí pre týždenný/denný, celodenné pruhy aj mesačný pohľad.',
    '<strong>Kalendár — prehľadnejšie prekrývajúce sa udalosti.</strong> Pri viacerých udalostiach v jeden deň sa dlhý názov skráti na tri bodky (…) a čas začiatku/konca sa nezalamuje. Po prejdení myšou sa udalosť rozšíri a zobrazí celý čas aj názov.',
  ] },
  { v: '2.58.0', date: '17. 7. 2026', tag: 'fix', items: [
    '<strong>Moje úlohy — vrátené pôvodné ikony.</strong> Nové líniové (Lucide) ikony z verzie 2.57.0 sú vrátené späť na pôvodné emoji ikony. Funkcia zbaľovania/rozbaľovania úloh (vrátane tlačidiel „Zbaliť/Rozbaliť všetky") zostáva zachovaná.',
  ] },
  { v: '2.56.0', date: '17. 7. 2026', tag: 'feat', items: [
    '<strong>Moje úlohy — „Zbaliť/Rozbaliť všetky" funguje aj v Grid pohľade.</strong> Tlačidlá teraz v tabuľkovom (Grid) pohľade zbalia alebo rozbalia všetky skupiny (Zákazník → Projekt) naraz — pri zbalení ostanú len hlavičky zákazníkov. Tlačidlá sú viditeľné v zoznamovom aj grid pohľade (skryté len v Kanbane).',
  ] },
  { v: '2.55.0', date: '17. 7. 2026', tag: 'feat', items: [
    '<strong>Moje úlohy — zbalenie/rozbalenie úloh.</strong> V zoznamovom pohľade má každá úloha s detailmi malú šípku (▾/▸) na zbalenie — schová progres, poznámku, popis a podúlohy, ponechá názov, chipy a základné info. Užitočné pri dlhých zoznamoch.',
    'Nové tlačidlá <strong>„⊟ Zbaliť všetky"</strong> a <strong>„⊞ Rozbaliť všetky"</strong> v paneli nástrojov (zobrazené v zoznamovom pohľade) zbalia alebo rozbalia všetky úlohy naraz.',
  ] },
  { v: '2.54.0', date: '16. 7. 2026', tag: 'new', items: [
    '<strong>Appka na plochu (Android + iPhone) — PWA so štartom na Úlohách.</strong> Dashboard sa dá nainštalovať ako appka, ktorá sa otvorí rovno na module <strong>Úlohy</strong> a beží na celú obrazovku bez panela prehliadača.',
    '<strong>Android/Chrome:</strong> pri návšteve sa dole objaví banner <em>„Nainštalovať appku Úlohy"</em> s tlačidlom Inštalovať (natívna výzva). <strong>iPhone/Safari:</strong> banner s návodom <em>Zdieľať → „Pridať na plochu"</em>.',
    'Ikona na ploche má <strong>skratky</strong> (podržanie ikony): Úlohy, <strong>Nová úloha</strong> (otvorí rovno formulár), Kalendár, Výroba.',
    '<strong>iPhone s výrezom (notch):</strong> oprava — hlavička už nie je schovaná pod stavovým riadkom v režime appky (rešpektuje <code>safe-area</code>).',
    'Funguje aj offline (základný obsah cez service worker, network-first — nové verzie sa prejavia hneď po nasadení).',
  ] },
  { v: '2.53.0', date: '16. 7. 2026', tag: 'fix', items: [
    '<strong>Mobil — oprava „appka sa neprispôsobuje obrazovke".</strong> Pri zapnutom layoute <strong>Bočný sidebar</strong> sa na telefóne obsah odtláčal o 264px doprava a nezmestil sa na obrazovku (nedalo sa poriadne scrollovať ani ovládať) — a to na <strong>každej stránke</strong>.',
    'Príčina: desktopové pravidlo <code>padding-left</code> pre <code>.page</code> v sidebar režime malo rovnakú špecificitu ako mobilný reset, ale bolo v CSS neskôr, takže vyhralo aj na mobile. Desktopové rozloženie sidebaru je teraz uzavreté do <code>@media (min-width: 901px)</code>, čiže na mobile (≤900px) sa už neuplatní.',
    '<strong>Výroba — zoznam zákaziek:</strong> široká tabuľka (~870px) sa na mobile orezávala mimo obrazovku; teraz sa scrolluje horizontálne vo vlastnom rámčeku.',
    'Pridaný diagnostický skript <code>scripts/analyzeMobileControls.js</code> a audit responzivity naprieč stránkami (mobilná emulácia) na odhaľovanie pretekajúcich prvkov.',
  ] },
  { v: '2.52.0', date: '16. 7. 2026', tag: 'new', items: [
    '<strong>Mobil — veľký balík responzivity.</strong> Appka je na telefóne (Android aj iPhone) konečne pohodlne ovládateľná.',
    '<strong>Spodný tab bar:</strong> na mobile pribudla lišta pod palcom s najpoužívanejšími stránkami — Domov, Úlohy, Výroba, Kalendár a Menu (otvorí celú navigáciu).',
    '<strong>Hľadanie v menu:</strong> výsuvná navigácia (drawer) má navrchu filter — stačí písať a 20+ položiek sa zúži na hľadané.',
    '<strong>Modaly ako bottom-sheet:</strong> na mobile sa formulárové okná otvárajú cez celú šírku odspodu obrazovky so sticky tlačidlami Uložiť/Zrušiť (rešpektujú aj výrez/safe-area iPhonu).',
    '<strong>Koniec samovoľného zoomovania na iPhone:</strong> všetky vstupné polia majú na mobile písmo min. 16px, takže Safari pri ťuknutí do poľa už nepriblíži stránku.',
    'Väčšie dotykové ciele: tlačidlá (Uložiť, Upraviť, Zmazať, zatváranie modalov…) majú na mobile minimálne rozmery pre prst (38–44px).',
    'Kanban tabule (Úlohy, Výroba): stĺpce sú na mobile široké ~4/5 obrazovky a pri posúvaní „docvaknú" na celý stĺpec (scroll-snap).',
    'Obsah stránok už nekončí schovaný pod spodnou lištou; plávajúce tlačidlá (Pomoc, AI asistent) sú vyzdvihnuté nad ňu.',
    'Výška stránok používa <code>dvh</code> jednotky — spodok obsahu už nie je odrezaný pod adresným riadkom mobilného Safari/Chrome.',
  ] },
  { v: '2.51.0', date: '16. 7. 2026', tag: 'fix', items: [
    '<strong>Changelog — oprava zobrazenia HTML značiek.</strong> Zvýraznenia ako <code>&lt;strong&gt;</code> sa v zázname zmien vypisovali doslovne ako text namiesto tučného písma — položky sa už nezneškodňujú (escapujú), takže sa formátovanie správne vykreslí.',
    'Vytunené zvýraznenie v changelogu: <code>&lt;code&gt;</code> značky pre technické výrazy majú teraz vlastný štýl (odlíšené pozadie a farba) a tučný text je čitateľnejší na tmavom pozadí.',
  ] },
  { v: '2.50.1', date: '16. 7. 2026', tag: 'fix', items: [
    '<strong>Kritická oprava:</strong> hlavná navigácia (horizontálne menu aj alternatívny bočný panel) na desktope úplne zmizla — v predošlom vydaní (2.50.0) sa nesprávne zatvorila zátvorka CSS media query, takže mobilné pravidlá pre výsuvné menu (skryté mimo obrazovku) unikli mimo <code>@media</code> a platili aj na desktope. Opravené.',
  ] },
  { v: '2.50.0', date: '16. 7. 2026', tag: 'fix', items: [
    'Oprava: na mobile boli hlavičkové ikony (hľadanie, notifikácie, senzory, odhlásenie…) vytláčané mimo viditeľnú obrazovku a nedali sa použiť — na mobile (≤900px) sú teraz skryté ikony Senzory/meno/odhlásenie (dostupné v drawer menu, senzory aj cez plávajúci teplomer), takže sa zvyšné ikony vždy zmestia a sú klikateľné.',
    'Logo „FOS Dashboard" v hlavičke sa na úzkych obrazovkách skracuje (a na najužších skrýva), aby nevytláčalo ostatné ikony mimo obrazovku.',
    '<strong>Moje úlohy — Stav a Priorita ako tlačidlá.</strong> V modale úlohy sa dajú hodnoty Stav (Čaká/Prebieha/Blokované/Na kontrolu/Hotové/Zrušené) a Priorita (Nízka/Normálna/Vysoká/Kritická) nastaviť jedným klikom na farebné tlačidlo namiesto rozbaľovacieho zoznamu.',
    '<strong>Duplikovanie úlohy</strong> — nové tlačidlo „⧉ Duplikovať" v modale úlohy otvorí formulár novej úlohy s predvyplneným zákazníkom a projektom z pôvodnej úlohy (ostatné polia — názov, termín, stav… — ostávajú prázdne/predvolené).',
  ] },
  { v: '2.49.0', date: '16. 7. 2026', tag: 'fix', items: [
    'Administrácia → Používatelia: opravený kontrast textu v sekciách „Diagnostika e-mailu" a „Denný súhrn úloh" — tmavé hodnoty (SMTP_HOST, čas odoslania…) boli na tmavom pozadí takmer neviditeľné.',
    'Mobilná navigácia: spoľahlivejšie zamknutie scrollu pri otvorenom menu (iOS Safari) — predtým sa mohlo stať, že sa pozadie pod menu odscrollovalo a na položky sa nedalo trafiť.',
    '<strong>GitHub</strong> a <strong>Vzdialené PC (RustDesk)</strong>: karty sú teraz celé klikateľné na úpravu (predtým len malá ceruzka), s hover efektom (nadvihnutie + zvýraznenie okraja) a klávesovým ovládaním (Enter/Medzerník). Odkazy a tlačidlá v karte (repozitár, RustDesk pripojiť, kopírovať ID/heslo) fungujú naďalej samostatne.',
  ] },
  { v: '2.48.0', date: '16. 7. 2026', tag: 'feat', items: [
    '<strong>Moje úlohy — prepracovaná hlavička a prehľad termínov.</strong> Nadpis, tlačidlo „Nová úloha" a filtre sú teraz zmrazené (sticky) navrchu stránky pri scrollovaní, tlačidlo „Nová úloha" má navyše aj plávajúcu verziu vpravo dole.',
    'Oprava: hlavička Grid tabuľky (NÁZOV/STAV/PRIORITA…) sa pri scrollovaní prekrývala s prvým riadkom úloh — teraz je správne „zamrazená" a viditeľná stále, aj pri scrollovaní úplne dole.',
    'Opravená rozbitá ikona pri „Zajtra" (nahradené emoji za SVG ikony aj pri „Dnes"/„Zmeškané").',
    'Nová sekcia <strong>Zmeškané</strong> v prehľade nad zoznamom úloh — úlohy s termínom v minulosti, každá s tlačidlom „→ +1 deň" na rýchle posunutie termínu.',
    'Nový endpoint <code>PUT /api/tasks/:id/postpone</code> na posun termínu o deň.',
    '<strong>Denný e-mailový súhrn úloh</strong> — každý deň (predvolene o 7:00) príde používateľom s vyplneným e-mailom prehľad zmeškaných úloh a úloh na dnes/zajtra (bez úloh sa e-mail neposiela). Nastavenie a ručné odoslanie v Administrácia → Používatelia.',
    'Termíny úloh (dnes / po termíne) sa už predtým zobrazovali v notifikáciách (🔔) — overené a zachované.',
  ] },
  { v: '2.47.0', date: '16. 7. 2026', tag: 'feat', items: [
    'Mobilná navigácia prerobená na <strong>výsuvný bočný panel (drawer)</strong> — namiesto vodorovnej posuvnej lišty s 20+ ikonami sa na mobile/tablete (≤900px) otvára cez hamburger tlačidlo v hlavičke, so zoskupenými sekciami a väčšími dotykovými plochami.',
    'Zväčšené dotykové plochy hlavičkových tlačidiel (hľadanie, rýchle pridať, notifikácie) na mobile na min. 40×40px.',
  ] },
  { v: '2.46.0', date: '15. 7. 2026', tag: 'fix', items: [
    'Vývoj výrobkov → Projekty (zoznam): filtre <strong>predaj/vývoj strácali kontext</strong> po výbere hodnoty — pridané trvalé ikony 💼/🛠/📦 a vizuálne zoskupenie filtrov.',
    'Zlepšená prístupnosť tlačidla „zrušiť filtre" (aria-label) a čitateľnosť popiskov PREDAJ/VÝVOJ/VÝSTUPY.',
  ] },
  { v: '2.45.0', date: '15. 7. 2026', tag: 'feat', items: [
    'WIKI FOS: nová možnosť pridávať k záznamu <strong>prílohy (súbory)</strong> pretiahnutím (drag & drop) alebo kliknutím — zobrazujú sa v detaile ako zoznam na stiahnutie.',
    'WIKI FOS: celý modul (bočný panel, prehľad, kategórie, detail záznamu, editačné modaly) prerobený na <strong>tmavý dizajn</strong> zladený so zvyškom appky.',
  ] },
  { v: '2.44.0', date: '15. 7. 2026', tag: 'chore', items: [
    'Odstránený modul <strong>Termostatický kúpeľ — SIKA TP</strong> (teplotné kalibrátory TP37 / TP3M cez ethernet) — vrátane stránky, položiek v navigácii, backend routy a modelu.',
  ] },
  { v: '2.43.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Stránka <strong>Moje úlohy</strong>: nový rýchly prehľad úloh s termínom <strong>na dnes a na zajtra</strong> (dve kartičky nad zoznamom) — vidno hneď, na čo sa treba nachystať.',
  ] },
  { v: '2.42.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Nový modul <strong>Termostatický kúpeľ — SIKA TP</strong> (teplotné kalibrátory TP37 / TP3M) s <strong>komunikáciou cez ethernet</strong> (REST-API, port 8081). Podpora <strong>viacerých zariadení</strong> (výber v hornej lište, správa cez ⚙ Zariadenia).',
    'Živý prehľad: <strong>referenčná teplota</strong> a <strong>set point</strong>, hodnoty referenčných senzorov (TR_Ext/Int + surové), <strong>stav kalibrácie</strong> (stav, testpoint, hold-time, možnosť kalibrácie) a informácie o zariadení (sériové č., model, firmvér, rozsah, posledná kalibrácia…). Auto-obnova každých 5 s.',
    '<strong>Nastavenie cieľovej teploty</strong> priamo z appky (príkaz setSP) a <strong>dekódovanie chybových masiek</strong> zariadenia (fatálne aj prechodné chyby) do zrozumiteľných slovenských hlášok.',
    'Nová ilustrácia zariadenia (SVG s animovaným ventilátorom) a položka v hlavnej navigácii aj bočnom paneli.',
  ] },
  { v: '2.41.0', date: '15. 7. 2026', tag: 'feat', items: [
    '<strong>Zadávateľ úlohy</strong> — priraď úlohu inému používateľovi Dashboardu; ten ju uvidí vo svojich Úlohách, ale nebude ju môcť editovať ani ukončiť (badge „👁 len na čítanie" v zozname/Grid/Kanbane).',
    'Modal <strong>Upraviť úlohu</strong> kompletne prerobený: tmavá téma zladená so stránkou Úlohy, polia zoskupené do logických sekcií (Základné · Stav a termín · Kontext · Priradenie a väzby · Podúlohy · Aktualizácie) pre lepšiu prehľadnosť.',
    'Grid pohľad úloh: hlavička tabuľky (aj s filtrami) je teraz <strong>prilepená hore</strong> pri scrollovaní zoznamu.',
  ] },
  { v: '2.40.5', date: '15. 7. 2026', tag: 'style', items: [
    'Okno stránky Úlohy (Grid/Kanban) rozšírené (1240 px → 1640 px), aby sa tabuľka Grid pohľadu zmestila bez horizontálneho skrolovania.',
  ] },
  { v: '2.40.4', date: '15. 7. 2026', tag: 'style', items: [
    'Grid pohľad úloh: stĺpec <strong>Aktualizácia</strong> rozšírený o 50 %.',
    'Filter <strong>Všetky tagy</strong> presunutý k filtrom Aktívne/Všetky/Hotové (zarovnaný vľavo v toolbare).',
  ] },
  { v: '2.40.3', date: '15. 7. 2026', tag: 'fix', items: [
    'Grid pohľad úloh: stĺpec <strong>Termín</strong> sa už nezalamuje a stĺpec <strong>Aktualizácia</strong> (skrátené z „Posledná aktualizácia") je celý vidno bez skrolovania — zmenšený stĺpec Názov (320 px namiesto 380 px) uvoľnil miesto.',
  ] },
  { v: '2.40.2', date: '15. 7. 2026', tag: 'fix', items: [
    'Oprava farby ikony FOS Dashboard v alternatívnom bočnom paneli — vrátené aj pôvodné pozadie (tyrkysovo-fialový gradient) a farba ikony, ktoré ostali nedopatrením biele po vrátení ikony.',
  ] },
  { v: '2.40.1', date: '15. 7. 2026', tag: 'style', items: [
    'Ikona <strong>FOS Dashboard</strong> v alternatívnom bočnom paneli vrátená späť na pôvodnú (graf-ikonu) — logo SYLEX zostáva na prihlasovacej obrazovke a v ľavom hornom rohu hlavičky.',
  ] },
  { v: '2.40.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Grid pohľad úloh je predvolene <strong>zoradený podľa priority</strong> (kritická → nízka) a riadky majú <strong>farebné pozadie podľa priority</strong> (kritická/vysoká červeno, nízka jemne šedo).',
    'Stĺpec <strong>Názov</strong> v Grid pohľade je 2× širší, menej sa zalamuje.',
    'Stĺpec <strong>Posledná aktualizácia</strong> teraz pri prejdení myšou zobrazí celý text v prehľadnom tooltipe (namiesto orezaného textu).',
  ] },
  { v: '2.39.1', date: '15. 7. 2026', tag: 'fix', items: [
    'Grid pohľad úloh: riadky úloh v zoskupení <strong>Zákazník → Projekt</strong> sú teraz odsadené zľava viac než hlavička skupiny Projekt, takže je hneď vidno, pod ktorý projekt úloha patrí.',
  ] },
  { v: '2.39.0', date: '15. 7. 2026', tag: 'feat', items: [
    '<strong>Notifikácie</strong> (🔔) sa teraz dajú potvrdiť (✕ pri položke, alebo „Označiť všetky ako prečítané" v paneli) a odvtedy prestanú svietiť ako nové — znova sa objavia, len ak sa zmení dôvod (napr. posunutý termín).',
    'Modal <strong>Upraviť úlohu</strong> je širší (780 px) a opravená chyba layoutu, kvôli ktorej sa modal vodorovne roztiahol a časť polí nebolo vidieť.',
    'Popis a Poznámka nahradené <strong>denníkom aktualizácií</strong> — každý záznam má autora a dátum/čas, takže je vidieť kto a kedy zmenil stav úlohy. Posledná aktualizácia sa zobrazuje aj v novom stĺpci Grid pohľadu.',
  ] },
  { v: '2.38.1', date: '15. 7. 2026', tag: 'fix', items: [
    'Odsadenie podradených úloh v pohľade <strong>Zoznam</strong> teraz posúva doprava celý riadok (nielen text názvu), takže hierarchia je vizuálne zreteľnejšia.',
  ] },
  { v: '2.38.0', date: '15. 7. 2026', tag: 'style', items: [
    'Modal <strong>Upraviť úlohu</strong> je širší (660 px) a prehľadnejšie usporiadaný — Závislosti a Podúlohy sú vedľa seba v skrolovateľných zoznamoch, Popis a Poznámka tiež vedľa seba, takže sa toho zmestí viac bez zbytočného skrolovania.',
    'Podradené úlohy (s nadradenou úlohou) sú v Zozname aj v Grid pohľade <strong>odsadené zľava</strong> podľa hĺbky hierarchie — vizuálne pôsobia ako stromová štruktúra.',
  ] },
  { v: '2.37.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Polia <strong>Projekt</strong> a <strong>Zákazník</strong> v úlohe sú teraz <strong>rozbaľovacie polia</strong> s existujúcimi hodnotami z číselníka (namiesto voľného textu) — výber existujúcej hodnoty predchádza duplicitám (aj s ohľadom na veľkosť písmen), voľba „+ Pridať nový…" umožní zapísať novú hodnotu do číselníka.',
  ] },
  { v: '2.36.0', date: '15. 7. 2026', tag: 'feat', items: [
    '<strong>Grid</strong> je teraz predvolený pohľad úloh, s <strong>filtrami pod hlavičkou každého stĺpca</strong> (text/výber) a dvojúrovňovým <strong>zoskupením podľa Zákazníka a následne Projektu</strong> (rozbaľovacie skupiny s počtami).',
    'Projekt a Zákazník sa teraz ukladajú do <strong>číselníka</strong> — ponuka pri vytváraní úlohy zostáva dostupná aj po vymazaní úloh, ktoré ich pôvodne použili.',
  ] },
  { v: '2.35.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Nový <strong>Grid</strong> pohľad úloh (tretí view vedľa Zoznamu a Kanbanu) — tabuľka so stĺpcami názov, stav, priorita, projekt, zákazník, termín, tagy a progres, s triedením kliknutím na hlavičku stĺpca.',
  ] },
  { v: '2.34.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Rozšírené <strong>Úlohy</strong> o hierarchiu (nadradená úloha), <strong>závislosti</strong> medzi úlohami (nemožno dokončiť, kým závislosť nie je hotová), <strong>tagy</strong> s filtrom a stavy <strong>Blokované / Na kontrolu / Zrušené</strong> + prioritu <strong>Kritická</strong>. Pribudol aj celkový <strong>progres úloh</strong> (X / Y dokončených, %) nad zoznamom a Kanban má teraz 6 stĺpcov.',
  ] },
  { v: '2.33.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Oficiálne <strong>logo SYLEX</strong> (červený emblém so slovom „sylex") nasadené naprieč celou aplikáciou: v <strong>hlavičke</strong> (pred názvom FOS Dashboard), na <strong>prihlasovacej obrazovke</strong>, v <strong>alternatívnom bočnom paneli</strong>, na stránke <strong>overenia e-mailu</strong>, v <strong>overovacom e-maile</strong> (hostované PNG s textovým fallbackom) a v exportovaných <strong>pracovných postupoch</strong> (Word/PDF). Logo je vektorové (SVG) a funguje na svetlom aj tmavom podklade.',
  ] },
  { v: '2.32.0', date: '15. 7. 2026', tag: 'feat', items: [
    'Nový <strong>dizajn overovacieho e-mailu</strong>: table-based responzívna šablóna s brandovanou hlavičkou (FOS Dashboard · SYLEX), akcentovou linkou, „bulletproof" CTA tlačidlom (vrátane VML fallbacku pre Outlook), preheaderom a čistým pätičkovým blokom. Vyzerá rovnako v Gmaile aj Outlooku. Meno príjemcu sa teraz HTML-escapuje.',
  ] },
  { v: '2.31.2', date: '14. 7. 2026', tag: 'fix', items: [
    'Hotfix štartu: <code>engines.node</code> zvýšené na <code>&gt;=20</code>. Predchádzajúce <code>&gt;=18</code> spôsobilo, že Railway nainštaloval Node 18, na ktorom padal balík <code>node-ical</code> (používa regex flag <code>v</code> dostupný až od Node 20) a appka sa nespustila.',
  ] },
  { v: '2.31.1', date: '14. 7. 2026', tag: 'fix', items: [
    'Oprava odosielania e-mailov: Brevo API sa teraz volá cez vstavaný modul <code>https</code> (nezávisí od globálneho <code>fetch</code>, funguje na každej verzii Node). Pridané <code>engines.node &gt;=18</code>.',
    'Nová <strong>Diagnostika e-mailu</strong> (Admin → Používatelia): zobrazí stav konfigurácie (BREVO_API_KEY, EMAIL_SENDER, APP_URL…) a tlačidlo na <em>odoslanie testovacieho e-mailu</em>, ktoré ukáže presnú chybu z Brevo (napr. neoverený odosielateľ, neplatný kľúč).',
  ] },
  { v: '2.31.0', date: '14. 7. 2026', tag: 'feat', items: [
    'Nové <strong>role používateľov</strong>: <em>Obchod</em>, <em>Kvalita</em>, <em>Technológia</em> (popri Používateľ a Admin) — voliteľné v modáli používateľa, farebne odlíšené odznaky v zozname.',
    'Odosielanie e-mailov cez <strong>Brevo</strong> (rovnaký prístup ako projekt DBFOOD): ak je nastavený <code>BREVO_API_KEY</code>, maily idú cez Brevo HTTP API (funguje aj keď je SMTP blokovaný, napr. na Railway), inak fallback na SMTP <code>smtp-relay.brevo.com</code>. Overovacie e-maily sa tak reálne doručia.',
    'Podporované env premenné (podľa DBFOOD): <code>BREVO_API_KEY</code>, <code>EMAIL_SENDER</code>, <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>EMAIL_PASSWORD</code>, <code>APP_URL</code>.',
  ] },
  { v: '2.30.0', date: '14. 7. 2026', tag: 'feat', items: [
    'Prepracovaná stránka <strong>Nový používateľ</strong> (Admin → Používatelia): väčšie prehľadné okno rozdelené na sekcie (Identita · Heslo · Nastavenia), bez vodorovného scrollu, opravené vstupné polia.',
    '<strong>Generátor silného hesla</strong> 🎲 — jedným klikom vytvorí náhodné bezpečné heslo (nastaviteľná dĺžka, voliteľné špeciálne znaky, bez zameniteľných znakov 0/O/1/l/I), s indikátorom sily hesla, zobrazením/skrytím a kopírovaním do schránky.',
    '<strong>Prihlásenie cez e-mail</strong> — používatelia sa môžu prihlásiť menom <em>alebo</em> e-mailom. Do profilu pribudlo pole e-mail.',
    '<strong>Overenie e-mailu</strong> — pri zadaní e-mailu sa odošle overovací odkaz (platný 24 h) s brandovanou stránkou potvrdenia. V zozname používateľov je stav <em>overený / neoverený</em> a tlačidlo na opätovné odoslanie. Ak SMTP nie je nastavené, odkaz sa dá skopírovať a poslať ručne.',
    'Poznámka: pre reálne odosielanie e-mailov nastav na Railway premenné <code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> (voliteľne <code>SMTP_PORT</code>, <code>SMTP_SECURE</code>, <code>SMTP_FROM</code>, <code>APP_URL</code>).',
  ] },
  { v: '2.29.1', date: '14. 7. 2026', tag: 'style', items: [
    'Modul <strong>GPN — Golden PN</strong> je teraz v <strong>tmavom režime</strong> — zjednotený vzhľad s ostatnými výrobnými stránkami (Výroba, Riadenie, Workflow, Vlastníci): tmavé navy pozadie, priehľadné karty, cyan akcenty. Dashboard, filtre aj zoznam ticketov sa prispôsobili tmavému podkladu (formuláre a detail ticketu ostávajú na svetlom modáli ako v celej appke).',
  ] },
  { v: '2.29.0', date: '14. 7. 2026', tag: 'feat', items: [
    'Nový modul <strong>GPN — Golden PN</strong> (v menu nad <em>Vlastníci produktov</em>) — interný ticket systém pre požiadavky na vytvorenie a úpravu GPN medzi obchodom a technológiou. Nahrádza chaotickú komunikáciu cez e-mail/Teams jednotným formulárom, kde obchodník zadá všetky potrebné údaje naraz.',
    '<strong>Formulár požiadavky</strong>: typ (nové/úprava), priorita, dôvod a popis, produkt/variant/zákazník/projekt, dynamický zoznam <em>káblov</em> (typ, počet, dĺžka, farba, označenie) a <em>konektorov</em> (A/B, orientácia, pinout), materiál (tubing, sleeve, label, heat shrink, iné), termín a špeciálne požiadavky.',
    '<strong>Ticket workflow</strong> s automatickým číslom (GPN-RRRR-NNNN) a stavmi: Nová → Čaká na kontrolu → Rozpracované → (Čaká na doplnenie) → Na schválenie → Schválené → Dokončené → Uzavreté. Ticket sa dá vrátiť obchodníkovi na doplnenie informácií.',
    '<strong>Dashboard</strong> s prehľadmi (nové, rozpracované, čakajúce na doplnenie, na schválenie, dokončené) a filtrami podľa zákazníka, produktu, technológa, obchodníka, dátumu, priority a stavu + fulltext.',
    '<strong>Detail ticketu</strong>: kompletné parametre, priradenie technológa, checklist výrobnej dokumentácie (GPN, výrobný a baliaci výkres, BOM, BOO, FOS karta, schválenie výkresov, kompletná dokumentácia), prílohy s <em>drag &amp; drop</em> uploadom, komentáre a plná história zmien (kto, kedy, čo).',
    'Notifikácie: GPN požiadavky vyžadujúce pozornosť (nové / na kontrolu / čakajúce na doplnenie) sa zobrazujú v zvončeku notifikácií. Možnosť <em>kopírovať</em> existujúcu požiadavku a ukážkové dáta (🎲).',
    'Architektúra pripravená na budúce rozšírenia (automatické generovanie GPN/BOM, prepojenie na ERP/PLM, export PDF/Excel, KPI a SLA meranie).',
  ] },
  { v: '2.28.0', date: '10. 7. 2026', tag: 'chore', items: [
    'Pridaný skill <strong>sylex-brand</strong> — oficiálny SYLEX brand kit (červený emblém, wordmark „sylex®", varianta „FIBER OPTICS", brand paleta a pravidlá) v <code>.claude/skills/</code>. Aplikuje sa iba na výslovné vyžiadanie, nie automaticky.',
  ] },
  { v: '2.27.0', date: '10. 7. 2026', tag: 'feat', items: [
    'Nový modul <strong>File server</strong> — zdieľanie súborov pre zákazníkov. Každé zdieľanie má vlastný odkaz /s/… chránený automaticky vygenerovaným heslom (zobrazí sa iba raz pri vytvorení).',
    'Zákaznícka stránka na stiahnutie súborov v modernom SYLEX dizajne (navy + limetka, optické vlákna v pozadí) — funguje bez prihlásenia, stačí odkaz a heslo.',
    'Správa zdieľaní v dashboarde: upload viacerých súborov naraz (drag &amp; drop, max 500 MB/súbor), kopírovanie odkazu a hotovej správy pre zákazníka, expirácia, vypnutie linku, nové heslo, štatistiky odomknutí a stiahnutí.',
  ] },
  { v: '2.26.0', date: '9. 7. 2026', tag: 'chore', items: [
    'Nainštalované UI/UX Pro Max skills (dizajnová inteligencia pre vývoj — 50+ UI štýlov, 161 farebných paliet, typografia, UX pravidlá, grafy). Budúce úpravy vzhľadu appky sa budú opierať o tieto odporúčania.',
  ] },
  { v: '2.25.0', date: '8. 7. 2026', tag: 'chore', items: [
    'Changelog sa teraz vedie aj v súbore `CHANGELOG.md` (okrem stránky Changelog v appke) a jeho zápis je povinný krok pri každom nasadení.',
    'Doplnené chýbajúce záznamy verzií 2.21–2.24 (denný filter a štatistiky kalibračných listov, presun KPI, rámčekovanie sekcií výrobných stránok).',
  ] },
  { v: '2.24.0', date: '8. 7. 2026', tag: 'feat', items: [
    'Rámčekovanie sekcií rozšírené na celú výrobnú rodinu stránok — Riadenie výroby (MES), Vlastníci produktov a Workflow výroby produktu majú teraz sekcie v jednotných ohraničených kartách (rovnaký vzhľad ako Plánovanie výroby).',
  ] },
  { v: '2.23.0', date: '8. 7. 2026', tag: 'feat', items: [
    'Plánovanie výroby: jednotlivé bloky (Kalibračné listy, Prehľad výroby/KPI, Zoznam zákaziek) sú vizuálne oddelené rámčekmi (kartami) pre lepšiu prehľadnosť.',
  ] },
  { v: '2.22.0', date: '8. 7. 2026', tag: 'feat', items: [
    'Plánovanie výroby: KPI dlaždice presunuté nižšie — spod hlavičky tesne nad zoznam zákaziek.',
  ] },
  { v: '2.21.0', date: '8. 7. 2026', tag: 'feat', items: [
    'Plánovanie výroby → Kalibračné listy: nový denný filter — predvolene ukazuje aktuálny deň, dá sa posúvať dozadu/dopredu (‹ Dnes ›) a prepnúť na „Všetky dni".',
    'Samostatné štatistiky ku kalibračným listom (Expedované / Čaká na odoslanie / Odoslané) fungujú ako klikacie filtre podľa stavu; filtre presunuté z hlavičky priamo nad zoznam.',
  ] },
  { v: '2.20.0', date: '8. 7. 2026', tag: 'feat', items: [
    'Kalendár: moderný loading — interné udalosti sa zobrazia okamžite a napojené ICS kalendáre (pomalšie) sa dofetchujú s jemným indikátorom (netreba čakať na všetko).',
    'Zdieľaný kalendár (verejný odkaz) teraz obsahuje aj udalosti z napojených ICS kalendárov kolegov (Outlook/RON…), nielen interné.',
  ] },
  { v: '2.19.0', date: '8. 7. 2026', tag: 'feat', items: [
    'Vlastníci produktov: aktualizovaný zoznam (72 výrobkov) a stĺpce podľa novej tabuľky — NR, Druh, Výrobok, Popis, Product Owner, Backup Owner, Stav, TODO (odstránené Kategória a PO2). Dáta sa pri nasadení automaticky obnovia.',
    'Server: čisté ukončenie pri redeployi (graceful shutdown na SIGTERM) — už nehlási „npm error signal SIGTERM" pri nasadzovaní.',
  ] },
  { v: '2.18.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Plánovanie výroby: predvolené zobrazenie je teraz „☰ Zoznam".',
    'Vlastníci produktov: štatistické okienka sú klikateľné — klik nastaví filter tabuľky (DONE/WIP/NOK/Bez vlastníka), opätovný klik zruší; aktívny filter je zvýraznený.',
    'Pracovný postup: v editore pribudlo tlačidlo „⬇ PDF" (aj „🗑 Odstrániť" pri úprave). Klik na operáciu v náhľade (vpravo) sfokusuje a odscroluje príslušnú kartu v editore (vľavo).',
    'Pracovný postup: upozornenia a OOPP majú kompaktnejší „pill" dizajn s výraznejším piktogramom (menej miesta, lepšia čitateľnosť).',
  ] },
  { v: '2.17.2', date: '7. 7. 2026', tag: 'fix', items: [
    'Anotácie obrázka: bublina sa už neláme po písmenách a proporčne sa škáluje s veľkosťou zobrazenia obrázka (rovnaký vzhľad v editore, náhľade aj vo výslednom postupe). Veľkosť písma je teraz relatívna k šírke obrázka.',
  ] },
  { v: '2.17.1', date: '7. 7. 2026', tag: 'fix', items: [
    'Svetlé motívy: opravená čitateľnosť textov — jasné farby (svetlosivá, cyan, žltá, zelená, fialová, modrá) sa teraz v svetlých motívoch stmavia. Tmavý motív ostáva nezmenený.',
  ] },
  { v: '2.17.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Pracovné postupy → obrázok operácie má nové tlačidlo „🎯 Anotovať": pridávanie textových bublín so šípkami priamo na obrázok.',
    'Bubliny sa ťahajú myšou, koncový bod šípky sa dá potiahnuť na cieľ. Pri každej bubline sa nastaví text, veľkosť písma, farba textu, farba orámovania aj pozadia.',
    'Anotácie sa uložia k operácii a zobrazujú sa v náhľade aj vo výslednom postupe (A4).',
  ] },
  { v: '2.16.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Dva nové svetlé vzhľady na celý web — „Svetlý" (čistý, chladný) a „Teplý svetlý" (krémový). Prepínajú sa v Administrácia → Vzhľad → Web téma, nastavenie je spoločné pre všetkých.',
    'Predvolený tmavý motív ostáva nezmenený. Svetlé motívy flipnú podklady, okraje aj text celej aplikácie cez „dark zone" tokeny.',
  ] },
  { v: '2.15.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Kalendár → tlačidlo „🔗 Zdieľať": verejný odkaz na zobrazenie kalendára v prehliadači (read-only, bez prihlásenia) — pošli ho kolegovi. K dispozícii aj iCal odkaz na odber v Outlooku/Google.',
    'Zdieľaný náhľad (calendar-share.html) je samostatná stránka chránená tajným tokenom, s mesačným prehľadom, sviatkami a časmi udalostí.',
  ] },
  { v: '2.14.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Nový modul „Vlastníci produktov" v hlavnom menu — zoznam Product Ownerov naimportovaný z Excelu (GOLDEN PN, hárok final): druh, kategória, výrobok, popis, Product Owner + PO2 + Backup, stav (NOK/WIP/DONE), TODO.',
    'Plne editovateľný (pridať/upraviť/zmazať), filtre podľa druhu, stavu a vlastníka, KPI prehľad a vyhľadávanie.',
    'Každý záznam má históriu zmien — kto, kedy a čo zmenil (pole: pôvodná → nová hodnota). „📥 Import z Excelu" v module obnoví dáta z pôvodného zoznamu.',
  ] },
  { v: '2.13.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Kalendár (týždeň/deň): celodenné a viacdňové udalosti sa teraz spájajú do súvislých pruhov cez dni (ako v mesačnom pohľade) — namiesto samostatných čipov v každom dni. Pruhy majú šípky pokračovania a stohujú sa do viacerých riadkov.',
  ] },
  { v: '2.12.1', date: '7. 7. 2026', tag: 'fix', items: [
    'Kalendár (týždeň/deň): rámček dnešného dňa (a žltý rámček sviatku) je teraz viditeľný nad udalosťami — predtým ho udalosti v stĺpci prekrývali. Kreslí sa cez ::after vrstvu a neblokuje klikanie.',
  ] },
  { v: '2.12.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Kalendár (mesiac): pri časovaných udalostiach je čas, názov a vlastník pod sebou (predtým zlepené na jednom riadku).',
    'Všade sa zobrazuje časový rozsah „od – do" (napr. 07:00 – 08:00), ak má udalosť zadaný koniec — v mesiaci, týždni/dni, na úvode, v notifikáciách aj v tooltipe.',
  ] },
  { v: '2.11.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Kalendár: štátne sviatky sú zvýraznené žltým rámčekom — v mesačnom pohľade celá bunka, v týždni/dni celý stĺpec dňa (hlavička + „celý deň" + mriežka).',
  ] },
  { v: '2.10.3', date: '7. 7. 2026', tag: 'fix', items: [
    'Kalendár (týždeň/deň): zvislé čiary stĺpcov (a modré zvýraznenie dnešného dňa) v hlavičke a riadku „celý deň" sa už zhodujú s mriežkou nižšie — predtým ich o šírku skrolovacej lišty rozhadzovalo, takže čiara z hlavičky nesedela s časovou mriežkou.',
  ] },
  { v: '2.10.2', date: '7. 7. 2026', tag: 'fix', items: [
    'Kalendár (týždeň/deň): časová os je konečne čitateľná — hodiny už nie sú preškrtnuté čiarou (čiara v stĺpci s časmi bola odstránená, mriežku kreslia stĺpce dní) a prvý čas (napr. 07:00) sa už neschováva pod riadok „celý deň".',
  ] },
  { v: '2.10.1', date: '7. 7. 2026', tag: 'fix', items: [
    'Kalendár (týždeň/deň): udalosti sú konečne čitateľné — čas, názov udalosti a vlastník sú pod sebou na samostatných riadkoch (predtým sa kvôli zdedenému flex-layoutu ťahali vedľa seba a meno vlastníka pretekalo mimo bunky).',
    'Značka prekryvu ⚠ je presunutá do pravého horného rohu, aby netlačila text.',
  ] },
  { v: '2.10.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Administrácia → nový tab „Moduly": jednotlivé moduly sa dajú skryť z hlavného menu aj bočného panela prepínačom. Dáta modulu zostávajú zachované, len sa skryje z navigácie.',
    'Domov a Administrácia sa skryť nedajú. Tlačidlo „Zobraziť všetky" vráti všetko naspäť. Nastavenie je spoločné pre všetkých a pamätá sa na serveri.',
  ] },
  { v: '2.9.1', date: '7. 7. 2026', tag: 'ui', items: [
    'Pracovné postupy: pri každej operácii je teraz priamo pod textom animované tlačidlo „🎤 Diktovať operáciu" — klik nadiktuje popis rovno do tej operácie.',
  ] },
  { v: '2.9.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Pracovné postupy: nové tlačidlo „🎤 Diktovať" v editore — nahrá zvuk a naživo prepíše slovenskú reč na text (Web Speech API, sk-SK, priamo v prehliadači).',
    'Prepis sa dá upraviť a vložiť do naposledy zameraného poľa (účel, rozsah, operácia, poznámka…). Panel ukazuje, kam text pôjde.',
    'Zvukovú nahrávku je možné vypočuť, stiahnuť alebo priložiť k postupu ako prílohu (endpoint /api/upload/audio). Rozpoznávanie reči funguje v Chrome/Edge.',
  ] },
  { v: '2.8.0', date: '7. 7. 2026', tag: 'feat', items: [
    'Nový modul „Workflow výroby produktu" (menu Výroba → Workflow): každý produkt (napr. SAA-01) má vlastnú postupnosť výrobných krokov — Montáž → Zváranie → Kontrola po zvaraní → Žíhanie → Kalibrácia.',
    'Kroky sa dajú klikom prepínať medzi stavmi Čaká → Prebieha → Hotové; postup (%) sa počíta automaticky a zobrazuje v zozname aj detaile (vertikálny stepper).',
    'Editor krokov s presúvaním poradia (↑↓), pracoviskom a poznámkou. Tlačidlo „🎲 Ukážkové dáta" načíta SAA-01 a ďalšie vzorové workflow.',
  ] },
  { v: '2.7.1', date: '6. 7. 2026', tag: 'ui', items: [
    'Plánovanie výroby → Gantt: skryté karty „🤖 AI analýza plánu" a „✨ AI optimalizácia" (pohľad premenovaný na 📊 Gantt).',
  ] },
  { v: '2.7.0', date: '6. 7. 2026', tag: 'ui', items: [
    'Plánovanie výroby: panel „Meškajúce zákazky" je rozbaľovací — klik na hlavičku skryje/zobrazí zoznam (predvolene zbalený, stav sa pamätá). Počet meškajúcich vidno aj v zbalenom stave.',
  ] },
  { v: '2.6.1', date: '6. 7. 2026', tag: 'fix', items: [
    'Okno so zoznamom objednávok (po kliknutí na KPI dlaždicu) má tmavé pozadie so svetlým, čitateľným textom (predtým svetlý text na svetlom = neviditeľný).',
  ] },
  { v: '2.6.0', date: '6. 7. 2026', tag: 'feat', items: [
    'Plánovanie výroby: KPI dlaždice (Aktívne zákazky, Meškajú, Do expedície ≤ 7 dní, Vo výrobe, Kalibračné listy) sú klikateľné — otvoria okno so zoznamom konkrétnych objednávok; klik na riadok otvorí detail.',
    'Odstránená sekcia „Vyťaženie pracovísk / liniek".',
  ] },
  { v: '2.5.2', date: '6. 7. 2026', tag: 'fix', items: [
    'Kalendár (týždeň/deň): udalosť má obsah pod sebou v troch riadkoch — čas, popis (zalomí sa po slovách), meno používateľa.',
    'Opravený vizuálny artefakt „preškrtnutého času" — hodinová čiara mriežky sa už nekreslí cez text udalosti (udalosti sú nad mriežkou).',
  ] },
  { v: '2.5.1', date: '6. 7. 2026', tag: 'fix', items: [
    'Plánovanie výroby: doplnené tlačidlo „🎲 Ukážkové dáta" v hlavičke stránky (predtým funkcia existovala, ale chýbalo tlačidlo na jej spustenie).',
  ] },
  { v: '2.5.0', date: '6. 7. 2026', tag: 'feat', items: [
    'Plánovanie výroby: kalibračné listy k expedovaným objednávkam sú teraz prehľadná tabuľka hneď navrchu — objednávka, produkt, zákazník, množstvo, dátum expedície, stav kalibračného listu, obchodník a tlačidlo „odoslané". Filter „Všetky expedované / Len neodoslané".',
    'Kalendár (týždeň/deň): čitateľnejšie bloky — 1. riadok čas + názov (zalomí sa po slovách), pod tým meno používateľa; text sa už neláme po písmenách.',
    'Nové/rozšírené ukážkové dáta výroby — viac expedovaných objednávok s kalibračnými listami (časť odoslaná, časť čaká).',
  ] },
  { v: '2.4.1', date: '6. 7. 2026', tag: 'ui', items: [
    'Kalendár (týždeň/deň): pri dlhých názvoch sa blok udalosti natiahne a text sa zalomí — vidno celý názov aj priezvisko, nič sa neoreže.',
  ] },
  { v: '2.4.0', date: '6. 7. 2026', tag: 'ui', items: [
    'Kalendár: priezviská vlastníkov zvýraznené červenou vo všetkých pohľadoch a motívoch.',
    'Týždeň je predvolený pohľad; pracovné hodiny (7–19) predvolene zapnuté; väčšie bloky udalostí, vyššie riadky hodín, väčšie hlavičky dní — optimalizované pre týždňové zobrazenie. Pohľad, zoom aj prac. hodiny sa pamätajú.',
    'Modrý/svetlý motív: opravený neviditeľný prepínač Mesiac/Týždeň/Deň a slabo čitateľná hodinová os.',
  ] },
  { v: '2.3.0', date: '6. 7. 2026', tag: 'feat', items: [
    'Kalendár: prepínateľné motívy — 🌙 Tmavý (pôvodný), ☀️ Svetlý (čistý biely v štýle RON — udalosti ako podfarbené bloky s farebným rámom) a 🔷 Modrý (svetlý s modrými hlavičkami). Voľba sa pamätá.',
  ] },
  { v: '2.2.0', date: '6. 7. 2026', tag: 'ui', items: [
    'Kalendár: pri každej udalosti z napojeného kalendára sa zobrazuje priezvisko vlastníka (z názvu zdroja) — v mesačnom, týždennom aj dennom pohľade, aj na viacdňových pruhoch (dovolenka a pod.).',
    'Zlúčené udalosti z viacerých kalendárov ukazujú priezviská všetkých (namiesto ×N).',
  ] },
  { v: '2.1.0', date: '6. 7. 2026', tag: 'fix', items: [
    'Hlavička: menu „🍽️ Jedlo" má správnu oranžovú farbu textu (predtým nečitateľné na tmavom pozadí).',
    'Fotky z výroby: v paneli označených fotiek pribudol rýchly výber „📂 Zaradiť do kategórie…" — označené fotky sa zaradia jedným klikom bez otvárania modalu.',
  ] },
  { v: '2.0.0', date: '6. 7. 2026', tag: 'major', items: [
    'Kalendár prerobený na zdrojovo-centrický: osoby odstránené, entitou sú napojené kalendáre (zdroje).',
    'Zdroje ako farebné prepínacie chipy nad kalendárom — klik zdroj zobrazí/skryje, dvojklik = iba tento zdroj; každý zdroj má vlastnú farbu a počet udalostí.',
    'Čistejšie udalosti — bez iniciálok pri každej položke (zdroj identifikuje farba + tooltip); zlúčené udalosti z viacerých kalendárov majú kompaktný počet ×N.',
    'Napojenie externých kalendárov zovšeobecnené: Outlook, RON (dochádzka), Google — čokoľvek s ICS/iCal odkazom, cez tlačidlo „🔗 Kalendáre".',
    'Z modalu udalosti odstránené pole „Osoba" — udalosť patrí kalendáru, nie menu.',
  ] },
  { v: '1.99.0', date: '6. 7. 2026', tag: 'feat', items: [
    'Plánovanie výroby: nový pohľad „📅 Kalendár expedície" — čo bolo/má byť expedované v daný deň, so súhrnom mesiaca.',
    'Kalibračné listy k expedovaným výrobkom: stav odoslané/neodoslané, priradenie obchodníka, dátum odoslania; panel, KPI a zvýraznenie v kalendári.',
    'Realistickejšie ukážkové dáta výroby (rozumné meškania 1–14 dní, reálne dátumy expedície).',
    'Fotky z výroby: režim označovania — hromadné mazanie a hromadná úprava (kategória, autor, tagy).',
    'Hlavička: obedy presunuté do samostatnej skupiny „🍽️ Jedlo" (Obed Sylex, Obed Fantozzi).',
  ] },
  { v: '1.98.0', date: '3. 7. 2026', tag: 'fix', items: [
    'Changelog: doplnené chýbajúce záznamy o novinkách za verzie 1.94–1.97 (predtým sa dvíhala len verzia v hlavičke, ale história zmien na tejto stránke sa neaktualizovala).',
  ] },
  { v: '1.97.0', date: '3. 7. 2026', tag: 'feat', items: [
    'Pracovné postupy: pri vkladaní obrázka si vieš vybrať fotku priamo z galérie modulu Fotky (hľadanie + filter podľa kategórie/typu produktu) alebo nahrať novú z disku. Rovnaký výber platí aj pre datasheety a prototypy.',
  ] },
  { v: '1.96.0', date: '3. 7. 2026', tag: 'feat', items: [
    'Editor obrázkov pre postupy: do fotky vieš zakresliť kruhy, rámčeky, šípky, textové popisy a bubliny; nastaviteľná farba, hrúbka čiary a veľkosť písma. Anotácie sa zapečú priamo do obrázka.',
    'Editor sa otvorí pri vkladaní obrázka (dá sa preskočiť tlačidlom „Vložiť bez úprav") a cez ✎ pri existujúcich obrázkoch v datasheetoch a prototypoch.',
  ] },
  { v: '1.95.0', date: '3. 7. 2026', tag: 'fix', items: [
    'Oprava vzhľadu: stránky Fotky, GitHub a RustDesk mali nečitateľné svetlé texty na svetlom pozadí — zjednotené na tmavý vzhľad ako ostatné moduly.',
  ] },
  { v: '1.94.0', date: '3. 7. 2026', tag: 'major', items: [
    'Nový modul Fotky z výroby: galéria s kategóriami (typy produktov), tagmi, menom autora, konverziou fotiek (zmenšenie / JPEG / WebP), odkazom na sieťový folder a zdieľaním fotky.',
    'Nový modul GitHub: evidencia projektov/repozitárov tímu s odkazmi, hlavným jazykom, stavom a tagmi.',
    'Nový modul RustDesk: zoznam vzdialených PC s ID/heslom (kopírovanie) a pripojením jedným klikom cez rustdesk:// odkaz.',
  ] },
  { v: '1.78.0', date: '18. 6. 2026', tag: 'ui', items: [
    'Plánovanie výroby → Zoznam: hlavička skupiny ukazuje „Zákazka č. XXX" a pod ňou „XX QTY" (spolu kusov). Do vnoreného gridu idú teraz aj zákazky s jedinou objednávkou (rovnaký vzhľad). Pod-objednávky sú farebne odlíšené (tyrkysový nádych).',
  ] },
  { v: '1.77.0', date: '18. 6. 2026', tag: 'feat', items: [
    'Plánovanie výroby → Zoznam: vnorený (nested) datagrid — zákazky zoskupené podľa objednávky; rozbalením vidíš jednotlivé pod-objednávky (IO/výrobky). Súhrnný riadok ukazuje počet položiek, spolu množstvo, najbližšiu expedíciu a najhorší termín.',
  ] },
  { v: '1.76.0', date: '16. 6. 2026', tag: 'ui', items: [
    'Gantt výroby: horizontálny scrollbar aj navrchu (synchronizovaný s plátnom) — netreba scrollovať dole, aby si posunul časovú os.',
  ] },
  { v: '1.75.0', date: '16. 6. 2026', tag: 'feat', items: [
    'Plánovanie výroby: import reálnych objednávok z exportu IO (tlačidlo „📥 Import objednávok (IO)" — zmaže všetko a nahradí 312 objednávkami).',
    'Dôraz na termíny: KPI „⚠ Meškajú" a „Do expedície ≤ 7 dní"; panel meškajúcich zákaziek hneď navrchu s počtom dní po termíne a poľom na zápis dôvodu meškania.',
    'Zoznam: stĺpec „Do expedície" (dni do/po termíne, farebne), meškajúce navrch a zvýraznené; termín = dátum expedície.',
  ] },
  { v: '1.74.0', date: '15. 6. 2026', tag: 'feat', items: [
    'Zoznam projektov: sofistikované filtre nad stĺpcami — text (projekt/kód), stav, stupeň predaja, stupeň vývoja, výstupy, vlastník a termín (po termíne / tento mesiac / s termínom / bez termínu). Počítadlo aktívnych filtrov + rýchle zrušenie.',
  ] },
  { v: '1.73.0', date: '15. 6. 2026', tag: 'ui', items: [
    'Kalendár: lišta filtrov aj hlavička dní (Po–Ne / dni v týždni) sú teraz ukotvené (sticky) — pri scrolovaní stále vidíš, ktoré dni sú v stĺpcoch a ako filtrovať.',
  ] },
  { v: '1.72.0', date: '15. 6. 2026', tag: 'feat', items: [
    'Backbone: interaktívne editovanie trasy káblov — ťahaním kábla myšou pridáš ohyb, ťahaním bodu ho posunieš, dvojklik bod odstráni.',
    'Backbone: rohy trás sú zaoblené (90° → oblúk) pre čistejší vzhľad; v paneli kábla pribudlo „Vyrovnať trasu".',
  ] },
  { v: '1.71.0', date: '15. 6. 2026', tag: 'feat', items: [
    'Backbone: FBG senzory podľa meranej veličiny — farebne odlíšené s ikonou (teplota, pnutie/strain, akcelerometer, posun/konvergencia, náklon/inklinometer, tlak/piezometer).',
    'Backbone: legenda na plátne (aj v PNG exporte) a súhrnný panel projektu — počet zariadení, FBG senzorov, dĺžka kábla a prehľad meraných veličín.',
    'Backbone: nové ukážkové projekty pre zákazníka — Most (SHM), Tunel (geotechnika) a Oporný múr (stabilita svahu) s WDM kanálmi a vlnovými dĺžkami.',
  ] },
  { v: '1.70.0', date: '15. 6. 2026', tag: 'ui', items: [
    'Zoznam projektov: stav projektu má teraz samostatný stĺpec.',
  ] },
  { v: '1.69.0', date: '15. 6. 2026', tag: 'feat', items: [
    'Backbone: S-line zariadenia prekreslené podľa oficiálneho katalógu Sylex — zelené telo, čierny panel, ozubené koliesko a biele FC porty.',
    'Nový katalóg objektov: S-line Scan 800, S-line Comp, Splitter 1×4 / 1×8 / 4×16 / 4×32 a Switch 1×4 / 1×8 / 4×16 / 4×32 (viacvstupové majú vstupné porty vľavo a mriežku výstupov vpravo).',
  ] },
  { v: '1.68.0', date: '15. 6. 2026', tag: 'feat', items: [
    'Stav projektu (Aktívny / Pozastavený / Dokončený / Zrušený) — nastaviteľný v detaile, zobrazený ako farebný odznak v detaile aj v zozname.',
  ] },
  { v: '1.67.0', date: '15. 6. 2026', tag: 'feat', items: [
    'Backbone: obojsmerný tok signálu — okrem dopredného (širokopásmového) svetla z interrogátora do zariadenia putuje po kábli aj odrazený (reflektovaný λB) signál späť do interrogátora (modré fotóny a protismerné čiarkovanie).',
  ] },
  { v: '1.66.1', date: '15. 6. 2026', tag: 'ui', items: [
    'Workflow chevrony: výraznejší hover — zdvih, zväčšenie a žiara.',
  ] },
  { v: '1.66.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Detail projektu: komentáre / záznamy zmien samostatne pre Predaj, Vývoj a Výstupy — s autorom a časom, okamžité uloženie a mazanie.',
  ] },
  { v: '1.65.2', date: '14. 6. 2026', tag: 'ui', items: [
    'Workflow: zrušené označenie prvého/posledného stupňa; aktuálny (posledný dosiahnutý) stav je teraz zvýraznený pulzujúcim červeným neónom.',
  ] },
  { v: '1.65.0', date: '14. 6. 2026', tag: 'ui', items: [
    'Workflow: prvý stupeň (štart) odlíšený, posledný (cieľ) odlíšený; aktuálny stav zvýraznený.',
  ] },
  { v: '1.64.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Workflow sa dá meniť priamo v zozname Vývoj výrobkov — klik na stupeň (predaj aj vývoj) ho označí/odznačí ako hotový, hneď sa uloží (nie len v detaile).',
  ] },
  { v: '1.63.1', date: '14. 6. 2026', tag: 'ui', items: [
    'Workflow chevrony vrátené na predošlý (jednoduchší) dizajn.',
  ] },
  { v: '1.62.0', date: '14. 6. 2026', tag: 'feat', items: [
    'Admin → „Workflow projektov": editovateľné stupne predajného aj vývojového procesu a zoznam štandardných výstupov (názov + skratka).',
    'Konfigurácia sa ukladá na server a aplikuje do celého modulu Vývoj výrobkov; existujúce projekty si zachovajú dáta podľa kľúčov.',
  ] },
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
  chore: { l: 'Údržba', c: '#94a3b8' },
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
        <ul class="cl-items">${e.items.map(x => `<li>${x}</li>`).join('')}</ul>
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
let taskTagFilter = '';
let taskSortKey = 'priority';
let taskSortDir = -1;
let taskView = 'grid';
let taskGroup = true;   // zoskupiť podľa projektu + zákazníka
let taskCollapsedIds = new Set();  // ID zbalených úloh v zoznamovom pohľade (skryté detaily)
let _dragTaskId = null;
let tkSubtasks = [];   // pracovná kópia podúloh v modale
const TK_PRIO = {
  low:      { l: 'Nízka',     c: '#64748b', rank: 1 },
  normal:   { l: 'Normálna',  c: '#3b82f6', rank: 2 },
  high:     { l: 'Vysoká',    c: '#ef4444', rank: 3 },
  critical: { l: 'Kritická',  c: '#b91c1c', rank: 4 }
};
const TK_STATUS = [
  { key: 'todo', label: 'Čaká' }, { key: 'inprogress', label: 'Prebieha' }, { key: 'blocked', label: 'Blokované' },
  { key: 'review', label: 'Na kontrolu' }, { key: 'done', label: 'Hotové' }, { key: 'cancelled', label: 'Zrušené' }
];
const TK_STATUS_LABEL = Object.fromEntries(TK_STATUS.map(s => [s.key, s.label]));
function taskStatusOf(t) { return t.status || (t.done ? 'done' : 'todo'); }
// Úloha čaká na nesplnené závislosti (iné úlohy, ktoré ešte nie sú hotové)
function taskUnmetDeps(t) {
  if (!t.dependsOn || !t.dependsOn.length) return [];
  return t.dependsOn.map(id => tasksData.find(x => x._id === (id._id || id))).filter(d => d && d.status !== 'done');
}
// Hĺbka úlohy v hierarchii (0 = koreňová) — podľa reťazca "parent", s ochranou proti cyklu
const TASK_MAX_DEPTH = 6;
function taskDepth(t) {
  let depth = 0, cur = t, seen = new Set();
  while (cur && cur.parent && depth < TASK_MAX_DEPTH) {
    const parentId = cur.parent._id || cur.parent;
    if (seen.has(parentId)) break;
    seen.add(parentId);
    cur = tasksData.find(x => x._id === parentId);
    if (!cur) break;
    depth++;
  }
  return depth;
}

async function loadTasks() {
  const sub = document.getElementById('tasksSub');
  if (sub && CURRENT_USER) sub.textContent = 'Osobný zoznam úloh — ' + (CURRENT_USER.name || CURRENT_USER.username);
  try { tasksData = await fetch('/api/tasks').then(r => r.json()); if (!Array.isArray(tasksData)) tasksData = []; }
  catch { tasksData = []; }
  await fillTaskDatalists();
  if (!taskUsers.length) await loadTaskUsers();
  fillTaskTagFilter();
  renderTaskProgress();
  renderTaskTodayTomorrow();
  renderTasks();
  syncTasksStickyOffset();
}
// Zarovná sticky hlavičku Grid tabuľky (thead) presne pod zmrazenú lištu
// (proc-hdr + toolbar), ktorej výška sa mení podľa obsahu (zalomenie filtrov
// na užších obrazovkách). Nastavuje sa priamo inline štýlom (synchrónne),
// aby nedochádzalo k pretekaniu s výpočtom position:sticky v prehliadači.
function syncTasksStickyOffset() {
  const hdr = document.getElementById('tasksStickyHdr');
  const thead = document.querySelector('#tasksGrid .task-grid thead');
  if (!hdr || !thead) return;
  const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 58;
  thead.style.top = Math.ceil(headerH + hdr.offsetHeight) + 'px';
}
window.addEventListener('resize', () => { if (document.getElementById('page-tasks')?.classList.contains('active')) syncTasksStickyOffset(); });

const TK_PREVIEW_ICONS = {
  missed: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  today:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  tomorrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>'
};
// Rýchly prehľad úloh — zmeškané (po termíne), dnes, zajtra
function renderTaskTodayTomorrow() {
  const el = document.getElementById('tasksTodayTomorrow'); if (!el) return;
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const todayKey = calYmd(today), tomorrowKey = calYmd(tomorrow);
  const open = tasksData.filter(t => !t.done && t.status !== 'cancelled' && t.due);
  const missedTasks = open.filter(t => String(t.due).slice(0, 10) < todayKey);
  const todayTasks = open.filter(t => String(t.due).slice(0, 10) === todayKey);
  const tomorrowTasks = open.filter(t => String(t.due).slice(0, 10) === tomorrowKey);
  if (!missedTasks.length && !todayTasks.length && !tomorrowTasks.length) { el.innerHTML = ''; el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const item = (t, missed) => `
    <div class="tk-preview-item" onclick="openTaskModal(tasksData.find(x=>x._id==='${t._id}'))">
      <span class="tk-preview-prio" style="--prio:${(TK_PRIO[t.priority] || TK_PRIO.normal).c}"></span>
      <span class="tk-preview-title">${escHtml(t.title)}</span>
      ${missed ? `<span class="tk-preview-due">${escHtml(String(t.due).slice(0, 10).split('-').reverse().join('.'))}</span>
        <button class="tk-postpone-btn" title="Posunúť termín o 1 deň" onclick="event.stopPropagation(); postponeTask('${t._id}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="13 17 18 12 13 7"/><line x1="6" y1="12" x2="18" y2="12"/></svg>
          +1 deň
        </button>` : (t.assignedTo ? `<span class="tk-preview-assignee">👁 ${escHtml(t.assignedTo.name || t.assignedTo.username || '')}</span>` : '')}
    </div>`;
  const col = (label, iconKey, list, missed) => `
    <div class="tk-preview-col ${missed ? 'tk-preview-missed' : ''}">
      <div class="tk-preview-hdr">${TK_PREVIEW_ICONS[iconKey]} ${label} <span class="tk-preview-count">${list.length}</span></div>
      ${list.length ? list.map(t => item(t, missed)).join('') : `<div class="tk-preview-empty">Žiadne úlohy</div>`}
    </div>`;
  el.innerHTML = (missedTasks.length ? col('Zmeškané', 'missed', missedTasks, true) : '')
    + col('Dnes', 'today', todayTasks, false) + col('Zajtra', 'tomorrow', tomorrowTasks, false);
}
// Posunie termín úlohy o 1 deň dopredu (rýchla akcia pri zmeškaných úlohách)
async function postponeTask(id) {
  try {
    const resp = await fetch('/api/tasks/' + id + '/postpone', { method: 'PUT' });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); toast('Chyba: ' + (er.error || resp.status), 'error'); return; }
    toast('Termín posunutý o 1 deň.', 'success');
    loadTasks(); loadNotif();
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
// Používatelia Dashboardu — ponuka pre pole Zadávateľ
let taskUsers = [];
async function loadTaskUsers() {
  try { taskUsers = await fetch('/api/users/options').then(r => r.json()); if (!Array.isArray(taskUsers)) taskUsers = []; }
  catch { taskUsers = []; }
}
// Číselník projektov a zákazníkov (perzistuje aj po vymazaní úloh, ktoré ich používali)
let taskCatalog = { customers: [], projects: [] };
async function fillTaskDatalists() {
  try { taskCatalog = await fetch('/api/tasks/catalog').then(r => r.json()); }
  catch { taskCatalog = { customers: [], projects: [] }; }
}
// Naplní rozbaľovacie pole existujúcimi hodnotami číselníka + voľbou "Pridať nový"
function renderTaskCatalogSelect(baseId, list, current) {
  const sel = document.getElementById(baseId); if (!sel) return;
  const opts = [...new Set(list || [])];
  if (current && !opts.some(x => x.toLowerCase() === current.toLowerCase())) opts.push(current);
  opts.sort((a, b) => a.localeCompare(b, 'sk'));
  const curMatch = opts.find(x => x.toLowerCase() === (current || '').toLowerCase()) || '';
  sel.innerHTML = '<option value="">— žiadny —</option>'
    + opts.map(x => `<option value="${escHtml(x)}" ${x === curMatch ? 'selected' : ''}>${escHtml(x)}</option>`).join('')
    + '<option value="__new__">+ Pridať nový…</option>';
  const newInp = document.getElementById(baseId + 'New');
  if (newInp) { newInp.classList.add('hidden'); newInp.value = ''; }
}
function taskCatalogSelectChange(baseId) {
  const sel = document.getElementById(baseId);
  const newInp = document.getElementById(baseId + 'New');
  if (sel.value === '__new__') { newInp.classList.remove('hidden'); newInp.value = ''; newInp.focus(); }
  else { newInp.classList.add('hidden'); newInp.value = ''; }
}
// Vráti aktuálnu hodnotu poľa (vybranú z číselníka alebo novo zadanú)
function taskCatalogValue(baseId) {
  const sel = document.getElementById(baseId);
  if (sel.value === '__new__') return (document.getElementById(baseId + 'New').value || '').trim();
  return sel.value;
}
// Filter podľa tagu — ponuka všetkých použitých tagov
function fillTaskTagFilter() {
  const sel = document.getElementById('tkTagFilter'); if (!sel) return;
  const tags = [...new Set(tasksData.flatMap(t => t.tags || []))].sort((a, b) => a.localeCompare(b, 'sk'));
  sel.innerHTML = '<option value="">Všetky tagy</option>' + tags.map(x => `<option value="${escHtml(x)}">${escHtml(x)}</option>`).join('');
  sel.value = taskTagFilter;
}
function setTaskTagFilter(v) { taskTagFilter = v; renderTasks(); }
// Progres celého zoznamu úloh — X / Y dokončených (%)
function renderTaskProgress() {
  const el = document.getElementById('tasksProgress'); if (!el) return;
  const relevant = tasksData.filter(t => t.status !== 'cancelled');
  const done = relevant.filter(t => t.status === 'done').length;
  const total = relevant.length;
  if (!total) { el.innerHTML = ''; return; }
  const pct = Math.round(done / total * 100);
  el.innerHTML = `<div class="tasks-progress-track"><div class="tasks-progress-fill" style="width:${pct}%"></div></div><span class="tasks-progress-txt">${done} / ${total} dokončených — ${pct}%</span>`;
}
function toggleTaskGroup() {
  taskGroup = !taskGroup;
  document.getElementById('taskGroupBtn')?.classList.toggle('active', taskGroup);
  renderTasks();
}
// Zbaľovanie/rozbaľovanie úloh v zoznamovom pohľade (skryje detaily — progres, poznámku, popis, podúlohy)
function taskHasCollapsibleBody(t) {
  return !!(t.note || t.description || (t.subtasks && t.subtasks.length) || t.progress || taskStatusOf(t) === 'inprogress');
}
function toggleTaskCollapse(id, ev) {
  if (ev) ev.stopPropagation();
  if (taskCollapsedIds.has(id)) taskCollapsedIds.delete(id); else taskCollapsedIds.add(id);
  renderTasks();
}
function collapseAllTasks() {
  if (taskView === 'grid') { collapseAllTaskGrid(); return; }  // grid: zbaliť skupiny
  tasksData.forEach(t => { if (taskHasCollapsibleBody(t)) taskCollapsedIds.add(t._id); });
  renderTasks();
}
function expandAllTasks() {
  if (taskView === 'grid') { taskGridCollapsed.clear(); renderTaskGridBody(); return; }  // grid: rozbaliť skupiny
  taskCollapsedIds.clear();
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
  document.getElementById('taskGroupBtn')?.classList.toggle('hidden', v !== 'list');
  document.getElementById('taskCollapseBtns')?.classList.toggle('hidden', v === 'kanban');
  document.querySelector('.tasks-inner')?.classList.toggle('tasks-wide', v === 'kanban' || v === 'grid');
  renderTasks();
}
function taskOverdue(t) { return !t.done && t.due && new Date(t.due) < new Date(new Date().toDateString()); }

// ── Spoločné kúsky kartičiek ──────────────────────────────────────────────────
function taskChipsHtml(t) {
  const chips = [];
  if (t.project)  chips.push(`<span class="task-chip task-chip-pj">🗂️ ${escHtml(t.project)}</span>`);
  if (t.customer) chips.push(`<span class="task-chip task-chip-cust">🏢 ${escHtml(t.customer)}</span>`);
  const parentId = t.parent && (t.parent._id || t.parent);
  const parent = parentId ? tasksData.find(x => x._id === parentId) : null;
  if (parent) chips.push(`<span class="task-chip task-chip-parent">⬆ ${escHtml(parent.title)}</span>`);
  if (t.readOnly) chips.push(`<span class="task-chip task-chip-readonly" title="Zadal(a): ${escHtml(t.user?.name || t.user?.username || '')}">👁 len na čítanie</span>`);
  else if (t.assignedTo) chips.push(`<span class="task-chip task-chip-assignee">👁 ${escHtml(t.assignedTo.name || t.assignedTo.username || '')}</span>`);
  (t.tags || []).forEach(tag => chips.push(`<span class="task-chip task-chip-tag">#${escHtml(tag)}</span>`));
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
  const unmet = taskUnmetDeps(t);
  if (unmet.length) parts.push(`<span class="task-depbadge" title="${escHtml(unmet.map(d => d.title).join(', '))}">⛔ čaká na ${unmet.length} závislosť(i)</span>`);
  if (t.createdAt) parts.push(`<span class="task-created" title="Dátum pridania">➕ ${fmtDate(t.createdAt)}</span>`);
  return `<div class="task-meta">${parts.join('')}</div>`;
}

// Inline checklist podúloh (zoznamový pohľad) — klik prepína stav
function taskSubInlineHtml(t) {
  if (!t.subtasks || !t.subtasks.length) return '';
  const ro = !!t.readOnly;
  return `<div class="task-sub-inline" onclick="event.stopPropagation()">${t.subtasks.map(s => `
    <label class="task-sub-il ${s.done ? 'done' : ''}">
      <input type="checkbox" ${s.done ? 'checked' : ''} ${ro ? 'disabled' : `onclick="event.stopPropagation();toggleSubtaskInline('${t._id}','${s._id}')"`}>
      <span>${escHtml(s.title)}</span>
    </label>`).join('')}</div>`;
}

function renderTasks() {
  const listEl = document.getElementById('tasksList');
  const kanbanEl = document.getElementById('tasksKanban');
  const gridEl = document.getElementById('tasksGrid');
  if (!listEl || !kanbanEl || !gridEl) return;
  listEl.classList.add('hidden'); kanbanEl.classList.add('hidden'); gridEl.classList.add('hidden');
  if (taskView === 'kanban') { kanbanEl.classList.remove('hidden'); renderTaskKanban(); }
  else if (taskView === 'grid') { gridEl.classList.remove('hidden'); renderTaskGrid(); }
  else { listEl.classList.remove('hidden'); renderTaskList(); }
}

// Vnútro riadka úlohy (zdieľané pre plochý aj zoskupený pohľad)
function taskRowClass(t) { return 'task-row' + (t.done ? ' task-done' : '') + (t.status === 'cancelled' ? ' task-cancelled' : '') + (taskOverdue(t) ? ' task-overdue' : '') + (taskCollapsedIds.has(t._id) ? ' task-collapsed' : ''); }
// Celý riadok sa posunie doprava podľa hĺbky hierarchie (--prio + margin-left)
function taskRowStyle(t) {
  const depth = taskDepth(t);
  const prio = (TK_PRIO[t.priority] || TK_PRIO.normal).c;
  const indent = depth * 26;
  return `--prio:${prio}${indent ? `;margin-left:${indent}px;width:calc(100% - ${indent}px)` : ''}`;
}
function taskRowInner(t, withGrip) {
  const depth = taskDepth(t);
  const ro = !!t.readOnly;
  return `
      ${withGrip && !ro ? '<span class="task-grip" title="Potiahni na zmenu poradia">⠿</span>' : '<span class="task-grip task-grip-off">•</span>'}
      ${taskHasCollapsibleBody(t) ? `<button class="task-collapse-btn" onclick="toggleTaskCollapse('${t._id}', event)" title="${taskCollapsedIds.has(t._id) ? 'Rozbaliť' : 'Zbaliť'}">${taskCollapsedIds.has(t._id) ? '▸' : '▾'}</button>` : '<span class="task-collapse-btn task-collapse-off"></span>'}
      <button class="task-check" ${ro ? 'disabled title="Len na čítanie"' : `onclick="toggleTask('${t._id}', ${t.done ? 'false' : 'true'})" title="${t.done ? 'Označiť ako nehotové' : 'Označiť ako hotové'}"`}>${t.done ? '✓' : ''}</button>
      <div class="task-body" onclick="openTaskModal(tasksData.find(x=>x._id==='${t._id}'))">
        <div class="task-title">${depth ? '<span class="task-tree-indent">↳</span>' : ''}${escHtml(t.title)}</div>
        ${taskChipsHtml(t)}
        ${taskMetaHtml(t)}
        ${(t.progress || taskStatusOf(t) === 'inprogress' || (t.subtasks && t.subtasks.length)) ? taskProgressHtml(t) : ''}
        ${t.note ? `<div class="task-note">📝 ${escHtml(t.note)}</div>` : ''}
        ${t.description ? `<div class="task-desc">${escHtml(t.description)}</div>` : ''}
        ${taskSubInlineHtml(t)}
      </div>
      ${ro ? '' : `<button class="admin-icon-btn danger" onclick="deleteTask('${t._id}')" title="Odstrániť">✕</button>`}`;
}

function renderTaskList() {
  const el = document.getElementById('tasksList'); if (!el) return;
  let items = tasksData.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  if (taskFilter === 'open') items = items.filter(t => !t.done && t.status !== 'cancelled');
  else if (taskFilter === 'done') items = items.filter(t => t.done);
  if (taskTagFilter) items = items.filter(t => (t.tags || []).includes(taskTagFilter));
  el.ondragover = null; el.ondrop = null;
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne úlohy v tomto filtri.</div>'; return; }

  if (taskGroup) { renderTaskListGrouped(el, items); return; }

  // plochý pohľad + drag&drop preusporiadanie
  el.innerHTML = '';
  items.forEach(t => {
    const row = document.createElement('div');
    row.className = taskRowClass(t);
    row.style.cssText = taskRowStyle(t);
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
      .map(t => `<div class="${taskRowClass(t)}" style="${taskRowStyle(t)}" data-tid="${t._id}">${taskRowInner(t, false)}</div>`).join('');
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
    const items = tasksData.filter(t => taskStatusOf(t) === col.key && (!taskTagFilter || (t.tags || []).includes(taskTagFilter))).sort((a, b) => (a.order || 0) - (b.order || 0));
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
  const ro = !!t.readOnly;
  card.className = 'kanban-card task-kanban-card' + (od ? ' task-overdue' : '') + (t.status === 'cancelled' ? ' task-cancelled' : '');
  card.style.setProperty('--prio', prio.c);
  card.draggable = !ro;
  card.dataset.tid = t._id;
  if (!ro) {
    card.addEventListener('dragstart', (e) => { _dragTaskId = t._id; card.classList.add('kanban-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', t._id); } catch (_) {} });
    card.addEventListener('dragend', () => { _dragTaskId = null; card.classList.remove('kanban-dragging'); document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('kanban-col-drop')); });
  }
  card.innerHTML = `
    <div class="kanban-card-top" onclick="openTaskModal(tasksData.find(x=>x._id==='${t._id}'))">
      <span class="kanban-card-title">${ro ? '' : '<span class="kanban-grip" title="Potiahni">⠿</span>'}${escHtml(t.title)}</span>
    </div>
    ${taskChipsHtml(t)}
    ${taskProgressHtml(t)}
    ${taskMetaHtml(t)}
    ${t.note ? `<div class="task-note">📝 ${escHtml(t.note)}</div>` : ''}
    ${taskSubInlineHtml(t)}
    <div class="kanban-card-actions">
      <span class="task-prio" style="color:${prio.c}">${prio.l}</span>
      ${ro ? '' : `<button onclick="deleteTask('${t._id}')" title="Odstrániť">✕</button>`}
    </div>`;
  return card;
}

// ── Grid (tabuľkový) pohľad ────────────────────────────────────────────────────
const TASK_GRID_COLS = [
  { key: 'title', label: 'Názov', filter: 'text' },
  { key: 'status', label: 'Stav', filter: 'status' },
  { key: 'priority', label: 'Priorita', filter: 'priority' },
  { key: 'project', label: 'Projekt', filter: 'text' },
  { key: 'customer', label: 'Zákazník', filter: 'text' },
  { key: 'due', label: 'Termín', filter: 'text' },
  { key: 'tags', label: 'Tagy', filter: 'text' },
  { key: 'progress', label: 'Progres', filter: null },
  { key: 'lastUpdate', label: 'Aktualizácia', filter: 'text' }
];
let taskGridColFilters = { title: '', status: '', priority: '', project: '', customer: '', due: '', tags: '', lastUpdate: '' };
function setTaskSort(key) {
  if (taskSortKey === key) taskSortDir = -taskSortDir;
  else { taskSortKey = key; taskSortDir = 1; }
  renderTaskGrid();
}
function setTaskGridColFilter(key, val) {
  taskGridColFilters[key] = val;
  renderTaskGridBody();
}
function taskGridSortVal(t, key) {
  switch (key) {
    case 'status': return TK_STATUS_LABEL[taskStatusOf(t)] || '';
    case 'priority': return (TK_PRIO[t.priority] || TK_PRIO.normal).rank;
    case 'due': return t.due ? new Date(t.due).getTime() : -Infinity;
    case 'tags': return (t.tags || []).join(',');
    case 'progress': return t.progress || 0;
    case 'order': return t.order || 0;
    case 'lastUpdate': { const lu = taskLatestUpdate(t); return lu ? new Date(lu.createdAt).getTime() : -Infinity; }
    default: return (t[key] || '').toString().toLowerCase();
  }
}
// Vyfiltrované + zoradené úlohy pre grid (globálne filtre + filtre stĺpcov)
function taskGridItems() {
  let items = tasksData.slice();
  if (taskFilter === 'open') items = items.filter(t => !t.done && t.status !== 'cancelled');
  else if (taskFilter === 'done') items = items.filter(t => t.done);
  if (taskTagFilter) items = items.filter(t => (t.tags || []).includes(taskTagFilter));
  const f = taskGridColFilters;
  if (f.title) items = items.filter(t => (t.title || '').toLowerCase().includes(f.title.toLowerCase()));
  if (f.status) items = items.filter(t => taskStatusOf(t) === f.status);
  if (f.priority) items = items.filter(t => (t.priority || 'normal') === f.priority);
  if (f.project) items = items.filter(t => (t.project || '').toLowerCase().includes(f.project.toLowerCase()));
  if (f.customer) items = items.filter(t => (t.customer || '').toLowerCase().includes(f.customer.toLowerCase()));
  if (f.due) items = items.filter(t => t.due && fmtDate(t.due).toLowerCase().includes(f.due.toLowerCase()));
  if (f.tags) items = items.filter(t => (t.tags || []).some(tag => tag.toLowerCase().includes(f.tags.toLowerCase())));
  if (f.lastUpdate) items = items.filter(t => { const lu = taskLatestUpdate(t); return lu && (lu.text || '').toLowerCase().includes(f.lastUpdate.toLowerCase()); });
  items.sort((a, b) => {
    const av = taskGridSortVal(a, taskSortKey), bv = taskGridSortVal(b, taskSortKey);
    if (av < bv) return -taskSortDir; if (av > bv) return taskSortDir; return 0;
  });
  return items;
}
function taskGridFilterCellHtml(c) {
  if (c.filter === 'status') {
    return `<select onchange="setTaskGridColFilter('status', this.value)"><option value="">Všetky</option>${TK_STATUS.map(s => `<option value="${s.key}" ${taskGridColFilters.status === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}</select>`;
  }
  if (c.filter === 'priority') {
    return `<select onchange="setTaskGridColFilter('priority', this.value)"><option value="">Všetky</option>${Object.entries(TK_PRIO).map(([k, p]) => `<option value="${k}" ${taskGridColFilters.priority === k ? 'selected' : ''}>${p.l}</option>`).join('')}</select>`;
  }
  if (c.filter === 'text') {
    return `<input type="text" placeholder="Filter…" value="${escHtml(taskGridColFilters[c.key] || '')}" oninput="setTaskGridColFilter('${c.key}', this.value)">`;
  }
  return '';
}
// Postaví kostru tabuľky (hlavička + riadok filtrov) — volá sa len raz pri prepnutí na grid
function buildTaskGridSkeleton(el) {
  const thead = TASK_GRID_COLS.map(c => {
    const active = taskSortKey === c.key;
    const arrow = active ? (taskSortDir === 1 ? '▲' : '▼') : '';
    return `<th onclick="setTaskSort('${c.key}')" class="${active ? 'task-grid-sorted' : ''}" data-key="${c.key}">${c.label} <span class="task-grid-arrow">${arrow}</span></th>`;
  }).join('');
  const filterRow = TASK_GRID_COLS.map(c => `<th class="task-grid-filtercell">${taskGridFilterCellHtml(c)}</th>`).join('');
  el.innerHTML = `<table class="task-grid"><thead><tr>${thead}</tr><tr class="task-grid-filterrow">${filterRow}</tr></thead><tbody id="tasksGridTbody"></tbody></table>`;
}
// Aktualizuje len šípky triedenia v hlavičke (bez straty fokusu vo filtroch)
function updateTaskGridHeader(el) {
  el.querySelectorAll('thead th[data-key]').forEach(th => {
    const key = th.dataset.key;
    const active = taskSortKey === key;
    th.classList.toggle('task-grid-sorted', active);
    const arrow = th.querySelector('.task-grid-arrow');
    if (arrow) arrow.textContent = active ? (taskSortDir === 1 ? '▲' : '▼') : '';
  });
}
function taskGridRowHtml(t, groupIndent) {
  const prio = TK_PRIO[t.priority] || TK_PRIO.normal;
  const od = taskOverdue(t);
  const depth = taskDepth(t);
  const indent = (groupIndent || 0) + depth * 18;
  const lu = taskLatestUpdate(t);
  const luText = lu ? (lu.text.length > 75 ? lu.text.slice(0, 75) + '…' : lu.text) : '';
  const rowCls = 'task-grid-row task-grid-prio-' + (t.priority || 'normal')
    + (t.done ? ' task-grid-done' : '') + (t.status === 'cancelled' ? ' task-grid-cancelled' : '') + (od ? ' task-grid-overdue' : '');
  return `<tr class="${rowCls}" onclick="openTaskModal(tasksData.find(x=>x._id==='${t._id}'))">
      <td class="task-grid-title"${indent ? ` style="padding-left:${12 + indent}px"` : ''}>${depth ? '<span class="task-tree-indent">↳</span>' : ''}${t.readOnly ? `<span class="task-chip task-chip-readonly" title="Zadal(a): ${escHtml(t.user?.name || t.user?.username || '')}">👁</span> ` : ''}${escHtml(t.title)}</td>
      <td><span class="task-grid-status task-grid-status-${taskStatusOf(t)}">${TK_STATUS_LABEL[taskStatusOf(t)] || ''}</span></td>
      <td><span class="task-prio" style="color:${prio.c}">${prio.l}</span></td>
      <td>${escHtml(t.project || '')}</td>
      <td>${escHtml(t.customer || '')}</td>
      <td class="${od ? 'task-od' : ''}">${t.due ? fmtDate(t.due) : ''}</td>
      <td>${(t.tags || []).map(tag => `<span class="task-chip task-chip-tag">#${escHtml(tag)}</span>`).join(' ')}</td>
      <td>${taskProgressHtml(t)}</td>
      <td class="task-grid-lastupd"${lu ? ` data-tooltip="${escHtml(lu.text)}"` : ''}>${lu ? `<div class="task-grid-lastupd-text">${escHtml(luText)}</div><div class="task-grid-lastupd-meta">${escHtml(lu.authorName || '')} · ${fmtDateTime(lu.createdAt)}</div>` : ''}</td>
    </tr>`;
}
// Kľúče zbalených skupín (2-úrovňové zoskupenie Zákazník → Projekt)
const TASK_GRID_NO_CUST = 'Bez zákazníka', TASK_GRID_NO_PROJ = 'Bez projektu';
let taskGridCollapsed = new Set();
function toggleTaskGridGroup(key) {
  if (taskGridCollapsed.has(key)) taskGridCollapsed.delete(key); else taskGridCollapsed.add(key);
  renderTaskGridBody();
}
// Zbaliť všetky skupiny v gride (na úrovni zákazníka — skryje všetky úlohy)
function collapseAllTaskGrid() {
  taskGridItems().forEach(t => {
    const cust = (t.customer || '').trim() || TASK_GRID_NO_CUST;
    taskGridCollapsed.add('c:' + cust);
  });
  renderTaskGridBody();
}
function taskGridGroupSort(keys, noneLabel) {
  return keys.sort((a, b) => (a === noneLabel ? 1 : b === noneLabel ? -1 : a.localeCompare(b, 'sk')));
}
function renderTaskGridBody() {
  const tbody = document.getElementById('tasksGridTbody'); if (!tbody) return;
  const items = taskGridItems();
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="${TASK_GRID_COLS.length}" class="proc-empty">Žiadne úlohy v tomto filtri.</td></tr>`; return; }

  // zoskupenie: Zákazník → Projekt (poradie úloh v rámci skupiny podľa aktívneho triedenia)
  const NO_CUST = TASK_GRID_NO_CUST, NO_PROJ = TASK_GRID_NO_PROJ;
  const custMap = new Map();
  items.forEach(t => {
    const cust = (t.customer || '').trim() || NO_CUST;
    const proj = (t.project || '').trim() || NO_PROJ;
    if (!custMap.has(cust)) custMap.set(cust, new Map());
    const projMap = custMap.get(cust);
    if (!projMap.has(proj)) projMap.set(proj, []);
    projMap.get(proj).push(t);
  });

  let html = '';
  taskGridGroupSort([...custMap.keys()], NO_CUST).forEach(cust => {
    const projMap = custMap.get(cust);
    const custKey = 'c:' + cust;
    const custTotal = [...projMap.values()].reduce((s, arr) => s + arr.length, 0);
    const custCollapsed = taskGridCollapsed.has(custKey);
    html += `<tr class="task-grid-group task-grid-group-cust" data-gkey="${escHtml(custKey)}">
      <td colspan="${TASK_GRID_COLS.length}"><span class="task-grid-group-arrow">${custCollapsed ? '▸' : '▾'}</span>🏢 ${escHtml(cust)} <span class="task-grid-group-count">${custTotal}</span></td>
    </tr>`;
    if (custCollapsed) return;
    taskGridGroupSort([...projMap.keys()], NO_PROJ).forEach(proj => {
      const arr = projMap.get(proj);
      const projKey = custKey + '|p:' + proj;
      const projCollapsed = taskGridCollapsed.has(projKey);
      html += `<tr class="task-grid-group task-grid-group-proj" data-gkey="${escHtml(projKey)}">
        <td colspan="${TASK_GRID_COLS.length}"><span class="task-grid-group-arrow">${projCollapsed ? '▸' : '▾'}</span>🗂️ ${escHtml(proj)} <span class="task-grid-group-count">${arr.length}</span></td>
      </tr>`;
      if (projCollapsed) return;
      arr.forEach(t => { html += taskGridRowHtml(t, 30); });
    });
  });
  tbody.innerHTML = html;
  tbody.querySelectorAll('.task-grid-group').forEach(row => {
    row.onclick = () => toggleTaskGridGroup(row.dataset.gkey);
  });
}
function renderTaskGrid() {
  const el = document.getElementById('tasksGrid'); if (!el) return;
  if (!el.querySelector('table.task-grid')) buildTaskGridSkeleton(el);
  else updateTaskGridHeader(el);
  renderTaskGridBody();
  syncTasksStickyOffset();
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
  const movedToDone = payload.some(p => p.status === 'done');
  try { await fetch('/api/tasks/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: payload }) }); }
  catch { /* ignore — re-render aj tak */ }
  // presun do "Hotové" môže byť serverom odmietnutý (nesplnené závislosti/podúlohy) — resynchronizuj zo servera
  if (movedToDone) loadTasks(); else renderTasks();
  loadNotif();
}

async function toggleTask(id, done) {
  try {
    const r = await fetch('/api/tasks/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); toast(er.error || 'Úlohu nemožno dokončiť', 'error'); return; }
    loadTasks(); loadNotif();
  } catch { toast('Chyba', 'error'); }
}
// Chipy Stav/Priorita v modale úlohy — klik rovno nastaví hodnotu skrytého
// inputu a zvýrazní aktívny chip (namiesto pôvodného <select>).
function setTkChip(fieldId, btnEl) {
  const val = btnEl.dataset.val;
  document.getElementById(fieldId).value = val;
  btnEl.parentElement.querySelectorAll('.tk-chip').forEach(b => b.classList.toggle('active', b === btnEl));
}
function setTkChipActive(groupId, val) {
  const group = document.getElementById(groupId); if (!group) return;
  group.querySelectorAll('.tk-chip').forEach(b => b.classList.toggle('active', b.dataset.val === val));
}
function openTaskModal(t = null) {
  const e = t && typeof t === 'object';
  const ro = !!(e && t.readOnly);
  document.getElementById('tkModalTitle').textContent = ro ? 'Úloha (len na čítanie)' : (e ? 'Upraviť úlohu' : 'Nová úloha');
  document.getElementById('tkId').value = e ? t._id : '';
  document.getElementById('tkTitle').value = e ? (t.title || '') : '';
  renderTaskCatalogSelect('tkProject', taskCatalog.projects, e ? (t.project || '') : '');
  renderTaskCatalogSelect('tkCustomer', taskCatalog.customers, e ? (t.customer || '') : '');
  document.getElementById('tkDue').value = e && t.due ? String(t.due).slice(0, 10) : '';
  document.getElementById('tkPriority').value = e ? (t.priority || 'normal') : 'normal';
  document.getElementById('tkStatus').value = e ? taskStatusOf(t) : 'todo';
  setTkChipActive('tkStatusChips', document.getElementById('tkStatus').value);
  setTkChipActive('tkPriorityChips', document.getElementById('tkPriority').value);
  const prog = e ? (t.progress || 0) : 0;
  document.getElementById('tkProgress').value = prog;
  document.getElementById('tkProgressVal').textContent = prog;
  document.getElementById('tkTags').value = e ? (t.tags || []).join(', ') : '';
  tkSubtasks = e && Array.isArray(t.subtasks) ? t.subtasks.map(s => ({ title: s.title, done: !!s.done })) : [];
  renderSubtaskEditor();
  fillTaskParentSelect(e ? t : null);
  fillTaskDependsSelect(e ? t : null);
  fillTaskAssigneeSelect(e ? t : null);
  renderTaskUpdateEditor(e ? t : null);

  const modal = document.getElementById('taskModal');
  modal.classList.toggle('tk-readonly', ro);
  const banner = document.getElementById('tkReadonlyBanner');
  banner.classList.toggle('hidden', !ro);
  if (ro) banner.textContent = `👁 Len na čítanie — zadal(a): ${t.user?.name || t.user?.username || 'neznámy'}`;
  document.getElementById('tkSaveBtn').style.display = ro ? 'none' : '';
  document.getElementById('tkDeleteBtn').style.display = (e && !ro) ? '' : 'none';
  document.getElementById('tkDuplicateBtn').style.display = e ? '' : 'none';

  modal.classList.remove('hidden');
  modalSnapshot('taskModal');
}
// Duplikovanie úlohy — otvorí formulár novej úlohy s predvyplneným
// zákazníkom a projektom z pôvodnej úlohy (ostatné polia ostávajú prázdne).
function duplicateTask() {
  const id = document.getElementById('tkId').value;
  const orig = tasksData.find(x => x._id === id);
  openTaskModal();
  if (orig) {
    renderTaskCatalogSelect('tkProject', taskCatalog.projects, orig.project || '');
    renderTaskCatalogSelect('tkCustomer', taskCatalog.customers, orig.customer || '');
  }
  document.getElementById('tkModalTitle').textContent = 'Nová úloha (duplikát)';
  modalSnapshot('taskModal');
  document.getElementById('tkTitle').focus();
  toast('Nová úloha — zákazník a projekt predvyplnené z pôvodnej úlohy.', 'info');
}
// Nadradená úloha — vylúči seba a všetkých potomkov (aby nevznikol cyklus)
function fillTaskParentSelect(t) {
  const sel = document.getElementById('tkParent'); if (!sel) return;
  const excluded = new Set(t ? [t._id, ...taskDescendantIds(t._id)] : []);
  const opts = tasksData.filter(x => !excluded.has(x._id)).sort((a, b) => a.title.localeCompare(b.title, 'sk'));
  const cur = t && t.parent ? (t.parent._id || t.parent) : '';
  sel.innerHTML = '<option value="">— žiadna —</option>' + opts.map(x => `<option value="${x._id}" ${x._id === cur ? 'selected' : ''}>${escHtml(x.title)}</option>`).join('');
}
function taskDescendantIds(id) {
  const out = [];
  tasksData.filter(x => (x.parent && (x.parent._id || x.parent)) === id).forEach(child => { out.push(child._id); out.push(...taskDescendantIds(child._id)); });
  return out;
}
function fillTaskDependsSelect(t) {
  const sel = document.getElementById('tkDependsOn'); if (!sel) return;
  const opts = tasksData.filter(x => !t || x._id !== t._id).sort((a, b) => a.title.localeCompare(b.title, 'sk'));
  const cur = new Set((t && t.dependsOn || []).map(d => d._id || d));
  sel.innerHTML = opts.map(x => `<option value="${x._id}" ${cur.has(x._id) ? 'selected' : ''}>${escHtml(x.title)}</option>`).join('');
}
// Zadávateľ — osoba s účtom v Dashboarde, ktorá úlohu uvidí, ale nebude ju môcť editovať
function fillTaskAssigneeSelect(t) {
  const sel = document.getElementById('tkAssignedTo'); if (!sel) return;
  const cur = t && t.assignedTo ? (t.assignedTo._id || t.assignedTo) : '';
  const opts = taskUsers.slice().sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username, 'sk'));
  sel.innerHTML = '<option value="">— nikto —</option>' + opts.map(u => `<option value="${u._id}" ${u._id === cur ? 'selected' : ''}>${escHtml(u.name || u.username)}</option>`).join('');
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
// ── Aktualizácie (denník popisov/poznámok k stavu, s autorom a časom) ─────────
// Zlúči nový denník (t.updates) s prípadným starším voľným popisom/poznámkou
// (spred zavedenia denníka), zoradené od najnovšej.
function taskAllUpdates(t) {
  if (!t) return [];
  const list = (t.updates || []).map(u => ({ text: u.text, authorName: u.authorName, createdAt: u.createdAt }));
  if (t.description) list.push({ text: t.description, authorName: '(pôvodný popis)', createdAt: t.createdAt });
  if (t.note) list.push({ text: t.note, authorName: '(pôvodná poznámka)', createdAt: t.createdAt });
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function taskLatestUpdate(t) { return taskAllUpdates(t)[0] || null; }
function renderTaskUpdateEditor(t) {
  const list = document.getElementById('tkUpdList');
  const cnt = document.getElementById('tkUpdCount');
  const hint = document.getElementById('tkUpdHint');
  const input = document.getElementById('tkUpdInput');
  if (!list) return;
  const updates = taskAllUpdates(t);
  list.innerHTML = updates.length
    ? updates.map(u => `<div class="tk-upd-item"><div class="tk-upd-meta"><strong>${escHtml(u.authorName || 'neznámy')}</strong> · ${fmtDateTime(u.createdAt)}</div><div class="tk-upd-text">${escHtml(u.text)}</div></div>`).join('')
    : '<div class="tk-sub-empty">Zatiaľ žiadne aktualizácie.</div>';
  if (cnt) cnt.textContent = updates.length ? `(${updates.length})` : '';
  const canAdd = !!(t && t._id);
  if (input) input.disabled = !canAdd;
  if (hint) hint.textContent = canAdd ? '' : 'Najprv úlohu uložte, potom môžete pridávať aktualizácie.';
}
async function addTaskUpdate() {
  const id = document.getElementById('tkId').value;
  const input = document.getElementById('tkUpdInput');
  const text = (input.value || '').trim();
  if (!id) { toast('Najprv uložte úlohu', 'warn'); return; }
  if (!text) return;
  try {
    const r = await fetch(`/api/tasks/${id}/updates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!r.ok) { const er = await r.json().catch(() => ({})); toast(er.error || 'Chyba', 'error'); return; }
    const updated = await r.json();
    const t = tasksData.find(x => x._id === id); if (t) Object.assign(t, updated);
    input.value = '';
    renderTaskUpdateEditor(updated);
    renderTasks();
  } catch { toast('Sieťová chyba', 'error'); }
}
async function saveTask() {
  if (document.getElementById('taskModal').classList.contains('tk-readonly')) return; // len na čítanie — needituje sa
  const title = document.getElementById('tkTitle').value.trim();
  if (!title) { alert('Zadajte názov úlohy'); return; }
  const body = {
    title, due: document.getElementById('tkDue').value || null,
    priority: document.getElementById('tkPriority').value,
    status: document.getElementById('tkStatus').value,
    progress: Number(document.getElementById('tkProgress').value) || 0,
    project: taskCatalogValue('tkProject'),
    customer: taskCatalogValue('tkCustomer'),
    subtasks: tkSubtasks.filter(s => (s.title || '').trim()).map(s => ({ title: s.title.trim(), done: !!s.done })),
    tags: document.getElementById('tkTags').value.split(',').map(x => x.trim()).filter(Boolean),
    parent: document.getElementById('tkParent').value || null,
    dependsOn: [...document.getElementById('tkDependsOn').selectedOptions].map(o => o.value),
    assignedTo: document.getElementById('tkAssignedTo').value || null
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
let prodView = 'list';
let _dragProdId = null;
let prodExpanded = new Set();   // rozbalené objednávky vo vnorenom zozname (kľúč = encodeURIComponent(salesOrder))
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
const PROD_SALES = ['M. Baláž', 'K. Danišová', 'R. Polák', 'T. Végh'];   // obchodníci (odosielatelia kalibračných listov)
let prodCalMonth = null;   // prvý deň zobrazeného mesiaca v kalendári expedície

async function loadProd() {
  try { prodData = await fetch('/api/production').then(r => r.json()); if (!Array.isArray(prodData)) prodData = []; }
  catch { prodData = []; }
  // datalist pracovísk
  const dl = document.getElementById('poLineList');
  if (dl) { const set = [...new Set(prodData.map(o => o.workstation).filter(Boolean))]; dl.innerHTML = set.map(w => `<option value="${escHtml(w)}">`).join(''); }
  renderProdKpis();
  renderProdLate();
  renderProdCalib();
  setProdView(prodView);   // synchronizuj viditeľnosť pohľadu (default = gantt) + vykresli
}

function setProdView(v) {
  prodView = v;
  document.querySelectorAll('[data-pview]').forEach(b => b.classList.toggle('active', b.dataset.pview === v));
  document.getElementById('prodKanban').classList.toggle('hidden', v !== 'kanban');
  document.getElementById('prodList').classList.toggle('hidden', v !== 'list');
  document.getElementById('prodGantt').classList.toggle('hidden', v !== 'gantt');
  document.getElementById('prodCalendar')?.classList.toggle('hidden', v !== 'calendar');
  renderProd();
}

function prodFiltered() {
  const q = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  if (!q) return prodData.slice();
  return prodData.filter(o => [o.number, o.product, o.customer, o.salesOrder, o.workstation, o.assignee].some(x => (x || '').toLowerCase().includes(q)));
}
function _prodToday() { return new Date(new Date().toDateString()); }
function prodOverdue(o) { return o.due && o.stage !== 'shipped' && new Date(o.due) < _prodToday(); }
// dni do expedície (záporné = po termíne); vráti aj triedu pre farbu
function prodShipInfo(o) {
  if (!o.due) return null;
  if (o.stage === 'shipped') return { days: null, cls: 'shipped', label: 'expedované' };
  const days = Math.round((new Date(new Date(o.due).toDateString()) - _prodToday()) / 864e5);
  let cls = 'ok';
  if (days < 0) cls = 'late'; else if (days <= 3) cls = 'urgent'; else if (days <= 7) cls = 'soon';
  const label = days < 0 ? `${-days} dní po termíne` : days === 0 ? 'dnes' : `o ${days} dní`;
  return { days, cls, label };
}

async function renderProdKpis() {
  let s = null;
  try { s = await fetch('/api/production/summary').then(r => r.json()); } catch {}
  const el = document.getElementById('prodKpis'); if (!el) return;
  if (!s || s.error) { el.innerHTML = ''; return; }
  // klik na dlaždicu → modal so zoznamom konkrétnych objednávok (kind = filter)
  const card = (val, label, sub, cls, kind) => `<div class="prod-kpi ${cls || ''} prod-kpi-click" onclick="openProdKpi('${kind}')" title="Klikni pre zoznam objednávok">
    <div class="prod-kpi-val">${val}</div><div class="prod-kpi-lbl">${label}</div>${sub ? `<div class="prod-kpi-sub">${sub}</div>` : ''}
    <span class="prod-kpi-more">zobraziť ›</span></div>`;
  el.innerHTML =
    card(s.active, 'Aktívne zákazky', s.total + ' celkom', 'pk-blue', 'active') +
    card(s.overdue, '⚠ Meškajú', s.overdue ? 'treba riešiť hneď' : 'OK', s.overdue ? 'pk-red' : 'pk-green', 'overdue') +
    card(s.dueSoon || 0, 'Do expedície ≤ 7 dní', '', (s.dueSoon ? 'pk-amber' : ''), 'dueSoon') +
    card(s.inProduction, 'Vo výrobe', '', 'pk-cyan', 'inProduction') +
    card((s.calibPending || 0), '📄 Kalibr. listy neodoslané', (s.calibNeeded ? `${s.calibSent || 0}/${s.calibNeeded} odoslaných` : 'OK'), (s.calibPending ? 'pk-amber' : 'pk-green'), 'calibPending');
}

// Zoznam objednávok podľa KPI dlaždice
const PROD_KPI_DEFS = {
  active:       { title: 'Aktívne zákazky', filter: o => !['done', 'shipped'].includes(o.stage) },
  overdue:      { title: '⚠ Meškajúce zákazky', filter: prodOverdue },
  dueSoon:      { title: 'Do expedície ≤ 7 dní', filter: o => { const si = prodShipInfo(o); return si && si.days !== null && si.days >= 0 && si.days <= 7; } },
  inProduction: { title: 'Vo výrobe', filter: o => o.stage === 'production' },
  calibPending: { title: '📄 Kalibračné listy — neodoslané', filter: o => o.stage === 'shipped' && o.calibrationRequired && o.calibrationStatus !== 'sent' }
};
function openProdKpi(kind) {
  const def = PROD_KPI_DEFS[kind]; if (!def) return;
  const items = prodData.filter(def.filter).sort((a, b) => new Date(a.due || 0) - new Date(b.due || 0));
  document.getElementById('prodKpiTitle').textContent = `${def.title} — ${items.length}`;
  const body = document.getElementById('prodKpiBody');
  if (!items.length) { body.innerHTML = '<div class="proc-empty">Žiadne objednávky.</div>'; }
  else {
    const rows = items.map(o => {
      const st = prodStageMap(o.stage), si = prodShipInfo(o), od = prodOverdue(o);
      return `<tr onclick="closeProdKpi(); openProdModal(prodData.find(x=>x._id==='${o._id}'))">
        <td><span class="prod-t-num">${escHtml(o.number || '—')}</span>${o.salesOrder ? `<span class="prod-t-qty">obj. ${escHtml(o.salesOrder)}</span>` : ''}</td>
        <td>${escHtml(o.product)}</td>
        <td>${escHtml(o.customer || '—')}</td>
        <td>${escHtml(o.workstation || '—')}</td>
        <td>${o.qtyDone || 0}/${o.qtyPlanned || 0} ${escHtml(o.unit || 'ks')}</td>
        <td><span class="prod-stage-badge" style="background:${st.c}22;color:${st.c};border:1px solid ${st.c}66">${st.label}</span></td>
        <td class="${od ? 'task-od' : ''}">${o.due ? fmtDate(o.due) : '—'}</td>
        <td>${si ? `<span class="prod-ship-badge ship-${si.cls}">${si.label}</span>` : '—'}</td>
      </tr>`;
    }).join('');
    body.innerHTML = `<table class="prod-table"><thead><tr>
      <th>IO / obj.</th><th>Produkt</th><th>Zákazník</th><th>Pracovisko</th><th>Množstvo</th><th>Fáza</th><th>Expedícia</th><th>Do expedície</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  }
  document.getElementById('prodKpiModal').classList.remove('hidden');
}
function closeProdKpi() { document.getElementById('prodKpiModal').classList.add('hidden'); }

// Panel meškajúcich zákaziek — rozbaľovací (zoznam sa dá skryť/zobraziť)
let prodLateOpen = localStorage.getItem('prodLateOpen') === '1';   // predvolene zbalený
function prodToggleLate() { prodLateOpen = !prodLateOpen; localStorage.setItem('prodLateOpen', prodLateOpen ? '1' : '0'); renderProdLate(); }
function renderProdLate() {
  const el = document.getElementById('prodLatePanel'); if (!el) return;
  const late = prodData.filter(prodOverdue).sort((a, b) => new Date(a.due) - new Date(b.due));
  if (!late.length) { el.innerHTML = '<div class="prod-late-ok">✅ Žiadne meškajúce zákazky — všetko v termíne.</div>'; return; }
  const rows = late.map(o => {
    const si = prodShipInfo(o), st = prodStageMap(o.stage);
    return `<div class="prod-late-row" data-id="${o._id}">
      <div class="prod-late-main" onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))">
        <div class="prod-late-prod">${escHtml(o.product)}</div>
        <div class="prod-late-meta">${escHtml(o.number || '')}${o.customer ? ' · ' + escHtml(o.customer) : ''}${o.workstation ? ' · ' + escHtml(o.workstation) : ''} · <span class="prod-stage-badge" style="background:${st.c}22;color:${st.c}">${st.label}</span></div>
      </div>
      <div class="prod-late-when"><span class="prod-late-days">${si ? si.label : ''}</span><span class="prod-late-date">exp. ${o.due ? fmtDate(o.due) : '—'}</span></div>
      <input class="prod-late-reason" type="text" placeholder="Dôvod meškania…" value="${escHtml(o.delayReason || '')}" onchange="prodSaveReason('${o._id}', this.value)" onclick="event.stopPropagation()">
    </div>`;
  }).join('');
  el.innerHTML = `<div class="prod-late-hd prod-late-toggle ${prodLateOpen ? 'is-open' : ''}" onclick="prodToggleLate()" title="${prodLateOpen ? 'Skryť zoznam' : 'Zobraziť zoznam'}">
      <span class="prod-late-chev">▸</span>⚠ Meškajúce zákazky <span class="prod-late-count">${late.length}</span>
      <span class="prod-late-hint">${prodLateOpen ? 'klikni na zákazku pre detail · zapíš dôvod meškania' : 'klikni pre zobrazenie zoznamu'}</span>
    </div>
    <div class="prod-late-body ${prodLateOpen ? '' : 'hidden'}">${rows}</div>`;
}
async function prodSaveReason(id, val) {
  const o = prodData.find(x => x._id === id); if (!o) return;
  o.delayReason = val;
  try { await fetch('/api/production/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delayReason: val }) }); }
  catch { toast('Uloženie dôvodu zlyhalo', 'error'); }
}

// ── Kalibračné listy — TABUĽKA expedovaných objednávok ──────────────────────
// Prvé, čo v Plánovaní výroby vidno: expedované objednávky a stav ich
// kalibračných listov (neodoslané / odoslané), s obchodníkom a rýchlym označením.
// Filtre (deň + stav) sú priamo nad zoznamom a štatistiky fungujú ako filtre.
let prodCalibStatus = 'all';     // filter podľa stavu: 'all' | 'pending' | 'sent'
let prodCalibDay = null;         // vybraný deň (Date), null → dnes
let prodCalibAllDays = false;    // true → ignorovať denný filter a ukázať všetky
function prodCalibInit() { if (!prodCalibDay) prodCalibDay = new Date(new Date().toDateString()); }
// dátum, na ktorom sedí kalibračný list (reálna expedícia, inak termín)
function prodCalibDayOf(o) {
  const d = o.shippedDate || o.due;
  return d ? new Date(new Date(d).toDateString()) : null;
}
function prodSetCalibStatus(status) { prodCalibStatus = status; renderProdCalib(); }
function prodCalibShiftDay(dir) { prodCalibInit(); prodCalibAllDays = false; prodCalibDay = new Date(prodCalibDay.getFullYear(), prodCalibDay.getMonth(), prodCalibDay.getDate() + dir); renderProdCalib(); }
function prodCalibToday() { prodCalibAllDays = false; prodCalibDay = new Date(new Date().toDateString()); renderProdCalib(); }
function prodCalibSetAllDays(all) { prodCalibAllDays = all; if (!all) prodCalibInit(); renderProdCalib(); }
function renderProdCalib() {
  const el = document.getElementById('prodCalibPanel'); if (!el) return;
  prodCalibInit();
  const shipped = prodData.filter(o => o.stage === 'shipped' && o.calibrationRequired);

  if (!shipped.length) {
    el.innerHTML = `<div class="prod-calib-hd">📄 Kalibračné listy k expedovaným objednávkam</div>
      <div class="prod-late-ok">Žiadne expedované objednávky nevyžadujú kalibračné listy.</div>`;
    return;
  }

  // 1) denný rozsah — buď jeden deň, alebo všetky dni
  const dayMs = prodCalibDay.getTime();
  const inDayScope = o => { if (prodCalibAllDays) return true; const d = prodCalibDayOf(o); return d && d.getTime() === dayMs; };
  const scoped = shipped.filter(inDayScope);

  // 2) štatistiky (v rámci denného rozsahu) — fungujú ako filtre podľa stavu
  const scPending = scoped.filter(o => o.calibrationStatus !== 'sent').length;
  const scSent = scoped.length - scPending;
  const totalPending = shipped.filter(o => o.calibrationStatus !== 'sent').length;

  // 3) filter podľa stavu
  let items = scoped.slice();
  if (prodCalibStatus === 'pending') items = items.filter(o => o.calibrationStatus !== 'sent');
  else if (prodCalibStatus === 'sent') items = items.filter(o => o.calibrationStatus === 'sent');
  items.sort((a, b) =>
    (a.calibrationStatus === 'sent') - (b.calibrationStatus === 'sent')       // neodoslané hore
    || new Date(b.shippedDate || b.due || 0) - new Date(a.shippedDate || a.due || 0));

  // 4) denná navigácia
  const today = new Date(new Date().toDateString()).getTime();
  const isToday = dayMs === today;
  const dayLabel = prodCalibAllDays ? 'Všetky dni'
    : prodCalibDay.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + (isToday ? ' · dnes' : '');

  const salesOpts = who => PROD_SALES.map(s => `<option value="${escHtml(s)}"${s === who ? ' selected' : ''}>${escHtml(s)}</option>`).join('');
  const rows = items.map(o => {
    const sent = o.calibrationStatus === 'sent';
    return `<tr class="prod-calib-tr ${sent ? 'is-sent' : 'is-pending'}">
      <td class="pc-open" onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))">
        <span class="prod-t-num">${escHtml(o.number || '—')}</span>${o.salesOrder ? `<span class="prod-t-qty">obj. ${escHtml(o.salesOrder)}</span>` : ''}
      </td>
      <td class="pc-open" onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))">${escHtml(o.product)}</td>
      <td>${escHtml(o.customer || '—')}</td>
      <td>${o.qtyPlanned || 0} ${escHtml(o.unit || 'ks')}</td>
      <td>${o.shippedDate ? fmtDate(o.shippedDate) : (o.due ? fmtDate(o.due) : '—')}</td>
      <td><span class="prod-calib-status ${sent ? 'ok' : 'bad'}">${sent ? '✓ Odoslané' : '● Neodoslané'}</span>${sent && o.calibrationSentDate ? `<span class="pc-sentdate">${fmtDate(o.calibrationSentDate)}</span>` : ''}</td>
      <td><select class="prod-calib-sel" onchange="prodSetCalibOwner('${o._id}', this.value)">
          <option value=""${o.calibrationOwner ? '' : ' selected'}>— priradiť —</option>
          ${salesOpts(o.calibrationOwner)}
        </select></td>
      <td><button class="prod-calib-btn ${sent ? 'sent' : 'pending'}" onclick="prodToggleCalib('${o._id}')"
        title="${sent ? 'Vrátiť na neodoslané' : 'Označiť kalibračné listy ako odoslané'}">
        ${sent ? '↩ Vrátiť' : '📤 Odoslané'}</button></td>
    </tr>`;
  }).join('');

  const emptyMsg = prodCalibAllDays
    ? (prodCalibStatus === 'pending' ? 'Všetky kalibračné listy sú odoslané ✓' : 'Žiadne položky pre zvolený filter.')
    : 'V tento deň nie je žiadna expedovaná objednávka s kalibračným listom.';

  el.innerHTML = `<div class="prod-calib-hd">📄 Kalibračné listy k expedovaným objednávkam
      ${totalPending ? `<span class="prod-late-count">${totalPending} čaká na odoslanie</span>` : ''}
    </div>

    <div class="prod-calib-stats">
      <button class="pc-stat ${prodCalibStatus === 'all' ? 'active' : ''}" onclick="prodSetCalibStatus('all')">
        <span class="pc-stat-num">${scoped.length}</span><span class="pc-stat-lbl">Expedované${prodCalibAllDays ? '' : ' v tento deň'}</span>
      </button>
      <button class="pc-stat bad ${prodCalibStatus === 'pending' ? 'active' : ''}" onclick="prodSetCalibStatus('pending')">
        <span class="pc-stat-num">${scPending}</span><span class="pc-stat-lbl">Čaká na odoslanie</span>
      </button>
      <button class="pc-stat ok ${prodCalibStatus === 'sent' ? 'active' : ''}" onclick="prodSetCalibStatus('sent')">
        <span class="pc-stat-num">${scSent}</span><span class="pc-stat-lbl">Odoslané</span>
      </button>
    </div>

    <div class="prod-calib-daybar">
      <div class="util-nav">
        <button class="cal-nav-btn" onclick="prodCalibShiftDay(-1)" title="Predošlý deň"${prodCalibAllDays ? ' disabled' : ''}>‹</button>
        <button class="btn-sm" onclick="prodCalibToday()">Dnes</button>
        <button class="cal-nav-btn" onclick="prodCalibShiftDay(1)" title="Ďalší deň"${prodCalibAllDays ? ' disabled' : ''}>›</button>
        <span class="prod-calib-daylbl">${escHtml(dayLabel)}</span>
      </div>
      <span class="prod-calib-toggle">
        <button class="pc-filter ${!prodCalibAllDays ? 'active' : ''}" onclick="prodCalibSetAllDays(false)">Podľa dňa</button>
        <button class="pc-filter ${prodCalibAllDays ? 'active' : ''}" onclick="prodCalibSetAllDays(true)">Všetky dni (${shipped.length})</button>
      </span>
    </div>

    <div class="prod-calib-tablewrap"><table class="prod-calib-table">
      <thead><tr><th>Objednávka</th><th>Produkt</th><th>Zákazník</th><th>Množstvo</th><th>Expedované</th><th>Kalibračný list</th><th>Obchodník</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="8" class="pc-empty">${emptyMsg}</td></tr>`}</tbody>
    </table></div>`;
}
async function prodPatchCalib(id, patch) {
  const o = prodData.find(x => x._id === id); if (!o) return;
  Object.assign(o, patch);
  try { await fetch('/api/production/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }); }
  catch { toast('Uloženie kalibračných listov zlyhalo', 'error'); }
}
async function prodSetCalibOwner(id, val) {
  await prodPatchCalib(id, { calibrationOwner: val });
}
async function prodToggleCalib(id) {
  const o = prodData.find(x => x._id === id); if (!o) return;
  const sent = o.calibrationStatus !== 'sent';
  await prodPatchCalib(id, { calibrationStatus: sent ? 'sent' : 'pending', calibrationSentDate: sent ? new Date().toISOString() : null });
  renderProdCalib();
  renderProdKpis();
  if (prodView === 'calendar') renderProdCalendar();
}

// ── Kalendár expedície ──────────────────────────────────────────────────────
// Mesačný kalendár: čo bolo/má byť expedované v daný deň (podľa reálneho dátumu
// expedície, inak podľa termínu). Zvýrazní neodoslané kalibračné listy.
function prodCalInit() { if (!prodCalMonth) { const d = new Date(); prodCalMonth = new Date(d.getFullYear(), d.getMonth(), 1); } }
function prodCalShift(dir) { prodCalInit(); prodCalMonth = new Date(prodCalMonth.getFullYear(), prodCalMonth.getMonth() + dir, 1); renderProdCalendar(); }
function prodCalToday() { const d = new Date(); prodCalMonth = new Date(d.getFullYear(), d.getMonth(), 1); renderProdCalendar(); }
// dátum, na ktorom sedí zákazka v kalendári expedície
function prodShipDay(o) {
  const d = o.stage === 'shipped' ? (o.shippedDate || o.due) : o.due;
  return d ? new Date(new Date(d).toDateString()) : null;
}
function renderProdCalendar() {
  const el = document.getElementById('prodCalGrid'); if (!el) return;
  prodCalInit();
  const y = prodCalMonth.getFullYear(), m = prodCalMonth.getMonth();
  const lbl = document.getElementById('prodCalLabel');
  if (lbl) lbl.textContent = prodCalMonth.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });

  // zoskup zákazky s termínom/dátumom expedície do dní tohto mesiaca
  const byDay = {};
  prodFiltered().forEach(o => {
    const d = prodShipDay(o);
    if (!d || d.getFullYear() !== y || d.getMonth() !== m) return;
    (byDay[d.getDate()] = byDay[d.getDate()] || []).push(o);
  });

  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7;   // pondelok = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toDateString();
  const dows = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

  // súhrn mesiaca
  const monthItems = Object.values(byDay).flat();
  const shippedCnt = monthItems.filter(o => o.stage === 'shipped').length;
  const planCnt = monthItems.length - shippedCnt;
  const calibPend = monthItems.filter(o => o.stage === 'shipped' && o.calibrationRequired && o.calibrationStatus !== 'sent').length;
  const sum = document.getElementById('prodCalSummary');
  if (sum) sum.innerHTML =
    `<span class="prod-cal-sum-item"><i style="background:#3b82f6"></i>${shippedCnt} expedovaných</span>` +
    `<span class="prod-cal-sum-item"><i style="background:#f59e0b"></i>${planCnt} plánovaných</span>` +
    (calibPend ? `<span class="prod-cal-sum-item"><i style="background:#ef4444"></i>${calibPend} × chýba kalibr. list</span>` : '');

  let cells = dows.map(d => `<div class="prod-cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div class="prod-cal-cell empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const list = (byDay[day] || []).sort((a, b) => (b.stage === 'shipped') - (a.stage === 'shipped'));
    const isToday = new Date(y, m, day).toDateString() === todayStr;
    const chips = list.map(o => {
      const sh = o.stage === 'shipped';
      const calibBad = sh && o.calibrationRequired && o.calibrationStatus !== 'sent';
      const calibOk = sh && o.calibrationRequired && o.calibrationStatus === 'sent';
      const tag = calibBad ? '📄' : calibOk ? '✅' : '';
      return `<div class="prod-cal-chip ${sh ? 'shipped' : 'plan'}${calibBad ? ' calib-bad' : ''}" title="${escHtml((o.number ? o.number + ' · ' : '') + o.product + (o.customer ? ' · ' + o.customer : '') + (sh ? ' · expedované' : ' · plán expedície') + (calibBad ? ' · CHÝBA kalibračný list' + (o.calibrationOwner ? ' (' + o.calibrationOwner + ')' : '') : calibOk ? ' · kalibračný list odoslaný' : ''))}" onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))">${tag}${escHtml(o.product)}</div>`;
    }).join('');
    cells += `<div class="prod-cal-cell${isToday ? ' today' : ''}${list.length ? ' has' : ''}">
      <div class="prod-cal-daynum">${day}${list.length ? `<span class="prod-cal-daycount">${list.length}</span>` : ''}</div>
      <div class="prod-cal-chips">${chips}</div>
    </div>`;
  }
  el.innerHTML = cells;
}

function renderProd() {
  if (prodView === 'kanban') renderProdKanban();
  else if (prodView === 'list') renderProdList();
  else if (prodView === 'gantt') renderProdGantt();
  else if (prodView === 'calendar') renderProdCalendar();
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
  renderProdKpis();
}

// Vnorený (nested) zoznam: zákazky zoskupené podľa objednávky (salesOrder),
// pod-objednávky (jednotlivé IO/výrobné zákazky) sa zobrazia po rozbalení.
function renderProdList() {
  const el = document.getElementById('prodList'); if (!el) return;
  // zoradenie: najprv meškajúce (najviac po termíne), potom podľa termínu expedície
  const rank = o => { const si = prodShipInfo(o); if (!si || si.days === null) return 1e9; return si.days; };
  const items = prodFiltered();
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne výrobné zákazky.</div>'; return; }

  // zoskupenie podľa objednávky; položky bez obj. ostávajú samostatné
  const groups = new Map();
  const singles = [];
  items.forEach(o => {
    const key = (o.salesOrder || '').trim();
    if (!key) { singles.push(o); return; }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });

  // bloky na vykreslenie: skupina (viac položiek pod jednou obj.) alebo samostatný riadok
  const blocks = [];
  groups.forEach((arr, key) => blocks.push({ type: 'group', key, items: arr }));
  singles.forEach(o => blocks.push({ type: 'single', items: [o] }));
  // zoradenie blokov podľa najhoršieho (najmenšieho) termínu v bloku
  const blockRank = b => Math.min(...b.items.map(rank));
  blocks.sort((a, b) => blockRank(a) - blockRank(b));

  // riadok jednej pod-objednávky / samostatnej zákazky
  const itemRow = (o, grpSafe) => {
    const st = prodStageMap(o.stage), od = prodOverdue(o);
    const si = prodShipInfo(o);
    const reasonHint = od && o.delayReason ? ` title="Dôvod: ${escHtml(o.delayReason)}"` : '';
    const child = !!grpSafe;
    const open = child && prodExpanded.has(grpSafe);
    const cls = [od ? 'prod-row-late' : '', child ? 'prod-child-row' : '', (child && !open) ? 'hidden' : ''].filter(Boolean).join(' ');
    const grpAttr = child ? ` data-grp="${grpSafe}"` : '';
    const numCell = child
      ? `<td class="prod-child-cell"><span class="prod-t-num">${escHtml(o.number || '')}</span></td>`
      : `<td><span class="prod-t-num">${escHtml(o.number || '')}</span>${o.salesOrder ? `<span class="prod-t-qty">obj. ${escHtml(o.salesOrder)}</span>` : ''}</td>`;
    return `<tr class="${cls}"${grpAttr} onclick="openProdModal(prodData.find(x=>x._id==='${o._id}'))"${reasonHint}>
      ${numCell}
      <td>${escHtml(o.product)}${o.delayReason ? `<span class="prod-reason-tag" title="Dôvod meškania">💬 ${escHtml(o.delayReason)}</span>` : ''}${o.stage === 'shipped' && o.calibrationRequired ? (o.calibrationStatus === 'sent' ? `<span class="prod-calib-tag ok" title="Kalibračné listy odoslané${o.calibrationOwner ? ' — ' + escHtml(o.calibrationOwner) : ''}">📄 kalibr. odoslané</span>` : `<span class="prod-calib-tag bad" title="Kalibračné listy treba odoslať${o.calibrationOwner ? ' — ' + escHtml(o.calibrationOwner) : ''}">📄 kalibr. čaká${o.calibrationOwner ? ' · ' + escHtml(o.calibrationOwner) : ''}</span>`) : ''}</td>
      <td>${escHtml(o.customer || '—')}</td>
      <td>${escHtml(o.workstation || '—')}</td>
      <td><div class="prod-t-qty">${o.qtyPlanned || 0} ${escHtml(o.unit || 'ks')}</div></td>
      <td><span class="prod-stage-badge" style="background:${st.c}22;color:${st.c};border:1px solid ${st.c}66">${st.label}</span></td>
      <td class="${od ? 'task-od' : ''}">${o.due ? fmtDate(o.due) : '—'}</td>
      <td>${si ? `<span class="prod-ship-badge ship-${si.cls}">${si.label}</span>` : '—'}</td>
      <td><button class="admin-icon-btn danger" onclick="event.stopPropagation(); deleteProd('${o._id}')">✕</button></td>
    </tr>`;
  };

  // súhrnný riadok objednávky (rozbaľovací)
  const groupRow = (b) => {
    const safe = encodeURIComponent(b.key);
    const arr = b.items.slice().sort((a, c) => rank(a) - rank(c));
    const open = prodExpanded.has(safe);
    const totalQty = arr.reduce((s, o) => s + (o.qtyPlanned || 0), 0);
    const unit = arr[0].unit || 'ks';
    const customers = [...new Set(arr.map(o => o.customer).filter(Boolean))];
    const cust = customers.length ? (customers.length === 1 ? customers[0] : `${customers[0]} +${customers.length - 1}`) : '—';
    const wss = [...new Set(arr.map(o => o.workstation).filter(Boolean))];
    const ws = wss.length ? (wss.length === 1 ? wss[0] : `${wss.length} pracovísk`) : '—';
    const stIdx = Math.min(...arr.map(o => Math.max(0, PROD_STAGES.findIndex(s => s.key === o.stage))));
    const st = PROD_STAGES[stIdx] || PROD_STAGES[0];
    const anyLate = arr.some(prodOverdue);
    const dueDates = arr.map(o => o.due).filter(Boolean).sort((a, c) => new Date(a) - new Date(c));
    const earliestDue = dueDates[0];
    const worst = arr.reduce((w, o) => rank(o) < rank(w) ? o : w, arr[0]);
    const si = prodShipInfo(worst);
    const doneCount = arr.filter(o => ['done', 'shipped'].includes(o.stage)).length;
    const head = `<tr class="prod-grp-row ${open ? 'is-open' : ''} ${anyLate ? 'prod-row-late' : ''}" data-grpkey="${safe}" onclick="prodToggleGroup('${safe}')">
      <td><span class="prod-grp-chev">▸</span><span class="prod-t-num">Zákazka č. ${escHtml(b.key)}</span><span class="prod-t-qty">${totalQty} QTY</span></td>
      <td><span class="prod-grp-sum">${arr.length} výrobkov · ${doneCount}/${arr.length} hotových</span></td>
      <td>${escHtml(cust)}</td>
      <td>${escHtml(ws)}</td>
      <td><div class="prod-t-qty">${totalQty} ${escHtml(unit)}</div></td>
      <td><span class="prod-stage-badge" style="background:${st.c}22;color:${st.c};border:1px solid ${st.c}66">${st.label}</span></td>
      <td class="${anyLate ? 'task-od' : ''}">${earliestDue ? fmtDate(earliestDue) : '—'}</td>
      <td>${si ? `<span class="prod-ship-badge ship-${si.cls}">${si.label}</span>` : '—'}</td>
      <td></td>
    </tr>`;
    return head + arr.map(o => itemRow(o, safe)).join('');
  };

  el.innerHTML = `<table class="prod-table"><thead><tr>
    <th>IO / obj.</th><th>Produkt</th><th>Zákazník</th><th>Pracovisko</th><th>Množstvo</th><th>Fáza</th><th>Expedícia</th><th>Do expedície</th><th></th>
    </tr></thead><tbody>${blocks.map(b => b.type === 'group' ? groupRow(b) : itemRow(b.items[0], null)).join('')}</tbody></table>`;
}

// rozbalenie / zbalenie objednávky vo vnorenom zozname
function prodToggleGroup(safe) {
  if (prodExpanded.has(safe)) prodExpanded.delete(safe); else prodExpanded.add(safe);
  const open = prodExpanded.has(safe);
  document.querySelectorAll(`#prodList tr[data-grp="${safe}"]`).forEach(tr => tr.classList.toggle('hidden', !open));
  const head = document.querySelector(`#prodList tr.prod-grp-row[data-grpkey="${safe}"]`);
  if (head) head.classList.toggle('is-open', open);
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
  const dr = document.getElementById('poDelayReason'); if (dr) dr.value = e ? (o.delayReason || '') : '';
  // Kalibračné listy
  const cReq = document.getElementById('poCalibRequired');
  if (cReq) { cReq.checked = e ? !!o.calibrationRequired : false; }
  set('poCalibStatus', e ? (o.calibrationStatus || 'pending') : 'pending');
  set('poCalibOwner', e ? (o.calibrationOwner || '') : '');
  set('poCalibNote', e ? (o.calibrationNote || '') : '');
  prodCalibToggleFields();
  document.getElementById('poDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('prodModal').classList.remove('hidden');
  modalSnapshot('prodModal');
}
// zobraz/schovaj detaily kalibračných listov podľa zaškrtnutia
function prodCalibToggleFields() {
  const on = !!document.getElementById('poCalibRequired')?.checked;
  document.getElementById('poCalibFields')?.classList.toggle('hidden', !on);
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
    delayReason: (document.getElementById('poDelayReason')?.value || '').trim(),
    calibrationRequired: !!document.getElementById('poCalibRequired')?.checked,
    calibrationStatus: document.getElementById('poCalibStatus')?.value || 'pending',
    calibrationOwner: (document.getElementById('poCalibOwner')?.value || '').trim(),
    calibrationNote: (document.getElementById('poCalibNote')?.value || '').trim(),
    note: document.getElementById('poNote').value.trim()
  };
  // dátum odoslania kalibračných listov: nastav pri prechode na "odoslané"
  if (body.calibrationRequired && body.calibrationStatus === 'sent') {
    const prev = prodData.find(x => x._id === document.getElementById('poId').value);
    body.calibrationSentDate = (prev && prev.calibrationSentDate) ? prev.calibrationSentDate : new Date().toISOString();
  } else if (body.calibrationStatus !== 'sent') {
    body.calibrationSentDate = null;
  }
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
async function importProdData() {
  if (!await uiConfirm('Zmazať VŠETKY existujúce výrobné zákazky a nahradiť ich objednávkami z exportu IO?')) return;
  try {
    const r = await fetch('/api/admin/import-production', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await loadProd();
    toast('Importovaných ' + d.inserted + ' objednávok z IO.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
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
//  WORKFLOW VÝROBY PRODUKTU (Product Production Workflow)
//  Produkt (napr. SAA-01) + postupnosť výrobných krokov (Montáž → Zváranie → ...)
// ══════════════════════════════════════════════════════════════════════════════
let pwfList = [];              // načítané workflow
let pwfSelectedId = null;      // vybraný produkt v ľavom zozname
let pwfSteps = [];             // kroky v otvorenom modáli
const PWF_STATUS = {
  pending: { lbl: 'Čaká', cls: 'pwf-st-pending', next: 'active' },
  active:  { lbl: 'Prebieha', cls: 'pwf-st-active', next: 'done' },
  done:    { lbl: 'Hotové', cls: 'pwf-st-done', next: 'pending' }
};

async function loadPwf() {
  try { pwfList = await fetch('/api/product-workflows').then(r => r.json()); if (!Array.isArray(pwfList)) pwfList = []; }
  catch { pwfList = []; }
  if (!pwfList.find(w => w._id === pwfSelectedId)) pwfSelectedId = pwfList[0]?._id || null;
  renderPwfList();
  renderPwfDetail();
}

function pwfTitle(w) { return w.code || w.product || 'Bez názvu'; }

function renderPwfList() {
  const el = document.getElementById('pwfList'); if (!el) return;
  if (!pwfList.length) {
    el.innerHTML = '<div class="proc-empty" style="padding:14px">Žiadne workflow. Klikni na <strong>🎲 Ukážkové dáta</strong> alebo <strong>+ Nový produkt</strong>.</div>';
    return;
  }
  el.innerHTML = pwfList.map(w => {
    const s = w.stats || { total: 0, done: 0, progress: 0 };
    return `
    <button class="pwf-item ${w._id === pwfSelectedId ? 'active' : ''}" onclick="selectPwf('${w._id}')">
      <div class="pwf-item-top">
        <span class="pwf-item-code">${escHtml(pwfTitle(w))}</span>
        <span class="pwf-item-pct">${s.progress}%</span>
      </div>
      ${w.product && w.code ? `<div class="pwf-item-name">${escHtml(w.product)}</div>` : ''}
      <div class="pwf-item-bar"><div class="pwf-item-fill" style="width:${s.progress}%"></div></div>
      <div class="pwf-item-meta">${s.total} krokov · ${s.done} hotových</div>
    </button>`;
  }).join('');
}
function selectPwf(id) { pwfSelectedId = id; renderPwfList(); renderPwfDetail(); }

function renderPwfDetail() {
  const el = document.getElementById('pwfDetail'); if (!el) return;
  const w = pwfList.find(x => x._id === pwfSelectedId);
  if (!w) { el.innerHTML = '<div class="proc-empty" style="padding:24px">Vyber produkt vľavo alebo pridaj nový.</div>'; return; }
  const s = w.stats || { total: 0, done: 0, progress: 0 };

  const steps = (w.steps || []).map((st, i) => {
    const meta = PWF_STATUS[st.status] || PWF_STATUS.pending;
    const last = i === w.steps.length - 1;
    return `
    <div class="pwf-step ${meta.cls}">
      <div class="pwf-step-rail">
        <button class="pwf-step-dot" title="Klik: zmeniť stav" onclick="cyclePwfStep('${w._id}','${st._id}','${st.status}')">${st.status === 'done' ? '✓' : i + 1}</button>
        ${last ? '' : '<div class="pwf-step-line"></div>'}
      </div>
      <div class="pwf-step-body">
        <div class="pwf-step-top">
          <span class="pwf-step-name">${escHtml(st.name)}</span>
          <button class="pwf-step-badge ${meta.cls}" onclick="cyclePwfStep('${w._id}','${st._id}','${st.status}')">${meta.lbl}</button>
        </div>
        <div class="pwf-step-sub">
          ${st.station ? `<span class="pwf-step-station">🏭 ${escHtml(st.station)}</span>` : ''}
          ${st.note ? `<span class="pwf-step-note">${escHtml(st.note)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="pwf-detail-hdr">
      <div>
        <div class="pwf-detail-title">${escHtml(pwfTitle(w))}</div>
        <div class="pwf-detail-sub">${w.code && w.product ? escHtml(w.product) + ' · ' : ''}${s.total} krokov · ${s.done}/${s.total} hotových (${s.progress} %)</div>
      </div>
      <button class="btn-secondary btn-sm" onclick="openPwfModal(pwfList.find(x=>x._id==='${w._id}'))">✎ Upraviť</button>
    </div>
    <div class="pwf-detail-bar"><div class="pwf-detail-fill" style="width:${s.progress}%"></div></div>
    ${w.steps && w.steps.length ? `<div class="pwf-steps">${steps}</div>` : '<div class="proc-empty" style="padding:20px">Tento produkt zatiaľ nemá žiadne kroky. Klikni na ✎ Upraviť.</div>'}
    ${w.note && w.note !== 'seed' ? `<div class="pwf-detail-note">📝 ${escHtml(w.note)}</div>` : ''}`;
}

// Klik na krok — cyklus stavu Čaká → Prebieha → Hotové → Čaká
async function cyclePwfStep(id, stepId, current) {
  const next = (PWF_STATUS[current] || PWF_STATUS.pending).next;
  try {
    const r = await fetch(`/api/product-workflows/${id}/steps/${stepId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next })
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    const saved = await r.json();
    const idx = pwfList.findIndex(x => x._id === id);
    if (idx >= 0) pwfList[idx] = saved;
    renderPwfList(); renderPwfDetail();
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function openPwfModal(w = null) {
  const e = w && typeof w === 'object';
  document.getElementById('pwfModalTitle').textContent = e ? 'Upraviť workflow produktu' : 'Nový produkt';
  document.getElementById('pwfId').value = e ? w._id : '';
  document.getElementById('pwfCode').value = e ? (w.code || '') : '';
  document.getElementById('pwfProduct').value = e ? (w.product || '') : '';
  document.getElementById('pwfNote').value = e && w.note !== 'seed' ? (w.note || '') : '';
  pwfSteps = e ? (w.steps || []).map(s => ({ name: s.name || '', station: s.station || '', note: s.note || '', status: s.status || 'pending' }))
               : [{ name: '', station: '', note: '', status: 'pending' }];
  document.getElementById('pwfDeleteBtn').style.display = e ? '' : 'none';
  renderPwfSteps();
  document.getElementById('pwfModal').classList.remove('hidden');
  modalSnapshot('pwfModal');
}
function closePwfModal() { modalGuardClose('pwfModal'); }

function renderPwfSteps() {
  const body = document.getElementById('pwfStepsBody'); if (!body) return;
  body.innerHTML = pwfSteps.map((st, i) => `
    <tr>
      <td class="pwf-step-idx">${i + 1}</td>
      <td><input class="pwf-in" value="${escHtml(st.name)}" placeholder="napr. Montáž" oninput="updatePwfStep(${i},'name',this.value)"></td>
      <td><input class="pwf-in" value="${escHtml(st.station)}" placeholder="pracovisko" oninput="updatePwfStep(${i},'station',this.value)"></td>
      <td><input class="pwf-in" value="${escHtml(st.note)}" placeholder="poznámka" oninput="updatePwfStep(${i},'note',this.value)"></td>
      <td class="pwf-step-ops">
        <button type="button" class="pwf-mini" onclick="movePwfStep(${i},-1)" title="Hore" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="pwf-mini" onclick="movePwfStep(${i},1)" title="Dole" ${i === pwfSteps.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="tk-sub-del" onclick="removePwfStep(${i})" title="Odstrániť">✕</button>
      </td>
    </tr>`).join('');
}
function updatePwfStep(i, field, val) { if (pwfSteps[i]) pwfSteps[i][field] = val; }
function addPwfStep() { pwfSteps.push({ name: '', station: '', note: '', status: 'pending' }); renderPwfSteps(); }
function removePwfStep(i) { pwfSteps.splice(i, 1); if (!pwfSteps.length) pwfSteps.push({ name: '', station: '', note: '', status: 'pending' }); renderPwfSteps(); }
function movePwfStep(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= pwfSteps.length) return;
  [pwfSteps[i], pwfSteps[j]] = [pwfSteps[j], pwfSteps[i]];
  renderPwfSteps();
}

async function savePwf() {
  const code = document.getElementById('pwfCode').value.trim();
  const product = document.getElementById('pwfProduct').value.trim();
  if (!code && !product) { toast('Zadaj kód alebo názov produktu.', 'error'); return; }
  const body = {
    code, product,
    note: document.getElementById('pwfNote').value.trim(),
    steps: pwfSteps.filter(s => (s.name || '').trim())
  };
  const id = document.getElementById('pwfId').value;
  try {
    const r = await fetch(id ? '/api/product-workflows/' + id : '/api/product-workflows', {
      method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    const saved = await r.json(); pwfSelectedId = saved._id || pwfSelectedId;
    modalSnapshot('pwfModal'); closePwfModal(); loadPwf();
    toast('Workflow uložené.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

async function deletePwf(id) {
  if (!id || !await uiConfirm('Odstrániť toto workflow produktu?')) return;
  try {
    await fetch('/api/product-workflows/' + id, { method: 'DELETE' });
    pwfSelectedId = null; modalSnapshot('pwfModal'); closePwfModal(); loadPwf();
    toast('Workflow odstránené.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

async function seedPwfData() {
  if (!await uiConfirm('Načítať ukážkové workflow (SAA-01 a ďalšie)? Nahradí len predošlé ukážkové dáta.')) return;
  try {
    const r = await fetch('/api/admin/seed-workflows', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    pwfSelectedId = null; loadPwf();
    toast(`Hotovo — ${d.workflows} workflow, ${d.steps} krokov.`, 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GPN — GOLDEN PN (ticket systém požiadaviek Sales → Technológia)
// ══════════════════════════════════════════════════════════════════════════════
let gpnData = [];                 // načítané tickety
let gpnFilterBucket = '';         // aktívny KPI filter (stav-bucket)
let gpnFormCables = [];           // riadky káblov v otvorenom formulári
let gpnFormConnectors = [];       // riadky konektorov v otvorenom formulári
let gpnDetailId = null;           // otvorený ticket v detaile
let gpnUsers = [];                // používatelia (technológovia) pre priradenie

const GPN_STATUS = {
  new:            { lbl: 'Nová',                    cls: 'gpn-st-new',   next: 'waiting_review' },
  waiting_review: { lbl: 'Čaká na kontrolu',        cls: 'gpn-st-rev',   next: 'in_progress' },
  in_progress:    { lbl: 'Rozpracované',            cls: 'gpn-st-prog',  next: 'ready_approval' },
  waiting_info:   { lbl: 'Čaká na doplnenie',       cls: 'gpn-st-wait',  next: 'in_progress' },
  ready_approval: { lbl: 'Na schválenie',           cls: 'gpn-st-appr',  next: 'approved' },
  approved:       { lbl: 'Schválené',               cls: 'gpn-st-ok',    next: 'completed' },
  completed:      { lbl: 'Dokončené',               cls: 'gpn-st-done',  next: 'closed' },
  closed:         { lbl: 'Uzavreté',                cls: 'gpn-st-closed', next: null }
};
const GPN_STATUS_ORDER = ['new', 'waiting_review', 'in_progress', 'waiting_info', 'ready_approval', 'approved', 'completed', 'closed'];
const GPN_PRIORITY = {
  low:    { lbl: 'Nízka',    cls: 'gpn-pr-low' },
  normal: { lbl: 'Normálna', cls: 'gpn-pr-normal' },
  high:   { lbl: 'Vysoká',   cls: 'gpn-pr-high' },
  urgent: { lbl: 'Urgentná', cls: 'gpn-pr-urgent' }
};
const GPN_TYPE = { new: 'Nové GPN', modify: 'Úprava GPN' };
const GPN_CHECKLIST = {
  gpn:              'Vytvorené GPN',
  prod_drawing:     'Výrobný výkres',
  pack_drawing:     'Baliaci výkres',
  bom:              'BOM',
  boo:              'BOO',
  fos_card:         'FOS karta',
  drawings_approved:'Schválenie výkresov',
  docs_complete:    'Dokumentácia kompletná'
};
const GPN_CHECKLIST_ORDER = ['gpn', 'prod_drawing', 'pack_drawing', 'bom', 'boo', 'fos_card', 'drawings_approved', 'docs_complete'];
const GPN_ATT_CAT = { drawing: '📐 Výkres', photo: '📷 Fotografia', spec: '📋 Špecifikácia', datasheet: '📄 Datasheet', other: '📎 Iné' };
// KPI buckety dashboardu → množina stavov
const GPN_BUCKETS = [
  { key: 'new',      lbl: 'Nové požiadavky',     statuses: ['new', 'waiting_review'], ico: '🆕' },
  { key: 'progress', lbl: 'Rozpracované',        statuses: ['in_progress'],           ico: '🔧' },
  { key: 'waiting',  lbl: 'Čakajú na doplnenie', statuses: ['waiting_info'],          ico: '⏳' },
  { key: 'approval', lbl: 'Na schválenie',       statuses: ['ready_approval', 'approved'], ico: '✅' },
  { key: 'done',     lbl: 'Dokončené',           statuses: ['completed', 'closed'],   ico: '📦' }
];

function gpnStatusBadge(s) { const m = GPN_STATUS[s] || GPN_STATUS.new; return `<span class="gpn-badge ${m.cls}">${m.lbl}</span>`; }
function gpnPriorityBadge(p) { const m = GPN_PRIORITY[p] || GPN_PRIORITY.normal; return `<span class="gpn-badge ${m.cls}">${m.lbl}</span>`; }
function gpnDateInput(iso) { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; return d.toISOString().slice(0, 10); }
function gpnDeadlineTag(t) {
  if (!t.deadline) return '';
  const days = Math.ceil((new Date(t.deadline) - new Date()) / 864e5);
  const done = t.status === 'completed' || t.status === 'closed';
  const cls = done ? 'gpn-dl-ok' : (days < 0 ? 'gpn-dl-late' : (days <= 3 ? 'gpn-dl-soon' : 'gpn-dl'));
  const lbl = done ? fmtDate(t.deadline) : (days < 0 ? `po termíne (${fmtDate(t.deadline)})` : `${fmtDate(t.deadline)} (o ${days} d)`);
  return `<span class="gpn-dl-tag ${cls}">📅 ${lbl}</span>`;
}

async function loadGpn() {
  try { gpnData = await fetch('/api/gpn').then(r => r.json()); if (!Array.isArray(gpnData)) gpnData = []; }
  catch { gpnData = []; }
  gpnPopulateFilters();
  renderGpnKpis();
  renderGpn();
  if (!gpnUsers.length) fetch('/api/users/options').then(r => r.json()).then(u => { gpnUsers = Array.isArray(u) ? u : []; }).catch(() => {});
}

function gpnPopulateFilters() {
  const st = document.getElementById('gpnFStatus');
  if (st && st.options.length <= 1) GPN_STATUS_ORDER.forEach(k => st.add(new Option(GPN_STATUS[k].lbl, k)));
  const pr = document.getElementById('gpnFPriority');
  if (pr && pr.options.length <= 1) Object.keys(GPN_PRIORITY).forEach(k => pr.add(new Option(GPN_PRIORITY[k].lbl, k)));
  const fill = (id, vals) => {
    const el = document.getElementById(id); if (!el) return;
    const cur = el.value;
    el.innerHTML = el.options[0].outerHTML + vals.filter(Boolean).map(v => `<option>${escHtml(v)}</option>`).join('');
    el.value = cur;
  };
  fill('gpnFCustomer', [...new Set(gpnData.map(t => t.customer).filter(Boolean))].sort());
  fill('gpnFProduct', [...new Set(gpnData.map(t => t.product).filter(Boolean))].sort());
  fill('gpnFAssignee', [...new Set(gpnData.map(t => t.assigneeName).filter(Boolean))].sort());
  fill('gpnFRequester', [...new Set(gpnData.map(t => t.requesterName).filter(Boolean))].sort());
}

function renderGpnKpis() {
  const el = document.getElementById('gpnKpis'); if (!el) return;
  el.innerHTML = GPN_BUCKETS.map(b => {
    const n = gpnData.filter(t => b.statuses.includes(t.status)).length;
    return `<button class="gpn-kpi ${gpnFilterBucket === b.key ? 'active' : ''}" onclick="gpnToggleBucket('${b.key}')">
      <span class="gpn-kpi-ico">${b.ico}</span>
      <span class="gpn-kpi-n">${n}</span>
      <span class="gpn-kpi-lbl">${b.lbl}</span>
    </button>`;
  }).join('');
}
function gpnToggleBucket(key) { gpnFilterBucket = gpnFilterBucket === key ? '' : key; renderGpnKpis(); renderGpn(); }

function resetGpnFilters() {
  ['gpnSearch', 'gpnFStatus', 'gpnFPriority', 'gpnFCustomer', 'gpnFProduct', 'gpnFAssignee', 'gpnFRequester', 'gpnFFrom', 'gpnFTo'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  gpnFilterBucket = ''; renderGpnKpis(); renderGpn();
}

function renderGpn() {
  const el = document.getElementById('gpnList'); if (!el) return;
  const q = (document.getElementById('gpnSearch')?.value || '').toLowerCase().trim();
  const fSt = document.getElementById('gpnFStatus')?.value || '';
  const fPr = document.getElementById('gpnFPriority')?.value || '';
  const fCu = document.getElementById('gpnFCustomer')?.value || '';
  const fPd = document.getElementById('gpnFProduct')?.value || '';
  const fAs = document.getElementById('gpnFAssignee')?.value || '';
  const fRe = document.getElementById('gpnFRequester')?.value || '';
  const fFrom = document.getElementById('gpnFFrom')?.value || '';
  const fTo = document.getElementById('gpnFTo')?.value || '';
  const bucket = GPN_BUCKETS.find(b => b.key === gpnFilterBucket);

  let list = gpnData.filter(t => {
    if (bucket && !bucket.statuses.includes(t.status)) return false;
    if (fSt && t.status !== fSt) return false;
    if (fPr && t.priority !== fPr) return false;
    if (fCu && t.customer !== fCu) return false;
    if (fPd && t.product !== fPd) return false;
    if (fAs && t.assigneeName !== fAs) return false;
    if (fRe && t.requesterName !== fRe) return false;
    if (fFrom && new Date(t.createdAt) < new Date(fFrom)) return false;
    if (fTo) { const d = new Date(fTo); d.setHours(23, 59, 59); if (new Date(t.createdAt) > d) return false; }
    if (q) {
      const hay = `${t.number} ${t.product} ${t.customer} ${t.project} ${t.description} ${t.resultGpn} ${t.requesterName} ${t.assigneeName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!list.length) {
    el.innerHTML = '<div class="proc-empty" style="padding:20px">Žiadne požiadavky. Klikni na <strong>+ Nová požiadavka</strong> alebo <strong>🎲 Ukážkové dáta</strong>.</div>';
    return;
  }
  el.innerHTML = list.map(t => {
    const s = t.stats || { checklistDone: 0, checklistTotal: 8, progress: 0 };
    return `<div class="gpn-card" onclick="openGpnDetail('${t._id}')">
      <div class="gpn-card-l">
        <div class="gpn-card-top">
          <span class="gpn-num">${escHtml(t.number || '—')}</span>
          ${gpnStatusBadge(t.status)}
          ${gpnPriorityBadge(t.priority)}
          <span class="gpn-type-tag">${GPN_TYPE[t.type] || ''}</span>
        </div>
        <div class="gpn-card-title">${escHtml(t.product || t.description || 'Bez názvu')}${t.productVariant ? ' · ' + escHtml(t.productVariant) : ''}</div>
        <div class="gpn-card-meta">
          ${t.customer ? `<span>🏢 ${escHtml(t.customer)}</span>` : ''}
          ${t.project ? `<span>🗂️ ${escHtml(t.project)}</span>` : ''}
          ${t.requesterName ? `<span>👤 ${escHtml(t.requesterName)}</span>` : ''}
          ${t.assigneeName ? `<span>🔧 ${escHtml(t.assigneeName)}</span>` : '<span class="gpn-unassigned">🔧 nepriradené</span>'}
          ${gpnDeadlineTag(t)}
        </div>
      </div>
      <div class="gpn-card-r">
        <div class="gpn-mini-bar" title="Dokumentácia ${s.checklistDone}/${s.checklistTotal}"><div class="gpn-mini-fill" style="width:${s.progress}%"></div></div>
        <div class="gpn-mini-lbl">${s.checklistDone}/${s.checklistTotal} dok.</div>
        <div class="gpn-card-date">${fmtDate(t.createdAt)}</div>
      </div>
    </div>`;
  }).join('');
}

// ── Formulár požiadavky ─────────────────────────────────────────────────────────
function gpnEmptyCable() { return { cableType: '', count: 1, length: '', color: '', marking: '' }; }
function gpnEmptyConnector() { return { connectorA: '', connectorB: '', orientation: '', pinout: '' }; }

function openGpnForm(t = null, isCopy = false) {
  const e = t && typeof t === 'object';
  document.getElementById('gpnFormTitle').textContent = isCopy ? 'Kópia požiadavky' : (e ? 'Upraviť požiadavku ' + (t.number || '') : 'Nová požiadavka GPN');
  document.getElementById('gpnFormId').value = e && !isCopy ? t._id : '';
  const g = id => document.getElementById(id);
  g('gpnType').value = e ? (t.type || 'new') : 'new';
  g('gpnPriority').value = e ? (t.priority || 'normal') : 'normal';
  g('gpnExistingGpn').value = e ? (t.existingGpn || '') : '';
  g('gpnReason').value = e ? (t.reason || '') : '';
  g('gpnRequesterName').value = e ? (t.requesterName || '') : ((CURRENT_USER && CURRENT_USER.name) || '');
  g('gpnDescription').value = e ? (t.description || '') : '';
  g('gpnProduct').value = e ? (t.product || '') : '';
  g('gpnProductVariant').value = e ? (t.productVariant || '') : '';
  g('gpnCustomer').value = e ? (t.customer || '') : '';
  g('gpnProject').value = e ? (t.project || '') : '';
  const m = (e && t.material) || {};
  g('gpnMatTubing').value = m.tubing || ''; g('gpnMatSleeve').value = m.sleeve || ''; g('gpnMatLabel').value = m.label || '';
  g('gpnMatHeatShrink').value = m.heatShrink || ''; g('gpnMatOther').value = m.other || '';
  g('gpnDeadline').value = e ? gpnDateInput(t.deadline) : '';
  g('gpnSpecial').value = e ? (t.special || '') : '';
  g('gpnNotes').value = e && t.notes !== 'seed' ? (t.notes || '') : '';
  gpnFormCables = e && (t.cables || []).length ? t.cables.map(c => ({ ...c })) : [gpnEmptyCable()];
  gpnFormConnectors = e && (t.connectors || []).length ? t.connectors.map(c => ({ ...c })) : [gpnEmptyConnector()];
  gpnToggleExisting();
  renderGpnCables(); renderGpnConnectors();
  document.getElementById('gpnFormModal').classList.remove('hidden');
  modalSnapshot('gpnFormModal');
}
function closeGpnForm() { modalGuardClose('gpnFormModal'); }
function gpnToggleExisting() {
  document.getElementById('gpnExistingWrap').style.display = document.getElementById('gpnType').value === 'modify' ? '' : 'none';
}

function renderGpnCables() {
  const b = document.getElementById('gpnCablesBody'); if (!b) return;
  b.innerHTML = gpnFormCables.map((c, i) => `<tr>
    <td><input class="gpn-in" value="${escHtml(c.cableType || '')}" oninput="gpnUpdCable(${i},'cableType',this.value)" placeholder="napr. G657A2 2mm"></td>
    <td><input class="gpn-in" type="number" min="1" value="${c.count || 1}" oninput="gpnUpdCable(${i},'count',this.value)"></td>
    <td><input class="gpn-in" value="${escHtml(c.length || '')}" oninput="gpnUpdCable(${i},'length',this.value)" placeholder="2,5 m"></td>
    <td><input class="gpn-in" value="${escHtml(c.color || '')}" oninput="gpnUpdCable(${i},'color',this.value)" placeholder="žltá"></td>
    <td><input class="gpn-in" value="${escHtml(c.marking || '')}" oninput="gpnUpdCable(${i},'marking',this.value)" placeholder="označenie"></td>
    <td><button type="button" class="tk-sub-del" onclick="gpnDelCable(${i})">✕</button></td>
  </tr>`).join('');
}
function gpnUpdCable(i, f, v) { if (gpnFormCables[i]) gpnFormCables[i][f] = v; }
function gpnAddCable() { gpnFormCables.push(gpnEmptyCable()); renderGpnCables(); }
function gpnDelCable(i) { gpnFormCables.splice(i, 1); if (!gpnFormCables.length) gpnFormCables.push(gpnEmptyCable()); renderGpnCables(); }

function renderGpnConnectors() {
  const b = document.getElementById('gpnConnectorsBody'); if (!b) return;
  b.innerHTML = gpnFormConnectors.map((c, i) => `<tr>
    <td><input class="gpn-in" value="${escHtml(c.connectorA || '')}" oninput="gpnUpdConn(${i},'connectorA',this.value)" placeholder="LC/UPC"></td>
    <td><input class="gpn-in" value="${escHtml(c.connectorB || '')}" oninput="gpnUpdConn(${i},'connectorB',this.value)" placeholder="SC/APC"></td>
    <td><input class="gpn-in" value="${escHtml(c.orientation || '')}" oninput="gpnUpdConn(${i},'orientation',this.value)" placeholder="A→B"></td>
    <td><input class="gpn-in" value="${escHtml(c.pinout || '')}" oninput="gpnUpdConn(${i},'pinout',this.value)" placeholder="pinout"></td>
    <td><button type="button" class="tk-sub-del" onclick="gpnDelConn(${i})">✕</button></td>
  </tr>`).join('');
}
function gpnUpdConn(i, f, v) { if (gpnFormConnectors[i]) gpnFormConnectors[i][f] = v; }
function gpnAddConnector() { gpnFormConnectors.push(gpnEmptyConnector()); renderGpnConnectors(); }
function gpnDelConn(i) { gpnFormConnectors.splice(i, 1); if (!gpnFormConnectors.length) gpnFormConnectors.push(gpnEmptyConnector()); renderGpnConnectors(); }

async function saveGpn() {
  const g = id => document.getElementById(id).value.trim();
  const body = {
    type: document.getElementById('gpnType').value,
    priority: document.getElementById('gpnPriority').value,
    existingGpn: g('gpnExistingGpn'),
    reason: g('gpnReason'), description: g('gpnDescription'),
    requesterName: g('gpnRequesterName'),
    product: g('gpnProduct'), productVariant: g('gpnProductVariant'),
    customer: g('gpnCustomer'), project: g('gpnProject'),
    material: { tubing: g('gpnMatTubing'), sleeve: g('gpnMatSleeve'), label: g('gpnMatLabel'), heatShrink: g('gpnMatHeatShrink'), other: g('gpnMatOther') },
    deadline: document.getElementById('gpnDeadline').value || null,
    special: g('gpnSpecial'), notes: g('gpnNotes'),
    cables: gpnFormCables.filter(c => c.cableType || c.length || c.color || c.marking),
    connectors: gpnFormConnectors.filter(c => c.connectorA || c.connectorB || c.orientation || c.pinout)
  };
  if (!body.product && !body.description && !body.reason) { toast('Vyplň aspoň produkt, dôvod alebo popis.', 'error'); return; }
  const id = document.getElementById('gpnFormId').value;
  try {
    const r = await fetch(id ? '/api/gpn/' + id : '/api/gpn', {
      method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    modalSnapshot('gpnFormModal'); closeGpnForm(); await loadGpn();
    toast(id ? 'Požiadavka uložená.' : `Vytvorená požiadavka ${d.number}.`, 'success');
    if (!id) openGpnDetail(d._id);
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

// ── Detail ticketu ──────────────────────────────────────────────────────────────
async function openGpnDetail(id) {
  gpnDetailId = id;
  document.getElementById('gpnDetailModal').classList.remove('hidden');
  document.getElementById('gpnDetailBody').innerHTML = '<div class="proc-empty" style="padding:30px">Načítavam…</div>';
  try {
    const t = await fetch('/api/gpn/' + id).then(r => r.json());
    renderGpnDetail(t);
  } catch (e) { document.getElementById('gpnDetailBody').innerHTML = '<div class="proc-empty">Chyba načítania.</div>'; }
}
function closeGpnDetail() { document.getElementById('gpnDetailModal').classList.add('hidden'); gpnDetailId = null; }

function gpnRow(label, val) { return val ? `<div class="gpn-kv"><span class="gpn-k">${label}</span><span class="gpn-v">${escHtml(String(val))}</span></div>` : ''; }

function renderGpnDetail(t) {
  document.getElementById('gpnDetailTitle').innerHTML = `${escHtml(t.number || 'Ticket')} ${gpnStatusBadge(t.status)} ${gpnPriorityBadge(t.priority)}`;
  const body = document.getElementById('gpnDetailBody');
  const s = t.stats || { checklistDone: 0, checklistTotal: 8, progress: 0 };

  // Workflow lišta
  const steps = GPN_STATUS_ORDER.filter(k => k !== 'waiting_info').map(k => {
    const idx = GPN_STATUS_ORDER.indexOf(t.status);
    const kIdx = GPN_STATUS_ORDER.indexOf(k);
    const active = t.status === k;
    const passed = kIdx < idx && t.status !== 'waiting_info';
    return `<div class="gpn-wf-step ${active ? 'active' : ''} ${passed ? 'passed' : ''}"><span class="gpn-wf-dot"></span><span class="gpn-wf-lbl">${GPN_STATUS[k].lbl}</span></div>`;
  }).join('<span class="gpn-wf-sep"></span>');

  // Akcie stavu
  const next = GPN_STATUS[t.status]?.next;
  const statusOpts = GPN_STATUS_ORDER.map(k => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${GPN_STATUS[k].lbl}</option>`).join('');

  // Checklist
  const checkMap = {}; (t.checklist || []).forEach(i => checkMap[i.key] = i);
  const checklist = GPN_CHECKLIST_ORDER.map(k => {
    const it = checkMap[k] || { done: false };
    return `<label class="gpn-check ${it.done ? 'done' : ''}">
      <input type="checkbox" ${it.done ? 'checked' : ''} onchange="gpnToggleCheck('${t._id}','${k}',this.checked)">
      <span class="gpn-check-lbl">${GPN_CHECKLIST[k]}</span>
      ${it.done && it.doneBy ? `<span class="gpn-check-by">${escHtml(it.doneBy)}</span>` : ''}
    </label>`;
  }).join('');

  // Káble & konektory
  const cables = (t.cables || []).length ? `<table class="gpn-vtable"><thead><tr><th>Typ</th><th>Ks</th><th>Dĺžka</th><th>Farba</th><th>Označenie</th></tr></thead><tbody>${t.cables.map(c => `<tr><td>${escHtml(c.cableType || '')}</td><td>${c.count || ''}</td><td>${escHtml(c.length || '')}</td><td>${escHtml(c.color || '')}</td><td>${escHtml(c.marking || '')}</td></tr>`).join('')}</tbody></table>` : '<div class="gpn-none">—</div>';
  const conns = (t.connectors || []).length ? `<table class="gpn-vtable"><thead><tr><th>Konektor A</th><th>Konektor B</th><th>Orientácia</th><th>Pinout</th></tr></thead><tbody>${t.connectors.map(c => `<tr><td>${escHtml(c.connectorA || '')}</td><td>${escHtml(c.connectorB || '')}</td><td>${escHtml(c.orientation || '')}</td><td>${escHtml(c.pinout || '')}</td></tr>`).join('')}</tbody></table>` : '<div class="gpn-none">—</div>';
  const mat = t.material || {};
  const matRows = [gpnRow('Tubing', mat.tubing), gpnRow('Sleeve', mat.sleeve), gpnRow('Label', mat.label), gpnRow('Heat shrink', mat.heatShrink), gpnRow('Iný materiál', mat.other)].join('') || '<div class="gpn-none">—</div>';

  // Prílohy
  const atts = (t.attachments || []).length ? t.attachments.map(a => `<div class="gpn-att">
      <a href="${a.url}" target="_blank" class="gpn-att-link">${GPN_ATT_CAT[a.category] || '📎'} ${escHtml(a.name || a.url)}</a>
      ${a.size ? `<span class="gpn-att-size">${(a.size / 1024).toFixed(0)} kB</span>` : ''}
      <button class="tk-sub-del" onclick="gpnDeleteAtt('${t._id}','${a._id}')">✕</button>
    </div>`).join('') : '<div class="gpn-none">Žiadne prílohy</div>';

  // Komentáre
  const comments = (t.comments || []).length ? t.comments.slice().reverse().map(c => `<div class="gpn-comment"><div class="gpn-comment-hd"><strong>${escHtml(c.by || '—')}</strong><span>${fmtDateTime(c.at)}</span></div><div class="gpn-comment-tx">${escHtml(c.text)}</div></div>`).join('') : '<div class="gpn-none">Zatiaľ bez komentárov</div>';

  // História
  const history = (t.history || []).slice().reverse().map(h => {
    let txt = h.note || '';
    if (h.action === 'status') txt = `Stav: ${GPN_STATUS[h.from]?.lbl || h.from} → ${GPN_STATUS[h.to]?.lbl || h.to}`;
    else if (h.action === 'assigned') txt = `Priradenie: ${escHtml(h.from)} → ${escHtml(h.to)}`;
    else if (h.action === 'checklist') txt = `Checklist: ${GPN_CHECKLIST[h.field] || h.field} — ${h.to === 'done' ? 'hotové' : 'zrušené'}`;
    else if (h.action === 'created') txt = 'Požiadavka vytvorená';
    else if (h.action === 'edited') txt = 'Upravené parametre';
    return `<div class="gpn-hist"><span class="gpn-hist-dot"></span><div><div class="gpn-hist-tx">${escHtml(txt)}</div><div class="gpn-hist-meta">${escHtml(h.by || '')} · ${fmtDateTime(h.at)}</div></div></div>`;
  }).join('') || '<div class="gpn-none">—</div>';

  const assigneeOpts = ['<option value="">— nepriradené —</option>'].concat(
    gpnUsers.map(u => `<option value="${u._id}" ${t.assignee === u._id ? 'selected' : ''}>${escHtml(u.name || u.username)}</option>`)
  ).join('');

  body.innerHTML = `
    <div class="gpn-wf">${steps}</div>
    ${t.status === 'waiting_info' ? '<div class="gpn-wait-banner">⏳ Ticket čaká na doplnenie informácií od obchodníka.</div>' : ''}

    <div class="gpn-detail-grid">
      <div class="gpn-detail-main">
        <div class="gpn-sec">
          <div class="gpn-sec-hd">Požiadavka</div>
          <div class="gpn-kvs">
            ${gpnRow('Typ', GPN_TYPE[t.type])}
            ${gpnRow('Upravované GPN', t.existingGpn)}
            ${gpnRow('Dôvod', t.reason)}
            ${gpnRow('Produkt', [t.product, t.productVariant].filter(Boolean).join(' · '))}
            ${gpnRow('Zákazník', t.customer)}
            ${gpnRow('Projekt', t.project)}
            ${gpnRow('Termín', t.deadline ? fmtDate(t.deadline) : '')}
            ${gpnRow('Špeciálne požiadavky', t.special)}
            ${gpnRow('Výsledné GPN', t.resultGpn)}
          </div>
          ${t.description ? `<div class="gpn-desc">${escHtml(t.description)}</div>` : ''}
          ${t.notes && t.notes !== 'seed' ? `<div class="gpn-desc">📝 ${escHtml(t.notes)}</div>` : ''}
        </div>

        <div class="gpn-sec"><div class="gpn-sec-hd">Káble</div>${cables}</div>
        <div class="gpn-sec"><div class="gpn-sec-hd">Konektory</div>${conns}</div>
        <div class="gpn-sec"><div class="gpn-sec-hd">Materiál</div><div class="gpn-kvs">${matRows}</div></div>

        <div class="gpn-sec">
          <div class="gpn-sec-hd">Prílohy</div>
          <div id="gpnDrop" class="gpn-drop" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="gpnDrop(event,'${t._id}')">
            Presuň sem súbory (drag &amp; drop) alebo
            <label class="gpn-drop-btn">vyber súbory<input type="file" multiple style="display:none" onchange="gpnUploadFiles('${t._id}', this.files, document.getElementById('gpnAttCat').value)"></label>
            <select id="gpnAttCat" class="gpn-att-cat" onclick="event.stopPropagation()">
              ${Object.keys(GPN_ATT_CAT).map(k => `<option value="${k}">${GPN_ATT_CAT[k]}</option>`).join('')}
            </select>
          </div>
          <div class="gpn-atts">${atts}</div>
        </div>

        <div class="gpn-sec">
          <div class="gpn-sec-hd">Komentáre</div>
          <div class="gpn-comment-new">
            <textarea id="gpnCommentTx" rows="2" placeholder="Napíš komentár…"></textarea>
            <button class="btn-primary btn-sm" onclick="gpnAddComment('${t._id}')">Pridať</button>
          </div>
          <div class="gpn-comments">${comments}</div>
        </div>
      </div>

      <div class="gpn-detail-side">
        <div class="gpn-sec">
          <div class="gpn-sec-hd">Workflow</div>
          ${next ? `<button class="btn-primary gpn-full-btn" onclick="gpnSetStatus('${t._id}','${next}')">▶ ${GPN_STATUS[next].lbl}</button>` : ''}
          ${t.status !== 'waiting_info' ? `<button class="btn-secondary gpn-full-btn" onclick="gpnSetStatus('${t._id}','waiting_info')">⏳ Vrátiť obchodníkovi</button>` : ''}
          <label class="gpn-side-lbl">Nastaviť stav ručne</label>
          <select class="gpn-side-sel" onchange="gpnSetStatus('${t._id}',this.value)">${statusOpts}</select>
        </div>

        <div class="gpn-sec">
          <div class="gpn-sec-hd">Priradenie</div>
          <label class="gpn-side-lbl">Technológ</label>
          <select class="gpn-side-sel" onchange="gpnAssign('${t._id}',this)">${assigneeOpts}</select>
          <div class="gpn-side-info">Obchodník: <strong>${escHtml(t.requesterName || '—')}</strong></div>
          <div class="gpn-side-info">Vytvorené: ${fmtDateTime(t.createdAt)}</div>
        </div>

        <div class="gpn-sec">
          <div class="gpn-sec-hd">Dokumentácia <span class="gpn-check-pct">${s.checklistDone}/${s.checklistTotal}</span></div>
          <div class="gpn-detail-bar"><div class="gpn-detail-fill" style="width:${s.progress}%"></div></div>
          <div class="gpn-checks">${checklist}</div>
        </div>

        <div class="gpn-sec">
          <div class="gpn-sec-hd">História</div>
          <div class="gpn-hists">${history}</div>
        </div>

        <div class="gpn-side-actions">
          <button class="btn-secondary btn-sm" onclick="gpnEditFromDetail('${t._id}')">✎ Upraviť</button>
          <button class="btn-secondary btn-sm" onclick="gpnCopyTicket('${t._id}')">⧉ Kopírovať</button>
          <button class="btn-delete btn-sm" onclick="deleteGpnTicket('${t._id}')">🗑 Zmazať</button>
        </div>
      </div>
    </div>`;
}

function gpnFind(id) { return gpnData.find(t => t._id === id); }
function gpnEditFromDetail(id) { const t = gpnFind(id); openGpnForm(t || { _id: id }, false); }
function gpnCopyTicket(id) { const t = gpnFind(id); if (t) { closeGpnDetail(); openGpnForm(t, true); } }

async function gpnRefreshDetail(id, saved) {
  if (saved) renderGpnDetail(saved);
  else { const t = await fetch('/api/gpn/' + id).then(r => r.json()); renderGpnDetail(t); }
  // aktualizuj lokálny zoznam bez plného reloadu
  const idx = gpnData.findIndex(t => t._id === id);
  if (idx >= 0 && saved) gpnData[idx] = saved;
  renderGpnKpis(); renderGpn();
}

async function gpnSetStatus(id, status) {
  try {
    const r = await fetch(`/api/gpn/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await gpnRefreshDetail(id, d);
    toast('Stav zmenený na „' + (GPN_STATUS[status]?.lbl || status) + '".', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function gpnAssign(id, sel) {
  const opt = sel.options[sel.selectedIndex];
  try {
    const r = await fetch(`/api/gpn/${id}/assign`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignee: sel.value || null, assigneeName: sel.value ? opt.textContent : '' }) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await gpnRefreshDetail(id, d);
    toast('Technológ priradený.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function gpnToggleCheck(id, key, done) {
  try {
    const r = await fetch(`/api/gpn/${id}/checklist/${key}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await gpnRefreshDetail(id, d);
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function gpnAddComment(id) {
  const tx = document.getElementById('gpnCommentTx'); const text = tx.value.trim();
  if (!text) return;
  try {
    const r = await fetch(`/api/gpn/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await gpnRefreshDetail(id, d);
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
function gpnDrop(ev, id) {
  ev.preventDefault(); ev.currentTarget.classList.remove('over');
  const cat = document.getElementById('gpnAttCat')?.value || 'other';
  if (ev.dataTransfer.files && ev.dataTransfer.files.length) gpnUploadFiles(id, ev.dataTransfer.files, cat);
}
async function gpnUploadFiles(id, files, category) {
  if (!files || !files.length) return;
  const fd = new FormData();
  fd.append('category', category || 'other');
  Array.from(files).forEach(f => fd.append('files', f));
  try {
    const r = await fetch(`/api/gpn/${id}/attachments`, { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await gpnRefreshDetail(id, d);
    toast('Prílohy nahrané.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function gpnDeleteAtt(id, attId) {
  if (!await uiConfirm('Odstrániť prílohu?')) return;
  try {
    const r = await fetch(`/api/gpn/${id}/attachments/${attId}`, { method: 'DELETE' });
    const d = await r.json();
    await gpnRefreshDetail(id, d);
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function deleteGpnTicket(id) {
  if (!await uiConfirm('Naozaj zmazať celý ticket? Túto akciu nemožno vrátiť.')) return;
  try {
    await fetch('/api/gpn/' + id, { method: 'DELETE' });
    closeGpnDetail(); await loadGpn();
    toast('Ticket zmazaný.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

async function seedGpnData() {
  if (!await uiConfirm('Načítať ukážkové GPN požiadavky? Nahradí len predošlé ukážkové dáta.')) return;
  try {
    const r = await fetch('/api/admin/seed-gpn', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    await loadGpn();
    toast(`Hotovo — ${d.tickets} ukážkových požiadaviek.`, 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  VLASTNÍCI PRODUKTOV (Product Owners) — editovateľný zoznam + história zmien
// ══════════════════════════════════════════════════════════════════════════════
let pownersData = [];
let pownersNoOwner = false;   // filter „bez vlastníka" (cez klik na štatistiku)
const PWO_STATUS = {
  NOK:  { lbl: 'NOK',  cls: 'pwo-st-nok' },
  WIP:  { lbl: 'WIP',  cls: 'pwo-st-wip' },
  DONE: { lbl: 'DONE', cls: 'pwo-st-done' }
};
function pownerStatusBadge(s) {
  const m = PWO_STATUS[(s || '').toUpperCase()];
  if (m) return `<span class="pwo-badge ${m.cls}">${m.lbl}</span>`;
  return s ? `<span class="pwo-badge pwo-st-other">${escHtml(s)}</span>` : '';
}
function pownerOwners(r) { return [r.owner].filter(Boolean); }

async function loadPowners() {
  try { pownersData = await fetch('/api/product-owners').then(r => r.json()); if (!Array.isArray(pownersData)) pownersData = []; }
  catch { pownersData = []; }
  // naplň filtre + datalisty
  const kinds = [...new Set(pownersData.map(r => r.kind).filter(Boolean))].sort();
  const owners = [...new Set(pownersData.flatMap(r => [r.owner, r.backup]).filter(Boolean))].sort();
  const fillSel = (id, vals, keep) => { const el = document.getElementById(id); if (!el) return; const cur = el.value; el.innerHTML = `<option value="">${keep}</option>` + vals.map(v => `<option value="${escHtml(v)}">${escHtml(v)}</option>`).join(''); el.value = cur; };
  fillSel('pownersKind', kinds, 'Všetky druhy');
  fillSel('pownersOwner', owners, 'Všetci vlastníci');
  const st = document.getElementById('pownersStatus'); if (st && st.options.length <= 1) { ['NOK', 'WIP', 'DONE'].forEach(s => st.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`)); }
  document.getElementById('pwoKindList').innerHTML = kinds.map(k => `<option value="${escHtml(k)}">`).join('');
  document.getElementById('pwoOwnerList').innerHTML = owners.map(o => `<option value="${escHtml(o)}">`).join('');
  renderPowners();
}

function renderPowners() {
  const el = document.getElementById('pownersRows'); if (!el) return;
  const q = (document.getElementById('pownersSearch')?.value || '').toLowerCase().trim();
  const fk = document.getElementById('pownersKind')?.value || '';
  const fs = document.getElementById('pownersStatus')?.value || '';
  const fo = document.getElementById('pownersOwner')?.value || '';
  let list = pownersData.filter(r => {
    if (fk && r.kind !== fk) return false;
    if (fs && (r.status || '').toUpperCase() !== fs) return false;
    if (fo && ![r.owner, r.backup].includes(fo)) return false;
    if (pownersNoOwner && pownerOwners(r).length) return false;
    if (q) { const hay = [r.product, r.description, r.owner, r.backup, r.kind, r.todo].join(' ').toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
  renderPownerKpis();
  document.getElementById('pownersCount').textContent = `${list.length} / ${pownersData.length} záznamov`;
  if (!list.length) { el.innerHTML = '<tr><td colspan="9" class="powners-empty">Žiadne záznamy. Skús <strong>📥 Import z Excelu</strong> alebo <strong>+ Nový záznam</strong>.</td></tr>'; return; }
  el.innerHTML = list.map(r => `
    <tr onclick="openPowner('${r._id}')">
      <td class="pwo-nr">${r.nr ?? ''}</td>
      <td>${escHtml(r.kind || '')}</td>
      <td class="pwo-prod">${escHtml(r.product || '')}</td>
      <td class="pwo-desc">${escHtml(r.description || '')}</td>
      <td>${escHtml(r.owner || '')}</td>
      <td class="pwo-dim">${escHtml(r.backup || '')}</td>
      <td>${pownerStatusBadge(r.status)}</td>
      <td class="pwo-todo" title="${escHtml(r.todo || '')}">${escHtml(r.todo || '')}</td>
      <td class="pwo-hist-col">${(r.history && r.history.length) ? `<span class="pwo-hist-dot" title="${r.history.length} zmien v histórii">🕒 ${r.history.length}</span>` : ''}</td>
    </tr>`).join('');
}

function renderPownerKpis() {
  const el = document.getElementById('pownersKpis'); if (!el) return;
  const total = pownersData.length;
  const by = s => pownersData.filter(r => (r.status || '').toUpperCase() === s).length;
  const noOwner = pownersData.filter(r => !pownerOwners(r).length).length;
  const fs = document.getElementById('pownersStatus')?.value || '';
  const allActive = !fs && !pownersNoOwner;
  const act = c => c ? ' active' : '';
  el.innerHTML = `
    <button class="powners-kpi${act(allActive)}" onclick="pownerKpiClick('all')"><span class="pk-num">${total}</span><span class="pk-lbl">Produktov</span></button>
    <button class="powners-kpi pk-done${act(fs === 'DONE')}" onclick="pownerKpiClick('DONE')"><span class="pk-num">${by('DONE')}</span><span class="pk-lbl">DONE</span></button>
    <button class="powners-kpi pk-wip${act(fs === 'WIP')}" onclick="pownerKpiClick('WIP')"><span class="pk-num">${by('WIP')}</span><span class="pk-lbl">WIP</span></button>
    <button class="powners-kpi pk-nok${act(fs === 'NOK')}" onclick="pownerKpiClick('NOK')"><span class="pk-num">${by('NOK')}</span><span class="pk-lbl">NOK</span></button>
    <button class="powners-kpi pk-warn${act(pownersNoOwner)}" onclick="pownerKpiClick('noowner')"><span class="pk-num">${noOwner}</span><span class="pk-lbl">Bez vlastníka</span></button>`;
}
// Klik na štatistiku → nastaví filter tabuľky (toggle)
function pownerKpiClick(kind) {
  const st = document.getElementById('pownersStatus');
  if (kind === 'all') { pownersNoOwner = false; if (st) st.value = ''; }
  else if (kind === 'noowner') { pownersNoOwner = !pownersNoOwner; if (st) st.value = ''; }
  else { pownersNoOwner = false; if (st) st.value = (st.value === kind ? '' : kind); }
  renderPowners();
}

function openPowner(id) { const r = pownersData.find(x => x._id === id); if (r) openPownerModal(r); }

function openPownerModal(r = null) {
  const e = r && typeof r === 'object';
  document.getElementById('pownerModalTitle').textContent = e ? `Úprava: ${r.product || r.description || 'záznam'}` : 'Nový záznam';
  document.getElementById('pwoId').value = e ? r._id : '';
  const set = (id, v) => { document.getElementById(id).value = v ?? ''; };
  set('pwoNr', e ? r.nr : ''); set('pwoKind', e ? r.kind : ''); set('pwoStatus', e ? (r.status || '') : '');
  set('pwoProduct', e ? r.product : ''); set('pwoDesc', e ? r.description : '');
  set('pwoOwner', e ? r.owner : ''); set('pwoBackup', e ? r.backup : '');
  set('pwoTodo', e ? r.todo : ''); set('pwoNote', e ? r.note : '');
  document.getElementById('pwoDeleteBtn').style.display = e ? '' : 'none';
  renderPownerHistory(e ? r.history : []);
  document.getElementById('pownerModal').classList.remove('hidden');
  modalSnapshot('pownerModal');
}
function closePownerModal() { modalGuardClose('pownerModal'); }

function renderPownerHistory(history) {
  const el = document.getElementById('pwoHistory'); if (!el) return;
  const h = (history || []).slice().reverse();
  if (!h.length) { el.innerHTML = ''; return; }
  const fmt = d => { try { return new Date(d).toLocaleString('sk-SK'); } catch { return ''; } };
  el.innerHTML = `
    <div class="pwo-hist-hdr">🕒 História zmien (${h.length})</div>
    <div class="pwo-hist-list">
      ${h.map(e => `
        <div class="pwo-hist-item">
          <div class="pwo-hist-meta"><strong>${escHtml(e.user || '—')}</strong> · ${escHtml(fmt(e.at))} · ${e.action === 'create' ? 'vytvorenie' : 'úprava'}</div>
          ${(e.changes && e.changes.length) ? `<ul class="pwo-hist-changes">${e.changes.map(c => `<li><span class="pwo-hc-field">${escHtml(c.label || c.field)}</span>: <span class="pwo-hc-from">${escHtml(c.from || '—')}</span> → <span class="pwo-hc-to">${escHtml(c.to || '—')}</span></li>`).join('')}</ul>` : ''}
        </div>`).join('')}
    </div>`;
}

async function savePowner() {
  const g = id => document.getElementById(id).value;
  const body = {
    nr: g('pwoNr'), kind: g('pwoKind').trim(),
    product: g('pwoProduct').trim(), description: g('pwoDesc').trim(),
    owner: g('pwoOwner').trim(), backup: g('pwoBackup').trim(),
    status: g('pwoStatus'), todo: g('pwoTodo').trim(), note: g('pwoNote').trim()
  };
  if (!body.product && !body.description) { toast('Zadaj výrobok alebo popis.', 'error'); return; }
  const id = document.getElementById('pwoId').value;
  try {
    const r = await fetch(id ? '/api/product-owners/' + id : '/api/product-owners', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    modalSnapshot('pownerModal'); closePownerModal(); loadPowners();
    toast('Uložené.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

async function deletePowner(id) {
  if (!id || !await uiConfirm('Odstrániť tento záznam vlastníka produktu?')) return;
  try {
    await fetch('/api/product-owners/' + id, { method: 'DELETE' });
    modalSnapshot('pownerModal'); closePownerModal(); loadPowners();
    toast('Záznam odstránený.', 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

async function importPownersData() {
  if (!await uiConfirm('Naimportovať dáta z Excelu? POZOR: zmaže všetky aktuálne záznamy vrátane histórie a nahradí ich pôvodným zoznamom z Excelu.')) return;
  try {
    const r = await fetch('/api/admin/seed-product-owners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    loadPowners();
    toast(`Naimportované: ${d.imported || 0} záznamov.`, 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
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
  // AI analýza/optimalizácia je skrytá (na želanie) — panel necháme prázdny
  const aiEl = document.getElementById('prodAi'); if (aiEl) { aiEl.innerHTML = ''; aiEl.classList.add('hidden'); }
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
  prodGanttSyncTopScroll();
}
// Horný horizontálny scrollbar synchronizovaný s Gantt plátnom
function prodGanttSyncTopScroll() {
  const wrap = document.getElementById('prodGanttWrap'), top = document.getElementById('prodGanttTopScroll'), inner = document.getElementById('prodGanttTopScrollInner'), chart = document.getElementById('prodGanttChart');
  if (!wrap || !top || !inner || !chart) return;
  inner.style.width = chart.scrollWidth + 'px';
  if (!top._bound) {
    top._bound = true;
    top.addEventListener('scroll', () => { if (top._lock) return; wrap._lock = true; wrap.scrollLeft = top.scrollLeft; wrap._lock = false; });
    wrap.addEventListener('scroll', () => { if (wrap._lock) return; top._lock = true; top.scrollLeft = wrap.scrollLeft; top._lock = false; });
  }
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
const US_ROLE = { admin: 'Admin', user: 'Používateľ', obchod: 'Obchod', kvalita: 'Kvalita', technologia: 'Technológia' };
// Farebné odznaky rolí (trieda + skratka)
const US_ROLE_CHIP = {
  admin:      { cls: 'us-role-admin', lbl: 'ADMIN' },
  obchod:     { cls: 'us-role-obchod', lbl: 'OBCHOD' },
  kvalita:    { cls: 'us-role-kvalita', lbl: 'KVALITA' },
  technologia:{ cls: 'us-role-tech', lbl: 'TECHNOLÓGIA' },
  user:       { cls: 'us-role-user', lbl: 'USER' }
};
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
    let mail = '';
    if (u.email) {
      const vb = u.emailVerified
        ? '<span class="us-verify-badge us-vb-ok" title="E-mail overený">✓ overený</span>'
        : `<span class="us-verify-badge us-vb-wait" title="E-mail neoverený">⌛ neoverený</span>`;
      mail = ` · <span style="color:var(--text-dim)">${escHtml(u.email)}</span> ${vb}`;
    }
    const resendBtn = (u.email && !u.emailVerified)
      ? `<button class="admin-icon-btn" onclick="resendVerification('${u._id}')" title="Znovu poslať overovací e-mail">✉</button>` : '';
    const chip = US_ROLE_CHIP[u.role] || US_ROLE_CHIP.user;
    item.innerHTML = `
      <span class="us-role-chip ${chip.cls} admin-link-chip">${chip.lbl}</span>
      <div class="admin-link-info">
        <div class="admin-link-label">${escHtml(u.name || u.username)} <span style="color:var(--text-xdim)">@${escHtml(u.username)}</span></div>
        <div class="admin-link-url">${US_ROLE[u.role] || u.role}${u.active ? '' : ' · neaktívny'}${mail}</div>
      </div>
      <div class="admin-link-actions">
        ${resendBtn}
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
  document.getElementById('usEmail').value = e ? (u.email || '') : '';
  document.getElementById('usPassword').value = '';
  document.getElementById('usPassword').type = 'password';
  document.getElementById('usPassToggle').classList.remove('active');
  document.getElementById('usPassLabel').textContent = e ? 'Nové heslo (prázdne = bez zmeny)' : 'Heslo *';
  document.getElementById('usRole').value = e ? (u.role || 'user') : 'user';
  document.getElementById('usActive').checked = e ? !!u.active : true;
  document.getElementById('usSendVerify').checked = true;
  document.getElementById('usGenLen').value = 16;
  document.getElementById('usGenSym').checked = true;
  document.getElementById('usGenCopied').textContent = '';
  document.getElementById('usDeleteBtn').style.display = e ? '' : 'none';
  // e-mail badge (overený/neoverený) v modáli
  const badge = document.getElementById('usEmailBadge');
  if (e && u.email) badge.innerHTML = u.emailVerified ? '<span class="us-vb-ok">✓ overený</span>' : '<span class="us-vb-wait">⌛ neoverený</span>';
  else badge.innerHTML = '';
  usPassStrength();
  usEmailChanged();
  document.getElementById('userModal').classList.remove('hidden');
  setTimeout(() => document.getElementById(e ? 'usName' : 'usUsername').focus(), 50);
}
function closeUserModal() { document.getElementById('userModal').classList.add('hidden'); }

// Zobraz/skry pole „Poslať overovací e-mail" podľa toho, či je zadaný e-mail
function usEmailChanged() {
  const has = !!document.getElementById('usEmail').value.trim();
  document.getElementById('usSendVerifyWrap').style.display = has ? '' : 'none';
}

// ── Generátor silného hesla ─────────────────────────────────────────────────────
function usGenPassword() {
  const len = Math.max(8, Math.min(64, parseInt(document.getElementById('usGenLen').value, 10) || 16));
  const useSym = document.getElementById('usGenSym').checked;
  const lower = 'abcdefghijkmnpqrstuvwxyz';     // bez l
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';     // bez I, O
  const digits = '23456789';                    // bez 0, 1
  const symbols = '!@#$%^&*()-_=+[]{}?';
  let pool = lower + upper + digits + (useSym ? symbols : '');
  const rnd = n => {
    const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
  };
  // zaruč aspoň po jednom z každej triedy
  const req = [lower, upper, digits];
  if (useSym) req.push(symbols);
  let chars = req.map(set => set[rnd(set.length)]);
  while (chars.length < len) chars.push(pool[rnd(pool.length)]);
  // zamiešaj (Fisher–Yates)
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  const pass = chars.join('');
  const inp = document.getElementById('usPassword');
  inp.value = pass; inp.type = 'text';
  document.getElementById('usPassToggle').classList.add('active');
  usPassStrength();
  usCopyPass(true);
}
function usTogglePass() {
  const inp = document.getElementById('usPassword');
  const on = inp.type === 'password';
  inp.type = on ? 'text' : 'password';
  document.getElementById('usPassToggle').classList.toggle('active', on);
}
async function usCopyPass(silent) {
  const val = document.getElementById('usPassword').value;
  if (!val) { if (!silent) toast('Heslo je prázdne.', 'warn'); return; }
  try {
    await navigator.clipboard.writeText(val);
    const c = document.getElementById('usGenCopied'); c.textContent = '✓ skopírované';
    setTimeout(() => { c.textContent = ''; }, 2000);
    if (!silent) toast('Heslo skopírované do schránky.', 'success');
  } catch { if (!silent) toast('Kopírovanie zlyhalo — skopíruj ručne.', 'error'); }
}
// Odhad sily hesla (0–4) + vizuál
function usPassStrength() {
  const v = document.getElementById('usPassword').value;
  const fill = document.getElementById('usStrengthFill');
  const lbl = document.getElementById('usStrengthLbl');
  if (!fill || !lbl) return;
  if (!v) { fill.style.width = '0%'; fill.className = 'us-strength-fill'; lbl.textContent = ''; return; }
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  score = Math.min(4, score);
  const map = [
    { w: '20%', c: 'us-s0', t: 'veľmi slabé' },
    { w: '40%', c: 'us-s1', t: 'slabé' },
    { w: '60%', c: 'us-s2', t: 'stredné' },
    { w: '80%', c: 'us-s3', t: 'silné' },
    { w: '100%', c: 'us-s4', t: 'veľmi silné' }
  ][score];
  fill.style.width = map.w; fill.className = 'us-strength-fill ' + map.c; lbl.textContent = map.t;
}

async function saveUser() {
  const id = document.getElementById('usId').value;
  const username = document.getElementById('usUsername').value.trim();
  const email = document.getElementById('usEmail').value.trim();
  const password = document.getElementById('usPassword').value;
  if (!id && (!username || !password)) { toast('Prihlasovacie meno a heslo sú povinné.', 'error'); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Zadaj platný e-mail.', 'error'); return; }
  const body = {
    name: document.getElementById('usName').value.trim(),
    email,
    role: document.getElementById('usRole').value,
    active: document.getElementById('usActive').checked,
    sendVerification: document.getElementById('usSendVerify').checked
  };
  if (password) body.password = password;
  if (!id) body.username = username;
  try {
    const resp = await fetch(id ? '/api/users/' + id : '/api/users', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await resp.json().catch(() => ({}));
    if (!resp.ok) { toast('Chyba: ' + (d.error || resp.status), 'error'); return; }
    closeUserModal(); loadUsers();
    // spätná väzba o overovacom e-maile
    if (d.verifyUrl) {
      if (d.emailSent) toast('Používateľ uložený · overovací e-mail odoslaný.', 'success');
      else usShowVerifyLink(d.verifyUrl, d.mailError);
    } else {
      toast('Používateľ uložený.', 'success');
    }
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

// Keď e-mail nemožno odoslať, ukáž dôvod + odkaz na skopírovanie (fallback)
async function usShowVerifyLink(url, mailError) {
  if (mailError) toast('E-mail sa neodoslal: ' + mailError + ' — skopíruj odkaz ručne.', 'error', 7000);
  else toast('E-mail nie je nakonfigurovaný — skopíruj overovací odkaz používateľovi.', 'warn', 6000);
  try { await navigator.clipboard.writeText(url); toast('Overovací odkaz skopírovaný do schránky.', 'info', 5000); }
  catch { await uiConfirm('Overovací odkaz (pošli ho používateľovi):\n\n' + url); }
}

async function resendVerification(id) {
  try {
    const r = await fetch('/api/users/' + id + '/send-verification', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    if (d.alreadyVerified) { toast('E-mail je už overený.', 'info'); loadUsers(); return; }
    if (d.emailSent) toast('Overovací e-mail odoslaný.', 'success');
    else if (d.verifyUrl) usShowVerifyLink(d.verifyUrl, d.mailError);
    loadUsers();
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

async function deleteUser(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť používateľa?')) return;
  try {
    const r = await fetch('/api/users/' + id, { method: 'DELETE' });
    if (!r.ok) { const er = await r.json().catch(() => ({})); toast('Chyba: ' + (er.error || r.status), 'error'); return; }
    closeUserModal(); loadUsers();
  } catch { toast('Chyba pri mazaní.', 'error'); }
}

// ── Diagnostika e-mailu (Admin → Používatelia) ──────────────────────────────────
async function loadMailStatus() {
  const el = document.getElementById('mailStatus'); if (!el) return;
  el.innerHTML = '<div class="admin-loading">Načítavam…</div>';
  try {
    const d = await fetch('/api/admin/mail-status').then(r => r.json());
    const row = (k, v, ok) => `<div class="mail-kv"><span class="mail-k">${k}</span><span class="mail-v ${ok === false ? 'mail-bad' : (ok ? 'mail-ok' : '')}">${v || '<em>nenastavené</em>'}</span></div>`;
    const e = d.env || {};
    el.innerHTML = `
      <div class="mail-status-head ${d.configured ? 'mail-ok' : 'mail-bad'}">
        ${d.configured ? '✅ E-mail je nakonfigurovaný' : '⚠️ E-mail NIE je nakonfigurovaný'} · metóda: <strong>${d.method || '—'}</strong>
      </div>
      ${row('BREVO_API_KEY', e.BREVO_API_KEY, !!e.BREVO_API_KEY)}
      ${row('EMAIL_SENDER', e.EMAIL_SENDER, !!e.EMAIL_SENDER)}
      ${row('SMTP_HOST', e.SMTP_HOST)}
      ${row('SMTP_PORT', e.SMTP_PORT)}
      ${row('SMTP_USER', e.SMTP_USER)}
      ${row('EMAIL_PASSWORD', e.EMAIL_PASSWORD)}
      ${row('APP_URL', e.APP_URL, !!e.APP_URL)}
      ${!e.EMAIL_SENDER ? '<div class="mail-hint">⚠️ Chýba <code>EMAIL_SENDER</code> — bez overenej adresy odosielateľa Brevo e-mail neodošle.</div>' : ''}
      ${e.BREVO_API_KEY && e.EMAIL_SENDER ? '<div class="mail-hint">ℹ️ Ak test zlyhá s chybou „sender not valid", over adresu <code>' + escHtml(e.EMAIL_SENDER) + '</code> v Breve (Senders &amp; IP).</div>' : ''}
    `;
  } catch (e) { el.innerHTML = '<div class="mail-bad">Chyba načítania stavu.</div>'; }
}
async function sendMailTest() {
  const to = document.getElementById('mailTestTo').value.trim();
  const res = document.getElementById('mailTestResult');
  res.innerHTML = '<span class="admin-loading">Odosielam…</span>';
  try {
    const r = await fetch('/api/admin/mail-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) });
    const d = await r.json();
    if (d.ok) {
      res.innerHTML = `<span class="mail-ok">✅ Odoslané na ${escHtml(d.to)} (${escHtml(d.method)}). Skontroluj schránku aj SPAM.</span>`;
      toast('Testovací e-mail odoslaný.', 'success');
    } else {
      res.innerHTML = `<span class="mail-bad">❌ Neodoslané: ${escHtml(d.error || 'neznáma chyba')}</span>`;
      toast('E-mail zlyhal — pozri detail chyby.', 'error', 5000);
    }
  } catch (e) { res.innerHTML = `<span class="mail-bad">Sieťová chyba: ${escHtml(e.message)}</span>`; }
}

// ── Denný súhrn úloh (Admin → Používatelia) ─────────────────────────────────────
async function loadTaskDigestStatus() {
  const el = document.getElementById('taskDigestStatus'); if (!el) return;
  el.innerHTML = '<div class="admin-loading">Načítavam…</div>';
  try {
    const d = await fetch('/api/admin/task-digest/status').then(r => r.json());
    el.innerHTML = `
      <div class="mail-status-head ${d.mailConfigured ? 'mail-ok' : 'mail-bad'}">
        ${d.mailConfigured ? '✅ E-mail je nakonfigurovaný' : '⚠️ E-mail NIE je nakonfigurovaný — súhrn sa nebude posielať'}
      </div>
      <div class="mail-kv"><span class="mail-k">Čas odoslania</span><span class="mail-v">${escHtml(d.hour)}</span></div>
      <div class="mail-kv"><span class="mail-k">Naposledy odoslané</span><span class="mail-v">${d.lastSentDate ? escHtml(d.lastSentDate) : '<em>zatiaľ nikdy</em>'}</span></div>
    `;
  } catch (e) { el.innerHTML = '<div class="mail-bad">Chyba načítania stavu.</div>'; }
}
async function runTaskDigestNow() {
  const res = document.getElementById('taskDigestResult');
  res.innerHTML = '<span class="admin-loading">Odosielam…</span>';
  try {
    const r = await fetch('/api/admin/task-digest/run-now', { method: 'POST' });
    const d = await r.json();
    if (d.ok) {
      res.innerHTML = `<span class="mail-ok">✅ Odoslané: ${d.sent}, preskočené (bez úloh): ${d.skipped}${d.errors.length ? `, chyby: ${d.errors.length}` : ''}</span>`;
      toast('Denný súhrn odoslaný.', 'success');
      loadTaskDigestStatus();
    } else {
      res.innerHTML = `<span class="mail-bad">❌ Chyba: ${escHtml(d.error || 'neznáma chyba')}</span>`;
    }
  } catch (e) { res.innerHTML = `<span class="mail-bad">Sieťová chyba: ${escHtml(e.message)}</span>`; }
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
  dsImagesData.forEach((img, i) => { const d = document.createElement('div'); d.className = 'image-preview-item'; d.innerHTML = `<img src="${escHtml(img.url)}" alt=""><button class="image-preview-annotate" onclick="reAnnotateDsImage(${i})" title="Anotovať (kruhy, popisy, bubliny)">✎</button><button class="image-preview-remove" onclick="removeDsImage(${i})">✕</button>`; el.appendChild(d); });
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
let bbList = [], bbDoc = null, bbSel = null, bbConnect = null, bbAnim = true, bbDrag = null, bbRenderReq = false, bbLegend = true;
// Katalóg komponentov (Sylex FBG monitoring system)
const BB_TYPES = {
  // S-line zariadenia (zelené telo, čierny panel) — podľa oficiálneho katalógu Sylex
  scan:         { label: 'S-line Scan 800',     grp: 'interr', dev: 'scan',  w: 234, h: 44 },
  comp:         { label: 'S-line Comp',          grp: 'interr', dev: 'comp',  w: 234, h: 44 },
  splitter1x4:  { label: 'S-line Splitter 1×4',  grp: 'interr', dev: 'ports', inN: 1, outN: 4,  w: 226, h: 44 },
  splitter8:    { label: 'S-line Splitter 1×8',  grp: 'interr', dev: 'ports', inN: 1, outN: 8,  w: 262, h: 44 },
  splitter4x16: { label: 'S-line Splitter 4×16', grp: 'interr', dev: 'ports', inN: 4, outN: 16, w: 300, h: 62 },
  splitter4x32: { label: 'S-line Splitter 4×32', grp: 'interr', dev: 'ports', inN: 4, outN: 32, w: 304, h: 96 },
  switch1x4:    { label: 'S-line Switch 1×4',    grp: 'interr', dev: 'ports', inN: 1, outN: 4,  w: 226, h: 44 },
  switch1x8:    { label: 'S-line Switch 1×8',    grp: 'interr', dev: 'ports', inN: 1, outN: 8,  w: 262, h: 44 },
  switch4x16:   { label: 'S-line Switch 4×16',   grp: 'interr', dev: 'ports', inN: 4, outN: 16, w: 300, h: 62 },
  switch4x32:   { label: 'S-line Switch 4×32',   grp: 'interr', dev: 'ports', inN: 4, outN: 32, w: 304, h: 96 },
  // legacy kľúče (zachované pre staré topológie; nie sú v palete)
  switch:       { label: 'S-line Switch 1×16',   grp: 'interr', dev: 'ports', inN: 1, outN: 16, w: 300, h: 62 },
  interrogator: { label: 'Interrogátor',         grp: 'interr', dev: 'scan',  w: 200, h: 44 },
  // ostatné komponenty
  wcb:       { label: 'WCB-01 Connection box',grp: 'box',   fill: '#2c322a', text: '#fff',     ports: 0,  w: 186, h: 58 },
  splitter:  { label: 'Splitter 1×4',        grp: 'box',    fill: '#2f6b22', text: '#fff',     ports: 4,  w: 138, h: 50 },
  patch:     { label: 'Prepojovacia',        grp: 'box',    fill: '#2f6b22', text: '#fff',     ports: 2,  w: 134, h: 50 },
  sensor:    { label: 'FBG senzor',          grp: 'sensor', meas: 'FBG',           mc: '#8DC63F', mi: '',  fill: '#f4f6f3', text: '#14321a', tip: '#8DC63F', w: 140, h: 44 },
  sensors:   { label: 'Reťazec senzorov',    grp: 'sensor', meas: 'FBG reťazec',   mc: '#8DC63F', mi: '',  fill: '#f4f6f3', text: '#14321a', tip: '#8DC63F', w: 168, h: 44 },
  // FBG senzory podľa meranej veličiny (farebne odlíšené)
  sensorT:    { label: 'FBG teplota',       grp: 'sensor', meas: 'Teplota',       mc: '#ef4444', mi: 'T', fill: '#f4f6f3', text: '#14321a', tip: '#ef4444', w: 150, h: 44 },
  sensorE:    { label: 'FBG pnutie',        grp: 'sensor', meas: 'Pnutie (ε)',    mc: '#3b82f6', mi: 'ε', fill: '#f4f6f3', text: '#14321a', tip: '#3b82f6', w: 150, h: 44 },
  sensorA:    { label: 'FBG akcelerometer', grp: 'sensor', meas: 'Akcelerometer', mc: '#a855f7', mi: 'a', fill: '#f4f6f3', text: '#14321a', tip: '#a855f7', w: 172, h: 44 },
  sensorD:    { label: 'FBG posun',         grp: 'sensor', meas: 'Posun',         mc: '#14b8a6', mi: 'd', fill: '#f4f6f3', text: '#14321a', tip: '#14b8a6', w: 150, h: 44 },
  sensorTilt: { label: 'FBG náklon',        grp: 'sensor', meas: 'Náklon',        mc: '#f59e0b', mi: '∠', fill: '#f4f6f3', text: '#14321a', tip: '#f59e0b', w: 150, h: 44 },
  sensorP:    { label: 'FBG tlak',          grp: 'sensor', meas: 'Tlak',          mc: '#06b6d4', mi: 'P', fill: '#f4f6f3', text: '#14321a', tip: '#06b6d4', w: 150, h: 44 },
};
const BB_TYPE_LABEL = Object.fromEntries(Object.entries(BB_TYPES).map(([k, v]) => [k, v.label]));
const BB_GROUPS = { interr: 'S-line zariadenia', box: 'Rozvádzač / splitter', sensor: 'Senzor' };
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
  if (!await uiConfirm('Načítať ukážkové projekty (most SHM / tunel / oporný múr)?')) return;
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
  // vlastná trasa cez body, ktoré používateľ ťahá myšou
  if (l.waypoints && l.waypoints.length) return [[x1, y1], ...l.waypoints.map(p => [p.x, p.y]), [x2, y2]];
  // predvolená ortogonálna trasa (Z) s ohybom v strede
  const mx = Math.max(x1 + 16, (x1 + x2) / 2);
  return [[x1, y1], [mx, y1], [mx, y2], [x2, y2]];
}
// polomer zaoblenia rohov trasy (90° → oblúk)
const BB_CORNER_R = 16;
function bbPathD(pts) {
  if (!pts || pts.length < 2) return '';
  if (pts.length < 3) return 'M' + pts.map(p => p[0] + ',' + p[1]).join(' L');
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const v1x = p1[0] - p0[0], v1y = p1[1] - p0[1], v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
    const l1 = Math.hypot(v1x, v1y) || 1, l2 = Math.hypot(v2x, v2y) || 1;
    const r = Math.min(BB_CORNER_R, l1 / 2, l2 / 2);
    const ax = p1[0] - v1x / l1 * r, ay = p1[1] - v1y / l1 * r;
    const cx = p1[0] + v2x / l2 * r, cy = p1[1] + v2y / l2 * r;
    d += ` L${ax.toFixed(1)},${ay.toFixed(1)} Q${p1[0]},${p1[1]} ${cx.toFixed(1)},${cy.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last[0]},${last[1]}`;
  return d;
}
function bbDefs() {
  return `<defs>
    <filter id="bbGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="bbFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.14)"/><stop offset="0.5" stop-color="rgba(255,255,255,0.02)"/><stop offset="1" stop-color="rgba(0,0,0,0.22)"/></linearGradient>
    <linearGradient id="bbGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec63f"/><stop offset="0.55" stop-color="#6fae33"/><stop offset="1" stop-color="#588f27"/></linearGradient>
  </defs>`;
}
// Vykreslenie realistického zariadenia (podľa Sylex S-line / WCB / FBG)
function bbNodeInner(n, ty, w, h) {
  const lbl = escHtml(n.label || '(uzol)');
  const T = (x, y, s, anchor) => `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="${s}">`;
  // S-line zariadenie — zelené telo, čierny panel, ozubené koliesko, biele FC porty (podľa katalógu Sylex)
  if (ty.grp === 'interr') {
    const dev = ty.dev || 'ports';
    const outN = ty.outN || 0, inN = ty.inN || 1;
    const perRow = 8, gap = 13.5;
    // ozubené koliesko (vľavo hore)
    const gear = `<circle class="bb-sl-gear" cx="16" cy="13" r="6"/><circle class="bb-sl-gear-h" cx="16" cy="13" r="2"/>`;
    // vstupné porty (kombinátor) pri viacvstupových zariadeniach (4×N)
    let inDots = '', labelX = 30;
    if (dev === 'ports' && inN >= 2) {
      const icol = 2, irow = Math.ceil(inN / icol), ig = 10, ix0 = 13, iy0 = h / 2 - (irow - 1) * ig / 2;
      for (let i = 0; i < inN; i++) { const r = Math.floor(i / icol), c = i % icol; inDots += `<circle class="bb-sl-inport" cx="${ix0 + c * ig}" cy="${iy0 + r * ig}" r="2.6"/>`; }
      labelX = ix0 + icol * ig + 8;
    }
    // výstupné FC porty — mriežka po 8 v rade, zarovnaná vpravo
    let portsSvg = '';
    if (dev === 'ports' && outN > 0) {
      const cols = Math.min(perRow, outN), rows = Math.ceil(outN / perRow);
      const gx0 = w - 16 - (cols - 1) * gap, gy0 = h / 2 - (rows - 1) * gap / 2;
      for (let i = 0; i < outN; i++) { const r = Math.floor(i / perRow), c = i % perRow; portsSvg += `<circle class="bb-sl-port" cx="${gx0 + c * gap}" cy="${gy0 + r * gap}" r="3.3"/>`; }
    }
    // pravé ikony: Scan = displej + vypínač, Comp = rad konektorov (USB/RJ45/VGA/napájanie)
    let rightIcons = '';
    if (dev === 'scan') {
      const ry = h / 2;
      rightIcons = `<rect class="bb-sl-disp" x="${w - 60}" y="${ry - 8}" width="26" height="16" rx="2"/>`
        + `<rect class="bb-sl-pwr" x="${w - 24}" y="${ry - 9}" width="13" height="18" rx="2"/>`
        + `<line class="bb-sl-pwr-i" x1="${w - 17.5}" y1="${ry - 5}" x2="${w - 17.5}" y2="${ry + 1}"/>`;
    } else if (dev === 'comp') {
      const icons = [{ w: 8, h: 10 }, { w: 8, h: 10 }, { w: 11, h: 11 }, { w: 14, h: 9 }, { w: 9, h: 13 }];
      let x = w - 14;
      for (let i = icons.length - 1; i >= 0; i--) { const ic = icons[i]; x -= ic.w; rightIcons = `<rect class="bb-sl-io" x="${x}" y="${h / 2 - ic.h / 2}" width="${ic.w}" height="${ic.h}" rx="1.5"/>` + rightIcons; x -= 5; }
    }
    return `
      <rect class="bb-sl-body" width="${w}" height="${h}" rx="11" fill="url(#bbGreen)"/>
      <rect class="bb-sl-panel" x="5" y="5" width="${w - 10}" height="${h - 10}" rx="7"/>
      ${gear}${inDots}
      ${T(labelX, h / 2 + 4, 'font-family:var(--font);font-size:11px;font-weight:700;fill:#ffffff', 'start')}${lbl}</text>
      ${portsSvg}${rightIcons}`;
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
  // FBG senzor — kapsula s mriežkou, farba a štítok podľa meranej veličiny
  const mc = ty.mc || '#8DC63F', mi = ty.mi || '';
  let grating = '';
  for (let i = 0; i < 5; i++) { const gx = 20 + i * 4; grating += `<line class="bb-grating" x1="${gx}" y1="${h / 2 - 6}" x2="${gx}" y2="${h / 2 + 6}" style="stroke:${mc}"/>`; }
  const chip = mi
    ? `<circle cx="${w - 12}" cy="${h / 2}" r="8.5" style="fill:${mc}"/>${T(w - 12, h / 2 + 3.6, 'font-family:var(--font);font-size:10px;font-weight:800;fill:#fff', 'middle')}${escHtml(mi)}</text>`
    : '';
  return `
    <rect class="bb-sensor-body" width="${w}" height="${h}" rx="${h / 2}" style="fill:${ty.fill};stroke:${mc}"/>
    <rect class="bb-tip" x="-5" y="${h / 2 - 6}" width="10" height="12" rx="2.5" style="fill:${ty.tip}"/>
    ${grating}
    ${T(38, h / 2 + 4, `font-family:var(--font);font-size:11px;font-weight:700;fill:${ty.text}`, 'start')}${lbl}</text>
    ${chip}`;
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
  if (bbLegend) { maxX = Math.max(maxX, 260); maxY = Math.max(maxY, 280); }
  svg.setAttribute('width', maxX); svg.setAttribute('height', maxY); svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
  let links = '', flows = '', labels = '', beads = '', photons = '', handles = '';
  bbDoc.links.forEach(l => {
    const pts = bbLinkPts(l); if (!pts) return;
    const d = bbPathD(pts);
    const sel = bbSel && bbSel.kind === 'link' && bbSel.id === l.lid;
    // široká priehľadná dráha na ľahšie chytenie myšou
    links += `<path class="bb-link-hit" data-lid="${l.lid}" d="${d}"/>`;
    links += `<path class="bb-link${sel ? ' sel' : ''}" data-lid="${l.lid}" d="${d}"/>`;
    // úchyty trasy (body) — len pre vybraný kábel
    if (sel) (l.waypoints || []).forEach((wp, wi) => {
      handles += `<circle class="bb-wp" data-lid="${l.lid}" data-idx="${wi}" cx="${wp.x}" cy="${wp.y}" r="6"><title>Ťahaj = posun bodu · dvojklik = odstrániť</title></circle>`;
    });
    flows += `<path class="bb-flow" d="${d}"/>`
          +  `<path class="bb-flow bb-flow-rx" d="${d}"/>`;
    // dopredný (širokopásmový) signál: interrogátor → zariadenie
    photons += `<circle class="bb-photon" r="2.6"><animateMotion dur="2.4s" repeatCount="indefinite" path="${d}"/></circle>`
            +  `<circle class="bb-photon" r="2.6"><animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="${d}"/></circle>`
    // odrazený (reflektovaný λB) signál: zariadenie → interrogátor (naspäť)
            +  `<circle class="bb-photon bb-photon-rx" r="2.3"><animateMotion dur="2.4s" begin="0.6s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear" path="${d}"/></circle>`
            +  `<circle class="bb-photon bb-photon-rx" r="2.3"><animateMotion dur="2.4s" begin="1.8s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear" path="${d}"/></circle>`;
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
  svg.innerHTML = `${bbDefs()}<g>${links}</g><g class="bb-flows">${flows}${photons}</g><g>${labels}</g><g class="bb-beads">${beads}</g><g>${nodes}</g><g class="bb-handles">${handles}</g>${bbLegendSvg(maxX)}`;
}
function bbScheduleRender() { if (bbRenderReq) return; bbRenderReq = true; requestAnimationFrame(() => { bbRenderReq = false; bbRender(); }); }

// ── legenda (vykresľuje sa do SVG, takže je aj v exporte PNG) ──
function bbLegendSvg(maxX) {
  if (!bbLegend) return '';
  const items = [
    ['dev', '#6fae33', 'S-line interrogátor / switch / splitter'],
    ['box', '#2c322a', 'WCB-01 skriňa / splitter'],
    ['sep'],
    ['dot', '#ef4444', 'Teplota (T)'],
    ['dot', '#3b82f6', 'Pnutie / strain (ε)'],
    ['dot', '#a855f7', 'Akcelerometer / vibrácie (a)'],
    ['dot', '#14b8a6', 'Posun / konvergencia (d)'],
    ['dot', '#f59e0b', 'Náklon / inklinometer (∠)'],
    ['dot', '#06b6d4', 'Tlak / piezometer (P)'],
    ['sep'],
    ['line', '#8DC63F', '→ dopredné (širokopásmové) svetlo'],
    ['line', '#7fd0ff', '← odraz λB späť do interrogátora'],
  ];
  const LW = 250, pad = 12, rowH = 17.5;
  let bh = pad * 2 + 16;
  items.forEach(it => bh += it[0] === 'sep' ? 9 : rowH);
  const x0 = Math.max(14, maxX - LW - 14), y0 = 14;
  let y = y0 + pad + 14, rows = '';
  rows += `<text x="${x0 + pad}" y="${y0 + pad + 4}" style="font-family:var(--font);font-size:11px;font-weight:800;letter-spacing:.4px;fill:#cdd8e6">LEGENDA</text>`;
  items.forEach(it => {
    if (it[0] === 'sep') { rows += `<line x1="${x0 + pad}" y1="${y - 7}" x2="${x0 + LW - pad}" y2="${y - 7}" style="stroke:rgba(255,255,255,0.12)"/>`; y += 2; return; }
    if (it[0] === 'dev' || it[0] === 'box') rows += `<rect x="${x0 + pad}" y="${y - 9}" width="16" height="11" rx="2.5" style="fill:${it[1]};stroke:rgba(0,0,0,0.4)"/>`;
    else if (it[0] === 'dot') rows += `<circle cx="${x0 + pad + 8}" cy="${y - 3}" r="5.5" style="fill:${it[1]}"/>`;
    else if (it[0] === 'line') rows += `<line x1="${x0 + pad}" y1="${y - 3}" x2="${x0 + pad + 16}" y2="${y - 3}" style="stroke:${it[1]};stroke-width:2.6;stroke-linecap:round"/>`;
    rows += `<text x="${x0 + pad + 24}" y="${y}" style="font-family:var(--font);font-size:10.5px;fill:#aebccd">${it[2]}</text>`;
    y += rowH;
  });
  return `<g class="bb-legend"><rect x="${x0}" y="${y0}" width="${LW}" height="${bh}" rx="9" style="fill:rgba(13,18,30,0.92);stroke:rgba(255,255,255,0.14)"/>${rows}</g>`;
}
function bbToggleLegend() {
  bbLegend = !bbLegend;
  const b = document.getElementById('bbLegendBtn'); if (b) b.classList.toggle('active', bbLegend);
  bbRender();
}
// súhrnná štatistika topológie (pre zákazníka)
function bbStats() {
  const s = { dev: 0, box: 0, strings: 0, fbg: 0, len: 0, meas: {} };
  bbDoc.nodes.forEach(n => {
    const ty = bbTy(n);
    if (ty.grp === 'interr') s.dev++;
    else if (ty.grp === 'box') s.box++;
    else if (ty.grp === 'sensor') {
      s.strings++;
      const m = String(n.label || '').match(/(\d+)\s*[x×]/gi);
      const cnt = m ? m.reduce((a, g) => a + parseInt(g, 10), 0) : 1;
      s.fbg += cnt;
      if (ty.meas && ty.meas !== 'FBG' && ty.meas !== 'FBG reťazec') s.meas[ty.meas] = (s.meas[ty.meas] || 0) + cnt;
    }
  });
  bbDoc.links.forEach(l => s.len += Number(l.length) || 0);
  return s;
}
const BB_MEAS_COLOR = { 'Teplota': '#ef4444', 'Pnutie (ε)': '#3b82f6', 'Akcelerometer': '#a855f7', 'Posun': '#14b8a6', 'Náklon': '#f59e0b', 'Tlak': '#06b6d4' };

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
  // dvojklik na bod trasy = odstrániť ho
  const wpel = e.target.closest('.bb-wp');
  if (wpel) { const l = bbDoc.links.find(x => x.lid === wpel.dataset.lid); if (l && l.waypoints) { l.waypoints.splice(+wpel.dataset.idx, 1); bbRender(); bbPanelRender(); } return; }
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
// vzdialenosť bodu od úsečky (pre vloženie bodu trasy do správneho segmentu)
function bbSegDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / len2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy));
}
// vloží bod trasy do najbližšieho segmentu kábla, vráti jeho index
function bbInsertWaypoint(l, at) {
  const pts = bbLinkPts(l); l.waypoints = l.waypoints || [];
  if (!l.waypoints.length) { l.waypoints.push({ x: at.x, y: at.y }); return 0; }
  let best = 0, bestD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) { const d = bbSegDist(at, pts[i], pts[i + 1]); if (d < bestD) { bestD = d; best = i; } }
  const idx = Math.max(0, Math.min(l.waypoints.length, best));
  l.waypoints.splice(idx, 0, { x: at.x, y: at.y });
  return idx;
}
function bbResetWaypoints(lid) { const l = bbDoc.links.find(x => x.lid === lid); if (!l) return; l.waypoints = []; bbRender(); bbPanelRender(); }
function bbPointerDown(e) {
  if (!bbDoc) return;
  const ng = e.target.closest('.bb-node');
  if (ng) { const n = bbNode(ng.dataset.nid); if (!n) return; const p = bbClientToSvg(e); bbDrag = { nid: n.nid, dx: p.x - n.x, dy: p.y - n.y, moved: false, sx: e.clientX, sy: e.clientY }; document.getElementById('bbCanvasWrap')?.classList.add('bb-dragging'); return; }
  // ťahanie bodu trasy kábla
  const wp = e.target.closest('.bb-wp');
  if (wp) { bbSelect('link', wp.dataset.lid); bbDrag = { kind: 'wp', lid: wp.dataset.lid, idx: +wp.dataset.idx, moved: false, sx: e.clientX, sy: e.clientY }; document.getElementById('bbCanvasWrap')?.classList.add('bb-dragging'); return; }
  const bd = e.target.closest('.bb-bead');
  if (bd) { bbSelect('link', bd.dataset.lid); return; }
  // ťahanie samotného kábla = vloženie/posun bodu trasy
  const lk = e.target.closest('.bb-link-hit') || e.target.closest('.bb-link');
  if (lk) { const p = bbClientToSvg(e); bbSelect('link', lk.dataset.lid); bbDrag = { kind: 'linkmaybe', lid: lk.dataset.lid, at: { x: Math.round(p.x), y: Math.round(p.y) }, moved: false, sx: e.clientX, sy: e.clientY }; return; }
  bbSelect(null);
}
function bbPointerMove(e) {
  if (!bbDrag) return;
  const p = bbClientToSvg(e);
  if (bbDrag.kind === 'wp') {
    const l = bbDoc.links.find(x => x.lid === bbDrag.lid); if (!l || !l.waypoints || !l.waypoints[bbDrag.idx]) return;
    l.waypoints[bbDrag.idx].x = Math.max(0, Math.round(p.x)); l.waypoints[bbDrag.idx].y = Math.max(0, Math.round(p.y));
    bbDrag.moved = true; bbScheduleRender(); return;
  }
  if (bbDrag.kind === 'linkmaybe') {
    if (Math.abs(e.clientX - bbDrag.sx) + Math.abs(e.clientY - bbDrag.sy) > 4) {
      const l = bbDoc.links.find(x => x.lid === bbDrag.lid); if (!l) return;
      const idx = bbInsertWaypoint(l, bbDrag.at);
      bbDrag = { kind: 'wp', lid: bbDrag.lid, idx, moved: true, sx: bbDrag.sx, sy: bbDrag.sy };
      document.getElementById('bbCanvasWrap')?.classList.add('bb-dragging');
      bbScheduleRender();
    }
    return;
  }
  const n = bbNode(bbDrag.nid); if (!n) return;
  n.x = Math.max(0, Math.round(p.x - bbDrag.dx)); n.y = Math.max(0, Math.round(p.y - bbDrag.dy));
  if (Math.abs(e.clientX - bbDrag.sx) + Math.abs(e.clientY - bbDrag.sy) > 3) bbDrag.moved = true;
  bbScheduleRender();
}
function bbPointerUp() {
  document.getElementById('bbCanvasWrap')?.classList.remove('bb-dragging');
  if (!bbDrag) return;
  if (bbDrag.kind === 'wp' || bbDrag.kind === 'linkmaybe') { bbDrag = null; bbRender(); return; }
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
  if (!bbSel) {
    const st = bbStats();
    const measRows = Object.keys(st.meas).length
      ? Object.entries(st.meas).map(([k, v]) => `<span class="bb-mtag" style="border-color:${BB_MEAS_COLOR[k] || '#8DC63F'}"><i style="background:${BB_MEAS_COLOR[k] || '#8DC63F'}"></i>${escHtml(k)} · ${v}</span>`).join('')
      : '<span class="bb-panel-empty">— pridaj FBG senzory podľa veličiny —</span>';
    el.innerHTML = `<div class="bb-panel-hd">Topológia</div>
    <div class="form-group"><label>Názov</label><input type="text" value="${escHtml(bbDoc.name || '')}" oninput="bbDoc.name=this.value"></div>
    <div class="bb-stat-grid">
      <div class="bb-stat"><b>${st.dev}</b><span>S-line zariadenia</span></div>
      <div class="bb-stat"><b>${st.box}</b><span>skrine / splittre</span></div>
      <div class="bb-stat"><b>${st.fbg}</b><span>FBG senzorov</span></div>
      <div class="bb-stat"><b>${st.len} m</b><span>optický kábel</span></div>
    </div>
    <div class="form-group"><label>Merané veličiny</label><div class="bb-mtags">${measRows}</div></div>
    <div class="bb-panel-stat">${bbDoc.nodes.length} uzlov · ${bbDoc.links.length} káblov · ${st.strings} reťazcov</div>
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
      <div class="form-group"><label>Trasa kábla</label>
        <div class="bb-route-hint">Ťahaj kábel myšou = pridáš ohyb · ťahaj bod = posun · dvojklik na bod = odstrániť. Rohy sú zaoblené.</div>
        <button class="btn-secondary btn-sm bb-panel-btn" onclick="bbResetWaypoints('${l.lid}')">↺ Vyrovnať trasu (${(l.waypoints || []).length} bodov)</button>
      </div>
      <button class="btn-delete bb-panel-btn" onclick="bbDeleteLink('${l.lid}')">Odstrániť kábel</button>`;
  }
}
function bbChangeType(id, val) { const n = bbNode(id); if (!n) return; n.type = val; if (!n.label || Object.values(BB_TYPE_LABEL).includes(n.label)) n.label = BB_TYPE_LABEL[val] || n.label; bbRender(); bbPanelRender(); }
function bbPartAdd(lid) { const l = bbDoc.links.find(x => x.lid === lid); if (!l) return; const v = document.getElementById('bbPartSel')?.value; if (!v) return; (l.parts = l.parts || []).push(v); bbRender(); bbPanelRender(); }
function bbPartDel(lid, i) { const l = bbDoc.links.find(x => x.lid === lid); if (!l || !l.parts) return; l.parts.splice(i, 1); bbRender(); bbPanelRender(); }

function bbAutoLayout() {
  if (!bbDoc) return;
  bbDoc.links.forEach(l => l.waypoints = []); // pri automatickom rozložení vyrovnaj trasy
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

// ══════════════════════════════════════════════════════════════════════════════
// FOTKY Z VÝROBY — galéria, kategórie typov produktov, tagy, zdieľanie, konverzia
// ══════════════════════════════════════════════════════════════════════════════
let photosData = [], photoCatsData = [];
let phFilter = { cat: 'all', tag: null };
let phSelectMode = false;          // režim označovania (hromadné operácie)
let phSelected = new Set();        // ID označených fotiek
let phPickedFiles = [];        // súbory vybrané v modáli (pred nahratím)
let phLbItems = [], phLbIdx = -1; // lightbox — aktuálne filtrovaný zoznam

// Skopíruj text do schránky (s fallbackom)
function phCopy(text, okMsg = 'Skopírované do schránky.') {
  const done = () => toast(okMsg, 'success');
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done, () => toast('Kopírovanie zlyhalo — skopíruj ručne: ' + text, 'warn')); return; }
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch { toast('Skopíruj ručne: ' + text, 'warn'); }
  ta.remove();
}
function phFmtBytes(b) {
  if (!b) return '';
  if (b > 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b > 1024) return Math.round(b / 1024) + ' kB';
  return b + ' B';
}
function phFmtDate(d) { try { return new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' }); } catch { return ''; } }

async function loadPhotos() {
  try {
    const [cats, list] = await Promise.all([
      fetch('/api/photos/categories').then(r => r.json()),
      fetch('/api/photos').then(r => r.json())
    ]);
    photoCatsData = Array.isArray(cats) ? cats : [];
    photosData = Array.isArray(list) ? list : [];
  } catch { photoCatsData = []; photosData = []; }
  renderPhotoCats(); renderPhotos();
}

function renderPhotoCats() {
  const el = document.getElementById('phCats'); if (!el) return;
  const cnt = (catId) => photosData.filter(p => (p.category?._id || p.category || null) === catId).length;
  const chips = [`<button class="ph-chip ${phFilter.cat === 'all' ? 'active' : ''}" onclick="phSetCat('all')">Všetky <span class="ph-chip-n">${photosData.length}</span></button>`];
  photoCatsData.forEach(c => {
    chips.push(`<button class="ph-chip ${phFilter.cat === c._id ? 'active' : ''}" style="--chip-c:${escHtml(c.color || '#0891b2')}" onclick="phSetCat('${c._id}')">${escHtml(c.icon || '📦')} ${escHtml(c.name)} <span class="ph-chip-n">${cnt(c._id)}</span></button>`);
  });
  const noCat = photosData.filter(p => !p.category).length;
  if (noCat) chips.push(`<button class="ph-chip ${phFilter.cat === 'none' ? 'active' : ''}" onclick="phSetCat('none')">Bez kategórie <span class="ph-chip-n">${noCat}</span></button>`);
  el.innerHTML = chips.join('');
}

function phSetCat(id) { phFilter.cat = id; phFilter.tag = null; renderPhotoCats(); renderPhotos(); }
function phSetTag(tag) { phFilter.tag = phFilter.tag === tag ? null : tag; renderPhotos(); }

function phFiltered() {
  const q = (document.getElementById('phSearch')?.value || '').toLowerCase();
  return photosData.filter(p => {
    const catId = p.category?._id || p.category || null;
    if (phFilter.cat === 'none' && catId) return false;
    if (phFilter.cat !== 'all' && phFilter.cat !== 'none' && catId !== phFilter.cat) return false;
    if (phFilter.tag && !(p.tags || []).includes(phFilter.tag)) return false;
    if (q) {
      const hay = [p.title, p.author, p.note, p.originalName, ...(p.tags || []), p.category?.name].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderPhotos() {
  const grid = document.getElementById('phGrid'); if (!grid) return;
  const items = phFiltered();

  // Tag cloud z aktuálnej množiny
  const tagEl = document.getElementById('phTags');
  if (tagEl) {
    const tags = {};
    items.forEach(p => (p.tags || []).forEach(t => tags[t] = (tags[t] || 0) + 1));
    const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 30);
    tagEl.innerHTML = sorted.map(([t, n]) => `<button class="ph-tag ${phFilter.tag === t ? 'active' : ''}" onclick="phSetTag(decodeURIComponent('${encodeURIComponent(t)}'))">#${escHtml(t)} <span>${n}</span></button>`).join('');
  }

  if (!items.length) {
    grid.innerHTML = `<div class="proc-empty">Žiadne fotky.<div class="proc-empty-actions"><button class="btn-primary" onclick="openPhotoModal()">+ Pridať fotky</button></div></div>`;
    return;
  }
  grid.innerHTML = items.map(p => {
    const cat = p.category;
    const sel = phSelected.has(p._id);
    const onClick = phSelectMode ? `phToggleSel('${p._id}')` : `openPhotoLightbox('${p._id}')`;
    return `<div class="ph-card${phSelectMode ? ' ph-selectable' : ''}${sel ? ' ph-selected' : ''}" onclick="${onClick}">
      ${phSelectMode ? `<label class="ph-check" onclick="event.stopPropagation();phToggleSel('${p._id}')"><input type="checkbox" ${sel ? 'checked' : ''} onclick="event.stopPropagation();phToggleSel('${p._id}')"></label>` : ''}
      <div class="ph-thumb"><img loading="lazy" src="${escHtml(p.url)}" alt="${escHtml(p.title)}"></div>
      <div class="ph-card-body">
        <div class="ph-card-title" title="${escHtml(p.title)}">${escHtml(p.title || p.originalName || 'Bez názvu')}</div>
        <div class="ph-card-meta">
          ${cat ? `<span class="ph-badge" style="--chip-c:${escHtml(cat.color || '#0891b2')}">${escHtml(cat.icon || '')} ${escHtml(cat.name)}</span>` : ''}
          ${(p.tags || []).slice(0, 3).map(t => `<span class="ph-mini-tag">#${escHtml(t)}</span>`).join('')}
        </div>
        <div class="ph-card-sub">${escHtml(p.author || '')}${p.author ? ' · ' : ''}${phFmtDate(p.createdAt)}</div>
      </div>
    </div>`;
  }).join('');
  phUpdateBulkBar();
}

// ── Hromadné operácie s fotkami (režim označovania) ──
function phToggleSelectMode() {
  phSelectMode = !phSelectMode;
  if (!phSelectMode) phSelected.clear();
  document.getElementById('phBulkBar')?.classList.toggle('hidden', !phSelectMode);
  const btn = document.getElementById('phSelectBtn');
  if (btn) { btn.classList.toggle('active', phSelectMode); btn.textContent = phSelectMode ? '✕ Zrušiť označovanie' : '☑ Označiť'; }
  renderPhotos();
}
function phToggleSel(id) {
  if (phSelected.has(id)) phSelected.delete(id); else phSelected.add(id);
  renderPhotos();
}
function phSelectAll() {
  phFiltered().forEach(p => phSelected.add(p._id));
  renderPhotos();
}
function phClearSel() { phSelected.clear(); renderPhotos(); }
function phUpdateBulkBar() {
  const n = phSelected.size;
  const el = document.getElementById('phBulkN'); if (el) el.textContent = n;
  // rýchly výber kategórie v paneli (naplniť pri zmene dát, zachovať "placeholder" stav)
  const sel = document.getElementById('phBulkCatQuick');
  if (sel) {
    sel.innerHTML = `<option value="">📂 Zaradiť do kategórie…</option><option value="none">— Bez kategórie —</option>` +
      photoCatsData.map(c => `<option value="${c._id}">${escHtml((c.icon || '📦') + ' ' + c.name)}</option>`).join('');
    sel.value = '';
  }
}
// Rýchle zaradenie označených fotiek do kategórie priamo z panela
async function phBulkSetCat(catId) {
  const sel = document.getElementById('phBulkCatQuick');
  if (!catId) return;
  const ids = [...phSelected];
  if (!ids.length) { toast('Najprv označ nejaké fotky.', 'info'); if (sel) sel.value = ''; return; }
  try {
    const r = await fetch('/api/photos/bulk-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, category: catId }) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    const cat = photoCatsData.find(c => c._id === catId);
    await loadPhotos();
    toast(`${d.modified} fotiek zaradených do „${cat ? cat.name : 'Bez kategórie'}".`, 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
async function phBulkDelete() {
  const ids = [...phSelected];
  if (!ids.length) { toast('Najprv označ nejaké fotky.', 'info'); return; }
  if (!await uiConfirm(`Naozaj zmazať ${ids.length} označených fotiek? Táto akcia je nevratná.`)) return;
  try {
    const r = await fetch('/api/photos/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    phSelected.clear();
    await loadPhotos();
    toast(`Zmazaných ${d.deleted} fotiek.`, 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}
function phBulkEdit() {
  if (!phSelected.size) { toast('Najprv označ nejaké fotky.', 'info'); return; }
  // naplň selector kategórií
  const sel = document.getElementById('phBulkCategory');
  if (sel) sel.innerHTML = `<option value="">— ponechať bez zmeny —</option><option value="none">Bez kategórie</option>` +
    photoCatsData.map(c => `<option value="${c._id}">${escHtml((c.icon || '') + ' ' + c.name)}</option>`).join('');
  document.getElementById('phBulkAuthor').value = '';
  document.getElementById('phBulkTags').value = '';
  document.getElementById('phBulkReplaceTags').checked = false;
  const badge = document.getElementById('phBulkModalN'); if (badge) badge.textContent = phSelected.size + ' ks';
  document.getElementById('photoBulkModal').classList.remove('hidden');
}
function closePhotoBulkModal() { document.getElementById('photoBulkModal').classList.add('hidden'); }
async function phBulkSave() {
  const ids = [...phSelected];
  if (!ids.length) return;
  const body = {
    ids,
    category: document.getElementById('phBulkCategory').value,
    author: document.getElementById('phBulkAuthor').value.trim(),
    tags: document.getElementById('phBulkTags').value,
    replaceTags: document.getElementById('phBulkReplaceTags').checked
  };
  try {
    const r = await fetch('/api/photos/bulk-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { toast('Chyba: ' + (d.error || r.status), 'error'); return; }
    closePhotoBulkModal();
    await loadPhotos();
    toast(`Upravených ${d.modified} fotiek.`, 'success');
  } catch (e) { toast('Sieťová chyba: ' + e.message, 'error'); }
}

// ── Lightbox ──
function openPhotoLightbox(id) {
  phLbItems = phFiltered();
  phLbIdx = phLbItems.findIndex(p => p._id === id);
  if (phLbIdx < 0) { phLbItems = photosData; phLbIdx = photosData.findIndex(p => p._id === id); }
  if (phLbIdx < 0) return;
  document.getElementById('photoLightbox').classList.remove('hidden');
  document.addEventListener('keydown', phLbKeys);
  phLbRender();
}
function closePhotoLightbox() {
  document.getElementById('photoLightbox').classList.add('hidden');
  document.removeEventListener('keydown', phLbKeys);
}
function phLbKeys(e) {
  if (e.key === 'Escape') closePhotoLightbox();
  if (e.key === 'ArrowLeft') phLbNav(-1);
  if (e.key === 'ArrowRight') phLbNav(1);
}
function phLbNav(dir) {
  if (!phLbItems.length) return;
  phLbIdx = (phLbIdx + dir + phLbItems.length) % phLbItems.length;
  phLbRender();
}
function phLbRender() {
  const p = phLbItems[phLbIdx]; if (!p) return;
  document.getElementById('phLbImg').src = p.url;
  const cat = p.category;
  const dims = p.width ? `${p.width}×${p.height} px` : '';
  document.getElementById('phLbPanel').innerHTML = `
    <div class="ph-lb-title">${escHtml(p.title || p.originalName || 'Bez názvu')}</div>
    <div class="ph-lb-info">
      ${cat ? `<span class="ph-badge" style="--chip-c:${escHtml(cat.color || '#0891b2')}">${escHtml(cat.icon || '')} ${escHtml(cat.name)}</span>` : ''}
      ${(p.tags || []).map(t => `<span class="ph-mini-tag">#${escHtml(t)}</span>`).join('')}
    </div>
    <div class="ph-lb-sub">${escHtml(p.author || '—')} · ${phFmtDate(p.createdAt)}${dims ? ' · ' + dims : ''}${p.size ? ' · ' + phFmtBytes(p.size) : ''} <span class="ph-lb-count">${phLbIdx + 1}/${phLbItems.length}</span></div>
    ${p.note ? `<div class="ph-lb-note">${escHtml(p.note)}</div>` : ''}
    ${p.networkPath ? `<div class="ph-lb-net" title="Kliknutím skopíruješ cestu" onclick="phCopyNet('${p._id}')">📁 <code>${escHtml(p.networkPath)}</code></div>` : ''}
    <div class="ph-lb-actions">
      <button class="btn-sm" onclick="sharePhoto('${p._id}')">🔗 Zdieľať</button>
      <button class="btn-sm" onclick="phDownload('${p._id}', 'orig')">⬇ Stiahnuť</button>
      <span class="ph-conv">
        <select id="phLbConv"><option value="jpeg">JPEG</option><option value="png">PNG</option><option value="webp">WebP</option></select>
        <button class="btn-sm" onclick="phDownload('${p._id}', document.getElementById('phLbConv').value)">⇄ Konvertovať</button>
      </span>
      <button class="btn-sm" onclick="editPhoto('${p._id}')">✎ Upraviť</button>
      <button class="btn-sm danger" onclick="deletePhoto('${p._id}')">✕ Odstrániť</button>
    </div>`;
}

// Skopíruj sieťovú cestu fotky (bezpečne cez ID — cesty obsahujú \ a ')
function phCopyNet(id) {
  const p = photosData.find(x => x._id === id);
  if (p?.networkPath) phCopy(p.networkPath, 'Sieťová cesta skopírovaná.');
}

// Zdieľanie — Web Share API s fallbackom na kopírovanie odkazu
async function sharePhoto(id) {
  const p = photosData.find(x => x._id === id); if (!p) return;
  const url = location.origin + p.url;
  if (navigator.share) {
    try { await navigator.share({ title: p.title || 'Fotka z výroby', url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  phCopy(url, 'Odkaz na fotku skopírovaný.');
}

// Stiahnutie / konverzia cez canvas (jpeg/png/webp), 'orig' = pôvodný súbor
async function phDownload(id, fmt) {
  const p = photosData.find(x => x._id === id); if (!p) return;
  const base = (p.title || p.originalName || 'fotka').replace(/[\\/:*?"<>|]+/g, '_').replace(/\.[a-z0-9]+$/i, '');
  if (fmt === 'orig') {
    const a = document.createElement('a'); a.href = p.url; a.download = p.originalName || (base + (p.url.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg')); a.click();
    return;
  }
  try {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = p.url; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const mime = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise(ok => c.toBlob(ok, mime, 0.92));
    if (!blob) throw new Error('Konverzia zlyhala');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = base + (fmt === 'png' ? '.png' : fmt === 'webp' ? '.webp' : '.jpg');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Fotka konvertovaná do ${fmt.toUpperCase()}.`, 'success');
  } catch { toast('Konverzia zlyhala.', 'error'); }
}

// ── Modál: pridanie / úprava ──
function phFillCatSelect(selectedId) {
  const sel = document.getElementById('phCategory');
  sel.innerHTML = '<option value="">— bez kategórie —</option>' +
    photoCatsData.map(c => `<option value="${c._id}" ${selectedId === c._id ? 'selected' : ''}>${escHtml(c.icon || '')} ${escHtml(c.name)}</option>`).join('');
}

function openPhotoModal(p = null) {
  phPickedFiles = [];
  const e = !!p;
  document.getElementById('phModalTitle').textContent = e ? 'Upraviť fotku' : 'Pridať fotky';
  document.getElementById('phId').value = e ? p._id : '';
  document.getElementById('phTitle').value = e ? (p.title || '') : '';
  document.getElementById('phTagsInp').value = e ? (p.tags || []).join(', ') : '';
  document.getElementById('phNetPath').value = e ? (p.networkPath || '') : '';
  document.getElementById('phNote').value = e ? (p.note || '') : '';
  phFillCatSelect(e ? (p.category?._id || p.category || '') : '');
  document.getElementById('phDropWrap').style.display = e ? 'none' : '';
  document.getElementById('phConvWrap').style.display = e ? 'none' : '';
  document.getElementById('phPickList').innerHTML = '';
  document.getElementById('phFiles').value = '';
  document.getElementById('phSaveBtn').textContent = e ? 'Uložiť' : 'Nahrať';
  phInitDrop();
  document.getElementById('photoModal').classList.remove('hidden');
  modalSnapshot('photoModal');
}
function closePhotoModal() { modalGuardClose('photoModal'); }

// Drag & drop na drop zónu (inicializuje sa raz)
let _phDropInit = false;
function phInitDrop() {
  if (_phDropInit) return; _phDropInit = true;
  const dz = document.getElementById('phDrop');
  ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => phFilesPicked(e.dataTransfer.files));
}
function phFilesPicked(files) {
  const imgs = Array.from(files || []).filter(f => /^image\//.test(f.type));
  if (!imgs.length) { toast('Vyber obrázkové súbory.', 'warn'); return; }
  phPickedFiles = phPickedFiles.concat(imgs);
  renderPhPickList();
}
function renderPhPickList() {
  document.getElementById('phPickList').innerHTML = phPickedFiles.map((f, i) =>
    `<span class="ph-pick">${escHtml(f.name)} <em>${phFmtBytes(f.size)}</em> <button onclick="phPickedFiles.splice(${i},1);renderPhPickList()" title="Odobrať">✕</button></span>`
  ).join('');
}

// Konverzia na klientovi pred nahratím (canvas — zmenšenie + JPEG/WebP)
function phConvertFile(file, mode) {
  if (mode === 'orig') return Promise.resolve(file);
  const maxDim = mode === '1280' ? 1280 : 1920;
  const mime = mode === 'webp' ? 'image/webp' : 'image/jpeg';
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      // Ak sa nemení veľkosť a súbor už je jpeg/webp, netreba konvertovať
      if (scale === 1 && file.type === mime) { URL.revokeObjectURL(url); resolve(file); return; }
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => {
        URL.revokeObjectURL(url);
        if (!b) { resolve(file); return; }
        const ext = mime === 'image/webp' ? '.webp' : '.jpg';
        resolve(new File([b], file.name.replace(/\.[^.]+$/, '') + ext, { type: mime }));
      }, mime, 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function savePhotos() {
  const id = document.getElementById('phId').value;
  const meta = {
    title: document.getElementById('phTitle').value.trim(),
    category: document.getElementById('phCategory').value || null,
    tags: document.getElementById('phTagsInp').value,
    networkPath: document.getElementById('phNetPath').value.trim(),
    note: document.getElementById('phNote').value.trim()
  };
  const btn = document.getElementById('phSaveBtn');
  try {
    if (id) {
      const r = await fetch('/api/photos/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
      if (!r.ok) throw new Error((await r.json()).error || 'Chyba');
      toast('Fotka upravená.', 'success');
    } else {
      if (!phPickedFiles.length) { toast('Vyber aspoň jednu fotku.', 'warn'); return; }
      btn.disabled = true; btn.textContent = 'Konvertujem…';
      const mode = document.getElementById('phConvert').value;
      const files = [];
      for (const f of phPickedFiles) files.push(await phConvertFile(f, mode));
      btn.textContent = 'Nahrávam…';
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f));
      Object.entries(meta).forEach(([k, v]) => { if (v != null) fd.append(k, v); });
      const r = await fetch('/api/photos/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error((await r.json()).error || 'Chyba nahrávania');
      toast(`Nahraté: ${files.length} ${files.length === 1 ? 'fotka' : files.length < 5 ? 'fotky' : 'fotiek'}.`, 'success');
    }
    delete _modalSnap['photoModal'];
    document.getElementById('photoModal').classList.add('hidden');
    closePhotoLightbox();
    loadPhotos();
  } catch (e) { toast(e.message || 'Chyba pri ukladaní.', 'error'); }
  finally { btn.disabled = false; btn.textContent = id ? 'Uložiť' : 'Nahrať'; }
}

function editPhoto(id) {
  const p = photosData.find(x => x._id === id); if (!p) return;
  closePhotoLightbox();
  openPhotoModal(p);
}

async function deletePhoto(id) {
  if (!await uiConfirm('Naozaj odstrániť fotku? Súbor sa zmaže aj z úložiska.')) return;
  try {
    await fetch('/api/photos/' + id, { method: 'DELETE' });
    closePhotoLightbox();
    toast('Fotka odstránená.', 'success');
    loadPhotos();
  } catch { toast('Chyba pri odstraňovaní.', 'error'); }
}

// ── Kategórie (typy produktov) ──
function openPhotoCatModal() { renderPhotoCatList(); document.getElementById('photoCatModal').classList.remove('hidden'); }
function closePhotoCatModal() { document.getElementById('photoCatModal').classList.add('hidden'); }
function renderPhotoCatList() {
  const el = document.getElementById('phCatList');
  if (!photoCatsData.length) { el.innerHTML = '<p class="hint">Zatiaľ žiadne kategórie — pridaj typy produktov nižšie.</p>'; return; }
  el.innerHTML = photoCatsData.map(c => {
    const n = photosData.filter(p => (p.category?._id || p.category) === c._id).length;
    return `<div class="ph-cat-row">
      <span class="ph-cat-dot" style="background:${escHtml(c.color || '#0891b2')}"></span>
      <span class="ph-cat-name">${escHtml(c.icon || '📦')} ${escHtml(c.name)}</span>
      <span class="ph-cat-n">${n} ${n === 1 ? 'fotka' : n > 1 && n < 5 ? 'fotky' : 'fotiek'}</span>
      <button class="admin-icon-btn danger" onclick="deletePhotoCat('${c._id}')" title="Odstrániť kategóriu">✕</button>
    </div>`;
  }).join('');
}
async function addPhotoCat() {
  const name = document.getElementById('phCatName').value.trim();
  if (!name) { toast('Zadaj názov kategórie.', 'warn'); return; }
  try {
    const r = await fetch('/api/photos/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon: document.getElementById('phCatIcon').value.trim() || '📦', color: document.getElementById('phCatColor').value })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Chyba');
    document.getElementById('phCatName').value = ''; document.getElementById('phCatIcon').value = '';
    photoCatsData = await fetch('/api/photos/categories').then(x => x.json());
    renderPhotoCatList(); renderPhotoCats();
    toast('Kategória pridaná.', 'success');
  } catch (e) { toast(e.message, 'error'); }
}
async function deletePhotoCat(id) {
  if (!await uiConfirm('Odstrániť kategóriu? Fotky v nej zostanú bez kategórie.')) return;
  try {
    await fetch('/api/photos/categories/' + id, { method: 'DELETE' });
    await loadPhotos(); renderPhotoCatList();
    toast('Kategória odstránená.', 'success');
  } catch { toast('Chyba.', 'error'); }
}

// ══════════════════════════════════════════════════════════════════════════════
// GITHUB — projekty a odkazy
// ══════════════════════════════════════════════════════════════════════════════
let ghData = [];
const GH_LANG_COLORS = { javascript: '#f1e05a', typescript: '#3178c6', python: '#3572a5', 'c++': '#f34b7d', c: '#555555', 'c#': '#178600', rust: '#dea584', go: '#00add8', java: '#b07219', php: '#4f5d95', html: '#e34c26', css: '#563d7c', shell: '#89e051', matlab: '#e16737', labview: '#fede06' };

async function loadGithub() {
  try { ghData = await fetch('/api/github').then(r => r.json()); if (!Array.isArray(ghData)) ghData = []; }
  catch { ghData = []; }
  renderGithub();
}

function renderGithub() {
  const el = document.getElementById('ghList'); if (!el) return;
  const q = (document.getElementById('ghSearch')?.value || '').toLowerCase();
  const items = ghData.filter(r => !q || [r.name, r.description, r.language, r.owner, ...(r.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(q));
  if (!items.length) {
    el.innerHTML = `<div class="proc-empty">Žiadne GitHub projekty.<div class="proc-empty-actions"><button class="btn-primary" onclick="openGhModal()">+ Nový projekt</button></div></div>`;
    return;
  }
  const stLabel = { active: 'Aktívny', archived: 'Archív', planned: 'Plánovaný' };
  el.innerHTML = items.map(r => {
    const langColor = GH_LANG_COLORS[(r.language || '').toLowerCase()] || '#8b949e';
    return `<div class="gh-card" tabindex="0" role="button" aria-label="Upraviť projekt ${escHtml(r.name)}" title="Kliknutím upraviť"
        onclick="openGhModal(ghData.find(x=>x._id==='${r._id}'))"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openGhModal(ghData.find(x=>x._id==='${r._id}'))}">
      <div class="gh-card-head">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
        ${r.repoUrl ? `<a class="gh-name" href="${escHtml(r.repoUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escHtml(r.name)}</a>` : `<span class="gh-name">${escHtml(r.name)}</span>`}
        ${r.private ? '<span class="gh-lock" title="Privátny repozitár">🔒</span>' : ''}
        <span class="gh-status gh-st-${r.status}">${stLabel[r.status] || r.status}</span>
      </div>
      ${r.description ? `<div class="gh-desc">${escHtml(r.description)}</div>` : ''}
      <div class="gh-meta">
        ${r.language ? `<span class="gh-lang"><span class="gh-lang-dot" style="background:${langColor}"></span>${escHtml(r.language)}</span>` : ''}
        ${r.owner ? `<span class="gh-owner">👤 ${escHtml(r.owner)}</span>` : ''}
        ${(r.tags || []).map(t => `<span class="ph-mini-tag">#${escHtml(t)}</span>`).join('')}
      </div>
      ${(r.links || []).length ? `<div class="gh-links">${r.links.filter(l => l.url).map(l => `<a class="gh-link" href="${escHtml(l.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗 ${escHtml(l.label || l.url)}</a>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

function addGhLinkRow(l = {}) {
  const row = document.createElement('div');
  row.className = 'proc-row gh-link-row';
  row.innerHTML = `<input type="text" placeholder="Názov odkazu" value="${escHtml(l.label || '')}" data-gh="label">
    <input type="text" placeholder="https://..." value="${escHtml(l.url || '')}" data-gh="url">
    <button type="button" class="admin-icon-btn danger" onclick="this.parentElement.remove()" title="Odobrať">✕</button>`;
  document.getElementById('ghLinks').appendChild(row);
}

function openGhModal(r = null) {
  const e = !!r;
  document.getElementById('ghModalTitle').textContent = e ? 'Upraviť projekt' : 'Nový GitHub projekt';
  document.getElementById('ghId').value = e ? r._id : '';
  document.getElementById('ghName').value = e ? (r.name || '') : '';
  document.getElementById('ghUrl').value = e ? (r.repoUrl || '') : '';
  document.getElementById('ghDesc').value = e ? (r.description || '') : '';
  document.getElementById('ghLang').value = e ? (r.language || '') : '';
  document.getElementById('ghStatus').value = e ? (r.status || 'active') : 'active';
  document.getElementById('ghOwner').value = e ? (r.owner || '') : '';
  document.getElementById('ghPrivate').checked = e ? !!r.private : false;
  document.getElementById('ghTags').value = e ? (r.tags || []).join(', ') : '';
  document.getElementById('ghLinks').innerHTML = '';
  (e ? (r.links || []) : []).forEach(l => addGhLinkRow(l));
  document.getElementById('ghDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('ghModal').classList.remove('hidden');
  modalSnapshot('ghModal');
}
function closeGhModal() { modalGuardClose('ghModal'); }

async function saveGh() {
  const id = document.getElementById('ghId').value;
  const name = document.getElementById('ghName').value.trim();
  if (!name) { toast('Zadaj názov projektu.', 'warn'); return; }
  const links = Array.from(document.querySelectorAll('#ghLinks .gh-link-row')).map(row => ({
    label: row.querySelector('[data-gh="label"]').value.trim(),
    url: row.querySelector('[data-gh="url"]').value.trim()
  })).filter(l => l.url);
  const body = {
    name,
    repoUrl: document.getElementById('ghUrl').value.trim(),
    description: document.getElementById('ghDesc').value.trim(),
    language: document.getElementById('ghLang').value.trim(),
    status: document.getElementById('ghStatus').value,
    owner: document.getElementById('ghOwner').value.trim(),
    private: document.getElementById('ghPrivate').checked,
    tags: document.getElementById('ghTags').value.split(',').map(t => t.trim()).filter(Boolean),
    links
  };
  try {
    const r = await fetch(id ? '/api/github/' + id : '/api/github', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).error || 'Chyba');
    delete _modalSnap['ghModal'];
    document.getElementById('ghModal').classList.add('hidden');
    toast(id ? 'Projekt upravený.' : 'Projekt pridaný.', 'success');
    loadGithub();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteGh(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť projekt zo zoznamu?')) return;
  try {
    await fetch('/api/github/' + id, { method: 'DELETE' });
    delete _modalSnap['ghModal'];
    document.getElementById('ghModal').classList.add('hidden');
    toast('Projekt odstránený.', 'success');
    loadGithub();
  } catch { toast('Chyba.', 'error'); }
}

// ══════════════════════════════════════════════════════════════════════════════
// VZDIALENÉ PRIPOJENIE — RustDesk
// ══════════════════════════════════════════════════════════════════════════════
let rcData = [];
const RC_OS_ICON = { windows: '🪟', linux: '🐧', macos: '🍎' };

async function loadRemote() {
  try { rcData = await fetch('/api/remote').then(r => r.json()); if (!Array.isArray(rcData)) rcData = []; }
  catch { rcData = []; }
  renderRemote();
}

// Naformátuj RustDesk ID po trojiciach (123 456 789)
function rcFmtId(id) { return String(id || '').replace(/\s+/g, '').replace(/(\d{3})(?=\d)/g, '$1 '); }

function renderRemote() {
  const el = document.getElementById('rcList'); if (!el) return;
  const q = (document.getElementById('rcSearch')?.value || '').toLowerCase();
  const items = rcData.filter(r => !q || [r.name, r.rustdeskId, r.location, r.user, r.ip, r.note, ...(r.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(q));
  if (!items.length) {
    el.innerHTML = `<div class="proc-empty">Žiadne vzdialené PC.<div class="proc-empty-actions"><button class="btn-primary" onclick="openRemoteModal()">+ Nové PC</button></div></div>`;
    return;
  }
  el.innerHTML = items.map(r => {
    const cleanId = String(r.rustdeskId || '').replace(/\s+/g, '');
    return `<div class="rc-card" tabindex="0" role="button" aria-label="Upraviť PC ${escHtml(r.name)}" title="Kliknutím upraviť"
        onclick="openRemoteModal(rcData.find(x=>x._id==='${r._id}'))"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openRemoteModal(rcData.find(x=>x._id==='${r._id}'))}">
      <div class="rc-card-head">
        <span class="rc-os" title="${escHtml(r.os || '')}">${RC_OS_ICON[(r.os || '').toLowerCase()] || '💻'}</span>
        <span class="rc-name">${escHtml(r.name)}</span>
      </div>
      <div class="rc-id-row">
        <code class="rc-idc" title="RustDesk ID">${escHtml(rcFmtId(r.rustdeskId))}</code>
        <button class="btn-sm" onclick="event.stopPropagation(); rcCopy('${r._id}', 'id')" title="Kopírovať ID">⧉ ID</button>
        ${r.password ? `<button class="btn-sm" onclick="event.stopPropagation(); rcCopy('${r._id}', 'pass')" title="Kopírovať heslo">⧉ Heslo</button>` : ''}
        <a class="btn-primary btn-sm rc-connect" href="rustdesk://connection/new/${encodeURIComponent(cleanId)}" title="Otvoriť v RustDesk klientovi" onclick="event.stopPropagation()">🖥 Pripojiť</a>
      </div>
      <div class="rc-meta">
        ${r.location ? `<span>📍 ${escHtml(r.location)}</span>` : ''}
        ${r.user ? `<span>👤 ${escHtml(r.user)}</span>` : ''}
        ${r.ip ? `<span title="Lokálna IP">🌐 <code>${escHtml(r.ip)}</code></span>` : ''}
      </div>
      ${(r.tags || []).length ? `<div class="rc-tags">${r.tags.map(t => `<span class="ph-mini-tag">#${escHtml(t)}</span>`).join('')}</div>` : ''}
      ${r.note ? `<div class="rc-note">${escHtml(r.note)}</div>` : ''}
    </div>`;
  }).join('');
}

// Skopíruj ID / heslo PC (bezpečne cez ID záznamu — heslá môžu obsahovať ' a \)
function rcCopy(id, what) {
  const r = rcData.find(x => x._id === id); if (!r) return;
  if (what === 'pass') phCopy(r.password || '', 'Heslo skopírované.');
  else phCopy(String(r.rustdeskId || '').replace(/\s+/g, ''), 'RustDesk ID skopírované.');
}

function openRemoteModal(r = null) {
  const e = !!r;
  document.getElementById('rcModalTitle').textContent = e ? 'Upraviť PC' : 'Nové vzdialené PC';
  document.getElementById('rcId').value = e ? r._id : '';
  document.getElementById('rcName').value = e ? (r.name || '') : '';
  document.getElementById('rcRustId').value = e ? (r.rustdeskId || '') : '';
  document.getElementById('rcPass').value = e ? (r.password || '') : '';
  document.getElementById('rcLocation').value = e ? (r.location || '') : '';
  document.getElementById('rcUser').value = e ? (r.user || '') : '';
  document.getElementById('rcOs').value = e ? (r.os || 'Windows') : 'Windows';
  document.getElementById('rcIp').value = e ? (r.ip || '') : '';
  document.getElementById('rcTags').value = e ? (r.tags || []).join(', ') : '';
  document.getElementById('rcNote').value = e ? (r.note || '') : '';
  document.getElementById('rcDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('remoteModal').classList.remove('hidden');
  modalSnapshot('remoteModal');
}
function closeRemoteModal() { modalGuardClose('remoteModal'); }

async function saveRemote() {
  const id = document.getElementById('rcId').value;
  const name = document.getElementById('rcName').value.trim();
  const rustdeskId = document.getElementById('rcRustId').value.trim();
  if (!name || !rustdeskId) { toast('Zadaj názov PC a RustDesk ID.', 'warn'); return; }
  const body = {
    name, rustdeskId,
    password: document.getElementById('rcPass').value,
    location: document.getElementById('rcLocation').value.trim(),
    user: document.getElementById('rcUser').value.trim(),
    os: document.getElementById('rcOs').value,
    ip: document.getElementById('rcIp').value.trim(),
    tags: document.getElementById('rcTags').value.split(',').map(t => t.trim()).filter(Boolean),
    note: document.getElementById('rcNote').value.trim()
  };
  try {
    const r = await fetch(id ? '/api/remote/' + id : '/api/remote', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).error || 'Chyba');
    delete _modalSnap['remoteModal'];
    document.getElementById('remoteModal').classList.add('hidden');
    toast(id ? 'PC upravené.' : 'PC pridané.', 'success');
    loadRemote();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteRemote(id) {
  if (!id || !await uiConfirm('Naozaj odstrániť PC zo zoznamu?')) return;
  try {
    await fetch('/api/remote/' + id, { method: 'DELETE' });
    delete _modalSnap['remoteModal'];
    document.getElementById('remoteModal').classList.add('hidden');
    toast('PC odstránené.', 'success');
    loadRemote();
  } catch { toast('Chyba.', 'error'); }
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITOR OBRÁZKOV — anotácie pre pracovné postupy
// (kruhy, rámčeky, šípky, popisy, bubliny → zapečené do PNG)
// ══════════════════════════════════════════════════════════════════════════════
let _ann = null;
let _annMeasure = null;
function annMeasureCtx() { if (!_annMeasure) _annMeasure = document.createElement('canvas').getContext('2d'); return _annMeasure; }
function annStage() { return document.getElementById('annSvg'); }
function annEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Otvor editor nad obrázkom → Promise s URL výsledku (anotovaný alebo pôvodný)
function openImageAnnotator(srcUrl) {
  return new Promise(resolve => {
    if (!srcUrl) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 800, h = img.naturalHeight || img.height || 600;
      _ann = {
        url: srcUrl, img, natW: w, natH: h, shapes: [], sel: null, tool: 'select',
        color: '#ef4444', sw: Math.max(3, Math.round(w / 260)), fontSize: Math.max(18, Math.round(w / 26)),
        drag: null, undo: [], resolve
      };
      document.getElementById('imgAnnotatorModal').classList.remove('hidden');
      const svg = annStage();
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.onpointerdown = annDown; svg.onpointermove = annMove; svg.onpointerup = annUp;
      document.addEventListener('keydown', annKeys);
      annSetTool('select'); annRender(); annPanel();
    };
    img.onerror = () => resolve(srcUrl);
    img.src = srcUrl;
  });
}

function annClose(url) {
  document.getElementById('imgAnnotatorModal').classList.add('hidden');
  document.removeEventListener('keydown', annKeys);
  const r = _ann && _ann.resolve; _ann = null;
  if (r) r(url);
}
function annCancel() { annClose(_ann ? _ann.url : null); }

// ── Nástroje ──
function annSetTool(t) { if (!_ann) return; _ann.tool = t; if (t !== 'select') _ann.sel = null; annSyncTools(); annRender(); annPanel(); }
function annSyncTools() { document.querySelectorAll('#imgAnnotatorModal .ann-tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === _ann.tool)); }

// ── Undo ──
function annPush() { _ann.undo.push(JSON.stringify(_ann.shapes)); if (_ann.undo.length > 60) _ann.undo.shift(); }
function annUndo() { if (_ann && _ann.undo.length) { _ann.shapes = JSON.parse(_ann.undo.pop()); _ann.sel = null; annRender(); annPanel(); } }
function annClear() { if (!_ann.shapes.length) return; annPush(); _ann.shapes = []; _ann.sel = null; annRender(); annPanel(); }
function annDeleteSel() { if (_ann && _ann.sel != null) { annPush(); _ann.shapes.splice(_ann.sel, 1); _ann.sel = null; annRender(); annPanel(); } }

function annKeys(e) {
  if (!_ann) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
  if (e.key === 'Escape') { if (!typing) annCancel(); return; }
  if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); annDeleteSel(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); annUndo(); }
}

// ── Geometria ──
function annCoord(e) {
  const svg = annStage(), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
  const q = pt.matrixTransform(m.inverse()); return { x: q.x, y: q.y };
}
function annArrowHead(s) {
  const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), len = Math.max(s.sw * 3.4, 14);
  const a1 = ang + Math.PI - 0.42, a2 = ang + Math.PI + 0.42;
  return `${s.x2},${s.y2} ${s.x2 + Math.cos(a1) * len},${s.y2 + Math.sin(a1) * len} ${s.x2 + Math.cos(a2) * len},${s.y2 + Math.sin(a2) * len}`;
}
function annWrap(text, maxW, fontPx) {
  const ctx = annMeasureCtx(); ctx.font = `${fontPx}px sans-serif`; const out = [];
  String(text || '').split('\n').forEach(par => {
    const words = par.split(/\s+/); let line = '';
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    });
    out.push(line);
  });
  return out.length ? out : [''];
}
function annTextSize(s) {
  const ctx = annMeasureCtx(); ctx.font = `700 ${s.size}px sans-serif`;
  const lines = annWrap(s.text, _ann.natW - s.x - 10, s.size); let w = 0;
  lines.forEach(l => w = Math.max(w, ctx.measureText(l).width));
  return { w: w || 20, h: lines.length * s.size * 1.2 };
}
function annBBox(s) {
  if (s.type === 'circle') return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
  if (s.type === 'rect' || s.type === 'bubble') return { x: s.x, y: s.y, w: s.w, h: s.h };
  if (s.type === 'arrow') return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1) || 1, h: Math.abs(s.y2 - s.y1) || 1 };
  if (s.type === 'text') { const t = annTextSize(s); return { x: s.x, y: s.y, w: t.w, h: t.h }; }
  return { x: 0, y: 0, w: 0, h: 0 };
}

// ── Vykreslenie do SVG ──
function annShapeSvg(s, i) {
  if (s.type === 'circle')
    return `<ellipse data-idx="${i}" cx="${s.cx}" cy="${s.cy}" rx="${Math.max(1, s.rx)}" ry="${Math.max(1, s.ry)}" fill="transparent" stroke="${s.color}" stroke-width="${s.sw}"/>`;
  if (s.type === 'rect')
    return `<rect data-idx="${i}" x="${s.x}" y="${s.y}" width="${Math.max(1, s.w)}" height="${Math.max(1, s.h)}" rx="${Math.min(s.w, s.h) * 0.03}" fill="transparent" stroke="${s.color}" stroke-width="${s.sw}"/>`;
  if (s.type === 'arrow')
    return `<line data-idx="${i}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="transparent" stroke-width="${Math.max(s.sw * 3, 18)}"/>`
      + `<line data-idx="${i}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.color}" stroke-width="${s.sw}" stroke-linecap="round"/>`
      + `<polygon data-idx="${i}" points="${annArrowHead(s)}" fill="${s.color}"/>`;
  if (s.type === 'text') {
    const lines = annWrap(s.text, _ann.natW - s.x - 10, s.size);
    const tsp = lines.map((ln, li) => `<tspan x="${s.x}" dy="${li === 0 ? 0 : s.size * 1.2}">${annEsc(ln)}</tspan>`).join('');
    return `<text data-idx="${i}" x="${s.x}" y="${s.y + s.size * 0.86}" font-family="sans-serif" font-size="${s.size}" font-weight="700" fill="${s.color}" stroke="#ffffff" stroke-width="${s.size * 0.16}" paint-order="stroke" stroke-linejoin="round">${tsp}</text>`;
  }
  if (s.type === 'bubble') {
    const r = Math.min(s.w, s.h) * 0.14;
    const tail = `${s.x + s.w * 0.24},${s.y + s.h} ${s.x + s.w * 0.44},${s.y + s.h} ${s.tailX},${s.tailY}`;
    const lines = annWrap(s.text, s.w - 18, s.size);
    const tsp = lines.map((ln, li) => `<tspan x="${s.x + 10}" dy="${li === 0 ? s.size : s.size * 1.2}">${annEsc(ln)}</tspan>`).join('');
    return `<polygon data-idx="${i}" points="${tail}" fill="#ffffff" stroke="${s.color}" stroke-width="${s.sw}" stroke-linejoin="round"/>`
      + `<rect data-idx="${i}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${r}" fill="#ffffff" stroke="${s.color}" stroke-width="${s.sw}"/>`
      + `<text data-idx="${i}" x="${s.x + 10}" y="${s.y + 4}" font-family="sans-serif" font-size="${s.size}" fill="#111827">${tsp}</text>`;
  }
  return '';
}
function annHandle(x, y, name, hs) {
  return `<rect data-handle="${name}" x="${x - hs}" y="${y - hs}" width="${hs * 2}" height="${hs * 2}" rx="${hs * 0.35}" fill="#22d3ee" stroke="#0a0f20" stroke-width="${hs * 0.22}"/>`;
}
function annHandles() {
  if (_ann.sel == null) return '';
  const s = _ann.shapes[_ann.sel]; if (!s) return '';
  const hs = Math.max(6, _ann.natW / 95), box = annBBox(s);
  let out = `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="none" stroke="#22d3ee" stroke-width="${hs * 0.22}" stroke-dasharray="${hs} ${hs * 0.6}" pointer-events="none"/>`;
  if (s.type === 'arrow') out += annHandle(s.x1, s.y1, 'p1', hs) + annHandle(s.x2, s.y2, 'p2', hs);
  else if (s.type !== 'text') { out += annHandle(box.x + box.w, box.y + box.h, 'br', hs); if (s.type === 'bubble') out += annHandle(s.tailX, s.tailY, 'tail', hs); }
  return out;
}
function annRender() {
  const svg = annStage(); if (!svg || !_ann) return;
  let inner = `<image href="${annEsc(_ann.url)}" xlink:href="${annEsc(_ann.url)}" x="0" y="0" width="${_ann.natW}" height="${_ann.natH}" preserveAspectRatio="none"/>`;
  _ann.shapes.forEach((s, i) => inner += annShapeSvg(s, i));
  inner += annHandles();
  svg.innerHTML = inner;
}

// ── Interakcia ──
function annDown(e) {
  if (!_ann) return; e.preventDefault();
  const p = annCoord(e);
  const handle = e.target && e.target.getAttribute && e.target.getAttribute('data-handle');
  if (_ann.tool === 'select') {
    if (handle) { annPush(); _ann.drag = { mode: 'handle', handle }; annStage().setPointerCapture(e.pointerId); return; }
    const idxAttr = e.target && e.target.getAttribute && e.target.getAttribute('data-idx');
    if (idxAttr != null) {
      _ann.sel = +idxAttr; annPush();
      _ann.drag = { mode: 'move', start: p, orig: JSON.parse(JSON.stringify(_ann.shapes[_ann.sel])) };
      annStage().setPointerCapture(e.pointerId); annRender(); annPanel(); return;
    }
    _ann.sel = null; annRender(); annPanel(); return;
  }
  annPush();
  const c = _ann.color, sw = _ann.sw, size = _ann.fontSize; let s;
  if (_ann.tool === 'circle') s = { type: 'circle', cx: p.x, cy: p.y, rx: 1, ry: 1, color: c, sw };
  else if (_ann.tool === 'rect') s = { type: 'rect', x: p.x, y: p.y, w: 1, h: 1, color: c, sw };
  else if (_ann.tool === 'arrow') s = { type: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: c, sw };
  else if (_ann.tool === 'text') s = { type: 'text', x: p.x, y: p.y, text: 'Popis', color: c, size };
  else if (_ann.tool === 'bubble') s = { type: 'bubble', x: p.x, y: p.y, w: Math.max(80, _ann.natW * 0.16), h: Math.max(50, _ann.natH * 0.1), tailX: p.x - _ann.natW * 0.04, tailY: p.y + _ann.natH * 0.18, text: 'Bublina', color: c, sw, size };
  _ann.shapes.push(s); _ann.sel = _ann.shapes.length - 1;
  if (_ann.tool === 'text' || _ann.tool === 'bubble') { _ann.tool = 'select'; annSyncTools(); annRender(); annPanel(true); }
  else { _ann.drag = { mode: 'create', start: p }; annStage().setPointerCapture(e.pointerId); annRender(); }
}
function annMove(e) {
  if (!_ann || !_ann.drag) return;
  const p = annCoord(e), d = _ann.drag, s = _ann.shapes[_ann.sel];
  if (!s) return;
  if (d.mode === 'create') {
    if (s.type === 'circle') { s.cx = (d.start.x + p.x) / 2; s.cy = (d.start.y + p.y) / 2; s.rx = Math.abs(p.x - d.start.x) / 2; s.ry = Math.abs(p.y - d.start.y) / 2; }
    else if (s.type === 'rect') { s.x = Math.min(d.start.x, p.x); s.y = Math.min(d.start.y, p.y); s.w = Math.abs(p.x - d.start.x); s.h = Math.abs(p.y - d.start.y); }
    else if (s.type === 'arrow') { s.x2 = p.x; s.y2 = p.y; }
  } else if (d.mode === 'move') {
    const dx = p.x - d.start.x, dy = p.y - d.start.y, o = d.orig;
    if (s.type === 'circle') { s.cx = o.cx + dx; s.cy = o.cy + dy; }
    else if (s.type === 'rect') { s.x = o.x + dx; s.y = o.y + dy; }
    else if (s.type === 'arrow') { s.x1 = o.x1 + dx; s.y1 = o.y1 + dy; s.x2 = o.x2 + dx; s.y2 = o.y2 + dy; }
    else if (s.type === 'text') { s.x = o.x + dx; s.y = o.y + dy; }
    else if (s.type === 'bubble') { s.x = o.x + dx; s.y = o.y + dy; s.tailX = o.tailX + dx; s.tailY = o.tailY + dy; }
  } else if (d.mode === 'handle') {
    if (d.handle === 'p1') { s.x1 = p.x; s.y1 = p.y; }
    else if (d.handle === 'p2') { s.x2 = p.x; s.y2 = p.y; }
    else if (d.handle === 'tail') { s.tailX = p.x; s.tailY = p.y; }
    else if (d.handle === 'br') {
      if (s.type === 'circle') { s.rx = Math.max(4, Math.abs(p.x - s.cx)); s.ry = Math.max(4, Math.abs(p.y - s.cy)); }
      else { s.w = Math.max(12, p.x - s.x); s.h = Math.max(12, p.y - s.y); }
    }
  }
  annRender();
}
function annUp(e) {
  if (!_ann || !_ann.drag) return;
  if (_ann.drag.mode === 'create') {
    const s = _ann.shapes[_ann.sel];
    const tiny = (s.type === 'circle' && s.rx < 3 && s.ry < 3) || (s.type === 'rect' && s.w < 5 && s.h < 5) || (s.type === 'arrow' && Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 8);
    if (tiny) { _ann.shapes.splice(_ann.sel, 1); _ann.sel = null; _ann.undo.pop(); }
    else { _ann.tool = 'select'; annSyncTools(); }
    annRender(); annPanel();
  }
  _ann.drag = null;
}

// ── Panel vlastností ──
const ANN_PALETTE = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#111827', '#ffffff'];
function annPanel(focusText) {
  const el = document.getElementById('annPanel'); if (!el) return;
  const s = _ann.sel != null ? _ann.shapes[_ann.sel] : null;
  const curColor = s ? s.color : _ann.color;
  let html = `<div class="ann-p-sec"><div class="ann-p-lbl">Farba</div><div class="ann-swatches">`;
  ANN_PALETTE.forEach(c => html += `<button class="ann-sw ${curColor === c ? 'active' : ''}" style="background:${c}" onclick="annSetColor('${c}')" title="${c}"></button>`);
  html += `</div></div>`;
  const swVal = s && s.sw != null ? s.sw : _ann.sw;
  const showSw = !s || s.sw != null || ['circle', 'rect', 'arrow', 'bubble'].includes(_ann.tool);
  if (showSw) html += `<div class="ann-p-sec"><div class="ann-p-lbl">Hrúbka čiary · <b id="annSwVal">${swVal}</b></div><input type="range" min="1" max="60" value="${swVal}" oninput="annSetSw(this.value)"></div>`;
  const showFont = (s && (s.type === 'text' || s.type === 'bubble')) || _ann.tool === 'text' || _ann.tool === 'bubble';
  if (showFont) { const fs = s && s.size != null ? s.size : _ann.fontSize; html += `<div class="ann-p-sec"><div class="ann-p-lbl">Veľkosť písma · <b id="annFsVal">${fs}</b></div><input type="range" min="10" max="160" value="${fs}" oninput="annSetFont(this.value)"></div>`; }
  if (s && (s.type === 'text' || s.type === 'bubble')) html += `<div class="ann-p-sec"><div class="ann-p-lbl">Text</div><textarea id="annTextInp" rows="3" oninput="annSetText(this.value)">${annEsc(s.text)}</textarea></div>`;
  if (s) html += `<button class="btn-sm ann-del" onclick="annDeleteSel()">🗑 Zmazať objekt</button>`;
  html += `<div class="ann-p-hint">${s ? 'Ťahaj objekt myšou · tyrkysový uholník mení veľkosť · Del zmaže.' : 'Vyber nástroj vľavo a ťahaj po obrázku. Klikni na objekt pre úpravu.'}</div>`;
  el.innerHTML = html;
  if (focusText) { const t = document.getElementById('annTextInp'); if (t) { t.focus(); t.select(); } }
}
function annSetColor(c) { if (_ann.sel != null) { annPush(); _ann.shapes[_ann.sel].color = c; } _ann.color = c; annRender(); annPanel(); }
function annSetSw(v) { v = +v; if (_ann.sel != null && _ann.shapes[_ann.sel].sw != null) _ann.shapes[_ann.sel].sw = v; _ann.sw = v; const b = document.getElementById('annSwVal'); if (b) b.textContent = v; annRender(); }
function annSetFont(v) { v = +v; if (_ann.sel != null && _ann.shapes[_ann.sel].size != null) _ann.shapes[_ann.sel].size = v; _ann.fontSize = v; const b = document.getElementById('annFsVal'); if (b) b.textContent = v; annRender(); }
function annSetText(v) { if (_ann.sel != null) { _ann.shapes[_ann.sel].text = v; annRender(); } }

// ── Export: zapečenie anotácií do PNG cez canvas ──
function annRoundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function annCanvasText(ctx, s) {
  const size = s.size, inB = !!s.inBubble;
  ctx.font = `${inB ? '' : '700 '}${size}px sans-serif`; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const wrapW = s.wrapW != null ? s.wrapW : (_ann.natW - s.x - 10);
  const lines = annWrap(s.text, wrapW, size);
  let y = inB ? s.y + 6 : s.y;
  lines.forEach(ln => {
    if (!inB) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = size * 0.32; ctx.strokeText(ln, s.x, y); }
    ctx.fillStyle = s.color; ctx.fillText(ln, s.x, y); y += size * 1.2;
  });
}
function annDrawCanvas(ctx, s) {
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (s.type === 'circle') { ctx.strokeStyle = s.color; ctx.lineWidth = s.sw; ctx.beginPath(); ctx.ellipse(s.cx, s.cy, Math.max(1, s.rx), Math.max(1, s.ry), 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (s.type === 'rect') { ctx.strokeStyle = s.color; ctx.lineWidth = s.sw; annRoundRect(ctx, s.x, s.y, s.w, s.h, Math.min(s.w, s.h) * 0.03); ctx.stroke(); }
  else if (s.type === 'arrow') {
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.sw;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    const pts = annArrowHead(s).split(' ').map(p => p.split(',').map(Number));
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.closePath(); ctx.fill();
  }
  else if (s.type === 'text') annCanvasText(ctx, s);
  else if (s.type === 'bubble') {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = s.color; ctx.lineWidth = s.sw;
    ctx.beginPath(); ctx.moveTo(s.x + s.w * 0.24, s.y + s.h); ctx.lineTo(s.x + s.w * 0.44, s.y + s.h); ctx.lineTo(s.tailX, s.tailY); ctx.closePath(); ctx.fill(); ctx.stroke();
    annRoundRect(ctx, s.x, s.y, s.w, s.h, Math.min(s.w, s.h) * 0.14); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = s.color; ctx.lineWidth = s.sw; ctx.stroke();
    annCanvasText(ctx, { x: s.x + 10, y: s.y, text: s.text, size: s.size, color: '#111827', wrapW: s.w - 18, inBubble: true });
  }
  ctx.restore();
}
function annFlatten() {
  return new Promise((resolve, reject) => {
    const c = document.createElement('canvas'); c.width = _ann.natW; c.height = _ann.natH;
    const ctx = c.getContext('2d');
    try { ctx.drawImage(_ann.img, 0, 0, _ann.natW, _ann.natH); } catch (e) { return reject(e); }
    _ann.shapes.forEach(s => annDrawCanvas(ctx, s));
    c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/png');
  });
}
async function annSave() {
  if (!_ann.shapes.length) { annClose(_ann.url); return; }
  const btn = document.getElementById('annSaveBtn'); const old = btn.textContent;
  btn.disabled = true; btn.textContent = 'Ukladám…';
  try {
    const blob = await annFlatten();
    const file = new File([blob], 'anotacia-' + Date.now() + '.png', { type: 'image/png' });
    const url = await uploadImage(file);
    annClose(url || _ann.url);
    toast('Anotovaný obrázok uložený.', 'success');
  } catch (e) {
    btn.disabled = false; btn.textContent = old;
    toast('Uloženie zlyhalo — skús znova.', 'error');
  }
}

// Otvor editor nad existujúcim obrázkom v zozname (datasheety/prototypy) a nahraď URL
async function reAnnotateDsImage(i) { if (!dsImagesData[i]) return; const url = await openImageAnnotator(dsImagesData[i].url); if (url) { dsImagesData[i].url = url; renderDsImages(); } }
async function reAnnotatePtImage(i) { if (!ptImagesData[i]) return; const url = await openImageAnnotator(ptImagesData[i].url); if (url) { ptImagesData[i].url = url; renderPtImages(); } }

// ==============================
// FILE SERVER — zdieľanie súborov pre zákazníkov
// ==============================
let FS_SHARES = [];

function fsFmtSize(b) {
  if (!b) return '0 B';
  const u = ['B', 'kB', 'MB', 'GB']; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (i === 0 ? b : b.toFixed(1)) + ' ' + u[i];
}
function fsLinkOf(s) { return location.origin + '/s/' + s.token; }

async function loadFileShares() {
  try {
    const r = await fetch('/api/fileshare');
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
    FS_SHARES = await r.json();
  } catch (e) { FS_SHARES = []; toast('Nepodarilo sa načítať zdieľania: ' + e.message, 'error'); }
  renderFileShares();
}

function fsIsExpired(s) { return s.expiresAt && new Date(s.expiresAt) < new Date(); }

function renderFileShares() {
  const wrap = document.getElementById('fsList');
  if (!wrap) return;
  const q = (document.getElementById('fsSearch')?.value || '').toLowerCase().trim();
  let list = FS_SHARES;
  if (q) list = list.filter(s => (s.name + ' ' + (s.note || '') + ' ' + s.token).toLowerCase().includes(q));
  if (!list.length) {
    wrap.innerHTML = `<div class="fs-empty">
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><polyline points="8 17 12 13 16 17"/><line x1="12" y1="13" x2="12" y2="21"/></svg>
      <p>${q ? 'Žiadne zdieľanie nezodpovedá hľadaniu.' : 'Zatiaľ žiadne zdieľania. Vytvor prvé cez „+ Nové zdieľanie".'}</p>
    </div>`;
    return;
  }
  wrap.innerHTML = list.map(s => {
    const expired = fsIsExpired(s);
    const state = expired ? ['fs-badge-off', 'Expirované'] : (s.active ? ['fs-badge-on', 'Aktívne'] : ['fs-badge-off', 'Vypnuté']);
    const totalSize = (s.files || []).reduce((a, f) => a + (f.size || 0), 0);
    const filesHtml = (s.files || []).length ? s.files.map(f => `
      <div class="fs-file">
        <span class="fs-file-name" title="${escHtml(f.originalName)}">${escHtml(f.originalName)}</span>
        <span class="fs-file-meta">${fsFmtSize(f.size)}${f.downloads ? ` · ⬇ ${f.downloads}×` : ''}</span>
        <button class="fs-file-del" title="Zmazať súbor" onclick="fsDeleteFile('${s._id}','${f._id}')">✕</button>
      </div>`).join('') : '<div class="fs-nofiles">Zatiaľ žiadne súbory</div>';
    return `
    <div class="fs-card${expired || !s.active ? ' fs-card-off' : ''}">
      <div class="fs-card-head">
        <div class="fs-card-title">
          <h3 title="${escHtml(s.name)}">${escHtml(s.name)}</h3>
          <span class="fs-badge ${state[0]}">${state[1]}</span>
        </div>
        ${s.note ? `<p class="fs-note" title="Interná poznámka">${escHtml(s.note)}</p>` : ''}
      </div>
      <div class="fs-link-row">
        <input type="text" readonly value="${escHtml(fsLinkOf(s))}" onclick="this.select()" title="Odkaz pre zákazníka">
        <button class="btn-secondary fs-btn-sm" onclick="fsCopy(fsLinkOf(FS_SHARES.find(x=>x._id==='${s._id}')), 'Odkaz skopírovaný')" title="Kopírovať odkaz">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <a class="btn-secondary fs-btn-sm" href="/s/${s.token}" target="_blank" rel="noopener" title="Otvoriť zákaznícku stránku">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
      <div class="fs-stats">
        <span title="Počet súborov">${(s.files || []).length} súb. · ${fsFmtSize(totalSize)}</span>
        <span title="Počet odomknutí zákazníkom">👁 ${s.views || 0}×</span>
        <span title="Počet stiahnutí">⬇ ${s.downloads || 0}×</span>
        ${s.expiresAt ? `<span title="Platnosť do">⏳ ${new Date(s.expiresAt).toLocaleDateString('sk-SK')}</span>` : ''}
      </div>
      <div class="fs-files">${filesHtml}</div>
      <div class="fs-drop" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')"
           ondrop="event.preventDefault();this.classList.remove('drag');fsUpload('${s._id}', event.dataTransfer.files)"
           onclick="fsPickFiles('${s._id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><polyline points="8 17 12 13 16 17"/><line x1="12" y1="13" x2="12" y2="21"/></svg>
        <span>Pretiahni súbory sem alebo klikni (max 500 MB / súbor)</span>
      </div>
      <div class="fs-actions">
        <button class="btn-secondary fs-btn-sm" onclick="openFsModal('${s._id}')">Upraviť</button>
        <button class="btn-secondary fs-btn-sm" onclick="fsRegenPass('${s._id}')" title="Vygeneruje nové heslo — staré prestane platiť">Nové heslo</button>
        <button class="btn-secondary fs-btn-sm" onclick="fsToggleActive('${s._id}')">${s.active ? 'Vypnúť' : 'Aktivovať'}</button>
        <button class="btn-delete fs-btn-sm" onclick="fsDeleteShare('${s._id}')">Zmazať</button>
      </div>
    </div>`;
  }).join('');
}

function openFsModal(id) {
  const s = id ? FS_SHARES.find(x => x._id === id) : null;
  document.getElementById('fsModalTitle').textContent = s ? 'Upraviť zdieľanie' : 'Nové zdieľanie';
  document.getElementById('fsId').value = s ? s._id : '';
  document.getElementById('fsName').value = s ? s.name : '';
  document.getElementById('fsNote').value = s ? (s.note || '') : '';
  document.getElementById('fsExpires').value = s && s.expiresAt ? new Date(s.expiresAt).toISOString().slice(0, 10) : '';
  document.getElementById('fsModal').classList.remove('hidden');
  modalSnapshot('fsModal');
  setTimeout(() => document.getElementById('fsName').focus(), 60);
}
function closeFsModal() { modalGuardClose('fsModal'); }

async function saveFsShare() {
  const id = document.getElementById('fsId').value;
  const body = {
    name: document.getElementById('fsName').value.trim(),
    note: document.getElementById('fsNote').value.trim(),
    expiresAt: document.getElementById('fsExpires').value || null
  };
  if (!body.name) { toast('Zadaj názov zdieľania', 'warn'); return; }
  try {
    const r = await fetch('/api/fileshare' + (id ? '/' + id : ''), {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.status);
    modalSnapshot('fsModal'); // uložené — zavrieť bez strážneho dialógu
    document.getElementById('fsModal').classList.add('hidden');
    await loadFileShares();
    if (!id && d.password) fsShowCreds(d.share, d.password);
    else toast('Zdieľanie uložené', 'success');
  } catch (e) { toast('Chyba pri ukladaní: ' + e.message, 'error'); }
}

function fsShowCreds(share, password) {
  const link = fsLinkOf(share);
  document.getElementById('fsCredLink').value = link;
  document.getElementById('fsCredPass').value = password;
  document.getElementById('fsCredMsg').value =
    `Dobrý deň,\n\npripravili sme pre vás súbory na stiahnutie:\n${link}\nPrístupové heslo: ${password}\n\nS pozdravom\nSYLEX s.r.o.`;
  document.getElementById('fsCredOpen').href = link;
  document.getElementById('fsCredsModal').classList.remove('hidden');
}

async function fsCopy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg || 'Skopírované', 'success'); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove(); toast(msg || 'Skopírované', 'success');
  }
}

async function fsRegenPass(id) {
  if (!await uiConfirm('Vygenerovať nové heslo? Staré heslo okamžite prestane platiť.')) return;
  try {
    const r = await fetch(`/api/fileshare/${id}/password`, { method: 'POST' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.status);
    fsShowCreds(d.share, d.password);
  } catch (e) { toast('Chyba: ' + e.message, 'error'); }
}

async function fsToggleActive(id) {
  const s = FS_SHARES.find(x => x._id === id); if (!s) return;
  try {
    const r = await fetch(`/api/fileshare/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !s.active })
    });
    if (!r.ok) throw new Error((await r.json()).error || r.status);
    toast(s.active ? 'Zdieľanie vypnuté' : 'Zdieľanie aktivované', 'success');
    await loadFileShares();
  } catch (e) { toast('Chyba: ' + e.message, 'error'); }
}

async function fsDeleteShare(id) {
  const s = FS_SHARES.find(x => x._id === id); if (!s) return;
  if (!await uiConfirm(`Zmazať zdieľanie „${s.name}" vrátane všetkých súborov? Odkaz prestane fungovať.`)) return;
  try {
    const r = await fetch(`/api/fileshare/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).error || r.status);
    toast('Zdieľanie zmazané', 'success');
    await loadFileShares();
  } catch (e) { toast('Chyba: ' + e.message, 'error'); }
}

function fsPickFiles(id) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true;
  inp.onchange = () => fsUpload(id, inp.files);
  inp.click();
}

async function fsUpload(id, files) {
  if (!files || !files.length) return;
  const fd = new FormData();
  Array.from(files).forEach(f => fd.append('files', f));
  toast(`Nahrávam ${files.length} súbor(ov)…`, 'info');
  try {
    const r = await fetch(`/api/fileshare/${id}/files`, { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.status);
    toast('Súbory nahraté', 'success');
    await loadFileShares();
  } catch (e) { toast('Chyba pri nahrávaní: ' + e.message, 'error'); }
}

async function fsDeleteFile(id, fileId) {
  if (!await uiConfirm('Zmazať tento súbor zo zdieľania?')) return;
  try {
    const r = await fetch(`/api/fileshare/${id}/files/${fileId}`, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).error || r.status);
    toast('Súbor zmazaný', 'success');
    await loadFileShares();
  } catch (e) { toast('Chyba: ' + e.message, 'error'); }
}

// Štart: over prihlásenie, potom spusti appku
bootstrap();

// ==============================
// PWA — inštalácia na plochu (Android + iPhone)
// ==============================
(function initPwaInstall() {
  // Už spustené ako nainštalovaná appka? → nič neponúkaj.
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true;
  if (isStandalone()) return;
  if (localStorage.getItem('fos_pwa_dismissed') === '1') return;

  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  let deferredPrompt = null;

  function buildBanner(innerHtml) {
    if (document.getElementById('pwaInstallBanner')) return;
    const b = document.createElement('div');
    b.id = 'pwaInstallBanner';
    b.style.cssText = [
      'position:fixed', 'left:12px', 'right:12px',
      'bottom:calc(76px + env(safe-area-inset-bottom))', 'z-index:3500',
      'max-width:520px', 'margin:0 auto',
      'display:flex', 'align-items:center', 'gap:12px',
      'padding:12px 14px', 'border-radius:14px',
      'background:#131c35', 'border:1px solid rgba(255,255,255,0.14)',
      'box-shadow:0 10px 34px rgba(0,0,0,0.45)', 'color:#e7edfb',
      'font-family:var(--font, system-ui)'
    ].join(';');
    b.innerHTML = innerHtml;
    document.body.appendChild(b);
    b.querySelector('[data-pwa-dismiss]')?.addEventListener('click', () => {
      localStorage.setItem('fos_pwa_dismissed', '1');
      b.remove();
    });
    return b;
  }

  const iconCell =
    '<div style="width:38px;height:38px;flex-shrink:0;border-radius:10px;background:linear-gradient(140deg,#00d4ff,#6366f1);display:flex;align-items:center;justify-content:center;font-size:1.2rem">✅</div>';
  const closeBtn =
    '<button data-pwa-dismiss aria-label="Zavrieť" style="flex-shrink:0;width:30px;height:30px;border:none;border-radius:8px;background:rgba(255,255,255,0.08);color:#c7d2e8;font-size:1.1rem;cursor:pointer">×</button>';

  // Android / Chrome / Edge — natívna výzva na inštaláciu
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone()) return;
    const banner = buildBanner(
      iconCell +
      '<div style="flex:1;min-width:0;line-height:1.3">' +
        '<div style="font-weight:700;font-size:0.92rem">Nainštalovať appku Úlohy</div>' +
        '<div style="font-size:0.76rem;color:#9fb0d0">Rýchly prístup z plochy telefónu — funguje aj offline.</div>' +
      '</div>' +
      '<button id="pwaInstallBtn" style="flex-shrink:0;padding:9px 14px;border:none;border-radius:9px;background:var(--accent,#06b6d4);color:#06121f;font-weight:700;font-size:0.85rem;cursor:pointer">Inštalovať</button>' +
      closeBtn
    );
    banner?.querySelector('#pwaInstallBtn')?.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (_) {}
      deferredPrompt = null;
      document.getElementById('pwaInstallBanner')?.remove();
    });
  });

  window.addEventListener('appinstalled', () => {
    localStorage.setItem('fos_pwa_dismissed', '1');
    document.getElementById('pwaInstallBanner')?.remove();
    if (typeof toast === 'function') toast('Appka nainštalovaná na plochu', 'success');
  });

  // iPhone (Safari) — nemá beforeinstallprompt, ukáž návod „Zdieľať → Na plochu"
  if (isIOSSafari) {
    // počkaj na prihlásenie, aby banner neprekrýval login
    const showIOSHint = () => {
      if (document.body.classList.contains('logged-out')) return setTimeout(showIOSHint, 1500);
      buildBanner(
        iconCell +
        '<div style="flex:1;min-width:0;line-height:1.35">' +
          '<div style="font-weight:700;font-size:0.92rem">Pridať Úlohy na plochu</div>' +
          '<div style="font-size:0.76rem;color:#9fb0d0">Ťukni na <span style="color:#67e8f9">Zdieľať</span> ' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2" style="vertical-align:-2px"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6"/></svg>' +
          ' a zvoľ <b>„Pridať na plochu"</b>.</div>' +
        '</div>' +
        closeBtn
      );
    };
    setTimeout(showIOSHint, 2500);
  }
})();
