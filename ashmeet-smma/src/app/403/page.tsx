import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <main className="access-page">
      <div className="access-card">
        <span className="access-code">403</span>
        <h1>You don&apos;t have access to this page</h1>
        <p>Your workspace role doesn&apos;t include this section.</p>
        <Link href="/" className="btn-dark">Go to my workspace</Link>
      </div>
    </main>
  )
}
