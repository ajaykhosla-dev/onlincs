'use client'

import { usePathname } from 'next/navigation'
import { IconDownload } from '@/components/shared/icons'

/** Exports the current view as CSV, carrying the month and any card filter shown in the address bar. */
export function ExportButton() {
  const pathname = usePathname()
  function download() {
    const params = new URLSearchParams(window.location.search)
    const card = params.get('card')
    const month = params.get('month')
    const view = card ? 'cards' : pathname.endsWith('/team') ? 'team' : pathname.endsWith('/scope') ? 'scope' : pathname.endsWith('/posting') ? 'posting' : 'clients'
    const query = new URLSearchParams({ view })
    if (month) query.set('month', month)
    if (card) query.set('card', card)
    const link = document.createElement('a')
    link.href = `/api/export?${query}`
    link.download = ''
    document.body.appendChild(link); link.click(); link.remove()
  }
  return <button type="button" className="btn-soft" onClick={download}><IconDownload />Export data<span className="chip">CSV</span></button>
}
