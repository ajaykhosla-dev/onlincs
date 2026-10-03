import { UploadArea } from '@/components/editor/UploadArea'
import { redoChangeRequests, redoTask } from '@/lib/fixtures/editor'

export default function EditorRedoPage() {
  return (
    <>
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Re do<span className="light">One cut sent back for changes</span>
          </h1>
          <p>Compare what changed, then upload the revised cut.</p>
        </div>
      </section>

      <div className="grid">
        <section className="card" style={{ padding: '24px 26px' }}>
          <div className="card-title" style={{ marginBottom: 6 }}>
            {redoTask.idea}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: 18 }}>{redoTask.meta}</div>

          <div className="instr-compare">
            <div className="instr-col old">
              <h4>Original instructions</h4>
              <p>{redoTask.oldInstructions}</p>
            </div>
            <div className="instr-col new">
              <h4>New instructions</h4>
              <p>{redoTask.newInstructions}</p>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="card-title" style={{ fontSize: 14, marginBottom: 10 }}>
              Previous cut
            </div>
            <div className="video-ph" style={{ aspectRatio: '16/6' }}>
              <div className="play-glyph">
                <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{redoTask.previousCut}</div>
          </div>

          <UploadArea label={redoTask.uploadLabel} />
        </section>

        <aside className="side">
          <section className="card queue" style={{ padding: '20px 22px' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              Change requests
            </div>
            {redoChangeRequests.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-head">
                  <span className="comment-ts">{c.range}</span>
                  <span className="comment-author">{c.author}</span>
                </div>
                {c.text && <div className="comment-text">{c.text}</div>}
                {c.voice && (
                  <>
                    <div className="voice-note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 11a7 7 0 0 1-14 0M12 18v4" />
                      </svg>
                      <span className="voice-wave" aria-hidden="true" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>{c.voice.duration}</span>
                    </div>
                    <div className="transcript">{c.voice.transcript}</div>
                  </>
                )}
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  )
}
