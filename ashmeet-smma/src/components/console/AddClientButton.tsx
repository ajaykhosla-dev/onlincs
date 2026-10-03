'use client'
import { useRouter } from 'next/navigation'
import { IconPlus } from '@/components/shared/icons'
export function AddClientButton() {
  const router = useRouter()
  return <button type="button" className="btn-dark" onClick={() => {
    if (window.location.pathname !== '/admin/clients') router.push('/admin/clients?add=1')
    else window.dispatchEvent(new Event('open-add-client'))
  }}><IconPlus />Add client</button>
}
