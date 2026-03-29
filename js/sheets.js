// =============================================
// Google Sheets Reader (JSONP — sin CORS)
// =============================================

/**
 * Lee una Google Sheet publicada usando la Google Visualization API
 * via inyeccion de <script> (JSONP). Esto evita CORS completamente,
 * funciona incluso abriendo el HTML desde file://.
 *
 * La hoja DEBE estar publicada en la web:
 *   Archivo → Compartir → Publicar en la web
 *
 * Columnas esperadas:
 *   nombre | descripcion | photo_url | precio | tiene_stock | categoria
 */

function fetchWinesFromSheet() {
  return new Promise((resolve, reject) => {
    // Nombre unico para el callback
    const callbackName = '_sheetCallback_' + Date.now();

    // Timeout por si falla
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout cargando datos de Google Sheets'));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      const script = document.getElementById('sheet-loader');
      if (script) script.remove();
    }

    // Callback global que Google va a invocar
    window[callbackName] = function (response) {
      cleanup();

      console.log('Google Sheets response:', JSON.stringify(response, null, 2));

      if (!response || !response.table) {
        reject(new Error('Respuesta invalida de Google Sheets'));
        return;
      }

      try {
        const wines = parseGvizTable(response.table);
        resolve(wines);
      } catch (err) {
        reject(err);
      }
    };

    // Inyectar <script> con la URL de Google Visualization API
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq`
      + `?tqx=out:json;responseHandler:${callbackName}`
      + `&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;

    const script = document.createElement('script');
    script.id = 'sheet-loader';
    script.src = url;
    script.onerror = () => {
      cleanup();
      reject(new Error('No se pudo cargar el script de Google Sheets'));
    };
    document.head.appendChild(script);
  });
}

function parseGvizTable(table) {
  // Extraer nombres de columnas
  const headers = table.cols.map(col =>
    (col.label || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  const wines = [];

  for (let i = 0; i < table.rows.length; i++) {
    const cells = table.rows[i].c;
    const row = {};

    headers.forEach((header, idx) => {
      const cell = cells[idx];
      row[header] = cell ? (cell.v != null ? String(cell.v) : '') : '';
    });

    // Saltear filas vacias
    if (!row['nombre'] || !row['nombre'].trim()) return;

    wines.push({
      id: i + 1,
      nombre: (row['nombre'] || 'Sin nombre').trim(),
      descripcion: (row['descripcion'] || '').trim(),
      photo_url: (row['photo_url'] || '').trim(),
      precio: parseFloat(row['precio']) || 0,
      tiene_stock: (row['tiene_stock'] || '').toUpperCase().trim() === 'SI',
      categoria: (row['categoria'] || 'Otros').trim(),
    });
  }

  return wines;
}
