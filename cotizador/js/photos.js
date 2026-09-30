/*
 * Fotos de referencia desde Wikimedia Commons (licencias libres, se muestra autor y licencia de cada una).
 */
(function () {
  const API = 'https://commons.wikimedia.org/w/api.php';
  const NOISE = new Set(['pick', 'up', 'cover', 'cabina', 'doble', 'simple', 'nuevo', 'nueva', 'new', 'sedan', 'hatchback']);
  // Palabras completas: "toy" no debe excluir "Toyota" ni "seat" a la marca SEAT en otro contexto.
  const EXCLUDE = /\b(concept|interior|interieur|dashboard|engine|motor bay|badge|logo|emblem|wheels?|rims?|steering|seats|trunk|boot|crash|accident|wreck|toy|toys|miniature|diecast|lego|model car|scale model|prototype|rally|racing|race car|police|polic[ií]a|taxi|ambulance|security|army|military|fire service|snowplow|fcev|bev)\b/i;

  const normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  function modelWords(model) {
    const words = normalize(model).split(' ').filter((w) => w && !NOISE.has(w));
    return words.length ? words : normalize(model).split(' ');
  }

  function score(title, year) {
    const years = (title.match(/\b(19[5-9]\d|20[0-3]\d)\b/g) || []).map(Number);
    if (!years.length || !year) return 3;
    const diff = Math.min(...years.map((y) => Math.abs(y - year)));
    return 10 - Math.min(diff, 10);
  }

  async function search(query) {
    const url = new URL(API);
    Object.entries({
      action: 'query', format: 'json', origin: '*',
      generator: 'search', gsrsearch: query, gsrnamespace: 6, gsrlimit: 30,
      prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: 800,
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Wikimedia respondió ${res.status}`);
    const data = await res.json();
    return data.query ? Object.values(data.query.pages) : [];
  }

  /** Devuelve hasta `limit` fotos: [{ url, pageUrl, title, author, license }] */
  async function find(brand, model, year, limit = 4) {
    const words = modelWords(model);
    const brandName = titleCase(brand);
    const modelName = titleCase(words.join(' '));

    const usable = (required) => (p) => {
      const info = p.imageinfo && p.imageinfo[0];
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) return false;
      const t = normalize(p.title);
      return required.every((w) => t.includes(w)) && !EXCLUDE.test(p.title);
    };
    let candidates = (await search(`${brandName} ${modelName}`)).filter(usable(words));
    // Pocas fotos con el nombre completo (ej. "Saveiro Cross"): se prueba solo con la palabra principal.
    if (candidates.length < 2 && words.length > 1) {
      candidates = (await search(`${brandName} ${titleCase(words[0])}`)).filter(usable(words.slice(0, 1)));
    }

    return candidates
      .map((p) => ({ p, s: score(p.title, year) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(({ p }) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        return {
          url: info.thumburl || info.url,
          pageUrl: info.descriptionurl,
          title: p.title.replace(/^File:/, '').replace(/\.\w+$/, ''),
          author: stripHtml(meta.Artist && meta.Artist.value) || 'Autor desconocido',
          license: stripHtml(meta.LicenseShortName && meta.LicenseShortName.value) || 'Licencia libre',
        };
      });
  }

  window.Photos = { find };
})();
