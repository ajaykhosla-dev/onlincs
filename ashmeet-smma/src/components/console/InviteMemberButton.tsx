'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/shared'

const empty = { full_name: '', email: '', role: 'editor' }
const roles = [['brand_manager', 'Brand Manager'], ['editor', 'Editor'], ['cameraman', 'Cameraman'], ['admin', 'Admin']] as const

/** Settings › Team members: adds a person to this workspace so they can sign in with Google. */
export function InviteMemberButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  function close() { setOpen(false); setForm(empty); setError('') }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message ?? 'Could not add this team member')
      setDone(`${form.full_name} can now sign in at ${window.location.origin} with Google using ${form.email}.`)
      close(); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add this team member') }
    finally { setSaving(false) }
  }
  return <>
    <button type="button" className="btn-dark" style={{ height: 36, padding: '0 16px' }} onClick={() => { setDone(''); setOpen(true) }}>Invite member</button>
    {done && <p role="status" className="cm-meta" style={{ margin: 0 }}>{done}</p>}
    {open && <Modal open onClose={close} titleId="invite-member-title" title="Invite team member" closeLabel="Close invite form" footer={<><button className="btn-soft" onClick={close}>Cancel</button><button className="btn-dark" form="invite-member-form" disabled={saving}>{saving ? 'Adding…' : 'Add member'}</button></>}>
      <form id="invite-member-form" onSubmit={(e) => void save(e)}>
        <div className="field"><label htmlFor="invite-name">Full name <span className="req">*</span></label><input id="invite-name" required minLength={2} placeholder="e.g. Simran Kaur" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="field-row">
          <div className="field"><label htmlFor="invite-email">Google email <span className="req">*</span></label><input id="invite-email" type="email" required placeholder="name@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="invite-role">Role <span className="req">*</span></label><select id="invite-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        </div>
        <p className="field-hint">They sign in with this Google account. No email is sent, so let them know the address of the app.</p>
        {error && <p role="alert">{error}</p>}
      </form>
    </Modal>}
  </>
}
