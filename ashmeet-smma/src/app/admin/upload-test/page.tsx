import { Suspense } from 'react'
import { UploadWorkspace } from '@/components/cameraman/UploadWorkspace'
import '@/styles/screens/cameraman.css'

/** Temporary admin-only route for browser verification while no cameraman login is available. */
export default function AdminUploadTestPage() {
  return <div className="r-cam" style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}><Suspense><UploadWorkspace /></Suspense></div>
}
