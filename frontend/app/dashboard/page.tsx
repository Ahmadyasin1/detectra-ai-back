"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Upload, Video, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { videosApi, fetcher } from "@/lib/api";
import { formatBytes, formatDuration, formatDate } from "@/lib/utils";
import type { VideoPage, Video as VideoType } from "@/lib/types";
import VideoUploader from "@/components/VideoUploader";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  uploaded:   { icon: Upload,       color: "text-slate-400", bg: "bg-slate-500/10",   label: "Uploaded" },
  queued:     { icon: Clock,        color: "text-amber-400",  bg: "bg-amber-500/10",   label: "Queued" },
  processing: { icon: Loader2,      color: "text-blue-400",   bg: "bg-blue-500/10",    label: "Processing" },
  completed:  { icon: CheckCircle,  color: "text-emerald-400",bg: "bg-emerald-500/10", label: "Completed" },
  failed:     { icon: AlertCircle,  color: "text-red-400",    bg: "bg-red-500/10",     label: "Failed" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, mutate } = useSWR<VideoPage>(
    `/videos/?page=${page}&page_size=12`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const handleUploadComplete = useCallback((video: VideoType) => {
    toast.success(`"${video.original_filename}" uploaded successfully!`);
    mutate();
    router.push(`/dashboard/${video.id}`);
  }, [router, mutate]);

  const handleDelete = useCallback(async (videoId: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await videosApi.delete(videoId);
      toast.success("Video deleted");
      mutate();
    } catch {
      toast.error("Failed to delete video");
    }
  }, [mutate]);

  const videos = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Upload a video to begin multimodal analysis</p>
      </div>

      {/* Upload Zone */}
      <VideoUploader onUploadComplete={handleUploadComplete} />

      {/* Recent Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Videos</h2>
          {data && <span className="text-slate-500 text-sm">{data.total} total</span>}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="skeleton h-36 w-full rounded-lg" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="card p-16 text-center">
            <Video className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No videos yet</h3>
            <p className="text-slate-500 text-sm">Upload your first video above to get started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => {
                const status = STATUS_CONFIG[video.status] || STATUS_CONFIG.uploaded;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={video.id}
                    className="card overflow-hidden hover:border-white/20 transition-all duration-200 cursor-pointer group"
                    onClick={() => router.push(`/dashboard/${video.id}`)}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-36 bg-surface flex items-center justify-center">
                      {video.thumbnail_path ? (
                        <img
                          src={videosApi.thumbnailUrl(video.id)}
                          alt={video.original_filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="w-10 h-10 text-slate-600" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      {/* Status badge */}
                      <div className={cn("absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.bg, status.color)}>
                        <StatusIcon className={cn("w-3 h-3", video.status === "processing" && "animate-spin")} />
                        {status.label}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium text-slate-200 truncate">{video.original_filename}</p>
                      <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
                        <span>{formatBytes(video.file_size_bytes)}</span>
                        {video.duration_seconds && <span>{formatDuration(video.duration_seconds)}</span>}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{formatDate(video.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-ghost text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
