/** Deterministic vector mark; decorative instances are hidden from assistive technology. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
    {[0, 45, 90, 135].map(angle => <ellipse key={angle} cx="50" cy="50" rx="15" ry="43" transform={`rotate(${angle} 50 50)`} stroke="currentColor" strokeWidth="5" />)}
  </svg>;
}
