# JokiDay — Spesifikasi Aplikasi

> Dokumen ini adalah sumber kebenaran (source of truth) untuk developer dan AI agent yang membangun JokiDay.
> Baca seluruh dokumen sebelum menulis kode. Kerjakan sesuai urutan fase di bagian 17.

---

## 1. Ringkasan

**JokiDay** adalah marketplace freelancer desain dengan pembayaran escrow otomatis dan penyimpanan file langsung di Google Drive milik designer.

**Masalah yang diselesaikan**
- Freelancer desain susah cari customer.
- Freelancer dan customer sama-sama takut kabur (tidak dibayar / tidak dikerjakan).

**Inti solusi**
1. Customer pesan desain: pilih designer langsung (**Direct**) atau lempar ke **Pasar** (siapa saja boleh ambil).
2. Designer cek brief, lalu terima / tolak / kirim penawaran harga + deadline.
3. Customer bayar via WaroengPay. Uang **ditahan** di JokiDay (escrow).
4. Deadline mulai hitung setelah status `PAID`.
5. Designer upload hasil kerja. File tersimpan di Google Drive designer sendiri.
6. Customer lihat preview ber-watermark, lalu setujui atau minta revisi.
7. Setelah disetujui, saldo masuk ke dompet designer (dipotong fee 5%).

**Fee platform:** 5% dari harga deal. Contoh: harga Rp50.000 → designer terima Rp47.500, platform Rp2.500.

**Prinsip produk**
- Uang tidak pernah langsung ke designer. Selalu lewat escrow.
- File asli designer tidak disimpan di server JokiDay. Server hanya memproses sementara (in-memory / temp) lalu membuang.
- Karya di feed selalu ber-watermark dan tidak bisa diunduh.
- Semua kesepakatan terkunci jadi kontrak setelah deal. Tidak bisa diubah sepihak.
- Semua perubahan status dan uang tercatat (audit log + ledger).

---

## 2. Peran (Roles)

Satu akun bisa punya dua peran dan bisa pindah (role switch).

| Peran | Kemampuan |
|---|---|
| **Customer** | Buat order direct/pasar, chat, bayar, minta revisi, setujui, review, ajukan dispute |
| **Designer** | Profil + portofolio, post karya, ambil order pasar, kirim penawaran, upload hasil, tarik saldo |
| **Admin** | Tangani dispute, lihat semua order, kelola user, lihat ledger, ubah konfigurasi |

---

## 3. Arsitektur

```
Client (web responsif HP + PC, bisa dipasang sebagai PWA)
   │
   ▼
App Server (Next.js API routes / route handlers)
   ├── Auth Service
   ├── Order & Offer Service
   ├── Chat Service (realtime via SSE/WebSocket)
   ├── Payment Service ──► WaroengPay Adapter
   ├── Ledger Service (pencatatan uang)
   ├── Drive Service ───► Google Drive API (OAuth milik designer)
   ├── Media Service ───► Watermark (sharp) + signed URL
   ├── Dispute Service
   ├── Notification Service (email + push)
   └── Job Worker (BullMQ / cron)
   │
   ▼
PostgreSQL (data utama)   Redis (queue, rate limit, cache)
```

### Tech stack (rekomendasi, boleh diganti dengan alasan jelas)

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + komponen sederhana, responsif HP dan PC (lihat `DESIGN.md`), PWA |
| Database | PostgreSQL + Prisma ORM |
| Queue / cron | Redis + BullMQ |
| Auth | Email + password (argon2), session cookie httpOnly |
| Google | OAuth2 + Google Drive API v3 |
| Gambar | `sharp` untuk watermark dan thumbnail |
| Realtime chat | Server-Sent Events atau WebSocket |
| Email | Resend / SMTP |
| Push | Web Push (VAPID) |
| Validasi | Zod di semua input API |
| Test | Vitest (unit), Playwright (e2e alur utama) |

---

## 4. Aturan Uang (WAJIB dipatuhi)

1. Semua nominal disimpan sebagai **integer rupiah** (bukan float). Tidak ada desimal.
2. Fee dihitung: `fee = floor(price * 5 / 100)`, `designerNet = price - fee`.
3. Semua pergerakan uang dicatat di tabel **`ledger_entries`** (double-entry, append-only, tidak boleh di-update atau di-delete).
4. Saldo dihitung dari ledger, bukan disimpan sebagai angka yang diubah-ubah. Boleh ada kolom cache, tapi ledger yang benar.
5. Setiap operasi uang berjalan dalam **satu database transaction** dan **idempotent** (pakai `idempotency_key`).
6. Webhook pembayaran harus diverifikasi (signature) dan idempotent (webhook yang sama dua kali tidak boleh memproses dua kali).

### Akun ledger

| Akun | Arti |
|---|---|
| `GATEWAY_CLEARING` | Uang masuk dari WaroengPay |
| `ESCROW:{orderId}` | Uang ditahan untuk satu order |
| `WALLET_AVAILABLE:{userId}` | Saldo designer yang bisa ditarik |
| `PLATFORM_REVENUE` | Pendapatan fee 5% |
| `REFUND_PAYABLE:{userId}` | Uang yang dikembalikan ke customer |
| `WITHDRAWAL_PENDING:{userId}` | Penarikan yang sedang diproses |

### Pola jurnal

| Kejadian | Debit | Kredit | Jumlah |
|---|---|---|---|
| Customer bayar sukses | `GATEWAY_CLEARING` | `ESCROW:{order}` | price |
| Order selesai (rilis ke designer) | `ESCROW:{order}` | `WALLET_AVAILABLE:{designer}` | price − fee |
| Order selesai (fee) | `ESCROW:{order}` | `PLATFORM_REVENUE` | fee |
| Refund penuh | `ESCROW:{order}` | `REFUND_PAYABLE:{customer}` | price |
| Dispute split X% ke designer | `ESCROW:{order}` | wallet designer, platform (fee dari bagian designer), refund customer | sesuai hitungan |
| Tarik saldo diajukan | `WALLET_AVAILABLE:{designer}` | `WITHDRAWAL_PENDING:{designer}` | amount |
| Tarik saldo sukses | `WITHDRAWAL_PENDING:{designer}` | `GATEWAY_CLEARING` | amount |
| Tarik saldo gagal | `WITHDRAWAL_PENDING:{designer}` | `WALLET_AVAILABLE:{designer}` | amount |

**Fee pada dispute split:** fee 5% hanya dihitung dari bagian yang diterima designer. Bagian refund customer tidak kena fee. Fee pada refund penuh = 0.

**Tampilan dompet designer**
- **Saldo tertahan** = jumlah `ESCROW` dari order berstatus `IN_PROGRESS`, `REVISION`, `AWAITING_APPROVAL`, `DISPUTED` (bagian designer setelah fee).
- **Saldo tersedia** = `WALLET_AVAILABLE`.
- Riwayat transaksi = ledger yang terkait user.

---

## 5. Model Data

Gunakan nama tabel berikut (snake_case di DB, camelCase di Prisma).

### users
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| email | text unique | |
| password_hash | text | argon2 |
| display_name | text | |
| avatar_url | text null | |
| is_customer | bool default true | |
| is_designer | bool default false | aktif saat user buat profil designer |
| is_admin | bool default false | |
| active_role | enum(CUSTOMER, DESIGNER) | role switch |
| created_at | timestamptz | |

### drive_connections
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK unique | |
| google_email | text | |
| refresh_token_enc | text | **dienkripsi** AES-256-GCM |
| root_folder_id | text | folder `JokiDay` di Drive user |
| status | enum(ACTIVE, REVOKED, ERROR) | |
| connected_at | timestamptz | |

### designer_profiles
| Kolom | Tipe |
|---|---|
| user_id | uuid PK FK |
| bio | text |
| categories | text[] (logo, poster, ui, thumbnail, ilustrasi, dll) |
| rating_avg | numeric(3,2) |
| rating_count | int |
| completed_count | int |
| is_available | bool |

### posts (feed portofolio)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| designer_id | uuid FK | |
| caption | text | |
| category | text | |
| drive_file_id | text | file asli di Drive designer |
| preview_asset_id | uuid FK | versi watermark |
| created_at | timestamptz | |

### briefs
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK | |
| mode | enum(DIRECT, MARKET) | |
| target_designer_id | uuid null | wajib kalau DIRECT |
| source_post_id | uuid null | kalau order dari klik karya |
| title | text | |
| description | text | |
| category | text | |
| references | jsonb | link dan file referensi |
| output_format | text[] | png, jpg, psd, ai, pdf, dll |
| revision_quota | int | jumlah revisi |
| desired_deadline_days | int null | keinginan customer |
| budget_hint | int null | opsional, hanya info, bukan harga final |
| status | enum(OPEN, CLAIMED, CLOSED, EXPIRED) | |
| created_at | timestamptz | |

### offers
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| brief_id | uuid FK | |
| designer_id | uuid FK | |
| price | int | **hanya designer yang mengisi** |
| duration_days | int | |
| revision_quota | int | |
| deliverables | text[] | |
| note | text | |
| version | int | naik tiap revisi penawaran |
| status | enum(PENDING, ACCEPTED, DECLINED, SUPERSEDED, EXPIRED, WITHDRAWN) | |
| created_at | timestamptz | |

### orders
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| brief_id | uuid FK | |
| offer_id | uuid FK | offer yang di-accept |
| customer_id | uuid FK | |
| designer_id | uuid FK | |
| status | enum | lihat bagian 6 |
| price | int | terkunci |
| fee | int | terkunci |
| designer_net | int | terkunci |
| duration_days | int | terkunci |
| revision_quota | int | terkunci |
| revisions_used | int default 0 | |
| deliverables | text[] | terkunci |
| contract_snapshot | jsonb | salinan kontrak saat deal |
| payment_expires_at | timestamptz | |
| paid_at | timestamptz null | |
| deadline_at | timestamptz null | `paid_at + duration_days` |
| delivered_at | timestamptz null | |
| auto_approve_at | timestamptz null | |
| completed_at | timestamptz null | |
| cancelled_reason | text null | |
| created_at | timestamptz | |

### deliveries
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| round | int | 1 = pengiriman awal, 2+ = setelah revisi |
| note | text | |
| created_at | timestamptz | |

### delivery_files
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| delivery_id | uuid FK | |
| drive_file_id | text | file asli di Drive designer |
| file_name | text | |
| mime_type | text | |
| size_bytes | bigint | |
| sha256 | text | hash untuk bukti dispute |
| preview_asset_id | uuid null | versi watermark (jika gambar) |

### preview_assets
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| drive_file_id | text | preview ikut disimpan di folder Drive designer (`/previews`) |
| width / height | int | |
| created_at | timestamptz | |

### revision_requests
| Kolom | Tipe |
|---|---|
| id | uuid PK |
| order_id | uuid FK |
| delivery_id | uuid FK |
| message | text |
| attachments | jsonb |
| created_at | timestamptz |

### messages (chat per order / per brief)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| thread_id | uuid | satu thread per (brief, designer) |
| sender_id | uuid | |
| type | enum(TEXT, IMAGE, OFFER_EVENT, SYSTEM) | |
| body | text | |
| attachments | jsonb | |
| created_at | timestamptz | |

### disputes
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| opened_by | uuid FK | |
| reason | text | |
| evidence | jsonb | pointer ke chat, file, timestamp |
| status | enum(OPEN, RESOLVED) | |
| resolution | enum(REFUND_FULL, RELEASE_FULL, SPLIT) null | |
| designer_percent | int null | 0–100 untuk SPLIT |
| resolved_by | uuid null | admin |
| resolution_note | text null | |
| created_at / resolved_at | timestamptz | |

### ledger_entries (append-only)
| Kolom | Tipe |
|---|---|
| id | bigserial PK |
| txn_id | uuid (satu transaksi = beberapa baris yang balance) |
| account | text |
| direction | enum(DEBIT, CREDIT) |
| amount | int > 0 |
| order_id | uuid null |
| user_id | uuid null |
| reason | text |
| idempotency_key | text (unique per txn) |
| created_at | timestamptz |

### payments
| Kolom | Tipe |
|---|---|
| id | uuid PK |
| order_id | uuid FK |
| gateway_ref | text |
| amount | int |
| status | enum(PENDING, PAID, EXPIRED, FAILED) |
| checkout_url | text |
| raw_webhook | jsonb |
| paid_at | timestamptz null |

### withdrawals
| Kolom | Tipe |
|---|---|
| id | uuid PK |
| user_id | uuid FK |
| amount | int |
| method | enum(BANK, EWALLET) |
| destination | jsonb (terenkripsi sebagian) |
| status | enum(REQUESTED, PROCESSING, SUCCESS, FAILED) |
| gateway_ref | text null |
| created_at | timestamptz |

### reviews
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| reviewer_id | uuid | |
| reviewee_id | uuid | |
| rating | int 1–5 | |
| comment | text | |
| unique | (order_id, reviewer_id) | satu review per sisi |

### notifications, audit_logs
- `notifications`: id, user_id, type, payload jsonb, read_at, created_at.
- `audit_logs`: id, actor_id, action, entity, entity_id, before jsonb, after jsonb, created_at. Catat semua perubahan status order, dispute, dan aksi admin.

---

## 6. State Machine Order

```
                     ┌────────────────────────────────────────────┐
                     │                                            ▼
AWAITING_PAYMENT ──► IN_PROGRESS ──► AWAITING_APPROVAL ──► COMPLETED
   │                    │  ▲              │   │
   │ (expired/cancel)   │  │              │   └─► REVISION ──┐
   ▼                    │  └──────────────┼───────────────────┘
CANCELLED               │                 │
                        ▼                 ▼
                    DISPUTED ◄────────────┘
                        │
                        ▼
             COMPLETED / REFUNDED (sesuai hasil dispute)
```

| Status | Arti | Transisi yang diizinkan |
|---|---|---|
| `AWAITING_PAYMENT` | Deal terjadi, menunggu customer bayar | → `IN_PROGRESS` (webhook paid), → `CANCELLED` (expired 24 jam atau dibatalkan) |
| `IN_PROGRESS` | Dibayar, designer mengerjakan | → `AWAITING_APPROVAL` (designer deliver), → `DISPUTED`, → `REFUNDED` (auto-refund telat) |
| `AWAITING_APPROVAL` | Customer review hasil | → `COMPLETED` (setuju / auto-approve), → `REVISION`, → `DISPUTED` |
| `REVISION` | Customer minta revisi, designer memperbaiki | → `AWAITING_APPROVAL` (deliver ulang), → `DISPUTED` |
| `DISPUTED` | Dibekukan, menunggu admin | → `COMPLETED` / `REFUNDED` (hasil dispute) |
| `COMPLETED` | Dana dirilis ke designer | final |
| `REFUNDED` | Dana dikembalikan ke customer | final |
| `CANCELLED` | Batal sebelum bayar | final |

**Aturan implementasi**
- Semua transisi lewat satu fungsi `transitionOrder(orderId, event, actor)` yang memvalidasi tabel di atas. Dilarang update kolom `status` langsung dari tempat lain.
- Setiap transisi menulis `audit_logs` dan mengirim notifikasi.
- Transisi yang menyentuh uang (`COMPLETED`, `REFUNDED`) memanggil Ledger Service dalam transaction yang sama.

---

## 7. Alur Detail

### 7.1 Register & koneksi Google Drive
1. User isi email + password (+ nama tampilan). Validasi: email unik, password minimal 8 karakter.
2. Setelah login pertama, tampilkan layar **"Sambungkan Google Drive"**. Wajib untuk designer. Untuk customer opsional (dibutuhkan jika customer upload referensi besar; referensi kecil boleh upload langsung ke storage sementara).
3. OAuth Google dengan scope **minimal**: `https://www.googleapis.com/auth/drive.file` (hanya file yang dibuat/dibuka lewat aplikasi).
4. Setelah sukses: buat folder `JokiDay` di Drive user dengan subfolder:
   ```
   JokiDay/
   ├── portfolio/
   ├── previews/
   └── orders/{orderId}/
   ```
5. Simpan `refresh_token` terenkripsi dan `root_folder_id`.
6. Jika token dicabut (REVOKED), blokir upload baru dan tampilkan banner "Sambungkan ulang Drive".

### 7.2 Profil designer
- Isi bio, kategori skill, ketersediaan.
- Portofolio = kumpulan `posts`.
- Tampilkan rating, jumlah proyek selesai, tombol **Order**.

### 7.3 Order jalur Direct
1. Customer buka profil designer atau post karya → klik **Order**.
2. Isi form brief (judul, deskripsi, referensi, format output, jumlah revisi, deadline keinginan, budget hint opsional).
3. Brief dibuat dengan `mode=DIRECT`, `target_designer_id` terisi. Thread chat dibuat. Designer dapat notifikasi.
4. Designer buka brief dan memilih:
   - **Tolak** → brief `CLOSED`, customer diberi tahu.
   - **Kirim penawaran** → lanjut ke 7.5.
   - **Tanya dulu** → chat.

### 7.4 Order jalur Pasar
1. Customer buat brief `mode=MARKET`. Brief muncul di **Feed Pasar** untuk semua designer.
2. Designer bisa filter berdasarkan kategori dan melihat brief `OPEN`.
3. Beberapa designer boleh kirim penawaran ke brief yang sama. Tiap designer punya thread chat sendiri dengan customer.
4. Customer membandingkan penawaran (harga, durasi, profil, rating) lalu **Accept** satu penawaran.
5. Saat satu penawaran di-accept: brief jadi `CLAIMED`, penawaran lain jadi `DECLINED`, designer lain diberi tahu.
6. Brief pasar kedaluwarsa (`EXPIRED`) jika tidak ada deal dalam 7 hari (konfigurasi).

### 7.5 Penawaran dan tawar-menawar
Aturan inti: **angka harga hanya boleh diinput designer.**

1. Designer membuat **Offer**: `price`, `duration_days`, `revision_quota`, `deliverables`, `note`.
2. Customer punya tiga aksi di setiap offer:
   - **Terima** → buat order (lanjut 7.6).
   - **Tolak** → offer `DECLINED`.
   - **Minta tawar ulang** → kirim pesan (misal "bisa 40rb?"). Ini hanya teks di chat, bukan angka resmi.
3. Designer menanggapi dengan **offer baru** (version + 1). Offer lama jadi `SUPERSEDED`.
4. Riwayat semua offer (harga, versi, waktu) tampil di chat sebagai kartu `OFFER_EVENT`.
5. Offer hanya satu yang `PENDING` per (brief, designer) pada satu waktu.
6. Offer kedaluwarsa 3 hari jika tidak direspons (konfigurasi).
7. Hanya offer `PENDING` yang bisa di-accept. Setelah di-accept, tidak bisa diubah.

### 7.6 Kontrak otomatis dan pembayaran
1. Saat offer di-accept, sistem membuat `orders` dengan status `AWAITING_PAYMENT`.
2. Hitung `fee` dan `designer_net` (bagian 4). Simpan `contract_snapshot` berisi: harga, fee, deadline (durasi), revisi, deliverables, ringkasan brief, versi offer.
3. Buat pembayaran WaroengPay (lihat 8). Customer diarahkan ke `checkout_url`.
4. `payment_expires_at = now + 24 jam`. Jika lewat dan belum bayar → job otomatis ubah ke `CANCELLED`.
5. Saat webhook `PAID` valid:
   - Order → `IN_PROGRESS`, `paid_at = now`, `deadline_at = paid_at + duration_days`.
   - Ledger: `GATEWAY_CLEARING` → `ESCROW:{order}`.
   - Notifikasi ke designer dan customer.

### 7.7 Pengerjaan dan delivery
1. Designer mengerjakan dan bisa chat dengan customer.
2. Designer upload file lewat aplikasi:
   - Server menerima file via stream, menaruhnya ke `JokiDay/orders/{orderId}/round-{n}/` di Drive designer.
   - Hitung `sha256`.
   - Jika gambar: buat versi watermark (bagian 10), simpan ke `JokiDay/previews/`, buat `preview_assets`.
   - File asli **tidak** disimpan di server. Temp file wajib dihapus setelah selesai (gunakan `finally`).
3. Designer tekan **Kirim hasil**: order → `AWAITING_APPROVAL`, `delivered_at = now`, `auto_approve_at = now + 3 hari`.
4. Customer hanya melihat **preview watermark**. File final terkunci.

### 7.8 Revisi
1. Customer tekan **Minta Revisi** + isi pesan (+ lampiran). Hanya jika `revisions_used < revision_quota`.
2. `revisions_used += 1`, order → `REVISION`, `auto_approve_at` dibatalkan.
3. Designer upload hasil baru (`round + 1`) lalu Kirim hasil lagi → `AWAITING_APPROVAL`, `auto_approve_at` dihitung ulang.
4. Jika kuota habis, tombol revisi disembunyikan. Customer bisa **Setujui** atau **Ajukan Dispute**.
5. Revisi tambahan di luar kuota = order baru atau offer tambahan (di luar MVP).
6. Deadline **tidak** direset oleh revisi. Waktu revisi dihitung dengan batas: designer punya 48 jam per putaran revisi, dan `deadline_at` otomatis diperpanjang ke `max(deadline_at, now + 48 jam)` saat order masuk `REVISION`.

### 7.9 Setujui dan rilis dana
Dipicu oleh: customer tekan **Setujui**, atau job auto-approve.
1. Order → `COMPLETED`, `completed_at = now`.
2. Ledger: rilis `price − fee` ke `WALLET_AVAILABLE:{designer}` dan `fee` ke `PLATFORM_REVENUE`.
3. File final terbuka untuk customer (download via proxy, bagian 9.4).
4. `completed_count` designer bertambah.
5. Prompt review dua arah.

### 7.10 Aturan otomatis (job)
| Kondisi | Aksi |
|---|---|
| `AWAITING_PAYMENT` lewat 24 jam | → `CANCELLED` |
| `IN_PROGRESS` dan 24 jam sebelum `deadline_at` | Notifikasi pengingat ke designer |
| `IN_PROGRESS` dan `deadline_at` lewat | Tandai `overdue`, kirim peringatan ke designer + customer |
| Designer bisa minta **perpanjangan** | Customer menyetujui di chat → `deadline_at` baru. Maksimal 2 kali |
| `overdue` + 48 jam tanpa delivery dan tanpa perpanjangan | **Auto-refund**: → `REFUNDED`, dana kembali ke customer |
| `AWAITING_APPROVAL` dan `auto_approve_at` lewat | **Auto-approve** → `COMPLETED` |
| `REVISION` dan 48 jam tanpa delivery ulang | Peringatan, lalu aturan overdue yang sama |
| Dispute `OPEN` | Semua timer order **dibekukan** |

### 7.11 Dispute
1. Customer atau designer menekan **Ajukan Dispute** pada order status `IN_PROGRESS`, `AWAITING_APPROVAL`, atau `REVISION`.
2. Wajib isi alasan. Sistem otomatis melampirkan bukti: riwayat chat, riwayat offer, daftar delivery (nama file, `sha256`, timestamp), log status, kontrak.
3. Pihak lawan diberi waktu 48 jam menambah bukti/tanggapan.
4. Admin memutuskan di panel admin:
   - `REFUND_FULL` → semua ke customer, status `REFUNDED`.
   - `RELEASE_FULL` → ke designer (kena fee 5%), status `COMPLETED`.
   - `SPLIT` dengan `designer_percent` (misal 60) → 60% ke designer (fee 5% dari bagian itu), sisanya refund customer.
5. Keputusan menulis ledger dan audit log, notifikasi ke kedua pihak. Keputusan final.

### 7.12 Dompet dan penarikan
1. Designer buka **Dompet**: saldo tertahan, saldo tersedia, riwayat.
2. Tarik saldo: pilih metode (bank / e-wallet), isi tujuan, jumlah. Minimal tarik dan biaya admin penarikan di konfigurasi.
3. Request → ledger pindah ke `WITHDRAWAL_PENDING`, status `REQUESTED`.
4. Worker kirim ke WaroengPay. Sukses/gagal ditangani via webhook atau polling. Gagal = saldo dikembalikan.
5. Refund customer: diproses lewat gateway ke metode pembayaran asal bila didukung; jika tidak, masuk **saldo kredit JokiDay** customer yang bisa dipakai untuk order lain atau ditarik. (Cek kemampuan WaroengPay saat implementasi.)

### 7.13 Feed portofolio
1. Designer buat post: pilih gambar, caption, kategori.
2. Server: terima gambar → simpan asli ke `JokiDay/portfolio/` di Drive designer → buat versi watermark → simpan `posts`.
3. Feed hanya menampilkan versi watermark. Setiap post punya tombol **Order**.
4. Fitur sosial MVP: like, simpan, lihat profil. Komentar menyusul.

### 7.14 Review
- Setelah `COMPLETED`, masing-masing pihak boleh memberi rating 1–5 dan komentar, sekali per order.
- Rating designer dihitung ulang (`rating_avg`, `rating_count`).
- Review customer terhadap designer tampil di profil. Review designer terhadap customer tampil sebagai skor kepercayaan customer.

---

## 8. Integrasi Pembayaran WaroengPay

URL: https://waroengpay.com/

> **Catatan untuk developer/agent:** detail endpoint, format signature webhook, dan dukungan payout/refund **belum diverifikasi** di dokumen ini. Baca dokumentasi resmi WaroengPay sebelum implementasi dan isi bagian ini. Jangan menebak endpoint.

Bungkus semua panggilan di **adapter** supaya gateway bisa diganti tanpa mengubah logika bisnis.

```ts
// src/server/payment/gateway.ts
export interface PaymentGateway {
  createCharge(input: {
    orderId: string;
    amount: number;          // rupiah, integer
    customerEmail: string;
    expiresAt: Date;
    callbackUrl: string;
    returnUrl: string;
  }): Promise<{ gatewayRef: string; checkoutUrl: string }>;

  verifyWebhook(rawBody: string, headers: Record<string, string>): {
    valid: boolean;
    gatewayRef: string;
    status: 'PAID' | 'EXPIRED' | 'FAILED';
    amount: number;
  };

  createPayout(input: {
    withdrawalId: string;
    amount: number;
    method: 'BANK' | 'EWALLET';
    destination: Record<string, string>;
  }): Promise<{ gatewayRef: string }>;

  getChargeStatus(gatewayRef: string): Promise<'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED'>;
}
```

Implementasi: `WaroengPayGateway implements PaymentGateway`. Sediakan juga `MockGateway` untuk development dan test (simulasi bayar sukses/gagal).

**Aturan webhook**
1. Verifikasi signature. Tolak jika tidak valid (HTTP 401).
2. Cocokkan `amount` dengan `orders.price`. Jika beda, jangan proses, catat alarm.
3. Idempotent: jika payment sudah `PAID`, balas 200 tanpa proses ulang.
4. Balas cepat (200), pekerjaan berat dilempar ke queue.
5. Sediakan job rekonsiliasi: tiap 10 menit cek payment `PENDING` ke gateway lewat `getChargeStatus`, untuk jaga-jaga webhook hilang.

---

## 9. Sistem File dan Google Drive

### 9.1 Prinsip
- File asli selalu di Drive milik designer.
- Server hanya menyimpan metadata (`drive_file_id`, nama, ukuran, hash).
- Server boleh memproses file sementara (stream/temp) untuk membuat watermark, lalu menghapusnya.

### 9.2 Drive Service
```ts
interface DriveService {
  ensureRootFolder(userId): Promise<string>;
  uploadStream(userId, { folderPath, fileName, mimeType, stream }): Promise<{ fileId, size }>;
  downloadStream(userId, fileId): Promise<Readable>;
  deleteFile(userId, fileId): Promise<void>;
}
```
- Pakai refresh token milik **designer pemilik file** (didekripsi hanya di memori saat dipakai).
- Tangani error: token revoked, kuota Drive penuh, rate limit (retry dengan exponential backoff).
- Upload besar: gunakan resumable upload.

### 9.3 Batasan upload
- Ukuran maksimum per file: konfigurasi (default 100 MB).
- Tipe diizinkan: png, jpg, webp, pdf, psd, ai, svg, zip, fig-export.
- Validasi mime dengan magic bytes, bukan hanya ekstensi.

### 9.4 Distribusi file final ke customer
- Customer **tidak** diberi akses Drive designer.
- Download lewat endpoint proxy: `GET /api/orders/:id/files/:fileId/download`
  - Cek: user adalah customer order itu, status `COMPLETED`.
  - Server stream dari Drive designer → ke customer (tanpa menyimpan).
  - Jika Drive designer bermasalah saat sudah `COMPLETED`, tampilkan error dan beri tahu designer untuk sambungkan ulang. Jangan tahan dana karena ini.
- Selama belum `COMPLETED`, hanya endpoint preview watermark yang bisa diakses.

---

## 10. Watermark dan Anti-Download

### 10.1 Pembuatan watermark (server-side, `sharp`)
- Teks `JokiDay • @username` diulang diagonal (tiling) menutupi seluruh gambar, opacity 25–35%.
- Resolusi preview dibatasi (sisi terpanjang maks 1200 px), kualitas JPEG/WebP sedang.
- Watermark **dibakar ke piksel**, bukan overlay CSS. Ini wajib.
- Untuk PDF: render halaman 1–3 jadi gambar lalu watermark. Untuk PSD/AI/ZIP: tampilkan ikon + nama file, tanpa preview, kecuali designer upload gambar preview terpisah.

### 10.2 Anti-download (lapisan perlindungan praktis)
1. Hanya versi watermark yang pernah dikirim ke browser.
2. URL preview bertanda tangan (signed URL), kedaluwarsa pendek (5 menit), terikat user.
3. Header: `Cache-Control: private, no-store`, `Content-Disposition: inline`.
4. Frontend: `draggable=false`, blokir klik kanan pada gambar, `pointer-events` overlay transparan di atas gambar.
5. Rate limit endpoint preview.

> Catatan jujur untuk tim: tidak ada cara 100% mencegah screenshot. Karena watermark dibakar ke piksel dan resolusi dibatasi, hasil screenshot tetap tidak bernilai.

---

## 11. Notifikasi

Kanal: in-app (selalu), email, web push (jika diizinkan).

| Event | Penerima |
|---|---|
| Brief baru (direct) | Designer target |
| Penawaran masuk / penawaran baru | Customer |
| Pesan chat baru (digabung per 5 menit) | Lawan bicara |
| Deal terjadi, menunggu bayar | Customer |
| Pembayaran masuk | Designer + customer |
| Pengingat deadline H-24 jam | Designer |
| Deadline terlewat | Designer + customer |
| Delivery masuk | Customer |
| Permintaan revisi | Designer |
| Auto-approve H-24 jam | Customer |
| Order selesai, saldo masuk | Designer |
| Dispute dibuka / diputuskan | Kedua pihak |
| Penarikan sukses / gagal | Designer |

Simpan template notifikasi di satu file agar mudah diubah. Kirim lewat queue.

---

## 12. Job Worker (BullMQ / cron)

| Job | Jadwal | Fungsi |
|---|---|---|
| `expire-unpaid-orders` | tiap 5 menit | Batalkan order `AWAITING_PAYMENT` > 24 jam |
| `payment-reconcile` | tiap 10 menit | Cek payment `PENDING` ke gateway |
| `deadline-reminder` | tiap 15 menit | Kirim pengingat H-24 jam |
| `mark-overdue` | tiap 15 menit | Tandai overdue |
| `auto-refund-overdue` | tiap 15 menit | Refund jika overdue + 48 jam |
| `auto-approve` | tiap 15 menit | Selesaikan order yang `auto_approve_at` lewat |
| `expire-offers` / `expire-briefs` | tiap jam | Kedaluwarsakan offer dan brief |
| `withdrawal-poll` | tiap 5 menit | Cek status penarikan |
| `cleanup-temp` | tiap jam | Hapus file sementara sisa |

Semua job harus **idempotent** dan aman dijalankan ulang. Job yang menyentuh uang wajib mengunci baris order (`SELECT ... FOR UPDATE`).

---

## 13. API (REST, prefix `/api`)

Semua input divalidasi Zod. Semua endpoint selain auth wajib login. Cek otorisasi di setiap endpoint (user harus bagian dari order/brief).

### Auth & akun
| Method | Path | Fungsi |
|---|---|---|
| POST | `/auth/register` | Daftar |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/me` | Data user |
| POST | `/me/role` | Ganti `active_role` |
| GET | `/google/connect` | Mulai OAuth Drive |
| GET | `/google/callback` | Callback OAuth |
| DELETE | `/google/connection` | Putuskan Drive |

### Designer & feed
| Method | Path | Fungsi |
|---|---|---|
| POST | `/designer/profile` | Buat/ubah profil designer |
| GET | `/designers/:id` | Profil publik |
| GET | `/designers` | List + filter |
| POST | `/posts` | Buat post (upload gambar) |
| GET | `/feed` | Feed portofolio |
| GET | `/posts/:id/preview` | Preview watermark (signed) |

### Brief, offer, chat
| Method | Path | Fungsi |
|---|---|---|
| POST | `/briefs` | Buat brief (direct/market) |
| GET | `/briefs/market` | Feed pasar |
| GET | `/briefs/:id` | Detail brief |
| POST | `/briefs/:id/offers` | Designer kirim offer |
| POST | `/offers/:id/accept` | Customer terima → buat order |
| POST | `/offers/:id/decline` | Customer/designer tolak |
| POST | `/offers/:id/withdraw` | Designer tarik offer |
| GET | `/threads/:id/messages` | Riwayat chat |
| POST | `/threads/:id/messages` | Kirim pesan |
| GET | `/threads/:id/stream` | Realtime (SSE) |

### Order
| Method | Path | Fungsi |
|---|---|---|
| GET | `/orders` | List order milik user |
| GET | `/orders/:id` | Detail + timeline |
| POST | `/orders/:id/pay` | Buat/ulang checkout |
| POST | `/orders/:id/cancel` | Batal (hanya `AWAITING_PAYMENT`) |
| POST | `/orders/:id/files` | Upload file kerja (designer) |
| POST | `/orders/:id/deliver` | Kirim hasil |
| POST | `/orders/:id/revision` | Minta revisi |
| POST | `/orders/:id/approve` | Setujui |
| POST | `/orders/:id/extension` | Minta perpanjangan |
| POST | `/orders/:id/extension/respond` | Customer setuju/tolak |
| GET | `/orders/:id/files/:fileId/preview` | Preview watermark |
| GET | `/orders/:id/files/:fileId/download` | File final (hanya `COMPLETED`) |
| POST | `/orders/:id/dispute` | Ajukan dispute |
| POST | `/orders/:id/review` | Beri review |

### Uang
| Method | Path | Fungsi |
|---|---|---|
| POST | `/webhooks/waroengpay` | Webhook pembayaran/payout |
| GET | `/wallet` | Saldo tertahan, tersedia |
| GET | `/wallet/transactions` | Riwayat |
| POST | `/wallet/withdrawals` | Ajukan tarik saldo |
| GET | `/wallet/withdrawals` | Riwayat penarikan |

### Admin
| Method | Path | Fungsi |
|---|---|---|
| GET | `/admin/disputes` | Daftar dispute |
| POST | `/admin/disputes/:id/resolve` | Putuskan |
| GET | `/admin/orders` | Semua order |
| GET | `/admin/ledger` | Ledger + cek balance |
| GET/PUT | `/admin/config` | Konfigurasi |

---

## 14. Halaman (UI)

Responsif penuh untuk **HP dan PC**. Mulai dari HP (360px), tetapi layout PC punya pola sendiri (sidebar, dua kolom, tabel, modal). Semua spesifikasi visual, breakpoint, dan pola per layar ada di **`DESIGN.md`** dan wajib diikuti. Bahasa Indonesia.

**Breakpoint:** `xs` 360, `sm` 600, `md` 900, `lg` 1200, `xl` 1536.

| Area | HP | PC |
|---|---|---|
| Navigasi | Tab bawah | Sidebar + topbar |
| Detail order | Satu kolom, tombol aksi menempel di bawah | Dua kolom, panel kanan berisi kontrak, escrow, tombol aksi |
| Pasar | Daftar + halaman detail | Filter kiri, daftar, panel detail kanan |
| Chat | Daftar dan percakapan terpisah | Dua sampai tiga panel |
| Dompet / riwayat | Daftar kartu | Tabel |
| Upload file | Pilih berkas | Seret dan lepas + pilih berkas |
| Admin | Bisa dibaca | Desktop-first, tabel padat |

**Publik:** Beranda, Feed karya, Profil designer, Pasar (daftar brief), Login/Register.

**Customer:** Buat Brief, Daftar Order Saya, Detail Order (timeline status, chat, tombol sesuai status), Layar Bayar, Review.

**Designer:** Dashboard (order aktif, deadline terdekat), Brief Masuk, Form Penawaran, Detail Order (upload, kirim hasil), Dompet, Penarikan, Kelola Portofolio.

**Umum:** Pengaturan akun, Sambungkan Drive, Notifikasi, Ganti Peran.

**Admin:** Antrian Dispute, Detail Dispute (semua bukti), Ledger, Konfigurasi.

**Tombol per status (Detail Order)**

| Status | Customer melihat | Designer melihat |
|---|---|---|
| `AWAITING_PAYMENT` | Bayar, Batal | Menunggu pembayaran |
| `IN_PROGRESS` | Chat, Ajukan Dispute | Upload, Kirim Hasil, Minta Perpanjangan, Dispute |
| `AWAITING_APPROVAL` | Preview, Setujui, Minta Revisi, Dispute | Menunggu persetujuan |
| `REVISION` | Menunggu revisi, Dispute | Lihat catatan revisi, Upload, Kirim Hasil |
| `DISPUTED` | Tambah bukti | Tambah bukti |
| `COMPLETED` | Download final, Review | Review, lihat saldo |

---

## 15. Konfigurasi (tabel `app_config`, bisa diubah admin)

| Key | Default |
|---|---|
| `fee_percent` | 5 |
| `payment_expiry_hours` | 24 |
| `auto_approve_days` | 3 |
| `overdue_grace_hours` | 48 |
| `max_extensions` | 2 |
| `offer_expiry_days` | 3 |
| `market_brief_expiry_days` | 7 |
| `dispute_response_hours` | 48 |
| `min_withdrawal` | 50000 |
| `withdrawal_fee` | 0 |
| `max_upload_mb` | 100 |
| `preview_max_px` | 1200 |

---

## 16. Keamanan Teknis

- Password: argon2id. Session: cookie httpOnly, secure, sameSite=lax. CSRF token untuk aksi mutasi.
- Token Google: enkripsi AES-256-GCM, kunci di env, jangan pernah di-log.
- Rate limit: login, register, chat, upload, preview.
- Semua endpoint cek kepemilikan resource (cegah IDOR).
- Upload: validasi magic bytes, batasi ukuran, nama file di-sanitize.
- Log tidak boleh memuat password, token, atau data rekening lengkap.
- Webhook: verifikasi signature, idempotent.
- Secrets hanya di environment variable.

---

## 17. Fase Build (urutan kerja untuk AI agent)

Kerjakan berurutan. Jangan lompat fase. Setiap fase selesai jika semua checklist **dan** test-nya lulus.

### Fase 0 — Fondasi
- [ ] Inisialisasi Next.js + TypeScript + Tailwind + Prisma + ESLint + Prettier
- [ ] Impor token dari `DESIGN.md` (`npx @google/design.md export --format css-tailwind DESIGN.md`) dan set breakpoint
- [ ] Docker Compose: PostgreSQL + Redis
- [ ] Skema Prisma lengkap (bagian 5) + migrasi
- [ ] `app_config` + seed
- [ ] Util: Zod, error handler standar, logger, `Result` type
- [ ] CI sederhana: lint + test

### Fase 1 — Akun, profil, Drive
- [ ] Register/login/logout, session
- [ ] Role switch
- [ ] Google OAuth + enkripsi token + buat folder JokiDay
- [ ] Profil designer
- [ ] Test: register, login, koneksi Drive (mock Google)

### Fase 2 — Brief, offer, chat
- [ ] Form brief (direct)
- [ ] Offer + versi + riwayat, aturan "harga hanya dari designer"
- [ ] Chat per thread + realtime + kirim gambar
- [ ] Accept offer → buat order + kontrak snapshot
- [ ] Test: alur offer sampai accept; pastikan customer tidak bisa membuat offer berharga

### Fase 3 — Escrow dan pembayaran
- [ ] `PaymentGateway` interface + `MockGateway`
- [ ] Ledger Service (double-entry, idempotent, append-only) + test balance
- [ ] Buat charge, halaman bayar, webhook (signature, idempotent, cek amount)
- [ ] Transisi `AWAITING_PAYMENT → IN_PROGRESS`, hitung `deadline_at`
- [ ] Job expire unpaid + reconcile
- [ ] Implementasi `WaroengPayGateway` setelah baca dokumentasi resminya
- [ ] Test: webhook ganda, amount tidak cocok, expired

### Fase 4 — Pengerjaan, revisi, approve
- [ ] State machine `transitionOrder` + audit log
- [ ] Upload ke Drive (stream) + sha256 + hapus temp
- [ ] Watermark service + preview signed URL
- [ ] Deliver, revisi (kuota), approve
- [ ] Rilis dana + fee 5% ke ledger
- [ ] Auto-approve job
- [ ] Download final via proxy (hanya `COMPLETED`)
- [ ] Test: fee 50.000 → 47.500 / 2.500; kuota revisi; customer tidak bisa akses file final sebelum approve

### Fase 5 — Deadline, dispute, aturan otomatis
- [ ] Pengingat, overdue, perpanjangan, auto-refund
- [ ] Dispute: buka, kumpulkan bukti otomatis, panel admin, 3 jenis keputusan
- [ ] Bekukan timer saat dispute
- [ ] Test: tiap hasil dispute menghasilkan ledger yang balance

### Fase 6 — Dompet dan penarikan
- [ ] Halaman dompet (tertahan / tersedia / riwayat)
- [ ] Withdrawal request, payout via adapter, polling, handling gagal
- [ ] Test: saldo tidak bisa minus, penarikan paralel tidak double-spend

### Fase 7 — Portofolio dan feed
- [ ] Post karya + watermark + signed preview
- [ ] Feed, like, simpan
- [ ] Tombol Order dari profil dan post
- [ ] Proteksi anti-download (bagian 10.2)

### Fase 8 — Mode Pasar
- [ ] Brief pasar + feed pasar + filter
- [ ] Banyak offer per brief, accept satu → tutup yang lain
- [ ] Kedaluwarsa brief

### Fase 9 — Review dan notifikasi
- [ ] Review dua arah + hitung ulang rating
- [ ] Notifikasi in-app, email, push (semua event bagian 11)

### Fase 10 — Penyelesaian
- [ ] Search dan filter designer
- [ ] Panel admin lengkap
- [ ] E2E Playwright: alur direct sampai selesai, alur pasar, dispute, refund otomatis
- [ ] Optimasi performa dan aksesibilitas dasar
- [ ] Tes visual Playwright di lebar 360, 768, 1024, 1440 untuk alur utama (tanpa scroll horizontal)

---

## 18. Aturan untuk AI Agent

1. **Baca seluruh `app.md` dulu.** Jika ada konflik antara permintaan lisan dan dokumen ini, tanyakan sebelum menyimpang.
2. **Kerjakan satu fase sekali.** Selesaikan checklist, jalankan test, baru lanjut.
3. **Jangan mengarang** endpoint WaroengPay. Baca dokumentasinya. Jika belum bisa diakses, bangun dengan `MockGateway` dan tandai `TODO(waroengpay)`.
4. **Uang = integer rupiah.** Tidak ada float. Tidak ada update saldo langsung. Selalu lewat Ledger Service.
5. **Status order hanya berubah lewat `transitionOrder`.** Jangan update kolom status dari tempat lain.
6. **Tidak ada file asli designer di disk server** setelah request selesai. Selalu bersihkan temp di `finally`.
7. **Setiap operasi uang idempotent** dan dalam satu transaction.
8. **Tulis test untuk setiap aturan bisnis** di bagian 4, 6, dan 7. Test uang wajib memverifikasi total debit = total kredit.
9. **Jangan menyimpan secret di kode.** Pakai `.env` dan sediakan `.env.example`.
10. **Commit kecil dan bermakna** per fitur. Format: `fase-N: deskripsi singkat`.
11. **Jika spesifikasi ambigu, pilih opsi paling sederhana yang konsisten dengan dokumen**, catat keputusan di `DECISIONS.md`.
12. **Setiap halaman wajib responsif HP dan PC** sesuai `DESIGN.md`. Jangan membangun versi HP saja lalu menunda PC.
13. **Jangan menambah fitur di luar dokumen** sebelum Fase 10 selesai. Ide baru masuk ke `BACKLOG.md`.

---

## 19. Struktur Folder

```
jokiday/
├── app.md
├── DECISIONS.md
├── BACKLOG.md
├── .env.example
├── docker-compose.yml
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/                      # halaman + route handlers (/api)
│   ├── components/
│   ├── lib/                      # util umum, zod, errors
│   └── server/
│       ├── auth/
│       ├── orders/               # transitionOrder, kontrak
│       ├── offers/
│       ├── chat/
│       ├── payment/              # gateway.ts, waroengpay.ts, mock.ts
│       ├── ledger/
│       ├── drive/
│       ├── media/                # watermark, signed url
│       ├── disputes/
│       ├── wallet/
│       ├── notifications/
│       └── jobs/                 # worker + definisi job
└── tests/
    ├── unit/
    └── e2e/
```

---

## 20. Environment Variables (`.env.example`)

```
DATABASE_URL=
REDIS_URL=
APP_URL=
SESSION_SECRET=
ENCRYPTION_KEY=              # 32 byte, untuk token Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
WAROENGPAY_API_KEY=
WAROENGPAY_SECRET=
WAROENGPAY_WEBHOOK_SECRET=
WAROENGPAY_BASE_URL=
PAYMENT_GATEWAY=mock         # mock | waroengpay
EMAIL_FROM=
EMAIL_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
SIGNED_URL_SECRET=
```

---

## 21. Definisi Selesai (MVP)

MVP dianggap selesai jika skenario ini berjalan dari ujung ke ujung tanpa intervensi manual:

1. Designer register, sambung Drive, buat profil, post karya (ber-watermark).
2. Customer register, klik Order di profil designer, isi brief.
3. Designer kirim penawaran, customer minta tawar ulang, designer kirim penawaran baru, customer terima.
4. Customer bayar via gateway, dana masuk escrow, deadline mulai.
5. Designer upload file ke Drive-nya, kirim hasil. Customer hanya melihat preview watermark.
6. Customer minta satu revisi, designer kirim ulang, customer setujui.
7. Dana rilis: designer menerima 95% di saldo tersedia, platform 5%.
8. Designer menarik saldo.
9. Skenario gagal juga lulus: tidak bayar (batal otomatis), designer telat (refund otomatis), customer diam (auto-approve), dispute (3 jenis hasil) dengan ledger selalu balance.
