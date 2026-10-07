'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlus } from '@/components/shared/icons'
import { ClientFormModal, type ClientManager } from './ClientFormModal'

/** Top-bar Add client: opens the client form in place on whichever admin page is showing. */
export function AddClientButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [managers, setManagers] = useState<ClientManager[]>([])
  async function openForm() {
    if (!managers.length) {
      const response = await fetch('/api/clients', { cache: 'no-store' }).catch(() => null)
      if (response?.ok) setManagers((await response.json()).managers ?? [])
    }
    setOpen(true)
  }
  return <>
    <button type="button" className="btn-dark" onClick={() => void openForm()}><IconPlus />Add client</button>
    <ClientFormModal open={open} onClose={() => setOpen(false)} editing={null} managers={managers}
      onSaved={() => { window.dispatchEvent(new Event('client-added')); router.refresh() }} />
  </>
}
