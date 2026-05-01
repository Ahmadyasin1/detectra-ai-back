"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Video, Upload, Clock, CheckCircle, AlertCircle, Loader2,
  Search, Filter, Trash2, Play, Grid, List, SortAsc,
} from "lucide-react";
import { videosApi, fetcher } from "@/lib/api";
import { formatBytes, formatDuration, formatDate, cn } from "@/lib/utils";
import type { VideoPage, Video as VideoType } from "@/lib/types";
import VideoUploader from "@/components/VideoUploader";

const STATUS_CONFIG = {
  uploaded:   { icon: Upload,       color: "text-slate-400", bg: "bg-slate-500/10",    label: "Uploaded" },
  queued:     { icon: Clock,        color: "text-amber-400",  bg: "bg-amber-500/10",    label: "Queued" },
  processing: { icon: Loader2,      color: "text-blue-400",   bg: "bg-blue-500/10",     label: "Processing" },
  completed:  { icon: CheckCircle,  color: "text-emerald-400",bg: "bg-emerald-500/10",  label: "Completed" },
  failed:     { icon: AlertCircle,  color: "text-red-400",    bg: "bg-red-500/10",      label: "Failed" },
};

type SortKey = "date" | "name" | "size" | "duration";
type ViewMode = "grid" | "list";

export default function VideosPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showUploader, setShowUploader] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, mutate } = useSWR<VideoPage>(
    `/videos/?page=${page}&page_size=20`,
    fetcher,
    { refreshInterval: 8000 }
  );

  const handleUploadComplete = useCallback((video: VideoType) => {
    toast.success(`"${video.original_filename}" uploaded!`);
    setShowUploader(false);
    mutate();
    router.push(`/dashboard/${video.id}`);
  }, [router, mutate]);

  const handleDelete = useCallback(async (e: React.MouseEvent, videoId: number, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(videoId);
    try {
      await videosApi.delete(videoId);
      toast.success("Video deleted");
      mutate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }, [mutate]);

  const allVideos = data?.items || [];

  // Client-side filter + sort
  const filtered = allVideos
    .filter((v) => {
      const matchSearch = !search || v.original_filename.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || v.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortKey) {
        case "name": return a.original_filename.localeCompare(b.original_filename);
        case "size": return b.file_size_bytes - a.file_size_bytes;
        case "duration": return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const totalPages = data?.total_pages || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Videos</h1>
          <p className="text-slate-400 mt-1">
            {data ? `${data.total} video${data.total !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <button
          onClick={() => setShowUploader((v) => !v)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Video
        </button>
      </div>

      {/* Upload area (toggle) */}
      {showUploader && (
        <VideoUploader onUploadComplete={handleUploadComplete} />
      )}

      {/* Filters + View */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 text-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input py-2 text-sm w-36"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1">
          <SortAsc className="w-4 h-4 text-slate-500" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="input py-2 text-sm w-36"
          >
            <option value="date">Newest First</option>
            <option value="name">Name A–Z</option>
            <option value="size">Largest First</option>
            <option value="duration">Longest First</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-surface-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200")}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-colors", viewMode === "list" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Video className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            {search || statusFilter !== "all" ? "No videos match your filters" : "No videos yet"}
          </h3>
          <p className="text-slate-500 text-sm">
            {search || statusFilter !== "all"
              ? "Try adjusting the search or status filter"
              : "Upload your first video to get started"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onOpen={() => router.push(`/dashboard/${video.id}`)}
              onDelete={(e) => handleDelete(e, video.id, video.original_filename)}
              deleting={deletingId === video.id}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              onOpen={() => router.push(`/dashboard/${video.id}`)}
              onDelete={(e) => handleDelete(e, video.id, video.original_filename)}
              deleting={deletingId === video.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
    </div>
  );
}

function VideoCard({
  video, onOpen, onDelete, deleting,
}: {
  video: VideoType;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  deleting: boolean;
}) {
  const status = STATUS_CONFIG[video.status] || STATUS_CONFIG.uploaded;
  const StatusIcon = status.icon;
  return (
    <div
      className="card overflow-hidden hover:border-white/20 transition-all duration-200 cursor-pointer group"
      onClick={onOpen}
    >
      <div className="relative h-36 bg-surface flex items-center justify-center">
        {video.thumbnail_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={videosApi.thumbnailUrl(video.id)} alt={video.original_filename} className="w-full h-full object-cover" />
        ) : (
          <Video className="w-10 h-10 text-slate-600" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className={cn("absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.bg, status.color)}>
          <StatusIcon className={cn("w-3 h-3", video.status === "processing" && "animate-spin")} />
          {status.label}
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-slate-200 truncate" title={video.original_filename}>
          {video.original_filename}
        </p>
        <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
          <span>{formatBytes(video.file_size_bytes)}</span>
          {video.duration_seconds && <span>{formatDuration(video.duration_seconds)}</span>}
        </div>
        <p className="text-xs text-slate-600 mt-1">{formatDate(video.created_at)}</p>
      </div>
    </div>
  );
}

function VideoRow({
  video, onOpen, onDelete, deleting,
}: {
  video: VideoType;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  deleting: boolean;
}) {
  const status = STATUS_CONFIG[video.status] || STATUS_CONFIG.uploaded;
  const StatusIcon = status.icon;
  return (
    <div
      className="card p-4 flex items-center gap-4 hover:border-white/20 transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <div className="w-16 h-12 bg-surface rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
        {video.thumbnail_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={videosApi.thumbnailUrl(video.id)} alt={video.original_filename} className="w-full h-full object-cover" />
        ) : (
          <Video className="w-6 h-6 text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{video.original_filename}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatBytes(video.file_size_bytes)}
          {video.duration_seconds && ` · ${formatDuration(video.duration_seconds)}`}
          {video.width && ` · ${video.width}×${video.height}`}
        </p>
      </div>
      <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0", status.bg, status.color)}>
        <StatusIcon className={cn("w-3 h-3", video.status === "processing" && "animate-spin")} />
        {status.label}
      </div>
      <p className="text-xs text-slate-500 flex-shrink-0 hidden sm:block w-36 text-right">
        {formatDate(video.created_at)}
      </p>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 flex-shrink-0"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
