"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, Film, X, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { videosApi } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Video } from "@/lib/types";

interface Props {
  onUploadComplete: (video: Video) => void;
}

const ALLOWED_TYPES = ["video/mp4", "video/avi", "video/quicktime", "video/x-matroska", "video/webm"];
const MAX_SIZE_MB = 500;

export default function VideoUploader({ onUploadComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      toast.error("File too large or unsupported format");
      return;
    }
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
      setDone(false);
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".avi", ".mov", ".mkv", ".webm"] },
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading,
  });

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const video = await videosApi.upload(file, setProgress);
      setDone(true);
      onUploadComplete(video);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setProgress(0);
    setDone(false);
    setUploading(false);
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Upload Video</h2>

      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-brand-500 bg-brand-500/10"
            : "border-surface-border hover:border-slate-500 hover:bg-white/2",
          uploading && "cursor-not-allowed opacity-60",
          file && "bg-surface"
        )}
      >
        <input {...getInputProps()} />

        {!file ? (
          <div>
            <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-brand-400" />
            </div>
            <p className="text-slate-200 font-semibold mb-1">
              {isDragActive ? "Drop your video here" : "Drag & drop a video file"}
            </p>
            <p className="text-slate-500 text-sm">
              or <span className="text-brand-400">click to browse</span>
            </p>
            <p className="text-slate-600 text-xs mt-3">MP4, AVI, MOV, MKV, WebM · Max {MAX_SIZE_MB}MB</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Film className="w-6 h-6 text-brand-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-slate-200 font-medium truncate">{file.name}</p>
              <p className="text-slate-500 text-sm">{formatBytes(file.size)}</p>
              {uploading && (
                <div className="mt-2">
                  <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div className="progress-fill h-full" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{progress}% uploaded</p>
                </div>
              )}
            </div>
            {!uploading && !done && (
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="btn-ghost p-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {done && <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
          </div>
        )}
      </div>

      {file && !uploading && !done && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={reset} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleUpload} className="btn-primary flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" />
            Upload &amp; Continue
          </button>
        </div>
      )}

      {uploading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading — do not close this page
        </div>
      )}
    </div>
  );
}
