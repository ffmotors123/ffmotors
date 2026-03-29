// =============================================
// Lista de seleccion para consultas
// =============================================

class SelectionStore {
  constructor() {
    this.storageKey = 'ffmotors_selection';
    this.items = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn('No se pudo leer la seleccion guardada:', error);
      return [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  add(vehicle) {
    if (!vehicle || this.has(vehicle.id)) {
      return false;
    }

    this.items.push({
      id: vehicle.id,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      version: vehicle.version,
      year: vehicle.year,
      km: vehicle.km,
      precio: vehicle.precio,
      coverPhoto: vehicle.coverPhoto,
      tipo: vehicle.tipo,
    });

    this.save();
    return true;
  }

  remove(vehicleId) {
    const before = this.items.length;
    this.items = this.items.filter(item => item.id !== vehicleId);

    if (this.items.length !== before) {
      this.save();
      return true;
    }

    return false;
  }

  toggle(vehicle) {
    if (this.has(vehicle.id)) {
      this.remove(vehicle.id);
      return false;
    }

    this.add(vehicle);
    return true;
  }

  has(vehicleId) {
    return this.items.some(item => item.id === vehicleId);
  }

  count() {
    return this.items.length;
  }

  clear() {
    this.items = [];
    this.save();
  }

  buildWhatsAppMessage({ name, phone, notes }) {
    const lines = [
      'Hola FF Motors, quiero consultar por estas unidades:',
      '',
      `Nombre: ${name}`,
      `Telefono: ${phone}`,
    ];

    if (notes) {
      lines.push(`Comentarios: ${notes}`);
    }

    lines.push('', 'Unidades seleccionadas:');

    this.items.forEach((item, index) => {
      const detail = [
        `${index + 1}. ${item.marca} ${item.modelo} ${item.version}`.trim(),
        item.year ? `Ano ${item.year}` : null,
        item.km ? `${item.km.toLocaleString('es-AR')} km` : null,
        item.precio ? `${CONFIG.CURRENCY}${item.precio.toLocaleString('es-AR')}` : 'Precio a consultar',
      ].filter(Boolean).join(' | ');

      lines.push(detail);
    });

    return lines.join('\n');
  }
}
