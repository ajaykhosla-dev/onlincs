import { notFound } from 'next/navigation'

/** Scratch pages (component gallery, upload test) exist for development only; a production build returns 404. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound()
  return children
}
