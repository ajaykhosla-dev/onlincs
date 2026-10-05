import { StorageView } from '@/components/console/StorageView'
import { requireGroupUser } from '@/lib/auth/session'

/** Read-only for brand managers: they see their own clients' footage and the pool, but the API refuses deletion. */
export default async function ManagerStoragePage() {
  await requireGroupUser('manager')
  return <>
    <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
      <div className="hello"><h1>Storage<span className="light">Raw footage and cuts</span></h1><p>How much space your clients&apos; footage uses. Only an admin can delete raw footage.</p></div>
    </section>
    <StorageView />
  </>
}
