import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ShieldCheck, ArrowLeft, Lock, Database, Cloud, Mail } from "lucide-react";

export const metadata = {
  title: "Kebijakan Privasi | JokiDay",
  description: "Kebijakan privasi resmi JokiDay mengenai pengumpulan, perlindungan data pribadi, dan integrasi Google Drive.",
};

export default function PrivacyPage() {
  return (
    <AppShell hideSidebar={true}>
      <div className="max-w-4xl mx-auto space-y-8 py-4 sm:py-8">
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary-soft text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
                Kebijakan Privasi (Privacy Policy)
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Terakhir diperbarui: 12 Oktober 2026 • Penyelenggara: AgentKikir (jokiday.agentkikir.cloud)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 sm:p-10 space-y-8 text-sm text-text leading-relaxed shadow-sm">
          <div className="p-4 bg-primary-soft/40 border border-primary/20 rounded-lg text-xs sm:text-sm text-text space-y-2">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Komitmen Perlindungan Data Pribadi</span>
            </p>
            <p className="text-text-muted leading-relaxed">
              JokiDay (dioperasikan oleh AgentKikir) berkomitmen penuh melindungi privasi dan keamanan data pribadi pengguna sesuai dengan Undang-Undang Republik Indonesia No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) serta standar industri global.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              1. Informasi Pribadi yang Kami Kumpulkan
            </h2>
            <p className="text-text-muted">
              Kami hanya mengumpulkan data yang diperlukan untuk memfasilitasi transaksi pesanan, pembayaran escrow, dan penyerahan karya:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>
                <strong>Data Akun:</strong> Nama tampilan, alamat email, kata sandi yang diamankan dengan algoritma hash satu arah (scrypt), dan gambar avatar.
              </li>
              <li>
                <strong>Data Verifikasi Desainer (KYC):</strong> Nomor Induk Kependudukan (NIK/KTP), nomor telepon, dan tautan portofolio eksternal. Nomor KTP disimpan dalam database menggunakan enkripsi simetris tingkat tinggi (AES-256-GCM).
              </li>
              <li>
                <strong>Data Transaksi & Keuangan:</strong> Riwayat pembayaran, riwayat pencairan saldo, dan informasi rekening bank atau e-wallet desainer. Transaksi QRIS diproses secara aman oleh gerbang pembayaran berlisensi (WaroengPay). JokiDay tidak menyimpan data kartu kredit atau PIN keuangan Anda.
              </li>
              <li>
                <strong>Data Komunikasi & Kontrak:</strong> Riwayat obrolan di dalam platform dan rincian brief pesanan untuk arsip kontrak dan bukti resmi jika terjadi mediasi sengketa (dispute).
              </li>
              <li>
                <strong>Data Teknis & Perangkat:</strong> Alamat IP (digunakan untuk sistem pencegahan serangan brute-force dan rate limit), jenis peramban, dan cookie sesi terproteksi httpOnly.
              </li>
            </ul>
          </section>

          {/* Kepatuhan Khusus Google API & Google Drive */}
          <section className="space-y-3 p-5 bg-background border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-primary font-bold text-base border-b border-border pb-2">
              <Cloud className="w-5 h-5 shrink-0" />
              <h2>2. Kebijakan Khusus Data Google & Google Drive API</h2>
            </div>
            <p className="text-text-muted">
              JokiDay menyediakan integrasi penyimpanan langsung ke Google Drive milik desainer agar file master karya desain tetap berada dalam kendali mandiri desainer.
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm text-text-muted">
              <p>
                <strong>A. Lingkup Izin (Scope) Minimal:</strong> Kami hanya meminta izin scope <code className="bg-surface px-1.5 py-0.5 rounded text-primary">https://www.googleapis.com/auth/drive.file</code>. Izin ini dibatasi secara ketat sehingga JokiDay <strong>HANYA</strong> dapat mengakses file dan folder yang dibuat langsung melalui aplikasi JokiDay. JokiDay sama sekali tidak memiliki akses dan tidak dapat melihat file pribadi lain yang ada di Google Drive Anda.
              </p>
              <p>
                <strong>B. Penggunaan Terbatas (Limited Use):</strong> Penggunaan dan transfer informasi yang diterima JokiDay dari Google API ke aplikasi lain mematuhi <em>Kebijakan Data Pengguna Layanan Google API (Google API Services User Data Policy)</em>, termasuk persyaratan Penggunaan Terbatas (Limited Use requirements).
              </p>
              <p>
                <strong>C. Penyimpanan Kredensial Terenkripsi:</strong> Token otorisasi Google (refresh token) disimpan di basis data menggunakan enkripsi kuat AES-256-GCM dan hanya didekripsi di memori server secara sementara saat proses penyerahan file berlangsung.
              </p>
              <p>
                <strong>D. Tidak Ada File Master di Server JokiDay:</strong> Server JokiDay tidak menyimpan file master karya desainer di hard drive lokal server. File master dialirkan langsung ke Google Drive desainer, dan server hanya memproses sementara untuk membuat pratinjau gambar ber-watermark.
              </p>
              <p>
                <strong>E. Pemutusan Akses & Penghapusan:</strong> Anda dapat mencabut izin akses Google Drive kapan saja melalui menu Pengaturan Profil di JokiDay atau langsung melalui dasbor Keamanan Akun Google Anda.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              3. Tujuan Penggunaan Data Pribadi
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Memverifikasi identitas pengguna dan mencegah pembuatan akun ganda atau penipuan.</li>
              <li>Memproses penerimaan dana escrow, pencairan saldo dompet ke rekening bank, dan penagihan biaya platform 5%.</li>
              <li>Mengamankan pertukaran file desain dan melindungi karya melalui penyematan watermark otomatis.</li>
              <li>Menyediakan bukti otentik dalam penyelesaian sengketa (dispute) oleh tim mediasi.</li>
              <li>Mengirimkan notifikasi status pesanan, pesan obrolan penting, dan pembaruan sistem.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              4. Berbagi Data dengan Pihak Ketiga
            </h2>
            <p className="text-text-muted">
              JokiDay <strong>TIDAK PERNAH</strong> menjual, menyewakan, atau memperdagangkan data pribadi pengguna kepada pihak ketiga atau biro iklan mana pun. Data hanya dibagikan secara terbatas kepada:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>
                <strong>Mitra Gerbang Pembayaran:</strong> WaroengPay untuk memproses tagihan QRIS dan verifikasi transfer penarikan dana.
              </li>
              <li>
                <strong>Penyedia Infrastruktur Cloud:</strong> Google LLC (Google Drive API) semata-mata untuk memfasilitasi penyimpanan file karya pesanan desainer.
              </li>
              <li>
                <strong>Kepatuhan Hukum:</strong> Apabila diwajibkan oleh peraturan perundang-undangan, panggilan pengadilan, atau perintah resmi otoritas penegak hukum Republik Indonesia yang berwenang.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              5. Keamanan Data dan Anti-Penyusupan
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Seluruh transmisi data dienkripsi menggunakan protokol HTTPS dengan sertifikat SSL/TLS modern.</li>
              <li>Penerapan filter anti-injection dan pembersihan input (input sanitization) untuk melindungi pengguna dari ancaman Cross-Site Scripting (XSS) dan injeksi skrip.</li>
              <li>Proteksi brute-force rate limiting untuk mencegah serangan otomatis pada proses login dan registrasi.</li>
              <li>Cookie sesi menggunakan atribut keamanan ketat (HttpOnly, SameSite, Secure).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              6. Hak-Hak Anda sebagai Pemilik Data (UU PDP)
            </h2>
            <p className="text-text-muted">
              Sesuai dengan regulasi Pelindungan Data Pribadi yang berlaku, Anda memiliki hak untuk:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Mengakses dan mendapatkan salinan data pribadi yang Anda simpan di JokiDay.</li>
              <li>Memperbarui atau memperbaiki ketidakakuratan data profil Anda.</li>
              <li>Meminta penghapusan akun dan data pribadi Anda (selama tidak ada kewajiban hukum, pesanan aktif, atau sengketa yang sedang berjalan).</li>
              <li>Mencabut persetujuan pemrosesan data, termasuk memutus integrasi Google Drive kapan saja.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              7. Kontak Pengelola Data Pribadi
            </h2>
            <p className="text-text-muted">
              Jika Anda memiliki pertanyaan, keberatan, atau ingin mengajukan permohonan hak atas data pribadi Anda, silakan hubungi tim pengelola data resmi kami:
            </p>
            <div className="p-4 bg-background border border-border rounded-lg space-y-1 text-xs text-text">
              <p className="font-bold text-sm">AgentKikir • JokiDay Platform</p>
              <p className="text-text-muted">Domisili: Jayapura, Papua, Indonesia</p>
              <p className="text-text-muted flex items-center gap-1.5 pt-1">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Email Resmi: <code className="text-primary font-semibold">Jokiday@agentkikir.cloud</code></span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
