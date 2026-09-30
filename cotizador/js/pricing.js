/*
 * Valor de mercado a partir del precio guía (CCA vía ArgAutos).
 * Funciones puras: se reutilizan tal cual en el backend cuando el cotizador pase al servidor.
 */
(function (root) {
  const CONFIG = {
    kmPerYear: { auto: 15000, moto: 6000 },
    kmAdjustPer10k: 0.012,          // cada 10.000 km de diferencia mueve el precio 1,2%
    kmFactorLimits: [0.75, 1.1],    // tope del ajuste por kilometraje
  };

  function expectedKm(year, type, currentYear) {
    if (year === 0) return 0; // 0 km
    const perYear = CONFIG.kmPerYear[type] || CONFIG.kmPerYear.auto;
    return Math.round(Math.max(currentYear - year, 0.5) * perYear);
  }

  /**
   * @param guideUsd precio guía en USD para ese año-modelo
   * @param opts { km, year, type: 'auto'|'moto', usdRate, currentYear, settings: { ajusteMercado, primaEstado, rango } }
   */
  function estimate(guideUsd, opts) {
    const s = opts.settings;
    const refKm = expectedKm(opts.year, opts.type, opts.currentYear);
    const [minF, maxF] = CONFIG.kmFactorLimits;
    const kmFactor = Math.min(maxF, Math.max(minF, 1 - ((opts.km - refKm) / 10000) * CONFIG.kmAdjustPer10k));

    const base = guideUsd * (1 + s.ajusteMercado / 100);
    const market = base * kmFactor;
    const usd = {
      guide: guideUsd,
      market,
      low: market * (1 - s.rango / 100),
      high: market * (1 + s.rango / 100),
      suggested: base * (1 + s.primaEstado / 100),
    };

    return {
      usd,
      ars: Object.fromEntries(Object.entries(usd).map(([k, v]) => [k, v * opts.usdRate])),
      referenceKm: refKm,
      kmFactor,
    };
  }

  const api = { CONFIG, estimate, expectedKm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
