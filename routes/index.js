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

    // 1. Veritabanına yeni bir kayıt aç (ShortCode otomatik oluşur)
    const newLink = new Link({
      originalUrl,
      title
    });

    // 2. QR Kodun nereye gideceğini belirle
    // Render.com'da Environment Variable olarak BASE_URL girmezsen localhost çalışır.
    // Girersen oradaki adres çalışır.
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

// --- 2. İSTATİSTİK PANELİ API'si (DİKKAT: YERİ DEĞİŞTİ) ---
// BU KISIM '/:code' SATIRINDAN ÖNCE OLMALI! 
// Yoksa sistem 'stats' kelimesini bir QR kod zanneder.
router.get('/stats', async (req, res) => {
  try {
    // Tüm linkleri tarihe göre (en yeni en üstte) getir
    const links = await Link.find().sort({ createdAt: -1 });
    const reports = [];

    // Her link için kaç kere tıklandığını hesapla
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

// --- 3. YÖNLENDİRME ve TAKİP SİSTEMİ ---
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
    const clientIp = requestIp.getClientIp(req);

    await Analytics.create({
      linkId: link._id,
      ipAddress: clientIp,
      userDevice: agent.device.toString(), 
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