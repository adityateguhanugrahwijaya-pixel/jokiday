import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { EscrowCard } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { formatRupiah, formatRelativeDeadline, formatDate } from "@/lib/format";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  UploadCloud,
  ArrowLeft,
  Download,
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
  const deadlineInfo = order.deadlineAt ? formatRelativeDeadline(order.deadlineAt) : null;

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

                {deadlineInfo && (
                  <div
                    className={
                      deadlineInfo.isOverdue
                        ? "text-danger font-bold text-sm flex items-center gap-1.5"
                        : deadlineInfo.isUrgent
                        ? "text-secondary-text font-bold text-sm flex items-center gap-1.5"
                        : "text-primary text-sm flex items-center gap-1.5"
                    }
                  >
                    <Clock className="w-4 h-4" />
                    <span>{deadlineInfo.text}</span>
                  </div>
                )}
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
                          {formatDate(delivery.createdAt)}
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
                              className="p-3.5 bg-surface border border-border rounded-md space-y-3"
                            >
                              {file.previewAsset?.driveFileId && (
                                <div className="relative rounded overflow-hidden border border-border bg-black/5 aspect-video max-h-64 flex items-center justify-center">
                                  <img
                                    src={file.previewAsset.driveFileId}
                                    alt={file.fileName}
                                    className="max-h-64 object-contain mx-auto"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
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
                            <span>Pengiriman tercatat</span>
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
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
