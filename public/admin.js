document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById("admin-pass");
    if (passwordInput) {
        passwordInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") checkPassword();
        });
    }
});

function checkPassword() {
    const input = document.getElementById('admin-pass');
    if (input.value === 'admin5970') { 
        document.getElementById('login-screen').style.display = 'none'; 
        document.getElementById('dashboard-content').style.display = 'block';    
        loadDashboard(); 
    } else {
        document.getElementById('login-error').style.display = 'block';
        input.value = ''; 
    }
}

async function loadDashboard() {
    try {
        const response = await fetch('/api/links');
        const links = await response.json();

        // KONSOLDA VERİYİ GÖRMEK İÇİN (F12 -> Console sekmesine bak)
        console.log("Sunucudan Gelen Veriler:", links);

        const tbody = document.querySelector('#links-table tbody');
        tbody.innerHTML = ''; 

        let totalClicks = 0;
        let labels = [];
        let dataPoints = [];

        links.forEach(link => {
            // --- DEĞİŞİKLİK BURADA ---
            // "Return" diyip iptal etmiyoruz, yerine varsayılan değer atıyoruz.
            const kisaKod = link.shortUrl || "⚠️ KOD YOK";
            const hedefLink = link.originalUrl || "⚠️ LİNK YOK";
            const tiklanma = link.clicks || 0;

            totalClicks += tiklanma;
            
            // Grafiğe sadece geçerli kodları ekle
            if(link.shortUrl) {
                labels.push(link.shortUrl);
                dataPoints.push(tiklanma);
            }

            const row = `
                <tr>
                    <td style="color: ${link.shortUrl ? 'black' : 'red'}">
                        <strong>${kisaKod}</strong>
                    </td>
                    <td>
                        <a href="${hedefLink}" target="_blank" style="color:#888; text-decoration:none;">
                            ${hedefLink.substring(0, 25)}...
                        </a>
                    </td>
                    <td><span class="badge">${tiklanma}</span></td>
                    <td>
                        ${link.shortUrl ? `<a href="/${link.shortUrl}" target="_blank" style="margin-right:10px; color:#4e73df;">Git ↗</a>` : ''}
                        
                        ${link.shortUrl ? `<button class="detail-btn" onclick="openDetails('${link.shortUrl}')">Analiz 🔍</button>` : '<span style="color:red; font-size:12px;">Analiz Yapılamaz</span>'}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        document.getElementById('total-qr').innerText = links.length;
        document.getElementById('total-clicks').innerText = totalClicks;

        if(window.Chart) renderChart(labels, dataPoints);

    } catch (error) {
        console.error('Veri hatası:', error);
        document.querySelector('#links-table tbody').innerHTML = '<tr><td colspan="4">Veri yüklenemedi!</td></tr>';
    }
}

async function openDetails(shortUrl) {
    if (!shortUrl || shortUrl === "⚠️ KOD YOK") {
        alert("Hatalı link, analiz yapılamaz.");
        return;
    }

    const modal = document.getElementById('detail-modal');
    const tbody = document.getElementById('analytics-body');
    const infoText = document.getElementById('modal-link-info');

    modal.style.display = 'flex';
    infoText.innerText = `/${shortUrl} verileri yükleniyor...`;
    tbody.innerHTML = '<tr><td colspan="3">Yükleniyor...</td></tr>';

    try {
        const res = await fetch(`/api/analytics/${shortUrl}`);
        if (!res.ok) throw new Error("Veri çekilemedi");
        const logs = await res.json();

        infoText.innerText = `/${shortUrl} için son aktiviteler:`;
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">Henüz veri yok.</td></tr>';
        }

        logs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleString('tr-TR');
            const row = `
                <tr>
                    <td>${date}</td>
                    <td>${log.userAgent ? log.userAgent.substring(0, 40) : 'Bilinmiyor'}...</td>
                    <td>${log.ip || 'Gizli'}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="3">Veri alınamadı.</td></tr>';
    }
}

function closeModal() { document.getElementById('detail-modal').style.display = 'none'; }
window.onclick = function(event) { if (event.target == document.getElementById('detail-modal')) closeModal(); }

function renderChart(labels, data) {
    const canvas = document.getElementById('clickChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    Chart.defaults.color = '#adb5bd'; 
    Chart.defaults.borderColor = '#444'; 
    if (window.myChart instanceof Chart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Tıklanma', data: data, backgroundColor: '#4e73df' }] },
        options: { responsive: true, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
    });
}