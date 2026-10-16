"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Layers, X } from "lucide-react";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";
import { PostActionMenu } from "@/components/feed/PostActionMenu";
import { DeletePostConfirmModal } from "@/components/feed/DeletePostConfirmModal";
import { FeedCard, FeedCardPost } from "@/components/feed/FeedCard";

export type PortfolioGridPost = FeedCardPost;

export function PortfolioFeedGrid({
  initialPosts,
  currentUserId,
  isCurrentUserAdmin,
  isDesigner,
}: {
  initialPosts: PortfolioGridPost[];
  currentUserId?: string;
  isCurrentUserAdmin?: boolean;
  isDesigner?: boolean;
}) {
  const [posts, setPosts] = useState<PortfolioGridPost[]>(initialPosts);
  const [postToDelete, setPostToDelete] = useState<PortfolioGridPost | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number>(0);
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    type?: "success" | "error" | "info";
    undoAction?: () => void;
  } | null>(null);

  const handleArchivePost = async (post: PortfolioGridPost) => {
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

  const handleRestorePost = async (post: PortfolioGridPost) => {
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

  const promptDeletePost = async (post: PortfolioGridPost) => {
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

  if (posts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-text">Belum ada karya diunggah</h3>
          <p className="text-sm text-text-muted mt-1">
            {isDesigner
              ? "Gunakan tombol di atas untuk mengunggah karya pertamamu."
              : "Karya desain terverifikasi akan segera tampil di sini."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {posts.map((post) => (
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

      {/* TOAST NOTIFIKASI */}
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
    </>
  );
}
