"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";

export interface DiscoverPost {
  id: string;
  caption: string;
  category: string;
  previewUrl: string;
  createdAt: string;
  startingPrice: number;
  designer: {
    id: string;
    displayName: string;
    username?: string;
    ratingAvg: number;
    completedCount: number;
    bio: string;
    isVerified: boolean;
  };
}

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
}: {
  initialPosts: DiscoverPost[];
  topDesigners: DiscoverDesigner[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "price_asc" | "price_desc">("popular");

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

  const filteredPosts = useMemo(() => {
    return initialPosts
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
          return a.startingPrice - b.startingPrice;
        }
        if (sortBy === "price_desc") {
          return b.startingPrice - a.startingPrice;
        }
        // popular (rating * completedCount)
        const scoreA = (a.designer.ratingAvg || 5) * (a.designer.completedCount || 1);
        const scoreB = (b.designer.ratingAvg || 5) * (b.designer.completedCount || 1);
        return scoreB - scoreA;
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
            {filteredPosts.map((post) => {
              const designerProfileUrl = `/designer/${post.designer.username || post.designer.id}`;

              return (
                <div
                  key={post.id}
                  className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col group hover:shadow-floating hover:border-primary/50 transition-all"
                >
                  {/* Thumbnail Gambar */}
                  <div className="relative group overflow-hidden">
                    <FeedPreviewImage
                      src={post.previewUrl}
                      alt={post.caption}
                      category={post.category}
                      aspectRatio="4/3"
                    />

                    {/* Badge Kategori */}
                    <div className="absolute top-2.5 left-2.5 z-10 bg-surface/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-text uppercase tracking-wider border border-border/50">
                      {post.category}
                    </div>
                  </div>

                  {/* Body Card */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      {/* Profil Singkat Desainer */}
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={designerProfileUrl}
                          className="flex items-center gap-2 min-w-0 group/designer hover:opacity-80 transition-opacity"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                            {post.designer.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-text truncate group-hover/designer:text-primary transition-colors">
                            {post.designer.displayName}
                          </span>
                        </Link>
                        {post.designer.isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary shrink-0">
                            <UserCheck className="w-3 h-3" />
                            <span>Terverifikasi</span>
                          </span>
                        )}
                      </div>

                      {/* Judul Layanan / Karya */}
                      <h3 className="font-bold text-sm text-text line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {post.caption}
                      </h3>
                    </div>

                    {/* Rating & Harga Mulai */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-text">
                            {post.designer.ratingAvg > 0 ? post.designer.ratingAvg.toFixed(1) : "-"}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            ({post.designer.completedCount} pesanan)
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-text-muted block">Mulai dari</span>
                          <span className="font-money text-sm font-extrabold text-text">
                            {formatRupiah(post.startingPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Tombol Pesan Langsung */}
                      <Link
                        href={`/briefs/new?designerId=${post.designer.id}&sourcePostId=${post.id}`}
                        className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors touch-target shrink-0"
                      >
                        Pesan Jasa
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-text">
                            {designer.ratingAvg > 0 ? designer.ratingAvg.toFixed(1) : "-"}
                          </span>
                          <span>&bull; {designer.completedCount} pesanan selesai</span>
                        </div>
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
    </div>
  );
}
