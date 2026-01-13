const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link', // Hangi QR koda ait olduğunu bağlar
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,    // Kullanıcının IP'si
  userDevice: String,   // Mobil/Desktop bilgisi
  browser: String,      // Chrome/Safari bilgisi
  os: String            // Android/iOS bilgisi
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);