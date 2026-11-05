/** Sidebar download icon using the current theme. */
export function DownloaderIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ color: active ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)' }}>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
