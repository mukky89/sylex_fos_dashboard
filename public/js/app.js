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
function showLogin() { document.getElementById('loginOverlay')?.classList.remove('hidden'); }
function hideLogin() { document.getElementById('loginOverlay')?.classList.add('hidden'); }
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
  el.innerHTML = `<span class="hdr-user-name" title="${escHtml(CURRENT_USER.username)}${CURRENT_USER.role === 'admin' ? ' · admin' : ''}">👤 ${escHtml(CURRENT_USER.name || CURRENT_USER.username)}</span>
    <button class="hdr-icon-btn" onclick="logout()" title="Odhlásiť sa"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>`;
}
function tokenQS() { return AUTH_TOKEN ? ('?token=' + encodeURIComponent(AUTH_TOKEN)) : ''; }

// Spustí appku po úspešnom prihlásení
function startApp() {
  renderUserChip();
  if (_appStarted) { loadNotif(); return; }
  _appStarted = true;
  loadHeaderLinks();
  loadAppVersion();
  loadNotif();
  setInterval(loadNotif, 120000);
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
    } else {
      ['thermoValue','humValue','sensorTempVal','sensorHumVal'].forEach(id => set(id,'--.-'));
      ['thermoStatus','sensorStatus'].forEach(id => { set(id,'OFFLINE'); cls(id,'thermo-status thermo-offline'); });
    }
  } catch {
    ['thermoStatus','sensorStatus'].forEach(id => { set(id,'OFFLINE'); cls(id,'thermo-status thermo-offline'); });
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
  if (hash === 'calendar') { _activatePage('calendar'); loadCalendar(); return; }
  if (hash === 'procedures') { _activatePage('procedures'); loadProcedures(); return; }
  if (hash === 'dev')     { _activatePage('dev');     loadDev(); return; }
  if (hash === 'tasks')   { _activatePage('tasks');   loadTasks(); return; }
  if (hash === 'admin')   { _activatePage('admin');   switchAdminTab('links'); return; }
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
  if (name === 'dev')     loadDev();
  if (name === 'tasks')   loadTasks();
  if (name === 'admin')   switchAdminTab('links');
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
  renderWikiHome();
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
  const open = tasks.filter(t => !t.done)
    .sort((a, b) => (a.due ? String(a.due) : '9999').localeCompare(b.due ? String(b.due) : '9999')).slice(0, 6);
  if (!open.length) { el.innerHTML = '<div class="home-cal-empty">Žiadne aktívne úlohy. 🎉</div>'; return; }
  const todayKey = calYmd(new Date());
  el.innerHTML = '';
  open.forEach(t => {
    const prio = (typeof TK_PRIO !== 'undefined' ? TK_PRIO[t.priority] : null) || { c: '#3b82f6' };
    const od = t.due && String(t.due).slice(0, 10) < todayKey;
    const row = document.createElement('div');
    row.className = 'home-task-item';
    row.style.setProperty('--ev', prio.c);
    row.innerHTML = `
      <button class="home-task-check" title="Označiť ako hotové">✓</button>
      <div class="home-task-body">
        <div class="home-task-title">${escHtml(t.title)}</div>
        ${t.due ? `<div class="home-task-meta ${od ? 'task-od' : ''}">📅 ${fmtDate(t.due)}${od ? ' — po termíne' : ''}</div>` : ''}
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

  // Breadcrumb
  const bcCatEl = document.getElementById('pdBcCat');
  if (bcCatEl) {
    const catObj = p.category ? categories.find(c => c._id === (p.category._id || p.category)) : null;
    bcCatEl.textContent = catObj ? catObj.name : (p.category?.name || '');
    bcCatEl.dataset.catId = p.category?._id || p.category || '';
  }

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
  if (!confirm('Naozaj odstrániť tento záznam?')) return;
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
function fmtDate(iso) { return new Date(iso).toLocaleDateString('sk-SK'); }
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

// Riadok odkazu s cestou (serverové priečinky / šablóny) — otvoriť + kopírovať
function fileRowHtml(l) {
  const href = toFileHref(l.url);
  const copyBtn = isFilePath(l.url)
    ? `<button class="files-row-btn" onclick="copyToClipboard(this, ${JSON.stringify(l.url).replace(/"/g, '&quot;')})" title="Kopírovať cestu">⧉</button>`
    : '';
  return `<div class="files-row">
    <a class="files-row-link" href="${escHtml(href)}" target="_blank" title="${escHtml(l.url)}">
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
  if (!confirm('Naozaj odstrániť túto novinku?')) return;
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

// Date -> 'YYYY-MM-DD' (local components)
function calYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function loadCalendar() {
  // Range covers the visible grid (incl. spillover days from adjacent months)
  const first = new Date(calYear, calMonth, 1);
  const from  = new Date(calYear, calMonth - 1, 1);
  const to    = new Date(calYear, calMonth + 2, 0);
  try {
    const r = await fetch(`/api/calendar?from=${calYmd(from)}&to=${calYmd(to)}`);
    calEvents = await r.json();
    if (!Array.isArray(calEvents)) calEvents = [];
  } catch { calEvents = []; }
  renderCalendar();
}

// Build map: 'YYYY-MM-DD' -> [events] (multi-day events appear on each day)
function calBuildDayMap() {
  const map = {};
  const add = (key, ev) => { (map[key] = map[key] || []).push(ev); };
  calEvents.forEach(ev => {
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

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  const label = document.getElementById('calMonthLabel');
  if (!grid) return;
  if (label) label.textContent = `${CAL_MONTHS[calMonth]} ${calYear}`;

  const dayMap = calBuildDayMap();
  const todayKey = calYmd(new Date());

  const firstOfMonth = new Date(calYear, calMonth, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const gridStart = new Date(calYear, calMonth, 1 - offset);

  grid.innerHTML = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = calYmd(d);
    const inMonth = d.getMonth() === calMonth;
    const isWeekend = (d.getDay() === 0 || d.getDay() === 6);

    const cell = document.createElement('div');
    cell.className = 'cal-cell'
      + (inMonth ? '' : ' cal-cell-out')
      + (key === todayKey ? ' cal-cell-today' : '')
      + (isWeekend ? ' cal-cell-weekend' : '');
    cell.onclick = (e) => { if (e.target === cell || e.target.classList.contains('cal-cell-events')) openEventModal(null, key); };

    const events = (dayMap[key] || []);
    const evHtml = events.map(ev => {
      const t = ev.allDay ? '' : (ev.time ? `<span class="cal-ev-time">${escHtml(ev.time)}</span> ` : '');
      const who = ev.person ? ` · ${escHtml(ev.person)}` : '';
      return `<div class="cal-ev" style="--ev-color:${escHtml(ev.color || '#00d4ff')}" data-id="${ev._id}" title="${escHtml(ev.title)}${who}">${t}${escHtml(ev.title)}${who}</div>`;
    }).join('');

    cell.innerHTML = `
      <div class="cal-cell-num">${d.getDate()}</div>
      <div class="cal-cell-events">${evHtml}</div>`;
    grid.appendChild(cell);
  }

  // Attach click handlers to events (edit)
  grid.querySelectorAll('.cal-ev').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const ev = calEvents.find(x => x._id === el.dataset.id);
      if (ev) openEventModal(ev);
    };
  });
}

function exportCalendarExcel() {
  window.location.href = '/api/calendar/export.xlsx';
}

function calPrevMonth() {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
  loadCalendar();
}
function calNextMonth() {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
  loadCalendar();
}
function calGoToday() {
  const now = new Date();
  calYear = now.getFullYear(); calMonth = now.getMonth();
  loadCalendar();
}

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
  document.getElementById('evType').value    = isEdit ? (event.type || 'event') : 'event';
  document.getElementById('evColor').value   = isEdit ? (event.color || '#00d4ff') : '#00d4ff';
  document.getElementById('evNote').value    = isEdit ? (event.note || '') : '';
  document.getElementById('evDeleteBtn').style.display = isEdit ? '' : 'none';
  toggleEventTime();
  document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() {
  document.getElementById('eventModal').classList.add('hidden');
}

function toggleEventTime() {
  const allDay = document.getElementById('evAllDay').checked;
  document.getElementById('evTimeWrap').style.display = allDay ? 'none' : '';
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
    type:    document.getElementById('evType').value,
    color:   document.getElementById('evColor').value,
    note:    document.getElementById('evNote').value.trim()
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
  if (!confirm('Naozaj odstrániť túto udalosť?')) return;
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
  if (!confirm('Naozaj odstrániť tento postup?')) return;
  try {
    await fetch('/api/procedures/' + id, { method: 'DELETE' });
    closeProcedureModal();
    loadProcedures();
  } catch { alert('Chyba pri odstraňovaní'); }
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
  if (!confirm('Toto VYMAŽE všetky existujúce linky a nahradí ich predvolenými (DBFOS, ISYS, PEAKLOGGER, Dochádzka, Obedy, Obedy Fantozzi, SharePoint linky). Pokračovať?')) return;
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
  if (!confirm('Naozaj odstrániť tento link?')) return;
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
  if (!confirm('Naozaj vymazať celú históriu senzorov? Táto akcia je nevratná.')) return;
  try {
    const r = await fetch('/api/admin/sensor/history', { method: 'DELETE' });
    const d = await r.json();
    alert(`Vymazaných ${d.deleted} záznamov.`);
    loadSensorStats();
  } catch { alert('Chyba pri mazaní histórie'); }
}

async function seedSampleData() {
  if (!confirm('Vložiť ukážkové dáta (Novinky, WIKI, Postupy)? Existujúce záznamy sa preskočia.')) return;
  const el = document.getElementById('seedResult');
  if (el) el.textContent = 'Vkladám…';
  try {
    const r = await fetch('/api/admin/seed-samples', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { if (el) el.textContent = 'Chyba: ' + (d.error || r.status); return; }
    if (el) el.innerHTML = `✓ Vložené — Novinky: <strong>${d.announcements}</strong>, kategórie: <strong>${d.categories}</strong>, WIKI: <strong>${d.products}</strong>, Postupy: <strong>${d.procedures}</strong>, Projekty: <strong>${d.projects ?? 0}</strong>, Kalibrácie: <strong>${d.instruments ?? 0}</strong>, Testy: <strong>${d.tests ?? 0}</strong>, Prototypy: <strong>${d.prototypes ?? 0}</strong>.`;
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdPalette(); }
  if (e.key === 'Escape') { closeCmdPalette(); closeHdrPopovers(); }
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
}

const PJ_PHASES = [
  { key: 'koncept', label: 'Koncept' }, { key: 'prototyp', label: 'Prototyp' },
  { key: 'testovanie', label: 'Testovanie' }, { key: 'vyroba', label: 'Výroba' }, { key: 'ukoncene', label: 'Ukončené' }
];
const PJ_PRIO = { low: { l: 'Nízka', c: '#64748b' }, normal: { l: 'Normálna', c: '#3b82f6' }, high: { l: 'Vysoká', c: '#ef4444' } };
let projectsData = [];

async function loadProjects() {
  try { projectsData = await fetch('/api/projects').then(r => r.json()); if (!Array.isArray(projectsData)) projectsData = []; }
  catch { projectsData = []; }
  renderProjects();
}
function renderProjects() {
  const board = document.getElementById('projectsBoard'); if (!board) return;
  const q = (document.getElementById('projSearch')?.value || '').toLowerCase();
  const items = projectsData.filter(p => !q || (p.title || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q));
  board.innerHTML = '';
  PJ_PHASES.forEach((ph, idx) => {
    const col = document.createElement('div');
    col.className = 'kanban-col';
    const colItems = items.filter(p => (p.phase || 'koncept') === ph.key);
    col.innerHTML = `<div class="kanban-col-hdr">${ph.label} <span class="kanban-count">${colItems.length}</span></div>`;
    const body = document.createElement('div'); body.className = 'kanban-col-body';
    colItems.forEach(p => {
      const prio = PJ_PRIO[p.priority] || PJ_PRIO.normal;
      const dl = p.deadline ? new Date(p.deadline) : null;
      const overdue = dl && dl < new Date() && ph.key !== 'ukoncene';
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.style.setProperty('--prio', prio.c);
      card.innerHTML = `
        <div class="kanban-card-top" onclick="openProjectModal(projectsData.find(x=>x._id==='${p._id}'))">
          <span class="kanban-card-title">${escHtml(p.title)}</span>
          ${p.code ? `<span class="kanban-card-code">${escHtml(p.code)}</span>` : ''}
        </div>
        <div class="kanban-card-meta">
          ${p.owner ? `<span>👤 ${escHtml(p.owner)}</span>` : ''}
          ${dl ? `<span class="${overdue ? 'kanban-overdue' : ''}">📅 ${fmtDate(p.deadline)}</span>` : ''}
          <span class="kanban-prio" title="Priorita">${prio.l}</span>
        </div>
        <div class="kanban-card-actions">
          ${idx > 0 ? `<button onclick="moveProjectPhase('${p._id}',-1)" title="Späť">←</button>` : '<span></span>'}
          ${p.folder ? `<button onclick="openFolderLink('${encodeURIComponent(p.folder)}')" title="Priečinok">📁</button>` : ''}
          ${idx < PJ_PHASES.length - 1 ? `<button onclick="moveProjectPhase('${p._id}',1)" title="Ďalej">→</button>` : '<span></span>'}
        </div>`;
      body.appendChild(card);
    });
    col.appendChild(body);
    board.appendChild(col);
  });
}
function openFolderLink(enc) {
  const v = decodeURIComponent(enc);
  const href = isFilePath(v) ? toFileHref(v) : v;
  window.open(href, '_blank');
}
async function moveProjectPhase(id, dir) {
  const p = projectsData.find(x => x._id === id); if (!p) return;
  const i = PJ_PHASES.findIndex(x => x.key === (p.phase || 'koncept'));
  const ni = i + dir; if (ni < 0 || ni >= PJ_PHASES.length) return;
  try {
    await fetch('/api/projects/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase: PJ_PHASES[ni].key }) });
    loadProjects();
  } catch { alert('Chyba pri presune'); }
}
function openProjectModal(p = null) {
  const e = p && typeof p === 'object';
  document.getElementById('pjModalTitle').textContent = e ? 'Upraviť projekt' : 'Nový projekt';
  document.getElementById('pjId').value = e ? p._id : '';
  document.getElementById('pjTitle').value = e ? (p.title || '') : '';
  document.getElementById('pjCode').value = e ? (p.code || '') : '';
  document.getElementById('pjPhase').value = e ? (p.phase || 'koncept') : 'koncept';
  document.getElementById('pjPriority').value = e ? (p.priority || 'normal') : 'normal';
  document.getElementById('pjOwner').value = e ? (p.owner || '') : '';
  document.getElementById('pjDeadline').value = e && p.deadline ? String(p.deadline).slice(0, 10) : '';
  document.getElementById('pjFolder').value = e ? (p.folder || '') : '';
  document.getElementById('pjTags').value = e ? (p.tags || []).join(', ') : '';
  document.getElementById('pjNotes').value = e ? (p.notes || '') : '';
  document.getElementById('pjDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('projectModal').classList.remove('hidden');
}
function closeProjectModal() { document.getElementById('projectModal').classList.add('hidden'); }
async function saveProject() {
  const title = document.getElementById('pjTitle').value.trim();
  if (!title) { alert('Zadajte názov projektu'); return; }
  const body = {
    title, code: document.getElementById('pjCode').value.trim(),
    phase: document.getElementById('pjPhase').value, priority: document.getElementById('pjPriority').value,
    owner: document.getElementById('pjOwner').value.trim(),
    deadline: document.getElementById('pjDeadline').value || null,
    folder: document.getElementById('pjFolder').value.trim(),
    tags: document.getElementById('pjTags').value.split(',').map(s => s.trim()).filter(Boolean),
    notes: document.getElementById('pjNotes').value.trim()
  };
  const id = document.getElementById('pjId').value;
  try {
    const resp = await fetch(id ? '/api/projects/' + id : '/api/projects', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); alert('Chyba: ' + (er.error || resp.status)); return; }
    closeProjectModal(); loadProjects();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteProject(id) {
  if (!id || !confirm('Naozaj odstrániť projekt?')) return;
  try { await fetch('/api/projects/' + id, { method: 'DELETE' }); closeProjectModal(); loadProjects(); } catch { alert('Chyba'); }
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
  if (!id || !confirm('Naozaj odstrániť protokol?')) return;
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
  if (!id || !confirm('Naozaj odstrániť prístroj?')) return;
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
  if (!id || !confirm('Naozaj odstrániť prototyp?')) return;
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
const TK_PRIO = { low: { l: 'Nízka', c: '#64748b' }, normal: { l: 'Normálna', c: '#3b82f6' }, high: { l: 'Vysoká', c: '#ef4444' } };

async function loadTasks() {
  const sub = document.getElementById('tasksSub');
  if (sub && CURRENT_USER) sub.textContent = 'Osobný zoznam úloh — ' + (CURRENT_USER.name || CURRENT_USER.username);
  try { tasksData = await fetch('/api/tasks').then(r => r.json()); if (!Array.isArray(tasksData)) tasksData = []; }
  catch { tasksData = []; }
  renderTasks();
}
function setTaskFilter(f) {
  taskFilter = f;
  document.querySelectorAll('.tasks-filter').forEach(b => b.classList.toggle('active', b.dataset.tfilter === f));
  renderTasks();
}
function taskOverdue(t) { return !t.done && t.due && new Date(t.due) < new Date(new Date().toDateString()); }
function renderTasks() {
  const el = document.getElementById('tasksList'); if (!el) return;
  let items = tasksData.slice();
  if (taskFilter === 'open') items = items.filter(t => !t.done);
  else if (taskFilter === 'done') items = items.filter(t => t.done);
  if (!items.length) { el.innerHTML = '<div class="proc-empty">Žiadne úlohy v tomto filtri.</div>'; return; }
  el.innerHTML = '';
  items.forEach(t => {
    const prio = TK_PRIO[t.priority] || TK_PRIO.normal;
    const od = taskOverdue(t);
    const row = document.createElement('div');
    row.className = 'task-row' + (t.done ? ' task-done' : '') + (od ? ' task-overdue' : '');
    row.style.setProperty('--prio', prio.c);
    row.innerHTML = `
      <button class="task-check" onclick="toggleTask('${t._id}', ${t.done ? 'false' : 'true'})" title="${t.done ? 'Označiť ako nehotové' : 'Označiť ako hotové'}">${t.done ? '✓' : ''}</button>
      <div class="task-body" onclick="openTaskModal(tasksData.find(x=>x._id==='${t._id}'))">
        <div class="task-title">${escHtml(t.title)}</div>
        <div class="task-meta">
          <span class="task-prio">${prio.l}</span>
          ${t.due ? `<span class="${od ? 'task-od' : ''}">📅 ${fmtDate(t.due)}${od ? ' — po termíne' : ''}</span>` : ''}
          ${t.description ? `<span class="task-desc">${escHtml(t.description)}</span>` : ''}
        </div>
      </div>
      <button class="admin-icon-btn danger" onclick="deleteTask('${t._id}')" title="Odstrániť">✕</button>`;
    el.appendChild(row);
  });
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
  document.getElementById('tkDue').value = e && t.due ? String(t.due).slice(0, 10) : '';
  document.getElementById('tkPriority').value = e ? (t.priority || 'normal') : 'normal';
  document.getElementById('tkDesc').value = e ? (t.description || '') : '';
  document.getElementById('tkDeleteBtn').style.display = e ? '' : 'none';
  document.getElementById('taskModal').classList.remove('hidden');
}
function closeTaskModal() { document.getElementById('taskModal').classList.add('hidden'); }
async function saveTask() {
  const title = document.getElementById('tkTitle').value.trim();
  if (!title) { alert('Zadajte názov úlohy'); return; }
  const body = {
    title, due: document.getElementById('tkDue').value || null,
    priority: document.getElementById('tkPriority').value,
    description: document.getElementById('tkDesc').value.trim()
  };
  const id = document.getElementById('tkId').value;
  try {
    const resp = await fetch(id ? '/api/tasks/' + id : '/api/tasks', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const er = await resp.json().catch(() => ({})); alert('Chyba: ' + (er.error || resp.status)); return; }
    closeTaskModal(); loadTasks(); loadNotif();
  } catch (e) { alert('Sieťová chyba: ' + e.message); }
}
async function deleteTask(id) {
  if (!id || !confirm('Naozaj odstrániť úlohu?')) return;
  try { await fetch('/api/tasks/' + id, { method: 'DELETE' }); closeTaskModal(); loadTasks(); loadNotif(); }
  catch { alert('Chyba'); }
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
  if (!id || !confirm('Naozaj odstrániť používateľa?')) return;
  try {
    const r = await fetch('/api/users/' + id, { method: 'DELETE' });
    if (!r.ok) { const er = await r.json().catch(() => ({})); alert('Chyba: ' + (er.error || r.status)); return; }
    closeUserModal(); loadUsers();
  } catch { alert('Chyba'); }
}

// Štart: over prihlásenie, potom spusti appku
bootstrap();
