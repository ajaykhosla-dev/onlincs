import Link from 'next/link'

export default function NotFound() {
  return <main className="access-page"><div className="access-card"><span className="access-code">404</span><h1>Page not found</h1>
    <p>That page does not exist, or you may not have access to it.</p><Link href="/" className="btn-dark">Go to your workspace</Link></div></main>
}
