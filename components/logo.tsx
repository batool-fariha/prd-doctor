/** Brand mark: a document-shaped tile with a pulse line. Same glyph as app/icon.svg. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9A4FF" />
          <stop offset="1" stopColor="#5B3FD6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lg)" />
      <path d="M5.5 17h5l2.8-7.2 4.4 12.4 3-8.2 1.6 3H26.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
