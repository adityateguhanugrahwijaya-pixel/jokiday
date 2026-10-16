"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";
import {
  Grid,
  Package,
  MessageSquare,
  UserCheck,
  Star,
  Clock,
  RotateCcw,
  Check,
  Plus,
  Send,
  X,
  Upload,
  AlertCircle,
  Sparkles,
  Info,
  Trash2,
  Camera,
  Loader2,
  Pencil,
  Archive,
  FileBox,
} from "lucide-react";
import { PostActionMenu } from "@/components/feed/PostActionMenu";
import { DeletePostConfirmModal } from "@/components/feed/DeletePostConfirmModal";
import { ProductCard, ProductItem } from "@/components/products/ProductCard";
import { UploadProductModal } from "@/components/products/UploadProductModal";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import {
  MIN_SERVICE_PACKAGE_PRICE,
  validateServicePackagePrice,
  getLowestActivePackagePrice,
} from "@/lib/constants/packages";

export interface ProfilePost {
  id: string;
  caption: string;
  category: string;
  previewUrl: string;
  createdAt: string;
  archivedAt?: string | null;
  status?: string;
}

export interface ProfilePackage {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  durationDays: number;
  revisionQuota: number;
  deliverables: string[];
  isActive: boolean;
  createdAt: string;
}

export interface DesignerProfileData {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  categories: string[];
  ratingAvg: number;
  ratingCount: number;
  completedCount: number;
  isVerified: boolean;
  createdAt: string;
}

export function DesignerProfileClient({
  designer,
  posts: initialPosts,
  archivedPosts: initialArchivedPosts = [],
  packages: initialPackages,
  products: initialProducts = [],
  isDriveConnected = false,
  isOwner,
  isAdmin,
  isLoggedIn,
}: {
  designer: DesignerProfileData;
  posts: ProfilePost[];
  archivedPosts?: ProfilePost[];
  packages: ProfilePackage[];
  products?: ProductItem[];
  isDriveConnected?: boolean;
  isOwner: boolean;
  isAdmin?: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"posts" | "archived" | "products" | "packages" | "info">("posts");

  const [posts, setPosts] = useState<ProfilePost[]>(initialPosts);
  const [archivedPosts, setArchivedPosts] = useState<ProfilePost[]>(initialArchivedPosts);
  const [packages, setPackages] = useState<ProfilePackage[]>(initialPackages);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(designer.avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const lowestPackagePrice = getLowestActivePackagePrice(packages);

  // Modal State
  const [selectedPost, setSelectedPost] = useState<ProfilePost | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isAddPostOpen, setIsAddPostOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // State Hapus & Arsip
  const [postToDelete, setPostToDelete] = useState<ProfilePost | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number>(0);
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    type?: "success" | "error" | "info";
    undoAction?: () => void;
  } | null>(null);

  // Timer pembersih toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Tangani parameter URL (?tab=portofolio / ?tab=posts / ?tab=products / ?tab=archived / ?action=upload)
  useEffect(() => {
    if (!searchParams) return;
    const tabParam = searchParams.get("tab")?.toLowerCase();
    const actionParam = searchParams.get("action")?.toLowerCase();
    const uploadParam = searchParams.get("upload")?.toLowerCase();

    if (tabParam === "products" || tabParam === "produk" || tabParam === "premade") {
      setActiveTab("products");
    } else if (tabParam === "packages" || tabParam === "paket") {
      setActiveTab("packages");
    } else if (tabParam === "info" || tabParam === "tentang") {
      setActiveTab("info");
    } else if (tabParam === "archived" || tabParam === "diarsipkan" || tabParam === "arsip") {
      if (isOwner || isAdmin) {
        setActiveTab("archived");
      }
    } else if (tabParam === "posts" || tabParam === "portofolio" || tabParam === "karya") {
      setActiveTab("posts");
    }

    if (isOwner && (actionParam === "upload" || uploadParam === "true")) {
      setActiveTab("posts");
      setIsAddPostOpen(true);
    } else if (isOwner && (actionParam === "upload-product" || actionParam === "new-product")) {
      setActiveTab("products");
      setIsAddProductOpen(true);
    }
  }, [searchParams, isOwner, isAdmin]);

  const handleArchiveProduct = async (product: ProductItem) => {
    try {
      const res = await fetch(`/api/products/${product.id}/archive`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengarsipkan produk");
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, status: data.product.status } : p
        )
      );
      setToast({
        id: crypto.randomUUID(),
        message: data.message,
        type: "success",
      });
    } catch (err: any) {
      setToast({
        id: crypto.randomUUID(),
        message: err.message,
        type: "error",
      });
    }
  };

  const handleDeleteProduct = async (product: ProductItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${product.title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus produk");
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setToast({
        id: crypto.randomUUID(),
        message: "Produk premade berhasil dihapus.",
        type: "success",
      });
    } catch (err: any) {
      setToast({
        id: crypto.randomUUID(),
        message: err.message,
        type: "error",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran foto maksimal 5 MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengunggah foto profil");

      setCurrentAvatarUrl(data.avatarUrl);
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah foto.");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // State Order Paket
  const [orderingPackageId, setOrderingPackageId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState("");

  // Form State Tambah Paket
  const [pkgTitle, setPkgTitle] = useState("");
  const [pkgCategory, setPkgCategory] = useState(designer.categories[0] || "logo");
  const [pkgPrice, setPkgPrice] = useState("150000");
  const [pkgDuration, setPkgDuration] = useState("2");
  const [pkgRevisions, setPkgRevisions] = useState("2");
  const [pkgDeliverables, setPkgDeliverables] = useState(
    "File Master Vektor (AI/EPS)\nFile PNG Transparan HD\nPedoman Warna & Tipografi"
  );
  const [pkgDescription, setPkgDescription] = useState("");
  const [isSubmittingPkg, setIsSubmittingPkg] = useState(false);
  const [pkgError, setPkgError] = useState("");

  // Form State Tambah Post Portofolio
  const [postCaption, setPostCaption] = useState("");
  const [postCategory, setPostCategory] = useState(designer.categories[0] || "logo");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postFilePreview, setPostFilePreview] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState("");

  const handleOrderPackage = async (pkg: ProfilePackage) => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/designer/${designer.username}`);
      return;
    }

    if (!confirm(`Pesan paket "${pkg.title}" seharga ${formatRupiah(pkg.price)}?`)) {
      return;
    }

    setOrderingPackageId(pkg.id);
    setOrderError("");

    try {
      const res = await fetch(`/api/packages/${pkg.id}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memesan paket");

      router.push(`/orders/${data.orderId}`);
    } catch (err: any) {
      setOrderError(err.message);
    } finally {
      setOrderingPackageId(null);
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

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPkg(true);
    setPkgError("");

    const priceValidation = validateServicePackagePrice(pkgPrice);
    if (!priceValidation.isValid || priceValidation.value === undefined) {
      setPkgError(priceValidation.error || "Harga paket tidak valid");
      setIsSubmittingPkg(false);
      return;
    }

    try {
      const deliverablesList = pkgDeliverables
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/designer/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pkgTitle,
          description: pkgDescription,
          category: pkgCategory,
          price: priceValidation.value,
          durationDays: parseInt(pkgDuration, 10),
          revisionQuota: parseInt(pkgRevisions, 10),
          deliverables: deliverablesList,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menyimpan paket");

      const created = {
        ...data.package,
        deliverables: JSON.parse(data.package.deliverables || "[]"),
      };

      setPackages((prev) => [...prev, created]);
      setIsAddPackageOpen(false);
      setPkgTitle("");
      setPkgDescription("");
      setActiveTab("packages");
    } catch (err: any) {
      setPkgError(err.message);
    } finally {
      setIsSubmittingPkg(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postFile) {
      setPostError("Pilih file gambar desain terlebih dahulu");
      return;
    }

    setIsSubmittingPost(true);
    setPostError("");

    try {
      const fd = new FormData();
      fd.append("file", postFile);
      fd.append("caption", postCaption);
      fd.append("category", postCategory);
      fd.append("designerId", designer.id);

      const res = await fetch("/api/portfolio/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengunggah karya");

      const createdPost: ProfilePost = {
        id: data.post.id,
        caption: data.post.caption,
        category: data.post.category,
        previewUrl: data.post.previewAsset?.id
          ? `/api/previews/${data.post.previewAsset.id}`
          : data.post.previewAsset?.driveFileId,
        createdAt: data.post.createdAt,
      };

      setPosts((prev) => [createdPost, ...prev]);
      setIsAddPostOpen(false);
      setPostCaption("");
      setPostFile(null);
      setPostFilePreview(null);
      setActiveTab("posts");
    } catch (err: any) {
      setPostError(err.message);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleArchivePost = async (post: ProfilePost) => {
    const originalPosts = [...posts];
    const originalArchived = [...archivedPosts];

    // Optimistic UI update
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    const archivedItem: ProfilePost = {
      ...post,
      status: "ARCHIVED",
      archivedAt: new Date().toISOString(),
    };
    setArchivedPosts((prev) => [archivedItem, ...prev.filter((p) => p.id !== post.id)]);

    if (selectedPost?.id === post.id) {
      setSelectedPost(null);
    }

    try {
      const res = await fetch(`/api/designer/posts/${post.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengarsipkan karya");

      setToast({
        id: crypto.randomUUID(),
        message: "Karya berhasil diarsipkan.",
        type: "success",
        undoAction: () => handleRestorePost(archivedItem),
      });
    } catch (err: any) {
      setPosts(originalPosts);
      setArchivedPosts(originalArchived);
      setToast({
        id: crypto.randomUUID(),
        message: err.message || "Gagal mengarsipkan karya",
        type: "error",
      });
    }
  };

  const handleRestorePost = async (post: ProfilePost) => {
    const originalPosts = [...posts];
    const originalArchived = [...archivedPosts];

    // Optimistic UI update
    setArchivedPosts((prev) => prev.filter((p) => p.id !== post.id));
    const publishedItem: ProfilePost = {
      ...post,
      status: "PUBLISHED",
      archivedAt: null,
    };
    setPosts((prev) => [publishedItem, ...prev.filter((p) => p.id !== post.id)]);

    if (selectedPost?.id === post.id) {
      setSelectedPost(null);
    }

    try {
      const res = await fetch(`/api/designer/posts/${post.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memulihkan karya");

      setToast({
        id: crypto.randomUUID(),
        message: "Karya berhasil dipulihkan ke publik.",
        type: "success",
      });
    } catch (err: any) {
      setPosts(originalPosts);
      setArchivedPosts(originalArchived);
      setToast({
        id: crypto.randomUUID(),
        message: err.message || "Gagal memulihkan karya",
        type: "error",
      });
    }
  };

  const promptDeletePost = async (post: ProfilePost) => {
    try {
      const res = await fetch(`/api/designer/posts/${post.id}`);
      if (res.ok) {
        const data = await res.json();
        setDeleteUsageCount(data.relatedBriefsCount || 0);
      } else {
        setDeleteUsageCount(0);
      }
    } catch {
      setDeleteUsageCount(0);
    }
    setPostToDelete(post);
  };

  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeletingPost(true);
    try {
      const res = await fetch(`/api/designer/posts/${postToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus karya");

      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));

      if (selectedPost?.id === postToDelete.id) {
        setSelectedPost(null);
      }
      setPostToDelete(null);

      setToast({
        id: crypto.randomUUID(),
        message: data.message || "Karya berhasil dihapus dari tampilan.",
        type: "success",
      });
    } catch (err: any) {
      setToast({
        id: crypto.randomUUID(),
        message: err.message || "Gagal menghapus karya",
        type: "error",
      });
    } finally {
      setIsDeletingPost(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {orderError && (
        <div className="p-3.5 bg-danger-soft text-danger text-xs rounded-md border border-danger/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{orderError}</span>
        </div>
      )}

      {/* 1. INSTAGRAM PROFILE HEADER */}
      <section className="bg-surface border border-border rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          {/* Avatar Lingkaran Besar */}
          <div className="relative shrink-0">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary ${
                isOwner ? "cursor-pointer group" : ""
              }`}
              onClick={isOwner ? () => avatarInputRef.current?.click() : undefined}
            >
              <div className="w-full h-full rounded-full bg-surface flex items-center justify-center font-extrabold text-2xl sm:text-3xl text-primary overflow-hidden relative">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={designer.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{designer.displayName.slice(0, 1).toUpperCase()}</span>
                )}
                {isOwner && (
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-primary text-[10px] font-bold">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span>Ganti Foto</span>
                  </div>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
              </div>
            </div>
            {isOwner && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            )}
          </div>

          {/* Info Utama Desainer */}
          <div className="flex-1 text-center sm:text-left space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-text">
                    {designer.displayName}
                  </h1>
                  {designer.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-soft text-primary text-xs font-bold">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Terverifikasi</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                  <p className="text-xs text-text-muted font-mono">
                    @{designer.username}
                  </p>
                  {isOwner && (
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold ml-1"
                      title="Edit username dan profil di Pengaturan"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Username</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
                {isOwner ? (
                  <>
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:border-primary hover:text-primary transition-colors"
                      title="Edit Username & Profil"
                    >
                      <Pencil className="w-3.5 h-3.5 text-text-muted" />
                      <span>Edit Profil</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsAddPostOpen(true)}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:bg-background transition-colors"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      <span>Unggah Karya</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddPackageOpen(true)}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Paket</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/chat?designerId=${designer.id}&name=${encodeURIComponent(designer.displayName)}`}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:border-primary hover:text-primary transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat Desainer</span>
                    </Link>
                    <Link
                      href={`/briefs/new?designerId=${designer.id}`}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Pesan Desain</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Statistik Gaya Instagram (Karya, Paket, Pesanan, Rating) */}
            <div className="flex items-center justify-center sm:justify-start gap-6 sm:gap-8 pt-1 text-xs sm:text-sm">
              <div>
                <span className="font-extrabold text-text block">{posts.length}</span>
                <span className="text-text-muted text-xs">Karya Feed</span>
              </div>
              <div>
                <span className="font-extrabold text-text block">{packages.length}</span>
                <span className="text-text-muted text-xs">Paket Jasa</span>
              </div>
              <div>
                <span className="font-extrabold text-text block">
                  {designer.completedCount}
                </span>
                <span className="text-text-muted text-xs">Pesanan Selesai</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-extrabold text-text">
                  {designer.ratingCount > 0 ? designer.ratingAvg.toFixed(1) : "-"}
                </span>
                <span className="text-text-muted text-xs">
                  {designer.ratingCount > 0 ? `Rating (${designer.ratingCount})` : "Belum ada ulasan"}
                </span>
              </div>
            </div>

            {/* Bio & Kategori Spesialisasi */}
            <div className="space-y-2 pt-2 border-t border-border text-xs sm:text-sm text-text-muted leading-relaxed">
              <p className="whitespace-pre-line text-text">
                {designer.bio || "Desainer grafis profesional siap membantu kebutuhan visual usahamu."}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                {designer.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2.5 py-0.5 rounded-full bg-neutral-soft text-text-muted text-[11px] font-semibold capitalize"
                  >
                    #{cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TAB NAVIGASI GAYA INSTAGRAM */}
      <div className="border-b border-border flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`pb-3 inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === "posts"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Karya ({posts.length})</span>
        </button>

        {(isOwner || isAdmin) && (
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`pb-3 inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === "archived"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Diarsipkan ({archivedPosts.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`pb-3 inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === "products"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <FileBox className="w-4 h-4" />
          <span>Produk Premade ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`pb-3 inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === "packages"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Paket Jasa ({packages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`pb-3 inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === "info"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Tentang Desainer</span>
        </button>
      </div>

      {/* 3. KONTEN TAB */}

      {/* TAB 1: GRID KARYA GAYA FEED INSTAGRAM */}
      {activeTab === "posts" && (
        <section className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
                <Grid className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-text">Belum ada karya diunggah</h3>
              <p className="text-xs text-text-muted">
                Desainer ini belum mengunggah postingan karya ke feed portofolionya.
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsAddPostOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors touch-target"
                >
                  <Plus className="w-4 h-4" />
                  <span>Unggah Karya Pertamamu</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-square bg-surface border border-border rounded-md overflow-hidden cursor-pointer group"
                >
                  <FeedPreviewImage
                    src={post.previewUrl}
                    alt={post.caption}
                    category={post.category}
                    aspectRatio="square"
                  />

                  {/* Tombol Opsi ⋯ jika pemilik atau admin */}
                  {(isOwner || isAdmin) && (
                    <div
                      className="absolute top-2 right-2 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PostActionMenu
                        postId={post.id}
                        postTitle={post.caption}
                        isOwner={isOwner}
                        isAdmin={isAdmin}
                        status="PUBLISHED"
                        onArchive={() => handleArchivePost(post)}
                        onDelete={() => promptDeletePost(post)}
                      />
                    </div>
                  )}

                  {/* Overlay Instagram saat Hover */}
                  <div className="absolute inset-0 z-10 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 select-none pointer-events-none">
                    <div className="flex items-center justify-between gap-1">
                      <span className="self-start text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded capitalize">
                        {post.category}
                      </span>
                      {lowestPackagePrice != null && lowestPackagePrice > 0 && (
                        <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded font-money">
                          Mulai {formatRupiah(lowestPackagePrice)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white line-clamp-2">
                      {post.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 1B: KARYA DIARSIPKAN (KHUSUS PEMILIK & ADMIN) */}
      {activeTab === "archived" && (isOwner || isAdmin) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
            <div>
              <h3 className="font-bold text-sm text-text">Karya yang Diarsipkan</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Karya ini disembunyikan dari feed umum dan profil publik. Anda dapat memulihkannya kapan saja.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-alt border border-border text-text">
              {archivedPosts.length} karya
            </span>
          </div>

          {archivedPosts.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-alt text-text-muted mx-auto flex items-center justify-center">
                <Archive className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-text">Tidak ada karya diarsipkan</h3>
              <p className="text-xs text-text-muted">
                Semua karya aktif Anda tampil di tab Karya utama. Gunakan menu titik tiga (⋯) pada kartu karya untuk mengarsipkan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {archivedPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col justify-between group hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div
                    onClick={() => setSelectedPost(post)}
                    className="relative aspect-video sm:aspect-square bg-surface-alt overflow-hidden cursor-pointer"
                  >
                    <FeedPreviewImage
                      src={post.previewUrl}
                      alt={post.caption}
                      category={post.category}
                      aspectRatio="square"
                    />
                    <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                      Diarsipkan
                    </div>
                    <div
                      className="absolute top-2 right-2 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PostActionMenu
                        postId={post.id}
                        postTitle={post.caption}
                        isOwner={isOwner}
                        isAdmin={isAdmin}
                        status="ARCHIVED"
                        onRestore={() => handleRestorePost(post)}
                        onDelete={() => promptDeletePost(post)}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        {post.category}
                      </span>
                      <h4
                        onClick={() => setSelectedPost(post)}
                        className="font-bold text-xs sm:text-sm text-text line-clamp-2 mt-0.5 cursor-pointer hover:text-primary transition-colors"
                      >
                        {post.caption}
                      </h4>
                      {post.archivedAt && (
                        <span className="text-[11px] text-text-muted block mt-1">
                          Diarsipkan: {formatDate(post.archivedAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => handleRestorePost(post)}
                        className="flex-1 h-8 rounded-lg bg-primary-soft text-primary hover:bg-primary hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 touch-target"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Pulihkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => promptDeletePost(post)}
                        className="h-8 px-3 rounded-lg border border-danger/30 text-danger hover:bg-danger-soft font-bold text-xs transition-colors flex items-center justify-center gap-1 touch-target"
                        title="Hapus permanen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB PRODUK PREMADE: KATALOG DESAIN SIAP PAKAI / ASET DIGITAL */}
      {activeTab === "products" && (
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-text">Produk Premade & Aset Digital</h2>
              <p className="text-xs text-text-muted">
                Koleksi desain siap pakai, template, font, dan aset visual yang dapat langsung diunduh setelah dibeli.
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsAddProductOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors touch-target shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk Premade</span>
              </button>
            )}
          </div>

          {products.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
                <FileBox className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-text">Belum ada produk premade</h3>
              <p className="text-xs text-text-muted">
                {isOwner
                  ? "Unggah template, desain vektor, atau font siap pakai Anda untuk mendapatkan penghasilan pasif."
                  : "Desainer ini belum mempublikasikan produk atau aset digital premade."}
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors touch-target"
                >
                  <Plus className="w-4 h-4" />
                  <span>Unggah Produk Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {products.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isOwner={isOwner}
                  isAdmin={isAdmin}
                  onSelect={(p) => setSelectedProduct(p)}
                  onArchiveToggle={isOwner || isAdmin ? handleArchiveProduct : undefined}
                  onDelete={isOwner || isAdmin ? handleDeleteProduct : undefined}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: KATALOG PAKET JASA (GAYA FASTWORK) */}
      {activeTab === "packages" && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text">Paket Layanan & Jasa Resmi</h2>
              <p className="text-xs text-text-muted">
                Pilih paket siap pesan dengan rincian harga pasti dan jadwal pengerjaan jelas.
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsAddPackageOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Paket Baru</span>
              </button>
            )}
          </div>

          {packages.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-text">Belum ada paket jasa aktif</h3>
              <p className="text-xs text-text-muted">
                Desainer ini belum mempublikasikan paket jasa desain langsung. Kamu tetap dapat mengirim brief kustom.
              </p>
              <Link
                href={`/briefs/new?designerId=${designer.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Brief Kustom</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((pkg) => {
                const isCurrentOrdering = orderingPackageId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className="bg-surface border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-5 hover:border-primary/40 transition-colors shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-soft text-primary">
                          {pkg.category}
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="text-text-muted hover:text-danger p-1"
                            title="Hapus paket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-text leading-snug">
                        {pkg.title}
                      </h3>

                      <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                        {pkg.description}
                      </p>

                      {/* Specs Durasi & Revisi */}
                      <div className="flex items-center gap-4 text-xs font-medium text-text-muted pt-2 border-t border-border">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>{pkg.durationDays} hari kerja</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-primary" />
                          <span>{pkg.revisionQuota}x revisi</span>
                        </span>
                      </div>

                      {/* Poin Deliverables */}
                      {pkg.deliverables.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[11px] font-bold text-text block">
                            Yang Didapatkan:
                          </span>
                          <ul className="space-y-1 text-xs text-text-muted">
                            {pkg.deliverables.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Harga & Tombol Pesan */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-text-muted">Biaya Paket:</span>
                        <span className="font-money text-xl font-extrabold text-primary">
                          {formatRupiah(pkg.price)}
                        </span>
                      </div>

                      {!isOwner && (
                        <Button
                          variant="cta"
                          fullWidth
                          isLoading={isCurrentOrdering}
                          onClick={() => handleOrderPackage(pkg)}
                          className="h-10 text-xs font-bold"
                        >
                          Pesan Paket Ini
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: TENTANG DESAINER */}
      {activeTab === "info" && (
        <section className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="font-bold text-base text-text">Profil & Standar Kerja</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Informasi resmi desainer grafis terdaftar di JokiDay.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-background border border-border rounded-lg space-y-1">
              <span className="text-text-muted block">Nama Resmi</span>
              <span className="font-bold text-text text-sm">{designer.displayName}</span>
            </div>
            <div className="p-4 bg-background border border-border rounded-lg space-y-1">
              <span className="text-text-muted block">Status Keanggotaan</span>
              <span className="font-bold text-primary text-sm flex items-center gap-1">
                <UserCheck className="w-4 h-4" /> Desainer Terverifikasi
              </span>
            </div>
            <div className="p-4 bg-background border border-border rounded-lg space-y-1">
              <span className="text-text-muted block">Rating Kepuasan</span>
              <span className="font-bold text-text text-sm flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {designer.ratingCount > 0
                  ? `${designer.ratingAvg.toFixed(1)} / 5.0 (${designer.completedCount} pesanan selesai)`
                  : `Belum ada ulasan (${designer.completedCount} pesanan selesai)`}
              </span>
            </div>
            <div className="p-4 bg-background border border-border rounded-lg space-y-1">
              <span className="text-text-muted block">Bergabung Sejak</span>
              <span className="font-bold text-text text-sm">{formatDate(designer.createdAt)}</span>
            </div>
          </div>

          <div className="p-4 bg-primary-soft border border-primary/20 rounded-lg text-xs space-y-1 text-text">
            <span className="font-bold text-primary block">Jaminan Kualitas JokiDay</span>
            <p className="text-text-muted leading-relaxed">
              Semua pemesanan melalui profil ini terikat kontrak digital resmi. Dana diamankan hingga hasil desain diperiksa dan disetujui.
            </p>
          </div>
        </section>
      )}

      {/* MODAL LIGHTBOX: DETAIL KARYA */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-2xl w-full overflow-hidden shadow-floating flex flex-col md:flex-row max-h-[90vh]">
            {/* Sisi Gambar */}
            <div className="md:w-1/2 bg-black flex items-center justify-center aspect-square md:aspect-auto">
              <FeedPreviewImage
                src={selectedPost.previewUrl}
                alt={selectedPost.caption}
                category={selectedPost.category}
                aspectRatio="square"
                className="w-full h-full"
              />
            </div>

            {/* Sisi Detail */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-xs">
                      {designer.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-text block">
                        {designer.displayName}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        @{designer.username}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    className="p-1 rounded-md text-text-muted hover:text-text hover:bg-background"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-soft text-text-muted inline-block">
                    {selectedPost.category}
                  </span>
                  <h3 className="font-bold text-base text-text">{selectedPost.caption}</h3>
                  <span className="text-[11px] text-text-muted block">
                    Diunggah pada {formatDate(selectedPost.createdAt)}
                  </span>
                  {lowestPackagePrice != null && lowestPackagePrice > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] text-text-muted block">Mulai dari</span>
                      <span className="font-money text-sm font-extrabold text-text">
                        {formatRupiah(lowestPackagePrice)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                {selectedPost.status !== "ARCHIVED" ? (
                  <Link
                    href={`/briefs/new?designerId=${designer.id}&sourcePostId=${selectedPost.id}`}
                    className="w-full inline-flex items-center justify-center h-10 rounded-lg bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors touch-target"
                  >
                    Pesan Desain Serupa
                  </Link>
                ) : (
                  <div className="p-2.5 bg-surface-alt border border-border rounded-lg text-center text-xs text-text-muted">
                    Karya ini sedang diarsipkan dari publik
                  </div>
                )}

                {(isOwner || isAdmin) && (
                  <div className="flex items-center gap-2 pt-1">
                    {selectedPost.status !== "ARCHIVED" ? (
                      <button
                        type="button"
                        onClick={() => handleArchivePost(selectedPost)}
                        className="flex-1 h-9 rounded-lg bg-surface border border-border text-xs font-semibold text-text hover:bg-background transition-colors flex items-center justify-center gap-1.5 touch-target"
                      >
                        <Archive className="w-3.5 h-3.5 text-text-muted" />
                        <span>Arsipkan</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRestorePost(selectedPost)}
                        className="flex-1 h-9 rounded-lg bg-primary-soft text-primary hover:bg-primary hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 touch-target"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Pulihkan ke Publik</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => promptDeletePost(selectedPost)}
                      className="h-9 px-3.5 rounded-lg border border-danger/30 text-danger hover:bg-danger-soft text-xs font-bold transition-colors flex items-center justify-center gap-1 touch-target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="w-full h-9 rounded-lg border border-border text-xs font-semibold text-text-muted hover:text-text touch-target"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UNGGAH KARYA PORTOFOLIO (KHUSUS DESAINER) */}
      {isAddPostOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-floating">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text">Unggah Karya ke Feed</h3>
              <button
                type="button"
                onClick={() => setIsAddPostOpen(false)}
                className="p-1 rounded text-text-muted hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {postError && (
              <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{postError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">
                  File Gambar Karya
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPostFile(f);
                      setPostFilePreview(URL.createObjectURL(f));
                    }
                  }}
                  className="w-full text-xs text-text file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-soft file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  required
                />
                {postFilePreview && (
                  <div className="mt-2 aspect-video bg-background border border-border rounded overflow-hidden">
                    <img
                      src={postFilePreview}
                      alt="Pratinjau"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Judul / Deskripsi Singkat Karya
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Identitas Visual Kedai Kopi Senja"
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Kategori Desain
                </label>
                <select
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="logo">Logo & Identitas Visual</option>
                  <option value="kemasan">Kemasan & Label</option>
                  <option value="poster">Poster & Banner</option>
                  <option value="branding">Identitas Brand</option>
                  <option value="media">Konten Media Sosial</option>
                  <option value="ilustrasi">Ilustrasi</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPostOpen(false)}
                  className="px-4 py-2 rounded-md border border-border text-text-muted hover:text-text font-semibold"
                >
                  Batal
                </button>
                <Button type="submit" variant="cta" isLoading={isSubmittingPost}>
                  Unggah Sekarang
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH PAKET JASA (KHUSUS DESAINER) */}
      {isAddPackageOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-floating max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text">Buat Paket Jasa Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddPackageOpen(false)}
                className="p-1 rounded text-text-muted hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pkgError && (
              <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pkgError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePackage} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">
                  Nama Paket Jasa
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Desain Kemasan Box & Dieline Cetak"
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    Kategori
                  </label>
                  <select
                    value={pkgCategory}
                    onChange={(e) => setPkgCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="logo">Logo & Identitas</option>
                    <option value="kemasan">Kemasan & Label</option>
                    <option value="poster">Poster & Banner</option>
                    <option value="branding">Branding Lengkap</option>
                    <option value="media">Konten Medsos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    Harga Paket (Rp)
                  </label>
                  <input
                    type="number"
                    step={1000}
                    min={MIN_SERVICE_PACKAGE_PRICE}
                    placeholder="10000"
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-xs font-money focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">
                    Durasi Pengerjaan (Hari)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">
                    Kuota Revisi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={pkgRevisions}
                    onChange={(e) => setPkgRevisions(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Yang Didapatkan Pelanggan (Pisahkan dengan baris baru)
                </label>
                <textarea
                  rows={3}
                  value={pkgDeliverables}
                  onChange={(e) => setPkgDeliverables(e.target.value)}
                  placeholder="File Master AI/EPS&#10;File PNG Transparan HD&#10;Mockup 3D"
                  className="w-full p-2.5 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Deskripsi Lengkap Paket
                </label>
                <textarea
                  rows={3}
                  value={pkgDescription}
                  onChange={(e) => setPkgDescription(e.target.value)}
                  placeholder="Jelaskan detail apa saja yang kamu tawarkan dalam paket ini..."
                  className="w-full p-2.5 bg-background border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPackageOpen(false)}
                  className="px-4 py-2 rounded-md border border-border text-text-muted hover:text-text font-semibold"
                >
                  Batal
                </button>
                <Button type="submit" variant="cta" isLoading={isSubmittingPkg}>
                  Simpan Paket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS KARYA */}
      <DeletePostConfirmModal
        isOpen={Boolean(postToDelete)}
        postTitle={postToDelete?.caption}
        isDeleting={isDeletingPost}
        relatedBriefsCount={deleteUsageCount}
        onClose={() => {
          if (!isDeletingPost) setPostToDelete(null);
        }}
        onConfirm={handleConfirmDeletePost}
      />

      {/* TOAST NOTIFIKASI DENGAN AKSI URUNGKAN */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-floating text-xs font-medium ${
              toast.type === "error"
                ? "bg-danger-soft border-danger/30 text-danger"
                : "bg-surface border-border text-text"
            }`}
          >
            <span>{toast.message}</span>
            {toast.undoAction && (
              <button
                type="button"
                onClick={() => {
                  toast.undoAction?.();
                  setToast(null);
                }}
                className="px-2.5 py-1 rounded-md bg-primary text-white font-bold text-[11px] hover:bg-primary-hover transition-colors touch-target"
              >
                Urungkan
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded text-text-muted hover:text-text ml-1"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD PRODUK PREMADE */}
      <UploadProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
          setActiveTab("products");
          setToast({
            id: crypto.randomUUID(),
            message: "Produk premade berhasil diterbitkan!",
            type: "success",
          });
        }}
        isDriveConnected={Boolean(isDriveConnected)}
      />

      {/* MODAL DETAIL PRODUK PREMADE */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        isLoggedIn={isLoggedIn}
        onProductPurchased={(prodId) => {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === prodId
                ? {
                    ...p,
                    hasPurchased: true,
                    hasAccess: true,
                    downloadCount: p.downloadCount + 1,
                  }
                : p
            )
          );
        }}
      />
    </div>
  );
}
