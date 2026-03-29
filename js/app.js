// =============================================
// App principal FF Motors
// =============================================

let allVehicles = [];
let activeType = 'Todos';
let activeBrand = 'Todas';
let searchTerm = '';
let sortOption = 'featured';
let currentVehicleId = null;
let currentPhotoIndex = 0;
let featuredVehicleId = null;

const vehiclesGrid = document.getElementById('vehiclesGrid');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const emptyState = document.getElementById('emptyState');
const retryBtn = document.getElementById('retryBtn');
const typeFiltersContainer = document.getElementById('typeFilters');
const brandFiltersContainer = document.getElementById('brandFilters');
const resultsSummary = document.getElementById('resultsSummary');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

const modalOverlay = document.getElementById('modalOverlay');
const vehicleModal = document.getElementById('vehicleModal');
const modalClose = document.getElementById('modalClose');
const modalMainMedia = document.getElementById('modalMainMedia');
const modalThumbs = document.getElementById('modalThumbs');
const modalType = document.getElementById('modalType');
const modalTitleText = document.getElementById('modalTitle');
const modalVersion = document.getElementById('modalVersion');
const modalPrice = document.getElementById('modalPrice');
const modalSpecGrid = document.getElementById('modalSpecGrid');
const modalWhatsappBtn = document.getElementById('modalWhatsappBtn');

const featuredTitle = document.getElementById('featuredTitle');
const featuredSpecs = document.getElementById('featuredSpecs');
const featuredPrice = document.getElementById('featuredPrice');
const featuredMedia = document.getElementById('featuredMedia');
const featuredActionBtn = document.getElementById('featuredActionBtn');
const heroCount = document.getElementById('heroCount');
const heroBrands = document.getElementById('heroBrands');
const heroAverageYear = document.getElementById('heroAverageYear');
const featuredHighlights = document.getElementById('featuredHighlights');
const headerWhatsappLink = document.getElementById('headerWhatsappLink');
const footerWhatsappLink = document.getElementById('footerWhatsappLink');

document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  syncContactLinks();
  loadVehicles();
});

function bindUI() {
  retryBtn.addEventListener('click', loadVehicles);
  searchInput.addEventListener('input', event => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderVehicles();
  });

  sortSelect.addEventListener('change', event => {
    sortOption = event.target.value;
    renderVehicles();
  });

  typeFiltersContainer.addEventListener('click', event => {
    const button = event.target.closest('[data-filter-value]');
    if (!button) return;
    activeType = button.dataset.filterValue;
    renderFilterButtons(typeFiltersContainer, getTypeOptions(), activeType);
    renderVehicles();
  });

  brandFiltersContainer.addEventListener('click', event => {
    const button = event.target.closest('[data-filter-value]');
    if (!button) return;
    activeBrand = button.dataset.filterValue;
    renderFilterButtons(brandFiltersContainer, getBrandOptions(), activeBrand);
    renderVehicles();
  });

  vehiclesGrid.addEventListener('click', handleVehicleGridClick);

  featuredActionBtn.addEventListener('click', () => {
    if (featuredVehicleId) {
      openVehicleModal(featuredVehicleId);
    }
  });

  modalClose.addEventListener('click', closeVehicleModal);
  modalOverlay.addEventListener('click', closeVehicleModal);
  modalThumbs.addEventListener('click', handleThumbClick);
  modalWhatsappBtn.addEventListener('click', sendCurrentVehicleInquiry);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeVehicleModal();
  });
}

async function loadVehicles() {
  allVehicles = [];
  loading.hidden = false;
  errorMsg.hidden = true;
  emptyState.hidden = true;
  vehiclesGrid.innerHTML = '';
  resultsSummary.textContent = 'Cargando stock...';

  try {
    allVehicles = await fetchVehiclesFromSheet();
    buildFilters();
    renderHeroMetrics();
    renderVehicles();
  } catch (error) {
    console.error('Error cargando autos:', error);
    buildFilters();
    renderHeroMetrics();
    loading.hidden = true;
    errorMsg.hidden = false;
    resultsSummary.textContent = 'No se pudo cargar el stock.';
  }
}

function buildFilters() {
  activeType = 'Todos';
  activeBrand = 'Todas';
  renderFilterButtons(typeFiltersContainer, getTypeOptions(), activeType);
  renderFilterButtons(brandFiltersContainer, getBrandOptions(), activeBrand);
}

function getTypeOptions() {
  return ['Todos', ...new Set(allVehicles.map(vehicle => vehicle.tipo).filter(Boolean))];
}

function getBrandOptions() {
  return ['Todas', ...new Set(allVehicles.map(vehicle => vehicle.marca).filter(Boolean))];
}

function renderFilterButtons(container, options, activeValue) {
  container.innerHTML = options.map(option => `
    <button
      type="button"
      class="filter-btn${option === activeValue ? ' active' : ''}"
      data-filter-value="${escapeAttr(option)}"
    >
      ${escapeHTML(option)}
    </button>
  `).join('');
}

function renderHeroMetrics() {
  const brandCount = new Set(allVehicles.map(vehicle => vehicle.marca)).size;
  const vehiclesWithYear = allVehicles.filter(vehicle => vehicle.year > 0);
  const averageYear = vehiclesWithYear.length
    ? Math.round(vehiclesWithYear.reduce((sum, vehicle) => sum + vehicle.year, 0) / vehiclesWithYear.length)
    : 0;

  heroCount.textContent = allVehicles.length.toString();
  heroBrands.textContent = brandCount.toString();
  heroAverageYear.textContent = averageYear || '--';

  const featured = getFeaturedVehicle();
  featuredVehicleId = featured ? featured.id : null;

  if (!featured) {
    featuredTitle.textContent = 'Sin unidades publicadas';
    featuredSpecs.textContent = 'Cuando cargues el Excel, la ficha destacada se muestra aca.';
    featuredPrice.textContent = '--';
    featuredMedia.innerHTML = getMainImageMarkup('', 'Sin unidades');
    featuredHighlights.innerHTML = '<span>Google Sheets</span><span>Catalogo visual</span><span>WhatsApp</span>';
    featuredActionBtn.textContent = 'Sin stock';
    return;
  }

  featuredTitle.textContent = vehicleHeading(featured);
  featuredSpecs.textContent = buildVehicleSummary(featured);
  featuredPrice.textContent = formatPrice(featured.precio);
  featuredMedia.innerHTML = getMainImageMarkup(featured.coverPhoto, vehicleHeading(featured));
  featuredHighlights.innerHTML = [
    featured.tipo,
    formatYear(featured.year),
    featured.transmision,
  ].map(label => `<span>${escapeHTML(label)}</span>`).join('');
  featuredActionBtn.textContent = 'Ver ficha';
}

function renderVehicles() {
  const visibleVehicles = getVisibleVehicles();

  loading.hidden = true;
  errorMsg.hidden = true;
  updateResultsSummary(visibleVehicles);

  if (!visibleVehicles.length) {
    vehiclesGrid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  vehiclesGrid.innerHTML = visibleVehicles.map(vehicle => renderVehicleCard(vehicle)).join('');
}

function getVisibleVehicles() {
  const filtered = allVehicles.filter(vehicle => {
    const matchesType = activeType === 'Todos' || vehicle.tipo === activeType;
    const matchesBrand = activeBrand === 'Todas' || vehicle.marca === activeBrand;
    const matchesSearch = !searchTerm || vehicle.searchBlob.includes(searchTerm);

    return matchesType && matchesBrand && matchesSearch;
  });

  return sortVehicles(filtered);
}

function sortVehicles(list) {
  return [...list].sort((first, second) => {
    if (sortOption === 'price-asc') {
      return numericSort(first.precio, second.precio, false);
    }

    if (sortOption === 'price-desc') {
      return numericSort(first.precio, second.precio, true);
    }

    if (sortOption === 'km-asc') {
      return numericSort(first.km, second.km, false);
    }

    if (sortOption === 'year-desc') {
      return numericSort(first.year, second.year, true);
    }

    const yearOrder = numericSort(first.year, second.year, true);
    if (yearOrder !== 0) return yearOrder;

    const kmOrder = numericSort(first.km, second.km, false);
    if (kmOrder !== 0) return kmOrder;

    return numericSort(first.precio, second.precio, false);
  });
}

function numericSort(firstValue, secondValue, desc = false) {
  const first = firstValue || 0;
  const second = secondValue || 0;

  if (first === second) return 0;

  if (desc) {
    return second - first;
  }

  if (first === 0) return 1;
  if (second === 0) return -1;

  return first - second;
}

function renderVehicleCard(vehicle) {
  return `
    <article class="vehicle-card">
      <div class="vehicle-media">
        ${getMainImageMarkup(vehicle.coverPhoto, vehicleHeading(vehicle))}
        <span class="vehicle-badge">${escapeHTML(vehicle.tipo)}</span>
        <span class="gallery-count">${vehicle.photos.length} fotos</span>
      </div>

      <div class="vehicle-body">
        <div class="vehicle-header">
          <p class="vehicle-brand">${escapeHTML(vehicle.marca)}</p>
          <h3 class="vehicle-title">${escapeHTML(vehicleHeading(vehicle))}</h3>
          <p class="vehicle-version">${escapeHTML(vehicle.version)}</p>
        </div>

        <div class="vehicle-spec-strip">
          <div class="vehicle-stat">
            <strong>${escapeHTML(formatYear(vehicle.year))}</strong>
            <span>Ano</span>
          </div>
          <div class="vehicle-stat">
            <strong>${escapeHTML(formatKm(vehicle.km))}</strong>
            <span>Kilometraje</span>
          </div>
          <div class="vehicle-stat">
            <strong>${escapeHTML(vehicle.color)}</strong>
            <span>Color</span>
          </div>
        </div>

        <div class="vehicle-meta">
          ${renderSpecPill(vehicle.combustible)}
          ${renderSpecPill(vehicle.transmision)}
          ${renderSpecPill(vehicle.tipo)}
        </div>

        <div class="vehicle-footer">
          <div>
            <span class="vehicle-price-label">Precio publicado</span>
            <strong class="vehicle-price">${formatPrice(vehicle.precio)}</strong>
          </div>

          <div class="vehicle-actions">
            <button
              type="button"
              class="card-btn"
              data-action="open-modal"
              data-id="${vehicle.id}"
            >
              Ver ficha
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderSpecPill(label) {
  return `<span class="spec-pill">${escapeHTML(label || 'No informado')}</span>`;
}

function updateResultsSummary(visibleVehicles) {
  if (!allVehicles.length) {
    resultsSummary.textContent = 'Todavia no hay autos cargados.';
    return;
  }

  const brandCount = new Set(visibleVehicles.map(vehicle => vehicle.marca)).size;
  resultsSummary.textContent = `Mostrando ${visibleVehicles.length} de ${allVehicles.length} unidades | ${brandCount} marcas`;
}

function handleVehicleGridClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const vehicleId = Number(button.dataset.id);
  const vehicle = findVehicle(vehicleId);
  if (!vehicle) return;

  if (button.dataset.action === 'open-modal') {
    openVehicleModal(vehicleId);
  }
}

function openVehicleModal(vehicleId) {
  const vehicle = findVehicle(vehicleId);
  if (!vehicle) return;

  currentVehicleId = vehicleId;
  currentPhotoIndex = 0;
  renderVehicleModal(vehicle);
  vehicleModal.classList.add('open');
  modalOverlay.classList.add('open');
  vehicleModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeVehicleModal() {
  vehicleModal.classList.remove('open');
  modalOverlay.classList.remove('open');
  vehicleModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function renderVehicleModal(vehicle) {
  const photos = vehicle.photos.length ? vehicle.photos : [''];
  const currentPhoto = photos[currentPhotoIndex] || photos[0] || '';

  modalType.textContent = vehicle.tipo;
  modalTitleText.textContent = vehicleHeading(vehicle);
  modalVersion.textContent = vehicle.version;
  modalPrice.textContent = formatPrice(vehicle.precio);
  modalMainMedia.innerHTML = getMainImageMarkup(currentPhoto, vehicleHeading(vehicle));

  modalThumbs.innerHTML = photos.map((photo, index) => `
    <button
      type="button"
      class="thumb-btn${index === currentPhotoIndex ? ' active' : ''}"
      data-thumb-index="${index}"
      aria-label="Ver foto ${index + 1}"
    >
      ${getThumbImageMarkup(photo, `${vehicleHeading(vehicle)} foto ${index + 1}`)}
    </button>
  `).join('');

  modalSpecGrid.innerHTML = [
    buildSpecCard('Marca', vehicle.marca),
    buildSpecCard('Modelo', vehicle.modelo),
    buildSpecCard('Version', vehicle.version),
    buildSpecCard('Ano', formatYear(vehicle.year)),
    buildSpecCard('Kilometraje', formatKm(vehicle.km)),
    buildSpecCard('Color', vehicle.color),
    buildSpecCard('Combustible', vehicle.combustible),
    buildSpecCard('Transmision', vehicle.transmision),
  ].join('');
}

function handleThumbClick(event) {
  const button = event.target.closest('[data-thumb-index]');
  if (!button) return;

  currentPhotoIndex = Number(button.dataset.thumbIndex);
  const vehicle = findVehicle(currentVehicleId);
  if (vehicle) {
    renderVehicleModal(vehicle);
  }
}

function sendCurrentVehicleInquiry() {
  const vehicle = findVehicle(currentVehicleId);
  if (!vehicle) return;

  openWhatsApp(buildSingleVehicleMessage(vehicle));
}

function buildSingleVehicleMessage(vehicle) {
  const lines = [
    'Hola FF Motors, me interesa esta unidad:',
    '',
    `${vehicleHeading(vehicle)} - ${vehicle.version}`,
    buildVehicleSummary(vehicle),
    `Precio: ${formatPrice(vehicle.precio)}`,
  ];

  return lines.join('\n');
}

function buildVehicleSummary(vehicle) {
  return [
    formatYear(vehicle.year),
    formatKm(vehicle.km),
    vehicle.combustible,
    vehicle.transmision,
    vehicle.color,
  ].filter(Boolean).join(' | ');
}

function buildSpecCard(label, value) {
  return `
    <article class="modal-spec-card">
      <small>${escapeHTML(label)}</small>
      <strong>${escapeHTML(value || 'No informado')}</strong>
    </article>
  `;
}

function syncContactLinks() {
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}`;
  headerWhatsappLink.href = url;
  footerWhatsappLink.href = url;
}

function openWhatsApp(message) {
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

function getFeaturedVehicle() {
  return sortVehicles(allVehicles)[0] || null;
}

function findVehicle(vehicleId) {
  return allVehicles.find(vehicle => vehicle.id === vehicleId) || null;
}

function vehicleHeading(vehicle) {
  return `${vehicle.marca} ${vehicle.modelo}`.trim();
}

function formatPrice(price) {
  if (!price) {
    return 'Precio a consultar';
  }

  return `${CONFIG.CURRENCY}${price.toLocaleString('es-AR')}`;
}

function formatYear(year) {
  return year ? String(year) : 'Ano no informado';
}

function formatKm(km) {
  return km ? `${km.toLocaleString('es-AR')} km` : 'Km no informado';
}

function getMainImageMarkup(photoUrl, alt) {
  return `
    <div class="image-placeholder">
      ${getVehicleIcon()}
    </div>
    ${photoUrl ? `<img src="${escapeAttr(photoUrl)}" alt="${escapeAttr(alt)}" loading="lazy" onerror="this.remove()">` : ''}
  `;
}

function getMiniImageMarkup(photoUrl, alt) {
  return photoUrl
    ? `<img src="${escapeAttr(photoUrl)}" alt="${escapeAttr(alt)}" loading="lazy" onerror="this.remove()">`
    : `<div class="image-placeholder">${getVehicleIcon()}</div>`;
}

function getThumbImageMarkup(photoUrl, alt) {
  return photoUrl
    ? `<img src="${escapeAttr(photoUrl)}" alt="${escapeAttr(alt)}" loading="lazy" onerror="this.remove()">`
    : `<div class="image-placeholder">${getVehicleIcon()}</div>`;
}

function getVehicleIcon() {
  return `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M11 38l4-12a6 6 0 0 1 5.7-4.1h22.7a6 6 0 0 1 5.7 4.1L53 38h3a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-2a5 5 0 0 1-10 0H20a5 5 0 0 1-10 0H8a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h3zm10.6-10a2 2 0 0 0-1.9 1.3L17 38h30l-2.7-8.7a2 2 0 0 0-1.9-1.3zM15 48a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm34 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"></path>
    </svg>
  `;
}

function showToast(message) {
  const currentToast = document.querySelector('.toast');
  if (currentToast) {
    currentToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 280);
  }, 2400);
}

function escapeHTML(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
