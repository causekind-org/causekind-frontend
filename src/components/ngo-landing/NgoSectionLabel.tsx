import React from "react";

interface NgoSectionLabelProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

/**
 * Clean, human section eyebrow label.
 * - No pill, background, border, icon, or shadow.
 * - Sentence case in elegant serif italic font matching section headlines.
 * - ~18px desktop / 16px mobile in ngo-700.
 */
export function NgoSectionLabel({
  children,
  align = "center",
  className = "",
}: NgoSectionLabelProps) {
  const alignClass =
    align === "left"
      ? "text-left"
      : align === "right"
      ? "text-right"
      : "text-center";

  return (
    <p
      className={`text-base sm:text-lg italic font-serif text-ngo-700 dark:text-ngo-300 tracking-normal mb-2 sm:mb-2.5 ${alignClass} ${className}`}
      style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
    >
      {children}
    </p>
  );
}

export default NgoSectionLabel;
