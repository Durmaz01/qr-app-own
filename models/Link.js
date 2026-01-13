const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const LinkSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  shortCode: {
    type: String,
    required: true,
    default: () => nanoid(6), // Otomatik 6 haneli kod üretir (Örn: u8K1zl)
    unique: true,
  },
  title: {
    type: String, // Örn: "Dilek Pastanesi Masa 5"
  },
  qrImage: {
    type: String, // QR kodun Base64 halini burada saklayabiliriz (opsiyonel ama hızlı gösterim için iyi)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Link', LinkSchema);