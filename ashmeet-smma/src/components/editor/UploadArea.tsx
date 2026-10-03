import { EXPORT_SPEC } from '@/lib/fixtures/editor'

/** Finished-cut upload target with the export spec stated as literal text. */
export function UploadArea({ label }: { label: string }) {
  return (
    <div className="upload-area">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <p>{label}</p>
      <div className="upload-spec">{EXPORT_SPEC}</div>
    </div>
  )
}
