import Image from 'next/image';

/** Shared transparent trust mark, kept consistent across the donation page. */
export function SahasLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/money-donation/sahas-logo-transparent.png"
      alt="Sahas Charitable Trust logo"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
