const express = require('express');
const router = express.Router();
const qrcode = require('qrcode');
const useragent = require('useragent');
const requestIp = require('request-ip');
const Link = require('../models/Link');
const Analytics = require('../models/Analytics');

// --- 1. QR KOD OLUŞTURMA API'si ---
router.post('/create', async (req, res) => {
  try {
    const { originalUrl, title } = req.body;

    if (!originalUrl) return res.status(400).json({ error: 'Link girmelisiniz' });

    // 1. Veritabanına yeni bir kayıt aç
    const newLink = new Link({
      originalUrl,
      title
    });

    // 2. QR Kodun nereye gideceğini belirle
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const redirectUrl = `${baseUrl}/${newLink.shortCode}`;

    // 3. QR Kodu resim (DataURL) olarak oluştur
    const qrImage = await qrcode.toDataURL(redirectUrl);

    // 4. QR resmini de veritabanına kaydet ve Link'i güncelle
    newLink.qrImage = qrImage;
    await newLink.save();

    res.json({
      success: true,
      shortCode: newLink.shortCode,
      redirectUrl,
      qrImage
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// --- 2. İSTATİSTİK PANELİ API'si ---
router.get('/stats', async (req, res) => {
  try {
    const links = await Link.find().sort({ createdAt: -1 });
    const reports = [];

    for (const link of links) {
      const clickCount = await Analytics.countDocuments({ linkId: link._id });
      
      reports.push({
        _id: link._id,
        title: link.title,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        clicks: clickCount,
        qrImage: link.qrImage
      });
    }

    res.json(reports);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// --- 3. YÖNLENDİRME ve TAKİP SİSTEMİ (GÜNCELLENEN KISIM) ---
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Bu koda ait link var mı?
    const link = await Link.findOne({ shortCode: code });

    if (!link) {
      return res.status(404).send('QR Kod Bulunamadı veya Süresi Dolmuş.');
    }

    // 2. İSTATİSTİK TOPLAMA
    const agent = useragent.parse(req.headers['user-agent']);
    
    // IP Alma (let yaptık çünkü aşağıda değiştireceğiz)
    let clientIp = requestIp.getClientIp(req);

    // [DÜZELTME 1] IP Temizliği: Eğer ::ffff:192... gibi gelirse başını sil
    if (clientIp && clientIp.includes('::ffff:')) {
        clientIp = clientIp.split(':').pop();
    }

    // [DÜZELTME 2] Cihaz Adı: Bilgisayarları 'Other' yerine 'PC / Mac' göster
    let deviceName = agent.device.toString();
    if (deviceName === 'Other 0.0.0' || deviceName === 'Other') {
        deviceName = "PC / Mac"; 
    }

    // [DÜZELTME 3] Veritabanına temiz verileri kaydet
    await Analytics.create({
      linkId: link._id,
      ipAddress: clientIp,       // Temizlenmiş IP
      userDevice: deviceName,    // Düzeltilmiş cihaz adı
      os: agent.os.toString(),             
      browser: agent.toAgent()             
    });

    // 3. Asıl siteye yönlendir
    res.redirect(link.originalUrl);

  } catch (error) {
    console.error(error);
    res.status(500).send('Yönlendirme hatası');
  }
});

module.exports = router;