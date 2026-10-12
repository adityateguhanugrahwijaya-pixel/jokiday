---
name: JokiDay
description: Marketplace freelancer desain dengan escrow otomatis. Biru untuk rasa aman dan uang, oranye untuk aksi dan energi. Mobile-first, bahasa Indonesia.
colors:
  primary: "#1D4ED8"
  primary-hover: "#1E40AF"
  primary-soft: "#E8EEFF"
  on-primary: "#FFFFFF"
  secondary: "#FF7A1A"
  secondary-hover: "#E8650A"
  secondary-soft: "#FFF0E3"
  secondary-text: "#C2410C"
  on-secondary: "#0B1F4A"
  background: "#F5F8FF"
  surface: "#FFFFFF"
  border: "#D9E2F5"
  text: "#0B1F4A"
  text-muted: "#51617F"
  neutral-soft: "#EEF1F7"
  success: "#166534"
  success-soft: "#E6F6EC"
  danger: "#B91C1C"
  danger-soft: "#FDECEC"
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.5rem
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: -0.02em
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.015em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
  money:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: 800
    lineHeight: 1.2
    fontFeature: "tnum"
rounded:
  sm: 6px
  md: 12px
  lg: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 14px
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-cta:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 14px
    height: 48px
  button-cta-hover:
    backgroundColor: "{colors.secondary-hover}"
    textColor: "{colors.on-secondary}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 14px
    height: 48px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 14px
    height: 48px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card-escrow:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  price-tag:
    backgroundColor: "{colors.secondary-soft}"
    textColor: "{colors.secondary-text}"
    typography: "{typography.money}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  badge-info:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-warning:
    backgroundColor: "{colors.secondary-soft}"
    textColor: "{colors.secondary-text}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-neutral:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 6px
  nav-bottom:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    height: 64px
  topbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    height: 64px
    padding: "{spacing.md}"
  sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    padding: "{spacing.md}"
  sidebar-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  table-header:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 12px
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    padding: 16px
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
omitted:
  - name: elevation
    reason: Kedalaman dibuat lewat warna latar dan border, bukan shadow. Satu pengecualian dijelaskan di bagian Elevation & Depth.
---

## Overview

JokiDay mempertemukan customer dan freelancer desain, dan uang ada di tengahnya. Karena itu tampilan harus terasa **aman dulu, ramah kemudian**.

Pembagian peran warna adalah inti identitas:

- **Biru = rasa aman dan uang.** Navigasi, link, escrow, saldo, status proses, dan tombol aksi umum.
- **Oranye = tindakan yang memulai transaksi.** Order, Bayar, Ambil order, Kirim penawaran. Hanya satu tombol oranye per layar. Oranye adalah satu-satunya momen yang "berteriak"; sisanya tenang.

Kepribadian: lugas, hangat, tidak formal-kaku seperti bank, tidak ramai seperti marketplace diskon. Latar putih kebiruan yang bersih supaya karya designer (yang selalu warna-warni) jadi pusat perhatian, bukan antarmukanya.

Prinsip:

1. **Karya adalah bintangnya.** UI netral di sekitar gambar; jangan bersaing dengan portofolio.
2. **Angka uang selalu jelas.** Tidak ada biaya tersembunyi, fee 5% ditampilkan terang di sisi designer.
3. **Status selalu terbaca sekilas.** Customer dan designer harus tahu "sekarang giliran siapa" tanpa membaca chat.
4. **Responsif penuh: HP dan PC.** Desain dimulai dari HP (360px) karena mayoritas pengguna membuka dari HP, tapi PC adalah target kelas satu, bukan versi HP yang dilebarkan. Designer sering bekerja di laptop (upload file, chat, kelola order), jadi layout desktop punya pola sendiri: sidebar, dua kolom, tabel, dan shortcut.

## Colors

Semua warna harus diambil dari token di front matter. Dilarang membuat hex baru di komponen.

**Biru (primary)**
- `primary` `#1D4ED8`: tombol utama, link, ikon aktif, fokus.
- `primary-hover` `#1E40AF`: hover/pressed.
- `primary-soft` `#E8EEFF`: latar kartu escrow, badge info, item terpilih.
- `text` `#0B1F4A` (biru navy): semua teks utama. Tidak ada hitam murni.

**Oranye (secondary)**
- `secondary` `#FF7A1A`: tombol CTA saja. Teks di atasnya wajib `on-secondary` (navy), **bukan putih**, karena putih di atas oranye ini tidak lolos kontras.
- `secondary-hover` `#E8650A`: hover/pressed CTA.
- `secondary-soft` `#FFF0E3`: latar label harga, badge peringatan.
- `secondary-text` `#C2410C`: oranye untuk **teks** di latar terang (kontras ±5:1). Jangan pakai `secondary` sebagai warna teks.

**Netral**
- `background` `#F5F8FF`: latar halaman.
- `surface` `#FFFFFF`: kartu, input, sheet.
- `border` `#D9E2F5`: garis pembatas, tepi input dan kartu.
- `text-muted` `#51617F`: teks sekunder dan caption.
- `neutral-soft` `#EEF1F7`: badge netral (Batal), area disabled.

**Semantik**
- `success` `#166534` / `success-soft`: Selesai, saldo cair. Hijau dibuat lebih gelap agar teks badge lolos kontras (±6.4:1).
- `danger` / `danger-soft`: Dispute, error, deadline terlewat.

### Pemetaan status order

| Status | Badge | Alasan warna |
|---|---|---|
| Menunggu bayar | `badge-warning` | Butuh tindakan customer |
| Dikerjakan | `badge-info` | Proses berjalan normal |
| Revisi | `badge-warning` | Butuh tindakan designer |
| Menunggu persetujuan | `badge-info` | Menunggu customer, tapi tidak mendesak |
| Selesai | `badge-success` | Final, dana cair |
| Dispute | `badge-danger` | Perlu perhatian admin |
| Batal / Refund | `badge-neutral` | Selesai tanpa transaksi |

### Warna deadline

- Lebih dari 24 jam: teks `primary`.
- Kurang dari 24 jam: teks `secondary-text` + ikon jam.
- Terlewat: teks `danger` + badge `badge-danger`.

### Aturan kontras

- Teks biasa minimal 4.5:1, teks besar (≥ 1.5rem) minimal 3:1.
- Kombinasi aman: `text` di atas `background`/`surface`; `on-primary` di atas `primary`; `on-secondary` di atas `secondary`; `secondary-text` di atas `secondary-soft`.
- Jangan tumpuk oranye di atas biru langsung (getar visual). Pisahkan dengan `surface` putih.
- Mode gelap bukan bagian MVP. Jangan mengarang palet gelap; tambahkan sebagai set token terpisah nanti.

## Typography

Satu keluarga: **Plus Jakarta Sans** (Google Fonts, bobot 400/500/600/700/800). Tegas dan bersahabat, nyaman untuk teks Indonesia, dan bentuk angkanya jelas untuk harga.

- Judul memakai bobot 700–800 dengan letter-spacing sedikit rapat. Isi teks bobot 400.
- Gunakan sentence case di mana pun. **Jangan** pakai huruf kapital semua untuk label atau judul.
- Panjang baris isi teks maksimal 70 karakter.
- Maksimal dua bobot berbeda dalam satu kartu.
- **Angka uang** memakai gaya `money` dengan tabular numbers (`font-feature-settings: "tnum"`) agar angka rata saat dijejer di dompet dan riwayat transaksi.

### Format angka dan tanggal

- Rupiah: `Rp47.500` (titik pemisah ribuan, tanpa desimal, tanpa spasi setelah Rp).
- Singkatan boleh di ruang sempit: `47,5rb`. Konsisten dalam satu layar.
- Tanggal: `12 Okt 2026`. Waktu 24 jam: `14.30`.
- Deadline relatif untuk yang dekat: `Sisa 5 jam`, `Lewat 2 jam`.

### Skala

| Token | Pemakaian |
|---|---|
| display | Hero beranda saja |
| h1 | Judul halaman |
| h2 | Judul bagian |
| h3 | Judul kartu, nama designer |
| body | Isi teks, chat |
| body-sm | Info pendukung, brief ringkas |
| label | Tombol, label form, tab |
| caption | Badge, timestamp, hint |
| money | Harga, saldo, total |

## Layout

Satu basis kode, satu set komponen, dua cara menyusunnya. Mulai dari HP, lalu **tambah** struktur saat layar melebar. Jangan sekadar memperbesar tampilan HP.

Dasar kelipatan 4px, ritme utama 8px.

### Breakpoint

| Nama | Lebar | Perangkat | Kolom | Margin samping |
|---|---|---|---|---|
| `xs` | 360–599px | HP | 4 | 16px |
| `sm` | 600–899px | HP besar, tablet kecil | 8 | 24px |
| `md` | 900–1199px | Tablet, laptop kecil | 12 | 32px |
| `lg` | 1200–1535px | Laptop, PC | 12 | 40px |
| `xl` | ≥1536px | Monitor besar | 12 | auto (konten dikunci) |

Lebar maksimum konten: **1280px** untuk halaman umum, **720px** untuk halaman baca/form tunggal (brief, penawaran, pengaturan). Di atas itu konten berada di tengah dan latar `background` mengisi sisanya.

Gunakan CSS media query `min-width` (mobile-first). Jangan memakai deteksi perangkat. Uji juga lanskap HP dan zoom 200%.

### Pola navigasi

| Layar | Navigasi |
|---|---|
| `xs`–`sm` | `nav-bottom` (4–5 tab) + header ringkas berisi judul dan notifikasi |
| `md` | `topbar` penuh + `nav-bottom` dihilangkan; menu jadi ikon + label di topbar |
| `lg`–`xl` | `sidebar` kiri 240px (bisa diciutkan jadi 72px berisi ikon) + `topbar` tipis berisi pencarian, ganti peran, notifikasi, avatar |

Isi navigasi mengikuti peran aktif (role switch):
- **Customer:** Beranda, Cari designer, Pasar, Order saya, Pesan, Profil.
- **Designer:** Dashboard, Brief masuk, Pasar, Order, Karya, Dompet, Pesan, Profil.

Pengganti pengalih peran di HP berada di halaman Profil; di PC berada di topbar sehingga bisa ditukar satu klik.

### Pola halaman per layar

**Feed karya (masonry)**

| Layar | Kolom |
|---|---|
| `xs` | 2 |
| `sm` | 3 |
| `md` | 4 |
| `lg`–`xl` | 5 (maks 6) |

Gambar tanpa tepi, radius `sm`. Di HP, nama designer dan tombol Order ada di bawah gambar. Di PC (perangkat dengan hover), info dan tombol **Order** muncul saat kursor di atas karya, tetapi tombol Order juga tetap tersedia di halaman detail karya agar tidak bergantung pada hover.

**Detail karya dan profil designer**

```
xs/sm                          md/lg/xl
┌─────────────┐                ┌───────────────────────┬──────────────┐
│ Karya       │                │ Karya besar           │ Designer     │
│ Designer    │                │ (watermark)           │ Rating       │
│ [ Order ]   │                │                       │ [ Order ]    │
│ Karya lain  │                ├───────────────────────┤ Karya lain   │
└─────────────┘                │ Deskripsi, kategori   │ (sticky)     │
                               └───────────────────────┴──────────────┘
```
Panel kanan di PC `sticky`, lebar 320–360px.

**Pasar (daftar brief)**

```
xs/sm: daftar kartu satu kolom, filter di sheet bawah
md+  : filter sidebar kiri 280px  |  daftar brief  |  (lg+) pratinjau brief terpilih di kanan
```
Di PC pilih sebuah brief langsung menampilkan detail dan tombol **Kirim penawaran** di panel kanan tanpa pindah halaman (pola master-detail). Di HP berpindah ke halaman detail penuh.

**Detail order**

```
xs/sm (satu kolom)             lg/xl (dua kolom)
┌─────────────────────┐        ┌────────────────────────────┬─────────────────────┐
│ Judul     [badge]   │        │ Judul order        [badge] │ Ringkasan kontrak   │
│ Deadline            │        │ Deadline: Sisa 5 jam       │ Harga, deadline,    │
│ Stepper             │        │ Stepper horizontal         │ revisi tersisa      │
│ Kartu escrow        │        ├────────────────────────────┤ ─────────────────── │
│ Chat / file         │        │ Chat / file / pratinjau    │ Kartu escrow        │
│ [ Aksi (sticky) ]   │        │ (area utama, scroll)       │ Tombol aksi         │
└─────────────────────┘        └────────────────────────────┴─────────────────────┘
```
- Di PC kolom kanan `sticky` (lebar 340–380px) memuat ringkasan kontrak, kartu escrow, dan **tombol aksi**; di HP tombol aksi menempel di bawah layar.
- Stepper horizontal di PC, vertikal ringkas di HP.
- Pratinjau karya di PC tampil lebih besar (hingga 1200px sesuai batas preview), dengan opsi tampilan layar penuh yang tetap ber-watermark.

**Dompet designer**

| Layar | Susunan |
|---|---|
| `xs`–`sm` | Tiga angka bertumpuk, lalu daftar transaksi |
| `md`+ | Tiga kartu angka sejajar di atas, lalu **tabel** transaksi (kolom: tanggal, keterangan, order, status, jumlah rata kanan) |

**Chat**

| Layar | Susunan |
|---|---|
| `xs`–`sm` | Daftar percakapan dan isi percakapan adalah dua layar terpisah |
| `md` | Dua panel: daftar 320px + percakapan |
| `lg`+ | Tiga panel: daftar 320px + percakapan + konteks order/brief 340px |

**Dashboard designer (PC)**: baris atas ringkasan (order aktif, deadline terdekat, saldo), di bawahnya dua kolom: daftar order aktif diurutkan deadline dan antrean brief masuk. Di HP urutan sama tetapi satu kolom.

**Form (brief, penawaran, profil)**: satu kolom dengan lebar maksimum 720px. Di PC, ringkasan rincian harga/fee untuk form penawaran tampil di panel kanan yang `sticky`; di HP tampil tepat di atas tombol kirim.

**Admin (dispute, ledger)**: dirancang desktop-first. Tabel padat, filter di atas, detail dispute dua kolom (bukti kiri, keputusan kanan). Di HP cukup bisa dibaca dan dipakai untuk keputusan sederhana.

### Jarak

- Antar-bagian: `{spacing.xl}` di HP, `{spacing.2xl}` di `lg`+.
- Antar-kartu: `{spacing.md}`; gutter grid di `md`+ `{spacing.lg}`.
- Isi kartu: `{spacing.lg}` (boleh `{spacing.md}` di kartu padat dalam tabel/daftar).
- Perataan: teks rata kiri. Hanya empty state dan layar bayar sukses yang boleh rata tengah.

### Input PC vs HP

| Aspek | HP | PC |
|---|---|---|
| Interaksi | Sentuh, area minimal 44×44px | Klik + hover + keyboard; area klik tetap ≥ 40px |
| Aksi sekunder | Sheet bawah | Menu dropdown / popover |
| Dialog | Sheet bawah (`rounded.lg` di atas) | Modal tengah, lebar 480px (maks 720px untuk bukti dispute) |
| Upload file | Pilih berkas | **Seret dan lepas** + pilih berkas, progres per file |
| Kirim pesan chat | Tombol kirim | `Enter` kirim, `Shift+Enter` baris baru |
| Pintasan | — | `/` fokus ke pencarian, `Esc` tutup modal, `g` lalu `o` ke Order (opsional) |
| Tooltip | Tidak dipakai | Untuk ikon tanpa label (jeda 400ms) |

Semua fungsi harus bisa dicapai tanpa hover dan tanpa mouse (keyboard saja), serta tanpa keyboard (sentuh saja).

### Gambar dan performa

- Gunakan `srcset` dan `sizes` untuk preview karya; HP menerima versi ≤ 800px, PC ≤ 1200px (batas `preview_max_px`).
- Beri `width`/`height` atau `aspect-ratio` pada setiap gambar agar tidak ada loncatan layout.
- Muat gambar di luar layar secara `lazy`. Feed memakai scroll tak terbatas dengan penanda posisi yang bisa dipulihkan saat kembali dari detail.
- Tabel lebar di layar sempit digulir di dalam wadahnya sendiri, bukan membuat halaman bergeser samping.

## Elevation & Depth

Antarmuka **datar**. Kedalaman dibuat dengan perbedaan warna latar (`background` → `surface`) dan border `border` 1px, bukan bayangan.

Satu pengecualian: elemen yang melayang di atas konten (sheet bawah, dialog, tombol aksi sticky) boleh memakai satu bayangan lembut berwarna biru: `0 8px 24px rgba(29, 78, 216, 0.12)`. Jangan beri bayangan pada kartu biasa.

Karya portofolio tidak diberi bingkai atau bayangan. Gambar berdiri sendiri.

## Shapes

Radius bertingkat sesuai hierarki, bukan satu radius untuk semuanya:

- `sm` 6px: thumbnail karya, label harga.
- `md` 12px: tombol dan input.
- `lg` 20px: kartu dan sheet.
- `full`: badge, avatar, chip filter.

Ikon: garis 1.75px, ujung membulat, ukuran 20px (24px di navigasi). Satu keluarga ikon saja (disarankan Lucide). Ikon perisai biru dipakai khusus untuk penanda **escrow / dana aman**.

### Watermark pada karya

Watermark dibakar ke piksel oleh server (bukan overlay CSS). Spesifikasi visual:

- Teks `JokiDay • @username`, diulang diagonal -30°, menutup seluruh gambar.
- Dua lapis bergantian agar terbaca di terang dan gelap: putih 30% dan navy `#0B1F4A` 25%.
- Ukuran teks ±4% dari sisi pendek gambar, jarak antar-teks ±1× lebar teks.
- Di UI, gambar preview diberi `draggable=false` dan lapisan transparan di atasnya.

## Components

**Tombol**
- `button-primary` (biru): aksi umum seperti Setujui, Kirim hasil, Simpan.
- `button-cta` (oranye): hanya aksi yang memulai transaksi: Order, Bayar, Ambil order, Kirim penawaran. Satu per layar.
- `button-ghost`: aksi sekunder: Batal, Lihat detail. Tepi `border`, teks `primary`.
- Tinggi minimal 48px, area sentuh minimal 44×44px. Lebar penuh di HP untuk aksi utama.
- Status disabled: latar `neutral-soft`, teks `text-muted`. Status loading: tampilkan indikator, kunci tombol agar tidak terkirim dua kali (penting untuk pembayaran).
- Fokus keyboard: ring 2px `primary` dengan offset 2px, terlihat di semua tombol dan input.
- Hover (hanya perangkat yang punya hover, `@media (hover: hover)`): tombol berpindah ke warna `-hover`. Tidak ada informasi penting yang hanya muncul saat hover.

**Input**
- Label di atas input (bukan placeholder-only). Tepi `border`, fokus `primary`, error `danger` + pesan di bawahnya.
- Input harga pada form penawaran: awalan `Rp`, hanya angka, tampilkan hasil format rupiah dan rincian fee langsung di bawahnya.

**Kartu**
- `card`: kontainer standar, border `border`, tanpa bayangan.
- `card-escrow`: latar `primary-soft` dengan ikon perisai; dipakai untuk menampilkan dana yang ditahan. Teks wajib jelas: "Dana ditahan JokiDay sampai kamu setujui hasilnya".
- Kartu brief dan kartu penawaran: judul `h3`, ringkasan `body-sm`, harga dengan `price-tag`.
- Kartu penawaran di chat (`OFFER_EVENT`) menampilkan versi, harga, durasi, kuota revisi, dan tombol Terima / Tolak / Minta tawar ulang.

**Badge**
- Pakai pemetaan status di bagian Colors. Satu badge = satu status, teks singkat, tanpa ikon dekoratif.

**Avatar dan profil designer**
- Avatar bulat, 40px di daftar, 72px di profil. Di bawah nama: rating (bintang + angka) dan `n proyek selesai`.

**Navigasi**
- `nav-bottom`: ikon + label `caption`. Tab aktif: ikon dan label `primary`, tab lain `text-muted`. Badge titik oranye untuk notifikasi baru.

**Topbar dan sidebar (PC)**
- `topbar` (64px): logo di kiri, pencarian di tengah (`/` untuk fokus), lalu pengalih peran, notifikasi, avatar di kanan. Border bawah `border`, tanpa bayangan.
- `sidebar` (240px, ciut 72px): item = ikon 20px + label `label`. Item aktif memakai `sidebar-item-active`. Pada keadaan ciut, label menjadi tooltip.
- Badge titik oranye muncul pada item yang punya hal baru (Brief masuk, Pesan).
- Di bawah breakpoint `lg`, sidebar tidak dipakai (diganti `nav-bottom` atau topbar sesuai tabel navigasi).

**Tabel (PC)**
- Dipakai untuk riwayat transaksi, daftar order, brief masuk, dan seluruh panel admin.
- Header memakai `table-header`, baris memakai `table-row`, garis pemisah `border` 1px. Baris hover: latar `background`.
- Kolom jumlah uang rata kanan dengan gaya `money` kecil (tabular numbers). Kolom status memakai badge.
- Di HP tabel berubah menjadi daftar kartu (satu kartu per baris, label di kiri, nilai di kanan). Jangan memaksa tabel horizontal di HP.
- Header tetap terlihat (`sticky`) saat tabel panjang digulir.

**Modal dan sheet**
- HP: sheet naik dari bawah (`modal` dengan sudut atas `rounded.lg`), bisa digeser turun untuk menutup.
- PC: modal di tengah dengan lapisan gelap navy 40%. Tutup dengan `Esc`, klik di luar (kecuali dialog yang menyentuh uang), atau tombol Batal.
- Fokus dikunci di dalam modal dan dikembalikan ke pemicunya saat ditutup.

**Status stepper (timeline order)**
- Titik terisi `primary` untuk tahap lewat, cincin `primary` untuk tahap berjalan, abu `border` untuk tahap berikutnya. Garis penghubung mengikuti warna tahap.

**Divider dan garis pemisah**
- Semua garis pemisah (antar-baris tabel, antar-bagian kartu, tepi input dan kartu) memakai `divider`, 1px warna `border`.

**Empty state**
- Satu ikon, satu kalimat penjelas, satu tombol. Contoh: "Belum ada order. Cari designer dan mulai pesan." + tombol Cari designer.

**Toast dan dialog**
- Toast muncul di atas `nav-bottom`, hilang sendiri setelah 4 detik, kecuali error (menunggu ditutup).
- Dialog konfirmasi wajib untuk aksi yang menyentuh uang atau tidak bisa dibatalkan: Setujui, Ajukan dispute, Tarik saldo. Ringkas apa yang akan terjadi, tombol konfirmasi memakai kata kerja yang sama dengan tombol pemicunya.

### Gerak

- Hemat. Gerak hanya untuk memberi tahu hasil sebuah aksi: tombol berubah saat memuat, badge status berganti, toast masuk.
- Durasi 150–250ms, easing standar. Tidak ada animasi masuk berulang pada setiap bagian halaman.
- Hormati `prefers-reduced-motion`: matikan semua transisi non-esensial.
- Satu momen yang boleh sedikit "hidup": layar setelah pembayaran sukses (ikon perisai tercentang).

### Suara dan teks antarmuka

- Bahasa Indonesia sehari-hari, sapaan **"kamu"**, kalimat pendek, aktif.
- Tombol memakai kata kerja jelas: "Kirim penawaran", "Setujui hasil", "Minta revisi". Nama aksi tetap sama di seluruh alur (tombol "Setujui" → toast "Hasil disetujui").
- Error menjelaskan masalah dan cara memperbaikinya, tanpa minta maaf berlebihan: "Pembayaran belum masuk. Cek lagi dalam beberapa menit atau pilih metode lain."
- Gunakan istilah pengguna, bukan istilah sistem: "Dana ditahan", bukan "Escrow pending".
- Hindari janji berlebihan atau bahasa promo di layar transaksi.

## Do's and Don'ts

**Do**
- Gunakan biru untuk semua hal terkait kepercayaan dan uang; oranye hanya untuk CTA.
- Pakai `on-secondary` (navy) untuk teks di atas oranye.
- Tampilkan fee 5% dan jumlah bersih di sisi designer dengan jelas.
- Tampilkan "giliran siapa" di setiap order lewat badge status dan teks singkat.
- Tampilkan karya dengan gambar besar dan UI yang tenang di sekitarnya.
- Gunakan tabular numbers untuk semua angka uang.
- Jalankan `npx @google/design.md lint DESIGN.md` setiap kali token berubah.
- Sediakan label teks di samping warna status (jangan mengandalkan warna saja).
- Susun ulang layout di tiap breakpoint (sidebar, dua kolom, tabel) alih-alih sekadar melebarkan tampilan HP.
- Sediakan seret-dan-lepas dan pintasan keyboard untuk alur yang sering dipakai designer di PC (upload, chat).
- Uji setiap halaman di 360px, 768px, 1024px, 1440px.

**Don't**
- Jangan pakai teks putih di atas `secondary` (oranye).
- Jangan pakai `secondary` sebagai warna teks; pakai `secondary-text`.
- Jangan taruh dua tombol oranye di satu layar.
- Jangan membuat warna hex baru di luar token.
- Jangan memakai bayangan pada kartu biasa atau gradien dekoratif.
- Jangan pakai huruf kapital semua, atau garis miring/ikon dekoratif sebagai hiasan semata.
- Jangan menaruh teks di atas gambar karya selain watermark.
- Jangan menampilkan gambar asli tanpa watermark di feed, chat pratinjau, atau halaman publik.
- Jangan pakai istilah teknis atau bahasa Inggris yang tidak perlu di antarmuka.
- Jangan membiarkan teks atau form membentang selebar monitor; batasi lebar baca dan lebar form.
- Jangan menaruh fungsi penting hanya di hover atau klik kanan.
- Jangan membuat halaman bergeser ke samping di layar mana pun.

---

## Catatan untuk developer dan AI agent

1. Letakkan file ini di **root proyek** (`DESIGN.md`). Baca sebelum membuat komponen UI apa pun.
2. Token di front matter adalah sumber kebenaran. Semua warna, ukuran huruf, radius, dan jarak harus mengacu ke token, bukan nilai mentah.
3. Validasi dan ekspor:
   ```
   npx @google/design.md lint DESIGN.md
   npx @google/design.md export --format css-vars DESIGN.md
   npx @google/design.md export --format css-tailwind DESIGN.md
   ```
4. Muat font: `Plus Jakarta Sans` dari Google Fonts (bobot 400, 500, 600, 700, 800) dengan fallback `system-ui, sans-serif`.
5. Komponen yang diminta di `app.md` (bagian 14, daftar halaman) harus dibangun dari komponen di bagian Components. Jika butuh komponen baru, tambahkan token-nya di sini dulu, lalu pakai.
6. Jika ada konflik antara permintaan visual dan dokumen ini, tanyakan sebelum menyimpang.
7. Responsif adalah syarat selesai tiap halaman. Sebuah halaman belum dianggap jadi sebelum lolos di lebar 360, 768, 1024, dan 1440px tanpa scroll horizontal. Tambahkan tes visual Playwright untuk keempat lebar itu pada alur utama.
8. Tulis breakpoint sekali di konfigurasi (Tailwind: `xs: 360px, sm: 600px, md: 900px, lg: 1200px, xl: 1536px`) dan pakai nama yang sama di seluruh kode.
