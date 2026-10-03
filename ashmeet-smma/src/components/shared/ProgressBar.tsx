/** Thin gradient bar. `warn` when behind, `done` at 100%. */
export function ProgressBar({ value, tone }: { value: number; tone?: 'warn' | 'done' }) {
  return (
    <span className="track">
      <i className={tone} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  )
}
