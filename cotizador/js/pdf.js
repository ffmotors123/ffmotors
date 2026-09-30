(function () {
  const LOGO_URL = '../img/Dise%C3%B1o%20sin%20t%C3%ADtulo.png';
  const C = {
    bg: [6, 17, 31], accent: [51, 167, 255], sand: [242, 201, 125],
    text: [18, 32, 51], soft: [85, 99, 119], line: [219, 225, 236], white: [255, 255, 255],
  };

  const fmtArs = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmtUsd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('es-AR');
  // Las fuentes estándar del PDF no tienen espacios finos: se normalizan.
  const clean = (s) => String(s).replace(/[  ]/g, ' ');
  const ars = (v) => clean(fmtArs.format(Math.round(v / 100000) * 100000));
  const usd = (v) => clean(fmtUsd.format(Math.round(v / 100) * 100));

  function loadLogo() {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        try { resolve(canvas.toDataURL('image/png')); } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = LOGO_URL;
    });
  }

  // Carga una imagen externa (con CORS) y la devuelve como JPEG para el PDF.
  function loadImage(url, maxW = 900) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve({ data: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function sectionTitle(doc, text, x, y) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.text);
    doc.text(text, x, y);
    doc.setFillColor(...C.accent);
    doc.rect(x, y + 2.5, 18, 0.9, 'F');
  }

  // Las fuentes estándar no tienen el carácter ★: las estrellas se dibujan como polígonos.
  function drawStars(doc, count, x, y, size = 2.2) {
    for (let s = 0; s < 5; s++) {
      const cx = x + s * size * 2.4;
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? size : size * 0.45;
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        pts.push([cx + r * Math.cos(a), y + r * Math.sin(a)]);
      }
      const segs = pts.slice(1).map((p, k) => [p[0] - pts[k][0], p[1] - pts[k][1]]);
      doc.setDrawColor(...C.sand);
      doc.setFillColor(...(s < count ? C.sand : C.white));
      doc.setLineWidth(0.25);
      doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'FD', true);
    }
    return x + 5 * size * 2.4;
  }

  function drawSafety(doc, s, yearLabel, M, y, W) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    if (!s || (!s.main && !s.others.length)) {
      doc.setTextColor(...C.soft);
      doc.text('Latin NCAP no publicó ensayos para este modelo.', M, y);
      return y + 6;
    }
    const r = s.main;
    if (r) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.text);
      const title = doc.splitTextToSize(clean(`${r.name} — ensayo ${r.date || ''}`), W - 2 * M);
      doc.text(title, M, y);
      y += title.length * 4.5 + 2;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.soft);
      if (r.protocol === '2020') {
        const endX = drawStars(doc, r.stars, M + 2.2, y);
        doc.text(`Protocolo 2020  ·  Adulto ${r.adulto}%  ·  Niño ${r.nino}%  ·  Usuarios vulnerables ${r.usuarios}%  ·  Asistencia ${r.asistentes}%`, endX + 3, y + 1);
        y += 7;
      } else {
        doc.text('Adulto', M, y + 1);
        const endX = drawStars(doc, r.adultStars, M + 14, y);
        doc.text('Niño', endX + 6, y + 1);
        drawStars(doc, r.childStars, endX + 16, y);
        doc.text('(protocolo anterior a 2020)', endX + 48, y + 1);
        y += 7;
      }
    } else {
      doc.setTextColor(...C.soft);
      doc.text(`Sin ensayo de Latin NCAP hasta ${yearLabel} para este modelo.`, M, y);
      y += 6;
    }
    doc.setFontSize(7.5);
    doc.setTextColor(...C.soft);
    const others = s.others.slice(0, 2).map((o) => o.protocol === '2020'
      ? `${o.name} (${o.date}): ${o.stars}/5 estrellas`
      : `${o.name} (${o.date}): adulto ${o.adultStars}/5, niño ${o.childStars}/5`);
    const lines = doc.splitTextToSize(clean(
      (others.length ? `Otros ensayos: ${others.join(' | ')}. ` : '') +
      'Verificar que el ensayo corresponda a la versión (airbags y carrocería). Fuente: Latin NCAP (latinncap.com).'), W - 2 * M);
    doc.text(lines.slice(0, 3), M, y);
    return y + Math.min(lines.length, 3) * 3.5;
  }

  function drawFooter(doc, W, M) {
    const fy = 266;
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(M, fy, W - M, fy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.soft);
    doc.text(doc.splitTextToSize(
      'Valores estimados a partir de precios de referencia del mercado automotor a la fecha de emisión. No constituyen una oferta ' +
      'de compra ni una tasación oficial; el valor final depende del estado del vehículo, documentación y verificación técnica. ' +
      'Fuente de precios de referencia: ArgAutos (argautos.com).', W - 2 * M), M, fy + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);
    doc.text('ffmotors.com.ar  ·  @ffmotors_ok', M, fy + 18);
  }

  function quoteNumber(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `FF-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  }

  async function generate(q) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const M = 16;
    if (q.extras) await q.extras; // seguridad y fotos se cargan en segundo plano
    const logo = await loadLogo();

    // ---- Encabezado ----
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, W, 40, 'F');
    doc.setFillColor(...C.accent);
    doc.rect(0, 40, W, 1.2, 'F');

    let x = M;
    if (logo) {
      doc.addImage(logo, 'PNG', M, 8, 24, 24);
      x = M + 30;
    }
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('FF MOTORS', x, 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(200, 214, 235);
    doc.text('Informe de valuación de mercado', x, 26);

    doc.setFontSize(9);
    doc.text(`N° ${quoteNumber(q.date)}`, W - M, 17, { align: 'right' });
    doc.text(q.date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, 23, { align: 'right' });
    doc.text('Córdoba, Argentina', W - M, 29, { align: 'right' });

    // ---- Vehículo ----
    let y = 56;
    doc.setTextColor(...C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(q.typeLabel.toUpperCase(), M, y);
    y += 8;
    doc.setTextColor(...C.text);
    doc.setFontSize(20);
    doc.text(clean(`${q.brand} ${q.model}`), M, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.soft);
    const sub = doc.splitTextToSize(clean(`${q.version}  ·  ${q.yearLabel}  ·  ${fmtNum.format(q.km)} km`), W - 2 * M);
    doc.text(sub, M, y);
    y += (sub.length - 1) * 5;

    // ---- Valores ----
    y += 10;
    const { estimate: e } = q;
    const boxW = (W - 2 * M - 8) / 3;
    const boxes = [
      { label: 'VALOR DE MERCADO', main: ars(e.ars.market), sub: usd(e.usd.market), fill: C.bg, fg: C.white, subFg: [200, 214, 235] },
      { label: 'PRECIO SUGERIDO', main: ars(e.ars.suggested), sub: usd(e.usd.suggested), fill: [253, 246, 232], fg: C.text, subFg: C.soft, border: C.sand },
      { label: 'RANGO DE MERCADO', main: ars(e.ars.low), sub: `a ${ars(e.ars.high)}`, fill: [244, 246, 250], fg: C.text, subFg: C.soft },
    ];
    boxes.forEach((b, i) => {
      const bx = M + i * (boxW + 4);
      doc.setFillColor(...b.fill);
      if (b.border) {
        doc.setDrawColor(...b.border);
        doc.setLineWidth(0.6);
        doc.roundedRect(bx, y, boxW, 30, 3, 3, 'FD');
      } else {
        doc.roundedRect(bx, y, boxW, 30, 3, 3, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...(i === 0 ? C.accent : C.soft));
      doc.text(b.label, bx + 5, y + 8);
      doc.setFontSize(i === 2 ? 11 : 13.5);
      doc.setTextColor(...b.fg);
      doc.text(b.main, bx + 5, y + 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...b.subFg);
      doc.text(b.sub, bx + 5, y + 25);
    });

    y += 38;
    doc.setFontSize(8.5);
    doc.setTextColor(...C.soft);
    const notes = [
      `Valor de mercado calculado para ${fmtNum.format(q.km)} km (referencia para el año: ${fmtNum.format(e.referenceKm)} km). ` +
        'Precio sugerido: unidad en perfecto estado de conservación.',
      `Tipo de cambio: dólar blue ${clean(fmtArs.format(q.usdRate))}.`,
    ];
    notes.forEach((n) => {
      const lines = doc.splitTextToSize(n, W - 2 * M);
      doc.text(lines, M, y);
      y += lines.length * 4.2;
    });

    // ---- Ficha técnica ----
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.text);
    doc.text('Ficha técnica', M, y);
    doc.setFillColor(...C.accent);
    doc.rect(M, y + 2.5, 18, 0.9, 'F');
    y += 10;

    const rows = [
      ['Marca', q.brand], ['Modelo', q.model],
      ['Año', q.yearLabel], ['Kilometraje', `${fmtNum.format(q.km)} km`],
      ...q.specs,
    ];
    const colW = (W - 2 * M - 8) / 2;
    rows.forEach((r, i) => {
      const col = i % 2;
      const rx = M + col * (colW + 8);
      const ry = y + Math.floor(i / 2) * 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...C.soft);
      doc.text(r[0], rx, ry);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.text);
      doc.text(clean(r[1] || '-'), rx + colW, ry, { align: 'right' });
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.2);
      doc.line(rx, ry + 3, rx + colW, ry + 3);
    });
    y += Math.ceil(rows.length / 2) * 9 + 2;

    // Denominación completa en una fila propia: suele ser larga.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.soft);
    doc.text('Versión', M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    const ver = doc.splitTextToSize(clean(q.version), W - 2 * M - 30);
    doc.text(ver, W - M, y, { align: 'right' });
    y += ver.length * 4.5 + 6;

    // ---- Seguridad ----
    if (q.type !== 'moto') {
      sectionTitle(doc, 'Seguridad · Latin NCAP', M, y);
      y += 10;
      y = drawSafety(doc, q.safety, q.yearLabel, M, y, W);
    }

    drawFooter(doc, W, M);

    // ---- Fotos de referencia (página 2) ----
    const photos = await Promise.all((q.photos || []).slice(0, 4).map((p) =>
      loadImage(p.url).then((img) => (img ? { ...p, img } : null))));
    const ok = photos.filter(Boolean);
    if (ok.length) {
      doc.addPage();
      doc.setFillColor(...C.bg);
      doc.rect(0, 0, W, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...C.white);
      doc.text(clean(`FF MOTORS  ·  ${q.brand} ${q.model} ${q.yearLabel}`), M, 10.5);

      sectionTitle(doc, 'Fotos de referencia', M, 30);
      const cellW = (W - 2 * M - 6) / 2;
      const cellH = cellW * 0.75;
      ok.forEach((p, i) => {
        const cx = M + (i % 2) * (cellW + 6);
        const cy = 40 + Math.floor(i / 2) * (cellH + 16);
        const ratio = p.img.width / p.img.height;
        // Recorte tipo "cover" dentro de la celda 4:3.
        let dw = cellW;
        let dh = cellW / ratio;
        if (dh < cellH) { dh = cellH; dw = cellH * ratio; }
        doc.saveGraphicsState();
        doc.rect(cx, cy, cellW, cellH, null);
        doc.clip();
        doc.discardPath();
        doc.addImage(p.img.data, 'JPEG', cx - (dw - cellW) / 2, cy - (dh - cellH) / 2, dw, dh);
        doc.restoreGraphicsState();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...C.soft);
        const credit = doc.splitTextToSize(clean(`${p.author} · ${p.license} · Wikimedia Commons`), cellW);
        doc.text(credit.slice(0, 2), cx, cy + cellH + 4);
      });
      doc.setFontSize(8);
      doc.setTextColor(...C.soft);
      doc.text('Imágenes ilustrativas del modelo: pueden no coincidir exactamente con la versión o el año.', M, 40 + 2 * (cellH + 16) + 2);
      drawFooter(doc, W, M);
    }

    const name = `Cotizacion_${q.brand}_${q.model}_${q.yearLabel}`.replace(/[^\w\-]+/g, '_');
    doc.save(`${name}.pdf`);
  }

  window.QuotePdf = { generate };
})();
