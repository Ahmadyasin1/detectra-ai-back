import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Detectra AI — Multimodal Video Intelligence",
    template: "%s | Detectra AI",
  },
  description:
    "AI-powered multimodal video analysis platform. Detect objects, logos, actions, speech and audio events with transformer-based fusion.",
  keywords: ["AI", "video analysis", "object detection", "multimodal", "machine learning"],
  authors: [{ name: "Detectra AI Team — UCP FYP F25AI009" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-surface text-slate-100 antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "0.75rem",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#1e293b" } },
            error:   { iconTheme: { primary: "#f43f5e", secondary: "#1e293b" } },
          }}
        />
      </body>
    </html>
  );
}
