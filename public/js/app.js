/* ===== SYLEX FOS Dashboard — App Logic ===== */

// ---- PEAKLOGGER CREDENTIALS ----
let plCredsLoaded = false;
let plCredsData = { user: '', pass: '' };
let plVisible = false;

async function loadPeakloggerCreds() {
  if (plCredsLoaded) return;
  try {
    const r = await fetch('/api/credentials/peaklogger');
    plCredsData = await r.json();
    plCredsLoaded = true;
  } catch { plCredsData = { user: '—', pass: '—' }; }
}

function openPeaklogger(e) {
  window.open('https://mukovnik.xyz/', '_blank');
}

async function togglePeakloggerCreds(e) {
  e.stopPropagation();
  await loadPeakloggerCreds();
  plVisible = !plVisible;
  document.getElementById('plUser').textContent = plVisible ? plCredsData.user : '••••••';
  document.getElementById('plPass').textContent = plVisible ? plCredsData.pass : '••••••••••••';
  document.getElementById('plToggle').textContent = plVisible ? '🙈 Skryť' : '👁 Zobraziť';
}

// ---- THERMOMETER SENSOR ----
function openThermo() {
  window.open('http://10.88.1.50/', '_blank');
}

async function loadThermoData() {
  const valEl = document.getElementById('thermoValue');
  const statusEl = document.getElementById('thermoStatus');
  if (!valEl) return;
  try {
    const r = await fetch('/api/sensor/thermo');
    const data = await r.json();
    if (data.online && data.temperature !== null) {
      valEl.textContent = data.temperature.toFixed(1);
      if (statusEl) { statusEl.textContent = 'ONLINE'; statusEl.className = 'thermo-status thermo-online'; }
    } else if (data.online) {
      valEl.textContent = '--.-';
      if (statusEl) { statusEl.textContent = 'ONLINE'; statusEl.className = 'thermo-status thermo-online'; }
    } else {
      valEl.textContent = '--.-';
      if (statusEl) { statusEl.textContent = 'OFFLINE'; statusEl.className = 'thermo-status thermo-offline'; }
    }
  } catch {
    if (statusEl) { statusEl.textContent = 'OFFLINE'; statusEl.className = 'thermo-status thermo-offline'; }
  }
}

loadThermoData();
setInterval(loadThermoData, 30000);


const API = '';

// ---- State ----
let currentPage = 'home';
let products = [];
let categories = [];
let currentProductId = null;
let currentProduct = null;
let editingProductId = null;
let quill = null;
let pendingImages = [];
let currentCategoryId = null;

// ---- PARTICLES ----
(function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (8 + Math.random() * 16) + 's';
    p.style.animationDelay = (Math.random() * 12) + 's';
    p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
    p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
    p.style.opacity = 0.2 + Math.random() * 0.5;
    container.appendChild(p);
  }
})();

// ---- PAGE ROUTING ----
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === name);
  });
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  currentPage = name;
  if (name === 'wiki') loadWiki();
}

// ---- WIKI LOAD ----
async function loadWiki() {
  await Promise.all([loadCategories(), loadProducts()]);
  renderSidebar();
  renderWikiHome();
}

async function loadCategories() {
  try {
    const r = await fetch('/api/categories');
    categories = await r.json();
  } catch { categories = []; }
}

async function loadProducts() {
  try {
    const r = await fetch('/api/products');
    products = await r.json();
  } catch { products = []; }
}

// ---- WIKI HOME ----
function showWikiHome() {
  currentProductId = null;
  currentCategoryId = null;
  document.getElementById('wikiWelcome').classList.remove('hidden');
  document.getElementById('productDetail').classList.add('hidden');
  document.getElementById('categoryView').classList.add('hidden');
  document.querySelectorAll('.product-item').forEach(i => i.classList.remove('active'));
  const homeBtn = document.getElementById('swnHome');
  if (homeBtn) homeBtn.classList.add('active');
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
    if (cid) { grouped[cid] = (grouped[cid] || 0) + 1; }
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
    if (cat.color) card.style.borderColor = cat.color + '55';
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
    card.innerHTML = `
      <div class="wh-cat-icon-wrap">📄</div>
      <div class="wh-cat-name">Nezaradené</div>
      <div class="wh-cat-count">${uncatCount} ${pluralSk(uncatCount)}</div>`;
    card.onclick = () => showCategoryView(null);
    el.appendChild(card);
  }

  const addCard = document.createElement('div');
  addCard.className = 'wh-cat-card wh-cat-add';
  addCard.innerHTML = `<div class="wh-cat-icon-wrap" style="font-size:1.4rem;color:var(--text-dim)">+</div><div class="wh-cat-name" style="color:var(--text-dim)">Nová kategória</div>`;
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
    const icon = catObj?.icon || '📄';
    const catName = catObj?.name || (p.category ? '' : '');
    const card = document.createElement('div');
    card.className = 'wh-article-card';
    card.innerHTML = `
      <div class="wh-article-cat-icon">${icon}</div>
      <div class="wh-article-body">
        <div class="wh-article-title">${escHtml(p.name)}</div>
        ${p.description ? `<div class="wh-article-desc">${escHtml(p.description)}</div>` : ''}
        <div class="wh-article-meta">
          ${catName ? `<span class="wh-article-badge">${escHtml(catName)}</span>` : ''}
          <span class="wh-article-date">Upravené: ${fmtDate(p.updatedAt)}</span>
          <span class="wh-article-badge status-${p.status}" style="background:none;border:none;padding:0;font-size:0.65rem;letter-spacing:0.05em">${statusLabel(p.status)}</span>
        </div>
      </div>
      <div class="wh-article-arrow">›</div>`;
    card.onclick = () => openProduct(p._id);
    el.appendChild(card);
  });
}

// ---- CATEGORY VIEW ----
function showCategoryView(catId) {
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

  document.getElementById('cvName').textContent = cat ? cat.name : 'Nezaradené';
  document.getElementById('cvIcon').textContent = cat ? (cat.icon || '📁') : '📄';
  document.getElementById('cvTitle').textContent = cat ? cat.name : 'Nezaradené';
  document.getElementById('cvCount').textContent = `${prods.length} ${pluralSk(prods.length)}`;

  const listEl = document.getElementById('cvArticles');
  listEl.innerHTML = '';

  if (prods.length === 0) {
    listEl.innerHTML = '<div class="wh-empty">Táto kategória je prázdna.<div class="wh-empty-actions"><button class="btn-primary" onclick="openProductModal()">+ Pridať záznam</button></div></div>';
    return;
  }

  prods.forEach(p => {
    const card = document.createElement('div');
    card.className = 'wh-article-card';
    card.innerHTML = `
      <div class="wh-article-cat-icon">${cat?.icon || '📄'}</div>
      <div class="wh-article-body">
        <div class="wh-article-title">${escHtml(p.name)}</div>
        ${p.description ? `<div class="wh-article-desc">${escHtml(p.description)}</div>` : ''}
        <div class="wh-article-meta">
          <span class="wh-article-date">Upravené: ${fmtDate(p.updatedAt)}</span>
          ${p.model ? `<span class="wh-article-date">${escHtml(p.model)}</span>` : ''}
        </div>
      </div>
      <div class="wh-article-arrow">›</div>`;
    card.onclick = () => openProduct(p._id);
    listEl.appendChild(card);
  });
}

// ---- SIDEBAR ----
function renderSidebar() {
  const catContainer = document.getElementById('sidebarCategories');
  const prodContainer = document.getElementById('sidebarProducts');

  const grouped = {};
  const uncategorized = [];

  products.forEach(p => {
    if (p.category && p.category._id) {
      const cid = p.category._id;
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(p);
    } else {
      uncategorized.push(p);
    }
  });

  catContainer.innerHTML = '';
  prodContainer.innerHTML = '';

  categories.forEach(cat => {
    const prods = grouped[cat._id] || [];
    if (prods.length === 0) return;
    const group = document.createElement('div');
    group.className = 'category-group';
    group.innerHTML = `<div class="category-label" onclick="showCategoryView('${cat._id}')" style="cursor:pointer">
      <span class="cat-icon">${cat.icon || '📁'}</span>
      <span>${escHtml(cat.name)}</span>
      <span class="cat-count">${prods.length}</span>
    </div>`;
    prods.forEach(p => group.appendChild(makeProductItem(p)));
    catContainer.appendChild(group);
  });

  uncategorized.forEach(p => prodContainer.appendChild(makeProductItem(p)));

  if (products.length === 0) {
    prodContainer.innerHTML = '<div class="empty-state">Žiadne záznamy. Vytvorte prvý.</div>';
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

// ---- SEARCH ----
function filterProducts() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const items = document.querySelectorAll('.product-item');
  items.forEach(item => {
    const p = products.find(x => x._id === item.dataset.id);
    if (!p) return;
    const match = !q || p.name.toLowerCase().includes(q) ||
      (p.model || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q));
    item.style.display = match ? '' : 'none';
  });
}

function liveSearch(q) {
  document.getElementById('searchInput').value = q;
  if (q.trim()) {
    filterProducts();
    showSearchResults(q.trim().toLowerCase());
  } else {
    showWikiHome();
  }
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

  const cats = document.getElementById('whCats');
  if (cats) cats.closest('.wh-section').style.display = 'none';

  const recentEl = document.getElementById('whRecent');
  const sectionHead = recentEl?.closest('.wh-section')?.querySelector('.wh-section-head h2');
  if (sectionHead) sectionHead.textContent = `Výsledky hľadania "${q}" (${matched.length})`;

  if (recentEl) {
    recentEl.innerHTML = '';
    if (matched.length === 0) {
      recentEl.innerHTML = `<div class="wh-empty">Žiadne výsledky pre "<strong>${escHtml(q)}</strong>".</div>`;
      return;
    }
    matched.forEach(p => {
      const catObj = categories.find(c => c._id === (p.category?._id || p.category));
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
            <span class="wh-article-date">Upravené: ${fmtDate(p.updatedAt)}</span>
          </div>
        </div>
        <div class="wh-article-arrow">›</div>`;
      card.onclick = () => openProduct(p._id);
      recentEl.appendChild(card);
    });
  }
}

// Restore wiki home sections after search clears
function restoreWikiSections() {
  const cats = document.getElementById('whCats');
  if (cats) {
    const section = cats.closest('.wh-section');
    if (section) section.style.display = '';
  }
  const sectionHead = document.getElementById('whRecent')?.closest('.wh-section')?.querySelector('.wh-section-head h2');
  if (sectionHead) sectionHead.textContent = 'Nedávno upravené';
}

// ---- PRODUCT DETAIL ----
async function openProduct(id) {
  currentProductId = id;
  document.querySelectorAll('.product-item').forEach(i => {
    i.classList.toggle('active', i.dataset.id === id);
  });
  const homeBtn = document.getElementById('swnHome');
  if (homeBtn) homeBtn.classList.remove('active');

  try {
    const r = await fetch(`/api/products/${id}`);
    const p = await r.json();
    currentProduct = p;
    renderProductDetail(p);
  } catch {
    alert('Chyba pri načítaní záznamu');
  }
}

function renderProductDetail(p) {
  document.getElementById('wikiWelcome').classList.add('hidden');
  document.getElementById('categoryView').classList.add('hidden');
  document.getElementById('productDetail').classList.remove('hidden');

  // Breadcrumb
  const bcCat = document.getElementById('bcCategory');
  const bcSep = document.getElementById('bcCatSepEl');
  const bcCur = document.getElementById('bcCurrent');
  if (p.category) {
    const catObj = categories.find(c => c._id === (p.category._id || p.category));
    bcCat.textContent = catObj ? catObj.name : (p.category.name || '');
    bcCat.dataset.catId = p.category._id || p.category;
    if (bcSep) bcSep.style.display = '';
    bcCat.style.display = '';
  } else {
    if (bcSep) bcSep.style.display = 'none';
    bcCat.style.display = 'none';
  }
  if (bcCur) bcCur.textContent = p.name;

  // Meta
  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailDesc').textContent = p.description || '';

  const catBadge = document.getElementById('detailCategory');
  catBadge.textContent = p.category ? (p.category.name || '') : '';
  catBadge.style.display = p.category ? '' : 'none';

  const statusBadge = document.getElementById('detailStatus');
  statusBadge.textContent = statusLabel(p.status);
  statusBadge.className = 'product-status-badge status-' + p.status;

  const infoEl = document.getElementById('detailModel');
  infoEl.textContent = [p.model && `Model: ${p.model}`, p.version && `Verzia: ${p.version}`].filter(Boolean).join('  ·  ');

  const upd = document.getElementById('detailUpdated');
  upd.textContent = 'Upravené: ' + fmtDate(p.updatedAt);

  const contentEl = document.getElementById('detailContent');
  contentEl.innerHTML = p.content || '';

  // Images
  const imgEl = document.getElementById('detailImages');
  imgEl.innerHTML = '';
  (p.images || []).forEach(img => {
    const card = document.createElement('div');
    card.className = 'product-image-card';
    card.innerHTML = `<img src="${img.url}" alt="${escHtml(img.caption || '')}">
      ${img.caption ? `<div class="product-image-caption">${escHtml(img.caption)}</div>` : ''}`;
    imgEl.appendChild(card);
  });

  // Tags
  const tagsEl = document.getElementById('detailVersion');
  if (p.tags && p.tags.length) {
    tagsEl.textContent = 'Tagy: ' + p.tags.join(', ');
  } else {
    tagsEl.textContent = '';
  }

  buildToc(contentEl);
}

function bcGoCategory() {
  const catId = document.getElementById('bcCategory')?.dataset.catId;
  if (catId) showCategoryView(catId);
  else showWikiHome();
}

// ---- TABLE OF CONTENTS ----
function buildToc(contentEl) {
  const tocNav = document.getElementById('tocNav');
  const tocSidebar = document.getElementById('wikiTocSidebar');
  if (!tocNav || !tocSidebar) return;

  const headings = contentEl.querySelectorAll('h2, h3');
  if (headings.length < 2) {
    tocSidebar.style.display = 'none';
    return;
  }

  tocSidebar.style.display = '';
  tocNav.innerHTML = '';

  headings.forEach((h, i) => {
    const id = 'toc-h-' + i;
    h.id = id;
    const btn = document.createElement('button');
    btn.className = 'toc-item' + (h.tagName === 'H3' ? ' toc-h3' : '');
    btn.textContent = h.textContent;
    btn.onclick = () => {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      tocNav.querySelectorAll('.toc-item').forEach(b => b.classList.remove('toc-active'));
      btn.classList.add('toc-active');
    };
    tocNav.appendChild(btn);
  });
}

// ---- EDIT / DELETE ----
function editCurrentProduct() {
  if (currentProduct) openProductModal(currentProduct);
}

async function deleteCurrentProduct() {
  if (!currentProductId) return;
  if (!confirm('Naozaj chcete odstrániť tento záznam?')) return;
  try {
    await fetch(`/api/products/${currentProductId}`, { method: 'DELETE' });
    currentProductId = null;
    currentProduct = null;
    await loadProducts();
    renderSidebar();
    showWikiHome();
  } catch { alert('Chyba pri odstraňovaní'); }
}

// ---- PRODUCT MODAL ----
function openProductModal(product = null) {
  editingProductId = product ? product._id : null;
  pendingImages = product ? [...(product.images || [])] : [];

  document.getElementById('modalTitle').textContent = product ? 'Upraviť záznam' : 'Nový záznam';
  document.getElementById('fName').value = product?.name || '';
  document.getElementById('fModel').value = product?.model || '';
  document.getElementById('fVersion').value = product?.version || '';
  document.getElementById('fDesc').value = product?.description || '';
  document.getElementById('fTags').value = (product?.tags || []).join(', ');

  const statusVal = product?.status || 'active';
  document.querySelector(`input[name="fStatus"][value="${statusVal}"]`).checked = true;

  const catSel = document.getElementById('fCategory');
  catSel.innerHTML = '<option value="">-- bez kategórie --</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c._id;
    opt.textContent = `${c.icon || ''} ${c.name}`;
    if (product?.category && (product.category._id === c._id || product.category === c._id)) opt.selected = true;
    catSel.appendChild(opt);
  });

  quill = null;
  document.getElementById('quillEditor').innerHTML = '';
  quill = new Quill('#quillEditor', {
    theme: 'snow',
    placeholder: 'Konfigurácia, nastavenia, poznámky...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        ['blockquote', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean']
      ]
    }
  });
  if (product?.content) {
    quill.clipboard.dangerouslyPasteHTML(product.content);
  }

  const toolbar = quill.getModule('toolbar');
  toolbar.addHandler('image', quillImageHandler);

  renderImagePreviews();
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  editingProductId = null;
  pendingImages = [];
  quill = null;
}

// ---- QUILL IMAGE HANDLER ----
function quillImageHandler() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'image', url);
    }
  };
  input.click();
}

// ---- IMAGE UPLOAD ----
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  try {
    const r = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await r.json();
    return data.url;
  } catch { alert('Chyba pri nahrávaní obrázka'); return null; }
}

async function handleImageUpload(input) {
  for (const file of input.files) {
    const url = await uploadImage(file);
    if (url) pendingImages.push({ url, caption: '' });
  }
  renderImagePreviews();
  input.value = '';
}

function renderImagePreviews() {
  const list = document.getElementById('imagePreviewList');
  list.innerHTML = '';
  pendingImages.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.innerHTML = `
      <img src="${img.url}" alt="">
      <button class="image-preview-remove" onclick="removeImage(${i})">✕</button>`;
    list.appendChild(item);
  });
}

function removeImage(index) {
  pendingImages.splice(index, 1);
  renderImagePreviews();
}

// ---- SAVE PRODUCT ----
async function saveProduct() {
  const name = document.getElementById('fName').value.trim();
  if (!name) { alert('Zadajte názov záznamu'); return; }

  const tags = document.getElementById('fTags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  const body = {
    name,
    model: document.getElementById('fModel').value.trim(),
    version: document.getElementById('fVersion').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    category: document.getElementById('fCategory').value || null,
    status: document.querySelector('input[name="fStatus"]:checked').value,
    content: quill ? quill.root.innerHTML : '',
    images: pendingImages,
    tags
  };

  try {
    const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
    const method = editingProductId ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const saved = await r.json();
    closeProductModal();
    await loadProducts();
    renderSidebar();
    renderWikiHome();
    if (saved._id) openProduct(saved._id);
  } catch { alert('Chyba pri ukladaní'); }
}

// ---- CATEGORY MODAL ----
function openCategoryModal() {
  document.getElementById('cName').value = '';
  document.getElementById('cIcon').value = '📡';
  document.getElementById('cColor').value = '#00d4ff';
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
        icon: document.getElementById('cIcon').value || '📁',
        color: document.getElementById('cColor').value
      })
    });
    const cat = await r.json();
    categories.push(cat);
    const sel = document.getElementById('fCategory');
    const opt = document.createElement('option');
    opt.value = cat._id; opt.textContent = `${cat.icon} ${cat.name}`; opt.selected = true;
    sel.appendChild(opt);
    closeCategoryModal();
    renderWikiCategories();
  } catch { alert('Chyba pri ukladaní kategórie'); }
}

// ---- HELPERS ----
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('sk-SK');
}

function pluralSk(n) {
  if (n === 1) return 'záznam';
  if (n >= 2 && n <= 4) return 'záznamy';
  return 'záznamov';
}

function statusLabel(status) {
  return { active: 'Aktívny', development: 'Vývoj', discontinued: 'Ukončený' }[status] || '';
}
