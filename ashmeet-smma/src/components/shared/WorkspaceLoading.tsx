export function WorkspaceLoading() {
  return (
    <main className="workspace-loading" role="status" aria-live="polite">
      <div className="workspace-loading-mark" aria-hidden="true">RA</div>
      <p>Opening your workspace…</p>
    </main>
  )
}
