# User Guide - Panduan Pengguna

## Login / Masuk Sistem

1. Buka URL sistem: `https://[domain]/auth/login`
2. Masukkan email dan password
3. Klik butang "Login"

## Dashboard

Dashboard memaparkan:
- **Jualan Hari Ini**: Total jualan
- **Pesanan**: Bilangan order
- **Perbelanjaan**: Total expenses
- **Stok Rendah**: Items yang perlu restock

## POS - Sistem Jualan

### Membuat Pesanan

1. Klik produk untuk tambah ke cart
2. Laraskan quantity dengan +/-
3. Pilih modifier jika ada (contoh: Pedas Level)
4. Tambah nota item jika perlu
5. Pilih pelanggan (optional)

### Pembayaran

1. Klik "Bayar"
2. Pilih kaedah pembayaran:
   - **Tunai**: Masukkan jumlah diterima
   - **QR Pay**: Untuk e-wallet
   - **Bank Transfer**: Untuk online banking
   - **Split**: Gabungan kaedah
3. Klik "Complete Order"
4. Print/save receipt

### Void / Refund

1. Klik "Sejarah"
2. Cari order yang hendak void
3. Klik "Void" atau "Refund"
4. Masukkan alasan
5. Confirm
6. Stok akan dikembalikan secara automatik

## Inventori

### Semak Stok

1. Navigate ke /inventory
2. Lihat senarai bahan mentah
3. Stok rendah ditandakan merah

### Tambah Stok

1. Klik "Add Stock"
2. Pilih bahan
3. Pilih jenis: Stock In / Stock Out / Adjustment
4. Masukkan quantity
5. Tambah nota
6. Save

### Purchase Orders

1. Klik "Purchase Orders"
2. Klik "New PO"
3. Pilih supplier
4. Tambah items dan quantity
5. Save as Draft atau Mark as Ordered
6. Bila barang sampai, klik "Receive"

## HR / Kehadiran

### Clock In

1. Navigate ke /attendance
2. Pilih nama anda
3. Allow location access
4. Klik "Clock In"

### Clock Out

1. Klik "Clock Out"
2. Jam bekerja akan dikira automatik

### Lihat Rekod Kehadiran

1. Klik tab "Sejarah"
2. Pilih tarikh

## Laporan

### Laporan Jualan

1. Navigate ke /reports
2. Pilih tarikh mula dan akhir
3. Pilih cashier (optional)
4. Klik "Generate"

### Export Data

1. Klik butang "Export CSV"
2. File akan download

## Settings

### Business Info

- Nama kedai
- Alamat
- Telefon
- Email

### Print Settings

- Format receipt
- Logo
- Footer message

### Webhooks

- URL untuk integrasi
- Events yang trigger webhook

## Tips & Shortcuts

- **Refresh Data**: Tarik ke bawah (mobile) atau F5
- **Carian Produk**: Guna search bar di POS
- **Quick Amount**: Klik butang RM50/RM100 untuk tunai

## Troubleshooting

### Tidak Boleh Login
- Semak email dan password betul
- Clear browser cache
- Cuba browser lain

### Order Tidak Save
- Semak internet connection
- Cuba refresh dan ulang

### Stok Tidak Deduct
- Semak recipe wujud untuk produk
- Contact admin

### GPS Tidak Dapat
- Enable location di browser
- Allow permission bila diminta
