// =============================================
// App principal V1NITO
// =============================================

const cart = new Cart();
let allWines = [];
let activeFilter = 'Todos';

// ---- DOM refs ----
const winesGrid = document.getElementById('winesGrid');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const filtersContainer = document.getElementById('filters');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartFooter = document.getElementById('cartFooter');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadWines();
  setupCartUI();
  updateCartBadge();
});

// ---- Cargar vinos desde Sheets ----
async function loadWines() {
  loading.style.display = 'block';
  errorMsg.style.display = 'none';
  winesGrid.innerHTML = '';

  try {
    allWines = await fetchWinesFromSheet();
    loading.style.display = 'none';
    buildFilters();
    renderWines();
  } catch (err) {
    console.error('Error cargando vinos:', err);
    loading.style.display = 'none';
    errorMsg.style.display = 'block';
  }
}

// ---- Filtros por categoria ----
function buildFilters() {
  const categories = ['Todos', ...new Set(allWines.map(w => w.categoria))];
  filtersContainer.innerHTML = '';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `filter-btn${cat === activeFilter ? ' active' : ''}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeFilter = cat;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderWines();
    });
    filtersContainer.appendChild(btn);
  });
}

// ---- Renderizar vinos ----
function renderWines() {
  const filtered = activeFilter === 'Todos'
    ? allWines
    : allWines.filter(w => w.categoria === activeFilter);

  winesGrid.innerHTML = filtered.map(wine => `
    <article class="wine-card${wine.tiene_stock ? '' : ' no-stock'}">
      <div class="wine-img-wrap">
        ${wine.photo_url
          ? `<img class="wine-img" src="${escapeAttr(wine.photo_url)}" alt="${escapeAttr(wine.nombre)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
          : ''}
        <div class="wine-img-placeholder" ${wine.photo_url ? 'style="display:none"' : ''}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C11.2 2 10.4 2.1 9.6 2.4L7.8 6.6C7.3 7.8 7 9.1 7 10.5C7 13.5 9.2 16 12 16S17 13.5 17 10.5C17 9.1 16.7 7.8 16.2 6.6L14.4 2.4C13.6 2.1 12.8 2 12 2ZM11 17.9V20H10C9.4 20 9 20.4 9 21S9.4 22 10 22H14C14.6 22 15 21.6 15 21S14.6 20 14 20H13V17.9C16.4 17.4 19 14.6 19 10.5C19 8.8 18.6 7.2 17.9 5.7L19.5 2.1C19.7 1.6 19.4 1 18.9 1H5.1C4.6 1 4.3 1.6 4.5 2.1L6.1 5.7C5.4 7.2 5 8.8 5 10.5C5 14.6 7.6 17.4 11 17.9Z"/>
          </svg>
        </div>
        <span class="wine-badge ${wine.tiene_stock ? 'badge-stock' : 'badge-nostock'}">
          ${wine.tiene_stock ? 'En stock' : 'Sin stock'}
        </span>
      </div>
      <div class="wine-info">
        <span class="wine-category">${escapeHTML(wine.categoria)}</span>
        <h3 class="wine-name">${escapeHTML(wine.nombre)}</h3>
        <p class="wine-desc">${escapeHTML(wine.descripcion)}</p>
        <div class="wine-bottom">
          <span class="wine-price">${CONFIG.CURRENCY}${wine.precio.toLocaleString('es-AR')}</span>
          <button
            class="add-btn"
            ${wine.tiene_stock ? '' : 'disabled'}
            onclick="addToCart(${wine.id})"
          >
            ${wine.tiene_stock ? 'Agregar' : 'Agotado'}
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// ---- Agregar al carrito ----
function addToCart(wineId) {
  const wine = allWines.find(w => w.id === wineId);
  if (!wine || !wine.tiene_stock) return;

  cart.add(wine);
  updateCartBadge();
  showToast(`${wine.nombre} agregado al carrito`);

  // Feedback visual en el boton
  const btns = document.querySelectorAll('.add-btn');
  btns.forEach(btn => {
    if (btn.getAttribute('onclick') === `addToCart(${wineId})`) {
      btn.classList.add('added');
      btn.textContent = 'Agregado';
      setTimeout(() => {
        btn.classList.remove('added');
        btn.textContent = 'Agregar';
      }, 1200);
    }
  });
}

// ---- Cart UI ----
function setupCartUI() {
  cartBtn.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  checkoutBtn.addEventListener('click', checkout);
}

function openCart() {
  renderCart();
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCart() {
  if (cart.items.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Tu carrito est\\u00e1 vac\\u00edo</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartFooter.style.display = 'block';
  cartTotal.textContent = `${CONFIG.CURRENCY}${cart.getTotal().toLocaleString('es-AR')}`;

  cartItems.innerHTML = cart.items.map(item => `
    <div class="cart-item">
      ${item.photo_url
        ? `<img class="cart-item-img" src="${escapeAttr(item.photo_url)}" alt="${escapeAttr(item.nombre)}">`
        : '<div class="cart-item-img"></div>'
      }
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHTML(item.nombre)}</div>
        <div class="cart-item-price">${CONFIG.CURRENCY}${(item.precio * item.qty).toLocaleString('es-AR')}</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
        <span>${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
      </div>
    </div>
  `).join('');
}

function changeQty(wineId, delta) {
  cart.updateQty(wineId, delta);
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const count = cart.getCount();
  cartCount.textContent = count;
  cartCount.classList.toggle('show', count > 0);
}

// ---- Checkout WhatsApp ----
function checkout() {
  const name = document.getElementById('clientName').value.trim();
  const address = document.getElementById('clientAddress').value.trim();

  if (!name) {
    showToast('Ingres\\u00e1 tu nombre');
    document.getElementById('clientName').focus();
    return;
  }

  if (!address) {
    showToast('Ingres\\u00e1 la direcci\\u00f3n de entrega');
    document.getElementById('clientAddress').focus();
    return;
  }

  const message = cart.buildWhatsAppMessage(name, address);
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encoded}`;

  window.open(url, '_blank');

  // Limpiar carrito despues de enviar
  cart.clear();
  updateCartBadge();
  closeCart();
  showToast('Pedido enviado por WhatsApp');
}

// ---- Toast ----
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// ---- Helpers seguridad ----
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
