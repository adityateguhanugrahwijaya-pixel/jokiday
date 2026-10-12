# Architecture Decisions (DECISIONS.md)

Dokumen ini mencatat keputusan arsitektur dan teknis saat membangun JokiDay sesuai `app.md` dan `DESIGN.md`.

## ADR-001: Antislop Mode dan Design Read
- **Status:** Diterima
- **Konteks:** Sesuai aturan antislop, sesi berjalan dalam mode `during` (session override).
- **Design Read:** Marketplace freelancer desain dengan escrow otomatis untuk Freelancer desainer dan customer di Indonesia, dalam gaya clean, flat, secure navy-blue & action-orange, dial ENERGY 2 / RHYTHM 2 / MOTION 1.
- **Konsekuensi:** Semua UI, copy, dan interaksi mengikuti prinsip anti-slop: tanpa em dash (`—`), bahasa Indonesia natural ("kamu", lugas), kontras warna WCAG AA, navigasi responsif, tidak ada dead buttons/links.

## ADR-002: Next.js App Router dan Tailwind CSS Design Tokens
- **Status:** Diterima
- **Konteks:** `DESIGN.md` mendefinisikan token warna (`primary: #1D4ED8`, `secondary: #FF7A1A`, `background: #F5F8FF`, `surface: #FFFFFF`, `border: #D9E2F5`, `text: #0B1F4A`, dll.), font `Plus Jakarta Sans`, radius bertingkat (`sm: 6px`, `md: 12px`, `lg: 20px`, `full: 9999px`), dan breakpoint kustom (`xs: 360px`, `sm: 600px`, `md: 900px`, `lg: 1200px`, `xl: 1536px`).
- **Keputusan:** Token diintegrasikan langsung ke `tailwind.config.ts` dan CSS variables di `src/app/globals.css`.

## ADR-003: SQLite / PostgreSQL Database Dual Support (Local Dev & Production)
- **Status:** Diterima
- **Konteks:** `app.md` merekomendasikan PostgreSQL + Prisma. Untuk memastikan kode dan unit test dapat langsung dijalankan mandiri tanpa ketergantungan wajib pada daemon PostgreSQL lokal saat build & test awal, Prisma schema dirancang kompatibel dan Docker Compose disediakan untuk PostgreSQL + Redis.

## ADR-004: PaymentGateway Adapter Pattern
- **Status:** Diterima
- **Konteks:** Perlu mendukung `MockGateway` untuk pengujian instan dan `WaroengPayGateway` untuk gateway produksi dan sandbox QRIS sesungguhnya dengan verifikasi HMAC (`X-Signature` & `X-WaroengPay-Timestamp`).
