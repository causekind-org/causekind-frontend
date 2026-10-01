"use client";

import React, { useState } from "react";

export function LocalTestUploadButton({ onFile, accept }: { onFile: (f: File) => void, accept?: string }) {
  const [loading, setLoading] = useState(false);
  const isTestMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_NGO_LOCAL_TEST_MODE === "true";

  if (!isTestMode) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let isPdf = accept?.includes("pdf") && !accept?.includes("image");
      
      let blob: Blob;
      if (isPdf) {
          // Minimal valid PDF bytes
          const pdfStr = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n111\n%%EOF\n";
          blob = new Blob([pdfStr], { type: "application/pdf" });
      } else {
          // Tiny transparent PNG
          const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
          const res = await fetch(`data:image/png;base64,${pngBase64}`);
          blob = await res.blob();
      }
      
      const file = new File([blob], isPdf ? "sample.pdf" : "sample.png", { type: isPdf ? "application/pdf" : "image/png" });
      onFile(file);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="ml-2 px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold rounded"
    >
      {loading ? "..." : "Use sample file (local testing)"}
    </button>
  );
}
