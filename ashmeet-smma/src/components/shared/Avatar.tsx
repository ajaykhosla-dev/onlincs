export type AvatarKind = 'mono' | 'face' | 'square'

/**
 * Gradient initials tile. `mono` is the rounded tile used in tables, `face` the small circle beside a
 * manager's name, `square` the larger tile on list rows.
 */
export function Avatar({ initials, gradient, kind = 'mono' }: { initials: string; gradient?: string; kind?: AvatarKind }) {
  const style = { background: gradient }
  if (kind === 'face')
    return (
      <span className="face" style={style}>
        {initials}
      </span>
    )
  return (
    <div className={kind === 'square' ? 'avatar-sq' : 'mono'} style={style}>
      {initials}
    </div>
  )
}
