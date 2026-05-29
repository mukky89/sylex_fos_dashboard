/* =============================================
   SYLEX FOS Dashboard — App Logic v2
   ============================================= */

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
  const tempEl   = document.getElementById('thermoValue');
  const humEl    = document.getElementById('humValue');
  const statusEl = document.getElementById('thermoStatus');
  if (!tempEl) return;
  try {
    const r    = await fetch('/api/sensor/thermo');
    const data = await r.json();
    if (data.online) {
      tempEl.textContent = data.temperature !== null ? data.temperature.toFixed(1) : '--.-';
      if (humEl) humEl.textContent = data.humidity !== null ? data.humidity.toFixed(1) : '--.-';
      if (statusEl) { statusEl.textContent = 'ONLINE'; statusEl.className = 'thermo-status thermo-online'; }
    } else {
      tempEl.textContent = '--.-';
      if (humEl) humEl.textContent = '--.-';
      if (statusEl) { statusEl.textContent = 'OFFLINE'; statusEl.className = 'thermo-status thermo-offline'; }
    }
  } catch {
    if (statusEl) { statusEl.textContent = 'OFFLINE'; statusEl.className = 'thermo-status thermo-offline'; }
  }
}
loadThermoData();
setInterval(loadThermoData, 30000);

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

// Auto-refresh every 60 s (matches server polling interval), only when home is active
setInterval(() => {
  if (document.getElementById('page-home')?.classList.contains('active')) loadSensorChart();
}, 60000);

// ==============================
// ROUTING / PAGES
// ==============================
function setHash(hash) { history.pushState(null, '', '#' + hash); }

window.addEventListener('popstate', () => handleHash(location.hash.slice(1)));

async function handleHash(hash) {
  if (!hash || hash === 'home') { _activatePage('home'); loadHomeKB(); return; }
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
  if (name === 'wiki') loadWiki();
  if (name === 'home') { loadHomeKB(); loadSensorChart(); }
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
async function loadHomeKB() {
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
// INIT
// ==============================
(function init() {
  const hash = location.hash.slice(1);
  if (hash) { handleHash(hash); }
  else { _activatePage('home'); loadHomeKB(); loadSensorChart(); }
})();
