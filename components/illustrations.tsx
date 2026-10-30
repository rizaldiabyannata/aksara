// Original decorative scene: a chalkboard, a stack of books, and a desk. Colors follow the Stitch tokens.
export function ClassroomIllustration({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 320 220" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="160" cy="200" rx="140" ry="12" fill="var(--color-canvas-peach-subtle)" />
      <rect x="40" y="24" width="240" height="124" rx="14" fill="var(--color-primary-strong)" />
      <rect x="52" y="36" width="216" height="100" rx="8" fill="var(--color-surface-card)" />
      <path d="M70 62h86M70 84h120M70 106h64" stroke="var(--color-primary-container)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="226" cy="92" r="26" fill="var(--color-primary-fixed)" />
      <path d="M226 92V66a26 26 0 0 1 26 26Z" fill="var(--color-primary-container)" />
      <rect x="40" y="148" width="240" height="8" rx="4" fill="var(--color-on-primary-container)" />
      <rect x="64" y="156" width="8" height="40" rx="3" fill="var(--color-on-primary-container)" />
      <rect x="248" y="156" width="8" height="40" rx="3" fill="var(--color-on-primary-container)" />
      <rect x="92" y="168" width="64" height="12" rx="3" fill="var(--color-brand-blue)" />
      <rect x="98" y="156" width="56" height="12" rx="3" fill="var(--color-primary-container)" />
      <rect x="104" y="146" width="48" height="10" rx="3" fill="var(--color-tone-success)" />
      <rect x="176" y="164" width="40" height="16" rx="3" fill="var(--color-surface-card)" stroke="var(--color-primary-strong)" strokeWidth="3" />
      <path d="M196 164v16" stroke="var(--color-primary-strong)" strokeWidth="3" />
    </svg>
  );
}
