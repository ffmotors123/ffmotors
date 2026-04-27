// =============================================
// Google Sheets Reader (JSONP - sin CORS)
// =============================================

/*
 * Columnas esperadas:
 * tipo | marca | modelo | version | ano | km | color | combustible |
 * transmision | precio | financiar / recibir usado | foto1 ... foto15
 */

async function fetchVehiclesFromSheet() {
  const candidateSheets = buildSheetCandidates();
  let lastError = null;

  for (const sheetName of candidateSheets) {
    try {
      return await fetchSheetByName(sheetName);
    } catch (error) {
      lastError = error;
      console.warn(`No se pudo leer la hoja "${sheetName}":`, error.message);
    }
  }

  throw lastError || new Error('No se pudo leer Google Sheets');
}

async function fetchSoldVehiclesFromSheet() {
  const sheetNames = Array.isArray(CONFIG.SHEET_NAME) ? CONFIG.SHEET_NAME : [CONFIG.SHEET_NAME];
  const candidateSheets = [
    sheetNames[1],
    'vendidos',
    'Vendidos',
    'unidades vendidas',
    'Unidades Vendidas',
  ].filter(Boolean);

  let lastError = null;

  for (const sheetName of [...new Set(candidateSheets)]) {
    try {
      const table = await fetchRawSheetTable(sheetName);
      return parseSoldGvizTable(table);
    } catch (error) {
      lastError = error;
      console.warn(`No se pudo leer la hoja de vendidos "${sheetName}":`, error.message);
    }
  }

  throw lastError || new Error('No se pudo leer la hoja de vendidos');
}

function buildSheetCandidates() {
  const configuredSheets = Array.isArray(CONFIG.SHEET_NAME) ? CONFIG.SHEET_NAME : [CONFIG.SHEET_NAME];
  const candidates = [
    configuredSheets[0],
    'catalogo_autos',
    'catalogo_vinos',
    'Sheet1',
    'Hoja 1',
  ];

  return [...new Set(candidates.filter(Boolean))];
}

function fetchSheetByName(sheetName) {
  return fetchRawSheetTable(sheetName).then(parseGvizTable);
}

function fetchRawSheetTable(sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = `_sheetCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const scriptId = `sheet-loader-${callbackName}`;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout cargando la hoja ${sheetName}`));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      const script = document.getElementById(scriptId);
      if (script) script.remove();
    }

    window[callbackName] = function (response) {
      cleanup();

      if (!response || response.status === 'error') {
        reject(new Error(response?.errors?.[0]?.detailed_message || `Respuesta invalida para ${sheetName}`));
        return;
      }

      if (!response.table) {
        reject(new Error(`La hoja ${sheetName} no devolvio tabla`));
        return;
      }

      resolve(response.table);
    };

    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq`
      + `?tqx=out:json;responseHandler:${callbackName}`
      + `&sheet=${encodeURIComponent(sheetName)}`;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = url;
    script.onerror = () => {
      cleanup();
      reject(new Error(`No se pudo cargar el script para ${sheetName}`));
    };
    document.head.appendChild(script);
  });
}

function parseGvizTable(table) {
  const headers = table.cols.map(col => normalizeHeader(col.label || col.id || ''));
  const vehicles = [];

  for (let index = 0; index < table.rows.length; index++) {
    const cells = table.rows[index].c || [];
    const row = {};

    headers.forEach((header, headerIndex) => {
      row[header] = getCellValue(cells[headerIndex]);
    });

    if (!hasVehicleIdentity(row)) {
      continue;
    }

    const photos = collectPhotos(row);
    const coverPhoto = getCoverPhotoFromRow(row);
    const marca = cleanText(row.marca) || 'Marca';
    const modelo = cleanText(row.modelo) || 'Modelo';
    const version = cleanText(row.version) || 'Version no especificada';
    const tipo = cleanText(row.tipo) || 'Auto';
    const year = parseInteger(row.ano);
    const km = parseInteger(row.km);
    const precio = parseInteger(row.precio);
    const financiarRecibirUsado = getFinancingTradeInValue(row);
    const characteristics = getVehicleCharacteristicsFromRow(row);

    vehicles.push({
      id: index + 1,
      tipo,
      marca,
      modelo,
      version,
      year,
      km,
      color: cleanText(row.color) || 'No informado',
      combustible: cleanText(row.combustible) || 'No informado',
      transmision: cleanText(row.transmision) || 'No informado',
      precio,
      financiarRecibirUsado,
      characteristics,
      photos,
      coverPhoto,
      title: `${marca} ${modelo}`.trim(),
      searchBlob: [
        tipo,
        marca,
        modelo,
        version,
        year ? String(year) : '',
        km ? String(km) : '',
        cleanText(row.color),
        cleanText(row.combustible),
        cleanText(row.transmision),
        financiarRecibirUsado,
        characteristics.join(' '),
      ].join(' ').toLowerCase(),
    });
  }

  return vehicles;
}

function parseSoldGvizTable(table) {
  const headers = table.cols.map(col => normalizeHeader(col.label || col.id || ''));
  const soldVehicles = [];
  const titleColumnIndex = headers.findIndex(header => ['unidadesvendidas', 'unidades_vendidas', 'unidadesvendida', 'unidadvendida', 'unidadvendidas', 'unidad', 'nombre'].includes(header));
  const image1ColumnIndex = headers.findIndex(header => ['foto1', 'imagen1'].includes(header));
  const image2ColumnIndex = headers.findIndex(header => ['foto2', 'imagen2'].includes(header));
  const commentColumnIndex = headers.findIndex(header => ['comentario', 'comentarios', 'comentariocliente', 'observacion', 'observaciones', 'descripcion'].includes(header));
  const hasSecondImageColumn = image2ColumnIndex >= 0;
  const fallbackCommentColumnIndex = commentColumnIndex >= 0
    ? commentColumnIndex
    : (!hasSecondImageColumn && headers.length >= 3 ? 2 : 3);

  for (let index = 0; index < table.rows.length; index++) {
    const cells = table.rows[index].c || [];
    const row = {};

    headers.forEach((header, headerIndex) => {
      row[header] = getCellValue(cells[headerIndex]);
    });

    const title = cleanText(row.unidadesvendidas)
      || cleanText(row.unidades_vendidas)
      || cleanText(row.unidadesvendida)
      || cleanText(row.unidadvendida)
      || cleanText(row.unidadvendidas)
      || cleanText(row.unidad)
      || cleanText(row.nombre)
      || getCellValue(cells[titleColumnIndex >= 0 ? titleColumnIndex : 0]);
    const image1 = normalizeSinglePhoto(row.foto1)
      || normalizeSinglePhoto(row.imagen1)
      || normalizeSinglePhoto(getCellValue(cells[image1ColumnIndex >= 0 ? image1ColumnIndex : 1]));
    const image2 = normalizeSinglePhoto(row.foto2)
      || normalizeSinglePhoto(row.imagen2)
      || (hasSecondImageColumn ? normalizeSinglePhoto(getCellValue(cells[image2ColumnIndex])) : '');
    const comment = cleanText(row.comentario)
      || cleanText(row.comentarios)
      || cleanText(row.comentariocliente)
      || cleanText(row.observacion)
      || cleanText(row.observaciones)
      || cleanText(row.descripcion)
      || cleanText(getCellValue(cells[fallbackCommentColumnIndex]));
    const normalizedTitle = normalizeHeader(title);
    const normalizedImage1 = normalizeHeader(image1);
    const normalizedImage2 = normalizeHeader(image2);

    const titleLooksLikeHeader = ['unidadesvendidas', 'unidadvendida', 'unidad', 'nombre'].includes(normalizedTitle);
    const image1LooksLikeHeader = ['foto1', 'imagen1', 'foto', 'imagen', ''].includes(normalizedImage1);
    const image2LooksLikeHeader = ['foto2', 'imagen2', 'foto', 'imagen', 'comentario', 'comentarios', ''].includes(normalizedImage2);
    const looksLikeHeaderRow = titleLooksLikeHeader && (image1LooksLikeHeader || image2LooksLikeHeader || (!image1 && !image2));

    if (looksLikeHeaderRow) {
      continue;
    }

    const photos = [image1, image2].filter(Boolean);

    if (!title && !photos.length) {
      continue;
    }

    soldVehicles.push({
      id: index + 1,
      title: title || `Unidad vendida ${index + 1}`,
      photos,
      coverPhoto: photos[0] || '',
      comment,
    });
  }

  return soldVehicles;
}

function normalizeHeader(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function getFinancingTradeInValue(row) {
  const rawValue = cleanText(
    row.financiarrecibirusado
    || row.financiarusado
    || row.financiarrecibirusado
    || row.recibirusado
    || row.financiacion
    || row.permuta
  );

  if (!rawValue) {
    return 'No informado';
  }

  const normalized = normalizeHeader(rawValue);

  if (['si', 'sí', 'yes', 'true', '1'].includes(normalized)) {
    return 'Si';
  }

  if (['no', 'false', '0'].includes(normalized)) {
    return 'No';
  }

  return rawValue;
}

function getVehicleCharacteristicsFromRow(row) {
  const characteristics = [];
  const gncValue = cleanText(row.gnc);

  if (gncValue) {
    const normalized = normalizeHeader(gncValue);

    if (['si', 'sÃ­', 'yes', 'true', '1'].includes(normalized)) {
      characteristics.push('GNC: Si');
    } else if (['no', 'false', '0'].includes(normalized)) {
      characteristics.push('GNC: No');
    } else {
      characteristics.push(`GNC: ${gncValue}`);
    }
  }

  return characteristics;
}

function getCellValue(cell) {
  if (!cell || cell.v == null) {
    return '';
  }

  return String(cell.v).trim();
}

function hasVehicleIdentity(row) {
  return cleanText(row.marca) || cleanText(row.modelo) || cleanText(row.version);
}

function collectPhotos(row) {
  const photos = [];

  for (let photoIndex = 1; photoIndex <= 15; photoIndex++) {
    const key = `foto${photoIndex}`;
    const rawValue = cleanText(row[key]);

    if (!rawValue) {
      continue;
    }

    splitPhotoField(rawValue).forEach(photo => {
      const normalized = normalizePhotoUrl(photo);
      if (normalized && !photos.includes(normalized)) {
        photos.push(normalized);
      }
    });
  }

  return photos;
}

function getCoverPhotoFromRow(row) {
  const rawValue = cleanText(row.foto1);

  if (!rawValue) {
    return '';
  }

  const firstPhoto = splitPhotoField(rawValue)[0];
  return normalizePhotoUrl(firstPhoto);
}

function normalizeSinglePhoto(value) {
  const rawValue = cleanText(value);
  if (!rawValue) {
    return '';
  }

  const firstPhoto = splitPhotoField(rawValue)[0];
  return normalizePhotoUrl(firstPhoto);
}

function splitPhotoField(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/\n|,|;/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizePhotoUrl(url) {
  const trimmed = cleanText(url);
  if (!trimmed) {
    return '';
  }

  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (fileMatch) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1600`;
  }

  const openMatch = trimmed.match(/[?&]id=([^&]+)/i);
  if (/drive\.google\.com/i.test(trimmed) && openMatch) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1600`;
  }

  return trimmed;
}

function cleanText(value) {
  return String(value || '').trim();
}

function parseInteger(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}
