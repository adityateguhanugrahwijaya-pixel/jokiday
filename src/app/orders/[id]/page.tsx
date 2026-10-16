import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { EscrowCard } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { formatRupiah, formatDate, formatTime } from "@/lib/format";
import { OrderTimer } from "@/components/orders/OrderTimer";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  UploadCloud,
  ArrowLeft,
  Download,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { AuthService } from "@/server/auth/auth.service";
import { redirect } from "next/navigation";
import { OrderActionButtons } from "./OrderActionButtons";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect(`/login?redirect=/orders/${params.id}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      brief: true,
      designer: true,
      customer: true,
      deliveries: {
        include: {
          deliveryFiles: {
            include: { previewAsset: true },
          },
        },
        orderBy: { round: "desc" },
      },
      revisionRequests: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const isDesigner = session.userId === order.designerId;
  const isCustomer = session.userId === order.customerId;
  const isAdmin = session.isAdmin;

  if (!isDesigner && !isCustomer && !isAdmin) {
    notFound();
  }

  const viewerRole: "CUSTOMER" | "DESIGNER" | "ADMIN" = isDesigner
    ? "DESIGNER"
    : isCustomer
    ? "CUSTOMER"
    : (session.activeRole || "CUSTOMER");

  const contract = JSON.parse(order.contractSnapshot || "{}");
  const deliverables = JSON.parse(order.deliverables || "[]");
  const latestRevision = order.revisionRequests?.[0] || null;

  // Stepper tahap order
  const steps = [
    { label: "Pemesanan", completed: true },
    {
      label: "Pembayaran",
      completed: order.status !== "AWAITING_PAYMENT" && order.status !== "CANCELLED",
      current: order.status === "AWAITING_PAYMENT",
    },
    {
      label: "Pengerjaan",
      completed:
        order.status === "AWAITING_APPROVAL" ||
        order.status === "REVISION" ||
        order.status === "COMPLETED",
      current: order.status === "IN_PROGRESS" || order.status === "REVISION",
    },
    {
      label: "Persetujuan",
      completed: order.status === "COMPLETED",
      current: order.status === "AWAITING_APPROVAL",
    },
    {
      label: "Selesai",
      completed: order.status === "COMPLETED",
      current: false,
    },
  ];

  return (
    <AppShell
      role={viewerRole === "DESIGNER" ? "DESIGNER" : "CUSTOMER"}
      displayName={isDesigner ? order.designer.displayName : order.customer.displayName}
    >
      <div className="space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke daftar order</span>
        </Link>

        {/* Layout dua kolom di Desktop (lg+), satu kolom di HP */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: Utama (Judul, Stepper, Hasil Kerja, Chat) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-xs text-text-muted font-mono">
                    #{order.id.slice(0, 8)}
                  </span>
                </div>

                <OrderTimer order={order} variant="badge" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
                {order.brief.title}
              </h1>

              {/* Stepper horizontal */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-border -z-0" />
                  {steps.map((s, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center bg-surface px-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          s.completed
                            ? "bg-primary text-white"
                            : s.current
                            ? "ring-2 ring-primary bg-primary-soft text-primary"
                            : "bg-neutral-soft text-text-muted"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-[11px] font-medium text-text-muted mt-1 hidden sm:block">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ringkasan Durasi & Ketentuan Timer Order */}
            <OrderTimer order={order} variant="detailed" />

            {/* Peringatan & Info Jelas Catatan Revisi Aktif */}
            {order.status === "REVISION" && latestRevision && (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
                    <RotateCcw className="w-5 h-5 shrink-0" />
                    <span>Catatan Revisi dari Pelanggan (Putaran ke-{order.revisionsUsed})</span>
                  </div>
                  <span className="text-xs bg-amber-500/20 text-amber-700 px-2.5 py-0.5 rounded-full font-bold">
                    Sisa Kuota: {Math.max(0, order.revisionQuota - order.revisionsUsed)}x
                  </span>
                </div>
                <div className="p-4 bg-surface border border-border rounded-lg text-sm text-text whitespace-pre-wrap leading-relaxed font-medium">
                  &ldquo;{latestRevision.message}&rdquo;
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted flex-wrap gap-2 pt-1">
                  <span>
                    Diajukan pada: {formatDate(latestRevision.createdAt)} {formatTime(latestRevision.createdAt, true)}
                  </span>
                  {order.customerId && order.designerId && (
                    <Link
                      href={`/chat?userId=${isDesigner ? order.customerId : order.designerId}&designerId=${isDesigner ? order.customerId : order.designerId}`}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Diskusikan Detail Revisi di Chat</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Area Hasil Kerja Desain */}
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold text-text">
                Hasil Pekerjaan Desain
              </h2>

              {order.deliveries.length === 0 ? (
                <div className="border border-dashed border-border rounded-md p-8 text-center text-text-muted space-y-2">
                  <UploadCloud className="w-8 h-8 mx-auto text-primary" />
                  <p className="text-sm">
                    {order.status === "AWAITING_PAYMENT"
                      ? "Pekerjaan akan dimulai setelah pembayaran tagihan selesai."
                      : "Desainer sedang mengerjakan pesananmu. Pratinjau hasil akan muncul di sini."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {order.deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="border border-border rounded-md p-4 bg-background space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-text">
                          Pengiriman Putaran {delivery.round}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatDate(delivery.createdAt)} {formatTime(delivery.createdAt, true)}
                        </span>
                      </div>

                      {delivery.note && (
                        <p className="text-sm text-text leading-relaxed">
                          {delivery.note}
                        </p>
                      )}

                      {/* Tampilan File & Pratinjau dengan Watermark */}
                      {delivery.deliveryFiles && delivery.deliveryFiles.length > 0 ? (
                        <div className="space-y-3 pt-1">
                          {delivery.deliveryFiles.map((file) => (
                            <div
                              key={file.id}
                              className="p-3.5 bg-surface border border-border rounded-lg space-y-3"
                            >
                              {file.previewAsset ? (() => {
                                const previewSrc = file.previewAsset.id
                                  ? `/api/previews/${file.previewAsset.id}`
                                  : file.previewAsset.driveFileId;

                                return (
                                  <div className="space-y-2">
                                    <div className="relative rounded-lg overflow-hidden border border-border bg-neutral-soft/30 aspect-video max-h-80 flex items-center justify-center group">
                                      <a
                                        href={previewSrc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full h-full relative cursor-zoom-in"
                                        title="Klik untuk membuka pratinjau resolusi penuh di tab baru"
                                      >
                                        <img
                                          src={previewSrc}
                                          alt={file.fileName}
                                          className="w-full h-full object-contain mx-auto transition-transform group-hover:scale-[1.02]"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-2xs">
                                          <ExternalLink className="w-4 h-4" />
                                          <span>Buka Pratinjau Penuh (Watermark Dilindungi)</span>
                                        </div>
                                      </a>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                                      <span className="flex items-center gap-1 text-primary font-medium">
                                        <span>🔒 Pratinjau Watermark Dilindungi JokiDay</span>
                                      </span>
                                      <a
                                        href={previewSrc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline font-semibold"
                                      >
                                        Perbesar Gambar &rarr;
                                      </a>
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div className="p-4 bg-primary-soft/30 border border-primary/20 rounded-lg flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-xs text-text">{file.fileName}</p>
                                      <p className="text-[11px] text-text-muted">
                                        Berkas Desain Master • {(Number(file.sizeBytes) / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-text-muted bg-surface px-2.5 py-1 rounded border border-border shrink-0">
                                    Siap Diunduh Setelah Disetujui
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-3 text-xs flex-wrap pt-1 border-t border-border/50">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                  <span className="font-semibold text-text truncate max-w-xs">
                                    {file.fileName}
                                  </span>
                                  <span className="text-[10px] text-text-muted font-mono">
                                    ({(Number(file.sizeBytes) / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>

                                {order.status === "COMPLETED" ? (
                                  <a
                                    href={`/api/orders/${order.id}/files/${file.id}/download`}
                                    className="px-3 py-1.5 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover inline-flex items-center gap-1.5 transition-colors shadow-sm"
                                    download
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Unduh File Asli</span>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-text-muted bg-neutral-soft px-2.5 py-0.5 rounded-full font-medium">
                                    Pratinjau Watermark Terproteksi (Google Drive)
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-surface border border-border rounded text-xs text-text-muted flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span>Pengiriman tercatat (Catatan hasil kerja terlampir)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Ringkasan Kontrak & Aksi (Sticky di Desktop) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-primary-soft border border-primary/20 rounded-lg p-5 flex items-start gap-3.5">
              <div className="bg-primary/10 text-primary p-2.5 rounded-full shrink-0">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {viewerRole === "DESIGNER" ? "Jaminan Pembayaran Desainer" : "Pembayaran Terlindungi JokiDay"}
                  </span>
                  <span className="font-money text-lg font-extrabold text-primary">
                    {viewerRole === "DESIGNER" ? formatRupiah(order.designerNet) : formatRupiah(order.price)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text mt-1 leading-relaxed">
                  {viewerRole === "DESIGNER"
                    ? order.status === "AWAITING_PAYMENT"
                      ? "Pelanggan belum membayar pesanan ini. Pengerjaan baru dimulai setelah pembayaran terverifikasi oleh sistem."
                      : order.status === "COMPLETED"
                      ? "Order selesai. Dana bersih telah berhasil dicairkan ke saldo dompet Anda."
                      : "Dana pelanggan telah diamankan di sistem JokiDay. Dana bersih akan otomatis cair ke saldo dompet begitu pelanggan menyetujui hasil desain."
                    : order.status === "AWAITING_PAYMENT"
                    ? "Selesaikan pembayaran tagihan agar desainer dapat segera memulai pengerjaan pesanan Anda."
                    : order.status === "COMPLETED"
                    ? "Transaksi selesai. Seluruh file karya desain siap Anda gunakan sepenuhnya."
                    : "Dana aman disimpan oleh JokiDay sampai Anda puas dan menyetujui hasil desain final dari desainer."}
                </p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold text-text">
                Ringkasan Kontrak
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Total Kesepakatan</span>
                  <span className="font-money font-bold text-text">
                    {formatRupiah(order.price)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Fee Platform (5%)</span>
                  <span className="font-money text-text-muted">
                    {formatRupiah(order.fee)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Net Desainer</span>
                  <span className="font-money text-primary font-bold">
                    {formatRupiah(order.designerNet)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Batas Durasi</span>
                  <span className="font-semibold text-text">
                    {order.durationDays} hari kerja
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-muted">Kuota Revisi</span>
                  <span className="font-semibold text-text">
                    {order.revisionsUsed} / {order.revisionQuota} terpakai
                  </span>
                </div>
              </div>

              {/* Tombol Aksi Sesuai Peran & Status Order */}
              <div className="pt-2">
                <OrderActionButtons
                  orderId={order.id}
                  status={order.status}
                  price={order.price}
                  designerNet={order.designerNet}
                  viewerRole={viewerRole}
                  customerName={order.customer.displayName}
                  designerName={order.designer.displayName}
                  customerId={order.customerId}
                  designerId={order.designerId}
                  latestRevisionNote={latestRevision?.message}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
