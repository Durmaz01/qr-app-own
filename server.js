const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes/index');
const path = require('path'); // Dosya yollarını yönetmek için
require('dotenv').config();

const app = express();

// --- AYARLAR (Middleware) ---
app.use(express.json());
app.use(cors());

// ÖNEMLİ: 'public' klasörünü dışarıya açıyoruz (HTML dosyan burada)
app.use(express.static(path.join(__dirname, 'public')));

// --- VERİTABANI BAĞLANTISI ---
// (Senin şifre alanını buraya ekledim, direkt çalışır)
mongoose.connect('mongodb+srv://jhosephjoany064_db_user:sifre123@cluster0.lpk65po.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('✅ MongoDB Atlas Bağlandı!'))
.catch((err) => console.log('❌ DB Hatası:', err));

// --- ROTALAR ---
// API isteklerini yönet
app.use('/', routes);

// Ana sayfaya girince index.html dosyasını zorla gönder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SUNUCUYU BAŞLAT ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT} adresinde çalışıyor`));