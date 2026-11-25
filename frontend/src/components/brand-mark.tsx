/** Original eight-point asterisk (028a8dc), rendered as a stable vector, not a glyph. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
    {[0, 45, 90, 135].map(angle => <path key={angle} d="M50 10V90" transform={`rotate(${angle} 50 50)`} stroke="currentColor" strokeWidth="12" />)}
  </svg>;
}
