// =============================================
// Carrito de compras
// =============================================

class Cart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('v1nito_cart') || '[]');
  }

  save() {
    localStorage.setItem('v1nito_cart', JSON.stringify(this.items));
  }

  add(wine) {
    const existing = this.items.find(item => item.id === wine.id);
    if (existing) {
      existing.qty++;
    } else {
      this.items.push({ ...wine, qty: 1 });
    }
    this.save();
  }

  remove(wineId) {
    this.items = this.items.filter(item => item.id !== wineId);
    this.save();
  }

  updateQty(wineId, delta) {
    const item = this.items.find(item => item.id === wineId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      this.remove(wineId);
    } else {
      this.save();
    }
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + item.precio * item.qty, 0);
  }

  getCount() {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  }

  clear() {
    this.items = [];
    this.save();
  }

  buildWhatsAppMessage(name, address) {
    let msg = `🍷 *Nuevo pedido V1NITO*\n\n`;
    msg += `👤 *Nombre:* ${name}\n`;
    msg += `📍 *Dirección:* ${address}\n\n`;
    msg += `📋 *Detalle del pedido:*\n`;

    this.items.forEach(item => {
      msg += `• ${item.nombre} x${item.qty} — ${CONFIG.CURRENCY}${(item.precio * item.qty).toLocaleString('es-AR')}\n`;
    });

    msg += `\n💰 *Total: ${CONFIG.CURRENCY}${this.getTotal().toLocaleString('es-AR')}*`;

    return msg;
  }
}
