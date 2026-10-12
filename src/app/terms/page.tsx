import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { FileText, ArrowLeft, Shield, Mail } from "lucide-react";

export const metadata = {
  title: "Syarat dan Ketentuan Layanan | JokiDay",
  description: "Syarat dan ketentuan resmi penggunaan platform marketplace desain dan escrow JokiDay.",
};

export default function TermsPage() {
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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
                Syarat dan Ketentuan Layanan
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Terakhir diperbarui: 12 Oktober 2026 • Penyelenggara: AgentKikir
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 sm:p-10 space-y-8 text-sm text-text leading-relaxed shadow-sm">
          <div className="p-4 bg-primary-soft/40 border border-primary/20 rounded-lg text-xs sm:text-sm text-text space-y-2">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Ringkasan Inti JokiDay</span>
            </p>
            <p className="text-text-muted leading-relaxed">
              JokiDay adalah platform yang mempertemukan pelanggan dengan freelancer desain dan menahan pembayaran di rekening penampung (escrow) sampai pekerjaan disetujui. File master pesanan tersimpan langsung di Google Drive milik desainer. Dengan mendaftar atau memakai JokiDay, kamu menyetujui seluruh ketentuan di bawah ini.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              1. Pengantar dan Penerimaan
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Ketentuan ini berlaku untuk seluruh pengguna JokiDay: pelanggan, desainer, dan pengunjung.</li>
              <li>Jika kamu tidak menyetujui salah satu bagian, jangan membuat akun dan jangan memakai layanan JokiDay.</li>
              <li>Mendaftar, masuk, membuat pesanan (order), mengirim penawaran, atau melakukan pembayaran dianggap sebagai persetujuan penuh atas ketentuan ini.</li>
              <li>Penyelenggara layanan adalah <strong>AgentKikir</strong>, berdomisili di Jayapura, dengan kontak resmi <code className="bg-background px-1.5 py-0.5 rounded text-primary">Jokiday@agentkikir.cloud</code>.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              2. Definisi Istilah
            </h2>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="p-3 font-bold text-text w-1/3">Istilah</th>
                    <th className="p-3 font-bold text-text">Arti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-muted">
                  <tr>
                    <td className="p-3 font-semibold text-text">Platform</td>
                    <td className="p-3">Aplikasi web resmi JokiDay (jokiday.agentkikir.cloud).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Pelanggan</td>
                    <td className="p-3">Pengguna yang memesan pekerjaan desain.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Desainer</td>
                    <td className="p-3">Pengguna terverifikasi yang mengerjakan desain dan menerima pembayaran.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Brief</td>
                    <td className="p-3">Deskripsi kebutuhan pengerjaan desain dari pelanggan.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Penawaran (Offer)</td>
                    <td className="p-3">Harga, durasi waktu, kuota revisi, dan deliverable yang diajukan oleh desainer.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Order (Pesanan)</td>
                    <td className="p-3">Kesepakatan resmi yang terbentuk setelah pelanggan menyetujui penawaran.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Escrow</td>
                    <td className="p-3">Dana pelanggan yang ditahan aman oleh sistem JokiDay sampai pesanan disetujui atau diputuskan melalui sengketa.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Biaya Platform</td>
                    <td className="p-3">Potongan sebesar 5% dari harga order yang dibebankan kepada desainer.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-text">Dispute</td>
                    <td className="p-3">Prosedur mediasi sengketa resmi yang ditangani oleh administrator platform.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              3. Akun dan Kelayakan Pengguna
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Pengguna berusia minimal 18 tahun atau sudah cakap hukum menurut hukum Republik Indonesia. Pengguna di bawah umur wajib didampingi dan disetujui oleh orang tua atau wali sah.</li>
              <li>Satu orang hanya diperbolehkan memiliki satu akun aktif. Dilarang keras membuat akun ganda, menjual akun, atau meminjamkan akun kepada pihak lain.</li>
              <li>Satu akun dapat berfungsi sebagai pelanggan maupun desainer, dan dapat beralih peran kapan saja melalui menu Profil.</li>
              <li>Desainer wajib menyambungkan Google Drive sebelum menerima pesanan atau menyerahkan hasil pekerjaan.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              4. Peran JokiDay sebagai Penyedia Platform
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>JokiDay bertindak sebagai penyedia sarana teknologi perantara, fasilitas penampungan dana (escrow), dan sistem penyelesaian sengketa.</li>
              <li>Perjanjian pengerjaan desain terjadi secara langsung antara pelanggan dan desainer. Desainer bekerja secara mandiri dan bukan merupakan karyawan atau agen dari JokiDay.</li>
              <li>JokiDay memegang dana pelanggan semata-mata sebagai penampung sementara (escrow) dan tidak menggunakan dana tersebut untuk operasional lain platform.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              5. Ketentuan Order dan Kontrak Pengerjaan
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li><strong>Jalur Pemesanan:</strong> Mendukung jalur Direct (pelanggan memesan ke satu desainer tertentu) dan jalur Pasar (brief dibuka untuk penawaran kompetitif desainer).</li>
              <li><strong>Penetapan Harga:</strong> Angka harga penawaran hanya ditentukan oleh desainer. Pelanggan tidak dapat mengubah harga secara sepihak.</li>
              <li><strong>Masa Berlaku Penawaran:</strong> Penawaran harga berlaku selama 3 hari. Brief pasar yang tidak mendapatkan kesepakatan akan ditutup dalam 7 hari.</li>
              <li><strong>Kontrak Terkunci:</strong> Setelah penawaran disetujui, ruang lingkup harga, tenggat waktu, deliverables, dan kuota revisi terkunci sebagai kontrak resmi. Seluruh transaksi wajib diselesaikan di dalam platform JokiDay.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              6. Pembayaran, Escrow, dan Biaya Platform
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li><strong>Pembayaran di Muka:</strong> Pelanggan memiliki batas waktu 24 jam untuk menyelesaikan pembayaran QRIS melalui gerbang pembayaran resmi (WaroengPay). Jika melewati batas waktu, pesanan dibatalkan otomatis.</li>
              <li><strong>Mulai Hitung Tenggat:</strong> Tenggat waktu pengerjaan dihitung sejak status pembayaran terverifikasi lunas (PAID), bukan sejak kesepakatan awal dibuat.</li>
              <li><strong>Pelepasan Dana Escrow:</strong> Dana dilepas ke dompet desainer hanya setelah pelanggan menyetujui hasil kerja, berlakunya persetujuan otomatis, atau berdasarkan putusan sengketa (dispute).</li>
              <li><strong>Biaya Platform 5%:</strong> JokiDay mengenakan biaya platform sebesar 5% dari harga kesepakatan yang dipotong dari hak desainer (contoh: order Rp50.000, fee Rp2.500, desainer menerima bersih Rp47.500). Pelanggan tidak dibebani biaya platform tambahan.</li>
              <li><strong>Pengembalian Dana (Refund):</strong> Jika pesanan dibatalkan sesuai aturan atau dimenangkan pelanggan dalam dispute, dana dikembalikan 100% penuh tanpa potongan platform fee.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              7. Penyerahan Hasil Karya, Revisi, dan Persetujuan Otomatis
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li><strong>Google Drive Desainer:</strong> File master hasil kerja diunggah dan disimpan langsung di Google Drive desainer. Server JokiDay hanya memproses sementara untuk membakar watermark proteksi.</li>
              <li><strong>Pratinjau Ber-watermark:</strong> Pelanggan hanya dapat melihat pratinjau berpola watermark diagonal sebelum pesanan disetujui. File master asli hanya dapat diunduh setelah pesanan berstatus Selesai (COMPLETED).</li>
              <li><strong>Kuota Revisi:</strong> Pelanggan berhak meminta revisi sesuai kuota kontrak. Permintaan revisi harus jelas dan berpatokan pada brief awal.</li>
              <li><strong>Persetujuan Otomatis (3 Hari):</strong> Jika pelanggan tidak memberikan tanggapan atau revisi dalam waktu 3x24 jam sejak pengiriman hasil karya, sistem secara otomatis menyatakan pesanan selesai dan dana escrow diteruskan ke desainer.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              8. Tenggat Waktu dan Keterlambatan
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Desainer menerima peringatan pengingat 24 jam sebelum tenggat waktu berakhir.</li>
              <li>Desainer dapat meminta perpanjangan waktu melalui fitur obrolan resmi maksimal 2 kali atas persetujuan pelanggan.</li>
              <li>Jika desainer terlambat tanpa kabar atau tanpa persetujuan perpanjangan selama 48 jam setelah deadline, pesanan dibatalkan otomatis dan dana dikembalikan penuh ke pelanggan.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              9. Prosedur Mediasi Sengketa (Dispute)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Pelanggan atau desainer dapat mengajukan dispute selama pesanan berstatus dikerjakan, menunggu persetujuan, atau dalam revisi.</li>
              <li>Sistem melampirkan seluruh bukti obrolan resmi, riwayat kontrak brief, catatan pengiriman, dan log aktivitas platform. Percakapan di luar JokiDay tidak diakui sebagai bukti sah.</li>
              <li>Pihak lawan memiliki waktu 48 jam untuk memberikan sanggahan.</li>
              <li>Admin JokiDay akan mengeluarkan putusan mengikat: pengembalian dana penuh ke pelanggan, pencairan dana penuh ke desainer, atau pembagian proporsional sesuai progres kerja nyata.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              10. Dompet dan Penarikan Saldo Desainer
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Saldo desainer terbagi menjadi Saldo Tertahan (pesanan sedang berjalan) dan Saldo Tersedia (pesanan telah selesai).</li>
              <li>Batas minimum penarikan saldo dompet mandiri adalah <strong>Rp50.000</strong> ke rekening bank nasional atau e-wallet atas nama desainer.</li>
              <li>Desainer bertanggung jawab penuh atas keakuratan nomor rekening/e-wallet yang dimasukkan.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              11. Hak Kekayaan Intelektual (HAKI)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li><strong>Sebelum Selesai:</strong> Hak cipta penuh tetap berada pada desainer. Pelanggan dilarang keras menggunakan draf pratinjau untuk tujuan komersial atau publikasi sebelum pesanan disetujui.</li>
              <li><strong>Setelah Selesai:</strong> Setelah pesanan berstatus selesai dan dana dicairkan, desainer memberikan hak pakai komersial eksklusif kepada pelanggan sesuai tujuan brief. Pelanggan tidak diperbolehkan menjual ulang hasil desain sebagai aset mentah (template/resale).</li>
              <li>Desainer berhak menampilkan hasil karya final di portofolio pribadinya, kecuali pelanggan meminta secara tertulis untuk merahasiakannya (NDA) sebelum pesanan dimulai.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              12. Larangan Pengguna
            </h2>
            <p className="text-text-muted">Pengguna dilarang keras:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
              <li>Mengajak bertransaksi di luar platform JokiDay untuk menghindari sistem escrow atau biaya platform.</li>
              <li>Melakukan plagiarisme, menjiplak karya pihak lain, atau melanggar hak cipta pihak ketiga.</li>
              <li>Meminta atau mengunggah konten yang melanggar hukum, pornografi, ujaran kebencian, perjudian, atau penipuan.</li>
              <li>Menggunakan bot, scraping, injeksi skrip, atau upaya peretasan pada platform JokiDay.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-text border-b border-border pb-2">
              13. Hukum yang Berlaku dan Layanan Pengaduan
            </h2>
            <p className="text-text-muted">
              Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Segala sengketa yang tidak dapat diselesaikan melalui musyawarah mufakat akan diselesaikan melalui yurisdiksi pengadilan negeri yang berwenang di domisili penyelenggara (Jayapura).
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-text font-medium">
              <Mail className="w-4 h-4 text-primary" />
              <span>Kontak Bantuan & Legal: <strong>Jokiday@agentkikir.cloud</strong></span>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
