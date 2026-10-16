"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRupiah, formatRelativeDeadline } from "@/lib/format";
import {
  Clock,
  Wallet,
  ShoppingBag,
  Plus,
  Trash2,
  Edit3,
  Layers,
  ChevronRight,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Package,
  FileBox,
} from "lucide-react";
import { MIN_SERVICE_PACKAGE_PRICE, validateServicePackagePrice } from "@/lib/constants/packages";
import { ProductCard, ProductItem } from "@/components/products/ProductCard";
import { UploadProductModal } from "@/components/products/UploadProductModal";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";

interface PackageItem {
  id: string;
  designerId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  durationDays: number;
  revisionQuota: number;
  deliverables: string;
  isActive: boolean;
}

interface DesignerDashboardProps {
  displayName: string;
  username?: string | null;
  availableBalance: number;
  activeOrders: any[];
  awaitingPaymentOrders: any[];
  marketBriefs: any[];
  initialPackages: PackageItem[];
  initialProducts?: ProductItem[];
  isDriveConnected?: boolean;
}

export function DesignerDashboardView({
  displayName,
  username,
  availableBalance,
  activeOrders,
  awaitingPaymentOrders,
  marketBriefs,
  initialPackages,
  initialProducts = [],
  isDriveConnected = false,
}: DesignerDashboardProps) {
  const [packages, setPackages] = useState<PackageItem[]>(initialPackages);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [activeManagementTab, setActiveManagementTab] = useState<"packages" | "products">("packages");
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Form State untuk Tambah / Edit Paket
  const [pkgTitle, setPkgTitle] = useState("");
  const [pkgCategory, setPkgCategory] = useState("logo");
  const [pkgPrice, setPkgPrice] = useState("150000");
  const [pkgDuration, setPkgDuration] = useState("2");
  const [pkgRevisions, setPkgRevisions] = useState("2");
  const [pkgDeliverables, setPkgDeliverables] = useState(
    "File Master Vektor (AI/EPS)\nFile PNG Transparan HD\nPedoman Warna & Tipografi"
  );
  const [pkgDescription, setPkgDescription] = useState("");
  const [isSubmittingPkg, setIsSubmittingPkg] = useState(false);
  const [pkgError, setPkgError] = useState("");

  const handleOpenAddModal = () => {
    setEditingPackageId(null);
    setPkgTitle("");
    setPkgCategory("logo");
    setPkgPrice("150000");
    setPkgDuration("2");
    setPkgRevisions("2");
    setPkgDeliverables("File Master Vektor (AI/EPS)\nFile PNG Transparan HD\nPedoman Warna & Tipografi");
    setPkgDescription("");
    setPkgError("");
    setShowPackageModal(true);
  };

  const handleOpenEditModal = (pkg: PackageItem) => {
    setEditingPackageId(pkg.id);
    setPkgTitle(pkg.title);
    setPkgCategory(pkg.category);
    setPkgPrice(pkg.price.toString());
    setPkgDuration(pkg.durationDays.toString());
    setPkgRevisions(pkg.revisionQuota.toString());
    try {
      const parsed = JSON.parse(pkg.deliverables || "[]");
      setPkgDeliverables(Array.isArray(parsed) ? parsed.join("\n") : pkg.deliverables);
    } catch {
      setPkgDeliverables(pkg.deliverables || "");
    }
    setPkgDescription(pkg.description);
    setPkgError("");
    setShowPackageModal(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPkg(true);
    setPkgError("");

    const priceValidation = validateServicePackagePrice(pkgPrice);
    if (!priceValidation.isValid || priceValidation.value === undefined) {
      setPkgError(priceValidation.error || "Harga paket tidak valid");
      setIsSubmittingPkg(false);
      return;
    }

    const deliverablesArray = pkgDeliverables
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingPackageId) {
        // Edit Paket via PUT
        const res = await fetch(`/api/designer/packages/${editingPackageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: pkgTitle,
            description: pkgDescription,
            category: pkgCategory,
            price: pkgPrice,
            durationDays: pkgDuration,
            revisionQuota: pkgRevisions,
            deliverables: deliverablesArray,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui paket jasa");

        setPackages((prev) =>
          prev.map((p) => (p.id === editingPackageId ? data.package : p))
        );
      } else {
        // Tambah Paket Baru via POST
        const res = await fetch("/api/designer/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: pkgTitle,
            description: pkgDescription,
            category: pkgCategory,
            price: pkgPrice,
            durationDays: pkgDuration,
            revisionQuota: pkgRevisions,
            deliverables: deliverablesArray,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Gagal membuat paket jasa");

        setPackages((prev) => [data.package, ...prev]);
      }

      setShowPackageModal(false);
    } catch (err: any) {
      setPkgError(err.message);
    } finally {
      setIsSubmittingPkg(false);
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    if (!confirm("Hapus paket jasa ini? Tindakan tidak dapat dibatalkan.")) return;

    try {
      const res = await fetch(`/api/designer/packages/${pkgId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus paket");

      setPackages((prev) => prev.filter((p) => p.id !== pkgId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleArchiveProduct = async (prod: ProductItem) => {
    try {
      const res = await fetch(`/api/products/${prod.id}/archive`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengarsipkan produk");
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, status: data.product.status } : p))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProduct = async (prod: ProductItem) => {
    if (!confirm(`Hapus produk premade "${prod.title}"?`)) return;
    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus produk");
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppShell role="DESIGNER" displayName={displayName}>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              Dashboard Desainer
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Ringkasan pekerjaan aktif, saldo pendapatan, manajemen paket jasa, dan antrean pasar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {username && (
              <Link
                href={`/designer/${username}`}
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-surface text-primary border border-border font-semibold text-xs hover:bg-background transition-colors"
              >
                <span>Lihat Profil Publik</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            )}
            <button
              onClick={() => {
                setActiveManagementTab("products");
                setShowProductModal(true);
              }}
              className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-surface text-text border border-border font-bold text-xs hover:bg-surface-alt transition-colors shadow-xs"
            >
              <FileBox className="w-4 h-4 mr-1.5 text-primary" />
              <span>Tambah Produk Premade</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Tambah Paket Jasa</span>
            </button>
          </div>
        </div>

        {/* 4 Kartu Ringkasan Desainer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Order Sedang Dikerjakan
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary">
              {activeOrders.length}
            </div>
            <p className="text-xs text-text-muted">Proyek dalam tahap pengerjaan aktif</p>
          </Card>

          <Card className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Saldo Dompet Tersedia
            </span>
            <div className="font-money text-2xl sm:text-3xl font-extrabold text-text">
              {formatRupiah(availableBalance)}
            </div>
            <Link
              href="/wallet"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Kelola penarikan saldo &rarr;
            </Link>
          </Card>

          <Card className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Menunggu Bayar Pelanggan
            </span>
            <div className={`text-2xl sm:text-3xl font-extrabold ${awaitingPaymentOrders.length > 0 ? "text-amber-500" : "text-text"}`}>
              {awaitingPaymentOrders.length}
            </div>
            <p className="text-xs text-text-muted">Jangan mulai sebelum status lunas</p>
          </Card>

          <Card className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Brief Baru di Pasar
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-secondary-text">
              {marketBriefs.length}
            </div>
            <Link
              href="/market"
              className="text-xs font-semibold text-secondary-text hover:underline"
            >
              Lihat semua peluang &rarr;
            </Link>
          </Card>
        </div>

        {/* Section: Manajemen Paket Jasa & Produk Premade Desainer (Sub-Tab) */}
        <div className="space-y-4">
          <div className="border-b border-border flex items-center justify-between flex-wrap gap-3 pb-3">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveManagementTab("packages")}
                className={`inline-flex items-center gap-2 pb-1 text-sm font-bold border-b-2 transition-colors ${
                  activeManagementTab === "packages"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Paket Jasa ({packages.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveManagementTab("products")}
                className={`inline-flex items-center gap-2 pb-1 text-sm font-bold border-b-2 transition-colors ${
                  activeManagementTab === "products"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <FileBox className="w-4 h-4" />
                <span>Produk Premade ({products.length})</span>
              </button>
            </div>

            {activeManagementTab === "packages" ? (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Paket</span>
              </button>
            ) : (
              <button
                onClick={() => setShowProductModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk Premade</span>
              </button>
            )}
          </div>

          {activeManagementTab === "packages" ? (
            packages.length === 0 ? (
              <div className="bg-surface border border-dashed border-border rounded-lg p-8 text-center text-text-muted text-sm space-y-3">
                <Package className="w-8 h-8 mx-auto text-text-muted" />
                <p>Anda belum memiliki paket jasa. Buat paket agar pelanggan dapat langsung memesan desain dari profil Anda.</p>
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-white font-semibold text-xs hover:bg-primary/90"
                >
                  + Buat Paket Jasa Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => {
                  let deliverablesList: string[] = [];
                  try {
                    deliverablesList = JSON.parse(pkg.deliverables || "[]");
                  } catch {
                    deliverablesList = [];
                  }

                  return (
                    <div
                      key={pkg.id}
                      className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-subtle space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-primary-soft text-primary rounded-full">
                            {pkg.category}
                          </span>
                          <div className="font-money text-lg font-extrabold text-primary">
                            {formatRupiah(pkg.price)}
                          </div>
                        </div>

                        <h3 className="font-bold text-base text-text">
                          {pkg.title}
                        </h3>

                        <p className="text-xs text-text-muted line-clamp-2">
                          {pkg.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-text-muted pt-2 border-t border-border">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>{pkg.durationDays} hari kerja</span>
                          </span>
                          <span>&bull;</span>
                          <span>{pkg.revisionQuota} kuota revisi</span>
                        </div>

                        {deliverablesList.length > 0 && (
                          <ul className="text-[11px] text-text-muted space-y-1 pt-1">
                            {deliverablesList.slice(0, 3).map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-primary font-bold shrink-0">&bull;</span>
                                <span className="truncate">{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="inline-flex items-center gap-1 text-xs text-danger hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(pkg)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-background border border-border text-xs font-semibold text-text hover:bg-neutral-soft"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-primary" />
                          <span>Edit Paket</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Sub-Tab Produk Premade */
            products.length === 0 ? (
              <div className="bg-surface border border-dashed border-border rounded-lg p-8 text-center text-text-muted text-sm space-y-3">
                <FileBox className="w-8 h-8 mx-auto text-text-muted" />
                <p>Anda belum memiliki produk premade. Terbitkan aset grafis atau template untuk menghasilkan pemasukan pasif.</p>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-white font-semibold text-xs hover:bg-primary/90"
                >
                  + Unggah Produk Premade Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    isOwner={true}
                    isAdmin={false}
                    onSelect={(p) => setSelectedProduct(p)}
                    onArchiveToggle={handleArchiveProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Dua Kolom: Order Aktif Desainer & Antrean Pasar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Kolom 1: Order Aktif Desainer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">
                Pekerjaan Desain Aktif
              </h2>
              <Link
                href="/orders"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Lihat Semua &rarr;
              </Link>
            </div>

            {activeOrders.length === 0 && awaitingPaymentOrders.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-sm space-y-3">
                <p>Tidak ada pekerjaan aktif saat ini. Kirim penawaran ke brief terbuka di pasar untuk mendapatkan proyek baru.</p>
                <Link
                  href="/market"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-white font-semibold text-xs hover:bg-primary/90"
                >
                  Buka Pasar Brief
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {[...activeOrders, ...awaitingPaymentOrders].slice(0, 5).map((order) => {
                  const deadlineInfo = order.deadlineAt
                    ? formatRelativeDeadline(order.deadlineAt)
                    : null;
                  const isAwaitingPay = order.status === "AWAITING_PAYMENT";

                  return (
                    <div
                      key={order.id}
                      className="bg-surface border border-border rounded-lg p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-primary/40 transition-colors shadow-subtle"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          {deadlineInfo && (
                            <span className="text-xs font-semibold text-primary flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{deadlineInfo.text}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-text truncate">
                          {order.brief.title}
                        </h3>
                        <p className="text-xs text-text-muted">
                          Pelanggan: <strong className="text-text">{order.customer?.displayName || "Pelanggan"}</strong> &bull; Net: {formatRupiah(order.designerNet)}
                        </p>
                        {isAwaitingPay && (
                          <p className="text-[11px] text-amber-600 font-medium">
                            Menunggu pembayaran pelanggan. Jangan mulai sebelum lunas.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/chat?userId=${order.customer.id}`}
                          className="inline-flex items-center justify-center h-8 px-2.5 rounded-md bg-surface text-text border border-border hover:bg-background transition-colors"
                          title="Chat Pelanggan"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        </Link>
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-surface text-primary border border-border font-semibold text-xs hover:bg-background transition-colors"
                        >
                          <span>Detail</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kolom 2: Antrean Brief Terbuka di Pasar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">
                Peluang Brief di Pasar
              </h2>
              <Link
                href="/market"
                className="text-xs font-semibold text-secondary-text hover:underline"
              >
                Buka Pasar &rarr;
              </Link>
            </div>

            {marketBriefs.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-sm">
                Belum ada brief terbuka di pasar saat ini. Silakan periksa kembali nanti.
              </div>
            ) : (
              <div className="space-y-3">
                {marketBriefs.map((brief) => {
                  const isDirect = brief.mode === "DIRECT";
                  return (
                    <div
                      key={brief.id}
                      className={`bg-surface border rounded-lg p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors shadow-subtle ${
                        isDirect
                          ? "border-secondary/60 bg-secondary/5 ring-1 ring-secondary/20"
                          : "border-border hover:border-secondary/40"
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-neutral-soft text-text-muted rounded-full">
                            {brief.category || "Desain"}
                          </span>
                          {isDirect && (
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-secondary text-on-secondary rounded-full shadow-2xs">
                              ⭐ Pesanan Langsung
                            </span>
                          )}
                          <span className="text-xs text-text-muted">
                            Oleh {brief.customer.displayName}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-text truncate">
                          {brief.title}
                        </h3>
                        <p className="text-xs text-text-muted">
                          Anggaran: {formatRupiah(brief.budgetHint || 0)}
                        </p>
                      </div>

                      <Link
                        href={`/briefs/${brief.id}`}
                        className={`inline-flex items-center justify-center h-8 px-3 rounded-md font-semibold text-xs transition-colors shrink-0 ${
                          isDirect
                            ? "bg-secondary text-on-secondary hover:bg-secondary-hover shadow-2xs"
                            : "bg-surface text-secondary-text border border-border hover:bg-background"
                        }`}
                      >
                        <span>Kirim Tawaran</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Paket Jasa Desainer */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-floating max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl text-text">
              {editingPackageId ? "Edit Paket Jasa Desain" : "Tambah Paket Jasa Desain"}
            </h3>
            <p className="text-xs text-text-muted">
              Tentukan rincian paket jasa desain Anda. Pelanggan dapat langsung memesan paket ini dalam 1 klik dari profil atau dashboard.
            </p>

            {pkgError && (
              <div className="p-3 bg-danger-soft border border-danger/20 rounded text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pkgError}</span>
              </div>
            )}

            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Judul Paket Jasa *
                </label>
                <input
                  type="text"
                  required
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  placeholder="Contoh: Paket Logo UMKM & Identitas Brand"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Kategori *
                  </label>
                  <select
                    value={pkgCategory}
                    onChange={(e) => setPkgCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="logo">Logo & Branding</option>
                    <option value="poster">Poster & Flyer</option>
                    <option value="kemasan">Desain Kemasan</option>
                    <option value="banner">Banner & Spanduk</option>
                    <option value="sosial-media">Konten Media Sosial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Harga Paket (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={MIN_SERVICE_PACKAGE_PRICE}
                    step={1000}
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(e.target.value)}
                    placeholder="10000"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Durasi Pengerjaan (Hari) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={30}
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Kuota Revisi *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={10}
                    value={pkgRevisions}
                    onChange={(e) => setPkgRevisions(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Deliverable / Berkas yang Diterima (Pisahkan baris) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={pkgDeliverables}
                  onChange={(e) => setPkgDeliverables(e.target.value)}
                  placeholder="File Master Vektor (AI/EPS)&#10;File PNG Transparan HD&#10;Pedoman Warna"
                  className="w-full p-2.5 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Deskripsi Lengkap Paket *
                </label>
                <textarea
                  rows={3}
                  required
                  value={pkgDescription}
                  onChange={(e) => setPkgDescription(e.target.value)}
                  placeholder="Jelaskan secara detail apa saja yang akan didapatkan pelanggan dalam paket ini..."
                  className="w-full p-2.5 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPackageModal(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingPkg}
                >
                  {editingPackageId ? "Simpan Perubahan" : "Buat Paket Jasa"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Produk Premade */}
      <UploadProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
          setActiveManagementTab("products");
        }}
        isDriveConnected={Boolean(isDriveConnected)}
      />

      {/* Modal Detail Produk Premade */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        isLoggedIn={true}
      />
    </AppShell>
  );
}
