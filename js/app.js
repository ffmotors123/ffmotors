// =============================================
// App principal FF Motors
// =============================================

let allVehicles = [];
let activeType = 'Todos';
let activeBrand = 'Todas';
let searchTerm = '';
let sortOption = 'featured';
let currentVehicleId = null;
let currentSoldVehicleId = null;
let currentModalKind = 'vehicle';
let currentPhotoIndex = 0;
let featuredVehicleId = null;
let viewMode = 'large';
let currentPage = 1;
let servicesCarouselApi = null;
const PAGE_SIZE = 9;
let soldVehicles = [];
let soldCurrentPage = 1;
const SOLD_PAGE_SIZE = 9;
const SOLD_MOBILE_PAGE_SIZE = 1;

const vehiclesGrid = document.getElementById('vehiclesGrid');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const emptyState = document.getElementById('emptyState');
const retryBtn = document.getElementById('retryBtn');
const typeFiltersContainer = document.getElementById('typeFilters');
const brandFiltersContainer = document.getElementById('brandFilters');
const resultsSummary = document.getElementById('resultsSummary');
const searchInput = document.getElementById('searchInput');
const soldVehiclesGrid = document.getElementById('soldVehiclesGrid');
const soldLoading = document.getElementById('soldLoading');
const soldEmptyState = document.getElementById('soldEmptyState');
const soldSummary = document.getElementById('soldSummary');
const soldPagination = document.getElementById('soldPagination');

const modalOverlay = document.getElementById('modalOverlay');
const vehicleModal = document.getElementById('vehicleModal');
const modalClose = document.getElementById('modalClose');
const modalMainMedia = document.getElementById('modalMainMedia');
const modalThumbs = document.getElementById('modalThumbs');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');
const modalType = document.getElementById('modalType');
const modalTitleText = document.getElementById('modalTitle');
const modalComment = document.getElementById('modalComment');
const modalPrice = document.getElementById('modalPrice');
const modalSpecGrid = document.getElementById('modalSpecGrid');
const modalWhatsappBtn = document.getElementById('modalWhatsappBtn');
const modalActions = modalWhatsappBtn.closest('.modal-actions');

const featuredTitle = document.getElementById('featuredTitle');
const featuredPrice = document.getElementById('featuredPrice');
const featuredMedia = document.getElementById('featuredMedia');
const featuredActionBtn = document.getElementById('featuredActionBtn');
const heroCount = document.getElementById('heroCount');
const featuredHighlights = document.getElementById('featuredHighlights');
const headerWhatsappLink = document.getElementById('headerWhatsappLink');
const footerWhatsappLink = document.getElementById('footerWhatsappLink');
const heroActions = document.getElementById('heroActions');
const servicesTrack = document.getElementById('servicesTrack');

document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  bindSheets();
  syncContactLinks();
  loadVehicles();
  loadSoldVehicles();
  initServicesCarousel();
});

function bindUI() {
  retryBtn.addEventListener('click', loadVehicles);

  searchInput.addEventListener('input', event => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    updateFilterBadge();
    renderVehicles();
  });

  typeFiltersContainer.addEventListener('click', event => {
    const button = event.target.closest('[data-filter-value]');
    if (!button) return;
    activeType = button.dataset.filterValue;
    currentPage = 1;
    renderFilterButtons(typeFiltersContainer, getTypeOptions(), activeType);
    updateFilterBadge();
    renderVehicles();
  });

  brandFiltersContainer.addEventListener('click', event => {
    const button = event.target.closest('[data-filter-value]');
    if (!button) return;
    activeBrand = button.dataset.filterValue;
    currentPage = 1;
    renderFilterButtons(brandFiltersContainer, getBrandOptions(), activeBrand);
    updateFilterBadge();
    renderVehicles();
  });

  vehiclesGrid.addEventListener('click', handleVehicleGridClick);
  soldVehiclesGrid.addEventListener('click', handleSoldGridClick);
  heroActions?.addEventListener('click', handleServiceCtaClick);
  servicesTrack?.addEventListener('click', handleServiceCtaClick);

  featuredActionBtn.addEventListener('click', () => {
    if (featuredVehicleId) {
      openVehicleModal(featuredVehicleId);
    }
  });

  modalClose.addEventListener('click', closeVehicleModal);
  modalOverlay.addEventListener('click', closeVehicleModal);
  modalThumbs.addEventListener('click', handleThumbClick);
  modalMainMedia.addEventListener('click', handleModalImageZoomToggle);
  modalMainMedia.addEventListener('mousemove', handleModalImageZoomMove);
  modalMainMedia.addEventListener('mouseleave', handleModalImageZoomLeave);
  modalWhatsappBtn.addEventListener('click', sendCurrentVehicleInquiry);
  galleryPrev.addEventListener('click', e => { e.stopPropagation(); navigateGallery(-1); });
  galleryNext.addEventListener('click', e => { e.stopPropagation(); navigateGallery(1); });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeVehicleModal(); return; }
    if (event.key === 'ArrowLeft') navigateGallery(-1);
    if (event.key === 'ArrowRight') navigateGallery(1);
  });

  window.addEventListener('resize', handleResponsiveSoldPagination);
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

async function loadSoldVehicles() {
  soldVehicles = [];
  soldCurrentPage = 1;
  soldLoading.hidden = false;
  soldEmptyState.hidden = true;
  soldVehiclesGrid.innerHTML = '';
  soldPagination.hidden = true;
  soldPagination.innerHTML = '';
  soldSummary.textContent = 'Cargando vendidos...';

  try {
    soldVehicles = await fetchSoldVehiclesFromSheet();
    renderSoldVehicles();
  } catch (error) {
    console.error('Error cargando vendidos:', error);
    soldLoading.hidden = true;
    soldSummary.textContent = 'No se pudo cargar vendidos.';
    soldEmptyState.hidden = false;
    soldPagination.hidden = true;
    soldPagination.innerHTML = '';
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
  if (heroCount) {
    heroCount.textContent = allVehicles.length.toString();
  }

  const featured = getFeaturedVehicle();
  featuredVehicleId = featured ? featured.id : null;

  if (!featured) {
    featuredTitle.textContent = 'Sin unidades publicadas';
    featuredPrice.textContent = '--';
    featuredMedia.innerHTML = getMainImageMarkup('', 'Sin unidades');
    featuredHighlights.innerHTML = '<span>Google Sheets</span><span>Catalogo visual</span><span>WhatsApp</span>';
    featuredActionBtn.textContent = 'Sin stock';
    return;
  }

  featuredTitle.textContent = vehicleHeading(featured);
  featuredPrice.textContent = formatPrice(featured.precio);
  featuredMedia.style.setProperty('--cover-position-y', getVehicleCoverPosition(featured, 'featured'));
  featuredMedia.innerHTML = getMainImageMarkup(featured.coverPhoto, vehicleHeading(featured));
  featuredHighlights.innerHTML = [
    featured.tipo,
    formatYear(featured.year),
    formatKm(featured.km),
    featured.combustible,
    featured.transmision,
  ].map(label => `<span>${escapeHTML(label)}</span>`).join('');
  featuredActionBtn.textContent = 'Ver ficha';
}

function renderVehicles() {
  const visibleVehicles = getVisibleVehicles();
  const totalPages = Math.ceil(visibleVehicles.length / PAGE_SIZE);
  currentPage = Math.min(currentPage, totalPages || 1);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageVehicles = visibleVehicles.slice(start, start + PAGE_SIZE);

  loading.hidden = true;
  errorMsg.hidden = true;
  updateResultsSummary(visibleVehicles);

  if (!visibleVehicles.length) {
    vehiclesGrid.innerHTML = '';
    emptyState.hidden = false;
    renderPagination(0, 0);
    return;
  }

  emptyState.hidden = true;
  vehiclesGrid.innerHTML = pageVehicles.map(vehicle => renderVehicleCard(vehicle)).join('');
  renderPagination(currentPage, totalPages);
}

function renderSoldVehicles() {
  soldLoading.hidden = true;
  const soldPageSize = getSoldPageSize();

  if (!soldVehicles.length) {
    soldVehiclesGrid.innerHTML = '';
    soldSummary.textContent = 'No hay unidades vendidas cargadas.';
    soldEmptyState.hidden = false;
    soldPagination.hidden = true;
    soldPagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(soldVehicles.length / soldPageSize);
  soldCurrentPage = Math.min(soldCurrentPage, totalPages || 1);
  const start = (soldCurrentPage - 1) * soldPageSize;
  const pageVehicles = soldVehicles.slice(start, start + soldPageSize);

  soldEmptyState.hidden = true;
  soldSummary.textContent = `Mostrando ${pageVehicles.length} de ${soldVehicles.length} unidades vendidas`;
  soldVehiclesGrid.innerHTML = pageVehicles.map(vehicle => renderSoldVehicleCard(vehicle)).join('');
  renderSoldPagination(soldCurrentPage, totalPages);
}

function renderPagination(page, totalPages) {
  const existing = document.getElementById('pagination');
  if (existing) existing.remove();
  if (totalPages <= 1) return;

  const nav = document.createElement('div');
  nav.id = 'pagination';
  nav.className = 'pagination';
  nav.innerHTML = `
    <button class="page-btn" id="pagePrev" ${page <= 1 ? 'disabled' : ''} aria-label="Anterior">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 16 7 10 13 4"/></svg>
    </button>
    <span class="page-info">${page} <span class="page-sep">/</span> ${totalPages}</span>
    <button class="page-btn" id="pageNext" ${page >= totalPages ? 'disabled' : ''} aria-label="Siguiente">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 4 13 10 7 16"/></svg>
    </button>
  `;

  vehiclesGrid.after(nav);

  nav.querySelector('#pagePrev').addEventListener('click', () => {
    currentPage--;
    renderVehicles();
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  nav.querySelector('#pageNext').addEventListener('click', () => {
    currentPage++;
    renderVehicles();
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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
  const coverPosition = getVehicleCoverPosition(vehicle, 'card');
  const coverScale = getVehicleCoverScale(vehicle, 'card');

  return `
    <article class="vehicle-card" data-action="open-modal" data-id="${vehicle.id}">
      <div class="vehicle-media" style="--cover-position-y: ${escapeAttr(coverPosition)}; --cover-scale: ${escapeAttr(coverScale)};">
        ${getMainImageMarkup(vehicle.coverPhoto, vehicleHeading(vehicle))}
        <span class="gallery-count">${vehicle.photos.length} fotos</span>
      </div>

      <div class="vehicle-body">
        <div class="vehicle-header">
          <h3 class="vehicle-title">${escapeHTML(vehicleHeading(vehicle))}</h3>
          <p class="vehicle-version">${escapeHTML(vehicle.version)}</p>
        </div>

        <div class="vehicle-spec-strip">
          <div class="vehicle-stat">
            <strong>${escapeHTML(formatYear(vehicle.year))}</strong>
          </div>
          <div class="vehicle-stat">
            <strong>${escapeHTML(formatKm(vehicle.km))}</strong>
          </div>
          <div class="vehicle-stat">
            <strong>${escapeHTML(vehicle.color)}</strong>
          </div>
        </div>

        <div class="vehicle-meta">
          ${renderSpecPill(vehicle.combustible)}
          ${renderSpecPill(vehicle.transmision)}
          ${renderSpecPill(vehicle.tipo)}
          ${renderSpecPill(`Financia / usado: ${vehicle.financiarRecibirUsado || 'No informado'}`)}
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

function renderSoldVehicleCard(vehicle) {
  const photos = vehicle.photos.length ? vehicle.photos : [''];
  const coverPosition = getSoldVehicleCoverPosition(vehicle);
  const coverScale = getSoldVehicleCoverScale(vehicle);

  return `
    <article class="sold-card" data-sold-id="${vehicle.id}">
      <div class="sold-media" style="--sold-cover-position-y: ${escapeAttr(coverPosition)}; --sold-cover-scale: ${escapeAttr(coverScale)};">
        <div class="sold-carousel-track" style="--sold-slides: ${photos.length};">
          ${photos.map((photo, index) => `
            <div class="sold-slide">
              ${getMainImageMarkup(photo, `${vehicle.title} foto ${index + 1}`)}
            </div>
          `).join('')}
        </div>
        ${photos.length > 1 ? `
          <button class="sold-arrow sold-arrow-prev" type="button" data-action="sold-prev" data-id="${vehicle.id}" aria-label="Foto anterior">&#8249;</button>
          <button class="sold-arrow sold-arrow-next" type="button" data-action="sold-next" data-id="${vehicle.id}" aria-label="Foto siguiente">&#8250;</button>
          <div class="sold-dots">
            ${photos.map((_, index) => `
              <button
                class="sold-dot${index === 0 ? ' active' : ''}"
                type="button"
                data-action="sold-dot"
                data-id="${vehicle.id}"
                data-index="${index}"
                aria-label="Ver imagen ${index + 1}"
              ></button>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="sold-body">
        <h3 class="sold-title">${escapeHTML(vehicle.title)}</h3>
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

function handleSoldGridClick(event) {
  const card = event.target.closest('.sold-card');
  if (!card) return;

  const soldId = Number(card.dataset.soldId);
  const soldVehicle = soldVehicles.find(item => item.id === soldId);
  if (!soldVehicle) return;

  const button = event.target.closest('[data-action]');
  if (!button) {
    openSoldVehicleModal(soldId);
    return;
  }

  const vehicleId = Number(button.dataset.id);
  const vehicle = soldVehicles.find(item => item.id === vehicleId);
  if (!vehicle || vehicle.photos.length <= 1) return;

  const track = card.querySelector('.sold-carousel-track');
  const dots = [...card.querySelectorAll('.sold-dot')];
  const currentIndex = Number(track.dataset.index || '0');
  let nextIndex = currentIndex;

  if (button.dataset.action === 'sold-prev') {
    nextIndex = (currentIndex - 1 + vehicle.photos.length) % vehicle.photos.length;
  }

  if (button.dataset.action === 'sold-next') {
    nextIndex = (currentIndex + 1) % vehicle.photos.length;
  }

  if (button.dataset.action === 'sold-dot') {
    nextIndex = Number(button.dataset.index || '0');
  }

  track.dataset.index = String(nextIndex);
  track.style.transform = `translateX(-${nextIndex * 100}%)`;
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === nextIndex);
  });
}

function renderSoldPagination(page, totalPages) {
  soldPagination.innerHTML = '';

  if (totalPages <= 1) {
    soldPagination.hidden = true;
    return;
  }

  soldPagination.hidden = false;
  soldPagination.innerHTML = `
    <button class="page-btn" id="soldPagePrev" ${page <= 1 ? 'disabled' : ''} aria-label="Anterior">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 16 7 10 13 4"/></svg>
    </button>
    <span class="page-info">${page} <span class="page-sep">/</span> ${totalPages}</span>
    <button class="page-btn" id="soldPageNext" ${page >= totalPages ? 'disabled' : ''} aria-label="Siguiente">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 4 13 10 7 16"/></svg>
    </button>
  `;

  soldPagination.querySelector('#soldPagePrev').addEventListener('click', () => {
    soldCurrentPage--;
    renderSoldVehicles();
    document.getElementById('vendidos').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  soldPagination.querySelector('#soldPageNext').addEventListener('click', () => {
    soldCurrentPage++;
    renderSoldVehicles();
    document.getElementById('vendidos').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function getSoldPageSize() {
  return window.matchMedia('(max-width: 640px)').matches ? SOLD_MOBILE_PAGE_SIZE : SOLD_PAGE_SIZE;
}

function handleResponsiveSoldPagination() {
  if (!soldVehicles.length) return;
  renderSoldVehicles();
}

function openVehicleModal(vehicleId) {
  const vehicle = findVehicle(vehicleId);
  if (!vehicle) return;

  currentModalKind = 'vehicle';
  currentVehicleId = vehicleId;
  currentSoldVehicleId = null;
  currentPhotoIndex = 0;
  renderVehicleModal(vehicle);
  vehicleModal.classList.add('open');
  modalOverlay.classList.add('open');
  vehicleModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeVehicleModal() {
  resetModalImageZoom();
  currentVehicleId = null;
  currentSoldVehicleId = null;
  currentModalKind = 'vehicle';
  vehicleModal.classList.remove('open');
  modalOverlay.classList.remove('open');
  vehicleModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function openSoldVehicleModal(vehicleId) {
  const vehicle = soldVehicles.find(item => item.id === vehicleId);
  if (!vehicle) return;

  currentModalKind = 'sold';
  currentSoldVehicleId = vehicleId;
  currentVehicleId = null;
  currentPhotoIndex = 0;
  renderSoldVehicleModal(vehicle);
  vehicleModal.classList.add('open');
  modalOverlay.classList.add('open');
  vehicleModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function renderVehicleModal(vehicle) {
  const photos = vehicle.photos.length ? vehicle.photos : [''];
  const currentPhoto = photos[currentPhotoIndex] || photos[0] || '';

  vehicleModal.classList.remove('sold-mode');
  modalPrice.hidden = false;
  modalSpecGrid.hidden = false;
  modalActions.hidden = false;
  modalComment.hidden = true;
  modalComment.textContent = '';
  modalType.textContent = vehicle.tipo;
  modalTitleText.textContent = vehicleHeading(vehicle);
  modalPrice.textContent = formatPrice(vehicle.precio);
  modalMainMedia.style.setProperty('--modal-cover-position-y', getVehicleCoverPosition(vehicle, 'modal'));

  let img = modalMainMedia.querySelector('img');
  if (currentPhoto) {
    if (!img) {
      img = document.createElement('img');
      img.onerror = () => img.remove();
      modalMainMedia.insertBefore(img, galleryPrev);
    }
    img.src = currentPhoto;
    img.alt = vehicleHeading(vehicle);
  } else if (img) {
    img.remove();
  }

  resetModalImageZoom();

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
    buildSpecCard('Version', vehicle.version),
    buildSpecCard('Año', formatYear(vehicle.year)),
    buildSpecCard('Kilometraje', vehicle.km ? vehicle.km.toLocaleString('es-AR') : 'No informado'),
    buildSpecCard('Color', vehicle.color),
    buildSpecCard('Combustible', vehicle.combustible),
    buildSpecCard('Transmision', vehicle.transmision),
    buildSpecCard('Financia / recibe usado', vehicle.financiarRecibirUsado),
  ].join('');

  updateGalleryArrows(photos.length);
}

function renderSoldVehicleModal(vehicle) {
  const photos = vehicle.photos.length ? vehicle.photos : [''];
  const currentPhoto = photos[currentPhotoIndex] || photos[0] || '';

  vehicleModal.classList.add('sold-mode');
  modalType.textContent = 'Vendido';
  modalTitleText.textContent = vehicle.title;
  modalComment.hidden = !vehicle.comment;
  modalComment.textContent = vehicle.comment ? `"${vehicle.comment}"` : '';
  modalPrice.textContent = '';
  modalPrice.hidden = true;
  modalSpecGrid.hidden = true;
  modalActions.hidden = true;
  modalMainMedia.style.setProperty('--modal-cover-position-y', '50%');

  let img = modalMainMedia.querySelector('img');
  if (currentPhoto) {
    if (!img) {
      img = document.createElement('img');
      img.onerror = () => img.remove();
      modalMainMedia.insertBefore(img, galleryPrev);
    }
    img.src = currentPhoto;
    img.alt = vehicle.title;
  } else if (img) {
    img.remove();
  }

  resetModalImageZoom();

  modalThumbs.innerHTML = photos.map((photo, index) => `
    <button
      type="button"
      class="thumb-btn${index === currentPhotoIndex ? ' active' : ''}"
      data-thumb-index="${index}"
      aria-label="Ver foto ${index + 1}"
    >
      ${getThumbImageMarkup(photo, `${vehicle.title} foto ${index + 1}`)}
    </button>
  `).join('');

  modalSpecGrid.innerHTML = '';
  updateGalleryArrows(photos.length);
}

function handleThumbClick(event) {
  const button = event.target.closest('[data-thumb-index]');
  if (!button) return;
  goToPhoto(Number(button.dataset.thumbIndex));
}

function navigateGallery(direction) {
  const vehicle = getCurrentModalItem();
  if (!vehicle) return;
  const total = vehicle.photos.length || 1;
  goToPhoto((currentPhotoIndex + direction + total) % total);
}

function goToPhoto(newIndex) {
  const vehicle = getCurrentModalItem();
  if (!vehicle || newIndex === currentPhotoIndex) return;

  currentPhotoIndex = newIndex;

  const photos = vehicle.photos.length ? vehicle.photos : [''];
  const newPhoto = photos[newIndex] || photos[0] || '';

  modalThumbs.querySelectorAll('[data-thumb-index]').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.thumbIndex) === newIndex);
  });

  const thumb = modalThumbs.querySelector(`[data-thumb-index="${newIndex}"]`);
  if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

  let img = modalMainMedia.querySelector('img');
  if (img) {
    img.src = newPhoto;
    img.alt = currentModalKind === 'sold' ? vehicle.title : vehicleHeading(vehicle);
  } else if (newPhoto) {
    img = document.createElement('img');
    img.alt = currentModalKind === 'sold' ? vehicle.title : vehicleHeading(vehicle);
    img.onerror = () => img.remove();
    img.src = newPhoto;
    modalMainMedia.appendChild(img);
  }

  updateGalleryArrows(photos.length);
  resetModalImageZoom();
}

function updateGalleryArrows(total) {
  galleryPrev.classList.toggle('hidden', total <= 1);
  galleryNext.classList.toggle('hidden', total <= 1);
}

function getCurrentModalItem() {
  if (currentModalKind === 'sold') {
    return soldVehicles.find(item => item.id === currentSoldVehicleId) || null;
  }

  return findVehicle(currentVehicleId);
}

function handleModalImageZoomToggle(event) {
  const image = event.target.closest('img');
  if (!image || !modalMainMedia.contains(image)) return;

  image.classList.toggle('zoomed');

  if (!image.classList.contains('zoomed')) {
    image.style.transformOrigin = 'center center';
  }
}

function handleModalImageZoomMove(event) {
  const image = modalMainMedia.querySelector('img.zoomed');
  if (!image) return;

  const bounds = modalMainMedia.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * 100;
  const y = ((event.clientY - bounds.top) / bounds.height) * 100;

  image.style.transformOrigin = `${clamp(x, 0, 100)}% ${clamp(y, 0, 100)}%`;
}

function handleModalImageZoomLeave() {
  const image = modalMainMedia.querySelector('img.zoomed');
  if (!image) return;

  image.style.transformOrigin = 'center center';
}

function resetModalImageZoom() {
  const image = modalMainMedia.querySelector('img');
  if (!image) return;

  image.classList.remove('zoomed');
  image.style.transformOrigin = 'center center';
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
    `Financia / recibe usado: ${vehicle.financiarRecibirUsado || 'No informado'}`,
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

function handleServiceCtaClick(event) {
  const button = event.target.closest('[data-service-message]');
  const serviceButton = event.target.closest('[data-service-index]');

  if (serviceButton) {
    revealServiceSlide(Number(serviceButton.dataset.serviceIndex));
    return;
  }

  if (!button) return;

  openWhatsApp(button.dataset.serviceMessage || 'Hola FF Motors');
}

function revealServiceSlide(serviceIndex) {
  const servicesSection = document.getElementById('servicios');
  if (!servicesSection || Number.isNaN(serviceIndex)) return;

  servicesCarouselApi?.goToRealSlide(serviceIndex);
  scrollToSectionWithOffset(servicesSection);
}

function scrollToSectionWithOffset(section) {
  const header = document.querySelector('.site-header');
  const headerOffset = header ? header.offsetHeight + 18 : 18;
  const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  });
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

function getVehicleCoverPosition(vehicle, context = 'card') {
  const key = normalizeVehicleKey(vehicleHeading(vehicle));
  const versionKey = normalizeVehicleKey(`${vehicleHeading(vehicle)} ${vehicle.version}`);

  if (context === 'featured') {
    const featuredPositions = {
      'peugeot 208': '64%',
    };

    return featuredPositions[key] || '64%';
  }

  if (context === 'modal') {
    const modalPositions = {
      'fiat strada': '74%',
    };

    return modalPositions[key] || '50%';
  }

  if (versionKey === 'citroen c3 origen') {
    return '58%';
  }

  const cardPositions = {
    'peugeot 208': '72%',
    'zontes t2': '52%',
    'fiat strada': '62%',
    'toyota yaris': '62%',
    'jeep renegade': '62%',
    'chevrolet cruze': '66%',
    'peugeot 2008': '66%',
    'citroen c3': '78%',
  };

  return cardPositions[key] || '58%';
}

function getVehicleCoverScale(vehicle, context = 'card') {
  const key = normalizeVehicleKey(vehicleHeading(vehicle));

  if (context === 'featured') {
    return '1';
  }

  const cardScales = {
    'toyota etios': '1.18',
  };

  return cardScales[key] || '1';
}

function getSoldVehicleCoverPosition(vehicle) {
  const key = normalizeVehicleKey(vehicle.title);

  const soldPositions = {
    'citroen jumpy': '55%',
    'ford fiesta kinetic': '56%',
    'ford mondeo sel': '64%',
    'renault capture': '64%',
    'renault logan': '64%',
    'vw amarok highline': '50%',
  };

  return soldPositions[key] || '45%';
}

function getSoldVehicleCoverScale(vehicle) {
  const key = normalizeVehicleKey(vehicle.title);

  const soldScales = {
    'citroen jumpy': '1',
    'ford mondeo sel': '1.04',
    'renault capture': '1.04',
    'renault logan': '1.04',
    'vw amarok highline': '1.04',
  };

  return soldScales[key] || '1.16';
}

function normalizeVehicleKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatPrice(price) {
  if (!price) {
    return 'Precio a consultar';
  }

  return `${CONFIG.CURRENCY}${price.toLocaleString('es-AR')}`;
}

function formatYear(year) {
  return year ? String(year) : 'Año no informado';
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function bindSheets() {
  const overlay = document.getElementById('sheetOverlay');
  const sheets = {
    sort:   document.getElementById('sheetSort'),
    filter: document.getElementById('sheetFilter'),
    view:   document.getElementById('sheetView'),
  };

  function openSheet(key) {
    Object.values(sheets).forEach(s => s.classList.remove('open'));
    sheets[key].classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeAll() {
    Object.values(sheets).forEach(s => s.classList.remove('open'));
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  document.getElementById('btnSort').addEventListener('click', () => openSheet('sort'));
  document.getElementById('btnFilter').addEventListener('click', () => openSheet('filter'));
  document.getElementById('btnView').addEventListener('click', () => openSheet('view'));
  overlay.addEventListener('click', closeAll);

  // Sort options
  document.getElementById('sortOptionList').addEventListener('click', event => {
    const btn = event.target.closest('[data-sort-value]');
    if (!btn) return;
    sortOption = btn.dataset.sortValue;
    currentPage = 1;
    document.querySelectorAll('.sheet-opt').forEach(b => b.classList.toggle('active', b === btn));
    renderVehicles();
    closeAll();
  });

  // View options
  document.getElementById('viewToggle').addEventListener('click', event => {
    const btn = event.target.closest('[data-view]');
    if (!btn) return;
    viewMode = btn.dataset.view;
    document.querySelectorAll('.sheet-view-btn').forEach(b => b.classList.toggle('active', b === btn));
    vehiclesGrid.className = `vehicles-grid view-${viewMode}`;
    closeAll();
  });
}

function updateFilterBadge() {
  const badge = document.getElementById('filterBadge');
  const active = searchTerm || activeType !== 'Todos' || activeBrand !== 'Todas';
  badge.hidden = !active;
}

function initServicesCarousel() {
  const track = document.getElementById('servicesTrack');
  const dots = document.querySelectorAll('.services-dot');
  const prev = document.getElementById('servicesPrev');
  const next = document.getElementById('servicesNext');
  if (!track) return;

  const realSlides = [...track.children];
  const total = realSlides.length;

  // Clone first and last to enable infinite loop
  track.appendChild(realSlides[0].cloneNode(true));
  track.prepend(realSlides[total - 1].cloneNode(true));

  // current is 1-based: 1 = first real slide, total = last real slide
  let current = 1;
  let isAnimating = false;
  let autoplayTimer;

  function setPosition(index, animate) {
    track.style.transition = animate ? 'transform 420ms cubic-bezier(0.4,0,0.2,1)' : 'none';
    track.style.transform = `translateX(-${index * 100}%)`;
  }

  function updateDots(index) {
    const realIndex = (index - 1 + total) % total;
    dots.forEach((d, i) => d.classList.toggle('active', i === realIndex));
  }

  function goTo(index) {
    if (isAnimating) return;
    current = index;
    setPosition(current, true);
    updateDots(current);
    isAnimating = true;
  }

  track.addEventListener('transitionend', () => {
    isAnimating = false;
    if (current === 0) {
      current = total;
      setPosition(current, false);
    } else if (current === total + 1) {
      current = 1;
      setPosition(current, false);
    }
    updateDots(current);
  });

  function startAutoplay() {
    autoplayTimer = setInterval(() => goTo(current + 1), 6000);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  setPosition(current, false);
  updateDots(current);

  servicesCarouselApi = {
    goToRealSlide(realIndex) {
      if (realIndex < 0 || realIndex >= total) return;
      if (isAnimating) {
        current = realIndex + 1;
        setPosition(current, false);
        updateDots(current);
        isAnimating = false;
        return;
      }

      goTo(realIndex + 1);
      resetAutoplay();
    },
  };

  prev.addEventListener('click', () => { goTo(current - 1); resetAutoplay(); });
  next.addEventListener('click', () => { goTo(current + 1); resetAutoplay(); });
  dots.forEach(dot => dot.addEventListener('click', () => {
    goTo(Number(dot.dataset.index) + 1);
    resetAutoplay();
  }));

  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(diff > 0 ? current + 1 : current - 1); resetAutoplay(); }
  });

  startAutoplay();
}
