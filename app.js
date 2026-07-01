// 1. Registrasi Service Worker agar aplikasi bisa berjalan offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Service Worker terdaftar!"))
        .catch(err => console.log("Gagal daftar SW:", err));
}

// 2. Inisialisasi Database Dexie (IndexedDB)
const db = new Dexie("KeuanganDB");
db.version(1).stores({
    transaksi: '++id, tanggal, jenis, nominal, keterangan'
});

const form = document.getElementById('finance-form');
const historyTable = document.getElementById('transaction-history');
const saldoText = document.getElementById('total-saldo');

// 3. Fungsi Menampilkan Data & Hitung Saldo
async function renderData() {
    const semuaTransaksi = await db.transaksi.toArray();
    historyTable.innerHTML = '';
    let total = 0;

    semuaTransaksi.forEach(t => {
        if (t.jenis === 'masuk') total += t.nominal;
        else total -= t.nominal;

        const row = `
            <tr class="border-b">
                <td class="p-2 border">${t.tanggal}</td>
                <td class="p-2 border font-bold ${t.jenis === 'masuk' ? 'text-green-600' : 'text-red-600'}">${t.jenis.toUpperCase()}</td>
                <td class="p-2 border">${t.keterangan}</td>
                <td class="p-2 border">Rp ${t.nominal.toLocaleString('id-ID')}</td>
            </tr>
        `;
        historyTable.innerHTML += row;
    });

    saldoText.innerText = `Rp ${total.toLocaleString('id-ID')}`;
    if (total < 0) saldoText.className = "text-red-600";
    else saldoText.className = "text-green-600";
}

// 4. Logika ketika Form Disubmit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jenis = document.getElementById('jenis').value;
    const nominal = parseFloat(document.getElementById('nominal').value);
    const keterangan = document.getElementById('keterangan').value;
    const tanggal = new Date().toLocaleDateString('id-ID');

    await db.transaksi.add({ tanggal, jenis, nominal, keterangan });
    form.reset();
    renderData();
});
// 5. FITUR EKSPOR DATA KE CSV
document.getElementById('export-btn').addEventListener('click', async () => {
    const semuaTransaksi = await db.transaksi.toArray();
    if (semuaTransaksi.length === 0) {
        alert("Belum ada data untuk diekspor!");
        return;
    }

    // Membuat header baris CSV
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Jenis,Keterangan,Nominal\n";

    // Menyusun isi data transaksi
    semuaTransaksi.forEach(t => {
        csvContent += `${t.tanggal},${t.jenis},"${t.keterangan}",${t.nominal}\n`;
    });

    // Proses download file oleh browser
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `Backup_Keuangan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    
    downloadAnchor.click(); // Memicu download otomatis
    document.body.removeChild(downloadAnchor);
});

// 6. FITUR IMPOR DATA DARI FILE CSV
document.getElementById('import-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const baris = text.split("\n");
        
        let dataBerhasilDiimpor = 0;

        // Looping baris CSV (Lewati baris pertama karena itu header)
        for (let i = 1; i < baris.length; i++) {
            if (!baris[i].trim()) continue; // Skip baris kosong
            
            // Memisahkan kolom menggunakan koma
            const kolom = baris[i].split(",");
            
            // Format: Tanggal [0], Jenis [1], Keterangan [2], Nominal [3]
            const tanggal = kolom[0];
            const jenis = kolom[1];
            const keterangan = kolom[2].replace(/"/g, ""); // Hapus tanda kutip jika ada
            const nominal = parseFloat(kolom[3]);

            if (tanggal && jenis && !isNaN(nominal)) {
                await db.transaksi.add({ tanggal, jenis, nominal, keterangan });
                dataBerhasilDiimpor++;
            }
        }

        alert(`${dataBerhasilDiimpor} data keuangan berhasil dipulihkan!`);
        renderData(); // Refresh tampilan tabel
    };

    reader.readAsText(file);
});
// Jalankan fungsi tampilkan data saat pertama kali aplikasi dibuka
renderData();