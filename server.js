const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const shortid = require('shortid');
const QRCode = require('qrcode');
// const routes = require('./routes/index'); // Eğer eski rota dosyan varsa açabilirsin

dotenv.config();
const app = express();

// --- AYARLAR ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- VERİTABANI BAĞLANTISI ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Bağlandı!'))
  .catch((err) => console.log('❌ DB Hatası:', err));

// --- 1. MODEL: LİNKLER (ŞEMA GÜNCELLENDİ) ---
const LinkSchema = new mongoose.Schema({
    originalUrl: { type: String, required: true },
    // DİKKAT: 'default' özelliğini kaldırdık, elle vereceğiz.
    shortUrl: { type: String, required: true }, 
    clicks: { type: Number, default: 0 },
    qrCode: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Model çakışmasını önlemek için kontrol
const Link = mongoose.models.Link || mongoose.model('Link', LinkSchema);

// --- 2. MODEL: ANALİTİK ---
const AnalyticsSchema = new mongoose.Schema({
    linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link' },
    timestamp: { type: Date, default: Date.now },
    userAgent: String,
    ip: String
});
const Analytics = mongoose.models.Analytics || mongoose.model('Analytics', AnalyticsSchema);

// --- ROTALAR ---

// A) Link Oluşturma (GARANTİLİ KAYIT)
app.post('/api/shorten', async (req, res) => {
    try {
        const { originalUrl } = req.body;
        
        console.log("1. İstek Geldi:", originalUrl); // Log 1

        if (!originalUrl) return res.status(400).json({ error: 'Link gerekli' });

        // Kodu burada elle üretiyoruz
        const generatedShortCode = shortid.generate();
        console.log("2. Kısa Kod Üretildi:", generatedShortCode); // Log 2
        
        const fullShortUrl = `${req.protocol}://${req.get('host')}/${generatedShortCode}`;
        const qrCodeImage = await QRCode.toDataURL(fullShortUrl);

        // Veritabanı nesnesini oluştur
        const newLink = new Link({
            originalUrl: originalUrl,
            shortUrl: generatedShortCode, // BURASI KRİTİK: Elle atıyoruz
            qrCode: qrCodeImage
        });
        
        // Kaydet
        await newLink.save();
        
        console.log("3. Veritabanına Kaydedildi ✅"); // Log 3

        res.json({ shortUrl: fullShortUrl, qrCode: qrCodeImage });

    } catch (error) {
        console.error("❌ KAYIT HATASI DETAYI:", error); // Hatayı görelim
        res.status(500).json({ error: 'Hata oluştu: ' + error.message });
    }
});

// B) Admin Paneli Linkleri
app.get('/api/links', async (req, res) => {
    try {
        const links = await Link.find().sort({ createdAt: -1 });
        res.json(links);
    } catch (error) {
        res.status(500).json({ error: 'Veri çekilemedi' });
    }
});

// C) Analiz Verileri
app.get('/api/analytics/:shortUrl', async (req, res) => {
    try {
        const link = await Link.findOne({ shortUrl: req.params.shortUrl });
        if (!link) return res.status(404).json({ error: 'Link bulunamadı' });

        const logs = await Analytics.find({ linkId: link._id })
            .sort({ timestamp: -1 })
            .limit(20);
            
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Analiz verisi çekilemedi' });
    }
});

// --- DİLEK PASTANESİ ESKİ ROTALARI (İsteğe Bağlı) ---
// app.use('/', routes); 

// --- ANA SAYFA VE YÖNLENDİRME ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Kısaltılmış Link Yönlendirmesi (EN ALTTA OLMALI)
app.get('/:shortUrl', async (req, res) => {
    try {
        const shortUrl = req.params.shortUrl;
        
        // Favicon isteğini yoksay
        if(shortUrl === 'favicon.ico') return res.status(404).end();

        const link = await Link.findOne({ shortUrl });

        if (link) {
            link.clicks++;
            await link.save();

            // Analitik Kaydet
            try {
                await Analytics.create({
                    linkId: link._id,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });
            } catch (err) { console.log("Log hatası:", err.message); }

            return res.redirect(link.originalUrl);
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        console.error("Yönlendirme hatası:", error);
        res.status(500).send('Hata');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server çalışıyor: ${PORT}`));