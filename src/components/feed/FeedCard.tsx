"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, UserCheck } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";
import { PostActionMenu } from "@/components/feed/PostActionMenu";

export interface FeedCardPost {
  id: string;
  caption: string;
  category: string;
  previewUrl: string;
  createdAt: string;
  startingPrice?: number | null;
  designer: {
    id: string;
    displayName: string;
    username?: string;
    ratingAvg?: number;
    completedCount?: number;
    bio?: string;
    isVerified?: boolean;
  };
}

export interface FeedCardProps<T extends FeedCardPost = FeedCardPost> {
  post: T;
  currentUserId?: string;
  isAdmin?: boolean;
  onArchive?: (post: T) => void;
  onDelete?: (post: T) => void;
}

/**
 * Komponen tunggal kartu feed karya portofolio desainer (Single Source of Truth).
 * Digunakan di Halaman Discover, Portofolio, dan di mana pun kartu feed ditampilkan.
 *
 * Aturan Tampilan Harga:
 * - Menampilkan "Mulai dari <harga>" HANYA jika desainer memiliki paket jasa aktif (startingPrice > 0).
 * - Jika desainer belum memiliki paket jasa, blok "Mulai dari" TIDAK dirender sama sekali.
 * - Tidak menggunakan harga mock, default statis, atau kategori fallback acak.
 */
export function FeedCard<T extends FeedCardPost = FeedCardPost>({
  post,
  currentUserId,
  isAdmin,
  onArchive,
  onDelete,
}: FeedCardProps<T>) {
  const router = useRouter();
  const designerProfileUrl = `/designer/${post.designer.username || post.designer.id}`;
  const isOwner = post.designer.id === currentUserId;
  const canManage = isOwner || Boolean(isAdmin);

  const hasRating = (post.designer.ratingAvg ?? 0) > 0;
  const hasOrders = (post.designer.completedCount ?? 0) > 0;
  const hasStartingPrice =
    post.startingPrice !== null &&
    post.startingPrice !== undefined &&
    post.startingPrice > 0;

  return (
    <div className="group bg-surface border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between">
      {/* Thumbnail Pratinjau Karya */}
      <div
        onClick={() => router.push(designerProfileUrl)}
        className="relative aspect-square bg-surface-alt overflow-hidden cursor-pointer"
      >
        <FeedPreviewImage
          src={post.previewUrl}
          alt={post.caption}
          category={post.category}
          aspectRatio="square"
        />

        {/* Menu Aksi Titik Tiga (⋯) Pemilik atau Admin */}
        {canManage && (
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
              onArchive={onArchive ? () => onArchive(post) : undefined}
              onDelete={onDelete ? () => onDelete(post) : undefined}
            />
          </div>
        )}
      </div>

      {/* Konten Kartu */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Identitas Singkat Desainer */}
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

          {/* Judul Karya */}
          <h3 className="font-bold text-sm text-text line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {post.caption}
          </h3>
        </div>

        {/* Baris Rating & Harga Mulai */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="min-w-0">
            {/* Rating Riil & Pesanan Selesai (Hanya dirender jika sudah ada ulasan atau pesanan riil) */}
            {(hasRating || hasOrders) && (
              <div className="flex items-center gap-1.5 text-xs">
                {hasRating && (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-bold text-text">
                      {(post.designer.ratingAvg ?? 0).toFixed(1)}
                    </span>
                  </>
                )}
                {hasOrders && (
                  <span className="text-[10px] text-text-muted truncate">
                    ({post.designer.completedCount} pesanan)
                  </span>
                )}
              </div>
            )}

            {/* Blok "Mulai dari" HANYA jika desainer memiliki paket aktif */}
            {hasStartingPrice && (
              <div className={hasRating || hasOrders ? "mt-1" : ""}>
                <span className="text-[10px] text-text-muted block leading-none">Mulai dari</span>
                <span className="font-money text-sm font-extrabold text-text block mt-0.5">
                  {formatRupiah(post.startingPrice!)}
                </span>
              </div>
            )}
          </div>

          {/* Tombol Aksi: Sembunyikan Pesan Jasa untuk Pemilik; Tampilkan Kirim Pesan jika belum ada paket */}
          {isOwner ? (
            <Link
              href={designerProfileUrl}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:bg-background transition-colors touch-target shrink-0"
            >
              Kelola Karya
            </Link>
          ) : hasStartingPrice ? (
            <Link
              href={`/briefs/new?designerId=${post.designer.id}&sourcePostId=${post.id}`}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors touch-target shrink-0"
            >
              Pesan Jasa
            </Link>
          ) : (
            <Link
              href={`/chat?designerId=${post.designer.id}&name=${encodeURIComponent(post.designer.displayName)}`}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-primary-soft text-primary font-bold text-xs hover:bg-primary/20 transition-colors touch-target shrink-0"
            >
              Kirim Pesan
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
