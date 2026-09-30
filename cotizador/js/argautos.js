/*
 * Cliente de la API de ArgAutos (https://argautos.com/docs/api).
 * - Cachea las respuestas en el navegador: el catálogo cambia poco y los precios se actualizan una vez por mes.
 * - Serializa las consultas y, si se supera el límite (429), espera lo que indica la API y reintenta.
 */
(function () {
  const cfg = window.COTIZADOR_CONFIG;
  const DAY = 24 * 60 * 60 * 1000;
  const TTL = { catalog: 30 * DAY, prices: 3 * DAY };
  const CACHE_PREFIX = 'argautos:v1:';

  let queue = Promise.resolve();
  let onWait = () => {};

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { t, ttl, data } = JSON.parse(raw);
      return Date.now() - t < ttl ? data : null;
    } catch {
      return null;
    }
  }

  function cacheSet(key, data, ttl) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), ttl, data }));
    } catch {
      // Sin almacenamiento disponible: se sigue sin caché.
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitWithCountdown(seconds) {
    for (let s = seconds; s > 0; s--) {
      onWait(s);
      await sleep(1000);
    }
    onWait(0);
  }

  async function fetchJson(path, params) {
    const url = new URL(cfg.argautosBase + path);
    Object.entries(params || {}).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, v));
    const headers = { Accept: 'application/json' };
    if (cfg.argautosKey) headers.Authorization = `Bearer ${cfg.argautosKey}`;

    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(url, { headers });
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        await waitWithCountdown(Number(body.retry_after || res.headers.get('Retry-After') || 60) + 1);
        continue;
      }
      if (!res.ok) throw new Error(`ArgAutos respondió ${res.status} en ${path}`);
      return res.json();
    }
    throw new Error('ArgAutos: límite de consultas excedido, probá en unos minutos.');
  }

  // Todas las consultas pasan por una cola para no disparar varias a la vez contra el límite.
  function get(path, params, ttl) {
    const key = path + '?' + new URLSearchParams(params || {}).toString();
    const cached = cacheGet(key);
    if (cached) return Promise.resolve(cached);
    const job = queue.then(async () => {
      const again = cacheGet(key);
      if (again) return again;
      const data = await fetchJson(path, params);
      cacheSet(key, data, ttl);
      return data;
    });
    queue = job.catch(() => {});
    return job;
  }

  // Recorre todas las páginas de un listado paginado.
  async function getAll(path, params, ttl) {
    const out = [];
    for (let page = 1; page <= 20; page++) {
      const r = await get(path, { ...params, per_page: 100, page }, ttl);
      out.push(...r.data);
      if (!r.links || !r.links.next || !r.data.length) break;
    }
    return { data: out };
  }

  const byName = (a, b) => a.name.localeCompare(b.name, 'es');

  // ---------- Autos, camionetas y utilitarios (catálogo CCA) ----------
  async function carBrands() {
    const r = await getAll('/brands', {}, TTL.catalog);
    return r.data.map((b) => ({ id: b.id, name: b.name })).sort(byName);
  }

  async function carModels(brandId) {
    const r = await getAll(`/brands/${brandId}/models`, {}, TTL.catalog);
    return r.data.map((m) => ({ id: m.id, name: m.name })).sort(byName);
  }

  async function carVersions(modelId, year) {
    const r = await getAll(`/models/${modelId}/versions`, { year }, TTL.catalog);
    return r.data.map((v) => ({ id: v.id, name: v.name || v.name_raw })).sort(byName);
  }

  async function carValuation(versionId, year) {
    const r = await get(`/versions/${versionId}/valuations`, { year, sources: 'acara' }, TTL.prices);
    const row = r.data.find((d) => d.year === year) || r.data[0];
    if (!row) return null;
    return {
      usd: Number(row.price),
      acaraUsd: row.acara_price ? Number(row.acara_price) : null,
    };
  }

  // ---------- Motos ----------
  async function motoBrands() {
    const r = await getAll('/motos/brands', {}, TTL.catalog);
    return r.data.map((b) => ({ id: b.id, name: b.name })).sort(byName);
  }

  async function motoModels(brandId) {
    const r = await getAll(`/motos/brands/${brandId}/models`, {}, TTL.catalog);
    return r.data.map((m) => ({ id: m.id, name: m.name })).sort(byName);
  }

  async function motoVersions(modelId) {
    const r = await getAll(`/motos/models/${modelId}/versions`, {}, TTL.catalog);
    return r.data.map((v) => ({ id: v.moto_id, name: v.version_description || v.name })).sort(byName);
  }

  // Devuelve [{ year, ars }]; year 0 = 0 km.
  async function motoPrices(motoId) {
    const r = await get(`/motos/versions/${motoId}/prices`, { currency: 'ars' }, TTL.prices);
    return r.data.filter((d) => d.price).map((d) => ({ year: d.year, ars: Number(d.price) }));
  }

  window.ArgAutos = {
    carBrands, carModels, carVersions, carValuation,
    motoBrands, motoModels, motoVersions, motoPrices,
    setWaitHandler(fn) { onWait = fn; },
  };
})();
