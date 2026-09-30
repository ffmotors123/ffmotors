/*
 * Resultados de Latin NCAP (data/latin-ncap.json, generado por herramientas/actualizar-latinncap.ps1).
 * Busca los ensayos del modelo y elige el que corresponde al año del vehículo.
 */
(function () {
  const BRAND_ALIASES = { mb: 'mercedes benz', 'great wall motors': 'great wall', gwm: 'great wall' };
  // Palabras de la denominación ArgAutos que no forman parte del nombre comercial del modelo.
  const MODEL_NOISE = new Set(['pick', 'up', 'cover', 'cabina', 'doble', 'simple', 'nuevo', 'nueva', 'new', 'sedan', 'hatchback', 'furgon', 'chasis']);

  let dataPromise = null;

  const normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const canonBrand = (b) => { const n = normalize(b); return BRAND_ALIASES[n] || n; };

  function modelTokens(model) {
    const tokens = normalize(model).split(' ').filter((t) => t && !MODEL_NOISE.has(t));
    return tokens.length ? tokens : normalize(model).split(' ');
  }

  function load() {
    if (!dataPromise) {
      dataPromise = fetch('data/latin-ncap.json')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .catch((err) => { dataPromise = null; throw err; });
    }
    return dataPromise;
  }

  /**
   * @returns { main, others, updated } — main: ensayo aplicable al año (o null); others: resto de ensayos del modelo.
   */
  async function lookup(brand, model, year) {
    const data = await load();
    const brandKey = canonBrand(brand);
    const tokens = modelTokens(model);

    const ofBrand = data.results.filter((r) => canonBrand(r.brand) === brandKey);
    const hasAll = (r, toks) => { const words = new Set(normalize(r.name).split(' ')); return toks.every((t) => words.has(t)); };

    let matches = ofBrand.filter((r) => hasAll(r, tokens));
    let related = false;
    if (!matches.length && tokens.length > 1) {
      matches = ofBrand.filter((r) => hasAll(r, tokens.slice(0, 1)));
      related = matches.length > 0;
    }
    matches.sort((a, b) => (b.year || 0) - (a.year || 0));

    // Ensayo aplicable: el más reciente hecho hasta el año-modelo (los ensayos de fin de año suelen cubrir el siguiente).
    const main = year === 0 ? matches[0] : matches.find((r) => r.year && r.year <= year + 1);
    return {
      main: main || null,
      others: matches.filter((r) => r !== main),
      related,
      updated: data.updated,
    };
  }

  function starsText(n) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
  }

  window.Safety = { lookup, starsText };
})();
