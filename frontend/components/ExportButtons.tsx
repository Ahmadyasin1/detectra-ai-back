"use client";

import { useState } from "react";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { reportsApi } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

interface Props {
  jobId: number;
}

export default function ExportButtons({ jobId }: Props) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  async function download(type: "pdf" | "csv") {
    const setter = type === "pdf" ? setDownloadingPdf : setDownloadingCsv;
    setter(true);
    try {
      const url = type === "pdf" ? reportsApi.pdfUrl(jobId) : reportsApi.csvUrl(jobId);
      const token = getAccessToken();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = type === "pdf" ? `detectra-report-job${jobId}.pdf` : `detectra-results-job${jobId}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${type.toUpperCase()} downloaded`);
    } catch {
      toast.error(`Failed to download ${type.toUpperCase()}`);
    } finally {
      setter(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => download("pdf")}
        disabled={downloadingPdf}
        className="btn-ghost flex items-center gap-2 text-sm border border-surface-border px-4 py-2 rounded-lg"
      >
        {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Export PDF
      </button>
      <button
        onClick={() => download("csv")}
        disabled={downloadingCsv}
        className="btn-ghost flex items-center gap-2 text-sm border border-surface-border px-4 py-2 rounded-lg"
      >
        {downloadingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
        Export CSV
      </button>
    </div>
  );
}
