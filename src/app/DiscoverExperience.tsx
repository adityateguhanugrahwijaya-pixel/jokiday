"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Star,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
  Check,
  UserCheck,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";
import { PostActionMenu } from "@/components/feed/PostActionMenu";
import { DeletePostConfirmModal } from "@/components/feed/DeletePostConfirmModal";
import { FeedCard, FeedCardPost } from "@/components/feed/FeedCard";

export type DiscoverPost = FeedCardPost;

export interface DiscoverDesigner {
  id: string;
  displayName: string;
  username?: string;
  ratingAvg: number;
  completedCount: number;
  bio: string;
  isVerified: boolean;
  categories: string[];
}

export function DiscoverExperience({
  initialPosts,
  topDesigners,
  currentUserId,
  isCurrentUserAdmin,
}: {
  initialPosts: DiscoverPost[];
  topDesigners: DiscoverDesigner[];
  currentUserId?: string;
  isCurrentUserAdmin?: boolean;
}) {
  const [posts, setPosts] = useState<DiscoverPost[]>(initialPosts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "price_asc" | "price_desc">("popular");

  // State Hapus & Arsip
  const [postToDelete, setPostToDelete] = useState<DiscoverPost | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number>(0);
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    type?: "success" | "error" | "info";
    undoAction?: () => void;
  } | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const categories = [
    { id: "all", label: "Semua Kategori", icon: "✨" },
    { id: "logo", label: "Logo & Branding", icon: "🎨" },
    { id: "kemasan", label: "Kemasan & Label", icon: "📦" },
    { id: "poster", label: "Poster & Banner", icon: "📢" },
    { id: "branding", label: "Identitas Brand", icon: "🏷️" },
    { id: "media", label: "Konten Medsos", icon: "📱" },
  ];

  const popularTags = [
    "Logo",
    "Poster",
    "Kemasan",
  ];

  const handleArchivePost = async (post: DiscoverPost) => {
    const originalPosts = [...posts];
    setPosts((prev) => prev.filter((p) => p.id !== post.id));

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
        undoAction: () => handleRestorePost(post),
      });
    } catch (err: any) {
      setPosts(originalPosts);
      setToast({
        id: crypto.randomUUID(),
        message: err.message || "Gagal mengarsipkan karya",
        type: "error",
      });
    }
  };

  const handleRestorePost = async (post: DiscoverPost) => {
    const originalPosts = [...posts];
    setPosts((prev) => [post, ...prev]);

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
        message: "Karya berhasil dipulihkan ke feed publik.",
        type: "success",
      });
    } catch (err: any) {
      setPosts(originalPosts);
      setToast({
        id: crypto.randomUUID(),
        message: err.message || "Gagal memulihkan karya",
        type: "error",
      });
    }
  };

  const promptDeletePost = async (post: DiscoverPost) => {
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
      setPostToDelete(null);

      setToast({
        id: crypto.randomUUID(),
        message: "Karya berhasil dihapus dari tampilan.",
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

  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        // Filter Kategori
        if (selectedCategory !== "all") {
          const cat = post.category.toLowerCase();
          if (selectedCategory === "logo" && !cat.includes("logo")) return false;
          if (selectedCategory === "kemasan" && !cat.includes("kemasan")) return false;
          if (selectedCategory === "poster" && !cat.includes("poster")) return false;
          if (selectedCategory === "branding" && !cat.includes("branding")) return false;
          if (selectedCategory === "media" && !cat.includes("media") && !cat.includes("sosial")) return false;
        }

        // Filter Pencarian
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = post.caption.toLowerCase().includes(q);
          const matchCategory = post.category.toLowerCase().includes(q);
          const matchDesigner = post.designer.displayName.toLowerCase().includes(q);
          return matchTitle || matchCategory || matchDesigner;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "price_asc") {
          const priceA = a.startingPrice ?? Number.MAX_SAFE_INTEGER;
          const priceB = b.startingPrice ?? Number.MAX_SAFE_INTEGER;
          if (priceA !== priceB) return priceA - priceB;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "price_desc") {
          const priceA = a.startingPrice ?? -1;
          const priceB = b.startingPrice ?? -1;
          if (priceA !== priceB) return priceB - priceA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // popular (rating * completedCount) - data riil tanpa mock default
        const scoreA = (a.designer.ratingAvg || 0) * (a.designer.completedCount || 0);
        const scoreB = (b.designer.ratingAvg || 0) * (b.designer.completedCount || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [initialPosts, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-12 pb-8">
      {/* 1. HERO DISCOVER (Gaya Fastwork: Search Banner yang Memikat) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-primary/10 via-surface to-surface border border-border p-6 sm:p-10 lg:p-12 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Marketplace Desain Grafis Terpercaya</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text tracking-tight leading-tight">
            Cari & Pesan Jasa Desain Grafis Profesional untuk Bisnismu
          </h1>

          <p className="text-sm sm:text-base text-text-muted max-w-xl mx-auto">
            Temukan desainer terverifikasi, lihat portofolio nyata, dan pesan dengan jaminan hasil aman dan berkualitas.
          </p>

          {/* Kotak Pencarian Utama */}
          <div className="relative max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-surface p-2 rounded-xl border border-border shadow-md">
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-text-muted absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari jasa logo, kemasan makanan, poster, feed medsos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-transparent text-sm sm:text-base text-text focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mr-2 text-xs font-semibold text-text-muted hover:text-text px-2 py-1"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <button
                type="button"
                className="h-12 px-6 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors flex items-center justify-center gap-2 touch-target"
              >
                <Search className="w-4 h-4" />
                <span>Cari Desain</span>
              </button>
            </div>

            {/* Rekomendasi Tag Populer */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs text-text-muted">
              <span className="font-semibold text-text">Pencarian Populer:</span>
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-md bg-background border border-border hover:border-primary text-text text-xs transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 3 Keunggulan Ramah Pengguna (Bukan teks teknis yang membingungkan) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs font-semibold text-text border-t border-border/60">
            <div className="flex items-center justify-center gap-1.5 text-text">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              <span>Garansi Pesanan Selesai Sesuai Brief</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-text">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              <span>Portofolio Hasil Karya Asli</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-text">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              <span>Desainer Grafis Terverifikasi</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KATEGORI PILIHAN (Category Navigation Pills ala Fastwork) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-text">
            Jelajahi Berdasarkan Kategori
          </h2>
          <span className="text-xs text-text-muted">
            Pilih kategori untuk memfilter hasil
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 touch-target ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface text-text-muted hover:text-text hover:bg-background border border-border"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. DISCOVER FEED KARYA & JASA (Katalog Card Gaya Fastwork) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">
              Rekomendasi Jasa & Portofolio Desain
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Menampilkan {filteredPosts.length} karya desain pilihan siap dipesan
            </p>
          </div>

          {/* Sortir Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-text-muted font-medium">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 bg-surface border border-border rounded-md text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="popular">Paling Populer</option>
              <option value="newest">Karya Terbaru</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
            </select>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-text">
                Belum ada portofolio yang cocok dengan pencarianmu
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Belum menemukan desain yang kamu inginkan? Buat brief kebutuhanmu di pasar terbuka agar desainer terverifikasi kami dapat mengirimkan penawaran terbaik untukmu!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/briefs/new"
                className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary-hover transition-colors touch-target"
              >
                Posting Kebutuhan Desain Baru
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-xs text-text-muted hover:text-text font-semibold px-3 py-2"
              >
                Lihat Semua Karya
              </button>
            </div>
          </div>
        ) : (
          /* Grid Portofolio Responsif (Fastwork Gig Cards) */
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredPosts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                isAdmin={isCurrentUserAdmin}
                onArchive={handleArchivePost}
                onDelete={promptDeletePost}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. DESAINER PILIHAN TERVERIFIKASI (Freelancer Populer) */}
      <section className="space-y-6 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">
              Desainer Grafis Terverifikasi
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Kreator profesional siap mewujudkan kebutuhan visual dan identitas usahamu.
            </p>
          </div>
          <Link
            href="/market"
            className="text-primary font-bold text-xs sm:text-sm hover:underline inline-flex items-center gap-1"
          >
            Posting brief di pasar <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {topDesigners.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center max-w-md mx-auto space-y-3">
            <div className="w-10 h-10 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-text">
              Belum ada desainer terverifikasi yang ditampilkan
            </p>
            <p className="text-xs text-text-muted">
              Pendaftaran desainer baru dibuka secara bertahap melalui sistem undangan eksklusif.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topDesigners.map((designer) => {
              const profileUrl = `/designer/${designer.username || designer.id}`;
              return (
                <div
                  key={designer.id}
                  className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <Link href={profileUrl} className="flex items-center gap-3 group/d hover:opacity-90 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-primary-soft text-primary font-extrabold flex items-center justify-center text-base border border-primary/20 shrink-0">
                        {designer.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-text truncate group-hover/d:text-primary transition-colors">
                            {designer.displayName}
                          </h3>
                          {designer.isVerified && (
                            <UserCheck className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </div>
                        {(designer.ratingAvg > 0 || designer.completedCount > 0) && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                            {designer.ratingAvg > 0 && (
                              <>
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span className="font-bold text-text">
                                  {designer.ratingAvg.toFixed(1)}
                                </span>
                              </>
                            )}
                            {designer.completedCount > 0 && (
                              <span>
                                {designer.ratingAvg > 0 ? "• " : ""}
                                {designer.completedCount} pesanan selesai
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>

                    <p className="text-xs text-text-muted mt-3 line-clamp-2 leading-relaxed">
                      {designer.bio || "Desainer grafis profesional siap membantu kebutuhan visual usahamu."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Link
                      href={profileUrl}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary-soft text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
                    >
                      Lihat Portofolio
                    </Link>
                    <Link
                      href={`/briefs/new?designerId=${designer.id}`}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors"
                    >
                      Pesan Desain
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. CARA KERJA PEMESANAN (Simple, Jelas, Gaya Fastwork) */}
      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-10 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-text">
            Cara Mudah Memesan Desain di JokiDay
          </h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Langkah sederhana dan transparan untuk mendapatkan hasil desain berkualitas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-bold text-sm text-text">Pilih Karya atau Buat Brief</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Pilih desain favorit dari katalog atau posting brief kebutuhan langsung ke desainer pilihanmu.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-bold text-sm text-text">Sepakati Penawaran & Bayar Aman</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Desainer mengirimkan penawaran harga dan deadline. Bayar instan via QRIS dengan garansi uang aman.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-bold text-sm text-text">Periksa Pratinjau & Terima File</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Periksa hasil pengerjaan. Jika sudah puas, setujui pesanan dan file asli langsung kamu dapatkan.
            </p>
          </div>
        </div>
      </section>

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
    </div>
  );
}
