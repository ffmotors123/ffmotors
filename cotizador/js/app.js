(function () {
  const cfg = window.COTIZADOR_CONFIG;
  const API = window.ArgAutos;
  const CURRENT_YEAR = new Date().getFullYear();
  const OLDEST_YEAR = 1995;
  const SETTINGS_KEY = 'cotizador:settings';

  const TYPES = [
    { value: 'auto', label: 'Auto, camioneta o utilitario' },
    { value: 'moto', label: 'Moto' },
  ];

  // Las motos traen los años junto con el precio de la versión, por eso el orden cambia.
  const FLOWS = {
    auto: ['type', 'brand', 'model', 'year', 'version', 'km'],
    moto: ['type', 'brand', 'model', 'version', 'year', 'km'],
  };
  const TITLES = {
    type: '¿Qué tipo de vehículo?', brand: 'Marca', model: 'Modelo',
    year: 'Año', version: 'Versión', km: 'Kilometraje',
  };

  const state = { sel: {}, usdRate: null, lastQuote: null, motoPrices: null, renderId: 0 };

  const $ = (id) => document.getElementById(id);
  const els = {
    stepNumber: $('stepNumber'), stepTotal: $('stepTotal'), stepTitle: $('stepTitle'), crumbs: $('crumbs'),
    search: $('stepSearch'), options: $('options'), status: $('stepStatus'),
    kmForm: $('kmForm'), kmInput: $('kmInput'), quoteBtn: $('quoteBtn'),
    resetBtn: $('resetBtn'), result: $('result'), dolarBox: $('dolarBox'),
  };

  const fmtArs = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmtUsd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('es-AR');
  const roundTo = (v, step) => Math.round(v / step) * step;
  const yearLabel = (y) => (y === 0 ? '0 km' : String(y));

  // ---------- Ajustes ----------
  function loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { /* sin almacenamiento */ }
    return { ...cfg.pricing, ...saved };
  }

  function initSettings() {
    const s = loadSettings();
    ['ajusteMercado', 'primaEstado', 'rango'].forEach((k) => {
      const input = $(`set-${k}`);
      input.value = s[k];
      input.addEventListener('change', () => {
        const next = { ...loadSettings(), [k]: Number(input.value) || 0 };
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
      });
    });
  }

  // ---------- Dólar ----------
  async function loadDolar() {
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/blue');
      const data = await res.json();
      state.usdRate = data.venta;
      els.dolarBox.innerHTML = `Dólar blue: <strong>${fmtArs.format(data.venta)}</strong>`;
    } catch {
      els.dolarBox.textContent = 'Dólar: sin conexión';
    }
  }

  // ---------- Pasos ----------
  const flow = () => FLOWS[state.sel.type ? state.sel.type.value : 'auto'];
  const currentStep = () => flow().find((k) => !state.sel[k]);

  async function optionsFor(step) {
    const { sel } = state;
    const isMoto = sel.type && sel.type.value === 'moto';
    const toOpts = (items) => items.map((i) => ({ value: i.id, label: i.name }));

    switch (step) {
      case 'type':
        return TYPES;
      case 'brand':
        return toOpts(await (isMoto ? API.motoBrands() : API.carBrands()));
      case 'model':
        return toOpts(await (isMoto ? API.motoModels(sel.brand.value) : API.carModels(sel.brand.value)));
      case 'version':
        return toOpts(await (isMoto
          ? API.motoVersions(sel.model.value)
          : API.carVersions(sel.model.value, sel.year.value)));
      case 'year': {
        if (isMoto) {
          state.motoPrices = await API.motoPrices(sel.version.value);
          return state.motoPrices
            .map((p) => p.year)
            .sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : b - a))
            .map((y) => ({ value: y, label: yearLabel(y) }));
        }
        const years = [0];
        for (let y = CURRENT_YEAR; y >= OLDEST_YEAR; y--) years.push(y);
        return years.map((y) => ({ value: y, label: yearLabel(y) }));
      }
      default:
        return [];
    }
  }

  async function render() {
    const renderId = ++state.renderId;
    const steps = flow();
    const step = currentStep();
    const idx = steps.indexOf(step);

    els.stepNumber.textContent = idx + 1;
    els.stepTotal.textContent = steps.length;
    els.stepTitle.textContent = TITLES[step];
    els.resetBtn.hidden = idx === 0;
    renderCrumbs(steps.slice(0, idx));

    const isKm = step === 'km';
    els.kmForm.hidden = !isKm;
    els.search.hidden = isKm || step === 'type';
    els.search.value = '';
    els.options.innerHTML = '';
    setStatus('');

    if (isKm) {
      els.kmInput.value = state.sel.year.value === 0 ? '0' : '';
      els.kmInput.focus();
      return;
    }

    setStatus('Cargando...');
    let opts;
    try {
      opts = await optionsFor(step);
    } catch (err) {
      if (renderId === state.renderId) setStatus(`No se pudo cargar: ${err.message}`, true);
      return;
    }
    if (renderId !== state.renderId) return; // el usuario ya cambió de paso
    setStatus('');

    if (!opts.length) {
      setStatus(step === 'version'
        ? `No hay versiones de este modelo con precio para ${yearLabel(state.sel.year.value)}. Probá otro año.`
        : 'Sin opciones disponibles.', true);
      return;
    }
    // Un solo resultado posible: se elige solo para ahorrar clics.
    if (opts.length === 1 && step !== 'type') {
      state.sel[step] = opts[0];
      render();
      return;
    }
    renderOptions(step, opts);
    if (!els.search.hidden) els.search.focus();
  }

  function renderCrumbs(done) {
    els.crumbs.innerHTML = '';
    done.forEach((k, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cz-crumb';
      b.textContent = state.sel[k].label;
      b.title = 'Cambiar';
      b.addEventListener('click', () => goBackTo(i));
      els.crumbs.appendChild(b);
    });
  }

  function renderOptions(step, opts) {
    const draw = () => {
      const term = els.search.value.trim().toLowerCase();
      const filtered = term ? opts.filter((o) => o.label.toLowerCase().includes(term)) : opts;
      els.options.className = 'cz-options' + (step === 'version' ? ' cz-options--wide' : '');
      els.options.innerHTML = '';
      if (!filtered.length) {
        els.options.innerHTML = '<p class="cz-empty">Sin resultados.</p>';
        return;
      }
      filtered.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cz-option';
        b.textContent = o.label;
        b.addEventListener('click', () => {
          state.sel[step] = o;
          render();
        });
        els.options.appendChild(b);
      });
    };
    els.search.oninput = draw;
    draw();
  }

  function setStatus(text, isError) {
    els.status.textContent = text;
    els.status.hidden = !text;
    els.status.classList.toggle('cz-status--error', !!isError);
  }

  function goBackTo(i) {
    flow().slice(i).forEach((k) => delete state.sel[k]);
    els.result.hidden = true;
    render();
  }

  // ---------- Cotización ----------
  async function quote(km) {
    const { sel } = state;
    const type = sel.type.value;
    const year = sel.year.value;
    const usdRate = state.usdRate;
    if (!usdRate) {
      setStatus('No se pudo obtener la cotización del dólar. Revisá la conexión y recargá la página.', true);
      return;
    }

    let guide;
    if (type === 'moto') {
      const row = state.motoPrices.find((p) => p.year === year);
      guide = { usd: row.ars / usdRate, ars: row.ars, acaraUsd: null, source: 'Guía de precios de motos' };
    } else {
      const val = await API.carValuation(sel.version.value, year);
      if (!val) throw new Error('ArgAutos no tiene precio para esa versión y año.');
      guide = { usd: val.usd, acaraUsd: val.acaraUsd, source: 'CCA' };
    }

    const settings = loadSettings();
    const estimate = window.Pricing.estimate(guide.usd, { km, year, type, usdRate, currentYear: CURRENT_YEAR, settings });

    state.lastQuote = {
      type,
      typeLabel: type === 'moto' ? 'Moto' : 'Auto / Camioneta / Utilitario',
      brand: sel.brand.label,
      model: sel.model.label,
      version: sel.version.label,
      year,
      yearLabel: yearLabel(year),
      km,
      usdRate,
      guide,
      settings,
      estimate,
      specs: window.Specs.fromVersionName(sel.version.label, type),
      date: new Date(),
      safety: null,
      photos: [],
    };
    showResult(state.lastQuote);
    loadExtras(state.lastQuote);
  }

  // ---------- Seguridad y fotos (se cargan después del precio, sin demorarlo) ----------
  function loadExtras(q) {
    const safetyEl = $('resSafety');
    const photosEl = $('resPhotos');
    const current = () => state.lastQuote === q;

    safetyEl.innerHTML = q.type === 'moto'
      ? '<p class="cz-muted cz-small">Latin NCAP no evalúa motos.</p>'
      : '<p class="cz-muted cz-small">Buscando ensayos de Latin NCAP...</p>';
    photosEl.innerHTML = '<p class="cz-photos-note">Buscando fotos...</p>';

    const safetyJob = q.type === 'moto'
      ? Promise.resolve()
      : window.Safety.lookup(q.brand, q.model, q.year).then(
        (s) => { q.safety = s; if (current()) renderSafety(s, q); },
        () => { if (current()) safetyEl.innerHTML = '<p class="cz-muted cz-small">No se pudieron cargar los resultados de Latin NCAP.</p>'; },
      );

    const photosJob = window.Photos.find(q.brand, q.model, q.year).then(
      (list) => { q.photos = list; if (current()) renderPhotos(list); },
      () => { if (current()) photosEl.innerHTML = '<p class="cz-photos-note">No se pudieron cargar fotos de referencia.</p>'; },
    );

    q.extras = Promise.all([safetyJob, photosJob]);
  }

  function safetySummary(r) {
    return r.protocol === '2020'
      ? `${r.stars} ${r.stars === 1 ? 'estrella' : 'estrellas'} (protocolo 2020)`
      : `Adulto ${r.adultStars}★ · Niño ${r.childStars}★ (protocolo anterior)`;
  }

  function renderSafety(s, q) {
    const el = $('resSafety');
    if (!s.main && !s.others.length) {
      el.innerHTML = '<p class="cz-muted cz-small">Latin NCAP no publicó ensayos para este modelo.</p>';
      return;
    }

    let html = '';
    if (s.main) {
      const r = s.main;
      const stars = r.protocol === '2020'
        ? `<div class="cz-stars">${window.Safety.starsText(r.stars)}<small>Protocolo 2020</small></div>`
        : `<div class="cz-stars">${window.Safety.starsText(r.adultStars)}<small>Adulto</small>${window.Safety.starsText(r.childStars)}<small>Niño</small></div>`;
      const pcts = r.protocol === '2020'
        ? `<div class="cz-pcts"><span>Adulto ${r.adulto}%</span><span>Niño ${r.nino}%</span><span>Usuarios vulnerables ${r.usuarios}%</span><span>Asistencia seguridad ${r.asistentes}%</span></div>`
        : '';
      html += `<div class="cz-safety-main">${stars}<div>
        <h4>${escapeHtml(r.name)}</h4>
        <p class="cz-muted cz-small" style="margin-top:2px">Ensayo ${escapeHtml(r.date || '')} · <a href="${escapeHtml(r.url)}" target="_blank" rel="noreferrer">Ver informe</a></p>
        ${pcts}
        ${r.note ? `<p class="cz-safety-note">${escapeHtml(r.note)}</p>` : ''}
      </div></div>`;
    } else {
      html += `<p class="cz-muted cz-small">No hay un ensayo de Latin NCAP hasta ${q.yearLabel} para este modelo.</p>`;
    }

    if (s.others.length) {
      html += `<div class="cz-safety-others">Otros ensayos del modelo:<ul>${s.others
        .map((r) => `<li><a href="${escapeHtml(r.url)}" target="_blank" rel="noreferrer">${escapeHtml(r.name)}</a> — ${escapeHtml(r.date || '')}: ${safetySummary(r)}</li>`)
        .join('')}</ul></div>`;
    }
    html += `<p class="cz-safety-note">${s.related ? 'Resultado de un modelo relacionado. ' : ''}` +
      'Verificá que el ensayo corresponda a la versión (cantidad de airbags y carrocería). ' +
      `Datos de Latin NCAP al ${escapeHtml(s.updated)}.</p>`;
    el.innerHTML = html;
  }

  function renderPhotos(list) {
    const el = $('resPhotos');
    if (!list.length) {
      el.innerHTML = '<p class="cz-photos-note">No se encontraron fotos de referencia para este modelo.</p>';
      return;
    }
    el.innerHTML = list.map((p) => `
      <figure class="cz-photo">
        <a href="${escapeHtml(p.pageUrl)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.title)}" loading="lazy"></a>
        <figcaption>${escapeHtml(p.author)} · ${escapeHtml(p.license)} · Wikimedia Commons</figcaption>
      </figure>`).join('') +
      '<p class="cz-photos-note">Imágenes ilustrativas del modelo: pueden no coincidir exactamente con la versión o el año.</p>';
  }

  function showResult(q) {
    const { usd, ars } = q.estimate;
    $('resTitle').textContent = `${q.brand} ${q.model}`;
    $('resSubtitle').textContent = `${q.version} · ${q.yearLabel} · ${fmtNum.format(q.km)} km`;

    $('resMarketArs').textContent = fmtArs.format(roundTo(ars.market, 100000));
    $('resMarketUsd').textContent = fmtUsd.format(roundTo(usd.market, 100));
    $('resSuggestedArs').textContent = fmtArs.format(roundTo(ars.suggested, 100000));
    $('resSuggestedUsd').textContent = fmtUsd.format(roundTo(usd.suggested, 100));
    $('resRangeArs').textContent = `${fmtArs.format(roundTo(ars.low, 100000))} – ${fmtArs.format(roundTo(ars.high, 100000))}`;
    $('resRangeUsd').textContent = `${fmtUsd.format(roundTo(usd.low, 100))} – ${fmtUsd.format(roundTo(usd.high, 100))}`;

    const acara = q.guide.acaraUsd ? ` · ACARA: ${fmtUsd.format(q.guide.acaraUsd)}` : '';
    const guideText = q.type === 'moto'
      ? `Valor guía: ${fmtArs.format(q.guide.ars)}`
      : `Valor guía CCA: ${fmtUsd.format(q.guide.usd)}${acara}`;
    $('resMeta').textContent =
      `${guideText}. Ajuste de mercado: ${q.settings.ajusteMercado >= 0 ? '+' : ''}${q.settings.ajusteMercado}%. ` +
      `Km de referencia para el año: ${fmtNum.format(q.estimate.referenceKm)}. Dólar blue ${fmtArs.format(q.usdRate)}. ` +
      'Fuente: ArgAutos.';

    const rows = [['Denominación', q.version], ...q.specs];
    $('resSpecs').innerHTML = rows
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
      .join('');

    els.result.hidden = false;
    els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Eventos ----------
  API.setWaitHandler((seconds) => {
    setStatus(seconds
      ? `ArgAutos limita las consultas sin API key. Reintentando en ${seconds} s...`
      : 'Cargando...');
  });

  els.kmInput.addEventListener('input', () => {
    const digits = els.kmInput.value.replace(/\D/g, '');
    els.kmInput.value = digits ? fmtNum.format(Number(digits)) : '';
  });

  els.kmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const km = Number(els.kmInput.value.replace(/\D/g, '') || 0);
    els.quoteBtn.disabled = true;
    setStatus('Consultando precio...');
    try {
      await quote(km);
      setStatus('');
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      els.quoteBtn.disabled = false;
    }
  });

  els.resetBtn.addEventListener('click', () => goBackTo(0));
  $('againBtn').addEventListener('click', () => {
    goBackTo(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('pdfBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Generando...';
    try {
      await window.QuotePdf.generate(state.lastQuote);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Descargar PDF';
    }
  });

  if (!cfg.argautosKey) $('keyNotice').hidden = false;
  initSettings();
  loadDolar();
  render();
})();
