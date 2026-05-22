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


const API = '';

// ---- State ----
let currentPage = 'home';
let products = [];
let categories = [];
let currentProductId = null;
let currentProduct = null; // full product object from API detail call
let editingProductId = null;
let quill = null;
let pendingImages = [];

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

// ---- SIDEBAR ----
function renderSidebar() {
  const catContainer = document.getElementById('sidebarCategories');
  const prodContainer = document.getElementById('sidebarProducts');

  // Group products by category
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

  // Render categories with products
  categories.forEach(cat => {
    const prods = grouped[cat._id] || [];
    if (prods.length === 0) return;
    const group = document.createElement('div');
    group.className = 'category-group';
    group.innerHTML = `<div class="category-label"><span class="cat-icon">${cat.icon || '📁'}</span>${cat.name}</div>`;
    prods.forEach(p => group.appendChild(makeProductItem(p)));
    catContainer.appendChild(group);
  });

  // Uncategorized
  uncategorized.forEach(p => prodContainer.appendChild(makeProductItem(p)));

  if (products.length === 0) {
    prodContainer.innerHTML = '<div class="empty-state">Žiadne produkty. Vytvorte prvý záznam.</div>';
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
      <div class="product-item-name">${product.name}</div>
      ${product.model ? `<div class="product-item-model">${product.model}</div>` : ''}
    </div>
  `;
  return item;
}

// ---- FILTER ----
function filterProducts() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const items = document.querySelectorAll('.product-item');
  items.forEach(item => {
    const id = item.dataset.id;
    const p = products.find(x => x._id === id);
    const match = !q || p.name.toLowerCase().includes(q) ||
      (p.model || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q));
    item.style.display = match ? '' : 'none';
  });
}

// ---- PRODUCT DETAIL ----
async function openProduct(id) {
  currentProductId = id;
  document.querySelectorAll('.product-item').forEach(i => {
    i.classList.toggle('active', i.dataset.id === id);
  });

  try {
    const r = await fetch(`/api/products/${id}`);
    const p = await r.json();
    currentProduct = p; // store full detail for editing
    renderProductDetail(p);
  } catch {
    alert('Chyba pri načítaní produktu');
  }
}

function renderProductDetail(p) {
  document.getElementById('wikiWelcome').classList.add('hidden');
  document.getElementById('productDetail').classList.remove('hidden');

  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailDesc').textContent = p.description || '';

  const catBadge = document.getElementById('detailCategory');
  catBadge.textContent = p.category ? p.category.name : '';
  catBadge.style.display = p.category ? '' : 'none';

  const statusBadge = document.getElementById('detailStatus');
  statusBadge.textContent = { active: 'Aktívny', development: 'Vývoj', discontinued: 'Ukončený' }[p.status] || '';
  statusBadge.className = 'product-status-badge status-' + p.status;

  const infoEl = document.getElementById('detailModel');
  infoEl.textContent = [p.model && `Model: ${p.model}`, p.version && `Verzia: ${p.version}`].filter(Boolean).join('  ·  ');

  const upd = document.getElementById('detailUpdated');
  upd.textContent = 'Upravené: ' + new Date(p.updatedAt).toLocaleDateString('sk-SK');

  document.getElementById('detailContent').innerHTML = p.content || '';

  // Images
  const imgEl = document.getElementById('detailImages');
  imgEl.innerHTML = '';
  (p.images || []).forEach(img => {
    const card = document.createElement('div');
    card.className = 'product-image-card';
    card.innerHTML = `<img src="${img.url}" alt="${img.caption || ''}">
      ${img.caption ? `<div class="product-image-caption">${img.caption}</div>` : ''}`;
    imgEl.appendChild(card);
  });

  // Tags
  const tagsEl = document.getElementById('detailVersion');
  if (p.tags && p.tags.length) {
    tagsEl.textContent = 'Tagy: ' + p.tags.join(', ');
  }
}

// ---- EDIT / DELETE ----
function editCurrentProduct() {
  if (currentProduct) openProductModal(currentProduct);
}

async function deleteCurrentProduct() {
  if (!currentProductId) return;
  if (!confirm('Naozaj chcete odstrániť tento produkt?')) return;
  try {
    await fetch(`/api/products/${currentProductId}`, { method: 'DELETE' });
    currentProductId = null;
    document.getElementById('wikiWelcome').classList.remove('hidden');
    document.getElementById('productDetail').classList.add('hidden');
    await loadProducts();
    renderSidebar();
  } catch { alert('Chyba pri odstraňovaní'); }
}

// ---- PRODUCT MODAL ----
function openProductModal(product = null) {
  editingProductId = product ? product._id : null;
  pendingImages = product ? [...(product.images || [])] : [];

  document.getElementById('modalTitle').textContent = product ? 'Upraviť produkt' : 'Nový produkt';
  document.getElementById('fName').value = product?.name || '';
  document.getElementById('fModel').value = product?.model || '';
  document.getElementById('fVersion').value = product?.version || '';
  document.getElementById('fDesc').value = product?.description || '';
  document.getElementById('fTags').value = (product?.tags || []).join(', ');

  const statusVal = product?.status || 'active';
  document.querySelector(`input[name="fStatus"][value="${statusVal}"]`).checked = true;

  // Populate category select
  const catSel = document.getElementById('fCategory');
  catSel.innerHTML = '<option value="">-- bez kategórie --</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c._id;
    opt.textContent = `${c.icon || ''} ${c.name}`;
    if (product?.category && (product.category._id === c._id || product.category === c._id)) opt.selected = true;
    catSel.appendChild(opt);
  });

  // Init Quill
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

  // Image overrides for Quill image handler
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
      <button class="image-preview-remove" onclick="removeImage(${i})">✕</button>
    `;
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
  if (!name) { alert('Zadajte názov produktu'); return; }

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
    // Refresh select
    const sel = document.getElementById('fCategory');
    const opt = document.createElement('option');
    opt.value = cat._id; opt.textContent = `${cat.icon} ${cat.name}`; opt.selected = true;
    sel.appendChild(opt);
    closeCategoryModal();
  } catch { alert('Chyba pri ukladaní kategórie'); }
}
