"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getOfferCertificate, verifyCertificate, type Certificate } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import QRCode from "qrcode";

export default function CertificatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const offerId = searchParams.get("offerId");
  const certNumber = searchParams.get("certNumber");
  const printRef = useRef<HTMLDivElement>(null);

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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

  // Generate a scannable QR pointing at this same verification page — this is what
  // actually makes the certificate "QR-verifiable", not just the text label.
  useEffect(() => {
    if (!cert) return;
    const verifyUrl = `${window.location.origin}/certificate?certNumber=${cert.certificateNumber}`;
    QRCode.toDataURL(verifyUrl, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [cert]);

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
      {/* Print rules:
          1. Color-adjust so backgrounds/borders survive "Save as PDF" instead of
             being stripped to plain black-on-white (the browser default).
          2. Isolate to just the certificate — the root layout wraps every page
             (including this one) in a site header, footer, mobile nav, and a
             floating support button, none of which have their own print-hidden
             treatment. Rather than hunting down and print-hiding each of those
             components individually (fragile — a new floating widget added later
             would leak through again), hide everything on the page by default and
             re-reveal only .cert-print-card and its contents. That's what actually
             gets "one page, the certificate only" instead of the full page layout.
          3. A4 landscape explicitly — the certificate's own 1414:1000 aspect ratio
             maps to A4 landscape edge to edge; leaving @page size unset falls back
             to the browser/OS default paper size (often US Letter), which crops it. */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          /* visibility:hidden still reserves the hidden element's layout height,
             which pushed a blank second page — display:none actually removes it.
             Targets the root layout's site chrome by tag/id/class directly (it's
             a fixed, known set: header, #footer, the mobile bottom nav, the
             floating support button/panel, and the toast notification host —
             see src/app/layout.tsx). */
          header, footer#footer, nav, .floating-support-item, [data-sonner-toaster] { display: none !important; }
          html, body, .cert-print-card, .cert-print-card * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .cert-print-card {
            width: 100vw !important; height: 100vh !important; max-width: none !important;
            box-shadow: none !important; page-break-inside: avoid; margin: 0 !important;
          }
        }
      `}</style>

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
        className="mx-auto cert-print-card"
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

          {/* Logo — the static filled PNG, not the animated LogoSVG (see LogoSVG.tsx:
              that component draws itself in over ~3.5s and is meant for the live navbar;
              on a printable/static page it risks being captured mid-reveal). */}
          <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-filled.png" alt="CauseKind" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
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
            marginBottom: "10px",
          }}>
            This certificate is digitally issued and valid without a physical signature.
          </div>

          {/* Scannable QR — bottom-right corner, tucked just inside the ornamental
              border so it doesn't collide with the corner flourish. This is what's
              actually printed/downloaded, so the verification path travels with the
              certificate wherever it's shown. */}
          {qrDataUrl && (
            <div style={{
              position: "absolute",
              bottom: "clamp(28px, 6vw, 52px)",
              right: "clamp(28px, 6vw, 52px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Scan to verify this certificate"
                style={{ width: "clamp(48px, 7vw, 72px)", height: "clamp(48px, 7vw, 72px)" }}
              />
              <span style={{ fontSize: "clamp(7px, 1vw, 10px)", color: "#5a4a3a", marginTop: "3px" }}>
                Scan to verify
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Verify info below (screen-only convenience — the QR above is what's printed) */}
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
  // Woven interlocking-square lattice sitting at the corner joint where the double
  // border lines meet — approximated by hand from a reference screenshot, not traced
  // from a vector source. If you have the original asset for this motif, send it over
  // (same as logo-filled.png) and this can be swapped for an exact match.
  const corner = (style: React.CSSProperties) => (
    <div style={{ position: "absolute", width: "28px", height: "28px", ...style }}>
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="9" height="9" stroke="#c4501a" strokeWidth="1"/>
        <rect x="9.5" y="0.5" width="9" height="9" stroke="#c4501a" strokeWidth="1"/>
        <rect x="0.5" y="9.5" width="9" height="9" stroke="#c4501a" strokeWidth="1"/>
        <rect x="9.5" y="9.5" width="9" height="9" stroke="#c4501a" strokeWidth="1"/>
        <rect x="4.5" y="4.5" width="9" height="9" stroke="#c4501a" strokeWidth="0.75" fill="#f5f0e8"/>
        <rect x="8" y="8" width="4" height="4" fill="#c4501a"/>
      </svg>
    </div>
  );

  return (
    <>
      {/* Double-rule border — two close parallel lines running the whole perimeter */}
      <div style={{
        position: "absolute", inset: "12px",
        border: "1.5px solid #c4501a",
        pointerEvents: "none",
        borderRadius: "2px",
      }} />
      <div style={{
        position: "absolute", inset: "15px",
        border: "1px solid #c4501a",
        pointerEvents: "none",
        borderRadius: "2px",
      }} />
      {/* Corner lattice, tucked right on the double lines' corner joint */}
      {corner({ top: "5px", left: "5px" })}
      {corner({ top: "5px", right: "5px", transform: "scaleX(-1)" })}
      {corner({ bottom: "5px", left: "5px", transform: "scaleY(-1)" })}
      {corner({ bottom: "5px", right: "5px", transform: "scale(-1)" })}
    </>
  );
}
