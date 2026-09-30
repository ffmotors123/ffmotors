/*
 * Ficha técnica derivada de la denominación de la versión (ej. "D/C 2.8 TDi 4x4 SRX 6AT").
 * ArgAutos no trae datos técnicos: solo se muestra lo que se puede leer con certeza del nombre.
 */
(function () {
  const DIESEL = /\b(DIESEL|TD|TDI|TDCI|HDI|BLUEHDI|CRDI|D-?4D|MULTIJET|JTD|DCI|TURBODIESEL)\b/i;

  function body(name) {
    const doors = name.match(/\b([2-5])P\b/i);
    if (doors) return `${doors[1]} puertas`;
    if (/\bD\/C\b/i.test(name)) return 'Pick-up doble cabina';
    if (/\bC\/S\b/i.test(name)) return 'Pick-up cabina simple';
    if (/\bC\/E\b/i.test(name)) return 'Pick-up cabina extendida';
    if (/\bC\/C\b/i.test(name)) return 'Cabina y chasis';
    if (/\bFURG(ON|ÓN)?\b/i.test(name)) return 'Furgón';
    return null;
  }

  function engine(name) {
    const parts = [];
    const disp = name.match(/\b(\d)[.,](\d)\b/);
    if (disp) parts.push(`${disp[1]}.${disp[2]} L`);
    const cyl = name.match(/\b(V6|V8|V10|V12|W12)\b/i);
    if (cyl) parts.push(cyl[1].toUpperCase());
    if (/\b(T|TURBO|TSI|TFSI|THP|TB|TURBODIESEL)\b/i.test(name) || /\bTD/i.test(name)) parts.push('Turbo');
    return parts.length ? parts.join(' ') : null;
  }

  function fuel(name) {
    if (/\b(HEV|PHEV|MHEV|HYBRID|H[IÍ]BRIDO)\b/i.test(name)) return 'Híbrido';
    if (/\b(EV|EL[EÉ]CTRICO|ELECTRIC)\b/i.test(name)) return 'Eléctrico';
    if (DIESEL.test(name)) return 'Diésel';
    if (/\bGNC\b/i.test(name)) return 'Nafta / GNC';
    if (/\bNAFTA\b/i.test(name)) return 'Nafta';
    return null;
  }

  function traction(name) {
    if (/\b4X4\b|\b4WD\b/i.test(name)) return '4x4';
    if (/\bAWD\b/i.test(name)) return 'Integral (AWD)';
    if (/\b4X2\b/i.test(name)) return '4x2';
    return null;
  }

  function transmission(name) {
    if (/\bCVT\b/i.test(name)) return 'Automática CVT';
    const m = name.match(/\b(\d{1,2})\s?(MT|AT|DCT|DSG|TA|TM)\b/i) || name.match(/\b(MT|AT|DCT|DSG)(\d{1,2})\b/i);
    if (m) {
      const [gears, kind] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
      const type = /^(MT|TM)$/i.test(kind) ? 'Manual' : 'Automática';
      return `${type} ${gears} vel.`;
    }
    if (/\b(AT|AUT|AUTOMATICO|AUTOMÁTICO|TIPTRONIC)\b/i.test(name)) return 'Automática';
    if (/\bMT\b/i.test(name)) return 'Manual';
    return null;
  }

  function power(name) {
    const m = name.match(/\b(\d{2,3})\s?(CV|HP)\b/i);
    return m ? `${m[1]} CV` : null;
  }

  function motoDisplacement(name) {
    const nums = (name.match(/\b\d{2,4}\b/g) || []).map(Number).filter((n) => n >= 49 && n <= 2500);
    return nums.length ? `${nums[0]} cc` : null;
  }

  /** Devuelve [[etiqueta, valor], ...] solo con los datos detectados. */
  function fromVersionName(name, type) {
    const rows = type === 'moto'
      ? [['Cilindrada', motoDisplacement(name)], ['Transmisión', /\bAT\b/i.test(name) ? 'Automática' : null]]
      : [
        ['Carrocería', body(name)],
        ['Motor', engine(name)],
        ['Combustible', fuel(name)],
        ['Potencia', power(name)],
        ['Transmisión', transmission(name)],
        ['Tracción', traction(name)],
      ];
    return rows.filter(([, v]) => v);
  }

  window.Specs = { fromVersionName };
})();
