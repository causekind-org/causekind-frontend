"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getOfferCertificate, verifyCertificate, type Certificate } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { LogoSVG } from "@/components/LogoSVG";

export default function CertificatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const offerId = searchParams.get("offerId");
  const certNumber = searchParams.get("certNumber");
  const printRef = useRef<HTMLDivElement>(null);

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (certNumber) {
      verifyCertificate(certNumber).then(setCert).catch(() => setError("Certificate not found")).finally(() => setLoading(false));
    } else if (offerId) {
      getOfferCertificate(Number(offerId)).then(setCert).catch(() => setError("Certificate not yet issued")).finally(() => setLoading(false));
    } else {
      setError("No certificate reference provided");
      setLoading(false);
    }
  }, [offerId, certNumber]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="animate-pulse text-gray-400">Loading certificate...</p>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="text-4xl mb-3">📜</div>
        <h2 className="text-lg font-semibold text-gray-700">{error ?? "Certificate not found"}</h2>
        <p className="mt-1 text-sm text-gray-500">Please check the link or contact CauseKind support.</p>
        <Link href="/dashboard" className="mt-4 text-sm text-[#b04a15] font-medium hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const handoverDate = new Date(cert.handoverDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4 print:bg-transparent print:p-0">
      {/* Nav — hidden on print */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-[#b04a15] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors"
        >
          <Download size={14} /> Download / Print
        </button>
      </div>

      {/* Certificate — landscape A4 */}
      <div
        ref={printRef}
        className="mx-auto"
        style={{
          width: "100%",
          maxWidth: "960px",
          aspectRatio: "1414 / 1000",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#f5f0e8",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            boxSizing: "border-box",
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          }}
        >
          {/* Ornamental border */}
          <OrnamentalBorder />

          {/* Logo */}
          <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "64px", height: "64px" }}>
              <LogoSVG />
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "0.05em", color: "#1a1008", marginTop: "4px" }}>
              <span style={{ color: "#c4501a" }}>Cause</span>Kind
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{
              fontSize: "clamp(32px, 6vw, 64px)",
              fontWeight: "900",
              letterSpacing: "0.15em",
              color: "#1a1008",
              fontFamily: "'Georgia', serif",
              lineHeight: 1,
            }}>
              CERTIFICATE
            </div>
            <div style={{
              fontSize: "clamp(11px, 2vw, 18px)",
              letterSpacing: "0.35em",
              color: "#1a1008",
              fontWeight: "600",
              marginTop: "4px",
            }}>
              I N - K I N D &nbsp; D O N A T I O N
            </div>
          </div>

          {/* Body text */}
          <p style={{
            fontStyle: "italic",
            textAlign: "center",
            color: "#3a2a1a",
            fontSize: "clamp(10px, 1.6vw, 15px)",
            lineHeight: 1.7,
            maxWidth: "580px",
            marginBottom: "20px",
          }}>
            This is to formally certify that the individual named below<br />
            has made a verified in-kind contribution through the<br />
            CauseKind platform.
          </p>

          {/* Donor name with signature style */}
          <div style={{ marginBottom: "24px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "center" }}>
              <span style={{ fontSize: "clamp(10px, 1.4vw, 14px)", color: "#5a4a3a" }}>Mr./Ms.</span>
              <div style={{ borderBottom: "1.5px solid #5a4a3a", minWidth: "200px", textAlign: "center" }}>
                <span style={{
                  fontFamily: "'Brush Script MT', 'Dancing Script', cursive",
                  fontSize: "clamp(22px, 4vw, 38px)",
                  color: "#1a1008",
                  letterSpacing: "0.02em",
                }}>
                  {cert.donorName}
                </span>
              </div>
            </div>
          </div>

          {/* Data table */}
          <table style={{
            borderCollapse: "collapse",
            marginBottom: "20px",
            fontSize: "clamp(10px, 1.5vw, 14px)",
          }}>
            <tbody>
              <TableRow label="Item Donated" value={cert.category} />
              <TableRow label="Donation Date" value={handoverDate} />
              <TableRow label="Certificate ID" value={cert.certificateNumber} />
            </tbody>
          </table>

          {/* Website */}
          <div style={{
            fontStyle: "italic",
            color: "#5a4a3a",
            fontSize: "clamp(10px, 1.5vw, 14px)",
            marginBottom: "8px",
          }}>
            www.causekind.com
          </div>

          {/* Footer */}
          <div style={{
            fontStyle: "italic",
            color: "#7a6a5a",
            fontSize: "clamp(8px, 1.2vw, 11px)",
          }}>
            This certificate is digitally issued and valid without a physical signature.
          </div>
        </div>
      </div>

      {/* QR info below */}
      <div className="mx-auto mt-4 max-w-4xl text-center print:hidden">
        <p className="text-xs text-gray-400">
          Certificate ID: <span className="font-mono font-semibold text-gray-600">{cert.certificateNumber}</span>
          {" · "}Verify at{" "}
          <span className="font-mono text-gray-600">causekind.com/certificate?certNumber={cert.certificateNumber}</span>
        </p>
      </div>
    </div>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{
        border: "1px solid #c4a882",
        padding: "7px 16px",
        color: "#3a2a1a",
        fontWeight: "500",
        backgroundColor: "rgba(255,255,255,0.3)",
      }}>
        {label}
      </td>
      <td style={{
        border: "1px solid #c4a882",
        padding: "7px 16px",
        color: "#3a2a1a",
        backgroundColor: "rgba(255,255,255,0.3)",
        minWidth: "160px",
      }}>
        {value}
      </td>
    </tr>
  );
}

function OrnamentalBorder() {
  const corner = (style: React.CSSProperties) => (
    <div style={{
      position: "absolute",
      width: "70px",
      height: "70px",
      ...style,
    }}>
      <svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="66" height="66" stroke="#c4501a" strokeWidth="1.5" fill="none" rx="2"/>
        <rect x="6" y="6" width="58" height="58" stroke="#c4501a" strokeWidth="0.5" fill="none" rx="1"/>
        <path d="M2 20 L2 2 L20 2" stroke="#c4501a" strokeWidth="2" fill="none"/>
        <path d="M6 18 L6 6 L18 6" stroke="#c4501a" strokeWidth="1" fill="none"/>
        <circle cx="12" cy="12" r="3" fill="#c4501a" opacity="0.6"/>
        <path d="M2 14 Q8 8 14 2" stroke="#c4501a" strokeWidth="0.8" fill="none" opacity="0.5"/>
        <path d="M20 8 Q14 14 8 20" stroke="#c4501a" strokeWidth="0.8" fill="none" opacity="0.5"/>
      </svg>
    </div>
  );

  return (
    <>
      {/* Outer border line */}
      <div style={{
        position: "absolute", inset: "12px",
        border: "1.5px solid #c4501a",
        pointerEvents: "none",
        borderRadius: "2px",
      }} />
      {/* Inner border line */}
      <div style={{
        position: "absolute", inset: "18px",
        border: "0.5px solid #c4501a",
        pointerEvents: "none",
        borderRadius: "1px",
        opacity: 0.5,
      }} />
      {/* Corner ornaments */}
      {corner({ top: 0, left: 0 })}
      {corner({ top: 0, right: 0, transform: "scaleX(-1)" })}
      {corner({ bottom: 0, left: 0, transform: "scaleY(-1)" })}
      {corner({ bottom: 0, right: 0, transform: "scale(-1)" })}
    </>
  );
}
