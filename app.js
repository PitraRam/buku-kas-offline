// 1. Registrasi Service Worker agar aplikasi bisa berjalan offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Service Worker terdaftar!"))
        .catch(err => console.log("Gagal daftar SW:", err));
}

// 2. Inisialisasi Database Dexie (IndexedDB)
const db = new Dexie("KeuanganDB");
db.version(1).stores({
    transaksi: '++id, tanggal, jenis, nominal, keterangan, bulanTahun'
});

const form = document.getElementById('finance-form');
const monthlyContainer = document.getElementById('monthly-container');
const saldoText = document.getElementById('total-saldo');

// Nama-nama bulan untuk tampilan pembatas
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// 3. Fungsi Menampilkan Data, Pemisah Bulan & Hitung Saldo
async function renderData() {
    const semuaTransaksi = await db.transaksi.toArray();
    monthlyContainer.innerHTML = ''; // Kosongkan container utama
    
    if (semuaTransaksi.length === 0) {
        monthlyContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada transaksi.</p>';
        saldoText.innerText = "Rp 0";
        saldoText.className = "text-green-600";
        return;
    }

    let totalSaldoKeseluruhan = 0;

    // Kelompokkan data berdasarkan properti 'bulanTahun' (contoh: "2026-07")
    const kelompokBulan = {};
    semuaTransaksi.forEach(t => {
        if (!kelompokBulan[t.bulanTahun]) {
            kelompokBulan[t.bulanTahun] = [];
        }
        kelompokBulan[t.bulanTahun].push(t);
        
        // Hitung total saldo keseluruhan
        if (t.jenis === 'masuk') totalSaldoKeseluruhan += t.nominal;
        else totalSaldoKeseluruhan -= t.nominal;
    });

    // Urutkan bulan dari yang terbaru
    const bulanUrut = Object.keys(kelompokBulan).sort().reverse();

    // Buat tabel terpisah untuk setiap kelompok bulan
    bulanUrut.forEach(blnThn => {
        const [tahun, bulanIndex] = blnThn.split('-');
        const namaBulanTeks = `${namaBulan[parseInt(bulanIndex) - 1]} ${tahun}`;
        const transaksiBulanIni = kelompokBulan[blnThn];

        // Buat elemen Card/Box untuk bulan tersebut
        let tabelHtml = `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 class="font-bold text-lg text-gray-700 mb-2 border-b pb-1 flex justify-between">
                    <span>📅 ${namaBulanTeks}</span>
                    <span class="text-sm font-normal text-gray-500">${transaksiBulanIni.length} Transaksi</span>
                </h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-gray-200 text-gray-700">
                                <th class="p-2 border">Tgl</th>
                                <th class="p-2 border">Keterangan</th>
                                <th class="p-2 border">Nominal</th>
                                <th class="p-2 border text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Masukkan baris data transaksi ke dalam tabel bulan ini
        transaksiBulanIni.forEach(t => {
            tabelHtml += `
                <tr class="border-b bg-white">
                    <td class="p-2 border">${t.tanggal.split('/')[0]}</td>
                    <td class="p-2 border">
                        <span class="block font-medium">${t.keterangan}</span>
                        <span class="text-xs ${t.jenis === 'masuk' ? 'text-green-600' : 'text-red-600'} font-bold">
                            ${t.jenis.toUpperCase()}
                        </span>
                    </td>
                    <td class="p-2 border font-semibold">Rp ${t.nominal.toLocaleString('id-ID')}</td>
                    <td class="p-2 border text-center">
                        <button onclick="hapusData(${t.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition">
                            🗑️ Hapus
                        </button>
                    </td>
                </tr>
            `;
        });

        tabelHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        monthlyContainer.innerHTML += tabelHtml;
    });

    // Tampilkan total saldo keseluruhan
    saldoText.innerText = `Rp ${totalSaldoKeseluruhan.toLocaleString('id-ID')}`;
    if (totalSaldoKeseluruhan < 0) saldoText.className = "text-red-600";
    else saldoText.className = "text-green-600";
}

// 4. Logika ketika Form Disubmit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jenis = document.getElementById('jenis').value;
    const nominal = parseFloat(document.getElementById('nominal').value);
    const keterangan = document.getElementById('keterangan').value;
    
    const hari Ini = new Date();
    const tanggal = hariIni.toLocaleDateString('id-ID'); // Format: DD/MM/YYYY
    
    // Membuat tanda pengelompok bulan (Format: YYYY-MM)
    const bulan = String(hariIni.getMonth() + 1).padStart(2, '0');
    const tahun = hariIni.getFullYear();
    const bulanTahun = `${tahun}-${bulan}`;

    // Simpan ke database lokal
    await db.transaksi.add({ tanggal, jenis, nominal, keterangan, bulanTahun });
    form.reset();
    renderData();
});

// 5. FUNGSI BARU: MENGHAPUS DATA YANG SALAH INPUT
async function hapusData(id) {
    if (confirm("Apakah Anda yakin ingin menghapus data transaksi ini?")) {
        await db.transaksi.delete(id);
        renderData(); // Segarkan tampilan setelah dihapus
    }
}

// 6. FITUR EKSPOR DATA KE CSV (Disesuaikan dengan kolom baru)
document.getElementById('export-btn').addEventListener('click', async () => {
    const semuaTransaksi = await db.transaksi.toArray();
    if (semuaTransaksi.length === 0) {
        alert("Belum ada data untuk diekspor!");
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Jenis,Keterangan,Nominal,Bulan-Tahun\n";
    semuaTransaksi.forEach(t => {
        csvContent += `${t.tanggal},${t.jenis},"${t.keterangan}",${t.nominal},${t.bulanTahun}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `Backup_Keuangan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
});

// 7. FITUR IMPOR DATA DARI FILE CSV
document.getElementById('import-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const baris = text.split("\n");
        let dataBerhasilDiimpor = 0;

        for (let i = 1; i < baris.length; i++) {
            if (!baris[i].trim()) continue;
            const kolom = baris[i].split(",");
            
            const tanggal = kolom[0];
            const jenis = kolom[1];
            const keterangan = kolom[2].replace(/"/g, "");
            const nominal = parseFloat(kolom[3]);
            const bulanTahun = kolom[4] || `${tanggal.split('/')[2]}-${String(tanggal.split('/')[1]).padStart(2, '0')}`;

            if (tanggal && jenis && !isNaN(nominal)) {
                await db.transaksi.add({ tanggal, jenis, nominal, keterangan, bulanTahun });
                dataBerhasilDiimpor++;
            }
        }
        alert(`${dataBerhasilDiimpor} data berhasil dipulihkan!`);
        renderData();
    };
    reader.readAsText(file);
});

// Jalankan fungsi tampilkan data saat aplikasi pertama kali dibuka
renderData();
